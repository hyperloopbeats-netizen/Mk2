/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const M07_AudioFx = {
  ctx: null as AudioContext | null,

  tone(
    freqStart: number,
    freqEnd: number,
    type: OscillatorType,
    dur: number,
    vol: number
  ): void {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.ctx) this.ctx = new AudioCtx();
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, freqEnd),
        this.ctx.currentTime + dur
      );

      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + dur);
    } catch {
      // Audio context unavailable or blocked before user gesture
    }
  },

  playHit(heavy: boolean): void {
    this.tone(heavy ? 155 : 225, 42, heavy ? 'sawtooth' : 'triangle', 0.12, 0.11);
  },

  playBlock(): void {
    this.tone(520, 310, 'square', 0.07, 0.06);
  },

  playFinisher(): void {
    this.tone(110, 36, 'sawtooth', 0.35, 0.15);
  },
};
