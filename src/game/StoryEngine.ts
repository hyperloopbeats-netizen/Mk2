/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CharacterId,
  PlotArtEvolutionStage,
  StoryCampaignState,
  StoryChoice,
  StoryCutsceneData,
  StoryNode,
} from '../types/fighter';

/**
 * Non-Linear 1960s Vancouver Branching Progression Graph.
 * Players conquer districts across branching routes toward the 1969 Georgia Viaduct & Expo Rift finale.
 */
export const STORY_NODES: StoryNode[] = [
  {
    id: 'lions_gate_1962',
    title: 'Lions Gate Awakening',
    district: 'Stanley Park & First Narrows',
    year: 1962,
    stageId: 'VANCOUVER_LIONS_GATE',
    opponentId: 'subzero',
    opponentPartnerId: 'johnny',
    xPct: 12,
    yPct: 50,
    tier: 0,
    prerequisites: [],
    nextNodes: ['gastown_1964', 'chinatown_1966'],
    rewardPerk: 'BRIDGE_TRACTION',
    description: '1962 midnight fog blankets the green Art Deco suspension span. Intercept the Lin Kuei vanguard crossing Burrard Inlet.',
  },
  {
    id: 'gastown_1964',
    title: 'Gastown Steam Syndicate',
    district: 'Water & Cambie Street',
    year: 1964,
    stageId: 'VANCOUVER_GASTOWN',
    opponentId: 'johnny',
    opponentPartnerId: 'liukang',
    xPct: 36,
    yPct: 26,
    tier: 1,
    prerequisites: ['lions_gate_1962'],
    nextNodes: ['burrard_fog_1965', 'robson_tram_1967'],
    rewardPerk: 'GAUGE_SURGE',
    description: 'Cobblestone alleyways hiss with steam mains while rival Earthrealm agents guard an Outworld smuggling ledger.',
  },
  {
    id: 'chinatown_1966',
    title: 'Pender Neon Paifang',
    district: 'Chinatown · East Pender',
    year: 1966,
    stageId: 'VANCOUVER_CHINATOWN',
    opponentId: 'liukang',
    opponentPartnerId: 'johnny',
    xPct: 36,
    yPct: 74,
    tier: 1,
    prerequisites: ['lions_gate_1962'],
    nextNodes: ['robson_tram_1967', 'false_creek_1968'],
    rewardPerk: 'STRIDE_AMPLIFIER',
    description: 'Beneath glowing 1966 Cantonese neon marquees, White Lotus envoys challenge your right to enter the Keefer Street portal.',
  },
  {
    id: 'burrard_fog_1965',
    title: 'Burrard Inlet Fog Pier',
    district: 'Coal Harbour Seaplane Dock',
    year: 1965,
    stageId: 'VANCOUVER_LIONS_GATE',
    opponentId: 'subzero',
    opponentPartnerId: 'scorpion',
    xPct: 60,
    yPct: 18,
    tier: 2,
    prerequisites: ['gastown_1964'],
    nextNodes: ['georgia_viaduct_1969'],
    rewardPerk: 'IRON_BREAKER',
    description: 'Enenra wraiths lurk in harbour mist. Master Z-lane sidesteps to survive ambush strikes.',
  },
  {
    id: 'robson_tram_1967',
    title: 'Robson Trolley Fracture',
    district: 'Robson & Granville Crossing',
    year: 1967,
    stageId: 'VANCOUVER_GASTOWN',
    opponentId: 'johnny',
    opponentPartnerId: 'subzero',
    xPct: 60,
    yPct: 50,
    tier: 2,
    prerequisites: ['gastown_1964', 'chinatown_1966'],
    nextNodes: ['georgia_viaduct_1969'],
    rewardPerk: 'AERIAL_DRIFT',
    description: 'High-voltage BC Electric trolley overhead wires draw Raiden’s storm down onto the 1967 shopping promenade.',
  },
  {
    id: 'false_creek_1968',
    title: 'False Creek Lumber War',
    district: 'Granville Sawmill Docks',
    year: 1968,
    stageId: 'VANCOUVER_FALSE_CREEK',
    opponentId: 'liukang',
    opponentPartnerId: 'scorpion',
    xPct: 60,
    yPct: 82,
    tier: 2,
    prerequisites: ['chinatown_1966'],
    nextNodes: ['georgia_viaduct_1969'],
    rewardPerk: 'CRYO_WARD',
    description: 'Outworld predators nest beneath cedar log booms along False Creek. Shatter their hold before Expo 69 begins.',
  },
  {
    id: 'georgia_viaduct_1969',
    title: 'Georgia Viaduct Eclipse',
    district: 'Downtown Overpass Construction',
    year: 1969,
    stageId: 'VANCOUVER_VIADUCT',
    opponentId: 'subzero',
    opponentPartnerId: 'liukang',
    xPct: 80,
    yPct: 50,
    tier: 3,
    prerequisites: ['burrard_fog_1965', 'robson_tram_1967', 'false_creek_1968'],
    nextNodes: ['expo_sky_rift_finale'],
    rewardPerk: 'OVERDRIVE_SOUL',
    description: 'Unfinished 1969 concrete arches warp under a violet Outworld gravity rift. Prince Goro blocks the bridgehead.',
  },
  {
    id: 'expo_sky_rift_finale',
    title: '1969 Sky-Rift Convergence',
    district: 'Vancouver Harbour Skyline',
    year: 1969,
    stageId: 'VANCOUVER_VIADUCT',
    opponentId: 'scorpion',
    opponentPartnerId: 'subzero',
    xPct: 94,
    yPct: 50,
    tier: 4,
    prerequisites: ['georgia_viaduct_1969'],
    nextNodes: [],
    rewardPerk: 'SOVEREIGN_CHAMPION',
    description: 'Final Confrontation: Seal the dimensional tear above 1969 Vancouver before Outworld consumes the Pacific Coast.',
    isFinale: true,
  },
];

export function getStoryNodeById(id: string | null): StoryNode | null {
  if (!id) return null;
  return STORY_NODES.find((n) => n.id === id) || null;
}

export function createInitialStoryState(): StoryCampaignState {
  const initialArt: PlotArtEvolutionStage = {
    chapterId: 'prologue_1962',
    title: 'Prelude: Burrard Fog 1962',
    subtitle: 'Stanley Park & Lions Gate · Act I',
    year: 1962,
    landmark: 'LIONS_GATE_BRIDGE',
    weather: 'FOG',
    skyTint: ['#040d1a', '#162d47'],
    focalColor: '#38bdf8',
    secondaryColor: '#f59e0b',
    fogDensity: 0.45,
    neonIntensity: 0.42,
    riftFracture: 0.12,
    silhouettePose: 'STANDOFF',
    motifGlyph: 'BRIDGE_CABLES',
  };

  return {
    active: true,
    currentNodeId: 'lions_gate_1962',
    completedNodeIds: [],
    unlockedNodeIds: ['lions_gate_1962'],
    unlockedPerks: [],
    riftCorruption: 0.15,
    artEvolutionHistory: [initialArt],
    chosenHistory: [],
    pendingCutscene: null,
  };
}

/**
 * Unlocks non-linear branches after defeating a chapter node.
 * Note: tier 3 opens as soon as ANY tier 2 branch linked to it is completed!
 */
export function advanceStoryAfterVictory(
  state: StoryCampaignState,
  completedNodeId: string,
  chosenChoice?: StoryChoice | null
): StoryCampaignState {
  const node = getStoryNodeById(completedNodeId);
  if (!node) return state;

  const completed = state.completedNodeIds.includes(completedNodeId)
    ? state.completedNodeIds
    : [...state.completedNodeIds, completedNodeId];

  const unlockedSet = new Set<string>(state.unlockedNodeIds);
  for (const nextId of node.nextNodes) {
    unlockedSet.add(nextId);
  }

  const perksSet = new Set<string>(state.unlockedPerks);
  if (node.rewardPerk) perksSet.add(node.rewardPerk);
  if (chosenChoice?.unlockedPerk) perksSet.add(chosenChoice.unlockedPerk);

  const nextCorruption = Math.max(
    0.05,
    Math.min(1, state.riftCorruption + (chosenChoice?.riftShift ?? 0.08))
  );

  // Evolve victory artwork into history strip
  const lastArt = state.artEvolutionHistory[state.artEvolutionHistory.length - 1];
  const evolvedVictoryArt: PlotArtEvolutionStage | null = lastArt
    ? {
        ...lastArt,
        chapterId: `${completedNodeId}_victory`,
        title: `${node.title} · Conquered`,
        subtitle: `Vancouver ${node.year} · Evolution Stage ${state.artEvolutionHistory.length + 1}`,
        riftFracture: nextCorruption,
        silhouettePose: node.isFinale ? 'ASCENSION' : 'VICTORY_RIFT',
      }
    : null;

  const nextUnlocked = Array.from(unlockedSet);
  const suggestedNext =
    node.nextNodes.find((id) => !completed.includes(id)) ||
    nextUnlocked.find((id) => !completed.includes(id)) ||
    node.id;

  return {
    ...state,
    currentNodeId: suggestedNext,
    completedNodeIds: completed,
    unlockedNodeIds: nextUnlocked,
    unlockedPerks: Array.from(perksSet),
    riftCorruption: nextCorruption,
    artEvolutionHistory: evolvedVictoryArt
      ? [...state.artEvolutionHistory, evolvedVictoryArt]
      : state.artEvolutionHistory,
    chosenHistory: chosenChoice
      ? [
          ...state.chosenHistory,
          {
            nodeId: completedNodeId,
            choiceLabel: chosenChoice.label,
            perk: chosenChoice.unlockedPerk,
          },
        ]
      : state.chosenHistory,
    pendingCutscene: null,
  };
}

export interface StoryPerkBonuses {
  gaugeGainMult: number;
  strideBonusMult: number;
  damageReduction: number;
  extraBreakers: number;
  jumpBoostMult: number;
  bonusStartGauge: number;
}

export function computeStoryPerkBonuses(perks: string[]): StoryPerkBonuses {
  const has = (p: string) => perks.includes(p);
  return {
    gaugeGainMult: has('GAUGE_SURGE') || has('OVERDRIVE_SOUL') ? 1.22 : 1.0,
    strideBonusMult: has('STRIDE_AMPLIFIER') || has('BRIDGE_TRACTION') ? 1.2 : 1.0,
    damageReduction: has('CRYO_WARD') ? 0.12 : 0,
    extraBreakers: has('IRON_BREAKER') ? 1 : 0,
    jumpBoostMult: has('AERIAL_DRIFT') ? 1.12 : 1.0,
    bonusStartGauge: has('SOVEREIGN_CHAMPION') || has('OVERDRIVE_SOUL') ? 22 : 0,
  };
}

export async function fetchStoryCutscene(
  node: StoryNode,
  state: StoryCampaignState,
  playerChar: CharacterId
): Promise<StoryCutsceneData> {
  const chapterNum = state.completedNodeIds.length + 1;
  const prevChoice =
    state.chosenHistory.length > 0
      ? state.chosenHistory[state.chosenHistory.length - 1].choiceLabel
      : 'Arrival in 1962 Vancouver';

  try {
    const resp = await fetch('/api/story/chapter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodeId: node.id,
        nodeTitle: node.title,
        district: node.district,
        year: node.year,
        playerChar,
        opponentChar: node.opponentId,
        chapterNum,
        previousChoice: prevChoice,
        riftCorruption: state.riftCorruption,
      }),
    });
    if (resp.ok) {
      return (await resp.json()) as StoryCutsceneData;
    }
  } catch {
    // Fallback below
  }

  return {
    nodeId: node.id,
    title: node.title,
    chapterNum,
    summary: node.description,
    lines: [
      {
        speaker: 'CHRONICLE NARRATOR',
        role: 'NARRATOR',
        text: `${node.district}, ${node.year}. Salt rain blurs the neon lights while Outworld shadows gather on the pavement.`,
        color: '#94a3b8',
      },
      {
        speaker: node.opponentId.toUpperCase(),
        role: 'RIVAL',
        text: `You crossed the ${node.year} border looking for answers. You will only find kombat.`,
        color: '#f87171',
      },
      {
        speaker: playerChar.toUpperCase(),
        role: 'HERO',
        text: `No Outworld portal survives this district. Prepare yourself.`,
        color: '#fbbf24',
      },
    ],
    choices: [
      {
        id: 'tactical_surge',
        label: 'CHANNEL LINEAR KOMBAT DISCIPLINE',
        tacticalEffect: '+22% Linear Gauge Reactive Gain',
        narrativeDirection: 'Hold the center ground and parry every rush.',
        unlockedPerk: 'GAUGE_SURGE',
        nextNodeId: node.id,
        riftShift: -0.06,
      },
      {
        id: 'rift_stride',
        label: 'EMBRACE 1960s STREET STRIDE',
        tacticalEffect: '+20% District Stride & Jump Mastery',
        narrativeDirection: 'Exploit the wet rails, fog, and rooftops.',
        unlockedPerk: 'STRIDE_AMPLIFIER',
        nextNodeId: node.id,
        riftShift: 0.16,
      },
    ],
    plotArt: {
      chapterId: node.id,
      title: node.title,
      subtitle: `${node.district} · ${node.year}`,
      year: node.year,
      landmark:
        node.stageId === 'VANCOUVER_CHINATOWN'
          ? 'CHINATOWN_GATE'
          : node.stageId === 'VANCOUVER_GASTOWN'
          ? 'GASTOWN_STEAM_CLOCK'
          : node.stageId === 'VANCOUVER_FALSE_CREEK'
          ? 'FALSE_CREEK_DOCKS'
          : node.stageId === 'VANCOUVER_VIADUCT'
          ? 'GEORGIA_VIADUCT'
          : 'LIONS_GATE_BRIDGE',
      weather: node.year >= 1968 ? 'STORM' : 'NEON_MIST',
      skyTint: state.riftCorruption > 0.5 ? ['#160624', '#3d0e36'] : ['#071224', '#162d47'],
      focalColor: state.riftCorruption > 0.5 ? '#f43f5e' : '#38bdf8',
      secondaryColor: '#f59e0b',
      fogDensity: Math.min(0.9, 0.35 + state.riftCorruption * 0.45),
      neonIntensity: node.stageId === 'VANCOUVER_CHINATOWN' ? 0.92 : 0.65,
      riftFracture: state.riftCorruption,
      silhouettePose: chapterNum > 2 ? 'CLASH' : 'STANDOFF',
      motifGlyph: node.isFinale ? 'VOID_ORB' : 'DRAGON',
    },
    arenaDirective: `Master ${node.district} terrain strides and 2.5D Z-lane sidesteps.`,
    source: 'CHRONICLE_BLUEPRINT',
  };
}
