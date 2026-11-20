/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CharacterId } from '../types/fighter';
import type { Fighter } from './FighterEngine';
import { resolveFighterMatrixCell } from './MovementMatrix';

export type SheetKey =
  | 'scorpion'
  | 'subzero'
  | 'johnny'
  | 'liukang'
  | 'umk3'
  | 'mk2swap'
  | 'mk3gold';

export type AnimationTrackKey =
  | 'idle'
  | 'walk'
  | 'run'
  | 'dash'
  | 'crouch'
  | 'block'
  | 'jump'
  | 'airTumble'
  | 'lp'
  | 'hp'
  | 'lk'
  | 'hk'
  | 'uppercut'
  | 'sweep'
  | 'crouchLk'
  | 'throw'
  | 'jumpPunch'
  | 'jumpKick'
  | 'flyingKick'
  | 'weaponSlash'
  | 'weaponThrust'
  | 'comboLink1'
  | 'comboLink2'
  | 'comboFinisher'
  | 'special1'
  | 'special2'
  | 'hitstun'
  | 'stagger'
  | 'dizzy'
  | 'finishStance'
  | 'knockdown'
  | 'fallen'
  | 'wakeup'
  | 'frozen'
  | 'decapitated'
  | 'burnSkeleton'
  | 'victory'
  | 'projSpear'
  | 'projIce'
  | 'projFire'
  | 'projEnergy'
  | 'morphDragon'
  | 'severedHead';

export interface SpriteFrame {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  footX: number; // Horizontal anchor relative to frame left (0..width)
  footY: number; // Vertical ground anchor relative to frame top (0..height)
  comX: number;  // Center of mass X
  comY: number;  // Center of mass Y
}

interface RawBox {
  x: number;
  y: number;
  w: number;
  h: number;
  pixels: number;
}

interface PaletteSpec {
  sheet: SheetKey;
  targetHeight: number;
  scaleX?: number;
  tweenBetweenKeyframes: number;
  tintMode?:
    | 'NONE'
    | 'SMOKE_STEEL'
    | 'REPTILE_GREEN'
    | 'NOOB_OBSIDIAN'
    | 'RAIDEN_STORM'
    | 'AIMIX_SONIC'
    | 'KITANA_SAPPHIRE'
    | 'MILEENA_MAGENTA'
    | 'SONYA_EMERALD'
    | 'KUNGLAO_ROYAL'
    | 'GORO_BRONZE'
    | 'ROBOCOP_CHROME'
    | 'LEONARDO_TURTLE';
}

const SHEET_URLS: Record<SheetKey, string> = {
  scorpion: '/assets/aistudio/IMG_3401_d8bd8c67.png',
  subzero: '/assets/aistudio/IMG_4817_5952087b.png',
  johnny: '/assets/aistudio/IMG_4884_e4a0a0d2.jpeg',
  liukang: '/assets/aistudio/IMG_4885_aa51b88b.jpeg',
  umk3: '/assets/aistudio/IMG_4888_9d4e2d12.jpeg',
  mk2swap: '/assets/aistudio/IMG_3274_684a7475.jpeg',
  mk3gold: '/assets/aistudio/IMG_3402_06c340b7.png',
};

const CHARACTER_PALETTES: Record<CharacterId, PaletteSpec> = {
  scorpion: { sheet: 'scorpion', targetHeight: 118, tweenBetweenKeyframes: 0, tintMode: 'NONE' },
  subzero: { sheet: 'subzero', targetHeight: 118, tweenBetweenKeyframes: 0, tintMode: 'NONE' },
  johnny: { sheet: 'johnny', targetHeight: 120, tweenBetweenKeyframes: 0, tintMode: 'NONE' },
  liukang: { sheet: 'liukang', targetHeight: 118, tweenBetweenKeyframes: 0, tintMode: 'NONE' },
  shangtsung: { sheet: 'mk3gold', targetHeight: 120, tweenBetweenKeyframes: 2, tintMode: 'NONE' },
  smoke: { sheet: 'scorpion', targetHeight: 118, tweenBetweenKeyframes: 2, tintMode: 'SMOKE_STEEL' },
  reptile: { sheet: 'scorpion', targetHeight: 118, tweenBetweenKeyframes: 2, tintMode: 'REPTILE_GREEN' },
  noob: { sheet: 'subzero', targetHeight: 118, tweenBetweenKeyframes: 2, tintMode: 'NOOB_OBSIDIAN' },
  raiden: { sheet: 'mk3gold', targetHeight: 122, tweenBetweenKeyframes: 2, tintMode: 'RAIDEN_STORM' },
  aimix: { sheet: 'mk3gold', targetHeight: 122, tweenBetweenKeyframes: 2, tintMode: 'AIMIX_SONIC' },
  kunglao: { sheet: 'liukang', targetHeight: 118, tweenBetweenKeyframes: 2, tintMode: 'KUNGLAO_ROYAL' },
  kitana: { sheet: 'umk3', targetHeight: 115, tweenBetweenKeyframes: 2, tintMode: 'KITANA_SAPPHIRE' },
  mileena: { sheet: 'umk3', targetHeight: 115, tweenBetweenKeyframes: 2, tintMode: 'MILEENA_MAGENTA' },
  sonya: { sheet: 'umk3', targetHeight: 116, tweenBetweenKeyframes: 2, tintMode: 'SONYA_EMERALD' },
  goro: { sheet: 'mk3gold', targetHeight: 138, scaleX: 1.18, tweenBetweenKeyframes: 2, tintMode: 'GORO_BRONZE' },
  robocop: { sheet: 'umk3', targetHeight: 120, tweenBetweenKeyframes: 2, tintMode: 'ROBOCOP_CHROME' },
  leonardo: { sheet: 'mk2swap', targetHeight: 116, tweenBetweenKeyframes: 2, tintMode: 'LEONARDO_TURTLE' },
};

interface FighterRenderHistory {
  lastFrame: SpriteFrame | null;
  lastStateKey: string;
  transitionTicks: number;
  maxTransitionTicks: number;
  trailBuffer: Array<{ frame: SpriteFrame; x: number; y: number; facing: 1 | -1; alpha: number; tint: string }>;
}

// ============================================================================
// COLOR & PIXEL PROCESSING UTILITIES
// ============================================================================

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h * 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  h /= 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

/**
 * Removes background via exterior flood-fill + small-gap cleanup while
 * keeping white eyes/highlights intact, plus cleans anti-aliased edge halos.
 */
function keyOutSheetCanvas(img: HTMLImageElement, sheetKey: SheetKey): HTMLCanvasElement {
  const maxDim = Math.max(img.width, img.height);
  const scale = maxDim > 2200 ? 0.65 : 1.0;
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = scale === 1.0 ? false : true;
  ctx.drawImage(img, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Sample 4 corners and find dominant background color
  const samples = [
    0,
    (w - 1) * 4,
    (h - 1) * w * 4,
    ((h - 1) * w + (w - 1)) * 4,
    (Math.floor(h * 0.5) * w) * 4,
  ];
  let bgR = 0;
  let bgG = 0;
  let bgB = 0;
  for (const idx of samples) {
    bgR += data[idx];
    bgG += data[idx + 1];
    bgB += data[idx + 2];
  }
  bgR = Math.round(bgR / samples.length);
  bgG = Math.round(bgG / samples.length);
  bgB = Math.round(bgB / samples.length);

  // Pick actual corner pixel as exact reference if corners agree
  const c0Dist = Math.abs(data[0] - bgR) + Math.abs(data[1] - bgG) + Math.abs(data[2] - bgB);
  if (c0Dist < 25) {
    bgR = data[0];
    bgG = data[1];
    bgB = data[2];
  }

  const isJpeg = sheetKey === 'johnny' || sheetKey === 'liukang' || sheetKey === 'umk3' || sheetKey === 'mk2swap';
  const floodTol = isJpeg ? 54 : 36;
  const innerTol = isJpeg ? 34 : 20;

  const total = w * h;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const isBgNear = (pIdx: number, tol: number): boolean => {
    const o = pIdx * 4;
    const dr = data[o] - bgR;
    const dg = data[o + 1] - bgG;
    const db = data[o + 2] - bgB;
    return Math.sqrt(dr * dr + dg * dg + db * db) <= tol;
  };

  // Seed flood fill from all image perimeter pixels matching background
  for (let x = 0; x < w; x++) {
    const top = x;
    const bot = (h - 1) * w + x;
    if (!visited[top] && isBgNear(top, floodTol)) {
      visited[top] = 1;
      queue[tail++] = top;
    }
    if (!visited[bot] && isBgNear(bot, floodTol)) {
      visited[bot] = 1;
      queue[tail++] = bot;
    }
  }
  for (let y = 0; y < h; y++) {
    const left = y * w;
    const right = y * w + (w - 1);
    if (!visited[left] && isBgNear(left, floodTol)) {
      visited[left] = 1;
      queue[tail++] = left;
    }
    if (!visited[right] && isBgNear(right, floodTol)) {
      visited[right] = 1;
      queue[tail++] = right;
    }
  }

  // BFS exterior flood fill
  while (head < tail) {
    const cur = queue[head++];
    data[cur * 4 + 3] = 0;
    const cx = cur % w;
    const cy = (cur - cx) / w;

    if (cx > 0) {
      const n = cur - 1;
      if (!visited[n] && isBgNear(n, floodTol)) {
        visited[n] = 1;
        queue[tail++] = n;
      }
    }
    if (cx < w - 1) {
      const n = cur + 1;
      if (!visited[n] && isBgNear(n, floodTol)) {
        visited[n] = 1;
        queue[tail++] = n;
      }
    }
    if (cy > 0) {
      const n = cur - w;
      if (!visited[n] && isBgNear(n, floodTol)) {
        visited[n] = 1;
        queue[tail++] = n;
      }
    }
    if (cy < h - 1) {
      const n = cur + w;
      if (!visited[n] && isBgNear(n, floodTol)) {
        visited[n] = 1;
        queue[tail++] = n;
      }
    }
  }

  // Clear enclosed background pockets between arms/legs (area >= 18px) while preserving tiny eye/teeth whites
  const pocketVis = new Uint8Array(total);
  const pocketQueue = new Int32Array(total);
  for (let i = 0; i < total; i++) {
    if (data[i * 4 + 3] === 0 || pocketVis[i]) continue;
    if (!isBgNear(i, innerTol)) continue;

    let pHead = 0;
    let pTail = 0;
    pocketVis[i] = 1;
    pocketQueue[pTail++] = i;

    while (pHead < pTail) {
      const cur = pocketQueue[pHead++];
      const cx = cur % w;
      const cy = (cur - cx) / w;
      const neighbors = [
        cx > 0 ? cur - 1 : -1,
        cx < w - 1 ? cur + 1 : -1,
        cy > 0 ? cur - w : -1,
        cy < h - 1 ? cur + w : -1,
      ];
      for (const n of neighbors) {
        if (n >= 0 && !pocketVis[n] && data[n * 4 + 3] > 0 && isBgNear(n, innerTol)) {
          pocketVis[n] = 1;
          pocketQueue[pTail++] = n;
        }
      }
    }

    // Only treat as trapped background pocket if large enough (>= 16 pixels)
    if (pTail >= 16) {
      for (let k = 0; k < pTail; k++) {
        data[pocketQueue[k] * 4 + 3] = 0;
      }
    }
  }

  // Anti-halo edge spill suppression for green/mint/purple sheets
  const isGreenBg = bgG > bgR + 20 && bgG > bgB + 10;
  const isPurpleBg = bgR > bgG + 20 && bgB > bgG + 20;
  if (isGreenBg || isPurpleBg || isJpeg) {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const o = idx * 4;
        if (data[o + 3] === 0) continue;

        const hasTransparentNeighbor =
          data[(idx - 1) * 4 + 3] === 0 ||
          data[(idx + 1) * 4 + 3] === 0 ||
          data[(idx - w) * 4 + 3] === 0 ||
          data[(idx + w) * 4 + 3] === 0;

        if (!hasTransparentNeighbor) continue;

        const dr = data[o] - bgR;
        const dg = data[o + 1] - bgG;
        const db = data[o + 2] - bgB;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);

        if (dist < (isJpeg ? 75 : 52)) {
          data[o + 3] = 0;
        } else if (isGreenBg && data[o + 1] > Math.max(data[o], data[o + 2]) + 14) {
          data[o + 1] = Math.round(Math.max(data[o], data[o + 2]) * 0.92);
        } else if (isPurpleBg && data[o] > data[o + 1] + 22 && data[o + 2] > data[o + 1] + 22) {
          data[o] = Math.round(data[o] * 0.7);
          data[o + 2] = Math.round(data[o + 2] * 0.7);
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

// ============================================================================
// ROW-BAND + CONNECTED-COMPONENT SPRITE SLICER
// ============================================================================

function extractSpriteRows(sheetCanvas: HTMLCanvasElement, sheetKey: SheetKey): RawBox[][] {
  const w = sheetCanvas.width;
  const h = sheetCanvas.height;
  const ctx = sheetCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  const data = ctx.getImageData(0, 0, w, h).data;

  // Step 1: Extract connected components
  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  const rawBlobs: RawBox[] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (visited[idx] || data[idx * 4 + 3] < 28) continue;

      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let head = 0;
      let tail = 0;
      visited[idx] = 1;
      queue[tail++] = idx;

      while (head < tail) {
        const cur = queue[head++];
        const cx = cur % w;
        const cy = (cur - cx) / w;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        // 8-way neighbor check (bridges diagonal 1px limbs/ropes)
        for (let dy = -1; dy <= 1; dy++) {
          const ny = cy + dy;
          if (ny < 0 || ny >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const nx = cx + dx;
            if (nx < 0 || nx >= w) continue;
            const nIdx = ny * w + nx;
            if (!visited[nIdx] && data[nIdx * 4 + 3] >= 28) {
              visited[nIdx] = 1;
              queue[tail++] = nIdx;
            }
          }
        }
      }

      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;

      // Filter compression specks
      if (tail < 20 || (bw < 4 && bh < 4)) continue;

      // Filter known credit banners / logos / bottom screenshot strips
      const yNorm = (minY + bh * 0.5) / h;
      const xNorm = (minX + bw * 0.5) / w;
      if (sheetKey === 'umk3' && yNorm < 0.04 && xNorm > 0.76) continue;
      if (sheetKey === 'subzero' && yNorm > 0.90 && xNorm > 0.78) continue;
      if (sheetKey === 'subzero' && yNorm > 0.72 && yNorm < 0.78 && xNorm > 0.78 && bh < h * 0.025) continue;
      if (sheetKey === 'johnny') {
        if (yNorm > 0.91) continue; // bottom portrait cards
        if (bw > w * 0.35 && bh < h * 0.03) continue; // "Johnny Cage - Ripped by..." text box
      }
      if (sheetKey === 'mk2swap' && yNorm > 0.87) continue; // bottom portrait cards

      rawBlobs.push({ x: minX, y: minY, w: bw, h: bh, pixels: tail });
    }
  }

  if (rawBlobs.length === 0) return [];

  // Compute typical sprite dimensions
  const heights = rawBlobs.map((b) => b.h).sort((a, b) => a - b);
  const medianH = heights[Math.floor(heights.length * 0.65)] || 36;

  // Step 2: Merge nearby fragments that belong to the same sprite pose
  // (e.g., floating head, extended fist, kunai rope gaps, fireball embers)
  rawBlobs.sort((a, b) => a.y - b.y || a.x - b.x);
  const merged: RawBox[] = [];
  const used = new Uint8Array(rawBlobs.length);

  for (let i = 0; i < rawBlobs.length; i++) {
    if (used[i]) continue;
    let cur = { ...rawBlobs[i] };
    used[i] = 1;

    let changed = true;
    while (changed) {
      changed = false;
      for (let j = 0; j < rawBlobs.length; j++) {
        if (used[j]) continue;
        const other = rawBlobs[j];

        const xGap =
          Math.max(cur.x, other.x) - Math.min(cur.x + cur.w, other.x + other.w);
        const yGap =
          Math.max(cur.y, other.y) - Math.min(cur.y + cur.h, other.y + other.h);

        const isSmallFragment =
          other.h < medianH * 0.45 || cur.h < medianH * 0.45;
        if (isSmallFragment && (other.w > medianH * 0.95 || cur.w > medianH * 1.25)) continue;

        const xOverlap = xGap <= 0;
        const closeHoriz = xGap <= (isSmallFragment ? 5 : 2);
        const closeVert = yGap <= (isSmallFragment ? 10 : 3);

        // Do not merge two separate poses/tumbles horizontally
        const bothFullSized =
          ((cur.h >= medianH * 0.65 && other.h >= medianH * 0.65) ||
            (cur.w >= medianH * 0.32 && other.w >= medianH * 0.32)) &&
          xGap > 0;
        if (bothFullSized) continue;

        if ((xOverlap && closeVert) || (closeHoriz && yGap <= 3 && isSmallFragment)) {
          const nx = Math.min(cur.x, other.x);
          const ny = Math.min(cur.y, other.y);
          const nx2 = Math.max(cur.x + cur.w, other.x + other.w);
          const ny2 = Math.max(cur.y + cur.h, other.y + other.h);
          if (xGap > 0 && nx2 - nx > medianH * 1.55) continue;
          cur = {
            x: nx,
            y: ny,
            w: nx2 - nx,
            h: ny2 - ny,
            pixels: cur.pixels + other.pixels,
          };
          used[j] = 1;
          changed = true;
        }
      }
    }

    if (cur.w >= 6 && cur.h >= 6) {
      merged.push(cur);
    }
  }

  // Step 3: Cluster into horizontal rows by tight Y overlap & center alignment
  merged.sort((a, b) => a.y + a.h * 0.5 - (b.y + b.h * 0.5));
  const rows: RawBox[][] = [];

  for (const box of merged) {
    let placed = false;
    const boxCenterY = box.y + box.h * 0.5;
    for (let r = rows.length - 1; r >= 0; r--) {
      const row = rows[r];
      let rowMinY = Infinity;
      let rowMaxY = -Infinity;
      let rowCenterSum = 0;
      for (const rb of row) {
        if (rb.y < rowMinY) rowMinY = rb.y;
        if (rb.y + rb.h > rowMaxY) rowMaxY = rb.y + rb.h;
        rowCenterSum += rb.y + rb.h * 0.5;
      }
      const rowCenterY = rowCenterSum / row.length;
      const overlap =
        Math.min(box.y + box.h, rowMaxY) - Math.max(box.y, rowMinY);
      const minH = Math.min(box.h, rowMaxY - rowMinY);
      if (overlap >= Math.max(minH * 0.42, 10) && Math.abs(boxCenterY - rowCenterY) <= medianH * 0.58) {
        row.push(box);
        placed = true;
        break;
      }
    }
    if (!placed) {
      rows.push([box]);
    }
  }

  // Sort rows top-to-bottom and frames inside each row left-to-right
  rows.sort((ra, rb) => {
    const ya = ra.reduce((s, b) => s + b.y, 0) / ra.length;
    const yb = rb.reduce((s, b) => s + b.y, 0) / rb.length;
    return ya - yb;
  });
  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
  }

  // Drop tiny text-only rows while preserving wide spear/chain strips on Scorpion
  return rows.filter((row) => {
    const maxH = Math.max(...row.map((b) => b.h));
    const maxW = Math.max(...row.map((b) => b.w));
    return maxH >= Math.max(10, medianH * 0.28) || (sheetKey === 'scorpion' && maxW > 40);
  });
}

// ============================================================================
// PALETTE SWAPPING & FRAME EXTRACTION
// ============================================================================

function applyCharacterPalette(
  canvas: HTMLCanvasElement,
  tintMode: PaletteSpec['tintMode']
): HTMLCanvasElement {
  if (!tintMode || tintMode === 'NONE') return canvas;

  const out = document.createElement('canvas');
  out.width = canvas.width;
  out.height = canvas.height;
  const ctx = out.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.drawImage(canvas, 0, 0);
  const imgData = ctx.getImageData(0, 0, out.width, out.height);
  const d = imgData.data;

  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 20) continue;
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const [h, s, l] = rgbToHsl(r, g, b);

    // Preserve deep blacks and bright white highlights
    if (l < 0.08 || (s < 0.14 && tintMode !== 'NOOB_OBSIDIAN')) continue;

    // Detect garment hues depending on base sheet
    const isYellowCloth = h >= 28 && h <= 72 && s > 0.28 && l < 0.85;
    const isBlueCloth = h >= 175 && h <= 245 && s > 0.22;
    const isRedCloth = (h <= 22 || h >= 335) && s > 0.32 && l < 0.72;

    if (tintMode === 'SMOKE_STEEL' && isYellowCloth) {
      const [nr, ng, nb] = hslToRgb(215, 0.14, Math.min(0.82, l * 1.05));
      d[i] = nr; d[i + 1] = ng; d[i + 2] = nb;
    } else if (tintMode === 'REPTILE_GREEN' && isYellowCloth) {
      const [nr, ng, nb] = hslToRgb(128, Math.min(0.95, s * 1.15), l * 0.88);
      d[i] = nr; d[i + 1] = ng; d[i + 2] = nb;
    } else if (tintMode === 'NOOB_OBSIDIAN') {
      if (isBlueCloth) {
        const [nr, ng, nb] = hslToRgb(265, 0.22, Math.max(0.06, l * 0.24));
        d[i] = nr; d[i + 1] = ng; d[i + 2] = nb;
      } else {
        // Darken skin & trim into pitch wraith silhouette
        d[i] = Math.round(r * 0.28);
        d[i + 1] = Math.round(g * 0.24);
        d[i + 2] = Math.round(b * 0.34);
      }
    } else if (tintMode === 'RAIDEN_STORM' && isYellowCloth) {
      const [nr, ng, nb] = hslToRgb(202, 0.65, Math.min(0.92, l * 1.28));
      d[i] = nr; d[i + 1] = ng; d[i + 2] = nb;
    } else if (tintMode === 'AIMIX_SONIC' && isYellowCloth) {
      const [nr, ng, nb] = hslToRgb(20, 0.96, Math.min(0.62, l * 0.95));
      d[i] = nr; d[i + 1] = ng; d[i + 2] = nb;
    } else if (tintMode === 'GORO_BRONZE' && isYellowCloth) {
      const [nr, ng, nb] = hslToRgb(34, 0.72, l * 0.82);
      d[i] = nr; d[i + 1] = ng; d[i + 2] = nb;
    } else if (tintMode === 'KUNGLAO_ROYAL' && isRedCloth) {
      const [nr, ng, nb] = hslToRgb(215, 0.68, l * 0.9);
      d[i] = nr; d[i + 1] = ng; d[i + 2] = nb;
    } else if (tintMode === 'KITANA_SAPPHIRE' && (isBlueCloth || isYellowCloth)) {
      const [nr, ng, nb] = hslToRgb(205, 0.9, Math.min(0.75, l * 1.05));
      d[i] = nr; d[i + 1] = ng; d[i + 2] = nb;
    } else if (tintMode === 'MILEENA_MAGENTA' && (isBlueCloth || isYellowCloth)) {
      const [nr, ng, nb] = hslToRgb(312, 0.85, Math.min(0.72, l * 1.02));
      d[i] = nr; d[i + 1] = ng; d[i + 2] = nb;
    } else if (tintMode === 'SONYA_EMERALD' && (isBlueCloth || isYellowCloth)) {
      const [nr, ng, nb] = hslToRgb(142, 0.78, Math.min(0.68, l * 0.98));
      d[i] = nr; d[i + 1] = ng; d[i + 2] = nb;
    } else if (tintMode === 'ROBOCOP_CHROME') {
      if (isBlueCloth) {
        const [nr, ng, nb] = hslToRgb(210, 0.12, Math.min(0.84, l * 1.25));
        d[i] = nr; d[i + 1] = ng; d[i + 2] = nb;
      }
    } else if (tintMode === 'LEONARDO_TURTLE') {
      if (isBlueCloth) {
        const [nr, ng, nb] = hslToRgb(218, 0.88, l);
        d[i] = nr; d[i + 1] = ng; d[i + 2] = nb;
      } else if (h >= 12 && h <= 45 && s > 0.2) {
        // Skin tone -> Mutant turtle emerald green
        const [nr, ng, nb] = hslToRgb(118, 0.62, l * 0.85);
        d[i] = nr; d[i + 1] = ng; d[i + 2] = nb;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return out;
}

function cropBoxToFrame(source: HTMLCanvasElement, box: RawBox): SpriteFrame {
  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = box.w;
  frameCanvas.height = box.h;
  const ctx = frameCanvas.getContext('2d', { willReadFrequently: true });
  let comX = box.w * 0.5;
  let comY = box.h * 0.5;
  let footX = box.w * 0.5;

  if (ctx) {
    ctx.drawImage(source, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
    const d = ctx.getImageData(0, 0, box.w, box.h).data;
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    let footSumX = 0;
    let footCount = 0;
    const footRowThreshold = Math.max(0, box.h - Math.max(3, Math.floor(box.h * 0.14)));

    for (let py = 0; py < box.h; py++) {
      for (let px = 0; px < box.w; px++) {
        const a = d[(py * box.w + px) * 4 + 3];
        if (a > 40) {
          sumX += px;
          sumY += py;
          count++;
          if (py >= footRowThreshold) {
            footSumX += px;
            footCount++;
          }
        }
      }
    }
    if (count > 0) {
      comX = sumX / count;
      comY = sumY / count;
    }
    if (footCount > 0) {
      footX = footSumX / footCount;
    } else {
      footX = comX;
    }
  }

  return {
    canvas: frameCanvas,
    width: box.w,
    height: box.h,
    footX,
    footY: box.h,
    comX,
    comY,
  };
}

// ============================================================================
// EXTRA IN-BETWEEN FRAME SYNTHESIS ENGINE
// Creates crisp optical-flow motion-tweened intermediate frames between
// discrete sprite poses for fluid 60fps cinematic animation!
// ============================================================================

function synthesizeInBetweenFrames(
  keyframes: SpriteFrame[],
  tweensPerStep: number,
  loop: boolean,
  addKineticTrail = false
): SpriteFrame[] {
  if (keyframes.length <= 1 || tweensPerStep <= 0) return keyframes;

  const result: SpriteFrame[] = [];
  const count = loop ? keyframes.length : keyframes.length - 1;

  for (let i = 0; i < count; i++) {
    const fA = keyframes[i];
    const fB = keyframes[(i + 1) % keyframes.length];
    result.push(fA);

    // Motion flow vector between foot-anchored poses
    const leftA = -fA.footX;
    const topA = -fA.footY;
    const rightA = fA.width - fA.footX;

    const leftB = -fB.footX;
    const topB = -fB.footY;
    const rightB = fB.width - fB.footX;

    const minL = Math.min(leftA, leftB) - 4;
    const maxR = Math.max(rightA, rightB) + 4;
    const minT = Math.min(topA, topB) - 4;
    const maxBot = 4;

    const outW = Math.max(8, Math.ceil(maxR - minL));
    const outH = Math.max(8, Math.ceil(maxBot - minT));
    const anchorX = -minL;
    const anchorY = -minT;

    const dx = (fB.comX - fB.footX) - (fA.comX - fA.footX);
    const dy = (fB.comY - fB.footY) - (fA.comY - fA.footY);

    for (let step = 1; step <= tweensPerStep; step++) {
      const linearT = step / (tweensPerStep + 1);
      // Cubic Hermite S-curve for fluid acceleration/deceleration
      const t = linearT * linearT * (3 - 2 * linearT);

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) continue;

      ctx.imageSmoothingEnabled = false;

      // Subtle squash/stretch along motion axis so transitions feel weighty
      const stretchX = 1 + Math.sin(Math.PI * t) * Math.min(0.08, Math.abs(dx) * 0.0025);
      const stretchY = 1 - Math.sin(Math.PI * t) * Math.min(0.05, Math.abs(dy) * 0.002);

      // Motion smear ghost trail during fast swings/kicks/specials
      if (addKineticTrail && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
        ctx.save();
        ctx.globalAlpha = 0.24 * Math.sin(Math.PI * t);
        ctx.drawImage(
          fA.canvas,
          anchorX - fA.footX - dx * 0.22 * t,
          anchorY - fA.footY - dy * 0.22 * t
        );
        ctx.restore();
      }

      // Draw outgoing pose A warped slightly toward pose B
      ctx.save();
      ctx.globalAlpha = 1 - t * 0.85;
      ctx.translate(anchorX + dx * t * 0.42, anchorY + dy * t * 0.42);
      ctx.scale(stretchX, stretchY);
      ctx.drawImage(fA.canvas, -fA.footX, -fA.footY);
      ctx.restore();

      // Draw incoming pose B warped back from B toward A
      ctx.save();
      ctx.globalAlpha = t;
      ctx.translate(anchorX - dx * (1 - t) * 0.42, anchorY - dy * (1 - t) * 0.42);
      ctx.scale(stretchX, stretchY);
      ctx.drawImage(fB.canvas, -fB.footX, -fB.footY);
      ctx.restore();

      // Solidify crisp arcade alpha (avoid washed-out ghosting on overlapping limbs)
      const imgData = ctx.getImageData(0, 0, outW, outH);
      const d = imgData.data;
      for (let p = 0; p < d.length; p += 4) {
        const a = d[p + 3];
        if (a > 96) {
          d[p + 3] = Math.min(255, Math.round(a * 1.35));
        } else if (a < 28) {
          d[p + 3] = 0;
        }
      }
      ctx.putImageData(imgData, 0, 0);

      result.push({
        canvas,
        width: outW,
        height: outH,
        footX: anchorX,
        footY: anchorY,
        comX: anchorX + ((fA.comX - fA.footX) * (1 - t) + (fB.comX - fB.footX) * t),
        comY: anchorY + ((fA.comY - fA.footY) * (1 - t) + (fB.comY - fB.footY) * t),
      });
    }
  }

  if (!loop) {
    result.push(keyframes[keyframes.length - 1]);
  }
  return result;
}

// ============================================================================
// SEMANTIC ROW MAPPING PER SPRITE SHEET
// ============================================================================

function sliceByFraction(row: RawBox[], start: number, end: number): RawBox[] {
  if (!row || row.length === 0) return [];
  const i0 = Math.max(0, Math.min(row.length - 1, Math.floor(row.length * start)));
  const i1 = Math.max(i0 + 1, Math.min(row.length, Math.ceil(row.length * end)));
  return row.slice(i0, i1);
}

function getRowSafe(rows: RawBox[][], idx: number): RawBox[] {
  if (rows.length === 0) return [];
  const clamped = Math.max(0, Math.min(rows.length - 1, idx));
  return rows[clamped] || rows[0];
}

function buildTracksForSheet(
  sheetKey: SheetKey,
  rows: RawBox[][],
  sourceCanvas: HTMLCanvasElement,
  tweens: number
): Record<AnimationTrackKey, SpriteFrame[]> {
  const rawTracks: Partial<Record<AnimationTrackKey, RawBox[]>> = {};

  if (sheetKey === 'scorpion') {
    // IMG_3401_d8bd8c67.png — verified row alignment
    const r0 = getRowSafe(rows, 0);
    const r1 = getRowSafe(rows, 1);
    const r2 = getRowSafe(rows, 2);
    const r3 = getRowSafe(rows, 3);
    const r4 = getRowSafe(rows, 4);
    const r5 = getRowSafe(rows, 5);
    const r6 = getRowSafe(rows, 6);
    const r7 = getRowSafe(rows, 7);
    const r8 = getRowSafe(rows, 8);
    const r9 = getRowSafe(rows, 9);
    const r10 = getRowSafe(rows, 10);
    const row11 = getRowSafe(rows, 11);
    const hasThinSpearRow = row11.length > 0 && row11.every((b) => b.h < 20);
    const fireRow = hasThinSpearRow ? getRowSafe(rows, 12) : row11;
    const burnRow = hasThinSpearRow ? getRowSafe(rows, 13) : getRowSafe(rows, 12);

    rawTracks.idle = r0.slice(0, 8);
    rawTracks.block = r0.slice(12, 15);
    rawTracks.crouch = r0.slice(15, 19);
    rawTracks.walk = r1.slice(0, 9);
    rawTracks.run = r1.slice(1, 9);
    rawTracks.dash = r1.slice(0, 9);
    rawTracks.jump = r1.slice(10, 13);
    rawTracks.airTumble = r1.slice(13, 18);
    rawTracks.victory = r1.slice(18, 22);
    rawTracks.lp = r2.slice(0, 6);
    rawTracks.hp = r3.slice(0, 5);
    rawTracks.throw = r3.slice(5, 7);
    rawTracks.comboLink1 = r2.slice(0, 5);
    rawTracks.comboLink2 = r4.slice(6, 11);
    rawTracks.comboFinisher = r5.slice(0, 6);
    rawTracks.hk = r4.slice(0, 6);
    rawTracks.lk = r4.slice(6, 12);
    rawTracks.sweep = r5.slice(8, 15);
    rawTracks.uppercut = r6.slice(0, 6);
    rawTracks.crouchLk = r6.slice(8, 11);
    rawTracks.jumpKick = r6.slice(11, 13).length > 0 ? r6.slice(11, 13) : r4.slice(0, 4);
    rawTracks.jumpPunch = r6.slice(13, 15).length > 0 ? r6.slice(13, 15) : r3.slice(0, 4);
    rawTracks.flyingKick = rawTracks.jumpKick;
    rawTracks.hitstun = [...r7.slice(0, 3), ...r7.slice(7, 13)];
    rawTracks.stagger = r7.slice(3, 7);
    rawTracks.dizzy = r7.slice(16, 23);
    rawTracks.finishStance = r7.slice(16, 23);
    rawTracks.frozen = r7.slice(23, 24);
    rawTracks.knockdown = r8.slice(0, 5);
    rawTracks.fallen = r8.slice(4, 5);
    rawTracks.decapitated = r8.slice(2, 5);
    rawTracks.wakeup = r9.slice(8, 12);
    rawTracks.special1 = r10;
    rawTracks.projSpear = hasThinSpearRow ? row11 : r10.slice(Math.max(0, r10.length - 2));
    rawTracks.special2 = fireRow.slice(0, 8);
    rawTracks.projFire = fireRow.slice(8);
    rawTracks.burnSkeleton = burnRow;
  } else if (sheetKey === 'subzero') {
    // IMG_4817_5952087b.png — verified row alignment (17 rows)
    const r0 = getRowSafe(rows, 0);
    const r1 = getRowSafe(rows, 1);
    const r2 = getRowSafe(rows, 2);
    const r3 = getRowSafe(rows, 3);
    const r4 = getRowSafe(rows, 4);
    const r5 = getRowSafe(rows, 5);
    const r6 = getRowSafe(rows, 6);
    const r7 = getRowSafe(rows, 7);
    const r8 = getRowSafe(rows, 8);
    const r9 = getRowSafe(rows, 9);
    const r10 = getRowSafe(rows, 10);
    const r11 = getRowSafe(rows, 11);
    const r14 = getRowSafe(rows, 14);
    const r15 = getRowSafe(rows, 15);
    const r16 = getRowSafe(rows, 16);

    rawTracks.idle = r0.slice(0, 11);
    rawTracks.block = r0.slice(15, 17);
    rawTracks.crouch = r0.slice(17, 20);
    rawTracks.walk = r1.slice(0, 9);
    rawTracks.run = r1.slice(1, 9);
    rawTracks.dash = r1.slice(0, 9);
    rawTracks.jump = r1.slice(9, 12);
    rawTracks.airTumble = r1.slice(12, 19);
    rawTracks.victory = r16.length > 9 ? r16.slice(8, 10) : r1.slice(19, 21);
    rawTracks.lp = r2.slice(0, 9);
    rawTracks.hp = r2.slice(9, 15);
    rawTracks.throw = r3.slice(0, 2);
    rawTracks.comboLink1 = r2.slice(0, 6);
    rawTracks.comboLink2 = r4.slice(6, 10);
    rawTracks.comboFinisher = r5.slice(0, 7);
    rawTracks.hk = r4.slice(0, 6);
    rawTracks.lk = r4.slice(6, 11);
    rawTracks.sweep = r5.slice(7, 11);
    rawTracks.uppercut = r6.slice(0, 6);
    rawTracks.crouchLk = r6.slice(13, 17);
    rawTracks.special2 = r7.slice(0, 2); // Cryo Floor Slide
    rawTracks.jumpKick = r7.slice(2, 4); // Knee tuck -> Flying Jump Kick
    rawTracks.jumpPunch = r7.slice(4, 6); // Aerial Jump Punch
    rawTracks.flyingKick = r7.slice(2, 4);
    rawTracks.hitstun = r8.slice(0, 9);
    rawTracks.stagger = r8.slice(9, 11);
    rawTracks.knockdown = r9.slice(1, 6);
    rawTracks.fallen = r9.slice(4, 5);
    rawTracks.wakeup = r9.slice(11, 15);
    rawTracks.frozen = r10.slice(0, 2);
    rawTracks.dizzy = r10.slice(2);
    rawTracks.finishStance = r10.slice(2);
    rawTracks.special1 = r11.slice(0, 3);
    rawTracks.projIce = r11.slice(3);
    rawTracks.decapitated = r14.slice(0, 6);
    rawTracks.severedHead = r15.slice(7, 11);
    rawTracks.burnSkeleton = r16.slice(0, 6);
  } else if (sheetKey === 'johnny') {
    // IMG_4884_e4a0a0d2.jpeg (Johnny Cage — 17 rows)
    const r2 = getRowSafe(rows, 2);
    const r7 = getRowSafe(rows, 7);
    const r8 = getRowSafe(rows, 8);
    const r9 = getRowSafe(rows, 9);
    const r10 = getRowSafe(rows, 10);
    const r11 = getRowSafe(rows, 11);
    const r12 = getRowSafe(rows, 12);
    const r13 = getRowSafe(rows, 13);
    const r14 = getRowSafe(rows, 14);
    const r15 = getRowSafe(rows, 15);

    rawTracks.idle = getRowSafe(rows, 0);
    rawTracks.walk = getRowSafe(rows, 1);
    rawTracks.run = getRowSafe(rows, 1);
    rawTracks.dash = getRowSafe(rows, 1);
    rawTracks.block = r2.length >= 2 ? r2.slice(0, 1) : r11.slice(0, 2);
    rawTracks.jump = r2.length >= 3 ? r2.slice(1, 2) : r2.slice(0, 1);
    rawTracks.crouch = r2.length >= 3 ? r2.slice(2, 3) : sliceByFraction(r2, 0.22, 0.50);
    rawTracks.airTumble = r2.length >= 4 ? r2.slice(3) : sliceByFraction(r2, 0.44, 1.0);
    rawTracks.lp = getRowSafe(rows, 3);
    rawTracks.hp = getRowSafe(rows, 4);
    rawTracks.hk = getRowSafe(rows, 5);
    rawTracks.lk = getRowSafe(rows, 6);
    rawTracks.sweep = r7.length >= 4 ? r7.slice(0, 4) : r7;
    rawTracks.crouchLk = r7.slice(0, 3);
    rawTracks.wakeup = r7.length >= 5 ? r7.slice(4) : r13.slice(4);
    rawTracks.jumpPunch = r8.slice(0, 2);
    rawTracks.jumpKick = r8.length >= 3 ? r8.slice(2, 4) : r8;
    rawTracks.uppercut = r9.slice(0, 4);
    rawTracks.throw = r9.length >= 5 ? r9.slice(4, 6) : sliceByFraction(getRowSafe(rows, 4), 0.4, 1.0);
    rawTracks.comboLink1 = getRowSafe(rows, 3);
    rawTracks.comboLink2 = getRowSafe(rows, 6);
    rawTracks.comboFinisher = getRowSafe(rows, 5);
    rawTracks.flyingKick = r10.slice(0, 3); // Shadow Kick
    rawTracks.special2 = r10.length >= 4 ? r10.slice(3, 6) : r10; // Splits Nut Punch
    rawTracks.special1 = r15.length >= 7 ? r15.slice(4, 8) : r10.slice(0, 3); // Forceball Cast
    rawTracks.hitstun = r11.length >= 4 ? r11.slice(3, 5) : r12.slice(0, 4);
    rawTracks.dizzy = r12.slice(0, 3);
    rawTracks.finishStance = r12.slice(0, 3);
    rawTracks.stagger = r12.length >= 5 ? r12.slice(4) : r12;
    rawTracks.knockdown = r13;
    rawTracks.fallen = r13.slice(1, 3);
    rawTracks.decapitated = sliceByFraction(r14, 0, 0.65);
    rawTracks.severedHead = sliceByFraction(r14, 0.65, 1.0);
    rawTracks.victory = sliceByFraction(r15, 0, 0.65);
    rawTracks.frozen = sliceByFraction(r15, 0.85, 1.0);
    rawTracks.projEnergy = getRowSafe(rows, 16);
  } else if (sheetKey === 'liukang') {
    // IMG_4885_aa51b88b.jpeg (Liu Kang — verified 21 rows)
    const r0 = getRowSafe(rows, 0);
    const r1 = getRowSafe(rows, 1);
    const r3 = getRowSafe(rows, 3);
    const r5 = getRowSafe(rows, 5);
    const r6 = getRowSafe(rows, 6);
    const r7 = getRowSafe(rows, 7);
    const r8 = getRowSafe(rows, 8);
    const r9 = getRowSafe(rows, 9);
    const r10 = getRowSafe(rows, 10);
    const r11 = getRowSafe(rows, 11);
    const r12 = getRowSafe(rows, 12);

    rawTracks.idle = r0.slice(0, 7);
    rawTracks.block = r0.slice(7, 9);
    rawTracks.crouch = r0.slice(11, 17);
    rawTracks.walk = r1.slice(0, 9);
    rawTracks.run = r1.slice(1, 9);
    rawTracks.dash = r1.slice(0, 9);
    rawTracks.jump = r1.slice(10, 12);
    rawTracks.airTumble = r1.slice(12, 19);
    rawTracks.victory = getRowSafe(rows, 2);
    rawTracks.lp = r3.slice(0, 5);
    rawTracks.hp = r3.slice(5, 12);
    rawTracks.hk = r5.slice(0, 4);
    rawTracks.lk = r5.slice(4, 8);
    rawTracks.comboLink1 = r3.slice(0, 5);
    rawTracks.comboLink2 = r5.slice(4, 8);
    rawTracks.comboFinisher = r6.slice(0, 5);
    rawTracks.throw = r6.slice(0, 2);
    rawTracks.sweep = r6.slice(5, 10);
    rawTracks.uppercut = r7.slice(0, 4);
    rawTracks.crouchLk = r7.slice(6, 11);
    rawTracks.flyingKick = r8.slice(0, 2);
    rawTracks.jumpKick = r8.slice(1, 3);
    rawTracks.jumpPunch = r8.slice(0, 2);
    rawTracks.hitstun = r9.slice(0, 7);
    rawTracks.stagger = r9.slice(7, 12);
    rawTracks.knockdown = r10.slice(0, 6);
    rawTracks.fallen = r10.slice(2, 4);
    rawTracks.wakeup = r10.slice(8, 14);
    rawTracks.frozen = r11.slice(6, 9);
    rawTracks.dizzy = r11.slice(9, 15);
    rawTracks.finishStance = r11.slice(9, 15);
    rawTracks.special1 = r12.slice(0, 4); // Fireball cast
    rawTracks.projFire = r12.slice(4, 15); // Fireball projectile
    rawTracks.special2 = getRowSafe(rows, 13); // Rapid Bicycle Kick (kept off jumpKick!)
    rawTracks.morphDragon = [...getRowSafe(rows, 15), ...sliceByFraction(getRowSafe(rows, 16), 0, 0.35)];
    rawTracks.decapitated = sliceByFraction(getRowSafe(rows, 17), 0, 0.65);
    rawTracks.severedHead = sliceByFraction(getRowSafe(rows, 17), 0.65, 1.0);
    rawTracks.burnSkeleton = sliceByFraction(getRowSafe(rows, 18), 0.55, 1.0);
  } else if (sheetKey === 'umk3') {
    // IMG_4888_9d4e2d12.jpeg
    const r0 = getRowSafe(rows, 0);
    const r1 = getRowSafe(rows, 1);
    rawTracks.idle = sliceByFraction(r0, 0, 0.55);
    rawTracks.block = sliceByFraction(r0, 0.55, 0.78);
    rawTracks.crouch = sliceByFraction(r0, 0.78, 1.0);
    rawTracks.walk = sliceByFraction(r1, 0, 0.45);
    rawTracks.run = sliceByFraction(r1, 0.30, 0.72);
    rawTracks.dash = sliceByFraction(r1, 0.42, 0.75);
    rawTracks.airTumble = sliceByFraction(r1, 0.72, 1.0);
    rawTracks.victory = sliceByFraction(getRowSafe(rows, 2), 0, 0.50);
    rawTracks.uppercut = getRowSafe(rows, 3);
    rawTracks.lp = sliceByFraction(getRowSafe(rows, 4), 0, 0.50);
    rawTracks.hp = sliceByFraction(getRowSafe(rows, 4), 0.50, 1.0);
    rawTracks.throw = sliceByFraction(getRowSafe(rows, 5), 0, 0.60);
    rawTracks.weaponSlash = sliceByFraction(getRowSafe(rows, 5), 0.40, 1.0);
    rawTracks.weaponThrust = sliceByFraction(getRowSafe(rows, 4), 0.45, 1.0);
    rawTracks.comboLink1 = sliceByFraction(getRowSafe(rows, 4), 0, 0.50);
    rawTracks.comboLink2 = sliceByFraction(getRowSafe(rows, 6), 0, 0.50);
    rawTracks.comboFinisher = sliceByFraction(getRowSafe(rows, 6), 0.50, 1.0);
    rawTracks.lk = sliceByFraction(getRowSafe(rows, 6), 0, 0.50);
    rawTracks.hk = sliceByFraction(getRowSafe(rows, 6), 0.50, 1.0);
    rawTracks.jumpKick = sliceByFraction(getRowSafe(rows, 7), 0.65, 1.0);
    rawTracks.sweep = sliceByFraction(getRowSafe(rows, 8), 0.55, 1.0);
    rawTracks.hitstun = sliceByFraction(getRowSafe(rows, 9), 0, 0.55);
    rawTracks.dizzy = sliceByFraction(getRowSafe(rows, 9), 0.55, 1.0);
    rawTracks.finishStance = sliceByFraction(getRowSafe(rows, 9), 0.55, 1.0);
    rawTracks.knockdown = getRowSafe(rows, 10);
    rawTracks.fallen = sliceByFraction(getRowSafe(rows, 10), 0.30, 0.50);
    rawTracks.wakeup = sliceByFraction(getRowSafe(rows, 10), 0.70, 1.0);
    rawTracks.frozen = sliceByFraction(getRowSafe(rows, 11), 0.78, 1.0);
    rawTracks.projFire = sliceByFraction(getRowSafe(rows, 12), 0.25, 1.0);
    rawTracks.special1 = sliceByFraction(getRowSafe(rows, 14), 0, 0.65); // Spear!
    rawTracks.projSpear = sliceByFraction(getRowSafe(rows, 14), 0.20, 0.65);
    rawTracks.morphDragon = sliceByFraction(getRowSafe(rows, 15), 0, 0.45); // T-Rex morph!
    rawTracks.decapitated = sliceByFraction(getRowSafe(rows, 16), 0, 0.60);
    rawTracks.burnSkeleton = sliceByFraction(getRowSafe(rows, 16), 0.25, 0.65);
    rawTracks.special2 = sliceByFraction(getRowSafe(rows, 17), 0, 0.85);
  } else if (sheetKey === 'mk2swap') {
    // IMG_3274_684a7475.jpeg
    rawTracks.idle = getRowSafe(rows, 0);
    rawTracks.walk = getRowSafe(rows, 0);
    rawTracks.run = getRowSafe(rows, 0);
    rawTracks.crouch = sliceByFraction(getRowSafe(rows, 1), 0, 0.38);
    rawTracks.airTumble = sliceByFraction(getRowSafe(rows, 1), 0.38, 1.0);
    rawTracks.lp = getRowSafe(rows, 2);
    rawTracks.hp = getRowSafe(rows, 3);
    rawTracks.throw = getRowSafe(rows, 3);
    rawTracks.weaponSlash = getRowSafe(rows, 3);
    rawTracks.weaponThrust = getRowSafe(rows, 2);
    rawTracks.comboLink1 = getRowSafe(rows, 2);
    rawTracks.comboLink2 = sliceByFraction(getRowSafe(rows, 4), 0, 0.5);
    rawTracks.comboFinisher = sliceByFraction(getRowSafe(rows, 4), 0.5, 1.0);
    rawTracks.lk = sliceByFraction(getRowSafe(rows, 4), 0, 0.50);
    rawTracks.hk = sliceByFraction(getRowSafe(rows, 4), 0.50, 1.0);
    rawTracks.sweep = getRowSafe(rows, 5);
    rawTracks.jumpKick = getRowSafe(rows, 6);
    rawTracks.uppercut = getRowSafe(rows, 8);
    rawTracks.block = sliceByFraction(getRowSafe(rows, 9), 0, 0.45);
    rawTracks.hitstun = getRowSafe(rows, 10);
    rawTracks.knockdown = getRowSafe(rows, 11);
    rawTracks.fallen = sliceByFraction(getRowSafe(rows, 11), 0.35, 0.55);
    rawTracks.dizzy = getRowSafe(rows, 12);
    rawTracks.finishStance = getRowSafe(rows, 12);
    rawTracks.decapitated = sliceByFraction(getRowSafe(rows, 13), 0, 0.60);
    rawTracks.burnSkeleton = sliceByFraction(getRowSafe(rows, 13), 0.60, 1.0);
    rawTracks.special1 = sliceByFraction(getRowSafe(rows, 14), 0, 0.35);
    rawTracks.projIce = sliceByFraction(getRowSafe(rows, 14), 0.35, 1.0);
    rawTracks.projFire = getRowSafe(rows, 15);
    rawTracks.victory = getRowSafe(rows, 16);
  } else {
    // mk3gold: IMG_3402_06c340b7.png (high-res MK3 gold/black warrior)
    const r0 = getRowSafe(rows, 0);
    rawTracks.idle = sliceByFraction(r0, 0, 0.55);
    rawTracks.walk = sliceByFraction(r0, 0.55, 1.0);
    rawTracks.victory = sliceByFraction(getRowSafe(rows, 1), 0, 0.45);
    rawTracks.dash = sliceByFraction(getRowSafe(rows, 2), 0.45, 1.0); // Full sprint/run!
    rawTracks.run = sliceByFraction(getRowSafe(rows, 2), 0.35, 1.0);
    rawTracks.lp = sliceByFraction(getRowSafe(rows, 3), 0, 0.55);
    rawTracks.sweep = sliceByFraction(getRowSafe(rows, 3), 0.55, 1.0);
    rawTracks.airTumble = sliceByFraction(getRowSafe(rows, 5), 0, 0.50);
    rawTracks.lk = sliceByFraction(getRowSafe(rows, 5), 0.50, 1.0);
    rawTracks.crouch = sliceByFraction(getRowSafe(rows, 6), 0, 0.45);
    rawTracks.hp = sliceByFraction(getRowSafe(rows, 6), 0.45, 1.0);
    rawTracks.hk = getRowSafe(rows, 7);
    rawTracks.throw = sliceByFraction(getRowSafe(rows, 4), 0, 0.65);
    rawTracks.weaponSlash = sliceByFraction(getRowSafe(rows, 6), 0.35, 1.0);
    rawTracks.weaponThrust = sliceByFraction(getRowSafe(rows, 3), 0.15, 0.65);
    rawTracks.comboLink1 = sliceByFraction(getRowSafe(rows, 3), 0, 0.55);
    rawTracks.comboLink2 = sliceByFraction(getRowSafe(rows, 5), 0.50, 1.0);
    rawTracks.comboFinisher = getRowSafe(rows, 7);
    rawTracks.uppercut = sliceByFraction(getRowSafe(rows, 8), 0.40, 0.80);
    rawTracks.block = sliceByFraction(getRowSafe(rows, 8), 0.80, 1.0);
    rawTracks.hitstun = sliceByFraction(getRowSafe(rows, 9), 0, 0.55);
    rawTracks.dizzy = sliceByFraction(getRowSafe(rows, 9), 0.55, 1.0);
    rawTracks.finishStance = sliceByFraction(getRowSafe(rows, 9), 0.55, 1.0);
    rawTracks.knockdown = sliceByFraction(getRowSafe(rows, 11), 0, 0.70);
    rawTracks.fallen = sliceByFraction(getRowSafe(rows, 11), 0.40, 0.65);
    rawTracks.wakeup = sliceByFraction(getRowSafe(rows, 12), 0.45, 0.85);
    rawTracks.special1 = sliceByFraction(getRowSafe(rows, 13), 0, 0.55);
    rawTracks.special2 = getRowSafe(rows, 14); // High-speed blur rush!
    rawTracks.frozen = sliceByFraction(getRowSafe(rows, 15), 0.25, 0.55); // Snowman/freeze morph!
    rawTracks.burnSkeleton = sliceByFraction(getRowSafe(rows, 16), 0.55, 1.0);
    rawTracks.decapitated = sliceByFraction(getRowSafe(rows, 16), 0.40, 0.85);
  }

  // Convert raw boxes into cropped SpriteFrames and fill any empty tracks from idle
  const idleRaw = rawTracks.idle && rawTracks.idle.length > 0 ? rawTracks.idle : getRowSafe(rows, 0);
  const idleFrames = idleRaw.map((b) => cropBoxToFrame(sourceCanvas, b));

  const out: Partial<Record<AnimationTrackKey, SpriteFrame[]>> = {};
  const allKeys: AnimationTrackKey[] = [
    'idle', 'walk', 'run', 'dash', 'crouch', 'block', 'jump', 'airTumble',
    'lp', 'hp', 'lk', 'hk', 'uppercut', 'sweep', 'crouchLk', 'throw', 'jumpPunch', 'jumpKick', 'flyingKick',
    'weaponSlash', 'weaponThrust', 'comboLink1', 'comboLink2', 'comboFinisher',
    'special1', 'special2', 'hitstun', 'stagger', 'dizzy', 'finishStance', 'knockdown',
    'fallen', 'wakeup', 'frozen', 'decapitated', 'burnSkeleton', 'victory',
    'projSpear', 'projIce', 'projFire', 'projEnergy', 'morphDragon', 'severedHead',
  ];

  const loopingTracks = new Set<AnimationTrackKey>([
    'idle', 'walk', 'run', 'dash', 'dizzy', 'finishStance', 'airTumble', 'special2',
  ]);
  const kineticTrailTracks = new Set<AnimationTrackKey>([
    'run', 'dash', 'lp', 'hp', 'lk', 'hk', 'uppercut', 'sweep', 'crouchLk', 'throw', 'jumpPunch', 'jumpKick', 'flyingKick',
    'weaponSlash', 'weaponThrust', 'comboLink1', 'comboLink2', 'comboFinisher', 'special1', 'special2',
  ]);

  for (const key of allKeys) {
    const rawList = rawTracks[key];
    let frames =
      rawList && rawList.length > 0
        ? rawList.map((b) => cropBoxToFrame(sourceCanvas, b))
        : idleFrames;

    // Fallback chains so every single combat state has authentic sprites
    if ((!rawList || rawList.length === 0) && key === 'stagger' && out.hitstun) {
      frames = out.hitstun;
    } else if ((!rawList || rawList.length === 0) && key === 'run' && out.dash) {
      frames = out.dash;
    } else if ((!rawList || rawList.length === 0) && key === 'throw' && out.hp) {
      frames = out.hp;
    } else if ((!rawList || rawList.length === 0) && key === 'crouchLk' && out.sweep) {
      frames = out.sweep;
    } else if ((!rawList || rawList.length === 0) && key === 'jumpPunch' && out.hp) {
      frames = out.hp;
    } else if ((!rawList || rawList.length === 0) && key === 'flyingKick' && out.jumpKick) {
      frames = out.jumpKick;
    } else if ((!rawList || rawList.length === 0) && key === 'weaponSlash' && out.hp) {
      frames = out.hp;
    } else if ((!rawList || rawList.length === 0) && key === 'weaponThrust' && out.lp) {
      frames = out.lp;
    } else if ((!rawList || rawList.length === 0) && key === 'comboLink1' && out.lp) {
      frames = out.lp;
    } else if ((!rawList || rawList.length === 0) && key === 'comboLink2' && out.lk) {
      frames = out.lk;
    } else if ((!rawList || rawList.length === 0) && key === 'comboFinisher' && out.hk) {
      frames = out.hk;
    } else if ((!rawList || rawList.length === 0) && key === 'finishStance' && out.dizzy) {
      frames = out.dizzy;
    } else if ((!rawList || rawList.length === 0) && key === 'jump' && out.airTumble) {
      frames = out.airTumble;
    } else if ((!rawList || rawList.length === 0) && key === 'jumpKick' && out.hk) {
      frames = out.hk;
    } else if ((!rawList || rawList.length === 0) && key === 'wakeup' && out.crouch) {
      frames = out.crouch;
    }

    // Generate EXTRA IN-BETWEEN FRAMES between discrete keyframes!
    const isProjectile =
      key === 'projSpear' || key === 'projIce' || key === 'projFire' || key === 'projEnergy' || key === 'severedHead';
    const tweenCount = isProjectile ? 1 : tweens;

    out[key] = synthesizeInBetweenFrames(
      frames,
      tweenCount,
      loopingTracks.has(key),
      kineticTrailTracks.has(key)
    );
  }

  return out as Record<AnimationTrackKey, SpriteFrame[]>;
}

// ============================================================================
// MAIN SPRITE SHEET ENGINE SINGLETON
// ============================================================================

class SpriteSheetEngineClass {
  private sheetCanvases = new Map<SheetKey, HTMLCanvasElement>();
  private sheetRows = new Map<SheetKey, RawBox[][]>();
  private characterBanks = new Map<CharacterId, Record<AnimationTrackKey, SpriteFrame[]>>();
  private loadingStarted = false;
  private readySheets = new Set<SheetKey>();
  private renderHistories = new Map<string, FighterRenderHistory>();

  public preloadAll(): void {
    if (this.loadingStarted || typeof window === 'undefined') return;
    this.loadingStarted = true;

    (Object.keys(SHEET_URLS) as SheetKey[]).forEach((key) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const keyed = keyOutSheetCanvas(img, key);
          const rows = extractSpriteRows(keyed, key);
          this.sheetCanvases.set(key, keyed);
          this.sheetRows.set(key, rows);
          this.readySheets.add(key);

          // Invalidate any cached banks that depend on this sheet so they rebuild cleanly
          for (const [charId, spec] of Object.entries(CHARACTER_PALETTES) as [CharacterId, PaletteSpec][]) {
            if (spec.sheet === key) {
              this.characterBanks.delete(charId);
            }
          }
        } catch (err) {
          console.warn(`[SpriteSheetEngine] Failed processing sheet ${key}`, err);
        }
      };
      img.src = SHEET_URLS[key];
    });
  }

  public isCharacterReady(charId: CharacterId): boolean {
    this.preloadAll();
    const spec = CHARACTER_PALETTES[charId] || CHARACTER_PALETTES.scorpion;
    return this.readySheets.has(spec.sheet);
  }

  public getBank(charId: CharacterId): Record<AnimationTrackKey, SpriteFrame[]> | null {
    this.preloadAll();
    const cached = this.characterBanks.get(charId);
    if (cached) return cached;

    const spec = CHARACTER_PALETTES[charId] || CHARACTER_PALETTES.scorpion;
    const baseCanvas = this.sheetCanvases.get(spec.sheet);
    const rows = this.sheetRows.get(spec.sheet);
    if (!baseCanvas || !rows || rows.length === 0) return null;

    const paletteCanvas = applyCharacterPalette(baseCanvas, spec.tintMode);
    const bank = buildTracksForSheet(spec.sheet, rows, paletteCanvas, spec.tweenBetweenKeyframes);
    this.characterBanks.set(charId, bank);
    return bank;
  }

  private resolveAnimationTrack(fighter: Fighter): {
    track: AnimationTrackKey;
    progress: number;
    loop: boolean;
    fps: number;
    morphTicks: number;
  } {
    const s = fighter.state;
    const nowSec = performance.now() / 1000;
    const resolved = resolveFighterMatrixCell(fighter);

    if (s === 'FATALITY_EXECUTION') {
      const elapsed = Math.max(0, 420 - fighter.fatalityTimer) / 420;
      if (fighter.hp <= 0 || fighter.isDecapitated) {
        if (fighter.isDecapitated) {
          return { track: 'decapitated', progress: Math.min(1, (elapsed - 0.6) / 0.35), loop: false, fps: 18, morphTicks: 3 };
        }
        if (elapsed > 0.32) {
          return { track: 'burnSkeleton', progress: Math.min(1, (elapsed - 0.32) / 0.45), loop: false, fps: 16, morphTicks: 3 };
        }
        return { track: 'dizzy', progress: (nowSec * 1.4) % 1, loop: true, fps: 16, morphTicks: 3 };
      } else {
        if (elapsed > 0.78) {
          return { track: 'victory', progress: Math.min(1, (elapsed - 0.78) / 0.2), loop: false, fps: 16, morphTicks: 4 };
        }
        if (fighter.def.id === 'liukang' && elapsed > 0.25 && elapsed < 0.72) {
          return { track: 'morphDragon', progress: Math.min(1, (elapsed - 0.25) / 0.45), loop: false, fps: 16, morphTicks: 4 };
        }
        if (elapsed > 0.20 && elapsed < 0.65) {
          return { track: 'special2', progress: Math.min(1, (elapsed - 0.20) / 0.40), loop: false, fps: 18, morphTicks: 4 };
        }
        return { track: 'special1', progress: Math.min(1, elapsed / 0.25), loop: false, fps: 18, morphTicks: 4 };
      }
    }

    const track = resolved.track as AnimationTrackKey;
    const fps = resolved.fps;
    const loop = resolved.loop;
    const morphTicks = resolved.morphTicks;

    if (s === 'KNOCKED_DOWN') {
      const t = Math.max(0, Math.min(1, 1 - fighter.knockdownTimer / 42));
      return { track, progress: Math.min(1, 0.5 + t * 0.5), loop: false, fps, morphTicks };
    }
    if (s === 'WAKEUP') {
      return { track, progress: Math.min(1, fighter.actionFrame / 10), loop: false, fps, morphTicks };
    }
    if (s === 'HITSTUN' || s === 'STAGGER' || s === 'GUARD_CRUSH' || s === 'CRUMPLE') {
      return { track, progress: Math.min(1, fighter.actionFrame / 22), loop: false, fps, morphTicks };
    }
    if (s === 'BLOCK') {
      return { track, progress: 0.65, loop: false, fps, morphTicks };
    }
    if (s === 'CROUCH') {
      return { track, progress: 0.75, loop: false, fps, morphTicks };
    }
    if (s === 'FROZEN') {
      return { track, progress: 0.5, loop: false, fps, morphTicks };
    }
    if (s === 'FALLEN' || s === 'DEAD') {
      return { track, progress: fighter.isDecapitated ? 0.92 : 0.85, loop: false, fps, morphTicks };
    }
    if (s === 'ATTACK' && fighter.currentAttack) {
      const a = fighter.currentAttack;
      let p = 0;
      if (fighter.actionFrame <= a.startup) {
        p = (fighter.actionFrame / Math.max(1, a.startup)) * 0.38;
      } else if (fighter.actionFrame <= a.startup + a.active) {
        const activeT = (fighter.actionFrame - a.startup) / Math.max(1, a.active);
        p = 0.42 + activeT * 0.32;
      } else {
        const recT = (fighter.actionFrame - (a.startup + a.active)) / Math.max(1, a.recovery);
        p = Math.min(1, 0.76 + recT * 0.24);
      }
      return { track, progress: p, loop: false, fps, morphTicks };
    }
    if (s === 'VICTORY') {
      return { track, progress: (nowSec * 0.9) % 1, loop: false, fps, morphTicks };
    }

    const cycleSpeed = loop ? fps / 18 : 1.0;
    return {
      track,
      progress: (nowSec * Math.max(0.85, cycleSpeed)) % 1,
      loop,
      fps,
      morphTicks,
    };
  }

  /**
   * Renders the fighter's smoothly interpolated sprite frame + extra in-between
   * motion cross-dissolve, speed-echo ghosts, and character-specific props.
   */
  public drawFighterSprite(
    ctx: CanvasRenderingContext2D,
    fighter: Fighter,
    floorY: number
  ): boolean {
    const bank = this.getBank(fighter.def.id);
    if (!bank) return false;

    const spec = CHARACTER_PALETTES[fighter.def.id] || CHARACTER_PALETTES.scorpion;
    const { track, progress, loop, morphTicks } = this.resolveAnimationTrack(fighter);
    const frames = bank[track] && bank[track].length > 0 ? bank[track] : bank.idle;
    if (!frames || frames.length === 0) return false;

    const rawIdx = progress * (frames.length - (loop ? 0 : 1));
    const idxA = Math.max(0, Math.min(frames.length - 1, Math.floor(rawIdx)));
    const idxB = loop ? (idxA + 1) % frames.length : Math.min(frames.length - 1, idxA + 1);
    const subT = Math.max(0, Math.min(1, rawIdx - idxA));
    const frameA = frames[idxA];
    const frameB = frames[idxB];

    // Normalized sprite height based on upright idle pose so crouch/fallen never stretch tall!
    const idleRef = bank.idle[0] || frameA;
    const pixelScale = spec.targetHeight / Math.max(24, idleRef.height);
    const scaleX = pixelScale * (spec.scaleX || 1);
    const scaleY = pixelScale;

    // Track state transition history for seamless cross-morphing between states/combos
    let history = this.renderHistories.get(fighter.id);
    if (!history) {
      history = {
        lastFrame: null,
        lastStateKey: track,
        transitionTicks: 0,
        maxTransitionTicks: morphTicks,
        trailBuffer: [],
      };
      this.renderHistories.set(fighter.id, history);
    }

    if (history.lastStateKey !== track) {
      history.maxTransitionTicks = spec.tweenBetweenKeyframes === 0 ? 0 : Math.max(1, morphTicks);
      history.transitionTicks = history.maxTransitionTicks;
      history.lastStateKey = track;
    } else if (history.transitionTicks > 0) {
      history.transitionTicks--;
    }

    const zScale = 1 + fighter.zVisualOffset * 0.08;
    const zOffsetY = fighter.zVisualOffset * 14;
    const shadowFloorY = fighter.standingPlatform ? fighter.standingPlatform.y : floorY;

    const anchorWorldX = fighter.x + fighter.width * 0.5;
    const isFallenOrDown =
      fighter.state === 'FALLEN' ||
      fighter.state === 'KNOCKED_DOWN' ||
      (fighter.state === 'DEAD' && fighter.fatalityTimer === 0);
    const anchorWorldY =
      (isFallenOrDown
        ? shadowFloorY + 2
        : fighter.isGrounded && !fighter.standingPlatform
        ? floorY
        : fighter.y + fighter.height) + zOffsetY;

    // Push speed-echo ghost only during Dash / Run / Specials / Heavy Strikes
    const isHighVelocity =
      fighter.state === 'DASH' ||
      fighter.state === 'RUN' ||
      fighter.state === 'TAG_IN' ||
      (fighter.state === 'ATTACK' &&
        (fighter.currentAttack?.isSpecial ||
          fighter.currentAttack?.isSuper ||
          fighter.currentAttack?.id === 'UPPERCUT' ||
          fighter.currentAttack?.id === 'HK' ||
          fighter.stateMachine.comboStep >= 2));

    if (isHighVelocity && Math.random() < 0.55) {
      history.trailBuffer.push({
        frame: frameA,
        x: anchorWorldX,
        y: anchorWorldY,
        facing: fighter.facing,
        alpha: 0.42,
        tint: fighter.def.themeColor,
      });
      if (history.trailBuffer.length > 5) history.trailBuffer.shift();
    }

    // 1. Render lingering speed-echo afterimage trails
    for (let i = history.trailBuffer.length - 1; i >= 0; i--) {
      const tr = history.trailBuffer[i];
      tr.alpha -= 0.065;
      if (tr.alpha <= 0.02) {
        history.trailBuffer.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.translate(tr.x, tr.y);
      ctx.scale(tr.facing * scaleX * zScale, scaleY * zScale);
      ctx.globalAlpha = tr.alpha;
      ctx.drawImage(tr.frame.canvas, -tr.frame.footX, -tr.frame.footY);
      ctx.restore();
    }

    // 2. Perspective ground shadow beneath fighter (projects onto platform or floorY + Z-lane offset)
    ctx.save();
    const shadowY = shadowFloorY + zOffsetY;
    const heightAboveFloor = Math.max(0, shadowY - anchorWorldY);
    const shadowScale = Math.max(0.32, 1 - heightAboveFloor / 280) * zScale;
    const shadowAlpha = Math.max(0.18, 0.72 * (1 - heightAboveFloor / 340));
    const shadowGrad = ctx.createRadialGradient(
      anchorWorldX,
      shadowY,
      2,
      anchorWorldX,
      shadowY,
      44 * shadowScale
    );
    shadowGrad.addColorStop(0, `rgba(0, 0, 0, ${shadowAlpha})`);
    shadowGrad.addColorStop(0.65, `rgba(0, 0, 0, ${shadowAlpha * 0.55})`);
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(anchorWorldX, shadowY, 46 * shadowScale, 10 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. Draw main sprite with sub-frame Hermite cross-blend + optional state morph
    ctx.save();
    ctx.translate(anchorWorldX, anchorWorldY);
    if (fighter.state === 'AIR_TUMBLE') {
      ctx.translate(0, -fighter.height * 0.5);
      ctx.rotate(fighter.tumbleAngle * 0.35);
      ctx.translate(0, fighter.height * 0.5);
    } else if (fighter.state === 'DIZZY') {
      const sway = Math.sin(Date.now() * 0.008) * 0.09;
      ctx.rotate(sway);
    }
    const dizzySlumpY = fighter.state === 'DIZZY' ? 0.96 + Math.sin(Date.now() * 0.014) * 0.03 : 1;
    ctx.scale(fighter.facing * scaleX * fighter.squashX * zScale, scaleY * fighter.squashY * zScale * dizzySlumpY);

    if (fighter.invisibleTimer > 0) {
      ctx.globalAlpha = 0.34;
    } else if (fighter.activeStride?.effect === 'FOG_CLOAK' && fighter.zLane !== 0) {
      ctx.globalAlpha = 0.62;
    }

    // Subtle fighting-stance contour glow
    ctx.shadowColor =
      fighter.hitFlashFrames > 0
        ? fighter.hitFlashColor
        : fighter.state === 'HITSTUN' || fighter.state === 'STAGGER'
        ? '#ef4444'
        : fighter.overdriveArmor
        ? '#f97316'
        : fighter.isCounterReady
        ? '#38bdf8'
        : fighter.def.themeColor;
    ctx.shadowBlur = fighter.hitFlashFrames > 0 ? 16 : fighter.overdriveArmor ? 15 : fighter.isCounterReady ? 14 : 6;

    // Cross-state transition morph (prevents snappy pop between combo links!)
    if (history.transitionTicks > 0 && history.lastFrame) {
      const blend = 1 - history.transitionTicks / history.maxTransitionTicks;
      ctx.save();
      ctx.globalAlpha *= (1 - blend) * 0.85;
      ctx.drawImage(history.lastFrame.canvas, -history.lastFrame.footX, -history.lastFrame.footY);
      ctx.restore();
      ctx.globalAlpha *= 0.35 + blend * 0.65;
    }

    // Sub-frame blend between frameA and frameB
    if (frameA === frameB || subT < 0.08) {
      ctx.drawImage(frameA.canvas, -frameA.footX, -frameA.footY);
    } else {
      ctx.save();
      ctx.globalAlpha *= 1 - subT * 0.72;
      ctx.drawImage(frameA.canvas, -frameA.footX, -frameA.footY);
      ctx.restore();

      ctx.save();
      ctx.globalAlpha *= subT;
      ctx.drawImage(frameB.canvas, -frameB.footX, -frameB.footY);
      ctx.restore();
    }

    // Iconic character props layered cleanly atop base sprite
    this.drawCharacterIconicOverlay(ctx, fighter, frameA);

    // Localized Frost prism / Subtle Impact Tint (Zero rectangular flashing hitboxes)
    if (fighter.hitFlashFrames > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = Math.min(0.42, fighter.hitFlashFrames * 0.08);
      ctx.fillStyle = fighter.hitFlashColor || '#e2e8f0';
      ctx.fillRect(-frameA.footX, -frameA.footY, frameA.width, frameA.height);
      ctx.restore();
    } else if (fighter.state === 'FROZEN') {
      ctx.save();
      const cx = 0;
      const cy = -frameA.footY * 0.52;
      const rx = frameA.width * 0.56;
      const ry = frameA.height * 0.54;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.36)';
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx, cy - ry);
      ctx.lineTo(cx + rx, cy - ry * 0.45);
      ctx.lineTo(cx + rx * 0.85, cy + ry * 0.85);
      ctx.lineTo(cx, cy + ry * 0.96);
      ctx.lineTo(cx - rx * 0.85, cy + ry * 0.85);
      ctx.lineTo(cx - rx, cy - ry * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Severed neck blood fountain during decapitation
    if (fighter.isDecapitated) {
      const spurt = Math.sin(Date.now() * 0.025) * 4;
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-3, -frameA.height + 2 - spurt, 6, 8 + spurt);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-1.5, -frameA.height - 4 - spurt, 3, 6 + spurt);
    }

    ctx.restore();

    // Update frame history for next tick morphing
    history.lastFrame = frameA;

    // Finishing Stance dark crimson stagger haze (replaces flat yellow squares)
    if (fighter.state === 'DIZZY') {
      const mistAngle = (Date.now() * 0.005) % (Math.PI * 2);
      ctx.save();
      for (let i = 0; i < 3; i++) {
        const a = mistAngle + (i * Math.PI * 2) / 3;
        const sx = anchorWorldX + Math.cos(a) * 18;
        const sy = anchorWorldY - spec.targetHeight * 0.92 + Math.sin(a * 2) * 5;
        ctx.fillStyle = 'rgba(220, 38, 38, 0.55)';
        ctx.beginPath();
        ctx.arc(sx, sy, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    return true;
  }

  private drawCharacterIconicOverlay(
    ctx: CanvasRenderingContext2D,
    fighter: Fighter,
    frame: SpriteFrame
  ) {
    if (fighter.isDecapitated || fighter.state === 'FALLEN' || fighter.state === 'KNOCKED_DOWN') return;
    const topY = -frame.footY;
    const headX = frame.comX - frame.footX;

    if (fighter.def.id === 'raiden') {
      // Conical Bamboo Jingasa Hat + Lightning Halo
      ctx.save();
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.moveTo(headX - 18, topY + 5);
      ctx.lineTo(headX, topY - 8);
      ctx.lineTo(headX + 18, topY + 5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    } else if (fighter.def.id === 'kunglao') {
      // Broadbrim Razor-Rimmed Hat
      ctx.save();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(headX, topY + 3, 18, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();
    } else if (fighter.def.id === 'aimix') {
      // Sovereign Orange Sonic Halo & Visor
      ctx.save();
      ctx.strokeStyle = '#ff6600';
      ctx.shadowColor = '#ff8800';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(headX, topY - 4, 14, 3.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (fighter.def.id === 'robocop') {
      // Crimson Targeting Diode
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(headX + 2, topY + 5, 6, 2);
    }
  }

  /**
   * Renders sprite-sheet-derived projectiles (Scorpion Spear + wavy rope,
   * Sub-Zero Ice Blast, Fireballs, Energy Rings) with smooth motion!
   */
  public drawProjectileSprite(
    ctx: CanvasRenderingContext2D,
    fighter: Fighter,
    proj: Fighter['projectiles'][number]
  ): boolean {
    const bank = this.getBank(fighter.def.id) || this.getBank('scorpion');
    if (!bank) return false;

    const now = performance.now();

    if (proj.type === 'SPEAR') {
      const spearFrames = bank.projSpear;
      if (spearFrames && spearFrames.length > 0) {
        const sp = spearFrames[Math.min(spearFrames.length - 1, Math.floor((now * 0.02) % spearFrames.length))];
        const startX = fighter.x + (fighter.facing === 1 ? fighter.width : 0);
        const startY = fighter.y + 36;
        const dist = Math.max(24, Math.hypot(proj.x - startX, proj.y - startY));
        const angle = Math.atan2(proj.y - startY, proj.x - startX);

        ctx.save();
        ctx.translate(startX, startY);
        ctx.rotate(angle);
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 8;
        ctx.drawImage(sp.canvas, 0, -10, dist, 20);
        ctx.restore();
        return true;
      }
    }

    if (proj.type === 'ICEBALL') {
      const iceBank = this.getBank('subzero') || bank;
      const iceFrames = iceBank.projIce;
      if (iceFrames && iceFrames.length > 0) {
        const fr = iceFrames[Math.floor((now * 0.02) % iceFrames.length)];
        ctx.save();
        ctx.translate(proj.x, proj.y);
        ctx.scale(proj.ownerFacing * 1.4, 1.4);
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 14;
        ctx.drawImage(fr.canvas, -fr.width * 0.5, -fr.height * 0.5);
        ctx.restore();
        return true;
      }
    }

    if (proj.type === 'DRAGON_FIRE' || proj.type === 'FIREBALL') {
      const fireBank = this.getBank('liukang') || this.getBank('scorpion') || bank;
      const fireFrames = fireBank.projFire;
      if (fireFrames && fireFrames.length > 0) {
        const fr = fireFrames[Math.floor((now * 0.022) % fireFrames.length)];
        ctx.save();
        ctx.translate(proj.x, proj.y);
        ctx.scale(proj.ownerFacing * 1.5, 1.5);
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 16;
        ctx.drawImage(fr.canvas, -fr.width * 0.5, -fr.height * 0.5);
        ctx.restore();
        return true;
      }
    }

    if (proj.type === 'FORCEBALL' || proj.type === 'ENERGY_RING') {
      const jBank = this.getBank('johnny') || bank;
      const eFrames = jBank.projEnergy;
      if (eFrames && eFrames.length > 0) {
        const fr = eFrames[Math.floor((now * 0.02) % eFrames.length)];
        ctx.save();
        ctx.translate(proj.x, proj.y);
        ctx.scale(proj.ownerFacing * 1.35, 1.35);
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 14;
        ctx.drawImage(fr.canvas, -fr.width * 0.5, -fr.height * 0.5);
        ctx.restore();
        return true;
      }
    }

    return false;
  }

  /**
   * Renders severed head sprite from the character's sheet if available.
   */
  public drawSeveredHeadSprite(
    ctx: CanvasRenderingContext2D,
    fighter: Fighter,
    part: Fighter['severedParts'][number]
  ): boolean {
    if (part.type !== 'HEAD') return false;
    const bank = this.getBank(fighter.def.id);
    if (!bank || !bank.severedHead || bank.severedHead.length === 0) return false;
    const fr = bank.severedHead[Math.floor((Date.now() * 0.015) % bank.severedHead.length)];
    ctx.save();
    ctx.translate(part.x - fighter.x, part.y - fighter.y);
    ctx.rotate(part.angle);
    ctx.scale(1.9, 1.9);
    ctx.drawImage(fr.canvas, -fr.width * 0.5, -fr.height * 0.5);
    ctx.restore();
    return true;
  }

  /**
   * Renders a live animated sprite preview onto small menu / VS splash canvases
   * using the authentic character sprite bank & palette.
   */
  public drawFighterPortraitPreview(
    ctx: CanvasRenderingContext2D,
    charId: CharacterId,
    width: number,
    height: number,
    timeMs: number,
    trackKey: AnimationTrackKey = 'idle',
    facing: 1 | -1 = 1
  ): boolean {
    const bank = this.getBank(charId);
    if (!bank) return false;

    const frames = bank[trackKey] && bank[trackKey].length > 0 ? bank[trackKey] : bank.idle;
    if (!frames || frames.length === 0) return false;

    const idx = Math.floor((timeMs / 105) % frames.length);
    const frame = frames[idx];
    const idleRef = bank.idle[0] || frame;
    const spec = CHARACTER_PALETTES[charId] || CHARACTER_PALETTES.scorpion;

    const targetH = height * 0.82;
    const scale = targetH / Math.max(24, idleRef.height);

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width * 0.5, height * 0.92);
    ctx.scale(facing * scale * (spec.scaleX || 1), scale);
    ctx.drawImage(frame.canvas, -frame.footX, -frame.footY);
    ctx.restore();
    return true;
  }
}

export const SpriteSheetEngine = new SpriteSheetEngineClass();
