/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Fighter } from './FighterEngine';
import { CharacterDef, CombatMove, TripleComboRoute } from '../types/fighter';
import { TRIPLE_COMBO_ROUTES } from './constants';

export type RelativeDir = 'F' | 'B' | 'D' | 'U' | 'N';

export class InputBuffer {
  private buffer: Map<string, { frame: number; ttl: number }> = new Map();
  private dirHistory: Array<{ dir: RelativeDir; frame: number }> = [];
  private currentFrame: number = 0;

  public update() {
    this.currentFrame++;
    for (const [key, val] of this.buffer.entries()) {
      if (this.currentFrame - val.frame > val.ttl) {
        this.buffer.delete(key);
      }
    }
    while (this.dirHistory.length > 0 && this.currentFrame - this.dirHistory[0].frame > 34) {
      this.dirHistory.shift();
    }
  }

  public push(input: string, ttl: number = 16) {
    this.buffer.set(input, { frame: this.currentFrame, ttl });
  }

  public pushDirection(dir: RelativeDir) {
    if (dir === 'N') return;
    const last = this.dirHistory[this.dirHistory.length - 1];
    if (last && last.dir === dir && this.currentFrame - last.frame < 6) {
      return;
    }
    this.dirHistory.push({ dir, frame: this.currentFrame });
    if (this.dirHistory.length > 10) {
      this.dirHistory.shift();
    }
  }

  public getRecentDirections(windowFrames: number = 28): RelativeDir[] {
    return this.dirHistory
      .filter((entry) => this.currentFrame - entry.frame <= windowFrames)
      .map((entry) => entry.dir);
  }

  public clearDirections() {
    this.dirHistory = [];
  }

  public has(input: string): boolean {
    return this.buffer.has(input);
  }

  public consume(input: string): boolean {
    if (this.buffer.has(input)) {
      this.buffer.delete(input);
      return true;
    }
    return false;
  }

  public clear() {
    this.buffer.clear();
    this.dirHistory = [];
  }
}

export class FighterStateMachine {
  public fighter: Fighter;
  public inputBuffer: InputBuffer = new InputBuffer();

  // Decoupled Combo State:
  // 0 = Neutral / Individual Hit
  // 1 = Starter (LP / LK)
  // 2 = Chain Link (Bridge Strike)
  // 3 = Triple Combo Finisher!
  public comboStep: 0 | 1 | 2 | 3 = 0;
  public sequenceTokens: string[] = [];
  public activeTripleRoute: TripleComboRoute | null = null;
  public chainWindowFrames: number = 0;

  constructor(fighter: Fighter) {
    this.fighter = fighter;
  }

  public resetComboChain() {
    this.comboStep = 0;
    this.sequenceTokens = [];
    this.activeTripleRoute = null;
    this.chainWindowFrames = 0;
  }

  private normalizeToken(move: CombatMove): string {
    if (move.isSpecial) return 'SPECIAL';
    return move.id;
  }

  /**
   * Matches recent directional motion inputs against the character's authentic MK specials
   * (e.g., "◀ ◀ + LP" -> B, B + LP; "▼ ▶ + LK" -> D, F + LK; "▼ ▲ + HP" -> D, U + HP).
   */
  public matchDirectionalSpecial(
    charDef: CharacterDef,
    attackButton: 'LP' | 'HP' | 'LK' | 'HK'
  ): CombatMove | null {
    const recent = this.inputBuffer.getRecentDirections(28);
    if (recent.length === 0) return null;

    let bestMatch: { move: CombatMove; score: number } | null = null;

    for (const sp of charDef.specials) {
      const combo = sp.inputCombo || '';
      if (!combo.includes(`+ ${attackButton}`) && !combo.includes(attackButton)) continue;
      if (combo.includes('In Air')) continue;

      const motionPart = combo.split('+')[0] || '';
      const requiredDirs: RelativeDir[] = [];
      for (const ch of motionPart) {
        if (ch === '◀') requiredDirs.push('B');
        else if (ch === '▶') requiredDirs.push('F');
        else if (ch === '▼') requiredDirs.push('D');
        else if (ch === '▲') requiredDirs.push('U');
      }

      if (requiredDirs.length < 2) continue;

      // Subsequence match in order from oldest to newest
      let idx = 0;
      for (const d of recent) {
        if (d === requiredDirs[idx]) {
          idx++;
          if (idx === requiredDirs.length) break;
        }
      }

      if (idx === requiredDirs.length) {
        const score = requiredDirs.length * 10;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { move: sp, score };
        }
      }
    }

    if (bestMatch) {
      this.inputBuffer.clearDirections();
      return bestMatch.move;
    }
    return null;
  }

  /**
   * Registers an attack and returns decoupled individual vs triple-combo modifiers.
   */
  public registerAttack(move: CombatMove): {
    step: 0 | 1 | 2 | 3;
    damageMult: number;
    startupDelta: number;
    matchedRoute: TripleComboRoute | null;
    isIndividualHit: boolean;
  } {
    const token = this.normalizeToken(move);
    const isStarterEligible = token === 'LP' || token === 'LK' || token === 'CROUCH_LK';
    const isBridgeEligible = token === 'LP' || token === 'LK' || token === 'HP';
    const isFinisherEligible =
      token === 'HP' ||
      token === 'HK' ||
      token === 'UPPERCUT' ||
      token === 'SWEEP' ||
      token === 'SPECIAL';

    // Continue active chain strictly up to Strike 3
    if (this.chainWindowFrames > 0 && this.comboStep === 1 && isBridgeEligible) {
      this.comboStep = 2;
      this.sequenceTokens.push(token);
      this.chainWindowFrames = 40;
      this.activeTripleRoute = null;
      return {
        step: 2,
        damageMult: 1.12,
        startupDelta: -2,
        matchedRoute: null,
        isIndividualHit: false,
      };
    }

    if (this.chainWindowFrames > 0 && this.comboStep === 2 && isFinisherEligible) {
      this.comboStep = 3;
      this.sequenceTokens.push(token);
      this.chainWindowFrames = 0; // Hard stop at Strike 3!

      const route =
        TRIPLE_COMBO_ROUTES.find(
          (r) =>
            r.sequence[0] === this.sequenceTokens[0] &&
            r.sequence[1] === this.sequenceTokens[1] &&
            r.sequence[2] === this.sequenceTokens[2]
        ) || null;

      this.activeTripleRoute = route;
      return {
        step: 3,
        damageMult: route ? route.finisherMultiplier : 1.32,
        startupDelta: -2,
        matchedRoute: route,
        isIndividualHit: false,
      };
    }

    // Starting fresh in neutral:
    if (isStarterEligible) {
      this.comboStep = 1;
      this.sequenceTokens = [token];
      this.chainWindowFrames = 36;
      this.activeTripleRoute = null;
      return {
        step: 1,
        damageMult: 1.0,
        startupDelta: 0,
        matchedRoute: null,
        isIndividualHit: true,
      };
    }

    // Standalone Individual Hit (HP, HK, UPPERCUT, SWEEP, WEAPON, SPECIAL, SUPER)
    this.resetComboChain();
    return {
      step: 0,
      damageMult: 1.0,
      startupDelta: 0,
      matchedRoute: null,
      isIndividualHit: true,
    };
  }

  public update() {
    this.inputBuffer.update();
    if (this.chainWindowFrames > 0 && this.fighter.state !== 'ATTACK') {
      this.chainWindowFrames--;
      if (this.chainWindowFrames <= 0) {
        this.resetComboChain();
      }
    }
  }
}
