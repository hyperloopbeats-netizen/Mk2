/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  VancouverLevelDesign,
  VancouverWeather,
} from '../types/fighter';
import {
  PRESET_VANCOUVER_DESIGNS,
  getCustomVancouverDesign,
  requestAiLevelDesign,
  setCustomVancouverDesign,
} from '../game/VancouverLevelDesigner';
import { Sparkles, Wand2, Play, X, Layers, MapPin } from 'lucide-react';
import { RetroAudio } from '../audio/RetroSynth';

interface LevelDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeployStage: (design: VancouverLevelDesign) => void;
}

const PRESET_CHIPS = [
  {
    key: 'VANCOUVER_LIONS_GATE',
    label: '1962 Lions Gate Fog',
    district: 'Stanley Park & First Narrows',
    year: 1962,
    weather: 'FOG' as VancouverWeather,
    focus: 'SPEED',
    prompt: 'Suspended steel towers draped in midnight Burrard Inlet fog and rain-slick bridge lanes.',
  },
  {
    key: 'VANCOUVER_GASTOWN',
    label: '1964 Gastown Streetcar',
    district: 'Water & Cambie Street',
    year: 1964,
    weather: 'DRIZZLE' as VancouverWeather,
    focus: 'BALANCED',
    prompt: 'Cobblestone BC Electric tram rails, Edwardian red-brick warehouses, and hissing steam vents.',
  },
  {
    key: 'VANCOUVER_CHINATOWN',
    label: '1966 Pender Neon',
    district: 'Chinatown · East Pender',
    year: 1966,
    weather: 'NEON_MIST' as VancouverWeather,
    focus: 'HAZARD',
    prompt: 'Vertical neon marquees in emerald and crimson reflecting off wet Pender Street pavement.',
  },
  {
    key: 'VANCOUVER_FALSE_CREEK',
    label: '1968 False Creek Sawmill',
    district: 'False Creek Lumber Piers',
    year: 1968,
    weather: 'RAIN' as VancouverWeather,
    focus: 'AERIAL',
    prompt: 'Cedar timber piers, tugboat spotlights, and elevated gantry catwalks above dark harbor water.',
  },
  {
    key: 'VANCOUVER_VIADUCT',
    label: '1969 Viaduct Sky-Rift',
    district: 'Georgia Viaduct & Expo Rift',
    year: 1969,
    weather: 'STORM' as VancouverWeather,
    focus: 'AERIAL',
    prompt: 'Unfinished brutalist concrete arches cracked open by a violet Outworld gravity anomaly.',
  },
];

export const LevelDesignerModal: React.FC<LevelDesignerModalProps> = ({
  isOpen,
  onClose,
  onDeployStage,
}) => {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [district, setDistrict] = useState<string>('Gastown & Water Street');
  const [year, setYear] = useState<number>(1966);
  const [weather, setWeather] = useState<VancouverWeather>('NEON_MIST');
  const [strideFocus, setStrideFocus] = useState<string>('BALANCED');
  const [chaosLevel, setChaosLevel] = useState<number>(55);
  const [prompt, setPrompt] = useState<string>(
    '1960s neon theatre rain, BC Electric streetcar rails, and glowing steam vents along wet cobblestones.'
  );
  const [isManifesting, setIsManifesting] = useState<boolean>(false);
  const [design, setDesign] = useState<VancouverLevelDesign>(() => getCustomVancouverDesign());

  useEffect(() => {
    if (!isOpen) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, design.skyPalette[0] || '#070b18');
    grad.addColorStop(0.65, design.skyPalette[1] || '#122238');
    grad.addColorStop(1, design.skyPalette[2] || '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Horizon skyline
    ctx.fillStyle = 'rgba(7, 10, 18, 0.85)';
    for (let i = 0; i < 9; i++) {
      const bw = 38 + (i % 3) * 18;
      const bh = 38 + ((i * 29) % 58);
      ctx.fillRect(i * (w / 9), h * 0.74 - bh, bw, bh);
    }

    // Floor line (scaled from 960x445)
    const floorY = h * 0.78;
    ctx.fillStyle = '#0a0c14';
    ctx.fillRect(0, floorY, w, h - floorY);
    ctx.strokeStyle = design.accentColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(w, floorY);
    ctx.stroke();

    // Draw Manifested Floor Strides
    for (const stride of design.strides) {
      const sx = (stride.startX / 960) * w;
      const ex = (stride.endX / 960) * w;
      ctx.fillStyle = `${stride.color}38`;
      ctx.fillRect(sx, floorY - 6, Math.max(8, ex - sx), 12);
      ctx.strokeStyle = stride.color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sx, floorY - 6, Math.max(8, ex - sx), 12);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(stride.effect.replace('_', ' '), (sx + ex) / 2, floorY + 18);
    }

    // Draw Elevated Walkable Platforms
    for (const plat of design.platforms) {
      const px = (plat.x / 960) * w;
      const pw = (plat.width / 960) * w;
      const py = (plat.y / 445) * floorY;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(px, py, pw, 10);
      ctx.strokeStyle = design.accentColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px, py, pw, 10);
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 8px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(plat.style, px + pw / 2, py - 5);
    }
  }, [isOpen, design]);

  if (!isOpen) return null;

  const handleManifest = async () => {
    RetroAudio.enableAudio();
    RetroAudio.playSelect();
    setIsManifesting(true);
    try {
      const generated = await requestAiLevelDesign({
        prompt,
        district,
        year,
        weather,
        strideFocus,
        chaosLevel,
      });
      setDesign(generated);
      RetroAudio.playGong(0.5);
    } finally {
      setIsManifesting(false);
    }
  };

  const handleLoadPreset = (chip: (typeof PRESET_CHIPS)[number]) => {
    RetroAudio.playSelect();
    setDistrict(chip.district);
    setYear(chip.year);
    setWeather(chip.weather);
    setStrideFocus(chip.focus);
    setPrompt(chip.prompt);
    const preset = PRESET_VANCOUVER_DESIGNS[chip.key];
    if (preset) {
      setCustomVancouverDesign(preset);
      setDesign(preset);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md select-none">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-zinc-950 border border-purple-500/50 rounded-2xl shadow-[0_0_50px_rgba(168,85,247,0.28)] overflow-hidden">
        {/* Header */}
        <header className="px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-purple-400" />
            <div>
              <h2 className="font-kombat text-sm sm:text-base font-black text-amber-300 tracking-wider">
                1960s VANCOUVER AI LEVEL DESIGNER
              </h2>
              <p className="font-mono text-[10px] text-zinc-400">
                Manifest Physical Terrain Strides &amp; Elevated Walkable Platforms
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white cursor-pointer"
            aria-label="Close AI Level Designer"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 grid grid-cols-12 gap-4 font-mono text-xs">
          {/* Left Controls */}
          <div className="col-span-12 lg:col-span-5 space-y-3">
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase block mb-1.5">
                1960s District Archetypes
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_CHIPS.map((chip) => (
                  <button
                    key={chip.key}
                    onClick={() => handleLoadPreset(chip)}
                    className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-amber-400 text-[10px] text-zinc-200 cursor-pointer whitespace-nowrap"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">District</label>
                <input
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-white text-xs focus:outline-none focus:border-purple-400"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">
                  Era Year: <span className="text-amber-300 font-bold">{year}</span>
                </label>
                <input
                  type="range"
                  min={1960}
                  max={1969}
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-400 mt-1.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Weather</label>
                <select
                  value={weather}
                  onChange={(e) => setWeather(e.target.value as VancouverWeather)}
                  className="w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-cyan-300 text-xs"
                >
                  <option value="RAIN">Coastal Rain</option>
                  <option value="FOG">Burrard Fog</option>
                  <option value="DRIZZLE">Gaslamp Drizzle</option>
                  <option value="NEON_MIST">Pender Neon Mist</option>
                  <option value="STORM">Rift Storm</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Stride Focus</label>
                <select
                  value={strideFocus}
                  onChange={(e) => setStrideFocus(e.target.value)}
                  className="w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-amber-300 text-xs"
                >
                  <option value="BALANCED">Balanced Footsies</option>
                  <option value="SPEED">Rail Speed &amp; Fog</option>
                  <option value="AERIAL">Sky Platforms &amp; Rift</option>
                  <option value="HAZARD">Neon &amp; Gravity Surge</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 flex justify-between mb-1">
                <span>Stride Chaos Intensity</span>
                <span className="text-purple-300">{chaosLevel}%</span>
              </label>
              <input
                type="range"
                min={10}
                max={100}
                value={chaosLevel}
                onChange={(e) => setChaosLevel(parseInt(e.target.value, 10))}
                className="w-full accent-purple-400"
              />
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Architect Prompt</label>
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full px-2.5 py-2 rounded bg-zinc-900 border border-zinc-700 text-zinc-100 text-[11px] focus:outline-none focus:border-purple-400 resize-none"
              />
            </div>

            <button
              onClick={handleManifest}
              disabled={isManifesting}
              className="w-full min-h-[46px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-700 via-fuchsia-600 to-amber-500 hover:from-purple-600 hover:to-amber-400 text-white font-kombat font-black text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              <Sparkles className={`w-4 h-4 ${isManifesting ? 'animate-spin' : ''}`} />
              <span>{isManifesting ? 'MANIFESTING VANCOUVER...' : 'MANIFEST 1960s STRIDES (AI)'}</span>
            </button>
          </div>

          {/* Right Live Schematic Preview + Stride Specs */}
          <div className="col-span-12 lg:col-span-7 flex flex-col justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-kombat font-black text-amber-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{design.title}</span>
                </span>
                <span className="text-[10px] text-zinc-400">
                  {design.year} · {design.weather} · {design.source === 'GEMINI_ARCHITECT' ? 'AI GENERATED' : 'BLUEPRINT'}
                </span>
              </div>

              <canvas
                ref={previewCanvasRef}
                width={540}
                height={220}
                className="w-full h-auto rounded-xl border border-zinc-800 bg-black"
              />

              <p className="text-[11px] text-zinc-300 bg-zinc-900/70 p-2.5 rounded-lg border border-zinc-800 leading-relaxed">
                <strong className="text-purple-300">Architect Manifesto:</strong> {design.architectNotes}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-zinc-900/70 border border-zinc-800 space-y-1">
                  <div className="text-[10px] font-bold text-cyan-300 flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    <span>MANIFESTED STRIDES ({design.strides.length})</span>
                  </div>
                  {design.strides.map((s) => (
                    <div key={s.id} className="text-[10px] text-zinc-300 flex justify-between gap-1">
                      <span className="truncate" style={{ color: s.color }}>{s.name}</span>
                      <span className="text-zinc-500 shrink-0 tabular-nums">
                        {s.startX}-{s.endX}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-2.5 rounded-lg bg-zinc-900/70 border border-zinc-800 space-y-1">
                  <div className="text-[10px] font-bold text-amber-300">
                    PLATFORMS ({design.platforms.length}) &amp; HAZARDS
                  </div>
                  {design.platforms.map((p) => (
                    <div key={p.id} className="text-[10px] text-zinc-300 truncate">
                      {p.label} · Y:{p.y} ({p.style})
                    </div>
                  ))}
                  <div className="text-[10px] text-zinc-500 pt-0.5 truncate">
                    {design.hazards.join(' · ')}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                RetroAudio.enableAudio();
                RetroAudio.playGong(0.7);
                setCustomVancouverDesign(design);
                onDeployStage(design);
              }}
              className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-kombat font-black text-xs tracking-widest flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>DEPLOY &amp; FIGHT IN 1960s VANCOUVER</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
