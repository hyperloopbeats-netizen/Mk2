/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Fighter } from './FighterEngine';
import { ParticleSystem } from './ParticleSystem';
import { SIX_BUTTON_MOVES } from './constants';
import { LinearKombatGauge } from './SpatialCombatSystem';

/**
 * Spatial & Reactive AI Opponent Decision Engine.
 * Eliminates raw setTimeouts, anti-airs jumping opponents, sidesteps projectiles,
 * uses Kombat Breakers under Overdrive pressure, and leverages 1960s Vancouver Strides.
 */
export function updateAI(
  tick: number,
  p1: Fighter,
  cpu: Fighter,
  particles: ParticleSystem,
  auto: boolean,
  practice: boolean,
  linearGauge?: LinearKombatGauge
) {
  if (practice) {
    cpu.vx = 0;
    return;
  }

  const dist = cpu.x - p1.x;
  const absDist = Math.abs(dist);
  const cpuSpeed = cpu.def.speed * cpu.getStatus().baseSpeedMult * 0.88;

  // Auto Battle P1 Logic
  if (auto && p1.state !== 'HITSTUN' && p1.state !== 'DEAD' && p1.state !== 'DIZZY') {
    const p1Speed = p1.def.speed * p1.getStatus().baseSpeedMult * 0.88;
    if (absDist > 160) {
      p1.vx = dist > 0 ? p1Speed : -p1Speed;
    } else {
      p1.vx = 0;
      if (tick % 28 === 0 && p1.state === 'IDLE') {
        const rand = Math.random();
        if (rand > 0.65 && p1.def.specials.length > 0) {
          const sp = p1.def.specials[Math.floor(Math.random() * p1.def.specials.length)];
          p1.executeMove(sp, cpu, particles);
        } else {
          const moves = [
            SIX_BUTTON_MOVES.LP,
            SIX_BUTTON_MOVES.HP,
            SIX_BUTTON_MOVES.LK,
            SIX_BUTTON_MOVES.HK,
            SIX_BUTTON_MOVES.UPPERCUT,
          ];
          p1.executeMove(moves[Math.floor(Math.random() * moves.length)], cpu, particles);
        }
      }
    }
  }

  // Reactive Kombat Breaker escape if CPU is stuck in hitstun/stagger while gauge favors P1
  if (
    linearGauge &&
    (cpu.state === 'HITSTUN' || cpu.state === 'STAGGER' || cpu.state === 'JUGGLE') &&
    linearGauge.canUseBreaker('CPU') &&
    tick % 18 === 0 &&
    Math.random() < 0.42
  ) {
    linearGauge.applyReactiveEvent('CPU', 'BREAKER');
    cpu.triggerBreaker(p1, particles);
    return;
  }

  // CPU Behavior Logic
  if (
    cpu.state === 'HITSTUN' ||
    cpu.state === 'DEAD' ||
    cpu.state === 'DIZZY' ||
    cpu.state === 'FROZEN' ||
    cpu.state === 'GUARD_CRUSH' ||
    cpu.state === 'STAGE_FALL' ||
    cpu.state === 'FATALITY_EXECUTION'
  ) {
    return;
  }

  // Evasive Z-lane sidestep against incoming projectiles
  const incomingProj = p1.projectiles.some(
    (pr) => Math.abs(pr.x - cpu.x) < 175 && Math.abs((pr.zLane ?? 0) - cpu.zLane) === 0
  );
  if (incomingProj && cpu.sidestepCooldown === 0 && Math.random() < 0.35) {
    cpu.sidestep(Math.random() < 0.5 ? -1 : 1);
    return;
  }

  // Align Z-lane when attacking from neutral
  if (cpu.zLane !== p1.zLane && cpu.sidestepCooldown === 0 && tick % 40 === 0 && Math.random() < 0.55) {
    const dirToP1 = p1.zLane > cpu.zLane ? 1 : -1;
    cpu.sidestep(dirToP1 as -1 | 1);
  }

  // Anti-air reaction if P1 jumps close overhead
  if (!p1.isGrounded && absDist < 135 && cpu.isGrounded && cpu.state === 'IDLE' && tick % 14 === 0) {
    if (Math.random() < 0.52) {
      cpu.executeMove(SIX_BUTTON_MOVES.UPPERCUT, p1, particles);
      return;
    }
  }

  if (absDist > 190) {
    cpu.vx = dist > 0 ? -cpuSpeed : cpuSpeed;
    if (tick % 56 === 0 && cpu.state === 'IDLE' && Math.random() > 0.38) {
      const rangedMove = cpu.def.specials[0];
      if (rangedMove) cpu.executeMove(rangedMove, p1, particles);
    } else if (
      tick % 84 === 0 &&
      cpu.isGrounded &&
      (cpu.activeStride?.effect === 'TRAM_SPRING' || Math.random() < 0.38)
    ) {
      cpu.performJump(dist > 0 ? -1 : 1, Math.random() < 0.35);
    }
  } else {
    cpu.vx = 0;
    if (tick % 26 === 0 && cpu.state === 'IDLE') {
      const roll = Math.random();
      if (roll > 0.62 && cpu.def.specials.length > 0) {
        const spIdx = Math.floor(Math.random() * cpu.def.specials.length);
        cpu.executeMove(cpu.def.specials[spIdx], p1, particles);
      } else if (roll > 0.34) {
        cpu.state = 'BLOCK';
        cpu.parryWindow = 8;
        cpu.aiBlockTimer = 22;
      } else {
        const moves = [
          SIX_BUTTON_MOVES.LP,
          SIX_BUTTON_MOVES.HP,
          SIX_BUTTON_MOVES.LK,
          SIX_BUTTON_MOVES.HK,
          SIX_BUTTON_MOVES.SWEEP,
          SIX_BUTTON_MOVES.UPPERCUT,
        ];
        cpu.executeMove(moves[Math.floor(Math.random() * moves.length)], p1, particles);
      }
    }
  }
}
