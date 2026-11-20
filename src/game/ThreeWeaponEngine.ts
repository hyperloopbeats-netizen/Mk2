/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { WeaponClass, WeaponState } from './ProceduralWeaponMatrix';

export interface WeaponRenderData {
  fighterId: string;
  weaponClass: WeaponClass;
  color: string;
  x: number;
  y: number;
  facing: 1 | -1;
  state: WeaponState;
  stateTimer: number;
  extensionProgress: number;
  recoilAngle: number;
  isWeaponActive: boolean;
  projX?: number;
  projY?: number;
  hasActiveSpear?: boolean;
}

export class ThreeWeaponEngine {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private pmremGenerator: THREE.PMREMGenerator;
  private envRT: THREE.WebGLRenderTarget;
  private ambientLight: THREE.AmbientLight;
  private dirLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private p1PointLight: THREE.PointLight;
  private cpuPointLight: THREE.PointLight;
  private isSoftwareGl: boolean = false;

  // 3D Weapon Models + Slash Ribbons + Chain Tethers
  private p1WeaponGroup: THREE.Group;
  private cpuWeaponGroup: THREE.Group;
  private p1SlashRibbon: THREE.Mesh;
  private cpuSlashRibbon: THREE.Mesh;
  private p1ChainTether: THREE.Mesh;
  private cpuChainTether: THREE.Mesh;
  private floorGridGroup: THREE.Group;
  private floorGridMesh: THREE.GridHelper;
  private floorGlowPlane: THREE.Mesh;

  private p1CurrentClass: WeaponClass | null = null;
  private cpuCurrentClass: WeaponClass | null = null;
  private p1CurrentColor: string = '';
  private cpuCurrentColor: string = '';

  // Particle sparks for 3D weapon clashing
  private sparkParticles: THREE.Points | null = null;
  private sparkPositions: Float32Array;
  private sparkVelocities: Float32Array;
  private sparkLifetimes: Float32Array;
  private readonly MAX_SPARKS = 96;

  // Reusable scratch objects (zero per-frame allocations)
  private readonly tmpVecA = new THREE.Vector3();
  private readonly tmpVecB = new THREE.Vector3();
  private readonly tmpColor = new THREE.Color();

  // Viewport tracking
  private width: number = 960;
  private height: number = 540;
  private modeBlend: number = 1.0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });

    const gl = this.renderer.getContext();
    const rendererInfo = gl?.getParameter?.(gl.RENDERER) || '';
    this.isSoftwareGl = /SwiftShader|llvmpipe|Software/i.test(String(rendererInfo));

    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.scene = new THREE.Scene();
    this.scene.environmentIntensity = 1.15;

    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.envRT = this.pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRT.texture;

    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 1, 3500);
    this.camera.position.set(this.width / 2, -this.height / 2, 650);
    this.camera.lookAt(this.width / 2, -this.height / 2, 0);

    // Studio PBR Lighting
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xfff7ed, 2.6);
    this.dirLight.position.set(220, 420, 520);
    this.scene.add(this.dirLight);

    this.rimLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
    this.rimLight.position.set(-280, 180, -320);
    this.scene.add(this.rimLight);

    this.p1PointLight = new THREE.PointLight(0xf97316, 2.8, 340);
    this.scene.add(this.p1PointLight);

    this.cpuPointLight = new THREE.PointLight(0x38bdf8, 2.8, 340);
    this.scene.add(this.cpuPointLight);

    this.p1WeaponGroup = new THREE.Group();
    this.cpuWeaponGroup = new THREE.Group();
    this.scene.add(this.p1WeaponGroup);
    this.scene.add(this.cpuWeaponGroup);

    // Dynamic 3D Crescent Slash Arc Ribbons
    this.p1SlashRibbon = this.createSlashRibbonMesh(0xf97316);
    this.cpuSlashRibbon = this.createSlashRibbonMesh(0x38bdf8);
    this.scene.add(this.p1SlashRibbon);
    this.scene.add(this.cpuSlashRibbon);

    // Live 3D Spear / Chain Tether
    this.p1ChainTether = this.createChainTetherMesh();
    this.cpuChainTether = this.createChainTetherMesh();
    this.scene.add(this.p1ChainTether);
    this.scene.add(this.cpuChainTether);

    // 3D Mode Illuminated Stage Depth Floor Grid (Aligned with floorY = 445 -> world Y = -445)
    this.floorGridGroup = new THREE.Group();
    this.floorGridGroup.position.set(480, -445, 0);

    const glowGeo = new THREE.PlaneGeometry(1400, 460);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.floorGlowPlane = new THREE.Mesh(glowGeo, glowMat);
    this.floorGlowPlane.rotation.x = -Math.PI / 2;
    this.floorGlowPlane.position.y = -0.5;
    this.floorGridGroup.add(this.floorGlowPlane);

    this.floorGridMesh = new THREE.GridHelper(1300, 28, 0x38bdf8, 0x1e293b);
    if (Array.isArray(this.floorGridMesh.material)) {
      this.floorGridMesh.material.forEach((m) => {
        m.transparent = true;
        m.opacity = 0.28;
      });
    } else {
      this.floorGridMesh.material.transparent = true;
      this.floorGridMesh.material.opacity = 0.28;
    }
    this.floorGridGroup.add(this.floorGridMesh);
    this.scene.add(this.floorGridGroup);

    // Initialize 3D Weapon Clash Spark system
    this.sparkPositions = new Float32Array(this.MAX_SPARKS * 3);
    this.sparkVelocities = new Float32Array(this.MAX_SPARKS * 3);
    this.sparkLifetimes = new Float32Array(this.MAX_SPARKS);
    this.initSparkSystem();
  }

  private createSlashRibbonMesh(colorHex: number): THREE.Mesh {
    const geo = new THREE.RingGeometry(46, 86, 24, 1, -Math.PI * 0.42, Math.PI * 0.84);
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    return mesh;
  }

  private createChainTetherMesh(): THREE.Mesh {
    const geo = new THREE.CylinderGeometry(1.6, 1.6, 1, 8);
    geo.rotateZ(Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xe4e4e7,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.35,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    return mesh;
  }

  private initSparkSystem() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.sparkPositions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffedd5,
      size: 6,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.sparkParticles = new THREE.Points(geometry, material);
    this.scene.add(this.sparkParticles);
  }

  public triggerClashSparks(x: number, y: number, colorHex: number = 0xf97316) {
    const invertedY = -y;
    for (let i = 0; i < this.MAX_SPARKS; i++) {
      const idx = i * 3;
      this.sparkPositions[idx] = x;
      this.sparkPositions[idx + 1] = invertedY;
      this.sparkPositions[idx + 2] = 14;

      const angle = Math.random() * Math.PI * 2;
      const speed = 160 + Math.random() * 340;
      this.sparkVelocities[idx] = Math.cos(angle) * speed;
      this.sparkVelocities[idx + 1] = Math.sin(angle) * speed;
      this.sparkVelocities[idx + 2] = (Math.random() - 0.5) * 110;

      this.sparkLifetimes[i] = 0.28 + Math.random() * 0.35;
    }
    if (this.sparkParticles && this.sparkParticles.material instanceof THREE.PointsMaterial) {
      this.sparkParticles.material.color.setHex(colorHex);
    }
  }

  public resize(width: number, height: number) {
    if (width <= 0 || height <= 0) return;
    this.width = width;
    this.height = height;
    this.camera.aspect = width / height;
    this.camera.position.set(width / 2, -height / 2, 650);
    this.camera.lookAt(width / 2, -height / 2, 0);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  // Construct composite multi-part 3D PBR weapon meshes for all 9 WeaponClass types
  private build3DWeapon(weaponClass: WeaponClass, colorStr: string): THREE.Group {
    const group = new THREE.Group();
    const primaryColor = new THREE.Color(colorStr);

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.94,
      roughness: 0.14,
    });
    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.88,
      roughness: 0.26,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.92,
      roughness: 0.22,
    });
    const gripMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.15,
      roughness: 0.82,
    });
    const glowMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      emissive: primaryColor,
      emissiveIntensity: 2.4,
      metalness: 0.3,
      roughness: 0.15,
      transparent: true,
      opacity: 0.92,
    });

    switch (weaponClass) {
      case 'BLADE': {
        // 64-Bit Katana with fuller bevel, tapered kissaki tip, glowing edge & octagonal tsuba
        const blade = new THREE.Mesh(new THREE.BoxGeometry(4.2, 74, 1.8), steelMat);
        blade.position.y = 42;

        const spine = new THREE.Mesh(new THREE.BoxGeometry(1.6, 72, 2.2), darkSteelMat);
        spine.position.set(-1.8, 41, 0);

        const kissaki = new THREE.Mesh(new THREE.ConeGeometry(3.2, 16, 4), steelMat);
        kissaki.position.y = 87;

        const edge = new THREE.Mesh(new THREE.BoxGeometry(1.2, 74, 2.6), glowMat);
        edge.position.set(2.3, 42, 0);

        const guard = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 2.4, 8), goldMat);
        guard.rotation.x = Math.PI / 2;

        const collar = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 4, 10), goldMat);
        collar.position.y = 3;

        const hilt = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 2.8, 24, 12), gripMat);
        hilt.position.y = -12;

        const pommel = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 3.2, 8), goldMat);
        pommel.position.y = -25;

        group.add(blade, spine, kissaki, edge, guard, collar, hilt, pommel);
        break;
      }

      case 'CHAIN': {
        // Articulated Scorpion Hellfire Kunai Spearhead
        const tip = new THREE.Mesh(new THREE.ConeGeometry(7.5, 28, 4), steelMat);
        tip.rotation.z = -Math.PI / 2;
        tip.position.x = 18;

        const barbTop = new THREE.Mesh(new THREE.ConeGeometry(3.2, 14, 4), glowMat);
        barbTop.rotation.z = 2.45;
        barbTop.position.set(7, 5.5, 0);

        const barbBot = new THREE.Mesh(new THREE.ConeGeometry(3.2, 14, 4), glowMat);
        barbBot.rotation.z = -2.45;
        barbBot.position.set(7, -5.5, 0);

        const collar = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.8, 16, 8), darkSteelMat);
        collar.rotation.z = Math.PI / 2;
        collar.position.x = 0;

        const ring = new THREE.Mesh(new THREE.TorusGeometry(5.5, 1.6, 8, 16), goldMat);
        ring.position.x = -11;

        group.add(tip, barbTop, barbBot, collar, ring);
        break;
      }

      case 'STAFF': {
        // Raiden Thunder Bo Staff with crackling energy nodes & runic gold bands
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 126, 16), gripMat);
        const core = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 4.0, 48, 12), darkSteelMat);

        const topCap = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 4.4, 14, 16), glowMat);
        topCap.position.y = 58;
        const botCap = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 5.2, 14, 16), glowMat);
        botCap.position.y = -58;

        const topTip = new THREE.Mesh(new THREE.OctahedronGeometry(5.5, 0), glowMat);
        topTip.position.y = 68;
        const botTip = new THREE.Mesh(new THREE.OctahedronGeometry(5.5, 0), glowMat);
        botTip.position.y = -68;

        for (const ry of [-36, -16, 16, 36]) {
          const r = new THREE.Mesh(new THREE.TorusGeometry(4.6, 1.1, 8, 16), goldMat);
          r.rotation.x = Math.PI / 2;
          r.position.y = ry;
          group.add(r);
        }

        group.add(shaft, core, topCap, botCap, topTip, botTip);
        break;
      }

      case 'CRYOMANCER': {
        // Sub-Zero Kori Ice Blade with crystalline core & icy serrations
        const crystalGeo = new THREE.OctahedronGeometry(13, 1);
        crystalGeo.scale(0.85, 3.5, 0.42);
        const crystalMat = this.isSoftwareGl
          ? new THREE.MeshPhysicalMaterial({
              color: 0xbae6fd,
              emissive: 0x0284c7,
              emissiveIntensity: 1.2,
              roughness: 0.08,
              clearcoat: 1.0,
              transparent: true,
              opacity: 0.88,
            })
          : new THREE.MeshPhysicalMaterial({
              color: 0xbae6fd,
              emissive: 0x0284c7,
              emissiveIntensity: 1.25,
              roughness: 0.05,
              transmission: 0.82,
              thickness: 3.2,
              clearcoat: 1.0,
            });

        const crystal = new THREE.Mesh(crystalGeo, crystalMat);
        crystal.position.y = 28;

        const coreSpine = new THREE.Mesh(new THREE.BoxGeometry(2.2, 68, 2.6), glowMat);
        coreSpine.position.y = 26;

        const frostGuard = new THREE.Mesh(new THREE.ConeGeometry(8, 10, 6), crystalMat);
        frostGuard.position.y = -6;

        const hilt = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.0, 20, 8), darkSteelMat);
        hilt.position.y = -18;

        group.add(crystal, coreSpine, frostGuard, hilt);
        break;
      }

      case 'FANS': {
        // Kitana / Kung Lao Bladed Steel War Fan / Razor Rim
        const fanGroup = new THREE.Group();
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 2.5, 12), goldMat);
        hub.rotation.x = Math.PI / 2;
        fanGroup.add(hub);

        for (let i = -4; i <= 4; i++) {
          const rib = new THREE.Mesh(new THREE.BoxGeometry(1.8, 44, 0.9), steelMat);
          rib.rotation.z = (i * Math.PI) / 20;
          rib.position.set(Math.sin(-rib.rotation.z) * 20, Math.cos(rib.rotation.z) * 20, 0);
          fanGroup.add(rib);
        }

        const rim = new THREE.Mesh(
          new THREE.RingGeometry(38, 45, 20, 1, Math.PI * 0.14, Math.PI * 0.72),
          glowMat
        );
        fanGroup.add(rim);
        group.add(fanGroup);
        break;
      }

      case 'SAI': {
        // Mileena / Reptile Tarkatan Sai with spiked fork guard
        const mainProng = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 2.4, 58, 8), steelMat);
        mainProng.position.y = 32;

        const centerEdge = new THREE.Mesh(new THREE.BoxGeometry(1.2, 52, 2.2), glowMat);
        centerEdge.position.y = 30;

        const leftProng = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.8, 24, 8), steelMat);
        leftProng.position.set(-8, 13, 0);
        leftProng.rotation.z = 0.38;

        const rightProng = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.8, 24, 8), steelMat);
        rightProng.position.set(8, 13, 0);
        rightProng.rotation.z = -0.38;

        const yoku = new THREE.Mesh(new THREE.BoxGeometry(16, 3.2, 3), goldMat);
        yoku.position.y = 4;

        const handle = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.4, 18, 10), gripMat);
        handle.position.y = -9;

        group.add(mainProng, centerEdge, leftProng, rightProng, yoku, handle);
        break;
      }

      case 'HAMMER': {
        // Shokan Heavy War Hammer with octagonal head, impact faces & twin spike finials
        const haft = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.2, 92, 12), gripMat);
        haft.position.y = 14;

        const collar = new THREE.Mesh(new THREE.CylinderGeometry(5, 4.5, 10, 10), goldMat);
        collar.position.y = 52;

        const head = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 38, 8), darkSteelMat);
        head.rotation.z = Math.PI / 2;
        head.position.y = 62;

        const faceLeft = new THREE.Mesh(new THREE.CylinderGeometry(14, 12, 4, 8), glowMat);
        faceLeft.rotation.z = Math.PI / 2;
        faceLeft.position.set(-20, 62, 0);

        const faceRight = new THREE.Mesh(new THREE.CylinderGeometry(14, 12, 4, 8), glowMat);
        faceRight.rotation.z = Math.PI / 2;
        faceRight.position.set(20, 62, 0);

        const crownSpike = new THREE.Mesh(new THREE.ConeGeometry(5, 16, 4), steelMat);
        crownSpike.position.y = 78;

        group.add(haft, collar, head, faceLeft, faceRight, crownSpike);
        break;
      }

      case 'SCYTHE': {
        // Noob Saibot / Shadow Scythe with twin crescent reaper blades
        const haft = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.6, 108, 12), darkSteelMat);
        haft.position.y = 18;

        const collar = new THREE.Mesh(new THREE.CylinderGeometry(5, 4, 8, 8), goldMat);
        collar.position.y = 66;

        const bladeMain = new THREE.Mesh(
          new THREE.RingGeometry(24, 34, 16, 1, -0.35, Math.PI * 0.72),
          steelMat
        );
        bladeMain.position.set(18, 48, 0);

        const bladeEdge = new THREE.Mesh(
          new THREE.RingGeometry(33, 36.5, 16, 1, -0.35, Math.PI * 0.72),
          glowMat
        );
        bladeEdge.position.set(18, 48, 0);

        const backSpike = new THREE.Mesh(new THREE.ConeGeometry(3.2, 18, 4), glowMat);
        backSpike.rotation.z = Math.PI / 2;
        backSpike.position.set(-10, 66, 0);

        group.add(haft, collar, bladeMain, bladeEdge, backSpike);
        break;
      }

      case 'NUNCHAKU': {
        const handleA = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 28, 12), gripMat);
        handleA.position.y = 8;
        const ferruleA = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 5, 10), goldMat);
        ferruleA.position.y = 22;
        const link = new THREE.Mesh(new THREE.TorusGeometry(4.2, 1.0, 8, 12), steelMat);
        link.position.y = 27;
        const ferruleB = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 5, 10), goldMat);
        ferruleB.position.set(6, 34, 0);
        ferruleB.rotation.z = -0.35;
        const handleB = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 28, 12), glowMat);
        handleB.position.set(11, 47, 0);
        handleB.rotation.z = -0.35;
        group.add(handleA, ferruleA, link, ferruleB, handleB);
        break;
      }

      case 'CLAW': {
        const gauntlet = new THREE.Mesh(new THREE.BoxGeometry(14, 16, 8), gripMat);
        gauntlet.position.y = 4;
        group.add(gauntlet);
        for (const ox of [-5, 0, 5]) {
          const talon = new THREE.Mesh(new THREE.ConeGeometry(2.0, 48, 4), steelMat);
          talon.position.set(ox, 34, 0);
          const edge = new THREE.Mesh(new THREE.BoxGeometry(1.1, 40, 2.2), glowMat);
          edge.position.set(ox, 32, 0);
          group.add(talon, edge);
        }
        break;
      }

      case 'HAT': {
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(26, 28, 2.4, 24), steelMat);
        brim.rotation.x = Math.PI * 0.42;
        brim.position.y = 22;
        const razorRim = new THREE.Mesh(new THREE.TorusGeometry(27.5, 1.5, 8, 28), glowMat);
        razorRim.rotation.x = Math.PI * 0.42 - Math.PI / 2;
        razorRim.position.y = 22;
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(11, 13, 10, 16), gripMat);
        crown.rotation.x = Math.PI * 0.42;
        crown.position.set(0, 22, 4);
        group.add(brim, razorRim, crown);
        break;
      }

      case 'KNUCKLES': {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(20, 8, 5), goldMat);
        bar.position.y = 8;
        group.add(bar);
        for (const kx of [-7.5, -2.5, 2.5, 7.5]) {
          const spike = new THREE.Mesh(new THREE.ConeGeometry(2.4, 10, 6), glowMat);
          spike.position.set(kx, 16, 0);
          group.add(spike);
        }
        break;
      }

      case 'BLAST':
      default: {
        // Cyber Auto-9 / Sonic Resonator Gauntlet Cannon
        const receiver = new THREE.Mesh(new THREE.BoxGeometry(10, 44, 9), darkSteelMat);
        receiver.position.y = 26;

        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 26, 12), steelMat);
        barrel.position.set(1.5, 52, 0);

        const plasmaCore = new THREE.Mesh(new THREE.BoxGeometry(4, 36, 10), glowMat);
        plasmaCore.position.set(0, 28, 0);

        const muzzleRing = new THREE.Mesh(new THREE.TorusGeometry(4.8, 1.3, 8, 16), glowMat);
        muzzleRing.rotation.x = Math.PI / 2;
        muzzleRing.position.set(1.5, 64, 0);

        const grip = new THREE.Mesh(new THREE.BoxGeometry(7, 18, 7), gripMat);
        grip.position.set(-4, 2, 0);
        grip.rotation.z = 0.22;

        group.add(receiver, barrel, plasmaCore, muzzleRing, grip);
        break;
      }
    }

    return group;
  }

  private cleanGroup(group: THREE.Group) {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else if (obj.material) {
          obj.material.dispose();
        }
      }
    });
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
  }

  public renderWeapons(
    p1Data: WeaponRenderData,
    cpuData: WeaponRenderData,
    dt: number,
    cam?: { x: number; y: number; zoom: number; is3DMode?: boolean }
  ) {
    const is3DMode = cam?.is3DMode ?? true;
    const targetModeBlend = is3DMode ? 1.0 : 0.0;
    this.modeBlend += (targetModeBlend - this.modeBlend) * Math.min(1, dt * 10);

    if (cam) {
      const totalZoom = Math.max(0.3, cam.zoom || 1);
      const fovTanHalf = 0.41421356; // tan(22.5 deg)
      const dist = this.height / (2 * fovTanHalf * totalZoom);
      const centerWorldY = -(cam.y - (0.12 * this.height) / totalZoom);
      const tiltY = 26 * this.modeBlend;
      this.camera.position.set(cam.x, centerWorldY + tiltY, dist);
      this.camera.lookAt(cam.x, centerWorldY, 0);

      // Keep illuminated 3D floor grid anchored horizontally under combat midpoint
      this.floorGridGroup.visible = this.modeBlend > 0.04;
      this.floorGridGroup.position.set(cam.x, -445, 0);
      if (Array.isArray(this.floorGridMesh.material)) {
        this.floorGridMesh.material.forEach((m) => {
          m.opacity = 0.28 * this.modeBlend;
        });
      } else {
        this.floorGridMesh.material.opacity = 0.28 * this.modeBlend;
      }
      if (this.floorGlowPlane.material instanceof THREE.MeshBasicMaterial) {
        this.floorGlowPlane.material.opacity = 0.08 * this.modeBlend;
      }
    }

    // 1. Sync or rebuild P1 weapon model
    if (this.p1CurrentClass !== p1Data.weaponClass || this.p1CurrentColor !== p1Data.color) {
      this.cleanGroup(this.p1WeaponGroup);
      const newModel = this.build3DWeapon(p1Data.weaponClass, p1Data.color);
      this.p1WeaponGroup.add(newModel);
      this.p1CurrentClass = p1Data.weaponClass;
      this.p1CurrentColor = p1Data.color;
    }

    // 2. Sync or rebuild CPU weapon model
    if (this.cpuCurrentClass !== cpuData.weaponClass || this.cpuCurrentColor !== cpuData.color) {
      this.cleanGroup(this.cpuWeaponGroup);
      const newModel = this.build3DWeapon(cpuData.weaponClass, cpuData.color);
      this.cpuWeaponGroup.add(newModel);
      this.cpuCurrentClass = cpuData.weaponClass;
      this.cpuCurrentColor = cpuData.color;
    }

    const updateFighterWeaponTransform = (
      group: THREE.Group,
      ribbon: THREE.Mesh,
      tether: THREE.Mesh,
      data: WeaponRenderData,
      pointLight: THREE.PointLight
    ) => {
      const handX = data.x + (data.facing === 1 ? 34 : -34);
      const handY = -data.y - 26;
      const targetZ = 28 * this.modeBlend + 6;

      // Live 3D Spear / Chain Interpolation
      if (data.hasActiveSpear && data.projX !== undefined && data.projY !== undefined) {
        const tipX = data.projX;
        const tipY = -data.projY;
        const dx = tipX - handX;
        const dy = tipY - handY;
        const span = Math.max(12, Math.hypot(dx, dy));

        group.position.set(tipX, tipY, targetZ);
        group.rotation.set(0, 0, Math.atan2(dy, dx));
        group.scale.set(1, 1, 1);
        group.visible = true;

        tether.visible = true;
        tether.position.set((handX + tipX) * 0.5, (handY + tipY) * 0.5, targetZ - 2);
        tether.rotation.set(0, 0, Math.atan2(dy, dx));
        tether.scale.set(span, 1, 1);

        ribbon.visible = false;
        pointLight.position.set(tipX, tipY, targetZ + 18);
        this.tmpColor.setStyle(data.color);
        pointLight.color.copy(this.tmpColor);
        pointLight.intensity = 3.2;
        return;
      }

      tether.visible = false;
      group.position.set(handX, handY, targetZ);

      let rotZ = 0;
      let rotX = 0;
      let rotY = 0;
      let scaleY = 1.0;
      let ribbonOpacity = 0;

      switch (data.state) {
        case 'IDLE':
          rotZ = -0.35 + Math.sin(data.stateTimer * 2.5) * 0.08;
          rotY = 0.25 * this.modeBlend;
          group.visible = data.isWeaponActive;
          break;

        case 'EXTENDING': {
          const isSpinWeapon = data.weaponClass === 'HAT' || data.weaponClass === 'NUNCHAKU' || data.weaponClass === 'FANS';
          rotZ = isSpinWeapon
            ? -1.4 + data.extensionProgress * 5.2
            : -1.35 + data.extensionProgress * 2.7;
          rotX = Math.sin(data.extensionProgress * Math.PI) * 0.45 * this.modeBlend;
          rotY = 0.4 * this.modeBlend;
          scaleY = 1.0 + data.extensionProgress * 0.28;
          ribbonOpacity = Math.sin(data.extensionProgress * Math.PI) * 0.86;
          group.visible = true;
          break;
        }

        case 'RECOIL':
          rotZ = 1.2 + data.recoilAngle;
          rotX = 0.35 * this.modeBlend;
          scaleY = 1.04;
          ribbonOpacity = Math.max(0, 0.45 - data.stateTimer * 2.4);
          group.visible = true;
          break;

        case 'RETRACTING':
          rotZ = 1.15 - (1.0 - data.extensionProgress) * 1.4;
          ribbonOpacity = data.extensionProgress * 0.25;
          group.visible = true;
          break;

        case 'SHEATHED':
          group.visible = false;
          break;
      }

      group.rotation.set(rotX, rotY, rotZ * data.facing);
      group.scale.set(data.facing, scaleY, 1);

      // Update dynamic 3D crescent slash arc ribbon
      if (ribbonOpacity > 0.02 && ribbon.material instanceof THREE.MeshBasicMaterial) {
        ribbon.visible = true;
        ribbon.position.set(handX, handY, targetZ - 4);
        ribbon.scale.set(data.facing, 1, 1);
        ribbon.rotation.set(0, 0, rotZ * 0.45);
        this.tmpColor.setStyle(data.color);
        ribbon.material.color.copy(this.tmpColor);
        ribbon.material.opacity = ribbonOpacity;
      } else {
        ribbon.visible = false;
      }

      // Position point light right at weapon strike zone with localized flash peak on strike
      const flashPulse = data.state === 'EXTENDING'
        ? 3.8 + Math.sin(data.extensionProgress * Math.PI) * 2.6
        : data.isWeaponActive ? 3.2 : 0.75;
      this.tmpVecA.set(handX + data.facing * 26, handY + 32, targetZ + 18);
      pointLight.position.copy(this.tmpVecA);
      this.tmpColor.setStyle(data.color);
      pointLight.color.copy(this.tmpColor);
      pointLight.intensity = flashPulse;
    };

    updateFighterWeaponTransform(
      this.p1WeaponGroup,
      this.p1SlashRibbon,
      this.p1ChainTether,
      p1Data,
      this.p1PointLight
    );
    updateFighterWeaponTransform(
      this.cpuWeaponGroup,
      this.cpuSlashRibbon,
      this.cpuChainTether,
      cpuData,
      this.cpuPointLight
    );

    // 3. Update 3D Sparks
    let hasAliveSparks = false;
    for (let i = 0; i < this.MAX_SPARKS; i++) {
      if (this.sparkLifetimes[i] > 0) {
        hasAliveSparks = true;
        this.sparkLifetimes[i] -= dt;
        const idx = i * 3;
        this.sparkPositions[idx] += this.sparkVelocities[idx] * dt;
        this.sparkPositions[idx + 1] += this.sparkVelocities[idx + 1] * dt;
        this.sparkPositions[idx + 2] += this.sparkVelocities[idx + 2] * dt;
        this.sparkVelocities[idx + 1] -= 340 * dt;
      }
    }
    if (this.sparkParticles) {
      this.sparkParticles.visible = hasAliveSparks;
      if (hasAliveSparks) {
        const attr = this.sparkParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
        attr.needsUpdate = true;
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    this.cleanGroup(this.p1WeaponGroup);
    this.cleanGroup(this.cpuWeaponGroup);
    this.cleanGroup(this.floorGridGroup);
    this.p1SlashRibbon.geometry.dispose();
    (this.p1SlashRibbon.material as THREE.Material).dispose();
    this.cpuSlashRibbon.geometry.dispose();
    (this.cpuSlashRibbon.material as THREE.Material).dispose();
    this.p1ChainTether.geometry.dispose();
    (this.p1ChainTether.material as THREE.Material).dispose();
    this.cpuChainTether.geometry.dispose();
    (this.cpuChainTether.material as THREE.Material).dispose();
    if (this.sparkParticles) {
      this.sparkParticles.geometry.dispose();
      if (this.sparkParticles.material instanceof THREE.Material) {
        this.sparkParticles.material.dispose();
      }
    }
    this.envRT.dispose();
    this.pmremGenerator.dispose();
    this.renderer.dispose();
  }
}
