// ─────────────────────────────────────────────────────────────
// config.ts — Balance del juego: enemigos, torres, oleadas
// ─────────────────────────────────────────────────────────────
import type { SpriteKey } from './textures';

export interface EnemyDef {
  key: SpriteKey;
  name: string;
  hp: number;
  speed: number;
  gold: number;
  damage: number;
  size: number;
}

export const ENEMIES: Record<string, EnemyDef> = {
  slime: { key: 'slime', name: 'Slime', hp: 26, speed: 2.3, gold: 6, damage: 1, size: 1.7 },
  goblin: { key: 'goblin', name: 'Duende', hp: 17, speed: 3.7, gold: 8, damage: 1, size: 1.8 },
  mushroom: { key: 'mushroom', name: 'Champiñón', hp: 75, speed: 1.6, gold: 12, damage: 2, size: 1.9 },
  golem: { key: 'golem', name: 'Gólem', hp: 420, speed: 1.1, gold: 45, damage: 5, size: 3.4 },
};

export interface TowerDef {
  key: SpriteKey;
  sprite: SpriteKey; // sprite propio de la tropa (dog_*)
  name: string;
  desc: string;
  cost: number;
  dmg: number;
  rate: number;
  range: number;
  splash?: number;
  slow?: { factor: number; duration: number };
  color: string;
}

// key = tipo de proyectil (archer/cannon/frost); sprite = imagen propia; rate = 1/cooldown
export const TOWERS: Record<string, TowerDef> = {
  normal: {
    key: 'archer', sprite: 'dog_normal', name: 'Normal Dog', desc: 'Rápido y barato', cost: 50,
    dmg: 24, rate: 1 / 1.8, range: 4, color: '#ffb84d',
  },
  sneaker: {
    key: 'archer', sprite: 'dog_sneaker', name: 'Sneaker Dog', desc: 'Ataque veloz', cost: 100,
    dmg: 36, rate: 1 / 1.2, range: 4, color: '#a0e0ff',
  },
  boxer: {
    key: 'cannon', sprite: 'dog_boxer', name: 'Boxer Dog', desc: 'Golpe fuerte corto', cost: 150,
    dmg: 105, rate: 1 / 2.8, range: 2.5, splash: 1.8, color: '#7ddb52',
  },
  sunflower: {
    key: 'archer', sprite: 'dog_sunflower', name: 'Sunflower Dog', desc: 'Daño bajo, gran rango', cost: 175,
    dmg: 15, rate: 1 / 2.5, range: 5, color: '#ffe066',
  },
  mummy: {
    key: 'archer', sprite: 'dog_mummy', name: 'Mummy Dog', desc: 'Ataque medio', cost: 225,
    dmg: 60, rate: 1 / 3.0, range: 5, color: '#c4a882',
  },
  bard: {
    key: 'frost', sprite: 'dog_bard', name: 'Bard Dog', desc: 'Rango amplio', cost: 250,
    dmg: 24, rate: 1 / 2.2, range: 6, slow: { factor: 0.6, duration: 1.2 }, color: '#d4a0ff',
  },
  bubble: {
    key: 'cannon', sprite: 'dog_bubble', name: 'Bubble Dog', desc: 'Salpicadura', cost: 300,
    dmg: 45, rate: 1 / 3.2, range: 5, splash: 2.2, color: '#7fd8ff',
  },
  firemage: {
    key: 'archer', sprite: 'dog_firemage', name: 'Fire Mage Dog', desc: 'Alto daño', cost: 350,
    dmg: 165, rate: 1 / 3.8, range: 7, color: '#ff6b4a',
  },
  crystal: {
    key: 'archer', sprite: 'dog_crystal', name: 'Crystal Dog', desc: 'Precisión media', cost: 400,
    dmg: 90, rate: 1 / 2.8, range: 6, color: '#b8f0ff',
  },
  electrician: {
    key: 'archer', sprite: 'dog_electrician', name: 'Electrician Dog', desc: 'Cadena rápida', cost: 500,
    dmg: 120, rate: 1 / 2.5, range: 7, color: '#ffe27a',
  },
  mecha: {
    key: 'cannon', sprite: 'dog_mecha', name: 'Mecha Dog', desc: 'Megadaño', cost: 750,
    dmg: 330, rate: 1 / 4.5, range: 9, splash: 2.5, color: '#9aa4b2',
  },
};

export const TOWER_ORDER = [
  'normal', 'sneaker', 'boxer', 'sunflower', 'mummy',
  'bard', 'bubble', 'firemage', 'crystal', 'electrician', 'mecha',
] as const;

export function upgradeCost(def: TowerDef, level: number): number {
  return Math.round(def.cost * (level === 1 ? 0.8 : 1.2));
}

export const MAX_LEVEL = 3;
export const SELL_RATIO = 0.7;
export const START_GOLD = 130;
export const START_LIVES = 20;
export const VICTORY_WAVE = 15;

export interface WaveEntry { type: string; count: number }

export function waveComposition(n: number): WaveEntry[] {
  const out: WaveEntry[] = [];
  const slime = 4 + Math.ceil(n * 1.6);
  out.push({ type: 'slime', count: slime });
  if (n >= 2) out.push({ type: 'goblin', count: Math.ceil(n * 1.3) });
  if (n >= 3) out.push({ type: 'mushroom', count: Math.floor(n * 0.8) });
  if (n % 5 === 0) out.push({ type: 'golem', count: Math.max(1, Math.floor(n / 5)) });
  return out;
}

export function hpScale(n: number): number {
  return 1 + (n - 1) * 0.28 + Math.max(0, n - 10) * 0.15;
}

export function spawnInterval(n: number): number {
  return Math.max(0.42, 0.95 - n * 0.03);
}

export function earlyWaveBonus(n: number): number {
  return 10 + n * 2;
}
