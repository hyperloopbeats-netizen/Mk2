/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { CharacterId } from '../types/fighter';
import { AnimationTrackKey, SpriteSheetEngine } from '../game/SpriteSheetEngine';
import { CHARACTERS } from '../game/constants';

interface SpritePortraitCanvasProps {
  charId: CharacterId;
  width?: number;
  height?: number;
  track?: AnimationTrackKey;
  facing?: 1 | -1;
  className?: string;
}

export const SpritePortraitCanvas: React.FC<SpritePortraitCanvasProps> = ({
  charId,
  width = 88,
  height = 104,
  track = 'idle',
  facing = 1,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const charDef = CHARACTERS[charId] || CHARACTERS.scorpion;

  useEffect(() => {
    SpriteSheetEngine.preloadAll();
    let rafId = 0;
    let lastDraw = 0;

    const renderLoop = (now: number) => {
      if (now - lastDraw >= 32) {
        lastDraw = now;
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const drawn = SpriteSheetEngine.drawFighterPortraitPreview(
              ctx,
              charId,
              canvas.width,
              canvas.height,
              now,
              track,
              facing
            );
            if (!drawn) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.fillStyle = charDef.themeColor;
              ctx.font = '900 22px Cinzel, serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(charDef.name.slice(0, 2), canvas.width * 0.5, canvas.height * 0.5);
            }
          }
        }
      }
      rafId = requestAnimationFrame(renderLoop);
    };

    rafId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(rafId);
  }, [charId, track, facing, charDef.name, charDef.themeColor]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
    />
  );
};
