/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { CharacterId, StageId } from '../types/fighter';
import { CHARACTERS, STAGES } from '../game/constants';
import { getActiveSwarmPatch } from '../game/MovementMatrix';
import { SpritePortraitCanvas } from './SpritePortraitCanvas';
import { RetroAudio } from '../audio/RetroSynth';

interface MovieTransitionOverlayProps {
  isOpen: boolean;
  p1CharId: CharacterId;
  cpuCharId: CharacterId;
  stageId: StageId;
  isTowerMode: boolean;
  towerFloor: number;
  totalTowerFloors: number;
  onComplete: () => void;
}

export const MovieTransitionOverlay: React.FC<MovieTransitionOverlayProps> = ({
  isOpen,
  p1CharId,
  cpuCharId,
  stageId,
  isTowerMode,
  towerFloor,
  totalTowerFloors,
  onComplete,
}) => {
  const [phase, setPhase] = useState<'SHUTTER_IN' | 'CONFRONTATION' | 'SHUTTER_OUT'>('SHUTTER_IN');

  useEffect(() => {
    if (!isOpen) return;
    setPhase('SHUTTER_IN');
    RetroAudio.playMovieTransition('shutter_in');

    const t1 = setTimeout(() => {
      setPhase('CONFRONTATION');
      RetroAudio.playGong(0.75);
    }, 240);

    const t2 = setTimeout(() => {
      setPhase('SHUTTER_OUT');
      RetroAudio.playMovieTransition('shutter_out');
    }, 1550);

    const t3 = setTimeout(() => {
      onComplete();
    }, 1880);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isOpen, onComplete]);

  if (!isOpen) return null;

  const p1 = CHARACTERS[p1CharId] || CHARACTERS.scorpion;
  const cpu = CHARACTERS[cpuCharId] || CHARACTERS.subzero;
  const stage = STAGES[stageId] || STAGES.THE_PIT;
  const patch = getActiveSwarmPatch();

  return (
    <div className="fixed inset-0 z-50 bg-[#040407] flex flex-col justify-between overflow-hidden select-none">
      {/* Top Cinema Letterbox Shutter */}
      <div
        className={`w-full bg-gradient-to-b from-black via-zinc-950 to-red-950/60 border-b border-red-600/60 transition-all duration-300 flex items-center justify-between px-4 sm:px-8 ${
          phase === 'SHUTTER_IN' ? 'h-1/2' : phase === 'SHUTTER_OUT' ? 'h-0 opacity-0' : 'h-14 sm:h-16'
        }`}
      >
        <span className="font-mono text-[10px] sm:text-xs tracking-[0.28em] text-amber-400 uppercase font-bold truncate">
          {patch.menuDirective.tournamentSubtitle}
        </span>
        {isTowerMode ? (
          <span className="font-mono text-[10px] sm:text-xs font-bold text-red-400 uppercase whitespace-nowrap">
            Tower Tier {towerFloor}/{totalTowerFloors}
          </span>
        ) : (
          <span className="font-mono text-[10px] sm:text-xs font-bold text-zinc-300 uppercase whitespace-nowrap">
            {stage.name}
          </span>
        )}
      </div>

      {/* Center Theatrical Face-Off */}
      <div className="relative flex-1 flex items-center justify-between px-4 sm:px-12 py-4 bg-[radial-gradient(circle_at_50%_50%,rgba(185,28,28,0.28)_0%,rgba(4,4,8,0.96)_72%)]">
        {/* P1 Animated Fighter Showcase */}
        <div
          className={`w-[38%] flex flex-col items-center transition-all duration-300 ${
            phase === 'CONFRONTATION' ? 'translate-x-0 opacity-100 scale-100' : '-translate-x-8 opacity-0 scale-95'
          }`}
        >
          <div className="relative p-3 rounded-2xl bg-zinc-950/85 border-2 border-amber-400/80 shadow-[0_0_38px_rgba(245,158,11,0.35)]">
            <SpritePortraitCanvas
              charId={p1.id}
              width={136}
              height={160}
              track="special1"
              facing={1}
              className="block"
            />
          </div>
          <h2
            className="font-kombat text-xl sm:text-3xl font-black tracking-wider mt-3 text-center uppercase"
            style={{ color: p1.themeColor }}
          >
            {p1.name}
          </h2>
          <p className="font-mono text-[10px] sm:text-xs text-zinc-300 italic text-center mt-1 max-w-xs line-clamp-2">
            "{p1.quote}"
          </p>
        </div>

        {/* Center Lightning VS Medallion */}
        <div className="flex flex-col items-center justify-center z-10 px-2">
          <div className="font-kombat text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-orange-500 to-red-600 drop-shadow-[0_0_24px_rgba(239,68,68,0.85)]">
            VS
          </div>
          <span className="font-mono text-[9px] sm:text-[10px] tracking-[0.22em] text-amber-300/90 uppercase text-center mt-2 max-w-[180px]">
            {patch.menuDirective.vsBannerCallout}
          </span>
        </div>

        {/* CPU Animated Fighter Showcase */}
        <div
          className={`w-[38%] flex flex-col items-center transition-all duration-300 ${
            phase === 'CONFRONTATION' ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-8 opacity-0 scale-95'
          }`}
        >
          <div className="relative p-3 rounded-2xl bg-zinc-950/85 border-2 border-red-500/80 shadow-[0_0_38px_rgba(220,38,38,0.4)]">
            <SpritePortraitCanvas
              charId={cpu.id}
              width={136}
              height={160}
              track="hp"
              facing={-1}
              className="block"
            />
          </div>
          <h2
            className="font-kombat text-xl sm:text-3xl font-black tracking-wider mt-3 text-center uppercase"
            style={{ color: cpu.themeColor }}
          >
            {cpu.name}
          </h2>
          <p className="font-mono text-[10px] sm:text-xs text-zinc-300 italic text-center mt-1 max-w-xs line-clamp-2">
            "{cpu.quote}"
          </p>
        </div>
      </div>

      {/* Bottom Cinema Letterbox Shutter */}
      <div
        className={`w-full bg-gradient-to-t from-black via-zinc-950 to-red-950/60 border-t border-red-600/60 transition-all duration-300 flex items-center justify-between px-4 sm:px-8 ${
          phase === 'SHUTTER_IN' ? 'h-1/2' : phase === 'SHUTTER_OUT' ? 'h-0 opacity-0' : 'h-14 sm:h-16'
        }`}
      >
        <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-widest">
          Stage · {stage.location}
        </span>
        <button
          onClick={onComplete}
          className="min-h-[44px] px-4 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-mono text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
        >
          SKIP INTRO
        </button>
      </div>
    </div>
  );
};
