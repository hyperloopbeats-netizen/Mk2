/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export type BloodyBannerKind = 'FIGHT' | 'FINISH_HIM' | 'FATALITY';

interface BloodyBannerOverlayProps {
  kind: BloodyBannerKind | null;
  sublabel?: string;
}

const DRIP_POINTS = [
  { left: '8%', height: 42, delay: '0s', duration: '1.35s', width: 5 },
  { left: '19%', height: 64, delay: '0.18s', duration: '1.55s', width: 7 },
  { left: '31%', height: 34, delay: '0.32s', duration: '1.25s', width: 4 },
  { left: '44%', height: 72, delay: '0.08s', duration: '1.65s', width: 8 },
  { left: '57%', height: 48, delay: '0.24s', duration: '1.4s', width: 6 },
  { left: '69%', height: 68, delay: '0.12s', duration: '1.5s', width: 7 },
  { left: '81%', height: 38, delay: '0.28s', duration: '1.3s', width: 5 },
  { left: '91%', height: 56, delay: '0.05s', duration: '1.45s', width: 6 },
];

export const BloodyBannerOverlay: React.FC<BloodyBannerOverlayProps> = ({ kind, sublabel }) => {
  if (!kind) return null;

  const title =
    kind === 'FIGHT'
      ? 'FIGHT!'
      : kind === 'FINISH_HIM'
      ? 'FINISH HIM!'
      : 'FATALITY!';

  return (
    <div className="absolute inset-x-0 top-14 sm:top-16 z-30 flex flex-col items-center justify-center pointer-events-none select-none px-4">
      <div className="relative inline-flex flex-col items-center">
        {/* Jagged Crimson & Brushed Chrome Text */}
        <div
          className="relative font-kombat font-black uppercase tracking-[0.14em] text-4xl sm:text-6xl md:text-7xl leading-none text-center"
          style={{
            background:
              kind === 'FATALITY'
                ? 'linear-gradient(180deg, #fecaca 0%, #ef4444 38%, #991b1b 78%, #450a0a 100%)'
                : kind === 'FINISH_HIM'
                ? 'linear-gradient(180deg, #fee2e2 0%, #dc2626 42%, #7f1d1d 85%, #450a0a 100%)'
                : 'linear-gradient(180deg, #ffffff 0%, #f87171 38%, #dc2626 75%, #7f1d1d 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter:
              'drop-shadow(0 4px 0 #1c0505) drop-shadow(0 0 18px rgba(185, 28, 28, 0.9))',
          }}
        >
          {title}
        </div>

        {/* Viscous Arterial Blood Drips Hanging & Running Down from Letters */}
        <div className="relative w-full h-16 -mt-2 overflow-visible" aria-hidden="true">
          {DRIP_POINTS.map((drip, idx) => (
            <span
              key={`blood_drip_${idx}`}
              className="absolute top-0 rounded-b-full animate-pulse"
              style={{
                left: drip.left,
                width: `${drip.width}px`,
                height: `${drip.height}px`,
                background:
                  'linear-gradient(180deg, #991b1b 0%, #dc2626 60%, #ef4444 92%, #7f1d1d 100%)',
                boxShadow: '0 2px 6px rgba(153, 27, 27, 0.85)',
                animationDelay: drip.delay,
                animationDuration: drip.duration,
              }}
            >
              <span
                className="block rounded-full mx-auto"
                style={{
                  width: `${drip.width + 2}px`,
                  height: `${drip.width + 3}px`,
                  marginTop: `${Math.max(4, drip.height - 4)}px`,
                  marginLeft: '-1px',
                  background: 'radial-gradient(circle at 35% 30%, #fca5a5 0%, #dc2626 45%, #7f1d1d 100%)',
                }}
              />
            </span>
          ))}
        </div>

        {sublabel && (
          <div className="-mt-6 px-3 py-1 rounded bg-black/80 border border-red-800/70">
            <span className="font-mono text-[11px] sm:text-xs font-bold tracking-[0.2em] text-red-200 uppercase">
              {sublabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
