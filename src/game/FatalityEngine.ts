/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Fighter } from './FighterEngine';
import { ParticleSystem } from './ParticleSystem';
import { RetroAudio } from '../audio/RetroSynth';
import { AudioEventBus } from '../audio/AudioEventBus';
import { DistanceCategory, StageId } from '../types/fighter';

export type FinisherKind = 'PRIMARY_FATALITY' | 'TOASTY_FATALITY' | 'STAGE_FATALITY';

export interface FatalityDistanceInfo {
  category: DistanceCategory;
  distancePx: number;
  isNearStageEdge: boolean;
}

/**
 * Computes exact center-to-center combat spacing category (CLOSE / SWEEP / FAR)
 * and stage-edge proximity for Omni-Engine distance-gated Fatalities.
 */
export function getDistanceCategory(fighterA: Fighter, fighterB: Fighter): DistanceCategory {
  const centerA = fighterA.x + fighterA.width / 2;
  const centerB = fighterB.x + fighterB.width / 2;
  const distance = Math.abs(centerA - centerB);
  if (distance < 115) return 'CLOSE';
  if (distance <= 240) return 'SWEEP';
  return 'FAR';
}

export function getFatalityDistanceInfo(attacker: Fighter, defender: Fighter): FatalityDistanceInfo {
  const centerA = attacker.x + attacker.width / 2;
  const centerB = defender.x + defender.width / 2;
  const distancePx = Math.round(Math.abs(centerA - centerB));
  const category = getDistanceCategory(attacker, defender);
  const isNearStageEdge = defender.x <= 165 || defender.x >= 740;
  return { category, distancePx, isNearStageEdge };
}

export interface FatalityHooks {
  onPhaseBanner: (text: string) => void;
  onCinematicFx: (text: string, color: string, glow: string, bg: string, duration?: number) => void;
  onCameraImpulse: (hitZoom: number, shake: number) => void;
  onComplete: () => void;
}

/**
 * Multi-phase Fatality & Stage Fatality Choreography Engine.
 */
export function executeFatalityChoreography(
  attacker: Fighter,
  defender: Fighter,
  particles: ParticleSystem,
  kind: FinisherKind,
  activeStage: StageId,
  hooks: FatalityHooks
): number[] {
  const timers: number[] = [];
  defender.hp = 0;

  if (kind === 'STAGE_FATALITY') {
    attacker.state = 'VICTORY';
    attacker.fatalityTimer = 260;
    defender.state = 'STAGE_FALL';
    defender.isGrounded = false;
    defender.vy = -520;
    defender.vx = attacker.facing * 95;
    defender.tumbleAngularVelocity = attacker.facing * 0.22;

    const stageLabel =
      activeStage === 'THE_PIT'
        ? 'THE PIT SPIKE DROP!'
        : activeStage === 'NETHERREALM'
        ? 'NETHERREALM LAVA PLUNGE!'
        : `${activeStage.replace('_', ' ')} STAGE FATALITY!`;

    AudioEventBus.announceMatchEvent('FATALITY', attacker.def.name);
    RetroAudio.playHit('uppercut', defender.x + 28, defender.y + 30);
    hooks.onCinematicFx('STAGE FATALITY!', '#f87171', '#dc2626', 'transparent', 3200);
    hooks.onPhaseBanner(`${attacker.def.name.toUpperCase()} WINS · ${stageLabel}`);
    hooks.onCameraImpulse(0.55, 24);

    timers.push(
      window.setTimeout(() => {
        RetroAudio.playPainSound('scream');
        particles.emitBlood(defender.x + 28, 495, attacker.facing, 56, 560);
        particles.emitBoneFragments(defender.x + 28, 495, attacker.facing);
        hooks.onCameraImpulse(0.85, 32);
        RetroAudio.playHit('bone_crack');
      }, 1300)
    );

    timers.push(
      window.setTimeout(() => {
        RetroAudio.playGong(0.5);
        AudioEventBus.playCharacterActionVoice(attacker.def.id, 'fatality_shout');
      }, 2400)
    );

    timers.push(
      window.setTimeout(() => {
        hooks.onComplete();
      }, 4200)
    );
    return timers;
  }

  // Standard 7.2s Multi-Phase Weapon / Elemental / Toasty Fatality
  attacker.executeWeaponFatality(defender, particles);
  AudioEventBus.announceMatchEvent('FATALITY', attacker.def.name);

  if (kind === 'TOASTY_FATALITY') {
    RetroAudio.announce('TOASTY');
    particles.emitFire(defender.x + 28, defender.y + 40, attacker.facing, 48);
    hooks.onCinematicFx('TOASTY! HELLFIRE FATALITY', '#f97316', '#dc2626', 'transparent', 3000);
    hooks.onPhaseBanner(`TOASTY! ${attacker.def.name} WINS!`);
  } else {
    hooks.onCinematicFx('FATALITY', '#ef4444', '#b91c1c', 'transparent', 3000);
    hooks.onPhaseBanner(`FATALITY! ${attacker.def.name} WINS!`);
  }
  hooks.onCameraImpulse(0.60, 26);

  timers.push(
    window.setTimeout(() => {
      hooks.onCameraImpulse(0.85, 28);
      hooks.onPhaseBanner('CRITICAL WEAPON CLEAVE!');
      particles.emitHitSparks(defender.x + 28, defender.y + 38, attacker.def.accentColor, 26);
      particles.emitArterialSpray(defender.x + 28, defender.y + 38, attacker.facing, 34, 445);
      RetroAudio.playSword(defender.x + 28, defender.y + 38);
      RetroAudio.playHit('heavy');
    }, 1400)
  );

  timers.push(
    window.setTimeout(() => {
      hooks.onCameraImpulse(0.95, 30);
      hooks.onPhaseBanner('BONE FRACTURE!');
      particles.emitBoneFragments(defender.x + 28, defender.y + 36, attacker.facing);
      particles.emitArterialSpray(defender.x + 28, defender.y + 30, attacker.facing, 30, 445);
      RetroAudio.playHit('bone_crack');
    }, 2800)
  );

  timers.push(
    window.setTimeout(() => {
      hooks.onCameraImpulse(1.15, 36);
      hooks.onPhaseBanner('DECAPITATION!');
      hooks.onCinematicFx('DECAPITATION!', '#ef4444', '#7f1d1d', 'transparent', 1400);
      particles.emitArterialSpray(defender.x + 28, defender.y + 18, attacker.facing, 44, 445);
      RetroAudio.playPainSound('flesh_tear');
    }, 4200)
  );

  timers.push(
    window.setTimeout(() => {
      hooks.onCameraImpulse(0.70, 22);
      hooks.onPhaseBanner('BODY COLLAPSE!');
      AudioEventBus.playCharacterActionVoice(attacker.def.id, 'victory');
      RetroAudio.playHit('heavy');
    }, 5600)
  );

  timers.push(
    window.setTimeout(() => {
      hooks.onComplete();
    }, 7200)
  );

  return timers;
}
