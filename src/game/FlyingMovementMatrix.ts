/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CharacterFlightProfile, CharacterId, FlyingMovementNode } from '../types/fighter';
import { hermiteBezierInterpolate } from './FighterEngine';

type FlightNodes = Record<FlyingMovementNode['phase'], FlyingMovementNode>;

function createNodeMatrix(
  gravScale: number,
  airDrag: number,
  hoverGrav: number,
  maxAirSpeed: number
): FlightNodes {
  return {
    LAUNCH: {
      phase: 'LAUNCH',
      gravityScale: gravScale,
      dragX: airDrag,
      liftImpulse: 0,
      maxAirSpeed,
    },
    APEX: {
      phase: 'APEX',
      gravityScale: gravScale * 0.96,
      dragX: 0.996,
      liftImpulse: 0,
      maxAirSpeed: maxAirSpeed * 1.02,
    },
    GLIDE: {
      phase: 'GLIDE',
      gravityScale: hoverGrav * 0.45,
      dragX: 0.995,
      liftImpulse: 0,
      maxAirSpeed: maxAirSpeed * 1.38,
    },
    DIVE: {
      phase: 'DIVE',
      gravityScale: gravScale * 1.35,
      dragX: 0.996,
      liftImpulse: 220,
      maxAirSpeed: maxAirSpeed * 1.45,
    },
    HOVER: {
      phase: 'HOVER',
      gravityScale: hoverGrav * 0.35,
      dragX: 0.97,
      liftImpulse: 0,
      maxAirSpeed: maxAirSpeed * 0.85,
    },
    TUMBLE: {
      phase: 'TUMBLE',
      gravityScale: gravScale * 1.06,
      dragX: 0.99,
      liftImpulse: 0,
      maxAirSpeed: maxAirSpeed * 1.15,
    },
    DESCENT: {
      phase: 'DESCENT',
      gravityScale: gravScale * 1.08,
      dragX: airDrag,
      liftImpulse: 0,
      maxAirSpeed,
    },
    LANDING: {
      phase: 'LANDING',
      gravityScale: gravScale,
      dragX: 0.84,
      liftImpulse: 0,
      maxAirSpeed: maxAirSpeed * 0.5,
    },
  };
}

export const CHARACTER_FLIGHT_PROFILES: Record<CharacterId, CharacterFlightProfile> = {
  scorpion: {
    archetype: 'SHADOW_WARP',
    gravityMultiplier: 1.0,
    airControl: 1.08,
    jumpImpulse: -620,
    doubleArcLift: -180,
    diveSpeed: 540,
    trailColor: '#f97316',
    nodes: createNodeMatrix(1.0, 0.996, 0.85, 340),
  },
  subzero: {
    archetype: 'CRYO_SUSPEND',
    gravityMultiplier: 1.02,
    airControl: 1.02,
    jumpImpulse: -610,
    doubleArcLift: -150,
    diveSpeed: 510,
    trailColor: '#38bdf8',
    nodes: createNodeMatrix(1.02, 0.995, 0.85, 320),
  },
  smoke: {
    archetype: 'SHADOW_WARP',
    gravityMultiplier: 0.88,
    airControl: 1.28,
    jumpImpulse: -545,
    doubleArcLift: -210,
    diveSpeed: 560,
    trailColor: '#94a3b8',
    nodes: createNodeMatrix(0.88, 0.992, 0.58, 370),
  },
  raiden: {
    archetype: 'THUNDER_GLIDE',
    gravityMultiplier: 0.92,
    airControl: 1.22,
    jumpImpulse: -540,
    doubleArcLift: -195,
    diveSpeed: 620,
    trailColor: '#38bdf8',
    nodes: createNodeMatrix(0.92, 0.994, 0.52, 410),
  },
  liukang: {
    archetype: 'AERIAL_ACROBAT',
    gravityMultiplier: 0.96,
    airControl: 1.15,
    jumpImpulse: -635,
    doubleArcLift: -210,
    diveSpeed: 580,
    trailColor: '#ef4444',
    nodes: createNodeMatrix(0.96, 0.996, 0.82, 370),
  },
  sonya: {
    archetype: 'AERIAL_ACROBAT',
    gravityMultiplier: 0.96,
    airControl: 1.12,
    jumpImpulse: -620,
    doubleArcLift: -205,
    diveSpeed: 550,
    trailColor: '#22c55e',
    nodes: createNodeMatrix(0.96, 0.995, 0.82, 355),
  },
  johnny: {
    archetype: 'AERIAL_ACROBAT',
    gravityMultiplier: 0.99,
    airControl: 1.08,
    jumpImpulse: -618,
    doubleArcLift: -175,
    diveSpeed: 545,
    trailColor: '#06b6d4',
    nodes: createNodeMatrix(0.99, 0.995, 0.85, 345),
  },
  noob: {
    archetype: 'SHADOW_WARP',
    gravityMultiplier: 0.91,
    airControl: 1.20,
    jumpImpulse: -535,
    doubleArcLift: -190,
    diveSpeed: 590,
    trailColor: '#a855f7',
    nodes: createNodeMatrix(0.91, 0.991, 0.60, 360),
  },
  aimix: {
    archetype: 'SONIC_LEVITATE',
    gravityMultiplier: 0.85,
    airControl: 1.35,
    jumpImpulse: -560,
    doubleArcLift: -230,
    diveSpeed: 640,
    trailColor: '#ff6600',
    nodes: createNodeMatrix(0.85, 0.995, 0.44, 420),
  },
  reptile: {
    archetype: 'AERIAL_ACROBAT',
    gravityMultiplier: 0.91,
    airControl: 1.22,
    jumpImpulse: -545,
    doubleArcLift: -200,
    diveSpeed: 560,
    trailColor: '#22c55e',
    nodes: createNodeMatrix(0.91, 0.990, 0.62, 365),
  },
  kunglao: {
    archetype: 'AERIAL_ACROBAT',
    gravityMultiplier: 0.90,
    airControl: 1.25,
    jumpImpulse: -550,
    doubleArcLift: -215,
    diveSpeed: 610,
    trailColor: '#3b82f6',
    nodes: createNodeMatrix(0.90, 0.992, 0.54, 385),
  },
  kitana: {
    archetype: 'CRYO_SUSPEND',
    gravityMultiplier: 0.84,
    airControl: 1.32,
    jumpImpulse: -555,
    doubleArcLift: -235,
    diveSpeed: 560,
    trailColor: '#38bdf8',
    nodes: createNodeMatrix(0.84, 0.994, 0.45, 390),
  },
  mileena: {
    archetype: 'SHADOW_WARP',
    gravityMultiplier: 0.87,
    airControl: 1.28,
    jumpImpulse: -550,
    doubleArcLift: -220,
    diveSpeed: 620,
    trailColor: '#d946ef',
    nodes: createNodeMatrix(0.87, 0.992, 0.52, 395),
  },
  goro: {
    archetype: 'HEAVY_METEOR',
    gravityMultiplier: 1.18,
    airControl: 0.88,
    jumpImpulse: -510,
    doubleArcLift: -130,
    diveSpeed: 660,
    trailColor: '#ea580c',
    nodes: createNodeMatrix(1.18, 0.980, 0.85, 290),
  },
  robocop: {
    archetype: 'HEAVY_METEOR',
    gravityMultiplier: 1.10,
    airControl: 0.92,
    jumpImpulse: -505,
    doubleArcLift: -145,
    diveSpeed: 560,
    trailColor: '#94a3b8',
    nodes: createNodeMatrix(1.10, 0.982, 0.78, 300),
  },
  leonardo: {
    archetype: 'AERIAL_ACROBAT',
    gravityMultiplier: 0.92,
    airControl: 1.22,
    jumpImpulse: -545,
    doubleArcLift: -205,
    diveSpeed: 575,
    trailColor: '#0284c7',
    nodes: createNodeMatrix(0.92, 0.991, 0.58, 370),
  },
  shangtsung: {
    archetype: 'SONIC_LEVITATE',
    gravityMultiplier: 0.90,
    airControl: 1.20,
    jumpImpulse: -535,
    doubleArcLift: -200,
    diveSpeed: 540,
    trailColor: '#eab308',
    nodes: createNodeMatrix(0.90, 0.992, 0.52, 355),
  },
};

export interface FlightStepOutput {
  phase: FlyingMovementNode['phase'];
  gravityAccel: number;
  vxDamped: number;
  hoverLift: number;
}

export class FlyingMovementNetwork {
  public currentPhase: FlyingMovementNode['phase'] = 'LANDING';
  public smoothGravityScale: number = 1.0;
  public airTrailPoints: Array<{ x: number; y: number; alpha: number; color: string }> = [];

  public getProfile(charId: CharacterId): CharacterFlightProfile {
    return CHARACTER_FLIGHT_PROFILES[charId] || CHARACTER_FLIGHT_PROFILES.scorpion;
  }

  public resolveFlightPhase(
    charId: CharacterId,
    isGrounded: boolean,
    vx: number,
    vy: number,
    state: string,
    attackId?: string
  ): FlyingMovementNode['phase'] {
    if (isGrounded) return 'LANDING';
    if (state === 'AIR_TUMBLE' || state === 'JUGGLE') return 'TUMBLE';

    if (
      attackId === 'RAIDEN_TORPEDO' ||
      attackId === 'LIUKANG_FLYING_KICK' ||
      attackId === 'JOHNNY_SHADOW_KICK' ||
      attackId === 'KITANA_SQUARE_WAVE' ||
      attackId === 'LIUKANG_BICYCLE_KICK'
    ) {
      return 'GLIDE';
    }

    if (
      attackId === 'KUNGLAO_DIVE_KICK' ||
      attackId === 'MILEENA_TELEPORT_DROP' ||
      attackId === 'NOOB_TELEPORT_SLAM' ||
      attackId === 'LEONARDO_NINJA_STRIKE'
    ) {
      return 'DIVE';
    }

    if (vy < -140) return 'LAUNCH';
    if (Math.abs(vy) <= 140) {
      return Math.abs(vx) > 260 ? 'GLIDE' : 'APEX';
    }
    return 'DESCENT';
  }

  public stepAirPhysics(
    charId: CharacterId,
    dt: number,
    x: number,
    y: number,
    vx: number,
    vy: number,
    isGrounded: boolean,
    state: string,
    attackId?: string
  ): FlightStepOutput {
    const profile = this.getProfile(charId);
    const targetPhase = this.resolveFlightPhase(charId, isGrounded, vx, vy, state, attackId);
    this.currentPhase = targetPhase;

    const node = profile.nodes[targetPhase];
    this.smoothGravityScale = hermiteBezierInterpolate(
      this.smoothGravityScale,
      node.gravityScale,
      Math.min(1, dt * 14)
    );

    const baseGravity = 1680;
    const gravityAccel = baseGravity * this.smoothGravityScale;
    const vxClamped = Math.max(-node.maxAirSpeed, Math.min(node.maxAirSpeed, vx));
    const vxDamped = targetPhase === 'GLIDE' ? vxClamped : vxClamped * Math.pow(node.dragX, dt * 60);

    return {
      phase: targetPhase,
      gravityAccel,
      vxDamped,
      hoverLift: node.liftImpulse,
    };
  }

  public drawFlightRibbon(_ctx: CanvasRenderingContext2D) {
    // Intentionally kept clean with no air-ribbon clutter
  }
}
