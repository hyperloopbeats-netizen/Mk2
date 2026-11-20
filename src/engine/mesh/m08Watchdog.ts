/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BUILD_DATE, CODE_PART, M01_ArcadeManualSpec, M01_Config } from './m01Config';
import { M02_SpriteMeshAtlas, mkAnims } from './m02SpriteMeshAtlas';
import type { EngineState, FighterEntity } from './types';

interface FighterSnapshot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  grounded: boolean;
  hp: number;
  state: string;
}

export const M08_Watchdog = {
  snapshots: [] as Array<{ p1: FighterSnapshot; p2: FighterSnapshot }>,

  recordHeal(reason: string): void {
    M01_Config.telemetry.healsPerformed += 1;
    M01_Config.telemetry.lastHealReason = reason;
    M01_Config.telemetry.healLog.push({
      tick: M01_Config.telemetry.tickCount,
      reason,
    });
    if (M01_Config.telemetry.healLog.length > 25) {
      M01_Config.telemetry.healLog.shift();
    }
  },

  enforceCabinetDipRules(): void {
    const dip = M01_Config.cabinetDip;
    const inf = M01_Config.infusion;
    if (dip.difficulty < 1 || dip.difficulty > 5) {
      dip.difficulty = 3;
      if (M01_Config.telemetry.selfHealEnabled) this.recordHeal('Normalized DIP difficulty');
    }
    if (dip.slamTilt) {
      dip.slamTilt = false;
      M01_Config.telemetry.hitstopFrames = 0;
      if (M01_Config.telemetry.selfHealEnabled) this.recordHeal('Cleared cabinet SLAM TILT');
    }
    if (
      !Number.isFinite(inf.meshSpringStiffness) ||
      inf.meshSpringStiffness < 20 ||
      inf.meshSpringStiffness > 1200
    ) {
      inf.meshSpringStiffness = 265;
      inf.springPreset = 'CUSTOM';
      if (M01_Config.telemetry.selfHealEnabled) this.recordHeal('Reset spring stiffness k');
    }
    if (
      !Number.isFinite(inf.meshSpringDamping) ||
      inf.meshSpringDamping < 0 ||
      inf.meshSpringDamping > 120
    ) {
      inf.meshSpringDamping = 22;
      inf.springPreset = 'CUSTOM';
      if (M01_Config.telemetry.selfHealEnabled) this.recordHeal('Reset spring damping d');
    }
  },

  captureSnapshot(state: EngineState): void {
    if (M01_Config.telemetry.tickCount % M01_Config.snapshotIntervalTicks !== 0) return;
    const snapFighter = (f: FighterEntity): FighterSnapshot => ({
      x: f.x,
      y: f.y,
      vx: f.vx,
      vy: f.vy,
      facing: f.facing,
      grounded: f.grounded,
      hp: f.hp,
      state: f.state,
    });
    this.snapshots.push({ p1: snapFighter(state.p1), p2: snapFighter(state.p2) });
    if (this.snapshots.length > M01_Config.maxSnapshots) this.snapshots.shift();
  },

  restoreSnapshot(state: EngineState): void {
    if (!M01_Config.telemetry.selfHealEnabled) return;
    const snap = this.snapshots[this.snapshots.length - 1];
    if (!snap) return;
    for (const slot of ['p1', 'p2'] as const) {
      const f = state[slot];
      const s = snap[slot];
      if (!Number.isFinite(f.x) || !Number.isFinite(f.y) || !Number.isFinite(f.hp)) {
        Object.assign(f, s, { animTimer: 0, meshDyn: null });
      }
    }
  },

  sanitizeFighter(f: FighterEntity, fallbackX: number, fallbackFacing: 1 | -1): void {
    if (!M01_Config.telemetry.selfHealEnabled) return;
    let healed = false;
    if (!M02_SpriteMeshAtlas.fighters.has(f.fighterId)) {
      f.fighterId = 'SCORPION_MK_REMIX';
      healed = true;
    }
    if (!Number.isFinite(f.x) || f.x < M01_Config.arenaLeft || f.x > M01_Config.arenaRight) {
      f.x = fallbackX;
      healed = true;
    }
    if (!Number.isFinite(f.y) || f.y > M01_Config.floorY || f.y < -260) {
      f.y = M01_Config.floorY;
      f.vy = 0;
      f.grounded = true;
      healed = true;
    }
    if (!Number.isFinite(f.vx) || Math.abs(f.vx) > 2500) {
      f.vx = 0;
      healed = true;
    }
    if (!Number.isFinite(f.vy) || Math.abs(f.vy) > 3500) {
      f.vy = 0;
      healed = true;
    }
    if (!Number.isFinite(f.hp) || f.hp < 0 || f.hp > 100) {
      f.hp = 100;
      healed = true;
    }
    if (!Number.isFinite(f.squashY) || f.squashY < 0.5 || f.squashY > 1.5) {
      f.squashY = 1;
      healed = true;
    }
    if (!Number.isFinite(f.animTimer) || f.animTimer < 0) {
      f.animTimer = 0;
      healed = true;
    }
    if (f.facing !== 1 && f.facing !== -1) {
      f.facing = fallbackFacing;
      healed = true;
    }

    const validStates = Object.keys(mkAnims);
    if (!validStates.includes(f.state)) {
      f.state = 'idle';
      f.animTimer = 0;
      healed = true;
    }

    if (f.state !== 'ko' && f.state === f.prevState) {
      f.stateFrames = (f.stateFrames || 0) + 1;
      if (f.stateFrames > M01_Config.maxStateFrames) {
        f.state = 'idle';
        f.animTimer = 0;
        f.stateFrames = 0;
        healed = true;
      }
    } else {
      f.prevState = f.state;
      f.stateFrames = 0;
    }

    if (healed) this.recordHeal(`Healed ${f.slot}`);
  },

  exportStudioPayload(state: EngineState): string {
    return JSON.stringify(
      {
        meta: {
          engine: 'MK-2D-SpriteMesh-Autonomous',
          codePart: CODE_PART,
          buildDate: BUILD_DATE,
          exportedAt: new Date().toISOString(),
          moduleCount: 11,
        },
        manualSpec: M01_ArcadeManualSpec,
        config: {
          cabinetDip: M01_Config.cabinetDip,
          infusion: M01_Config.infusion,
          telemetry: {
            roundNumber: M01_Config.telemetry.roundNumber,
            tickCount: M01_Config.telemetry.tickCount,
            healsPerformed: M01_Config.telemetry.healsPerformed,
            healLog: M01_Config.telemetry.healLog,
          },
        },
        fighters: {
          p1: {
            fighterId: state.p1.fighterId,
            wins: state.p1.wins,
            x: state.p1.x,
            y: state.p1.y,
            hp: state.p1.hp,
            score: state.p1.score,
            state: state.p1.state,
          },
          p2: {
            fighterId: state.p2.fighterId,
            wins: state.p2.wins,
            x: state.p2.x,
            y: state.p2.y,
            hp: state.p2.hp,
            score: state.p2.score,
            state: state.p2.state,
          },
        },
      },
      null,
      2
    );
  },
};
