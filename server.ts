/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import http from 'http';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Initialize GoogleGenAI SDK server-side
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    })
  : null;

// Voice phrase text mappings for iconic Mortal Kombat announcer calls
const MK_PHRASES: Record<string, string> = {
  FIGHT: 'Fight!',
  GET_OVER_HERE: 'Get over here!',
  FINISH_HIM: 'Finish Him!',
  FINISH_HER: 'Finish Her!',
  FATALITY: 'Fatality!',
  TOASTY: 'Toasty!',
  BRUTAL: 'Brutal Combo!',
  FLAWLESS_VICTORY: 'Flawless Victory!',
  SCORPION_WINS: 'Scorpion Wins!',
  SUBZERO_WINS: 'Sub-Zero Wins!',
  SMOKE_WINS: 'Smoke Wins!',
  RAIDEN_WINS: 'Raiden Wins!',
  LIUKANG_WINS: 'Liu Kang Wins!',
  SONYA_WINS: 'Sonya Wins!',
  JOHNNY_WINS: 'Johnny Cage Wins!',
  NOOB_WINS: 'Noob Saibot Wins!',
  AIMIX_WINS: 'Aimix Wins!',
  ROUND_1: 'Round One.',
  ROUND_2: 'Round Two.',
  ROUND_3: 'Round Three.',
  FINAL_ROUND: 'Final Round.',
  TAG_IN: 'Tag Team In!',
  CHOOSE_YOUR_DESTINY: 'Choose Your Destiny!',
};

// In-memory audio cache so each voice phrase is only generated once
const audioCache = new Map<string, string>();

// Strict Rate-Limiting Protection (Gemini TTS Free Tier is 3 requests per minute)
let lastCallTime = 0;
let rateLimitedUntil = 0;
const MIN_CALL_INTERVAL_MS = 21000; // Safe 21-second cooldown between API calls

// API Route for Gemini Announcer Voice (TTS)
app.post('/api/voice', async (req: Request, res: Response) => {
  const { phrase } = req.body;
  if (!phrase || typeof phrase !== 'string') {
    return res.status(400).json({ error: 'Phrase is required' });
  }

  const normalizedPhrase = phrase.toUpperCase();
  const textPrompt = MK_PHRASES[normalizedPhrase] || phrase;

  // 1. Check cache first
  if (audioCache.has(normalizedPhrase)) {
    return res.json({
      phrase: normalizedPhrase,
      audioData: audioCache.get(normalizedPhrase),
      cached: true,
    });
  }

  // 2. If no Gemini client or API key, return fallback signal cleanly
  if (!ai) {
    return res.json({
      phrase: normalizedPhrase,
      fallback: true,
      message: 'Using procedural synthesizer fallback',
    });
  }

  // 3. Check rate-limit cooldown
  const now = Date.now();
  if (now < rateLimitedUntil || (now - lastCallTime < MIN_CALL_INTERVAL_MS)) {
    return res.json({
      phrase: normalizedPhrase,
      fallback: true,
      rateLimited: true,
    });
  }

  lastCallTime = now;

  try {
    // Generate Speech with Gemini 3.8 Flash Lite TTS
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: textPrompt,
              speechMetadata: {
                style: 'Deep, booming, dark Mortal Kombat Shao Kahn tournament announcer',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Fenrir' }, // Deepest male warrior voice
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const dataUri = `data:audio/wav;base64,${base64Audio}`;
      audioCache.set(normalizedPhrase, dataUri);
      return res.json({
        phrase: normalizedPhrase,
        audioData: dataUri,
        cached: false,
      });
    }

    return res.json({ phrase: normalizedPhrase, fallback: true });
  } catch (err: unknown) {
    const errorStr = String(err);
    if (errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('quota')) {
      // Cooldown for 25 seconds when quota is reached
      rateLimitedUntil = Date.now() + 25000;
    }
    // Return clean fallback response without triggering unhandled error logs
    return res.json({ phrase: normalizedPhrase, fallback: true, error: 'Quota or network fallback' });
  }
});

// API Route for Gemini-Designed Real-Time Dynamic Combo Vestment Link Sequences
app.post('/api/combo-sequence', async (req: Request, res: Response) => {
  const { character = 'Scorpion', direction = 'E', sequence = [], targetZone = 'TORSO' } = req.body;

  // Fallback defaults for instant zero-latency link responses
  const directionalNames: Record<string, string> = {
    N: 'Skyward Rift Launch',
    NE: 'Ascendant Dragon Talon',
    E: 'Fierce Cleave Thrust',
    SE: 'Low Nether Sweeper',
    S: 'Ground Tremor Smash',
    SW: 'Reaping Ankle Fracture',
    W: 'Deflective Counter Parry',
    NW: 'Overhead Void Cleave',
    TAP: 'Swift Lead Jab',
  };

  const defaultMoveName = directionalNames[direction] || 'Arcade Flurry Strike';

  if (!ai) {
    return res.json({
      name: `${character} ${defaultMoveName}`,
      style: 'Brutal Martial Flurry',
      damage: 10,
      nextBranches: [
        { dir: 'N', name: 'Airborne Juggle Spike' },
        { dir: 'E', name: 'Spear Reel Impact' },
        { dir: 'SE', name: 'Low Fissure Trip' },
      ],
      fallback: true,
    });
  }

  try {
    const prompt = `You are the Mortal Kombat combat engine AI designing a slick fighting game combo vestment link.
Character: ${character}
Input Direction on Circle of Pain: ${direction}
Target Zone: ${targetZone}
Current Combo Chain: ${sequence.join(' -> ') || 'Opener'}

Generate a short martial arts linked attack for this sequence.
Output STRICT JSON format with keys:
"name": (string, 2-4 words, aggressive MK style like "Nether Flame Cleave", "Kori Frost Fracture", "Thunder Rift Thrust"),
"style": (string, brief descriptor),
"damage": (number between 7 and 14),
"nextBranches": array of 3 next suggested linked directional branches [{ "dir": "N"|"E"|"SE"|"S"|"NE", "name": "Move Name" }]`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text?.trim() || '';
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch {
    return res.json({
      name: `${character} ${defaultMoveName}`,
      style: 'Sovereign Martial Arts',
      damage: 9,
      nextBranches: [
        { dir: 'N', name: 'Skyward Uppercut' },
        { dir: 'E', name: 'Weapon Slash' },
        { dir: 'S', name: 'Low Sweep' },
      ],
      fallback: true,
    });
  }
});

// Character Spec Sheet Cache
const specCache = new Map<string, any>();

// API Route for Gemini AI Character Spec Sheet
app.post('/api/character-spec', async (req: Request, res: Response) => {
  const { characterId = 'scorpion', name = 'Scorpion' } = req.body;
  const key = String(characterId).toLowerCase();

  if (specCache.has(key)) {
    return res.json({ ...specCache.get(key), cached: true });
  }

  const defaultSpecs: Record<string, any> = {
    scorpion: {
      fighter: 'Scorpion (Hanzo Hasashi)',
      origin: 'Netherrealm / Shirai Ryu Clan',
      weaponSystem: {
        primary: 'Mugai Ryu Katana & Forged Kunai Spear',
        kinematics: 'Articulated IK chain with barbed serpentine projectile delivery',
        lethalityTier: 'S-Tier Hellfire Infusion',
        impactProfile: 'Penetrative impalement and reel-in stagger',
      },
      combatArchetype: 'High-Pressure Teleport & Restand Specialist',
      trueDetails: [
        'Unmasked flaming skull revealed during Toasty fatality execution',
        'Traditional Shirai Ryu battle tabard adorned with dual shoulder pauldrons',
        'Scorpion sting barbed kunai anchored to high-tensile carbon chain',
      ],
      frameDataBonus: '50% Parry frame counter amplification on timed block',
    },
    subzero: {
      fighter: 'Sub-Zero (Bi-Han / Kuai Liang)',
      origin: 'Lin Kuei Cryomancer Enclave',
      weaponSystem: {
        primary: 'Kori Ice Daggers & Frost Scepter',
        kinematics: 'Cryogenic flash-freeze crystalline fracture matrix',
        lethalityTier: 'S-Tier Glacial Decimation',
        impactProfile: 'Sub-zero thermal shock and spine severance',
      },
      combatArchetype: 'Zoning & Freeze Immobilization Punisher',
      trueDetails: [
        'Carved Lin Kuei faceplate with crystalline condensation vapor',
        'Deep sapphire embroidered tunic with armored cryogenic arm bracers',
        'Iconic Spine Rip execution removing head and vertebrae intact',
      ],
      frameDataBonus: 'Target frozen status duration increased by 20%',
    },
    aimix: {
      fighter: 'AIMIX: Dimension-X Architect',
      origin: 'Cybernetic Matrix / Deep Core',
      weaponSystem: {
        primary: 'Glass Focal Resonance Blade & 9D Wave Transducer',
        kinematics: 'Hermite Bezier vector interpolation and sonic shockwaves',
        lethalityTier: 'Apex Dimensional Singularity',
        impactProfile: 'Sub-atomic spatial severance and reality distortion',
      },
      combatArchetype: 'Tactical Cybernetic Glass Focus Engine',
      trueDetails: [
        'Real-time 9D telemetry sensor visor with frequency audio spectrum equalizer',
        'Procedural weapon matrix supporting blade, chain, and staff transformations',
        'Instantaneous quantum dash and arterial telemetry feedback loop',
      ],
      frameDataBonus: 'Maximized 9D vector telemetry accuracy and cancel speeds',
    },
  };

  const fallback = defaultSpecs[key] || {
    fighter: name,
    origin: 'Outworld Tournament Contender',
    weaponSystem: {
      primary: 'Signature Martial Weaponry',
      kinematics: 'High-impact physical trauma and momentum transfer',
      lethalityTier: 'Tournament Grade',
      impactProfile: 'Crushing kinetic force',
    },
    combatArchetype: 'Balanced Martial Striker',
    trueDetails: [
      'Authentic Mortal Kombat combat uniform and character silhouette',
      'Visceral arterial blood mechanics upon critical bone-fracture impacts',
      'Iconic battle cries, signature quotes, and cinematic Fatalities',
    ],
    frameDataBonus: 'Standard tournament combat parameters',
  };

  if (!ai) {
    specCache.set(key, fallback);
    return res.json({ ...fallback, fallback: true });
  }

  try {
    const prompt = `You are the master fighting game engine archivist for Mortal Kombat: Dimension-X.
Character: ${name} (${characterId}).
Generate a technical, authentic Mortal Kombat fighting game character spec sheet for this warrior.
Output STRICT JSON with:
"fighter": (full name and lore title),
"origin": (clan, realm, or faction),
"weaponSystem": {
  "primary": (exact weapon name and construction),
  "kinematics": (mechanical/supernatural weapon movement physics),
  "lethalityTier": (e.g. S-Tier Netherrealm, A-Tier Cryomancy),
  "impactProfile": (anatomical impact effects on head/torso/limbs)
},
"combatArchetype": (e.g. Rushdown Teleporter, Heavy Grappler, Zone Master),
"trueDetails": (array of 3 authentic visual and combat details unique to this fighter),
"frameDataBonus": (tactical advantage or unique mechanic description)`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    const result = { ...fallback, ...parsed };
    specCache.set(key, result);
    return res.json(result);
  } catch {
    specCache.set(key, fallback);
    return res.json({ ...fallback, fallback: true });
  }
});

// Multi-Agent Swarm Orchestrator: Deconstructs codebase & synthesizes MK combat/audio/menu patch
app.post('/api/swarm/orchestrate', async (req: Request, res: Response) => {
  const {
    focusArchetype = 'MIDWAY_ARCADE_PRECISION',
    p1CharId = 'scorpion',
    cpuCharId = 'smoke',
    stageId = 'THE_PIT',
    customDirective = '',
    codebaseSnapshot = {},
  } = req.body || {};

  const presets: Record<string, any> = {
    MIDWAY_ARCADE_PRECISION: {
      patchTitle: 'Midway 1995 Arcade Purity Patch',
      globalSpeedMult: 1.04,
      hitstopScale: 1.0,
      juggleGravityScale: 0.96,
      superDamageMult: 1.05,
      wakeupInvulnFrames: 14,
      chipDamageRate: 0.12,
      dspProfile: {
        subBassGainDb: 6.0,
        midPresenceDb: 1.8,
        airSparkleDb: 2.2,
        tubeDrive: 0.34,
        compressorPunch: 0.78,
        spatialWidth: 1.2,
        footstepVolume: 0.42,
      },
      tournamentSubtitle: 'MORTAL KOMBAT · CLASSIC ARCADE FRAME LOCK',
      vsBannerCallout: `${String(p1CharId).toUpperCase()} VS ${String(cpuCharId).toUpperCase()} · TEST YOUR MIGHT`,
      roundStartChant: 'MORTAL KOMBAT!',
      freezeMs: 380,
      barrageHits: 4,
      finisherSlowMoScale: 0.34,
      cameraPeakZoom: 1.65,
      tagline: 'ARCANE FATAL BLOW',
    },
    HYPER_JUGGLE_RUSHDOWN: {
      patchTitle: 'UMK3 Hyper Rushdown & Air Juggle Matrix',
      globalSpeedMult: 1.14,
      hitstopScale: 0.88,
      juggleGravityScale: 0.84,
      superDamageMult: 1.12,
      wakeupInvulnFrames: 12,
      chipDamageRate: 0.14,
      dspProfile: {
        subBassGainDb: 7.2,
        midPresenceDb: 2.5,
        airSparkleDb: 3.0,
        tubeDrive: 0.45,
        compressorPunch: 0.86,
        spatialWidth: 1.32,
        footstepVolume: 0.48,
      },
      tournamentSubtitle: 'ULTIMATE KOMBAT · HYPER JUGGLE ENGINE',
      vsBannerCallout: `NO MERCY · ${String(stageId).replace(/_/g, ' ')}`,
      roundStartChant: 'EXCELLENT!',
      freezeMs: 320,
      barrageHits: 5,
      finisherSlowMoScale: 0.3,
      cameraPeakZoom: 1.72,
      tagline: 'HYPER COMBO OVERDRIVE',
    },
    CINEMATIC_BRUTALITY_HEAVY: {
      patchTitle: 'Heavy Bone-Break & Theatrical Cinema Patch',
      globalSpeedMult: 0.96,
      hitstopScale: 1.25,
      juggleGravityScale: 1.05,
      superDamageMult: 1.22,
      wakeupInvulnFrames: 16,
      chipDamageRate: 0.16,
      dspProfile: {
        subBassGainDb: 9.0,
        midPresenceDb: 1.2,
        airSparkleDb: 1.5,
        tubeDrive: 0.56,
        compressorPunch: 0.92,
        spatialWidth: 1.38,
        footstepVolume: 0.55,
      },
      tournamentSubtitle: 'OUTWORLD ARENA · BRUTAL ANATOMY ENGINE',
      vsBannerCallout: 'TO THE DEATH · FINISH YOUR OPPONENT',
      roundStartChant: 'ROUND ONE · FIGHT!',
      freezeMs: 460,
      barrageHits: 4,
      finisherSlowMoScale: 0.28,
      cameraPeakZoom: 1.8,
      tagline: 'BRUTAL BONE SHATTER',
    },
  };

  const preset = presets[focusArchetype] || presets.MIDWAY_ARCADE_PRECISION;

  const deterministicPatch = {
    patchTitle: preset.patchTitle,
    source: 'CODEBASE_BLUEPRINT',
    modelUsed: 'deterministic-blueprint',
    archetypeFocus: focusArchetype,
    combatTuning: {
      globalSpeedMult: preset.globalSpeedMult,
      hitstopScale: preset.hitstopScale,
      juggleGravityScale: preset.juggleGravityScale,
      superDamageMult: preset.superDamageMult,
      wakeupInvulnFrames: preset.wakeupInvulnFrames,
      chipDamageRate: preset.chipDamageRate,
    },
    dspProfile: preset.dspProfile,
    menuDirective: {
      tournamentSubtitle: preset.tournamentSubtitle,
      vsBannerCallout: preset.vsBannerCallout,
      roundStartChant: preset.roundStartChant,
    },
    superChoreography: {
      freezeMs: preset.freezeMs,
      barrageHits: preset.barrageHits,
      finisherSlowMoScale: preset.finisherSlowMoScale,
      cameraPeakZoom: preset.cameraPeakZoom,
      tagline: preset.tagline,
    },
    agentReports: [
      {
        agentName: 'Kronos-Frame',
        role: 'Frame Timing & Reaction Specialist',
        status: 'SYNTHESIZED',
        summary: `Calibrated hitstop (${preset.hitstopScale}x), juggle gravity (${preset.juggleGravityScale}x), and ${preset.wakeupInvulnFrames}f wakeup invulnerability for ${p1CharId} vs ${cpuCharId}.`,
        recommendations: [
          'LP/LK fast checks retain 4-5f startup for interrupting dashes.',
          'Hitstun/blockstun spread ensures safe jab pressure vs punishable sweeps.',
        ],
      },
      {
        agentName: 'Scorpion-Skin',
        role: 'Movement Matrix & SpriteSheet Binder',
        status: 'SYNTHESIZED',
        summary: 'Mapped all 6 locomotion, aerial, offense, defense, hit-reaction, and finisher matrix cells directly onto SpriteSheetEngine animation tracks.',
        recommendations: [
          'SpriteSheetEngine palettes and Hermite cross-dissolve morphTicks preserved at 100%.',
          'Aerial Jump Punch binds cleanly to sprite punch posture during flight.',
        ],
      },
      {
        agentName: 'Raiden-Cine',
        role: 'Super Move & Transition Director',
        status: 'SYNTHESIZED',
        summary: `Choreographed ${preset.barrageHits}-beat Super sequence with ${preset.freezeMs}ms dramatic blackout freeze and ${preset.cameraPeakZoom}x camera peak.`,
        recommendations: [
          'Movie VS transition shutter plays metallic gong synced with animated sprite canvases.',
          'Slow-motion apex emphasizes final Super launcher impact.',
        ],
      },
      {
        agentName: 'Sonya-DSP',
        role: '3D Spatial Sound & Mastering Engineer',
        status: 'SYNTHESIZED',
        summary: `Tuned 3-band EQ (+${preset.dspProfile.subBassGainDb}dB @ 72Hz), WaveShaper saturation (${preset.dspProfile.tubeDrive}), and HRTF spatial panning width (${preset.dspProfile.spatialWidth}x).`,
        recommendations: [
          'Sub-bass transient anchors punches, uppercuts, jumps, and grounded footsteps.',
          'Dynamic compressor maximizes punch headroom without clipping.',
        ],
      },
      {
        agentName: 'Shang-Lore',
        role: 'Menu & Tournament Rules Architect',
        status: 'SYNTHESIZED',
        summary: `Aligned Arcade, Kombat Tower, Practice Dojo, and ${stageId} stage presentation with authentic Mortal Kombat rules.`,
        recommendations: [
          'Directional command ring buffer translates classic MK motions into specials.',
          'Neutral pushbox separation prevents sprite stacking on close dashes.',
        ],
      },
    ],
  };

  if (!ai) {
    return res.json(deterministicPatch);
  }

  try {
    const swarmContext = JSON.stringify(
      {
        focusArchetype,
        matchup: { p1CharId, cpuCharId, stageId },
        customDirective,
        codebaseSnapshot,
      },
      null,
      2
    );

    const swarmPrompt = `You are a 5-agent AI engineering swarm deconstructing and synthesizing a Mortal Kombat fighting game engine.
Preservation Constraint: Preserve SpriteSheetEngine character sheets and palettes as the primary visual skin, while synthesizing authentic MK frame data, 6-domain movement matrices, button/punch/kick/jump/reaction timing, multi-beat Super choreography, movie VS menu callouts, and 3D spatial sub-bass audio DSP tuning.

Codebase telemetry:
${swarmContext}

Synthesize a complete JSON patch strictly within safe playable bounds:
- globalSpeedMult: 0.85..1.22
- hitstopScale: 0.75..1.4
- juggleGravityScale: 0.75..1.2
- superDamageMult: 0.85..1.35
- wakeupInvulnFrames: 10..20
- chipDamageRate: 0.08..0.22
- subBassGainDb: 0..10
- midPresenceDb: -3..5
- airSparkleDb: -2..5
- tubeDrive: 0.1..0.75
- compressorPunch: 0.4..0.95
- spatialWidth: 0.8..1.5
- footstepVolume: 0.15..0.7
- freezeMs: 260..520
- barrageHits: 3..6
- finisherSlowMoScale: 0.25..0.5
- cameraPeakZoom: 1.35..1.85
Provide 5 distinct agentReports for Kronos-Frame, Scorpion-Skin, Raiden-Cine, Sonya-DSP, and Shang-Lore.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: swarmPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            patchTitle: { type: Type.STRING },
            archetypeFocus: { type: Type.STRING },
            combatTuning: {
              type: Type.OBJECT,
              properties: {
                globalSpeedMult: { type: Type.NUMBER },
                hitstopScale: { type: Type.NUMBER },
                juggleGravityScale: { type: Type.NUMBER },
                superDamageMult: { type: Type.NUMBER },
                wakeupInvulnFrames: { type: Type.INTEGER },
                chipDamageRate: { type: Type.NUMBER },
              },
              required: [
                'globalSpeedMult',
                'hitstopScale',
                'juggleGravityScale',
                'superDamageMult',
                'wakeupInvulnFrames',
                'chipDamageRate',
              ],
            },
            dspProfile: {
              type: Type.OBJECT,
              properties: {
                subBassGainDb: { type: Type.NUMBER },
                midPresenceDb: { type: Type.NUMBER },
                airSparkleDb: { type: Type.NUMBER },
                tubeDrive: { type: Type.NUMBER },
                compressorPunch: { type: Type.NUMBER },
                spatialWidth: { type: Type.NUMBER },
                footstepVolume: { type: Type.NUMBER },
              },
              required: [
                'subBassGainDb',
                'midPresenceDb',
                'airSparkleDb',
                'tubeDrive',
                'compressorPunch',
                'spatialWidth',
                'footstepVolume',
              ],
            },
            menuDirective: {
              type: Type.OBJECT,
              properties: {
                tournamentSubtitle: { type: Type.STRING },
                vsBannerCallout: { type: Type.STRING },
                roundStartChant: { type: Type.STRING },
              },
              required: ['tournamentSubtitle', 'vsBannerCallout', 'roundStartChant'],
            },
            superChoreography: {
              type: Type.OBJECT,
              properties: {
                freezeMs: { type: Type.INTEGER },
                barrageHits: { type: Type.INTEGER },
                finisherSlowMoScale: { type: Type.NUMBER },
                cameraPeakZoom: { type: Type.NUMBER },
                tagline: { type: Type.STRING },
              },
              required: [
                'freezeMs',
                'barrageHits',
                'finisherSlowMoScale',
                'cameraPeakZoom',
                'tagline',
              ],
            },
            agentReports: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  agentName: { type: Type.STRING },
                  role: { type: Type.STRING },
                  status: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  recommendations: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['agentName', 'role', 'status', 'summary', 'recommendations'],
              },
            },
          },
          required: [
            'patchTitle',
            'archetypeFocus',
            'combatTuning',
            'dspProfile',
            'menuDirective',
            'superChoreography',
            'agentReports',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    const clamp = (val: number, min: number, max: number, fb: number) =>
      typeof val === 'number' && Number.isFinite(val) ? Math.max(min, Math.min(max, val)) : fb;

    const ct = parsed.combatTuning || {};
    const dsp = parsed.dspProfile || {};
    const sc = parsed.superChoreography || {};

    return res.json({
      patchTitle: parsed.patchTitle || deterministicPatch.patchTitle,
      source: 'GEMINI_SWARM',
      modelUsed: 'gemini-4-hydrogen',
      archetypeFocus: parsed.archetypeFocus || focusArchetype,
      combatTuning: {
        globalSpeedMult: clamp(ct.globalSpeedMult, 0.85, 1.22, preset.globalSpeedMult),
        hitstopScale: clamp(ct.hitstopScale, 0.75, 1.4, preset.hitstopScale),
        juggleGravityScale: clamp(ct.juggleGravityScale, 0.75, 1.2, preset.juggleGravityScale),
        superDamageMult: clamp(ct.superDamageMult, 0.85, 1.35, preset.superDamageMult),
        wakeupInvulnFrames: Math.round(clamp(ct.wakeupInvulnFrames, 10, 20, preset.wakeupInvulnFrames)),
        chipDamageRate: clamp(ct.chipDamageRate, 0.08, 0.22, preset.chipDamageRate),
      },
      dspProfile: {
        subBassGainDb: clamp(dsp.subBassGainDb, 0, 10, preset.dspProfile.subBassGainDb),
        midPresenceDb: clamp(dsp.midPresenceDb, -3, 5, preset.dspProfile.midPresenceDb),
        airSparkleDb: clamp(dsp.airSparkleDb, -2, 5, preset.dspProfile.airSparkleDb),
        tubeDrive: clamp(dsp.tubeDrive, 0.1, 0.75, preset.dspProfile.tubeDrive),
        compressorPunch: clamp(dsp.compressorPunch, 0.4, 0.95, preset.dspProfile.compressorPunch),
        spatialWidth: clamp(dsp.spatialWidth, 0.8, 1.5, preset.dspProfile.spatialWidth),
        footstepVolume: clamp(dsp.footstepVolume, 0.15, 0.7, preset.dspProfile.footstepVolume),
      },
      menuDirective: parsed.menuDirective || deterministicPatch.menuDirective,
      superChoreography: {
        freezeMs: Math.round(clamp(sc.freezeMs, 260, 520, preset.freezeMs)),
        barrageHits: Math.round(clamp(sc.barrageHits, 3, 6, preset.barrageHits)),
        finisherSlowMoScale: clamp(sc.finisherSlowMoScale, 0.25, 0.5, preset.finisherSlowMoScale),
        cameraPeakZoom: clamp(sc.cameraPeakZoom, 1.35, 1.85, preset.cameraPeakZoom),
        tagline: sc.tagline || preset.tagline,
      },
      agentReports:
        Array.isArray(parsed.agentReports) && parsed.agentReports.length > 0
          ? parsed.agentReports.map((r: any) => ({
              agentName: String(r.agentName || 'Swarm-Agent'),
              role: String(r.role || 'Specialist'),
              status: 'SYNTHESIZED',
              summary: String(r.summary || ''),
              recommendations: Array.isArray(r.recommendations) ? r.recommendations.map(String) : [],
            }))
          : deterministicPatch.agentReports,
    });
  } catch (err) {
    console.warn('[SwarmOrchestrate] Falling back to codebase blueprint:', err);
    return res.json(deterministicPatch);
  }
});

// Story Chapter Narrative + Plot Art Evolution Route
app.post('/api/story/chapter', async (req: Request, res: Response) => {
  const {
    nodeId = 'lions_gate_1962',
    nodeTitle = 'Midnight Span on Lions Gate',
    district = 'Stanley Park & Burrard Inlet',
    year = 1962,
    playerChar = 'scorpion',
    opponentChar = 'subzero',
    chapterNum = 1,
    previousChoice = 'Opening Awakening',
    riftCorruption = 0.15,
  } = req.body || {};

  const safeRift = Math.max(0.05, Math.min(1, Number(riftCorruption) || 0.15));
  const landmarkByNode: Record<string, string> = {
    lions_gate_1962: 'LIONS_GATE_BRIDGE',
    gastown_1964: 'GASTOWN_STEAM_CLOCK',
    chinatown_1966: 'CHINATOWN_GATE',
    false_creek_1968: 'FALSE_CREEK_DOCKS',
    burrard_fog_1965: 'LIONS_GATE_BRIDGE',
    robson_tram_1967: 'GASTOWN_STEAM_CLOCK',
    georgia_viaduct_1969: 'GEORGIA_VIADUCT',
    expo_sky_rift_finale: 'GEORGIA_VIADUCT',
  };
  const landmark = landmarkByNode[nodeId] || 'LIONS_GATE_BRIDGE';

  const fallbackCutscene = {
    nodeId,
    title: nodeTitle,
    chapterNum: Number(chapterNum) || 1,
    summary: `Vancouver, ${year}. Beneath the rain-soaked glow of ${district}, Outworld portals tear across 1960s Pacific Northwest timber and steel as ${String(playerChar).toUpperCase()} confronts ${String(opponentChar).toUpperCase()}.`,
    lines: [
      {
        speaker: 'CHRONICLE NARRATOR',
        role: 'NARRATOR',
        text: `${district}, Autumn ${year}. Neon tubes hum against salt fog while the Mortal Kombat rift widens above the harbor.`,
        color: '#94a3b8',
      },
      {
        speaker: String(opponentChar).toUpperCase(),
        role: 'RIVAL',
        text: `Even in this ${year} Pacific harbor, you cannot outrun the blood debt of the realms.`,
        color: '#f87171',
      },
      {
        speaker: String(playerChar).toUpperCase(),
        role: 'HERO',
        text: `Then let the cobblestones of ${district} decide who survives the crossing.`,
        color: '#fbbf24',
      },
    ],
    choices: [
      {
        id: 'choice_precision',
        label: 'HARNESS THE LINEAR KOMBAT SURGE',
        tacticalEffect: '+15% Overdrive Gauge Gain in District',
        narrativeDirection: 'Channel disciplined counter-strikes through the rain.',
        unlockedPerk: 'GAUGE_SURGE',
        nextNodeId: '',
        riftShift: -0.08,
      },
      {
        id: 'choice_rift',
        label: 'ABSORB THE OUTWORLD RIFT STRIDE',
        tacticalEffect: '+18% Special & Jump Stride Velocity',
        narrativeDirection: 'Draw unstable dimensional power from the 1960s skyline.',
        unlockedPerk: 'STRIDE_AMPLIFIER',
        nextNodeId: '',
        riftShift: 0.18,
      },
    ],
    plotArt: {
      chapterId: nodeId,
      title: nodeTitle,
      subtitle: `${district} · ${year}`,
      year: Number(year) || 1964,
      landmark,
      weather: safeRift > 0.6 ? 'STORM' : landmark === 'CHINATOWN_GATE' ? 'NEON_MIST' : 'RAIN',
      skyTint: safeRift > 0.55 ? ['#170726', '#4a0d38'] : ['#071224', '#162944'],
      focalColor: safeRift > 0.55 ? '#f43f5e' : '#38bdf8',
      secondaryColor: '#f59e0b',
      fogDensity: Math.min(0.95, 0.35 + safeRift * 0.4),
      neonIntensity: landmark === 'CHINATOWN_GATE' ? 0.92 : 0.62,
      riftFracture: safeRift,
      silhouettePose: safeRift > 0.65 ? 'CLASH' : chapterNum > 2 ? 'STRIKE' : 'STANDOFF',
      motifGlyph:
        landmark === 'CHINATOWN_GATE'
          ? 'NEON_GATE'
          : landmark === 'GASTOWN_STEAM_CLOCK'
          ? 'STEAM_CLOCK'
          : landmark === 'LIONS_GATE_BRIDGE'
          ? 'BRIDGE_CABLES'
          : safeRift > 0.6
          ? 'VOID_ORB'
          : 'DRAGON',
    },
    arenaDirective: `Watch the manifested ${year} terrain strides and Z-lane sidesteps along ${district}.`,
    source: 'CHRONICLE_BLUEPRINT',
  };

  if (!ai) {
    return res.json(fallbackCutscene);
  }

  try {
    const prompt = `You are the narrative director and visual plot-art architect for "Mortal Kombat: Vancouver 1960s".
Write a dramatic, concise fighting-game cutscene chapter with evolving plot art parameters.
Context:
- Chapter #${chapterNum}: "${nodeTitle}"
- Location: ${district}, Vancouver, Canada (${year})
- Hero: ${playerChar} vs Opponent: ${opponentChar}
- Previous Choice: ${previousChoice}
- Current Outworld Rift Corruption (0..1): ${safeRift.toFixed(2)}
- Landmark: ${landmark}

Keep dialogue sharp, gritty 1960s Vancouver noir + Mortal Kombat tournament intensity (3-4 short lines).
Provide 2 distinct tactical choices with clear gameplay perks (use perk codes from GAUGE_SURGE, STRIDE_AMPLIFIER, IRON_BREAKER, CRYO_WARD, AERIAL_DRIFT).
Evolve the plotArt visual palette & riftFracture based on the chapter stakes.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            arenaDirective: { type: Type.STRING },
            lines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  speaker: { type: Type.STRING },
                  role: { type: Type.STRING },
                  text: { type: Type.STRING },
                  color: { type: Type.STRING },
                },
                required: ['speaker', 'role', 'text', 'color'],
              },
            },
            choices: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  tacticalEffect: { type: Type.STRING },
                  narrativeDirection: { type: Type.STRING },
                  unlockedPerk: { type: Type.STRING },
                  riftShift: { type: Type.NUMBER },
                },
                required: ['id', 'label', 'tacticalEffect', 'narrativeDirection', 'unlockedPerk', 'riftShift'],
              },
            },
            plotArt: {
              type: Type.OBJECT,
              properties: {
                subtitle: { type: Type.STRING },
                weather: { type: Type.STRING },
                skyTintTop: { type: Type.STRING },
                skyTintBottom: { type: Type.STRING },
                focalColor: { type: Type.STRING },
                secondaryColor: { type: Type.STRING },
                fogDensity: { type: Type.NUMBER },
                neonIntensity: { type: Type.NUMBER },
                riftFracture: { type: Type.NUMBER },
                silhouettePose: { type: Type.STRING },
                motifGlyph: { type: Type.STRING },
              },
              required: [
                'subtitle',
                'weather',
                'skyTintTop',
                'skyTintBottom',
                'focalColor',
                'secondaryColor',
                'fogDensity',
                'neonIntensity',
                'riftFracture',
                'silhouettePose',
                'motifGlyph',
              ],
            },
          },
          required: ['title', 'summary', 'arenaDirective', 'lines', 'choices', 'plotArt'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    const clamp = (v: number, min: number, max: number, fb: number) =>
      typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fb;

    const validWeathers = ['RAIN', 'FOG', 'DRIZZLE', 'NEON_MIST', 'STORM'];
    const validPoses = ['STANDOFF', 'STRIKE', 'CLASH', 'VICTORY_RIFT', 'ASCENSION'];
    const validMotifs = ['DRAGON', 'STEAM_CLOCK', 'NEON_GATE', 'BRIDGE_CABLES', 'VOID_ORB'];
    const validRoles = ['HERO', 'RIVAL', 'NARRATOR', 'MYSTIC'];

    const pa = parsed.plotArt || {};
    return res.json({
      nodeId,
      title: String(parsed.title || fallbackCutscene.title),
      chapterNum: Number(chapterNum) || 1,
      summary: String(parsed.summary || fallbackCutscene.summary),
      arenaDirective: String(parsed.arenaDirective || fallbackCutscene.arenaDirective),
      lines:
        Array.isArray(parsed.lines) && parsed.lines.length >= 2
          ? parsed.lines.slice(0, 4).map((l: any) => ({
              speaker: String(l.speaker || 'NARRATOR'),
              role: validRoles.includes(l.role) ? l.role : 'NARRATOR',
              text: String(l.text || ''),
              color: /^#[0-9a-fA-F]{6}$/.test(String(l.color || '')) ? l.color : '#e2e8f0',
            }))
          : fallbackCutscene.lines,
      choices:
        Array.isArray(parsed.choices) && parsed.choices.length >= 2
          ? parsed.choices.slice(0, 2).map((c: any, idx: number) => ({
              id: String(c.id || `choice_${idx}`),
              label: String(c.label || fallbackCutscene.choices[idx].label),
              tacticalEffect: String(c.tacticalEffect || fallbackCutscene.choices[idx].tacticalEffect),
              narrativeDirection: String(c.narrativeDirection || fallbackCutscene.choices[idx].narrativeDirection),
              unlockedPerk: String(c.unlockedPerk || fallbackCutscene.choices[idx].unlockedPerk),
              nextNodeId: '',
              riftShift: clamp(c.riftShift, -0.25, 0.35, fallbackCutscene.choices[idx].riftShift),
            }))
          : fallbackCutscene.choices,
      plotArt: {
        chapterId: nodeId,
        title: String(parsed.title || fallbackCutscene.title),
        subtitle: String(pa.subtitle || `${district} · ${year}`),
        year: Number(year) || 1964,
        landmark,
        weather: validWeathers.includes(pa.weather) ? pa.weather : fallbackCutscene.plotArt.weather,
        skyTint: [
          /^#[0-9a-fA-F]{6}$/.test(String(pa.skyTintTop || '')) ? pa.skyTintTop : fallbackCutscene.plotArt.skyTint[0],
          /^#[0-9a-fA-F]{6}$/.test(String(pa.skyTintBottom || '')) ? pa.skyTintBottom : fallbackCutscene.plotArt.skyTint[1],
        ],
        focalColor: /^#[0-9a-fA-F]{6}$/.test(String(pa.focalColor || '')) ? pa.focalColor : fallbackCutscene.plotArt.focalColor,
        secondaryColor: /^#[0-9a-fA-F]{6}$/.test(String(pa.secondaryColor || '')) ? pa.secondaryColor : fallbackCutscene.plotArt.secondaryColor,
        fogDensity: clamp(pa.fogDensity, 0.1, 0.95, fallbackCutscene.plotArt.fogDensity),
        neonIntensity: clamp(pa.neonIntensity, 0.1, 1, fallbackCutscene.plotArt.neonIntensity),
        riftFracture: clamp(pa.riftFracture, 0.05, 1, safeRift),
        silhouettePose: validPoses.includes(pa.silhouettePose) ? pa.silhouettePose : fallbackCutscene.plotArt.silhouettePose,
        motifGlyph: validMotifs.includes(pa.motifGlyph) ? pa.motifGlyph : fallbackCutscene.plotArt.motifGlyph,
      },
      source: 'GEMINI_NARRATIVE',
    });
  } catch {
    return res.json(fallbackCutscene);
  }
});

// AI 1960s Vancouver Level Designer Route (Manifests Physical Strides & Platforms)
app.post('/api/level-designer', async (req: Request, res: Response) => {
  const {
    prompt = 'Rain-slick 1966 Chinatown neon streetcar intersection with jumpable pagoda awnings',
    district = 'Pender Street & Gastown',
    year = 1966,
    weather = 'NEON_MIST',
    strideFocus = 'BALANCED',
    chaosLevel = 0.65,
  } = req.body || {};

  const safeYear = Math.max(1960, Math.min(1969, Math.round(Number(year) || 1966)));
  const safeChaos = Math.max(0.2, Math.min(1.0, Number(chaosLevel) || 0.65));

  const fallbackDesign = {
    id: `vancouver_ai_${safeYear}`,
    title: `${district} (${safeYear})`,
    year: safeYear,
    district,
    eraAtmosphere: `Rain-gleaming ${safeYear} Vancouver brick, BC Electric trolley wires, and glowing marquee neon.`,
    weather: ['RAIN', 'FOG', 'DRIZZLE', 'NEON_MIST', 'STORM'].includes(weather) ? weather : 'NEON_MIST',
    skyPalette: ['#070b18', '#141933', '#271a38'],
    accentColor: strideFocus === 'AERIAL' ? '#38bdf8' : strideFocus === 'HAZARD' ? '#ec4899' : '#f59e0b',
    landmarkType: district.toLowerCase().includes('china')
      ? 'CHINATOWN_GATE'
      : district.toLowerCase().includes('bridge') || district.toLowerCase().includes('lions')
      ? 'LIONS_GATE_BRIDGE'
      : district.toLowerCase().includes('creek') || district.toLowerCase().includes('dock')
      ? 'FALSE_CREEK_DOCKS'
      : district.toLowerCase().includes('viaduct')
      ? 'GEORGIA_VIADUCT'
      : 'GASTOWN_STEAM_CLOCK',
    strides: [
      {
        id: 'ai_stride_1',
        name: 'Trolley Rail Springboard',
        startX: 90,
        endX: 280,
        effect: strideFocus === 'SPEED' ? 'SLICK_SPEED' : 'TRAM_SPRING',
        intensity: Number((1.1 + safeChaos * 0.25).toFixed(2)),
        color: '#38bdf8',
        label: 'TRAM SPRING · +22% JUMP',
      },
      {
        id: 'ai_stride_2',
        name: 'Pender Neon Puddle',
        startX: 365,
        endX: 605,
        effect: strideFocus === 'AERIAL' ? 'GRAVITY_RIFT' : 'NEON_SHOCK',
        intensity: Number((1.05 + safeChaos * 0.3).toFixed(2)),
        color: '#ec4899',
        label: strideFocus === 'AERIAL' ? 'SKY RIFT · LOW-G' : 'NEON SURGE · +15% SPEC',
      },
      {
        id: 'ai_stride_3',
        name: 'Harbor Oil Slick',
        startX: 685,
        endX: 880,
        effect: 'SLICK_SPEED',
        intensity: Number((1.12 + safeChaos * 0.2).toFixed(2)),
        color: '#f59e0b',
        label: 'RAIN SLICK · +28% DASH',
      },
    ],
    platforms: [
      {
        id: 'ai_plat_1',
        label: 'BC ELECTRIC TRAM #14',
        x: 150,
        y: 330,
        width: 165,
        style: 'STREETCAR',
      },
      {
        id: 'ai_plat_2',
        label: 'PENDER NEON AWNING',
        x: 615,
        y: 305,
        width: 165,
        style: 'NEON_AWNING',
      },
    ],
    hazards: ['Slick cobblestone tram tracks', 'High-voltage neon sign arcs', 'Harbor fog visibility dip'],
    architectNotes: `AI Architect manifested 3 spatial strides across ${district} (${safeYear}) with ${strideFocus} verticality and 2 elevated jump decks.`,
    source: 'BLUEPRINT_1960S',
  };

  if (!ai) {
    return res.json(fallbackDesign);
  }

  try {
    const designerPrompt = `You are an AI fighting-game level architect creating a playable 1960s Vancouver arena stage.
Design Request: "${prompt}"
District: ${district}
Era Year: ${safeYear} (strictly 1960-1969 Vancouver)
Preferred Weather: ${weather}
Stride Philosophy: ${strideFocus}
Intensity Factor: ${safeChaos.toFixed(2)}

Arena coordinate constraints:
- Playable ground X is 40 to 920. Ground floor Y is 445.
- Manifest 3 distinct "strides" (non-overlapping floor zones inside x 55..905, each 150-240px wide) using ONLY effects:
  SLICK_SPEED, TRAM_SPRING, FOG_CLOAK, NEON_SHOCK, TIMBER_BOUNCE, GRAVITY_RIFT.
- Manifest 2 elevated walkable platforms at y between 280 and 345, x between 95 and 680, width between 135 and 185, using styles:
  STREETCAR, BRICK_BALCONY, STEEL_TRUSS, NEON_AWNING, TIMBER_PIER.
- Use authentic 1960s Vancouver motifs (Lions Gate Bridge, Gastown brick & steam clock, Pender St Chinatown neon, False Creek cedar docks, Georgia Viaduct, BC Electric streetcars).`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: designerPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            eraAtmosphere: { type: Type.STRING },
            weather: { type: Type.STRING },
            skyTop: { type: Type.STRING },
            skyMid: { type: Type.STRING },
            skyBottom: { type: Type.STRING },
            accentColor: { type: Type.STRING },
            landmarkType: { type: Type.STRING },
            architectNotes: { type: Type.STRING },
            hazards: { type: Type.ARRAY, items: { type: Type.STRING } },
            strides: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  startX: { type: Type.INTEGER },
                  endX: { type: Type.INTEGER },
                  effect: { type: Type.STRING },
                  intensity: { type: Type.NUMBER },
                  color: { type: Type.STRING },
                  label: { type: Type.STRING },
                },
                required: ['name', 'startX', 'endX', 'effect', 'intensity', 'color', 'label'],
              },
            },
            platforms: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  x: { type: Type.INTEGER },
                  y: { type: Type.INTEGER },
                  width: { type: Type.INTEGER },
                  style: { type: Type.STRING },
                },
                required: ['label', 'x', 'y', 'width', 'style'],
              },
            },
          },
          required: [
            'title',
            'eraAtmosphere',
            'weather',
            'skyTop',
            'skyMid',
            'skyBottom',
            'accentColor',
            'landmarkType',
            'architectNotes',
            'hazards',
            'strides',
            'platforms',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    const clamp = (v: number, min: number, max: number, fb: number) =>
      typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fb;

    const validEffects = ['SLICK_SPEED', 'TRAM_SPRING', 'FOG_CLOAK', 'NEON_SHOCK', 'TIMBER_BOUNCE', 'GRAVITY_RIFT'];
    const validWeathers = ['RAIN', 'FOG', 'DRIZZLE', 'NEON_MIST', 'STORM'];
    const validLandmarks = ['LIONS_GATE_BRIDGE', 'GASTOWN_STEAM_CLOCK', 'CHINATOWN_GATE', 'FALSE_CREEK_DOCKS', 'GEORGIA_VIADUCT'];
    const validStyles = ['STREETCAR', 'BRICK_BALCONY', 'STEEL_TRUSS', 'NEON_AWNING', 'TIMBER_PIER'];
    const isHex = (c: any) => /^#[0-9a-fA-F]{6}$/.test(String(c || ''));

    // Normalize non-overlapping strides cleanly within 50..910
    const rawStrides = Array.isArray(parsed.strides) && parsed.strides.length > 0 ? parsed.strides.slice(0, 4) : fallbackDesign.strides;
    const strides = rawStrides.map((s: any, idx: number) => {
      const slotStart = 55 + idx * 215;
      const sx = Math.round(clamp(s.startX, Math.max(45, slotStart - 20), Math.min(720, slotStart + 35), slotStart));
      const ex = Math.round(clamp(s.endX, sx + 120, Math.min(915, sx + 225), Math.min(915, sx + 185)));
      return {
        id: `ai_stride_${idx + 1}`,
        name: String(s.name || `Vancouver Stride ${idx + 1}`).slice(0, 32),
        startX: sx,
        endX: ex,
        effect: validEffects.includes(s.effect) ? s.effect : fallbackDesign.strides[idx % 3].effect,
        intensity: Number(clamp(s.intensity, 0.75, 1.5, 1.15).toFixed(2)),
        color: isHex(s.color) ? s.color : fallbackDesign.strides[idx % 3].color,
        label: String(s.label || '1960s STRIDE').slice(0, 26).toUpperCase(),
      };
    });

    const rawPlatforms = Array.isArray(parsed.platforms) && parsed.platforms.length > 0 ? parsed.platforms.slice(0, 3) : fallbackDesign.platforms;
    const platforms = rawPlatforms.map((p: any, idx: number) => {
      const defaultX = idx === 0 ? 130 : idx === 1 ? 610 : 390;
      const px = Math.round(clamp(p.x, 80, 720, defaultX));
      const pw = Math.round(clamp(p.width, 130, 195, 160));
      const py = Math.round(clamp(p.y, 275, 345, idx === 0 ? 330 : 298));
      return {
        id: `ai_plat_${idx + 1}`,
        label: String(p.label || '1960s DECK').slice(0, 24).toUpperCase(),
        x: px,
        y: py,
        width: pw,
        style: validStyles.includes(p.style) ? p.style : idx === 0 ? 'STREETCAR' : 'NEON_AWNING',
      };
    });

    return res.json({
      id: `vancouver_ai_${Date.now()}`,
      title: String(parsed.title || fallbackDesign.title).slice(0, 44),
      year: safeYear,
      district,
      eraAtmosphere: String(parsed.eraAtmosphere || fallbackDesign.eraAtmosphere),
      weather: validWeathers.includes(parsed.weather) ? parsed.weather : fallbackDesign.weather,
      skyPalette: [
        isHex(parsed.skyTop) ? parsed.skyTop : fallbackDesign.skyPalette[0],
        isHex(parsed.skyMid) ? parsed.skyMid : fallbackDesign.skyPalette[1],
        isHex(parsed.skyBottom) ? parsed.skyBottom : fallbackDesign.skyPalette[2],
      ],
      accentColor: isHex(parsed.accentColor) ? parsed.accentColor : fallbackDesign.accentColor,
      landmarkType: validLandmarks.includes(parsed.landmarkType) ? parsed.landmarkType : fallbackDesign.landmarkType,
      strides,
      platforms,
      hazards: Array.isArray(parsed.hazards) && parsed.hazards.length > 0 ? parsed.hazards.slice(0, 4).map(String) : fallbackDesign.hazards,
      architectNotes: String(parsed.architectNotes || fallbackDesign.architectNotes),
      source: 'GEMINI_ARCHITECT',
    });
  } catch {
    return res.json(fallbackDesign);
  }
});

// Preload list endpoint
app.get('/api/voice/phrases', (_req: Request, res: Response) => {
  res.json({ phrases: Object.keys(MK_PHRASES) });
});

async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    // Mount Vite middleware in development
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true' ? { server: httpServer } : false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static production build
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[MK 4-Zone Fighter] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
