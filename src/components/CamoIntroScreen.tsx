/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { RetroAudio } from '../audio/RetroSynth';
import { AudioEventBus, FIGHTER_AUDIO_MAP } from '../audio/AudioEventBus';
import { CHARACTERS } from '../game/constants';
import { CharacterId, CORE_CHARACTER_IDS } from '../types/fighter';
import { AnimationTrackKey } from '../game/SpriteSheetEngine';
import { SpritePortraitCanvas } from './SpritePortraitCanvas';
import { Swords, Trophy, Cpu, Sparkles, Target, Compass, Wand2, Layers } from 'lucide-react';

interface CamoIntroScreenProps {
  selectedCharId?: CharacterId;
  onSelectCharacter?: (id: CharacterId) => void;
  onEnterCombat: () => void;
  onEnterTower: () => void;
  onEnterPractice: () => void;
  onEnterStory: () => void;
  onOpenLevelDesigner: () => void;
  onOpenMechanics: () => void;
  onOpenSwarm: () => void;
  onOpenMeshLab: () => void;
}

const CORE_GRID_ROSTER: CharacterId[] = [...CORE_CHARACTER_IDS];

const SHOWCASE_TRACKS: Array<{ key: AnimationTrackKey; label: string }> = [
  { key: 'idle', label: 'STANCE' },
  { key: 'lp', label: 'PUNCH' },
  { key: 'lk', label: 'KICK' },
  { key: 'hk', label: 'SPIN KICK' },
  { key: 'uppercut', label: 'UPPERCUT' },
  { key: 'special1', label: 'SPECIAL' },
];

export const CamoIntroScreen: React.FC<CamoIntroScreenProps> = ({
  selectedCharId = 'scorpion',
  onSelectCharacter,
  onEnterCombat,
  onEnterTower,
  onEnterPractice,
  onEnterStory,
  onOpenLevelDesigner,
  onOpenMechanics,
  onOpenSwarm,
  onOpenMeshLab,
}) => {
  const [featuredId, setFeaturedId] = useState<CharacterId>(selectedCharId);
  const [previewTrack, setPreviewTrack] = useState<AnimationTrackKey>('idle');

  const featuredDef = CHARACTERS[featuredId] || CHARACTERS.scorpion;
  const featuredVoice = FIGHTER_AUDIO_MAP[featuredId]?.quotes.intro_taunt || featuredDef.quote;

  const handleSelectPortrait = (id: CharacterId) => {
    RetroAudio.enableAudio();
    RetroAudio.playSelect();
    setFeaturedId(id);
    setPreviewTrack('special1');
    onSelectCharacter?.(id);
    AudioEventBus.playCharacterActionVoice(id, 'intro_taunt');
  };

  const handleStartCombat = () => {
    RetroAudio.enableAudio();
    RetroAudio.playGong(1.0);
    RetroAudio.announce('CHOOSE_YOUR_DESTINY');
    onEnterCombat();
  };

  const handleStartTower = () => {
    RetroAudio.enableAudio();
    RetroAudio.playSelect();
    RetroAudio.announce('CHOOSE_YOUR_DESTINY');
    onEnterTower();
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center p-2.5 sm:p-4 bg-[#07070c]/88 backdrop-blur-[3px] select-none overflow-y-auto">
      {/* Radial Pit / Dragon Fire Atmosphere */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_35%,rgba(185,28,28,0.28)_0%,rgba(5,5,10,0.92)_78%)]" />

      <div className="relative z-10 w-full max-w-5xl flex flex-col gap-3">
        {/* Top MK Arcade Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 py-2 rounded-xl bg-zinc-950/90 border border-amber-500/35 shadow-[0_0_28px_rgba(0,0,0,0.85)]">
          <div className="flex items-center gap-3">
            {/* Classic Dragon Medallion */}
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-b from-amber-500 via-red-700 to-black p-[2px] shadow-[0_0_24px_rgba(220,38,38,0.65)] shrink-0">
              <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center border border-amber-400/50">
                <svg viewBox="0 0 64 64" className="w-7 h-7 text-amber-400 fill-current" aria-hidden="true">
                  <path d="M32 6C19 6 10 15 10 27c0 6 3 11 7 15l-4 11 10-5c3 1 6 2 9 2 13 0 22-9 22-21S45 6 32 6zm2 10c6 0 11 4 12 10-3-2-6-2-9-1 2 2 3 5 2 8-2-2-5-2-7 0-2-3-5-4-8-3 1-6 4-14 10-14zm-6 21c4 3 10 3 14-1-2 6-7 10-13 10-5 0-9-3-11-7 3 1 7 0 10-2z" />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="font-kombat text-2xl sm:text-3xl md:text-4xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-red-600 drop-shadow-[0_3px_14px_rgba(220,38,38,0.75)] leading-none">
                MORTAL KOMBAT
              </h1>
              <p className="font-mono text-[10px] sm:text-[11px] tracking-[0.24em] text-amber-400/90 uppercase font-bold mt-0.5">
                Choose Your Fighter · Core 4 Kombatants
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 text-right">
            <div>
              <div className="font-kombat text-xs font-black text-red-400 uppercase tracking-wider">
                {featuredDef.name}
              </div>
              <div className="font-mono text-[10px] text-zinc-400 italic max-w-[260px] truncate">
                "{featuredVoice}"
              </div>
            </div>
          </div>
        </div>

        {/* Center Arcade Layout: 4x3 MK Portrait Grid + Live Sprite Move Showcase + Mode Launch */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
          {/* LEFT: Core 4 Portrait Matrix */}
          <div className="lg:col-span-7 p-2.5 sm:p-3 rounded-xl bg-zinc-950/92 border border-zinc-800 shadow-2xl flex flex-col justify-between">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 flex-1 items-stretch">
              {CORE_GRID_ROSTER.map((id) => {
                const c = CHARACTERS[id];
                if (!c) return null;
                const isSelected = featuredId === id;
                return (
                  <button
                    key={id}
                    onClick={() => handleSelectPortrait(id)}
                    className={`group relative rounded-lg overflow-hidden border-2 transition-all cursor-pointer flex flex-col items-center bg-gradient-to-b from-zinc-900 to-black min-h-[118px] sm:min-h-[146px] ${
                      isSelected
                        ? 'border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.65)] scale-[1.02] z-10'
                        : 'border-zinc-700/80 hover:border-red-500/80'
                    }`}
                  >
                    <div
                      className="absolute inset-x-0 top-0 h-1"
                      style={{ backgroundColor: c.themeColor }}
                    />
                    {isSelected && (
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-[1px] bg-amber-400 text-zinc-950 font-mono font-black text-[9px] rounded-xs leading-none z-20">
                        1P
                      </span>
                    )}
                    <div className="flex-1 flex items-center justify-center w-full pt-2">
                      <SpritePortraitCanvas
                        charId={id}
                        width={84}
                        height={92}
                        track={isSelected ? 'special1' : 'idle'}
                        className="object-contain"
                      />
                    </div>
                    <div className="w-full bg-black/90 border-t border-zinc-800 py-1 px-1.5 text-center">
                      <span
                        className={`font-kombat text-[11px] sm:text-xs font-black tracking-wide uppercase block truncate ${
                          isSelected ? 'text-amber-300' : 'text-zinc-300 group-hover:text-white'
                        }`}
                      >
                        {c.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Live Animated Fighter Showcase + Combat Action Launch */}
          <div className="lg:col-span-5 p-3 rounded-xl bg-zinc-950/92 border border-zinc-800 shadow-2xl flex flex-col justify-between gap-2.5">
            {/* Live Fighter Sprite Preview Card */}
            <div className="relative rounded-lg bg-gradient-to-b from-zinc-900 via-[#120709] to-black border border-red-900/50 p-2.5 flex items-center gap-3 overflow-hidden">
              <div className="shrink-0 rounded-lg bg-black/75 border border-zinc-800 p-1">
                <SpritePortraitCanvas
                  charId={featuredId}
                  width={104}
                  height={118}
                  track={previewTrack}
                />
              </div>

              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="font-kombat text-base sm:text-lg font-black text-amber-300 tracking-wide uppercase truncate">
                  {featuredDef.name}
                </div>
                <div className="font-mono text-[10px] text-zinc-400 truncate">
                  {featuredDef.title} · {featuredDef.realm}
                </div>
                <div className="font-mono text-[10px] text-amber-300 font-bold truncate">
                  {featuredDef.specials.slice(0, 2).map((s) => s.name).join(' · ')}
                </div>
                <div className="font-mono text-[10px] text-cyan-300 truncate">
                  Super: {featuredDef.superMove.name} ({featuredDef.superMove.damage} DMG)
                </div>

                {/* Live Move Animation Selector */}
                <div className="flex flex-wrap gap-1 mt-1">
                  {SHOWCASE_TRACKS.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => {
                        RetroAudio.enableAudio();
                        RetroAudio.playHover();
                        setPreviewTrack(t.key);
                      }}
                      className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold cursor-pointer border transition-colors whitespace-nowrap ${
                        previewTrack === t.key
                          ? 'bg-red-700 border-amber-400 text-white'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Primary Mode Launch Controls */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleStartCombat}
                className="w-full min-h-[46px] flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-700 via-red-600 to-amber-600 hover:from-red-600 hover:to-amber-500 text-white font-kombat font-black text-sm tracking-widest rounded-xl border border-amber-400/80 shadow-[0_0_22px_rgba(220,38,38,0.5)] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
              >
                <Swords className="w-4 h-4 text-amber-200 shrink-0" />
                <span>ARCADE KOMBAT · FIGHT AS {featuredDef.name.toUpperCase()}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleStartTower}
                  className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-amber-500/55 text-amber-300 hover:text-white font-kombat font-bold text-xs tracking-wider rounded-xl transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>KOMBAT TOWER</span>
                </button>

                <button
                  onClick={() => {
                    RetroAudio.enableAudio();
                    RetroAudio.playGong(0.8);
                    onEnterStory();
                  }}
                  className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-indigo-900 to-fuchsia-900 hover:from-indigo-800 hover:to-fuchsia-800 border border-fuchsia-400/70 text-white font-kombat font-black text-xs tracking-wider rounded-xl transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
                >
                  <Compass className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>1960s STORY</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    RetroAudio.enableAudio();
                    RetroAudio.playSelect();
                    onEnterPractice();
                  }}
                  className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-cyan-500/45 text-cyan-300 hover:text-white font-kombat font-bold text-[11px] tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap"
                >
                  <Target className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>PRACTICE DOJO</span>
                </button>

                <button
                  onClick={() => {
                    RetroAudio.enableAudio();
                    RetroAudio.playSelect();
                    onOpenLevelDesigner();
                  }}
                  className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-purple-500/50 text-purple-300 hover:text-white font-mono font-bold text-[11px] rounded-xl transition-all cursor-pointer whitespace-nowrap"
                >
                  <Wand2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>LEVEL DESIGNER</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    RetroAudio.enableAudio();
                    RetroAudio.playSelect();
                    onOpenSwarm();
                  }}
                  className="min-h-[44px] flex items-center justify-center gap-1.5 px-2.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-amber-500/40 text-amber-300 hover:text-white font-mono font-bold text-[11px] rounded-xl transition-all cursor-pointer whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>AI SWARM</span>
                </button>

                <button
                  onClick={() => {
                    RetroAudio.enableAudio();
                    RetroAudio.playSelect();
                    onOpenMeshLab();
                  }}
                  className="min-h-[44px] flex items-center justify-center gap-1.5 px-2.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-emerald-500/50 text-emerald-300 hover:text-white font-mono font-bold text-[11px] rounded-xl transition-all cursor-pointer whitespace-nowrap"
                >
                  <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>2D MESH</span>
                </button>

                <button
                  onClick={() => {
                    RetroAudio.enableAudio();
                    RetroAudio.playSelect();
                    onOpenMechanics();
                  }}
                  className="min-h-[44px] flex items-center justify-center gap-1.5 px-2.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white font-mono font-bold text-[11px] rounded-xl transition-all cursor-pointer whitespace-nowrap"
                >
                  <Cpu className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span>16 MECHS</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
