/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Download, Layers, Play, ShieldAlert, Sliders, Wrench, X } from 'lucide-react';
import masterManifestJson from '../data/master-build.json';
import {
  BUILD_DATE,
  CODE_PART,
  M01_Config,
  M02_SpriteMeshAtlas,
  M03_InputBus,
  M04_MeshPhysics,
  M08_Watchdog,
  M09_Scheduler,
  M10_Renderer,
  M11_ManifestInspector,
  SPRING_PRESETS,
  STAGE_PRESETS,
  resetM01Config,
} from '../engine/mesh';
import type {
  EngineState,
  ManifestHealth,
  MasterBuildManifest,
  SpringPresetId,
  TelemetryTimelineFrame,
} from '../engine/mesh';

interface MeshLabOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

type StudioTab = 'ARENA' | 'MODULES' | 'MANIFEST';

const manifest = masterManifestJson as MasterBuildManifest;

function downloadJsonFile(filename: string, jsonText: string): void {
  const blob = new Blob([jsonText], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export const MeshLabOverlay: React.FC<MeshLabOverlayProps> = ({ isOpen, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineStateRef = useRef<EngineState | null>(null);
  const frameCounterRef = useRef<number>(0);

  const [tab, setTab] = useState<StudioTab>('ARENA');
  const [selectedModuleId, setSelectedModuleId] = useState<string>(
    manifest.modules[0]?.id || 'M01'
  );

  // Synced reactive UI mirror of M01_Config & M11_ManifestInspector
  const [showMesh, setShowMesh] = useState<boolean>(true);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(true);
  const [p1Auto, setP1Auto] = useState<boolean>(true);
  const [p2Auto, setP2Auto] = useState<boolean>(true);
  const [selfHeal, setSelfHeal] = useState<boolean>(true);
  const [p1FighterId, setP1FighterId] = useState<string>('SCORPION_MK_REMIX');
  const [p2FighterId, setP2FighterId] = useState<string>('SUBZERO_MK_REMIX');
  const [stageIndex, setStageIndex] = useState<number>(0);
  const [springK, setSpringK] = useState<number>(265);
  const [springD, setSpringD] = useState<number>(22);
  const [springPreset, setSpringPreset] = useState<SpringPresetId>('CUSTOM');
  const [statusLine, setStatusLine] = useState<string>('');
  const [health, setHealth] = useState<ManifestHealth>(() => M11_ManifestInspector.lastHealth);
  const [timeline, setTimeline] = useState<TelemetryTimelineFrame[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    resetM01Config();
    M11_ManifestInspector.clearTimeline();
    setShowMesh(M01_Config.telemetry.showMesh);
    setShowDiagnostics(M01_Config.telemetry.showDiagnostics);
    setP1Auto(M01_Config.telemetry.p1Autonomous);
    setP2Auto(M01_Config.telemetry.p2Autonomous);
    setSelfHeal(M01_Config.telemetry.selfHealEnabled);
    setStageIndex(M01_Config.infusion.stageIndex);
    setSpringK(M01_Config.infusion.meshSpringStiffness);
    setSpringD(M01_Config.infusion.meshSpringDamping);
    setSpringPreset(M01_Config.infusion.springPreset);
    setP1FighterId('SCORPION_MK_REMIX');
    setP2FighterId('SUBZERO_MK_REMIX');

    const canvas = canvasRef.current;
    if (!canvas) return;

    const state = M10_Renderer.boot(canvas, (liveState) => {
      frameCounterRef.current += 1;
      if (frameCounterRef.current % 6 !== 0) return;

      const stage = STAGE_PRESETS[M01_Config.infusion.stageIndex] || STAGE_PRESETS[0];
      const t = M01_Config.telemetry;
      const inf = M01_Config.infusion;

      setSpringK(inf.meshSpringStiffness);
      setSpringD(inf.meshSpringDamping);
      setSpringPreset(inf.springPreset);
      setStageIndex(inf.stageIndex);
      setP1FighterId(liveState.p1.fighterId);
      setP2FighterId(liveState.p2.fighterId);
      setHealth({ ...M11_ManifestInspector.lastHealth });
      setTimeline([...M11_ManifestInspector.getTimeline()]);
      setStatusLine(
        `${CODE_PART} ${BUILD_DATE} · ${stage.name} · Diff ${M01_Config.cabinetDip.difficulty} · Infuse ${inf.stageInfusionLevel}% · Heals ${t.healsPerformed} (${t.lastHealReason})`
      );
    });
    engineStateRef.current = state;

    return () => {
      M09_Scheduler.stop();
      M03_InputBus.destroy();
      engineStateRef.current = null;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const p1Name = M02_SpriteMeshAtlas.fighters.get(p1FighterId)?.name || p1FighterId;
  const p2Name = M02_SpriteMeshAtlas.fighters.get(p2FighterId)?.name || p2FighterId;
  const activeStage = STAGE_PRESETS[stageIndex] || STAGE_PRESETS[0];
  const selectedModule =
    manifest.modules.find((m) => m.id === selectedModuleId) || manifest.modules[0];

  const handleToggleMesh = () => {
    const next = !M01_Config.telemetry.showMesh;
    M01_Config.telemetry.showMesh = next;
    setShowMesh(next);
  };

  const handleToggleDiagnostics = () => {
    const next = !M01_Config.telemetry.showDiagnostics;
    M01_Config.telemetry.showDiagnostics = next;
    setShowDiagnostics(next);
  };

  const handleToggleP1Auto = () => {
    const next = !M01_Config.telemetry.p1Autonomous;
    M01_Config.telemetry.p1Autonomous = next;
    setP1Auto(next);
  };

  const handleToggleP2Auto = () => {
    const next = !M01_Config.telemetry.p2Autonomous;
    M01_Config.telemetry.p2Autonomous = next;
    setP2Auto(next);
  };

  const handleToggleSelfHeal = () => {
    const next = !M01_Config.telemetry.selfHealEnabled;
    M01_Config.telemetry.selfHealEnabled = next;
    setSelfHeal(next);
  };

  const handleCycleRoster = (slot: 'p1' | 'p2') => {
    const state = engineStateRef.current;
    if (!state) return;
    const f = state[slot];
    const order = M02_SpriteMeshAtlas.rosterOrder;
    const idx = order.indexOf(f.fighterId);
    f.fighterId = order[(idx + 1) % order.length];
    f.meshDyn = null;
    if (slot === 'p1') setP1FighterId(f.fighterId);
    else setP2FighterId(f.fighterId);
  };

  const handleCycleStage = () => {
    const nextIdx = (M01_Config.infusion.stageIndex + 1) % STAGE_PRESETS.length;
    M01_Config.infusion.stageIndex = nextIdx;
    setStageIndex(nextIdx);
  };

  const handleTriggerFinisher = () => {
    const state = engineStateRef.current;
    if (!state) return;
    M04_MeshPhysics.triggerFinisher(state.p1, state.p2, 'MANUAL STAGE INFUSION');
    setStageIndex(M01_Config.infusion.stageIndex);
  };

  const handleApplySpringPreset = (key: 'bouncy' | 'stiff' | 'watery') => {
    const preset = SPRING_PRESETS[key];
    M01_Config.infusion.springPreset = preset.id.toUpperCase() as SpringPresetId;
    M01_Config.infusion.meshSpringStiffness = preset.stiffness;
    M01_Config.infusion.meshSpringDamping = preset.damping;
    setSpringPreset(M01_Config.infusion.springPreset);
    setSpringK(preset.stiffness);
    setSpringD(preset.damping);
  };

  const handleSpringKChange = (value: number) => {
    M01_Config.infusion.meshSpringStiffness = value;
    M01_Config.infusion.springPreset = 'CUSTOM';
    setSpringK(value);
    setSpringPreset('CUSTOM');
  };

  const handleSpringDChange = (value: number) => {
    M01_Config.infusion.meshSpringDamping = value;
    M01_Config.infusion.springPreset = 'CUSTOM';
    setSpringD(value);
    setSpringPreset('CUSTOM');
  };

  const handleInjectFault = () => {
    const state = engineStateRef.current;
    if (!state) return;
    state.p1.x = Number.NaN;
    state.p2.hp = -50;
    M01_Config.cabinetDip.slamTilt = true;
    M01_Config.infusion.meshSpringStiffness = -999;
    state.p1.state = 'broken_state';
    setSpringPreset('CUSTOM');
  };

  const handleExportStudio = () => {
    const state = engineStateRef.current;
    if (!state) return;
    downloadJsonFile(
      `mk-studio-master-${BUILD_DATE}.json`,
      M08_Watchdog.exportStudioPayload(state)
    );
  };

  const handleExportGoldenMaster = () => {
    const state = engineStateRef.current;
    if (!state) return;
    downloadJsonFile(
      `master-build-${CODE_PART.toLowerCase()}-${BUILD_DATE}.json`,
      M11_ManifestInspector.buildGoldenMasterExport(M01_Config, state, manifest)
    );
  };

  const handleDownloadManifestOnly = () => {
    downloadJsonFile('master-build.json', JSON.stringify(manifest, null, 2));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#070a11]/96 backdrop-blur-md text-slate-100 select-none overflow-hidden"
      role="dialog"
      aria-label="2D Sprite Mesh Engine Studio"
    >
      {/* Clean Top Header Bar */}
      <header className="shrink-0 flex flex-wrap items-center justify-between gap-4 px-4 sm:px-6 py-2.5 bg-[#0b101b] border-b border-slate-800">
        <div className="flex items-center gap-4 min-w-0">
          <h2 className="font-kombat text-base sm:text-lg font-bold tracking-wide text-amber-300 whitespace-nowrap shrink-0">
            2D Sprite Mesh Engine
          </h2>
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums whitespace-nowrap">
            <span>{manifest.meta.project}</span>
            <span aria-hidden="true">·</span>
            <span>{manifest.meta.codePart}</span>
            <span aria-hidden="true">·</span>
            <span>{manifest.modules.length} Modules</span>
            <span aria-hidden="true">·</span>
            <span className={health.valid ? 'text-emerald-400' : 'text-red-400'}>
              {health.valid ? 'Contracts Valid' : `${health.violations.length} Violations`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
            <button
              onClick={() => setTab('ARENA')}
              className={`min-h-[36px] px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                tab === 'ARENA'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Live Arena</span>
            </button>
            <button
              onClick={() => setTab('MODULES')}
              className={`min-h-[36px] px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                tab === 'MODULES'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Module Network</span>
            </button>
            <button
              onClick={() => setTab('MANIFEST')}
              className={`min-h-[36px] px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                tab === 'MANIFEST'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Manifest Schema</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors shrink-0"
            aria-label="Close 2D Sprite Mesh Engine"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
        {/* Keep canvas mounted across tab switches so scheduler stays continuous while open */}
        <div className={tab === 'ARENA' ? 'max-w-5xl mx-auto flex flex-col gap-3' : 'hidden'}>
          <div className="w-full flex justify-center">
            <canvas
              ref={canvasRef}
              width={960}
              height={500}
              className="w-full max-w-[960px] aspect-[960/500] rounded-lg border border-slate-700/80 bg-[#0c1220] shadow-2xl"
            />
          </div>

          {/* Primary Engine Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleToggleMesh}
              className={`min-h-[40px] px-3 py-1.5 rounded-lg border text-xs font-mono whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                showMesh
                  ? 'bg-slate-800 border-amber-500 text-amber-300'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              2D Mesh: {showMesh ? 'On' : 'Off'}
            </button>

            <button
              onClick={handleToggleDiagnostics}
              className={`min-h-[40px] px-3 py-1.5 rounded-lg border text-xs font-mono whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                showDiagnostics
                  ? 'bg-slate-800 border-amber-500 text-amber-300'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              Diagnostics: {showDiagnostics ? 'On' : 'Off'}
            </button>

            <button
              onClick={handleToggleP1Auto}
              className={`min-h-[40px] px-3 py-1.5 rounded-lg border text-xs font-mono whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                p1Auto
                  ? 'bg-slate-800 border-amber-500 text-amber-300'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              P1 AI: {p1Auto ? 'On' : 'Off'}
            </button>

            <button
              onClick={handleToggleP2Auto}
              className={`min-h-[40px] px-3 py-1.5 rounded-lg border text-xs font-mono whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                p2Auto
                  ? 'bg-slate-800 border-amber-500 text-amber-300'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              P2 AI: {p2Auto ? 'On' : 'Off'}
            </button>

            <button
              onClick={() => handleCycleRoster('p1')}
              className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-mono text-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
            >
              P1: {p1Name}
            </button>

            <button
              onClick={() => handleCycleRoster('p2')}
              className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-mono text-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
            >
              P2: {p2Name}
            </button>

            <button
              onClick={handleCycleStage}
              className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-mono text-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Stage: {activeStage.name}
            </button>

            <button
              onClick={handleTriggerFinisher}
              className="min-h-[40px] px-3 py-1.5 rounded-lg border border-red-600/70 bg-red-950/60 hover:bg-red-900/70 text-xs font-mono text-red-200 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Trigger Finisher
            </button>

            <button
              onClick={handleToggleSelfHeal}
              className={`min-h-[40px] px-3 py-1.5 rounded-lg border text-xs font-mono whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                selfHeal
                  ? 'bg-slate-800 border-emerald-500 text-emerald-300'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              Self-Heal: {selfHeal ? 'On' : 'Off'}
            </button>

            <button
              onClick={handleInjectFault}
              className="min-h-[40px] px-3 py-1.5 rounded-lg border border-amber-600/60 bg-slate-900 hover:bg-slate-800 text-xs font-mono text-amber-300 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Inject Fault</span>
            </button>

            <button
              onClick={handleExportStudio}
              className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-mono text-slate-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Studio JSON</span>
            </button>
          </div>

          {/* Spring Physics Tuning & Presets */}
          <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-lg bg-[#0d1320] border border-slate-800">
            <label className="flex items-center gap-2 text-xs font-mono text-slate-200">
              <span>Spring k:</span>
              <input
                type="range"
                min={60}
                max={600}
                step={5}
                value={springK}
                onChange={(e) => handleSpringKChange(Number(e.target.value))}
                className="w-24 accent-amber-500 cursor-pointer"
              />
              <span className="tabular-nums w-8 text-amber-300">{springK}</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-mono text-slate-200">
              <span>Damping d:</span>
              <input
                type="range"
                min={2}
                max={60}
                step={1}
                value={springD}
                onChange={(e) => handleSpringDChange(Number(e.target.value))}
                className="w-24 accent-amber-500 cursor-pointer"
              />
              <span className="tabular-nums w-6 text-cyan-300">{springD}</span>
            </label>

            <div className="flex items-center gap-1.5">
              {(['bouncy', 'stiff', 'watery'] as const).map((presetKey) => {
                const isActive = springPreset === presetKey.toUpperCase();
                return (
                  <button
                    key={presetKey}
                    onClick={() => handleApplySpringPreset(presetKey)}
                    className={`min-h-[36px] px-2.5 py-1 rounded-md border text-xs font-mono capitalize whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-slate-800 border-amber-500 text-amber-300'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    Preset: {presetKey}
                  </button>
                );
              })}
            </div>

            <div className="ml-auto text-xs font-mono text-slate-400 tabular-nums truncate max-w-full">
              {statusLine || `${CODE_PART} ${BUILD_DATE} · Ready`}
            </div>
          </div>

          {/* Manual Virtual Pad & Keyboard Map */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-[#0b101b] border border-slate-800/80">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onPointerDown={() => M03_InputBus.setVirtualStick({ moveX: -1 })}
                onPointerUp={() => M03_InputBus.setVirtualStick({ moveX: 0 })}
                onPointerLeave={() => M03_InputBus.setVirtualStick({ moveX: 0 })}
                className="min-h-[36px] px-2.5 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200 active:bg-slate-700 cursor-pointer"
              >
                Left (A)
              </button>
              <button
                onPointerDown={() => M03_InputBus.setVirtualStick({ moveX: 1 })}
                onPointerUp={() => M03_InputBus.setVirtualStick({ moveX: 0 })}
                onPointerLeave={() => M03_InputBus.setVirtualStick({ moveX: 0 })}
                className="min-h-[36px] px-2.5 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200 active:bg-slate-700 cursor-pointer"
              >
                Right (D)
              </button>
              <button
                onClick={() => M03_InputBus.pressVirtualButton('UP')}
                className="min-h-[36px] px-2.5 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200 active:bg-slate-700 cursor-pointer"
              >
                Jump (W)
              </button>
              <button
                onPointerDown={() => M03_InputBus.setVirtualStick({ crouch: true })}
                onPointerUp={() => M03_InputBus.setVirtualStick({ crouch: false })}
                onPointerLeave={() => M03_InputBus.setVirtualStick({ crouch: false })}
                className="min-h-[36px] px-2.5 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200 active:bg-slate-700 cursor-pointer"
              >
                Duck (S)
              </button>
              <button
                onPointerDown={() => M03_InputBus.setVirtualStick({ blocking: true })}
                onPointerUp={() => M03_InputBus.setVirtualStick({ blocking: false })}
                onPointerLeave={() => M03_InputBus.setVirtualStick({ blocking: false })}
                className="min-h-[36px] px-2.5 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-300 active:bg-slate-700 cursor-pointer"
              >
                Block (O)
              </button>
              <button
                onClick={() => M03_InputBus.pressVirtualButton('HP')}
                className="min-h-[36px] px-2.5 rounded bg-slate-900 border border-red-800/70 text-xs font-mono text-red-200 active:bg-red-900 cursor-pointer"
              >
                HP (U)
              </button>
              <button
                onClick={() => M03_InputBus.pressVirtualButton('LP')}
                className="min-h-[36px] px-2.5 rounded bg-slate-900 border border-amber-800/70 text-xs font-mono text-amber-200 active:bg-amber-900 cursor-pointer"
              >
                LP (I)
              </button>
              <button
                onClick={() => M03_InputBus.pressVirtualButton('HK')}
                className="min-h-[36px] px-2.5 rounded bg-slate-900 border border-red-800/70 text-xs font-mono text-red-200 active:bg-red-900 cursor-pointer"
              >
                HK (J)
              </button>
              <button
                onClick={() => M03_InputBus.pressVirtualButton('LK')}
                className="min-h-[36px] px-2.5 rounded bg-slate-900 border border-amber-800/70 text-xs font-mono text-amber-200 active:bg-amber-900 cursor-pointer"
              >
                LK (K)
              </button>
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              Combos: S+D+I Projectile · D+HP Uppercut · B+LK Sweep · B+HK Roundhouse · Close+LP Throw
            </p>
          </div>
        </div>

        {/* Tab 2: Modular Component Network (M01 - M11) */}
        {tab === 'MODULES' && (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-4 flex flex-col gap-1.5">
              <div className="text-xs font-semibold text-slate-300 mb-1">
                Registered Modules ({manifest.modules.length})
              </div>
              {manifest.modules.map((mod) => {
                const isSelected = mod.id === selectedModule?.id;
                return (
                  <button
                    key={mod.id}
                    onClick={() => setSelectedModuleId(mod.id)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-amber-500 text-white'
                        : 'bg-[#0c121f] border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-mono">
                      <span className="font-bold text-amber-300">{mod.id}</span>
                      <span className="text-slate-400 truncate">{mod.filename}</span>
                    </div>
                    <div className="text-xs font-medium text-slate-100 mt-0.5 truncate">
                      {mod.name}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="lg:col-span-8 flex flex-col gap-4">
              {selectedModule && (
                <div className="p-4 rounded-lg bg-[#0c121f] border border-slate-800 flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-amber-300">
                        {selectedModule.id}: {selectedModule.name}
                      </h3>
                      <div className="text-xs font-mono text-slate-400 mt-0.5">
                        {selectedModule.filename} · {selectedModule.extension.toUpperCase()} Module
                      </div>
                    </div>
                    <Wrench className="w-4 h-4 text-slate-500" />
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {selectedModule.role}
                  </p>
                  <pre className="p-3 rounded-md bg-[#060910] border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto max-h-[300px] leading-relaxed">
                    {selectedModule.code}
                  </pre>
                </div>
              )}

              {/* Live M11 Telemetry Timeline */}
              <div className="p-4 rounded-lg bg-[#0c121f] border border-slate-800">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h4 className="text-sm font-semibold text-slate-100">
                    M11 Live Telemetry Timeline
                  </h4>
                  <span className="text-xs font-mono text-slate-400 tabular-nums">
                    Checked at tick {health.checkedAtTick} · {timeline.length} samples
                  </span>
                </div>
                <div className="overflow-x-auto max-h-48">
                  <table className="w-full text-left text-xs font-mono tabular-nums">
                    <thead className="text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-1.5 pr-3">Tick</th>
                        <th className="py-1.5 pr-3">Phase</th>
                        <th className="py-1.5 pr-3">P1 HP / State</th>
                        <th className="py-1.5 pr-3">P2 HP / State</th>
                        <th className="py-1.5 pr-3">Spring k/d</th>
                        <th className="py-1.5">Heals</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {timeline
                        .slice(-8)
                        .reverse()
                        .map((row) => (
                          <tr key={row.tick}>
                            <td className="py-1.5 pr-3">{row.tick}</td>
                            <td className="py-1.5 pr-3">{row.roundPhase}</td>
                            <td className="py-1.5 pr-3">
                              {row.p1Hp} · {row.p1State}
                            </td>
                            <td className="py-1.5 pr-3">
                              {row.p2Hp} · {row.p2State}
                            </td>
                            <td className="py-1.5 pr-3">
                              {row.springK} / {row.springD}
                            </td>
                            <td className="py-1.5">{row.heals}</td>
                          </tr>
                        ))}
                      {timeline.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-3 text-slate-500">
                            Waiting for fixed-timestep telemetry samples...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Master Build Manifest & Contract Schema */}
        {tab === 'MANIFEST' && (
          <div className="max-w-6xl mx-auto flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg bg-[#0c121f] border border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-amber-300">
                  {manifest.meta.project} ({manifest.meta.codePart})
                </h3>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  Build Date: {manifest.meta.buildDate} · Target: {manifest.meta.targetEnvironment}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleDownloadManifestOnly}
                  className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-mono text-slate-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download master-build.json</span>
                </button>
                <button
                  onClick={handleExportGoldenMaster}
                  className="min-h-[40px] px-3 py-1.5 rounded-lg border border-amber-500/70 bg-amber-500/15 hover:bg-amber-500/25 text-xs font-mono text-amber-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Golden Master Bundle</span>
                </button>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[#0c121f] border border-slate-800">
              <h4 className="text-sm font-semibold text-slate-100 mb-2">
                System Integration Directive
              </h4>
              <p className="text-xs font-mono text-slate-300 leading-relaxed">
                {manifest.systemInstruction}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-[#0c121f] border border-slate-800">
                <h4 className="text-sm font-semibold text-slate-100 mb-2">
                  Contract Schema · Shared State
                </h4>
                <pre className="p-3 rounded-md bg-[#060910] border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-96">
                  {JSON.stringify(manifest.contractSchema.sharedState, null, 2)}
                </pre>
              </div>

              <div className="p-4 rounded-lg bg-[#0c121f] border border-slate-800">
                <h4 className="text-sm font-semibold text-slate-100 mb-2">
                  Contract Schema · Module Interfaces
                </h4>
                <pre className="p-3 rounded-md bg-[#060910] border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-96">
                  {JSON.stringify(manifest.contractSchema.moduleInterfaces, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
