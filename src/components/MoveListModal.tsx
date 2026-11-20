/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CHARACTERS, TRIPLE_COMBO_ROUTES } from '../game/constants';
import { CharacterId, CORE_CHARACTER_IDS } from '../types/fighter';
import { X, Flame, ShieldAlert, Keyboard, Zap } from 'lucide-react';

interface MoveListModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCharacterId: CharacterId;
}

export const MoveListModal: React.FC<MoveListModalProps> = ({
  isOpen,
  onClose,
  activeCharacterId,
}) => {
  const [selectedChar, setSelectedChar] = useState<CharacterId>(activeCharacterId);

  if (!isOpen) return null;

  const charDef = CHARACTERS[selectedChar] || CHARACTERS.scorpion;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-500" />
            <h2 className="font-kombat text-sm sm:text-base font-black tracking-wider text-amber-400">
              KOMBAT MOVE ARCHIVES
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Character Tab Selector */}
        <div className="flex items-center gap-1.5 p-2 bg-zinc-900/60 border-b border-zinc-800 overflow-x-auto">
          {CORE_CHARACTER_IDS.map((id) => {
            const c = CHARACTERS[id];
            return (
              <button
                key={c.id}
                onClick={() => setSelectedChar(c.id as CharacterId)}
                className={`px-3 py-1 rounded text-xs font-mono font-bold whitespace-nowrap transition-colors ${
                  selectedChar === c.id
                    ? 'bg-amber-500 text-zinc-950 shadow'
                    : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-mono">
          {/* Bio Summary */}
          <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <div className="font-kombat text-sm font-bold text-amber-400">{charDef.name}</div>
              <div className="text-[11px] text-zinc-400">{charDef.title} · {charDef.realm}</div>
            </div>
            <div className="text-amber-500/90 italic text-[11px]">"{charDef.quote}"</div>
          </div>

          {/* 3-Hit Triple Combo Routes & Individual Hits */}
          <div className="p-3 bg-gradient-to-r from-cyan-950/30 via-zinc-900 to-zinc-900 border border-cyan-600/40 rounded-lg">
            <h3 className="text-cyan-300 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Individual Strikes & 3-Hit Triple Combos</span>
            </h3>
            <p className="text-[10px] text-zinc-400 mb-2">
              Individual hits keep opponents standing for deliberate spacing. Chain exact 3-hit sequences below for Slow-Mo Cinematic Finishers &amp; Bonus Damage:
            </p>
            <div className="grid sm:grid-cols-2 gap-1.5">
              {TRIPLE_COMBO_ROUTES.map((route) => (
                <div
                  key={route.id}
                  className="px-2.5 py-1.5 rounded bg-zinc-950/80 border border-zinc-800 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-[10px] font-bold text-slate-200">{route.name}</div>
                    <div className="text-[9px] text-cyan-300 font-bold">
                      {route.sequence.join(' → ')}
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-amber-400 bg-amber-950/40 border border-amber-600/30 px-1.5 py-0.5 rounded">
                    ×{route.finisherMultiplier.toFixed(2)} FINISHER
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Signature Special Combat Abilities */}
          <div>
            <h3 className="text-amber-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>⚡ Signature Special Combat Abilities</span>
            </h3>
            <div className="grid gap-2">
              {charDef.specials.map((s, idx) => (
                <div
                  key={s.id}
                  className="p-2.5 bg-zinc-900/90 border border-zinc-800/80 rounded-lg hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center justify-between font-bold text-[11px]">
                    <span className="text-slate-100">{s.name}</span>
                    <span className="text-amber-400 font-mono">
                      {idx === 0 ? '◀/▶ + SPC' : idx === 1 ? '▼ + SPC' : '▲ + SPC'} · {s.inputCombo}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-1">{s.description}</div>
                  <div className="flex items-center gap-3 text-[9px] text-zinc-500 mt-1.5">
                    <span>Target: <strong className="text-zinc-300">{s.zone}</strong></span>
                    <span>Damage: <strong className="text-red-400">{s.damage} DMG</strong></span>
                    <span>Startup: <strong className="text-zinc-300">{s.startup}f</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Super & Fatality */}
          <div className="grid sm:grid-cols-2 gap-2">
            <div className="p-2.5 bg-amber-950/20 border border-amber-600/40 rounded-lg">
              <div className="text-amber-400 font-bold text-[11px]">⚡ FATAL BLOW SUPER</div>
              <div className="text-slate-200 font-bold text-[10px] mt-0.5">{charDef.superMove.name}</div>
              <div className="text-zinc-400 text-[10px] mt-1">{charDef.superMove.description}</div>
              <div className="text-amber-300 font-bold text-[9px] mt-1">Requires 100% Super Meter · Tap Floating SUPER or Space/F</div>
            </div>

            <div className="p-2.5 bg-red-950/20 border border-red-600/40 rounded-lg">
              <div className="text-red-400 font-bold text-[11px]">💀 SIGNATURE FATALITY</div>
              <div className="text-slate-200 font-bold text-[10px] mt-0.5">{charDef.fatalityMove.name}</div>
              <div className="text-zinc-400 text-[10px] mt-1">{charDef.fatalityMove.description}</div>
              <div className="text-red-300 font-bold text-[9px] mt-1">Execute during "FINISH HIM" wobble via FATALITY button!</div>
            </div>
          </div>

          {/* Stamina & Fatigue Engine Breakdown */}
          <div className="p-3 bg-zinc-900/60 border border-amber-600/30 rounded-lg">
            <h4 className="text-amber-400 font-bold flex items-center gap-1.5 mb-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Stamina &amp; Tactical Fatigue Engine (STM)</span>
            </h4>
            <div className="grid sm:grid-cols-2 gap-2 text-[10px] text-zinc-400">
              <div>
                <strong className="text-zinc-200">Attack Decay:</strong> Every punch and kick consumes stamina. As stamina depletes, damage scales proportionally down to 25% minimum.
              </div>
              <div>
                <strong className="text-zinc-200">Block Degradation:</strong> Sustained blocking drains stamina. At 0% stamina, guard breaks and chip damage rises to 100%!
              </div>
              <div>
                <strong className="text-zinc-200">Tactical Recovery:</strong> Stamina recharges rapidly (+24%/s) when moving backward or standing still (+18%/s).
              </div>
              <div>
                <strong className="text-zinc-200">Block &amp; Pushback:</strong> Clean blocks absorb strikes with a tight thud and multi-step pushback, keeping footsies crisp and natural-speed.
              </div>
            </div>
          </div>

          {/* 4-Zone Tactical Anatomical Damage Breakdown */}
          <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
            <h4 className="text-emerald-400 font-bold flex items-center gap-1.5 mb-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>4-Zone Tactical Anatomical Damage System</span>
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-400">
              <div>
                <strong className="text-zinc-200">Head [H] (≤45%):</strong> Concussion, dizzy vulnerability, longer recovery frames.
              </div>
              <div>
                <strong className="text-zinc-200">Torso [T] (≤40%):</strong> Armor breach, takes +25% extra damage on all incoming hits.
              </div>
              <div>
                <strong className="text-zinc-200">Legs [L] (≤40%):</strong> Crippled limbs, walk speed cut by 50%, jump force reduced.
              </div>
              <div>
                <strong className="text-zinc-200">Arms [R] (≤40%):</strong> Fractured arms, adds 4 startup frames delay to attacks.
              </div>
            </div>
          </div>

          {/* Symmetrical 8-Button Touch Matrix & Desktop Keyboard Controls */}
          <div className="p-2.5 bg-zinc-900/40 border border-zinc-800 rounded-lg">
            <h4 className="text-zinc-300 font-bold flex items-center gap-1.5 mb-1">
              <Keyboard className="w-3.5 h-3.5" />
              <span>8-Button Combat Matrix &amp; Keyboard Controls</span>
            </h4>
            <div className="text-[10px] text-zinc-400 space-y-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-zinc-300">
                <div><span className="text-blue-400 font-bold">LP (8 DMG):</span> <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white">U</kbd></div>
                <div><span className="text-indigo-400 font-bold">HP (16 DMG):</span> <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white">I</kbd></div>
                <div><span className="text-emerald-400 font-bold">LK (10 DMG):</span> <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white">J</kbd></div>
                <div><span className="text-red-400 font-bold">HK (20 DMG):</span> <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white">K</kbd></div>
                <div><span className="text-purple-400 font-bold">UPR (24 DMG):</span> <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white">Y / ▼+I</kbd></div>
                <div><span className="text-emerald-300 font-bold">SWP (14 DMG):</span> <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white">H / P / ▼+K</kbd></div>
                <div><span className="text-cyan-400 font-bold">SPC:</span> <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white">1 / 2 / 3</kbd></div>
                <div><span className="text-slate-300 font-bold">BLK / PRY:</span> <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-white">L</kbd></div>
              </div>
              <div className="pt-1.5 border-t border-zinc-800 flex flex-wrap gap-2 text-[9px]">
                <div>Movement: <strong className="text-zinc-200">W (Jump), A (Left), S (Crouch), D (Right)</strong></div>
                <div>Run Sprint: <strong className="text-orange-300">Shift (Run-Cancelable)</strong></div>
                <div>Close Throw: <strong className="text-rose-300">G (Unblockable)</strong></div>
                <div>Crouch Low Kick: <strong className="text-amber-300">▼ + J</strong></div>
                <div>Sweep (14 DMG): <strong className="text-emerald-400">▼ + K (or H / P)</strong></div>
                <div>Z-Sidestep / Tag: <strong className="text-cyan-400">Q / T</strong></div>
                <div>Super: <strong className="text-amber-400">Space / F</strong></div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold"
          >
            Close Archives
          </button>
        </div>
      </div>
    </div>
  );
};
