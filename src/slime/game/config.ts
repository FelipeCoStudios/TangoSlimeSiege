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
  slime: { key: 'slime', name: 'Slime', hp: 40, speed: 2.3, gold: 6, damage: 1, size: 1.7 },
  goblin: { key: 'goblin', name: 'Duende', hp: 26, speed: 3.7, gold: 8, damage: 1, size: 1.8 },
  mushroom: { key: 'mushroom', name: 'Champiñón', hp: 115, speed: 1.6, gold: 12, damage: 2, size: 1.9 },
  golem: { key: 'golem', name: 'Gólem', hp: 630, speed: 1.1, gold: 45, damage: 5, size: 3.4 },
  // Nuevas tropas (perros disfrazados)
  dog_runner: { key: 'dog_runner', name: 'Perro Veloz', hp: 30, speed: 4.2, gold: 9, damage: 1, size: 1.8 },
  dog_flower: { key: 'dog_flower', name: 'Perro Flor', hp: 60, speed: 2.0, gold: 10, damage: 1, size: 1.9 },
  dog_boxer: { key: 'boxer_portrait', name: 'Perro Boxeador', hp: 85, speed: 2.8, gold: 14, damage: 2, size: 1.9 },
  dog_bard: { key: 'dog_bard', name: 'Perro Bardo', hp: 55, speed: 2.5, gold: 11, damage: 1, size: 1.8 },
  dog_mage: { key: 'dog_mage', name: 'Perro Mago', hp: 72, speed: 2.2, gold: 15, damage: 2, size: 2.0 },
  dog_bubble: { key: 'dog_bubble', name: 'Perro Burbuja', hp: 45, speed: 1.8, gold: 8, damage: 1, size: 2.2 },
  dog_cyborg: { key: 'dog_cyborg', name: 'Perro Cyborg', hp: 180, speed: 1.9, gold: 22, damage: 3, size: 2.1 },
  dog_star: { key: 'dog_star', name: 'Perro Estrella', hp: 42, speed: 3.5, gold: 12, damage: 1, size: 1.8 },
  dog_mummy: { key: 'dog_mummy', name: 'Perro Momia', hp: 135, speed: 1.4, gold: 16, damage: 2, size: 1.9 },
  dog_worker: { key: 'dog_worker', name: 'Perro Obrero', hp: 98, speed: 2.1, gold: 13, damage: 2, size: 1.9 },
};

export interface TowerDef {
  key: SpriteKey;
  name: string;
  desc: string;
  cost: number;
  dmg: number;
  rate: number; // disparos/seg
  range: number;
  splash?: number;
  slow?: { factor: number; duration: number };
  projectileEmoji: string;
  color: string;
}

export const TOWERS: Record<string, TowerDef> = {
  // Torres originales: se conservan para no cambiar las partidas existentes.
  archer: {
    key: 'archer', name: 'Perro Arquero', desc: 'Rápido y barato', projectileEmoji: '🦴', cost: 60,
    dmg: 4, rate: 1.8, range: 10.2, color: '#ffb84d',
  },
  cannon: {
    key: 'cannon', name: 'Perro Bomba', desc: 'Daño en área', projectileEmoji: '💣', cost: 110,
    dmg: 13, rate: 0.6, range: 8.4, splash: 2.3, color: '#7ddb52',
  },
  frost: {
    key: 'frost', name: 'Perro Mago Hielo', desc: 'Ralentiza enemigos', projectileEmoji: '❄️', cost: 85,
    dmg: 2, rate: 1.1, range: 9.3, slow: { factor: 0.5, duration: 1.6 }, color: '#7fd8ff',
  },
  normaldog: { key: 'dog_runner', name: 'Normal Dog', desc: 'Unidad inicial económica', projectileEmoji: '🐾', cost: 60, dmg: 12, rate: 1 / 1.8, range: 6, color: '#d8d8d8' },
  sneaker: { key: 'sneaker', name: 'Sneaker Dog', desc: 'Cada quinto golpe hace daño crítico', projectileEmoji: '👟', cost: 120, dmg: 18, rate: 1 / 1.2, range: 6, color: '#ffb84d' },
  boxer: { key: 'boxer_portrait', name: 'Boxer Dog', desc: '20% de probabilidad de aturdir', projectileEmoji: '🥊', cost: 180, dmg: 52, rate: 1 / 2.8, range: 7.5, color: '#e76b55' },
  sunflower: { key: 'dog_flower', name: 'Sunflower Dog', desc: 'Genera 150 monedas cada 10 segundos', projectileEmoji: '🌻', cost: 210, dmg: 7, rate: 1 / 2.5, range: 7.5, color: '#f5d547' },
  bard: { key: 'dog_bard', name: 'Bard Dog', desc: 'Aumenta 15% la velocidad de ataque cercana', projectileEmoji: '🎵', cost: 300, dmg: 12, rate: 1 / 2.2, range: 9, color: '#b77bdf' },
  bubble: { key: 'dog_bubble', name: 'Bubble Dog', desc: 'Cada cuarto ataque inmoviliza brevemente', projectileEmoji: '🫧', cost: 360, dmg: 22, rate: 1 / 3.2, range: 7.5, color: '#71d9ef' },
  firemage: { key: 'firemage', name: 'Fire Mage Dog', desc: 'Daño en área y quemadura', projectileEmoji: '🔥', cost: 420, dmg: 82, rate: 1 / 3.8, range: 10.5, splash: 1.8, color: '#ff653b' },
  crystal: { key: 'crystal', name: 'Crystal Dog', desc: 'Ralentiza a los enemigos', projectileEmoji: '💎', cost: 480, dmg: 45, rate: 1 / 2.8, range: 9, slow: { factor: 0.65, duration: 2 }, color: '#7fd8ff' },
  electrician: { key: 'electrician', name: 'Electrician Dog', desc: 'El rayo rebota hasta a 3 enemigos', projectileEmoji: '⚡', cost: 600, dmg: 60, rate: 1 / 2.5, range: 10.5, color: '#ffe45e' },
  mecha: { key: 'mecha', name: 'Mecha Dog', desc: 'Cada cuarto ataque dispara dos proyectiles', projectileEmoji: '🤖', cost: 900, dmg: 165, rate: 1 / 4.5, range: 13.5, splash: 0.8, color: '#8ba5bb' },
  mummy: { key: 'mummy', name: 'Mummy Dog', desc: 'Reduce 50% la velocidad del objetivo', projectileEmoji: '🧻', cost: 270, dmg: 30, rate: 1 / 3, range: 7.5, slow: { factor: 0.5, duration: 1.5 }, color: '#c9bd8c' },
};

export const TOWER_ORDER = [
  'archer', 'cannon', 'frost',
  'normaldog', 'sneaker', 'boxer', 'sunflower', 'bard', 'bubble',
  'firemage', 'crystal', 'electrician', 'mecha', 'mummy',
] as const;

export function upgradeCost(def: TowerDef, level: number): number {
  // level actual 1→2 o 2→3
  return Math.round(def.cost * (level === 1 ? 0.8 : 1.2));
}

export const MAX_LEVEL = 3;
export const SELL_RATIO = 0.7;
export const START_GOLD = 130;
export const GOLD_REWARD_MULTIPLIER = 5;
export const SUNFLOWER_INCOME = 150;
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
  // Nuevas tropas perro
  if (n >= 4) out.push({ type: 'dog_runner', count: Math.ceil(n * 0.6) });
  if (n >= 5) out.push({ type: 'dog_star', count: Math.ceil(n * 0.4) });
  if (n >= 6) out.push({ type: 'dog_flower', count: Math.floor(n * 0.5) });
  if (n >= 7) out.push({ type: 'dog_boxer', count: Math.floor(n * 0.4) });
  if (n >= 8) out.push({ type: 'dog_bard', count: Math.floor(n * 0.3) });
  if (n >= 9) out.push({ type: 'dog_mage', count: Math.floor(n * 0.35) });
  if (n >= 10) out.push({ type: 'dog_mummy', count: Math.floor(n * 0.3) });
  if (n >= 11) out.push({ type: 'dog_worker', count: Math.floor(n * 0.25) });
  if (n >= 12) out.push({ type: 'dog_bubble', count: Math.floor(n * 0.4) });
  if (n % 6 === 0) out.push({ type: 'dog_cyborg', count: Math.max(1, Math.floor(n / 6)) });
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
  return (10 + n * 2) * GOLD_REWARD_MULTIPLIER;
}
