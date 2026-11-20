/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { M01_Config } from './m01Config';
import { M03_InputBus } from './m03InputBus';
import { M04_MeshPhysics } from './m04MeshPhysics';
import type { FighterEntity, SlotId } from './types';

export const M06_AutonomousAI = {
  stepFighterAI(f: FighterEntity, opp: FighterEntity, slot: SlotId): void {
    if (['hitstun', 'blockstun', 'ko'].includes(f.state)) return;
    if (M01_Config.infusion.activeFinisherWindow && opp.hp <= 0) {
      if (Math.random() < 0.08) {
        M04_MeshPhysics.triggerFinisher(f, opp, 'AUTONOMOUS INFUSION');
      }
      return;
    }

    const diffScale = 0.65 + M01_Config.cabinetDip.difficulty * 0.14;
    const dx = opp.x - f.x;
    const dist = Math.abs(dx);
    const dir: 1 | -1 = dx >= 0 ? 1 : -1;
    const attacks = [
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
    ];

    if (f.grounded && !attacks.includes(f.state)) {
      f.blocking = false;
      if (dist > 240) {
        f.moveDir = dir;
        f.state = 'walk';
        if (Math.random() < 0.025 * diffScale) M03_InputBus.pushCommand(slot, 'projectile');
      } else if (dist > 110) {
        f.moveDir = dir;
        f.state = 'walk';
      } else if (dist < 52 && Math.random() < 0.04 * diffScale) {
        f.moveDir = (dir === 1 ? -1 : 1) as 1 | -1;
        f.blocking = true;
        f.state = 'idle';
      } else {
        f.moveDir = 0;
        f.state = 'idle';
        if (Math.random() < 0.075 * diffScale) {
          if (dist < 72 && Math.random() < 0.25) M03_InputBus.pushCommand(slot, 'throw');
          else if (!opp.grounded && dist < 85) M03_InputBus.pushCommand(slot, 'uppercut');
          else if (dist > 95 && Math.random() < 0.35) M03_InputBus.pushCommand(slot, 'sweep');
          else M03_InputBus.pushCommand(slot, dist < 76 ? 'HP' : 'HK');
        }
      }
    }
  },

  tickRoundAndFinisher(p1: FighterEntity, p2: FighterEntity, dt: number): void {
    M01_Config.infusion.hazardPulsePhase += dt * 4.5;
    M01_Config.infusion.shakeIntensity = Math.max(
      0,
      M01_Config.infusion.shakeIntensity - dt * 36
    );

    if (M01_Config.telemetry.roundPhase === 'FIGHT') {
      M01_Config.telemetry.roundClock = Math.max(0, M01_Config.telemetry.roundClock - dt);
      if (M01_Config.telemetry.roundClock <= 0) {
        M01_Config.telemetry.roundPhase = 'ROUND_OVER';
      }
    } else if (M01_Config.telemetry.roundPhase === 'FINISH_HIM') {
      M01_Config.infusion.finisherTimer -= dt;
      if (M01_Config.infusion.finisherTimer <= 0) {
        M01_Config.infusion.activeFinisherWindow = false;
        M01_Config.telemetry.roundPhase = 'ROUND_OVER';
      }
    }

    if (M01_Config.telemetry.roundPhase === 'ROUND_OVER' || p1.hp <= 0 || p2.hp <= 0) {
      p1.koResetTimer = (p1.koResetTimer || 0) + dt;
      if (p1.koResetTimer >= 2.1) {
        if (!p1.roundAwarded && !p2.roundAwarded) {
          if (p1.hp >= p2.hp) p1.wins = (p1.wins || 0) + 1;
          else p2.wins = (p2.wins || 0) + 1;
        }
        if (M01_Config.cabinetDip.autoAdaptDifficulty) {
          if (p1.hp > p2.hp && M01_Config.cabinetDip.difficulty < 5) {
            M01_Config.cabinetDip.difficulty += 1;
          } else if (p2.hp > p1.hp && M01_Config.cabinetDip.difficulty > 1) {
            M01_Config.cabinetDip.difficulty -= 1;
          }
        }
        M01_Config.telemetry.roundNumber += 1;
        p1.hp = 100;
        p2.hp = 100;
        p1.x = 280;
        p2.x = 680;
        p1.vx = 0;
        p2.vx = 0;
        p1.vy = 0;
        p2.vy = 0;
        p1.combo = 0;
        p2.combo = 0;
        p1.roundAwarded = false;
        p2.roundAwarded = false;
        p1.state = 'idle';
        p2.state = 'idle';
        p1.animTimer = 0;
        p2.animTimer = 0;
        p1.koResetTimer = 0;
        p1.meshDyn = null;
        p2.meshDyn = null;
        M04_MeshPhysics.projectiles.length = 0;
        M01_Config.infusion.activeFinisherWindow = false;
        M01_Config.telemetry.roundPhase = 'FIGHT';
        M01_Config.telemetry.roundClock = M01_Config.cabinetDip.roundTime;
      }
    }
  },
};
