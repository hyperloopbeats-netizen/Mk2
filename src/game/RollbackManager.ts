/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Fighter } from './FighterEngine';
import { FighterState, GGPOStats, JumpPhase, Projectile, ZLane } from '../types/fighter';

export interface FighterSnapshot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  stamina: number;
  superMeter: number;
  guardMeter: number;
  facing: 1 | -1;
  isGrounded: boolean;
  zLane: ZLane;
  jumpPhase: JumpPhase;
  state: FighterState;
  actionFrame: number;
  comboHits: number;
  projectiles: Projectile[];
}

export interface FrameSnapshot {
  frame: number;
  p1: FighterSnapshot;
  cpu: FighterSnapshot;
}

/**
 * Deterministic Rollback & GGPO Telemetry Manager (Omni-Engine Architecture).
 * Captures rolling ring-buffer state snapshots every simulation tick for
 * training rewind, desync inspection, and frame-delay telemetry.
 */
export class RollbackManager {
  private stateHistory: FrameSnapshot[] = [];
  private readonly maxHistory: number;
  public stats: GGPOStats = {
    frame: 0,
    rollbackCount: 0,
    inputDelay: 2,
  };

  constructor(maxHistory = 45) {
    this.maxHistory = maxHistory;
  }

  private captureFighter(f: Fighter): FighterSnapshot {
    return {
      x: f.x,
      y: f.y,
      vx: f.vx,
      vy: f.vy,
      hp: f.hp,
      stamina: f.stamina,
      superMeter: f.superMeter,
      guardMeter: f.guardMeter,
      facing: f.facing,
      isGrounded: f.isGrounded,
      zLane: f.zLane,
      jumpPhase: f.jumpPhase,
      state: f.state,
      actionFrame: f.actionFrame,
      comboHits: f.comboHits,
      projectiles: f.projectiles.map((p) => ({ ...p })),
    };
  }

  private restoreFighter(f: Fighter, snap: FighterSnapshot) {
    f.x = snap.x;
    f.y = snap.y;
    f.vx = snap.vx;
    f.vy = snap.vy;
    f.hp = snap.hp;
    f.stamina = snap.stamina;
    f.superMeter = snap.superMeter;
    f.guardMeter = snap.guardMeter;
    f.facing = snap.facing;
    f.isGrounded = snap.isGrounded;
    f.zLane = snap.zLane;
    f.jumpPhase = snap.jumpPhase;
    f.state = snap.state;
    f.actionFrame = snap.actionFrame;
    f.comboHits = snap.comboHits;
    f.projectiles = snap.projectiles.map((p) => ({ ...p }));
    f.activeHitbox = null;
    f.currentAttack = null;
  }

  public saveState(p1: Fighter, cpu: Fighter) {
    this.stats.frame++;
    this.stateHistory.push({
      frame: this.stats.frame,
      p1: this.captureFighter(p1),
      cpu: this.captureFighter(cpu),
    });
    if (this.stateHistory.length > this.maxHistory) {
      this.stateHistory.shift();
    }
  }

  public rollbackFrames(framesAgo: number, p1: Fighter, cpu: Fighter): boolean {
    if (this.stateHistory.length === 0) return false;
    const idx = Math.max(0, this.stateHistory.length - 1 - Math.max(1, framesAgo));
    const snapshot = this.stateHistory[idx];
    if (!snapshot) return false;

    this.restoreFighter(p1, snapshot.p1);
    this.restoreFighter(cpu, snapshot.cpu);
    this.stateHistory = this.stateHistory.slice(0, idx + 1);
    this.stats.frame = snapshot.frame;
    this.stats.rollbackCount++;
    return true;
  }

  public reset() {
    this.stateHistory = [];
    this.stats.frame = 0;
  }

  public getHistoryLength(): number {
    return this.stateHistory.length;
  }
}
