/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SlotId = 'p1' | 'p2';
export type SpringPresetId = 'BOUNCY' | 'STIFF' | 'WATERY' | 'CUSTOM';
export type RoundPhase = 'FIGHT' | 'FINISH_HIM' | 'ROUND_OVER';
export type MeshNodeType = 'ROOT' | 'HURT' | 'HIT' | 'LIMB';

export interface MoveSpec {
  startup: number;
  active: number[];
  recovery: number;
  damage: number;
  chip: number;
  hitstun: number;
  blockstun: number;
  kbX: number;
  launchY: number;
  knockdown?: boolean;
  unblockableClose?: boolean;
  spawnProjFrame?: number;
}

export interface StagePreset {
  id: string;
  name: string;
  floorFill: string;
  rimStroke: string;
  hazardAmp: number;
  gridPitch: number;
}

export interface SpringPreset {
  id: 'bouncy' | 'stiff' | 'watery';
  stiffness: number;
  damping: number;
}

export interface CabinetDipConfig {
  freePlay: boolean;
  difficulty: number;
  autoAdaptDifficulty: boolean;
  roundTime: number;
  bloodGore: boolean;
  slamTilt: boolean;
}

export interface InfusionConfig {
  stageIndex: number;
  activeFinisherWindow: boolean;
  finisherTimer: number;
  lastFinisher: string;
  stageInfusionLevel: number;
  hazardPulsePhase: number;
  springPreset: SpringPresetId;
  meshSpringStiffness: number;
  meshSpringDamping: number;
  shakeIntensity: number;
}

export interface HealLogEntry {
  tick: number;
  reason: string;
}

export interface TelemetryConfig {
  fps: number;
  tickCount: number;
  substepCount: number;
  hitstopFrames: number;
  roundNumber: number;
  roundClock: number;
  roundPhase: RoundPhase;
  selfHealEnabled: boolean;
  healsPerformed: number;
  lastHealReason: string;
  healLog: HealLogEntry[];
  showMesh: boolean;
  showDiagnostics: boolean;
  p1Autonomous: boolean;
  p2Autonomous: boolean;
}

export interface EngineConfig {
  width: number;
  height: number;
  floorY: number;
  gravity: number;
  fixedDt: number;
  maxFrameDt: number;
  physicsSubsteps: number;
  constraintIterations: number;
  arenaLeft: number;
  arenaRight: number;
  maxStateFrames: number;
  snapshotIntervalTicks: number;
  maxSnapshots: number;
  cabinetDip: CabinetDipConfig;
  infusion: InfusionConfig;
  telemetry: TelemetryConfig;
}

export interface MeshNodeLocal {
  x: number;
  y: number;
  r: number;
  type: MeshNodeType;
}

export interface WorldMeshNode {
  wx: number;
  wy: number;
  r: number;
  type: MeshNodeType;
}

export interface MeshDynNode {
  wx: number;
  wy: number;
  vx: number;
  vy: number;
}

export interface AnimSpec {
  frames: number;
  loop: boolean;
  hitWindow?: number[];
  rects?: Array<{ x: number; y: number; w: number; h: number }>;
  meshFn?: (
    idx: number,
    ratio: number,
    squashY: number,
    meshScale: number
  ) => Record<string, MeshNodeLocal>;
}

export interface FighterSpec {
  name: string;
  sheetId: string;
  meshScale: number;
  tint: string;
  projectileColor: string;
  anims: Record<string, AnimSpec>;
}

export interface SpriteSheetEntry {
  img: HTMLImageElement;
  loaded: boolean;
  url: string;
}

export interface FrameData {
  idx: number;
  totalFrames: number;
  loop: boolean;
  isActiveHit: boolean;
  spawnProjFrame: number;
  damage: number;
  chipDamage: number;
  hitstun: number;
  blockstun: number;
  knockbackX: number;
  launchY: number;
  knockdown: boolean;
  unblockableClose: boolean;
  sheet: SpriteSheetEntry | null;
  frameRect: { x: number; y: number; w: number; h: number } | null;
  nodes: Record<string, MeshNodeLocal>;
  tint: string;
  projectileColor: string;
}

export interface FighterEntity {
  slot: SlotId;
  fighterId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  moveDir: -1 | 0 | 1;
  blocking: boolean;
  grounded: boolean;
  hp: number;
  combo: number;
  wins: number;
  roundAwarded: boolean;
  score: number;
  squashY: number;
  state: string;
  prevState: string;
  stateFrames: number;
  animTimer: number;
  invulnTimer: number;
  hasConnectedThisAttack: boolean;
  spawnedProj: boolean;
  koResetTimer?: number;
  worldMesh: Record<string, WorldMeshNode>;
  meshDyn: Record<string, MeshDynNode> | null;
  activeFrame: FrameData | null;
  oppRef: FighterEntity | null;
}

export interface ProjectileEntity {
  ownerSlot: SlotId;
  targetRef: FighterEntity;
  x: number;
  y: number;
  vx: number;
  r: number;
  spec: FrameData;
  life: number;
}

export interface EngineState {
  p1: FighterEntity;
  p2: FighterEntity;
}

export interface ManifestHealth {
  valid: boolean;
  checkedAtTick: number;
  violations: string[];
  moduleCount: number;
  activePreset: SpringPresetId;
}

export interface TelemetryTimelineFrame {
  tick: number;
  roundNumber: number;
  roundPhase: RoundPhase;
  p1Hp: number;
  p2Hp: number;
  p1State: string;
  p2State: string;
  springK: number;
  springD: number;
  heals: number;
}

export interface ManifestModuleRecord {
  id: string;
  name: string;
  filename: string;
  extension: string;
  role: string;
  code: string;
}

export interface MasterBuildManifest {
  meta: {
    project: string;
    codePart: string;
    buildDate: string;
    sourceFile: string;
    targetEnvironment: string;
    moduleCount: number;
    features: string[];
  };
  systemInstruction: string;
  contractSchema: {
    sharedState: Record<string, unknown>;
    moduleInterfaces: Array<{
      module: string;
      exports?: string[];
      methods?: string[];
    }>;
  };
  modules: ManifestModuleRecord[];
}
