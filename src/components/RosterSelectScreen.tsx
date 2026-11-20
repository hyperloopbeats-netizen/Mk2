/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CHARACTERS, STAGES, TOWERS } from '../game/constants';
import { CharacterId, CORE_CHARACTER_IDS, StageId, TowerTier } from '../types/fighter';
import { Swords, Zap, Flame, Snowflake, Wind, Shield, Shuffle, Play, Trophy, Crown, Skull, Crosshair, Sparkles, Wand2 } from 'lucide-react';
import { RetroAudio } from '../audio/RetroSynth';
import { SpritePortraitCanvas } from './SpritePortraitCanvas';

interface RosterSelectScreenProps {
  p1CharId: CharacterId;
  p1PartnerId: CharacterId;
  cpuCharId: CharacterId;
  cpuPartnerId: CharacterId;
  activeStage: StageId;
  selectedTower: TowerTier;
  onSelectP1: (id: CharacterId) => void;
  onSelectP1Partner: (id: CharacterId) => void;
  onSelectCpu: (id: CharacterId) => void;
  onSelectStage: (id: StageId) => void;
  onSelectTower: (tier: TowerTier) => void;
  onStartFight: (isTower: boolean) => void;
  onOpenSwarm?: () => void;
  onOpenLevelDesigner?: () => void;
}

export const RosterSelectScreen: React.FC<RosterSelectScreenProps> = ({
  p1CharId,
  p1PartnerId,
  cpuCharId,
  activeStage,
  selectedTower,
  onSelectP1,
  onSelectP1Partner,
  onSelectCpu,
  onSelectStage,
  onSelectTower,
  onStartFight,
  onOpenSwarm,
  onOpenLevelDesigner,
}) => {
  const [activeTab, setActiveTab] = useState<'ROSTER' | 'TOWER'>('ROSTER');
  const [selectionSlot, setSelectionSlot] = useState<'P1_LEAD' | 'P1_TAG'>('P1_LEAD');
  const [transitionStage, setTransitionStage] = useState<'IDLE' | 'LOCK_IN'>('IDLE');

  // Core 4 Mortal Kombat Roster
  const characters = CORE_CHARACTER_IDS.map((id) => CHARACTERS[id]).filter(Boolean);
  const p1 = CHARACTERS[p1CharId] || CHARACTERS['scorpion'];
  const p1Partner = CHARACTERS[p1PartnerId] || CHARACTERS['johnny'];
  const cpu = CHARACTERS[cpuCharId] || CHARACTERS['subzero'];
  const currentTower = TOWERS[selectedTower] || TOWERS['MASTER'];
  const bossDef = CHARACTERS['scorpion'];

  const getElementIcon = (id: string) => {
    switch (id) {
      case 'scorpion':
        return <Flame className="w-3.5 h-3.5 text-amber-500" />;
      case 'subzero':
        return <Snowflake className="w-3.5 h-3.5 text-cyan-400" />;
      case 'smoke':
        return <Wind className="w-3.5 h-3.5 text-slate-300" />;
      case 'raiden':
        return <Zap className="w-3.5 h-3.5 text-blue-400" />;
      case 'liukang':
        return <Flame className="w-3.5 h-3.5 text-red-500" />;
      case 'sonya':
        return <Shield className="w-3.5 h-3.5 text-emerald-400" />;
      case 'johnny':
        return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case 'noob':
        return <Wind className="w-3.5 h-3.5 text-purple-400" />;
      case 'reptile':
        return <Skull className="w-3.5 h-3.5 text-green-400" />;
      case 'kunglao':
        return <Swords className="w-3.5 h-3.5 text-yellow-300" />;
      case 'kitana':
        return <Wind className="w-3.5 h-3.5 text-sky-400" />;
      case 'mileena':
        return <Crosshair className="w-3.5 h-3.5 text-pink-400" />;
      case 'goro':
        return <Crosshair className="w-3.5 h-3.5 text-orange-600" />;
      case 'robocop':
        return <Crosshair className="w-3.5 h-3.5 text-slate-300" />;
      case 'leonardo':
        return <Swords className="w-3.5 h-3.5 text-blue-500" />;
      case 'shangtsung':
        return <Flame className="w-3.5 h-3.5 text-yellow-500" />;
      default:
        return <Swords className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  const handleHover = () => {
    if (transitionStage !== 'IDLE') return;
    RetroAudio.playHover();
  };

  const handleSelectFighter = (id: CharacterId) => {
    if (transitionStage !== 'IDLE') return;
    RetroAudio.playSelect();
    RetroAudio.announce(id.toUpperCase());

    if (selectionSlot === 'P1_LEAD') {
      onSelectP1(id);
      if (id === p1PartnerId) {
        const remaining = characters.filter((c) => c.id !== id);
        onSelectP1Partner(remaining[0].id as CharacterId);
      }
    } else {
      if (id === p1CharId) {
        onSelectP1(p1PartnerId);
        onSelectP1Partner(id);
      } else {
        onSelectP1Partner(id);
      }
    }
  };

  const handleSelectTowerTier = (tier: TowerTier) => {
    if (transitionStage !== 'IDLE') return;
    RetroAudio.playSelect();
    onSelectTower(tier);
    RetroAudio.announce('CHOOSE_YOUR_DESTINY');
  };

  const handleRandomize = () => {
    if (transitionStage !== 'IDLE') return;
    RetroAudio.playSelect();
    const pool = characters.map((c) => c.id as CharacterId);
    const randP1 = pool[Math.floor(Math.random() * pool.length)];
    let randPartner = pool[Math.floor(Math.random() * pool.length)];
    while (randPartner === randP1 && pool.length > 1) {
      randPartner = pool[Math.floor(Math.random() * pool.length)];
    }
    onSelectP1(randP1);
    onSelectP1Partner(randPartner);
    RetroAudio.announce(randP1.toUpperCase());
  };

  const handleStartFight = (isTower: boolean) => {
    if (transitionStage !== 'IDLE') return;
    RetroAudio.enableAudio();
    setTransitionStage('LOCK_IN');
    RetroAudio.playSelect();
    RetroAudio.announce(p1.id.toUpperCase());

    setTimeout(() => {
      onStartFight(isTower);
    }, 280);
  };

  return (
    <div className="absolute inset-0 z-40 bg-[#050508] text-slate-100 flex flex-col justify-between items-center p-2 sm:p-3 overflow-hidden select-none">
      {/* Background ambient crimson lighting */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.16)_0%,rgba(127,29,29,0.08)_50%,transparent_80%)]" />

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-6xl flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-zinc-950/90 border border-red-900/40 shrink-0">
        <div className="flex items-center gap-2.5">
          <h1 className="font-kombat text-base sm:text-lg font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-500 to-red-500 whitespace-nowrap">
            MORTAL KOMBAT
          </h1>
          <span className="text-zinc-600 font-mono text-xs hidden sm:inline">·</span>
          <span className="text-zinc-400 font-mono text-[10px] hidden md:inline whitespace-nowrap">
            Choose Your Fighter
          </span>
        </div>

        {/* Mode Switch Tabs */}
        <div className="flex items-center gap-1 bg-zinc-900/90 p-0.5 rounded-lg border border-zinc-800">
          <button
            onClick={() => {
              setActiveTab('ROSTER');
              RetroAudio.playSelect();
            }}
            className={`px-3 py-1.5 text-[10px] font-mono font-bold rounded-md transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer ${
              activeTab === 'ROSTER'
                ? 'bg-gradient-to-r from-red-700 to-amber-600 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Swords className="w-3 h-3 text-amber-300" />
            <span>Kombat Roster</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('TOWER');
              RetroAudio.announce('CHOOSE_YOUR_DESTINY');
            }}
            className={`px-3 py-1.5 text-[10px] font-mono font-bold rounded-md transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer ${
              activeTab === 'TOWER'
                ? 'bg-gradient-to-r from-red-700 to-amber-600 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3 h-3 text-amber-300" />
            <span>Destiny Tower</span>
          </button>
        </div>

        {/* Arena Stage Selector, AI Level Designer & Swarm Architect */}
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          {onOpenLevelDesigner && (
            <button
              onClick={() => {
                RetroAudio.playSelect();
                onOpenLevelDesigner();
              }}
              className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-purple-500/50 text-purple-300 font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
              title="Open 1960s Vancouver AI Level Designer"
            >
              <Wand2 className="w-3 h-3 text-purple-400" />
              <span className="hidden sm:inline">1960s Architect</span>
            </button>
          )}
          {onOpenSwarm && (
            <button
              onClick={() => {
                RetroAudio.playSelect();
                onOpenSwarm();
              }}
              className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-amber-500/50 text-amber-300 font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
              title="Open AI Swarm Architect"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">Swarm</span>
            </button>
          )}
          <select
            value={activeStage}
            onChange={(e) => onSelectStage(e.target.value as StageId)}
            aria-label="Select combat stage"
            className="bg-zinc-900 border border-zinc-700 text-amber-400 px-2 py-1 rounded-md text-[10px] font-bold focus:outline-none focus:border-amber-500"
          >
            {Object.values(STAGES).map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 w-full max-w-6xl flex-1 grid grid-cols-12 gap-2 sm:gap-3 py-2 items-stretch min-h-0 overflow-y-auto lg:overflow-hidden">
        {activeTab === 'TOWER' ? (
          <>
            {/* Left Column: 3 Destiny Stone Pillars */}
            <div className="col-span-12 lg:col-span-8 flex flex-col justify-between bg-zinc-950/85 border border-zinc-800 rounded-xl p-2.5 sm:p-3 min-h-0">
              <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800 text-[11px] font-mono">
                <span className="text-zinc-300 font-bold tracking-wider">
                  CHOOSE YOUR DESTINY
                </span>
                <span className="text-amber-400 font-bold">
                  Final Boss: {bossDef.name}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3 my-2 flex-1 min-h-0 items-end">
                {(['NOVICE', 'WARRIOR', 'MASTER'] as TowerTier[]).map((tierKey) => {
                  const tower = TOWERS[tierKey];
                  const isSelected = selectedTower === tierKey;
                  const reversedStack = [...tower.fighters].reverse();

                  return (
                    <div
                      key={tierKey}
                      onClick={() => handleSelectTowerTier(tierKey)}
                      onMouseEnter={handleHover}
                      className={`relative flex flex-col justify-end p-1.5 rounded-lg border-2 transition-all cursor-pointer h-full max-h-[380px] sm:max-h-[430px] group ${
                        isSelected
                          ? 'border-amber-500 bg-gradient-to-t from-zinc-950 via-zinc-900 to-red-950/30 shadow-[0_0_20px_rgba(220,38,38,0.3)]'
                          : 'border-zinc-800 bg-zinc-950/80 hover:border-zinc-600'
                      }`}
                    >
                      <div className="text-center py-1 bg-zinc-900/90 border border-zinc-700/80 rounded mb-1">
                        <div className="font-kombat text-[10px] sm:text-xs font-black tracking-wider text-amber-300 flex items-center justify-center gap-1">
                          {tierKey === 'MASTER' && <Crown className="w-3 h-3 text-amber-400" />}
                          <span>{tower.title.split('(')[0]}</span>
                        </div>
                        <div className="text-[8px] font-mono text-zinc-400 font-bold">
                          {tower.fighterCount} Kombatants
                        </div>
                      </div>

                      <div className="flex flex-col-reverse gap-1 justify-end flex-1 overflow-y-auto">
                        {reversedStack.map((fId, index) => {
                          const charDef = CHARACTERS[fId] || CHARACTERS['scorpion'];
                          const isBoss = index === reversedStack.length - 1;
                          const stepNumber = index + 1;

                          return (
                            <div
                              key={`${tierKey}_${fId}_${index}`}
                              className={`relative px-1.5 py-0.5 rounded border flex items-center justify-between text-[9px] font-mono ${
                                isBoss
                                  ? 'bg-gradient-to-r from-red-950 via-zinc-900 to-black border-amber-500 text-amber-200 font-black'
                                  : 'bg-zinc-900/90 border-zinc-800 text-zinc-300'
                              }`}
                            >
                              <div className="flex items-center gap-1 truncate">
                                <span className="text-[8px] text-zinc-500 font-bold w-3 text-right">
                                  {stepNumber}
                                </span>
                                <span className="font-kombat font-bold truncate text-[9.5px]" style={{ color: isBoss ? '#fbbf24' : charDef.themeColor }}>
                                  {charDef.name}
                                </span>
                              </div>
                              <div className="shrink-0 hidden sm:block">
                                {isBoss ? <Crown className="w-3 h-3 text-amber-400" /> : getElementIcon(charDef.id)}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-1 pt-1 border-t border-zinc-800 text-center">
                        <span className={`text-[8px] font-mono font-bold uppercase ${isSelected ? 'text-amber-400' : 'text-zinc-500'}`}>
                          {isSelected ? 'Selected' : 'Select'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-1.5 border-t border-zinc-800 text-[10px] font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400">Tag Duo:</span>
                  <span className="text-amber-400 font-bold">{p1.name}</span>
                  <span className="text-zinc-600">/</span>
                  <span className="text-cyan-400 font-bold">{p1Partner.name}</span>
                </div>
                <button
                  onClick={handleRandomize}
                  className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Shuffle className="w-3 h-3 text-red-400" />
                  <span>Randomize</span>
                </button>
              </div>
            </div>

            {/* Right Column: Tower Boss & Start */}
            <div className="col-span-12 lg:col-span-4 flex flex-col justify-between bg-zinc-950/90 border border-zinc-800 rounded-xl p-3 font-mono">
              <div>
                <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800 text-[10px]">
                  <span className="text-zinc-300 font-bold uppercase">{currentTower.title}</span>
                  <span className="text-amber-400 font-bold">{currentTower.fighterCount} Tiers</span>
                </div>

                {/* Boss Spotlight */}
                <div className="mt-2.5 p-2.5 rounded-lg bg-gradient-to-br from-red-950/40 via-zinc-900 to-black border border-amber-500/50">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-black border border-amber-500 flex items-center justify-center font-kombat font-black text-amber-400 text-sm">
                      {bossDef.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-kombat font-black text-sm text-amber-400 block">
                        {bossDef.name}
                      </span>
                      <div className="text-[9px] text-zinc-400">
                        {bossDef.title} · Final Tower Boss
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-300 italic mt-2">
                    "{bossDef.quote}"
                  </p>
                </div>

                <div className="mt-3">
                  <span className="text-[9px] text-zinc-400 font-bold uppercase block mb-1.5">
                    Selected Tag Team
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div
                      onClick={() => setSelectionSlot('P1_LEAD')}
                      className="p-2 rounded-lg bg-zinc-900 border border-amber-500/70 cursor-pointer"
                    >
                      <span className="text-[8px] font-bold text-amber-400 block">LEAD</span>
                      <span className="font-kombat font-bold text-xs text-white truncate block">{p1.name}</span>
                      <span className="text-[8px] text-zinc-400 truncate block">{p1.title}</span>
                    </div>

                    <div
                      onClick={() => setSelectionSlot('P1_TAG')}
                      className="p-2 rounded-lg bg-zinc-900 border border-cyan-500/70 cursor-pointer"
                    >
                      <span className="text-[8px] font-bold text-cyan-400 block">PARTNER</span>
                      <span className="font-kombat font-bold text-xs text-white truncate block">{p1Partner.name}</span>
                      <span className="text-[8px] text-zinc-400 truncate block">{p1Partner.title}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <button
                  onClick={() => handleStartFight(true)}
                  className="w-full min-h-[48px] py-3 rounded-xl bg-gradient-to-r from-red-700 via-red-600 to-amber-500 hover:from-red-600 hover:to-amber-400 text-white font-kombat font-black text-sm tracking-widest uppercase shadow-[0_0_20px_rgba(220,38,38,0.45)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-amber-400/70 cursor-pointer whitespace-nowrap"
                >
                  <Play className="w-4 h-4 fill-white shrink-0" />
                  <span>ASCEND TOWER</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Left Column: 16-Fighter Selectable Grid */}
            <div className="col-span-12 lg:col-span-8 flex flex-col justify-between bg-zinc-950/85 border border-zinc-800 rounded-xl p-2 sm:p-3 min-h-0">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-zinc-800 text-[10px] font-mono">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectionSlot('P1_LEAD')}
                    className={`px-2.5 py-1 rounded text-[9px] font-bold whitespace-nowrap cursor-pointer ${
                      selectionSlot === 'P1_LEAD'
                        ? 'bg-amber-400 text-black'
                        : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                    }`}
                  >
                    Lead: {p1.name}
                  </button>
                  <button
                    onClick={() => setSelectionSlot('P1_TAG')}
                    className={`px-2.5 py-1 rounded text-[9px] font-bold whitespace-nowrap cursor-pointer ${
                      selectionSlot === 'P1_TAG'
                        ? 'bg-cyan-400 text-black'
                        : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                    }`}
                  >
                    Tag: {p1Partner.name}
                  </button>
                </div>
                <span className="text-zinc-400 text-[9px] hidden sm:inline">4 Core Kombatants Ready</span>
              </div>

              {/* 2x2 Core Grid */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 my-2 flex-1 min-h-0 overflow-y-auto pr-0.5">
                {characters.map((char) => {
                  const isLead = char.id === p1CharId;
                  const isPartner = char.id === p1PartnerId;
                  const isCpu = char.id === cpuCharId;

                  const isFlashing = transitionStage === 'LOCK_IN' && isLead;

                  return (
                    <div
                      key={char.id}
                      onClick={() => handleSelectFighter(char.id as CharacterId)}
                      onMouseEnter={handleHover}
                      className={`group relative p-2 rounded-lg border transition-all duration-150 cursor-pointer flex flex-col justify-between min-h-[70px] ${
                        isFlashing
                          ? 'bg-amber-500 text-black border-amber-300 ring-2 ring-amber-300'
                          : isLead
                          ? 'bg-gradient-to-br from-zinc-900 via-zinc-950 to-amber-950/30 border-amber-500 ring-1 ring-amber-400/70'
                          : isPartner
                          ? 'bg-gradient-to-br from-zinc-900 to-zinc-950 border-cyan-500 ring-1 ring-cyan-400/60'
                          : 'bg-zinc-950/90 border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div
                            className="w-9 h-9 rounded-md border flex items-center justify-center shrink-0 overflow-hidden bg-zinc-900/90"
                            style={{ borderColor: char.accentColor }}
                          >
                            <SpritePortraitCanvas
                              charId={char.id as CharacterId}
                              width={36}
                              height={36}
                              track="idle"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="font-kombat font-bold text-[11px] text-white truncate">
                                {char.name.split(' ')[0]}
                              </span>
                              {getElementIcon(char.id)}
                            </div>
                            <div className="text-[8px] font-mono text-zinc-400 truncate">
                              {char.realm}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-0.5 shrink-0 font-mono text-[8px] font-bold">
                          {isLead && <span className="text-amber-400">P1</span>}
                          {isPartner && <span className="text-cyan-400">TAG</span>}
                          {isCpu && <span className="text-red-400">CPU</span>}
                        </div>
                      </div>

                      <div className="mt-1.5 pt-1 border-t border-zinc-800/80 flex items-center justify-between text-[8px] font-mono">
                        <span className="text-zinc-400 truncate">
                          {char.title}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCpu(char.id as CharacterId);
                            RetroAudio.playSelect();
                            RetroAudio.announce(char.id.toUpperCase());
                          }}
                          className={`px-1.5 py-0.5 rounded text-[8px] font-bold cursor-pointer ${
                            isCpu ? 'bg-red-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                          }`}
                        >
                          {isCpu ? 'VS' : '+CPU'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-1.5 border-t border-zinc-800 text-[10px] font-mono">
                <button
                  onClick={handleRandomize}
                  className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-700 hover:border-amber-500 text-zinc-300 hover:text-white font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Shuffle className="w-3 h-3 text-red-400" />
                  <span>Randomize Duo</span>
                </button>
                <span className="text-zinc-500 text-[9px] hidden sm:inline">
                  Tap fighter to assign · Tap +CPU for opponent
                </span>
              </div>
            </div>

            {/* Right Column: Selected Fighters & Start CTA */}
            <div className="col-span-12 lg:col-span-4 flex flex-col justify-between bg-zinc-950/90 border border-zinc-800 rounded-xl p-3 font-mono">
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800 text-[10px]">
                  <span className="text-zinc-300 font-bold uppercase">Matchup</span>
                  <span className="text-red-400 font-bold">{p1.name} vs {cpu.name}</span>
                </div>

                {/* Lead with Live Animated Sprite */}
                <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-amber-500/50 flex items-center gap-3">
                  <div className="w-14 h-16 rounded-lg bg-black/80 border border-amber-500/60 flex items-center justify-center shrink-0 overflow-hidden">
                    <SpritePortraitCanvas charId={p1.id} width={56} height={64} track="special1" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-[8px] text-amber-400 font-bold">
                      <span>LEAD FIGHTER</span>
                      <span className="text-zinc-400 truncate ml-1">{p1.realm}</span>
                    </div>
                    <h3 className="font-kombat text-base font-black mt-0.5 truncate" style={{ color: p1.themeColor }}>
                      {p1.name}
                    </h3>
                    <p className="text-[9px] text-zinc-400 italic truncate">"{p1.quote}"</p>
                  </div>
                </div>

                {/* Opponent Preview with Live Animated Sprite */}
                <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-red-500/45 flex items-center gap-3">
                  <div className="w-14 h-16 rounded-lg bg-black/80 border border-red-500/60 flex items-center justify-center shrink-0 overflow-hidden">
                    <SpritePortraitCanvas charId={cpu.id} width={56} height={64} track="idle" facing={-1} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-[8px] text-red-400 font-bold">
                      <span>OPPONENT</span>
                      <span className="text-zinc-400 truncate ml-1">{cpu.realm}</span>
                    </div>
                    <h3 className="font-kombat text-base font-black mt-0.5 truncate" style={{ color: cpu.themeColor }}>
                      {cpu.name}
                    </h3>
                    <p className="text-[9px] text-zinc-400 italic truncate">"{cpu.quote}"</p>
                  </div>
                </div>

                {/* Tag Partner */}
                <div className="p-2 rounded-lg bg-zinc-900/70 border border-cyan-500/45 flex items-center justify-between text-[10px]">
                  <span className="text-cyan-400 font-bold">TAG: {p1Partner.name}</span>
                  <span className="text-zinc-400 truncate ml-2">{p1Partner.title}</span>
                </div>
              </div>

              <div className="mt-3">
                <button
                  onClick={() => handleStartFight(false)}
                  className="w-full min-h-[48px] py-3 rounded-xl bg-gradient-to-r from-red-700 via-red-600 to-amber-500 hover:from-red-600 hover:to-amber-400 text-white font-kombat font-black text-sm tracking-widest uppercase shadow-[0_0_20px_rgba(220,38,38,0.45)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-amber-400/70 cursor-pointer whitespace-nowrap"
                >
                  <Play className="w-4 h-4 fill-white shrink-0" />
                  <span>FIGHT!</span>
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
