/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { M01_Config, STAGE_PRESETS } from './m01Config';
import { M02_SpriteMeshAtlas } from './m02SpriteMeshAtlas';
import { M05_CombatResolver } from './m05CombatResolver';
import { M07_AudioFx } from './m07AudioFx';
import { M10_Renderer } from './m10Renderer';
import type { FighterEntity, ProjectileEntity } from './types';

export const M04_MeshPhysics = {
  projectiles: [] as ProjectileEntity[],

  addShake(amount: number): void {
    M01_Config.infusion.shakeIntensity = Math.min(
      18,
      Math.max(M01_Config.infusion.shakeIntensity, amount)
    );
  },

  ensureMeshDynamics(f: FighterEntity): void {
    if (!f.meshDyn) f.meshDyn = {};
    if (!f.activeFrame || !f.activeFrame.nodes) return;
    for (const [name, target] of Object.entries(f.activeFrame.nodes)) {
      const tx = f.x + target.x * f.facing;
      const ty = f.y + target.y;
      if (!f.meshDyn[name]) {
        f.meshDyn[name] = { wx: tx, wy: ty, vx: 0, vy: 0 };
      }
    }
  },

  integrateKinematics(f: FighterEntity, opp: FighterEntity, subDt: number): void {
    const busy = [
      'hp',
      'lp',
      'hk',
      'lk',
      'uppercut',
      'sweep',
      'roundhouse',
      'throw',
      'projectile',
      'hitstun',
      'blockstun',
      'ko',
    ].includes(f.state);
    if (f.grounded && !busy) {
      f.facing = opp.x >= f.x ? 1 : -1;
    }

    const speed = f.state === 'walk' ? 255 : 0;
    if (f.state === 'walk') {
      f.vx = f.moveDir * speed;
    } else if (f.grounded && !['hitstun', 'blockstun'].includes(f.state)) {
      f.vx *= Math.pow(0.001, subDt);
    }

    if (!f.grounded || f.vy < 0) {
      f.vy += M01_Config.gravity * subDt;
    }

    f.x += f.vx * subDt;
    f.y += f.vy * subDt;

    if (f.y >= M01_Config.floorY) {
      f.y = M01_Config.floorY;
      f.vy = 0;
      f.grounded = true;
      if (f.state === 'jump') f.state = 'idle';
    }

    const infLevel = M01_Config.infusion.stageInfusionLevel;
    const stage = STAGE_PRESETS[M01_Config.infusion.stageIndex] || STAGE_PRESETS[0];
    const hazardWave =
      infLevel > 0
        ? Math.sin(M01_Config.infusion.hazardPulsePhase) * stage.hazardAmp * (infLevel / 100)
        : 0;

    this.ensureMeshDynamics(f);
    const stiffness = M01_Config.infusion.meshSpringStiffness;
    const damping = M01_Config.infusion.meshSpringDamping;
    if (f.activeFrame && f.activeFrame.nodes && f.meshDyn) {
      for (const [name, node] of Object.entries(f.activeFrame.nodes)) {
        const dyn = f.meshDyn[name];
        const tx = f.x + node.x * f.facing;
        const ty = f.y + node.y + (name === 'head' || name === 'torso' ? hazardWave * 6 : 0);
        const ax = (tx - dyn.wx) * stiffness - dyn.vx * damping;
        const ay = (ty - dyn.wy) * stiffness - dyn.vy * damping;
        dyn.vx += ax * subDt;
        dyn.vy += ay * subDt;
        dyn.wx += dyn.vx * subDt;
        dyn.wy += dyn.vy * subDt;
      }
    }
  },

  solveConstraints(f: FighterEntity, opp: FighterEntity): void {
    f.x = Math.max(M01_Config.arenaLeft, Math.min(M01_Config.arenaRight, f.x));

    const minSep = 44;
    const dx = opp.x - f.x;
    const dist = Math.abs(dx);
    if (dist < minSep && Math.abs(f.y - opp.y) < 70) {
      const push = (minSep - dist) * 0.5;
      const dir = dx >= 0 ? -1 : 1;
      f.x = Math.max(M01_Config.arenaLeft, Math.min(M01_Config.arenaRight, f.x + dir * push));
    }

    if (f.meshDyn && f.meshDyn.pelvis && f.meshDyn.torso && f.meshDyn.head) {
      const relax = (
        a: { wx: number; wy: number },
        b: { wx: number; wy: number },
        targetLen: number
      ) => {
        const lx = b.wx - a.wx;
        const ly = b.wy - a.wy;
        const len = Math.hypot(lx, ly) || 1;
        const diff = ((len - targetLen) / len) * 0.35;
        a.wx += lx * diff;
        a.wy += ly * diff;
        b.wx -= lx * diff;
        b.wy -= ly * diff;
      };
      relax(f.meshDyn.pelvis, f.meshDyn.torso, 40);
      relax(f.meshDyn.torso, f.meshDyn.head, 36);
    }

    f.worldMesh = {};
    if (f.activeFrame && f.activeFrame.nodes) {
      for (const [name, node] of Object.entries(f.activeFrame.nodes)) {
        const dyn = (f.meshDyn && f.meshDyn[name]) || {
          wx: f.x + node.x * f.facing,
          wy: f.y + node.y,
        };
        dyn.wx = Math.max(M01_Config.arenaLeft - 24, Math.min(M01_Config.arenaRight + 24, dyn.wx));
        dyn.wy = Math.min(M01_Config.floorY + 6, dyn.wy);
        f.worldMesh[name] = {
          wx: dyn.wx,
          wy: dyn.wy,
          r: node.r,
          type: node.type,
        };
      }
    }
  },

  advanceAnimation(f: FighterEntity, dt: number): void {
    f.squashY += (1 - f.squashY) * Math.min(1, dt * 16);
    f.animTimer += dt * 12;
    const frameData = M02_SpriteMeshAtlas.getFrameData(
      f.fighterId,
      f.state,
      f.animTimer,
      f.squashY
    );
    if (!frameData.loop && Math.floor(f.animTimer) >= frameData.totalFrames) {
      if (f.state === 'ko') {
        f.animTimer = frameData.totalFrames - 1;
      } else {
        f.state = f.grounded ? 'idle' : 'jump';
        f.animTimer = 0;
      }
    }
    f.activeFrame = M02_SpriteMeshAtlas.getFrameData(
      f.fighterId,
      f.state,
      f.animTimer,
      f.squashY
    );
  },

  spawnProjectile(owner: FighterEntity, opp: FighterEntity): void {
    if (owner.state !== 'projectile' || owner.spawnedProj) return;
    const f = owner.activeFrame;
    if (f && f.spawnProjFrame >= 0 && Math.floor(owner.animTimer) >= f.spawnProjFrame) {
      owner.spawnedProj = true;
      this.projectiles.push({
        ownerSlot: owner.slot,
        targetRef: opp,
        x: owner.x + owner.facing * 54,
        y: owner.y - 96,
        vx: owner.facing * 520,
        r: 15,
        spec: f,
        life: 2.2,
      });
    }
  },

  stepProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * dt;
      p.life -= dt;
      if (
        p.life <= 0 ||
        p.x < M01_Config.arenaLeft - 40 ||
        p.x > M01_Config.arenaRight + 40
      ) {
        this.projectiles.splice(i, 1);
        continue;
      }
      const target = p.targetRef;
      if (!target || target.state === 'ko' || target.invulnTimer > 0) continue;
      const hurtNodes = Object.values(target.worldMesh || {}).filter((n) => n.type === 'HURT');
      for (const u of hurtNodes) {
        if (Math.hypot(p.x - u.wx, p.y - u.wy) <= p.r + u.r) {
          M05_CombatResolver.applyImpact(
            { slot: p.ownerSlot, facing: (Math.sign(p.vx) || 1) as 1 | -1, state: 'projectile' },
            target,
            p.spec,
            p.x,
            p.y
          );
          this.projectiles.splice(i, 1);
          break;
        }
      }
    }
  },

  triggerFinisher(
    attacker: FighterEntity,
    defender: FighterEntity,
    label = 'STAGE INFUSION FATALITY'
  ): void {
    defender.hp = 0;
    defender.state = 'ko';
    defender.animTimer = 0;
    defender.squashY = 0.65;
    attacker.score = (attacker.score || 0) + 50000;
    if (!attacker.roundAwarded) {
      attacker.wins = (attacker.wins || 0) + 1;
      attacker.roundAwarded = true;
    }

    M01_Config.infusion.activeFinisherWindow = false;
    M01_Config.infusion.finisherTimer = 0;
    M01_Config.infusion.lastFinisher = `${attacker.fighterId}: ${label}`;
    M01_Config.infusion.stageInfusionLevel = Math.min(
      100,
      M01_Config.infusion.stageInfusionLevel + 35
    );
    M01_Config.infusion.stageIndex =
      (M01_Config.infusion.stageIndex + 1) % STAGE_PRESETS.length;
    M01_Config.telemetry.hitstopFrames = 10;
    M01_Config.telemetry.roundPhase = 'ROUND_OVER';
    this.addShake(15);

    if (defender.meshDyn) {
      for (const dyn of Object.values(defender.meshDyn)) {
        dyn.vx += attacker.facing * 420;
        dyn.vy -= 260;
      }
    }
    M07_AudioFx.playFinisher();
    const stage = STAGE_PRESETS[M01_Config.infusion.stageIndex];
    M10_Renderer.spawnSpark(defender.x, defender.y - 80, stage.rimStroke);
  },
};
