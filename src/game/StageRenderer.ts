/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StageId, VancouverLevelDesign, StagePlatform, LevelStrideZone } from '../types/fighter';
import { Fighter } from './FighterEngine';
import { getActiveVancouverDesign } from './VancouverLevelDesigner';

export class StageRenderer {
  private tick = 0;
  private soulColliderImg: HTMLImageElement | null = null;
  private soulColliderLoaded = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.soulColliderImg = new Image();
      this.soulColliderImg.src = '/assets/aistudio/IMG_3375_171c7850.jpeg';
      this.soulColliderImg.onload = () => {
        this.soulColliderLoaded = true;
      };
    }
  }

  /**
   * 1. Multi-Layer Background Sky, Mountains, Celestial Bodies & Parallax
   * Rendered in screen space (before camera transform)
   */
  public drawBackground(
    ctx: CanvasRenderingContext2D,
    stage: StageId,
    width: number,
    height: number,
    cameraX: number
  ) {
    this.tick++;

    const vancouverDesign = getActiveVancouverDesign(stage);
    if (vancouverDesign) {
      this.drawVancouverBg(ctx, vancouverDesign, width, height, cameraX);
    } else if (stage === 'SOUL_COLLIDER') {
      this.drawSoulColliderBg(ctx, width, height, cameraX);
    } else if (stage === 'THE_PIT') {
      this.drawThePitBg(ctx, width, height, cameraX);
    } else if (stage === 'NETHERREALM') {
      this.drawNetherrealmBg(ctx, width, height, cameraX);
    } else if (stage === 'ICE_TEMPLE') {
      this.drawIceTempleBg(ctx, width, height, cameraX);
    } else {
      this.drawCourtyardBg(ctx, width, height, cameraX);
    }
  }

  /**
   * 2. Full-Span Arena Playfield: Floor, Balustrades, Pillars, Spikes, Torches & Shadows
   * Rendered INSIDE camera transform space (spanning from x = -600 to x = 1600 at floorY = 445)
   */
  public drawArena(
    ctx: CanvasRenderingContext2D,
    stage: StageId,
    width: number,
    height: number,
    p1: Fighter,
    cpu: Fighter,
    floorY = 445,
    is3DMode = true
  ) {
    const vancouverDesign = getActiveVancouverDesign(stage);
    if (vancouverDesign) {
      this.drawVancouverArena(ctx, vancouverDesign, p1, cpu, floorY);
    } else if (stage === 'SOUL_COLLIDER') {
      this.drawSoulColliderArena(ctx, width, height, p1, cpu, floorY);
    } else if (stage === 'THE_PIT') {
      this.drawThePitArena(ctx, width, height, p1, cpu, floorY);
    } else if (stage === 'NETHERREALM') {
      this.drawNetherrealmArena(ctx, width, height, p1, cpu, floorY);
    } else if (stage === 'ICE_TEMPLE') {
      this.drawIceTempleArena(ctx, width, height, p1, cpu, floorY);
    } else {
      this.drawCourtyardArena(ctx, width, height, p1, cpu, floorY);
    }

    // 3D Mode Perspective Floor Grid & Depth Horizon Sheen
    if (is3DMode) {
      ctx.save();
      const leftBound = -1200;
      const rightBound = 2200;
      const vanishX = 480;
      const horizonY = floorY - 110;
      const depthGrad = ctx.createLinearGradient(0, floorY, 0, floorY + 46);
      depthGrad.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
      depthGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.22)';
      ctx.lineWidth = 1;

      for (let gx = leftBound; gx <= rightBound; gx += 120) {
        const dx = gx - vanishX;
        const farX = vanishX + dx * 1.18;
        ctx.beginPath();
        ctx.moveTo(gx, floorY);
        ctx.lineTo(farX + (gx - vanishX) * 0.04, floorY + 44);
        ctx.stroke();
      }

      // 3D horizon specular rim on floor edge
      ctx.fillStyle = depthGrad;
      ctx.fillRect(leftBound, floorY, rightBound - leftBound, 24);
      void horizonY;
      ctx.restore();
    }
  }

  /**
   * Composite fallback helper
   */
  public drawStage(
    ctx: CanvasRenderingContext2D,
    stage: StageId,
    width: number,
    height: number,
    p1: Fighter,
    cpu: Fighter,
    cameraX: number,
    floorY = 445,
    is3DMode = true
  ) {
    this.drawBackground(ctx, stage, width, height, cameraX);
    this.drawArena(ctx, stage, width, height, p1, cpu, floorY, is3DMode);
  }

  // ==========================================
  // 1. THE PIT // MOONLIT BRIDGE (SIGNATURE ARENA)
  // ==========================================

  private drawThePitBg(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cameraX: number
  ) {
    const parallaxDistant = (cameraX - 480) * 0.03;
    const parallaxMid = (cameraX - 480) * 0.08;

    // 1. Deep Midnight Cosmic Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#02040c');
    skyGrad.addColorStop(0.35, '#080d24');
    skyGrad.addColorStop(0.7, '#131b3e');
    skyGrad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Deep space stellar dust & stars
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    for (let i = 0; i < 45; i++) {
      const sx = ((i * 67 + parallaxDistant * 0.4) % width + width) % width;
      const sy = (i * 23) % (height * 0.65);
      const sSize = i % 4 === 0 ? 2.5 : (i % 2 === 0 ? 1.5 : 1);
      ctx.fillRect(sx, sy, sSize, sSize);
    }

    // 2. Giant Luminous 64-Bit Outworld Full Moon + Atmospheric Horizon Haze
    ctx.save();
    const moonX = width * 0.5 - parallaxDistant;
    const moonY = 112;
    const moonRadius = 74;

    // Horizon indigo mist band
    const hazeGrad = ctx.createLinearGradient(0, height * 0.42, 0, height);
    hazeGrad.addColorStop(0, 'rgba(30, 27, 75, 0)');
    hazeGrad.addColorStop(0.65, 'rgba(49, 46, 129, 0.25)');
    hazeGrad.addColorStop(1, 'rgba(15, 23, 42, 0.65)');
    ctx.fillStyle = hazeGrad;
    ctx.fillRect(0, height * 0.42, width, height * 0.58);

    // Outer soft atmospheric corona glow
    const moonGlow = ctx.createRadialGradient(moonX, moonY, moonRadius * 0.7, moonX, moonY, moonRadius * 2.1);
    moonGlow.addColorStop(0, 'rgba(224, 231, 255, 0.48)');
    moonGlow.addColorStop(0.45, 'rgba(165, 180, 252, 0.20)');
    moonGlow.addColorStop(1, 'rgba(99, 102, 241, 0)');
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonRadius * 2.1, 0, Math.PI * 2);
    ctx.fill();

    // Solid Moon Disk
    ctx.shadowColor = 'rgba(224, 231, 255, 0.85)';
    ctx.shadowBlur = 34;
    const moonGrad = ctx.createLinearGradient(moonX - moonRadius, moonY - moonRadius, moonX + moonRadius, moonY + moonRadius);
    moonGrad.addColorStop(0, '#ffffff');
    moonGrad.addColorStop(0.55, '#e2e8f0');
    moonGrad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
    ctx.fill();

    // Authentic Lunar Maria & Craters
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(100, 116, 139, 0.36)';
    ctx.beginPath();
    ctx.arc(moonX - 22, moonY - 14, 16, 0, Math.PI * 2);
    ctx.arc(moonX + 24, moonY + 16, 20, 0, Math.PI * 2);
    ctx.arc(moonX + 32, moonY - 20, 11, 0, Math.PI * 2);
    ctx.arc(moonX - 10, moonY + 28, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(71, 85, 105, 0.45)';
    ctx.beginPath();
    ctx.arc(moonX - 20, moonY - 12, 6, 0, Math.PI * 2);
    ctx.arc(moonX + 22, moonY + 18, 8, 0, Math.PI * 2);
    ctx.arc(moonX + 30, moonY - 18, 4, 0, Math.PI * 2);
    ctx.fill();

    // Classic MK Pit Silhouette: Winged Dragon / Wraith gliding across the moon
    const flyerProgress = ((this.tick * 0.65) % (width + 400)) - 200;
    const flyerY = moonY + Math.sin(this.tick * 0.08) * 9;
    const wingFlap = Math.sin(this.tick * 0.24) * 7;
    ctx.fillStyle = 'rgba(7, 10, 26, 0.85)';
    ctx.beginPath();
    ctx.moveTo(flyerProgress, flyerY);
    ctx.quadraticCurveTo(flyerProgress - 14, flyerY - 10 - wingFlap, flyerProgress - 26, flyerY - 3 + wingFlap);
    ctx.lineTo(flyerProgress - 8, flyerY + 4);
    ctx.quadraticCurveTo(flyerProgress + 10, flyerY - 9 - wingFlap, flyerProgress + 24, flyerY - 2 + wingFlap);
    ctx.lineTo(flyerProgress + 6, flyerY + 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // 3. Drifting Outworld Clouds (Passing in front of moon with depth)
    const cloud1X = ((this.tick * 0.28 + parallaxDistant) % (width + 360)) - 180;
    const cloud2X = ((this.tick * 0.16 + 280 + parallaxDistant) % (width + 420)) - 210;
    this.drawCloudLayer(ctx, cloud1X, 95, 220, 44, 'rgba(30, 27, 75, 0.42)');
    this.drawCloudLayer(ctx, cloud2X, 135, 260, 52, 'rgba(15, 23, 42, 0.55)');

    // 4. Distant Outworld Jagged Mountain Ranges (Parallax Mid)
    ctx.fillStyle = '#050816';
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, 310);
    ctx.lineTo(120 - parallaxMid * 0.7, 235);
    ctx.lineTo(260 - parallaxMid * 0.7, 272);
    ctx.lineTo(430 - parallaxMid * 0.7, 205);
    ctx.lineTo(610 - parallaxMid * 0.7, 258);
    ctx.lineTo(790 - parallaxMid * 0.7, 218);
    ctx.lineTo(width, 270);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // Layer 2: Near crags with crisp moonlit edge rim
    ctx.fillStyle = '#0a0f24';
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, 340);
    ctx.lineTo(90 - parallaxMid, 286);
    ctx.lineTo(220 - parallaxMid, 318);
    ctx.lineTo(380 - parallaxMid, 265);
    ctx.lineTo(540 - parallaxMid, 312);
    ctx.lineTo(710 - parallaxMid, 276);
    ctx.lineTo(870 - parallaxMid, 308);
    ctx.lineTo(width, 295);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(165, 180, 252, 0.28)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 340);
    ctx.lineTo(90 - parallaxMid, 286);
    ctx.lineTo(220 - parallaxMid, 318);
    ctx.lineTo(380 - parallaxMid, 265);
    ctx.lineTo(540 - parallaxMid, 312);
    ctx.lineTo(710 - parallaxMid, 276);
    ctx.lineTo(870 - parallaxMid, 308);
    ctx.lineTo(width, 295);
    ctx.stroke();

    // Twin Outworld Citadel Fortress Spires with lit lancet windows & banners
    const drawCitadelSpire = (baseX: number, topY: number, spireW: number) => {
      ctx.fillStyle = '#060918';
      ctx.fillRect(baseX, topY + 34, spireW, 110);
      // Pagoda roof tiers
      ctx.beginPath();
      ctx.moveTo(baseX - 10, topY + 36);
      ctx.lineTo(baseX + spireW / 2, topY);
      ctx.lineTo(baseX + spireW + 10, topY + 36);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(baseX + spireW / 2 - 3, topY + 48, 6, 12);
      ctx.fillStyle = 'rgba(220, 38, 38, 0.55)';
      ctx.fillRect(baseX + spireW / 2 - 4, topY + 68, 8, 20);
    };

    drawCitadelSpire(150 - parallaxMid * 0.8, 198, 28);
    drawCitadelSpire(740 - parallaxMid * 0.85, 178, 32);
  }

  private drawThePitArena(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    p1: Fighter,
    cpu: Fighter,
    floorY: number
  ) {
    const leftBound = -1200;
    const rightBound = 2200;
    const totalSpan = rightBound - leftBound;

    // 1. Bottomless Spiked Pit Abyss Below the Bridge (deep fill for tall mobile viewports)
    const pitGrad = ctx.createLinearGradient(0, floorY + 44, 0, floorY + 700);
    pitGrad.addColorStop(0, '#040714');
    pitGrad.addColorStop(0.25, '#090d1f');
    pitGrad.addColorStop(1, '#010206');
    ctx.fillStyle = pitGrad;
    ctx.fillRect(leftBound, floorY + 44, totalSpan, 760);

    // Bed of sharpened steel spikes spanning entire arena
    ctx.fillStyle = '#1e293b';
    for (let x = leftBound; x < rightBound; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, floorY + 140);
      ctx.lineTo(x + 16, floorY + 68);
      ctx.lineTo(x + 32, floorY + 140);
      ctx.closePath();
      ctx.fill();

      // Metallic sheen on spike tip
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 16, floorY + 68);
      ctx.lineTo(x + 16, floorY + 140);
      ctx.stroke();
    }

    // Impaled Skeletal Skulls & Remains on Spikes (Classic MK Pit Detail)
    ctx.fillStyle = '#e2e8f0';
    for (let x = -200; x < 1200; x += 190) {
      ctx.beginPath();
      ctx.arc(x + 16, floorY + 74, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x + 14, floorY + 73, 2, 2);
      ctx.fillRect(x + 17, floorY + 73, 2, 2);
      ctx.fillStyle = '#e2e8f0';
    }

    // Eerie Green Soul-Vapor Mist swirling above the spikes
    const mistPhase = Math.sin(this.tick * 0.04) * 15;
    const mistGrad = ctx.createLinearGradient(0, floorY + 50, 0, floorY + 110);
    mistGrad.addColorStop(0, 'rgba(34, 197, 94, 0)');
    mistGrad.addColorStop(0.5, 'rgba(34, 197, 94, 0.16)');
    mistGrad.addColorStop(1, 'rgba(34, 197, 94, 0)');
    ctx.fillStyle = mistGrad;
    ctx.fillRect(leftBound, floorY + 50 + mistPhase, totalSpan, 60);

    // Swaying Iron Suspension Chains suspended below the bridge
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    const chainAnchors = [-160, 180, 480, 780, 1120];
    for (const cx of chainAnchors) {
      const sway = Math.sin(this.tick * 0.03 + cx * 0.02) * 8;
      ctx.beginPath();
      ctx.moveTo(cx - 80, floorY + 44);
      ctx.quadraticCurveTo(cx + sway, floorY + 95, cx + 80, floorY + 44);
      ctx.stroke();
    }

    // 2. Colossal Stone Bridge Pillars descending into the Abyss
    const pillarPositions = [-650, -300, 50, 480, 910, 1300, 1680];
    for (const px of pillarPositions) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(px - 28, floorY + 44, 56, 650);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(px - 34, floorY + 44, 68, 14);
      ctx.fillStyle = '#090d16';
      ctx.fillRect(px - 14, floorY + 58, 8, 620);
      ctx.fillRect(px + 6, floorY + 58, 8, 620);
    }

    // 3. Carved Stone Balustrade Railing & Demon Gargoyle Columns behind Fighters
    ctx.fillStyle = '#151b36';
    ctx.fillRect(leftBound, floorY - 38, totalSpan, 11);
    ctx.fillStyle = '#2d3763';
    ctx.fillRect(leftBound, floorY - 38, totalSpan, 2);

    for (let x = leftBound; x < rightBound; x += 40) {
      ctx.fillStyle = '#1c2445';
      ctx.fillRect(x + 12, floorY - 27, 16, 27);
      ctx.strokeStyle = '#313d70';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 12, floorY - 27, 16, 27);
    }

    // Gargoyle Sentinels flanking center stage
    const gargoyleXs = [210, 750];
    for (const gx of gargoyleXs) {
      ctx.fillStyle = '#11162c';
      ctx.fillRect(gx - 16, floorY - 76, 32, 76);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(gx - 20, floorY - 82, 40, 10);
      // Horned demon crest & glowing eyes
      ctx.beginPath();
      ctx.moveTo(gx - 14, floorY - 82);
      ctx.lineTo(gx - 22, floorY - 102);
      ctx.lineTo(gx - 4, floorY - 82);
      ctx.moveTo(gx + 14, floorY - 82);
      ctx.lineTo(gx + 22, floorY - 102);
      ctx.lineTo(gx + 4, floorY - 82);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(gx - 7, floorY - 70, 4, 3);
      ctx.fillRect(gx + 3, floorY - 70, 4, 3);
    }

    // 4. Extended Stone Bridge Walkway (Arena Ground: floorY = 445)
    ctx.fillStyle = '#11162b';
    ctx.fillRect(leftBound, floorY, totalSpan, 46);

    // Granite Flagstone Paver Blocks (80px wide blocks) with cracks & beveled sheen
    for (let x = leftBound; x < rightBound; x += 80) {
      const slabTint = (Math.abs(x) % 160 === 0) ? '#1a2040' : '#20274f';
      ctx.fillStyle = slabTint;
      ctx.fillRect(x + 2, floorY, 76, 43);

      // Top Edge Moonlight Highlight
      ctx.fillStyle = '#6366f1';
      ctx.fillRect(x + 2, floorY, 76, 3);
      ctx.fillStyle = '#c7d2fe';
      ctx.fillRect(x + 2, floorY, 76, 1.5);

      // Stone fissures & weathering
      if (Math.abs(x) % 160 === 0) {
        ctx.strokeStyle = 'rgba(10, 13, 30, 0.75)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x + 18, floorY + 4);
        ctx.lineTo(x + 28, floorY + 18);
        ctx.lineTo(x + 22, floorY + 34);
        ctx.stroke();
      }

      // Engraved Outworld Tournament Runes on select stones
      if (Math.abs(x) % 240 === 0) {
        ctx.strokeStyle = 'rgba(165, 180, 252, 0.42)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 30, floorY + 12);
        ctx.lineTo(x + 40, floorY + 28);
        ctx.lineTo(x + 50, floorY + 12);
        ctx.moveTo(x + 32, floorY + 20);
        ctx.lineTo(x + 48, floorY + 20);
        ctx.stroke();
      }

      // Vertical grout joints between stone blocks
      ctx.fillStyle = '#070916';
      ctx.fillRect(x + 78, floorY, 4, 45);
    }

    // Center Arena Carved Outworld Dragon Medallion Seal (x = 480)
    ctx.save();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(480, floorY + 18, 42, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
    ctx.fill();
    ctx.restore();

    // Bottom bevel of bridge deck
    ctx.fillStyle = '#060811';
    ctx.fillRect(leftBound, floorY + 43, totalSpan, 3);

    // 5. Dynamic Fighter Shadows Projected on Bridge Floor
    this.drawDynamicFighterShadow(ctx, p1, 80, floorY);
    this.drawDynamicFighterShadow(ctx, p1, 880, floorY);
    this.drawDynamicFighterShadow(ctx, cpu, 80, floorY);
    this.drawDynamicFighterShadow(ctx, cpu, 880, floorY);

    // 6. Roaring Green Soul-Fire Torches in Carved Stone Braziers + Floor Glow Pools
    const torchPositions = [80, 340, 620, 880];
    const glowPulse = 0.14 + Math.sin(this.tick * 0.18) * 0.05;
    for (const tx of torchPositions) {
      ctx.save();
      const poolGrad = ctx.createRadialGradient(tx, floorY + 4, 4, tx, floorY + 4, 65);
      poolGrad.addColorStop(0, `rgba(34, 197, 94, ${glowPulse})`);
      poolGrad.addColorStop(1, 'rgba(34, 197, 94, 0)');
      ctx.fillStyle = poolGrad;
      ctx.fillRect(tx - 65, floorY - 4, 130, 32);
      ctx.restore();
      this.drawTorchPillar(ctx, tx, floorY - 145, '#22c55e');
    }
  }

  // ==========================================
  // 2. SOUL COLLIDER (CYBERNETIC TECH ARENA)
  // ==========================================

  private drawSoulColliderBg(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cameraX: number
  ) {
    const parallaxDistant = (cameraX - 480) * 0.06;

    if (this.soulColliderLoaded && this.soulColliderImg) {
      ctx.save();
      const img = this.soulColliderImg;
      const aspect = img.width / img.height;
      const targetH = height + 40;
      const targetW = targetH * aspect;
      const drawX = (width - targetW) * 0.5 - parallaxDistant * 0.5;
      ctx.drawImage(img, drawX, -20, targetW, targetH);

      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, 'rgba(10, 6, 16, 0.45)');
      grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.15)');
      grad.addColorStop(0.85, 'rgba(20, 10, 25, 0.6)');
      grad.addColorStop(1, 'rgba(10, 5, 15, 0.95)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    } else {
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#0c0714');
      skyGrad.addColorStop(0.5, '#1b1226');
      skyGrad.addColorStop(1, '#2c1e3b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);
    }

    const pulse1 = Math.sin(this.tick * 0.08) * 0.5 + 0.5;
    const pulse2 = Math.cos(this.tick * 0.06) * 0.5 + 0.5;

    // Green Fusion / Soul Incubator vapor glow
    ctx.save();
    ctx.fillStyle = `rgba(34, 197, 94, ${0.12 + pulse1 * 0.1})`;
    ctx.beginPath();
    ctx.arc(width * 0.82 - parallaxDistant, height * 0.28, 85 + pulse1 * 20, 0, Math.PI * 2);
    ctx.fill();

    // Netherrealm Portal purple vortex glow
    ctx.fillStyle = `rgba(168, 85, 247, ${0.14 + pulse2 * 0.12})`;
    ctx.beginPath();
    ctx.arc(width * 0.24 - parallaxDistant, height * 0.24, 95 + pulse2 * 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawSoulColliderArena(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    p1: Fighter,
    cpu: Fighter,
    floorY: number
  ) {
    const leftBound = -1200;
    const rightBound = 2200;
    const totalSpan = rightBound - leftBound;

    // Metal girder base beneath platform
    ctx.fillStyle = 'rgba(15, 12, 22, 0.98)';
    ctx.fillRect(leftBound, floorY, totalSpan, 750);

    // High-tech neon platform edge
    const edgeGrad = ctx.createLinearGradient(0, floorY - 3, 0, floorY + 8);
    edgeGrad.addColorStop(0, '#a855f7');
    edgeGrad.addColorStop(0.5, '#22c55e');
    edgeGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(leftBound, floorY - 2, totalSpan, 5);

    // Tread plate grating pattern
    ctx.strokeStyle = 'rgba(75, 85, 99, 0.4)';
    ctx.lineWidth = 1.5;
    for (let x = leftBound; x < rightBound; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, floorY);
      ctx.lineTo(x + 20, floorY + 35);
      ctx.stroke();
    }

    // Hazard warning stripes along catwalk border
    ctx.fillStyle = 'rgba(234, 179, 8, 0.8)';
    for (let x = leftBound; x < rightBound; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, floorY + 2);
      ctx.lineTo(x + 15, floorY + 2);
      ctx.lineTo(x + 25, floorY + 12);
      ctx.lineTo(x + 10, floorY + 12);
      ctx.closePath();
      ctx.fill();
    }

    // Dynamic Shadows
    this.drawDynamicFighterShadow(ctx, p1, 150, floorY);
    this.drawDynamicFighterShadow(ctx, cpu, 800, floorY);

    // Soul Steam Emitters
    const steamAlpha = 0.2 + Math.sin(this.tick * 0.1) * 0.1;
    ctx.fillStyle = `rgba(168, 85, 247, ${steamAlpha})`;
    ctx.beginPath();
    ctx.arc(80, floorY - 20, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(34, 197, 94, ${steamAlpha})`;
    ctx.beginPath();
    ctx.arc(880, floorY - 20, 35, 0, Math.PI * 2);
    ctx.fill();
  }

  // ==========================================
  // 3. NETHERREALM // VOLCANIC CRUCIBLE
  // ==========================================

  private drawNetherrealmBg(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cameraX: number
  ) {
    const parallaxMid = (cameraX - 480) * 0.08;

    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#1c0303');
    skyGrad.addColorStop(0.5, '#3a0808');
    skyGrad.addColorStop(1, '#5c0f0f');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Molten magma glow pulse
    const lavaPulse = Math.sin(this.tick * 0.05) * 16;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
    ctx.fillRect(0, 180 + lavaPulse, width, 180);

    // Volcanic spires in background
    ctx.fillStyle = '#1a0505';
    ctx.beginPath();
    ctx.moveTo(40 - parallaxMid, height);
    ctx.lineTo(120 - parallaxMid, 140);
    ctx.lineTo(190 - parallaxMid, height);
    ctx.moveTo(width - 240 - parallaxMid, height);
    ctx.lineTo(width - 150 - parallaxMid, 110);
    ctx.lineTo(width - 40 - parallaxMid, height);
    ctx.fill();
  }

  private drawNetherrealmArena(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    p1: Fighter,
    cpu: Fighter,
    floorY: number
  ) {
    const leftBound = -1200;
    const rightBound = 2200;
    const totalSpan = rightBound - leftBound;

    // Basalt Floor with glowing magma tide underneath
    ctx.fillStyle = '#1b0606';
    ctx.fillRect(leftBound, floorY, totalSpan, 750);

    const lavaGlow = 0.25 + Math.sin(this.tick * 0.08) * 0.1;
    ctx.fillStyle = `rgba(249, 115, 22, ${lavaGlow})`;
    ctx.fillRect(leftBound, floorY + 65, totalSpan, 36);

    // Molten magma fissure crack running through ground
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(leftBound, floorY);
    ctx.lineTo(rightBound, floorY);
    ctx.stroke();

    // Lava glow fissures & basalt stone joints
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.5;
    for (let x = leftBound; x < rightBound; x += 110) {
      ctx.beginPath();
      ctx.moveTo(x, floorY);
      ctx.lineTo(x + 25, floorY + 30);
      ctx.lineTo(x + 50, floorY + 15);
      ctx.stroke();
    }

    this.drawDynamicFighterShadow(ctx, p1, 130, floorY);
    this.drawDynamicFighterShadow(ctx, cpu, 830, floorY);

    this.drawTorchPillar(ctx, 130, floorY - 130, '#f97316');
    this.drawTorchPillar(ctx, 830, floorY - 130, '#f97316');
  }

  // ==========================================
  // 4. ICE TEMPLE // LIN KUEI SANCTUM
  // ==========================================

  private drawIceTempleBg(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cameraX: number
  ) {
    const parallaxMid = (cameraX - 480) * 0.08;

    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#030f1c');
    skyGrad.addColorStop(0.5, '#072440');
    skyGrad.addColorStop(1, '#0e4270');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Crystalline glacier peaks
    ctx.fillStyle = '#082b4a';
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(140 - parallaxMid, 210);
    ctx.lineTo(290 - parallaxMid, 290);
    ctx.lineTo(480 - parallaxMid, 175);
    ctx.lineTo(680 - parallaxMid, 275);
    ctx.lineTo(860 - parallaxMid, 200);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // Shimmering Aurora Borealis
    ctx.save();
    const auroraAlpha = 0.25 + Math.sin(this.tick * 0.03) * 0.12;
    ctx.fillStyle = `rgba(56, 189, 248, ${auroraAlpha})`;
    ctx.beginPath();
    ctx.moveTo(0, 90);
    ctx.bezierCurveTo(240, 50, 480, 140, width, 80);
    ctx.lineTo(width, 160);
    ctx.bezierCurveTo(520, 190, 200, 120, 0, 170);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawIceTempleArena(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    p1: Fighter,
    cpu: Fighter,
    floorY: number
  ) {
    const leftBound = -1200;
    const rightBound = 2200;
    const totalSpan = rightBound - leftBound;

    // Glacial Ice Floor with crystalline depth & specular ice tiles
    const iceGrad = ctx.createLinearGradient(0, floorY, 0, floorY + 700);
    iceGrad.addColorStop(0, '#0f3a60');
    iceGrad.addColorStop(1, '#031728');
    ctx.fillStyle = iceGrad;
    ctx.fillRect(leftBound, floorY, totalSpan, 750);

    for (let x = leftBound; x < rightBound; x += 90) {
      ctx.fillStyle = 'rgba(186, 230, 253, 0.08)';
      ctx.beginPath();
      ctx.moveTo(x, floorY + 2);
      ctx.lineTo(x + 40, floorY + 2);
      ctx.lineTo(x + 20, floorY + 34);
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(leftBound, floorY);
    ctx.lineTo(rightBound, floorY);
    ctx.stroke();

    this.drawDynamicFighterShadow(ctx, p1, 140, floorY);
    this.drawDynamicFighterShadow(ctx, cpu, 820, floorY);

    this.drawTorchPillar(ctx, 140, floorY - 130, '#38bdf8');
    this.drawTorchPillar(ctx, 820, floorY - 130, '#38bdf8');
  }

  // ==========================================
  // 5. SHANG TSUNG'S COURTYARD // ANCIENT ARENA
  // ==========================================

  private drawCourtyardBg(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cameraX: number
  ) {
    const parallaxMid = (cameraX - 480) * 0.06;
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#120716');
    skyGrad.addColorStop(0.6, '#28131e');
    skyGrad.addColorStop(1, '#4a1525');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Temple Pagoda Rooftop Silhouette
    ctx.fillStyle = '#180a14';
    ctx.fillRect(width * 0.15 - parallaxMid, 240, width * 0.7, 140);

    // Ancient Golden Ceremonial Dragon Gong
    ctx.save();
    ctx.fillStyle = '#78350f';
    ctx.fillRect(width / 2 - 70 - parallaxMid * 0.5, 160, 14, 150);
    ctx.fillRect(width / 2 + 56 - parallaxMid * 0.5, 160, 14, 150);
    ctx.fillRect(width / 2 - 80 - parallaxMid * 0.5, 150, 160, 16);

    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.arc(width / 2 - parallaxMid * 0.5, 220, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  private drawCourtyardArena(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    p1: Fighter,
    cpu: Fighter,
    floorY: number
  ) {
    const leftBound = -1200;
    const rightBound = 2200;
    const totalSpan = rightBound - leftBound;

    ctx.fillStyle = '#261a1a';
    ctx.fillRect(leftBound, floorY, totalSpan, 750);

    for (let x = leftBound; x < rightBound; x += 80) {
      ctx.fillStyle = Math.abs(x) % 160 === 0 ? '#312020' : '#291a1a';
      ctx.fillRect(x + 2, floorY + 2, 76, 38);
    }

    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(leftBound, floorY);
    ctx.lineTo(rightBound, floorY);
    ctx.stroke();

    this.drawDynamicFighterShadow(ctx, p1, 120, floorY);
    this.drawDynamicFighterShadow(ctx, cpu, 840, floorY);

    this.drawTorchPillar(ctx, 120, floorY - 130, '#f59e0b');
    this.drawTorchPillar(ctx, 840, floorY - 130, '#f59e0b');
  }

  // ==========================================
  // SHARED RENDERING UTILITIES
  // ==========================================

  private drawCloudLayer(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    color: string
  ) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
    ctx.ellipse(x + w * 0.25, y - 6, w * 0.35, h * 0.45, 0, 0, Math.PI * 2);
    ctx.ellipse(x - w * 0.25, y + 4, w * 0.3, h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawDynamicFighterShadow(
    ctx: CanvasRenderingContext2D,
    fighter: Fighter,
    lightX: number,
    floorY: number
  ) {
    const dx = (fighter.x + 28) - lightX;
    const shadowDist = Math.max(-45, Math.min(45, dx * 0.2));

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
    ctx.beginPath();
    ctx.ellipse(fighter.x + 28 + shadowDist, floorY + 2, 34, 7, (shadowDist / 60) * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawTorchPillar(ctx: CanvasRenderingContext2D, x: number, y: number, flameColor: string) {
    // Stone Brazier Column Body
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x - 14, y, 28, 145);
    // Flared Stone Basin Cap
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x - 20, y, 40, 14);
    // Heavy Stone Pedestal Base
    ctx.fillRect(x - 24, y + 135, 48, 10);

    // Animated Fire Flickering
    const flickerY = Math.sin(this.tick * 0.22 + x) * 4;
    const flickerX = Math.cos(this.tick * 0.18 + x) * 2.5;

    ctx.save();
    ctx.shadowColor = flameColor;
    ctx.shadowBlur = 24;
    ctx.fillStyle = flameColor;
    ctx.beginPath();
    ctx.moveTo(x - 12, y);
    ctx.quadraticCurveTo(x + flickerX, y - 28 + flickerY, x, y - 42 + flickerY);
    ctx.quadraticCurveTo(x + 12, y - 18, x + 12, y);
    ctx.closePath();
    ctx.fill();

    // Hot Core Flame
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y - 10, 5, 0, Math.PI * 2);
    ctx.fill();

    // Rising Ember Sparks
    const ember1 = (this.tick * 3 + x * 7) % 55;
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(x - 4 + flickerX, y - 20 - ember1, 2.5, 2.5);
    const ember2 = (this.tick * 2.5 + x * 13) % 45;
    ctx.fillRect(x + 5 - flickerX, y - 25 - ember2, 2, 2);

    ctx.restore();
  }

  // ==========================================
  // 6. 1960s VANCOUVER AI ARCHITECT STAGES
  // ==========================================

  private drawVancouverBg(
    ctx: CanvasRenderingContext2D,
    design: VancouverLevelDesign,
    width: number,
    height: number,
    cameraX: number
  ) {
    const parallaxFar = (cameraX - 480) * 0.035;
    const parallaxMid = (cameraX - 480) * 0.085;

    // 1. Era Sky Gradient
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, design.skyPalette[0]);
    sky.addColorStop(0.52, design.skyPalette[1]);
    sky.addColorStop(1, design.skyPalette[2]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // 2. North Shore Mountains (Grouse & Lions peaks)
    ctx.fillStyle = 'rgba(6, 12, 24, 0.72)';
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, 290);
    ctx.lineTo(130 - parallaxFar, 215);
    ctx.lineTo(255 - parallaxFar, 250);
    ctx.lineTo(395 - parallaxFar, 185);
    ctx.lineTo(540 - parallaxFar, 242);
    ctx.lineTo(710 - parallaxFar, 198);
    ctx.lineTo(width, 255);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // 3. Era Watermark & District Sky Title (Subtle architectural silhouette)
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.font = '900 44px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillText(`VANCOUVER ${design.year}`, width * 0.5 - parallaxFar * 0.5, 92);
    ctx.restore();

    // 4. Landmark-Specific 1960s Architecture
    ctx.save();
    if (design.landmarkType === 'LIONS_GATE_BRIDGE') {
      const tower1X = width * 0.28 - parallaxMid;
      const tower2X = width * 0.72 - parallaxMid;
      // Suspension towers
      ctx.fillStyle = '#0f2b3c';
      for (const tx of [tower1X, tower2X]) {
        ctx.fillRect(tx - 12, 115, 8, 250);
        ctx.fillRect(tx + 4, 115, 8, 250);
        ctx.fillRect(tx - 14, 145, 28, 10);
        ctx.fillRect(tx - 14, 195, 28, 10);
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(tx, 112, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f2b3c';
      }
      // Suspension cables
      ctx.strokeStyle = design.accentColor;
      ctx.globalAlpha = 0.48;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(0, 260);
      ctx.quadraticCurveTo(tower1X * 0.5, 250, tower1X, 118);
      ctx.quadraticCurveTo((tower1X + tower2X) * 0.5, 295, tower2X, 118);
      ctx.quadraticCurveTo((tower2X + width) * 0.5, 250, width, 260);
      ctx.stroke();
    } else if (design.landmarkType === 'CHINATOWN_GATE') {
      // Ornate Paifang Gate + Vertical 1960s Neon Signs
      const gx = width * 0.5 - parallaxMid;
      ctx.fillStyle = '#1f0b18';
      ctx.fillRect(gx - 125, 165, 14, 210);
      ctx.fillRect(gx + 111, 165, 14, 210);
      // Pagoda Eaves
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.moveTo(gx - 165, 168);
      ctx.lineTo(gx, 128);
      ctx.lineTo(gx + 165, 168);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Vertical Glowing 1960s Neon Marquees
      const drawNeonSign = (sx: number, sy: number, label: string, col: string) => {
        ctx.save();
        ctx.shadowColor = col;
        ctx.shadowBlur = 16;
        ctx.fillStyle = 'rgba(10, 8, 22, 0.88)';
        ctx.fillRect(sx - 18, sy, 36, 112);
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.strokeRect(sx - 18, sy, 36, 112);
        ctx.fillStyle = col;
        ctx.font = 'bold 11px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        label.split('').forEach((ch, idx) => {
          ctx.fillText(ch, sx, sy + 18 + idx * 14);
        });
        ctx.restore();
      };
      drawNeonSign(140 - parallaxMid, 145, 'PENDER', '#ec4899');
      drawNeonSign(width - 140 - parallaxMid, 138, 'DRAGON', '#10b981');
    } else if (design.landmarkType === 'GASTOWN_STEAM_CLOCK') {
      // Red-brick Heritage skyline + Puffing Steam Clock silhouette
      ctx.fillStyle = '#1b1113';
      for (let bx = 0; bx < width; bx += 110) {
        const bh = 135 + ((bx * 37) % 60);
        ctx.fillRect(bx - (parallaxMid % 110), height - bh - 95, 102, bh);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
        for (let wy = height - bh - 75; wy < height - 135; wy += 26) {
          ctx.fillRect(bx - (parallaxMid % 110) + 18, wy, 14, 16);
          ctx.fillRect(bx - (parallaxMid % 110) + 56, wy, 14, 16);
        }
        ctx.fillStyle = '#1b1113';
      }
      // Steam Clock Brass Pillar
      const cx = width * 0.5 - parallaxMid;
      ctx.fillStyle = '#291c12';
      ctx.fillRect(cx - 20, 175, 40, 200);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(cx, 205, 13, 0, Math.PI * 2);
      ctx.fill();
      // Animated steam puffs
      const puff = (this.tick * 1.4) % 70;
      ctx.fillStyle = `rgba(226, 232, 240, ${Math.max(0, 0.4 - puff / 160)})`;
      ctx.beginPath();
      ctx.arc(cx, 162 - puff, 10 + puff * 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (design.landmarkType === 'FALSE_CREEK_DOCKS') {
      // Timber Sawmill Cranes & Burrard Harbor Reflections
      ctx.fillStyle = '#091b1e';
      ctx.fillRect(0, 325, width, 150);
      const craneX = width * 0.7 - parallaxMid;
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(craneX, 340);
      ctx.lineTo(craneX + 20, 155);
      ctx.lineTo(craneX - 95, 195);
      ctx.stroke();
    } else {
      // Georgia Viaduct Concrete Arches + Outworld Sky Rift Fracture
      const rx = width * 0.5 - parallaxMid * 0.6;
      ctx.strokeStyle = design.accentColor;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = design.accentColor;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(rx - 70, 55);
      ctx.lineTo(rx - 15, 115);
      ctx.lineTo(rx + 25, 165);
      ctx.lineTo(rx - 5, 225);
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#151926';
      ctx.fillRect(0, 295, width, 24);
      for (let ax = -40; ax < width + 80; ax += 140) {
        ctx.fillRect(ax - (parallaxMid % 140), 319, 32, 130);
      }
    }
    ctx.restore();

    // 5. BC Electric Overhead Trolley Catena Wires
    ctx.save();
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 105);
    ctx.lineTo(width, 105);
    ctx.moveTo(0, 118);
    ctx.lineTo(width, 118);
    ctx.stroke();
    ctx.restore();

    // 6. Dynamic 1960s Vancouver Weather Layer (Rain / Fog / Neon Mist / Storm)
    this.drawVancouverWeather(ctx, width, height, design.weather, design.accentColor);
  }

  private drawVancouverWeather(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    weather: VancouverLevelDesign['weather'],
    accentColor: string
  ) {
    ctx.save();
    if (weather === 'RAIN' || weather === 'DRIZZLE' || weather === 'STORM') {
      const count = weather === 'DRIZZLE' ? 32 : 68;
      ctx.strokeStyle = weather === 'STORM' ? 'rgba(165, 180, 252, 0.35)' : 'rgba(148, 163, 184, 0.28)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const rx = ((i * 83 + this.tick * 4) % width + width) % width;
        const ry = ((i * 59 + this.tick * 11) % height + height) % height;
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 5, ry + (weather === 'DRIZZLE' ? 12 : 20));
      }
      ctx.stroke();
    }
    if (weather === 'FOG' || weather === 'NEON_MIST') {
      const drift = Math.sin(this.tick * 0.025) * 40;
      const mist = ctx.createLinearGradient(0, height * 0.55, 0, height);
      mist.addColorStop(0, 'rgba(15, 23, 42, 0)');
      mist.addColorStop(
        0.55,
        weather === 'NEON_MIST' ? 'rgba(236, 72, 153, 0.14)' : 'rgba(148, 163, 184, 0.22)'
      );
      mist.addColorStop(1, 'rgba(15, 23, 42, 0.45)');
      ctx.fillStyle = mist;
      ctx.fillRect(0, height * 0.55 + drift * 0.15, width, height * 0.45);
    }
    if (weather === 'STORM' && this.tick % 210 > 204) {
      ctx.fillStyle = `${accentColor}26`;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();
  }

  private drawVancouverArena(
    ctx: CanvasRenderingContext2D,
    design: VancouverLevelDesign,
    p1: Fighter,
    cpu: Fighter,
    floorY: number
  ) {
    const leftBound = -1200;
    const rightBound = 2200;
    const totalSpan = rightBound - leftBound;

    // 1. Rain-Slick 1960s Street / Pier Deck
    const deckGrad = ctx.createLinearGradient(0, floorY, 0, floorY + 260);
    deckGrad.addColorStop(0, '#1e2430');
    deckGrad.addColorStop(0.25, '#111622');
    deckGrad.addColorStop(1, '#05070d');
    ctx.fillStyle = deckGrad;
    ctx.fillRect(leftBound, floorY, totalSpan, 750);

    // Streetcar steel tracks / cobblestone joints
    ctx.fillStyle = '#090d16';
    ctx.fillRect(leftBound, floorY + 12, totalSpan, 3);
    ctx.fillRect(leftBound, floorY + 24, totalSpan, 3);
    for (let x = leftBound; x < rightBound; x += 72) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.fillRect(x, floorY + 2, 34, 8);
    }

    // Horizon road curb highlight
    ctx.strokeStyle = design.accentColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(leftBound, floorY);
    ctx.lineTo(rightBound, floorY);
    ctx.stroke();

    // 2. Render Manifested Physical "Strides" on Floor
    for (const stride of design.strides) {
      this.drawStrideZone(ctx, stride, floorY, p1, cpu);
    }

    // 3. Render Walkable Elevated 1960s Platforms (Streetcars, Brick Balconies, Neon Awnings)
    for (const plat of design.platforms) {
      this.drawStagePlatform(ctx, plat, design.accentColor);
    }

    // 4. Shadows & Vintage 1960s Streetlamps
    this.drawDynamicFighterShadow(ctx, p1, 160, p1.standingPlatform ? p1.standingPlatform.y : floorY);
    this.drawDynamicFighterShadow(ctx, cpu, 800, cpu.standingPlatform ? cpu.standingPlatform.y : floorY);

    for (const lx of [85, 875]) {
      ctx.save();
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(lx - 4, floorY - 148, 8, 148);
      ctx.fillStyle = '#fef08a';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 22;
      ctx.beginPath();
      ctx.arc(lx, floorY - 152, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawStrideZone(
    ctx: CanvasRenderingContext2D,
    stride: LevelStrideZone,
    floorY: number,
    p1: Fighter,
    cpu: Fighter
  ) {
    const w = stride.endX - stride.startX;
    const isOccupied =
      (p1.x + p1.width * 0.5 >= stride.startX && p1.x + p1.width * 0.5 <= stride.endX && p1.isGrounded) ||
      (cpu.x + cpu.width * 0.5 >= stride.startX && cpu.x + cpu.width * 0.5 <= stride.endX && cpu.isGrounded);

    ctx.save();
    const pulse = isOccupied ? 0.34 : 0.16 + Math.sin(this.tick * 0.08) * 0.05;
    ctx.fillStyle = `${stride.color}${Math.round(pulse * 255)
      .toString(16)
      .padStart(2, '0')}`;
    ctx.fillRect(stride.startX, floorY - 4, w, 14);

    // Illuminated border trim + chevron directional markers
    ctx.strokeStyle = stride.color;
    ctx.lineWidth = isOccupied ? 2.5 : 1.5;
    ctx.strokeRect(stride.startX, floorY - 3, w, 12);

    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = isOccupied ? 0.95 : 0.65;
    ctx.font = 'bold 9px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(stride.label, stride.startX + w * 0.5, floorY + 24);
    ctx.restore();
  }

  private drawStagePlatform(
    ctx: CanvasRenderingContext2D,
    plat: StagePlatform,
    accentColor: string
  ) {
    ctx.save();
    // Base beam
    ctx.fillStyle =
      plat.style === 'STREETCAR'
        ? '#065f46'
        : plat.style === 'NEON_AWNING'
        ? '#4c0519'
        : plat.style === 'TIMBER_PIER'
        ? '#451a03'
        : '#1e293b';
    ctx.fillRect(plat.x, plat.y, plat.width, 14);

    // Walkable surface trim
    ctx.fillStyle =
      plat.style === 'STREETCAR'
        ? '#fde68a'
        : plat.style === 'NEON_AWNING'
        ? '#f472b6'
        : accentColor;
    ctx.fillRect(plat.x, plat.y, plat.width, 3);

    // Support struts underneath
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.fillRect(plat.x + 14, plat.y + 14, 6, 12);
    ctx.fillRect(plat.x + plat.width - 20, plat.y + 14, 6, 12);

    ctx.fillStyle = 'rgba(241, 245, 249, 0.78)';
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(plat.label, plat.x + plat.width * 0.5, plat.y + 11);
    ctx.restore();
  }
}
