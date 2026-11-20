/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Fighter } from './game/FighterEngine';
import { StageRenderer } from './game/StageRenderer';
import { ParticleSystem, BloodMode } from './game/ParticleSystem';
import { RetroAudio } from './audio/RetroSynth';
import { ArcadeHUD } from './components/ArcadeHUD';
import { TouchController, ThumbstickDirection } from './components/TouchController';
import { MoveListModal } from './components/MoveListModal';
import { CharacterSelectModal } from './components/CharacterSelectModal';
import { SettingsModal } from './components/SettingsModal';
import { RosterSelectScreen } from './components/RosterSelectScreen';
import { CamoIntroScreen } from './components/CamoIntroScreen';
import { MechanicsModal } from './components/MechanicsModal';
import { MovieTransitionOverlay } from './components/MovieTransitionOverlay';
import { SwarmArchitectModal } from './components/SwarmArchitectModal';
import { StoryModeOverlay } from './components/StoryModeOverlay';
import { LevelDesignerModal } from './components/LevelDesignerModal';
import { MeshLabOverlay } from './components/MeshLabOverlay';
import { BloodyBannerOverlay, BloodyBannerKind } from './components/BloodyBannerOverlay';
import { SpriteSheetEngine } from './game/SpriteSheetEngine';
import { AudioEventBus } from './audio/AudioEventBus';
import { getActiveSwarmPatch, applySwarmPatch } from './game/MovementMatrix';
import { RollbackManager } from './game/RollbackManager';
import { resolveCombat } from './game/CombatResolver';
import { updateAI } from './game/AIController';
import { LinearKombatGauge } from './game/SpatialCombatSystem';
import {
  advanceStoryAfterVictory,
  computeStoryPerkBonuses,
  createInitialStoryState,
  fetchStoryCutscene,
  getStoryNodeById,
} from './game/StoryEngine';
import {
  executeFatalityChoreography,
  getFatalityDistanceInfo,
  FinisherKind,
} from './game/FatalityEngine';
import {
  drawTrainingScreenTelemetry,
} from './game/TrainingOverlay';
import {
  CharacterId,
  StageId,
  GameMatchState,
  CombatMove,
  TowerTier,
  SwarmSynthesisPatch,
  LinearGaugeState,
  StoryCampaignState,
  StoryChoice,
  StoryNode,
  VancouverLevelDesign,
} from './types/fighter';
import { SIX_BUTTON_MOVES, CHARACTERS, TOWERS } from './game/constants';

export default function App() {
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [matchState, setMatchState] = useState<GameMatchState>('CAMO_INTRO');
  const [round, setRound] = useState<number>(1);
  const [p1RoundWins, setP1RoundWins] = useState<number>(0);
  const [cpuRoundWins, setCpuRoundWins] = useState<number>(0);
  const [matchTimer, setMatchTimer] = useState<number>(99);
  const [bannerText, setBannerText] = useState<string>('');

  const [p1CharId, setP1CharId] = useState<CharacterId>('scorpion');
  const [p1PartnerId, setP1PartnerId] = useState<CharacterId>('johnny');
  const [p1PartnerHp, setP1PartnerHp] = useState<number>(250);
  const [p1PartnerStamina, setP1PartnerStamina] = useState<number>(100);
  const [p1PartnerSuper, setP1PartnerSuper] = useState<number>(0);

  const [cpuCharId, setCpuCharId] = useState<CharacterId>('subzero');
  const [cpuPartnerId, setCpuPartnerId] = useState<CharacterId>('liukang');
  const [cpuPartnerHp, setCpuPartnerHp] = useState<number>(250);
  const [cpuPartnerStamina, setCpuPartnerStamina] = useState<number>(100);
  const [cpuPartnerSuper, setCpuPartnerSuper] = useState<number>(0);

  const [isTowerMode, setIsTowerMode] = useState<boolean>(true);
  const [selectedTower, setSelectedTower] = useState<TowerTier>('MASTER');
  const [towerFloor, setTowerFloor] = useState<number>(1);
  const towerFloorRef = useRef<number>(1);

  const [activeStage, setActiveStage] = useState<StageId>('THE_PIT');
  const activeStageRef = useRef<StageId>('THE_PIT');
  const [bloodMode, setBloodMode] = useState<BloodMode>('RED');
  const [autoBattle] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [crtFilter, setCrtFilter] = useState<boolean>(true);
  const [practiceMode, setPracticeMode] = useState<boolean>(false);
  const [showHitboxes, setShowHitboxes] = useState<boolean>(false);
  const showHitboxesRef = useRef<boolean>(false);
  const [is3DMode, setIs3DMode] = useState<boolean>(true);
  const is3DModeRef = useRef<boolean>(true);
  const heldKeysRef = useRef<{ left: boolean; right: boolean; down: boolean }>({ left: false, right: false, down: false });
  const touchUpPrevRef = useRef<boolean>(false);

  useEffect(() => {
    is3DModeRef.current = is3DMode;
  }, [is3DMode]);

  useEffect(() => {
    showHitboxesRef.current = showHitboxes;
  }, [showHitboxes]);

  useEffect(() => {
    activeStageRef.current = activeStage;
  }, [activeStage]);

  const [isMoveListOpen, setIsMoveListOpen] = useState<boolean>(false);
  const [isCharSelectOpen, setIsCharSelectOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isMechanicsModalOpen, setIsMechanicsModalOpen] = useState<boolean>(false);
  const [isSwarmModalOpen, setIsSwarmModalOpen] = useState<boolean>(false);
  const [isLevelDesignerOpen, setIsLevelDesignerOpen] = useState<boolean>(false);
  const [isMeshLabOpen, setIsMeshLabOpen] = useState<boolean>(false);
  const isMeshLabOpenRef = useRef<boolean>(false);
  useEffect(() => {
    isMeshLabOpenRef.current = isMeshLabOpen;
  }, [isMeshLabOpen]);
  const [, setSwarmPatch] = useState<SwarmSynthesisPatch>(() => getActiveSwarmPatch());
  const fatalityStartTimeRef = useRef<number>(0);
  const fatalityTimeoutsRef = useRef<number[]>([]);
  const lifecycleTimeoutsRef = useRef<number[]>([]);
  const touchDirPrevRef = useRef<string>('NEUTRAL');
  const superTimeoutsRef = useRef<number[]>([]);
  const rollbackMgrRef = useRef<RollbackManager>(new RollbackManager(45));

  const linearGaugeRef = useRef<LinearKombatGauge>(new LinearKombatGauge());
  const [linearGaugeState, setLinearGaugeState] = useState<LinearGaugeState>(() =>
    linearGaugeRef.current.getState()
  );

  const [storyCampaign, setStoryCampaign] = useState<StoryCampaignState>(() =>
    createInitialStoryState()
  );
  const storyCampaignRef = useRef<StoryCampaignState>(storyCampaign);
  useEffect(() => {
    storyCampaignRef.current = storyCampaign;
  }, [storyCampaign]);

  const isStoryMatchRef = useRef<boolean>(false);
  const activeStoryChoiceRef = useRef<StoryChoice | null>(null);
  const [isStoryCutsceneLoading, setIsStoryCutsceneLoading] = useState<boolean>(false);

  const clearLifecycleTimeouts = () => {
    lifecycleTimeoutsRef.current.forEach((id) => clearTimeout(id));
    lifecycleTimeoutsRef.current = [];
  };

  const scheduleLifecycleTimeout = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    lifecycleTimeoutsRef.current.push(id);
    return id;
  };

  const handleApplySwarmPatch = (nextPatch: SwarmSynthesisPatch) => {
    const applied = applySwarmPatch(nextPatch);
    setSwarmPatch(applied);
    RetroAudio.setDspProfile(applied.dspProfile);
  };

  // Full-Screen ResizeObserver + Sprite Sheet Preload
  useEffect(() => {
    SpriteSheetEngine.preloadAll();
    const syncCanvasSize = () => {
      const container = workspaceRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      const w = Math.max(320, Math.floor(container.clientWidth));
      const h = Math.max(240, Math.floor(container.clientHeight));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    syncCanvasSize();
    const ro = new ResizeObserver(syncCanvasSize);
    if (workspaceRef.current) {
      ro.observe(workspaceRef.current);
    }
    window.addEventListener('resize', syncCanvasSize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', syncCanvasSize);
    };
  }, []);

  // Prompt 4: Minimal High-Contrast Combo Notification (Upper-Left / Upper-Right, fades over 1.5s)
  const [comboBanner, setComboBanner] = useState<{
    target: 'P1' | 'CPU' | null;
    hits: number;
    dmg: number;
    visible: boolean;
  }>({ target: null, hits: 0, dmg: 0, visible: false });
  const comboFadeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const p1ComboDmgRef = useRef<number>(0);
  const cpuComboDmgRef = useRef<number>(0);

  const triggerComboNotification = (target: 'P1' | 'CPU', hits: number, totalDmg: number) => {
    const cappedHits = Math.min(3, hits);
    if (cappedHits < 2) return;
    if (comboFadeTimerRef.current) {
      clearTimeout(comboFadeTimerRef.current);
    }
    setComboBanner({ target, hits: cappedHits, dmg: totalDmg, visible: true });

    comboFadeTimerRef.current = setTimeout(() => {
      setComboBanner((prev) => ({ ...prev, visible: false }));
    }, 1500);
  };

  // Sovereign Edition Cinematic Callout Overlay state (strictly transparent backdrop — zero yellow screen)
  const [cinematicFx, setCinematicFx] = useState<{
    text: string;
    color: string;
    glow: string;
    bg: string;
    visible: boolean;
  }>({
    text: '',
    color: '',
    glow: '',
    bg: 'transparent',
    visible: false,
  });

  const triggerCinematicFx = (text: string, color: string, glow: string, _bg: string, duration = 850) => {
    setCinematicFx({ text, color, glow, bg: 'transparent', visible: true });
    setTimeout(() => {
      setCinematicFx((prev) => ({ ...prev, visible: false }));
    }, duration);
  };

  // Dripping Arterial Blood FIGHT! / FINISH HIM! / FATALITY! Banner
  const [bloodyBanner, setBloodyBanner] = useState<{ kind: BloodyBannerKind | null; sublabel?: string }>({
    kind: null,
  });
  const bloodyBannerTimerRef = useRef<number | null>(null);

  const triggerBloodyBanner = useCallback((kind: BloodyBannerKind | null, durationMs = 1200, sublabel?: string) => {
    if (bloodyBannerTimerRef.current !== null) {
      window.clearTimeout(bloodyBannerTimerRef.current);
      bloodyBannerTimerRef.current = null;
    }
    if (!kind) {
      setBloodyBanner({ kind: null });
      return;
    }
    setBloodyBanner({ kind, sublabel });
    if (durationMs > 0) {
      bloodyBannerTimerRef.current = window.setTimeout(() => {
        setBloodyBanner({ kind: null });
        bloodyBannerTimerRef.current = null;
      }, durationMs);
    }
  }, []);

  // Reactive state ticker for HUD updates
  const [, setHudTick] = useState<number>(0);

  // Core Game Engine References (Closer arcade starting positions)
  const p1Ref = useRef<Fighter>(new Fighter('scorpion', 310, 1, true));
  const cpuRef = useRef<Fighter>(new Fighter('subzero', 630, -1, false));
  const stageRendererRef = useRef<StageRenderer>(new StageRenderer());
  const particleSystemRef = useRef<ParticleSystem>(new ParticleSystem());

  // Cinematic Slow-Motion Time Scale (Uppercuts, Back Spinning Kicks, Triple Combo Finishers)
  const timeScaleRef = useRef({
    current: 1.0,
    target: 1.0,
    timer: 0,
  });

  const triggerSlowMo = (scale: number, durationSec: number, zoomBoost = 0) => {
    timeScaleRef.current.target = scale;
    timeScaleRef.current.timer = Math.max(timeScaleRef.current.timer, durationSec);
    if (zoomBoost > 0) {
      cameraRef.current.hitZoom = Math.min(0.65, cameraRef.current.hitZoom + zoomBoost);
    }
  };

  // Cinematic Camera (Zoomed closer onto characters for sharp 64-bit detail)
  const cameraRef = useRef({
    x: 470,
    y: 355,
    zoom: 1.16,
    hitZoom: 0,
    shake: 0,
  });

  // Handle Audio activation on first interaction
  const ensureAudio = () => {
    RetroAudio.enableAudio();
  };

  // Keyboard controls listener (Prompt 1: Strict 6-Button System & Shortcuts)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isMeshLabOpenRef.current) return;
      ensureAudio();
      const p1 = p1Ref.current;
      const cpu = cpuRef.current;

      // Training Hitbox Overlay Toggle [B] / [F9] & GGPO Rollback Rewind [R]
      if (e.code === 'KeyB' || e.code === 'F9') {
        setShowHitboxes((prev) => !prev);
        return;
      }
      if (e.code === 'KeyR' && showHitboxesRef.current && matchState === 'FIGHTING') {
        if (rollbackMgrRef.current.rollbackFrames(15, p1, cpu)) {
          triggerCinematicFx('⏪ ROLLBACK -15f', '#38bdf8', '#0284c7', 'rgba(14, 165, 233, 0.35)', 480);
        }
        return;
      }

      // Lock controls during intro, VS shutter, super cutscene, round end, fatality, story screens, or match over
      if (
        matchState === 'INTRO_LOCK' ||
        matchState === 'VS_SPLASH' ||
        matchState === 'SUPER_CINEMATIC' ||
        matchState === 'ROUND_KNOCKOUT' ||
        matchState === 'FATALITY_PLAYING' ||
        matchState === 'MATCH_OVER' ||
        matchState === 'STORY_MAP' ||
        matchState === 'STORY_CUTSCENE'
      ) {
        return;
      }

      // During FINISH HIM, support Omni-Engine distance-gated Fatalities & Stage Fatality
      if (matchState === 'FINISH_HIM') {
        const distInfo = getFatalityDistanceInfo(p1, cpu);
        if (e.code === 'KeyU') {
          if (distInfo.category === 'CLOSE') {
            executeFatalitySequence('PRIMARY_FATALITY');
          } else {
            setBannerText('TOO FAR FOR SPINE RIP! MOVE TO CLOSE RANGE');
          }
          return;
        }
        if (e.code === 'Digit4' || e.code === 'Numpad4') {
          if (distInfo.category === 'SWEEP') {
            executeFatalitySequence('TOASTY_FATALITY');
          } else {
            setBannerText('OUT OF RANGE FOR TOASTY! MOVE TO SWEEP RANGE');
          }
          return;
        }
        if (e.code === 'KeyI') {
          executeFatalitySequence('STAGE_FATALITY');
          return;
        }
        if (e.code === 'Space' || e.code === 'KeyF' || e.code === 'KeyE' || e.code === 'KeyQ') {
          const autoKind: FinisherKind = distInfo.isNearStageEdge
            ? 'STAGE_FATALITY'
            : distInfo.category === 'SWEEP'
            ? 'TOASTY_FATALITY'
            : 'PRIMARY_FATALITY';
          executeFatalitySequence(autoKind);
          return;
        }
        // Allow walking into Fatality range during FINISH HIM
        if (e.code === 'KeyA') {
          heldKeysRef.current.left = true;
          p1.setMoveIntent((heldKeysRef.current.right ? 1 : 0) - 1);
        }
        if (e.code === 'KeyD') {
          heldKeysRef.current.right = true;
          p1.setMoveIntent(1 - (heldKeysRef.current.left ? 1 : 0));
        }
        return;
      }

      // D-PAD / Smooth Horizontal & Air-Drift Movement + Authentic MK Motion History
      const syncKeyboardMove = () => {
        const dir = (heldKeysRef.current.right ? 1 : 0) - (heldKeysRef.current.left ? 1 : 0);
        p1.setMoveIntent(dir);
      };
      if (e.code === 'KeyA') {
        heldKeysRef.current.left = true;
        if (!e.repeat) p1.stateMachine.inputBuffer.pushDirection(p1.facing === 1 ? 'B' : 'F');
        syncKeyboardMove();
      }
      if (e.code === 'KeyD') {
        heldKeysRef.current.right = true;
        if (!e.repeat) p1.stateMachine.inputBuffer.pushDirection(p1.facing === 1 ? 'F' : 'B');
        syncKeyboardMove();
      }
      if (e.code === 'KeyW') {
        const dir = (heldKeysRef.current.right ? 1 : 0) - (heldKeysRef.current.left ? 1 : 0);
        if (!e.repeat) p1.stateMachine.inputBuffer.pushDirection('U');
        if (p1.isGrounded) {
          p1.performJump(dir, e.shiftKey, heldKeysRef.current.down);
        } else if (!e.repeat) {
          p1.triggerAirDrift(dir);
        }
      }
      if (e.code === 'KeyS') {
        heldKeysRef.current.down = true;
        if (!e.repeat) p1.stateMachine.inputBuffer.pushDirection('D');
        if (!p1.isGrounded) {
          p1.triggerFastFall();
        } else {
          p1.state = 'CROUCH';
        }
      }

      // MK Run Sprint (Shift) & Ninja Back/Forward Dash (Z / C)
      if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat) {
        handleP1Attack(SIX_BUTTON_MOVES.RUN);
      }
      if (e.code === 'KeyC') {
        p1.dash(p1.facing);
      }
      if (e.code === 'KeyZ') {
        p1.dash((p1.facing === 1 ? -1 : 1) as 1 | -1);
      }

      // Close Unblockable MK Throw (G)
      if (e.code === 'KeyG' && !e.repeat) {
        handleP1Attack(SIX_BUTTON_MOVES.THROW);
      }

      // Precision Guard & Parry Activation (Hold to guard, tap right on impact to parry)
      if (e.code === 'KeyL' || e.code === 'KeyO') {
        handleTouchGuard(true);
      }

      // 8-BUTTON CORE ATTACK SYSTEM
      // 1. LP: Light Punch (U) - Individual / Triple Combo Starter / Jump Punch in air
      if (e.code === 'KeyU') {
        if (!p1.isGrounded) {
          handleP1Attack(SIX_BUTTON_MOVES.JUMP_PUNCH);
        } else {
          handleP1Attack(SIX_BUTTON_MOVES.LP);
        }
      }

      // 2. HP: Heavy Punch (I) (▼ + HP = Uppercut, In Air = Jump Punch)
      if (e.code === 'KeyI') {
        if (!p1.isGrounded) {
          handleP1Attack(SIX_BUTTON_MOVES.JUMP_PUNCH);
        } else if (p1.state === 'CROUCH') {
          handleP1Attack(SIX_BUTTON_MOVES.UPPERCUT);
        } else {
          handleP1Attack(SIX_BUTTON_MOVES.HP);
        }
      }

      // 3. LK: Light Kick (J) (▼ + LK = Crouch Low Kick, In Air = Jump Kick)
      if (e.code === 'KeyJ') {
        if (!p1.isGrounded) {
          handleP1Attack(SIX_BUTTON_MOVES.JUMP_KICK);
        } else if (p1.state === 'CROUCH') {
          handleP1Attack(SIX_BUTTON_MOVES.CROUCH_LK);
        } else {
          handleP1Attack(SIX_BUTTON_MOVES.LK);
        }
      }

      // 4. HK: Back Spinning Kick (K) (▼ + HK = Sweep, In Air = Jump Kick)
      if (e.code === 'KeyK') {
        if (!p1.isGrounded) {
          handleP1Attack(SIX_BUTTON_MOVES.JUMP_KICK);
        } else if (p1.state === 'CROUCH') {
          handleP1Attack(SIX_BUTTON_MOVES.SWEEP);
        } else {
          handleP1Attack(SIX_BUTTON_MOVES.HK);
        }
      }

      // 5. SUPER / FATALITY: Space or F
      if (e.code === 'Space' || e.code === 'KeyF') {
        if (p1.superMeter >= 100) {
          handleP1Attack(p1.def.superMove);
        }
      }

      // 6. Z-Lane Sidestep (Q) & Breaker (X)
      if (e.code === 'KeyQ' && !e.repeat) {
        handleP1Sidestep();
      }
      if (e.code === 'KeyX' && !e.repeat) {
        handleP1Breaker();
      }

      // 7. SPEC: Signature Specials (1, 2, 3)
      if (e.code === 'Digit1' && p1.def.specials[0]) handleP1Attack(p1.def.specials[0]);
      if (e.code === 'Digit2' && p1.def.specials[1]) handleP1Attack(p1.def.specials[1]);
      if (e.code === 'Digit3' && p1.def.specials[2]) handleP1Attack(p1.def.specials[2]);

      // 8. TAG: Tag Team Swap (T)
      if (e.code === 'KeyT') {
        handleTagSwap();
      }

      // 9. UPPERCUT Launcher: Y
      if (e.code === 'KeyY') {
        handleP1Attack(SIX_BUTTON_MOVES.UPPERCUT);
      }

      // 10. SWEEP KICK Low Trip: H or P
      if (e.code === 'KeyH' || e.code === 'KeyP') {
        handleP1Attack(SIX_BUTTON_MOVES.SWEEP);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isMeshLabOpenRef.current) return;
      const p1 = p1Ref.current;
      if (e.code === 'KeyA') {
        heldKeysRef.current.left = false;
        p1.setMoveIntent((heldKeysRef.current.right ? 1 : 0) - (heldKeysRef.current.left ? 1 : 0));
      }
      if (e.code === 'KeyD') {
        heldKeysRef.current.right = false;
        p1.setMoveIntent((heldKeysRef.current.right ? 1 : 0) - (heldKeysRef.current.left ? 1 : 0));
      }
      if (e.code === 'KeyS') {
        heldKeysRef.current.down = false;
        if (p1.state === 'CROUCH') p1.state = 'IDLE';
      }
      if (e.code === 'KeyL' || e.code === 'KeyO') {
        handleTouchGuard(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [matchState]);

  // Update Character selections
  const changeP1Character = (id: CharacterId) => {
    setP1CharId(id);
    p1Ref.current.setCharacter(id);
    resetEntireMatch(id, cpuCharId);
  };

  const changeCpuCharacter = (id: CharacterId) => {
    setCpuCharId(id);
    cpuRef.current.setCharacter(id);
    resetEntireMatch(p1CharId, id);
  };

  // Multi-Beat Super Blow Choreography (Flash-Freeze -> Barrage Sparks -> Slow-Mo Finisher)
  const executeMultiBeatSuper = (atk: Fighter, def: Fighter, superMove: CombatMove) => {
    superTimeoutsRef.current.forEach((id) => clearTimeout(id));
    superTimeoutsRef.current = [];

    const choreo = getActiveSwarmPatch().superChoreography;
    const freezeMs = Math.max(200, choreo.freezeMs);
    const barrageHits = Math.max(1, choreo.barrageHits);

    updateMatchState('SUPER_CINEMATIC');
    RetroAudio.playSuperActivate(atk.x + 28, atk.y + 30);
    AudioEventBus.playCharacterActionVoice(atk.def.id, 'taunt');
    cameraRef.current.hitZoom = Math.min(0.65, Math.max(0.28, choreo.cameraPeakZoom - 1.12));
    cameraRef.current.shake = 14;
    particleSystemRef.current.emitSonicWave(atk.x + 28, atk.y + 38, atk.facing, 18);
    triggerCinematicFx(
      `${atk.def.name.toUpperCase()} · ${choreo.tagline}`,
      '#f8fafc',
      '#ef4444',
      'transparent',
      freezeMs + barrageHits * 110 + 260
    );

    // Beat 2: Flash-step rush barrage
    for (let i = 0; i < barrageHits; i++) {
      const tId = window.setTimeout(() => {
        if (matchStateRef.current !== 'SUPER_CINEMATIC') return;
        atk.facing = def.x >= atk.x ? 1 : -1;
        atk.x = Math.max(50, Math.min(860, def.x - atk.facing * 68));
        const sparkX = def.x + 28;
        const sparkY = def.y + 34;
        particleSystemRef.current.emitHitSparks(sparkX, sparkY, atk.def.accentColor, 14);
        particleSystemRef.current.emitBlood(sparkX, sparkY, atk.facing, 10, 445);
        RetroAudio.playComboHit(i + 1, sparkX, sparkY);
        cameraRef.current.shake = Math.min(24, cameraRef.current.shake + 7);
        def.hitFlashFrames = 5;
        def.hitFlashColor = atk.def.accentColor;
        def.hp = Math.max(1, def.hp - Math.max(2, Math.floor(superMove.damage * 0.08)));
      }, freezeMs + i * 105);
      superTimeoutsRef.current.push(tId);
    }

    // Beat 3: Final Super Blow Release + Cinematic Slow-Mo
    const endTimer = window.setTimeout(() => {
      if (matchStateRef.current !== 'SUPER_CINEMATIC') return;
      updateMatchState('FIGHTING');
      atk.executeMove(superMove, def, particleSystemRef.current);
      triggerSlowMo(choreo.finisherSlowMoScale, 0.52, 0.44);
    }, freezeMs + barrageHits * 105 + 70);
    superTimeoutsRef.current.push(endTimer);
  };

  // P1 Player attack handler (Decoupled Individual Hits & Triple Combos + Directional MK Specials + Bullseye Bonus)
  const handleP1Attack = (move: CombatMove, isBullseye = false) => {
    ensureAudio();
    if (matchStateRef.current !== 'FIGHTING') return;
    const p1 = p1Ref.current;
    const cpu = cpuRef.current;

    let activeMove = move;
    // Match classic MK directional command specials (e.g. ◀ ◀ + LP) when grounded button pressed
    if (
      p1.isGrounded &&
      (move.id === 'LP' || move.id === 'HP' || move.id === 'LK' || move.id === 'HK')
    ) {
      const motionSpecial = p1.stateMachine.matchDirectionalSpecial(p1.def, move.id);
      if (motionSpecial) {
        activeMove = motionSpecial;
      }
    }

    // Dense Focal Point Sweet-Spot Power Boost (+35% designated strike power)
    if (isBullseye) {
      activeMove = {
        ...activeMove,
        damage: Math.floor(activeMove.damage * 1.35),
      };
      p1.superMeter = Math.min(100, p1.superMeter + 10);
      particleSystemRef.current.emitSonicWave(p1.x + 28, p1.y + 40, p1.facing, 10);
      triggerCinematicFx('⚡ BULLSEYE CRITICAL! +35% POWER', '#f8fafc', '#38bdf8', 'transparent', 650);
    }

    // Route 100% Super Meter attacks into Multi-Beat Cinematic Super Choreography
    if (activeMove.isSuper && p1.superMeter >= 100) {
      executeMultiBeatSuper(p1, cpu, activeMove);
      return;
    }

    const executed = p1.executeMove(activeMove, cpu, particleSystemRef.current);
    if (!executed) return;

    // Triple Combo Finisher Callout
    if (p1.lastAttackWasTripleFinisher && p1.activeTripleCombo) {
      triggerCinematicFx(
        `⚡ TRIPLE COMBO · ${p1.activeTripleCombo.name}`,
        p1.activeTripleCombo.badgeColor,
        p1.activeTripleCombo.badgeColor,
        'transparent',
        650
      );
    }

    // Minimal clean special/super callouts for core 4 fighters
    if (activeMove.id === 'SCORPION_SPEAR') {
      triggerCinematicFx('GET OVER HERE!', '#ffaa00', '#ff4400', 'transparent', 650);
    } else if (activeMove.id === 'SUBZERO_ICEBALL') {
      triggerCinematicFx('DEEP FREEZE', '#38bdf8', '#0284c7', 'transparent', 650);
    } else if (activeMove.id === 'LIUKANG_BICYCLE_KICK') {
      triggerCinematicFx('DRAGON FURY', '#ef4444', '#dc2626', 'transparent', 650);
    } else if (activeMove.id === 'JOHNNY_SHADOW_KICK') {
      triggerCinematicFx('SHADOW KICK!', '#22c55e', '#16a34a', 'transparent', 650);
    } else if (activeMove.isSuper) {
      triggerCinematicFx(`${p1.def.name.toUpperCase()} SUPER!`, '#f8fafc', '#ef4444', 'transparent');
    }

    // Dynamic character action voice lines
    if (activeMove.id.includes('SPEAR')) {
      AudioEventBus.playCharacterActionVoice(p1.def.id, 'spear');
    } else if (activeMove.id.includes('TELEPORT')) {
      AudioEventBus.playCharacterActionVoice(p1.def.id, 'teleport');
    } else if (activeMove.isSuper) {
      AudioEventBus.playCharacterActionVoice(p1.def.id, 'taunt');
    }
  };

  const lastTagTimeRef = useRef<number>(0);
  const handleTagSwap = () => {
    const now = performance.now();
    if (now - lastTagTimeRef.current < 1200) return;
    if (matchState !== 'FIGHTING') return;
    if (p1PartnerHp <= 0) return;

    ensureAudio();
    const p1 = p1Ref.current;
    const oldP1Id = p1.def.id;
    const oldHp = p1.hp;
    const oldStamina = p1.stamina;
    const oldSuper = p1.superMeter;

    const partnerDef = CHARACTERS[p1PartnerId] || CHARACTERS['johnny'];
    p1.swapWithPartner(partnerDef, p1PartnerHp, p1PartnerStamina, p1PartnerSuper, particleSystemRef.current);
    particleSystemRef.current.emitSonicWave(p1.x, p1.y, p1.facing, 12);

    const nextLeadId = p1PartnerId;
    setP1CharId(nextLeadId);
    setP1PartnerId(oldP1Id);
    setP1PartnerHp(Math.max(1, Math.round(oldHp)));
    setP1PartnerStamina(Math.round(oldStamina));
    setP1PartnerSuper(Math.round(oldSuper));

    lastTagTimeRef.current = now;
    const partnerName = partnerDef.name;
    triggerCinematicFx(`${partnerName.toUpperCase()} TAGS IN!`, '#38bdf8', '#0284c7', 'rgba(14, 165, 233, 0.4)', 750);
  };

  const cpuLastTagRef = useRef<number>(0);
  const triggerCpuTagSwap = () => {
    const now = performance.now();
    if (now - cpuLastTagRef.current < 6000) return;
    if (matchState !== 'FIGHTING') return;
    if (cpuPartnerHp <= 30) return;

    const cpu = cpuRef.current;
    const oldCpuId = cpu.def.id;
    const oldHp = cpu.hp;
    const oldStamina = cpu.stamina;
    const oldSuper = cpu.superMeter;

    const cpuPartnerDef = CHARACTERS[cpuPartnerId] || CHARACTERS['liukang'];
    cpu.swapWithPartner(cpuPartnerDef, cpuPartnerHp, cpuPartnerStamina, cpuPartnerSuper, particleSystemRef.current);
    particleSystemRef.current.emitSonicWave(cpu.x, cpu.y, cpu.facing, 12);

    const nextCpuLead = cpuPartnerId;
    setCpuCharId(nextCpuLead);
    setCpuPartnerId(oldCpuId);
    setCpuPartnerHp(Math.max(1, Math.round(oldHp)));
    setCpuPartnerStamina(Math.round(oldStamina));
    setCpuPartnerSuper(Math.round(oldSuper));

    cpuLastTagRef.current = now;
    const cpuName = CHARACTERS[nextCpuLead]?.name || nextCpuLead.toUpperCase();
    triggerCinematicFx(`CPU: ${cpuName.toUpperCase()} TAG!`, '#f97316', '#c2410c', 'rgba(249, 115, 22, 0.4)', 750);
  };

  const handleP1Sidestep = () => {
    ensureAudio();
    if (matchStateRef.current !== 'FIGHTING') return;
    const p1 = p1Ref.current;
    if (p1.sidestep()) {
      RetroAudio.playWhoosh('dash', p1.x, p1.y);
      linearGaugeRef.current.applyReactiveEvent('P1', 'STRIDE_SYNERGY', 0.4);
      setLinearGaugeState(linearGaugeRef.current.getState());
    }
  };

  const handleP1Breaker = () => {
    ensureAudio();
    if (matchStateRef.current !== 'FIGHTING') return;
    const p1 = p1Ref.current;
    const cpu = cpuRef.current;
    if (!linearGaugeRef.current.canUseBreaker('P1')) return;
    if (p1.triggerBreaker(cpu, particleSystemRef.current)) {
      linearGaugeRef.current.applyReactiveEvent('P1', 'BREAKER');
      setLinearGaugeState(linearGaugeRef.current.getState());
      cameraRef.current.shake = 14;
      triggerCinematicFx('⚡ KOMBAT BREAKER!', '#38bdf8', '#0284c7', 'rgba(14, 165, 233, 0.45)', 700);
    }
  };

  const handleStoryVictoryAdvance = () => {
    const campaign = storyCampaignRef.current;
    const completedId = campaign.currentNodeId;
    if (completedId) {
      const updated = advanceStoryAfterVictory(campaign, completedId, activeStoryChoiceRef.current);
      setStoryCampaign(updated);
      storyCampaignRef.current = updated;
      const node = getStoryNodeById(completedId);
      setBannerText(
        node?.isFinale
          ? '1969 SKY-RIFT SEALED · VANCOUVER SAVED!'
          : `${node?.title.toUpperCase() || 'CHAPTER'} CONQUERED · PLOT ART EVOLVED!`
      );
    }
    activeStoryChoiceRef.current = null;
    updateMatchState('STORY_MAP');
  };

  const handleSelectStoryNode = async (node: StoryNode) => {
    setIsStoryCutsceneLoading(true);
    setStoryCampaign((prev) => ({
      ...prev,
      currentNodeId: node.id,
      pendingCutscene: null,
    }));
    updateMatchState('STORY_CUTSCENE');
    const cutscene = await fetchStoryCutscene(node, storyCampaignRef.current, p1CharId);
    setStoryCampaign((prev) => ({
      ...prev,
      currentNodeId: node.id,
      pendingCutscene: cutscene,
      artEvolutionHistory:
        prev.artEvolutionHistory[prev.artEvolutionHistory.length - 1]?.chapterId === cutscene.plotArt.chapterId
          ? prev.artEvolutionHistory
          : [...prev.artEvolutionHistory, cutscene.plotArt],
    }));
    setIsStoryCutsceneLoading(false);
  };

  const handleLaunchStoryFight = (choice?: StoryChoice | null) => {
    const node = getStoryNodeById(storyCampaignRef.current.currentNodeId);
    if (!node) return;
    clearLifecycleTimeouts();
    activeStoryChoiceRef.current = choice || null;
    isStoryMatchRef.current = true;
    setIsTowerMode(false);
    setPracticeMode(false);
    setActiveStage(node.stageId);
    activeStageRef.current = node.stageId;
    setCpuCharId(node.opponentId);
    cpuRef.current.setCharacter(node.opponentId);
    setCpuPartnerId(node.opponentPartnerId);
    setP1PartnerHp(250);
    setCpuPartnerHp(250);
    if (choice) {
      setStoryCampaign((prev) => ({
        ...prev,
        riftCorruption: Math.max(0.05, Math.min(1, prev.riftCorruption + choice.riftShift)),
      }));
    }
    updateMatchState('VS_SPLASH');
  };

  const handleDeployCustomStage = (design: VancouverLevelDesign) => {
    setActiveStage('CUSTOM_VANCOUVER_AI');
    activeStageRef.current = 'CUSTOM_VANCOUVER_AI';
    setIsLevelDesignerOpen(false);
    triggerCinematicFx(`VANCOUVER ${design.year} · ${design.district.toUpperCase()}`, '#a855f7', '#7e22ce', 'rgba(88, 28, 135, 0.5)', 1400);
    if (matchStateRef.current === 'CAMO_INTRO' || matchStateRef.current === 'STORY_MAP') {
      isStoryMatchRef.current = false;
      updateMatchState('ROSTER_SELECT');
    }
  };

  // Handle Tower progression when match is won
  const handleTowerVictoryOrAdvance = () => {
    const currentTowerDef = TOWERS[selectedTower] || TOWERS['MASTER'];
    const currentFloor = towerFloorRef.current;
    const totalFloors = currentTowerDef.fighters.length;

    if (currentFloor < totalFloors) {
      const nextFloor = currentFloor + 1;
      towerFloorRef.current = nextFloor;
      setTowerFloor(nextFloor);
      const nextCpuId = currentTowerDef.fighters[nextFloor - 1];
      setCpuCharId(nextCpuId);
      cpuRef.current.setCharacter(nextCpuId);

      const nextPartnerId = currentTowerDef.fighters[Math.min(totalFloors - 1, nextFloor % totalFloors)];
      setCpuPartnerId(nextPartnerId);
      setCpuPartnerHp(250);

      // Restore some HP to partner as reward
      setP1PartnerHp((prev) => Math.min(250, prev + 100));

      setBannerText(`FLOOR ${currentFloor} CONQUERED! OPPONENT ${nextFloor}/${totalFloors}: ${CHARACTERS[nextCpuId].name.toUpperCase()}`);
      RetroAudio.announce('CHOOSE_YOUR_DESTINY');
      triggerCinematicFx(`FLOOR ${nextFloor}: ${CHARACTERS[nextCpuId].name.toUpperCase()}`, '#fbbf24', '#f59e0b', 'rgba(245, 158, 11, 0.55)', 2200);

      scheduleLifecycleTimeout(() => {
        startRound(1, 0, 0);
      }, 2600);
    } else {
      // Completed all floors! Defeated the summit boss (AIMIX on Master Tower)!
      updateMatchState('TOWER_VICTORY');
      setBannerText(`TOWER CONQUERED! ${CHARACTERS[p1CharId].name.toUpperCase()} IS SUPREME CHAMPION!`);
      RetroAudio.announce('FLAWLESS_VICTORY');
      triggerCinematicFx('SUPREME CHAMPION!', '#fbbf24', '#ea580c', 'rgba(245, 158, 11, 0.75)', 4000);
    }
  };

  // Elaborate Cinematic Multi-Phase Fatality & Stage Fatality Execution Sequence
  const executeFatalitySequence = (kind: FinisherKind = 'PRIMARY_FATALITY') => {
    ensureAudio();
    fatalityTimeoutsRef.current.forEach((id) => clearTimeout(id));
    fatalityTimeoutsRef.current = [];

    const p1 = p1Ref.current;
    const cpu = cpuRef.current;
    fatalityStartTimeRef.current = performance.now();
    updateMatchState('FATALITY_PLAYING');
    triggerBloodyBanner(
      'FATALITY',
      3800,
      kind === 'TOASTY_FATALITY' ? 'TOASTY HELLFIRE' : `${p1.def.name.toUpperCase()} WINS`
    );

    fatalityTimeoutsRef.current = executeFatalityChoreography(
      p1,
      cpu,
      particleSystemRef.current,
      kind,
      activeStage,
      {
        onPhaseBanner: (text) => setBannerText(text),
        onCinematicFx: (text, color, glow, bg, duration) =>
          triggerCinematicFx(text, color, glow, bg, duration),
        onCameraImpulse: (hitZoom, shake) => {
          cameraRef.current.hitZoom = hitZoom;
          cameraRef.current.shake = shake;
        },
        onComplete: () => {
          AudioEventBus.announcePostMatchOutcome(p1.def.id, p1.hp >= p1.maxHp, true);
          setP1RoundWins((prev) => {
            const nextWins = prev + 1;
            if (isStoryMatchRef.current) {
              handleStoryVictoryAdvance();
            } else if (isTowerMode) {
              handleTowerVictoryOrAdvance();
            } else {
              updateMatchState('ROSTER_SELECT');
              resetEntireMatch(p1CharId, cpuCharId);
            }
            return nextWins;
          });
        },
      }
    );
  };

  // Smooth Analog 8-Way Vector Thumbstick Input + Double-Arc Air Drift
  const handleTouchMove = (normX: number, normY: number, dir?: ThumbstickDirection) => {
    if (matchState !== 'FIGHTING' && matchState !== 'FINISH_HIM') return;
    ensureAudio();
    const p1 = p1Ref.current;

    if (dir) {
      if (dir.zone !== touchDirPrevRef.current) {
        touchDirPrevRef.current = dir.zone;
        if (dir.left) p1.stateMachine.inputBuffer.pushDirection(p1.facing === 1 ? 'B' : 'F');
        else if (dir.right) p1.stateMachine.inputBuffer.pushDirection(p1.facing === 1 ? 'F' : 'B');
        if (dir.down) p1.stateMachine.inputBuffer.pushDirection('D');
        else if (dir.up) p1.stateMachine.inputBuffer.pushDirection('U');
      }

      if (dir.zone === 'NEUTRAL') {
        p1.setMoveIntent(0);
        touchUpPrevRef.current = false;
        if (p1.state === 'CROUCH') p1.state = 'IDLE';
        return;
      }

      // Continuous progressive horizontal intent from analog normX
      p1.setMoveIntent(Math.abs(normX) >= 0.14 ? normX : 0);

      // Vertical component (Up / Jump + once-per-jump rising-edge Air Drift or Down / Crouch)
      const upPressed = dir.up;
      if (upPressed && p1.isGrounded) {
        p1.performJump(dir.left ? -1 : dir.right ? 1 : 0);
      } else if (upPressed && !touchUpPrevRef.current && !p1.isGrounded) {
        p1.triggerAirDrift(dir.left ? -1 : dir.right ? 1 : 0);
      } else if (dir.down) {
        p1.state = 'CROUCH';
      } else if (p1.state === 'CROUCH' && !dir.down) {
        p1.state = 'IDLE';
      }
      touchUpPrevRef.current = upPressed;
    } else {
      p1.setMoveIntent(Math.abs(normX) >= 0.18 ? normX : 0);

      const upPressed = normY < -0.4;
      if (upPressed && p1.isGrounded) {
        p1.performJump(normX < -0.25 ? -1 : normX > 0.25 ? 1 : 0);
      } else if (upPressed && !touchUpPrevRef.current && !p1.isGrounded) {
        p1.triggerAirDrift(normX < -0.25 ? -1 : normX > 0.25 ? 1 : 0);
      } else if (normY > 0.4) {
        p1.state = 'CROUCH';
      } else if (p1.state === 'CROUCH') {
        p1.state = 'IDLE';
      }
      touchUpPrevRef.current = upPressed;
    }
  };

  const handleTouchGuard = (isGuarding: boolean) => {
    if (matchState !== 'FIGHTING') return;
    ensureAudio();
    const p1 = p1Ref.current;
    if (isGuarding) {
      p1.activateGuard();
    } else {
      p1.releaseGuard();
    }
  };

  // Refs to avoid stale closures in high-frequency gameLoop
  const matchStateRef = useRef<GameMatchState>('INTRO_LOCK');
  const roundRef = useRef<number>(1);
  const p1RoundWinsRef = useRef<number>(0);
  const cpuRoundWinsRef = useRef<number>(0);
  const announcedRoundRef = useRef<number>(0);

  // Sync state helpers
  const updateMatchState = (s: GameMatchState) => {
    matchStateRef.current = s;
    setMatchState(s);
  };

  const updateP1Wins = (w: number) => {
    p1RoundWinsRef.current = w;
    setP1RoundWins(w);
  };

  const updateCpuWins = (w: number) => {
    cpuRoundWinsRef.current = w;
    setCpuRoundWins(w);
  };

  const updateRound = (r: number) => {
    roundRef.current = r;
    setRound(r);
  };

  // Round Sequence: 2-Second Intro Delay & Say Round Number strictly ONCE at beginning of each round
  const startRound = useCallback((roundNum: number, currentP1Wins: number, currentCpuWins: number) => {
    clearLifecycleTimeouts();
    updateRound(roundNum);
    updateP1Wins(currentP1Wins);
    updateCpuWins(currentCpuWins);
    setMatchTimer(99);
    updateMatchState('INTRO_LOCK');
    const directive = getActiveSwarmPatch().menuDirective;
    setBannerText(`ROUND ${roundNum} · ${directive.roundStartChant}`);

    // Apply Story Chronicle perk modifiers & initialize Linear Fighting Gauge
    const perks = isStoryMatchRef.current
      ? computeStoryPerkBonuses(storyCampaignRef.current.unlockedPerks)
      : { gaugeGainMult: 1, strideBonusMult: 1, damageReduction: 0, extraBreakers: 0, jumpBoostMult: 1, bonusStartGauge: 0 };

    p1Ref.current.jumpBonusMult = perks.jumpBoostMult;
    p1Ref.current.strideBonusMult = perks.strideBonusMult;
    linearGaugeRef.current.reset(perks.bonusStartGauge);
    for (let b = 0; b < perks.extraBreakers; b++) {
      linearGaugeRef.current.grantExtraBreaker('P1');
    }
    setLinearGaugeState(linearGaugeRef.current.getState());

    // Reset fighter positions & combat stats (Closer arcade framing)
    p1Ref.current.resetState(310, 1);
    cpuRef.current.resetState(630, -1);
    rollbackMgrRef.current.reset();
    timeScaleRef.current = { current: 1.0, target: 1.0, timer: 0 };
    particleSystemRef.current.clearAll();

    // Announce Round + Pre-Match Native MK Taunt Exchange ONCE per round
    if (announcedRoundRef.current !== roundNum) {
      announcedRoundRef.current = roundNum;
      AudioEventBus.announcePreMatchExchange(p1Ref.current.def.id, cpuRef.current.def.id, roundNum);
    }

    // Brief Round Intro: lock inputs briefly, then start FIGHT! crisply
    scheduleLifecycleTimeout(() => {
      if (matchStateRef.current !== 'INTRO_LOCK') return;
      updateMatchState('FIGHTING');
      setBannerText('');
      triggerBloodyBanner('FIGHT', 900);
      AudioEventBus.announceMatchEvent('FIGHT');
    }, 650);
  }, [triggerBloodyBanner]);

  const handleVsTransitionComplete = useCallback(() => {
    startRound(1, 0, 0);
  }, [startRound]);

  // Reset entire tournament
  const resetEntireMatch = (p1Id = p1CharId, cpuId = cpuCharId) => {
    clearLifecycleTimeouts();
    p1Ref.current.setCharacter(p1Id);
    cpuRef.current.setCharacter(cpuId);
    p1Ref.current.resetState(310, 1);
    cpuRef.current.resetState(630, -1);
    linearGaugeRef.current.reset(0);
    setLinearGaugeState(linearGaugeRef.current.getState());
    timeScaleRef.current = { current: 1.0, target: 1.0, timer: 0 };
    announcedRoundRef.current = 0;
    updateP1Wins(0);
    updateCpuWins(0);
    updateRound(1);
  };

  // Main Game Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let tickCount = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = (currentTime: number) => {
      const dt = Math.min(0.033, (currentTime - lastTime) / 1000);
      lastTime = currentTime;
      tickCount++;

      const p1 = p1Ref.current;
      const cpu = cpuRef.current;
      const particles = particleSystemRef.current;
      const camera = cameraRef.current;
      const currentMatchState = matchStateRef.current;

      // Update match timer every 60 frames
      if (tickCount % 60 === 0 && currentMatchState === 'FIGHTING') {
        setMatchTimer((prev) => {
          if (prev <= 1) {
            if (p1.hp >= cpu.hp) {
              setBannerText(`${p1.def.name} WINS BY TIMEOUT!`);
              AudioEventBus.announcePostMatchOutcome(p1.def.id, p1.hp >= p1.maxHp, false);
              if (p1RoundWinsRef.current + 1 >= 2) {
                updateMatchState('MATCH_OVER');
                scheduleLifecycleTimeout(() => {
                  if (isStoryMatchRef.current) {
                    handleStoryVictoryAdvance();
                  } else if (isTowerMode) {
                    handleTowerVictoryOrAdvance();
                  } else {
                    updateMatchState('ROSTER_SELECT');
                    resetEntireMatch(p1CharId, cpuCharId);
                  }
                }, 3200);
              } else {
                updateMatchState('ROUND_KNOCKOUT');
                cpu.triggerKnockout();
                const nextWins = p1RoundWinsRef.current + 1;
                updateP1Wins(nextWins);
                scheduleLifecycleTimeout(() => startRound(roundRef.current + 1, nextWins, cpuRoundWinsRef.current), 2500);
              }
            } else {
              setBannerText(`${cpu.def.name} WINS BY TIMEOUT!`);
              AudioEventBus.announcePostMatchOutcome(cpu.def.id, cpu.hp >= cpu.maxHp, false);
              if (cpuRoundWinsRef.current + 1 >= 2) {
                updateMatchState('MATCH_OVER');
                scheduleLifecycleTimeout(() => {
                  if (isStoryMatchRef.current) {
                    updateMatchState('STORY_MAP');
                  } else {
                    updateMatchState('ROSTER_SELECT');
                  }
                  resetEntireMatch(p1CharId, cpuCharId);
                }, 3200);
              } else {
                updateMatchState('ROUND_KNOCKOUT');
                p1.triggerKnockout();
                const nextWins = cpuRoundWinsRef.current + 1;
                updateCpuWins(nextWins);
                scheduleLifecycleTimeout(() => startRound(roundRef.current + 1, p1RoundWinsRef.current, nextWins), 2500);
              }
            }
            return 0;
          }
          return prev - 1;
        });
      }

      // Check Practice Mode
      if (practiceMode && cpu.hp < 30) {
        cpu.hp = 100;
        cpu.stamina = 100;
        cpu.guardMeter = 100;
        for (const k of ['HEAD', 'TORSO', 'LEFT_LIMBS', 'RIGHT_LIMBS'] as const) {
          cpu.zones[k].hp = 100;
        }
      }

      // Check Round Knockout & Match Point
      if (currentMatchState === 'FIGHTING') {
        if (cpu.hp <= 0 && !practiceMode) {
          cpu.hp = 0;
          if (p1RoundWinsRef.current + 1 >= 2) {
            // Match Point Victory! Trigger FINISH HIM state (3.5s window for Fatality)
            cpu.state = 'DIZZY';
            cpu.dizzyTimer = 210;
            updateMatchState('FINISH_HIM');
            setBannerText('');
            triggerBloodyBanner('FINISH_HIM', 3400, 'TAP FATALITY OR MOVE IN CLOSE');
            RetroAudio.announce('FINISH_HIM');
          } else {
            // Round 1 Knockout: Defeated fighter falls into realistic ragdoll pose
            cpu.triggerKnockout();
            updateMatchState('ROUND_KNOCKOUT');
            const nextWins = p1RoundWinsRef.current + 1;
            updateP1Wins(nextWins);
            setBannerText(`${p1.def.name} WINS ROUND ${roundRef.current}!`);
            AudioEventBus.announcePostMatchOutcome(p1.def.id, p1.hp >= p1.maxHp, false);
            scheduleLifecycleTimeout(() => {
              startRound(roundRef.current + 1, nextWins, cpuRoundWinsRef.current);
            }, 2600);
          }
        } else if (p1.hp <= 0 && !practiceMode) {
          p1.hp = 0;
          p1.triggerKnockout();
          if (cpuRoundWinsRef.current + 1 >= 2) {
            // CPU Match Point Victory
            updateMatchState('MATCH_OVER');
            const nextWins = cpuRoundWinsRef.current + 1;
            updateCpuWins(nextWins);
            setBannerText(`${cpu.def.name} WINS THE TOURNAMENT!`);
            AudioEventBus.announcePostMatchOutcome(cpu.def.id, cpu.hp >= cpu.maxHp, false);
            scheduleLifecycleTimeout(() => {
              if (isStoryMatchRef.current) {
                updateMatchState('STORY_MAP');
              } else {
                updateMatchState('ROSTER_SELECT');
              }
              resetEntireMatch(p1CharId, cpuCharId);
            }, 3500);
          } else {
            // CPU Round 1 Knockout
            updateMatchState('ROUND_KNOCKOUT');
            const nextWins = cpuRoundWinsRef.current + 1;
            updateCpuWins(nextWins);
            setBannerText(`${cpu.def.name} WINS ROUND ${roundRef.current}!`);
            AudioEventBus.announcePostMatchOutcome(cpu.def.id, cpu.hp >= cpu.maxHp, false);
            scheduleLifecycleTimeout(() => {
              startRound(roundRef.current + 1, p1RoundWinsRef.current, nextWins);
            }, 2600);
          }
        }
      }

      // FINISH HIM timeout: falls down if no fatality executed
      if (currentMatchState === 'FINISH_HIM') {
        if (cpu.dizzyTimer <= 0) {
          cpu.triggerKnockout();
          triggerBloodyBanner(null);
          updateMatchState('MATCH_OVER');
          const nextWins = p1RoundWinsRef.current + 1;
          updateP1Wins(nextWins);
          setBannerText(`${p1.def.name} WINS!`);
          AudioEventBus.announcePostMatchOutcome(p1.def.id, p1.hp >= p1.maxHp, false);
          scheduleLifecycleTimeout(() => {
            if (isStoryMatchRef.current) {
              handleStoryVictoryAdvance();
            } else if (isTowerMode) {
              handleTowerVictoryOrAdvance();
            } else {
              updateMatchState('ROSTER_SELECT');
              resetEntireMatch(p1CharId, cpuCharId);
            }
          }, 3200);
        }
      }

      // CPU AI Behavior (Active only during FIGHTING)
      if (currentMatchState === 'FIGHTING') {
        updateAI(tickCount, p1, cpu, particles, autoBattle, practiceMode, linearGaugeRef.current);
        if (tickCount % 90 === 0 && cpu.hp < 75 && cpuPartnerHp > 50 && !practiceMode) {
          triggerCpuTagSwap();
        }
      } else {
        cpu.vx = 0;
      }

      // Step Cinematic Slow-Motion Time Scale
      const ts = timeScaleRef.current;
      if (ts.timer > 0) {
        ts.timer = Math.max(0, ts.timer - dt);
        if (ts.timer === 0) {
          ts.target = 1.0;
        }
      }
      ts.current += (ts.target - ts.current) * Math.min(1, dt * 14);
      const simDt = dt * ts.current;

      // Fighter physics, 1960s Vancouver terrain strides & platforms, pushbox separation (fixed 960 world span)
      if (currentMatchState !== 'SUPER_CINEMATIC') {
        p1.update(simDt, cpu, particles, 960, 445, activeStageRef.current);
        cpu.update(simDt, p1, particles, 960, 445, activeStageRef.current);
        p1.resolvePushbox(cpu, 960);
      }

      // Save deterministic Rollback Snapshot in active combat
      if (currentMatchState === 'FIGHTING' || currentMatchState === 'FINISH_HIM') {
        rollbackMgrRef.current.saveState(p1, cpu);
      }

      // Step Linear Fighting Gauge Decay & Resolve Reactive Combat Collisions
      if (currentMatchState === 'FIGHTING') {
        linearGaugeRef.current.stepDecay(simDt);
        const perks = isStoryMatchRef.current
          ? computeStoryPerkBonuses(storyCampaignRef.current.unlockedPerks)
          : { gaugeGainMult: 1, damageReduction: 0 };
        const combatHooks = {
          p1ComboDmgRef,
          cpuComboDmgRef,
          linearGauge: linearGaugeRef.current,
          gaugeGainMult: perks.gaugeGainMult,
          p1DamageReduction: perks.damageReduction,
          onTriggerSlowMo: triggerSlowMo,
          onTriggerCinematicFx: triggerCinematicFx,
          onTriggerComboNotification: triggerComboNotification,
        };
        resolveCombat(p1, cpu, particles, camera, combatHooks);
        resolveCombat(cpu, p1, particles, camera, combatHooks);
      }

      // Update Particle engine with simDt
      particles.update(simDt);

      // Update Smooth Steady Fighting Camera
      const dist = Math.abs(p1.x - cpu.x);
      const distRatio = Math.max(0, Math.min(1, 1 - (dist - 85) / 460));
      const baseZoom = 1.08 + distRatio * 0.22;

      let targetZoom = baseZoom + camera.hitZoom;
      let midX = (p1.x + cpu.x) / 2 + 28;
      let midY = (p1.y + cpu.y) / 2 + 20;
      let panSpeed = 0.1;
      let zoomSpeed = 0.08;

      // 2. Multi-phase cinematic fatality sequence zoom cuts
      if (currentMatchState === 'FATALITY_PLAYING') {
        const fatElapsed = performance.now() - fatalityStartTimeRef.current;
        zoomSpeed = 0.14;
        panSpeed = 0.14;

        if (fatElapsed < 1400) {
          // Phase 1: Dread approach (1.6x zoom)
          targetZoom = 1.60 + camera.hitZoom;
          midX = (p1.x + cpu.x) / 2 + 28;
          midY = (p1.y + cpu.y) / 2 + 10;
        } else if (fatElapsed < 2800) {
          // Phase 2: Brutal Strike / Primary Impale (snap zoom to 2.25x on impact point)
          targetZoom = 2.25 + camera.hitZoom;
          midX = cpu.x + 28;
          midY = cpu.y + 15;
        } else if (fatElapsed < 4200) {
          // Phase 3: Bone Shatter & Agonizing Fracture (zoom 2.45x)
          targetZoom = 2.45 + camera.hitZoom;
          midX = cpu.x + 28;
          midY = cpu.y + 18;
        } else if (fatElapsed < 5600) {
          // Phase 4: Iconic Decapitation / Chopped Body Part (extreme snap zoom to 2.65x into flying head/limb)
          targetZoom = 2.65 + camera.hitZoom;
          midX = cpu.x + 28;
          midY = cpu.y - 12;
        } else if (fatElapsed < 7000) {
          // Phase 5: Final Body Drop to Floor (2.05x zoom down tracking torso crashing into floor & blood pool)
          targetZoom = 2.05 + camera.hitZoom;
          midX = cpu.x + 28;
          midY = 445; // Ground level impact
        } else {
          // Phase 6: Final panoramic pull back for victory stance
          targetZoom = 0.82;
          midX = p1.x + 28;
          midY = p1.y + 15;
          zoomSpeed = 0.05;
        }
      }

      camera.x += (midX - camera.x) * panSpeed;
      camera.y += (midY - camera.y) * panSpeed;
      camera.zoom += (targetZoom - camera.zoom) * zoomSpeed;
      camera.hitZoom *= 0.90;
      RetroAudio.setListenerPosition(camera.x, camera.y);

      let shakeX = 0;
      let shakeY = 0;
      if (camera.shake > 0) {
        shakeX = (Math.random() - 0.5) * camera.shake;
        shakeY = (Math.random() - 0.5) * camera.shake;
        camera.shake *= 0.85;
        if (camera.shake < 0.2) camera.shake = 0;
      }

      // RENDER
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Multi-Layered Arena Sky, Moon, Parallax Mountains (Screen Space)
      stageRendererRef.current.drawBackground(ctx, activeStage, canvas.width, canvas.height, camera.x);

      // Theatrical stage dimming & dramatic spotlight during FINISH HIM, FATALITY, & SUPER CINEMATIC
      if (
        currentMatchState === 'FINISH_HIM' ||
        currentMatchState === 'FATALITY_PLAYING' ||
        currentMatchState === 'SUPER_CINEMATIC'
      ) {
        const isSuperCinematic = currentMatchState === 'SUPER_CINEMATIC';
        ctx.save();
        ctx.fillStyle = isSuperCinematic ? 'rgba(0, 0, 0, 0.78)' : 'rgba(0, 0, 0, 0.72)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const spotGrad = ctx.createRadialGradient(
          canvas.width / 2,
          canvas.height * 0.62,
          30,
          canvas.width / 2,
          canvas.height * 0.62,
          360
        );
        spotGrad.addColorStop(0, isSuperCinematic ? 'rgba(56, 189, 248, 0.16)' : 'rgba(239, 68, 68, 0.16)');
        spotGrad.addColorStop(0.5, isSuperCinematic ? 'rgba(15, 23, 42, 0.35)' : 'rgba(127, 29, 29, 0.35)');
        spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0.88)');
        ctx.fillStyle = spotGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }

      // Responsive Full-Screen Viewport Scale (Enlarged closer framing on fighters)
      const viewportScale = Math.max(0.55, Math.min(canvas.width / 680, canvas.height / 440));
      const totalZoom = camera.zoom * viewportScale;

      // 2. Camera Transformations (World Playfield Space)
      ctx.save();
      ctx.translate(canvas.width / 2 + shakeX, canvas.height * 0.62 + shakeY);
      ctx.scale(totalZoom, totalZoom);
      ctx.translate(-camera.x, -camera.y);

      // 3. Draw Stage Arena: Full-Span Bridge, Pillars, Spikes, Torches & Dynamic Cast Shadows
      stageRendererRef.current.drawArena(ctx, activeStage, canvas.width, canvas.height, p1, cpu, 445, is3DModeRef.current);

      // 4. Draw Persistent Ground Blood Stains & Particles
      particles.draw(ctx);

      // 5. Draw Fighters with Crisp Unarmed Combat Sprites
      p1.draw(ctx, false);
      cpu.draw(ctx, false);

      ctx.restore();

      // 6. Concussion Screen Vignette if Player is heavily concussed
      if (p1.getStatus().isConcussed) {
        ctx.save();
        const vignette = ctx.createRadialGradient(
          canvas.width / 2,
          canvas.height / 2,
          canvas.width * 0.35,
          canvas.width / 2,
          canvas.height / 2,
          canvas.width * 0.55
        );
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(1, 'rgba(239, 68, 68, 0.3)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }

      // 7. Omni-Engine Training Hitbox & GGPO Telemetry Screen Overlay
      drawTrainingScreenTelemetry(
        ctx,
        canvas.width,
        canvas.height,
        p1,
        cpu,
        rollbackMgrRef.current.stats,
        currentMatchState,
        showHitboxesRef.current
      );

      // Trigger HUD & Linear Gauge sync every few frames
      if (tickCount % 3 === 0) {
        setHudTick(tickCount);
        setLinearGaugeState(linearGaugeRef.current.getState());
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [activeStage, autoBattle, practiceMode]);

  const totalTowerFloors = (TOWERS[selectedTower] || TOWERS.MASTER).fighters.length;

  const finalTowerBossName =
    CHARACTERS[TOWERS[selectedTower].fighters[TOWERS[selectedTower].fighters.length - 1]]?.name ||
    'SCORPION';

  return (
    <div
      onClick={ensureAudio}
      className="relative flex flex-col w-screen h-[100dvh] bg-[#050508] text-slate-100 overflow-hidden select-none touch-none"
    >
      {/* 1. Ultra-Slim Micro HUD + Linear Fighting Gauge */}
      <ArcadeHUD
        p1={p1Ref.current}
        cpu={cpuRef.current}
        matchState={matchState}
        round={round}
        matchTimer={matchTimer}
        isMuted={isMuted}
        p1RoundWins={p1RoundWins}
        cpuRoundWins={cpuRoundWins}
        comboHits={Math.min(3, p1Ref.current.comboHits)}
        comboDamage={p1ComboDmgRef.current}
        activeMechId={p1Ref.current.activeMechId}
        is3DMode={is3DMode}
        showHitboxes={showHitboxes}
        isTowerMode={isTowerMode}
        towerFloor={towerFloor}
        totalTowerFloors={totalTowerFloors}
        linearGaugeState={linearGaugeState}
        canUseBreaker={linearGaugeRef.current.canUseBreaker('P1')}
        onTriggerBreaker={handleP1Breaker}
        onToggle3DMode={() => {
          RetroAudio.playSelect();
          setIs3DMode((prev) => !prev);
        }}
        onToggleHitboxes={() => {
          RetroAudio.playSelect();
          setShowHitboxes((prev) => !prev);
        }}
        onToggleMute={() => {
          const next = !isMuted;
          setIsMuted(next);
          RetroAudio.setMuted(next);
        }}
        onOpenCharSelect={() => {
          isStoryMatchRef.current = false;
          updateMatchState('ROSTER_SELECT');
        }}
        onOpenMoveList={() => setIsMoveListOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenMechanics={() => setIsMechanicsModalOpen(true)}
        onOpenSwarm={() => setIsSwarmModalOpen(true)}
        onOpenLevelDesigner={() => setIsLevelDesignerOpen(true)}
        onOpenMeshLab={() => setIsMeshLabOpen(true)}
      />

      {/* 2. Full-Screen Arena Viewport with Floating Multi-Touch Controls */}
      <main
        ref={workspaceRef}
        className={`relative flex-1 w-full min-h-0 overflow-hidden bg-[#050508] ${
          crtFilter ? 'crt-overlay' : ''
        }`}
      >
        {/* 2D Combat Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block"
        />

        {/* Combo Notification (Upper Left / Upper Right) */}
        {comboBanner.target === 'P1' && (
          <div
            className={`absolute top-3 left-3 z-20 pointer-events-none transition-opacity duration-[1200ms] ease-out ${
              comboBanner.visible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="px-2.5 py-1 bg-black/85 border border-red-600 rounded shadow-[0_0_12px_rgba(220,38,38,0.6)]">
              <span className="font-mono text-xs font-black text-amber-300 tracking-wider uppercase tabular-nums">
                {comboBanner.hits} HIT · {comboBanner.dmg} DMG
              </span>
            </div>
          </div>
        )}

        {comboBanner.target === 'CPU' && (
          <div
            className={`absolute top-3 right-3 z-20 pointer-events-none transition-opacity duration-[1200ms] ease-out ${
              comboBanner.visible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="px-2.5 py-1 bg-black/85 border border-red-600 rounded shadow-[0_0_12px_rgba(220,38,38,0.6)]">
              <span className="font-mono text-xs font-black text-red-300 tracking-wider uppercase tabular-nums">
                {comboBanner.hits} HIT · {comboBanner.dmg} DMG
              </span>
            </div>
          </div>
        )}

        {/* Dripping Arterial Blood FIGHT! / FINISH HIM! / FATALITY! Overlay */}
        <BloodyBannerOverlay kind={bloodyBanner.kind} sublabel={bloodyBanner.sublabel} />

        {/* Match Callout Banner (ROUND 1 / WINNER) */}
        {bannerText && !bloodyBanner.kind && matchState !== 'CAMO_INTRO' && matchState !== 'ROSTER_SELECT' && (
          <div className="absolute inset-x-0 top-14 sm:top-16 z-20 flex justify-center pointer-events-none px-4">
            <span className="font-kombat font-black text-2xl sm:text-4xl tracking-widest text-amber-300 text-center uppercase drop-shadow-[0_4px_16px_rgba(220,38,38,0.95)]">
              {bannerText}
            </span>
          </div>
        )}

        {/* Cinematic Super / Special FX Banner (Transparent Backdrop — Zero Yellow Screen Wash) */}
        <div
          className={`absolute inset-x-0 top-24 sm:top-28 pointer-events-none z-20 flex items-center justify-center transition-all duration-200 ${
            cinematicFx.visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
          style={{ background: 'transparent' }}
        >
          <span
            className="font-kombat font-black text-xl sm:text-3xl tracking-widest text-center px-4 py-1 rounded-lg bg-black/75 border border-white/10 uppercase select-none drop-shadow-2xl"
            style={{
              color: cinematicFx.color,
              textShadow: `0 0 18px ${cinematicFx.glow}`,
            }}
          >
            {cinematicFx.text}
          </span>
        </div>

        {/* Floating Full-Screen Multi-Touch Arcade Controls */}
        {matchState !== 'CAMO_INTRO' &&
          matchState !== 'ROSTER_SELECT' &&
          matchState !== 'STORY_MAP' &&
          matchState !== 'STORY_CUTSCENE' && (
            <TouchController
              p1={p1Ref.current}
              cpu={cpuRef.current}
              onAttack={handleP1Attack}
              onMoveInput={handleTouchMove}
              onGuard={handleTouchGuard}
              onExecuteFatality={() => {
                const distInfo = getFatalityDistanceInfo(p1Ref.current, cpuRef.current);
                const autoKind: FinisherKind = distInfo.isNearStageEdge
                  ? 'STAGE_FATALITY'
                  : distInfo.category === 'SWEEP'
                  ? 'TOASTY_FATALITY'
                  : 'PRIMARY_FATALITY';
                executeFatalitySequence(autoKind);
              }}
              onRun={() => handleP1Attack(SIX_BUTTON_MOVES.RUN)}
              onThrow={() => handleP1Attack(SIX_BUTTON_MOVES.THROW)}
              onTag={handleTagSwap}
              onSidestep={handleP1Sidestep}
              onFastFall={() => p1Ref.current.triggerFastFall()}
              onBreaker={handleP1Breaker}
              canUseBreaker={linearGaugeRef.current.canUseBreaker('P1')}
              isInputLocked={matchState !== 'FIGHTING' && matchState !== 'FINISH_HIM'}
              isCounterReady={p1Ref.current.isCounterReady}
            />
          )}

        {/* Overlay Start Screen over Live Pit Arena */}
        {matchState === 'CAMO_INTRO' && (
          <CamoIntroScreen
            selectedCharId={p1CharId}
            onSelectCharacter={(id) => {
              setP1CharId(id);
              p1Ref.current.setCharacter(id);
            }}
            onEnterCombat={() => {
              isStoryMatchRef.current = false;
              setPracticeMode(false);
              setIsTowerMode(false);
              updateMatchState('ROSTER_SELECT');
            }}
            onEnterTower={() => {
              isStoryMatchRef.current = false;
              setPracticeMode(false);
              setIsTowerMode(true);
              updateMatchState('ROSTER_SELECT');
            }}
            onEnterPractice={() => {
              isStoryMatchRef.current = false;
              setPracticeMode(true);
              setShowHitboxes(false);
              setIsTowerMode(false);
              updateMatchState('ROSTER_SELECT');
            }}
            onEnterStory={() => {
              isStoryMatchRef.current = true;
              setPracticeMode(false);
              setIsTowerMode(false);
              updateMatchState('STORY_MAP');
            }}
            onOpenLevelDesigner={() => setIsLevelDesignerOpen(true)}
            onOpenMechanics={() => setIsMechanicsModalOpen(true)}
            onOpenSwarm={() => setIsSwarmModalOpen(true)}
            onOpenMeshLab={() => setIsMeshLabOpen(true)}
          />
        )}
      </main>

      {/* Gemini 1960s Vancouver Story Mode (Non-Linear Progression Map + Plot Art Cutscenes) */}
      {(matchState === 'STORY_MAP' || matchState === 'STORY_CUTSCENE') && (
        <StoryModeOverlay
          mode={matchState}
          campaign={storyCampaign}
          playerCharId={p1CharId}
          isLoadingCutscene={isStoryCutsceneLoading}
          onSelectPlayerChar={(id) => {
            setP1CharId(id);
            p1Ref.current.setCharacter(id);
          }}
          onSelectNode={handleSelectStoryNode}
          onLaunchNodeFight={handleLaunchStoryFight}
          onBackToMap={() => updateMatchState('STORY_MAP')}
          onResetCampaign={() => {
            const fresh = createInitialStoryState();
            setStoryCampaign(fresh);
            storyCampaignRef.current = fresh;
          }}
          onOpenLevelDesigner={() => setIsLevelDesignerOpen(true)}
          onExitStory={() => {
            isStoryMatchRef.current = false;
            updateMatchState('CAMO_INTRO');
          }}
        />
      )}

      {/* Roster & Tower Selection Screen */}
      {matchState === 'ROSTER_SELECT' && (
        <RosterSelectScreen
          p1CharId={p1CharId}
          p1PartnerId={p1PartnerId}
          cpuCharId={cpuCharId}
          cpuPartnerId={cpuPartnerId}
          activeStage={activeStage}
          selectedTower={selectedTower}
          onSelectP1={(id) => {
            setP1CharId(id);
            p1Ref.current.setCharacter(id);
          }}
          onSelectP1Partner={(id) => {
            setP1PartnerId(id);
          }}
          onSelectCpu={(id) => {
            setCpuCharId(id);
            cpuRef.current.setCharacter(id);
          }}
          onSelectStage={setActiveStage}
          onSelectTower={setSelectedTower}
          onOpenSwarm={() => setIsSwarmModalOpen(true)}
          onOpenLevelDesigner={() => setIsLevelDesignerOpen(true)}
          onStartFight={(isTower) => {
            isStoryMatchRef.current = false;
            setIsTowerMode(isTower);
            if (isTower) {
              towerFloorRef.current = 1;
              setTowerFloor(1);
              const towerDef = TOWERS[selectedTower] || TOWERS['MASTER'];
              const firstOpponent = towerDef.fighters[0];
              setCpuCharId(firstOpponent);
              cpuRef.current.setCharacter(firstOpponent);
              const partner = towerDef.fighters[1] || 'liukang';
              setCpuPartnerId(partner);
            }
            setP1PartnerHp(250);
            setCpuPartnerHp(250);
            updateMatchState('VS_SPLASH');
          }}
        />
      )}

      {/* Theatrical Movie Shutter Confrontation Transition */}
      <MovieTransitionOverlay
        isOpen={matchState === 'VS_SPLASH'}
        p1CharId={p1CharId}
        cpuCharId={cpuCharId}
        stageId={activeStage}
        isTowerMode={isTowerMode}
        towerFloor={towerFloor}
        totalTowerFloors={(TOWERS[selectedTower] || TOWERS.MASTER).fighters.length}
        onComplete={handleVsTransitionComplete}
      />

      {/* Tower Victory Celebration Overlay */}
      {matchState === 'TOWER_VICTORY' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative max-w-lg w-full p-6 sm:p-8 bg-gradient-to-b from-zinc-900 via-neutral-950 to-black border-2 border-amber-500/80 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.4)] text-center text-white overflow-hidden">
            <div className="relative z-10 flex flex-col items-center">
              <span className="font-mono text-xs uppercase tracking-[0.3em] text-amber-400 font-bold">
                Mortal Kombat Tournament
              </span>
              <h2 className="font-kombat text-3xl sm:text-4xl font-black text-amber-300 uppercase mt-1 mb-2">
                TOWER CONQUERED!
              </h2>

              <p className="text-sm sm:text-base text-zinc-300 max-w-md mx-auto mb-6 leading-relaxed">
                Supreme Champion! Your tag-team duo of{' '}
                <span className="text-amber-400 font-bold">{CHARACTERS[p1CharId].name}</span> &amp;{' '}
                <span className="text-cyan-400 font-bold">{CHARACTERS[p1PartnerId].name}</span> conquered all{' '}
                <span className="text-amber-400 font-bold">{TOWERS[selectedTower].fighters.length} floors</span> and defeated{' '}
                <span className="text-red-400 font-black">{finalTowerBossName}</span>!
              </p>

              <button
                onClick={() => {
                  updateMatchState('ROSTER_SELECT');
                  resetEntireMatch(p1CharId, cpuCharId);
                  RetroAudio.announce('CHOOSE_YOUR_DESTINY');
                }}
                className="w-full py-3.5 px-6 rounded-xl font-kombat font-bold tracking-widest text-base uppercase bg-gradient-to-r from-red-700 via-red-600 to-amber-500 hover:from-red-600 hover:to-amber-400 text-white active:scale-95 transition-all cursor-pointer"
              >
                CHOOSE YOUR NEXT DESTINY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <MechanicsModal
        isOpen={isMechanicsModalOpen}
        activeMechId={p1Ref.current.activeMechId}
        onClose={() => setIsMechanicsModalOpen(false)}
      />

      <MoveListModal
        isOpen={isMoveListOpen}
        onClose={() => setIsMoveListOpen(false)}
        activeCharacterId={p1CharId}
      />

      <CharacterSelectModal
        isOpen={isCharSelectOpen}
        onClose={() => setIsCharSelectOpen(false)}
        p1CharId={p1CharId}
        cpuCharId={cpuCharId}
        onSelectP1={changeP1Character}
        onSelectCpu={changeCpuCharacter}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        activeStage={activeStage}
        onSelectStage={setActiveStage}
        bloodMode={bloodMode}
        onSelectBloodMode={(m) => {
          setBloodMode(m);
          particleSystemRef.current.setBloodMode(m);
        }}
        crtFilter={crtFilter}
        onToggleCrt={() => setCrtFilter((prev) => !prev)}
        practiceMode={practiceMode}
        onTogglePractice={() => setPracticeMode((prev) => !prev)}
        is3DMode={is3DMode}
        onToggle3DMode={() => setIs3DMode((prev) => !prev)}
        showHitboxes={showHitboxes}
        onToggleHitboxes={() => setShowHitboxes((prev) => !prev)}
        onOpenLevelDesigner={() => setIsLevelDesignerOpen(true)}
      />
      <SwarmArchitectModal
        isOpen={isSwarmModalOpen}
        p1CharId={p1CharId}
        cpuCharId={cpuCharId}
        stageId={activeStage}
        activeMatrixCellId={p1Ref.current.activeMatrixCellId}
        onPatchApplied={handleApplySwarmPatch}
        onClose={() => setIsSwarmModalOpen(false)}
      />
      <LevelDesignerModal
        isOpen={isLevelDesignerOpen}
        onClose={() => setIsLevelDesignerOpen(false)}
        onDeployStage={handleDeployCustomStage}
      />
      <MeshLabOverlay
        isOpen={isMeshLabOpen}
        onClose={() => setIsMeshLabOpen(false)}
      />
    </div>
  );
}
