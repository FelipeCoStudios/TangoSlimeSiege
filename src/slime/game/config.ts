// ─────────────────────────────────────────────────────────────
// config.ts — Balance del juego: enemigos, torres, oleadas
// ─────────────────────────────────────────────────────────────
import type { SpriteKey } from './textures';

export interface EnemyDef {
  key: SpriteKey;
  name: string;
  hp: number;
  speed: number; // unidades/seg
  gold: number;
  damage: number; // vidas que quita al llegar al castillo
  size: number; // altura del sprite en unidades de mundo
}

export const ENEMIES: Record<string, EnemyDef> = {
  slime: { key: 'slime', name: 'Slime', hp: 26, speed: 2.3, gold: 6, damage: 1, size: 1.7 },
  goblin: { key: 'goblin', name: 'Duende', hp: 17, speed: 3.7, gold: 8, damage: 1, size: 1.8 },
  mushroom: { key: 'mushroom', name: 'Champiñón', hp: 75, speed: 1.6, gold: 12, damage: 2, size: 1.9 },
  golem: { key: 'golem', name: 'Gólem', hp: 420, speed: 1.1, gold: 45, damage: 5, size: 3.4 },
};

export interface TowerDef {
  key: SpriteKey;
  name: string;
  desc: string;
  cost: number;
  dmg: number;
  rate: number; // disparos/seg (= 1 / cooldown)
  range: number;
  splash?: number;
  slow?: { factor: number; duration: number };
  color: string;
}

// Stats: daño ×3 respecto al original; cooldown → rate = 1/cooldown
export const TOWERS: Record<string, TowerDef> = {
  archer: {
    key: 'archer', name: 'Normal Dog', desc: 'Rápido y barato', cost: 50,
    dmg: 24, rate: 1 / 1.8, range: 4, color: '#ffb84d',
  },
  cannon: {
    key: 'cannon', name: 'Boxer Dog', desc: 'Daño alto, corto alcance', cost: 150,
    dmg: 105, rate: 1 / 2.8, range: 2.5, splash: 2.3, color: '#7ddb52',
  },
  frost: {
    key: 'frost', name: 'Sneaker Dog', desc: 'Rápido y preciso', cost: 100,
    dmg: 36, rate: 1 / 1.2, range: 4, slow: { factor: 0.5, duration: 1.6 }, color: '#7fd8ff',
  },
};

export const TOWER_ORDER = ['archer', 'cannon', 'frost'] as const;

export function upgradeCost(def: TowerDef, level: number): number {
  // level actual 1→2 o 2→3
  return Math.round(def.cost * (level === 1 ? 0.8 : 1.2));
}

export const MAX_LEVEL = 3;
export const SELL_RATIO = 0.7;
export const START_GOLD = 130;
export const START_LIVES = 20;
export const VICTORY_WAVE = 15;

export interface WaveEntry { type: string; count: number }

/** Composición de la oleada n (1-indexed). */
export function waveComposition(n: number): WaveEntry[] {
  const out: WaveEntry[] = [];
  const slime = 4 + Math.ceil(n * 1.6);
  out.push({ type: 'slime', count: slime });
  if (n >= 2) out.push({ type: 'goblin', count: Math.ceil(n * 1.3) });
  if (n >= 3) out.push({ type: 'mushroom', count: Math.floor(n * 0.8) });
  if (n % 5 === 0) out.push({ type: 'golem', count: Math.max(1, Math.floor(n / 5)) });
  return out;
}

/** Multiplicador de vida por oleada. */
export function hpScale(n: number): number {
  return 1 + (n - 1) * 0.28 + Math.max(0, n - 10) * 0.15;
}

export function spawnInterval(n: number): number {
  return Math.max(0.42, 0.95 - n * 0.03);
}

/** Oro extra por adelantar la oleada. */
export function earlyWaveBonus(n: number): number {
  return 10 + n * 2;
}
