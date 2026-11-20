/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BUILD_DATE, CODE_PART } from './m01Config';
import { M02_SpriteMeshAtlas } from './m02SpriteMeshAtlas';
import type {
  EngineConfig,
  EngineState,
  ManifestHealth,
  MasterBuildManifest,
  TelemetryTimelineFrame,
} from './types';

const MAX_TIMELINE_FRAMES = 180;

export const M11_ManifestInspector = {
  timeline: [] as TelemetryTimelineFrame[],
  lastHealth: {
    valid: true,
    checkedAtTick: 0,
    violations: [],
    moduleCount: 11,
    activePreset: 'CUSTOM',
  } as ManifestHealth,

  validateContracts(
    config: EngineConfig,
    state: EngineState,
    manifest?: MasterBuildManifest
  ): ManifestHealth {
    const violations: string[] = [];

    if (config.cabinetDip.difficulty < 1 || config.cabinetDip.difficulty > 5) {
      violations.push('cabinetDip.difficulty out of bounds (1..5)');
    }
    if (!Number.isFinite(config.infusion.meshSpringStiffness) || config.infusion.meshSpringStiffness < 20) {
      violations.push('infusion.meshSpringStiffness invalid');
    }
    if (!Number.isFinite(config.infusion.meshSpringDamping) || config.infusion.meshSpringDamping < 0) {
      violations.push('infusion.meshSpringDamping invalid');
    }
    if (config.infusion.stageIndex < 0 || config.infusion.stageIndex > 2) {
      violations.push('infusion.stageIndex out of bounds (0..2)');
    }

    for (const slot of ['p1', 'p2'] as const) {
      const f = state[slot];
      if (!Number.isFinite(f.x) || !Number.isFinite(f.y)) {
        violations.push(`${slot} coordinates non-finite`);
      }
      if (!Number.isFinite(f.hp) || f.hp < 0 || f.hp > 100) {
        violations.push(`${slot}.hp out of bounds (0..100)`);
      }
      if (!M02_SpriteMeshAtlas.fighters.has(f.fighterId)) {
        violations.push(`${slot}.fighterId unregistered (${f.fighterId})`);
      }
    }

    this.lastHealth = {
      valid: violations.length === 0,
      checkedAtTick: config.telemetry.tickCount,
      violations,
      moduleCount: manifest ? manifest.modules.length : 11,
      activePreset: config.infusion.springPreset,
    };

    return this.lastHealth;
  },

  recordTelemetryFrame(config: EngineConfig, state: EngineState): void {
    if (config.telemetry.tickCount % 15 !== 0) return;
    this.timeline.push({
      tick: config.telemetry.tickCount,
      roundNumber: config.telemetry.roundNumber,
      roundPhase: config.telemetry.roundPhase,
      p1Hp: state.p1.hp,
      p2Hp: state.p2.hp,
      p1State: state.p1.state,
      p2State: state.p2.state,
      springK: config.infusion.meshSpringStiffness,
      springD: config.infusion.meshSpringDamping,
      heals: config.telemetry.healsPerformed,
    });
    if (this.timeline.length > MAX_TIMELINE_FRAMES) {
      this.timeline.shift();
    }
  },

  getTimeline(): TelemetryTimelineFrame[] {
    return this.timeline;
  },

  clearTimeline(): void {
    this.timeline = [];
  },

  buildGoldenMasterExport(
    config: EngineConfig,
    state: EngineState,
    manifest: MasterBuildManifest
  ): string {
    const health = this.validateContracts(config, state, manifest);
    return JSON.stringify(
      {
        meta: {
          ...manifest.meta,
          codePart: CODE_PART,
          buildDate: BUILD_DATE,
          exportedAt: new Date().toISOString(),
        },
        manifestHealth: health,
        runtimeConfig: config,
        fighters: {
          p1: {
            fighterId: state.p1.fighterId,
            x: state.p1.x,
            y: state.p1.y,
            hp: state.p1.hp,
            wins: state.p1.wins,
            score: state.p1.score,
            state: state.p1.state,
          },
          p2: {
            fighterId: state.p2.fighterId,
            x: state.p2.x,
            y: state.p2.y,
            hp: state.p2.hp,
            wins: state.p2.wins,
            score: state.p2.score,
            state: state.p2.state,
          },
        },
        telemetryTimeline: this.timeline.slice(-24),
        manifest,
      },
      null,
      2
    );
  },
};
