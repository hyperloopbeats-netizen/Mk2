/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type WeaponState = 'IDLE' | 'SHEATHED' | 'EXTENDING' | 'RETRACTING' | 'RECOIL';

export type WeaponClass =
  | 'CHAIN'
  | 'BLADE'
  | 'STAFF'
  | 'CRYOMANCER'
  | 'FANS'
  | 'SAI'
  | 'HAMMER'
  | 'BLAST'
  | 'SCYTHE'
  | 'NUNCHAKU'
  | 'CLAW'
  | 'HAT'
  | 'KNUCKLES';

export interface WeaponKinematics {
  state: WeaponState;
  stateTimer: number;
  extensionProgress: number; // 0.0 to 1.0
  recoilAngle: number;
  trailAlpha: number;
  hitConfirmed: boolean;
}

/* PROCEDURAL WEAPON MATRIX (PWM) with Dynamic State Machine */
export class ProceduralWeapon {
  public fighterId: string;
  public weaponClass: WeaponClass;
  public color: string;
  public trailPoints: Array<{ x: number; y: number; alpha: number }> = [];
  public animPhase: number = 0;
  public kinematics: WeaponKinematics;

  constructor(fighterId: string, weaponClass: WeaponClass = 'BLADE', primaryColor: string = '#e4e4e7') {
    this.fighterId = fighterId;
    this.weaponClass = weaponClass;
    this.color = primaryColor;
    this.kinematics = {
      state: 'IDLE',
      stateTimer: 0,
      extensionProgress: 0,
      recoilAngle: 0,
      trailAlpha: 0,
      hitConfirmed: false,
    };
  }

  public setWeaponClass(wClass: WeaponClass, color: string) {
    this.weaponClass = wClass;
    this.color = color;
  }

  public transitionState(newState: WeaponState) {
    if (this.kinematics.state === newState) return;
    this.kinematics.state = newState;
    this.kinematics.stateTimer = 0;
    if (newState === 'IDLE' || newState === 'SHEATHED') {
      this.kinematics.extensionProgress = 0;
      this.kinematics.recoilAngle = 0;
      this.kinematics.hitConfirmed = false;
    }
  }

  public update(dt: number, isAttacking: boolean, isWeaponStrike: boolean, isProjectileActive: boolean) {
    this.animPhase += dt * 8;
    this.kinematics.stateTimer += dt;

    switch (this.kinematics.state) {
      case 'IDLE':
        if (isWeaponStrike || isProjectileActive) {
          this.transitionState('EXTENDING');
        } else if (!isAttacking) {
          this.kinematics.extensionProgress = 0;
          this.kinematics.trailAlpha = Math.max(0, this.kinematics.trailAlpha - dt * 5);
        }
        break;

      case 'EXTENDING':
        this.kinematics.extensionProgress = Math.min(1.0, this.kinematics.extensionProgress + dt * 6.0);
        this.kinematics.trailAlpha = Math.min(1.0, this.kinematics.trailAlpha + dt * 7);
        if (this.kinematics.extensionProgress >= 1.0) {
          this.transitionState(this.kinematics.hitConfirmed ? 'RECOIL' : 'RETRACTING');
        }
        break;

      case 'RETRACTING':
        this.kinematics.extensionProgress = Math.max(0, this.kinematics.extensionProgress - dt * 4.5);
        this.kinematics.trailAlpha = Math.max(0, this.kinematics.trailAlpha - dt * 3.5);
        if (this.kinematics.extensionProgress <= 0.02) {
          this.kinematics.extensionProgress = 0;
          this.transitionState(isAttacking ? 'IDLE' : 'SHEATHED');
        }
        break;

      case 'RECOIL':
        this.kinematics.recoilAngle =
          Math.sin(this.kinematics.stateTimer * 28) * Math.exp(-this.kinematics.stateTimer * 8) * 0.45;
        this.kinematics.trailAlpha = Math.max(0, this.kinematics.trailAlpha - dt * 4);
        if (this.kinematics.stateTimer > 0.18) {
          this.transitionState('RETRACTING');
        }
        break;

      case 'SHEATHED':
        this.kinematics.extensionProgress = 0;
        this.kinematics.trailAlpha = 0;
        if (isAttacking && isWeaponStrike) {
          this.transitionState('EXTENDING');
        }
        break;
    }
  }

  public notifyHit() {
    this.kinematics.hitConfirmed = true;
    this.kinematics.recoilAngle = 0.38;
    this.transitionState('RECOIL');
  }

  // Sweeping Crescent Energy Trail & Localized Blade-Edge Glint Flash
  public renderSlashArc(ctx: CanvasRenderingContext2D, radius: number) {
    const { trailAlpha, extensionProgress, state } = this.kinematics;
    if (trailAlpha <= 0.05) return;

    ctx.save();
    ctx.globalAlpha = Math.min(0.88, trailAlpha * 0.9);
    const sweepEnd = -0.75 + extensionProgress * 2.15;
    const sweepStart = sweepEnd - 1.38;

    ctx.strokeStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 16;
    ctx.lineWidth = 8.5 * (0.4 + trailAlpha * 0.6);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, radius, sweepStart, sweepEnd);
    ctx.stroke();

    // Inner razor white-hot blade glint edge
    ctx.strokeStyle = '#ffffff';
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#ffffff';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 1.5, sweepStart + 0.16, sweepEnd);
    ctx.stroke();

    // Localized crescent tip gleam + radial micro-sparks strictly along the active weapon tip
    if (state === 'EXTENDING' && extensionProgress >= 0.22 && extensionProgress <= 0.92) {
      const tipAngle = sweepEnd;
      const tipX = Math.cos(tipAngle) * (radius + 1);
      const tipY = Math.sin(tipAngle) * (radius + 1);
      const flashAlpha = Math.sin(((extensionProgress - 0.22) / 0.7) * Math.PI);

      ctx.save();
      ctx.translate(tipX, tipY);
      ctx.rotate(tipAngle + Math.PI * 0.5);
      ctx.globalAlpha = Math.max(0.25, flashAlpha * 0.95);

      const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, 18);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.45, this.color);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();

      // Cross blade-glint flare
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(0, -2.2);
      ctx.lineTo(16, 0);
      ctx.lineTo(0, 2.2);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(1.8, 0);
      ctx.lineTo(0, 11);
      ctx.lineTo(-1.8, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  public render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    facing: 1 | -1,
    state: string,
    stateTimer: number
  ) {
    ctx.save();
    ctx.translate(x, y);
    if (facing === -1) ctx.scale(-1, 1);

    const { extensionProgress, recoilAngle, state: weaponState } = this.kinematics;

    switch (this.weaponClass) {
      case 'CHAIN': {
        if (
          state === 'SPEAR' ||
          state === 'SPEAR_THROW' ||
          weaponState === 'EXTENDING' ||
          weaponState === 'RETRACTING'
        ) {
          const reach = extensionProgress > 0 ? extensionProgress * 320 : Math.sin(stateTimer * 0.2) * 180 + 180;
          ctx.strokeStyle = '#e4e4e7';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, -30);

          for (let i = 0; i < reach; i += 10) {
            const slither = Math.sin(i * 0.05 + this.animPhase * 2) * 5;
            ctx.lineTo(i, -30 + slither);
          }
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          for (let i = 20; i < reach; i += 24) {
            const slither = Math.sin(i * 0.05 + this.animPhase * 2) * 5;
            ctx.fillRect(i - 2, -32 + slither, 4, 4);
          }

          const tipY = -30 + Math.sin(reach * 0.05 + this.animPhase * 2) * 5;
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.moveTo(reach, tipY - 8);
          ctx.lineTo(reach + 24, tipY);
          ctx.lineTo(reach, tipY + 8);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = '#f8fafc';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        break;
      }

      case 'BLADE': {
        ctx.save();
        ctx.translate(15, -35);
        this.renderSlashArc(ctx, 74);

        const swingAngle =
          state === 'ATTACK' || weaponState === 'EXTENDING'
            ? -1.1 + extensionProgress * 2.2 + recoilAngle
            : 0.2 + recoilAngle;
        ctx.rotate(swingAngle);

        // Wrapped Tsuka & Brass Tsuba Guard
        ctx.fillStyle = '#18181b';
        ctx.fillRect(-10, -3.5, 14, 7);
        ctx.fillStyle = '#eab308';
        ctx.fillRect(3, -6, 4, 12);

        // Beveled 64-bit Blade with Fuller & Luminous Edge
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(7, -3);
        ctx.lineTo(74 + extensionProgress * 14, -7);
        ctx.lineTo(84 + extensionProgress * 14, 0);
        ctx.lineTo(74 + extensionProgress * 14, 3);
        ctx.lineTo(7, 3);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 12;
        ctx.fillRect(9, -3.5, 65 + extensionProgress * 12, 2);

        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.fillRect(10, -0.8, 62 + extensionProgress * 12, 1.5);
        ctx.restore();
        break;
      }

      case 'STAFF': {
        ctx.save();
        ctx.translate(0, -25);
        this.renderSlashArc(ctx, 64);
        ctx.rotate(-0.6 + extensionProgress * 1.9 + recoilAngle);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-4, -62, 8, 124);

        ctx.fillStyle = '#eab308';
        ctx.fillRect(-5, -16, 10, 6);
        ctx.fillRect(-5, 10, 10, 6);

        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 14;
        ctx.fillRect(-5, -67, 10, 10);
        ctx.fillRect(-5, 57, 10, 10);
        ctx.restore();
        break;
      }

      case 'CRYOMANCER': {
        ctx.save();
        ctx.translate(20, -40);
        this.renderSlashArc(ctx, 56);
        ctx.rotate(-0.9 + extensionProgress * 2.0 + recoilAngle);
        ctx.fillStyle = '#bae6fd';
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(38 + extensionProgress * 12, -13);
        ctx.lineTo(54 + extensionProgress * 14, 0);
        ctx.lineTo(38 + extensionProgress * 12, 13);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(4, 0);
        ctx.lineTo(52 + extensionProgress * 12, 0);
        ctx.stroke();
        ctx.restore();
        break;
      }

      case 'FANS': {
        ctx.save();
        ctx.translate(18, -32);
        this.renderSlashArc(ctx, 52);
        ctx.rotate(-0.8 + extensionProgress * 1.9 + recoilAngle);
        ctx.fillStyle = '#0284c7';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 44, -Math.PI * 0.36, Math.PI * 0.36);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 2;
        for (let r = -0.3; r <= 0.3; r += 0.15) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(r * Math.PI) * 46, Math.sin(r * Math.PI) * 46);
          ctx.stroke();
        }
        ctx.restore();
        break;
      }

      case 'SAI': {
        ctx.save();
        ctx.translate(15, -34);
        this.renderSlashArc(ctx, 56);
        ctx.rotate(-0.5 + extensionProgress * 1.3 + recoilAngle);
        ctx.strokeStyle = '#f43f5e';
        ctx.shadowColor = '#d946ef';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(52 + extensionProgress * 15, 0);
        ctx.moveTo(12, -10);
        ctx.lineTo(20, -10);
        ctx.lineTo(20, 0);
        ctx.moveTo(12, 10);
        ctx.lineTo(20, 10);
        ctx.lineTo(20, 0);
        ctx.stroke();
        ctx.restore();
        break;
      }

      case 'HAMMER': {
        ctx.save();
        ctx.translate(10, -35);
        this.renderSlashArc(ctx, 68);
        ctx.rotate(-1.2 + extensionProgress * 2.2 + recoilAngle);
        ctx.fillStyle = '#52525b';
        ctx.fillRect(-3, -20, 6, 82);
        ctx.fillStyle = '#eab308';
        ctx.fillRect(-19, -38, 38, 24);
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.moveTo(19, -34);
        ctx.lineTo(33, -26);
        ctx.lineTo(19, -18);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        break;
      }

      case 'SCYTHE': {
        ctx.save();
        ctx.translate(10, -30);
        this.renderSlashArc(ctx, 68);
        ctx.rotate(-1.0 + extensionProgress * 2.1 + recoilAngle);
        ctx.fillStyle = '#18181b';
        ctx.fillRect(-3, -42, 6, 88);
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(0, -42);
        ctx.quadraticCurveTo(48, -58, 64, -22);
        ctx.quadraticCurveTo(32, -36, 0, -32);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        break;
      }

      case 'NUNCHAKU': {
        ctx.save();
        ctx.translate(16, -34);
        this.renderSlashArc(ctx, 58);
        const whip = Math.sin(this.animPhase * 2.8) * 0.45;
        ctx.rotate(-0.8 + extensionProgress * 2.4 + recoilAngle);
        // Handle 1
        ctx.fillStyle = '#18181b';
        ctx.fillRect(0, -3, 24, 6);
        ctx.fillStyle = '#eab308';
        ctx.fillRect(20, -3.5, 4, 7);
        // Chain link arc
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(24, 0);
        ctx.quadraticCurveTo(32, whip * 18, 40, whip * 8);
        ctx.stroke();
        // Swinging rod 2
        ctx.translate(40, whip * 8);
        ctx.rotate(whip + extensionProgress * 0.85);
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 12;
        ctx.fillRect(0, -3, 26, 6);
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.fillRect(2, -1, 22, 2);
        ctx.restore();
        break;
      }

      case 'CLAW': {
        ctx.save();
        ctx.translate(18, -32);
        this.renderSlashArc(ctx, 56);
        ctx.rotate(-0.75 + extensionProgress * 1.85 + recoilAngle);
        ctx.fillStyle = '#18181b';
        ctx.fillRect(-6, -8, 14, 16);
        // Triple serrated acid/steel talons
        for (const oy of [-6, 0, 6]) {
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.moveTo(8, oy - 2);
          ctx.lineTo(44 + extensionProgress * 14, oy - 1);
          ctx.lineTo(52 + extensionProgress * 16, oy);
          ctx.lineTo(44 + extensionProgress * 14, oy + 2);
          ctx.lineTo(8, oy + 2);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = this.color;
          ctx.fillRect(14, oy - 0.8, 32 + extensionProgress * 12, 1.4);
        }
        ctx.restore();
        break;
      }

      case 'HAT': {
        ctx.save();
        ctx.translate(16, -34);
        this.renderSlashArc(ctx, 62);
        const spin = state === 'ATTACK' || weaponState === 'EXTENDING' ? this.animPhase * 4.2 : 0.25;
        ctx.translate(extensionProgress * 22, 0);
        ctx.rotate(spin);
        // Razor brim disc
        ctx.fillStyle = '#e2e8f0';
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.ellipse(0, 0, 26, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2.4;
        ctx.stroke();
        // Crown
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.ellipse(0, -3, 13, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }

      case 'KNUCKLES': {
        ctx.save();
        ctx.translate(18, -32);
        this.renderSlashArc(ctx, 48);
        ctx.translate(extensionProgress * 18, 0);
        ctx.fillStyle = '#eab308';
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 12;
        ctx.fillRect(0, -10, 14, 20);
        ctx.fillStyle = this.color;
        for (const ky of [-7, -2, 3, 8]) {
          ctx.beginPath();
          ctx.arc(14, ky, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        break;
      }

      case 'BLAST': {
        ctx.save();
        ctx.translate(16, -30);
        this.renderSlashArc(ctx, 56);
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, -6, 36, 12);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(2, -4, 30, 6);
        if (state === 'ATTACK' || weaponState === 'EXTENDING') {
          ctx.fillStyle = this.color;
          ctx.shadowColor = this.color;
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(38 + extensionProgress * 6, 0, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(38 + extensionProgress * 6, 0, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        break;
      }
    }

    ctx.restore();
  }
}
