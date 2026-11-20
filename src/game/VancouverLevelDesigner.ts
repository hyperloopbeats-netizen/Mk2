/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  LevelStrideZone,
  StageId,
  StagePlatform,
  VancouverLevelDesign,
  VancouverWeather,
  StrideEffectKind,
} from '../types/fighter';

export const PRESET_VANCOUVER_DESIGNS: Record<string, VancouverLevelDesign> = {
  VANCOUVER_LIONS_GATE: {
    id: 'vancouver_lions_gate_1962',
    title: 'Lions Gate Suspension Span',
    year: 1962,
    district: 'Stanley Park & First Narrows',
    eraAtmosphere: '1962 coastal gale sweeping cedar treetops and green Art Deco suspension towers above Burrard Inlet.',
    weather: 'FOG',
    skyPalette: ['#040d1a', '#0c223d', '#1c3b5c'],
    accentColor: '#38bdf8',
    landmarkType: 'LIONS_GATE_BRIDGE',
    strides: [
      {
        id: 'lg_stride_1',
        name: 'First Narrows Sea Fog',
        startX: 70,
        endX: 280,
        effect: 'FOG_CLOAK',
        intensity: 1.15,
        color: '#94a3b8',
        label: 'FOG CLOAK · +SIDESTEP',
      },
      {
        id: 'lg_stride_2',
        name: 'Art Deco Cable Bounce',
        startX: 370,
        endX: 590,
        effect: 'TRAM_SPRING',
        intensity: 1.22,
        color: '#38bdf8',
        label: 'BRIDGE SPRING · +22% JUMP',
      },
      {
        id: 'lg_stride_3',
        name: 'Wet Asphalt Causeway',
        startX: 675,
        endX: 890,
        effect: 'SLICK_SPEED',
        intensity: 1.18,
        color: '#22d3ee',
        label: 'RAIN SLICK · +28% SPEED',
      },
    ],
    platforms: [
      { id: 'lg_plat_1', label: 'NORTH TOWER TRUSS', x: 155, y: 315, width: 155, style: 'STEEL_TRUSS' },
      { id: 'lg_plat_2', label: 'SOUTH TOWER TRUSS', x: 645, y: 315, width: 155, style: 'STEEL_TRUSS' },
    ],
    hazards: ['Crosswind aerial drift', 'Slick wet tarmac corners'],
    architectNotes: '1962 Stanley Park causeway blueprint balancing high-bridge air launch center control with foggy sidestep wings.',
    source: 'BLUEPRINT_1960S',
  },

  VANCOUVER_GASTOWN: {
    id: 'vancouver_gastown_1964',
    title: 'Gastown Cobblestone & Steam',
    year: 1964,
    district: 'Water & Cambie Street',
    eraAtmosphere: '1964 gas-lamp alleys, hiss of underground steam mains, and Edwardian red-brick warehouses.',
    weather: 'DRIZZLE',
    skyPalette: ['#120a0d', '#241418', '#3b1f1a'],
    accentColor: '#f59e0b',
    landmarkType: 'GASTOWN_STEAM_CLOCK',
    strides: [
      {
        id: 'gt_stride_1',
        name: 'Trolley Rail Glide',
        startX: 80,
        endX: 295,
        effect: 'SLICK_SPEED',
        intensity: 1.2,
        color: '#f59e0b',
        label: 'TRAM SLICK · +28% DASH',
      },
      {
        id: 'gt_stride_2',
        name: 'Steam Vent Pressure Plate',
        startX: 380,
        endX: 580,
        effect: 'TIMBER_BOUNCE',
        intensity: 1.25,
        color: '#fb923c',
        label: 'STEAM LIFT · +LAUNCHER',
      },
      {
        id: 'gt_stride_3',
        name: 'Maple Tree Fog Pocket',
        startX: 660,
        endX: 880,
        effect: 'FOG_CLOAK',
        intensity: 1.15,
        color: '#cbd5e1',
        label: 'STEAM CLOAK · EVADE',
      },
    ],
    platforms: [
      { id: 'gt_plat_1', label: 'BC ELECTRIC TROLLEY', x: 140, y: 332, width: 165, style: 'STREETCAR' },
      { id: 'gt_plat_2', label: 'BRICK WAREHOUSE BALCONY', x: 640, y: 296, width: 160, style: 'BRICK_BALCONY' },
    ],
    hazards: ['Pressurized steam plumes', 'Wet granite cobblestones'],
    architectNotes: '1964 Water Street streetcar roof & brick fire-escape elevation creates asymmetric high-ground footsies.',
    source: 'BLUEPRINT_1960S',
  },

  VANCOUVER_CHINATOWN: {
    id: 'vancouver_chinatown_1966',
    title: 'Pender Neon Chinatown',
    year: 1966,
    district: 'East Pender & Keefer',
    eraAtmosphere: '1966 vertical emerald and crimson neon marquees reflecting off wet asphalt beneath the ornate Paifang gate.',
    weather: 'NEON_MIST',
    skyPalette: ['#070514', '#160b2e', '#2d1038'],
    accentColor: '#ec4899',
    landmarkType: 'CHINATOWN_GATE',
    strides: [
      {
        id: 'ct_stride_1',
        name: 'Lotus Lantern Neon Puddle',
        startX: 75,
        endX: 295,
        effect: 'NEON_SHOCK',
        intensity: 1.25,
        color: '#ec4899',
        label: 'NEON SURGE · +15% SPEC',
      },
      {
        id: 'ct_stride_2',
        name: 'Paifang Courtyard Slick',
        startX: 375,
        endX: 590,
        effect: 'SLICK_SPEED',
        intensity: 1.22,
        color: '#22d3ee',
        label: 'RAIN SLICK · +28% SPEED',
      },
      {
        id: 'ct_stride_3',
        name: 'Bamboo Canopy Spring',
        startX: 670,
        endX: 885,
        effect: 'TRAM_SPRING',
        intensity: 1.2,
        color: '#10b981',
        label: 'AWNING SPRING · +JUMP',
      },
    ],
    platforms: [
      { id: 'ct_plat_1', label: 'JADE CAFE NEON AWNING', x: 145, y: 304, width: 160, style: 'NEON_AWNING' },
      { id: 'ct_plat_2', label: 'PAGODA BALCONY LEDGE', x: 635, y: 304, width: 160, style: 'NEON_AWNING' },
    ],
    hazards: ['High-voltage neon transformers', 'Double overhead pagoda awnings'],
    architectNotes: 'Symmetrical 1966 Pender St neon awnings allow jump-cancels, cross-ups, and charged Special strides.',
    source: 'BLUEPRINT_1960S',
  },

  VANCOUVER_FALSE_CREEK: {
    id: 'vancouver_false_creek_1968',
    title: 'False Creek Timber Piers',
    year: 1968,
    district: 'South Shore Sawmills',
    eraAtmosphere: '1968 cedar log booms, creosote pilings, tugboat searchlights, and wet Douglas fir decking.',
    weather: 'RAIN',
    skyPalette: ['#061317', '#0e262b', '#173a3b'],
    accentColor: '#10b981',
    landmarkType: 'FALSE_CREEK_DOCKS',
    strides: [
      {
        id: 'fc_stride_1',
        name: 'Cedar Plank Spring Deck',
        startX: 70,
        endX: 300,
        effect: 'TIMBER_BOUNCE',
        intensity: 1.28,
        color: '#10b981',
        label: 'TIMBER BOUNCE · JUGGLE+',
      },
      {
        id: 'fc_stride_2',
        name: 'Tugboat Mist Drift',
        startX: 375,
        endX: 590,
        effect: 'FOG_CLOAK',
        intensity: 1.2,
        color: '#94a3b8',
        label: 'HARBOR FOG · +SIDESTEP',
      },
      {
        id: 'fc_stride_3',
        name: 'Log Boom Catwalk',
        startX: 665,
        endX: 890,
        effect: 'TRAM_SPRING',
        intensity: 1.18,
        color: '#f59e0b',
        label: 'PIER SPRING · +22% JUMP',
      },
    ],
    platforms: [
      { id: 'fc_plat_1', label: 'SAWMILL TIMBER PIER', x: 200, y: 325, width: 170, style: 'TIMBER_PIER' },
      { id: 'fc_plat_2', label: 'CARGO GANTRY DECK', x: 575, y: 295, width: 165, style: 'STEEL_TRUSS' },
    ],
    hazards: ['Springy cedar timber boards', 'Blind coastal rain gusts'],
    architectNotes: 'Built around 1968 industrial lumber piers favoring upward launcher juggles and platform air dives.',
    source: 'BLUEPRINT_1960S',
  },

  VANCOUVER_VIADUCT: {
    id: 'vancouver_viaduct_1969',
    title: 'Georgia Viaduct Sky-Rift',
    year: 1969,
    district: 'Downtown Overpass & Expo Rift',
    eraAtmosphere: '1969 brutalist concrete arches under construction, torn open by an Outworld atmospheric storm.',
    weather: 'STORM',
    skyPalette: ['#0d041c', '#210a3b', '#3a1154'],
    accentColor: '#a855f7',
    landmarkType: 'GEORGIA_VIADUCT',
    strides: [
      {
        id: 'gv_stride_1',
        name: 'Rift Gravity Anomaly',
        startX: 330,
        endX: 630,
        effect: 'GRAVITY_RIFT',
        intensity: 1.35,
        color: '#a855f7',
        label: 'GRAVITY RIFT · LOW-G AIR',
      },
      {
        id: 'gv_stride_2',
        name: 'Electrified Viaduct Rail',
        startX: 70,
        endX: 270,
        effect: 'NEON_SHOCK',
        intensity: 1.25,
        color: '#38bdf8',
        label: 'ARC SURGE · +15% SPEC',
      },
      {
        id: 'gv_stride_3',
        name: 'Wet Concrete Ramp',
        startX: 690,
        endX: 895,
        effect: 'SLICK_SPEED',
        intensity: 1.24,
        color: '#f43f5e',
        label: 'OVERPASS SLICK · +SPEED',
      },
    ],
    platforms: [
      { id: 'gv_plat_1', label: 'VIADUCT REBAR SPAN', x: 135, y: 310, width: 160, style: 'STEEL_TRUSS' },
      { id: 'gv_plat_2', label: 'SUSPENDED TRAM CAR', x: 400, y: 280, width: 160, style: 'STREETCAR' },
      { id: 'gv_plat_3', label: 'CONCRETE DECK CRANE', x: 660, y: 310, width: 160, style: 'BRICK_BALCONY' },
    ],
    hazards: ['Central low-gravity rift', '3-platform aerial triangle'],
    architectNotes: '1969 Finale arena combining triple sky decks with a central Outworld gravity-rift juggle corridor.',
    source: 'BLUEPRINT_1960S',
  },
};

let activeCustomDesign: VancouverLevelDesign = {
  ...PRESET_VANCOUVER_DESIGNS.VANCOUVER_CHINATOWN,
  id: 'custom_vancouver_1967',
  title: 'Robson & Pender Streetcar Nexus (1967)',
  year: 1967,
  district: 'Robson Square & Chinatown Edge',
  eraAtmosphere: '1967 Centennial rainstorm, glowing neon theater signs, and crackling BC Electric streetcar lines.',
  source: 'BLUEPRINT_1960S',
};

export function getActiveVancouverDesign(stageId: StageId): VancouverLevelDesign | null {
  if (stageId === 'CUSTOM_VANCOUVER_AI') return activeCustomDesign;
  return PRESET_VANCOUVER_DESIGNS[stageId] || null;
}

export function getCustomVancouverDesign(): VancouverLevelDesign {
  return activeCustomDesign;
}

export function setCustomVancouverDesign(design: VancouverLevelDesign) {
  activeCustomDesign = design;
}

export function getStrideAtPosition(x: number, stageId: StageId): LevelStrideZone | null {
  const design = getActiveVancouverDesign(stageId);
  if (!design) return null;
  for (const s of design.strides) {
    if (x >= s.startX && x <= s.endX) return s;
  }
  return null;
}

export function getPlatformsForStage(stageId: StageId): StagePlatform[] {
  const design = getActiveVancouverDesign(stageId);
  return design ? design.platforms : [];
}

export async function requestAiLevelDesign(params: {
  prompt: string;
  district: string;
  year: number;
  weather: VancouverWeather;
  strideFocus: string;
  chaosLevel: number;
}): Promise<VancouverLevelDesign> {
  try {
    const resp = await fetch('/api/level-designer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (resp.ok) {
      const data = (await resp.json()) as VancouverLevelDesign;
      setCustomVancouverDesign(data);
      return data;
    }
  } catch {
    // Fallback below
  }

  const effectCycle: StrideEffectKind[] =
    params.strideFocus === 'AERIAL'
      ? ['TRAM_SPRING', 'GRAVITY_RIFT', 'TIMBER_BOUNCE']
      : params.strideFocus === 'SPEED'
      ? ['SLICK_SPEED', 'FOG_CLOAK', 'SLICK_SPEED']
      : ['TRAM_SPRING', 'NEON_SHOCK', 'SLICK_SPEED'];

  const localDesign: VancouverLevelDesign = {
    ...PRESET_VANCOUVER_DESIGNS.VANCOUVER_GASTOWN,
    id: `local_vancouver_${params.year}`,
    title: `${params.district} (${params.year})`,
    year: params.year,
    district: params.district,
    weather: params.weather,
    eraAtmosphere: `${params.year} ${params.district} — ${params.prompt}`,
    strides: [
      {
        id: 'loc_1',
        name: 'Westbound Trolley Stride',
        startX: 75,
        endX: 280,
        effect: effectCycle[0],
        intensity: 1.2,
        color: '#38bdf8',
        label: `${effectCycle[0].replace('_', ' ')}`,
      },
      {
        id: 'loc_2',
        name: 'Midtown Rift Intersection',
        startX: 375,
        endX: 590,
        effect: effectCycle[1],
        intensity: 1.25,
        color: '#ec4899',
        label: `${effectCycle[1].replace('_', ' ')}`,
      },
      {
        id: 'loc_3',
        name: 'Eastbound Harbor Slick',
        startX: 675,
        endX: 885,
        effect: effectCycle[2],
        intensity: 1.18,
        color: '#f59e0b',
        label: `${effectCycle[2].replace('_', ' ')}`,
      },
    ],
    architectNotes: `Manifested offline 1960s Vancouver architectural stride layout for ${params.district}.`,
    source: 'BLUEPRINT_1960S',
  };
  setCustomVancouverDesign(localDesign);
  return localDesign;
}
