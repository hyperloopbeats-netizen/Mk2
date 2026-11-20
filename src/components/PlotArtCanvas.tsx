/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { PlotArtEvolutionStage } from '../types/fighter';

interface PlotArtCanvasProps {
  art: PlotArtEvolutionStage;
  width?: number;
  height?: number;
  className?: string;
  compact?: boolean;
}

export const PlotArtCanvas: React.FC<PlotArtCanvasProps> = ({
  art,
  width = 520,
  height = 290,
  className = '',
  compact = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const render = (now: number) => {
      const t = now * 0.001;
      const w = width;
      const h = height;

      // 1. Evolving 1960s Sky Gradient + Rift Tint
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, art.skyTint?.[0] || '#06101f');
      skyGrad.addColorStop(0.65, art.skyTint?.[1] || '#172e4a');
      skyGrad.addColorStop(1, '#06070c');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // 2. Motif Glyph Halo (behind landmark)
      ctx.save();
      ctx.translate(w * 0.5, h * 0.34);
      const pulse = 1 + Math.sin(t * 2.2) * 0.04;
      ctx.scale(pulse, pulse);
      const haloGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, Math.min(w, h) * 0.34);
      haloGrad.addColorStop(0, `${art.focalColor}55`);
      haloGrad.addColorStop(0.55, `${art.secondaryColor}22`);
      haloGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(0, 0, Math.min(w, h) * 0.34, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `${art.focalColor}66`;
      ctx.lineWidth = compact ? 1.2 : 2;
      if (art.motifGlyph === 'VOID_ORB') {
        ctx.beginPath();
        ctx.arc(0, 0, Math.min(w, h) * 0.16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = `${art.secondaryColor}88`;
        ctx.beginPath();
        ctx.ellipse(0, 0, Math.min(w, h) * 0.24, Math.min(w, h) * 0.07, t * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      } else if (art.motifGlyph === 'STEAM_CLOCK') {
        ctx.beginPath();
        ctx.arc(0, 0, Math.min(w, h) * 0.14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(t) * 18, Math.sin(t) * 18);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, Math.min(w, h) * 0.15, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // 3. North Shore Coastal Mountains (1960s Vancouver backdrop)
      ctx.fillStyle = 'rgba(8, 12, 22, 0.82)';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.72);
      ctx.lineTo(w * 0.14, h * 0.44);
      ctx.lineTo(w * 0.3, h * 0.56);
      ctx.lineTo(w * 0.48, h * 0.38);
      ctx.lineTo(w * 0.68, h * 0.54);
      ctx.lineTo(w * 0.85, h * 0.41);
      ctx.lineTo(w, h * 0.6);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // 4. Distinct 1960s Vancouver Landmark Silhouette + Neon Details
      ctx.save();
      const baseH = h * 0.76;
      if (art.landmark === 'LIONS_GATE_BRIDGE') {
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = compact ? 2 : 3.2;
        const t1 = w * 0.28;
        const t2 = w * 0.72;
        const topY = h * 0.24;
        ctx.beginPath();
        ctx.moveTo(t1, baseH);
        ctx.lineTo(t1, topY);
        ctx.moveTo(t2, baseH);
        ctx.lineTo(t2, topY);
        ctx.stroke();

        ctx.strokeStyle = art.focalColor;
        ctx.lineWidth = compact ? 1.2 : 2;
        ctx.beginPath();
        ctx.moveTo(0, baseH - 12);
        ctx.quadraticCurveTo(t1 * 0.55, topY + 25, t1, topY);
        ctx.quadraticCurveTo(w * 0.5, baseH - 22, t2, topY);
        ctx.quadraticCurveTo(t2 + (w - t2) * 0.45, topY + 25, w, baseH - 12);
        ctx.stroke();
      } else if (art.landmark === 'GASTOWN_STEAM_CLOCK') {
        // Edwardian brick skyline + clock spire + rising steam
        ctx.fillStyle = '#1f1215';
        ctx.fillRect(w * 0.08, h * 0.46, w * 0.22, baseH - h * 0.46);
        ctx.fillRect(w * 0.68, h * 0.42, w * 0.24, baseH - h * 0.42);
        ctx.fillStyle = '#3f2718';
        const cx = w * 0.5;
        ctx.fillRect(cx - 12, h * 0.36, 24, baseH - h * 0.36);
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(cx, h * 0.43, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(226, 232, 240, 0.22)';
        for (let i = 0; i < 4; i++) {
          const sy = h * 0.33 - ((t * 22 + i * 18) % 55);
          ctx.beginPath();
          ctx.arc(cx + Math.sin(t + i) * 7, sy, 6 + i * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (art.landmark === 'CHINATOWN_GATE') {
        // 1966 East Pender Paifang arch + vertical neon blades
        ctx.fillStyle = '#450a0a';
        ctx.fillRect(w * 0.34, h * 0.38, 10, baseH - h * 0.38);
        ctx.fillRect(w * 0.66 - 10, h * 0.38, 10, baseH - h * 0.38);
        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        ctx.moveTo(w * 0.26, h * 0.38);
        ctx.lineTo(w * 0.74, h * 0.38);
        ctx.lineTo(w * 0.69, h * 0.31);
        ctx.lineTo(w * 0.31, h * 0.31);
        ctx.closePath();
        ctx.fill();

        const neonAlpha = Math.max(0.35, art.neonIntensity);
        ctx.fillStyle = `rgba(236, 72, 153, ${neonAlpha})`;
        ctx.fillRect(w * 0.14, h * 0.26, 12, 46);
        ctx.fillStyle = `rgba(16, 185, 129, ${neonAlpha})`;
        ctx.fillRect(w * 0.83, h * 0.22, 12, 52);
      } else if (art.landmark === 'FALSE_CREEK_DOCKS') {
        ctx.fillStyle = '#0f292b';
        ctx.fillRect(w * 0.1, h * 0.52, w * 0.24, baseH - h * 0.52);
        ctx.fillRect(w * 0.66, h * 0.48, w * 0.26, baseH - h * 0.48);
        ctx.strokeStyle = art.secondaryColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w * 0.66, h * 0.48);
        ctx.lineTo(w * 0.48, h * 0.28);
        ctx.stroke();
      } else {
        // GEORGIA_VIADUCT
        ctx.fillStyle = '#1e1033';
        ctx.fillRect(0, h * 0.52, w, 18);
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(w * (0.14 + i * 0.22), h * 0.52, 14, baseH - h * 0.52);
        }
      }
      ctx.restore();

      // 5. Outworld Dimensional Rift Fracture (evolves directly with campaign progress / choices!)
      if (art.riftFracture > 0.08) {
        ctx.save();
        const crackAlpha = Math.min(0.95, 0.28 + art.riftFracture * 0.72);
        ctx.strokeStyle = `rgba(217, 70, 239, ${crackAlpha})`;
        ctx.lineWidth = compact ? 1.8 : 2.8;
        ctx.shadowColor = '#e879f9';
        ctx.shadowBlur = 14 * art.riftFracture;

        const segments = Math.max(4, Math.round(4 + art.riftFracture * 6));
        const startX = w * 0.5;
        const startY = h * 0.06;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        for (let s = 1; s <= segments; s++) {
          const jitter = Math.sin(s * 3.1 + t * 2) * (16 + art.riftFracture * 26);
          ctx.lineTo(startX + jitter, startY + (s / segments) * (h * 0.52));
        }
        ctx.stroke();
        ctx.restore();
      }

      // 6. Combatant Silhouettes (Pose evolves: STANDOFF -> STRIKE -> CLASH -> VICTORY_RIFT -> ASCENSION)
      ctx.save();
      const groundY = baseH + 10;
      const drawFighterSilhouette = (cx: number, cy: number, facing: 1 | -1, glow: string, poseOffset = 0) => {
        ctx.fillStyle = '#04050a';
        ctx.strokeStyle = glow;
        ctx.lineWidth = compact ? 1.4 : 2.2;
        // Torso
        ctx.beginPath();
        ctx.moveTo(cx - 10 * facing, cy - 42 + poseOffset);
        ctx.lineTo(cx + 12 * facing, cy - 42 + poseOffset);
        ctx.lineTo(cx + 8 * facing, cy - 16);
        ctx.lineTo(cx - 8 * facing, cy - 16);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Head
        ctx.beginPath();
        ctx.arc(cx + 2 * facing, cy - 52 + poseOffset, compact ? 6 : 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Strike arm & stance legs
        ctx.beginPath();
        ctx.moveTo(cx, cy - 36 + poseOffset);
        ctx.lineTo(cx + (22 + Math.abs(poseOffset)) * facing, cy - 34 + poseOffset * 0.5);
        ctx.moveTo(cx - 5, cy - 16);
        ctx.lineTo(cx - 14, cy);
        ctx.moveTo(cx + 5, cy - 16);
        ctx.lineTo(cx + 15, cy);
        ctx.stroke();
      };

      if (art.silhouettePose === 'VICTORY_RIFT' || art.silhouettePose === 'ASCENSION') {
        drawFighterSilhouette(w * 0.5, groundY, 1, art.focalColor, -4);
      } else if (art.silhouettePose === 'CLASH' || art.silhouettePose === 'STRIKE') {
        drawFighterSilhouette(w * 0.41, groundY, 1, art.focalColor, -2);
        drawFighterSilhouette(w * 0.59, groundY, -1, art.secondaryColor, 2);
        // Spark clash center
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(w * 0.5, groundY - 34, compact ? 4 : 6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        drawFighterSilhouette(w * 0.3, groundY, 1, art.focalColor, 0);
        drawFighterSilhouette(w * 0.7, groundY, -1, art.secondaryColor, 0);
      }
      ctx.restore();

      // 7. Rain / Fog Atmospheric Veil + Ground Plate
      ctx.fillStyle = '#07090f';
      ctx.fillRect(0, baseH + 8, w, h - (baseH + 8));

      if (art.weather === 'RAIN' || art.weather === 'STORM') {
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.25)';
        ctx.lineWidth = 1;
        const dropCount = compact ? 18 : 34;
        for (let i = 0; i < dropCount; i++) {
          const rx = ((i * 73 + t * 140) % (w + 30)) - 15;
          const ry = ((i * 47 + t * 280) % h);
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 4, ry + 12);
          ctx.stroke();
        }
      }

      if (art.fogDensity > 0.1) {
        const fogGrad = ctx.createLinearGradient(0, h * 0.58, 0, h);
        fogGrad.addColorStop(0, 'rgba(148, 163, 184, 0)');
        fogGrad.addColorStop(1, `rgba(148, 163, 184, ${Math.min(0.45, art.fogDensity * 0.42)})`);
        ctx.fillStyle = fogGrad;
        ctx.fillRect(0, h * 0.58, w, h * 0.42);
      }

      // 8. Corner Era Stamp
      if (!compact) {
        ctx.fillStyle = 'rgba(5, 6, 12, 0.72)';
        ctx.fillRect(10, 10, 165, 22);
        ctx.strokeStyle = `${art.focalColor}99`;
        ctx.strokeRect(10, 10, 165, 22);
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.fillText(`VANCOUVER · ${art.year} · RIFT ${Math.round(art.riftFracture * 100)}%`, 18, 25);
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [art, width, height, compact]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`block rounded-xl border border-zinc-800 bg-zinc-950 ${className}`}
    />
  );
};
