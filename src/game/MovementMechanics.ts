/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MovementMechanicDef {
  id: number;
  name: string;
  shortLabel: string;
  category: 'LOCOMOTION' | 'AERIAL' | 'DEFENSE' | 'OFFENSE' | 'SPECIAL';
  description: string;
}

export const MOVEMENT_MECHANICS: MovementMechanicDef[] = [
  {
    id: 0,
    name: 'Martial Stance Idle',
    shortLabel: 'Stance Idle',
    category: 'LOCOMOTION',
    description: 'Thoracic breathing wave, cloth drape sway, and ready guard stance.',
  },
  {
    id: 1,
    name: 'Advancing Footwork',
    shortLabel: 'Footwork',
    category: 'LOCOMOTION',
    description: 'Directional stride translation with knee lift and arena dust physics.',
  },
  {
    id: 2,
    name: 'Kombat Aerial Leap',
    shortLabel: 'Aerial Leap',
    category: 'AERIAL',
    description: 'Parabolic arc jump with squash-and-stretch velocity deformation.',
  },
  {
    id: 3,
    name: 'Phantom Ninja Dash',
    shortLabel: 'Ninja Dash',
    category: 'LOCOMOTION',
    description: 'High-velocity forward burst leaving lingering silhouette afterimages.',
  },
  {
    id: 4,
    name: 'Backstep Evade',
    shortLabel: 'Backstep',
    category: 'DEFENSE',
    description: 'Rapid defensive retreat hop creating spacing and stamina regen.',
  },
  {
    id: 5,
    name: 'Low Crouch Guard',
    shortLabel: 'Crouch Guard',
    category: 'DEFENSE',
    description: 'Compressed hurtbox duck and iron-wall block deflection.',
  },
  {
    id: 6,
    name: 'Precision Parry Snap',
    shortLabel: 'Parry Snap',
    category: 'DEFENSE',
    description: 'Frame-perfect block flash opening a +50% counter strike window.',
  },
  {
    id: 7,
    name: 'Launcher Uppercut',
    shortLabel: 'Uppercut',
    category: 'OFFENSE',
    description: 'Rising chin-shattering blow launching opponents into aerial juggles.',
  },
  {
    id: 8,
    name: 'Leg Sweep Trip',
    shortLabel: 'Leg Sweep',
    category: 'OFFENSE',
    description: 'Low spinning leg kick knocking grounded foes directly off their feet.',
  },
  {
    id: 9,
    name: 'Aerial Juggle Tumble',
    shortLabel: 'Air Tumble',
    category: 'AERIAL',
    description: 'Mid-air rotational spin physics sustained by follow-up juggle hits.',
  },
  {
    id: 10,
    name: 'Ground Slam Bounce',
    shortLabel: 'Ground Slam',
    category: 'AERIAL',
    description: 'Floor impact compression triggering seismic shake and arterial splatter.',
  },
  {
    id: 11,
    name: 'Weapon Draw & Cleave',
    shortLabel: 'Weapon Cleave',
    category: 'OFFENSE',
    description: 'Dynamic 3D/2D weapon state machine swing, slash trail, and recoil.',
  },
  {
    id: 12,
    name: 'Projectile / Spear Cast',
    shortLabel: 'Spear Cast',
    category: 'SPECIAL',
    description: 'Kinetic release of Scorpion kunai harpoon, iceball, fire, or steel fan.',
  },
  {
    id: 13,
    name: 'Shadow Teleport Shift',
    shortLabel: 'Teleport',
    category: 'SPECIAL',
    description: 'Instant phase-warp crossing behind the opponent guard.',
  },
  {
    id: 14,
    name: 'Stagger & Bone Fracture',
    shortLabel: 'Bone Fracture',
    category: 'SPECIAL',
    description: '2x camera zoom-in stun when anatomical zones break or poise shatters.',
  },
  {
    id: 15,
    name: 'Fatality Execution',
    shortLabel: 'Fatality',
    category: 'SPECIAL',
    description: 'Multi-phase cinematic dismemberment, decapitation, and blood pool drop.',
  },
];

export const getMechanicById = (id: number): MovementMechanicDef =>
  MOVEMENT_MECHANICS[id] ?? MOVEMENT_MECHANICS[0];
