// ─────────────────────────────────────────────────────────────
// engine.ts — Motor del tower defense: bucle, entidades,
// oleadas, entrada táctil/ratón y puente con la UI de React.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { audio } from './audio';
import {
  ENEMIES, MAX_LEVEL, SELL_RATIO, START_GOLD, START_LIVES, TOWERS, VICTORY_WAVE,
  earlyWaveBonus, hpScale, spawnInterval, upgradeCost, waveComposition,
  type TowerDef,
} from './config';
import { Effects } from './effects';
import { arrowTexture, loadCharacterTextures, snowflakeTexture, circleTexture, type SpriteKey } from './textures';
import { createWorld, PATH_WIDTH, type PadMesh, type WorldRefs } from './world';

export interface GameStats {
  gold: number;
  lives: number;
  wave: number;
  waveInProgress: boolean;
  enemiesAlive: number;
  gameOver: boolean;
  victory: boolean;
  speed: number;
  started: boolean;
}

export interface TowerInfo {
  id: number;
  type: string;
  level: number;
  dmg: number;
  range: number;
  upgradeCost: number | null;
  sellValue: number;
}

interface Callbacks {
  onStats: (s: GameStats) => void;
  onTowerSelected: (t: TowerInfo | null) => void;
  onToast: (msg: string) => void;
}

type Phase = 'idle' | 'spawning' | 'fighting' | 'over';
