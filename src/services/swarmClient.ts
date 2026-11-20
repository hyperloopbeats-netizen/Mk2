/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CharacterId, StageId, SwarmSynthesisPatch } from '../types/fighter';
import { CHARACTERS, SIX_BUTTON_MOVES } from '../game/constants';
import { DEFAULT_SWARM_PATCH, MOVEMENT_MATRIX_CELLS } from '../game/MovementMatrix';
import { RetroAudio } from '../audio/RetroSynth';

export type SwarmArchetypeFocus =
  | 'MIDWAY_ARCADE_PRECISION'
  | 'HYPER_JUGGLE_RUSHDOWN'
  | 'CINEMATIC_BRUTALITY_HEAVY';

export function buildCodebaseSnapshot(p1CharId: CharacterId, cpuCharId: CharacterId, stageId: StageId) {
  const p1 = CHARACTERS[p1CharId] || CHARACTERS.scorpion;
  const cpu = CHARACTERS[cpuCharId] || CHARACTERS.smoke;

  return {
    totalCharacters: Object.keys(CHARACTERS).length,
    matrixCellCount: MOVEMENT_MATRIX_CELLS.length,
    stageId,
    p1: {
      id: p1.id,
      name: p1.name,
      speed: p1.speed,
      mass: p1.mass,
      specials: p1.specials.map((s) => ({ id: s.id, startup: s.startup, active: s.active, recovery: s.recovery })),
      superMove: p1.superMove.id,
    },
    cpu: {
      id: cpu.id,
      name: cpu.name,
      speed: cpu.speed,
      mass: cpu.mass,
    },
    coreButtons: Object.values(SIX_BUTTON_MOVES).map((m) => ({
      id: m.id,
      startup: m.startup,
      active: m.active,
      recovery: m.recovery,
      damage: m.damage,
    })),
    currentDspProfile: RetroAudio.getDspProfile(),
  };
}

export async function runSwarmOrchestration(params: {
  focusArchetype: SwarmArchetypeFocus;
  p1CharId: CharacterId;
  cpuCharId: CharacterId;
  stageId: StageId;
  customDirective?: string;
}): Promise<SwarmSynthesisPatch> {
  const snapshot = buildCodebaseSnapshot(params.p1CharId, params.cpuCharId, params.stageId);

  try {
    const res = await fetch('/api/swarm/orchestrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        focusArchetype: params.focusArchetype,
        p1CharId: params.p1CharId,
        cpuCharId: params.cpuCharId,
        stageId: params.stageId,
        customDirective: params.customDirective || '',
        codebaseSnapshot: snapshot,
      }),
    });
    if (!res.ok) {
      return DEFAULT_SWARM_PATCH;
    }
    const data = (await res.json()) as SwarmSynthesisPatch;
    return data;
  } catch {
    return DEFAULT_SWARM_PATCH;
  }
}
