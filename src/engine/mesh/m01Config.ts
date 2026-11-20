/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { EngineConfig, MoveSpec, SpringPreset, StagePreset } from './types';

export const BUILD_DATE = '2026-11-19';
export const CODE_PART = 'CODE-6';

export const M01_ArcadeManualSpec = {
  buildDate: BUILD_DATE,
  codePart: CODE_PART,
  defaultRoundSeconds: 99,
  finisherWindowSeconds: 4.0,
  buttons: Object.freeze({
    START: 'Enter',
    UP: 'KeyW',
    DOWN: 'KeyS',
    LEFT: 'KeyA',
    RIGHT: 'KeyD',
    HP: 'KeyU',
    LP: 'KeyI',
    BL: 'KeyO',
    HK: 'KeyJ',
    LK: 'KeyK',
  }),
  moveValues: Object.freeze<Record<string, MoveSpec>>({
    HP:         { startup: 2, active: [2, 3],    recovery: 4, damage: 10, chip: 1, hitstun: 13, blockstun: 8,  kbX: 140, launchY: 0 },
    LP:         { startup: 2, active: [2, 3],    recovery: 3, damage: 7,  chip: 1, hitstun: 11, blockstun: 7,  kbX: 110, launchY: 0 },
    HK:         { startup: 3, active: [3, 4],    recovery: 6, damage: 15, chip: 2, hitstun: 17, blockstun: 11, kbX: 220, launchY: 0 },
    LK:         { startup: 2, active: [2, 3],    recovery: 4, damage: 9,  chip: 1, hitstun: 12, blockstun: 8,  kbX: 130, launchY: 0 },
    UPPERCUT:   { startup: 3, active: [3, 4, 5], recovery: 9, damage: 20, chip: 3, hitstun: 24, blockstun: 14, kbX: 150, launchY: -620 },
    SWEEP:      { startup: 3, active: [3, 4],    recovery: 8, damage: 12, chip: 2, hitstun: 20, blockstun: 12, kbX: 120, launchY: -220, knockdown: true },
    ROUNDHOUSE: { startup: 4, active: [4, 5],    recovery: 9, damage: 17, chip: 3, hitstun: 19, blockstun: 13, kbX: 270, launchY: -160 },
    THROW:      { startup: 2, active: [2],       recovery: 7, damage: 16, chip: 0, hitstun: 22, blockstun: 0,  kbX: 290, launchY: -340, unblockableClose: true },
    PROJECTILE: { startup: 3, active: [3, 4],    recovery: 8, damage: 13, chip: 2, hitstun: 16, blockstun: 11, kbX: 190, launchY: 0, spawnProjFrame: 3 },
  }),
};

export const STAGE_PRESETS: StagePreset[] = [
  { id: 'THE_PIT',       name: 'THE PIT',       floorFill: '#1b2538', rimStroke: '#38bdf8', hazardAmp: 0.4, gridPitch: 24 },
  { id: 'LIVING_FOREST', name: 'LIVING FOREST', floorFill: '#172922', rimStroke: '#34d399', hazardAmp: 0.7, gridPitch: 32 },
  { id: 'GOROS_LAIR',    name: "GORO'S LAIR",   floorFill: '#2a1822', rimStroke: '#f59e0b', hazardAmp: 1.0, gridPitch: 20 },
];

export const SPRING_PRESETS: Readonly<Record<'bouncy' | 'stiff' | 'watery', SpringPreset>> = Object.freeze({
  bouncy: { id: 'bouncy', stiffness: 190, damping: 6 },
  stiff:  { id: 'stiff',  stiffness: 560, damping: 46 },
  watery: { id: 'watery', stiffness: 95,  damping: 14 },
});

export function createDefaultM01Config(): EngineConfig {
  return {
    width: 960,
    height: 500,
    floorY: 410,
    gravity: 2150,
    fixedDt: 1 / 60,
    maxFrameDt: 0.1,
    physicsSubsteps: 2,
    constraintIterations: 2,
    arenaLeft: 70,
    arenaRight: 890,
    maxStateFrames: 180,
    snapshotIntervalTicks: 10,
    maxSnapshots: 30,
    cabinetDip: {
      freePlay: true,
      difficulty: 3,
      autoAdaptDifficulty: true,
      roundTime: M01_ArcadeManualSpec.defaultRoundSeconds,
      bloodGore: true,
      slamTilt: false,
    },
    infusion: {
      stageIndex: 0,
      activeFinisherWindow: false,
      finisherTimer: 0,
      lastFinisher: 'NONE',
      stageInfusionLevel: 0,
      hazardPulsePhase: 0,
      springPreset: 'CUSTOM',
      meshSpringStiffness: 265,
      meshSpringDamping: 22,
      shakeIntensity: 0,
    },
    telemetry: {
      fps: 60,
      tickCount: 0,
      substepCount: 0,
      hitstopFrames: 0,
      roundNumber: 1,
      roundClock: M01_ArcadeManualSpec.defaultRoundSeconds,
      roundPhase: 'FIGHT',
      selfHealEnabled: true,
      healsPerformed: 0,
      lastHealReason: 'NONE',
      healLog: [],
      showMesh: true,
      showDiagnostics: true,
      p1Autonomous: true,
      p2Autonomous: true,
    },
  };
}

export const M01_Config: EngineConfig = createDefaultM01Config();

export function resetM01Config(): void {
  const fresh = createDefaultM01Config();
  Object.assign(M01_Config, fresh);
}
