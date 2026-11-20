/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CharacterId,
  MovementMatrixDomain,
  SpatialDspProfile,
  StageId,
  SwarmSynthesisPatch,
} from '../types/fighter';
import {
  applySwarmPatch,
  getActiveSwarmPatch,
  getMatrixCellsByDomain,
} from '../game/MovementMatrix';
import { RetroAudio } from '../audio/RetroSynth';
import { runSwarmOrchestration, SwarmArchetypeFocus } from '../services/swarmClient';
import { Cpu, Layers, Sliders, Sparkles, Volume2, X, Check } from 'lucide-react';

interface SwarmArchitectModalProps {
  isOpen: boolean;
  p1CharId: CharacterId;
  cpuCharId: CharacterId;
  stageId: StageId;
  activeMatrixCellId: string;
  onPatchApplied: (patch: SwarmSynthesisPatch) => void;
  onClose: () => void;
}

const DOMAIN_LABELS: Record<MovementMatrixDomain, string> = {
  GROUND_LOCOMOTION: 'Ground Locomotion',
  AERIAL_FLIGHT: 'Aerial & Flight',
  COMBAT_OFFENSE: 'Combat Offense',
  DEFENSE_EVASION: 'Defense & Evasion',
  HIT_REACTION: 'Hit Reactions',
  CINEMATIC_FINISHER: 'Super & Fatalities',
};

export const SwarmArchitectModal: React.FC<SwarmArchitectModalProps> = ({
  isOpen,
  p1CharId,
  cpuCharId,
  stageId,
  activeMatrixCellId,
  onPatchApplied,
  onClose,
}) => {
  const [tab, setTab] = useState<'SWARM' | 'MATRIX' | 'AUDIO'>('SWARM');
  const [focusArchetype, setFocusArchetype] = useState<SwarmArchetypeFocus>('MIDWAY_ARCADE_PRECISION');
  const [customDirective, setCustomDirective] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [patch, setPatch] = useState<SwarmSynthesisPatch>(() => getActiveSwarmPatch());
  const [appliedFlash, setAppliedFlash] = useState<boolean>(false);
  const [dsp, setDsp] = useState<SpatialDspProfile>(() => RetroAudio.getDspProfile());
  const [testPan, setTestPan] = useState<'LEFT' | 'CENTER' | 'RIGHT'>('CENTER');

  if (!isOpen) return null;

  const groupedMatrix = getMatrixCellsByDomain();
  const panWorldX = testPan === 'LEFT' ? 180 : testPan === 'RIGHT' ? 780 : 480;

  const handleRunSwarm = async () => {
    RetroAudio.enableAudio();
    RetroAudio.playSelect();
    setIsRunning(true);
    const result = await runSwarmOrchestration({
      focusArchetype,
      p1CharId,
      cpuCharId,
      stageId,
      customDirective,
    });
    setPatch(result);
    setDsp(result.dspProfile);
    setIsRunning(false);
    RetroAudio.playGong(0.5);
  };

  const handleApplyPatch = () => {
    const active = applySwarmPatch({ ...patch, dspProfile: dsp });
    RetroAudio.setDspProfile(dsp);
    onPatchApplied(active);
    RetroAudio.playSelect();
    setAppliedFlash(true);
    setTimeout(() => setAppliedFlash(false), 1600);
  };

  const updateDspSlider = (key: keyof SpatialDspProfile, val: number) => {
    const next = { ...dsp, [key]: val };
    setDsp(next);
    RetroAudio.enableAudio();
    RetroAudio.setDspProfile({ [key]: val });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/88 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[88vh] flex flex-col bg-zinc-950 border border-amber-500/50 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.28)] overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2 bg-zinc-900/90">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-400 shrink-0" />
            <h3 className="font-kombat text-amber-400 text-xs sm:text-sm font-black tracking-wider uppercase">
              MK AI Swarm Framework Studio
            </h3>
          </div>

          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => setTab('SWARM')}
              className={`min-h-[34px] px-2.5 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                tab === 'SWARM' ? 'bg-red-700 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>AI Swarm (5 Agents)</span>
            </button>
            <button
              onClick={() => setTab('MATRIX')}
              className={`min-h-[34px] px-2.5 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                tab === 'MATRIX' ? 'bg-red-700 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Movement Matrix</span>
            </button>
            <button
              onClick={() => setTab('AUDIO')}
              className={`min-h-[34px] px-2.5 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                tab === 'AUDIO' ? 'bg-red-700 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Volume2 className="w-3 h-3" />
              <span>3D Spatial DSP</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
            aria-label="Close Swarm Studio"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-4 font-mono text-xs">
          {tab === 'SWARM' && (
            <>
              <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-amber-300 font-bold uppercase text-[11px]">
                    Swarm Orchestration Target: {p1CharId.toUpperCase()} vs {cpuCharId.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    Preserves SpriteSheetEngine skins &amp; palettes
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'MIDWAY_ARCADE_PRECISION', label: 'Midway Arcade Purity' },
                      { id: 'HYPER_JUGGLE_RUSHDOWN', label: 'Hyper Juggle Rushdown' },
                      { id: 'CINEMATIC_BRUTALITY_HEAVY', label: 'Heavy Brutality Cinema' },
                    ] as Array<{ id: SwarmArchetypeFocus; label: string }>
                  ).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setFocusArchetype(item.id)}
                      className={`min-h-[44px] px-3 py-2 rounded-lg border text-left transition-colors cursor-pointer ${
                        focusArchetype === item.id
                          ? 'bg-red-950/60 border-amber-400 text-amber-200 font-bold'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={customDirective}
                    onChange={(e) => setCustomDirective(e.target.value)}
                    placeholder="Optional synthesis directive (e.g. deeper sub-bass, longer juggle timing)..."
                    className="flex-1 min-h-[44px] px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-400 text-xs"
                  />
                  <button
                    onClick={handleRunSwarm}
                    disabled={isRunning}
                    className="min-h-[44px] px-4 py-2 rounded-lg bg-gradient-to-r from-red-700 to-amber-600 hover:from-red-600 hover:to-amber-500 disabled:opacity-60 text-white font-kombat font-black text-xs tracking-wider cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {isRunning ? 'SYNTHESIZING SWARM...' : 'DECONSTRUCT & SYNTHESIZE'}
                  </button>
                </div>
              </div>

              {/* Synthesized Patch Summary */}
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-amber-500/40 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-kombat font-black text-amber-300 text-sm">
                      {patch.patchTitle}
                    </h4>
                    <p className="text-[10px] text-zinc-400">
                      Source: {patch.source} · Model: {patch.modelUsed}
                    </p>
                  </div>
                  <button
                    onClick={handleApplyPatch}
                    className="min-h-[44px] px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-kombat font-black text-xs tracking-wider cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    {appliedFlash ? <Check className="w-4 h-4" /> : <Sliders className="w-4 h-4" />}
                    <span>{appliedFlash ? 'APPLIED TO ENGINE' : 'APPLY TO LIVE ENGINE'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                  <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                    <span className="text-zinc-500 block text-[9px]">SPEED / HITSTOP</span>
                    <span className="text-zinc-100 font-bold">
                      {patch.combatTuning.globalSpeedMult.toFixed(2)}x · {patch.combatTuning.hitstopScale.toFixed(2)}x
                    </span>
                  </div>
                  <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                    <span className="text-zinc-500 block text-[9px]">JUGGLE GRAVITY</span>
                    <span className="text-zinc-100 font-bold">
                      {patch.combatTuning.juggleGravityScale.toFixed(2)}x
                    </span>
                  </div>
                  <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                    <span className="text-zinc-500 block text-[9px]">WAKEUP INVULN</span>
                    <span className="text-zinc-100 font-bold">
                      {patch.combatTuning.wakeupInvulnFrames} frames
                    </span>
                  </div>
                  <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                    <span className="text-zinc-500 block text-[9px]">SUPER CHOREO</span>
                    <span className="text-zinc-100 font-bold">
                      {patch.superChoreography.barrageHits} beats · {patch.superChoreography.freezeMs}ms
                    </span>
                  </div>
                </div>
              </div>

              {/* 5 Agent Swarm Reports */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {patch.agentReports.map((agent) => (
                  <div
                    key={agent.agentName}
                    className="p-3 rounded-xl bg-zinc-900/75 border border-zinc-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-kombat font-bold text-amber-400 text-xs">
                        {agent.agentName}
                      </span>
                      <span className="text-[9px] text-cyan-400 uppercase">{agent.status}</span>
                    </div>
                    <div className="text-[10px] text-zinc-400">{agent.role}</div>
                    <p className="text-[11px] text-zinc-200 leading-snug">{agent.summary}</p>
                    <ul className="space-y-0.5 text-[10px] text-zinc-400 list-disc pl-4">
                      {agent.recommendations.map((rec, i) => (
                        <li key={`${agent.agentName}_rec_${i}`}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'MATRIX' && (
            <div className="space-y-4">
              <p className="text-[11px] text-zinc-400">
                Every combat state routes cleanly through a Movement Matrix cell bound directly to{' '}
                <span className="text-amber-300">SpriteSheetEngine</span> tracks, elevation gates, and spatialized SFX.
              </p>

              {(Object.keys(groupedMatrix) as MovementMatrixDomain[]).map((domain) => (
                <div key={domain} className="space-y-1.5">
                  <h4 className="text-amber-400 font-kombat font-bold text-xs uppercase tracking-wider border-b border-zinc-800 pb-1">
                    {DOMAIN_LABELS[domain]} ({groupedMatrix[domain].length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {groupedMatrix[domain].map((cell) => {
                      const isLive = cell.id === activeMatrixCellId;
                      return (
                        <div
                          key={cell.id}
                          className={`p-2.5 rounded-lg border ${
                            isLive
                              ? 'bg-red-950/45 border-amber-400'
                              : 'bg-zinc-900/65 border-zinc-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <strong className="text-zinc-100 text-[11px]">{cell.name}</strong>
                            <span className="text-[9px] text-cyan-300">
                              skin:{cell.spriteTrack} · {cell.fps}fps
                            </span>
                          </div>
                          <div className="text-[10px] text-amber-300/90 mt-0.5">
                            S/A/R: {cell.frameTiming.startup}/{cell.frameTiming.active}/
                            {cell.frameTiming.recovery}f · Hit/Blk: {cell.frameTiming.hitstun}/
                            {cell.frameTiming.blockstun}f · SFX: {cell.spatialSfx}
                          </div>
                          <p className="text-[10px] text-zinc-400 mt-0.5">{cell.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'AUDIO' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-amber-300 font-bold uppercase text-[11px]">
                    3D HRTF Spatial Audio &amp; Sub-Bass Mastering Chain
                  </span>
                  <div className="flex items-center gap-1">
                    {(['LEFT', 'CENTER', 'RIGHT'] as const).map((pos) => (
                      <button
                        key={pos}
                        onClick={() => setTestPan(pos)}
                        className={`min-h-[34px] px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer ${
                          testPan === pos
                            ? 'bg-amber-400 text-zinc-950'
                            : 'bg-zinc-950 border border-zinc-700 text-zinc-300'
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sound Test Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => {
                      RetroAudio.enableAudio();
                      RetroAudio.playFootstep(1.0, panWorldX, 445);
                    }}
                    className="min-h-[44px] px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-900 border border-zinc-700 text-zinc-200 font-bold cursor-pointer"
                  >
                    Footstep
                  </button>
                  <button
                    onClick={() => {
                      RetroAudio.enableAudio();
                      RetroAudio.playJumpLaunch(1.0, panWorldX, 340);
                    }}
                    className="min-h-[44px] px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-900 border border-zinc-700 text-zinc-200 font-bold cursor-pointer"
                  >
                    Jump Launch
                  </button>
                  <button
                    onClick={() => {
                      RetroAudio.enableAudio();
                      RetroAudio.playPunch('heavy', panWorldX, 350);
                    }}
                    className="min-h-[44px] px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-900 border border-red-600/60 text-red-300 font-bold cursor-pointer"
                  >
                    Heavy Punch
                  </button>
                  <button
                    onClick={() => {
                      RetroAudio.enableAudio();
                      RetroAudio.playKick('heavy', panWorldX, 360);
                    }}
                    className="min-h-[44px] px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-900 border border-orange-500/60 text-orange-300 font-bold cursor-pointer"
                  >
                    Heavy Kick
                  </button>
                  <button
                    onClick={() => {
                      RetroAudio.enableAudio();
                      RetroAudio.playHit('uppercut', panWorldX, 320);
                    }}
                    className="min-h-[44px] px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-900 border border-purple-500/60 text-purple-300 font-bold cursor-pointer"
                  >
                    Uppercut Boom
                  </button>
                  <button
                    onClick={() => {
                      RetroAudio.enableAudio();
                      RetroAudio.playSword(panWorldX, 340);
                    }}
                    className="min-h-[44px] px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-900 border border-amber-500/60 text-amber-300 font-bold cursor-pointer"
                  >
                    Weapon Slash
                  </button>
                  <button
                    onClick={() => {
                      RetroAudio.enableAudio();
                      RetroAudio.playLanding(420, 1.0, panWorldX, 445);
                    }}
                    className="min-h-[44px] px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-900 border border-zinc-700 text-zinc-200 font-bold cursor-pointer"
                  >
                    Hard Landing
                  </button>
                  <button
                    onClick={() => {
                      RetroAudio.enableAudio();
                      RetroAudio.playSuperActivate(panWorldX, 340);
                    }}
                    className="min-h-[44px] px-2.5 py-1.5 rounded-lg bg-red-950/70 hover:bg-red-900 border border-amber-400 text-amber-200 font-bold cursor-pointer"
                  >
                    Super Activate
                  </button>
                </div>
              </div>

              {/* DSP Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-900/70 border border-zinc-800">
                <label className="space-y-1">
                  <div className="flex justify-between">
                    <span>Sub-Bass Shelf (72Hz)</span>
                    <span className="text-amber-300">+{dsp.subBassGainDb.toFixed(1)} dB</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={11}
                    step={0.5}
                    value={dsp.subBassGainDb}
                    onChange={(e) => updateDspSlider('subBassGainDb', parseFloat(e.target.value))}
                    className="w-full accent-red-500"
                  />
                </label>

                <label className="space-y-1">
                  <div className="flex justify-between">
                    <span>Tube WaveShaper Drive</span>
                    <span className="text-amber-300">{Math.round(dsp.tubeDrive * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.05}
                    max={0.85}
                    step={0.05}
                    value={dsp.tubeDrive}
                    onChange={(e) => updateDspSlider('tubeDrive', parseFloat(e.target.value))}
                    className="w-full accent-red-500"
                  />
                </label>

                <label className="space-y-1">
                  <div className="flex justify-between">
                    <span>Dynamics Compressor Punch</span>
                    <span className="text-amber-300">{Math.round(dsp.compressorPunch * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={1.0}
                    step={0.05}
                    value={dsp.compressorPunch}
                    onChange={(e) => updateDspSlider('compressorPunch', parseFloat(e.target.value))}
                    className="w-full accent-red-500"
                  />
                </label>

                <label className="space-y-1">
                  <div className="flex justify-between">
                    <span>3D Spatial Width</span>
                    <span className="text-amber-300">{dsp.spatialWidth.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={1.5}
                    step={0.05}
                    value={dsp.spatialWidth}
                    onChange={(e) => updateDspSlider('spatialWidth', parseFloat(e.target.value))}
                    className="w-full accent-red-500"
                  />
                </label>

                <label className="space-y-1">
                  <div className="flex justify-between">
                    <span>Walk Footstep Foley Level</span>
                    <span className="text-amber-300">{Math.round(dsp.footstepVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.05}
                    max={0.8}
                    step={0.05}
                    value={dsp.footstepVolume}
                    onChange={(e) => updateDspSlider('footstepVolume', parseFloat(e.target.value))}
                    className="w-full accent-red-500"
                  />
                </label>

                <label className="space-y-1">
                  <div className="flex justify-between">
                    <span>High Air Sparkle (6.4kHz)</span>
                    <span className="text-amber-300">{dsp.airSparkleDb.toFixed(1)} dB</span>
                  </div>
                  <input
                    type="range"
                    min={-3}
                    max={6}
                    step={0.5}
                    value={dsp.airSparkleDb}
                    onChange={(e) => updateDspSlider('airSparkleDb', parseFloat(e.target.value))}
                    className="w-full accent-red-500"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
