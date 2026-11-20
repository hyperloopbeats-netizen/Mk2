/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { M01_ArcadeManualSpec, M01_Config } from './m01Config';
import type { FighterEntity, SlotId } from './types';

interface QueuedCommand {
  cmd: string;
  ttl: number;
}

interface HistoryEntry {
  dir: string;
  age: number;
}

export const M03_InputBus = {
  keysDown: new Set<string>(),
  queues: { p1: [] as QueuedCommand[], p2: [] as QueuedCommand[] },
  history: { p1: [] as HistoryEntry[], p2: [] as HistoryEntry[] },
  virtualStick: { moveX: 0 as -1 | 0 | 1, crouch: false, blocking: false },
  _onKeyDown: null as ((e: KeyboardEvent) => void) | null,
  _onKeyUp: null as ((e: KeyboardEvent) => void) | null,

  init(): void {
    this.destroy();
    this._onKeyDown = (e: KeyboardEvent) => {
      this.keysDown.add(e.code);
      const b = M01_ArcadeManualSpec.buttons;
      if (e.code === b.HP) this.pushCommand('p1', 'HP');
      if (e.code === b.LP) this.pushCommand('p1', 'LP');
      if (e.code === b.HK) this.pushCommand('p1', 'HK');
      if (e.code === b.LK) this.pushCommand('p1', 'LK');
      if (e.code === b.UP) this.pushCommand('p1', 'UP');
      if (e.code === b.START) this.pushCommand('p1', 'START');
    };
    this._onKeyUp = (e: KeyboardEvent) => {
      this.keysDown.delete(e.code);
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  },

  destroy(): void {
    if (this._onKeyDown) {
      window.removeEventListener('keydown', this._onKeyDown);
      this._onKeyDown = null;
    }
    if (this._onKeyUp) {
      window.removeEventListener('keyup', this._onKeyUp);
      this._onKeyUp = null;
    }
    this.keysDown.clear();
    this.virtualStick = { moveX: 0, crouch: false, blocking: false };
  },

  pressVirtualButton(btn: 'HP' | 'LP' | 'HK' | 'LK' | 'UP' | 'START'): void {
    this.pushCommand('p1', btn);
  },

  setVirtualStick(patch: Partial<{ moveX: -1 | 0 | 1; crouch: boolean; blocking: boolean }>): void {
    Object.assign(this.virtualStick, patch);
  },

  pollStick(slot: SlotId, facing: 1 | -1): { moveX: -1 | 0 | 1; crouch: boolean; blocking: boolean } {
    if (slot !== 'p1') return { moveX: 0, crouch: false, blocking: false };
    const b = M01_ArcadeManualSpec.buttons;
    let moveX: number = this.virtualStick.moveX;
    if (this.keysDown.has(b.LEFT)) moveX -= 1;
    if (this.keysDown.has(b.RIGHT)) moveX += 1;
    const clampedMoveX: -1 | 0 | 1 = moveX > 0 ? 1 : moveX < 0 ? -1 : 0;
    const crouch = this.keysDown.has(b.DOWN) || this.virtualStick.crouch;
    const blocking = this.keysDown.has(b.BL) || this.virtualStick.blocking;

    const rel = clampedMoveX === 0 ? 0 : clampedMoveX * facing > 0 ? 1 : -1;
    const dirTag = crouch
      ? rel > 0
        ? 'DF'
        : rel < 0
        ? 'DB'
        : 'D'
      : rel > 0
      ? 'F'
      : rel < 0
      ? 'B'
      : 'N';
    const hist = this.history[slot];
    const last = hist[hist.length - 1];
    if (!last || last.dir !== dirTag) {
      hist.push({ dir: dirTag, age: 0 });
      if (hist.length > 10) hist.shift();
    }
    return { moveX: clampedMoveX, crouch, blocking };
  },

  hasQuarterCircleForward(slot: SlotId): boolean {
    const dirs = (this.history[slot] || []).map((h) => h.dir);
    const seq = ['D', 'DF', 'F'];
    let ptr = 0;
    for (const d of dirs) {
      if (d === seq[ptr]) {
        ptr += 1;
        if (ptr === seq.length) return true;
      }
    }
    return false;
  },

  resolveManualMove(
    f: FighterEntity,
    opp: FighterEntity,
    rawBtn: string,
    stick: { moveX: number; crouch: boolean; blocking: boolean }
  ): string | null {
    if (rawBtn === 'START') return null;
    if (rawBtn === 'UP') return 'jump';

    const dist = Math.abs(opp.x - f.x);
    const isClose = dist < 76 && Math.abs(f.y - opp.y) < 55;
    const relDir = stick.moveX === 0 ? 0 : stick.moveX * f.facing > 0 ? 1 : -1;

    if (M01_Config.infusion.activeFinisherWindow && rawBtn === 'HP') {
      const fCount = (this.history[f.slot] || []).filter((h) => h.dir === 'F').length;
      if (fCount >= 2 || isClose) return 'FINISHER_STAGE_INFUSE';
    }

    if (rawBtn === 'LP' && this.hasQuarterCircleForward(f.slot)) {
      this.history[f.slot] = [];
      return 'projectile';
    }

    if (stick.crouch) {
      if (rawBtn === 'HP' || rawBtn === 'LP') return 'uppercut';
      if (rawBtn === 'LK') return 'sweep';
      if (rawBtn === 'HK') return 'lk';
    }
    if (relDir < 0 && f.grounded) {
      if (rawBtn === 'LK') return 'sweep';
      if (rawBtn === 'HK') return 'roundhouse';
    }
    if (isClose && f.grounded) {
      if (rawBtn === 'LP') return 'throw';
      if (rawBtn === 'HP') return 'hp';
      if (rawBtn === 'LK' || rawBtn === 'HK') return 'lk';
    }
    if (!f.grounded) {
      return ['HP', 'LP'].includes(rawBtn) ? 'hp' : 'hk';
    }
    return rawBtn.toLowerCase();
  },

  pushCommand(slot: SlotId, cmd: string): void {
    const q = this.queues[slot];
    if (!Array.isArray(q)) return;
    if (q.length < 8) q.push({ cmd, ttl: 10 });
  },

  consumeCommand(slot: SlotId): string | null {
    const q = this.queues[slot];
    while (q && q.length > 0) {
      const item = q.shift();
      if (item && item.ttl > 0) return item.cmd;
    }
    return null;
  },

  tickQueues(): void {
    for (const q of Object.values(this.queues)) {
      for (let i = q.length - 1; i >= 0; i--) {
        q[i].ttl -= 1;
        if (q[i].ttl <= 0) q.splice(i, 1);
      }
    }
    for (const h of Object.values(this.history)) {
      for (let i = h.length - 1; i >= 0; i--) {
        h[i].age += 1;
        if (h[i].age > 24) h.splice(i, 1);
      }
    }
  },
};
