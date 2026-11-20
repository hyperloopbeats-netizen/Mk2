/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  gravity: number;
  drag?: number;
  floorY?: number;
  isStuckToFloor?: boolean;
  shape?:
    | 'circle'
    | 'spark'
    | 'smoke'
    | 'ice'
    | 'bone'
    | 'meat'
    | 'blood_bead'
    | 'blood_streak'
    | 'micro_mist';
  rotation?: number;
  vRot?: number;
}

export interface BloodStain {
  x: number;
  y: number;
  radius: number;
  smearX: number;
  color: string;
  darkColor: string;
  alpha: number;
  splatters: { ox: number; oy: number; r: number }[];
}

export interface ScreenBloodDroplet {
  x: number;
  y: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  trailLength: number;
}

export interface ImpactShockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  lineWidth: number;
}

export type ComboRank = 'STARTER' | 'BRUTAL';

export interface ComboEvolutionSprite {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hits: number;
  label: string;
  rank: ComboRank;
  color: string;
  glowColor: string;
  scale: number;
  targetScale: number;
  alpha: number;
  rot: number;
  vRot: number;
  life: number;
  maxLife: number;
}

export type BloodMode = 'RED' | 'BLUE' | 'GREEN' | 'OFF';

export class ParticleSystem {
  public particles: Particle[] = [];
  public bloodStains: BloodStain[] = [];
  public screenDroplets: ScreenBloodDroplet[] = [];
  public shockwaves: ImpactShockwave[] = [];
  public comboSprites: ComboEvolutionSprite[] = [];
  public bloodMode: BloodMode = 'RED';

  public setBloodMode(mode: BloodMode) {
    this.bloodMode = mode;
  }

  public clearAll() {
    this.particles = [];
    this.bloodStains = [];
    this.screenDroplets = [];
    this.shockwaves = [];
    this.comboSprites = [];
  }

  private getBloodPalette(): { base: string; bright: string; dark: string } {
    if (this.bloodMode === 'BLUE') {
      return { base: '#0284c7', bright: '#38bdf8', dark: '#082f49' };
    }
    if (this.bloodMode === 'GREEN') {
      return { base: '#16a34a', bright: '#4ade80', dark: '#052e16' };
    }
    return { base: '#991b1b', bright: '#ef4444', dark: '#450a0a' };
  }

  // Reactive Contact Shockwave Ring
  public emitShockwave(x: number, y: number, maxRadius = 56, color = '#fbbf24', lineWidth = 2.5) {
    this.shockwaves.push({
      x,
      y,
      radius: 6,
      maxRadius,
      color,
      alpha: 0.9,
      lineWidth,
    });
  }

  // Strict 3-Strike Combo Evolution Badge (Strike 2 Link -> Strike 3 Finisher!)
  public emitComboEvolution(x: number, y: number, hits: number, _dmg: number, facing: 1 | -1) {
    const cappedHits = Math.min(3, Math.max(0, hits));
    if (cappedHits < 2) return;

    const isFinisher = cappedHits >= 3;
    const rank: ComboRank = isFinisher ? 'BRUTAL' : 'STARTER';
    const label = isFinisher ? '3-STRIKE FINISHER!' : '2-STRIKE LINK';
    const color = isFinisher ? '#f59e0b' : '#38bdf8';
    const glowColor = isFinisher ? '#dc2626' : '#0284c7';

    this.comboSprites.push({
      id: `combo_${Date.now()}_${Math.random()}`,
      x: x + (facing === 1 ? -18 : 18),
      y: y - 42,
      vx: (Math.random() - 0.5) * 18,
      vy: -52 - cappedHits * 5,
      hits: cappedHits,
      label,
      rank,
      color,
      glowColor,
      scale: 1.4,
      targetScale: isFinisher ? 1.18 : 1.0,
      alpha: 1.0,
      rot: 0,
      vRot: (Math.random() - 0.5) * 0.1,
      life: 0,
      maxLife: isFinisher ? 48 : 36,
    });
  }

  // Finer Multi-Scale Reactive Blood Splatter (Micro-Mist + Tapered Streaks + Fine Droplets)
  public emitBlood(x: number, y: number, dirX: number, count = 22, floorY = 445) {
    if (this.bloodMode === 'OFF') return;
    const { base, bright, dark } = this.getBloodPalette();

    // 1. Fine aerosol micro-mist spray (1px - 2.3px) with air drag
    const mistCount = Math.max(10, Math.floor(count * 0.75));
    for (let m = 0; m < mistCount; m++) {
      const mAngle = (dirX >= 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 1.5;
      const mSpeed = 120 + Math.random() * 290;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: Math.cos(mAngle) * mSpeed + dirX * 60,
        vy: Math.sin(mAngle) * mSpeed - Math.random() * 140,
        size: 1.0 + Math.random() * 1.3,
        color: Math.random() > 0.45 ? bright : base,
        alpha: 0.88,
        decay: 0.02 + Math.random() * 0.015,
        gravity: 420,
        drag: 0.94,
        shape: 'micro_mist',
      });
    }

    // 2. High-velocity razor-fine streaks & secondary break-off beads
    for (let i = 0; i < count; i++) {
      const angle = (dirX >= 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 1.35;
      const speed = 220 + Math.random() * 440;
      const isStreak = Math.random() > 0.42;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed + dirX * 130,
        vy: Math.sin(angle) * speed - Math.random() * 220,
        size: isStreak ? 1.4 + Math.random() * 1.8 : 1.8 + Math.random() * 2.5,
        color: Math.random() > 0.38 ? bright : Math.random() > 0.5 ? base : dark,
        alpha: 1.0,
        decay: 0.004 + Math.random() * 0.006,
        gravity: 1150,
        drag: 0.988,
        floorY,
        shape: isStreak ? 'blood_streak' : 'blood_bead',
      });
    }

    if (count >= 20) {
      this.emitMeatChunks(x, y, dirX, 2, floorY);
    }
  }

  // Directional Weapon Slash Fan Blood Spray (razor-fine blade slice arc spray)
  public emitWeaponSlashBlood(x: number, y: number, dirX: number, count = 34, floorY = 445) {
    if (this.bloodMode === 'OFF') return;
    const { base, bright, dark } = this.getBloodPalette();

    // Diagonal blade-plane spray fan
    for (let i = 0; i < count; i++) {
      const t = (i / Math.max(1, count - 1)) - 0.5;
      const fanAngle = (dirX >= 0 ? -0.35 : Math.PI + 0.35) + t * 1.35;
      const speed = 260 + Math.random() * 520;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y + t * 18,
        vx: Math.cos(fanAngle) * speed,
        vy: Math.sin(fanAngle) * speed - 150,
        size: 1.2 + Math.random() * 1.9,
        color: Math.random() > 0.35 ? bright : Math.random() > 0.45 ? base : dark,
        alpha: 1.0,
        decay: 0.0045 + Math.random() * 0.005,
        gravity: 1120,
        drag: 0.99,
        floorY,
        shape: i % 3 === 0 ? 'micro_mist' : 'blood_streak',
      });
    }

    // Subtle crisp screen-lens micro-specks on heavy blade cleaves
    if (this.screenDroplets.length < 18) {
      for (let s = 0; s < 2; s++) {
        this.screenDroplets.push({
          x: 120 + Math.random() * 720,
          y: 50 + Math.random() * 290,
          vy: 7 + Math.random() * 12,
          radius: 1.6 + Math.random() * 2.4,
          color: bright,
          alpha: 0.85,
          trailLength: 0,
        });
      }
    }
  }

  // Visceral High-Pressure Arterial Gush (Uppercuts, Heavy Strikes, Fatalities)
  public emitArterialSpray(x: number, y: number, dirX: number, count = 44, floorY = 445) {
    if (this.bloodMode === 'OFF') return;
    const { base, bright, dark } = this.getBloodPalette();

    // 1. High-pressure fine parabolic jets & streaks
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 0.85;
      const angle = -Math.PI * 0.52 + dirX * 0.42 + spread;
      const speed = 280 + Math.random() * 620;
      const isStreak = Math.random() > 0.3;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 170,
        size: isStreak ? 1.3 + Math.random() * 2.1 : 2.0 + Math.random() * 2.8,
        color: Math.random() > 0.35 ? bright : Math.random() > 0.5 ? base : dark,
        alpha: 1.0,
        decay: 0.003 + Math.random() * 0.005,
        gravity: 1180,
        drag: 0.99,
        floorY,
        shape: isStreak ? 'blood_streak' : 'blood_bead',
      });
    }

    // 2. Crisp micro-mist aerosol halo around arterial rupture
    const mistCount = Math.min(26, Math.floor(count * 0.65));
    for (let m = 0; m < mistCount; m++) {
      const mAngle = (dirX >= 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 1.9;
      const mSpeed = 60 + Math.random() * 210;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: Math.cos(mAngle) * mSpeed,
        vy: Math.sin(mAngle) * mSpeed - 40,
        size: 1.0 + Math.random() * 1.5,
        color: Math.random() > 0.4 ? bright : base,
        alpha: 0.85,
        decay: 0.018 + Math.random() * 0.012,
        gravity: 260,
        drag: 0.93,
        shape: 'micro_mist',
      });
    }

    // 3. Finer screen-lens micro-specks + slim rivulet
    if (Math.random() > 0.2 && this.screenDroplets.length < 18) {
      const specks = Math.random() > 0.45 ? 2 : 1;
      for (let k = 0; k < specks; k++) {
        this.screenDroplets.push({
          x: 110 + Math.random() * 740,
          y: 45 + Math.random() * 310,
          vy: 8 + Math.random() * 14,
          radius: 1.8 + Math.random() * 2.8,
          color: bright,
          alpha: 0.88,
          trailLength: 0,
        });
      }
    }

    this.emitMeatChunks(x, y, dirX, 3, floorY);
    this.emitBoneFragments(x, y, dirX);
  }

  public emitBloodDrip(x: number, y: number, floorY = 445) {
    if (this.bloodMode === 'OFF') return;
    const dripColor =
      this.bloodMode === 'BLUE' ? '#0ea5e9' : this.bloodMode === 'GREEN' ? '#22c55e' : '#b91c1c';
    this.particles.push({
      x: x + (Math.random() - 0.5) * 10,
      y,
      vx: (Math.random() - 0.5) * 14,
      vy: 25 + Math.random() * 25,
      size: 1.6 + Math.random() * 1.4,
      color: dripColor,
      alpha: 0.95,
      decay: 0.005,
      gravity: 980,
      floorY,
      shape: 'blood_bead',
    });
  }

  public emitMeatChunks(x: number, y: number, dirX: number, count = 3, floorY = 445) {
    if (this.bloodMode === 'OFF') return;
    const colors = ['#7f1d1d', '#991b1b', '#450a0a'];
    for (let i = 0; i < count; i++) {
      const angle = (dirX > 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 1.6;
      const speed = Math.random() * 260 + 130;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: -Math.random() * 220 - 80,
        size: Math.random() * 4.2 + 2.4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1.0,
        decay: 0.006,
        gravity: 1220,
        floorY,
        shape: 'meat',
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 16,
      });
    }
  }

  public emitBoneFragments(x: number, y: number, dirX: number) {
    for (let i = 0; i < 6; i++) {
      const angle = (dirX > 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 1.8;
      const speed = Math.random() * 280 + 120;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: -Math.random() * 240 - 80,
        size: Math.random() * 4.5 + 2,
        color: '#f8fafc',
        alpha: 1.0,
        decay: 0.013,
        gravity: 1080,
        shape: 'bone',
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 20,
      });
    }
  }

  public emitFire(x: number, y: number, dirX: number, count = 10) {
    const colors = ['#f97316', '#ef4444', '#fbbf24', '#fde047'];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 18,
        y: y + (Math.random() - 0.5) * 18,
        vx: dirX * 130 + (Math.random() - 0.5) * 90,
        vy: -Math.random() * 180 - 50,
        size: Math.random() * 7 + 3.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.92,
        decay: Math.random() * 0.04 + 0.02,
        gravity: -130,
        shape: 'spark',
      });
    }
  }

  public emitIce(x: number, y: number, count = 14, floorY = 445) {
    const colors = ['#bae6fd', '#38bdf8', '#0284c7', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 240 + 70;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 70,
        size: Math.random() * 5.5 + 2.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.95,
        decay: Math.random() * 0.025 + 0.015,
        gravity: 620,
        floorY,
        shape: 'ice',
      });
    }
  }

  public emitSmoke(x: number, y: number, count = 8) {
    const colors = ['#475569', '#64748b', '#94a3b8', '#cbd5e1'];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 22,
        y: y + (Math.random() - 0.5) * 22,
        vx: (Math.random() - 0.5) * 70,
        vy: -Math.random() * 90 - 25,
        size: Math.random() * 14 + 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.75,
        decay: Math.random() * 0.02 + 0.01,
        gravity: -35,
        shape: 'smoke',
      });
    }
  }

  public emitLightning(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 28,
        y: y + (Math.random() - 0.5) * 34,
        vx: (Math.random() - 0.5) * 180,
        vy: (Math.random() - 0.5) * 180,
        size: Math.random() * 4.5 + 2,
        color: Math.random() > 0.5 ? '#38bdf8' : '#ffffff',
        alpha: 1.0,
        decay: 0.075,
        gravity: 0,
        shape: 'spark',
      });
    }
  }

  public emitSonicWave(x: number, y: number, dirX: number, count = 10) {
    const colors = ['#ff6600', '#ff8800', '#ffa726', '#ffffff'];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: dirX * (360 + i * 20),
        vy: (Math.random() - 0.5) * 80,
        size: Math.random() * 8 + 3.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.9,
        decay: 0.045,
        gravity: 0,
        shape: 'spark',
      });
    }
  }

  public emitHitSparks(x: number, y: number, color = '#f59e0b', count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 260 + 80;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        size: Math.random() * 3.8 + 1.8,
        color,
        alpha: 1.0,
        decay: 0.05,
        gravity: 360,
        shape: 'spark',
      });
    }
  }

  public update(dt: number) {
    // 0. Update Impact Shockwave Rings
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += (sw.maxRadius - sw.radius) * Math.min(1, dt * 16) + dt * 90;
      sw.alpha -= dt * 4.2;
      if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
        this.shockwaves.splice(i, 1);
      }
    }

    // 1. Update Combo Evolution Sprites (Strict 3-Strike Caps)
    for (let i = this.comboSprites.length - 1; i >= 0; i--) {
      const s = this.comboSprites[i];
      s.life++;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.rot += s.vRot;
      s.scale += (s.targetScale - s.scale) * 0.15;

      if (s.life > s.maxLife * 0.6) {
        s.alpha = Math.max(0, 1 - (s.life - s.maxLife * 0.6) / (s.maxLife * 0.4));
      }

      if (s.life >= s.maxLife || s.alpha <= 0) {
        this.comboSprites.splice(i, 1);
      }
    }

    // 2. Update Screen Lens Blood Micro-Droplets
    for (let i = this.screenDroplets.length - 1; i >= 0; i--) {
      const d = this.screenDroplets[i];
      d.y += d.vy * dt;
      d.trailLength += d.vy * dt * 0.65;
      d.alpha -= dt * 0.26;
      if (d.alpha <= 0 || d.y > 540) {
        this.screenDroplets.splice(i, 1);
      }
    }

    // 3. Update active particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.drag) {
        const dragStep = Math.pow(p.drag, dt * 60);
        p.vx *= dragStep;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.alpha -= p.decay;

      if (p.vRot) {
        p.rotation = (p.rotation || 0) + p.vRot * dt;
      }

      // Check Floor Collision for finer blood streaks/beads -> directional tapered floor splatters
      if (p.floorY && p.y >= p.floorY && !p.isStuckToFloor) {
        p.y = p.floorY;

        if (p.shape === 'blood_bead' || p.shape === 'blood_streak') {
          p.isStuckToFloor = true;
          p.alpha = 0; // consumed into permanent fine stone platter
          if (this.bloodStains.length >= 130) {
            this.bloodStains.shift();
          }

          const dirSign = Math.sign(p.vx) || (Math.random() > 0.5 ? 1 : -1);
          const smearX = dirSign * Math.min(24, Math.abs(p.vx) * 0.045 + p.size * 1.4);

          const satellites: { ox: number; oy: number; r: number }[] = [];
          const numSats = 5 + Math.floor(Math.random() * 5); // 5 to 9 pinpoint micro-satellites
          for (let s = 0; s < numSats; s++) {
            const forwardBias = s < 3 ? dirSign * (4 + Math.random() * 18) : (Math.random() - 0.5) * 18;
            satellites.push({
              ox: forwardBias,
              oy: (Math.random() - 0.4) * 5.5,
              r: 0.8 + Math.random() * 1.6,
            });
          }

          const stainDark =
            this.bloodMode === 'BLUE' ? '#082f49' : this.bloodMode === 'GREEN' ? '#052e16' : '#450a0a';

          this.bloodStains.push({
            x: p.x,
            y: p.floorY,
            radius: Math.max(1.8, Math.min(5.2, p.size * (1.1 + Math.random() * 0.7))),
            smearX,
            color: p.color,
            darkColor: stainDark,
            alpha: 0.92,
            splatters: satellites,
          });
        } else {
          p.vy = -p.vy * 0.22;
          p.vx *= 0.4;
        }
      }

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D) {
    // 1. Draw persistent directional blood platters on the arena floor
    for (let i = 0; i < this.bloodStains.length; i++) {
      const s = this.bloodStains[i];
      ctx.save();
      ctx.globalAlpha = s.alpha;

      // Dark coagulated tapered smear
      ctx.fillStyle = s.darkColor;
      ctx.beginPath();
      ctx.ellipse(s.x + s.smearX * 0.25, s.y, s.radius * 1.55 + Math.abs(s.smearX) * 0.35, s.radius * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();

      // Rich arterial center
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y - 0.3, s.radius * 1.15, s.radius * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();

      // Fine specular highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
      ctx.beginPath();
      ctx.ellipse(s.x - s.radius * 0.22, s.y - 0.6, s.radius * 0.3, s.radius * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Crisp micro-satellites (0.8px - 2.4px)
      ctx.fillStyle = s.color;
      for (const sat of s.splatters) {
        ctx.beginPath();
        ctx.arc(s.x + sat.ox, s.y + sat.oy, sat.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // 2. Draw Expanding Contact Shockwave Rings
    for (let i = 0; i < this.shockwaves.length; i++) {
      const sw = this.shockwaves[i];
      ctx.save();
      ctx.globalAlpha = Math.max(0, sw.alpha);
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = sw.lineWidth;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius * 0.78, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Draw active flying particles (razor-crisp micro-spray & velocity streaks)
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);

      if (p.shape === 'blood_streak') {
        const speed = Math.hypot(p.vx, p.vy);
        const velAngle = Math.atan2(p.vy, p.vx);
        const len = Math.min(22, Math.max(4, speed / 34));
        const thickness = Math.max(0.9, p.size * 0.65);

        ctx.translate(p.x, p.y);
        ctx.rotate(velAngle);

        // Tapered directional streak needle: clot tail -> bright crimson core
        const grad = ctx.createLinearGradient(-len, 0, len * 0.3, 0);
        grad.addColorStop(0, 'rgba(69, 10, 10, 0.1)');
        grad.addColorStop(0.5, p.color);
        grad.addColorStop(1, '#ffffffcc');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(-len, 0);
        ctx.lineTo(0, -thickness);
        ctx.lineTo(len * 0.25, 0);
        ctx.lineTo(0, thickness);
        ctx.closePath();
        ctx.fill();
      } else if (p.shape === 'micro_mist') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'blood_bead') {
        ctx.translate(p.x, p.y);
        const velAngle = Math.atan2(p.vy, p.vx);
        ctx.rotate(velAngle);
        const stretch = Math.min(3.2, Math.hypot(p.vx, p.vy) / 110);

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * (0.9 + stretch * 0.55), p.size * 0.58, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.beginPath();
        ctx.ellipse(p.size * 0.28, -0.5, p.size * 0.24, p.size * 0.16, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'meat') {
        ctx.translate(p.x, p.y);
        if (p.rotation) ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(-p.size, -p.size * 0.6);
        ctx.lineTo(p.size * 0.8, -p.size * 0.4);
        ctx.lineTo(p.size, p.size * 0.7);
        ctx.lineTo(-p.size * 0.4, p.size);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#450a0a';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (p.shape === 'bone') {
        ctx.translate(p.x, p.y);
        if (p.rotation) ctx.rotate(p.rotation);
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(-p.size, -p.size * 0.4);
        ctx.lineTo(p.size, -p.size * 0.2);
        ctx.lineTo(p.size * 0.8, p.size * 0.4);
        ctx.lineTo(-p.size * 0.9, p.size * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-p.size * 0.3, -p.size * 0.1, p.size * 0.6, p.size * 0.2);
      } else if (p.shape === 'smoke') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'spark') {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else if (p.shape === 'ice') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - p.size);
        ctx.lineTo(p.x + p.size, p.y);
        ctx.lineTo(p.x, p.y + p.size);
        ctx.lineTo(p.x - p.size, p.y);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 4. Draw Strict 3-Strike Combo Evolution Badges
    for (let i = 0; i < this.comboSprites.length; i++) {
      const c = this.comboSprites[i];
      ctx.save();
      ctx.globalAlpha = c.alpha;
      ctx.translate(c.x, c.y);
      ctx.scale(c.scale, c.scale);

      ctx.save();
      ctx.rotate(c.rot);
      if (c.rank === 'BRUTAL') {
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#f59e0b';
        for (let b = 0; b < 4; b++) {
          const bang = (b * Math.PI) / 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(bang - 0.25) * 7, Math.sin(bang - 0.25) * 7);
          ctx.lineTo(Math.cos(bang) * 19, Math.sin(bang) * 19);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 14, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 14, Math.PI * 0.6, Math.PI * 1.4);
        ctx.stroke();
      }
      ctx.restore();

      ctx.shadowColor = c.glowColor;
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px "Cinzel", "Impact", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${c.hits}/3 ${c.label}`, 0, -20);

      ctx.fillStyle = c.color;
      ctx.fillRect(-26, -12, 52, 2);

      ctx.restore();
    }

    // 5. Draw Fine Screen Lens Micro-Droplets & Slim Rivulet Trails
    for (let i = 0; i < this.screenDroplets.length; i++) {
      const d = this.screenDroplets[i];
      ctx.save();
      ctx.globalAlpha = d.alpha;

      const dripHeight = Math.min(26, d.trailLength);
      const dripGrad = ctx.createLinearGradient(0, d.y - dripHeight, 0, d.y);
      dripGrad.addColorStop(0, 'rgba(69, 10, 10, 0.08)');
      dripGrad.addColorStop(0.6, d.color);
      dripGrad.addColorStop(1, '#450a0a');
      ctx.fillStyle = dripGrad;
      ctx.fillRect(d.x - d.radius * 0.28, d.y - dripHeight, d.radius * 0.56, dripHeight);

      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.beginPath();
      ctx.arc(d.x - d.radius * 0.28, d.y - d.radius * 0.28, d.radius * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
