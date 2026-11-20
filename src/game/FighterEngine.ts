/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  CharacterDef, 
  FighterState, 
  AnatomicalZone, 
  ZoneStatus, 
  CombatMove, 
  HitboxRect, 
  HurtboxMap, 
  Projectile,
  SeveredPart,
  Matrix9DTelemetry,
  ElevationLevel,
  TripleComboRoute,
  CharacterId,
  ZLane,
  JumpKind,
  JumpPhase,
  LevelStrideZone,
  StagePlatform,
  StageId
} from '../types/fighter';
import { CHARACTERS, SIX_BUTTON_MOVES } from './constants';
import { RetroAudio } from '../audio/RetroSynth';
import { ParticleSystem } from './ParticleSystem';
import { FighterStateMachine } from './FighterStateMachine';
import { SpriteSheetEngine } from './SpriteSheetEngine';
import { FlyingMovementNetwork } from './FlyingMovementMatrix';
import { getActiveSwarmPatch, resolveFighterMatrixCell } from './MovementMatrix';
import { getStrideAtPosition, getPlatformsForStage } from './VancouverLevelDesigner';
import { areLanesCompatible } from './SpatialCombatSystem';
import { AudioEventBus } from '../audio/AudioEventBus';

// 12-Level Parametric Elevation Box (Y01 -> Y12)
export const ELEVATION_BOX: Record<ElevationLevel, { yOffset: number; level: number; label: string }> = {
  Y01: { yOffset: -240, level: 1,  label: 'Apex Air Jump' },
  Y02: { yOffset: -200, level: 2,  label: 'High Aerial' },
  Y03: { yOffset: -160, level: 3,  label: 'Mid-Air Juggle' },
  Y04: { yOffset: -120, level: 4,  label: 'Dive Kick Launch' },
  Y05: { yOffset: -85,  level: 5,  label: 'Teleport Re-entry' },
  Y06: { yOffset: -55,  level: 6,  label: 'Launch Juggle Apex' },
  Y07: { yOffset: -25,  level: 7,  label: 'Upright High Guard' },
  Y08: { yOffset: 0,    level: 8,  label: 'Neutral Ground Stance' },
  Y09: { yOffset: 12,   level: 9,  label: 'Combat Stance Bob' },
  Y10: { yOffset: 24,   level: 10, label: 'Braced Block / Parry' },
  Y11: { yOffset: 38,   level: 11, label: 'Low Crouch Stance' },
  Y12: { yOffset: 52,   level: 12, label: 'Full Low Sweep / Downed' },
};

/**
 * Cubic Hermite Bezier micro-interpolation:
 * Smoothly interpolates between values with zero velocity spikes at boundaries
 */
export function hermiteBezierInterpolate(p0: number, p1: number, t: number): number {
  const clampedT = Math.max(0, Math.min(1, t));
  const ease = clampedT * clampedT * (3 - 2 * clampedT);
  return p0 + (p1 - p0) * ease;
}

export class Fighter {
  public id: string;
  public def: CharacterDef;
  public isPlayer1: boolean;
  public stateMachine: FighterStateMachine;
  public flightNetwork: FlyingMovementNetwork = new FlyingMovementNetwork();
  public activeTripleCombo: TripleComboRoute | null = null;
  public lastAttackWasTripleFinisher: boolean = false;
  public shieldReflectTimer: number = 0;

  // Position & Physics
  public x: number;
  public y: number;
  public vx: number = 0;
  public vy: number = 0;
  public width: number = 56;
  public height: number = 100;
  public facing: 1 | -1;
  public isGrounded: boolean = true;
  public mass: number;

  // Combat Stats
  public hp: number = 250;
  public maxHp: number = 250;
  public superMeter: number = 0;
  public stamina: number = 100; // Stamina Pool (0–100%)
  public maxStamina: number = 100;
  public guardMeter: number = 100;
  public roundsWon: number = 0; // Match lifecycle tracking

  // Precision Block & Counter System
  public parryWindow: number = 0; // Active parry window frames after guard is pressed
  public isCounterReady: boolean = false; // Granted upon successful parry (+50% counter damage)
  public counterTimer: number = 0;

  public state: FighterState = 'IDLE';
  public activeMechId: number = 0; // Live index into 16 Sprite Movement Mechanics (0..15)
  public actionFrame: number = 0;
  public hitStop: number = 0;
  public comboHits: number = 0;
  public comboTimer: number = 0;
  public juggleHits: number = 0;

  // 4-Zone Anatomical Damage (Scales to 180 HP for tactical slower bleed)
  public zones: Record<AnatomicalZone, ZoneStatus> = {
    HEAD: { hp: 180, maxHp: 180, isBroken: false, breakLabel: 'NORMAL' },
    TORSO: { hp: 180, maxHp: 180, isBroken: false, breakLabel: 'NORMAL' },
    LEFT_LIMBS: { hp: 180, maxHp: 180, isBroken: false, breakLabel: 'NORMAL' },
    RIGHT_LIMBS: { hp: 180, maxHp: 180, isBroken: false, breakLabel: 'NORMAL' },
  };

  // State timers
  public freezeTimer: number = 0;
  public pulledTimer: number = 0;
  public invisibleTimer: number = 0;
  public dizzyTimer: number = 0;
  public fatalityTimer: number = 0;
  public guardCrushTimer: number = 0;
  public fallenTimer: number = 0;

  // Input buffering for smooth combos
  public bufferedMove: CombatMove | null = null;
  public bufferWindow: number = 0;

  // Current Combat Action
  public currentAttack: CombatMove | null = null;
  public activeHitbox: HitboxRect | null = null;
  public canCancel: boolean = false;

  // Procedural Kinematics Walk Cycle Phase
  public walkCycle: number = 0;
  public weaponAngle: number = 0;

  // Knockdown, Fall & Stagger Poise Physics
  public knockdownTimer: number = 0;
  public tumbleAngle: number = 0;
  public tumbleAngularVelocity: number = 0;
  public staggerGauge: number = 0; // Stagger builds from unblocked punches; shatters at 60 -> knockdown!
  public consecutivePunchHits: number = 0;
  public lastHitTime: number = 0;
  public hitReactAngle: number = 0; // Real-time head snap on impact
  public hitFlashFrames: number = 0;
  public hitFlashColor: string = '#ffffff';
  public squashX: number = 1.0;
  public squashY: number = 1.0;
  public landingSquashTimer: number = 0;
  public moveIntentX: number = 0;
  public airDriftUsed: boolean = false;
  public weaponClashCooldown: number = 0;
  public prevWalkStep: number = 0;
  public wakeupInvulnFrames: number = 0;
  public activeMatrixCellId: string = 'LOC_IDLE';

  // Ninja Dash & Shadow Trails
  public dashTimer: number = 0;
  public dashDirection: 1 | -1 = 1;
  public shadowTrails: Array<{ x: number; y: number; alpha: number; facing: 1 | -1 }> = [];

  // Severed Body Parts (Fatality Decapitation)
  public severedParts: SeveredPart[] = [];
  public isDecapitated: boolean = false;

  // 9D Matrix Telemetry & Movement Synthesis
  public elevationLevel: ElevationLevel = 'Y08';
  public targetElevationLevel: ElevationLevel = 'Y08';
  public currentElevationY: number = 0;

  public telemetry9D: Matrix9DTelemetry = {
    torsoRot: 0,
    armPhase: 0.5,
    zGate: 'Y08',
    breathingWave: 0,
    pelvisSway: 0,
    headPitch: 0,
    strideVelocity: 0,
    weaponPhase: 0,
    fluidFlow: 120,
  };

  // Projectile active list
  public projectiles: Projectile[] = [];

  // Spatial Fighting, Z-Lane Sidestep, Jump State Machine & 1960s Strides
  public zLane: ZLane = 0;
  public zVisualOffset: number = 0;
  public sidestepTimer: number = 0;
  public sidestepCooldown: number = 0;
  public jumpKind: JumpKind = 'NEUTRAL';
  public jumpPhase: JumpPhase = 'GROUNDED';
  public preJumpTimer: number = 0;
  public pendingJumpDir: number = 0;
  public pendingShortHop: boolean = false;
  public dropThroughTimer: number = 0;
  public activeStride: LevelStrideZone | null = null;
  public standingPlatform: StagePlatform | null = null;
  public aiBlockTimer: number = 0;
  public overdriveArmor: boolean = false;
  public jumpBonusMult: number = 1.0;
  public strideBonusMult: number = 1.0;
  public fractalPushQueue: number[] = [];
  private pendingTimers: number[] = [];

  public clearPendingTimers() {
    for (const id of this.pendingTimers) {
      window.clearTimeout(id);
    }
    this.pendingTimers = [];
  }

  private scheduleTimer(fn: () => void, ms: number) {
    const id = window.setTimeout(() => {
      this.pendingTimers = this.pendingTimers.filter((t) => t !== id);
      fn();
    }, ms);
    this.pendingTimers.push(id);
  }

  public applyFractalBlockPushback(dirX: 1 | -1, totalForce: number) {
    const coeffs = [0.42, 0.24, 0.14, 0.08, 0.05, 0.03];
    this.fractalPushQueue = coeffs.map((c) => dirX * totalForce * c);
  }

  constructor(charId: string, x: number, facing: 1 | -1, isPlayer1: boolean) {
    this.id = isPlayer1 ? 'P1' : 'CPU';
    this.def = CHARACTERS[charId] || CHARACTERS['scorpion'];
    this.x = x;
    this.y = 345;
    this.facing = facing;
    this.isPlayer1 = isPlayer1;
    this.mass = this.def.mass;
    this.stateMachine = new FighterStateMachine(this);
    SpriteSheetEngine.preloadAll();
  }

  public setCharacter(charId: string) {
    this.def = CHARACTERS[charId] || CHARACTERS['scorpion'];
    this.mass = this.def.mass;
    this.stateMachine = new FighterStateMachine(this);
  }

  public resetState(x: number, facing: 1 | -1) {
    this.x = x;
    this.y = 345;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.hp = 250;
    this.maxHp = 250;
    this.stamina = 100;
    this.superMeter = 25;
    this.guardMeter = 100;
    this.state = 'IDLE';
    this.actionFrame = 0;
    this.hitStop = 0;
    this.comboHits = 0;
    this.comboTimer = 0;
    this.juggleHits = 0;
    this.activeTripleCombo = null;
    this.lastAttackWasTripleFinisher = false;
    this.shieldReflectTimer = 0;
    this.flightNetwork.airTrailPoints = [];
    this.flightNetwork.currentPhase = 'LANDING';
    this.parryWindow = 0;
    this.isCounterReady = false;
    this.counterTimer = 0;
    this.stateMachine.resetComboChain();
    this.freezeTimer = 0;
    this.pulledTimer = 0;
    this.invisibleTimer = 0;
    this.dizzyTimer = 0;
    this.fatalityTimer = 0;
    this.guardCrushTimer = 0;
    this.fallenTimer = 0;
    this.knockdownTimer = 0;
    this.tumbleAngle = 0;
    this.tumbleAngularVelocity = 0;
    this.staggerGauge = 0;
    this.consecutivePunchHits = 0;
    this.hitReactAngle = 0;
    this.hitFlashFrames = 0;
    this.hitFlashColor = '#ffffff';
    this.squashX = 1.0;
    this.squashY = 1.0;
    this.landingSquashTimer = 0;
    this.moveIntentX = 0;
    this.airDriftUsed = false;
    this.weaponClashCooldown = 0;
    this.prevWalkStep = 0;
    this.wakeupInvulnFrames = 0;
    this.activeMatrixCellId = 'LOC_IDLE';
    this.dashTimer = 0;
    this.shadowTrails = [];
    this.bufferedMove = null;
    this.bufferWindow = 0;
    this.currentAttack = null;
    this.activeHitbox = null;
    this.canCancel = false;
    this.walkCycle = 0;
    this.severedParts = [];
    this.isDecapitated = false;
    this.projectiles = [];

    this.clearPendingTimers();
    this.zLane = 0;
    this.zVisualOffset = 0;
    this.sidestepTimer = 0;
    this.sidestepCooldown = 0;
    this.jumpKind = 'NEUTRAL';
    this.jumpPhase = 'GROUNDED';
    this.preJumpTimer = 0;
    this.pendingJumpDir = 0;
    this.pendingShortHop = false;
    this.dropThroughTimer = 0;
    this.activeStride = null;
    this.standingPlatform = null;
    this.aiBlockTimer = 0;
    this.overdriveArmor = false;
    this.fractalPushQueue = [];
    this.isGrounded = true;

    for (const key of ['HEAD', 'TORSO', 'LEFT_LIMBS', 'RIGHT_LIMBS'] as AnatomicalZone[]) {
      this.zones[key] = { hp: 180, maxHp: 180, isBroken: false, breakLabel: 'NORMAL' };
    }
  }

  public performJump(
    dirX: number = 0,
    isShortHop: boolean = false,
    dropThroughPressed: boolean = false
  ): boolean {
    if (
      dropThroughPressed &&
      this.isGrounded &&
      this.standingPlatform
    ) {
      this.dropThroughTimer = 14;
      this.standingPlatform = null;
      this.isGrounded = false;
      this.vy = 95;
      this.jumpPhase = 'DESCENT';
      this.jumpKind = 'NEUTRAL';
      return true;
    }

    if (
      !this.isGrounded ||
      this.preJumpTimer > 0 ||
      this.state === 'INTRO' ||
      this.state === 'HITSTUN' ||
      this.state === 'FROZEN' ||
      this.state === 'PULLED' ||
      this.state === 'DIZZY' ||
      this.state === 'FALLEN' ||
      this.state === 'KNOCKED_DOWN' ||
      this.state === 'AIR_TUMBLE' ||
      this.state === 'DEAD' ||
      this.state === 'FATALITY_EXECUTION' ||
      this.state === 'GUARD_CRUSH'
    ) {
      return false;
    }

    // Instant responsive jump launch (zero pre-jump input lag)
    this.preJumpTimer = 0;
    this.pendingJumpDir = dirX;
    this.pendingShortHop = isShortHop;
    this.jumpKind = isShortHop
      ? 'SHORT_HOP'
      : dirX === 0
      ? 'NEUTRAL'
      : dirX * this.facing > 0
      ? 'FORWARD'
      : 'BACK';
    if (this.state === 'CROUCH') this.state = 'IDLE';
    this.commitPreJumpLaunch();
    return true;
  }

  private commitPreJumpLaunch() {
    const status = this.getStatus();
    const profile = this.flightNetwork.getProfile(this.def.id as CharacterId);
    const tramSpringBonus =
      this.activeStride?.effect === 'TRAM_SPRING'
        ? 1 + 0.22 * this.strideBonusMult
        : 1.0;
    const shortHopScale = this.pendingShortHop ? 0.68 : 1.0;
    const baseImpulse = status.isLegCrippled
      ? Math.max(-390, Math.round(profile.jumpImpulse * 0.72))
      : profile.jumpImpulse;

    this.vy = Math.round(baseImpulse * shortHopScale * tramSpringBonus * this.jumpBonusMult);
    if (this.pendingJumpDir !== 0) {
      this.vx =
        this.pendingJumpDir *
        this.def.speed *
        status.baseSpeedMult *
        profile.airControl *
        (this.activeStride?.effect === 'SLICK_SPEED' ? 1.18 : 1.0);
    }
    this.standingPlatform = null;
    this.isGrounded = false;
    this.airDriftUsed = false;
    this.jumpPhase = 'ASCENT';
    this.squashX = 0.86;
    this.squashY = 1.16;
    RetroAudio.playJumpLaunch(this.mass, this.x + this.width * 0.5, this.y + this.height * 0.5);
  }

  public triggerFastFall(): boolean {
    if (
      this.isGrounded ||
      this.jumpPhase === 'GROUNDED' ||
      this.jumpPhase === 'FAST_FALL' ||
      this.state === 'AIR_TUMBLE' ||
      this.state === 'JUGGLE' ||
      this.state === 'HITSTUN' ||
      this.vy < -95
    ) {
      return false;
    }
    this.vy = Math.max(this.vy, 560);
    this.jumpPhase = 'FAST_FALL';
    return true;
  }

  public sidestep(dir?: -1 | 1): boolean {
    if (
      this.sidestepCooldown > 0 ||
      this.state === 'DEAD' ||
      this.state === 'FALLEN' ||
      this.state === 'DIZZY' ||
      this.state === 'FROZEN' ||
      this.state === 'FATALITY_EXECUTION' ||
      this.state === 'AIR_TUMBLE'
    ) {
      return false;
    }

    let nextLane: ZLane;
    if (dir === undefined) {
      // Single-button cycle: 0 -> -1 -> 0 -> +1 -> 0
      nextLane = this.zLane === 0 ? -1 : 0;
    } else {
      const candidate = this.zLane + dir;
      if (candidate < -1 || candidate > 1) {
        nextLane = 0;
      } else {
        nextLane = candidate as ZLane;
      }
    }

    this.zLane = nextLane;
    const cloakBonus = this.activeStride?.effect === 'FOG_CLOAK' ? 3 : 0;
    this.sidestepTimer = 14 + cloakBonus;
    this.sidestepCooldown = 20;
    this.squashX = 0.9;
    this.squashY = 1.06;
    RetroAudio.playWhoosh('dash');
    return true;
  }

  public triggerBreaker(opponent: Fighter, particles: ParticleSystem): boolean {
    if (
      this.state === 'DEAD' ||
      this.state === 'FALLEN' ||
      this.state === 'FATALITY_EXECUTION'
    ) {
      return false;
    }
    this.state = 'IDLE';
    this.actionFrame = 0;
    this.hitStop = 0;
    this.activeHitbox = null;
    this.currentAttack = null;
    this.wakeupInvulnFrames = 16;
    this.vx = -this.facing * 120;

    if (Math.abs(opponent.x - this.x) < 220) {
      opponent.vx = -opponent.facing * 340;
      opponent.vy = -195;
      opponent.isGrounded = false;
      opponent.activeHitbox = null;
      opponent.state = 'STAGGER';
      opponent.actionFrame = 0;
    }

    particles.emitShockwave(this.x + 28, this.y + 48, 86, '#38bdf8', 4);
    particles.emitLightning(this.x + 28, this.y + 42, 20);
    RetroAudio.playGuardCrush(this.x + 28, this.y + 42);
    return true;
  }

  public setMoveIntent(dirX: number) {
    if (
      this.state === 'INTRO' ||
      this.state === 'HITSTUN' ||
      this.state === 'FROZEN' ||
      this.state === 'PULLED' ||
      this.state === 'DIZZY' ||
      this.state === 'FALLEN' ||
      this.state === 'KNOCKED_DOWN' ||
      this.state === 'AIR_TUMBLE' ||
      this.state === 'DEAD' ||
      this.state === 'FATALITY_EXECUTION' ||
      this.state === 'GUARD_CRUSH' ||
      this.state === 'THROW'
    ) {
      this.moveIntentX = 0;
      return;
    }
    this.moveIntentX = Math.max(-1, Math.min(1, dirX));
  }

  public triggerAirDrift(dirX: number = 0): boolean {
    if (
      this.isGrounded ||
      this.airDriftUsed ||
      this.state === 'AIR_TUMBLE' ||
      this.state === 'JUGGLE' ||
      this.state === 'HITSTUN' ||
      this.state === 'FROZEN' ||
      this.state === 'DEAD' ||
      this.state === 'FALLEN'
    ) {
      return false;
    }
    const status = this.getStatus();
    const profile = this.flightNetwork.getProfile(this.def.id as CharacterId);
    this.airDriftUsed = true;
    this.vy = Math.min(this.vy, profile.doubleArcLift);
    if (dirX !== 0) {
      this.vx = dirX * this.def.speed * status.baseSpeedMult * Math.min(1.25, profile.airControl * 1.12);
    }
    this.squashX = 0.9;
    this.squashY = 1.12;
    this.activeMechId = 2;
    RetroAudio.playWhoosh('dash');
    return true;
  }

  public triggerReactiveHit(
    dmg: number,
    dirX: number,
    zone: AnatomicalZone,
    _isWeapon: boolean,
    particles: ParticleSystem
  ) {
    this.hitFlashFrames = 3;
    this.hitFlashColor = '#e2e8f0';
    this.squashX = dmg >= 18 ? 0.84 : 0.90;
    this.squashY = dmg >= 18 ? 1.14 : 1.08;
    this.hitReactAngle = zone === 'HEAD' ? -0.45 * dirX : -0.26 * dirX;

    const impactX = this.x + 28;
    const impactY = zone === 'HEAD' ? this.y + 18 : zone === 'LEFT_LIMBS' || zone === 'RIGHT_LIMBS' ? this.y + 68 : this.y + 42;
    particles.emitShockwave(
      impactX,
      impactY,
      dmg >= 18 ? 40 : 26,
      '#fb7185',
      1.8
    );
  }

  public activateGuard() {
    this.state = 'BLOCK';
    this.parryWindow = 12; // 12-frame window (~200ms) for perfect parry & counter
    this.activeMechId = 5; // Low Crouch Guard
  }

  public releaseGuard() {
    if (this.state === 'BLOCK') {
      this.state = 'IDLE';
    }
    this.parryWindow = 0;
  }

  public getStatus() {
    const headRatio = this.zones.HEAD.hp / 180;
    const torsoRatio = this.zones.TORSO.hp / 180;
    const leftRatio = this.zones.LEFT_LIMBS.hp / 180;
    const rightRatio = this.zones.RIGHT_LIMBS.hp / 180;

    const isConcussed = this.zones.HEAD.hp <= 70;
    const isTorsoBreached = this.zones.TORSO.hp <= 65;
    const isLegCrippled = this.zones.LEFT_LIMBS.hp <= 65;
    const isArmFractured = this.zones.RIGHT_LIMBS.hp <= 65;

    // Movement speed multiplier influenced by leg integrity and stamina fatigue
    const staminaSpeedMult = Math.max(0.65, this.stamina / 100);
    const baseSpeedMult = Math.max(0.35, (1.0 - (1 - leftRatio) * 0.45 - (1 - torsoRatio) * 0.15) * staminaSpeedMult);
    
    // Recovery multiplier (longer recovery if concussed or fatigued)
    const fatigueRecoveryMult = 1.0 + (1.0 - this.stamina / 100) * 0.45;
    const recoveryMult = Math.min(2.1, (1.0 + (1 - headRatio) * 0.38 + (1 - rightRatio) * 0.22) * fatigueRecoveryMult);

    // Damage multiplier based on Prompt 2: proportional to stamina (down to 25% minimum at 0% stamina)
    const staminaDamageMult = Math.max(0.25, this.stamina / 100);

    return {
      isConcussed,
      isTorsoBreached,
      isLegCrippled,
      isArmFractured,
      baseSpeedMult,
      recoveryMult,
      staminaDamageMult,
    };
  }

  public getHurtboxes(): HurtboxMap {
    const isCrouch = this.state === 'CROUCH';
    const isJuggle = this.state === 'JUGGLE';
    const isFallen = this.state === 'FALLEN' || this.state === 'DEAD';

    // When knocked out on floor, hurtbox hugs fallen torso/limbs strictly inside body width
    if (isFallen) {
      return {
        HEAD: { x: this.x + 2, y: this.y + 76, width: 16, height: 18 },
        TORSO: { x: this.x + 14, y: this.y + 76, width: 28, height: 18 },
        LEFT_LIMBS: { x: this.x + 10, y: this.y + 78, width: 20, height: 18 },
        RIGHT_LIMBS: { x: this.x + 28, y: this.y + 78, width: 20, height: 18 },
      };
    }

    const h = isCrouch ? this.height * 0.65 : this.height;
    const top = isCrouch ? this.y + (this.height - h) : this.y;

    return {
      HEAD: {
        x: this.x + 15,
        y: top + (isJuggle ? 6 : 2),
        width: 26,
        height: Math.round(h * 0.23),
      },
      TORSO: {
        x: this.x + 13,
        y: top + Math.round(h * 0.25),
        width: 30,
        height: Math.round(h * 0.35),
      },
      LEFT_LIMBS: {
        x: this.x + (this.facing === 1 ? 8 : 26),
        y: top + Math.round(h * 0.60),
        width: 22,
        height: Math.round(h * 0.38),
      },
      RIGHT_LIMBS: {
        x: this.x + (this.facing === 1 ? 26 : 8),
        y: top + Math.round(h * 0.60),
        width: 22,
        height: Math.round(h * 0.38),
      },
    };
  }

  // Classic MK Sprint / Run-Cancel (cancelable into any strike, weapon, throw, or special)
  public startRun(): boolean {
    if (
      !this.isGrounded ||
      this.stamina < 6 ||
      this.state === 'INTRO' ||
      this.state === 'HITSTUN' ||
      this.state === 'FROZEN' ||
      this.state === 'PULLED' ||
      this.state === 'DIZZY' ||
      this.state === 'FALLEN' ||
      this.state === 'KNOCKED_DOWN' ||
      this.state === 'AIR_TUMBLE' ||
      this.state === 'DEAD' ||
      this.state === 'FATALITY_EXECUTION' ||
      this.state === 'GUARD_CRUSH' ||
      this.state === 'THROW'
    ) {
      return false;
    }
    this.state = 'RUN';
    this.actionFrame = 0;
    this.activeHitbox = null;
    this.currentAttack = null;
    this.canCancel = false;
    this.vx = this.facing * this.def.speed * 1.72;
    RetroAudio.playWhoosh('dash', this.x + 28, this.y + 50);
    return true;
  }

  // Unblockable Close-Range MK Grapple Shoulder Throw
  public executeThrow(opponent: Fighter, particles: ParticleSystem): boolean {
    if (
      !this.isGrounded ||
      this.state === 'INTRO' ||
      this.state === 'HITSTUN' ||
      this.state === 'FROZEN' ||
      this.state === 'PULLED' ||
      this.state === 'DIZZY' ||
      this.state === 'FALLEN' ||
      this.state === 'KNOCKED_DOWN' ||
      this.state === 'AIR_TUMBLE' ||
      this.state === 'DEAD' ||
      this.state === 'FATALITY_EXECUTION' ||
      this.state === 'GUARD_CRUSH' ||
      this.state === 'THROW'
    ) {
      return false;
    }

    this.state = 'THROW';
    this.actionFrame = 0;
    this.activeHitbox = null;
    this.currentAttack = null;
    this.stamina = Math.max(0, this.stamina - 14);
    this.vx = this.facing * 90;

    const dist = Math.abs(opponent.x - this.x);
    const verticalDist = Math.abs(opponent.y - this.y);
    const canGrab =
      dist <= 96 &&
      verticalDist <= 48 &&
      opponent.state !== 'DEAD' &&
      opponent.state !== 'FALLEN' &&
      opponent.state !== 'AIR_TUMBLE' &&
      opponent.state !== 'FATALITY_EXECUTION' &&
      opponent.wakeupInvulnFrames === 0;

    if (canGrab) {
      const status = this.getStatus();
      const dmg = Math.max(10, Math.round(16 * status.staminaDamageMult));
      opponent.state = 'AIR_TUMBLE';
      opponent.activeMechId = 9;
      opponent.actionFrame = 0;
      opponent.isGrounded = false;
      opponent.hp = Math.max(0, opponent.hp - dmg);
      opponent.zones.TORSO.hp = Math.max(0, opponent.zones.TORSO.hp - dmg * 1.3);
      opponent.vx = this.facing * 310;
      opponent.vy = -245;
      opponent.tumbleAngle = 0;
      opponent.tumbleAngularVelocity = -this.facing * 0.22;
      opponent.triggerReactiveHit(dmg, this.facing, 'TORSO', false, particles);
      this.superMeter = Math.min(100, this.superMeter + 12);
      particles.emitHitSparks(opponent.x + 28, opponent.y + 42, '#f8fafc', 16);
      particles.emitBlood(opponent.x + 28, opponent.y + 40, this.facing, 14, 445);
      RetroAudio.playHit('bone_crack', opponent.x + 28, opponent.y + 42);
      AudioEventBus.playCharacterActionVoice(this.def.id, 'throw_shout');
    } else {
      RetroAudio.playWhoosh('punch', this.x + 28, this.y + 40);
    }

    return true;
  }

  // Execute Combat Move with Clean Unarmed Strikes, Specials & Triple Combo Chains
  public executeMove(move: CombatMove, opponent: Fighter, particles: ParticleSystem): boolean {
    if (move.isWeapon) {
      return false;
    }
    if (move.id === 'RUN') {
      return this.startRun();
    }
    if (move.id === 'THROW') {
      return this.executeThrow(opponent, particles);
    }

    if (
      this.state === 'INTRO' ||
      this.state === 'HITSTUN' ||
      this.state === 'FROZEN' ||
      this.state === 'PULLED' ||
      this.state === 'DIZZY' ||
      this.state === 'FALLEN' ||
      this.state === 'KNOCKED_DOWN' ||
      this.state === 'AIR_TUMBLE' ||
      this.state === 'DEAD' ||
      this.state === 'FATALITY_EXECUTION' ||
      this.state === 'GUARD_CRUSH' ||
      this.state === 'THROW'
    ) {
      return false;
    }

    const canChainStep = this.stateMachine.comboStep === 1 || this.stateMachine.comboStep === 2;
    const isChainCancelableMove =
      move.id === 'LP' ||
      move.id === 'LK' ||
      move.id === 'CROUCH_LK' ||
      move.id === 'HP' ||
      move.id === 'HK' ||
      move.id === 'UPPERCUT' ||
      Boolean(move.isSpecial) ||
      Boolean(move.isSuper);

    // Fluid Run-Cancel & Triple Combo Cancel System
    if (this.state === 'RUN') {
      this.vx *= 0.45;
    } else if (this.state === 'ATTACK') {
      const inCancelFrames =
        this.canCancel || (this.currentAttack ? this.actionFrame >= this.currentAttack.startup + 2 : false);

      if (inCancelFrames && ((canChainStep && isChainCancelableMove) || move.isSpecial || move.isSuper)) {
        this.canCancel = false;
      } else if (canChainStep && isChainCancelableMove) {
        this.bufferedMove = move;
        this.bufferWindow = 18;
        this.stateMachine.inputBuffer.push(move.id);
        return false;
      } else {
        this.bufferedMove = null;
        this.bufferWindow = 0;
        return false;
      }
    }

    if (move.isSuper && this.superMeter < 100) {
      return false;
    }

    const reg = this.stateMachine.registerAttack(move);
    this.activeTripleCombo = reg.matchedRoute;
    this.lastAttackWasTripleFinisher = reg.step === 3;

    // Stamina Consumption
    const staminaCost = move.staminaCost || 10;
    this.stamina = Math.max(0, this.stamina - staminaCost);

    const status = this.getStatus();
    const armPenalty = status.isArmFractured ? 4 : 0;
    const fatigueStartup = this.stamina < 30 ? 2 : 0;

    this.state = 'ATTACK';
    this.actionFrame = 0;
    this.canCancel = false;

    const swarmPatch = getActiveSwarmPatch();
    const superDamageMult = move.isSuper ? swarmPatch.combatTuning.superDamageMult : 1.0;

    // Scale damage by stamina, Triple Combo multiplier, and Swarm tuning
    const scaledDamage = Math.max(
      3,
      Math.floor(move.damage * status.staminaDamageMult * reg.damageMult * superDamageMult)
    );

    this.currentAttack = {
      ...move,
      startup: Math.max(2, move.startup + armPenalty + fatigueStartup + reg.startupDelta),
      damage: scaledDamage,
      kbX: reg.matchedRoute ? Math.max(move.kbX, reg.matchedRoute.finisherKbX) : move.kbX,
      kbY: reg.matchedRoute ? Math.min(move.kbY || 0, reg.matchedRoute.finisherLaunchY) : move.kbY,
    };

    if (move.isSuper) {
      this.superMeter = 0;
      RetroAudio.announce('SUPER');
      RetroAudio.playSuperActivate(this.x + this.width * 0.5, this.y + 40);
      particles.emitLightning(this.x + this.width / 2, this.y + 40, 14);
    }

    // Special SFX (Spatialized by world coordinate)
    const cx = this.x + this.width * 0.5;
    const cy = this.y + 42;
    if (move.audioKey === 'spear') {
      RetroAudio.playSpear(cx, cy);
      RetroAudio.announce('GET_OVER_HERE');
    } else if (move.audioKey === 'freeze') {
      RetroAudio.playFreeze(cx, cy);
    } else if (move.audioKey === 'flame') {
      RetroAudio.playFlame(cx, cy);
    } else if (move.audioKey === 'teleport') {
      RetroAudio.playTeleport(cx, cy);
    } else if (move.audioKey === 'raiden_torpedo') {
      RetroAudio.playRaidenTorpedo(cx, cy);
    } else if (move.audioKey === 'lightning') {
      RetroAudio.playLightning(0.35, cx, cy);
    } else if (move.audioKey === 'laser') {
      RetroAudio.playLaser(cx);
    } else if (move.id === 'UPPERCUT') {
      RetroAudio.playWhoosh('punch', cx, cy);
    } else if (move.id === 'SWEEP' || move.id === 'CROUCH_LK' || move.id === 'HK' || move.id === 'LK' || move.id === 'JUMP_KICK') {
      RetroAudio.playWhoosh('kick', cx, cy);
      if (move.id === 'SWEEP') {
        this.vx = this.facing * 240;
      }
    } else if (move.id === 'LP' || move.id === 'HP' || move.id === 'JUMP_PUNCH') {
      RetroAudio.playWhoosh('punch', cx, cy);
    }

    // Signature Movement & Elemental Specials
    if (move.id === 'SCORPION_TELEPORT' || move.id === 'SMOKE_VAPOR_STRIKE') {
      particles.emitFire(this.x + 28, this.y + 50, this.facing, 12);
      this.x = Math.max(40, Math.min(900, opponent.x - this.facing * 90));
      this.facing = (opponent.x >= this.x ? 1 : -1);
      this.y = 290;
      this.vy = 200;
      this.isGrounded = false;
    } else if (move.id === 'SCORPION_FLAME') {
      this.vx = this.facing * 120;
      particles.emitFire(this.x + (this.facing === 1 ? 56 : 0), this.y + 38, this.facing, 22);
      RetroAudio.playFlame();
    } else if (move.id === 'SMOKE_TELEPORT_UPPER') {
      particles.emitSmoke(this.x + 28, this.y + 50, 18);
      this.x = Math.max(40, Math.min(900, opponent.x - this.facing * 45));
      this.y = 445 - this.height;
      this.vy = -560;
      this.isGrounded = false;
    } else if (move.id === 'SUBZERO_SLIDE') {
      this.vx = this.facing * 440;
    } else if (move.id === 'SUBZERO_ICE_SPIKE') {
      this.vx = this.facing * 150;
      particles.emitIce(opponent.x + 28, 430, 18, 445);
      RetroAudio.playFreeze();
    } else if (move.id === 'RAIDEN_TORPEDO') {
      this.vx = this.facing * 580;
      this.vy = -40;
      this.isGrounded = false;
      particles.emitLightning(this.x + 28, this.y + 50, 16);
    } else if (move.id === 'RAIDEN_SHOCK_GRAB') {
      this.vx = this.facing * 410;
      particles.emitLightning(this.x + 28, this.y + 36, 20);
      RetroAudio.playLightning();
    } else if (move.id === 'LIUKANG_FLYING_KICK') {
      this.vx = this.facing * 480;
      this.vy = -130;
      this.isGrounded = false;
    } else if (move.id === 'LIUKANG_BICYCLE_KICK') {
      this.vx = this.facing * 450;
      this.vy = -65;
      this.isGrounded = false;
      RetroAudio.playWhoosh('kick', cx, cy);
    } else if (move.id === 'SMOKE_BOMB') {
      this.invisibleTimer = 180;
      particles.emitSmoke(this.x + 28, this.y + 60, 25);
    } else if (move.id === 'JOHNNY_SHADOW_KICK') {
      this.vx = this.facing * 540;
      this.vy = -70;
      this.isGrounded = false;
    } else if (move.id === 'JOHNNY_NUT_PUNCH') {
      this.vx = this.facing * 320;
    } else if (move.id === 'SONYA_CARTWHEEL') {
      this.vx = this.facing * 360;
      this.vy = -480;
      this.isGrounded = false;
    } else if (move.id === 'SONYA_LEG_GRAB') {
      this.vx = this.facing * 390;
      this.vy = -170;
      this.isGrounded = false;
    } else if (move.id === 'NOOB_TELEPORT_SLAM') {
      particles.emitSmoke(this.x + 28, this.y + 50, 20);
      this.x = Math.max(40, Math.min(900, opponent.x - this.facing * 20));
      this.y = 250;
      this.vy = 400;
      this.isGrounded = false;
      particles.emitHitSparks(this.x + 28, this.y + 50, '#a855f7', 15);
    } else if (move.id === 'NOOB_SHADOW_CLONE') {
      particles.emitSmoke(this.x + 28, this.y + 50, 18);
      this.vx = this.facing * 360;
      this.shadowTrails.push({
        x: this.x - this.facing * 24,
        y: this.y,
        alpha: 0.85,
        facing: this.facing,
      });
    } else if (move.id === 'AIMIX_SONIC_TELEPORT') {
      particles.emitSonicWave(this.x + 28, this.y + 50, this.facing, 18);
      RetroAudio.playSonicWave();
      this.x = Math.max(40, Math.min(900, opponent.x - this.facing * 85));
      this.facing = (opponent.x >= this.x ? 1 : -1);
      this.y = 280;
      this.vy = 180;
      this.isGrounded = false;
    } else if (move.id === 'AIMIX_BASS_CANNON') {
      particles.emitSonicWave(this.x + 28, this.y + 80, this.facing, 24);
      RetroAudio.playAimixBassCannon();
      this.vx = this.facing * 180;
    } else if (move.id === 'MILEENA_TELEPORT_DROP') {
      this.x = Math.max(40, Math.min(900, opponent.x));
      this.y = 80;
      this.vy = 640;
      this.isGrounded = false;
      this.elevationLevel = 'Y01';
      RetroAudio.playTeleport();
      particles.emitHitSparks(this.x + 28, this.y + 40, '#d946ef', 18);
    } else if (move.id === 'MILEENA_ROLLING_THUNDER') {
      this.vx = this.facing * 560;
      this.elevationLevel = 'Y12';
      particles.emitHitSparks(this.x + 28, this.y + 70, '#d946ef', 16);
      RetroAudio.playHit('medium');
    } else if (move.id === 'MILEENA_SAI_THROW') {
      RetroAudio.playSaiPing();
    } else if (move.id === 'REPTILE_SLIDE') {
      this.vx = this.facing * 520;
      particles.emitHitSparks(this.x + 28, this.y + 80, '#84cc16', 15);
      RetroAudio.playReptileAcid();
    } else if (move.id === 'KUNGLAO_SPIN') {
      particles.emitHitSparks(this.x + 28, this.y + 50, '#e2e8f0', 16);
      this.vx = this.facing * 350;
      RetroAudio.playKungLaoHat();
    } else if (move.id === 'KUNGLAO_DIVE_KICK') {
      if (!this.isGrounded) {
        this.vx = this.facing * 490;
        this.vy = 410;
      } else {
        this.vx = this.facing * 420;
        this.vy = -210;
        this.isGrounded = false;
      }
      particles.emitHitSparks(this.x + 28, this.y + 50, '#60a5fa', 16);
      RetroAudio.playWhoosh('kick');
    } else if (move.id === 'KITANA_FAN_LIFT') {
      particles.emitSonicWave(this.x + this.facing * 75, this.y + 55, this.facing, 18);
      RetroAudio.playKitanaFanLift();
    } else if (move.id === 'KITANA_SQUARE_WAVE') {
      this.vx = this.facing * 500;
      this.vy = -80;
      this.isGrounded = false;
      particles.emitHitSparks(this.x + 28, this.y + 50, '#38bdf8', 14);
      RetroAudio.playKitanaFanLift();
    } else if (move.id === 'GORO_GROUND_STOMP') {
      this.vy = -600;
      this.isGrounded = false;
      RetroAudio.playGoroStomp();
      RetroAudio.playGoroRoar();
      particles.emitBoneFragments(this.x + 28, 440, this.facing);
    } else if (move.id === 'GORO_CHEST_POUND') {
      this.vx = this.facing * 310;
      RetroAudio.playGoroRoar();
      particles.emitHitSparks(this.x + 28, this.y + 42, '#ea580c', 16);
    } else if (move.id === 'ROBOCOP_AUTO9_BURST') {
      this.vx = this.facing * 330;
      particles.emitHitSparks(this.x + 28, this.y + 50, '#94a3b8', 16);
      RetroAudio.playRobocopAuto9();
    } else if (move.id === 'ROBOCOP_RIOT_SHIELD') {
      this.vx = this.facing * 340;
      this.shieldReflectTimer = 28;
      particles.emitHitSparks(this.x + 28, this.y + 45, '#38bdf8', 16);
      RetroAudio.playBlock();
    } else if (move.id === 'LEONARDO_KATANA_SPIN') {
      this.vx = this.facing * 300;
      this.vy = -80;
      this.isGrounded = false;
      particles.emitHitSparks(this.x + 28, this.y + 45, '#38bdf8', 18);
      RetroAudio.playSword();
    } else if (move.id === 'LEONARDO_NINJA_STRIKE') {
      this.vx = this.facing * 510;
      this.vy = -120;
      this.isGrounded = false;
      particles.emitHitSparks(this.x + 28, this.y + 50, '#3b82f6', 14);
    } else if (move.id === 'LEONARDO_SHELL_CHARGE') {
      this.vx = this.facing * 560;
      this.vy = -45;
      this.isGrounded = false;
      particles.emitHitSparks(this.x + 28, this.y + 55, '#22c55e', 18);
      RetroAudio.playHit('medium');
    } else if (move.id === 'SHANG_SOUL_STEAL') {
      particles.emitHitSparks(this.x + 28, this.y + 50, '#10b981', 18);
      this.x = Math.max(40, Math.min(900, opponent.x - this.facing * 75));
      this.facing = (opponent.x >= this.x ? 1 : -1);
      this.stamina = Math.min(100, this.stamina + 25);
      this.hp = Math.min(this.maxHp, this.hp + 26);
    } else if (move.id === 'SHANG_GROUND_SKULLS') {
      particles.emitFire(opponent.x + 28, 435, this.facing, 26);
      RetroAudio.playFlame();
    }

    // Spawn Projectile
    if (move.projectile) {
      const projOriginX = this.x + (this.facing === 1 ? this.width + 10 : -10);
      const projOriginY = this.y + 36;
      let pSpeed = 460;
      let radius = 18;
      if (move.projectile === 'SPEAR') { pSpeed = 640; radius = 14; }
      else if (move.projectile === 'SONIC_WAVE') { pSpeed = 580; radius = 22; }
      else if (move.projectile === 'ENERGY_RING') { pSpeed = 520; radius = 16; }
      else if (move.projectile === 'FORCEBALL') {
        pSpeed = move.id === 'REPTILE_FORCEBALL' ? 245 : 490;
        radius = move.id === 'REPTILE_FORCEBALL' ? 21 : 18;
      }
      else if (move.projectile === 'DARK_BALL') { pSpeed = 440; radius = 20; }
      else if (move.projectile === 'ACID') { pSpeed = 510; radius = 16; }
      else if (move.projectile === 'HAT') { pSpeed = 620; radius = 18; }
      else if (move.projectile === 'FAN') { pSpeed = 540; radius = 18; }
      else if (move.projectile === 'FIREBALL') { pSpeed = 520; radius = 20; }
      else if (move.projectile === 'SAI') { pSpeed = 610; radius = 15; }

      this.projectiles.push({
        id: `proj_${Date.now()}_${Math.random()}`,
        type: move.projectile,
        ownerFacing: this.facing,
        x: projOriginX,
        y: projOriginY,
        vx: this.facing * pSpeed,
        vy: 0,
        originX: projOriginX,
        originY: projOriginY,
        radius,
        damage: scaledDamage,
        zone: move.zone,
        ttl: move.id === 'REPTILE_FORCEBALL' ? 110 : 65,
        active: true,
        zLane: this.zLane,
      });
    }

    // Track active movement mechanic (0..15)
    if (move.id === 'UPPERCUT' || move.isLauncher) {
      this.activeMechId = 7; // Launcher Uppercut
    } else if (move.id === 'SWEEP' || move.id === 'CROUCH_LK') {
      this.activeMechId = 8; // Leg Sweep / Low Kick
    } else if (move.projectile) {
      this.activeMechId = 12; // Projectile / Spear Cast
    } else if (move.id.includes('TELEPORT')) {
      this.activeMechId = 13; // Shadow Teleport Shift
    }

    return true;
  }

  // Elaborate 7-Second Fatality Execution with Visceral Sounds of Pain and Distinct Character Choreography
  public executeWeaponFatality(opponent: Fighter, particles: ParticleSystem) {
    this.state = 'FATALITY_EXECUTION';
    this.activeMechId = 15; // Fatality Execution
    this.actionFrame = 0;
    this.fatalityTimer = 420; // Exact 7.0 seconds cinematic sequence (60 fps * 7)

    opponent.state = 'FATALITY_EXECUTION';
    opponent.fatalityTimer = 420;

    // Phase 1 (0.0s - 1.2s): Helpless victim drops to knees & gasps in terror as attacker approaches
    RetroAudio.playPainSound('gasp');

    // Phase 2 (1.4s): Character-Specific Primary Impale / Elemental Torture + agonizing groan
    this.scheduleTimer(() => {
      RetroAudio.playPainSound('groan');
      if (this.def.id === 'scorpion') {
        RetroAudio.playSpear();
        RetroAudio.announce('GET_OVER_HERE');
        particles.emitFire(opponent.x + 28, opponent.y + 40, this.facing, 36);
      } else if (this.def.id === 'subzero') {
        RetroAudio.playFreeze();
        particles.emitIce(opponent.x + 28, opponent.y + 40, 36);
      } else if (this.def.id === 'raiden') {
        RetroAudio.playLightning();
        particles.emitLightning(opponent.x + 28, opponent.y + 30, 36);
      } else if (this.def.id === 'smoke') {
        RetroAudio.playTeleport();
        particles.emitSmoke(opponent.x + 28, opponent.y + 40, 45);
      } else if (this.def.id === 'aimix') {
        RetroAudio.playAimixBassCannon();
        particles.emitSonicWave(opponent.x + 28, opponent.y + 40, this.facing, 45);
      } else if (this.def.id === 'mileena') {
        RetroAudio.playSaiPing();
        RetroAudio.playMileenaBite();
        particles.emitHitSparks(opponent.x + 28, opponent.y + 40, '#d946ef', 36);
        particles.emitBlood(opponent.x + 28, opponent.y + 40, this.facing, 30, 445);
      } else if (this.def.id === 'goro') {
        RetroAudio.playGoroStomp();
        RetroAudio.playGoroRoar();
        particles.emitBoneFragments(opponent.x + 28, opponent.y + 35, this.facing);
      } else if (this.def.id === 'noob') {
        RetroAudio.playTeleport();
        particles.emitSmoke(opponent.x + 28, opponent.y + 40, 40);
      } else if (this.def.id === 'sonya') {
        RetroAudio.playLaser();
        particles.emitHitSparks(opponent.x + 28, opponent.y + 40, '#22c55e', 36);
      } else if (this.def.id === 'johnny') {
        RetroAudio.playHit('heavy');
        particles.emitHitSparks(opponent.x + 28, opponent.y + 40, '#f59e0b', 36);
      } else if (this.def.id === 'liukang') {
        RetroAudio.playFlame();
        particles.emitFire(opponent.x + 28, opponent.y + 38, this.facing, 42);
      } else if (this.def.id === 'kunglao') {
        RetroAudio.playKungLaoHat();
        particles.emitHitSparks(opponent.x + 28, opponent.y + 35, '#e2e8f0', 40);
      } else if (this.def.id === 'kitana') {
        RetroAudio.playKitanaFanLift();
        particles.emitSonicWave(opponent.x + 28, opponent.y + 35, this.facing, 36);
      } else if (this.def.id === 'reptile') {
        RetroAudio.playReptileAcid();
        particles.emitHitSparks(opponent.x + 28, opponent.y + 38, '#84cc16', 42);
      } else if (this.def.id === 'robocop') {
        RetroAudio.playRobocopAuto9();
        particles.emitHitSparks(opponent.x + 28, opponent.y + 52, '#38bdf8', 36);
      } else if (this.def.id === 'leonardo') {
        RetroAudio.playSword();
        particles.emitHitSparks(opponent.x + 28, opponent.y + 36, '#38bdf8', 42);
      } else if (this.def.id === 'shangtsung') {
        RetroAudio.playTeleport();
        particles.emitHitSparks(opponent.x + 28, opponent.y + 34, '#10b981', 44);
      } else {
        RetroAudio.playSword();
        particles.emitFire(opponent.x + 28, opponent.y + 40, this.facing, 36);
      }
    }, 1400);

    // Phase 3 (2.8s): Bone crushing fracture + agonizing vocal scream
    this.scheduleTimer(() => {
      RetroAudio.playHit('bone_crack');
      RetroAudio.playPainSound('scream');
      particles.emitBoneFragments(opponent.x + 28, opponent.y + 35, this.facing);
      particles.emitBlood(opponent.x + 28, opponent.y + 35, this.facing, 38, 445);
    }, 2800);

    // Phase 4 (4.2s): Character-Specific Iconic Dismemberment & Decapitation!
    this.scheduleTimer(() => {
      opponent.isDecapitated = true;
      opponent.state = 'DEAD';
      RetroAudio.playPainSound('flesh_tear');
      RetroAudio.playPainSound('shriek');

      const headX = opponent.x + 28;
      const headY = opponent.y + 12;

      if (this.def.id === 'aimix') {
        // AIMIX Ultrasonic Resonance Liquefaction
        opponent.severedParts.push({
          x: headX, y: headY, vx: this.facing * 260, vy: -480, angle: 0, vAngle: this.facing * 0.45,
          type: 'HEAD', color: '#ff6600', skinColor: opponent.def.skinColor,
        });
        opponent.severedParts.push({
          x: opponent.x + 16, y: opponent.y + 36, vx: -this.facing * 200, vy: -350, angle: 0, vAngle: -0.3,
          type: 'ARM', color: '#09090b', skinColor: opponent.def.skinColor,
        });
        particles.emitSonicWave(headX, headY, this.facing, 50);
        RetroAudio.playSonicWave();
      } else if (this.def.id === 'noob') {
        opponent.severedParts.push({
          x: headX, y: headY, vx: this.facing * 180, vy: -380, angle: 0, vAngle: 0.25,
          type: 'HEAD', color: opponent.def.maskColor, skinColor: opponent.def.skinColor,
        });
        opponent.severedParts.push({
          x: opponent.x + 10, y: opponent.y + 38, vx: -this.facing * 220, vy: -300, angle: 0, vAngle: -0.3,
          type: 'ARM', color: opponent.def.giColor, skinColor: opponent.def.skinColor,
        });
        particles.emitSmoke(headX, headY, 50);
      } else if (this.def.id === 'subzero') {
        // Sub-Zero Iconic SPINE RIP!
        opponent.severedParts.push({
          x: headX, y: headY, vx: this.facing * 140, vy: -380, angle: 0, vAngle: this.facing * 0.16,
          type: 'HEAD_SPINE', color: opponent.def.maskColor, skinColor: opponent.def.skinColor,
        });
        particles.emitIce(headX, headY, 30);
      } else if (this.def.id === 'smoke') {
        opponent.severedParts.push({
          x: headX, y: headY, vx: this.facing * 240 + (Math.random() - 0.5) * 60, vy: -420, angle: 0, vAngle: this.facing * 0.35,
          type: 'HEAD', color: opponent.def.maskColor, skinColor: opponent.def.skinColor,
        });
        particles.emitSmoke(opponent.x + 28, opponent.y + 40, 55);
      } else if (this.def.id === 'raiden') {
        opponent.severedParts.push({
          x: headX, y: headY, vx: this.facing * 220, vy: -450, angle: 0, vAngle: this.facing * 0.4,
          type: 'HEAD', color: opponent.def.maskColor, skinColor: opponent.def.skinColor,
        });
        particles.emitLightning(opponent.x + 28, opponent.y + 30, 45);
      } else if (this.def.id === 'goro') {
        // Goro Four-Arm Limb Tear
        opponent.severedParts.push({
          x: headX, y: headY, vx: this.facing * 210, vy: -490, angle: 0, vAngle: this.facing * 0.42,
          type: 'HEAD_SPINE', color: opponent.def.maskColor, skinColor: opponent.def.skinColor,
        });
        opponent.severedParts.push({
          x: opponent.x + 12, y: opponent.y + 34, vx: -this.facing * 240, vy: -370, angle: 0, vAngle: -0.35,
          type: 'ARM', color: opponent.def.giColor, skinColor: opponent.def.skinColor,
        });
        particles.emitBoneFragments(headX, headY, this.facing);
      } else if (this.def.id === 'kunglao' || this.def.id === 'leonardo' || this.def.id === 'kitana') {
        // Razor Hat / Dual Katana / War Fan Bifurcation
        opponent.severedParts.push({
          x: headX, y: headY, vx: this.facing * 235, vy: -410, angle: 0, vAngle: this.facing * 0.45,
          type: 'HEAD', color: opponent.def.maskColor, skinColor: opponent.def.skinColor,
        });
        opponent.severedParts.push({
          x: opponent.x + 24, y: opponent.y + 38, vx: -this.facing * 170, vy: -290, angle: 0, vAngle: -0.25,
          type: 'ARM', color: opponent.def.giColor, skinColor: opponent.def.skinColor,
        });
        particles.emitHitSparks(headX, headY, this.def.accentColor, 40);
      } else if (this.def.id === 'robocop') {
        // Cobra Assault Cannon Obliteration
        opponent.severedParts.push({
          x: headX, y: headY, vx: this.facing * 320, vy: -520, angle: 0, vAngle: this.facing * 0.5,
          type: 'HEAD', color: opponent.def.maskColor, skinColor: opponent.def.skinColor,
        });
        particles.emitFire(headX, headY, this.facing, 50);
        particles.emitSonicWave(headX, headY, this.facing, 36);
      } else if (this.def.id === 'reptile') {
        // Zaterran Tongue / Acid Head Snatch
        opponent.severedParts.push({
          x: headX, y: headY, vx: -this.facing * 190, vy: -380, angle: 0, vAngle: -this.facing * 0.3,
          type: 'HEAD', color: opponent.def.maskColor, skinColor: '#84cc16',
        });
        particles.emitHitSparks(headX, headY, '#84cc16', 45);
      } else if (this.def.id === 'shangtsung') {
        // Emerald Soul Drain + Husk Collapse
        opponent.severedParts.push({
          x: headX, y: headY, vx: this.facing * 130, vy: -440, angle: 0, vAngle: this.facing * 0.25,
          type: 'HEAD', color: '#10b981', skinColor: '#6ee7b7',
        });
        particles.emitHitSparks(headX, headY, '#10b981', 50);
      } else if (this.def.id === 'johnny') {
        // Triple Uppercut Sky-High Launch
        opponent.severedParts.push({
          x: headX, y: headY, vx: this.facing * 110, vy: -610, angle: 0, vAngle: this.facing * 0.55,
          type: 'HEAD', color: opponent.def.maskColor, skinColor: opponent.def.skinColor,
        });
        particles.emitHitSparks(headX, headY, '#22c55e', 35);
      } else {
        // Scorpion / Sonya / Liu Kang / Mileena
        opponent.severedParts.push({
          x: headX, y: headY, vx: this.facing * 200, vy: -360, angle: 0, vAngle: this.facing * 0.25,
          type: 'HEAD', color: opponent.def.maskColor, skinColor: opponent.def.skinColor,
        });
        particles.emitFire(headX, headY, this.facing, 45);
      }

      // Massive arterial blood fountain from severed neck
      particles.emitBlood(headX, headY, this.facing, 65, 445);
      particles.emitBoneFragments(headX, headY, this.facing);

      if (this.def.id === 'scorpion') {
        RetroAudio.announce('TOASTY');
        particles.emitFire(opponent.x + 28, opponent.y + 40, this.facing, 45);
      }
    }, 4200);

    // Phase 5 (5.4s): Heavy body collapse onto floor into blood puddle + dying death rattle
    this.scheduleTimer(() => {
      RetroAudio.playHit('heavy');
      RetroAudio.playPainSound('groan');
      RetroAudio.playGong(0.4);
    }, 5400);

    // Phase 6 (5.8s): Attacker strikes Victory Pose + Booming Mortal Kombat Announcer "FATALITY!"
    this.scheduleTimer(() => {
      if (this.state === 'FATALITY_EXECUTION') {
        this.state = 'VICTORY';
      }
      RetroAudio.announce('FATALITY');
    }, 5800);
  }

  // Launch fighter into air tumble & floor crash (Uppercuts, Heavy Kicks, Weapon strikes)
  public launchKnockdown(kbX: number, kbY: number, isUppercut = false) {
    this.state = 'AIR_TUMBLE';
    this.activeMechId = 9; // Aerial Juggle Tumble
    this.actionFrame = 0;
    this.vx = kbX;
    this.vy = kbY;
    this.isGrounded = false;
    this.tumbleAngle = 0;
    this.tumbleAngularVelocity = (kbX < 0 ? 1 : -1) * (isUppercut ? 0.22 : 0.15);
    this.staggerGauge = 0;
    this.consecutivePunchHits = 0;
  }

  // Quick ninja dash (forward or backward) with shadow ghost trails
  public dash(direction: 1 | -1): boolean {
    if (!this.isGrounded || this.state === 'AIR_TUMBLE' || this.state === 'KNOCKED_DOWN' || this.state === 'DEAD' || this.state === 'FALLEN') {
      return false;
    }
    this.state = 'DASH';
    this.dashDirection = direction;
    this.activeMechId = direction === this.facing ? 3 : 4; // Phantom Ninja Dash vs Backstep Evade
    this.dashTimer = 11;
    this.vx = direction * 560;
    RetroAudio.playTeleport();
    RetroAudio.playWhoosh('dash');
    return true;
  }

  // Register individual punch hit recoil (only breaks poise when completely exhausted)
  public registerPunchHit(damage: number, particles: ParticleSystem): boolean {
    const now = performance.now();
    this.lastHitTime = now;
    this.staggerGauge += damage * 1.1;
    this.hitReactAngle = -0.35; // Head recoils backward from punch

    if (this.stamina <= 5) {
      this.launchKnockdown(-this.facing * 220, -280, false);
      RetroAudio.playHit('bone_crack');
      particles.emitBlood(this.x + 28, this.y + 30, -this.facing, 16, 445);
      return true;
    }
    return false;
  }

  // Knockout into fallen ragdoll pose
  public triggerKnockout() {
    this.state = 'FALLEN';
    this.actionFrame = 0;
    this.vx = -this.facing * 120;
    this.vy = -180;
    this.isGrounded = false;
  }

  // Update loop
  public update(
    dt: number,
    opponent: Fighter,
    particles: ParticleSystem,
    arenaWidth = 960,
    floorY = 445,
    stageId?: StageId
  ) {
    // Spatial Z-lane visual interpolation & sidestep cooldowns
    this.zVisualOffset += (this.zLane - this.zVisualOffset) * Math.min(1, dt * 14);
    if (this.sidestepTimer > 0) this.sidestepTimer--;
    if (this.sidestepCooldown > 0) this.sidestepCooldown--;
    if (this.dropThroughTimer > 0) this.dropThroughTimer--;
    if (this.aiBlockTimer > 0) {
      this.aiBlockTimer--;
      if (this.aiBlockTimer === 0 && this.state === 'BLOCK') {
        this.state = 'IDLE';
      }
    }

    // Active 1960s Vancouver Manifested Stride evaluation
    this.activeStride = stageId ? getStrideAtPosition(this.x + this.width * 0.5, stageId) : null;
    if (this.activeStride?.effect === 'NEON_SHOCK') {
      this.superMeter = Math.min(100, this.superMeter + 14 * this.strideBonusMult * dt);
    }

    // Deterministic Pre-Jump Squat countdown (fallback if any)
    if (this.preJumpTimer > 0) {
      this.preJumpTimer--;
      if (this.preJumpTimer === 0) {
        this.commitPreJumpLaunch();
      }
    }

    if (this.hitFlashFrames > 0) {
      this.hitFlashFrames--;
    }
    if (this.weaponClashCooldown > 0) {
      this.weaponClashCooldown--;
    }
    if (this.landingSquashTimer > 0) {
      this.landingSquashTimer--;
    }
    // Smooth spring-back recovery for squash/stretch
    this.squashX += (1.0 - this.squashX) * Math.min(1, dt * 16);
    this.squashY += (1.0 - this.squashY) * Math.min(1, dt * 16);

    if (this.hitStop > 0) {
      this.hitStop--;
      return;
    }

    // Fractal decaying geometric block pushback cascade
    if (this.fractalPushQueue.length > 0) {
      const impulse = this.fractalPushQueue.shift() || 0;
      this.x = Math.max(30, Math.min(arenaWidth - 86, this.x + impulse));
    }

    this.stateMachine.update();

    const status = this.getStatus();

    // Prompt 2: Stamina Recovery Engine
    if (this.state === 'IDLE' || this.state === 'CROUCH') {
      // Regenerates when standing still or crouching (+18%/sec)
      this.stamina = Math.min(100, this.stamina + 18 * dt);
    } else if (this.state === 'WALK') {
      // Regenerates even faster when moving backward (+24%/sec)
      const movingBackward = (this.facing === 1 && this.vx < 0) || (this.facing === -1 && this.vx > 0);
      if (movingBackward) {
        this.stamina = Math.min(100, this.stamina + 24 * dt);
      } else {
        this.stamina = Math.min(100, this.stamina + 8 * dt);
      }
    } else if (this.state === 'BLOCK') {
      // Sustained blocking steadily drains stamina (18%/sec)
      this.stamina = Math.max(0, this.stamina - 18 * dt);
      // If stamina hits 0 while blocking, guard breaks!
      if (this.stamina <= 0) {
        this.state = 'GUARD_CRUSH';
        this.guardCrushTimer = 50;
        this.vx = -this.facing * 140;
        RetroAudio.playGuardCrush();
        particles.emitLightning(this.x + 28, this.y + 40, 8);
      }
    }

    // Guard meter passive recovery
    if (this.state !== 'BLOCK') {
      this.guardMeter = Math.min(100, this.guardMeter + 25 * dt);
    }

    if (this.wakeupInvulnFrames > 0) {
      this.wakeupInvulnFrames--;
    }

    // Advance walking cycle animation & emit subtle spatial footsteps synced to stride phase
    if (Math.abs(this.vx) > 15 && this.isGrounded && (this.state === 'WALK' || this.state === 'IDLE')) {
      this.walkCycle += dt * 9.5;
      const stepCount = Math.floor(this.walkCycle / Math.PI);
      if (stepCount > this.prevWalkStep) {
        this.prevWalkStep = stepCount;
        RetroAudio.playFootstep(this.mass, this.x + this.width * 0.5, floorY);
      }
    } else {
      this.walkCycle = 0;
      this.prevWalkStep = 0;
    }

    // Decrement combo timer
    if (this.comboTimer > 0) {
      this.comboTimer--;
      if (this.comboTimer === 0) {
        this.comboHits = 0;
        this.juggleHits = 0;
      }
    }

    if (this.shieldReflectTimer > 0) {
      this.shieldReflectTimer--;
    }

    // Decrement precision parry window
    if (this.parryWindow > 0) {
      this.parryWindow--;
    }

    // Counter Ready status decay
    if (this.counterTimer > 0) {
      this.counterTimer--;
      if (this.counterTimer === 0) {
        this.isCounterReady = false;
      }
    }

    // Input buffer expiration
    if (this.bufferWindow > 0) {
      this.bufferWindow--;
      if (this.bufferWindow === 0) {
        this.bufferedMove = null;
      }
    }

    // Smoke invisible mist timer
    if (this.invisibleTimer > 0) {
      this.invisibleTimer--;
      if (this.invisibleTimer % 6 === 0) {
        particles.emitSmoke(this.x + 28, this.y + 40, 2);
      }
    }

    // Guard Crush stagger state
    if (this.state === 'GUARD_CRUSH') {
      this.guardCrushTimer--;
      this.vx *= 0.85;
      if (this.guardCrushTimer <= 0) {
        this.state = 'IDLE';
        this.stamina = 35; // Regains base stamina after guard crush
      }
      return;
    }

    // Frozen state
    if (this.state === 'FROZEN') {
      this.freezeTimer--;
      this.vx = 0;
      if (this.freezeTimer % 14 === 0) {
        particles.emitIce(this.x + 28, this.y + 50, 3);
      }
      if (this.freezeTimer <= 0) {
        this.state = 'IDLE';
        RetroAudio.playHit('light');
      }
      return;
    }

    // Pulled state (Spear)
    if (this.state === 'PULLED') {
      this.pulledTimer--;
      this.x += (opponent.x - this.x) * 0.14;
      if (this.pulledTimer <= 0 || Math.abs(opponent.x - this.x) < 70) {
        this.state = 'DIZZY';
        this.dizzyTimer = 90;
      }
      return;
    }

    // Dizzy state (Stun or Match Point Finish Him)
    if (this.state === 'DIZZY') {
      this.dizzyTimer--;
      this.vx = 0;
      this.x += Math.sin(this.dizzyTimer * 0.1) * 0.8;
      return;
    }

    // Fallen Body State (Knocked Out on Floor)
    if (this.state === 'FALLEN') {
      this.vx *= 0.90;
      this.vy += 1200 * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.y + 24 >= floorY) {
        this.y = floorY - 24;
        this.vy = 0;
        this.isGrounded = true;
      }
      return;
    }

    // Stage Fatality Pit Drop State (plunges below floorY into pit spikes)
    if (this.state === 'STAGE_FALL') {
      this.vy += 1280 * this.mass * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.tumbleAngle += this.tumbleAngularVelocity || 0.2;
      const pitFloorY = floorY + 115;
      if (this.y >= pitFloorY) {
        this.y = pitFloorY;
        this.vy = 0;
        this.vx = 0;
        this.state = 'DEAD';
      }
      return;
    }

    // Fatality Execution State
    if (this.state === 'FATALITY_EXECUTION') {
      this.fatalityTimer--;
      this.vx = 0;
      if (this.fatalityTimer <= 0) {
        this.state = 'VICTORY';
      }
    }

    // Hit reaction angle decay (head snapping back from punches)
    if (this.hitReactAngle !== 0) {
      this.hitReactAngle *= 0.82;
      if (Math.abs(this.hitReactAngle) < 0.02) this.hitReactAngle = 0;
    }

    // Passive decay of poise stagger gauge
    if (this.staggerGauge > 0) {
      this.staggerGauge = Math.max(0, this.staggerGauge - 20 * dt);
    }

    // Update shadow ghost trails (Ninja Dash)
    for (let i = this.shadowTrails.length - 1; i >= 0; i--) {
      this.shadowTrails[i].alpha -= 0.08;
      if (this.shadowTrails[i].alpha <= 0) {
        this.shadowTrails.splice(i, 1);
      }
    }

    // DASH State: Quick ninja dash
    if (this.state === 'DASH') {
      this.dashTimer--;
      this.vx = this.dashDirection * 560;
      if (this.dashTimer % 2 === 0) {
        this.shadowTrails.push({
          x: this.x,
          y: this.y,
          alpha: 0.65,
          facing: this.facing,
        });
      }
      if (this.dashTimer <= 0) {
        this.state = 'IDLE';
        this.vx = 0;
      }
    }

    // AIR_TUMBLE: Launched by Uppercut, Heavy Kick, Weapon slash, or punch poise break!
    if (this.state === 'AIR_TUMBLE') {
      this.vy += 1280 * this.mass * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.tumbleAngle += this.tumbleAngularVelocity;

      // Floor collision: crash with bounce!
      if (this.y + 24 >= floorY) {
        this.y = floorY - 24;
        this.isGrounded = true;
        this.activeMechId = 10; // Ground Slam Bounce
        if (Math.abs(this.vy) > 160) {
          // Bounce off floor
          this.vy = -this.vy * 0.28;
          this.vx *= 0.6;
          RetroAudio.playHit('heavy');
          particles.emitBlood(this.x + 28, floorY - 6, 0, 10, floorY);
        } else {
          // Come to rest flat on the ground
          this.vy = 0;
          this.vx = 0;
          this.tumbleAngle = 0;
          if (this.hp <= 0) {
            this.state = 'FALLEN';
          } else {
            this.state = 'KNOCKED_DOWN';
            this.knockdownTimer = 42; // ~0.7s lying on floor
          }
        }
      }
      this.x = Math.max(30, Math.min(arenaWidth - 86, this.x));
      return;
    }

    // KNOCKED_DOWN: Defeated or temporarily downed on floor
    if (this.state === 'KNOCKED_DOWN') {
      this.vx *= 0.82;
      this.vy = 0;
      this.y = floorY - 24;
      this.isGrounded = true;
      this.knockdownTimer--;

      if (this.hp <= 0) {
        this.state = 'FALLEN';
        return;
      }

      if (this.knockdownTimer <= 0) {
        this.state = 'WAKEUP';
        this.actionFrame = 0;
        this.wakeupInvulnFrames = getActiveSwarmPatch().combatTuning.wakeupInvulnFrames;
      }
      return;
    }

    // WAKEUP: Springs back up to feet with invulnerability window
    if (this.state === 'WAKEUP') {
      this.actionFrame++;
      this.vx = 0;
      this.vy = 0;
      this.y = floorY - this.height;
      if (this.actionFrame > 10) {
        this.state = 'IDLE';
        this.actionFrame = 0;
      }
      return;
    }

    // Mid-air Juggle physics (scaled by Swarm juggle gravity tuning)
    if (this.state === 'JUGGLE') {
      const juggleGravScale = getActiveSwarmPatch().combatTuning.juggleGravityScale;
      this.vy += 1100 * this.mass * juggleGravScale * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      if (this.y + this.height >= floorY) {
        const impactVel = Math.abs(this.vy);
        this.y = floorY - this.height;
        this.vy = 0;
        this.vx = 0;
        this.isGrounded = true;
        this.state = this.hp <= 0 ? 'FALLEN' : 'IDLE';
        RetroAudio.playLanding(impactVel, this.mass, this.x + this.width * 0.5, floorY);
        particles.emitBlood(this.x + 28, floorY - 5, 0, 5, floorY);
      }
      return;
    }

    // Auto-face opponent when in neutral states
    if (this.state !== 'ATTACK' && this.state !== 'HITSTUN' && this.state !== 'DEAD') {
      this.facing = (opponent.x >= this.x ? 1 : -1);
    }

    // Handle THROW state duration
    if (this.state === 'THROW') {
      this.actionFrame++;
      this.vx *= 0.85;
      if (this.actionFrame >= 18) {
        this.state = 'IDLE';
        this.actionFrame = 0;
        this.vx = 0;
      }
    }

    // Handle RUN sprint physics (drains stamina gently, leaves shadow trail, auto-stops on fatigue/backstep)
    if (this.state === 'RUN') {
      this.actionFrame++;
      this.stamina = Math.max(0, this.stamina - 16 * dt);
      this.vx = this.facing * this.def.speed * status.baseSpeedMult * 1.75;
      this.walkCycle += dt * 15;
      if (this.actionFrame % 3 === 0) {
        this.shadowTrails.push({
          x: this.x,
          y: this.y,
          alpha: 0.45,
          facing: this.facing,
        });
      }
      const pullingBack = this.moveIntentX * this.facing < -0.2;
      if (this.stamina <= 0 || this.actionFrame > 32 || pullingBack || !this.isGrounded) {
        this.state = 'IDLE';
        this.vx *= 0.4;
      }
    }

    // Handle Active Attack Animation & Body-Tight Hitboxes
    if (this.state === 'ATTACK' && this.currentAttack) {
      this.actionFrame++;
      const a = this.currentAttack;
      const dynRecovery = Math.round(a.recovery * status.recoveryMult);

      // Hitbox active window (strictly bound to striking limb reach)
      if (this.actionFrame > a.startup && this.actionFrame <= a.startup + a.active) {
        let hbY = this.y + 26;
        let hbHeight = 34;
        let hbWidth =
          a.id === 'HP' || a.id === 'UPPERCUT' || a.id === 'HK'
            ? 56
            : a.id === 'CROUCH_LK' || a.id === 'SWEEP'
            ? 52
            : 46;

        if (a.zone === 'HEAD') {
          hbY = this.y + 6;
          hbHeight = 32;
        } else if (a.zone === 'LEFT_LIMBS') {
          hbY = this.y + 62;
          hbHeight = 34;
        }

        if (
          a.id === 'LIUKANG_FLYING_KICK' ||
          a.id === 'LIUKANG_BICYCLE_KICK' ||
          a.id === 'JOHNNY_SHADOW_KICK'
        ) {
          hbWidth = 62;
          hbHeight = 42;
        } else if (a.id === 'SCORPION_FLAME' || a.id === 'SUBZERO_ICE_SPIKE') {
          hbWidth = 74;
          hbHeight = 46;
        }

        const isFloorEruption = a.id === 'SUBZERO_ICE_SPIKE';
        const hbX = isFloorEruption
          ? opponent.x + 4
          : this.facing === 1
          ? this.x + this.width - 14
          : this.x - hbWidth + 14;

        this.activeHitbox = {
          x: hbX,
          y: hbY,
          width: hbWidth,
          height: hbHeight,
          attack: a,
        };
      } else {
        this.activeHitbox = null;
      }

      // Auto-open combo cancel window near end of active frames for Hit 1 -> Hit 2 -> Hit 3 Triple Combos
      const chainActive = this.stateMachine.comboStep === 1 || this.stateMachine.comboStep === 2;
      if (this.actionFrame >= a.startup + a.active && chainActive) {
        this.canCancel = true;
      }

      // Finish attack recovery
      if (this.actionFrame >= a.startup + a.active + dynRecovery) {
        this.state = 'IDLE';
        this.currentAttack = null;
        this.activeHitbox = null;
        this.canCancel = false;

        // Check buffered move
        if (this.bufferedMove) {
          const next = this.bufferedMove;
          this.bufferedMove = null;
          this.bufferWindow = 0;
          this.executeMove(next, opponent, particles);
        }
      }
    } else if (this.state === 'HITSTUN') {
      this.actionFrame++;
      this.vx *= 0.88;
      if (this.actionFrame > 24) {
        this.state = this.hp <= 0 ? 'FALLEN' : 'IDLE';
      }
    }

    // Smooth horizontal acceleration & friction + mid-air steering + Stride modifier
    const speedScale = getActiveSwarmPatch().combatTuning.globalSpeedMult;
    const strideSpeedMult =
      this.activeStride?.effect === 'SLICK_SPEED'
        ? 1 + 0.28 * this.strideBonusMult
        : 1.0;
    const isMovementControllable =
      this.state === 'IDLE' ||
      this.state === 'WALK' ||
      (this.state === 'CROUCH' && !this.isGrounded);
    if (isMovementControllable) {
      const targetSpeed =
        this.moveIntentX * this.def.speed * status.baseSpeedMult * speedScale * strideSpeedMult;
      if (this.isGrounded) {
        if (Math.abs(this.moveIntentX) > 0.05) {
          this.vx += (targetSpeed - this.vx) * Math.min(1, dt * 18);
          this.state = 'WALK';
        } else {
          this.vx *= Math.pow(0.0015, dt);
          if (Math.abs(this.vx) < 8) {
            this.vx = 0;
            if (this.state === 'WALK') this.state = 'IDLE';
          }
        }
      } else if (Math.abs(this.moveIntentX) > 0.05) {
        const profile = this.flightNetwork.getProfile(this.def.id as CharacterId);
        const airTarget = targetSpeed * profile.airControl;
        this.vx += (airTarget - this.vx) * Math.min(1, dt * 8.5);
      }
    }

    // Physics Integration via Character Flying Movement Network + 1960s Elevated Platforms
    const wasAirborne = !this.isGrounded;
    const preLandVy = this.vy;
    const prevBottom = this.y + this.height;
    const gravityRiftScale = this.activeStride?.effect === 'GRAVITY_RIFT' ? 0.72 : 1.0;

    if (!this.isGrounded) {
      const airStep = this.flightNetwork.stepAirPhysics(
        this.def.id as CharacterId,
        dt,
        this.x,
        this.y,
        this.vx,
        this.vy,
        this.isGrounded,
        this.state,
        this.currentAttack?.id
      );
      this.vx = airStep.vxDamped;
      this.vy += (airStep.gravityAccel * this.mass * gravityRiftScale + airStep.hoverLift) * dt;
      if (this.jumpPhase !== 'FAST_FALL' && this.jumpPhase !== 'PRE_JUMP') {
        if (this.vy < -95) this.jumpPhase = 'ASCENT';
        else if (Math.abs(this.vy) <= 95) this.jumpPhase = 'APEX';
        else this.jumpPhase = 'DESCENT';
      }
    } else {
      this.flightNetwork.stepAirPhysics(
        this.def.id as CharacterId,
        dt,
        this.x,
        this.y,
        this.vx,
        this.vy,
        true,
        this.state,
        this.currentAttack?.id
      );
      this.vy += 1350 * this.mass * dt;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const newBottom = this.y + this.height;
    const stagePlatforms = stageId ? getPlatformsForStage(stageId) : [];
    let landedOnPlatform: StagePlatform | null = null;

    const airState: string = this.state;
    if (this.standingPlatform) {
      const centerFootX = this.x + this.width * 0.5;
      if (
        centerFootX < this.standingPlatform.x - 10 ||
        centerFootX > this.standingPlatform.x + this.standingPlatform.width + 10 ||
        this.dropThroughTimer > 0
      ) {
        this.standingPlatform = null;
        if (this.y + this.height < floorY - 4) {
          this.isGrounded = false;
          this.jumpPhase = 'DESCENT';
        }
      } else {
        this.y = this.standingPlatform.y - this.height;
        this.vy = 0;
        this.isGrounded = true;
        this.jumpPhase = 'GROUNDED';
      }
    } else if (
      this.dropThroughTimer === 0 &&
      this.vy >= 0 &&
      airState !== 'AIR_TUMBLE' &&
      airState !== 'JUGGLE' &&
      stagePlatforms.length > 0
    ) {
      const centerFootX = this.x + this.width * 0.5;
      for (const plat of stagePlatforms) {
        if (
          centerFootX >= plat.x - 8 &&
          centerFootX <= plat.x + plat.width + 8 &&
          prevBottom <= plat.y + 10 &&
          newBottom >= plat.y
        ) {
          landedOnPlatform = plat;
          break;
        }
      }
      if (landedOnPlatform) {
        this.y = landedOnPlatform.y - this.height;
        this.vy = 0;
        this.standingPlatform = landedOnPlatform;
        this.isGrounded = true;
        this.jumpPhase = 'GROUNDED';
        this.airDriftUsed = false;
        this.landingSquashTimer = 6;
        this.squashX = 1.12;
        this.squashY = 0.88;
        RetroAudio.playLanding(preLandVy * 0.7, this.mass, this.x + this.width * 0.5, landedOnPlatform.y);
      }
    }

    // Floor boundary + landing squash cushion + spatial landing impact foley
    if (!landedOnPlatform && !this.standingPlatform && this.y + this.height >= floorY) {
      this.y = floorY - this.height;
      this.vy = 0;
      if (wasAirborne) {
        this.airDriftUsed = false;
        this.landingSquashTimer = 7;
        this.squashX = 1.15;
        this.squashY = 0.86;
        RetroAudio.playLanding(preLandVy, this.mass, this.x + this.width * 0.5, floorY);
      }
      this.isGrounded = true;
      this.jumpPhase = 'GROUNDED';
    }

    // Arena walls clamping
    this.x = Math.max(30, Math.min(arenaWidth - 86, this.x));

    // Wounded arterial blood drips onto arena floor
    if (this.hp > 0 && this.hp < this.maxHp * 0.48 && Math.random() < 0.085) {
      particles.emitBloodDrip(this.x + 28, this.y + 40, floorY);
    }

    // Live MovementMatrix cell & 16-Sprite Movement Mechanic sync
    const matrixResolved = resolveFighterMatrixCell(this);
    this.activeMatrixCellId = matrixResolved.cell.id;
    this.activeMechId = matrixResolved.cell.mechId;

    // 9D Matrix Telemetry & Movement Synthesis (Hermite Bezier micro-interpolation)
    // 1. Z-Gate Elevation Level determination (Y01 -> Y12)
    let targetZGate: ElevationLevel = 'Y08';
    const groundLevelY = floorY - this.height;
    const dyFromGround = this.y - groundLevelY; // negative = airborne

    if (dyFromGround < -200) targetZGate = 'Y01';
    else if (dyFromGround < -160) targetZGate = 'Y02';
    else if (dyFromGround < -120) targetZGate = 'Y03';
    else if (dyFromGround < -80) targetZGate = 'Y04';
    else if (dyFromGround < -45) targetZGate = 'Y05';
    else if (dyFromGround < -15) targetZGate = 'Y06';
    else if (this.state === 'BLOCK') targetZGate = 'Y10';
    else if (this.state === 'CROUCH') targetZGate = 'Y11';
    else if (this.state === 'FALLEN' || (this.state as string) === 'KNOCKED_DOWN' || (this.state as string) === 'AIR_TUMBLE' || (this.currentAttack?.id === 'SWEEP')) targetZGate = 'Y12';
    else if (this.walkCycle !== 0) {
      targetZGate = Math.sin(this.walkCycle) > 0.4 ? 'Y07' : 'Y09';
    } else {
      targetZGate = 'Y08';
    }

    this.targetElevationLevel = targetZGate;
    const targetOffset = ELEVATION_BOX[targetZGate].yOffset;
    this.currentElevationY = hermiteBezierInterpolate(this.currentElevationY, targetOffset, dt * 10);
    this.elevationLevel = targetZGate;

    // 2. Torso Rotation (-45° to +45°)
    let targetTorsoRot = 0;
    if (this.state === 'ATTACK' && this.currentAttack) {
      if (this.currentAttack.id === 'UPPERCUT') targetTorsoRot = -25;
      else if (this.currentAttack.id === 'HP' || this.currentAttack.id === 'LP') targetTorsoRot = 18;
      else if (this.currentAttack.id === 'HK' || this.currentAttack.id === 'LK' || this.currentAttack.id === 'CROUCH_LK') targetTorsoRot = -15;
    } else if (this.state === 'CROUCH') {
      targetTorsoRot = 22;
    } else if (this.state === 'BLOCK') {
      targetTorsoRot = -10;
    } else if (this.state === 'HITSTUN') {
      targetTorsoRot = -28;
    } else if (this.walkCycle !== 0) {
      targetTorsoRot = Math.sin(this.walkCycle) * 8;
    }
    const currentTorsoRot = hermiteBezierInterpolate(this.telemetry9D.torsoRot, targetTorsoRot, dt * 10);

    // 3. Arm Phase (0.0 to 1.0)
    let targetArmPhase = 0.5;
    if (this.state === 'ATTACK' && this.currentAttack) {
      targetArmPhase = Math.min(1.0, this.actionFrame / Math.max(1, (this.currentAttack.startup + this.currentAttack.active)));
    } else {
      targetArmPhase = 0.5 + Math.sin(Date.now() * 0.005) * 0.25;
    }

    // 4. Breathing Wave & Pelvis Sway
    const breathingWave = Math.sin(Date.now() * 0.006) * 3.5;
    const pelvisSway = this.walkCycle !== 0 ? Math.sin(this.walkCycle * 2) * 6 : Math.sin(Date.now() * 0.003) * 2;

    // 5. Head Pitch & Stride Velocity
    const headPitch = this.hitReactAngle !== 0 ? (this.hitReactAngle * 180 / Math.PI) : (this.state === 'CROUCH' ? 12 : -targetTorsoRot * 0.3);
    const strideVel = Math.abs(this.vx);

    // 6. Fluid Flow Flux (Arterial bleed rate in ml/s)
    const brokenZones = Object.values(this.zones).filter(z => z.isBroken).length;
    const fluidFlow = Math.round(60 + (1 - this.hp / this.maxHp) * 140 + brokenZones * 45);

    // Commit 9D Telemetry Vector
    this.telemetry9D = {
      torsoRot: Math.round(currentTorsoRot * 10) / 10,
      armPhase: Math.round(targetArmPhase * 100) / 100,
      zGate: targetZGate,
      breathingWave: Math.round(breathingWave * 10) / 10,
      pelvisSway: Math.round(pelvisSway * 10) / 10,
      headPitch: Math.round(headPitch * 10) / 10,
      strideVelocity: Math.round(strideVel),
      weaponPhase: Math.round(this.weaponAngle * 100) / 100,
      fluidFlow,
    };

    // Update projectiles
    this.updateProjectiles(dt, opponent, particles, floorY);

    // Update Severed Parts (Decapitation physics)
    this.updateSeveredParts(dt, floorY);
  }

  /**
   * Resolves physical pushbox separation between grounded/close fighters
   * so sprites never overlap awkwardly in neutral while allowing aerial cross-ups.
   */
  public resolvePushbox(other: Fighter, arenaWidth = 960) {
    if (
      this.state === 'DEAD' ||
      this.state === 'FALLEN' ||
      this.state === 'FATALITY_EXECUTION' ||
      other.state === 'DEAD' ||
      other.state === 'FALLEN' ||
      other.state === 'FATALITY_EXECUTION' ||
      this.state === 'TELEPORT' ||
      other.state === 'TELEPORT'
    ) {
      return;
    }
    const verticalOverlap = Math.abs(this.y - other.y) < 76;
    if (!verticalOverlap) return;

    const minDist = 42;
    const dx = other.x - this.x;
    const dist = Math.abs(dx);
    if (dist < minDist) {
      const push = (minDist - dist) * 0.5;
      const dir = dx >= 0 ? 1 : -1;
      this.x = Math.max(30, Math.min(arenaWidth - 86, this.x - dir * push));
      other.x = Math.max(30, Math.min(arenaWidth - 86, other.x + dir * push));
    }
  }

  private updateSeveredParts(dt: number, floorY: number) {
    for (const part of this.severedParts) {
      if (part.isGrounded) continue;
      part.vy += 980 * dt;
      part.x += part.vx * dt;
      part.y += part.vy * dt;
      part.angle += part.vAngle;

      if (part.y >= floorY - 10) {
        part.y = floorY - 10;
        part.vy = -part.vy * 0.35; // Small bounce
        part.vx *= 0.5;
        part.vAngle *= 0.3;
        if (Math.abs(part.vy) < 40) {
          part.isGrounded = true;
        }
      }
    }
  }

  // Update projectiles thrown by this fighter
  private updateProjectiles(dt: number, opponent: Fighter, particles: ParticleSystem, floorY: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.ttl--;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.type === 'ICEBALL') {
        particles.emitIce(p.x, p.y, 2, floorY);
      } else if (p.type === 'LIGHTNING') {
        particles.emitLightning(p.x, p.y, 2);
      } else if (p.type === 'DRAGON_FIRE' || p.type === 'FIREBALL') {
        particles.emitFire(p.x, p.y, p.ownerFacing, 3);
      } else if (p.type === 'SMOKE_CLOUD') {
        particles.emitSmoke(p.x, p.y, 3);
      } else if (p.type === 'ACID') {
        particles.emitHitSparks(p.x, p.y, '#84cc16', 2);
      } else if (p.type === 'HAT' || p.type === 'FAN') {
        particles.emitHitSparks(p.x, p.y, '#e2e8f0', 2);
      }

      const oppHurtboxes = opponent.getHurtboxes();
      let hit = false;
      const laneMatched = areLanesCompatible(p.zLane ?? 0, opponent.zLane, null);
      const projRect = { x: p.x - p.radius, y: p.y - p.radius, width: p.radius * 2, height: p.radius * 2 };

      if (laneMatched && opponent.sidestepTimer <= 2) {
        for (const zone of ['HEAD', 'TORSO', 'LEFT_LIMBS', 'RIGHT_LIMBS'] as AnatomicalZone[]) {
          const hb = oppHurtboxes[zone];
          if (
            projRect.x < hb.x + hb.width &&
            projRect.x + projRect.width > hb.x &&
            projRect.y < hb.y + hb.height &&
            projRect.y + projRect.height > hb.y
          ) {
            hit = true;
            this.resolveProjectileHit(p, opponent, zone, particles);
            break;
          }
        }
      }

      if (hit || p.ttl <= 0 || p.x < -100 || p.x > 1100) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private resolveProjectileHit(p: Projectile, def: Fighter, hitZone: AnatomicalZone, particles: ParticleSystem) {
    // RoboCop Riot Shield Deflection
    if (def.shieldReflectTimer > 0) {
      RetroAudio.playBlock();
      particles.emitHitSparks(def.x + 28, def.y + 42, '#38bdf8', 18);
      def.vx = -p.ownerFacing * 60;
      return;
    }

    if (def.state === 'BLOCK') {
      def.hp = Math.max(0, def.hp - Math.floor(p.damage * 0.20));
      def.stamina = Math.max(0, def.stamina - 15);
      def.vx = p.ownerFacing * 90;
      RetroAudio.playBlock();
      return;
    }

    if (p.type === 'SPEAR') {
      def.state = 'PULLED';
      def.pulledTimer = 45;
      def.vx = 0;
      def.hp = Math.max(0, def.hp - p.damage);
      def.zones[hitZone].hp = Math.max(0, def.zones[hitZone].hp - p.damage * 1.5);
      def.triggerReactiveHit(p.damage, p.ownerFacing, hitZone, true, particles);
      RetroAudio.playHit('heavy');
      this.comboHits = Math.min(3, this.comboHits + 1);
      this.comboTimer = 90;
    } else if (p.type === 'ICEBALL') {
      def.state = 'FROZEN';
      def.freezeTimer = 150;
      def.hp = Math.max(0, def.hp - p.damage);
      particles.emitIce(def.x + 28, def.y + 40, 20);
      RetroAudio.playFreeze();
      this.comboHits = Math.min(3, this.comboHits + 1);
      this.comboTimer = 90;
    } else if (p.type === 'FORCEBALL' && this.def.id === 'reptile') {
      // Reptile Slow Forceball high upward juggle launch!
      def.state = 'JUGGLE';
      def.actionFrame = 0;
      def.vx = p.ownerFacing * 135;
      def.vy = -490;
      def.isGrounded = false;
      def.hp = Math.max(0, def.hp - p.damage);
      def.zones[hitZone].hp = Math.max(0, def.zones[hitZone].hp - p.damage * 1.4);
      particles.emitHitSparks(def.x + 28, def.y + 35, '#22c55e', 20);
      RetroAudio.playHit('medium');
      this.comboHits = Math.min(3, this.comboHits + 1);
      this.comboTimer = 90;
    } else if (p.type === 'SONIC_WAVE') {
      def.state = 'HITSTUN';
      def.actionFrame = 0;
      def.vx = p.ownerFacing * 340;
      def.vy = -180;
      def.isGrounded = false;
      def.hp = Math.max(0, def.hp - p.damage);
      def.zones[hitZone].hp = Math.max(0, def.zones[hitZone].hp - p.damage * 1.5);
      particles.emitSonicWave(def.x + 28, def.y + 35, p.ownerFacing, 16);
      RetroAudio.playSonicWave();
      this.comboHits = Math.min(3, this.comboHits + 1);
      this.comboTimer = 90;
    } else if (p.type === 'DARK_BALL') {
      def.state = 'HITSTUN';
      def.actionFrame = 0;
      def.guardMeter = 0; // Strip guard
      def.vx = p.ownerFacing * 160;
      def.hp = Math.max(0, def.hp - p.damage);
      particles.emitSmoke(def.x + 28, def.y + 35, 14);
      RetroAudio.playHit('heavy');
      this.comboHits = Math.min(3, this.comboHits + 1);
      this.comboTimer = 90;
    } else if (p.type === 'ACID') {
      def.state = 'HITSTUN';
      def.actionFrame = 0;
      def.vx = p.ownerFacing * 180;
      def.hp = Math.max(0, def.hp - p.damage);
      def.zones[hitZone].hp = Math.max(0, def.zones[hitZone].hp - p.damage * 1.8);
      particles.emitHitSparks(def.x + 28, def.y + 35, '#84cc16', 22);
      RetroAudio.playHit('heavy');
      this.comboHits = Math.min(3, this.comboHits + 1);
      this.comboTimer = 90;
    } else if (p.type === 'HAT' || p.type === 'FAN') {
      def.state = 'HITSTUN';
      def.actionFrame = 0;
      def.vx = p.ownerFacing * 280;
      def.vy = -120;
      def.isGrounded = false;
      def.hp = Math.max(0, def.hp - p.damage);
      def.zones[hitZone].hp = Math.max(0, def.zones[hitZone].hp - p.damage * 1.6);
      def.triggerReactiveHit(p.damage, p.ownerFacing, hitZone, true, particles);
      RetroAudio.playSword();
      this.comboHits = Math.min(3, this.comboHits + 1);
      this.comboTimer = 90;
    } else if (p.type === 'SAI') {
      def.state = 'HITSTUN';
      def.actionFrame = 0;
      def.vx = p.ownerFacing * 250;
      def.hp = Math.max(0, def.hp - p.damage);
      def.zones[hitZone].hp = Math.max(0, def.zones[hitZone].hp - p.damage * 1.6);
      def.triggerReactiveHit(p.damage, p.ownerFacing, hitZone, true, particles);
      particles.emitHitSparks(def.x + 28, def.y + 35, '#d946ef', 16);
      RetroAudio.playSaiPing();
      this.comboHits = Math.min(3, this.comboHits + 1);
      this.comboTimer = 90;
    } else {
      def.state = 'HITSTUN';
      def.actionFrame = 0;
      def.vx = p.ownerFacing * 200;
      def.hp = Math.max(0, def.hp - p.damage);
      def.zones[hitZone].hp = Math.max(0, def.zones[hitZone].hp - p.damage * 1.5);
      def.triggerReactiveHit(p.damage, p.ownerFacing, hitZone, false, particles);
      RetroAudio.playHit('heavy');
      this.comboHits = Math.min(3, this.comboHits + 1);
      this.comboTimer = 90;
    }
  }

  // Sprite Sheet Renderer (with clean 64-bit Procedural Fallback)
  public draw(ctx: CanvasRenderingContext2D, _showColliders = false) {
    // Primary Sprite System
    if (SpriteSheetEngine.drawFighterSprite(ctx, this, 445)) {
      ctx.save();
      ctx.translate(this.x, this.y);
      this.drawSeveredParts(ctx);
      ctx.restore();

      this.drawProjectiles(ctx);
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    const isFallen = this.state === 'FALLEN' || (this.state === 'DEAD' && this.fatalityTimer === 0);
    const isCrouch = this.state === 'CROUCH';
    const isAttacking = this.state === 'ATTACK';
    const isHitstun = this.state === 'HITSTUN';
    const isFrozen = this.state === 'FROZEN';
    const isDizzy = this.state === 'DIZZY';
    const isGuardCrush = this.state === 'GUARD_CRUSH';

    if (this.invisibleTimer > 0) {
      ctx.globalAlpha = 0.35;
    }

    // Render Ninja Dash Ghost Shadow Trails
    for (const trail of this.shadowTrails) {
      ctx.save();
      ctx.globalAlpha = trail.alpha * 0.45;
      ctx.fillStyle = this.def.themeColor;
      ctx.fillRect(trail.x - this.x, trail.y - this.y + 16, this.width, this.height - 16);
      ctx.restore();
    }

    // Draw Severed Parts (e.g. flying decapitated head)
    this.drawSeveredParts(ctx);

    // If AIR_TUMBLE: Render mid-air tumbling fighter (thrown by Uppercut or Heavy Kick)
    if (this.state === 'AIR_TUMBLE') {
      ctx.save();
      ctx.translate(28, 38);
      ctx.rotate(this.tumbleAngle);
      this.drawTumblingSprite(ctx);
      ctx.restore();
      ctx.restore();
      this.drawProjectiles(ctx);
      return;
    }

    // If Fallen or Knocked Down, render realistic horizontal ragdoll pose on arena floor
    if (this.state === 'KNOCKED_DOWN' || isFallen) {
      this.drawFallenPose(ctx);
      ctx.restore();
      this.drawProjectiles(ctx);
      return;
    }

    // 64-bit Perspective Floor Shadow (scales realistically with elevation/jump height)
    ctx.save();
    const floorY = 445;
    const currentFeetY = this.y + this.height;
    const heightAboveFloor = Math.max(0, floorY - currentFeetY);
    const shadowScale = Math.max(0.28, 1 - heightAboveFloor / 300);
    const shadowAlpha = Math.max(0.15, 0.7 * (1 - heightAboveFloor / 360));
    
    // Draw soft-diffused elliptical shadow projected on arena floor
    const relFloorY = this.height + heightAboveFloor;
    const shadowGrad = ctx.createRadialGradient(28, relFloorY, 2, 28, relFloorY, 34 * shadowScale);
    shadowGrad.addColorStop(0, `rgba(0, 0, 0, ${shadowAlpha})`);
    shadowGrad.addColorStop(0.65, `rgba(0, 0, 0, ${shadowAlpha * 0.65})`);
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(28, relFloorY, 36 * shadowScale, 9 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Facing orientation
    ctx.scale(this.facing, 1);
    const originOffset = this.facing === 1 ? 0 : -this.width;
    ctx.translate(originOffset, 0);

    // 64-bit Rim-Light Contour Glow (Hardware arcade lighting in fighter's theme color)
    ctx.save();
    ctx.shadowColor = this.def.themeColor;
    ctx.shadowBlur = 8;

    // Counter Advantage Footwork Aura (Subtle cyan underfoot ring after successful parry — no box!)
    if (this.isCounterReady) {
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(28, 97, 26, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Dynamic Kinematic Joint Calculations (plus Dizzy finishing stance slump)
    const breathe = isDizzy ? 6 + Math.sin(Date.now() * 0.01) * 3 : Math.sin(Date.now() * 0.006) * 2;
    const bodyY = isCrouch ? 26 : breathe;

    // Joint Positions
    const hipX = 28;
    const hipY = 56 + bodyY;
    const neckX = 28;
    const neckY = 24 + bodyY;

    // Leg angles based on walk cycle, crouch, or attacks
    let lHipAngle = 0;
    let rHipAngle = 0;
    let lKneeAngle = 0;
    let rKneeAngle = 0;

    if (this.walkCycle !== 0) {
      // Natural walking swing
      lHipAngle = Math.sin(this.walkCycle) * 0.45;
      rHipAngle = -Math.sin(this.walkCycle) * 0.45;
      lKneeAngle = Math.max(0, -Math.cos(this.walkCycle) * 0.6);
      rKneeAngle = Math.max(0, Math.cos(this.walkCycle) * 0.6);
    } else if (isCrouch) {
      lHipAngle = -0.7;
      rHipAngle = -0.7;
      lKneeAngle = 1.35;
      rKneeAngle = 1.35;
    } else if (isAttacking && (this.currentAttack?.id === 'HK' || this.currentAttack?.id === 'LK' || this.currentAttack?.id === 'SWEEP')) {
      if (this.currentAttack.id === 'SWEEP') {
        rHipAngle = -1.55;
        rKneeAngle = 0.05;
        lHipAngle = -0.6;
        lKneeAngle = 1.3;
      } else {
        // Kicking kinematics: front leg extends high
        rHipAngle = -1.35;
        rKneeAngle = 0.08;
        lHipAngle = 0.15;
        lKneeAngle = 0.15;
      }
    }

    // Render 64-Bit Legs with articulable joints (Hip -> Thigh -> Knee -> Shin -> Boot)
    this.drawLimbSegment(ctx, hipX - 8, hipY, lHipAngle, lKneeAngle, 20, 22, this.def.giColor, this.def.trimColor);
    this.drawLimbSegment(ctx, hipX + 8, hipY, rHipAngle, rKneeAngle, 20, 22, this.def.giColor, this.def.trimColor);

    // Leonardo: Mutant Turtle Carapace Shell on back
    if (this.def.id === 'leonardo') {
      ctx.fillStyle = '#713f12';
      ctx.beginPath();
      ctx.ellipse(28, 36 + bodyY, 19, 23, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = '#854d0e';
      ctx.fillRect(18, 24 + bodyY, 20, 24);
    }

    // AIMIX: Sovereign Wave Entity Acoustic Wings (Fluctuating frequency sound ribbons)
    if (this.def.id === 'aimix') {
      ctx.save();
      const waveT = Date.now() * 0.008;
      ctx.strokeStyle = '#ff6600';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ff8800';
      ctx.shadowBlur = 18;
      // Left acoustic ribbon wing
      ctx.beginPath();
      ctx.moveTo(22, 28 + bodyY);
      for (let w = 0; w < 40; w += 5) {
        const wingX = 22 - w;
        const wingY = 28 + bodyY - Math.sin(waveT + w * 0.2) * (8 + w * 0.4);
        ctx.lineTo(wingX, wingY);
      }
      ctx.stroke();
      // Right acoustic ribbon wing
      ctx.beginPath();
      ctx.moveTo(34, 28 + bodyY);
      for (let w = 0; w < 40; w += 5) {
        const wingX = 34 + w;
        const wingY = 28 + bodyY - Math.sin(waveT - w * 0.2) * (8 + w * 0.4);
        ctx.lineTo(wingX, wingY);
      }
      ctx.stroke();
      // Floating Sovereign Sonic Halo Crown above head
      ctx.strokeStyle = '#ffa726';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(28, -6 + bodyY, 18, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Muscular Ninja Bodysuit Base (Dark compression suit with 64-bit specular depth)
    const suitGrad = ctx.createLinearGradient(12, 0, 44, 0);
    suitGrad.addColorStop(0, '#09090b');
    suitGrad.addColorStop(0.3, isHitstun || isGuardCrush ? '#b91c1c' : '#1e293b');
    suitGrad.addColorStop(0.7, isHitstun || isGuardCrush ? '#ef4444' : '#0f172a');
    suitGrad.addColorStop(1, '#020617');
    ctx.fillStyle = suitGrad;
    ctx.fillRect(12, 22 + bodyY, 32, 34);

    // Anatomical Pectoral & Abdominal Shading lines with specular muscle contours
    ctx.fillStyle = '#030712';
    ctx.fillRect(16, 26 + bodyY, 11, 8); // Left Pec
    ctx.fillRect(29, 26 + bodyY, 11, 8); // Right Pec
    ctx.fillStyle = '#ffffff15'; // Pec specular highlight
    ctx.fillRect(17, 27 + bodyY, 9, 3);
    ctx.fillRect(30, 27 + bodyY, 9, 3);

    ctx.fillStyle = '#030712';
    ctx.fillRect(27, 34 + bodyY, 2, 16);  // Sternum / Ab centerline
    ctx.fillRect(20, 38 + bodyY, 16, 2);  // Upper ab divider
    ctx.fillRect(20, 44 + bodyY, 16, 2);  // Lower ab divider

    // Authentic 64-Bit Mortal Kombat V-Tabard (Shinobi Overvest with cloth texture & clan insignia)
    const tabardGrad = ctx.createLinearGradient(12, 0, 44, 0);
    tabardGrad.addColorStop(0, this.def.giColor);
    tabardGrad.addColorStop(0.4, '#ffffff30');
    tabardGrad.addColorStop(0.8, this.def.giColor);
    tabardGrad.addColorStop(1, '#00000060');
    ctx.fillStyle = isHitstun || isGuardCrush ? '#f87171' : tabardGrad;

    // Left shoulder drape down to belt
    ctx.beginPath();
    ctx.moveTo(12, 20 + bodyY);
    ctx.lineTo(22, 20 + bodyY);
    ctx.lineTo(25, 48 + bodyY);
    ctx.lineTo(19, 48 + bodyY);
    ctx.closePath();
    ctx.fill();

    // Right shoulder drape down to belt
    ctx.beginPath();
    ctx.moveTo(44, 20 + bodyY);
    ctx.lineTo(34, 20 + bodyY);
    ctx.lineTo(31, 48 + bodyY);
    ctx.lineTo(37, 48 + bodyY);
    ctx.closePath();
    ctx.fill();

    // Tabard Diamond Border Trims (Embroidered gold/dark borders)
    ctx.fillStyle = this.def.trimColor;
    ctx.fillRect(18, 22 + bodyY, 4, 26);
    ctx.fillRect(34, 22 + bodyY, 4, 26);

    // Dynamic Clan Crest Embroidery on Chest Plate
    if (this.def.id === 'scorpion') {
      // Shirai Ryu Fire Scorpion Sting Insignia
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(26, 25 + bodyY, 4, 3);
      ctx.fillRect(27, 28 + bodyY, 2, 4);
      ctx.fillRect(28, 32 + bodyY, 3, 2);
    } else if (this.def.id === 'subzero') {
      // Lin Kuei Cryo Snowflake Star
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(27, 26 + bodyY, 2, 7);
      ctx.fillRect(24, 28.5 + bodyY, 8, 2);
    } else if (this.def.id === 'raiden') {
      // Elder God Lightning Conduit Medallion
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(28, 28 + bodyY, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (this.def.id === 'liukang') {
      // Shaolin Dragon Head Sigil
      ctx.fillStyle = '#eab308';
      ctx.fillRect(25, 26 + bodyY, 6, 4);
      ctx.fillRect(27, 30 + bodyY, 4, 2);
    }

    // Ninja Sash Belt & Detailed Metallic Buckle
    const beltGrad = ctx.createLinearGradient(12, 0, 44, 0);
    beltGrad.addColorStop(0, this.def.accentColor);
    beltGrad.addColorStop(0.5, '#ffffff35');
    beltGrad.addColorStop(1, this.def.accentColor);
    ctx.fillStyle = beltGrad;
    ctx.fillRect(12, 48 + bodyY, 32, 6);

    // Gold / Silver Central Buckle
    ctx.fillStyle = '#facc15';
    ctx.fillRect(25, 48.5 + bodyY, 6, 5);
    ctx.fillStyle = '#713f12';
    ctx.fillRect(26.5, 50 + bodyY, 3, 2);

    // Dangling Tabard Flap with cloth fold wrinkles & wind sway
    const flapSway = Math.sin(Date.now() * 0.005 + this.walkCycle) * 3;
    ctx.fillStyle = this.def.giColor;
    ctx.fillRect(23 + flapSway, 54 + bodyY, 10, 16);
    ctx.fillStyle = this.def.trimColor;
    ctx.fillRect(25 + flapSway, 54 + bodyY, 6, 16);
    // Hem fringe
    ctx.fillStyle = '#00000040';
    ctx.fillRect(23 + flapSway, 68 + bodyY, 10, 2);

    // Visible Anatomical Torso Damage Decals & Bleeding Lacerations
    if (this.zones.TORSO.hp < 130) {
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(18, 28 + bodyY);
      ctx.lineTo(26, 36 + bodyY);
      ctx.moveTo(30, 26 + bodyY);
      ctx.lineTo(38, 34 + bodyY);
      ctx.stroke();

      // Dripping arterial blood drop from chest laceration
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(25, 36 + bodyY, 2, 4);
    }
    if (this.zones.TORSO.isBroken) {
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(20, 32 + bodyY, 16, 6);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(22, 34 + bodyY, 12, 3);
    }

    // Arm Kinematics (Shoulder -> Upper Arm -> Elbow -> Forearm -> Gauntlet/Hand)
    let lShoulderAngle = 0.2;
    let lElbowAngle = 0.8;
    let rShoulderAngle = -0.2;
    let rElbowAngle = 0.8;

    if (this.state === 'BLOCK') {
      lShoulderAngle = -0.7;
      lElbowAngle = 1.5;
      rShoulderAngle = -0.7;
      rElbowAngle = 1.5;

      // Ki Shield
      ctx.save();
      ctx.strokeStyle = this.stamina < 30 ? '#ef4444' : this.def.accentColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(46, 34 + bodyY, 26, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();
      ctx.restore();
    } else if (isAttacking && (this.currentAttack?.id === 'LP' || this.currentAttack?.id === 'HP' || this.currentAttack?.id === 'UPPERCUT')) {
      if (this.currentAttack.id === 'UPPERCUT') {
        rShoulderAngle = -1.65;
        rElbowAngle = 0.15;
      } else {
        rShoulderAngle = -1.35;
        rElbowAngle = 0.05; // Fully extended straight punch!
      }
    }

    // Draw Primary Left and Right Arm segments
    this.drawArmSegment(ctx, neckX - 12, neckY + 4, lShoulderAngle, lElbowAngle, 16, 16, this.def.skinColor, this.def.trimColor);
    this.drawArmSegment(ctx, neckX + 12, neckY + 4, rShoulderAngle, rElbowAngle, 16, 16, this.def.skinColor, this.def.trimColor);

    // Goro Shokan Quad-Arms: Second lower pair of muscular arms!
    if (this.def.id === 'goro') {
      this.drawArmSegment(ctx, neckX - 14, neckY + 16, lShoulderAngle - 0.25, lElbowAngle + 0.35, 14, 15, this.def.skinColor, this.def.trimColor);
      this.drawArmSegment(ctx, neckX + 14, neckY + 16, rShoulderAngle - 0.25, rElbowAngle + 0.35, 14, 15, this.def.skinColor, this.def.trimColor);
    }

    // Head, Cowl & Ninja Mask (With dynamic hit recoil angle)
    if (!this.isDecapitated) {
      ctx.save();
      ctx.translate(neckX, neckY);
      ctx.rotate(this.hitReactAngle);
      ctx.translate(-neckX, -neckY);

      // Hooded Ninja Cowl
      ctx.fillStyle = isHitstun ? '#b91c1c' : this.def.giColor;
      ctx.beginPath();
      ctx.arc(28, 12 + bodyY, 14, 0, Math.PI * 2);
      ctx.fill();

      // Cowl folds
      ctx.fillStyle = this.def.trimColor;
      ctx.fillRect(18, 22 + bodyY, 20, 4);

      // Skin slit
      ctx.fillStyle = this.def.skinColor;
      ctx.fillRect(26, 8 + bodyY, 14, 11);

      // Sculpted Ninja Faceplate / Mask
      ctx.fillStyle = this.def.maskColor;
      ctx.fillRect(24, 13 + bodyY, 16, 12);
      ctx.fillStyle = '#18181b';
      ctx.fillRect(28, 16 + bodyY, 8, 2); // Mouth plate slits
      ctx.fillRect(29, 20 + bodyY, 6, 2);

      // Facial battle damage laceration
      if (this.zones.HEAD.hp < 130) {
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(27, 9 + bodyY);
        ctx.lineTo(33, 15 + bodyY);
        ctx.stroke();
      }

      // Glowing Ninja Eyes
      ctx.save();
      const isScorpionToasty = this.def.id === 'scorpion' && (this.state === 'FATALITY_EXECUTION' || this.state === 'VICTORY');

      if (isScorpionToasty) {
        // TOASTY Unmasked Burning Skull!
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(28, 12 + bodyY, 12, 0, Math.PI * 2);
        ctx.fill();
        // Eye sockets with hellfire flame
        ctx.fillStyle = '#09090b';
        ctx.fillRect(24, 8 + bodyY, 6, 6);
        ctx.fillRect(34, 8 + bodyY, 6, 6);
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#f97316';
        ctx.fillRect(25, 9 + bodyY, 4, 4);
        ctx.fillRect(35, 9 + bodyY, 4, 4);
        // Nasal cavity
        ctx.fillStyle = '#18181b';
        ctx.fillRect(30, 14 + bodyY, 4, 3);
        // Skeletal teeth
        ctx.fillStyle = '#09090b';
        ctx.fillRect(26, 18 + bodyY, 12, 4);
        ctx.fillStyle = '#f8fafc';
        for (let t = 0; t < 4; t++) {
          ctx.fillRect(27 + t * 3, 18 + bodyY, 2, 4);
        }
        // Breath of Hellfire if executing fatality
        if (this.state === 'FATALITY_EXECUTION') {
          ctx.shadowColor = '#ea580c';
          ctx.shadowBlur = 20;
          ctx.fillStyle = '#ea580c';
          ctx.beginPath();
          ctx.moveTo(38, 18 + bodyY);
          ctx.lineTo(80 + Math.sin(Date.now() * 0.05) * 15, 6 + bodyY);
          ctx.lineTo(85 + Math.cos(Date.now() * 0.05) * 15, 32 + bodyY);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.moveTo(38, 19 + bodyY);
          ctx.lineTo(65, 12 + bodyY);
          ctx.lineTo(68, 26 + bodyY);
          ctx.closePath();
          ctx.fill();
        }
      } else if (this.def.id === 'scorpion') {
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#ffffff';
      } else if (this.def.id === 'subzero') {
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#7dd3fc';
      } else if (this.def.id === 'raiden') {
        ctx.shadowColor = '#60a5fa';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#93c5fd';
      } else if (this.def.id === 'smoke') {
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#e9d5ff';
      } else if (this.def.id === 'aimix') {
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#ff8800';
      } else if (this.def.id === 'noob') {
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#c084fc';
      } else if (this.def.id === 'sonya') {
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#86efac';
      } else if (this.def.id === 'johnny') {
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#fbbf24';
      } else if (this.def.id === 'reptile') {
        ctx.shadowColor = '#84cc16';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#bef264';
      } else if (this.def.id === 'kitana') {
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#bae6fd';
      } else if (this.def.id === 'goro') {
        ctx.shadowColor = '#eab308';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#fde047';
      } else if (this.def.id === 'robocop') {
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#ef4444';
      } else if (this.def.id === 'shangtsung') {
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#6ee7b7';
      } else {
        ctx.fillStyle = '#fef08a';
      }

      if (!isScorpionToasty) {
        ctx.fillRect(32, 9 + bodyY, 6, 3);
      }
      ctx.restore();

      // AIMIX: Apex Cybernetic Visor & Sonic Frequency Equalizer Mask
      if (this.def.id === 'aimix') {
        ctx.save();
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#ff6600';
        ctx.fillRect(24, 8 + bodyY, 18, 5);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(28, 9 + bodyY, 10, 2);
        const eqPhase = Date.now() * 0.015;
        for (let b = 0; b < 4; b++) {
          const barH = 3 + Math.floor(Math.sin(eqPhase + b * 1.5) * 3 + 3);
          ctx.fillStyle = '#ff8800';
          ctx.fillRect(27 + b * 3, 22 + bodyY - barH, 2, barH);
        }
        ctx.restore();
      }

      // Johnny Cage: Aviator Sunglasses & Movie Star Hair
      if (this.def.id === 'johnny') {
        ctx.fillStyle = '#451a03';
        ctx.fillRect(20, 0 + bodyY, 20, 8);
        ctx.fillRect(16, 4 + bodyY, 8, 8);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(26, 8 + bodyY, 7, 5);
        ctx.fillRect(35, 8 + bodyY, 7, 5);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(26, 8 + bodyY, 7, 5);
        ctx.strokeRect(35, 8 + bodyY, 7, 5);
      }

      // Sonya Blade: Blonde Ponytail & Green Tactical Bandana
      if (this.def.id === 'sonya') {
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(20, 2 + bodyY, 20, 8);
        ctx.fillRect(10, 6 + bodyY, 10, 14);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(22, 6 + bodyY, 18, 3);
      }

      // Reptile: Saurian Reptilian Scales & Dripping Venom Fangs
      if (this.def.id === 'reptile') {
        ctx.fillStyle = '#166534';
        ctx.fillRect(24, 14 + bodyY, 16, 11);
        ctx.fillStyle = '#f0fdf4';
        ctx.fillRect(28, 21 + bodyY, 2, 4); // Venom fangs
        ctx.fillRect(34, 21 + bodyY, 2, 4);
        ctx.fillStyle = '#84cc16';
        ctx.fillRect(30, 23 + bodyY, 2, 3); // Acid drip
      }

      // Kung Lao: Broadbrim Circular Razor-Rimmed Hat
      if (this.def.id === 'kunglao') {
        ctx.save();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(28, 4 + bodyY, 26, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        // Inner crown dome
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(28, 1 + bodyY, 7, Math.PI, 0);
        ctx.fill();
        ctx.restore();
      }

      // Kitana: Edenian Royal Silver Tiara & Blue Silk Veil
      if (this.def.id === 'kitana') {
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.strokeRect(22, 4 + bodyY, 18, 3);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(30, 3 + bodyY, 3, 3); // Sapphire crest
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(22, 14 + bodyY, 18, 11); // Silk veil
      }

      // Mileena: Edenian Tarkatan Mask & Needle Fangs
      if (this.def.id === 'mileena') {
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.strokeRect(22, 4 + bodyY, 18, 3);
        ctx.fillStyle = '#d946ef';
        ctx.fillRect(22, 14 + bodyY, 18, 11); // Magenta Tarkatan Veil
        // Tarkatan needle razor fangs
        ctx.fillStyle = '#ffffff';
        for (let f = 0; f < 5; f++) {
          ctx.fillRect(24 + f * 3, 19 + bodyY, 2, 4);
          ctx.fillRect(25 + f * 3, 23 + bodyY, 2, 3);
        }
      }

      // Goro: Shokan Dragon Topknot Queue & Fangs
      if (this.def.id === 'goro') {
        ctx.fillStyle = '#09090b';
        ctx.fillRect(25, -12 + bodyY, 6, 14); // High topknot queue
        ctx.fillStyle = '#eab308';
        ctx.fillRect(24, -4 + bodyY, 8, 4); // Gold queue band
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(27, 20 + bodyY, 3, 4); // Lower protruding tusks
        ctx.fillRect(33, 20 + bodyY, 3, 4);
      }

      // RoboCop: OCP Titanium Helmet & Targeting Slit
      if (this.def.id === 'robocop') {
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(20, 2 + bodyY, 22, 14);
        ctx.fillStyle = '#09090b';
        ctx.fillRect(25, 7 + bodyY, 16, 5); // Visor slit
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(33, 8 + bodyY, 3, 3); // Target lock diode
      }

      // Leonardo: Turtle Head & Blue Eye Bandana
      if (this.def.id === 'leonardo') {
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(28, 12 + bodyY, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(20, 8 + bodyY, 20, 5); // Blue eye bandana
        const knotWave = Math.sin(Date.now() * 0.01) * 3;
        ctx.fillRect(10, 9 + bodyY + knotWave, 10, 4); // Flowing ribbon tails
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(28, 9 + bodyY, 4, 3);
        ctx.fillRect(36, 9 + bodyY, 4, 3);
      }

      // Shang Tsung: Sorcerer Headdress & Emerald Soul Aura
      if (this.def.id === 'shangtsung') {
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.moveTo(22, 4 + bodyY);
        ctx.lineTo(28, -10 + bodyY);
        ctx.lineTo(34, 4 + bodyY);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#10b981';
        ctx.fillRect(27, -4 + bodyY, 3, 4); // Soul gem
        // Beard / Goatee
        ctx.fillStyle = '#09090b';
        ctx.fillRect(29, 21 + bodyY, 4, 6);
      }

      // Noob Saibot: Shadow Wraith Hood with Dark Void Wisps
      if (this.def.id === 'noob') {
        ctx.save();
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 1;
        ctx.strokeRect(22, 2 + bodyY, 16, 18);
        ctx.restore();
      }

      // Raiden Conical Bamboo Jingasa Hat
      if (this.def.id === 'raiden') {
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.moveTo(6, 4 + bodyY);
        ctx.lineTo(28, -14 + bodyY);
        ctx.lineTo(50, 4 + bodyY);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.arc(28, -6 + bodyY, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Liu Kang Headband
      if (this.def.id === 'liukang') {
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(14, 4 + bodyY, 28, 4);
        const tailWave = Math.sin(Date.now() * 0.01) * 4;
        ctx.fillRect(4, 5 + bodyY + tailWave, 10, 4);
      }

      ctx.restore();
    } else {
      // Severed Arterial Neck Stump with Gushing Blood Geyser
      ctx.save();
      ctx.translate(neckX, neckY);
      // Ragged severed flesh collar
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(-10, -2, 20, 8);
      // Exposed white vertebrae column ring
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, 1, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#450a0a';
      ctx.beginPath();
      ctx.arc(0, 1, 1.5, 0, Math.PI * 2);
      ctx.fill();
      // Pulsing arterial blood fountain
      const spurt = Math.sin(Date.now() * 0.02) * 6;
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-6, -8 - spurt, 12, 8 + spurt);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-3, -14 - spurt * 1.5, 6, 8 + spurt);
      ctx.restore();
    }

    // Dizzy Finishing Stance: Crimson stagger mist orbs & swaying head (no yellow boxes!)
    if (isDizzy) {
      const mistAngle = (Date.now() * 0.006) % (Math.PI * 2);
      ctx.save();
      for (let i = 0; i < 3; i++) {
        const a = mistAngle + (i * Math.PI * 2) / 3;
        const sx = 28 + Math.cos(a) * 18;
        const sy = 4 + Math.sin(a) * 5;
        ctx.fillStyle = 'rgba(220, 38, 38, 0.78)';
        ctx.beginPath();
        ctx.arc(sx, sy, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Frozen Faceted Hexagonal Crystal Prism (no square rectangle!)
    if (isFrozen) {
      ctx.save();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.42)';
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(28, -4);
      ctx.lineTo(54, 18);
      ctx.lineTo(50, 88);
      ctx.lineTo(28, 102);
      ctx.lineTo(6, 88);
      ctx.lineTo(2, 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Restore rim-light glow save and fighter world translation save
    ctx.restore();
    ctx.restore();

    this.drawProjectiles(ctx);
  }

  // 64-Bit Anatomical Shaded Leg with Muscle Contours, Knee Plates & Laced Boots
  private drawLimbSegment(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    hipAngle: number,
    kneeAngle: number,
    thighLen: number,
    shinLen: number,
    color: string,
    bootColor: string
  ) {
    ctx.save();
    ctx.translate(startX, startY);
    ctx.rotate(hipAngle);

    // 1. Thigh with 64-bit Gouraud highlight gradient & quadriceps curvature
    const thighGrad = ctx.createLinearGradient(-6, 0, 6, 0);
    thighGrad.addColorStop(0, color);
    thighGrad.addColorStop(0.35, '#ffffff25');
    thighGrad.addColorStop(0.7, color);
    thighGrad.addColorStop(1, '#00000055');
    ctx.fillStyle = thighGrad;

    ctx.beginPath();
    ctx.moveTo(-5.5, 0);
    ctx.quadraticCurveTo(-7, thighLen * 0.45, -5, thighLen);
    ctx.lineTo(5, thighLen);
    ctx.quadraticCurveTo(6.5, thighLen * 0.45, 5.5, 0);
    ctx.closePath();
    ctx.fill();

    // Fabric wrinkle line
    ctx.strokeStyle = '#00000040';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-4, thighLen * 0.5);
    ctx.lineTo(3, thighLen * 0.55);
    ctx.stroke();

    // 2. Knee Joint with Reinforced Armor Cop
    ctx.translate(0, thighLen);
    ctx.rotate(kneeAngle);

    // Metallic Knee Cop
    ctx.fillStyle = bootColor;
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff60';
    ctx.fillRect(-1.5, -2, 3, 2); // Knee glint

    // 3. Shin & Calf with Muscular Taper
    const shinGrad = ctx.createLinearGradient(-5, 0, 5, 0);
    shinGrad.addColorStop(0, color);
    shinGrad.addColorStop(0.3, '#ffffff20');
    shinGrad.addColorStop(1, '#00000060');
    ctx.fillStyle = shinGrad;

    ctx.beginPath();
    ctx.moveTo(-4.5, 0);
    ctx.quadraticCurveTo(-6, shinLen * 0.35, -3.5, shinLen - 8);
    ctx.lineTo(3.5, shinLen - 8);
    ctx.quadraticCurveTo(5.5, shinLen * 0.35, 4.5, 0);
    ctx.closePath();
    ctx.fill();

    // 4. Shin Guard Armor Plates with Metal Studs
    ctx.fillStyle = bootColor;
    ctx.fillRect(-4.5, 3, 9, shinLen - 12);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-2.5, 5, 2, 2); // Stud 1
    ctx.fillRect(0.5, 5, 2, 2);
    ctx.fillRect(-2.5, 10, 2, 2); // Stud 2
    ctx.fillRect(0.5, 10, 2, 2);

    // 5. Heavy Laced Leather Combat Boot
    const bootGrad = ctx.createLinearGradient(-5, 0, 7, 0);
    bootGrad.addColorStop(0, bootColor);
    bootGrad.addColorStop(0.4, '#ffffff30');
    bootGrad.addColorStop(1, '#00000080');
    ctx.fillStyle = bootGrad;

    ctx.beginPath();
    ctx.moveTo(-4.5, shinLen - 8);
    ctx.lineTo(5, shinLen - 8);
    ctx.lineTo(7.5, shinLen + 2);
    ctx.lineTo(-4.5, shinLen + 2);
    ctx.closePath();
    ctx.fill();

    // Tread & laces
    ctx.fillStyle = '#09090b';
    ctx.fillRect(-5, shinLen + 1, 13, 2); // Sole
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-1, shinLen - 6, 3, 1); // Lace 1
    ctx.fillRect(-1, shinLen - 3, 3, 1); // Lace 2

    ctx.restore();
  }

  // 64-Bit Anatomical Shaded Arm with Deltoid, Bicep, Studded Gauntlet & Clenched Fist
  private drawArmSegment(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    shoulderAngle: number,
    elbowAngle: number,
    upperLen: number,
    foreLen: number,
    skinColor: string,
    trimColor: string
  ) {
    ctx.save();
    ctx.translate(startX, startY);
    ctx.rotate(shoulderAngle);

    // 1. Deltoid & Bicep with 64-bit specular contour
    const armGrad = ctx.createLinearGradient(-5, 0, 5, 0);
    armGrad.addColorStop(0, skinColor);
    armGrad.addColorStop(0.35, '#ffffff35');
    armGrad.addColorStop(0.7, skinColor);
    armGrad.addColorStop(1, '#00000055');
    ctx.fillStyle = armGrad;

    // Rounded Deltoid & Bicep bulge
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, Math.PI, 0);
    ctx.lineTo(4.5, upperLen);
    ctx.lineTo(-4.5, upperLen);
    ctx.closePath();
    ctx.fill();

    // Arm band / strap
    ctx.fillStyle = trimColor;
    ctx.fillRect(-4.5, 4, 9, 2.5);

    // 2. Elbow Joint
    ctx.translate(0, upperLen);
    ctx.rotate(elbowAngle);

    // 3. Forearm with Gauntlet
    const foreGrad = ctx.createLinearGradient(-4, 0, 4, 0);
    foreGrad.addColorStop(0, skinColor);
    foreGrad.addColorStop(0.4, '#ffffff25');
    foreGrad.addColorStop(1, '#00000050');
    ctx.fillStyle = foreGrad;
    ctx.fillRect(-4, 0, 8, foreLen - 7);

    // 4. Heavy Studded Ninja Gauntlet
    ctx.fillStyle = trimColor;
    ctx.fillRect(-5, foreLen - 11, 10, 8);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-3, foreLen - 9, 2, 2); // Stud
    ctx.fillRect(1, foreLen - 9, 2, 2);

    // 5. Clenched Fist with Wrapped Knuckle Plate
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(0, foreLen - 2, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Knuckle armor guard
    ctx.fillStyle = trimColor;
    ctx.fillRect(-4, foreLen - 4, 8, 4);
    ctx.fillStyle = '#ffffff60';
    ctx.fillRect(-2, foreLen - 3, 4, 1.5); // Knuckle highlight

    ctx.restore();
  }

  // Draw tumbling fighter in mid-air (Uppercuts, Heavy Kicks, Poise Shatter)
  private drawTumblingSprite(ctx: CanvasRenderingContext2D) {
    ctx.save();
    // Body silhouette arched backwards
    ctx.fillStyle = this.state === 'HITSTUN' ? '#ef4444' : this.def.giColor;
    ctx.fillRect(-18, -10, 36, 20);

    // Tabard trim
    ctx.fillStyle = this.def.trimColor;
    ctx.fillRect(-10, -10, 20, 6);

    // Flailing legs in air
    ctx.fillStyle = this.def.giColor;
    ctx.fillRect(16, -6, 22, 10);
    ctx.fillStyle = this.def.trimColor;
    ctx.fillRect(36, -10, 10, 14);

    // Arms thrown back
    ctx.fillStyle = this.def.skinColor;
    ctx.fillRect(-26, -18, 16, 8);
    ctx.fillStyle = this.def.trimColor;
    ctx.fillRect(-32, -22, 10, 10);

    // Head thrown back
    if (!this.isDecapitated) {
      ctx.fillStyle = this.def.giColor;
      ctx.fillRect(-30, -2, 16, 16);
      ctx.fillStyle = this.def.maskColor;
      ctx.fillRect(-32, 2, 12, 10);
      // Glowing eyes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-28, 4, 4, 3);
    }
    ctx.restore();
  }

  // Prompt 3: Fallen Ragdoll Pose on Floor
  private drawFallenPose(ctx: CanvasRenderingContext2D) {
    const floorY = 445;
    const bodyBaseY = floorY - 18;

    // Blood pool under defeated body
    ctx.save();
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.ellipse(28, bodyBaseY + 12, 45, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Torso flat on back
    ctx.fillStyle = this.def.giColor;
    ctx.fillRect(8, bodyBaseY - 4, 38, 16);

    // Tabard trim
    ctx.fillStyle = this.def.trimColor;
    ctx.fillRect(18, bodyBaseY - 4, 18, 5);

    // Sprawled Legs
    ctx.fillStyle = this.def.giColor;
    ctx.fillRect(44, bodyBaseY + 2, 28, 10);
    ctx.fillStyle = this.def.trimColor;
    ctx.fillRect(66, bodyBaseY, 12, 12);

    // Sprawled Arms
    ctx.fillStyle = this.def.skinColor;
    ctx.fillRect(-10, bodyBaseY - 2, 20, 8);
    ctx.fillStyle = this.def.trimColor;
    ctx.fillRect(-14, bodyBaseY - 4, 8, 10);

    // Head resting on floor (if not decapitated)
    if (!this.isDecapitated) {
      ctx.fillStyle = this.def.giColor;
      ctx.fillRect(-8, bodyBaseY - 14, 18, 16);
      ctx.fillStyle = this.def.maskColor;
      ctx.fillRect(-4, bodyBaseY - 10, 14, 10);
    }
    ctx.restore();
  }

  // Draw Severed Flying Parts with Articulated Spine Rip Trophy
  private drawSeveredParts(ctx: CanvasRenderingContext2D) {
    for (const part of this.severedParts) {
      ctx.save();
      ctx.translate(part.x - this.x, part.y - this.y);
      ctx.rotate(part.angle);

      if (part.type === 'HEAD_SPINE') {
        // Sub-Zero Spine Rip Trophy: Severed Head + Articulated Spinal Cord & Rib Fragments!
        ctx.fillStyle = part.color;
        ctx.fillRect(-12, -12, 24, 24);
        ctx.fillStyle = part.skinColor;
        ctx.fillRect(0, -7, 10, 10);
        // Neck blood stump
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-10, 10, 20, 6);

        // Vertebral column discs trailing down
        for (let i = 0; i < 7; i++) {
          const discY = 16 + i * 8;
          const wobble = Math.sin(Date.now() * 0.008 + i) * 2;
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(-4 + wobble, discY, 8, 4);
          // Rib bone spurs on upper vertebrae
          if (i < 3) {
            ctx.fillRect(-9 + wobble, discY + 1, 18, 2);
          }
          // Crimson spinal cord / nerve bundle
          ctx.fillStyle = '#b91c1c';
          ctx.fillRect(-1.5 + wobble, discY + 3, 3, 5);
        }
      } else if (part.type === 'HEAD') {
        if (SpriteSheetEngine.drawSeveredHeadSprite(ctx, this, part)) {
          ctx.restore();
          continue;
        }
        // Severed Ninja Head fallback
        ctx.fillStyle = part.color;
        ctx.fillRect(-10, -10, 20, 20);
        ctx.fillStyle = part.skinColor;
        ctx.fillRect(0, -6, 8, 8);
        // Blood trail
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-8, 8, 16, 6);
      } else if (part.type === 'ARM') {
        // Severed Arm & Gauntlet
        ctx.fillStyle = part.color;
        ctx.fillRect(-6, -14, 12, 28);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-5, 12, 10, 5);
      }
      ctx.restore();
    }
  }

  // Draw Projectiles (with authentic Sprite Sheet projectiles first)
  private drawProjectiles(ctx: CanvasRenderingContext2D) {
    for (const p of this.projectiles) {
      if (SpriteSheetEngine.drawProjectileSprite(ctx, this, p)) {
        continue;
      }
      ctx.save();

      if (p.type === 'SPEAR') {
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(this.x + (this.facing === 1 ? this.width : 0), this.y + 36);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(p.ownerFacing, 1);
        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(-8, -7);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-8, 7);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      } else if (p.type === 'SONIC_WAVE') {
        // AIMIX Ultrasonic Concentric Acoustic Ring Waveforms
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 18;
        ctx.strokeStyle = '#ff6600';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#ffb74d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * 0.65, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.type === 'ICEBALL') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#bae6fd';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      } else if (p.type === 'DRAGON_FIRE') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.type === 'LIGHTNING') {
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(p.x - 14, p.y);
        ctx.lineTo(p.x - 4, p.y - 8);
        ctx.lineTo(p.x + 4, p.y + 6);
        ctx.lineTo(p.x + 14, p.y);
        ctx.stroke();
        ctx.restore();
      } else if (p.type === 'ENERGY_RING') {
        // Sonya Plasma Ring
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 15;
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (p.type === 'FORCEBALL') {
        // Johnny Forceball
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.type === 'DARK_BALL') {
        // Noob Dark Ball
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#09090b';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      } else if (p.type === 'ACID') {
        // Reptile Acid Spit
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.shadowColor = '#84cc16';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#84cc16';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d9f99d';
        ctx.beginPath();
        ctx.arc(-2, -2, p.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.type === 'HAT') {
        // Kung Lao Razor Hat
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Date.now() * 0.02);
        ctx.shadowColor = '#f8fafc';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      } else if (p.type === 'FAN') {
        // Kitana Steel Fan Throw
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Date.now() * 0.025);
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      } else if (p.type === 'FIREBALL') {
        // Shang Tsung Flaming Skull Fireball
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6ee7b7';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.type === 'SAI') {
        // Mileena Twin Sparkling Sai Daggers
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.ownerFacing === 1 ? 0 : Math.PI);
        ctx.shadowColor = '#d946ef';
        ctx.shadowBlur = 14;
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-16, 0); ctx.lineTo(16, 0);
        ctx.moveTo(4, -8); ctx.lineTo(8, -8); ctx.lineTo(8, 0);
        ctx.moveTo(4, 8); ctx.lineTo(8, 8); ctx.lineTo(8, 0);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(14, -2, 4, 4);
        ctx.restore();
      }

      ctx.restore();
    }
  }

  // Tag-Team Instant Swap In Mid-Combat
  public swapWithPartner(partnerDef: CharacterDef, partnerHp: number, partnerStamina: number, partnerSuper: number, particles: ParticleSystem) {
    this.def = partnerDef;
    this.mass = partnerDef.mass;
    this.hp = partnerHp;
    this.stamina = partnerStamina;
    this.superMeter = partnerSuper;
    this.state = 'TAG_IN';
    this.actionFrame = 0;
    this.moveIntentX = 0;
    this.airDriftUsed = false;
    this.vx = this.facing * 480;
    this.vy = -180;
    this.isGrounded = false;
    RetroAudio.playTag();
    RetroAudio.announce('TAG_IN');
    particles.emitHitSparks(this.x + 28, this.y + 40, partnerDef.themeColor, 20);

    this.scheduleTimer(() => {
      if (this.state === 'TAG_IN') {
        this.state = 'IDLE';
        this.vx = 0;
      }
    }, 280);
  }
}
