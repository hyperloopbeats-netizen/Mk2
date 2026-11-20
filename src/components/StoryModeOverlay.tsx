/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  CharacterId,
  CORE_CHARACTER_IDS,
  StoryCampaignState,
  StoryChoice,
  StoryNode,
} from '../types/fighter';
import { CHARACTERS, STAGES } from '../game/constants';
import {
  STORY_NODES,
  computeStoryPerkBonuses,
  getStoryNodeById,
} from '../game/StoryEngine';
import { PlotArtCanvas } from './PlotArtCanvas';
import { SpritePortraitCanvas } from './SpritePortraitCanvas';
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Lock,
  RotateCcw,
  Sparkles,
  Swords,
  Wand2,
  X,
} from 'lucide-react';
import { RetroAudio } from '../audio/RetroSynth';

interface StoryModeOverlayProps {
  mode: 'STORY_MAP' | 'STORY_CUTSCENE';
  campaign: StoryCampaignState;
  playerCharId: CharacterId;
  isLoadingCutscene: boolean;
  onSelectPlayerChar: (id: CharacterId) => void;
  onSelectNode: (node: StoryNode) => void;
  onLaunchNodeFight: (choice?: StoryChoice | null) => void;
  onBackToMap: () => void;
  onResetCampaign: () => void;
  onOpenLevelDesigner: () => void;
  onExitStory: () => void;
}

export const StoryModeOverlay: React.FC<StoryModeOverlayProps> = ({
  mode,
  campaign,
  playerCharId,
  isLoadingCutscene,
  onSelectPlayerChar,
  onSelectNode,
  onLaunchNodeFight,
  onBackToMap,
  onResetCampaign,
  onOpenLevelDesigner,
  onExitStory,
}) => {
  const [selectedMapNodeId, setSelectedMapNodeId] = useState<string>(
    campaign.currentNodeId || 'lions_gate_1962'
  );
  const [lineIndex, setLineIndex] = useState<number>(0);
  const [hoveredChoice, setHoveredChoice] = useState<StoryChoice | null>(null);
  const [selectedArtIdx, setSelectedArtIdx] = useState<number>(
    Math.max(0, campaign.artEvolutionHistory.length - 1)
  );

  useEffect(() => {
    if (campaign.currentNodeId) {
      setSelectedMapNodeId(campaign.currentNodeId);
    }
  }, [campaign.currentNodeId]);

  useEffect(() => {
    setSelectedArtIdx(Math.max(0, campaign.artEvolutionHistory.length - 1));
  }, [campaign.artEvolutionHistory.length]);

  useEffect(() => {
    setLineIndex(0);
    setHoveredChoice(null);
  }, [campaign.pendingCutscene?.nodeId]);

  const selectedNode = useMemo(
    () => getStoryNodeById(selectedMapNodeId) || STORY_NODES[0],
    [selectedMapNodeId]
  );

  const perkBonuses = useMemo(
    () => computeStoryPerkBonuses(campaign.unlockedPerks),
    [campaign.unlockedPerks]
  );

  const isSelectedUnlocked = campaign.unlockedNodeIds.includes(selectedNode.id);
  const isSelectedDone = campaign.completedNodeIds.includes(selectedNode.id);
  const activeArtStage =
    campaign.artEvolutionHistory[selectedArtIdx] ||
    campaign.artEvolutionHistory[0];

  const cutscene = campaign.pendingCutscene;
  const previewArt = useMemo(() => {
    if (!cutscene) return activeArtStage;
    if (!hoveredChoice) return cutscene.plotArt;
    return {
      ...cutscene.plotArt,
      riftFracture: Math.max(
        0.05,
        Math.min(1, cutscene.plotArt.riftFracture + hoveredChoice.riftShift)
      ),
      silhouettePose: hoveredChoice.riftShift > 0 ? ('CLASH' as const) : ('STRIKE' as const),
      focalColor: hoveredChoice.riftShift > 0 ? '#f43f5e' : '#38bdf8',
    };
  }, [cutscene, hoveredChoice, activeArtStage]);

  const storyRoster: CharacterId[] = [...CORE_CHARACTER_IDS];

  if (mode === 'STORY_CUTSCENE') {
    const lines = cutscene?.lines || [];
    const safeIdx = Math.min(lineIndex, Math.max(0, lines.length - 1));
    const currentLine = lines[safeIdx];
    const atDialogueEnd = lines.length === 0 || safeIdx >= lines.length - 1;

    return (
      <div className="fixed inset-0 z-45 bg-[#05050b]/96 backdrop-blur-md text-slate-100 flex flex-col overflow-hidden select-none">
        {/* Top Cutscene Bar */}
        <header className="px-4 py-2.5 bg-zinc-950/90 border-b border-amber-500/30 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-kombat font-black text-sm sm:text-base text-amber-300 truncate">
                {cutscene?.title || selectedNode.title}
              </h2>
              <p className="font-mono text-[10px] text-zinc-400 truncate">
                Chapter {cutscene?.chapterNum ?? campaign.completedNodeIds.length + 1} · Vancouver{' '}
                {selectedNode.year} · Plot Art Evolution
              </p>
            </div>
          </div>

          <button
            onClick={onBackToMap}
            className="min-h-[40px] px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>District Map</span>
          </button>
        </header>

        {/* Split Widescreen Showcase: Evolving Plot Art + Gemini Narrative & Choices */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 max-w-6xl w-full mx-auto grid grid-cols-12 gap-4 items-start">
          {/* Left: Live Plot Art Canvas */}
          <div className="col-span-12 lg:col-span-7 flex flex-col gap-2">
            <div className="relative rounded-xl overflow-hidden border border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.18)]">
              <PlotArtCanvas art={previewArt} width={640} height={340} className="w-full h-auto" />
              {isLoadingCutscene && (
                <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center gap-2 font-mono text-xs text-amber-300">
                  <Sparkles className="w-6 h-6 animate-pulse text-amber-400" />
                  <span>WEAVING 1960s VANCOUVER CHRONICLE...</span>
                </div>
              )}
            </div>

            {cutscene && (
              <div className="px-3 py-2 rounded-lg bg-zinc-950/90 border border-zinc-800 font-mono text-[11px] flex flex-wrap items-center justify-between gap-2">
                <span className="text-cyan-300 font-bold">
                  DIRECTIVE: <span className="text-zinc-300 font-normal">{cutscene.arenaDirective}</span>
                </span>
                <span className="text-[10px] text-zinc-500 uppercase">
                  {cutscene.source === 'GEMINI_NARRATIVE' ? 'GEMINI STORY ENGINE' : 'VANCOUVER CHRONICLE'}
                </span>
              </div>
            )}
          </div>

          {/* Right: Dialogue Box & Branching Tactical Choices */}
          <div className="col-span-12 lg:col-span-5 flex flex-col gap-3">
            <div className="p-3.5 rounded-xl bg-zinc-950/95 border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between font-mono text-[10px] text-zinc-400 border-b border-zinc-800 pb-1.5">
                <span>VS {CHARACTERS[selectedNode.opponentId]?.name}</span>
                <span>{STAGES[selectedNode.stageId]?.name}</span>
              </div>

              <p className="font-mono text-xs text-zinc-300 leading-relaxed">
                {cutscene?.summary || selectedNode.description}
              </p>

              {currentLine && (
                <div className="p-3 rounded-lg bg-zinc-900/90 border-l-4 border-amber-500 space-y-1">
                  <div className="flex items-center justify-between font-mono text-[10px] font-bold">
                    <span style={{ color: currentLine.color }}>{currentLine.speaker}</span>
                    <span className="text-zinc-500">
                      {safeIdx + 1}/{lines.length}
                    </span>
                  </div>
                  <p className="font-sans text-sm text-white leading-snug">
                    "{currentLine.text}"
                  </p>
                </div>
              )}

              {!atDialogueEnd && (
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      RetroAudio.playSelect();
                      setLineIndex(lines.length - 1);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white font-mono text-[11px] font-bold cursor-pointer whitespace-nowrap"
                  >
                    Skip Intro
                  </button>
                  <button
                    onClick={() => {
                      RetroAudio.playSelect();
                      setLineIndex((prev) => Math.min(lines.length - 1, prev + 1));
                    }}
                    className="min-h-[44px] px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-kombat font-black text-xs tracking-wider flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <span>NEXT LINE</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Branching Choices (shown at dialogue end or directly interactive) */}
            {atDialogueEnd && cutscene && (
              <div className="space-y-2">
                <div className="font-mono text-[10px] font-bold text-amber-400 tracking-wider uppercase">
                  CHOOSE YOUR TACTICAL PATH &amp; EVOLVE THE ART
                </div>
                {cutscene.choices.map((choice) => (
                  <button
                    key={choice.id}
                    onMouseEnter={() => setHoveredChoice(choice)}
                    onFocus={() => setHoveredChoice(choice)}
                    onMouseLeave={() => setHoveredChoice(null)}
                    onClick={() => {
                      RetroAudio.enableAudio();
                      RetroAudio.playGong(0.75);
                      onLaunchNodeFight(choice);
                    }}
                    className="w-full text-left p-3 rounded-xl bg-zinc-900/95 hover:bg-zinc-900 border border-zinc-700 hover:border-amber-400 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-kombat font-black text-xs text-amber-300 group-hover:text-amber-200">
                        {choice.label}
                      </span>
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-black/70 border border-cyan-500/40 text-cyan-300 whitespace-nowrap">
                        {choice.unlockedPerk.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-zinc-300 mt-1">
                      {choice.tacticalEffect}
                    </p>
                    <p className="font-mono text-[10px] text-zinc-500 mt-0.5">
                      {choice.narrativeDirection}
                    </p>
                  </button>
                ))}

                <button
                  onClick={() => {
                    RetroAudio.enableAudio();
                    RetroAudio.playSelect();
                    onLaunchNodeFight(null);
                  }}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-700 to-amber-600 hover:from-red-600 hover:to-amber-500 text-white font-kombat font-black text-xs tracking-widest flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <Swords className="w-4 h-4" />
                  <span>ENTER KOMBAT IMMEDIATELY</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // STORY_MAP: Non-Linear 1960s Vancouver Progression Graph + Plot Art Timeline
  return (
    <div className="fixed inset-0 z-45 bg-[#05050a]/96 backdrop-blur-md text-slate-100 flex flex-col overflow-hidden select-none">
      {/* Header */}
      <header className="px-4 py-2.5 bg-zinc-950/90 border-b border-red-900/40 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <Compass className="w-5 h-5 text-amber-400" />
          <div>
            <h1 className="font-kombat text-sm sm:text-base font-black tracking-widest text-amber-300">
              1960s VANCOUVER CHRONICLE
            </h1>
            <p className="font-mono text-[10px] text-zinc-400">
              Non-Linear Branching Campaign · Conquered {campaign.completedNodeIds.length}/
              {STORY_NODES.length} Districts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => {
              RetroAudio.playSelect();
              onOpenLevelDesigner();
            }}
            className="min-h-[40px] px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-purple-500/60 text-purple-300 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>AI Level Designer</span>
          </button>

          <button
            onClick={() => {
              RetroAudio.playSelect();
              onResetCampaign();
            }}
            className="min-h-[40px] px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            title="Reset Story Campaign"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            onClick={onExitStory}
            className="min-h-[40px] px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 max-w-6xl w-full mx-auto grid grid-cols-12 gap-3">
        {/* Left: Non-Linear District Graph & Plot Art Evolution Strip */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-3">
          {/* Interactive Branching Node Map */}
          <div className="relative h-[290px] sm:h-[330px] rounded-xl bg-gradient-to-br from-[#07111e] via-[#0c1424] to-[#1a0b24] border border-zinc-800 overflow-hidden p-3">
            {/* Subtle Map Grid */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(56,189,248,0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(56,189,248,0.25) 1px, transparent 1px)',
                backgroundSize: '36px 36px',
              }}
            />

            {/* SVG Branch Connectors */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              {STORY_NODES.flatMap((from) =>
                from.nextNodes.map((targetId) => {
                  const to = getStoryNodeById(targetId);
                  if (!to) return null;
                  const unlocked =
                    campaign.completedNodeIds.includes(from.id) &&
                    campaign.unlockedNodeIds.includes(to.id);
                  return (
                    <line
                      key={`${from.id}_${to.id}`}
                      x1={from.xPct}
                      y1={from.yPct}
                      x2={to.xPct}
                      y2={to.yPct}
                      stroke={unlocked ? '#f59e0b' : '#334155'}
                      strokeWidth={unlocked ? 0.75 : 0.45}
                      strokeDasharray={unlocked ? undefined : '1.5 1.5'}
                    />
                  );
                })
              )}
            </svg>

            {/* District Nodes */}
            {STORY_NODES.map((node) => {
              const unlocked = campaign.unlockedNodeIds.includes(node.id);
              const done = campaign.completedNodeIds.includes(node.id);
              const isSelected = selectedNode.id === node.id;

              return (
                <button
                  key={node.id}
                  onClick={() => {
                    RetroAudio.playSelect();
                    setSelectedMapNodeId(node.id);
                  }}
                  style={{ left: `${node.xPct}%`, top: `${node.yPct}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 min-w-[82px] max-w-[125px] px-2 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'z-20 bg-zinc-900 border-amber-400 ring-2 ring-amber-400/50 scale-105'
                      : done
                      ? 'z-10 bg-emerald-950/90 border-emerald-500/80 text-emerald-100'
                      : unlocked
                      ? 'z-10 bg-zinc-950/95 border-cyan-500/70 hover:border-amber-400'
                      : 'z-0 bg-zinc-950/80 border-zinc-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 font-mono text-[9px] font-bold">
                    <span className={unlocked ? 'text-amber-400' : 'text-zinc-500'}>
                      {node.year}
                    </span>
                    {done ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    ) : !unlocked ? (
                      <Lock className="w-3 h-3 text-zinc-500 shrink-0" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
                    )}
                  </div>
                  <div className="font-kombat font-bold text-[10px] text-white truncate mt-0.5">
                    {node.title}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Plot Art Evolution Strip */}
          <div className="p-3 rounded-xl bg-zinc-950/90 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between font-mono text-[10px]">
              <span className="text-amber-400 font-bold uppercase tracking-wider">
                Plot Art Evolution · {campaign.artEvolutionHistory.length} Stages
              </span>
              <span className="text-fuchsia-300 font-bold tabular-nums">
                Outworld Rift Intensity: {Math.round(campaign.riftCorruption * 100)}%
              </span>
            </div>

            <div className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-12 sm:col-span-5">
                <PlotArtCanvas
                  art={activeArtStage}
                  width={340}
                  height={165}
                  compact
                  className="w-full h-auto"
                />
              </div>
              <div className="col-span-12 sm:col-span-7 flex flex-col gap-2">
                <div>
                  <div className="font-kombat font-black text-sm text-white">
                    {activeArtStage.title}
                  </div>
                  <div className="font-mono text-[10px] text-zinc-400">
                    {activeArtStage.subtitle} · Weather: {activeArtStage.weather}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {campaign.artEvolutionHistory.map((stage, idx) => (
                    <button
                      key={`${stage.chapterId}_${idx}`}
                      onClick={() => setSelectedArtIdx(idx)}
                      className={`px-2 py-1 rounded font-mono text-[10px] font-bold border cursor-pointer whitespace-nowrap ${
                        idx === selectedArtIdx
                          ? 'bg-amber-500 text-zinc-950 border-amber-300'
                          : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-zinc-500'
                      }`}
                    >
                      #{idx + 1} · {stage.year}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Selected District Briefing, Hero Selector & Perks */}
        <div className="col-span-12 lg:col-span-4 flex flex-col justify-between gap-3 p-3.5 rounded-xl bg-zinc-950/95 border border-zinc-800">
          <div className="space-y-3">
            {/* Hero Pick */}
            <div>
              <span className="font-mono text-[10px] text-zinc-400 font-bold uppercase block mb-1.5">
                Protagonist Fighter
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {storyRoster.map((cid) => (
                  <button
                    key={cid}
                    onClick={() => {
                      RetroAudio.playSelect();
                      onSelectPlayerChar(cid);
                    }}
                    className={`p-1 rounded-lg border flex flex-col items-center cursor-pointer ${
                      playerCharId === cid
                        ? 'bg-amber-500/20 border-amber-400'
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
                    }`}
                    title={CHARACTERS[cid]?.name}
                  >
                    <SpritePortraitCanvas charId={cid} width={34} height={34} track="idle" />
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Node Card */}
            <div className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span className="text-amber-400 font-bold">
                  {selectedNode.year} · {selectedNode.district}
                </span>
                <span className={isSelectedDone ? 'text-emerald-400 font-bold' : isSelectedUnlocked ? 'text-cyan-400 font-bold' : 'text-zinc-500'}>
                  {isSelectedDone ? 'CONQUERED' : isSelectedUnlocked ? 'AVAILABLE' : 'LOCKED'}
                </span>
              </div>

              <h2 className="font-kombat font-black text-base text-white">
                {selectedNode.title}
              </h2>

              <p className="font-mono text-[11px] text-zinc-300 leading-relaxed">
                {selectedNode.description}
              </p>

              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between font-mono text-[10px]">
                <span className="text-red-400 font-bold">
                  BOSS: {CHARACTERS[selectedNode.opponentId]?.name}
                </span>
                <span className="text-cyan-300 font-bold">
                  PERK: {selectedNode.rewardPerk.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {/* Active Story Perks */}
            <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 font-mono text-[10px] space-y-1">
              <div className="text-zinc-400 font-bold uppercase">
                Active Chronicle Buffs ({campaign.unlockedPerks.length})
              </div>
              <div className="text-zinc-300">
                Gauge Gain: {Math.round(perkBonuses.gaugeGainMult * 100)}% · Strides:{' '}
                {Math.round(perkBonuses.strideBonusMult * 100)}% · Extra Breakers:{' '}
                +{perkBonuses.extraBreakers}
              </div>
              {campaign.unlockedPerks.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {campaign.unlockedPerks.map((perk) => (
                    <span
                      key={perk}
                      className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[9px]"
                    >
                      {perk.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            disabled={!isSelectedUnlocked}
            onClick={() => {
              RetroAudio.enableAudio();
              RetroAudio.playSelect();
              onSelectNode(selectedNode);
            }}
            className={`w-full min-h-[48px] py-3 px-4 rounded-xl font-kombat font-black text-sm tracking-widest flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
              isSelectedUnlocked
                ? 'bg-gradient-to-r from-red-700 via-red-600 to-amber-500 hover:from-red-600 hover:to-amber-400 text-white border border-amber-300/70 shadow-[0_0_20px_rgba(220,38,38,0.45)] cursor-pointer'
                : 'bg-zinc-900 text-zinc-500 border border-zinc-800 cursor-not-allowed'
            }`}
          >
            <Swords className="w-4 h-4" />
            <span>{isSelectedDone ? 'REPLAY CHAPTER' : 'ENTER CUTSCENE'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
