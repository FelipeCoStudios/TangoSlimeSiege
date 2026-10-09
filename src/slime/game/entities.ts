import * as THREE from 'three';
import {
  ENEMIES, MAX_LEVEL, SELL_RATIO, TOWERS,
  upgradeCost, type TowerDef,
} from './config';
import { circleTexture, type SpriteKey } from './textures';
import { type PadMesh, type WorldRefs } from './world';

export interface GameStats {
  gold: number; lives: number; wave: number; waveInProgress: boolean;
  enemiesAlive: number; gameOver: boolean; victory: boolean; speed: number; started: boolean;
}
export interface TowerInfo {
  id: number; type: string; level: number; dmg: number; range: number;
  upgradeCost: number | null; sellValue: number;
}

export function posAtDistance(world: WorldRefs, dist: number): THREE.Vector3 {
  const { path, pathCumulative } = world;
  if (dist <= 0) return path[0].clone();
  for (let i = 1; i < path.length; i++) {
    if (dist <= pathCumulative[i]) {
      const t = (dist - pathCumulative[i - 1]) / (pathCumulative[i] - pathCumulative[i - 1]);
      return path[i - 1].clone().lerp(path[i], t);
    }
  }
  return path[path.length - 1].clone();
}

export class Enemy {
  defKey: string; hp: number; maxHp: number; dist = 0; alive = true;
  sprite: THREE.Sprite; shadow: THREE.Mesh; hpBg: THREE.Sprite; hpFg: THREE.Sprite;
  phase = Math.random() * Math.PI * 2; slowUntil = 0; flash = 0; squash = 0;
  burnUntil = 0; burnTick = 0;
  lastDirX = 1; time = 0; slowFactor = 1;
  constructor(defKey: string, scaleHp: number, chars: Record<SpriteKey, THREE.Texture>) {
    this.defKey = defKey;
    const def = ENEMIES[defKey];
    this.maxHp = Math.round(def.hp * scaleHp);
    this.hp = this.maxHp;
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: chars[def.key as SpriteKey], transparent: true, depthWrite: false }));
    this.sprite.center.set(0.5, 0.02);
    this.sprite.scale.setScalar(def.size);
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(def.size * 0.32, 16), new THREE.MeshBasicMaterial({ color: 0x1a3d12, transparent: true, opacity: 0.3, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    const white = circleTexture('#ffffff');
    this.hpBg = new THREE.Sprite(new THREE.SpriteMaterial({ map: white, color: 0x30160b, depthWrite: false }));
    this.hpFg = new THREE.Sprite(new THREE.SpriteMaterial({ map: white, color: 0x58d13e, depthWrite: false }));
    this.hpBg.scale.set(1.5, 0.18, 1);
    this.hpFg.scale.set(1.4, 0.12, 1);
  }
  get def() { return ENEMIES[this.defKey]; }
  addTo(scene: THREE.Scene, pos: THREE.Vector3) {
    this.sprite.position.copy(pos);
    this.shadow.position.set(pos.x, 0.07, pos.z);
    scene.add(this.sprite, this.shadow, this.hpBg, this.hpFg);
    this.updateBars();
  }
  removeFrom(scene: THREE.Scene) {
    scene.remove(this.sprite, this.shadow, this.hpBg, this.hpFg);
    this.sprite.material.dispose();
  }
  updateBars() {
    const frac = Math.max(0, this.hp / this.maxHp);
    const y = this.def.size + 0.45;
    this.hpBg.position.set(this.sprite.position.x, y, this.sprite.position.z);
    this.hpFg.position.set(this.sprite.position.x, y, this.sprite.position.z + 0.001);
    this.hpFg.scale.x = 1.4 * frac;
    this.hpFg.material.color.setHSL(0.33 * frac, 0.85, 0.5);
    const vis = frac < 1;
    this.hpBg.visible = vis; this.hpFg.visible = vis;
  }
  applySlow(factor: number, duration: number, now: number) {
    this.slowUntil = now + duration;
    this.slowFactor = factor;
    this.sprite.material.color.set(0x9fd8ff);
  }
  update(dt: number, now: number, world: WorldRefs) {
    const def = this.def;
    const slowed = now < this.slowUntil;
    if (!slowed && this.sprite.material.color.getHex() !== 0xffffff) this.sprite.material.color.set(0xffffff);
    const speed = def.speed * (slowed ? this.slowFactor : 1);
    const prev = this.sprite.position.clone();
    this.dist += speed * dt;
    const pos = posAtDistance(world, this.dist);
    this.time += dt * (1 + speed * 0.3);
    const wob = Math.sin(this.time * 9 + this.phase);
    const squashY = 1 + wob * 0.09;
    const squashX = 1 - wob * 0.07 + this.squash * -0.35;
    this.squash = Math.max(0, this.squash - dt * 4);
    const dirX = pos.x - prev.x;
    if (Math.abs(dirX) > 0.001) this.lastDirX = Math.sign(dirX);
    const flip = this.lastDirX < 0 ? -1 : 1;
    this.sprite.scale.set(def.size * squashX * flip * (1 + this.squash * 0.3), def.size * squashY * (1 + this.squash * 0.3), 1);
    this.sprite.material.rotation = wob * 0.09;
    this.sprite.position.copy(pos);
    this.shadow.position.set(pos.x, 0.07, pos.z);
    this.shadow.scale.setScalar(squashX);
    if (this.flash > 0) { this.flash -= dt; this.sprite.material.color.set(0xffffff); }
    this.updateBars();
  }
}

let towerIdCounter = 1;
export class Tower {
  id = towerIdCounter++; level = 1; cooldown = 0; invested: number;
  group = new THREE.Group(); sprite: THREE.Sprite; rangeRing: THREE.Mesh;
  pad: PadMesh; lastDirX = 1; popAnim = 0; defKey: string;
  shotsFired = 0; incomeTimer = 0;
  constructor(defKey: string, pad: PadMesh, chars: Record<SpriteKey, THREE.Texture>) {
    this.defKey = defKey; this.pad = pad;
    const def = this.def; this.invested = def.cost;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.15, 0.8, 12), new THREE.MeshLambertMaterial({ color: 0xbfb49e }));
    base.position.y = 0.4; base.castShadow = true; base.userData.towerId = this.id;
    const trim = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.18, 12), new THREE.MeshLambertMaterial({ color: new THREE.Color(def.color) }));
    trim.position.y = 0.82; trim.userData.towerId = this.id;
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: chars[def.key as SpriteKey], transparent: true, depthWrite: false }));
    this.sprite.center.set(0.5, 0); this.sprite.scale.setScalar(2.4); this.sprite.position.y = 0.9; this.sprite.userData.towerId = this.id;
    this.group.add(base, trim, this.sprite);
    this.group.position.copy(pad.position).setY(0);
    this.rangeRing = new THREE.Mesh(new THREE.RingGeometry(def.range - 0.15, def.range, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(def.color), transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
    this.rangeRing.rotation.x = -Math.PI / 2;
    this.rangeRing.position.copy(pad.position).setY(0.09);
    this.rangeRing.visible = false; this.popAnim = 0.001;
  }
  get def(): TowerDef { return TOWERS[this.defKey]; }
  get dmg() { return Math.round(this.def.dmg * Math.pow(1.8, this.level - 1)); }
  get range() { return this.def.range * (1 + (this.level - 1) * 0.12); }
  get sellValue() { return Math.round(this.invested * SELL_RATIO); }
  info(): TowerInfo {
    return { id: this.id, type: this.defKey, level: this.level, dmg: this.dmg, range: Math.round(this.range * 10) / 10, upgradeCost: this.level < MAX_LEVEL ? upgradeCost(this.def, this.level) : null, sellValue: this.sellValue };
  }
}

export interface Projectile {
  kind: 'arrow' | 'ball' | 'frost'; sprite: THREE.Sprite; from: THREE.Vector3; to: THREE.Vector3;
  target: Enemy | null; t: number; duration: number; dmg: number; splash?: number;
  slow?: { factor: number; duration: number };
  towerKey?: string; towerId?: number; shotNumber?: number;
  alive: boolean;
}
