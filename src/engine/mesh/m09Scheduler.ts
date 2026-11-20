/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { M01_Config } from './m01Config';
import { M03_InputBus } from './m03InputBus';
import { M04_MeshPhysics } from './m04MeshPhysics';
import { M05_CombatResolver } from './m05CombatResolver';
import { M06_AutonomousAI } from './m06AutonomousAI';
import { M08_Watchdog } from './m08Watchdog';
import { M10_Renderer } from './m10Renderer';
import { M11_ManifestInspector } from './m11ManifestInspector';
import type { EngineState, FighterEntity, SlotId } from './types';

export const M09_Scheduler = {
  accumulator: 0,
  lastTime: 0,
  fpsFrames: 0,
  fpsClock: 0,
  rafId: 0,
  running: false,
  onTickHook: null as ((state: EngineState) => void) | null,

  applyFighterControls(f: FighterEntity, slot: SlotId, autoEnabled: boolean): void {
    if (['hitstun', 'blockstun', 'ko'].includes(f.state)) return;
    if (!f.oppRef) return;
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
    ];

    if (autoEnabled) {
      M06_AutonomousAI.stepFighterAI(f, f.oppRef, slot);
    } else {
      const stick = M03_InputBus.pollStick(slot, f.facing);
      f.blocking = stick.blocking;
      if (f.grounded && !attacks.includes(f.state)) {
        if (stick.moveX !== 0) {
          f.moveDir = stick.moveX;
          f.state = 'walk';
        } else if (stick.crouch) {
          f.moveDir = 0;
          f.state = 'crouch';
        } else {
          f.moveDir = 0;
          f.state = 'idle';
        }
      }
    }

    const rawCmd = M03_InputBus.consumeCommand(slot);
    if (!rawCmd) return;

    const stick = M03_InputBus.pollStick(slot, f.facing);
    const resolved = M03_InputBus.resolveManualMove(f, f.oppRef, rawCmd, stick);
    if (!resolved) return;

    if (resolved === 'FINISHER_STAGE_INFUSE') {
      M04_MeshPhysics.triggerFinisher(f, f.oppRef, 'MANUAL FINISHER');
      return;
    }

    if (resolved === 'jump' && f.grounded && !attacks.includes(f.state)) {
      f.vy = -790;
      f.grounded = false;
      f.state = 'jump';
      f.animTimer = 0;
    } else if (attacks.includes(resolved) && !attacks.includes(f.state)) {
      f.state = resolved;
      f.animTimer = 0;
      f.hasConnectedThisAttack = false;
      f.spawnedProj = false;
      if (resolved === 'uppercut' && f.grounded) {
        f.vy = -520;
        f.grounded = false;
      }
    }
  },

  fixedTick(state: EngineState): void {
    const { p1, p2 } = state;
    const baseDt = M01_Config.fixedDt;

    // PRE_STEP
    M08_Watchdog.enforceCabinetDipRules();
    M08_Watchdog.sanitizeFighter(p1, 280, 1);
    M08_Watchdog.sanitizeFighter(p2, 680, -1);

    if (M01_Config.telemetry.hitstopFrames > 0) {
      M01_Config.telemetry.hitstopFrames -= 1;
      M01_Config.telemetry.tickCount += 1;
      return;
    }

    // INPUT_AND_AI
    p1.invulnTimer = Math.max(0, p1.invulnTimer - baseDt);
    p2.invulnTimer = Math.max(0, p2.invulnTimer - baseDt);
    this.applyFighterControls(p1, 'p1', M01_Config.telemetry.p1Autonomous);
    this.applyFighterControls(p2, 'p2', M01_Config.telemetry.p2Autonomous);
    M03_InputBus.tickQueues();

    // KINEMATICS
    const steps = Math.max(1, M01_Config.physicsSubsteps);
    const subDt = baseDt / steps;
    for (let s = 0; s < steps; s++) {
      M04_MeshPhysics.integrateKinematics(p1, p2, subDt);
      M04_MeshPhysics.integrateKinematics(p2, p1, subDt);
      M01_Config.telemetry.substepCount += 1;
    }
    M04_MeshPhysics.advanceAnimation(p1, baseDt);
    M04_MeshPhysics.advanceAnimation(p2, baseDt);
    M04_MeshPhysics.spawnProjectile(p1, p2);
    M04_MeshPhysics.spawnProjectile(p2, p1);

    // CONSTRAINT_SOLVE
    const iters = Math.max(1, M01_Config.constraintIterations);
    for (let i = 0; i < iters; i++) {
      M04_MeshPhysics.solveConstraints(p1, p2);
      M04_MeshPhysics.solveConstraints(p2, p1);
    }

    // COMBAT_AND_FX
    M04_MeshPhysics.stepProjectiles(baseDt);
    M05_CombatResolver.resolve(p1, p2);
    M05_CombatResolver.resolve(p2, p1);

    // POST_STEP
    M06_AutonomousAI.tickRoundAndFinisher(p1, p2, baseDt);
    M08_Watchdog.captureSnapshot(state);
    M01_Config.telemetry.tickCount += 1;
    M11_ManifestInspector.validateContracts(M01_Config, state);
    M11_ManifestInspector.recordTelemetryFrame(M01_Config, state);
  },

  start(state: EngineState, onTick?: (state: EngineState) => void): void {
    this.stop();
    this.running = true;
    this.accumulator = 0;
    this.lastTime = performance.now();
    this.fpsFrames = 0;
    this.fpsClock = 0;
    this.onTickHook = onTick || null;

    const step = (now: number) => {
      if (!this.running) return;
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const clampedDt = Math.min(M01_Config.maxFrameDt, Math.max(0, rawDt));
      this.accumulator += clampedDt;

      this.fpsFrames += 1;
      this.fpsClock += clampedDt;
      if (this.fpsClock >= 0.5) {
        M01_Config.telemetry.fps = Math.round(this.fpsFrames / this.fpsClock);
        this.fpsFrames = 0;
        this.fpsClock = 0;
      }

      try {
        while (this.accumulator >= M01_Config.fixedDt) {
          this.fixedTick(state);
          this.accumulator -= M01_Config.fixedDt;
        }
        M10_Renderer.render(state);
        if (this.onTickHook) this.onTickHook(state);
      } catch (err) {
        this.accumulator = 0;
        M08_Watchdog.restoreSnapshot(state);
        const msg = err instanceof Error ? err.message : 'err';
        M08_Watchdog.recordHeal(`Recovered & restored snapshot: ${msg}`);
      }

      this.rafId = requestAnimationFrame(step);
    };
    this.rafId = requestAnimationFrame(step);
  },

  stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.onTickHook = null;
  },
};
