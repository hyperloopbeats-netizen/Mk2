/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { M01_ArcadeManualSpec, M01_Config } from './m01Config';
import { M04_MeshPhysics } from './m04MeshPhysics';
import { M07_AudioFx } from './m07AudioFx';
import { M10_Renderer } from './m10Renderer';
import type { FighterEntity, FrameData, SlotId } from './types';

type AttackerRef =
  | FighterEntity
  | { slot: SlotId; facing: 1 | -1; state: string; combo?: number; score?: number; wins?: number; roundAwarded?: boolean };

export const M05_CombatResolver = {
  isBlocking(defender: FighterEntity, attackerFacing: 1 | -1, attackSpec: FrameData): boolean {
    if (!defender.grounded) return false;
    if (attackSpec && attackSpec.unblockableClose) return false;
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
    ].includes(defender.state);
    if (busy) return false;
    return Boolean(defender.blocking) || defender.moveDir === -attackerFacing;
  },

  applyImpact(
    attacker: AttackerRef,
    defender: FighterEntity,
    spec: FrameData,
    hitX: number,
    hitY: number
  ): void {
    const blocked = this.isBlocking(defender, attacker.facing, spec);
    if (blocked) {
      defender.hp = Math.max(1, defender.hp - spec.chipDamage);
      defender.vx = attacker.facing * (spec.knockbackX * 0.65);
      defender.state = 'blockstun';
      defender.animTimer = 0;
      defender.invulnTimer = 0.1;
      if (attacker.combo !== undefined) attacker.combo = 0;
      attacker.score = (attacker.score || 0) + 250;
      M01_Config.telemetry.hitstopFrames = 3;
      M04_MeshPhysics.addShake(3);
      M07_AudioFx.playBlock();
      M10_Renderer.spawnSpark(hitX, hitY, '#94a3b8');
      return;
    }

    attacker.combo = (attacker.combo || 0) + 1;
    const scaling = Math.max(0.55, 1 - (attacker.combo - 1) * 0.1);
    const finalDamage = Math.max(2, Math.round(spec.damage * scaling));
    attacker.score = (attacker.score || 0) + finalDamage * 100 * attacker.combo;

    defender.hp = Math.max(0, defender.hp - finalDamage);
    defender.vx = attacker.facing * spec.knockbackX;
    defender.squashY = spec.knockdown ? 0.7 : 0.78;
    defender.invulnTimer = 0.16;

    if (defender.meshDyn) {
      for (const dyn of Object.values(defender.meshDyn)) {
        dyn.vx += attacker.facing * (spec.knockbackX * 0.85);
        dyn.vy += spec.launchY < 0 ? spec.launchY * 0.5 : -120;
      }
    }

    M01_Config.telemetry.hitstopFrames = spec.damage >= 15 ? 6 : 4;
    M04_MeshPhysics.addShake(spec.damage >= 15 ? 8 : 4);

    if (spec.launchY < 0 && defender.hp > 0) {
      defender.vy = spec.launchY;
      defender.grounded = false;
    }

    if (defender.hp <= 0) {
      defender.state = 'ko';
      defender.animTimer = 0;
      attacker.combo = 0;
      if (!attacker.roundAwarded && attacker.slot) {
        attacker.wins = (attacker.wins || 0) + 1;
        attacker.roundAwarded = true;
      }
      if (M01_Config.telemetry.roundPhase === 'FIGHT') {
        M01_Config.telemetry.roundPhase = 'FINISH_HIM';
        M01_Config.infusion.activeFinisherWindow = true;
        M01_Config.infusion.finisherTimer = M01_ArcadeManualSpec.finisherWindowSeconds;
      }
    } else {
      defender.state = 'hitstun';
      defender.animTimer = 0;
    }

    M07_AudioFx.playHit(spec.damage >= 14);
    M10_Renderer.spawnSpark(hitX, hitY, spec.tint);
  },

  resolve(attacker: FighterEntity, defender: FighterEntity): void {
    if (!attacker.activeFrame || !attacker.activeFrame.isActiveHit) return;
    if (attacker.hasConnectedThisAttack) return;
    if (defender.state === 'ko' || defender.invulnTimer > 0) return;

    const hitNodes = Object.values(attacker.worldMesh).filter((n) => n.type === 'HIT');
    const hurtNodes = Object.values(defender.worldMesh).filter((n) => n.type === 'HURT');

    for (const h of hitNodes) {
      for (const u of hurtNodes) {
        if (Math.hypot(h.wx - u.wx, h.wy - u.wy) <= h.r + u.r) {
          attacker.hasConnectedThisAttack = true;
          this.applyImpact(
            attacker,
            defender,
            attacker.activeFrame,
            (h.wx + u.wx) * 0.5,
            (h.wy + u.wy) * 0.5
          );
          return;
        }
      }
    }
  },
};
