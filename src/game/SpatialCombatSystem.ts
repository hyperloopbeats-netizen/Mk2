/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CombatMove,
  LinearGaugeState,
  LinearGaugeZone,
  ReactiveEventType,
  ZLane,
} from '../types/fighter';

export interface SpatialFighterSnapshot {
  x: number;
  y: number;
  vy: number;
  isGrounded: boolean;
  state: string;
  actionFrame: number;
  currentMove: CombatMove | null;
  activeHitbox: { attack: CombatMove } | null;
  zLane: ZLane;
  sidestepTimer: number;
}

const LANE_SWEEP_MOVES = new Set<string>([
  'UPPERCUT',
  'SWEEP',
  'KUNGLAO_SPIN',
  'SUBZERO_ICE_SPIKE',
  'SHANG_GROUND_SKULLS',
  'AIMIX_BASS_CANNON',
  'GORO_GROUND_STOMP',
  'KITANA_FAN_LIFT',
]);

/**
 * Checks whether an attack on `atkLane` can connect against a defender on `defLane`.
 * Wide sweeps, uppercuts, weapon arcs, and Supers cleave adjacent lanes (+/- 1).
 * Standard linear strikes & projectiles miss fighters who sidestepped onto a different Z-lane!
 */
export function areLanesCompatible(
  atkLane: ZLane,
  defLane: ZLane,
  move?: CombatMove | null
): boolean {
  if (atkLane === defLane) return true;
  if (!move) return false;
  if (move.isSuper || move.isFatality || move.isWeapon || LANE_SWEEP_MOVES.has(move.id)) {
    return Math.abs(atkLane - defLane) <= 1;
  }
  return false;
}

export function isAntiAirHit(
  atk: SpatialFighterSnapshot,
  def: SpatialFighterSnapshot,
  move: CombatMove
): boolean {
  if (def.isGrounded) return false;
  if (!atk.isGrounded) return false;
  return (
    move.id === 'UPPERCUT' ||
    move.id === 'HP' ||
    move.id === 'HK' ||
    Boolean(move.isLauncher) ||
    Boolean(move.isWeapon)
  );
}

export function isWhiffPunishHit(def: SpatialFighterSnapshot): boolean {
  if (def.state !== 'ATTACK' || !def.currentMove) return false;
  const activeEnd = def.currentMove.startup + def.currentMove.active;
  return def.actionFrame > activeEnd && !def.activeHitbox;
}

export function getSpatialZoneLabel(
  dx: number
): 'POINT_BLANK' | 'POKE' | 'SWEEP' | 'FOOTSIES' | 'ZONING' {
  const abs = Math.abs(dx);
  if (abs < 78) return 'POINT_BLANK';
  if (abs < 128) return 'POKE';
  if (abs < 178) return 'SWEEP';
  if (abs < 275) return 'FOOTSIES';
  return 'ZONING';
}

export function classifyZoneForSide(value: number, side: 'P1' | 'CPU'): LinearGaugeZone {
  const signed = side === 'P1' ? value : -value;
  if (signed >= 65) return 'OVERDRIVE';
  if (signed >= 22) return 'PRESSURE';
  if (signed <= -40) return 'BREAKER';
  return 'NEUTRAL';
}

/**
 * Linear Fighting Gauge (-100 CPU <-> 0 NEUTRAL <-> +100 P1)
 * Powers the Reactive Kombat System: Hits, Whiff Punishes, Anti-Airs,
 * Precision Parries, Sidestep Evades, Dash Cancels, and Kombat Breakers.
 */
export class LinearKombatGauge {
  private value = 0;
  private p1Breakers = 2;
  private cpuBreakers = 2;
  private lastEvent = 'NEUTRAL FOOTSIES';
  private lastActor: 'P1' | 'CPU' | null = null;
  private lastDelta = 0;
  private momentumStreak = 0;

  public reset(bonusStartP1 = 0) {
    this.value = Math.max(-40, Math.min(40, bonusStartP1));
    this.p1Breakers = 2;
    this.cpuBreakers = 2;
    this.lastEvent = 'NEUTRAL FOOTSIES';
    this.lastActor = null;
    this.lastDelta = 0;
    this.momentumStreak = 0;
  }

  public grantExtraBreaker(side: 'P1' | 'CPU') {
    if (side === 'P1') this.p1Breakers = Math.min(3, this.p1Breakers + 1);
    else this.cpuBreakers = Math.min(3, this.cpuBreakers + 1);
  }

  public stepDecay(dt: number) {
    // Gentle spring toward center when neutral so tug-of-war momentum stays dynamic
    if (Math.abs(this.value) < 0.5) {
      this.value = 0;
      return;
    }
    const rate = Math.abs(this.value) >= 65 ? 3.2 : 4.6;
    const sign = Math.sign(this.value);
    const next = this.value - sign * rate * dt;
    if (Math.sign(next) !== sign) this.value = 0;
    else this.value = next;
  }

  public applyReactiveEvent(
    actor: 'P1' | 'CPU',
    event: ReactiveEventType,
    multiplier = 1.0
  ): { delta: number; callout: string; triggeredOverdrive: boolean } {
    const dir = actor === 'P1' ? 1 : -1;
    let mag = 8;
    let callout = 'KOMBAT HIT';

    switch (event) {
      case 'HIT':
        mag = 8;
        callout = 'SOLID HIT';
        break;
      case 'BLOCK':
        mag = 3.5;
        callout = 'GUARD PRESSURE';
        break;
      case 'WHIFF_PUNISH':
        mag = 22;
        callout = 'WHIFF PUNISH!';
        break;
      case 'ANTI_AIR':
        mag = 24;
        callout = 'ANTI-AIR CHECK!';
        break;
      case 'PARRY':
        mag = 26;
        callout = 'REACTIVE PARRY!';
        break;
      case 'SIDESTEP_EVADE':
        mag = 16;
        callout = 'Z-LANE EVADE!';
        break;
      case 'STRIDE_SYNERGY':
        mag = 11;
        callout = 'STRIDE SURGE!';
        break;
      case 'DASH_CANCEL':
        mag = -14;
        callout = 'DASH CANCEL';
        break;
      case 'BREAKER': {
        if (actor === 'P1' && this.p1Breakers > 0) this.p1Breakers--;
        else if (actor === 'CPU' && this.cpuBreakers > 0) this.cpuBreakers--;
        // Pulls gauge sharply back toward neutral/actor favor
        const prev = this.value;
        this.value = Math.max(-100, Math.min(100, this.value + dir * 58));
        this.lastEvent = 'KOMBAT BREAKER!';
        this.lastActor = actor;
        this.lastDelta = Math.round(this.value - prev);
        this.momentumStreak = 1;
        return { delta: this.lastDelta, callout: 'KOMBAT BREAKER!', triggeredOverdrive: false };
      }
    }

    const prevZone = classifyZoneForSide(this.value, actor);
    const delta = dir * mag * multiplier;
    const prevVal = this.value;
    this.value = Math.max(-100, Math.min(100, this.value + delta));
    const nextZone = classifyZoneForSide(this.value, actor);

    if (this.lastActor === actor && mag > 0) {
      this.momentumStreak++;
    } else if (mag > 0) {
      this.momentumStreak = 1;
    }

    this.lastActor = actor;
    this.lastEvent = callout;
    this.lastDelta = Math.round(this.value - prevVal);

    return {
      delta: this.lastDelta,
      callout,
      triggeredOverdrive: prevZone !== 'OVERDRIVE' && nextZone === 'OVERDRIVE',
    };
  }

  public getActorDamageMult(actor: 'P1' | 'CPU'): number {
    const zone = classifyZoneForSide(this.value, actor);
    if (zone === 'OVERDRIVE') return 1.22;
    if (zone === 'PRESSURE') return 1.1;
    return 1.0;
  }

  public canUseBreaker(actor: 'P1' | 'CPU'): boolean {
    if (actor === 'P1') return this.p1Breakers > 0 && this.value <= -25;
    return this.cpuBreakers > 0 && this.value >= 25;
  }

  public canDashCancel(actor: 'P1' | 'CPU'): boolean {
    const signed = actor === 'P1' ? this.value : -this.value;
    return signed >= 22;
  }

  public getValue(): number {
    return this.value;
  }

  public getState(): LinearGaugeState {
    return {
      value: Math.round(this.value),
      p1Zone: classifyZoneForSide(this.value, 'P1'),
      cpuZone: classifyZoneForSide(this.value, 'CPU'),
      p1Breakers: this.p1Breakers,
      cpuBreakers: this.cpuBreakers,
      lastEvent: this.lastEvent,
      lastActor: this.lastActor,
      lastDelta: this.lastDelta,
      momentumStreak: this.momentumStreak,
    };
  }
}
