/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Fighter } from '../game/FighterEngine';
import { CombatMove } from '../types/fighter';
import { Shield, Skull, FastForward, RefreshCw, ShieldCheck, Sparkles, MoveVertical, ShieldAlert, Hand, Footprints } from 'lucide-react';
import { SIX_BUTTON_MOVES, TRIPLE_COMBO_ROUTES } from '../game/constants';
import { RetroAudio } from '../audio/RetroSynth';

export interface ThumbstickDirection {
  zone: 'NEUTRAL' | 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  angleDeg: number;
}

interface TouchControllerProps {
  p1: Fighter;
  cpu: Fighter;
  onAttack: (move: CombatMove, isBullseye?: boolean) => void;
  onMoveInput: (dx: number, dy: number, dir?: ThumbstickDirection) => void;
  onGuard: (isGuarding: boolean) => void;
  onExecuteFatality: () => void;
  onRun?: () => void;
  onThrow?: () => void;
  onTag?: () => void;
  onSidestep?: () => void;
  onFastFall?: () => void;
  onBreaker?: () => void;
  canUseBreaker?: boolean;
  isInputLocked?: boolean;
  isCounterReady?: boolean;
}

export const TouchController: React.FC<TouchControllerProps> = ({
  p1,
  cpu,
  onAttack,
  onMoveInput,
  onGuard,
  onExecuteFatality,
  onRun,
  onThrow,
  onTag,
  onSidestep,
  onFastFall,
  onBreaker,
  canUseBreaker = false,
  isInputLocked = false,
  isCounterReady = false,
}) => {
  const leftZoneRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const guardPointerIdRef = useRef<number | null>(null);
  const stickOriginRef = useRef<{ x: number; y: number } | null>(null);

  const [stickPos, setStickPos] = useState<{ x: number; y: number } | null>(null);
  const [activeZone, setActiveZone] = useState<ThumbstickDirection['zone']>('NEUTRAL');
  const [specialIndex, setSpecialIndex] = useState<number>(0);

  const isFinishHim = cpu.hp <= 0 && cpu.state === 'DIZZY';
  const isCrouching = activeZone === 'S' || activeZone === 'SW' || activeZone === 'SE' || p1.state === 'CROUCH';
  const isAirborne = !p1.isGrounded;
  const isSuperReady = p1.superMeter >= 100 && !isFinishHim;

  // Direction-mapped Special slot (◀/▶ -> 0, ▼ -> 1, ▲ -> 2, neutral -> cycled)
  const resolvedSpecialIndex =
    activeZone === 'S' || activeZone === 'SE' || activeZone === 'SW'
      ? Math.min(1, p1.def.specials.length - 1)
      : activeZone === 'N' || activeZone === 'NE' || activeZone === 'NW'
      ? Math.min(2, p1.def.specials.length - 1)
      : activeZone === 'E' || activeZone === 'W'
      ? 0
      : specialIndex % Math.max(1, p1.def.specials.length);

  const activeSpecial = p1.def.specials[resolvedSpecialIndex] || p1.def.specials[0];
  const activeLpMove = isAirborne ? SIX_BUTTON_MOVES.JUMP_PUNCH : SIX_BUTTON_MOVES.LP;
  const activeLkMove = isAirborne
    ? SIX_BUTTON_MOVES.JUMP_KICK
    : isCrouching
    ? SIX_BUTTON_MOVES.CROUCH_LK
    : SIX_BUTTON_MOVES.LK;
  const activeHpMove = isAirborne
    ? SIX_BUTTON_MOVES.JUMP_PUNCH
    : isCrouching
    ? SIX_BUTTON_MOVES.UPPERCUT
    : SIX_BUTTON_MOVES.HP;
  const activeHkMove = isAirborne
    ? SIX_BUTTON_MOVES.JUMP_KICK
    : isCrouching
    ? SIX_BUTTON_MOVES.SWEEP
    : SIX_BUTTON_MOVES.HK;

  // Global pointer cleanup so multi-touch never freezes
  useEffect(() => {
    const handleGlobalPointerUp = (e: PointerEvent) => {
      if (guardPointerIdRef.current !== null && e.pointerId === guardPointerIdRef.current) {
        guardPointerIdRef.current = null;
        onGuard(false);
      }
      if (activePointerIdRef.current !== null && e.pointerId === activePointerIdRef.current) {
        resetStick();
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [onGuard]);

  const resetStick = () => {
    activePointerIdRef.current = null;
    stickOriginRef.current = null;
    setStickPos(null);
    setActiveZone('NEUTRAL');
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate3d(0px, 0px, 0)';
    }
    onMoveInput(0, 0, {
      zone: 'NEUTRAL',
      up: false,
      down: false,
      left: false,
      right: false,
      angleDeg: 0,
    });
  };

  const updateStickDelta = (clientX: number, clientY: number) => {
    if (!leftZoneRef.current || !stickOriginRef.current) return;
    const rect = leftZoneRef.current.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    let dx = localX - stickOriginRef.current.x;
    let dy = localY - stickOriginRef.current.y;
    const dist = Math.hypot(dx, dy);
    const maxR = 42;

    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }

    if (knobRef.current) {
      knobRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    }

    const deadzone = 6;
    if (dist < deadzone) {
      setActiveZone('NEUTRAL');
      onMoveInput(0, 0, {
        zone: 'NEUTRAL',
        up: false,
        down: false,
        left: false,
        right: false,
        angleDeg: 0,
      });
      return;
    }

    const angle = Math.atan2(dy, dx);
    let deg = angle * (180 / Math.PI);
    if (deg < 0) deg += 360;

    let zone: ThumbstickDirection['zone'] = 'NEUTRAL';
    if (deg >= 337.5 || deg < 22.5) zone = 'E';
    else if (deg >= 22.5 && deg < 67.5) zone = 'SE';
    else if (deg >= 67.5 && deg < 112.5) zone = 'S';
    else if (deg >= 112.5 && deg < 157.5) zone = 'SW';
    else if (deg >= 157.5 && deg < 202.5) zone = 'W';
    else if (deg >= 202.5 && deg < 247.5) zone = 'NW';
    else if (deg >= 247.5 && deg < 292.5) zone = 'N';
    else if (deg >= 292.5 && deg < 337.5) zone = 'NE';

    setActiveZone(zone);

    const rawNormX = dx / maxR;
    const normX = Math.abs(rawNormX) < 0.14 ? 0 : rawNormX;
    const normY = dy / maxR;

    if (!p1.isGrounded && normY > 0.68 && onFastFall) {
      onFastFall();
    }

    onMoveInput(normX, normY, {
      zone,
      up: normY < -0.35,
      down: normY > 0.35,
      left: normX < -0.14,
      right: normX > 0.14,
      angleDeg: deg,
    });
  };

  const handleZonePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isInputLocked) return;
    if (activePointerIdRef.current !== null) return;
    if (!leftZoneRef.current) return;

    const rect = leftZoneRef.current.getBoundingClientRect();
    const origin = {
      x: Math.max(48, Math.min(rect.width - 48, e.clientX - rect.left)),
      y: Math.max(48, Math.min(rect.height - 48, e.clientY - rect.top)),
    };

    activePointerIdRef.current = e.pointerId;
    stickOriginRef.current = origin;
    setStickPos(origin);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    updateStickDelta(e.clientX, e.clientY);
  };

  const handleZonePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isInputLocked) return;
    if (e.pointerId === activePointerIdRef.current) {
      e.preventDefault();
      updateStickDelta(e.clientX, e.clientY);
    }
  };

  const handleZonePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId === activePointerIdRef.current) {
      e.preventDefault();
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // ignore
      }
      resetStick();
    }
  };

  const handleActionPress = (
    e: React.PointerEvent<HTMLButtonElement>,
    move: CombatMove
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInputLocked) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const distFromCenter = Math.hypot(
      e.clientX - (rect.left + rect.width / 2),
      e.clientY - (rect.top + rect.height / 2)
    );
    const isBullseye = distFromCenter <= rect.width * 0.28;

    if (isBullseye) {
      RetroAudio.playBullseye();
    } else {
      RetroAudio.playSelect();
    }

    onAttack(move, isBullseye);
  };

  const comboStep = Math.min(3, p1.stateMachine.comboStep);
  const matchedHintRoute =
    comboStep >= 1 && comboStep < 3
      ? TRIPLE_COMBO_ROUTES.find((r) =>
          p1.stateMachine.sequenceTokens.every((tok, idx) => r.sequence[idx] === tok)
        )
      : null;

  const matrixBtnBase =
    'min-w-[48px] min-h-[46px] w-[50px] h-[46px] sm:w-14 sm:h-12 rounded-xl flex flex-col items-center justify-center active:scale-90 touch-none cursor-pointer transition-transform select-none shrink-0';

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 overflow-hidden">
      {/* LEFT HALF: Analog Virtual Thumbstick + Clean Non-Overlapping Mobility Bar */}
      <div
        ref={leftZoneRef}
        onPointerDown={handleZonePointerDown}
        onPointerMove={handleZonePointerMove}
        onPointerUp={handleZonePointerUp}
        onPointerCancel={handleZonePointerUp}
        onLostPointerCapture={resetStick}
        className="absolute left-0 top-0 bottom-0 w-1/2 pointer-events-auto touch-none"
      >
        {/* Subtle idle joystick guide */}
        {!stickPos && (
          <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 w-24 h-24 rounded-full border border-red-500/45 bg-zinc-950/75 flex items-center justify-center pointer-events-none opacity-85">
            <div className="w-10 h-10 rounded-full bg-red-600/70 border border-red-300/70 shadow-[0_0_12px_rgba(220,38,38,0.45)]" />
          </div>
        )}

        {/* Active dynamic joystick under user's thumb */}
        {stickPos && (
          <div
            className="absolute w-28 h-28 -ml-14 -mt-14 rounded-full border-2 border-red-500/85 bg-zinc-950/85 shadow-[0_0_24px_rgba(220,38,38,0.45)] flex items-center justify-center pointer-events-none"
            style={{ left: `${stickPos.x}px`, top: `${stickPos.y}px` }}
          >
            <span className="absolute top-1 text-[8px] font-mono text-zinc-400">
              {activeZone !== 'NEUTRAL' ? activeZone : ''}
            </span>
            <div
              ref={knobRef}
              className="w-11 h-11 rounded-full bg-gradient-to-br from-red-500 to-red-800 border-2 border-amber-300/80 shadow-[0_0_14px_rgba(239,68,68,0.8)]"
            />
          </div>
        )}

        {/* Clean 2x2 Mobility Cluster spaced clearly right of thumbstick */}
        <div
          className="absolute bottom-3 left-28 sm:bottom-4 sm:left-32 grid grid-cols-2 gap-1.5 pointer-events-auto"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isInputLocked) {
                if (onRun) onRun();
                else onAttack(SIX_BUTTON_MOVES.RUN);
              }
            }}
            disabled={isInputLocked}
            className={`min-w-[48px] min-h-[44px] px-2 rounded-xl border font-mono font-bold text-[10px] flex items-center justify-center gap-1 active:scale-90 touch-none cursor-pointer whitespace-nowrap shrink-0 ${
              p1.state === 'RUN'
                ? 'bg-orange-500/30 border-orange-400 text-orange-200'
                : 'bg-zinc-950/90 hover:bg-zinc-900 border-orange-500/65 text-orange-300'
            }`}
            title="MK Sprint / Run-Cancel [Shift]"
          >
            <FastForward className="w-3 h-3" />
            <span>RUN</span>
          </button>

          <button
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isInputLocked) {
                if (onThrow) onThrow();
                else onAttack(SIX_BUTTON_MOVES.THROW);
              }
            }}
            disabled={isInputLocked}
            className="min-w-[48px] min-h-[44px] px-2 rounded-xl bg-zinc-950/90 hover:bg-zinc-900 border border-rose-500/70 text-rose-300 font-mono font-bold text-[10px] flex items-center justify-center gap-1 active:scale-90 touch-none cursor-pointer whitespace-nowrap shrink-0"
            title="Close Unblockable Throw [G]"
          >
            <Hand className="w-3 h-3" />
            <span>THW</span>
          </button>

          {onSidestep && (
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isInputLocked) onSidestep();
              }}
              disabled={isInputLocked}
              className="min-w-[48px] min-h-[44px] px-2 rounded-xl bg-zinc-950/90 hover:bg-zinc-900 border border-cyan-500/65 text-cyan-300 font-mono font-bold text-[10px] flex items-center justify-center gap-1 active:scale-90 touch-none cursor-pointer whitespace-nowrap shrink-0"
              title="2.5D Z-Lane Sidestep [Q]"
            >
              <MoveVertical className="w-3 h-3" />
              <span>STEP</span>
            </button>
          )}

          {onTag && (
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isInputLocked) onTag();
              }}
              disabled={isInputLocked}
              className="min-w-[48px] min-h-[44px] px-2 rounded-xl bg-zinc-950/90 hover:bg-zinc-900 border border-amber-500/65 text-amber-300 font-mono font-bold text-[10px] flex items-center justify-center gap-1 active:scale-90 touch-none cursor-pointer whitespace-nowrap shrink-0"
              title="Tag Partner [T]"
            >
              <RefreshCw className="w-3 h-3" />
              <span>TAG</span>
            </button>
          )}
        </div>
      </div>

      {/* RIGHT CORNER: Symmetrical 2×4 (8-Button) Combat Matrix */}
      <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-5 pointer-events-auto flex flex-col items-end gap-2">
        {/* Contextual Breaker CTA when pressured */}
        {canUseBreaker && onBreaker && !isFinishHim && (
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBreaker();
            }}
            className="min-h-[44px] px-3.5 py-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-sky-600 text-zinc-950 font-kombat font-black text-[11px] tracking-wider border border-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.8)] active:scale-95 cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>KOMBAT BREAKER!</span>
          </button>
        )}
        {/* Contextual Fatality CTA */}
        {isFinishHim && (
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onExecuteFatality();
            }}
            className="min-h-[46px] px-4 py-2 rounded-full bg-gradient-to-r from-red-700 to-amber-600 text-white font-kombat font-black text-xs sm:text-sm tracking-widest border-2 border-amber-300 shadow-[0_0_24px_rgba(220,38,38,0.85)] active:scale-95 cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Skull className="w-4 h-4 text-amber-200" />
            <span>FATALITY!</span>
          </button>
        )}

        {/* Contextual Super Finisher CTA when Meter = 100% */}
        {isSuperReady && (
          <button
            onPointerDown={(e) => handleActionPress(e, p1.def.superMove)}
            disabled={isInputLocked}
            className="min-h-[44px] px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-red-600 text-zinc-950 font-kombat font-black text-[11px] tracking-wider border border-amber-200 shadow-[0_0_18px_rgba(245,158,11,0.8)] active:scale-95 cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>SUPER · {p1.def.superMove.damage} DMG</span>
          </button>
        )}

        {/* Non-Interactive Strict 3-Strike Chain Meter */}
        {!isFinishHim && comboStep > 0 && (
          <div className="pointer-events-none flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-950/90 border border-amber-500/50">
            <div className="flex items-center gap-1">
              {[1, 2, 3].map((pip) => (
                <span
                  key={`strike_pip_${pip}`}
                  className={`w-2.5 h-1.5 rounded-sm transition-colors ${
                    pip <= comboStep
                      ? pip === 3
                        ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.9)]'
                        : 'bg-amber-400'
                      : 'bg-zinc-700'
                  }`}
                />
              ))}
            </div>
            <span className="font-mono text-[9px] font-bold text-amber-300 tabular-nums whitespace-nowrap">
              {comboStep}/3{matchedHintRoute ? ` · NEXT: ${comboStep === 1 ? matchedHintRoute.sequence[1] : matchedHintRoute.sequence[2]}` : comboStep === 3 ? ' · MAX STRIKE' : ''}
            </span>
          </div>
        )}

        {/* SYMMETRICAL 2×4 (8-BUTTON) COMBAT MATRIX */}
        <div className="grid grid-cols-4 gap-1.5 p-2 rounded-2xl bg-zinc-950/90 border border-zinc-700/80 shadow-[0_8px_30px_rgba(0,0,0,0.85)]">
          {/* ROW 1: CORE STRIKES (LP | HP | LK | HK) */}
          <button
            onPointerDown={(e) => handleActionPress(e, activeLpMove)}
            disabled={isInputLocked}
            className={`${matrixBtnBase} bg-blue-950/90 border border-blue-400/75 text-blue-100`}
            title="Light Punch (In Air = Jump Punch)"
          >
            <span className="font-kombat font-black text-xs leading-none">
              {isAirborne ? 'J.P' : 'LP'}
            </span>
            <span className="font-mono text-[8px] text-blue-300/90 tabular-nums leading-none mt-1">
              {activeLpMove.damage} DMG
            </span>
          </button>

          <button
            onPointerDown={(e) => handleActionPress(e, activeHpMove)}
            disabled={isInputLocked}
            className={`${matrixBtnBase} bg-red-950/90 border border-red-400/75 text-red-100`}
            title="Heavy Punch (▼ + HP = Uppercut, In Air = Jump Punch)"
          >
            <span className="font-kombat font-black text-xs leading-none">
              {isAirborne ? 'J.P' : isCrouching ? 'UPR' : 'HP'}
            </span>
            <span className="font-mono text-[8px] text-red-300/90 tabular-nums leading-none mt-1">
              {activeHpMove.damage} DMG
            </span>
          </button>

          <button
            onPointerDown={(e) => handleActionPress(e, activeLkMove)}
            disabled={isInputLocked}
            className={`${matrixBtnBase} bg-amber-950/90 border border-amber-400/75 text-amber-100`}
            title="Light Kick (▼ + LK = Crouch Low Kick)"
          >
            <span className="font-kombat font-black text-xs leading-none">
              {isAirborne ? 'J.K' : isCrouching ? 'C.LK' : 'LK'}
            </span>
            <span className="font-mono text-[8px] text-amber-300/90 tabular-nums leading-none mt-1">
              {activeLkMove.damage} DMG
            </span>
          </button>

          <button
            onPointerDown={(e) => handleActionPress(e, activeHkMove)}
            disabled={isInputLocked}
            className={`${matrixBtnBase} bg-orange-950/90 border border-orange-400/80 text-orange-100 shadow-[0_0_10px_rgba(249,115,22,0.3)]`}
            title="High Spinning Kick (▼ + HK = Sweep, In Air = Jump Kick)"
          >
            <span className="font-kombat font-black text-xs leading-none">
              {isAirborne ? 'J.K' : isCrouching ? 'SWP' : 'HK'}
            </span>
            <span className="font-mono text-[8px] text-orange-300/90 tabular-nums leading-none mt-1">
              {activeHkMove.damage} DMG
            </span>
          </button>

          {/* ROW 2: TACTICAL OPERATIONS (UPR | SWP | SPC | BLK) */}
          <button
            onPointerDown={(e) => handleActionPress(e, SIX_BUTTON_MOVES.UPPERCUT)}
            disabled={isInputLocked}
            className={`${matrixBtnBase} bg-purple-950/90 border border-purple-400/75 text-purple-100 shadow-[0_0_10px_rgba(168,85,247,0.3)]`}
            title="Launcher Uppercut [Y / ▼ + I]"
          >
            <span className="font-kombat font-black text-[11px] leading-none">UPR</span>
            <span className="font-mono text-[8px] text-purple-300/90 tabular-nums leading-none mt-1">
              {SIX_BUTTON_MOVES.UPPERCUT.damage} DMG
            </span>
          </button>

          <button
            onPointerDown={(e) => handleActionPress(e, SIX_BUTTON_MOVES.SWEEP)}
            disabled={isInputLocked}
            className={`${matrixBtnBase} bg-emerald-950/90 border border-emerald-400/80 text-emerald-100 shadow-[0_0_10px_rgba(16,185,129,0.28)]`}
            title="Low Sweep Kick [H / P / ▼ + K]"
          >
            <div className="flex items-center gap-0.5 leading-none">
              <Footprints className="w-3 h-3" />
              <span className="font-kombat font-black text-[10px]">SWP</span>
            </div>
            <span className="font-mono text-[8px] text-emerald-300/95 tabular-nums leading-none mt-1">
              {SIX_BUTTON_MOVES.SWEEP.damage} DMG
            </span>
          </button>

          <button
            onPointerDown={(e) => {
              if (activeSpecial) {
                handleActionPress(e, activeSpecial);
                if (activeZone === 'NEUTRAL') {
                  setSpecialIndex((prev) => (prev + 1) % Math.max(1, p1.def.specials.length));
                }
              }
            }}
            disabled={isInputLocked}
            className={`${matrixBtnBase} bg-cyan-950/90 border border-cyan-400/75 text-cyan-100`}
            title={activeSpecial?.name || 'Signature Special'}
          >
            <span className="font-kombat font-black text-[11px] leading-none">SPC</span>
            <span className="font-mono text-[8px] text-cyan-300/90 tabular-nums leading-none mt-1">
              {activeSpecial?.damage ?? 20} DMG
            </span>
          </button>

          <button
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isInputLocked) {
                guardPointerIdRef.current = e.pointerId;
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                  // ignore
                }
                onGuard(true);
              }
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (guardPointerIdRef.current === e.pointerId) {
                guardPointerIdRef.current = null;
                onGuard(false);
              }
            }}
            onPointerCancel={(e) => {
              e.preventDefault();
              e.stopPropagation();
              guardPointerIdRef.current = null;
              onGuard(false);
            }}
            onLostPointerCapture={() => {
              guardPointerIdRef.current = null;
              onGuard(false);
            }}
            disabled={isInputLocked}
            className={`${matrixBtnBase} ${
              isCounterReady
                ? 'bg-cyan-500 text-zinc-950 border-2 border-cyan-200 shadow-[0_0_16px_rgba(6,182,212,0.85)]'
                : 'bg-zinc-900/95 border border-zinc-400/70 text-zinc-100'
            }`}
            title="Block & Precision Parry"
          >
            <div className="flex items-center gap-0.5 leading-none">
              {isCounterReady ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
              <span className="font-kombat font-black text-[10px]">
                {isCounterReady ? 'PRY' : 'BLK'}
              </span>
            </div>
            <span
              className={`font-mono text-[8px] leading-none mt-1 ${
                isCounterReady ? 'text-zinc-900 font-bold' : 'text-zinc-400'
              }`}
            >
              {isCounterReady ? '+50%' : 'GUARD'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
