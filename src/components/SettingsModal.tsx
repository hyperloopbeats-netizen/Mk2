/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { STAGES } from '../game/constants';
import { StageId } from '../types/fighter';
import { BloodMode } from '../game/ParticleSystem';
import { RetroAudio } from '../audio/RetroSynth';
import { X, Settings, Monitor, Droplets, MapPin, Swords, Box, Scan, Sliders, Play, Square, Wand2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStage: StageId;
  onSelectStage: (stage: StageId) => void;
  bloodMode: BloodMode;
  onSelectBloodMode: (mode: BloodMode) => void;
  crtFilter: boolean;
  onToggleCrt: () => void;
  practiceMode: boolean;
  onTogglePractice: () => void;
  is3DMode: boolean;
  onToggle3DMode: () => void;
  showHitboxes: boolean;
  onToggleHitboxes: () => void;
  onOpenLevelDesigner?: () => void;
}

const SOVEREIGN_PRESETS = [
  { id: 'warm', label: 'Warm', sub: 'Tube Boost', drive: 0.25, low: 4.5, mid: 1.0, high: -2.0 },
  { id: 'space', label: 'Space', sub: 'Air Highs', drive: 0.08, low: -1.0, mid: -3.0, high: 6.5 },
  { id: 'solar', label: 'Solar', sub: 'Sat Drive', drive: 0.75, low: 6.0, mid: 4.0, high: 3.5 },
  { id: 'cyber', label: 'Cyber', sub: 'Punch Mids', drive: 0.45, low: 2.0, mid: 5.5, high: 4.0 },
] as const;

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  activeStage,
  onSelectStage,
  bloodMode,
  onSelectBloodMode,
  crtFilter,
  onToggleCrt,
  practiceMode,
  onTogglePractice,
  is3DMode,
  onToggle3DMode,
  showHitboxes,
  onToggleHitboxes,
  onOpenLevelDesigner,
}) => {
  const spectrumCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dsp, setDsp] = useState(() => RetroAudio.getDspProfile());
  const [droneOn, setDroneOn] = useState(() => RetroAudio.getIsDronePlaying());

  useEffect(() => {
    if (!isOpen) return;
    setDsp(RetroAudio.getDspProfile());
    setDroneOn(RetroAudio.getIsDronePlaying());

    let rafId = 0;
    const renderSpectrum = () => {
      const canvas = spectrumCanvasRef.current;
      if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        const w = Math.max(100, Math.floor(canvas.clientWidth * dpr));
        const h = Math.max(32, Math.floor(canvas.clientHeight * dpr));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, w, h);
          const data = RetroAudio.getSpectrumData();
          if (!data) {
            ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
            ctx.font = `${10 * dpr}px JetBrains Mono, monospace`;
            ctx.textAlign = 'center';
            ctx.fillText('Trigger SFX or Test Synth for Live Spectrum', w * 0.5, h * 0.56);
          } else {
            const barWidth = (w / data.length) * 2.2;
            let x = 0;
            for (let i = 0; i < data.length; i++) {
              const barHeight = (data[i] / 255) * h;
              const grad = ctx.createLinearGradient(0, h, 0, 0);
              grad.addColorStop(0, 'rgba(56, 189, 248, 0.5)');
              grad.addColorStop(1, 'rgba(251, 191, 36, 0.95)');
              ctx.fillStyle = grad;
              ctx.fillRect(x, h - barHeight, Math.max(1, barWidth - 1), barHeight);
              x += barWidth + 1;
            }
          }
        }
      }
      rafId = requestAnimationFrame(renderSpectrum);
    };
    rafId = requestAnimationFrame(renderSpectrum);
    return () => cancelAnimationFrame(rafId);
  }, [isOpen]);

  if (!isOpen) return null;

  const updateDspField = (
    patch: Partial<{ subBassGainDb: number; midPresenceDb: number; airSparkleDb: number; tubeDrive: number }>
  ) => {
    RetroAudio.enableAudio();
    RetroAudio.setDspProfile(patch);
    setDsp(RetroAudio.getDspProfile());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg max-h-[88vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl font-mono text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-amber-500" />
            <h2 className="font-kombat text-sm sm:text-base font-black tracking-wider text-slate-100">
              KOMBAT SETTINGS &amp; ARENA
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Stage Selector */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-zinc-300 font-bold flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>ARENA STAGE SELECTION</span>
              </h3>
              {onOpenLevelDesigner && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenLevelDesigner();
                  }}
                  className="px-2.5 py-1 rounded bg-purple-950/80 hover:bg-purple-900 border border-purple-400/60 text-purple-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Wand2 className="w-3 h-3" />
                  <span>1960s AI Designer</span>
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(STAGES).map((st) => (
                <button
                  key={st.id}
                  onClick={() => onSelectStage(st.id as StageId)}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    activeStage === st.id
                      ? 'bg-zinc-900 border-amber-500 ring-1 ring-amber-500/50 text-white'
                      : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold text-[11px] truncate">{st.name}</div>
                  <div className="text-[9px] text-zinc-500 truncate">{st.location}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Blood & Gore Mode */}
          <div>
            <h3 className="text-zinc-300 font-bold mb-2 flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-red-500" />
              <span>BLOOD &amp; GORE SPLAY</span>
            </h3>
            <div className="grid grid-cols-4 gap-1.5">
              {(['RED', 'BLUE', 'GREEN', 'OFF'] as BloodMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onSelectBloodMode(mode)}
                  className={`py-1.5 rounded border text-center font-bold text-[10px] transition-colors cursor-pointer ${
                    bloodMode === mode
                      ? 'bg-red-600 text-white border-red-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Sovereign Audio DSP & Live Spectrum Analyzer */}
          <div className="p-3 bg-zinc-900/70 border border-zinc-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-zinc-200 font-bold flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>SOVEREIGN AUDIO DSP &amp; EQ</span>
              </h3>
              <button
                onClick={() => {
                  RetroAudio.enableAudio();
                  setDroneOn(RetroAudio.toggleSovereignDrone());
                }}
                className={`px-2.5 py-1 rounded border text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                  droneOn
                    ? 'bg-emerald-700/80 border-emerald-400 text-white'
                    : 'bg-zinc-800 border-zinc-700 text-cyan-300 hover:text-white'
                }`}
              >
                {droneOn ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{droneOn ? 'Stop Synth' : 'Test Synth'}</span>
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {SOVEREIGN_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() =>
                    updateDspField({
                      tubeDrive: preset.drive,
                      subBassGainDb: preset.low,
                      midPresenceDb: preset.mid,
                      airSparkleDb: preset.high,
                    })
                  }
                  className="px-2 py-1.5 rounded border border-zinc-700 bg-zinc-950 hover:border-amber-400/60 text-left cursor-pointer transition-colors"
                >
                  <div className="font-bold text-[10px] text-amber-300">{preset.label}</div>
                  <div className="text-[9px] text-zinc-500">{preset.sub}</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-zinc-950/90 p-2 rounded border border-zinc-800/80">
                <div className="flex justify-between text-[10px] text-zinc-300 mb-1">
                  <span>Tube Drive</span>
                  <span className="text-amber-300 tabular-nums">{Math.round(dsp.tubeDrive * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={dsp.tubeDrive}
                  onChange={(e) => updateDspField({ tubeDrive: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400"
                />
              </div>

              <div className="bg-zinc-950/90 p-2 rounded border border-zinc-800/80">
                <div className="flex justify-between text-[10px] text-zinc-300 mb-1">
                  <span>Low (100Hz)</span>
                  <span className="text-cyan-300 tabular-nums">{dsp.subBassGainDb.toFixed(1)} dB</span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  value={dsp.subBassGainDb}
                  onChange={(e) => updateDspField({ subBassGainDb: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div className="bg-zinc-950/90 p-2 rounded border border-zinc-800/80">
                <div className="flex justify-between text-[10px] text-zinc-300 mb-1">
                  <span>Mid (1kHz)</span>
                  <span className="text-cyan-300 tabular-nums">{dsp.midPresenceDb.toFixed(1)} dB</span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  value={dsp.midPresenceDb}
                  onChange={(e) => updateDspField({ midPresenceDb: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div className="bg-zinc-950/90 p-2 rounded border border-zinc-800/80">
                <div className="flex justify-between text-[10px] text-zinc-300 mb-1">
                  <span>High (8kHz)</span>
                  <span className="text-cyan-300 tabular-nums">{dsp.airSparkleDb.toFixed(1)} dB</span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  value={dsp.airSparkleDb}
                  onChange={(e) => updateDspField({ airSparkleDb: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>

            <div className="bg-black/70 p-1.5 rounded border border-zinc-800">
              <canvas ref={spectrumCanvasRef} className="w-full h-10 block rounded" />
            </div>
          </div>

          {/* CRT Scanline Filter Toggle */}
          <div className="flex items-center justify-between p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="font-bold text-slate-200">Arcade CRT Scanlines</div>
                <div className="text-[10px] text-zinc-500">Retro phosphor scanline overlay filter</div>
              </div>
            </div>
            <button
              onClick={onToggleCrt}
              className={`px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                crtFilter ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {crtFilter ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* 3D Perspective Mode Toggle */}
          <div className="flex items-center justify-between p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="font-bold text-slate-200">3D Mode (Perspective Stage)</div>
                <div className="text-[10px] text-zinc-500">Perspective 3D depth grid &amp; stage floor rendering</div>
              </div>
            </div>
            <button
              onClick={onToggle3DMode}
              className={`px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                is3DMode ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {is3DMode ? '3D ON' : '2D'}
            </button>
          </div>

          {/* Training Hitboxes Toggle */}
          <div className="flex items-center justify-between p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Scan className="w-4 h-4 text-sky-400" />
              <div>
                <div className="font-bold text-slate-200">Training Hitboxes &amp; GGPO [B]</div>
                <div className="text-[10px] text-zinc-500">Live 4-zone hurtboxes, active hitboxes, spacing &amp; rollback frames</div>
              </div>
            </div>
            <button
              onClick={onToggleHitboxes}
              className={`px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                showHitboxes ? 'bg-sky-600 text-white' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {showHitboxes ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Practice Mode Toggle */}
          <div className="flex items-center justify-between p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Swords className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="font-bold text-slate-200">Practice Dojo Mode</div>
                <div className="text-[10px] text-zinc-500">Dummy opponent with infinite regenerable HP</div>
              </div>
            </div>
            <button
              onClick={onTogglePractice}
              className={`px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                practiceMode ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {practiceMode ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold cursor-pointer"
          >
            Apply &amp; Return
          </button>
        </div>
      </div>
    </div>
  );
};

