/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MOVEMENT_MECHANICS } from '../game/MovementMechanics';
import { MOVEMENT_MATRIX_CELLS } from '../game/MovementMatrix';
import { X } from 'lucide-react';

interface MechanicsModalProps {
  isOpen: boolean;
  activeMechId: number;
  onClose: () => void;
}

export const MechanicsModal: React.FC<MechanicsModalProps> = ({
  isOpen,
  activeMechId,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-zinc-950 border border-red-600/50 rounded-xl shadow-[0_0_40px_rgba(220,38,38,0.25)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
          <h3 className="font-kombat text-amber-400 text-xs sm:text-sm font-black tracking-wider uppercase">
            16 Sprite Movement Mechanics · Matrix Skin Map
          </h3>
          <button
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
            aria-label="Close mechanics catalog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Spatial Kombat & Linear Gauge Overview */}
        <div className="px-3 sm:px-4 pt-3">
          <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-cyan-500/40 font-mono text-[11px] space-y-1">
            <div className="text-cyan-300 font-bold uppercase">
              Spatial Kombat &amp; Linear Fighting Gauge Architecture
            </div>
            <p className="text-zinc-300 leading-snug">
              • <strong className="text-amber-300">Jump State Machine:</strong> 3f Pre-Jump squat → Ascent → Apex Hang → Descent → Air Drift [W] / Fast-Fall [S] / Drop-Through Platforms [S+W].
            </p>
            <p className="text-zinc-300 leading-snug">
              • <strong className="text-amber-300">2.5D Z-Lane Sidestep [Q / STEP]:</strong> Shift BACK ↔ MID ↔ FORE lanes to evade linear strikes &amp; projectiles (+16 Linear Gauge).
            </p>
            <p className="text-zinc-300 leading-snug">
              • <strong className="text-amber-300">Reactive Linear Gauge &amp; Breakers [X / BRK]:</strong> Anti-airs, whiff punishes, and parries drive tug-of-war Overdrive (+22% DMG) or unleash shockwave Breakers.
            </p>
          </div>
        </div>

        {/* 16-Grid Catalog */}
        <div className="p-3 sm:p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
          {MOVEMENT_MECHANICS.map((mech) => {
            const isActive = mech.id === activeMechId;
            const boundCells = MOVEMENT_MATRIX_CELLS.filter((c) => c.mechId === mech.id);
            const trackSummary = boundCells
              .slice(0, 2)
              .map((c) => `${c.spriteTrack}@${c.fps}fps`)
              .join(', ');

            return (
              <div
                key={mech.id}
                className={`p-2.5 rounded-lg border transition-colors ${
                  isActive
                    ? 'bg-red-950/40 border-amber-400 text-white'
                    : 'bg-zinc-900/70 border-zinc-800 text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <strong className="text-amber-400 text-[11px]">
                    {mech.id}: {mech.name}
                  </strong>
                  <span className="text-[9px] text-zinc-500 uppercase">
                    {mech.category}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  {mech.description}
                </p>
                {trackSummary && (
                  <div className="mt-1 text-[9.5px] text-cyan-300">
                    Sprite Skin: {trackSummary}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
