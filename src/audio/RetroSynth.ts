/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SpatialDspProfile } from '../types/fighter';

export const DEFAULT_SPATIAL_DSP: SpatialDspProfile = {
  subBassGainDb: 5.5,
  midPresenceDb: 1.5,
  airSparkleDb: 2.0,
  tubeDrive: 0.32,
  compressorPunch: 0.72,
  spatialWidth: 1.15,
  footstepVolume: 0.38,
};

class RetroSynthManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private geminiAudioCache: Map<string, HTMLAudioElement> = new Map();
  private pendingFetch: Set<string> = new Set();
  private lastClientFetchTime: number = 0;
  private readonly CLIENT_FETCH_COOLDOWN_MS = 25000;
  private cachedVoice: SpeechSynthesisVoice | null = null;

  // Mastering & 3D Spatial Audio Graph
  private dspProfile: SpatialDspProfile = { ...DEFAULT_SPATIAL_DSP };
  private masterInput: GainNode | null = null;
  private eqLow: BiquadFilterNode | null = null;
  private eqMid: BiquadFilterNode | null = null;
  private eqHigh: BiquadFilterNode | null = null;
  private tubeShaper: WaveShaperNode | null = null;
  private masterCompressor: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private masterOutput: GainNode | null = null;
  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private isDronePlaying: boolean = false;

  private listenerX: number = 480;
  private listenerY: number = 355;

  private makeTubeCurve(drive: number): Float32Array<ArrayBuffer> {
    const samples = 1024;
    const buffer = new ArrayBuffer(samples * 4);
    const curve = new Float32Array(buffer);
    const k = Math.max(0.1, drive * 18);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
    }
    return curve;
  }

  private buildMasterGraph() {
    if (!this.ctx || this.masterInput) return;
    try {
      const input = this.ctx.createGain();
      input.gain.value = 0.92;

      const low = this.ctx.createBiquadFilter();
      low.type = 'lowshelf';
      low.frequency.value = 100;
      low.gain.value = this.dspProfile.subBassGainDb;

      const mid = this.ctx.createBiquadFilter();
      mid.type = 'peaking';
      mid.frequency.value = 1000;
      mid.Q.value = 1.2;
      mid.gain.value = this.dspProfile.midPresenceDb;

      const high = this.ctx.createBiquadFilter();
      high.type = 'highshelf';
      high.frequency.value = 8000;
      high.gain.value = this.dspProfile.airSparkleDb;

      const shaper = this.ctx.createWaveShaper();
      shaper.curve = this.makeTubeCurve(this.dspProfile.tubeDrive);
      shaper.oversample = '2x';

      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -16 + (1 - this.dspProfile.compressorPunch) * 8;
      comp.knee.value = 16;
      comp.ratio.value = 3.5 + this.dspProfile.compressorPunch * 5.0;
      comp.attack.value = 0.0025;
      comp.release.value = 0.16;

      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      const out = this.ctx.createGain();
      out.gain.value = this.isMuted ? 0 : 0.95;

      input.connect(low);
      low.connect(mid);
      mid.connect(high);
      high.connect(shaper);
      shaper.connect(comp);
      comp.connect(analyser);
      analyser.connect(out);
      out.connect(this.ctx.destination);

      this.masterInput = input;
      this.eqLow = low;
      this.eqMid = mid;
      this.eqHigh = high;
      this.tubeShaper = shaper;
      this.masterCompressor = comp;
      this.analyser = analyser;
      this.masterOutput = out;
    } catch {
      // Fallback safely if audio graph fails
    }
  }

  private initCtx() {
    if (!this.ctx) {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          this.buildMasterGraph();
        }
      } catch {
        // AudioContext blocked or unsupported
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        this.ctx.resume().catch(() => {});
      } catch {
        // Ignored
      }
    }
    this.initSpeechVoices();
  }

  private getDest(worldX?: number, worldY?: number): AudioNode {
    if (!this.ctx) throw new Error('AudioContext unavailable');
    if (!this.masterInput) this.buildMasterGraph();
    const target = this.masterInput || this.ctx.destination;

    if (typeof worldX === 'number') {
      try {
        const relX = ((worldX - this.listenerX) / 260) * this.dspProfile.spatialWidth;
        const clampedPan = Math.max(-0.96, Math.min(0.96, relX));
        if (typeof this.ctx.createPanner === 'function') {
          const panner = this.ctx.createPanner();
          panner.panningModel = 'HRTF';
          panner.distanceModel = 'inverse';
          panner.refDistance = 1.6;
          panner.maxDistance = 16;
          panner.rolloffFactor = 0.85;
          const relY = typeof worldY === 'number' ? (this.listenerY - worldY) / 240 : 0;
          const clampedY = Math.max(-1.2, Math.min(1.2, relY));
          if (panner.positionX) {
            panner.positionX.value = clampedPan * 2.2;
            panner.positionY.value = clampedY;
            panner.positionZ.value = -1.35;
          } else {
            panner.setPosition(clampedPan * 2.2, clampedY, -1.35);
          }
          panner.connect(target);
          return panner;
        }
        if (typeof this.ctx.createStereoPanner === 'function') {
          const stereo = this.ctx.createStereoPanner();
          stereo.pan.value = clampedPan;
          stereo.connect(target);
          return stereo;
        }
      } catch {
        // Fall through cleanly
      }
    }

    return target;
  }

  public setListenerPosition(cameraX: number, cameraY: number = 355) {
    this.listenerX = cameraX;
    this.listenerY = cameraY;
    if (!this.ctx || !this.ctx.listener) return;
    try {
      const l = this.ctx.listener;
      if (l.positionX) {
        l.positionX.value = 0;
        l.positionY.value = 0;
        l.positionZ.value = 0;
      }
    } catch {
      // Safe
    }
  }

  public setDspProfile(patch: Partial<SpatialDspProfile>) {
    this.dspProfile = { ...this.dspProfile, ...patch };
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    try {
      if (this.eqLow) this.eqLow.gain.setTargetAtTime(this.dspProfile.subBassGainDb, t, 0.04);
      if (this.eqMid) this.eqMid.gain.setTargetAtTime(this.dspProfile.midPresenceDb, t, 0.04);
      if (this.eqHigh) this.eqHigh.gain.setTargetAtTime(this.dspProfile.airSparkleDb, t, 0.04);
      if (this.tubeShaper) this.tubeShaper.curve = this.makeTubeCurve(this.dspProfile.tubeDrive);
      if (this.masterCompressor) {
        this.masterCompressor.threshold.setTargetAtTime(
          -16 + (1 - this.dspProfile.compressorPunch) * 8,
          t,
          0.05
        );
        this.masterCompressor.ratio.setTargetAtTime(
          3.5 + this.dspProfile.compressorPunch * 5.0,
          t,
          0.05
        );
      }
    } catch {
      // Safe
    }
  }

  public getDspProfile(): SpatialDspProfile {
    return { ...this.dspProfile };
  }

  public getSpectrumData(): Uint8Array | null {
    if (!this.analyser) return null;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  public getFrequencyBands(): { bass: number; mids: number; treble: number } {
    const data = this.getSpectrumData();
    if (!data || data.length < 48) return { bass: 0, mids: 0, treble: 0 };
    let bassSum = 0;
    for (let i = 0; i < 4; i++) bassSum += data[i];
    let midsSum = 0;
    for (let i = 4; i < 20; i++) midsSum += data[i];
    let trebleSum = 0;
    for (let i = 20; i < 45; i++) trebleSum += data[i];
    return {
      bass: bassSum / (4 * 255),
      mids: midsSum / (16 * 255),
      treble: trebleSum / (25 * 255),
    };
  }

  public toggleSovereignDrone(): boolean {
    this.initCtx();
    if (!this.ctx) return false;
    if (this.isDronePlaying) {
      try {
        this.droneOsc?.stop();
        this.droneOsc?.disconnect();
        this.droneGain?.disconnect();
      } catch {
        // Safe
      }
      this.droneOsc = null;
      this.droneGain = null;
      this.isDronePlaying = false;
      return false;
    }

    try {
      const dest = this.getDest();
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 110;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.16;
      osc.connect(gain);
      gain.connect(dest);
      osc.start();
      this.droneOsc = osc;
      this.droneGain = gain;
      this.isDronePlaying = true;
      return true;
    } catch {
      return false;
    }
  }

  public getIsDronePlaying(): boolean {
    return this.isDronePlaying;
  }

  private initSpeechVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        try {
          const voices = window.speechSynthesis.getVoices();
          if (voices && voices.length > 0) {
            const preferred =
              voices.find(
                (v) =>
                  v.lang.startsWith('en') &&
                  (v.name.toLowerCase().includes('male') ||
                    v.name.toLowerCase().includes('daniel') ||
                    v.name.toLowerCase().includes('david') ||
                    v.name.toLowerCase().includes('alex') ||
                    v.name.toLowerCase().includes('fred'))
              ) ||
              voices.find((v) => v.lang.startsWith('en')) ||
              voices[0];
            this.cachedVoice = preferred || null;
          }
        } catch {
          // Ignored
        }
      };
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }

  public enableAudio() {
    this.initCtx();
    this.preloadAnnouncerVoices();
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterOutput && this.ctx) {
      this.masterOutput.gain.setTargetAtTime(muted ? 0 : 0.95, this.ctx.currentTime, 0.02);
    }
    this.geminiAudioCache.forEach((audio) => {
      audio.muted = muted;
    });
    if (muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public preloadAnnouncerVoices() {
    ['FIGHT', 'FINISH_HIM', 'FATALITY', 'FLAWLESS_VICTORY', 'ROUND_1', 'ROUND_2', 'FINAL_ROUND'].forEach((phrase) => {
      this.fetchGeminiAudioSafe(phrase);
    });
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Subtle Spatialized Footstep Foley synced to ground stride (soft dynamic range vs heavy hits)
  public playFootstep(mass = 1.0, worldX?: number, worldY = 445) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const dest = this.getDest(worldX, worldY);
      const vol = Math.max(0.03, Math.min(0.28, 0.14 * mass * this.dspProfile.footstepVolume));

      // Sub-stone sole thump
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const pitch = Math.max(38, 72 / Math.max(0.75, mass));
      osc.frequency.setValueAtTime(pitch + Math.random() * 8, t);
      osc.frequency.exponentialRampToValueAtTime(24, t + 0.055);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.06);

      // Grit / leather scuff transient
      this.playNoiseCrack(t, 0.035, vol * 0.48, 420, dest);
    } catch {
      // Safe
    }
  }

  // Aerial Launch Sound (Jump takeoff)
  public playJumpLaunch(mass = 1.0, worldX?: number, worldY = 410) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const dest = this.getDest(worldX, worldY);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(75 / Math.max(0.8, mass), t);
      osc.frequency.exponentialRampToValueAtTime(195, t + 0.11);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.12);

      this.playNoiseCrack(t, 0.11, 0.22, 480, dest);
    } catch {
      // Safe
    }
  }

  // Ground Landing Thud scaled to vertical impact velocity & fighter mass
  public playLanding(impactVel = 300, mass = 1.0, worldX?: number, worldY = 445) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const dest = this.getDest(worldX, worldY);
      const intensity = Math.max(0.25, Math.min(1.0, Math.abs(impactVel) / 550));
      const vol = 0.22 * intensity * Math.min(1.4, mass);

      const sub = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(74 / Math.max(0.8, mass * 0.85), t);
      sub.frequency.exponentialRampToValueAtTime(22, t + 0.14);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      sub.connect(gain);
      gain.connect(dest);
      sub.start(t);
      sub.stop(t + 0.14);

      this.playNoiseCrack(t, 0.08, vol * 0.6, 360, dest);
    } catch {
      // Safe
    }
  }

  // Movie-Style Scene / Curtain Transition Cue
  public playMovieTransition(
    kind: 'VS' | 'CURTAIN' | 'TOWER' | 'shutter_in' | 'shutter_out' = 'VS'
  ) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    try {
      const dest = this.getDest();
      // Deep cinema slam
      const sub = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      sub.type = 'sine';
      const startPitch = kind === 'TOWER' ? 92 : kind === 'shutter_out' ? 54 : 68;
      sub.frequency.setValueAtTime(startPitch, t);
      sub.frequency.exponentialRampToValueAtTime(20, t + 0.55);
      gain.gain.setValueAtTime(kind === 'shutter_out' ? 0.5 : 0.65, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      sub.connect(gain);
      gain.connect(dest);
      sub.start(t);
      sub.stop(t + 0.55);

      this.playNoiseCrack(t, 0.24, 0.35, kind === 'shutter_out' ? 680 : 920, dest);
      if (kind === 'VS' || kind === 'TOWER') {
        this.playGong(kind === 'TOWER' ? 0.78 : 0.92);
      }
    } catch {
      // Safe
    }
  }

  // Multi-Beat Super / Fatal Blow Activation Sound
  public playSuperActivate(worldX?: number, worldY = 360) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    try {
      const dest = this.getDest(worldX, worldY);
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(110, t);
      sub.frequency.exponentialRampToValueAtTime(20, t + 0.6);
      subGain.gain.setValueAtTime(0.85, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      sub.connect(subGain);
      subGain.connect(dest);
      sub.start(t);
      sub.stop(t + 0.6);

      const riser = this.ctx.createOscillator();
      const rGain = this.ctx.createGain();
      riser.type = 'sawtooth';
      riser.frequency.setValueAtTime(140, t);
      riser.frequency.exponentialRampToValueAtTime(920, t + 0.32);
      rGain.gain.setValueAtTime(0.28, t);
      rGain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
      riser.connect(rGain);
      rGain.connect(dest);
      riser.start(t);
      riser.stop(t + 0.36);

      this.playGong(0.75);
    } catch {
      // Safe
    }
  }

  // Arcade UI Hover Tick SFX
  public playHover() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const dest = this.getDest();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(190, t);
      osc.frequency.exponentialRampToValueAtTime(82, t + 0.045);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.045);
    } catch {
      // Safe
    }
  }

  // Arcade UI Confirmation Select SFX
  public playSelect() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const dest = this.getDest();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(115, t);
      osc.frequency.linearRampToValueAtTime(175, t + 0.08);
      osc.frequency.exponentialRampToValueAtTime(58, t + 0.22);
      gain.gain.setValueAtTime(0.26, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.22);
      this.playGong(0.95);
    } catch {
      // Safe
    }
  }

  // Tag-Team Swap Audio SFX
  public playTag(worldX?: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const dest = this.getDest(worldX);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(85, t);
      osc.frequency.linearRampToValueAtTime(210, t + 0.12);
      osc.frequency.exponentialRampToValueAtTime(52, t + 0.28);
      gain.gain.setValueAtTime(0.38, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.28);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.28);
      this.playNoiseCrack(t, 0.2, 0.28, 720, dest);
    } catch {
      // Safe
    }
  }

  // AIMIX Sonic Wave SFX
  public playSonicWave(worldX?: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const dest = this.getDest(worldX);
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc1.type = 'sawtooth';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(110, t);
      osc1.frequency.linearRampToValueAtTime(280, t + 0.15);
      osc1.frequency.exponentialRampToValueAtTime(42, t + 0.45);
      osc2.frequency.setValueAtTime(48, t);
      osc2.frequency.linearRampToValueAtTime(105, t + 0.2);
      osc2.frequency.exponentialRampToValueAtTime(24, t + 0.5);
      gain.gain.setValueAtTime(0.48, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(dest);
      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.5);
      osc2.stop(t + 0.5);
    } catch {
      // Safe
    }
  }

  // High-Energy Plasma Laser SFX
  public playLaser(worldX?: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const dest = this.getDest(worldX);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(360, t);
      osc.frequency.exponentialRampToValueAtTime(58, t + 0.16);
      gain.gain.setValueAtTime(0.34, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.16);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.16);
    } catch {
      // Safe
    }
  }

  private async fetchGeminiAudioSafe(phrase: string): Promise<void> {
    const now = Date.now();
    if (now - this.lastClientFetchTime < this.CLIENT_FETCH_COOLDOWN_MS) return;
    if (this.geminiAudioCache.has(phrase) || this.pendingFetch.has(phrase)) return;

    this.lastClientFetchTime = now;
    this.pendingFetch.add(phrase);

    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phrase }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.audioData && !data.fallback) {
          const audio = new Audio(data.audioData);
          audio.preload = 'auto';
          this.geminiAudioCache.set(phrase, audio);
        }
      }
    } catch {
      // Graceful fallback
    } finally {
      this.pendingFetch.delete(phrase);
    }
  }

  public playGeminiVoice(phrase: string) {
    if (this.isMuted) return;
    const cachedAudio = this.geminiAudioCache.get(phrase);
    if (cachedAudio) {
      cachedAudio.currentTime = 0;
      cachedAudio.volume = 1.0;
      cachedAudio.play().catch(() => {
        this.announceProcedural(phrase);
      });
      return;
    }
    this.announceProcedural(phrase);
    this.fetchGeminiAudioSafe(phrase);
  }

  // Deep Shaolin / Shang Tsung Brass Gong
  public playGong(pitch = 1.0) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dest = this.getDest();

    const fundamental = 110 * pitch;
    const harmonics = [1, 1.48, 2.14, 2.78, 3.45];
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0.36, t);
    masterGain.gain.exponentialRampToValueAtTime(0.001, t + 3.5);
    masterGain.connect(dest);

    harmonics.forEach((h, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(fundamental * h, t);
      osc.frequency.exponentialRampToValueAtTime(fundamental * h * 0.98, t + 3.0);
      gain.gain.setValueAtTime(0.3 / (idx + 1), t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + (3.5 - idx * 0.4));
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 3.5);
    });
  }

  // Weapon Slash / Blade Slice Sound
  public playSword(worldX?: number, worldY?: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dest = this.getDest(worldX, worldY);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(62, t + 0.18);
    gain.gain.setValueAtTime(0.44, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.18);

    const body = this.ctx.createOscillator();
    const bodyGain = this.ctx.createGain();
    body.type = 'triangle';
    body.frequency.setValueAtTime(110, t);
    body.frequency.exponentialRampToValueAtTime(38, t + 0.16);
    bodyGain.gain.setValueAtTime(0.36, t);
    bodyGain.gain.exponentialRampToValueAtTime(0.005, t + 0.16);
    body.connect(bodyGain);
    bodyGain.connect(dest);
    body.start(t);
    body.stop(t + 0.16);

    this.playNoiseCrack(t, 0.13, 0.36, 950, dest);
  }

  // Heavy Anvil / Steel-on-Steel Clash Clang SFX
  public playWeaponClash(worldX?: number, worldY?: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dest = this.getDest(worldX, worldY);

    const freqs = [260, 390, 560];
    freqs.forEach((f, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.85, t + 0.28);
      gain.gain.setValueAtTime(0.28 / (idx + 1), t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.28);
    });

    const thud = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(75, t);
    thud.frequency.exponentialRampToValueAtTime(28, t + 0.22);
    thudGain.gain.setValueAtTime(0.45, t);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    thud.connect(thudGain);
    thudGain.connect(dest);
    thud.start(t);
    thud.stop(t + 0.22);

    this.playNoiseCrack(t, 0.12, 0.42, 950, dest);
  }

  // Low-frequency impact synthesizer with 3D spatial panning & extreme sub-bass dynamic range
  public playHit(
    type: 'light' | 'medium' | 'heavy' | 'bone_crack' | 'uppercut' = 'medium',
    worldX?: number,
    worldY?: number
  ) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dest = this.getDest(worldX, worldY);

    if (type === 'bone_crack') {
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(85, t);
      subOsc.frequency.exponentialRampToValueAtTime(24, t + 0.24);
      subGain.gain.setValueAtTime(0.8, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      subOsc.connect(subGain);
      subGain.connect(dest);
      subOsc.start(t);
      subOsc.stop(t + 0.24);

      this.playNoiseCrack(t, 0.16, 0.58, 760, dest);
      return;
    }

    if (type === 'uppercut') {
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(48, t);
      subOsc.frequency.exponentialRampToValueAtTime(118, t + 0.055);
      subOsc.frequency.exponentialRampToValueAtTime(20, t + 0.38);
      subGain.gain.setValueAtTime(0.92, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
      subOsc.connect(subGain);
      subGain.connect(dest);
      subOsc.start(t);
      subOsc.stop(t + 0.38);

      const punchOsc = this.ctx.createOscillator();
      const punchGain = this.ctx.createGain();
      punchOsc.type = 'sawtooth';
      punchOsc.frequency.setValueAtTime(125, t);
      punchOsc.frequency.exponentialRampToValueAtTime(30, t + 0.2);
      punchGain.gain.setValueAtTime(0.42, t);
      punchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      punchOsc.connect(punchGain);
      punchGain.connect(dest);
      punchOsc.start(t);
      punchOsc.stop(t + 0.2);

      this.playNoiseCrack(t, 0.18, 0.62, 540, dest);
      return;
    }

    const startFreq = type === 'heavy' ? 58 : type === 'medium' ? 70 : 84;
    const endFreq = type === 'heavy' ? 18 : type === 'medium' ? 22 : 28;
    const duration = type === 'heavy' ? 0.26 : type === 'medium' ? 0.18 : 0.12;
    const vol = type === 'heavy' ? 0.88 : type === 'medium' ? 0.68 : 0.48;
    const noiseCutoff = type === 'heavy' ? 280 : type === 'medium' ? 340 : 420;

    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(startFreq, t);
    subOsc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
    subGain.gain.setValueAtTime(vol, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    subOsc.connect(subGain);
    subGain.connect(dest);
    subOsc.start(t);
    subOsc.stop(t + duration);

    const bodyOsc = this.ctx.createOscillator();
    const bodyGain = this.ctx.createGain();
    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(startFreq * 1.15, t);
    bodyOsc.frequency.exponentialRampToValueAtTime(endFreq * 1.05, t + duration * 0.72);
    bodyGain.gain.setValueAtTime(vol * 0.52, t);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, t + duration * 0.72);
    bodyOsc.connect(bodyGain);
    bodyGain.connect(dest);
    bodyOsc.start(t);
    bodyOsc.stop(t + duration * 0.72);

    this.playNoiseCrack(t, duration * 0.8, vol * 0.62, noiseCutoff, dest);
  }

  public playPunch(power: 'light' | 'heavy' = 'light', worldX?: number, worldY?: number) {
    if (this.isMuted) return;
    this.playHit(power === 'heavy' ? 'heavy' : 'medium', worldX, worldY);
  }

  public playKick(power: 'light' | 'heavy' = 'heavy', worldX?: number, worldY?: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dest = this.getDest(worldX, worldY);

    this.playWhoosh('kick', worldX, worldY);
    this.playHit(power === 'heavy' ? 'heavy' : 'medium', worldX, worldY);

    try {
      const sub = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(54, t + 0.02);
      sub.frequency.exponentialRampToValueAtTime(18, t + 0.28);
      gain.gain.setValueAtTime(0.76, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      sub.connect(gain);
      gain.connect(dest);
      sub.start(t + 0.02);
      sub.stop(t + 0.28);
    } catch {
      // Safe
    }
  }

  public playComboHit(hits: number, worldX?: number, worldY?: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dest = this.getDest(worldX, worldY);

    const startPitch = Math.max(38, 76 - hits * 4);
    const endPitch = Math.max(16, 30 - hits * 2);
    const duration = Math.min(0.36, 0.16 + hits * 0.02);
    const volume = Math.min(0.95, 0.64 + hits * 0.05);

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(startPitch, t);
      osc.frequency.exponentialRampToValueAtTime(endPitch, t + duration);
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + duration);

      this.playNoiseCrack(t, duration * 0.72, volume * 0.65, 320, dest);
      if (hits === 3 || hits === 5 || hits === 8 || hits >= 10) {
        this.playGong(Math.max(0.35, 0.8 - hits * 0.05));
      }
    } catch {
      // Safe
    }
  }

  public playWhoosh(type: 'punch' | 'kick' | 'dash' = 'punch', worldX?: number, worldY?: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dest = this.getDest(worldX, worldY);
    const duration = type === 'kick' ? 0.16 : type === 'dash' ? 0.2 : 0.11;
    const cutoff = type === 'kick' ? 280 : type === 'dash' ? 340 : 240;
    this.playNoiseCrack(t, duration, 0.34, cutoff, dest);
  }

  public playBlock(worldX?: number, worldY?: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dest = this.getDest(worldX, worldY);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(98, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.055);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.055);
    this.playNoiseCrack(t, 0.025, 0.09, 240, dest);
  }

  public playGuardCrush(worldX?: number, worldY?: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dest = this.getDest(worldX, worldY);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(165, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.28);
    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.28);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.28);
  }

  public playSpear(worldX?: number, worldY?: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dest = this.getDest(worldX, worldY);

    for (let i = 0; i < 4; i++) {
      const linkTime = t + i * 0.04;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(340 - i * 35, linkTime);
      osc.frequency.exponentialRampToValueAtTime(78, linkTime + 0.035);
      gain.gain.setValueAtTime(0.24, linkTime);
      gain.gain.exponentialRampToValueAtTime(0.01, linkTime + 0.035);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(linkTime);
      osc.stop(linkTime + 0.035);
    }
  }

  public playFreeze(worldX?: number, worldY?: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dest = this.getDest(worldX, worldY);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(460, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.34);
    gain.gain.setValueAtTime(0.38, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.36);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.36);

    this.playNoiseCrack(t, 0.35, 0.28, 850, dest);
  }

  public playFlame(worldX?: number, worldY?: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dest = this.getDest(worldX, worldY);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.linearRampToValueAtTime(180, t + 0.15);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.45);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.45);

    this.playNoiseCrack(t, 0.45, 0.3, 800, dest);
  }

  public playTeleport(worldX?: number, worldY?: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dest = this.getDest(worldX, worldY);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.25);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.25);

    this.playNoiseCrack(t, 0.25, 0.2, 1200, dest);
  }

  public playRaidenTorpedo(worldX?: number, worldY?: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dest = this.getDest(worldX, worldY);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.linearRampToValueAtTime(380, t + 0.3);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.6);
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.6);

    this.playLightning(0.5, worldX, worldY);
  }

  public playLightning(duration = 0.3, worldX?: number, worldY?: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dest = this.getDest(worldX, worldY);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(60, t);
    osc.frequency.linearRampToValueAtTime(240, t + duration * 0.5);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + duration);

    this.playNoiseCrack(t, duration, 0.35, 2400, dest);
  }

  public playSaiPing(worldX?: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dest = this.getDest(worldX);
    try {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(420, t);
      osc1.frequency.exponentialRampToValueAtTime(140, t + 0.14);
      osc2.frequency.setValueAtTime(640, t);
      osc2.frequency.exponentialRampToValueAtTime(210, t + 0.1);
      gain.gain.setValueAtTime(0.38, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(dest);
      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.15);
      osc2.stop(t + 0.15);
      this.playNoiseCrack(t, 0.07, 0.26, 980, dest);
    } catch {
      // Safe
    }
  }

  public playMileenaBite(worldX?: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dest = this.getDest(worldX);
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(210, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.2);
      gain.gain.setValueAtTime(0.58, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.22);
      this.playNoiseCrack(t, 0.25, 0.6, 850, dest);
    } catch {
      // Safe
    }
  }

  public playGoroStomp(worldX?: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dest = this.getDest(worldX);
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(65, t);
      osc.frequency.exponentialRampToValueAtTime(18, t + 0.48);
      gain.gain.setValueAtTime(0.95, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.5);
      this.playNoiseCrack(t, 0.35, 0.7, 520, dest);
    } catch {
      // Safe
    }
  }

  public playGoroRoar(worldX?: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dest = this.getDest(worldX);
    try {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(88, t);
      osc.frequency.linearRampToValueAtTime(125, t + 0.25);
      osc.frequency.exponentialRampToValueAtTime(42, t + 0.8);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(320, t);
      filter.Q.setValueAtTime(3.0, t);
      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.7, t + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.8);
    } catch {
      // Safe
    }
  }

  public playAimixBassCannon(worldX?: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dest = this.getDest(worldX);
    try {
      const sub = this.ctx.createOscillator();
      const lead = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(52, t);
      sub.frequency.exponentialRampToValueAtTime(18, t + 0.6);
      lead.type = 'sawtooth';
      lead.frequency.setValueAtTime(190, t);
      lead.frequency.linearRampToValueAtTime(320, t + 0.15);
      lead.frequency.exponentialRampToValueAtTime(55, t + 0.6);
      gain.gain.setValueAtTime(0.85, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
      sub.connect(gain);
      lead.connect(gain);
      gain.connect(dest);
      sub.start(t);
      lead.start(t);
      sub.stop(t + 0.65);
      lead.stop(t + 0.65);
    } catch {
      // Safe
    }
  }

  public playRobocopAuto9(worldX?: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dest = this.getDest(worldX);
    try {
      for (let i = 0; i < 3; i++) {
        const shotT = t + i * 0.065;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(135, shotT);
        osc.frequency.exponentialRampToValueAtTime(42, shotT + 0.06);
        gain.gain.setValueAtTime(0.55, shotT);
        gain.gain.exponentialRampToValueAtTime(0.01, shotT + 0.06);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(shotT);
        osc.stop(shotT + 0.06);
        this.playNoiseCrack(shotT, 0.05, 0.45, 820, dest);
      }
    } catch {
      // Safe
    }
  }

  public playReptileAcid(worldX?: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dest = this.getDest(worldX);
    try {
      this.playNoiseCrack(t, 0.35, 0.58, 880, dest);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(75, t + 0.25);
      gain.gain.setValueAtTime(0.38, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.25);
    } catch {
      // Safe
    }
  }

  public playKungLaoHat(worldX?: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dest = this.getDest(worldX);
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(310, t);
      osc.frequency.linearRampToValueAtTime(490, t + 0.15);
      osc.frequency.linearRampToValueAtTime(220, t + 0.35);
      gain.gain.setValueAtTime(0.38, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.38);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.38);
    } catch {
      // Safe
    }
  }

  public playKitanaFanLift(worldX?: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dest = this.getDest(worldX);
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(125, t);
      osc.frequency.exponentialRampToValueAtTime(310, t + 0.35);
      gain.gain.setValueAtTime(0.32, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.4);
      this.playNoiseCrack(t, 0.4, 0.32, 780, dest);
    } catch {
      // Safe
    }
  }

  private lastAnnouncedPhrase = '';
  private lastAnnounceTime = 0;

  public announce(phrase: string) {
    if (this.isMuted) return;
    const now = Date.now();
    if (phrase === this.lastAnnouncedPhrase && now - this.lastAnnounceTime < 1200) {
      return;
    }
    this.lastAnnouncedPhrase = phrase;
    this.lastAnnounceTime = now;

    this.speakAnnouncerLine(phrase);
    this.announceProcedural(phrase);
  }

  private speakAnnouncerLine(phrase: string) {
    if (this.isMuted) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      let text = phrase;
      if (phrase === 'FIGHT') text = 'Fight!';
      else if (phrase === 'ROUND_1') text = 'Round One... Fight!';
      else if (phrase === 'ROUND_2') text = 'Round Two... Fight!';
      else if (phrase === 'ROUND_3' || phrase === 'FINAL_ROUND') text = 'Final Round... Fight!';
      else if (phrase === 'FINISH_HIM') text = 'Finish Him!';
      else if (phrase === 'FINISH_HER') text = 'Finish Her!';
      else if (phrase === 'FATALITY') text = 'Fatality!';
      else if (phrase === 'FLAWLESS_VICTORY') text = 'Flawless Victory!';
      else if (phrase === 'GET_OVER_HERE') text = 'Get Over Here!';
      else if (phrase === 'CHOOSE_YOUR_DESTINY') text = 'Choose Your Destiny!';
      else if (phrase === 'TAG_IN') text = 'Tag In!';
      else if (phrase === 'TOASTY') text = 'Toasty!';
      else if (phrase === 'BRUTAL') text = 'Brutal!';
      else if (phrase === 'EXCELLENT') text = 'Excellent!';
      else if (phrase === 'SUPERB') text = 'Superb!';
      else if (phrase === 'SUPER') text = 'Fatal Blow!';
      else if (phrase.endsWith('_WINS')) {
        const charName = phrase.replace('_WINS', '').toLowerCase();
        const map: Record<string, string> = {
          scorpion: 'Scorpion',
          subzero: 'Sub-Zero',
          smoke: 'Smoke',
          raiden: 'Raiden',
          liukang: 'Liu Kang',
          sonya: 'Sonya Blade',
          johnny: 'Johnny Cage',
          noob: 'Noob Saibot',
          reptile: 'Reptile',
          kunglao: 'Kung Lao',
          kitana: 'Kitana',
          mileena: 'Mileena',
          goro: 'Goro',
          robocop: 'RoboCop',
          leonardo: 'Leonardo',
          shangtsung: 'Shang Tsung',
          aimix: 'Aimix',
        };
        text = `${map[charName] || charName} Wins!`;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (this.cachedVoice) {
        utterance.voice = this.cachedVoice;
      }
      utterance.pitch = phrase === 'TOASTY' ? 1.6 : 0.62;
      utterance.rate = 0.84;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Safely ignored
    }
  }

  private announceProcedural(phrase: string) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    if (phrase === 'FIGHT') {
      this.synthesizeBaritoneRoar([
        { freq: 78, vowelFreq: 480, dur: 0.16, amp: 1.0 },
        { freq: 65, vowelFreq: 820, dur: 0.42, amp: 1.0 },
      ]);
      this.playGong(1.1);
    } else if (phrase === 'CHOOSE_YOUR_DESTINY') {
      this.synthesizeBaritoneRoar([
        { freq: 85, vowelFreq: 420, dur: 0.22, amp: 0.9 },
        { freq: 75, vowelFreq: 500, dur: 0.26, amp: 0.95 },
        { freq: 65, vowelFreq: 380, dur: 0.45, amp: 1.0 },
      ]);
      this.playGong(0.8);
    } else if (phrase === 'FINISH_HIM' || phrase === 'FINISH_HER') {
      this.synthesizeBaritoneRoar([
        { freq: 88, vowelFreq: 400, dur: 0.18, amp: 0.9 },
        { freq: 78, vowelFreq: 450, dur: 0.22, amp: 0.9 },
        { freq: 68, vowelFreq: 350, dur: 0.38, amp: 1.0 },
      ]);
      this.playGong(0.7);
    } else if (phrase === 'FATALITY') {
      this.synthesizeBaritoneRoar([
        { freq: 92, vowelFreq: 750, dur: 0.16, amp: 0.95 },
        { freq: 82, vowelFreq: 500, dur: 0.16, amp: 0.95 },
        { freq: 72, vowelFreq: 400, dur: 0.18, amp: 0.95 },
        { freq: 58, vowelFreq: 350, dur: 0.48, amp: 1.0 },
      ]);
      this.playGong(0.5);
    } else if (phrase === 'GET_OVER_HERE') {
      this.synthesizeFormantVoice([
        { freq: 120, vowelFreq: 550, dur: 0.12, amp: 0.8 },
        { freq: 110, vowelFreq: 650, dur: 0.14, amp: 0.8 },
        { freq: 95, vowelFreq: 450, dur: 0.38, amp: 0.95 },
      ]);
    } else if (phrase === 'TOASTY') {
      this.synthesizeFormantVoice([
        { freq: 280, vowelFreq: 700, dur: 0.16, amp: 0.7 },
        { freq: 240, vowelFreq: 1100, dur: 0.26, amp: 0.8 },
      ]);
    } else if (phrase === 'BRUTAL' || phrase === 'EXCELLENT' || phrase === 'SUPERB' || phrase === 'SUPER') {
      this.synthesizeFormantVoice([
        { freq: 90, vowelFreq: 350, dur: 0.18, amp: 0.85 },
        { freq: 75, vowelFreq: 550, dur: 0.28, amp: 0.9 },
      ]);
      this.playGong(1.0);
    } else if (phrase === 'FLAWLESS_VICTORY') {
      this.synthesizeFormantVoice([
        { freq: 105, vowelFreq: 450, dur: 0.18, amp: 0.8 },
        { freq: 90, vowelFreq: 550, dur: 0.24, amp: 0.85 },
      ]);
      this.playGong(1.0);
    } else if (phrase === 'ROUND_1' || phrase === 'ROUND_2' || phrase === 'ROUND_3' || phrase === 'FINAL_ROUND') {
      this.synthesizeFormantVoice([
        { freq: 105, vowelFreq: 450, dur: 0.2, amp: 0.75 },
        { freq: 80, vowelFreq: 500, dur: 0.35, amp: 0.85 },
      ]);
      this.playGong(0.9);
    } else if (phrase === 'TAG_IN') {
      this.playTag();
    } else if (phrase === 'AIMIX' || phrase === 'AIMIX_WINS') {
      this.synthesizeBaritoneRoar([
        { freq: 88, vowelFreq: 520, dur: 0.2, amp: 0.95 },
        { freq: 70, vowelFreq: 350, dur: 0.36, amp: 1.0 },
      ]);
      this.playSonicWave();
    } else if (phrase.includes('WINS')) {
      this.synthesizeFormantVoice([
        { freq: 95, vowelFreq: 450, dur: 0.22, amp: 0.8 },
        { freq: 80, vowelFreq: 600, dur: 0.36, amp: 0.9 },
      ]);
      this.playGong(0.9);
    } else {
      this.synthesizeBaritoneRoar([
        { freq: 90, vowelFreq: 450, dur: 0.18, amp: 0.8 },
        { freq: 72, vowelFreq: 360, dur: 0.28, amp: 0.85 },
      ]);
    }
  }

  private synthesizeFormantVoice(syllables: { freq: number; vowelFreq: number; dur: number; amp: number }[]) {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    try {
      const dest = this.getDest();
      let startTime = this.ctx.currentTime + 0.03;

      syllables.forEach((s) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(s.freq, startTime);
        osc.frequency.exponentialRampToValueAtTime(s.freq * 0.9, startTime + s.dur);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(s.vowelFreq, startTime);
        filter.Q.setValueAtTime(4.5, startTime);

        gain.gain.setValueAtTime(0.01, startTime);
        gain.gain.linearRampToValueAtTime(s.amp * 0.45, startTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + s.dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(dest);

        osc.start(startTime);
        osc.stop(startTime + s.dur);
        startTime += s.dur + 0.03;
      });
    } catch {
      // Safe
    }
  }

  private synthesizeBaritoneRoar(syllables: { freq: number; vowelFreq: number; dur: number; amp: number }[]) {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    try {
      const dest = this.getDest();
      let startTime = this.ctx.currentTime + 0.02;

      syllables.forEach((s) => {
        if (!this.ctx) return;
        const osc1 = this.ctx.createOscillator();
        const oscSub = this.ctx.createOscillator();
        const filter1 = this.ctx.createBiquadFilter();
        const filter2 = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(s.freq, startTime);
        osc1.frequency.exponentialRampToValueAtTime(s.freq * 0.88, startTime + s.dur);

        oscSub.type = 'triangle';
        oscSub.frequency.setValueAtTime(s.freq * 0.5, startTime);
        oscSub.frequency.exponentialRampToValueAtTime(s.freq * 0.44, startTime + s.dur);

        filter1.type = 'bandpass';
        filter1.frequency.setValueAtTime(s.vowelFreq, startTime);
        filter1.Q.setValueAtTime(5.5, startTime);

        filter2.type = 'lowpass';
        filter2.frequency.setValueAtTime(1400, startTime);

        gain.gain.setValueAtTime(0.01, startTime);
        gain.gain.linearRampToValueAtTime(s.amp * 0.72, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + s.dur);

        osc1.connect(filter1);
        oscSub.connect(filter2);
        filter1.connect(gain);
        filter2.connect(gain);
        gain.connect(dest);

        osc1.start(startTime);
        oscSub.start(startTime);
        osc1.stop(startTime + s.dur);
        oscSub.stop(startTime + s.dur);
        startTime += s.dur + 0.025;
      });
    } catch {
      // Safe
    }
  }

  private playNoiseCrack(
    startTime: number,
    duration: number,
    volume: number,
    cutoff = 2000,
    customDest?: AudioNode
  ) {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    try {
      const dest = customDest || this.getDest();
      const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(cutoff, startTime);
      filter.frequency.exponentialRampToValueAtTime(Math.min(cutoff, 200), startTime + duration);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.005, startTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      noise.start(startTime);
      noise.stop(startTime + duration);
    } catch {
      // Safe
    }
  }

  public playPainSound(type: 'gasp' | 'scream' | 'groan' | 'shriek' | 'flesh_tear' = 'scream', worldX?: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dest = this.getDest(worldX);

    try {
      if (type === 'gasp') {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(140, t + 0.35);
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(850, t);
        filter.Q.setValueAtTime(3.0, t);
        gain.gain.setValueAtTime(0.01, t);
        gain.gain.linearRampToValueAtTime(0.4, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.35);
        this.playNoiseCrack(t, 0.3, 0.25, 1200, dest);
      } else if (type === 'scream') {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(420, t);
        osc1.frequency.linearRampToValueAtTime(580, t + 0.3);
        osc1.frequency.exponentialRampToValueAtTime(160, t + 1.2);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(428, t);
        osc2.frequency.linearRampToValueAtTime(590, t + 0.3);
        osc2.frequency.exponentialRampToValueAtTime(155, t + 1.2);
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1100, t);
        filter.frequency.linearRampToValueAtTime(1800, t + 0.25);
        filter.frequency.exponentialRampToValueAtTime(600, t + 1.2);
        filter.Q.setValueAtTime(3.8, t);
        gain.gain.setValueAtTime(0.01, t);
        gain.gain.linearRampToValueAtTime(0.6, t + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 1.2);
        osc2.stop(t + 1.2);
        this.playNoiseCrack(t, 0.45, 0.35, 2400, dest);
      } else if (type === 'shriek') {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(740, t);
        osc.frequency.exponentialRampToValueAtTime(290, t + 0.85);
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1500, t);
        filter.Q.setValueAtTime(4.2, t);
        gain.gain.setValueAtTime(0.01, t);
        gain.gain.linearRampToValueAtTime(0.55, t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 0.85);
      } else if (type === 'groan') {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(115, t);
        osc.frequency.exponentialRampToValueAtTime(45, t + 1.1);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(420, t);
        gain.gain.setValueAtTime(0.01, t);
        gain.gain.linearRampToValueAtTime(0.5, t + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        osc.start(t);
        osc.stop(t + 1.1);
      } else if (type === 'flesh_tear') {
        this.playSword(worldX);
        this.playNoiseCrack(t, 0.28, 0.55, 1100, dest);
      }
    } catch {
      // Safe
    }
  }

  public playBullseye() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dest = this.getDest();
    try {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(165, t);
      osc1.frequency.exponentialRampToValueAtTime(330, t + 0.18);
      osc2.frequency.setValueAtTime(245, t);
      osc2.frequency.exponentialRampToValueAtTime(490, t + 0.18);
      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.34, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(dest);
      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.28);
      osc2.stop(t + 0.28);
    } catch {
      // Safe
    }
  }

  public playComboCancel() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dest = this.getDest();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, t);
      osc.frequency.exponentialRampToValueAtTime(260, t + 0.15);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.2);
    } catch {
      // Safe
    }
  }
}

export const RetroAudio = new RetroSynthManager();
