/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CharacterDef, SpriteTrackName } from '../types/fighter';

export type WeaponClass =
  | 'KATANA'
  | 'SICKLE'
  | 'STAFF'
  | 'HAMMER'
  | 'FANS'
  | 'SAI'
  | 'DUAL_SWORDS'
  | 'SPIKE'
  | 'RESONATOR'
  | 'NUNCHAKU'
  | 'CLAW'
  | 'HAT'
  | 'KNUCKLES';

export type WeaponSwingStyle = 'SLASH' | 'THRUST' | 'SPIN' | 'WHIP' | 'BLAST';

export interface WeaponMatrixEntry {
  weaponType: CharacterDef['weaponType'];
  weaponClass: WeaponClass;
  swingStyle: WeaponSwingStyle;
  animTrack: Extract<SpriteTrackName, 'weaponSlash' | 'weaponThrust'>;
  reachPx: number;
  hitboxHeight: number;
  arcRadius: number;
  arcSpanDeg: number;
  flashColor: string;
  edgeCoreColor: string;
  cancelToSpecial: boolean;
  comboFinisherBonus: number;
  trailAlpha: number;
}

export const WEAPON_MATRIX: Record<CharacterDef['weaponType'], WeaponMatrixEntry> = {
  KATANA: {
    weaponType: 'KATANA',
    weaponClass: 'KATANA',
    swingStyle: 'SLASH',
    animTrack: 'weaponSlash',
    reachPx: 68,
    hitboxHeight: 42,
    arcRadius: 68,
    arcSpanDeg: 135,
    flashColor: '#f97316',
    edgeCoreColor: '#fff7ed',
    cancelToSpecial: true,
    comboFinisherBonus: 1.25,
    trailAlpha: 0.92,
  },
  ICE_BLADE: {
    weaponType: 'ICE_BLADE',
    weaponClass: 'KATANA',
    swingStyle: 'SLASH',
    animTrack: 'weaponSlash',
    reachPx: 70,
    hitboxHeight: 44,
    arcRadius: 72,
    arcSpanDeg: 140,
    flashColor: '#38bdf8',
    edgeCoreColor: '#f0f9ff',
    cancelToSpecial: true,
    comboFinisherBonus: 1.26,
    trailAlpha: 0.94,
  },
  SICKLE: {
    weaponType: 'SICKLE',
    weaponClass: 'SICKLE',
    swingStyle: 'WHIP',
    animTrack: 'weaponSlash',
    reachPx: 64,
    hitboxHeight: 40,
    arcRadius: 64,
    arcSpanDeg: 150,
    flashColor: '#94a3b8',
    edgeCoreColor: '#f8fafc',
    cancelToSpecial: true,
    comboFinisherBonus: 1.22,
    trailAlpha: 0.88,
  },
  THUNDER_STAFF: {
    weaponType: 'THUNDER_STAFF',
    weaponClass: 'STAFF',
    swingStyle: 'THRUST',
    animTrack: 'weaponThrust',
    reachPx: 74,
    hitboxHeight: 38,
    arcRadius: 74,
    arcSpanDeg: 115,
    flashColor: '#60a5fa',
    edgeCoreColor: '#eff6ff',
    cancelToSpecial: true,
    comboFinisherBonus: 1.28,
    trailAlpha: 0.95,
  },
  NUNCHAKU: {
    weaponType: 'NUNCHAKU',
    weaponClass: 'NUNCHAKU',
    swingStyle: 'SPIN',
    animTrack: 'weaponSlash',
    reachPx: 62,
    hitboxHeight: 40,
    arcRadius: 58,
    arcSpanDeg: 185,
    flashColor: '#fb7185',
    edgeCoreColor: '#fff1f2',
    cancelToSpecial: true,
    comboFinisherBonus: 1.24,
    trailAlpha: 0.9,
  },
  WINDMILL_BLADES: {
    weaponType: 'WINDMILL_BLADES',
    weaponClass: 'FANS',
    swingStyle: 'SPIN',
    animTrack: 'weaponSlash',
    reachPx: 66,
    hitboxHeight: 44,
    arcRadius: 62,
    arcSpanDeg: 195,
    flashColor: '#22d3ee',
    edgeCoreColor: '#ecfeff',
    cancelToSpecial: true,
    comboFinisherBonus: 1.24,
    trailAlpha: 0.9,
  },
  BRASS_KNUCKLES: {
    weaponType: 'BRASS_KNUCKLES',
    weaponClass: 'KNUCKLES',
    swingStyle: 'THRUST',
    animTrack: 'weaponThrust',
    reachPx: 58,
    hitboxHeight: 36,
    arcRadius: 48,
    arcSpanDeg: 95,
    flashColor: '#34d399',
    edgeCoreColor: '#ecfdf5',
    cancelToSpecial: true,
    comboFinisherBonus: 1.22,
    trailAlpha: 0.88,
  },
  SHADOW_SCYTHE: {
    weaponType: 'SHADOW_SCYTHE',
    weaponClass: 'SICKLE',
    swingStyle: 'SLASH',
    animTrack: 'weaponSlash',
    reachPx: 72,
    hitboxHeight: 46,
    arcRadius: 74,
    arcSpanDeg: 160,
    flashColor: '#a855f7',
    edgeCoreColor: '#faf5ff',
    cancelToSpecial: true,
    comboFinisherBonus: 1.3,
    trailAlpha: 0.94,
  },
  SONIC_RESONATOR: {
    weaponType: 'SONIC_RESONATOR',
    weaponClass: 'RESONATOR',
    swingStyle: 'BLAST',
    animTrack: 'weaponThrust',
    reachPx: 68,
    hitboxHeight: 42,
    arcRadius: 66,
    arcSpanDeg: 120,
    flashColor: '#22d3ee',
    edgeCoreColor: '#ffffff',
    cancelToSpecial: true,
    comboFinisherBonus: 1.32,
    trailAlpha: 0.95,
  },
  REPTILE_CLAW: {
    weaponType: 'REPTILE_CLAW',
    weaponClass: 'CLAW',
    swingStyle: 'SLASH',
    animTrack: 'weaponSlash',
    reachPx: 60,
    hitboxHeight: 38,
    arcRadius: 56,
    arcSpanDeg: 130,
    flashColor: '#4ade80',
    edgeCoreColor: '#f0fdf4',
    cancelToSpecial: true,
    comboFinisherBonus: 1.24,
    trailAlpha: 0.9,
  },
  RAZOR_HAT: {
    weaponType: 'RAZOR_HAT',
    weaponClass: 'HAT',
    swingStyle: 'SPIN',
    animTrack: 'weaponSlash',
    reachPx: 66,
    hitboxHeight: 38,
    arcRadius: 62,
    arcSpanDeg: 210,
    flashColor: '#38bdf8',
    edgeCoreColor: '#f8fafc',
    cancelToSpecial: true,
    comboFinisherBonus: 1.26,
    trailAlpha: 0.92,
  },
  STEEL_FANS: {
    weaponType: 'STEEL_FANS',
    weaponClass: 'FANS',
    swingStyle: 'SPIN',
    animTrack: 'weaponSlash',
    reachPx: 64,
    hitboxHeight: 42,
    arcRadius: 60,
    arcSpanDeg: 170,
    flashColor: '#3b82f6',
    edgeCoreColor: '#eff6ff',
    cancelToSpecial: true,
    comboFinisherBonus: 1.25,
    trailAlpha: 0.92,
  },
  TWIN_SAI: {
    weaponType: 'TWIN_SAI',
    weaponClass: 'SAI',
    swingStyle: 'THRUST',
    animTrack: 'weaponThrust',
    reachPx: 60,
    hitboxHeight: 34,
    arcRadius: 54,
    arcSpanDeg: 105,
    flashColor: '#e879f9',
    edgeCoreColor: '#fdf4ff',
    cancelToSpecial: true,
    comboFinisherBonus: 1.25,
    trailAlpha: 0.92,
  },
  SHOKAN_HAMMER: {
    weaponType: 'SHOKAN_HAMMER',
    weaponClass: 'HAMMER',
    swingStyle: 'SLASH',
    animTrack: 'weaponSlash',
    reachPx: 74,
    hitboxHeight: 48,
    arcRadius: 76,
    arcSpanDeg: 145,
    flashColor: '#ef4444',
    edgeCoreColor: '#fef2f2',
    cancelToSpecial: true,
    comboFinisherBonus: 1.35,
    trailAlpha: 0.94,
  },
  AUTO9_SPIKE: {
    weaponType: 'AUTO9_SPIKE',
    weaponClass: 'SPIKE',
    swingStyle: 'THRUST',
    animTrack: 'weaponThrust',
    reachPx: 64,
    hitboxHeight: 34,
    arcRadius: 56,
    arcSpanDeg: 90,
    flashColor: '#38bdf8',
    edgeCoreColor: '#f8fafc',
    cancelToSpecial: true,
    comboFinisherBonus: 1.24,
    trailAlpha: 0.9,
  },
  TWIN_NINJATO: {
    weaponType: 'TWIN_NINJATO',
    weaponClass: 'DUAL_SWORDS',
    swingStyle: 'SLASH',
    animTrack: 'weaponSlash',
    reachPx: 68,
    hitboxHeight: 42,
    arcRadius: 66,
    arcSpanDeg: 155,
    flashColor: '#3b82f6',
    edgeCoreColor: '#eff6ff',
    cancelToSpecial: true,
    comboFinisherBonus: 1.28,
    trailAlpha: 0.93,
  },
  SOUL_SCROLL: {
    weaponType: 'SOUL_SCROLL',
    weaponClass: 'STAFF',
    swingStyle: 'BLAST',
    animTrack: 'weaponThrust',
    reachPx: 70,
    hitboxHeight: 40,
    arcRadius: 68,
    arcSpanDeg: 130,
    flashColor: '#10b981',
    edgeCoreColor: '#ecfdf5',
    cancelToSpecial: true,
    comboFinisherBonus: 1.28,
    trailAlpha: 0.92,
  },
};

export function getWeaponMatrixEntry(weaponType: CharacterDef['weaponType']): WeaponMatrixEntry {
  return WEAPON_MATRIX[weaponType] || WEAPON_MATRIX.KATANA;
}
