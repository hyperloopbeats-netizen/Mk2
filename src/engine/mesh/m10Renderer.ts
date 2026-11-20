/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { M01_Config, STAGE_PRESETS } from './m01Config';
import { M02_SpriteMeshAtlas } from './m02SpriteMeshAtlas';
import { M03_InputBus } from './m03InputBus';
import { M04_MeshPhysics } from './m04MeshPhysics';
import { M09_Scheduler } from './m09Scheduler';
import type { EngineState, FighterEntity, SlotId, StagePreset } from './types';

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export function createMeshFighter(
  slot: SlotId,
  fighterId: string,
  x: number,
  facing: 1 | -1
): FighterEntity {
  return {
    slot,
    fighterId,
    x,
    y: M01_Config.floorY,
    vx: 0,
    vy: 0,
    facing,
    moveDir: 0,
    blocking: false,
    grounded: true,
    hp: 100,
    combo: 0,
    wins: 0,
    roundAwarded: false,
    score: 0,
    squashY: 1,
    state: 'idle',
    prevState: 'idle',
    stateFrames: 0,
    animTimer: 0,
    invulnTimer: 0,
    hasConnectedThisAttack: false,
    spawnedProj: false,
    worldMesh: {},
    meshDyn: null,
    activeFrame: null,
    oppRef: null,
  };
}

export const M10_Renderer = {
  canvas: null as HTMLCanvasElement | null,
  ctx: null as CanvasRenderingContext2D | null,
  sparks: [] as SparkParticle[],
  patternCanvas: null as HTMLCanvasElement | null,
  cachedPatternKey: '',
  cachedPattern: null as CanvasPattern | null,

  attachCanvas(canvas: HTMLCanvasElement | null): void {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.cachedPattern = null;
    this.cachedPatternKey = '';
  },

  getStagePattern(stage: StagePreset, infusionLevel: number): CanvasPattern | null {
    if (!this.ctx) return null;
    const key = `${stage.id}_${stage.gridPitch}_${Math.floor(infusionLevel / 10)}`;
    if (this.cachedPattern && this.cachedPatternKey === key) return this.cachedPattern;

    if (!this.patternCanvas) {
      this.patternCanvas = document.createElement('canvas');
    }
    const pitch = stage.gridPitch || 24;
    this.patternCanvas.width = pitch * 2;
    this.patternCanvas.height = pitch * 2;
    const pctx = this.patternCanvas.getContext('2d');
    if (!pctx) return null;

    pctx.fillStyle = stage.floorFill;
    pctx.fillRect(0, 0, this.patternCanvas.width, this.patternCanvas.height);

    pctx.strokeStyle = stage.rimStroke;
    pctx.globalAlpha = 0.14 + (infusionLevel / 100) * 0.22;
    pctx.lineWidth = 1;
    pctx.strokeRect(0.5, 0.5, pitch - 1, pitch - 1);
    pctx.strokeRect(pitch + 0.5, pitch + 0.5, pitch - 1, pitch - 1);

    this.cachedPattern = this.ctx.createPattern(this.patternCanvas, 'repeat');
    this.cachedPatternKey = key;
    return this.cachedPattern;
  },

  spawnSpark(x: number, y: number, color: string): void {
    const count = M01_Config.cabinetDip.bloodGore ? 12 : 6;
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.35;
      const spd = 95 + Math.random() * 190;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 55,
        life: 0.28,
        color,
      });
    }
  },

  drawFighter(f: FighterEntity): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const frame = f.activeFrame;

    if (f.worldMesh && f.worldMesh.pelvis && f.worldMesh.torso && f.worldMesh.head) {
      ctx.save();
      ctx.strokeStyle = frame ? frame.tint : '#f59e0b';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(f.worldMesh.pelvis.wx, f.worldMesh.pelvis.wy);
      ctx.lineTo(f.worldMesh.torso.wx, f.worldMesh.torso.wy);
      ctx.lineTo(f.worldMesh.head.wx, f.worldMesh.head.wy);
      ctx.stroke();
      ctx.restore();
    }

    if (M01_Config.telemetry.showMesh && f.worldMesh) {
      const edges = [
        ['pelvis', 'torso'],
        ['torso', 'head'],
        ['torso', 'frontHand'],
        ['torso', 'backHand'],
        ['pelvis', 'frontFoot'],
        ['pelvis', 'backFoot'],
      ];
      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
      ctx.lineWidth = 2;
      for (const [a, b] of edges) {
        if (f.worldMesh[a] && f.worldMesh[b]) {
          ctx.beginPath();
          ctx.moveTo(f.worldMesh[a].wx, f.worldMesh[a].wy);
          ctx.lineTo(f.worldMesh[b].wx, f.worldMesh[b].wy);
          ctx.stroke();
        }
      }
      for (const node of Object.values(f.worldMesh)) {
        ctx.beginPath();
        ctx.arc(node.wx, node.wy, node.r, 0, Math.PI * 2);
        if (node.type === 'HIT') {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.36)';
          ctx.strokeStyle = '#ef4444';
        } else if (node.type === 'HURT') {
          ctx.fillStyle = 'rgba(34, 197, 94, 0.16)';
          ctx.strokeStyle = '#22c55e';
        } else {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
          ctx.strokeStyle = '#38bdf8';
        }
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  },

  drawHud(p1: FighterEntity, p2: FighterEntity): void {
    const ctx = this.ctx;
    if (!ctx) return;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(40, 26, 380, 20);
    ctx.fillRect(540, 26, 380, 20);

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(40, 26, (380 * p1.hp) / 100, 20);

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(540 + (380 * (100 - p2.hp)) / 100, 26, (380 * p2.hp) / 100, 20);

    ctx.fillStyle = M01_Config.infusion.activeFinisherWindow ? '#ef4444' : '#f8fafc';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(Math.ceil(M01_Config.telemetry.roundClock)), 480, 42);

    ctx.font = '11px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`ROUND ${M01_Config.telemetry.roundNumber}`, 480, 62);

    if (M01_Config.infusion.activeFinisherWindow) {
      ctx.font = 'bold 22px monospace';
      ctx.fillStyle = '#ef4444';
      ctx.fillText(
        `FINISH HIM! (${M01_Config.infusion.finisherTimer.toFixed(1)}s)`,
        480,
        105
      );
    }

    const p1Spec = M02_SpriteMeshAtlas.fighters.get(p1.fighterId);
    const p2Spec = M02_SpriteMeshAtlas.fighters.get(p2.fighterId);
    const p1ComboStr = p1.combo > 1 ? ` x${p1.combo}` : '';
    const p2ComboStr = p2.combo > 1 ? ` x${p2.combo}` : '';

    ctx.textAlign = 'left';
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px monospace';
    ctx.fillText(
      `${p1Spec ? p1Spec.name : 'P1'} [W:${p1.wins}] [${p1.state.toUpperCase()}] HP:${p1.hp} PTS:${p1.score}${p1ComboStr}`,
      42,
      64
    );
    ctx.textAlign = 'right';
    ctx.fillText(
      `${p2Spec ? p2Spec.name : 'P2'} [W:${p2.wins}] [${p2.state.toUpperCase()}] HP:${p2.hp} PTS:${p2.score}${p2ComboStr}`,
      918,
      64
    );
    ctx.textAlign = 'left';
  },

  drawDiagnostics(state: EngineState): void {
    if (!M01_Config.telemetry.showDiagnostics || !this.ctx) return;
    const ctx = this.ctx;
    const inf = M01_Config.infusion;
    const t = M01_Config.telemetry;

    const fmtFrame = (f: FighterEntity) => {
      const fr = f.activeFrame;
      if (!fr) return `${f.state} [0/1]`;
      return `${f.state}[${fr.idx + 1}/${fr.totalFrames}] hit:${fr.isActiveHit ? 'Y' : 'N'} dmg:${fr.damage} hs:${fr.hitstun} kb:${fr.knockbackX}`;
    };

    const recentLogs = t.healLog.slice(-4).map((e) => `t${e.tick}: ${e.reason}`);
    const lines = [
      `DIAG OVERLAY | FPS:${t.fps} TICK:${t.tickCount} PRESET:${inf.springPreset}`,
      `SPRING k:${inf.meshSpringStiffness} d:${inf.meshSpringDamping} | INF:${inf.stageInfusionLevel}% SHAKE:${inf.shakeIntensity.toFixed(1)}`,
      `P1 FRAME: ${fmtFrame(state.p1)}`,
      `P2 FRAME: ${fmtFrame(state.p2)}`,
      `WATCHDOG HEALS (${t.healsPerformed}): ${recentLogs.length ? recentLogs.join(' | ') : 'No faults healed yet'}`,
    ];

    const boxX = 42;
    const boxY = 82;
    const boxW = 540;
    const boxH = 14 + lines.length * 14;

    ctx.save();
    ctx.fillStyle = 'rgba(10, 15, 25, 0.78)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.font = '11px monospace';
    lines.forEach((line, i) => {
      ctx.fillStyle = i === 0 ? '#fcd34d' : i === 4 ? '#67e8f9' : '#cbd5e1';
      ctx.fillText(line, boxX + 10, boxY + 15 + i * 14);
    });
    ctx.restore();
  },

  render(state: EngineState): void {
    const ctx = this.ctx;
    if (!ctx) return;

    const stage = STAGE_PRESETS[M01_Config.infusion.stageIndex] || STAGE_PRESETS[0];
    const inf = M01_Config.infusion.stageInfusionLevel;
    const shake = M01_Config.infusion.shakeIntensity;
    const sx = shake > 0 ? (Math.random() - 0.5) * shake * 2 : 0;
    const sy = shake > 0 ? (Math.random() - 0.5) * shake * 2 : 0;

    ctx.clearRect(0, 0, M01_Config.width, M01_Config.height);
    ctx.fillStyle = '#0c1220';
    ctx.fillRect(0, 0, M01_Config.width, M01_Config.height);

    ctx.save();
    ctx.translate(sx, sy);

    const pat = this.getStagePattern(stage, inf);
    ctx.fillStyle = pat || stage.floorFill;
    ctx.fillRect(0, M01_Config.floorY, M01_Config.width, M01_Config.height - M01_Config.floorY);
    ctx.strokeStyle = stage.rimStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, M01_Config.floorY);
    ctx.lineTo(M01_Config.width, M01_Config.floorY);
    ctx.stroke();
    ctx.lineWidth = 1;

    if (inf > 0) {
      const pulse = (Math.sin(M01_Config.infusion.hazardPulsePhase) + 1) * 0.5;
      ctx.save();
      ctx.fillStyle = stage.rimStroke;
      ctx.globalAlpha = 0.14 + pulse * 0.2 * (inf / 100);
      for (let hx = M01_Config.arenaLeft + 40; hx <= M01_Config.arenaRight - 40; hx += 120) {
        ctx.fillRect(hx - 26, M01_Config.floorY + 8, 52, 10 + pulse * 10);
      }
      ctx.restore();
    }

    this.drawFighter(state.p1);
    this.drawFighter(state.p2);

    for (const p of M04_MeshPhysics.projectiles) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.spec ? p.spec.projectileColor : '#fb923c';
      ctx.fill();
      ctx.restore();
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx * M01_Config.fixedDt;
      s.y += s.vy * M01_Config.fixedDt;
      s.life -= M01_Config.fixedDt;
      if (s.life <= 0) {
        this.sparks.splice(i, 1);
        continue;
      }
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x - 3, s.y - 3, 6, 6);
    }

    this.drawHud(state.p1, state.p2);
    this.drawDiagnostics(state);
    ctx.restore();
  },

  boot(canvas: HTMLCanvasElement, onTick?: (state: EngineState) => void): EngineState {
    this.attachCanvas(canvas);
    this.sparks = [];
    M04_MeshPhysics.projectiles = [];
    M03_InputBus.init();

    const p1 = createMeshFighter('p1', 'SCORPION_MK_REMIX', 280, 1);
    const p2 = createMeshFighter('p2', 'SUBZERO_MK_REMIX', 680, -1);
    p1.oppRef = p2;
    p2.oppRef = p1;

    const state: EngineState = { p1, p2 };
    M09_Scheduler.start(state, onTick);
    return state;
  },
};
