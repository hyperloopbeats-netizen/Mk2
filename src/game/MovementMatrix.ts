/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  MovementMatrixCell,
  MovementMatrixDomain,
  SpatialDspProfile,
  SpriteTrackName,
  SwarmSynthesisPatch,
} from '../types/fighter';
import type { Fighter } from './FighterEngine';

export const DEFAULT_SPATIAL_DSP_PROFILE: SpatialDspProfile = {
  subBassGainDb: 5.5,
  midPresenceDb: 1.5,
  airSparkleDb: 2.0,
  tubeDrive: 0.32,
  compressorPunch: 0.72,
  spatialWidth: 1.15,
  footstepVolume: 0.38,
};

export const DEFAULT_SWARM_PATCH: SwarmSynthesisPatch = {
  patchTitle: 'Classic MK Tournament Calibration',
  source: 'CODEBASE_BLUEPRINT',
  modelUsed: 'deterministic-blueprint',
  archetypeFocus: 'Authentic Midway Arcade Cadence · Precision Frame Control',
  combatTuning: {
    globalSpeedMult: 1.0,
    hitstopScale: 1.0,
    juggleGravityScale: 1.0,
    superDamageMult: 1.0,
    wakeupInvulnFrames: 14,
    chipDamageRate: 0.12,
  },
  dspProfile: { ...DEFAULT_SPATIAL_DSP_PROFILE },
  menuDirective: {
    tournamentSubtitle: 'TOURNAMENT KOMBAT MATRIX · REALM VS REALM',
    vsBannerCallout: 'ROUND ONE · CHOOSE YOUR DESTINY',
    roundStartChant: 'MORTAL KOMBAT!',
  },
  superChoreography: {
    freezeMs: 380,
    barrageHits: 4,
    finisherSlowMoScale: 0.34,
    cameraPeakZoom: 1.62,
    tagline: 'FATAL BLOW OVERDRIVE',
  },
  agentReports: [
    {
      agentName: 'Kronos-Frame',
      role: 'Frame Timing & Hitstop Architect',
      status: 'ANALYZED',
      summary: 'Balanced startup/active/recovery envelopes across LP, HP, LK, HK, Uppercut, Sweep, Jump Punch, and Jump Kick.',
      recommendations: [
        '4f lead jab startup checks dashes while preserving 3-strike cancel chains.',
        '14-frame wakeup invulnerability prevents unfair meaty loops on knockdown.',
      ],
    },
    {
      agentName: 'Scorpion-Skin',
      role: 'Movement Matrix & SpriteSheet Binder',
      status: 'ANALYZED',
      summary: 'Bound 26 matrix states directly to SpriteSheetEngine tracks with Hermite sub-frame morphing.',
      recommendations: [
        'Preserved all 7 curated sprite sheets & 17 palette shifts as primary skin.',
        'Cross-state morphTicks tuned per domain (2–5 frames) for zero pose snapping.',
      ],
    },
    {
      agentName: 'Raiden-Cine',
      role: 'Super Move & Transition Director',
      status: 'ANALYZED',
      summary: 'Choreographed 3-beat Super Blows (flash-freeze -> barrage -> slow-mo finisher) & VS shutter transitions.',
      recommendations: [
        'Trigger spotlight camera zoom (1.62x) before barrage impact bursts.',
        'Play metallic shutter gong synced to live animated character portraits.',
      ],
    },
    {
      agentName: 'Sonya-DSP',
      role: '3D Spatial Sound & Dynamic Range Engineer',
      status: 'ANALYZED',
      summary: 'Configured HRTF 3D panning + 3-band mastering EQ + WaveShaper + punch compressor.',
      recommendations: [
        'Sub-bass shelf at 72Hz (+5.5dB) delivers chest-thumping low punches & uppercuts.',
        'Phase-locked grounded footsteps trigger on walkCycle pi-crossings.',
      ],
    },
    {
      agentName: 'Shang-Lore',
      role: 'Mortal Kombat Rules & Menu Archivist',
      status: 'ANALYZED',
      summary: 'Unified Arcade, Kombat Tower, Practice Dojo, Movie VS Splash, and Finish Him flow.',
      recommendations: [
        'Directional motion buffer recognizes classic MK special commands alongside tap triggers.',
        'Pushbox separation & wakeup recovery keep neutral footsies authentic.',
      ],
    },
  ],
};

let ACTIVE_SWARM_PATCH: SwarmSynthesisPatch = {
  ...DEFAULT_SWARM_PATCH,
  combatTuning: { ...DEFAULT_SWARM_PATCH.combatTuning },
  dspProfile: { ...DEFAULT_SWARM_PATCH.dspProfile },
  menuDirective: { ...DEFAULT_SWARM_PATCH.menuDirective },
  superChoreography: { ...DEFAULT_SWARM_PATCH.superChoreography },
  agentReports: [...DEFAULT_SWARM_PATCH.agentReports],
};

export function getActiveSwarmPatch(): SwarmSynthesisPatch {
  return ACTIVE_SWARM_PATCH;
}

export function applySwarmPatch(patch: SwarmSynthesisPatch): SwarmSynthesisPatch {
  ACTIVE_SWARM_PATCH = {
    ...DEFAULT_SWARM_PATCH,
    ...patch,
    combatTuning: { ...DEFAULT_SWARM_PATCH.combatTuning, ...(patch.combatTuning || {}) },
    dspProfile: { ...DEFAULT_SWARM_PATCH.dspProfile, ...(patch.dspProfile || {}) },
    menuDirective: { ...DEFAULT_SWARM_PATCH.menuDirective, ...(patch.menuDirective || {}) },
    superChoreography: { ...DEFAULT_SWARM_PATCH.superChoreography, ...(patch.superChoreography || {}) },
    agentReports:
      Array.isArray(patch.agentReports) && patch.agentReports.length > 0
        ? patch.agentReports
        : DEFAULT_SWARM_PATCH.agentReports,
  };
  return ACTIVE_SWARM_PATCH;
}

export const MOVEMENT_MATRIX_CELLS: MovementMatrixCell[] = [
  // 1. GROUND LOCOMOTION
  {
    id: 'LOC_IDLE',
    mechId: 0,
    name: 'Combat Idle Guard',
    domain: 'GROUND_LOCOMOTION',
    spriteTrack: 'idle',
    fps: 18,
    loop: true,
    morphTicks: 4,
    frameTiming: { startup: 0, active: 0, recovery: 0, hitstun: 0, blockstun: 0, hitstop: 0, cancelable: true },
    elevationGate: 'Y08',
    spatialSfx: 'NONE',
    description: 'Rhythmic thoracic breathing stance cycling into ready high guard.',
  },
  {
    id: 'LOC_WALK',
    mechId: 1,
    name: 'Advancing / Retreating Footwork',
    domain: 'GROUND_LOCOMOTION',
    spriteTrack: 'walk',
    fps: 24,
    loop: true,
    morphTicks: 3,
    frameTiming: { startup: 0, active: 0, recovery: 0, hitstun: 0, blockstun: 0, hitstop: 0, cancelable: true },
    elevationGate: 'Y09',
    spatialSfx: 'FOOTSTEP',
    description: 'Phase-locked stride cadence emitting spatialized sub-thump footsteps at pi intervals.',
  },
  {
    id: 'LOC_DASH',
    mechId: 3,
    name: 'Phantom Forward Ninja Dash',
    domain: 'GROUND_LOCOMOTION',
    spriteTrack: 'dash',
    fps: 30,
    loop: true,
    morphTicks: 2,
    frameTiming: { startup: 2, active: 7, recovery: 2, hitstun: 0, blockstun: 0, hitstop: 0, cancelable: true },
    elevationGate: 'Y08',
    spatialSfx: 'DASH',
    description: 'Rapid forward burst with lingering silhouette ghost trails.',
  },
  {
    id: 'LOC_RUN',
    mechId: 3,
    name: 'MK Sprint / Run-Cancel',
    domain: 'GROUND_LOCOMOTION',
    spriteTrack: 'run',
    fps: 32,
    loop: true,
    morphTicks: 2,
    frameTiming: { startup: 1, active: 18, recovery: 2, hitstun: 0, blockstun: 0, hitstop: 0, cancelable: true },
    elevationGate: 'Y08',
    spatialSfx: 'FOOTSTEP',
    description: 'Continuous MK pressure sprint cancelable directly into punches, kicks, throws, or weapon strikes.',
  },
  {
    id: 'LOC_CROUCH',
    mechId: 5,
    name: 'Duck / Low Stance',
    domain: 'GROUND_LOCOMOTION',
    spriteTrack: 'crouch',
    fps: 18,
    loop: false,
    morphTicks: 3,
    frameTiming: { startup: 2, active: 0, recovery: 2, hitstun: 0, blockstun: 0, hitstop: 0, cancelable: true },
    elevationGate: 'Y11',
    spatialSfx: 'NONE',
    description: 'Compresses upper HURTBOX under high pokes; arms Sweep & Uppercut.',
  },

  // 2. AERIAL FLIGHT
  {
    id: 'AIR_JUMP',
    mechId: 2,
    name: 'Parabolic Kombat Leap',
    domain: 'AERIAL_FLIGHT',
    spriteTrack: 'jump',
    fps: 20,
    loop: true,
    morphTicks: 3,
    frameTiming: { startup: 2, active: 24, recovery: 4, hitstun: 0, blockstun: 0, hitstop: 0, cancelable: true },
    elevationGate: 'Y02',
    spatialSfx: 'JUMP',
    description: 'Vertical/diagonal jump powered by FlyingMovementNetwork archetype physics.',
  },
  {
    id: 'AIR_TUMBLE',
    mechId: 9,
    name: 'Launched Air Tumble',
    domain: 'AERIAL_FLIGHT',
    spriteTrack: 'airTumble',
    fps: 24,
    loop: true,
    morphTicks: 2,
    frameTiming: { startup: 0, active: 0, recovery: 12, hitstun: 28, blockstun: 0, hitstop: 8, cancelable: false },
    reactionOnHit: 'LAUNCH',
    elevationGate: 'Y01',
    spatialSfx: 'LAND',
    description: 'Rotational tumble from launchers or heavy knockdowns before floor bounce.',
  },
  {
    id: 'AIR_JUGGLE',
    mechId: 9,
    name: 'Airborne Juggle Suspend',
    domain: 'AERIAL_FLIGHT',
    spriteTrack: 'airTumble',
    fps: 22,
    loop: true,
    morphTicks: 2,
    frameTiming: { startup: 0, active: 0, recovery: 8, hitstun: 26, blockstun: 0, hitstop: 7, cancelable: false },
    reactionOnHit: 'JUGGLE',
    elevationGate: 'Y03',
    spatialSfx: 'HIT',
    description: 'Sustained mid-air suspension enabling classic MK multi-hit juggles.',
  },

  // 3. COMBAT OFFENSE
  {
    id: 'ATK_LP',
    mechId: 0,
    name: 'Light Punch (Lead Jab)',
    domain: 'COMBAT_OFFENSE',
    spriteTrack: 'lp',
    fps: 32,
    loop: false,
    morphTicks: 2,
    frameTiming: { startup: 4, active: 3, recovery: 8, hitstun: 13, blockstun: 9, hitstop: 5, cancelable: true },
    reactionOnHit: 'LIGHT_REEL',
    elevationGate: 'Y08',
    spatialSfx: 'PUNCH_L',
    description: '4-frame fast check jab and starter link for Triple Combos.',
  },
  {
    id: 'ATK_HP',
    mechId: 0,
    name: 'Heavy Punch (Cross Hook)',
    domain: 'COMBAT_OFFENSE',
    spriteTrack: 'hp',
    fps: 28,
    loop: false,
    morphTicks: 3,
    frameTiming: { startup: 8, active: 5, recovery: 13, hitstun: 20, blockstun: 14, hitstop: 8, cancelable: true },
    reactionOnHit: 'HEAVY_REEL',
    elevationGate: 'Y08',
    spatialSfx: 'PUNCH_H',
    description: 'Sub-bass heavy straight punch; high poise stagger & bridge strike.',
  },
  {
    id: 'ATK_LK',
    mechId: 1,
    name: 'Light Kick (Snap Check)',
    domain: 'COMBAT_OFFENSE',
    spriteTrack: 'lk',
    fps: 30,
    loop: false,
    morphTicks: 2,
    frameTiming: { startup: 5, active: 4, recovery: 9, hitstun: 14, blockstun: 10, hitstop: 6, cancelable: true },
    reactionOnHit: 'LIGHT_REEL',
    elevationGate: 'Y08',
    spatialSfx: 'KICK_L',
    description: 'Mid-section snap kick stuffing advances and opening Shaolin Triple links.',
  },
  {
    id: 'ATK_HK',
    mechId: 1,
    name: 'Back Spinning Roundhouse (HK)',
    domain: 'COMBAT_OFFENSE',
    spriteTrack: 'hk',
    fps: 28,
    loop: false,
    morphTicks: 3,
    frameTiming: { startup: 10, active: 6, recovery: 16, hitstun: 26, blockstun: 16, hitstop: 10, cancelable: false },
    reactionOnHit: 'KNOCKDOWN',
    elevationGate: 'Y07',
    spatialSfx: 'KICK_H',
    description: 'Slow-motion spinning roundhouse launching opponents across arena.',
  },
  {
    id: 'ATK_UPPERCUT',
    mechId: 7,
    name: 'Signature Launcher Uppercut',
    domain: 'COMBAT_OFFENSE',
    spriteTrack: 'uppercut',
    fps: 30,
    loop: false,
    morphTicks: 2,
    frameTiming: { startup: 10, active: 6, recovery: 18, hitstun: 36, blockstun: 18, hitstop: 13, cancelable: false },
    reactionOnHit: 'LAUNCH',
    elevationGate: 'Y06',
    spatialSfx: 'UPPERCUT',
    description: 'Iconic MK sky-high chin uppercut triggering slow-motion boom.',
  },
  {
    id: 'ATK_SWEEP',
    mechId: 8,
    name: 'Low Leg Sweep',
    domain: 'COMBAT_OFFENSE',
    spriteTrack: 'sweep',
    fps: 28,
    loop: false,
    morphTicks: 2,
    frameTiming: { startup: 8, active: 5, recovery: 15, hitstun: 30, blockstun: 14, hitstop: 8, cancelable: false },
    reactionOnHit: 'SWEEP_TRIP',
    elevationGate: 'Y12',
    spatialSfx: 'SWEEP',
    description: 'Low floor-level sweep tripping high blockers into knockdown.',
  },
  {
    id: 'ATK_JUMP_PUNCH',
    mechId: 2,
    name: 'Aerial Jump Punch',
    domain: 'COMBAT_OFFENSE',
    spriteTrack: 'jumpPunch',
    fps: 30,
    loop: false,
    morphTicks: 1,
    frameTiming: { startup: 3, active: 7, recovery: 7, hitstun: 16, blockstun: 10, hitstop: 5, cancelable: true },
    reactionOnHit: 'LIGHT_REEL',
    elevationGate: 'Y04',
    spatialSfx: 'PUNCH_L',
    description: 'Downward jump-in fist crossing up guard and linking on landing.',
  },
  {
    id: 'ATK_JUMP_KICK',
    mechId: 2,
    name: 'Flying Jump Kick',
    domain: 'COMBAT_OFFENSE',
    spriteTrack: 'jumpKick',
    fps: 30,
    loop: false,
    morphTicks: 1,
    frameTiming: { startup: 4, active: 8, recovery: 8, hitstun: 22, blockstun: 12, hitstop: 6, cancelable: false },
    reactionOnHit: 'KNOCKDOWN',
    elevationGate: 'Y03',
    spatialSfx: 'KICK_H',
    description: 'Classic MK extended flying air kick knocking foes backward.',
  },
  {
    id: 'ATK_CROUCH_LK',
    mechId: 8,
    name: 'Low Crouch Kick',
    domain: 'COMBAT_OFFENSE',
    spriteTrack: 'crouchLk',
    fps: 30,
    loop: false,
    morphTicks: 1,
    frameTiming: { startup: 4, active: 4, recovery: 7, hitstun: 14, blockstun: 9, hitstop: 4, cancelable: true },
    reactionOnHit: 'LIGHT_REEL',
    elevationGate: 'Y11',
    spatialSfx: 'KICK_L',
    description: 'Fast crouching low poke kick checking advancing opponents.',
  },
  {
    id: 'ATK_FLYING_KICK',
    mechId: 13,
    name: 'Flying Dragon / Shadow Kick',
    domain: 'COMBAT_OFFENSE',
    spriteTrack: 'flyingKick',
    fps: 30,
    loop: false,
    morphTicks: 1,
    frameTiming: { startup: 8, active: 10, recovery: 15, hitstun: 26, blockstun: 14, hitstop: 6, cancelable: false },
    reactionOnHit: 'KNOCKDOWN',
    elevationGate: 'Y05',
    spatialSfx: 'KICK_H',
    description: 'Horizontal flying kick traversing the arena.',
  },
  {
    id: 'ATK_WEAPON',
    mechId: 11,
    name: 'Signature Weapon Cleave',
    domain: 'COMBAT_OFFENSE',
    spriteTrack: 'weaponSlash',
    fps: 28,
    loop: false,
    morphTicks: 3,
    frameTiming: { startup: 8, active: 6, recovery: 14, hitstun: 24, blockstun: 16, hitstop: 11, cancelable: true },
    reactionOnHit: 'KNOCKDOWN',
    elevationGate: 'Y08',
    spatialSfx: 'WEAPON',
    description: 'Synchronized 2D Sprite + 3D ThreeWeaponEngine steel cleave with localized blade-arc flash.',
  },
  {
    id: 'ATK_WEAPON_THRUST',
    mechId: 11,
    name: 'Signature Weapon Thrust',
    domain: 'COMBAT_OFFENSE',
    spriteTrack: 'weaponThrust',
    fps: 30,
    loop: false,
    morphTicks: 2,
    frameTiming: { startup: 7, active: 6, recovery: 13, hitstun: 22, blockstun: 14, hitstop: 10, cancelable: true },
    reactionOnHit: 'STAGGER',
    elevationGate: 'Y08',
    spatialSfx: 'WEAPON',
    description: 'Linear piercing weapon thrust with localized edge gleam cancelable into Specials.',
  },
  {
    id: 'ATK_THROW',
    mechId: 6,
    name: 'Close Grapple Slam (Throw)',
    domain: 'COMBAT_OFFENSE',
    spriteTrack: 'throw',
    fps: 26,
    loop: false,
    morphTicks: 2,
    frameTiming: { startup: 5, active: 4, recovery: 16, hitstun: 32, blockstun: 0, hitstop: 10, cancelable: false },
    reactionOnHit: 'KNOCKDOWN',
    elevationGate: 'Y08',
    spatialSfx: 'HIT',
    description: 'Classic MK unblockable close-range shoulder throw slamming guards into floor knockdown.',
  },
  {
    id: 'ATK_COMBO_LINK1',
    mechId: 0,
    name: 'Dial-A-Combo Link 1',
    domain: 'COMBAT_OFFENSE',
    spriteTrack: 'comboLink1',
    fps: 32,
    loop: false,
    morphTicks: 2,
    frameTiming: { startup: 4, active: 4, recovery: 8, hitstun: 15, blockstun: 10, hitstop: 6, cancelable: true },
    reactionOnHit: 'LIGHT_REEL',
    elevationGate: 'Y08',
    spatialSfx: 'PUNCH_L',
    description: 'First fluid dial-a-combo kinetic pose transitioning cleanly into Step 2.',
  },
  {
    id: 'ATK_COMBO_LINK2',
    mechId: 1,
    name: 'Dial-A-Combo Link 2',
    domain: 'COMBAT_OFFENSE',
    spriteTrack: 'comboLink2',
    fps: 32,
    loop: false,
    morphTicks: 2,
    frameTiming: { startup: 5, active: 4, recovery: 9, hitstun: 18, blockstun: 12, hitstop: 7, cancelable: true },
    reactionOnHit: 'HEAVY_REEL',
    elevationGate: 'Y08',
    spatialSfx: 'KICK_L',
    description: 'Second alternating dial-a-combo strike preparing Weapon or Finisher chain.',
  },
  {
    id: 'ATK_COMBO_FINISHER',
    mechId: 1,
    name: 'Dial-A-Combo Finisher',
    domain: 'COMBAT_OFFENSE',
    spriteTrack: 'comboFinisher',
    fps: 30,
    loop: false,
    morphTicks: 2,
    frameTiming: { startup: 7, active: 6, recovery: 14, hitstun: 28, blockstun: 15, hitstop: 11, cancelable: true },
    reactionOnHit: 'KNOCKDOWN',
    elevationGate: 'Y07',
    spatialSfx: 'KICK_H',
    description: 'Capping Triple Combo finisher pose launching or knocking foes across the stage.',
  },
  {
    id: 'ATK_SPECIAL_PROJECTILE',
    mechId: 12,
    name: 'Signature Projectile / Cast',
    domain: 'COMBAT_OFFENSE',
    spriteTrack: 'special1',
    fps: 26,
    loop: false,
    morphTicks: 3,
    frameTiming: { startup: 9, active: 12, recovery: 15, hitstun: 22, blockstun: 12, hitstop: 7, cancelable: false },
    reactionOnHit: 'STAGGER',
    elevationGate: 'Y08',
    spatialSfx: 'SPECIAL',
    description: 'Spear, Iceball, Lightning, Dragon Fire, or Sonic Wave zoning cast.',
  },
  {
    id: 'ATK_SPECIAL_RUSH',
    mechId: 13,
    name: 'Signature Special Rush / Teleport',
    domain: 'COMBAT_OFFENSE',
    spriteTrack: 'special2',
    fps: 28,
    loop: false,
    morphTicks: 2,
    frameTiming: { startup: 8, active: 8, recovery: 15, hitstun: 24, blockstun: 14, hitstop: 9, cancelable: false },
    reactionOnHit: 'KNOCKDOWN',
    elevationGate: 'Y05',
    spatialSfx: 'SPECIAL',
    description: 'High-commitment teleport strike, slide, or torpedo.',
  },

  // 4. DEFENSE & EVASION
  {
    id: 'DEF_BLOCK',
    mechId: 5,
    name: 'Iron Wall Guard',
    domain: 'DEFENSE_EVASION',
    spriteTrack: 'block',
    fps: 18,
    loop: false,
    morphTicks: 2,
    frameTiming: { startup: 1, active: 0, recovery: 3, hitstun: 0, blockstun: 11, hitstop: 4, cancelable: true },
    elevationGate: 'Y10',
    spatialSfx: 'GUARD',
    description: 'Reduces incoming damage by 88% (chip bleed) while guarding stance.',
  },
  {
    id: 'DEF_PARRY',
    mechId: 6,
    name: 'Precision Parry Counter',
    domain: 'DEFENSE_EVASION',
    spriteTrack: 'block',
    fps: 24,
    loop: false,
    morphTicks: 2,
    frameTiming: { startup: 1, active: 12, recovery: 2, hitstun: 0, blockstun: 0, hitstop: 10, cancelable: true },
    elevationGate: 'Y10',
    spatialSfx: 'PARRY',
    description: '12-frame precision guard window unlocking +50% Counter Strike aura.',
  },
  {
    id: 'DEF_BACKSTEP',
    mechId: 4,
    name: 'Defensive Backstep Evade',
    domain: 'DEFENSE_EVASION',
    spriteTrack: 'dash',
    fps: 28,
    loop: true,
    morphTicks: 2,
    frameTiming: { startup: 2, active: 8, recovery: 3, hitstun: 0, blockstun: 0, hitstop: 0, cancelable: true },
    elevationGate: 'Y08',
    spatialSfx: 'DASH',
    description: 'Retreating ghost dash creating footsie spacing and stamina regen.',
  },
  {
    id: 'DEF_WAKEUP',
    mechId: 4,
    name: 'Invulnerable Wakeup Rise',
    domain: 'DEFENSE_EVASION',
    spriteTrack: 'wakeup',
    fps: 22,
    loop: false,
    morphTicks: 3,
    frameTiming: { startup: 0, active: 10, recovery: 4, hitstun: 0, blockstun: 0, hitstop: 0, cancelable: true },
    elevationGate: 'Y09',
    spatialSfx: 'FOOTSTEP',
    description: 'Kip-up off the floor with post-wakeup invulnerability frames.',
  },

  // 5. HIT REACTION
  {
    id: 'REACT_HITSTUN',
    mechId: 14,
    name: 'Standard Anatomical Hitstun',
    domain: 'HIT_REACTION',
    spriteTrack: 'hitstun',
    fps: 22,
    loop: false,
    morphTicks: 2,
    frameTiming: { startup: 0, active: 0, recovery: 0, hitstun: 22, blockstun: 0, hitstop: 6, cancelable: false },
    reactionOnHit: 'LIGHT_REEL',
    elevationGate: 'Y08',
    spatialSfx: 'HIT',
    description: 'Head/torso snap recoil with arterial splatter timed to hitstun frames.',
  },
  {
    id: 'REACT_STAGGER',
    mechId: 14,
    name: 'Heavy Stagger & Guard Crush',
    domain: 'HIT_REACTION',
    spriteTrack: 'stagger',
    fps: 20,
    loop: false,
    morphTicks: 2,
    frameTiming: { startup: 0, active: 0, recovery: 0, hitstun: 36, blockstun: 0, hitstop: 10, cancelable: false },
    reactionOnHit: 'STAGGER',
    elevationGate: 'Y09',
    spatialSfx: 'HIT',
    description: 'Extended open stagger on guard crush or heavy counter-hit.',
  },
  {
    id: 'REACT_KNOCKDOWN',
    mechId: 10,
    name: 'Floor Slam Knockdown',
    domain: 'HIT_REACTION',
    spriteTrack: 'knockdown',
    fps: 18,
    loop: false,
    morphTicks: 3,
    frameTiming: { startup: 0, active: 0, recovery: 42, hitstun: 42, blockstun: 0, hitstop: 9, cancelable: false },
    reactionOnHit: 'KNOCKDOWN',
    elevationGate: 'Y12',
    spatialSfx: 'LAND',
    description: 'Prone floor impact cushion triggering camera tremor before wakeup.',
  },
  {
    id: 'REACT_DIZZY_FROZEN',
    mechId: 14,
    name: 'Cryo Frozen Lock',
    domain: 'HIT_REACTION',
    spriteTrack: 'dizzy',
    fps: 18,
    loop: true,
    morphTicks: 3,
    frameTiming: { startup: 0, active: 0, recovery: 0, hitstun: 90, blockstun: 0, hitstop: 8, cancelable: false },
    reactionOnHit: 'DIZZY',
    elevationGate: 'Y08',
    spatialSfx: 'NONE',
    description: 'Sub-Zero frost encasement state.',
  },
  {
    id: 'REACT_FINISH_STANCE',
    mechId: 14,
    name: 'Finish Him Stagger Stance',
    domain: 'HIT_REACTION',
    spriteTrack: 'finishStance',
    fps: 16,
    loop: true,
    morphTicks: 3,
    frameTiming: { startup: 0, active: 0, recovery: 0, hitstun: 180, blockstun: 0, hitstop: 8, cancelable: false },
    reactionOnHit: 'DIZZY',
    elevationGate: 'Y08',
    spatialSfx: 'NONE',
    description: 'Exhausted Finish-Him swaying stance awaiting Fatality execution.',
  },

  // 6. CINEMATIC FINISHER
  {
    id: 'FIN_SUPER_BLOW',
    mechId: 15,
    name: 'Multi-Beat Fatal Blow Super',
    domain: 'CINEMATIC_FINISHER',
    spriteTrack: 'special2',
    fps: 28,
    loop: false,
    morphTicks: 2,
    frameTiming: { startup: 11, active: 14, recovery: 22, hitstun: 44, blockstun: 20, hitstop: 14, cancelable: false },
    reactionOnHit: 'LAUNCH',
    elevationGate: 'Y06',
    spatialSfx: 'SUPER',
    description: '100% meter Super featuring blackout flash-freeze, barrage hits, and slow-mo blowout.',
  },
  {
    id: 'FIN_FATALITY',
    mechId: 15,
    name: 'Multi-Phase MK Fatality',
    domain: 'CINEMATIC_FINISHER',
    spriteTrack: 'special1',
    fps: 18,
    loop: false,
    morphTicks: 4,
    frameTiming: { startup: 20, active: 40, recovery: 30, hitstun: 120, blockstun: 0, hitstop: 16, cancelable: false },
    reactionOnHit: 'CRUMPLE',
    elevationGate: 'Y08',
    spatialSfx: 'FATALITY',
    description: '7-second signature execution driving decapitation, spine rip, or elemental torture.',
  },
];

const MATRIX_BY_ID: Record<string, MovementMatrixCell> = Object.fromEntries(
  MOVEMENT_MATRIX_CELLS.map((cell) => [cell.id, cell])
);

export function getMatrixCellsByDomain(): Record<MovementMatrixDomain, MovementMatrixCell[]> {
  const grouped: Record<MovementMatrixDomain, MovementMatrixCell[]> = {
    GROUND_LOCOMOTION: [],
    AERIAL_FLIGHT: [],
    COMBAT_OFFENSE: [],
    DEFENSE_EVASION: [],
    HIT_REACTION: [],
    CINEMATIC_FINISHER: [],
  };
  for (const cell of MOVEMENT_MATRIX_CELLS) {
    grouped[cell.domain].push(cell);
  }
  return grouped;
}

/**
 * Resolves the authoritative MovementMatrixCell + SpriteSheetEngine skin binding
 * for the fighter's live frame state.
 */
export function resolveFighterMatrixCell(fighter: Fighter): {
  cell: MovementMatrixCell;
  track: SpriteTrackName;
  fps: number;
  loop: boolean;
  morphTicks: number;
} {
  const s = fighter.state;

  if (s === 'FATALITY_EXECUTION') {
    const cell = MATRIX_BY_ID.FIN_FATALITY;
    return { cell, track: cell.spriteTrack, fps: cell.fps, loop: cell.loop, morphTicks: cell.morphTicks };
  }
  if (s === 'FROZEN') {
    const cell = MATRIX_BY_ID.REACT_DIZZY_FROZEN;
    return { cell, track: 'frozen', fps: 10, loop: false, morphTicks: cell.morphTicks };
  }
  if (s === 'FALLEN' || s === 'DEAD') {
    const cell = MATRIX_BY_ID.REACT_KNOCKDOWN;
    return {
      cell,
      track: fighter.isDecapitated ? 'decapitated' : 'fallen',
      fps: 12,
      loop: false,
      morphTicks: 3,
    };
  }
  if (s === 'KNOCKED_DOWN') {
    const cell = MATRIX_BY_ID.REACT_KNOCKDOWN;
    return { cell, track: 'knockdown', fps: cell.fps, loop: false, morphTicks: cell.morphTicks };
  }
  if (s === 'AIR_TUMBLE' || s === 'STAGE_FALL') {
    const cell = MATRIX_BY_ID.AIR_TUMBLE;
    return { cell, track: cell.spriteTrack, fps: cell.fps, loop: cell.loop, morphTicks: cell.morphTicks };
  }
  if (s === 'JUGGLE') {
    const cell = MATRIX_BY_ID.AIR_JUGGLE;
    return { cell, track: cell.spriteTrack, fps: cell.fps, loop: cell.loop, morphTicks: cell.morphTicks };
  }
  if (s === 'WAKEUP') {
    const cell = MATRIX_BY_ID.DEF_WAKEUP;
    return { cell, track: cell.spriteTrack, fps: cell.fps, loop: cell.loop, morphTicks: cell.morphTicks };
  }
  if (s === 'DIZZY') {
    const cell = MATRIX_BY_ID.REACT_FINISH_STANCE;
    return { cell, track: 'finishStance', fps: cell.fps, loop: true, morphTicks: cell.morphTicks };
  }
  if (s === 'PULLED') {
    const cell = MATRIX_BY_ID.REACT_DIZZY_FROZEN;
    return { cell, track: 'dizzy', fps: cell.fps, loop: true, morphTicks: cell.morphTicks };
  }
  if (s === 'STAGGER' || s === 'GUARD_CRUSH' || s === 'CRUMPLE') {
    const cell = MATRIX_BY_ID.REACT_STAGGER;
    return { cell, track: 'stagger', fps: cell.fps, loop: false, morphTicks: cell.morphTicks };
  }
  if (s === 'HITSTUN') {
    const cell = MATRIX_BY_ID.REACT_HITSTUN;
    return { cell, track: 'hitstun', fps: cell.fps, loop: false, morphTicks: cell.morphTicks };
  }
  if (s === 'BLOCK') {
    const cell = fighter.isCounterReady ? MATRIX_BY_ID.DEF_PARRY : MATRIX_BY_ID.DEF_BLOCK;
    return { cell, track: cell.spriteTrack, fps: cell.fps, loop: cell.loop, morphTicks: cell.morphTicks };
  }
  if (s === 'CROUCH') {
    const cell = MATRIX_BY_ID.LOC_CROUCH;
    return { cell, track: cell.spriteTrack, fps: cell.fps, loop: cell.loop, morphTicks: cell.morphTicks };
  }
  if (s === 'RUN') {
    const cell = MATRIX_BY_ID.LOC_RUN;
    return { cell, track: cell.spriteTrack, fps: cell.fps, loop: cell.loop, morphTicks: cell.morphTicks };
  }
  if (s === 'THROW') {
    const cell = MATRIX_BY_ID.ATK_THROW;
    return { cell, track: cell.spriteTrack, fps: cell.fps, loop: false, morphTicks: cell.morphTicks };
  }
  if (s === 'DASH' || s === 'TAG_IN') {
    const isBackstep = fighter.dashDirection !== fighter.facing;
    const cell = isBackstep ? MATRIX_BY_ID.DEF_BACKSTEP : MATRIX_BY_ID.LOC_DASH;
    return { cell, track: cell.spriteTrack, fps: cell.fps, loop: cell.loop, morphTicks: cell.morphTicks };
  }
  if (s === 'ATTACK' && fighter.currentAttack) {
    const a = fighter.currentAttack;
    if (a.isSuper) {
      const cell = MATRIX_BY_ID.FIN_SUPER_BLOW;
      return { cell, track: cell.spriteTrack, fps: cell.fps, loop: false, morphTicks: cell.morphTicks };
    }
    if (a.id === 'THROW') {
      const cell = MATRIX_BY_ID.ATK_THROW;
      return { cell, track: cell.spriteTrack, fps: cell.fps, loop: false, morphTicks: cell.morphTicks };
    }
    if (a.id === 'UPPERCUT' || a.isLauncher) {
      const cell = MATRIX_BY_ID.ATK_UPPERCUT;
      return { cell, track: cell.spriteTrack, fps: cell.fps, loop: false, morphTicks: cell.morphTicks };
    }
    if (a.id === 'SWEEP' || a.id === 'SUBZERO_SLIDE' || a.id === 'REPTILE_SLIDE') {
      const cell = a.id === 'SUBZERO_SLIDE' ? MATRIX_BY_ID.ATK_SPECIAL_RUSH : MATRIX_BY_ID.ATK_SWEEP;
      return { cell, track: cell.spriteTrack, fps: cell.fps, loop: false, morphTicks: cell.morphTicks };
    }
    if (a.id === 'CROUCH_LK') {
      const cell = MATRIX_BY_ID.ATK_CROUCH_LK;
      return { cell, track: cell.spriteTrack, fps: cell.fps, loop: false, morphTicks: cell.morphTicks };
    }
    if (a.id === 'JUMP_PUNCH') {
      const cell = MATRIX_BY_ID.ATK_JUMP_PUNCH;
      return { cell, track: cell.spriteTrack, fps: cell.fps, loop: false, morphTicks: cell.morphTicks };
    }
    if (a.id === 'JUMP_KICK') {
      const cell = MATRIX_BY_ID.ATK_JUMP_KICK;
      return { cell, track: cell.spriteTrack, fps: cell.fps, loop: false, morphTicks: cell.morphTicks };
    }
    if (
      a.id === 'LIUKANG_FLYING_KICK' ||
      a.id === 'JOHNNY_SHADOW_KICK' ||
      a.id === 'RAIDEN_TORPEDO'
    ) {
      const cell = MATRIX_BY_ID.ATK_FLYING_KICK;
      return { cell, track: cell.spriteTrack, fps: cell.fps, loop: false, morphTicks: cell.morphTicks };
    }
    if (fighter.stateMachine.comboStep === 3 && !a.isSpecial && !a.projectile) {
      const cell = MATRIX_BY_ID.ATK_COMBO_FINISHER;
      return { cell, track: cell.spriteTrack, fps: cell.fps, loop: false, morphTicks: cell.morphTicks };
    }
    if (fighter.stateMachine.comboStep === 2 && !a.isSpecial && !a.projectile) {
      const cell = MATRIX_BY_ID.ATK_COMBO_LINK2;
      return { cell, track: cell.spriteTrack, fps: cell.fps, loop: false, morphTicks: cell.morphTicks };
    }
    if (a.id === 'LP') {
      const cell = fighter.stateMachine.comboStep === 1 ? MATRIX_BY_ID.ATK_COMBO_LINK1 : MATRIX_BY_ID.ATK_LP;
      return { cell, track: cell.spriteTrack, fps: cell.fps, loop: false, morphTicks: cell.morphTicks };
    }
    if (a.id === 'HP') {
      const cell = MATRIX_BY_ID.ATK_HP;
      return { cell, track: cell.spriteTrack, fps: cell.fps, loop: false, morphTicks: cell.morphTicks };
    }
    if (a.id === 'LK') {
      const cell = MATRIX_BY_ID.ATK_LK;
      return { cell, track: cell.spriteTrack, fps: cell.fps, loop: false, morphTicks: cell.morphTicks };
    }
    if (a.id === 'HK') {
      const cell = MATRIX_BY_ID.ATK_HK;
      return { cell, track: cell.spriteTrack, fps: cell.fps, loop: false, morphTicks: cell.morphTicks };
    }
    if (a.projectile) {
      const cell = MATRIX_BY_ID.ATK_SPECIAL_PROJECTILE;
      return { cell, track: cell.spriteTrack, fps: cell.fps, loop: false, morphTicks: cell.morphTicks };
    }
    const cell = MATRIX_BY_ID.ATK_SPECIAL_RUSH;
    return { cell, track: cell.spriteTrack, fps: cell.fps, loop: false, morphTicks: cell.morphTicks };
  }

  if (!fighter.isGrounded) {
    const cell = MATRIX_BY_ID.AIR_JUMP;
    return { cell, track: cell.spriteTrack, fps: cell.fps, loop: cell.loop, morphTicks: cell.morphTicks };
  }
  if (Math.abs(fighter.vx) > 18) {
    const cell = MATRIX_BY_ID.LOC_WALK;
    return { cell, track: cell.spriteTrack, fps: cell.fps, loop: cell.loop, morphTicks: cell.morphTicks };
  }
  const cell = MATRIX_BY_ID.LOC_IDLE;
  return { cell, track: cell.spriteTrack, fps: cell.fps, loop: cell.loop, morphTicks: cell.morphTicks };
}
