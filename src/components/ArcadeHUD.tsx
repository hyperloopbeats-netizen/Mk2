/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Fighter } from '../game/FighterEngine';
import { GameMatchState, LinearGaugeState } from '../types/fighter';
import { Volume2, VolumeX, BookOpen, UserCheck, Settings, Cpu, Flame, Box, Sparkles, Scan, Wand2, ShieldAlert, Layers } from 'lucide-react';
import { AudioEventBus } from '../audio/AudioEventBus';
import { getMechanicById } from '../game/MovementMechanics';

interface ArcadeHUDProps {
  p1: Fighter;
  cpu: Fighter;
  matchState: GameMatchState;
  round: number;
  matchTimer: number;
  isMuted: boolean;
  p1RoundWins: number;
  cpuRoundWins: number;
  comboHits?: number;
  comboDamage?: number;
  activeMechId: number;
  is3DMode: boolean;
  showHitboxes: boolean;
  isTowerMode?: boolean;
  towerFloor?: number;
  totalTowerFloors?: number;
  linearGaugeState: LinearGaugeState;
  canUseBreaker?: boolean;
  onTriggerBreaker?: () => void;
  onToggle3DMode: () => void;
  onToggleHitboxes: () => void;
  onToggleMute: () => void;
  onOpenCharSelect: () => void;
  onOpenMoveList: () => void;
  onOpenSettings: () => void;
  onOpenMechanics: () => void;
  onOpenSwarm: () => void;
  onOpenLevelDesigner: () => void;
  onOpenMeshLab: () => void;
}

export const ArcadeHUD: React.FC<ArcadeHUDProps> = ({
  p1,
  cpu,
  matchState,
  round,
  matchTimer,
  isMuted,
  p1RoundWins,
  cpuRoundWins,
  comboHits = 0,
  comboDamage = 0,
  activeMechId,
  is3DMode,
  showHitboxes,
  isTowerMode = false,
  towerFloor = 1,
  totalTowerFloors = 8,
  linearGaugeState,
  canUseBreaker = false,
  onTriggerBreaker,
  onToggle3DMode,
  onToggleHitboxes,
  onToggleMute,
  onOpenCharSelect,
  onOpenMoveList,
  onOpenSettings,
  onOpenMechanics,
  onOpenSwarm,
  onOpenLevelDesigner,
  onOpenMeshLab,
}) => {
  const [p1GhostHp, setP1GhostHp] = useState(p1.hp);
  const [cpuGhostHp, setCpuGhostHp] = useState(cpu.hp);

  const [subtitle, setSubtitle] = useState<{ text: string; speaker: string; color: string; visible: boolean }>({
    text: '',
    speaker: '',
    color: '#fbbf24',
    visible: false,
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = AudioEventBus.onSubtitle((text, speaker, color) => {
      setSubtitle({ text, speaker, color, visible: true });
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setSubtitle((prev) => ({ ...prev, visible: false }));
      }, 2000);
    });
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setP1GhostHp((prev) => (prev > p1.hp ? Math.max(p1.hp, prev - 1.4) : p1.hp));
      setCpuGhostHp((prev) => (prev > cpu.hp ? Math.max(cpu.hp, prev - 1.4) : cpu.hp));
    }, 36);
    return () => clearTimeout(timer);
  }, [p1.hp, cpu.hp, p1GhostHp, cpuGhostHp]);

  useEffect(() => {
    if (matchState === 'INTRO_LOCK' || matchState === 'ROSTER_SELECT') {
      setP1GhostHp(p1.hp);
      setCpuGhostHp(cpu.hp);
    }
  }, [matchState, p1.hp, cpu.hp]);

  const p1HpPercent = Math.max(0, (p1.hp / p1.maxHp) * 100);
  const p1GhostPercent = Math.max(0, (p1GhostHp / p1.maxHp) * 100);
  const cpuHpPercent = Math.max(0, (cpu.hp / cpu.maxHp) * 100);
  const cpuGhostPercent = Math.max(0, (cpuGhostHp / cpu.maxHp) * 100);

  const activeMech = getMechanicById(activeMechId);

  return (
    <header className="relative w-full shrink-0 select-none z-30 bg-[#05060b]/95 border-b border-red-900/40 px-2 sm:px-4 py-1">
      {/* Row 1: Ultra-Slim Health Bars + Round/Clock */}
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between gap-2">
        {/* P1 Health */}
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="flex items-center justify-between gap-1 text-[10px] sm:text-xs leading-none">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-kombat font-black tracking-wide truncate text-amber-300">
                {p1.def.name}
              </span>
              <span className="flex items-center gap-0.5 shrink-0">
                {[0, 1].map((idx) => (
                  <span
                    key={`p1_orb_${idx}`}
                    className={`w-1.5 h-1.5 rounded-full ${
                      idx < p1RoundWins ? 'bg-amber-400' : 'bg-zinc-700'
                    }`}
                  />
                ))}
              </span>
            </div>
            <span className="font-mono tabular-nums text-[10px] text-zinc-300 shrink-0">
              {Math.max(0, Math.round(p1.hp))}
            </span>
          </div>

          <div className="relative w-full h-2.5 rounded-sm bg-zinc-900 border border-zinc-700/70 overflow-hidden flex justify-end">
            <div
              className="absolute inset-y-0 right-0 bg-red-600/80 transition-all duration-300"
              style={{ width: `${p1GhostPercent}%` }}
            />
            <div
              className="relative h-full bg-gradient-to-l from-amber-400 via-orange-500 to-red-600 transition-all duration-75"
              style={{ width: `${p1HpPercent}%` }}
            />
          </div>

          {/* Slim Stamina Hairline */}
          <div className="w-full h-[2px] bg-zinc-900 overflow-hidden flex justify-end">
            <div
              className="h-full bg-sky-400/85"
              style={{ width: `${Math.max(0, p1.stamina)}%` }}
            />
          </div>
        </div>

        {/* Center Compact Round, Ladder Stage & Clock */}
        <div className="flex flex-col items-center justify-center shrink-0 px-2 min-w-[54px]">
          <span className="font-mono text-[8px] font-bold text-amber-400 tracking-widest leading-none whitespace-nowrap">
            {isTowerMode ? `S${towerFloor}/${totalTowerFloors} · R${round}` : `R${round}`}
          </span>
          <span className="font-kombat font-black tabular-nums text-base sm:text-lg text-white leading-none mt-0.5">
            {matchTimer < 10 ? `0${matchTimer}` : matchTimer}
          </span>
        </div>

        {/* CPU Health */}
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="flex items-center justify-between gap-1 text-[10px] sm:text-xs leading-none">
            <span className="font-mono tabular-nums text-[10px] text-zinc-300 shrink-0">
              {Math.max(0, Math.round(cpu.hp))}
            </span>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="flex items-center gap-0.5 shrink-0">
                {[0, 1].map((idx) => (
                  <span
                    key={`cpu_orb_${idx}`}
                    className={`w-1.5 h-1.5 rounded-full ${
                      idx < cpuRoundWins ? 'bg-red-500' : 'bg-zinc-700'
                    }`}
                  />
                ))}
              </span>
              <span className="font-kombat font-black tracking-wide truncate text-red-400">
                {cpu.def.name}
              </span>
            </div>
          </div>

          <div className="relative w-full h-2.5 rounded-sm bg-zinc-900 border border-zinc-700/70 overflow-hidden flex justify-start">
            <div
              className="absolute inset-y-0 left-0 bg-red-600/80 transition-all duration-300"
              style={{ width: `${cpuGhostPercent}%` }}
            />
            <div
              className="relative h-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-600 transition-all duration-75"
              style={{ width: `${cpuHpPercent}%` }}
            />
          </div>

          <div className="w-full h-[2px] bg-zinc-900 overflow-hidden flex justify-start">
            <div
              className="h-full bg-sky-400/85"
              style={{ width: `${Math.max(0, cpu.stamina)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Row 1.5: Linear Fighting Gauge (-100 CPU <-> 0 <-> +100 P1) & Reactive Status */}
      <div className="w-full max-w-6xl mx-auto flex items-center gap-2 pt-1">
        <div className="flex items-center gap-0.5 shrink-0" title="P1 Kombat Breakers">
          {[0, 1, 2].map((i) => (
            <span
              key={`p1_brk_${i}`}
              className={`w-1.5 h-2 rounded-xs ${
                i < linearGaugeState.p1Breakers ? 'bg-cyan-400' : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>

        <div className="relative flex-1 h-2.5 rounded-full bg-zinc-900 border border-zinc-700/80 overflow-hidden">
          {/* Center Zero Marker */}
          <div className="absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2 bg-white/50 z-10" />
          {/* Tug-of-war fill */}
          {linearGaugeState.value >= 0 ? (
            <div
              className={`absolute top-0 bottom-0 left-1/2 transition-all duration-100 ${
                linearGaugeState.p1Zone === 'OVERDRIVE'
                  ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-cyan-300 shadow-[0_0_10px_rgba(251,191,36,0.9)]'
                  : 'bg-gradient-to-r from-cyan-500 to-amber-400'
              }`}
              style={{ width: `${Math.min(50, (linearGaugeState.value / 100) * 50)}%` }}
            />
          ) : (
            <div
              className={`absolute top-0 bottom-0 right-1/2 transition-all duration-100 ${
                linearGaugeState.cpuZone === 'OVERDRIVE'
                  ? 'bg-gradient-to-l from-red-500 via-rose-500 to-fuchsia-500'
                  : 'bg-gradient-to-l from-orange-500 to-red-600'
              }`}
              style={{ width: `${Math.min(50, (Math.abs(linearGaugeState.value) / 100) * 50)}%` }}
            />
          )}
        </div>

        <span className="font-mono text-[9px] font-bold tabular-nums whitespace-nowrap shrink-0 text-amber-300">
          {linearGaugeState.p1Zone === 'OVERDRIVE'
            ? 'OVERDRIVE +22%'
            : linearGaugeState.cpuZone === 'OVERDRIVE'
            ? 'CPU OVERDRIVE'
            : linearGaugeState.lastEvent}
        </span>

        {canUseBreaker && onTriggerBreaker && (
          <button
            onClick={onTriggerBreaker}
            className="px-1.5 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-mono font-black text-[9px] flex items-center gap-0.5 cursor-pointer whitespace-nowrap shrink-0"
            title="Kombat Breaker [X]"
          >
            <ShieldAlert className="w-2.5 h-2.5" />
            <span>BRK</span>
          </button>
        )}

        <div className="flex items-center gap-0.5 shrink-0" title="CPU Kombat Breakers">
          {[0, 1, 2].map((i) => (
            <span
              key={`cpu_brk_${i}`}
              className={`w-1.5 h-2 rounded-xs ${
                i < linearGaugeState.cpuBreakers ? 'bg-red-500' : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Row 2: Minimalistic Micro Strip (Active Sprite Mech + Spatial Lane/Stride + Clean Actions) */}
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between gap-2 pt-1 text-[10px] font-mono">
        <div className="flex items-center gap-2 min-w-0 text-zinc-400 truncate">
          <span className="text-amber-400 font-bold tabular-nums whitespace-nowrap">
            MECH {activeMech.id}: {activeMech.shortLabel}
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-cyan-300 font-bold whitespace-nowrap">
            Z:{p1.zLane === -1 ? 'BACK' : p1.zLane === 1 ? 'FORE' : 'MID'}
          </span>
          {p1.activeStride && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-bold whitespace-nowrap" style={{ color: p1.activeStride.color }}>
                {p1.activeStride.label}
              </span>
            </>
          )}
          {p1.isCounterReady && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-cyan-400 font-bold whitespace-nowrap">PARRY +50%</span>
            </>
          )}
          {p1.superMeter >= 100 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-amber-300 font-bold whitespace-nowrap">SUPER READY</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onToggleHitboxes}
            className={`px-2 py-0.5 rounded font-bold text-[10px] flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 border transition-colors ${
              showHitboxes
                ? 'bg-sky-950/90 border-sky-400/80 text-sky-300'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
            title="Toggle Training Hitboxes & GGPO Telemetry [B]"
          >
            <Scan className="w-3 h-3" />
            <span>BOXES</span>
          </button>

          <button
            onClick={onToggle3DMode}
            className={`px-2 py-0.5 rounded font-bold text-[10px] flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 border transition-colors ${
              is3DMode
                ? 'bg-cyan-950/90 border-cyan-400/80 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
            title="Toggle 3D Perspective Stage"
          >
            <Box className="w-3 h-3" />
            <span>{is3DMode ? '3D MODE' : '2D'}</span>
          </button>

          <button
            onClick={onOpenLevelDesigner}
            className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-purple-500/50 text-purple-300 font-bold text-[10px] flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
            title="1960s Vancouver AI Level Designer"
          >
            <Wand2 className="w-3 h-3" />
            <span className="hidden sm:inline">VANCOUVER</span>
          </button>

          <button
            onClick={onOpenSwarm}
            className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-amber-500/50 text-amber-300 font-bold text-[10px] flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
            title="AI Swarm Framework & 3D Spatial Audio Studio"
          >
            <Sparkles className="w-3 h-3" />
            <span>SWARM</span>
          </button>

          <button
            onClick={onOpenMeshLab}
            className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-emerald-500/50 text-emerald-300 font-bold text-[10px] flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
            title="MK-2D-SpriteMesh-Autonomous Engine & Manifest Studio"
          >
            <Layers className="w-3 h-3" />
            <span>MESH</span>
          </button>

          <button
            onClick={onOpenMechanics}
            className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-amber-300 font-bold text-[10px] flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
            title="16 Sprite Movement Mechanics"
          >
            <Cpu className="w-3 h-3" />
            <span>MECHS</span>
          </button>

          <button
            onClick={onOpenMoveList}
            className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold text-[10px] flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
            title="Move List"
          >
            <BookOpen className="w-3 h-3" />
            <span className="hidden sm:inline">Moves</span>
          </button>

          <button
            onClick={onOpenCharSelect}
            className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold text-[10px] flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
            title="Fighter Select"
          >
            <UserCheck className="w-3 h-3" />
            <span className="hidden sm:inline">Roster</span>
          </button>

          <button
            onClick={onToggleMute}
            className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 cursor-pointer shrink-0"
            aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
          >
            {isMuted ? <VolumeX className="w-3 h-3 text-red-400" /> : <Volume2 className="w-3 h-3 text-amber-400" />}
          </button>

          <button
            onClick={onOpenSettings}
            className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 cursor-pointer shrink-0"
            aria-label="Settings"
          >
            <Settings className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Floating Over-Arena Overlays (Zero Vertical Height Footprint) */}
      <div className="absolute left-0 right-0 top-full mt-1.5 px-3 flex items-start justify-between pointer-events-none z-30">
        {comboHits >= 2 ? (
          <div className="px-2.5 py-1 rounded-md bg-black/85 border border-red-500/70 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-kombat font-black text-amber-300 text-xs tabular-nums">
              {Math.min(3, comboHits)} HIT · {Math.round(comboDamage)} DMG
            </span>
          </div>
        ) : (
          <div />
        )}

        {subtitle.visible && (
          <div className="px-3 py-1 rounded-md bg-black/85 border border-amber-500/50 text-center">
            <span className="font-kombat font-black text-xs tracking-wider uppercase" style={{ color: subtitle.color }}>
              {subtitle.speaker}: "{subtitle.text}"
            </span>
          </div>
        )}
      </div>
    </header>
  );
};
