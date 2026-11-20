/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CHARACTERS } from '../game/constants';
import { CharacterId, CORE_CHARACTER_IDS } from '../types/fighter';
import { X, UserCheck } from 'lucide-react';

interface CharacterSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  p1CharId: CharacterId;
  cpuCharId: CharacterId;
  onSelectP1: (id: CharacterId) => void;
  onSelectCpu: (id: CharacterId) => void;
}

export const CharacterSelectModal: React.FC<CharacterSelectModalProps> = ({
  isOpen,
  onClose,
  p1CharId,
  cpuCharId,
  onSelectP1,
  onSelectCpu,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-xl max-h-[85vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-cyan-400" />
            <h2 className="font-kombat text-sm sm:text-base font-black tracking-wider text-slate-100">
              CHOOSE YOUR KOMBATANT
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Roster Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono">
          <p className="text-[11px] text-zinc-400">
            Select your champion and opponent from the 4 core fighters. Each fighter features signature special moves and 4-zone anatomical impact.
          </p>

          <div className="grid gap-2.5">
            {CORE_CHARACTER_IDS.map((id) => {
              const char = CHARACTERS[id];
              const isP1 = p1CharId === char.id;
              const isCpu = cpuCharId === char.id;

              return (
                <div
                  key={char.id}
                  className={`p-3 rounded-lg border transition-all ${
                    isP1
                      ? 'bg-zinc-900/90 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                      : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {/* Character Color Emblem */}
                      <div
                        className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs shadow"
                        style={{
                          backgroundColor: char.giColor,
                          borderColor: char.accentColor,
                          color: '#ffffff',
                        }}
                      >
                        {char.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-kombat font-bold text-sm tracking-wide text-slate-100">
                          {char.name}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {char.title} · <span className="text-zinc-500">{char.realm}</span>
                        </div>
                      </div>
                    </div>

                    {/* Role Assignment Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onSelectP1(char.id as CharacterId)}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                          isP1
                            ? 'bg-amber-500 text-zinc-950 font-black'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {isP1 ? '✓ P1 YOU' : 'PLAY AS'}
                      </button>

                      <button
                        onClick={() => onSelectCpu(char.id as CharacterId)}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                          isCpu
                            ? 'bg-red-600 text-white font-black'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {isCpu ? '✓ CPU' : 'SET CPU'}
                      </button>
                    </div>
                  </div>

                  {/* Character Specials Preview */}
                  <div className="mt-2 pt-2 border-t border-zinc-800/80 flex flex-wrap items-center gap-1.5 text-[9px]">
                    <span className="text-zinc-500 font-bold">SPECIALS:</span>
                    {char.specials.map((s) => (
                      <span
                        key={s.id}
                        className="px-1.5 py-0.5 rounded bg-zinc-950 text-slate-300 border border-zinc-800"
                      >
                        {s.name}
                      </span>
                    ))}
                    <span className="px-1.5 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-800/50">
                      Fatality: {char.fatalityMove.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold font-kombat tracking-wider"
          >
            ENTER THE REALM
          </button>
        </div>
      </div>
    </div>
  );
};
