import fs from 'fs';
import { spawn } from 'child_process';

const sampleRate = 44100;
const bpm = 136;
const beatSec = 60 / bpm;
const barSec = beatSec * 4;
const totalBars = 8;
const durationSec = barSec * totalBars;
const totalSamples = Math.floor(sampleRate * durationSec);

const leftBuf = new Float32Array(totalSamples);
const rightBuf = new Float32Array(totalSamples);

// Helper synths
function addKick(startSample) {
  const kickLen = Math.floor(sampleRate * 0.35);
  for (let i = 0; i < kickLen && startSample + i < totalSamples; i++) {
    const t = i / sampleRate;
    const freq = 140 * Math.exp(-t * 22) + 42;
    const phase = 2 * Math.PI * freq * t;
    const amp = Math.exp(-t * 8.5);
    // slight distortion/punch
    const val = Math.tanh(Math.sin(phase) * 2.2) * amp * 0.85;
    leftBuf[startSample + i] += val;
    rightBuf[startSample + i] += val;
  }
}

function addSnare(startSample) {
  const snareLen = Math.floor(sampleRate * 0.22);
  for (let i = 0; i < snareLen && startSample + i < totalSamples; i++) {
    const t = i / sampleRate;
    const toneFreq = 180 * Math.exp(-t * 15) + 80;
    const tone = Math.sin(2 * Math.PI * toneFreq * t) * Math.exp(-t * 18) * 0.4;
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 14) * 0.45;
    const val = (tone + noise) * 0.7;
    leftBuf[startSample + i] += val * 0.9;
    rightBuf[startSample + i] += val * 0.9;
  }
}

function addHiHat(startSample, isOpen = false) {
  const len = Math.floor(sampleRate * (isOpen ? 0.16 : 0.04));
  const decay = isOpen ? 12 : 60;
  for (let i = 0; i < len && startSample + i < totalSamples; i++) {
    const t = i / sampleRate;
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * decay);
    leftBuf[startSample + i] += noise * (isOpen ? 0.25 : 0.15);
    rightBuf[startSample + i] += noise * (isOpen ? 0.22 : 0.18);
  }
}

function noteToFreq(note) {
  // A4 = 440
  const notes = {
    'A1': 55.0, 'B1': 61.74, 'C2': 65.41, 'D2': 73.42, 'Eb2': 77.78, 'E2': 82.41, 'F2': 87.31, 'G2': 98.0,
    'A2': 110.0, 'B2': 123.47, 'C3': 130.81, 'D3': 146.83, 'Eb3': 155.56, 'E3': 164.81, 'F3': 174.61, 'G3': 196.0,
    'A3': 220.0, 'B3': 246.94, 'C4': 261.63, 'D4': 293.66, 'Eb4': 311.13, 'E4': 329.63, 'F4': 349.23, 'G4': 392.0,
    'A4': 440.0, 'C5': 523.25, 'D5': 587.33, 'E5': 659.25
  };
  return notes[note] || 220.0;
}

function addBassNote(startSample, durSec, freq) {
  const len = Math.floor(sampleRate * durSec);
  for (let i = 0; i < len && startSample + i < totalSamples; i++) {
    const t = i / sampleRate;
    const env = Math.min(1, t * 80) * Math.exp(-t * 2.8);
    // Saw + square combo with resonant filter sweep
    const saw = (2 * ((t * freq) % 1) - 1);
    const sqr = Math.sin(2 * Math.PI * freq * t) > 0 ? 0.8 : -0.8;
    const val = (saw * 0.6 + sqr * 0.4) * env * 0.55;
    leftBuf[startSample + i] += val;
    rightBuf[startSample + i] += val;
  }
}

function addSynthLead(startSample, durSec, freq, pan = 0) {
  const len = Math.floor(sampleRate * durSec);
  for (let i = 0; i < len && startSample + i < totalSamples; i++) {
    const t = i / sampleRate;
    const env = Math.min(1, t * 120) * Math.exp(-t * 3.5);
    // Bright sync lead
    const osc1 = Math.sin(2 * Math.PI * freq * t);
    const osc2 = Math.sin(2 * Math.PI * freq * 1.004 * t);
    const osc3 = (2 * ((t * freq * 2) % 1) - 1) * 0.3;
    const val = (osc1 * 0.45 + osc2 * 0.35 + osc3) * env * 0.38;
    leftBuf[startSample + i] += val * (1 - pan * 0.4);
    rightBuf[startSample + i] += val * (1 + pan * 0.4);
  }
}

function addGong(startSample) {
  const len = Math.floor(sampleRate * 3.5);
  for (let i = 0; i < len && startSample + i < totalSamples; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 1.2);
    const g1 = Math.sin(2 * Math.PI * 110 * t);
    const g2 = Math.sin(2 * Math.PI * 163 * t) * 0.6;
    const g3 = Math.sin(2 * Math.PI * 236 * t) * 0.4;
    const val = (g1 + g2 + g3) * env * 0.35;
    leftBuf[startSample + i] += val;
    rightBuf[startSample + i] += val;
  }
}

// 1. Drum Track (4-on-the-floor kick, snare on 2 and 4, hi-hats on 16th notes)
const totalBeats = totalBars * 4;
for (let b = 0; b < totalBeats; b++) {
  const beatTime = b * beatSec;
  const kickSample = Math.floor(beatTime * sampleRate);
  addKick(kickSample);

  if (b % 2 === 1) {
    addSnare(kickSample);
  }

  // 16th note hats
  for (let s = 0; s < 4; s++) {
    const subTime = beatTime + s * (beatSec / 4);
    const subSample = Math.floor(subTime * sampleRate);
    const isOpen = s === 2; // offbeat hat
    addHiHat(subSample, isOpen);
  }
}

// 2. Gong at bar 0 and bar 4
addGong(0);
addGong(Math.floor(4 * barSec * sampleRate));

// 3. Rolling 16th-note Bassline (Mortal Kombat A-minor groove)
const bassPattern = [
  'A1', 'A1', 'C2', 'D2', 'Eb2', 'D2', 'C2', 'G1',
  'A1', 'A1', 'C2', 'D2', 'Eb2', 'E2', 'G2', 'E2',
];

const total16ths = totalBars * 16;
for (let i = 0; i < total16ths; i++) {
  const t = i * (beatSec / 4);
  const sample = Math.floor(t * sampleRate);
  const note = bassPattern[i % bassPattern.length];
  addBassNote(sample, beatSec * 0.28, noteToFreq(note));
}

// 4. Iconic MK Lead Riff (Bar 2 to Bar 8)
const leadNotes = [
  // Bar 2
  { bar: 2, beat: 0, note: 'A3', dur: 0.3 },
  { bar: 2, beat: 0.75, note: 'A3', dur: 0.2 },
  { bar: 2, beat: 1.5, note: 'C4', dur: 0.3 },
  { bar: 2, beat: 2.25, note: 'D4', dur: 0.3 },
  { bar: 2, beat: 3.0, note: 'C4', dur: 0.4 },
  // Bar 3
  { bar: 3, beat: 0, note: 'E4', dur: 0.3 },
  { bar: 3, beat: 1.0, note: 'D4', dur: 0.3 },
  { bar: 3, beat: 2.0, note: 'C4', dur: 0.3 },
  { bar: 3, beat: 3.0, note: 'G3', dur: 0.4 },
  // Bar 4
  { bar: 4, beat: 0, note: 'A3', dur: 0.3 },
  { bar: 4, beat: 0.75, note: 'A3', dur: 0.2 },
  { bar: 4, beat: 1.5, note: 'C4', dur: 0.3 },
  { bar: 4, beat: 2.25, note: 'D4', dur: 0.3 },
  { bar: 4, beat: 3.0, note: 'Eb4', dur: 0.4 },
  // Bar 5
  { bar: 5, beat: 0, note: 'E4', dur: 0.4 },
  { bar: 5, beat: 1.5, note: 'G4', dur: 0.4 },
  { bar: 5, beat: 2.5, note: 'E4', dur: 0.3 },
  { bar: 5, beat: 3.25, note: 'D4', dur: 0.3 },
  // Bar 6
  { bar: 6, beat: 0, note: 'A4', dur: 0.4 },
  { bar: 6, beat: 1.0, note: 'G4', dur: 0.3 },
  { bar: 6, beat: 2.0, note: 'E4', dur: 0.3 },
  { bar: 6, beat: 3.0, note: 'C4', dur: 0.4 },
  // Bar 7
  { bar: 7, beat: 0, note: 'D4', dur: 0.3 },
  { bar: 7, beat: 1.0, note: 'C4', dur: 0.3 },
  { bar: 7, beat: 2.0, note: 'A3', dur: 0.4 },
  { bar: 7, beat: 3.0, note: 'A3', dur: 0.4 }
];

leadNotes.forEach(ln => {
  const time = (ln.bar * 4 + ln.beat) * beatSec;
  const sample = Math.floor(time * sampleRate);
  addSynthLead(sample, ln.dur, noteToFreq(ln.note), 0.15);
});

// Convert Float32 to 16-bit PCM Buffer
const pcmBuffer = Buffer.alloc(totalSamples * 4);
for (let i = 0; i < totalSamples; i++) {
  // Soft limiter to prevent clipping
  const l = Math.max(-1, Math.min(1, Math.tanh(leftBuf[i] * 0.95)));
  const r = Math.max(-1, Math.min(1, Math.tanh(rightBuf[i] * 0.95)));
  const intL = Math.floor(l * 32767);
  const intR = Math.floor(r * 32767);
  pcmBuffer.writeInt16LE(intL, i * 4);
  pcmBuffer.writeInt16LE(intR, i * 4 + 2);
}

// Pipe PCM buffer to ffmpeg to encode to mp3
const ffmpeg = spawn('ffmpeg', [
  '-y',
  '-f', 's16le',
  '-ar', String(sampleRate),
  '-ac', '2',
  '-i', 'pipe:0',
  '-b:a', '192k',
  'public/audio/mk_theme.mp3'
]);

ffmpeg.stdin.write(pcmBuffer);
ffmpeg.stdin.end();

ffmpeg.on('close', (code) => {
  if (code === 0) {
    console.log('Successfully generated public/audio/mk_theme.mp3');
  } else {
    console.error('ffmpeg exited with code', code);
  }
});
