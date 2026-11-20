/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Fighter } from './FighterEngine';
import { GGPOStats, GameMatchState } from '../types/fighter';
import { getFatalityDistanceInfo } from './FatalityEngine';

/**
 * Renders Omni-Engine Training Mode Hitboxes, 4-Zone Hurtboxes,
 * Distance Category Telemetry (CLOSE / SWEEP / FAR), and GGPO Rollback stats.
 */
export function drawTrainingWorldBoxes(
  ctx: CanvasRenderingContext2D,
  p1: Fighter,
  cpu: Fighter
) {
  // Subtle floor spacing indicator only — zero hitbox or hurtbox rectangles rendered
  const p1Cx = p1.x + p1.width * 0.5;
  const cpuCx = cpu.x + cpu.width * 0.5;
  const distInfo = getFatalityDistanceInfo(p1, cpu);

  ctx.save();
  const midX = (p1Cx + cpuCx) * 0.5;
  ctx.fillStyle = 'rgba(5, 6, 11, 0.78)';
  ctx.fillRect(midX - 48, 424, 96, 16);
  ctx.fillStyle =
    distInfo.category === 'CLOSE'
      ? '#f87171'
      : distInfo.category === 'SWEEP'
      ? '#e2e8f0'
      : '#38bdf8';
  ctx.font = 'bold 10px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${distInfo.category} (${distInfo.distancePx}px)`, midX, 435);
  ctx.restore();
}

export function drawTrainingScreenTelemetry(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  p1: Fighter,
  cpu: Fighter,
  ggpo: GGPOStats,
  matchState: GameMatchState,
  showHitboxes: boolean
) {
  const distInfo = getFatalityDistanceInfo(p1, cpu);

  if (matchState === 'FINISH_HIM') {
    ctx.save();
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    const rangePrompt = distInfo.isNearStageEdge
      ? `[STAGE EDGE] Press I / FATALITY for STAGE PIT DROP · ${distInfo.category} (${distInfo.distancePx}px)`
      : distInfo.category === 'CLOSE'
      ? `[CLOSE] Press U / SPACE / FATALITY for SPINE RIP`
      : distInfo.category === 'SWEEP'
      ? `[SWEEP] Press 4 / SPACE / FATALITY for TOASTY! HELLFIRE`
      : `[${distInfo.category}: ${distInfo.distancePx}px] Move to CLOSE (<115px) or SWEEP (115-240px)`;

    const boxW = Math.min(width - 24, 560);
    ctx.fillStyle = 'rgba(10, 10, 16, 0.86)';
    ctx.fillRect(width * 0.5 - boxW * 0.5, 86, boxW, 24);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
    ctx.strokeRect(width * 0.5 - boxW * 0.5, 86, boxW, 24);
    ctx.fillStyle = '#fde047';
    ctx.fillText(rangePrompt, width * 0.5, 102);
    ctx.restore();
  }

  if (!showHitboxes) return;

  ctx.save();
  const laneName = (z: number) => (z === -1 ? 'BACK' : z === 1 ? 'FORE' : 'MID');
  const barText = `FRAME:${ggpo.frame} · P1[${laneName(p1.zLane)}|${p1.jumpPhase}] CPU[${laneName(cpu.zLane)}|${cpu.jumpPhase}] · ${distInfo.category}(${distInfo.distancePx}px) · [B] BOXES [R] REWIND`;
  ctx.font = '600 10px JetBrains Mono, monospace';
  const padX = 10;
  const textW = Math.min(width - 20, ctx.measureText(barText).width + padX * 2);
  ctx.fillStyle = 'rgba(5, 8, 16, 0.82)';
  ctx.fillRect(10, height - 28, textW, 20);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  ctx.strokeRect(10, height - 28, textW, 20);
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(barText, 10 + padX, height - 14);
  ctx.restore();
}
