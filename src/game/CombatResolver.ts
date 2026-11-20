/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Fighter } from './FighterEngine';
import { ParticleSystem } from './ParticleSystem';
import { RetroAudio } from '../audio/RetroSynth';
import { AudioEventBus } from '../audio/AudioEventBus';
import { getActiveSwarmPatch } from './MovementMatrix';
import {
  LinearKombatGauge,
  areLanesCompatible,
  isAntiAirHit,
  isWhiffPunishHit,
} from './SpatialCombatSystem';

export interface CombatResolverHooks {
  threeWeaponEngine?: unknown;
  p1ComboDmgRef: { current: number };
  cpuComboDmgRef: { current: number };
  linearGauge?: LinearKombatGauge;
  gaugeGainMult?: number;
  p1DamageReduction?: number;
  onTriggerSlowMo: (scale: number, durationSec: number, zoomBoost?: number) => void;
  onTriggerCinematicFx: (text: string, color: string, glow: string, bg: string, duration?: number) => void;
  onTriggerComboNotification: (target: 'P1' | 'CPU', hits: number, totalDmg: number) => void;
}

export function checkRectOverlap(
  r1: { x: number; y: number; width: number; height: number },
  r2: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    r1.x < r2.x + r2.width &&
    r1.x + r1.width > r2.x &&
    r1.y < r2.y + r2.height &&
    r1.y + r1.height > r2.y
  );
}

/**
 * Resolves melee hitboxes, weapon-on-weapon clashes, precision parries,
 * 4-zone anatomical damage, juggle launches, and combo evolution telemetry.
 */
export function resolveCombat(
  atk: Fighter,
  def: Fighter,
  particles: ParticleSystem,
  camera: { hitZoom: number; shake: number },
  hooks: CombatResolverHooks
) {
  if (
    !atk.activeHitbox ||
    def.wakeupInvulnFrames > 0 ||
    def.state === 'HITSTUN' ||
    def.state === 'DEAD' ||
    def.state === 'STAGE_FALL' ||
    def.state === 'FATALITY_EXECUTION'
  ) {
    return;
  }

  const hb = atk.activeHitbox;
  const swarmTuning = getActiveSwarmPatch().combatTuning;

  const hurtboxes = def.getHurtboxes();

  let hitZone: keyof typeof hurtboxes | null = null;
  if (checkRectOverlap(hb, hurtboxes[hb.attack.zone])) {
    hitZone = hb.attack.zone;
  } else {
    for (const z of ['HEAD', 'TORSO', 'LEFT_LIMBS', 'RIGHT_LIMBS'] as const) {
      if (checkRectOverlap(hb, hurtboxes[z])) {
        hitZone = z;
        break;
      }
    }
  }

  if (hitZone) {
    const atkSide: 'P1' | 'CPU' = atk.isPlayer1 ? 'P1' : 'CPU';
    const defSide: 'P1' | 'CPU' = def.isPlayer1 ? 'P1' : 'CPU';
    const gainScale = atk.isPlayer1 ? (hooks.gaugeGainMult ?? 1.0) : 1.0;

    // 2.5D Z-Lane Sidestep Evade Check
    if (!areLanesCompatible(atk.zLane, def.zLane, hb.attack) || def.sidestepTimer > 4) {
      atk.activeHitbox = null;
      if (hooks.linearGauge) {
        hooks.linearGauge.applyReactiveEvent(defSide, 'SIDESTEP_EVADE');
      }
      hooks.onTriggerCinematicFx('💨 Z-LANE SIDESTEP EVADE!', '#22d3ee', '#0891b2', 'transparent', 440);
      particles.emitHitSparks(def.x + 28, def.y + 48, '#22d3ee', 10);
      return;
    }

    const hitX = def.x + 28;
    const hitY = hb.y + 15;
    const isCounter = def.state === 'ATTACK';
    const atkSnap = {
      x: atk.x,
      y: atk.y,
      vy: atk.vy,
      isGrounded: atk.isGrounded,
      state: atk.state,
      actionFrame: atk.actionFrame,
      currentMove: atk.currentAttack,
      activeHitbox: atk.activeHitbox,
      zLane: atk.zLane,
      sidestepTimer: atk.sidestepTimer,
    };
    const defSnap = {
      x: def.x,
      y: def.y,
      vy: def.vy,
      isGrounded: def.isGrounded,
      state: def.state,
      actionFrame: def.actionFrame,
      currentMove: def.currentAttack,
      activeHitbox: def.activeHitbox,
      zLane: def.zLane,
      sidestepTimer: def.sidestepTimer,
    };
    const isWhiff = isWhiffPunishHit(defSnap);
    const isAntiAir = isAntiAirHit(atkSnap, defSnap, hb.attack);
    const defStatus = def.getStatus();

    if (def.state === 'BLOCK') {
      atk.comboHits = 0;
      atk.comboTimer = 0;
      atk.canCancel = false;
      atk.bufferedMove = null;

      if (def.parryWindow > 0) {
        def.isCounterReady = true;
        def.counterTimer = 120;
        atk.hitStop = 10;
        def.hitStop = 4;
        atk.vx = -atk.facing * 120;
        hooks.linearGauge?.applyReactiveEvent(defSide, 'PARRY', def.isPlayer1 ? (hooks.gaugeGainMult ?? 1) : 1);
        RetroAudio.playHit('light', hitX, hitY);
        AudioEventBus.playCharacterActionVoice(def.def.id, 'parry');
        camera.shake = 10;
        particles.emitLightning(hb.x + hb.width / 2, hb.y + hb.height / 2, 16);
        hooks.onTriggerCinematicFx('⚡ PERFECT PARRY! COUNTER READY!', '#38bdf8', '#0284c7', 'transparent', 650);
        return;
      }

      hooks.linearGauge?.applyReactiveEvent(atkSide, 'BLOCK', gainScale);

      const guardDrain = hb.attack.isSpecial ? 16 : 10;
      const breachMult = defStatus.isTorsoBreached ? 1.5 : 1.0;
      def.guardMeter = Math.max(0, def.guardMeter - Math.floor(guardDrain * breachMult));

      const isGuardBroken = def.guardMeter <= 0 || def.stamina <= 0;
      if (isGuardBroken) {
        def.state = 'GUARD_CRUSH';
        def.guardCrushTimer = 46;
        def.vx = atk.facing * 140;
        def.hp = Math.max(0, def.hp - hb.attack.damage);
        RetroAudio.playGuardCrush(hitX, hitY);
        camera.shake = 10;
        particles.emitLightning(hb.x + hb.width / 2, hb.y + hb.height / 2, 10);
      } else {
        const chipRate = defStatus.isTorsoBreached
          ? Math.min(0.35, swarmTuning.chipDamageRate + 0.08)
          : swarmTuning.chipDamageRate;
        def.hp = Math.max(0, def.hp - Math.max(1, Math.floor(hb.attack.damage * chipRate)));
        const pushDist = 18 + hb.attack.damage * 0.7;
        def.applyFractalBlockPushback(atk.facing, pushDist);
        atk.applyFractalBlockPushback((atk.facing === 1 ? -1 : 1), 6);
        def.hitStop = 3;
        atk.hitStop = 3;
        RetroAudio.playBlock(hitX, hitY);
      }
    } else {
      let dmg = hb.attack.damage;
      if (atk.isCounterReady) {
        dmg = Math.floor(dmg * 1.5);
        atk.isCounterReady = false;
        hooks.onTriggerCinematicFx('⚡ COUNTER STRIKE! +50% DMG', '#38bdf8', '#0284c7', 'transparent', 650);
        particles.emitFire(hb.x + hb.width / 2, hb.y + hb.height / 2, atk.facing, 14);
      } else if (isAntiAir) {
        dmg = Math.floor(dmg * 1.24);
        hooks.onTriggerCinematicFx('⬆ ANTI-AIR PUNISH! +24%', '#38bdf8', '#0284c7', 'transparent', 520);
      } else if (isWhiff) {
        dmg = Math.floor(dmg * 1.22);
        hooks.onTriggerCinematicFx('🎯 WHIFF PUNISH! +22%', '#f97316', '#ea580c', 'transparent', 520);
      } else if (isCounter) {
        dmg = Math.floor(dmg * 1.25);
      }

      if (defStatus.isTorsoBreached) dmg = Math.floor(dmg * 1.2);
      if (atk.activeStride?.effect === 'NEON_SHOCK' && hb.attack.isSpecial) {
        dmg = Math.floor(dmg * 1.15);
      }
      if (hooks.linearGauge) {
        dmg = Math.floor(dmg * hooks.linearGauge.getActorDamageMult(atkSide));
        const ev = isAntiAir
          ? 'ANTI_AIR'
          : isWhiff
          ? 'WHIFF_PUNISH'
          : atk.activeStride
          ? 'STRIDE_SYNERGY'
          : 'HIT';
        const res = hooks.linearGauge.applyReactiveEvent(atkSide, ev, gainScale);
        if (res.triggeredOverdrive) {
          hooks.onTriggerCinematicFx(`🔥 ${atk.def.name} OVERDRIVE!`, '#f97316', '#ea580c', 'transparent', 620);
        }
      }
      if (def.isPlayer1 && hooks.p1DamageReduction) {
        dmg = Math.max(1, Math.floor(dmg * (1 - hooks.p1DamageReduction)));
      }

      def.hp = Math.max(0, def.hp - dmg);
      def.zones[hitZone].hp = Math.max(0, def.zones[hitZone].hp - Math.floor(dmg * 1.3));
      if (def.zones[hitZone].hp === 0) {
        def.zones[hitZone].isBroken = true;
      }

      if (
        hb.attack.id === 'KITANA_FAN_LIFT' ||
        hb.attack.id === 'SUBZERO_ICE_SPIKE' ||
        hb.attack.id === 'SHANG_GROUND_SKULLS'
      ) {
        def.state = 'JUGGLE';
        def.actionFrame = 0;
        def.vx = atk.facing * (hb.attack.id === 'KITANA_FAN_LIFT' ? 50 : 120);
        def.vy = hb.attack.id === 'KITANA_FAN_LIFT' ? -520 : -430;
        def.isGrounded = false;
        camera.shake = Math.min(24, camera.shake + 14);
        particles.emitHitSparks(def.x + 28, def.y + 40, atk.def.accentColor, 24);
      } else if (hb.attack.id === 'JOHNNY_NUT_PUNCH' || hb.attack.id === 'RAIDEN_SHOCK_GRAB') {
        def.state = 'STAGGER';
        def.actionFrame = 0;
        def.vx = atk.facing * 85;
        camera.shake = Math.min(22, camera.shake + 14);
        particles.emitLightning(def.x + 28, def.y + 45, 16);
      } else if (hb.attack.id === 'UPPERCUT' || hb.attack.isLauncher) {
        def.launchKnockdown(atk.facing * 240, -620, true);
        camera.shake = Math.min(26, camera.shake + 18);
        RetroAudio.playHit('uppercut', hitX, hitY);
        particles.emitBoneFragments(def.x + 28, def.y + 36, atk.facing);
        particles.emitArterialSpray(def.x + 28, hb.y + 10, atk.facing, 32, 445);
      } else if (
        hb.attack.id === 'HK' ||
        hb.attack.id === 'SWEEP' ||
        hb.attack.id === 'JUMP_KICK' ||
        atk.lastAttackWasTripleFinisher ||
        hb.attack.id === 'LIUKANG_FLYING_KICK' ||
        hb.attack.id === 'LIUKANG_BICYCLE_KICK' ||
        hb.attack.id === 'SUBZERO_SLIDE' ||
        hb.attack.id === 'JOHNNY_SHADOW_KICK'
      ) {
        def.launchKnockdown(
          atk.facing * Math.max(300, hb.attack.kbX || 330),
          hb.attack.kbY && hb.attack.kbY < -140 ? hb.attack.kbY : -310,
          false
        );
        camera.shake = Math.min(20, camera.shake + 12);
        RetroAudio.playHit('heavy', hitX, hitY);
        particles.emitArterialSpray(def.x + 28, hb.y + 15, atk.facing, 20, 445);
        if (atk.lastAttackWasTripleFinisher) {
          RetroAudio.announce('BRUTAL');
        }
      } else if (def.state === 'JUGGLE') {
        def.juggleHits++;
        def.vy = hb.attack.kbY || -360;
        def.vx = atk.facing * (hb.attack.kbX * 0.9);
        def.isGrounded = false;
        particles.emitBlood(def.x + 28, hb.y + 15, atk.facing, 22, 445);
      } else {
        const exhaustedCollapse = def.registerPunchHit(dmg, particles);
        if (exhaustedCollapse) {
          def.launchKnockdown(atk.facing * 260, -240, false);
          camera.shake = Math.min(20, camera.shake + 12);
          particles.emitArterialSpray(def.x + 28, hb.y + 15, atk.facing, 18, 445);
        } else {
          def.state = dmg >= 18 || isCounter ? 'STAGGER' : 'HITSTUN';
          def.actionFrame = 0;
          def.vx = atk.facing * ((hb.attack.kbX * 1.35) / def.mass);
          if (hb.attack.kbY && hb.attack.kbY < -35) {
            def.vy = hb.attack.kbY;
            def.isGrounded = false;
          }
          if (dmg >= 16) {
            particles.emitArterialSpray(def.x + 28, hb.y + 15, atk.facing, 18, 445);
          }
        }
      }

      def.triggerReactiveHit(dmg, atk.facing, hitZone, false, particles);

      const kineticFreeze = Math.min(7, Math.max(3, Math.floor(dmg * 0.25 * swarmTuning.hitstopScale)));
      atk.hitStop = kineticFreeze;
      def.hitStop = kineticFreeze;
      atk.canCancel = atk.stateMachine.comboStep === 1 || atk.stateMachine.comboStep === 2;

      if (dmg >= 14) {
        AudioEventBus.playCharacterActionVoice(def.def.id, 'pain');
      }

      atk.superMeter = Math.min(100, atk.superMeter + 9);
      def.superMeter = Math.min(100, def.superMeter + 5);

      atk.comboHits = Math.min(3, atk.comboHits + 1);
      atk.comboTimer = 75;

      if (atk.comboHits === 1) {
        if (atk.isPlayer1) hooks.p1ComboDmgRef.current = dmg;
        else hooks.cpuComboDmgRef.current = dmg;
      } else {
        if (atk.isPlayer1) hooks.p1ComboDmgRef.current += dmg;
        else hooks.cpuComboDmgRef.current += dmg;

        particles.emitComboEvolution(def.x + 28, hb.y - 10, atk.comboHits, dmg, atk.facing);
        RetroAudio.playComboHit(atk.comboHits, hitX, hitY);

        const currentComboDmg = atk.isPlayer1 ? hooks.p1ComboDmgRef.current : hooks.cpuComboDmgRef.current;
        hooks.onTriggerComboNotification(atk.isPlayer1 ? 'P1' : 'CPU', atk.comboHits, currentComboDmg);
      }

      if (atk.comboHits === 3) {
        RetroAudio.announce('BRUTAL');
      }

      camera.hitZoom = Math.min(0.15, camera.hitZoom + (isCounter ? 0.08 : 0.04));
      camera.shake = Math.min(18, camera.shake + (isCounter ? 8 : 5));

      if (def.zones[hitZone].isBroken) {
        RetroAudio.playHit('bone_crack', hitX, hitY);
        particles.emitBoneFragments(def.x + 28, def.y + 40, atk.facing);
      } else if (hb.attack.id === 'UPPERCUT') {
        RetroAudio.playHit('uppercut', hitX, hitY);
      } else if (
        hb.attack.id === 'LK' ||
        hb.attack.id === 'CROUCH_LK' ||
        hb.attack.id === 'HK' ||
        hb.attack.id === 'SWEEP' ||
        hb.attack.id === 'JUMP_KICK' ||
        hb.attack.id === 'LIUKANG_FLYING_KICK' ||
        hb.attack.id === 'JOHNNY_SHADOW_KICK'
      ) {
        RetroAudio.playKick(
          hb.attack.id === 'HK' || hb.attack.id === 'SWEEP' ? 'heavy' : 'light',
          hitX,
          hitY
        );
      } else if (hb.attack.id === 'LP' || hb.attack.id === 'HP' || hb.attack.id === 'JUMP_PUNCH') {
        RetroAudio.playPunch(hb.attack.id === 'HP' ? 'heavy' : 'light', hitX, hitY);
      } else {
        RetroAudio.playHit(dmg >= 20 ? 'heavy' : 'medium', hitX, hitY);
      }

      if (dmg >= 16 || isCounter) {
        particles.emitArterialSpray(def.x + 28, hb.y + 10, atk.facing, 24, 445);
      } else {
        particles.emitBlood(def.x + 28, hb.y + 15, atk.facing, Math.min(28, Math.floor(dmg * 1.4)), 445);
      }
    }

    atk.activeHitbox = null;
  }
}
