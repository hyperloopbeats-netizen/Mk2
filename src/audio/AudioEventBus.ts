/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RetroAudio } from './RetroSynth';
import { CharacterId } from '../types/fighter';

export interface FighterVoiceProfile {
  name: string;
  shoutPitch: number;      // Synthesizer pitch modifier (0.5 to 2.0)
  timbre: 'baritone' | 'tenor' | 'metallic' | 'demonic' | 'female' | 'reptilian';
  quotes: {
    intro_taunt?: string;
    spear?: string;
    teleport?: string;
    taunt?: string;
    pain?: string;
    throw_shout?: string;
    parry?: string;
    victory?: string;
    fatality_shout?: string;
    weapon?: string;
  };
}

export const FIGHTER_AUDIO_MAP: Record<CharacterId, FighterVoiceProfile> = {
  scorpion: {
    name: 'Scorpion',
    shoutPitch: 0.82,
    timbre: 'demonic',
    quotes: {
      intro_taunt: 'VENGEANCE WILL BE MINE!',
      spear: 'GET OVER HERE!',
      teleport: 'BURNING RECKONING!',
      taunt: 'YOUR SOUL WILL BURN IN NETHERREALM!',
      pain: 'HARRGH!',
      throw_shout: 'BURN IN HELLFIRE!',
      parry: 'WEAK FOOL!',
      victory: 'THE SHIRAI RYU ARE AVENGED!',
      fatality_shout: 'TOASTY!',
      weapon: 'MUGAI RYU CLEAVE!',
    },
  },
  subzero: {
    name: 'Sub-Zero',
    shoutPitch: 0.9,
    timbre: 'baritone',
    quotes: {
      intro_taunt: 'THIS FIGHT WILL BE YOUR LAST!',
      spear: 'CHILL TO THE BONE!',
      teleport: 'FROSTBITE STRIKE!',
      taunt: 'I WILL FREEZE YOUR SPINE!',
      pain: 'OOUGGH!',
      throw_shout: 'SHATTER LIKE ICE!',
      parry: 'PREDICTABLE!',
      victory: 'FOR THE LIN KUEI!',
      fatality_shout: 'SPINE RIP!',
      weapon: 'KORI BLADE SHATTER!',
    },
  },
  smoke: {
    name: 'Smoke',
    shoutPitch: 1.05,
    timbre: 'baritone',
    quotes: {
      intro_taunt: 'YOU CANNOT SEE WHAT STRIKES YOU!',
      teleport: 'WHERE THERE IS SMOKE, THERE IS FIRE!',
      taunt: 'YOU CANNOT STRIKE THE MIST!',
      pain: 'AGGHH!',
      throw_shout: 'INTO THE ASHES!',
      parry: 'PHANTOM GUARD!',
      victory: 'ONLY CINDERS REMAIN!',
      fatality_shout: 'VAPORIZE!',
      weapon: 'SICKLE EMBERS!',
    },
  },
  raiden: {
    name: 'Raiden',
    shoutPitch: 0.95,
    timbre: 'baritone',
    quotes: {
      intro_taunt: 'EARTHREALM MUST BE PROTECTED!',
      teleport: 'FLYING THUNDER!',
      taunt: 'I AM THE GOD OF THUNDER AND LIGHTNING!',
      pain: 'BY THE ELDER GODS!',
      throw_shout: 'THUNDER SLAM!',
      parry: 'BE STILL!',
      victory: 'THE ELDER GODS ARE PLEASED!',
      fatality_shout: 'ELECTROCUTE!',
      weapon: 'LIGHTNING STAFF DISCHARGE!',
    },
  },
  liukang: {
    name: 'Liu Kang',
    shoutPitch: 1.25,
    timbre: 'tenor',
    quotes: {
      intro_taunt: 'SHOW ME WHAT YOU CAN DO!',
      teleport: 'WATAAAAAH!',
      taunt: 'YOU FACE A SHAOLIN CHAMPION!',
      pain: 'WU-AAAH!',
      throw_shout: 'HOOO-YAAAH!',
      parry: 'DEFLECTED!',
      victory: 'VICTORY BELONGS TO EARTHREALM!',
      fatality_shout: 'DRAGON SPIRIT!',
      weapon: 'NUNCHAKU WHIRLWIND!',
    },
  },
  reptile: {
    name: 'Reptile',
    shoutPitch: 0.75,
    timbre: 'reptilian',
    quotes: {
      intro_taunt: 'SSSSSSSS... FRESH MEAT!',
      spear: 'DISSOLVE IN ACID!',
      teleport: 'SHADOW INVISIBILITY!',
      taunt: 'YOUR FLESH WILL FEED ZATERRA!',
      pain: 'SHHH-KRRR!',
      throw_shout: 'TEAR AND DEVOUR!',
      parry: 'SCALES HOLD FAST!',
      victory: 'ZATERRA SHALL RISE AGAIN!',
      fatality_shout: 'DELICIOUS PREY!',
      weapon: 'POISON CLAW REND!',
    },
  },
  kunglao: {
    name: 'Kung Lao',
    shoutPitch: 1.1,
    timbre: 'tenor',
    quotes: {
      intro_taunt: 'THE WHITE LOTUS NEVER BOWS!',
      teleport: 'WINDMILL SPIN!',
      taunt: 'FOR THE HONOR OF THE GREAT KUNG LAO!',
      pain: 'HRRGH!',
      throw_shout: 'SHAOLIN HURL!',
      parry: 'TOO SLOW!',
      victory: 'HONOR RESTORED TO THE SHAOLIN!',
      fatality_shout: 'RAZOR SAW CLEAVE!',
      weapon: 'BLADED RIM EXECUTION!',
    },
  },
  kitana: {
    name: 'Kitana',
    shoutPitch: 1.4,
    timbre: 'female',
    quotes: {
      intro_taunt: 'YOU WILL LEARN RESPECT!',
      teleport: 'FAN TORNADO LIFT!',
      taunt: 'YOU WILL BOW TO EDENIA!',
      pain: 'AHHH!',
      throw_shout: 'OUT OF MY SIGHT!',
      parry: 'STEEL DEFLECTION!',
      victory: 'EDENIA STANDS UNBROKEN!',
      fatality_shout: 'KISS OF DEATH!',
      weapon: 'STEEL FAN DECIMATE!',
    },
  },
  mileena: {
    name: 'Mileena',
    shoutPitch: 1.5,
    timbre: 'demonic',
    quotes: {
      intro_taunt: 'COME PLAY WITH ME!',
      spear: 'COME TASTE MY FANGS!',
      teleport: 'ROLLING THUNDER!',
      taunt: 'LET US BECOME ONE FLESH!',
      pain: 'SCREEECH!',
      throw_shout: 'SWEET AGONY!',
      parry: 'HI-HI-HA!',
      victory: 'KITANA COULD NEVER COMPARE!',
      fatality_shout: 'TARKATAN FEAST!',
      weapon: 'TWIN SAI PIERCE!',
    },
  },
  aimix: {
    name: 'Aimix',
    shoutPitch: 0.88,
    timbre: 'metallic',
    quotes: {
      intro_taunt: 'LOCKING HARMONIC RESONANCE!',
      spear: 'SONIC TETHER LOCK!',
      teleport: 'QUANTUM RESONANCE DRIFT!',
      taunt: 'FREQUENCY OVERLOAD: PROTOCOL 9D ENGAGED!',
      pain: 'SYSTEM STRAIN: 78%!',
      throw_shout: 'GRAVITY INVERSION!',
      parry: 'PHASE CANCEL!',
      victory: 'HARMONIC DOMINANCE ACHIEVED!',
      fatality_shout: 'DIMENSION SHATTER!',
      weapon: 'GLASS FOCAL DISRUPTION!',
    },
  },
  sonya: {
    name: 'Sonya',
    shoutPitch: 1.35,
    timbre: 'female',
    quotes: {
      intro_taunt: 'TIME TO BRING YOU IN!',
      teleport: 'SPECIAL FORCES AIR DROP!',
      taunt: 'STAND DOWN, YOU ARE UNDER ARREST!',
      pain: 'NNGH!',
      throw_shout: 'EAT PAVEMENT!',
      parry: 'CLEAN COUNTER!',
      victory: 'MISSION ACCOMPLISHED!',
      fatality_shout: 'AIR STRIKE CONFIRMED!',
      weapon: 'ENERGY BLADE DETONATE!',
    },
  },
  johnny: {
    name: 'Johnny Cage',
    shoutPitch: 1.15,
    timbre: 'tenor',
    quotes: {
      intro_taunt: 'READY FOR YOUR CLOSE-UP?',
      teleport: 'SHADOW KICK!',
      taunt: 'THOSE WERE $500 SUNGLASSES, ASSHOLE!',
      pain: 'NOT THE FACE!',
      throw_shout: 'CAGED!',
      parry: 'WRONG MOVE, PAL!',
      victory: 'KEEP THE AUTOGRAPH!',
      fatality_shout: 'AND THE OSCAR GOES TO... ME!',
      weapon: 'BRASS KNUCKLE JAW SNAP!',
    },
  },
  goro: {
    name: 'Goro',
    shoutPitch: 0.65,
    timbre: 'baritone',
    quotes: {
      intro_taunt: 'KNEEL BEFORE PRINCE GORO!',
      teleport: 'SHOKAN LEAP STOMP!',
      taunt: 'I WILL CRUSH YOU LIKE A PUNY INSECT!',
      pain: 'GRAAAWW!',
      throw_shout: 'SHOKAN CRUSH!',
      parry: 'MERE TICKLE!',
      victory: 'THE SHOKAN REIGN SUPREME!',
      fatality_shout: 'FOUR-ARMED DISMEMBER!',
      weapon: 'TITAN HAMMER PULVERIZE!',
    },
  },
  robocop: {
    name: 'RoboCop',
    shoutPitch: 0.72,
    timbre: 'metallic',
    quotes: {
      intro_taunt: 'YOUR MOVE, CREEP.',
      spear: 'TARGET ACQUIRED.',
      teleport: 'TACTICAL REPOSITION.',
      taunt: 'DEAD OR ALIVE, YOU ARE COMING WITH ME.',
      pain: 'HYDRAULIC WARNING.',
      throw_shout: 'RESISTANCE TERMINATED.',
      parry: 'ARMOR INTEGRITY 100%.',
      victory: 'LAW AND ORDER ENFORCED.',
      fatality_shout: 'DIRECTIVE FOUR EXECUTED.',
      weapon: 'AUTO-9 TERMINAL FIRE.',
    },
  },
  leonardo: {
    name: 'Leonardo',
    shoutPitch: 1.08,
    timbre: 'tenor',
    quotes: {
      intro_taunt: 'STAND WITH HONOR OR FALL!',
      teleport: 'TURTLE POWER SWEEP!',
      taunt: 'FOR SPLINTER AND THE BROTHERHOOD!',
      pain: 'SHELL SHOCKED!',
      throw_shout: 'NINJUTSU JUDO THROW!',
      parry: 'BLADE PARRY!',
      victory: 'DISCIPLINE ALWAYS TRIUMPHS!',
      fatality_shout: 'COWABUNGA SLICE!',
      weapon: 'TWIN NINJATO CROSS!',
    },
  },
  noob: {
    name: 'Noob Saibot',
    shoutPitch: 0.7,
    timbre: 'demonic',
    quotes: {
      intro_taunt: 'WE ARE MANY, YOU ARE ONE.',
      teleport: 'SHADOW PORTAL CLONE!',
      taunt: 'FEAR THE DARKNESS WITHIN!',
      pain: 'THE VOID CALLS...',
      throw_shout: 'DRAGGED TO OBLIVION!',
      parry: 'SHADOW GUARD!',
      victory: 'DARKNESS CONSUMES ALL!',
      fatality_shout: 'MAKE A WISH DISSECTION!',
      weapon: 'SHADOW SCYTHE REAP!',
    },
  },
  shangtsung: {
    name: 'Shang Tsung',
    shoutPitch: 0.85,
    timbre: 'baritone',
    quotes: {
      intro_taunt: 'IT HAS BEGUN!',
      teleport: 'SOUL STEAL DRIFT!',
      taunt: 'YOUR SOUL IS MINE!',
      pain: 'MY SOULS WAVER...',
      throw_shout: 'KNEEL SORCERER THRALL!',
      parry: 'FUTILE EFFORT!',
      victory: 'ANOTHER SOUL CLAIMED!',
      fatality_shout: 'ANCIENT TORMENT!',
      weapon: 'SORCERY RUNIC CLEAVE!',
    },
  },
};

export type SubtitleCallback = (text: string, speaker: string, color: string) => void;

class AudioEventBusManager {
  private subtitleListeners: Set<SubtitleCallback> = new Set();
  private lastAnnounceTime: number = 0;
  private currentAnnouncePhrase: string = '';

  public onSubtitle(cb: SubtitleCallback) {
    this.subtitleListeners.add(cb);
    return () => this.subtitleListeners.delete(cb);
  }

  public emitSubtitle(text: string, speaker: string = 'ANNOUNCER', color: string = '#f97316') {
    this.subtitleListeners.forEach((cb) => cb(text, speaker, color));
  }

  // Global Announcer Hook Pipeline: Round starts, Fatalities, Match Over
  public announceMatchEvent(
    event: 'ROUND_1' | 'ROUND_2' | 'FINAL_ROUND' | 'FIGHT' | 'FINISH_HIM' | 'FATALITY' | 'FLAWLESS_VICTORY' | string,
    winnerName?: string
  ) {
    const now = Date.now();
    if (this.currentAnnouncePhrase === event && now - this.lastAnnounceTime < 1800) {
      return; // Avoid stutter
    }
    this.lastAnnounceTime = now;
    this.currentAnnouncePhrase = event;

    let subtitleText = '';
    let subtitleColor = '#f59e0b';

    switch (event) {
      case 'ROUND_1':
        subtitleText = 'ROUND 1';
        RetroAudio.announce('ROUND_1');
        break;
      case 'ROUND_2':
        subtitleText = 'ROUND 2';
        RetroAudio.announce('ROUND_2');
        break;
      case 'FINAL_ROUND':
        subtitleText = 'FINAL ROUND';
        RetroAudio.announce('FINAL_ROUND');
        break;
      case 'FIGHT':
        subtitleText = 'FIGHT!';
        subtitleColor = '#ef4444';
        RetroAudio.announce('FIGHT');
        break;
      case 'FINISH_HIM':
        subtitleText = 'FINISH HIM!';
        subtitleColor = '#dc2626';
        RetroAudio.announce('FINISH_HIM');
        break;
      case 'FATALITY':
        subtitleText = 'FATALITY!';
        subtitleColor = '#b91c1c';
        RetroAudio.announce('FATALITY');
        break;
      case 'FLAWLESS_VICTORY':
        subtitleText = 'FLAWLESS VICTORY!';
        subtitleColor = '#38bdf8';
        RetroAudio.announce('FLAWLESS_VICTORY');
        break;
      default:
        if (winnerName) {
          subtitleText = `${winnerName.toUpperCase()} WINS!`;
          RetroAudio.announce(`${winnerName.toUpperCase()}_WINS`);
        }
        break;
    }

    if (subtitleText) {
      this.emitSubtitle(subtitleText, 'ANNOUNCER', subtitleColor);
    }
  }

  // Fighter signature sayings and combat vocalizations (before, during & after match)
  public playCharacterActionVoice(
    charId: CharacterId,
    action: 'intro_taunt' | 'spear' | 'teleport' | 'taunt' | 'pain' | 'throw_shout' | 'parry' | 'victory' | 'fatality_shout' | 'weapon'
  ) {
    const profile = FIGHTER_AUDIO_MAP[charId];
    if (!profile) return;

    const quote = profile.quotes[action];
    if (quote) {
      const color =
        action === 'victory' || action === 'fatality_shout'
          ? '#fbbf24'
          : action === 'parry'
          ? '#38bdf8'
          : '#f97316';
      this.emitSubtitle(quote, profile.name.toUpperCase(), color);
    }

    if (action === 'spear') {
      RetroAudio.playSpear();
      if (charId === 'scorpion') {
        RetroAudio.announce('GET_OVER_HERE');
      }
    } else if (action === 'teleport') {
      RetroAudio.playTeleport();
    } else if (action === 'weapon') {
      RetroAudio.playSword();
    } else if (action === 'pain') {
      RetroAudio.playPainSound('groan');
    } else if (action === 'parry') {
      RetroAudio.announce('EXCELLENT');
    } else if (action === 'throw_shout') {
      RetroAudio.playHit('bone_crack');
    } else if (action === 'victory') {
      RetroAudio.announce(`${charId.toUpperCase()}_WINS`);
    } else if (action === 'fatality_shout') {
      if (charId === 'scorpion') {
        RetroAudio.announce('TOASTY');
      } else {
        RetroAudio.announce('FATALITY');
      }
    }
  }

  public announcePreMatchExchange(p1Id: CharacterId, cpuId: CharacterId, roundNum: number) {
    const roundEvent = roundNum === 1 ? 'ROUND_1' : roundNum === 2 ? 'ROUND_2' : 'FINAL_ROUND';
    this.announceMatchEvent(roundEvent);
    const p1Profile = FIGHTER_AUDIO_MAP[p1Id];
    const cpuProfile = FIGHTER_AUDIO_MAP[cpuId];
    if (p1Profile?.quotes.intro_taunt) {
      setTimeout(() => {
        this.emitSubtitle(p1Profile.quotes.intro_taunt!, p1Profile.name.toUpperCase(), '#fbbf24');
      }, 320);
    }
    if (cpuProfile?.quotes.taunt) {
      setTimeout(() => {
        this.emitSubtitle(cpuProfile.quotes.taunt!, cpuProfile.name.toUpperCase(), '#f87171');
      }, 950);
    }
  }

  public announcePostMatchOutcome(winnerId: CharacterId, isFlawless: boolean, isFatality: boolean) {
    const profile = FIGHTER_AUDIO_MAP[winnerId];
    if (isFatality) {
      this.announceMatchEvent('FATALITY');
    } else if (isFlawless) {
      this.announceMatchEvent('FLAWLESS_VICTORY');
    }
    setTimeout(() => {
      if (profile) {
        RetroAudio.announce(`${winnerId.toUpperCase()}_WINS`);
        const winLine = profile.quotes.victory || profile.quotes.taunt || `${profile.name.toUpperCase()} WINS!`;
        this.emitSubtitle(`${profile.name.toUpperCase()} WINS — "${winLine}"`, profile.name.toUpperCase(), '#fbbf24');
      }
    }, isFatality || isFlawless ? 850 : 120);
  }
}

export const AudioEventBus = new AudioEventBusManager();
