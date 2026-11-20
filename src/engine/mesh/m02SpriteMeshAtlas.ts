/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { M01_ArcadeManualSpec } from './m01Config';
import { M08_Watchdog } from './m08Watchdog';
import type { AnimSpec, FighterSpec, FrameData, MeshNodeLocal, SpriteSheetEntry } from './types';

export const mkAnims: Record<string, AnimSpec> = {
  idle:       { frames: 8, loop: true },
  walk:       { frames: 8, loop: true },
  crouch:     { frames: 4, loop: true },
  jump:       { frames: 6, loop: false },
  hp:         { frames: 7, loop: false },
  lp:         { frames: 6, loop: false },
  hk:         { frames: 8, loop: false },
  lk:         { frames: 7, loop: false },
  uppercut:   { frames: 10, loop: false },
  sweep:      { frames: 9, loop: false },
  roundhouse: { frames: 10, loop: false },
  throw:      { frames: 8, loop: false },
  projectile: { frames: 9, loop: false },
  hitstun:    { frames: 5, loop: false },
  blockstun:  { frames: 4, loop: false },
  ko:         { frames: 6, loop: false },
};

export const M02_SpriteMeshAtlas = {
  sheets: new Map<string, SpriteSheetEntry>(),
  fighters: new Map<string, FighterSpec>(),
  rosterOrder: ['SCORPION_MK_REMIX', 'SUBZERO_MK_REMIX', 'RAIDEN_MK_REMIX'],

  registerFighter(fighterId: string, spec: FighterSpec): void {
    this.fighters.set(fighterId, spec);
  },

  loadSpriteSheet(sheetId: string, url: string): void {
    const entry: SpriteSheetEntry = { img: new Image(), loaded: false, url };
    entry.img.onload = () => {
      entry.loaded = true;
    };
    entry.img.onerror = () => {
      entry.loaded = false;
      M08_Watchdog.recordHeal(`Sprite fallback [${sheetId}]`);
    };
    if (url) entry.img.src = url;
    this.sheets.set(sheetId, entry);
  },

  defaultMeshForState(
    state: string,
    phaseRatio = 0,
    squashY = 1,
    meshScale = 1
  ): Record<string, MeshNodeLocal> {
    const crouchOffset = ['crouch', 'sweep'].includes(state) ? 34 : 0;
    const punchReach = ['hp', 'lp', 'throw', 'projectile'].includes(state)
      ? 52 + Math.sin(phaseRatio * Math.PI) * 36
      : 16;
    const kickReach = ['hk', 'lk', 'roundhouse', 'sweep'].includes(state)
      ? 58 + Math.sin(phaseRatio * Math.PI) * 40
      : 18;
    const uppercutLift = state === 'uppercut' ? -38 - Math.sin(phaseRatio * Math.PI) * 48 : 0;
    const airLift = state === 'jump' ? -18 : 0;
    const sc = (val: number) => val * squashY * meshScale;
    const sx = (val: number) => val * meshScale;

    return {
      root:      { x: sx(0), y: sc(0 + airLift + uppercutLift), r: 8, type: 'ROOT' },
      pelvis:    { x: sx(0), y: sc(-52 + crouchOffset + airLift + uppercutLift), r: 14, type: 'HURT' },
      torso:     { x: sx(5), y: sc(-92 + crouchOffset + airLift + uppercutLift), r: 18, type: 'HURT' },
      head:      { x: sx(state === 'uppercut' ? 16 : 8), y: sc(-128 + crouchOffset + airLift + uppercutLift), r: 14, type: 'HURT' },
      frontHand: {
        x: sx(state === 'uppercut' ? 38 : punchReach),
        y: sc((state === 'uppercut' ? -138 : -98) + crouchOffset + airLift + uppercutLift),
        r: ['hp', 'lp', 'throw', 'uppercut', 'projectile'].includes(state) ? 17 : 9,
        type: ['hp', 'lp', 'throw', 'uppercut', 'projectile'].includes(state) ? 'HIT' : 'LIMB',
      },
      backHand: { x: sx(-12), y: sc(-94 + crouchOffset + airLift + uppercutLift), r: 9, type: 'LIMB' },
      frontFoot: {
        x: sx(kickReach),
        y: sc((state === 'sweep' ? -14 : state === 'roundhouse' ? -96 : -68) + crouchOffset + airLift + uppercutLift),
        r: ['hk', 'lk', 'roundhouse', 'sweep'].includes(state) ? 18 : 10,
        type: ['hk', 'lk', 'roundhouse', 'sweep'].includes(state) ? 'HIT' : 'LIMB',
      },
      backFoot: { x: sx(-20), y: sc(-8 + airLift + uppercutLift), r: 10, type: 'LIMB' },
    };
  },

  getFrameData(fighterId: string, state: string, frameIdx: number, squashY = 1): FrameData {
    const spec = this.fighters.get(fighterId) || this.fighters.get('SCORPION_MK_REMIX');
    const anim = (spec && spec.anims && spec.anims[state]) || { frames: 6, loop: true };
    const safeFrames = Math.max(1, Number(anim.frames) || 1);
    const idx = Math.abs(Math.floor(frameIdx)) % safeFrames;
    const ratio = safeFrames > 1 ? idx / (safeFrames - 1) : 0;

    const moveKey = state.toUpperCase();
    const manualMove = M01_ArcadeManualSpec.moveValues[moveKey];
    const hitWindow = manualMove ? manualMove.active : anim.hitWindow || [];
    const isActiveHit = Array.isArray(hitWindow) && hitWindow.includes(idx);

    const meshScale = spec && spec.meshScale ? spec.meshScale : 1;
    const rawNodes =
      typeof anim.meshFn === 'function'
        ? anim.meshFn(idx, ratio, squashY, meshScale)
        : this.defaultMeshForState(state, ratio, squashY, meshScale);

    const nodes: Record<string, MeshNodeLocal> = {};
    for (const [k, v] of Object.entries(rawNodes)) {
      nodes[k] = {
        x: Number.isFinite(v.x) ? v.x : 0,
        y: Number.isFinite(v.y) ? v.y : 0,
        r: Number.isFinite(v.r) ? Math.max(4, v.r) : 10,
        type: v.type === 'HIT' && !isActiveHit ? 'LIMB' : v.type || 'LIMB',
      };
    }

    const sheet = spec && spec.sheetId ? this.sheets.get(spec.sheetId) || null : null;
    const frameRect = anim.rects && anim.rects[idx] ? anim.rects[idx] : null;

    return {
      idx,
      totalFrames: safeFrames,
      loop: Boolean(anim.loop),
      isActiveHit,
      spawnProjFrame:
        manualMove && manualMove.spawnProjFrame !== undefined ? manualMove.spawnProjFrame : -1,
      damage: manualMove ? manualMove.damage : 10,
      chipDamage: manualMove ? manualMove.chip : 1,
      hitstun: manualMove ? manualMove.hitstun : 14,
      blockstun: manualMove ? manualMove.blockstun : 9,
      knockbackX: manualMove ? manualMove.kbX : 150,
      launchY: manualMove ? manualMove.launchY : 0,
      knockdown: Boolean(manualMove && manualMove.knockdown),
      unblockableClose: Boolean(manualMove && manualMove.unblockableClose),
      sheet,
      frameRect,
      nodes,
      tint: (spec && spec.tint) || '#f59e0b',
      projectileColor: (spec && spec.projectileColor) || '#fb923c',
    };
  },
};

M02_SpriteMeshAtlas.loadSpriteSheet('mk_arcade_sheet', '');
M02_SpriteMeshAtlas.registerFighter('SCORPION_MK_REMIX', {
  name: 'SCORPION',
  sheetId: 'mk_arcade_sheet',
  meshScale: 1.0,
  tint: '#f59e0b',
  projectileColor: '#fb923c',
  anims: mkAnims,
});
M02_SpriteMeshAtlas.registerFighter('SUBZERO_MK_REMIX', {
  name: 'SUB-ZERO',
  sheetId: 'mk_arcade_sheet',
  meshScale: 1.0,
  tint: '#38bdf8',
  projectileColor: '#67e8f9',
  anims: mkAnims,
});
M02_SpriteMeshAtlas.registerFighter('RAIDEN_MK_REMIX', {
  name: 'RAIDEN',
  sheetId: 'mk_arcade_sheet',
  meshScale: 1.05,
  tint: '#a78bfa',
  projectileColor: '#c4b5fd',
  anims: mkAnims,
});
