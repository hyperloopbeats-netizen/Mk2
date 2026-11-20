/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CharacterId = 
  | 'scorpion' 
  | 'subzero' 
  | 'liukang'
  | 'smoke' 
  | 'raiden' 
  | 'reptile'
  | 'kunglao'
  | 'kitana'
  | 'mileena'
  | 'aimix'
  | 'sonya'
  | 'johnny'
  | 'goro'
  | 'robocop'
  | 'leonardo'
  | 'noob'
  | 'shangtsung';

export interface Matrix9DTelemetry {
  torsoRot: number;       // Dim 1: Torso rotation angle in degrees (-45° to +45°)
  armPhase: number;       // Dim 2: Lead/rear arm phase ratio (0.0 to 1.0)
  zGate: ElevationLevel;  // Dim 3: Elevation gate (Y01 to Y12)
  breathingWave: number;  // Dim 4: Thoracic sinusoidal displacement (-5px to +5px)
  pelvisSway: number;     // Dim 5: Pelvic counterbalance offset (-15px to +15px)
  headPitch: number;      // Dim 6: Reactive cranial snap / gaze angle (-35° to +35°)
  strideVelocity: number; // Dim 7: Stride translation rate
  weaponPhase: number;    // Dim 8: Weapon kinetic state & trail angle
  fluidFlow: number;      // Dim 9: Arterial blood & ki pressure (ml/s)
}

export type AnatomicalZone = 'HEAD' | 'TORSO' | 'LEFT_LIMBS' | 'RIGHT_LIMBS';

export interface ZoneStatus {
  hp: number;
  maxHp: number;
  isBroken: boolean;
  breakLabel: string;
}

export type FighterState = 
  | 'INTRO'
  | 'IDLE' 
  | 'WALK' 
  | 'RUN'
  | 'DASH'
  | 'THROW'
  | 'CROUCH' 
  | 'JUMP' 
  | 'BLOCK' 
  | 'GUARD_CRUSH'
  | 'ATTACK' 
  | 'HITSTUN' 
  | 'STAGGER'
  | 'AIR_TUMBLE'
  | 'KNOCKED_DOWN'
  | 'WAKEUP'
  | 'JUGGLE'
  | 'CRUMPLE'
  | 'FROZEN' 
  | 'PULLED' 
  | 'DIZZY' 
  | 'FALLEN'
  | 'VICTORY' 
  | 'DEAD'
  | 'TAG_IN'
  | 'SPEAR_THROW'
  | 'TELEPORT'
  | 'STAGE_FALL'
  | 'FATALITY_EXECUTION';

export type DistanceCategory = 'CLOSE' | 'SWEEP' | 'FAR';

export interface GGPOStats {
  frame: number;
  rollbackCount: number;
  inputDelay: number;
}

export type SixButtonAction = 
  | 'LP'        // Light Punch
  | 'HP'        // Heavy Punch
  | 'LK'        // Light Kick
  | 'HK'        // Heavy Kick
  | 'UPPERCUT'  // Launcher Uppercut
  | 'SWEEP'     // Low Leg Sweep
  | 'THROW'     // Close Grapple Slam
  | 'RUN'       // Forward MK Sprint
  | 'BLOCK'     // 80% Damage Reduction Guard
  | 'SUPER'     // 100% EX / Fatal Blow / Fatality
  | 'WEAPON'
  | 'TAG';

export type SpecialSkillId = 
  // Scorpion
  | 'SCORPION_SPEAR' 
  | 'SCORPION_TELEPORT' 
  | 'SCORPION_FLAME' 
  | 'SCORPION_WEAPON_SLASH'
  | 'SCORPION_SUPER'
  | 'SCORPION_FATALITY'
  // Sub-Zero
  | 'SUBZERO_ICEBALL' 
  | 'SUBZERO_SLIDE' 
  | 'SUBZERO_ICE_SPIKE' 
  | 'SUBZERO_WEAPON_SLASH'
  | 'SUBZERO_SUPER'
  | 'SUBZERO_FATALITY'
  // Smoke
  | 'SMOKE_TELEPORT_UPPER' 
  | 'SMOKE_BOMB' 
  | 'SMOKE_VAPOR_STRIKE' 
  | 'SMOKE_WEAPON_SICKLE'
  | 'SMOKE_SUPER'
  | 'SMOKE_FATALITY'
  // Raiden
  | 'RAIDEN_TORPEDO' 
  | 'RAIDEN_LIGHTNING' 
  | 'RAIDEN_SHOCK_GRAB' 
  | 'RAIDEN_WEAPON_STAFF'
  | 'RAIDEN_SUPER'
  | 'RAIDEN_FATALITY'
  // Liu Kang
  | 'LIUKANG_DRAGON_FIRE' 
  | 'LIUKANG_FLYING_KICK' 
  | 'LIUKANG_BICYCLE_KICK' 
  | 'LIUKANG_WEAPON_NUNCHAKU'
  | 'LIUKANG_SUPER'
  | 'LIUKANG_FATALITY'
  // Sonya Blade
  | 'SONYA_ENERGY_RINGS'
  | 'SONYA_LEG_GRAB'
  | 'SONYA_CARTWHEEL'
  | 'SONYA_WEAPON_BLADES'
  | 'SONYA_SUPER'
  | 'SONYA_FATALITY'
  // Johnny Cage
  | 'JOHNNY_SHADOW_KICK'
  | 'JOHNNY_FORCEBALL'
  | 'JOHNNY_NUT_PUNCH'
  | 'JOHNNY_WEAPON_BRASS'
  | 'JOHNNY_SUPER'
  | 'JOHNNY_FATALITY'
  // Reptile
  | 'REPTILE_ACID_SPIT'
  | 'REPTILE_FORCEBALL'
  | 'REPTILE_SLIDE'
  | 'REPTILE_WEAPON_CLAW'
  | 'REPTILE_SUPER'
  | 'REPTILE_FATALITY'
  // Kung Lao
  | 'KUNGLAO_HAT_THROW'
  | 'KUNGLAO_SPIN'
  | 'KUNGLAO_DIVE_KICK'
  | 'KUNGLAO_WEAPON_HAT'
  | 'KUNGLAO_SUPER'
  | 'KUNGLAO_FATALITY'
  // Kitana
  | 'KITANA_FAN_LIFT'
  | 'KITANA_FAN_THROW'
  | 'KITANA_SQUARE_WAVE'
  | 'KITANA_WEAPON_FANS'
  | 'KITANA_SUPER'
  | 'KITANA_FATALITY'
  // Mileena
  | 'MILEENA_SAI_THROW'
  | 'MILEENA_TELEPORT_DROP'
  | 'MILEENA_ROLLING_THUNDER'
  | 'MILEENA_WEAPON_SAI'
  | 'MILEENA_SUPER'
  | 'MILEENA_FATALITY'
  // Goro
  | 'GORO_GROUND_STOMP'
  | 'GORO_CHEST_POUND'
  | 'GORO_FIREBALL'
  | 'GORO_WEAPON_HAMMER'
  | 'GORO_SUPER'
  | 'GORO_FATALITY'
  // RoboCop
  | 'ROBOCOP_AUTO9_BURST'
  | 'ROBOCOP_RIOT_SHIELD'
  | 'ROBOCOP_MISSILE'
  | 'ROBOCOP_WEAPON_SPIKE'
  | 'ROBOCOP_SUPER'
  | 'ROBOCOP_FATALITY'
  // Leonardo
  | 'LEONARDO_KATANA_SPIN'
  | 'LEONARDO_NINJA_STRIKE'
  | 'LEONARDO_SHELL_CHARGE'
  | 'LEONARDO_WEAPON_DUAL_SWORD'
  | 'LEONARDO_SUPER'
  | 'LEONARDO_FATALITY'
  // Shang Tsung
  | 'SHANG_FIRE_SKULL'
  | 'SHANG_SOUL_STEAL'
  | 'SHANG_GROUND_SKULLS'
  | 'SHANG_WEAPON_STAFF'
  | 'SHANG_SUPER'
  | 'SHANG_FATALITY'
  // Noob Saibot
  | 'NOOB_SHADOW_CLONE'
  | 'NOOB_TELEPORT_SLAM'
  | 'NOOB_DARK_BALL'
  | 'NOOB_WEAPON_SCYTHE'
  | 'NOOB_SUPER'
  | 'NOOB_FATALITY'
  // AIMIX (Apex Sonic Ninja Boss)
  | 'AIMIX_SONIC_BLAST'
  | 'AIMIX_SONIC_TELEPORT'
  | 'AIMIX_BASS_CANNON'
  | 'AIMIX_WEAPON_SONIC'
  | 'AIMIX_SUPER'
  | 'AIMIX_FATALITY'
  // Core Actions
  | 'LP'
  | 'HP'
  | 'LK'
  | 'HK'
  | 'UPPERCUT'
  | 'SWEEP'
  | 'CROUCH_LK'
  | 'THROW'
  | 'RUN'
  | 'JUMP_PUNCH'
  | 'JUMP_KICK';

export const CORE_CHARACTER_IDS: readonly CharacterId[] = [
  'scorpion',
  'subzero',
  'johnny',
  'liukang',
] as const;

export interface CombatMove {
  id: SpecialSkillId;
  name: string;
  zone: AnatomicalZone;
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  staminaCost: number; // Stamina Fatigue
  kbX: number;
  kbY?: number;
  superCost?: number;
  description: string;
  inputCombo: string;
  isSpecial?: boolean;
  isWeapon?: boolean;
  isSuper?: boolean;
  isFatality?: boolean;
  isLauncher?: boolean;
  triggersSlowMo?: boolean;
  slowMoScale?: number;
  audioKey?: string;
  projectile?: 'SPEAR' | 'ICEBALL' | 'LIGHTNING' | 'DRAGON_FIRE' | 'SMOKE_CLOUD' | 'SONIC_WAVE' | 'ENERGY_RING' | 'DARK_BALL' | 'FORCEBALL' | 'ACID' | 'HAT' | 'FAN' | 'FIREBALL' | 'SAI';
  weaponTrailColor?: string;
}

export interface TripleComboRoute {
  id: string;
  name: string;
  sequence: [string, string, string];
  finisherMultiplier: number;
  finisherLaunchY: number;
  finisherKbX: number;
  badgeColor: string;
}

export interface FlyingMovementNode {
  phase: 'LAUNCH' | 'APEX' | 'GLIDE' | 'DIVE' | 'HOVER' | 'TUMBLE' | 'DESCENT' | 'LANDING';
  gravityScale: number;
  dragX: number;
  liftImpulse: number;
  maxAirSpeed: number;
}

export interface CharacterFlightProfile {
  archetype: 'AERIAL_ACROBAT' | 'THUNDER_GLIDE' | 'CRYO_SUSPEND' | 'SHADOW_WARP' | 'SONIC_LEVITATE' | 'HEAVY_METEOR';
  gravityMultiplier: number;
  airControl: number;
  jumpImpulse: number;
  doubleArcLift: number;
  diveSpeed: number;
  trailColor: string;
  nodes: Record<FlyingMovementNode['phase'], FlyingMovementNode>;
}

export type BodyPartName = 'HEAD' | 'TORSO' | 'L_ARM' | 'R_ARM' | 'L_LEG' | 'R_LEG';

export interface PartTransform {
  rot: number; // Rotation in degrees
  ox: number;  // Anchor X offset (px)
  oy: number;  // Anchor Y offset (py)
}

export type Modular6Pose = Record<BodyPartName, PartTransform>;

// 12 Vertical Elevation Levels: Slices active height space from peak air jump (Y01) down to crouching sweep stance (Y12)
export type ElevationLevel = 'Y01' | 'Y02' | 'Y03' | 'Y04' | 'Y05' | 'Y06' | 'Y07' | 'Y08' | 'Y09' | 'Y10' | 'Y11' | 'Y12';

export interface CharacterDef {
  id: CharacterId;
  name: string;
  title: string;
  realm: string;
  quote: string;
  themeColor: string;
  accentColor: string;
  skinColor: string;
  giColor: string;
  maskColor: string;
  trimColor: string;
  speed: number;
  mass: number;
  weaponName: string;
  weaponType: 
    | 'KATANA' 
    | 'ICE_BLADE' 
    | 'SICKLE' 
    | 'THUNDER_STAFF' 
    | 'NUNCHAKU' 
    | 'WINDMILL_BLADES' 
    | 'BRASS_KNUCKLES' 
    | 'SHADOW_SCYTHE' 
    | 'SONIC_RESONATOR'
    | 'REPTILE_CLAW'
    | 'RAZOR_HAT'
    | 'STEEL_FANS'
    | 'TWIN_SAI'
    | 'SHOKAN_HAMMER'
    | 'AUTO9_SPIKE'
    | 'TWIN_NINJATO'
    | 'SOUL_SCROLL';
  weaponMove: CombatMove;
  specials: CombatMove[];
  superMove: CombatMove;
  fatalityMove: CombatMove;
}

export type StageId =
  | 'SOUL_COLLIDER'
  | 'THE_PIT'
  | 'NETHERREALM'
  | 'ICE_TEMPLE'
  | 'COURTYARD'
  | 'VANCOUVER_LIONS_GATE'
  | 'VANCOUVER_GASTOWN'
  | 'VANCOUVER_CHINATOWN'
  | 'VANCOUVER_FALSE_CREEK'
  | 'VANCOUVER_VIADUCT'
  | 'CUSTOM_VANCOUVER_AI';

export interface StageDef {
  id: StageId;
  name: string;
  location: string;
  skyColor: string;
  floorColor: string;
  ambientLight: string;
  bgImage?: string;
  eraYear?: number;
}

export type CircleDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | 'CENTER' | 'TAP';

export interface ComboVestmentNode {
  id: string;
  name: string;
  direction: CircleDirection;
  damage: number;
  zone: AnatomicalZone;
  actionName: string;
  branchHints?: string[];
}

export interface ComboSequencePlan {
  chainTitle: string;
  styleNarrative: string;
  nodes: ComboVestmentNode[];
}

export interface HitboxRect {
  x: number;
  y: number;
  width: number;
  height: number;
  attack: CombatMove;
}

export interface HurtboxMap {
  HEAD: { x: number; y: number; width: number; height: number };
  TORSO: { x: number; y: number; width: number; height: number };
  LEFT_LIMBS: { x: number; y: number; width: number; height: number };
  RIGHT_LIMBS: { x: number; y: number; width: number; height: number };
}

export type ZLane = -1 | 0 | 1; // -1: BACK depth lane, 0: CENTER plane, +1: FORE depth lane

export type JumpKind = 'NEUTRAL' | 'FORWARD' | 'BACK' | 'SHORT_HOP';

export type JumpPhase = 'GROUNDED' | 'PRE_JUMP' | 'ASCENT' | 'APEX' | 'DESCENT' | 'FAST_FALL';

export interface Projectile {
  id: string;
  type: 'SPEAR' | 'ICEBALL' | 'LIGHTNING' | 'DRAGON_FIRE' | 'SMOKE_CLOUD' | 'SONIC_WAVE' | 'ENERGY_RING' | 'DARK_BALL' | 'FORCEBALL' | 'ACID' | 'HAT' | 'FAN' | 'FIREBALL' | 'SAI';
  ownerFacing: 1 | -1;
  x: number;
  y: number;
  vx: number;
  vy: number;
  originX: number;
  originY: number;
  targetX?: number;
  targetY?: number;
  radius: number;
  damage: number;
  zone: AnatomicalZone;
  ttl: number;
  active: boolean;
  zLane?: ZLane;
}

export interface SeveredPart {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  vAngle: number;
  type: 'HEAD' | 'ARM' | 'TORSO' | 'HEAD_SPINE';
  color: string;
  skinColor: string;
  isGrounded?: boolean;
}

export type TowerTier = 'NOVICE' | 'WARRIOR' | 'MASTER';

export interface TowerDef {
  id: TowerTier;
  title: string;
  fighterCount: number;
  description: string;
  fighters: CharacterId[];
}

export type GameMatchState =
  | 'CAMO_INTRO'        // Mortal Kombat Title & Mode Hub
  | 'ROSTER_SELECT'     // Opening character & tower select (Matrix)
  | 'TOWER_SELECT'      // Classic Choose Your Destiny stone pillar screen
  | 'STORY_MAP'         // Non-linear 1960s Vancouver branching campaign map
  | 'STORY_CUTSCENE'    // Gemini-driven Story Cutscene + Plot Art Evolution
  | 'VS_SPLASH'         // Movie-style VS confrontation curtain transition
  | 'INTRO_LOCK'        // 2-second pre-match stance lock
  | 'FIGHTING'          // Active combat
  | 'SUPER_CINEMATIC'   // Multi-beat Super / Fatal Blow cutscene lock
  | 'ROUND_KNOCKOUT'    // Defeated fighter in fallen ragdoll state
  | 'FINISH_HIM'        // Match point dizzy state with timer
  | 'FATALITY_PLAYING'  // Weapon execution animation (elaborate 7s sequence)
  | 'ROUND_END'         // Resetting for next round
  | 'MATCH_OVER'        // Tournament win / continue screen
  | 'TOWER_VICTORY';    // Climbed to the top and conquered the tower

export type MovementMatrixDomain =
  | 'GROUND_LOCOMOTION'
  | 'AERIAL_FLIGHT'
  | 'COMBAT_OFFENSE'
  | 'DEFENSE_EVASION'
  | 'HIT_REACTION'
  | 'CINEMATIC_FINISHER';

export type ReactionKind =
  | 'LIGHT_REEL'
  | 'HEAVY_REEL'
  | 'STAGGER'
  | 'GUARD_CRUSH'
  | 'LAUNCH'
  | 'JUGGLE'
  | 'SWEEP_TRIP'
  | 'KNOCKDOWN'
  | 'DIZZY'
  | 'FROZEN'
  | 'PULLED'
  | 'CRUMPLE';

export type SpriteTrackName =
  | 'idle'
  | 'walk'
  | 'run'
  | 'dash'
  | 'crouch'
  | 'block'
  | 'jump'
  | 'airTumble'
  | 'lp'
  | 'hp'
  | 'lk'
  | 'hk'
  | 'uppercut'
  | 'sweep'
  | 'crouchLk'
  | 'throw'
  | 'jumpPunch'
  | 'jumpKick'
  | 'flyingKick'
  | 'weaponSlash'
  | 'weaponThrust'
  | 'comboLink1'
  | 'comboLink2'
  | 'comboFinisher'
  | 'special1'
  | 'special2'
  | 'hitstun'
  | 'stagger'
  | 'dizzy'
  | 'finishStance'
  | 'knockdown'
  | 'fallen'
  | 'wakeup'
  | 'frozen'
  | 'decapitated'
  | 'burnSkeleton'
  | 'victory'
  | 'morphDragon';

export interface MatrixFrameTiming {
  startup: number;
  active: number;
  recovery: number;
  hitstun: number;
  blockstun: number;
  hitstop: number;
  cancelable: boolean;
}

export interface MovementMatrixCell {
  id: string;
  mechId: number;
  name: string;
  domain: MovementMatrixDomain;
  spriteTrack: SpriteTrackName;
  fps: number;
  loop: boolean;
  morphTicks: number;
  frameTiming: MatrixFrameTiming;
  reactionOnHit?: ReactionKind;
  elevationGate: ElevationLevel;
  spatialSfx: 'NONE' | 'FOOTSTEP' | 'JUMP' | 'LAND' | 'DASH' | 'PUNCH_L' | 'PUNCH_H' | 'KICK_L' | 'KICK_H' | 'UPPERCUT' | 'SWEEP' | 'WEAPON' | 'SPECIAL' | 'SUPER' | 'GUARD' | 'PARRY' | 'HIT' | 'FATALITY';
  description: string;
}

export interface SpatialDspProfile {
  subBassGainDb: number;     // -6 to +12 dB @ 65Hz
  midPresenceDb: number;     // -6 to +6 dB @ 1.2kHz
  airSparkleDb: number;      // -6 to +6 dB @ 6.5kHz
  tubeDrive: number;         // 0.0 to 1.0 WaveShaper warmth
  compressorPunch: number;   // 0.0 to 1.0 dynamic range punch
  spatialWidth: number;      // 0.0 to 1.5 3D panning exaggeration
  footstepVolume: number;    // 0.0 to 1.0 subtle locomotion foley
}

export interface SwarmAgentReport {
  agentName: string;
  role: string;
  status: 'ANALYZED' | 'SYNTHESIZED';
  summary: string;
  recommendations: string[];
}

export interface SwarmSynthesisPatch {
  patchTitle: string;
  source: 'GEMINI_SWARM' | 'CODEBASE_BLUEPRINT';
  modelUsed: string;
  archetypeFocus: string;
  combatTuning: {
    globalSpeedMult: number;
    hitstopScale: number;
    juggleGravityScale: number;
    superDamageMult: number;
    wakeupInvulnFrames: number;
    chipDamageRate: number;
  };
  dspProfile: SpatialDspProfile;
  menuDirective: {
    tournamentSubtitle: string;
    vsBannerCallout: string;
    roundStartChant: string;
  };
  superChoreography: {
    freezeMs: number;
    barrageHits: number;
    finisherSlowMoScale: number;
    cameraPeakZoom: number;
    tagline: string;
  };
  agentReports: SwarmAgentReport[];
}

// ==========================================
// LINEAR FIGHTING GAUGE & REACTIVE KOMBAT
// ==========================================

export type LinearGaugeZone = 'BREAKER' | 'NEUTRAL' | 'PRESSURE' | 'OVERDRIVE';

export type ReactiveEventType =
  | 'HIT'
  | 'WHIFF_PUNISH'
  | 'ANTI_AIR'
  | 'PARRY'
  | 'BREAKER'
  | 'BLOCK'
  | 'STRIDE_SYNERGY'
  | 'SIDESTEP_EVADE'
  | 'DASH_CANCEL';

export interface LinearGaugeState {
  value: number; // -100 (CPU Pressure/Overdrive) to +100 (P1 Pressure/Overdrive)
  p1Zone: LinearGaugeZone;
  cpuZone: LinearGaugeZone;
  p1Breakers: number;
  cpuBreakers: number;
  lastEvent: string;
  lastActor: 'P1' | 'CPU' | null;
  lastDelta: number;
  momentumStreak: number;
}

// ==========================================
// 1960s VANCOUVER AI LEVEL DESIGNER & STRIDES
// ==========================================

export type StrideEffectKind =
  | 'SLICK_SPEED'    // Rain-slick asphalt: +28% run speed & dash velocity
  | 'TRAM_SPRING'    // BC Electric streetcar rails: +22% jump lift & air drift impulse
  | 'FOG_CLOAK'      // Burrard Inlet sea fog: partial stealth shimmer & +2f sidestep i-frames
  | 'NEON_SHOCK'     // Pender St neon puddle: +15% special damage & faster super charge
  | 'TIMBER_BOUNCE'  // Cedar dock planks: softens knockdowns & boosts upward launcher bounce
  | 'GRAVITY_RIFT';  // Outworld-1960s fracture: low-gravity floating air juggles

export type VancouverWeather = 'RAIN' | 'FOG' | 'DRIZZLE' | 'NEON_MIST' | 'STORM';

export type VancouverLandmark =
  | 'LIONS_GATE_BRIDGE'
  | 'GASTOWN_STEAM_CLOCK'
  | 'CHINATOWN_GATE'
  | 'FALSE_CREEK_DOCKS'
  | 'GEORGIA_VIADUCT';

export interface LevelStrideZone {
  id: string;
  name: string;
  startX: number; // 30..930 world units
  endX: number;
  effect: StrideEffectKind;
  intensity: number; // 0.6 to 1.6
  color: string;
  label: string;
}

export interface StagePlatform {
  id: string;
  label: string;
  x: number;
  y: number; // e.g., 270..355 (above floorY=445)
  width: number;
  style: 'STREETCAR' | 'BRICK_BALCONY' | 'STEEL_TRUSS' | 'NEON_AWNING' | 'TIMBER_PIER';
}

export interface VancouverLevelDesign {
  id: string;
  title: string;
  year: number; // 1960..1969
  district: string;
  eraAtmosphere: string;
  weather: VancouverWeather;
  skyPalette: [string, string, string];
  accentColor: string;
  landmarkType: VancouverLandmark;
  strides: LevelStrideZone[];
  platforms: StagePlatform[];
  hazards: string[];
  architectNotes: string;
  source: 'GEMINI_ARCHITECT' | 'BLUEPRINT_1960S';
}

// ==========================================
// GEMINI STORY MODE & PLOT ART EVOLUTION
// ==========================================

export interface PlotArtEvolutionStage {
  chapterId: string;
  title: string;
  subtitle: string;
  year: number;
  landmark: VancouverLandmark;
  weather: VancouverWeather;
  skyTint: [string, string];
  focalColor: string;
  secondaryColor: string;
  fogDensity: number; // 0..1
  neonIntensity: number; // 0..1
  riftFracture: number; // 0..1 (visual Outworld dimensional tear across 1960s Vancouver)
  silhouettePose: 'STANDOFF' | 'STRIKE' | 'CLASH' | 'VICTORY_RIFT' | 'ASCENSION';
  motifGlyph: 'DRAGON' | 'STEAM_CLOCK' | 'NEON_GATE' | 'BRIDGE_CABLES' | 'VOID_ORB';
}

export interface StoryDialogueLine {
  speaker: string;
  role: 'HERO' | 'RIVAL' | 'NARRATOR' | 'MYSTIC';
  text: string;
  color: string;
}

export interface StoryChoice {
  id: string;
  label: string;
  tacticalEffect: string;
  narrativeDirection: string;
  unlockedPerk: string;
  nextNodeId: string;
  riftShift: number; // -0.25 to +0.35
}

export interface StoryCutsceneData {
  nodeId: string;
  title: string;
  chapterNum: number;
  summary: string;
  lines: StoryDialogueLine[];
  choices: StoryChoice[];
  plotArt: PlotArtEvolutionStage;
  arenaDirective: string;
  source: 'GEMINI_NARRATIVE' | 'CHRONICLE_BLUEPRINT';
}

export interface StoryNode {
  id: string;
  title: string;
  district: string;
  year: number;
  stageId: StageId;
  opponentId: CharacterId;
  opponentPartnerId: CharacterId;
  xPct: number; // 0..100 for interactive non-linear campaign graph
  yPct: number;
  tier: number;
  prerequisites: string[];
  nextNodes: string[];
  rewardPerk: string;
  description: string;
  isFinale?: boolean;
}

export interface StoryCampaignState {
  active: boolean;
  currentNodeId: string | null;
  completedNodeIds: string[];
  unlockedNodeIds: string[];
  unlockedPerks: string[];
  riftCorruption: number; // 0..1 evolves plot art
  artEvolutionHistory: PlotArtEvolutionStage[];
  chosenHistory: { nodeId: string; choiceLabel: string; perk: string }[];
  pendingCutscene: StoryCutsceneData | null;
}



