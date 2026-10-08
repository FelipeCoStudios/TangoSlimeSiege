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

// ── Enemigo ──────────────────────────────────────────────────
class Enemy {
  defKey: string;
  hp: number;
  maxHp: number;
  dist = 0;
  alive = true;
  sprite: THREE.Sprite;
  shadow: THREE.Mesh;
  hpBg: THREE.Sprite;
  hpFg: THREE.Sprite;
  phase = Math.random() * Math.PI * 2;
  slowUntil = 0;
  flash = 0;
  squash = 0;
  lastDirX = 1;
  time = 0;
  slowFactor = 1;

  constructor(
    defKey: string,
    scaleHp: number,
    chars: Record<SpriteKey, THREE.Texture>,
  ) {
    this.defKey = defKey;
    const def = ENEMIES[defKey];
    this.maxHp = Math.round(def.hp * scaleHp);
    this.hp = this.maxHp;
    const mat = new THREE.SpriteMaterial({ map: chars[def.key as SpriteKey], transparent: true, depthWrite: false });
    this.sprite = new THREE.Sprite(mat);
    this.sprite.center.set(0.5, 0.02);
    this.sprite.scale.setScalar(def.size);
    // sombra blob
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(def.size * 0.32, 16),
      new THREE.MeshBasicMaterial({ color: 0x1a3d12, transparent: true, opacity: 0.3, depthWrite: false }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    // barra de vida
    const white = circleTexture('#ffffff');
    this.hpBg = new THREE.Sprite(new THREE.SpriteMaterial({ map: white, color: 0x30160b, depthWrite: false }));
    this.hpFg = new THREE.Sprite(new THREE.SpriteMaterial({ map: white, color: 0x58d13e, depthWrite: false }));
    this.hpBg.scale.set(1.5, 0.18, 1);
    this.hpFg.scale.set(1.4, 0.12, 1);
  }

  get def() {
    return ENEMIES[this.defKey];
  }

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
    const mat = this.hpFg.material;
    mat.color.setHSL(0.33 * frac, 0.85, 0.5);
    const vis = frac < 1;
    this.hpBg.visible = vis;
    this.hpFg.visible = vis;
  }

  applySlow(factor: number, duration: number, now: number) {
    this.slowUntil = now + duration;
    this.slowFactor = factor;
    this.sprite.material.color.set(0x9fd8ff);
  }

  update(dt: number, now: number, world: WorldRefs) {
    const def = this.def;
    const slowed = now < this.slowUntil;
    if (!slowed && this.sprite.material.color.getHex() !== 0xffffff) {
      this.sprite.material.color.set(0xffffff);
    }
    const speed = def.speed * (slowed ? this.slowFactor : 1);
    const prev = this.sprite.position.clone();
    this.dist += speed * dt;
    const pos = posAtDistance(world, this.dist);
    this.time += dt * (1 + speed * 0.3);
    // animación de gateo: squash & stretch + balanceo
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
    // flash de daño
    if (this.flash > 0) {
      this.flash -= dt;
      this.sprite.material.color.set(0xffffff);
    }
    this.updateBars();
  }
}

/** Interpola posición sobre el camino por distancia recorrida. */
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

// ── Torre ────────────────────────────────────────────────────
let towerIdCounter = 1;
class Tower {
  id = towerIdCounter++;
  level = 1;
  cooldown = 0;
  invested: number;
  group = new THREE.Group();
  sprite: THREE.Sprite;
  rangeRing: THREE.Mesh;
  pad: PadMesh;
  lastDirX = 1;
  popAnim = 0;

  defKey: string;

  constructor(
    defKey: string,
    pad: PadMesh,
    chars: Record<SpriteKey, THREE.Texture>,
  ) {
    this.defKey = defKey;
    this.pad = pad;
    const def = this.def;
    this.invested = def.cost;
    // base de piedra 3D
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.15, 0.8, 12),
      new THREE.MeshLambertMaterial({ color: 0xbfb49e }),
    );
    base.position.y = 0.4;
    base.castShadow = true;
    base.userData.towerId = this.id;
    const trim = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.0, 0.18, 12),
      new THREE.MeshLambertMaterial({ color: new THREE.Color(def.color) }),
    );
    trim.position.y = 0.82;
    trim.userData.towerId = this.id;
    // personaje 2D
    this.sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: chars[def.key as SpriteKey], transparent: true, depthWrite: false }),
    );
    this.sprite.center.set(0.5, 0);
    this.sprite.scale.setScalar(2.4);
    this.sprite.position.y = 0.9;
    this.sprite.userData.towerId = this.id;
    this.group.add(base, trim, this.sprite);
    this.group.position.copy(pad.position).setY(0);
    // anillo de rango
    this.rangeRing = new THREE.Mesh(
      new THREE.RingGeometry(def.range - 0.15, def.range, 48),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(def.color), transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }),
    );
    this.rangeRing.rotation.x = -Math.PI / 2;
    this.rangeRing.position.copy(pad.position).setY(0.09);
    this.rangeRing.visible = false;
    this.popAnim = 0.001;
  }

  get def(): TowerDef {
    return TOWERS[this.defKey];
  }
  get dmg() {
    return Math.round(this.def.dmg * Math.pow(1.8, this.level - 1));
  }
  get range() {
    return this.def.range * (1 + (this.level - 1) * 0.12);
  }
  get sellValue() {
    return Math.round(this.invested * SELL_RATIO);
  }

  info(): TowerInfo {
    return {
      id: this.id,
      type: this.defKey,
      level: this.level,
      dmg: this.dmg,
      range: Math.round(this.range * 10) / 10,
      upgradeCost: this.level < MAX_LEVEL ? upgradeCost(this.def, this.level) : null,
      sellValue: this.sellValue,
    };
  }
}

// ── Proyectil ────────────────────────────────────────────────
interface Projectile {
  kind: 'arrow' | 'ball' | 'frost';
  sprite: THREE.Sprite;
  from: THREE.Vector3;
  to: THREE.Vector3;
  target: Enemy | null;
  t: number;
  duration: number;
  dmg: number;
  splash?: number;
  slow?: { factor: number; duration: number };
  alive: boolean;
}

// ── Motor principal ──────────────────────────────────────────
export class GameEngine {
  private world!: WorldRefs;
  private effects!: Effects;
  private chars!: Record<SpriteKey, THREE.Texture>;
  private texArrow!: THREE.Texture;
  private texSnow!: THREE.Texture;
  private texBall!: THREE.Texture;
  private enemies: Enemy[] = [];
  private towers: Tower[] = [];
  private projectiles: Projectile[] = [];
  private spawnQueue: string[] = [];
  private spawnTimer = 0;
  private phase: Phase = 'idle';
  private gold = START_GOLD;
  private lives = START_LIVES;
  private wave = 0;
  private speed = 1;
  private victory = false;
  private selectedType: string | null = null;
  private selectedTower: Tower | null = null;
  private ghost: THREE.Sprite | null = null;
  private ghostRing: THREE.Mesh | null = null;
  private raf = 0;
  private lastT = 0;
  private elapsed = 0;
  private disposed = false;
  private raycaster = new THREE.Raycaster();
  private camBase = new THREE.Vector3();
  private camTarget = new THREE.Vector3(2.5, 0, 0);
  private camFocusX = 0;
  private flagTime = 0;
  private statsCache = '';

  private container: HTMLElement;
  private overlay: HTMLElement;
  private cb: Callbacks;

  constructor(container: HTMLElement, overlay: HTMLElement, cb: Callbacks) {
    this.container = container;
    this.overlay = overlay;
    this.cb = cb;
  }

  async init() {
    this.chars = await loadCharacterTextures();
    if (this.disposed) return;
    this.world = createWorld(this.container);
    this.effects = new Effects(this.world.scene, this.overlay);
    this.texArrow = arrowTexture();
    this.texSnow = snowflakeTexture();
    this.texBall = circleTexture('#2e2e2e');
    this.camBase.copy(this.world.camera.position);
    this.resize();
    window.addEventListener('resize', this.resize);
    const el = this.world.renderer.domElement;
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointermove', this.onPointerMove);
    this.lastT = performance.now();
    const loop = (t: number) => {
      if (this.disposed) return;
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (t - this.lastT) / 1000);
      this.lastT = t;
      this.tick(dt);
    };
    this.raf = requestAnimationFrame(loop);
    this.emitStats(true);
  }

  dispose() {
    this.disposed = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    this.effects?.dispose();
    const renderer = this.world?.renderer;
    if (!renderer) return;
    renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
    renderer.dispose();
    renderer.domElement.remove();
  }

  private resize = () => {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    const cam = this.world.camera;
    cam.aspect = w / h;
    if (cam.aspect < 1) {
      // móvil vertical: cámara alta; el foco sigue la acción (ver tick)
      cam.fov = 62;
      this.camBase.set(0, 33, 27);
    } else if (cam.aspect < 1.5) {
      cam.fov = 54;
      this.camBase.set(0, 32, 27);
    } else {
      cam.fov = 47;
      this.camBase.set(0, 31, 28);
    }
    cam.position.copy(this.camBase);
    cam.lookAt(this.camTarget);
    cam.updateProjectionMatrix();
    this.world.renderer.setSize(w, h);
  };

  // ── API pública (desde React) ─────────────────────────────
  startGame() {
    audio.init();
    this.emitStats(true);
  }

  setSelectedType(type: string | null) {
    this.selectedType = type;
    this.selectedTower = null;
    this.hideGhost();
    this.cb.onTowerSelected(null);
  }

  startWave(early: boolean) {
    if (this.phase === 'spawning' || this.phase === 'fighting' || this.phase === 'over') return;
    this.wave += 1;
    if (early && this.wave > 1) {
      const bonus = earlyWaveBonus(this.wave);
      this.gold += bonus;
      this.cb.onToast(`¡Bonus por adelantar! +${bonus} oro`);
    }
    const comp = waveComposition(this.wave);
    this.spawnQueue = [];
    for (const e of comp) {
      for (let i = 0; i < e.count; i++) this.spawnQueue.push(e.type);
    }
    // mezclar pero dejar al gólem para el final
    const bosses = this.spawnQueue.filter((t) => t === 'golem');
    const rest = this.spawnQueue.filter((t) => t !== 'golem');
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    this.spawnQueue = [...rest, ...bosses];
    this.spawnTimer = 0.5;
    this.phase = 'spawning';
    audio.waveHorn();
    const boss = bosses.length > 0;
    this.effects.announce(`¡Oleada ${this.wave}!`, boss ? '¡Cuidado, viene un GÓLEM!' : '');
    this.emitStats(true);
  }

  setSpeed(s: number) {
    this.speed = s;
    this.emitStats(true);
  }

  upgradeSelected() {
    const t = this.selectedTower;
    if (!t || t.level >= MAX_LEVEL) return;
    const cost = upgradeCost(t.def, t.level);
    if (this.gold < cost) {
      audio.error();
      this.cb.onToast('¡No tienes suficiente oro!');
      return;
    }
    this.gold -= cost;
    t.invested += cost;
    t.level += 1;
    t.popAnim = 0.001;
    t.sprite.scale.setScalar(2.4 + (t.level - 1) * 0.35);
    t.rangeRing.geometry.dispose();
    t.rangeRing.geometry = new THREE.RingGeometry(t.range - 0.15, t.range, 48);
    audio.upgrade();
    this.effects.starBurst(t.group.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 5);
    this.cb.onTowerSelected(t.info());
    this.emitStats(true);
  }

  sellSelected() {
    const t = this.selectedTower;
    if (!t) return;
    this.gold += t.sellValue;
    t.pad.occupied = false;
    this.world.scene.remove(t.group, t.rangeRing);
    this.towers = this.towers.filter((x) => x !== t);
    this.selectedTower = null;
    audio.sell();
    this.effects.coinBurst(t.group.position, 4);
    this.cb.onTowerSelected(null);
    this.emitStats(true);
  }

  continueEndless() {
    this.victory = false;
    this.emitStats(true);
  }

  restart() {
    for (const e of this.enemies) e.removeFrom(this.world.scene);
    for (const t of this.towers) {
      this.world.scene.remove(t.group, t.rangeRing);
      t.pad.occupied = false;
    }
    for (const p of this.projectiles) this.world.scene.remove(p.sprite);
    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.spawnQueue = [];
    this.gold = START_GOLD;
    this.lives = START_LIVES;
    this.wave = 0;
    this.phase = 'idle';
    this.victory = false;
    this.selectedTower = null;
    this.selectedType = null;
    this.cb.onTowerSelected(null);
    this.emitStats(true);
  }

  // ── Entrada ───────────────────────────────────────────────
  private pointerNDC(e: PointerEvent): THREE.Vector2 {
    const rect = this.world.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
  }

  private padAt(e: PointerEvent): PadMesh | null {
    this.raycaster.setFromCamera(this.pointerNDC(e), this.world.camera);
    const hits = this.raycaster.intersectObjects(this.world.pads.map((p) => p.mesh));
    if (!hits.length) return null;
    return this.world.pads[hits[0].object.userData.padIndex as number];
  }

  private towerAt(e: PointerEvent): Tower | null {
    this.raycaster.setFromCamera(this.pointerNDC(e), this.world.camera);
    const objs: THREE.Object3D[] = [];
    for (const t of this.towers) t.group.traverse((o) => objs.push(o));
    const hits = this.raycaster.intersectObjects(objs);
    if (!hits.length) return null;
    let o: THREE.Object3D | null = hits[0].object;
    while (o && o.userData.towerId === undefined) o = o.parent;
    const id = hits[0].object.userData.towerId ?? o?.userData.towerId;
    return this.towers.find((t) => t.id === id) ?? null;
  }

  private onPointerDown = (e: PointerEvent) => {
    if (this.phase === 'over') return;
    const tower = this.towerAt(e);
    if (tower) {
      this.selectTower(tower);
      return;
    }
    const pad = this.padAt(e);
    if (pad) {
      if (pad.occupied) {
        const t = this.towers.find((x) => x.pad === pad);
        if (t) this.selectTower(t);
        return;
      }
      if (this.selectedType) {
        this.buildTower(pad, this.selectedType);
        return;
      }
      this.cb.onToast('Elige una torre abajo primero');
      audio.error();
      return;
    }
    // clic en vacío: deseleccionar
    this.selectedTower = null;
    this.cb.onTowerSelected(null);
    this.hideRings();
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.selectedType) {
      this.hideGhost();
      return;
    }
    const pad = this.padAt(e);
    if (pad && !pad.occupied) this.showGhost(pad, this.selectedType);
    else this.hideGhost();
  };

  private showGhost(pad: PadMesh, type: string) {
    const def = TOWERS[type];
    if (!this.ghost) {
      this.ghost = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: this.chars[def.key as SpriteKey], transparent: true, opacity: 0.6, depthWrite: false }),
      );
      this.ghost.center.set(0.5, 0);
      this.ghost.scale.setScalar(2.4);
      this.ghostRing = new THREE.Mesh(
        new THREE.RingGeometry(0.95, 1, 48),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }),
      );
      this.ghostRing.rotation.x = -Math.PI / 2;
      this.world.scene.add(this.ghost, this.ghostRing);
    }
    this.ghost.material.map = this.chars[def.key as SpriteKey];
    this.ghost.position.copy(pad.position).setY(0.9);
    this.ghost.visible = true;
    this.ghostRing!.scale.setScalar(def.range);
    this.ghostRing!.position.copy(pad.position).setY(0.09);
    this.ghostRing!.visible = true;
  }

  private hideGhost() {
    if (this.ghost) this.ghost.visible = false;
    if (this.ghostRing) this.ghostRing.visible = false;
  }

  private selectTower(t: Tower) {
    this.selectedTower = t;
    this.selectedType = null;
    this.hideGhost();
    this.hideRings();
    t.rangeRing.visible = true;
    audio.shoot();
    this.cb.onTowerSelected(t.info());
  }

  private hideRings() {
    for (const t of this.towers) t.rangeRing.visible = false;
  }

  private buildTower(pad: PadMesh, type: string) {
    const def = TOWERS[type];
    if (this.gold < def.cost) {
      audio.error();
      this.cb.onToast(`Falta oro: ${def.name} cuesta ${def.cost}`);
      const p = this.worldToScreen(pad.position.clone().add(new THREE.Vector3(0, 2, 0)));
      this.effects.damageNumber(p.x, p.y, '¡Sin oro!', 'warn');
      return;
    }
    this.gold -= def.cost;
    pad.occupied = true;
    const t = new Tower(type, pad, this.chars);
    this.towers.push(t);
    this.world.scene.add(t.group, t.rangeRing);
    audio.place();
    this.effects.shake(0.25, 0.18);
    this.effects.starBurst(pad.position.clone().add(new THREE.Vector3(0, 1, 0)), 5);
    this.hideGhost();
    this.emitStats(true);
  }

  // ── Bucle principal ───────────────────────────────────────
  private tick(dtRaw: number) {
    const dt = dtRaw * this.speed;
    this.elapsed += dt;
    const w = this.world;

    // ambiente: nubes, portal, bandera del castillo
    for (const c of w.clouds) {
      c.position.x += dt * 0.5;
      if (c.position.x > 60) c.position.x = -60;
    }
    w.portalDisc.rotation.z += dt * 2.5;
    const s = 1 + Math.sin(this.elapsed * 3) * 0.08;
    w.portalDisc.scale.setScalar(s);
    this.flagTime += dt;
    const flag = w.castle.userData.flag as THREE.Mesh | undefined;
    if (flag) flag.rotation.y = Math.sin(this.flagTime * 6) * 0.35;

    if (this.phase === 'spawning' || this.phase === 'fighting') {
      this.updateSpawning(dt);
      this.updateEnemies(dt);
      this.updateTowers(dt);
      this.updateProjectiles(dt);
      this.checkWaveEnd();
    }

    // animación de aparición de torres
    for (const t of this.towers) {
      if (t.popAnim > 0) {
        t.popAnim = Math.min(1, t.popAnim + dtRaw * 3.5);
        const k = 1 + Math.sin(t.popAnim * Math.PI) * 0.25;
        t.group.scale.setScalar(t.popAnim < 1 ? t.popAnim * k : 1);
        if (t.popAnim >= 1) t.popAnim = 0;
      }
    }

    this.effects.update(dtRaw);
    // en vertical, la cámara sigue el frente de la acción
    let focusX = 0;
    if (w.camera.aspect < 1) {
      const alive = this.enemies.filter((e) => e.alive);
      if (alive.length) {
        focusX = alive.reduce((s, e) => s + e.sprite.position.x, 0) / alive.length;
      }
      focusX = THREE.MathUtils.clamp(focusX, -9, 9);
    }
    this.camFocusX += (focusX - this.camFocusX) * Math.min(1, dtRaw * 1.6);
    // cámara con sway suave + temblor
    const sway = new THREE.Vector3(Math.sin(this.elapsed * 0.3) * 0.35, Math.sin(this.elapsed * 0.42) * 0.2, 0);
    w.camera.position
      .copy(this.camBase)
      .add(new THREE.Vector3(this.camFocusX, 0, 0))
      .add(sway)
      .add(this.effects.shakeOffset);
    w.camera.lookAt(this.camTarget.x + this.camFocusX, this.camTarget.y, this.camTarget.z);
    w.renderer.render(w.scene, w.camera);
    this.emitStats();
  }

  private updateSpawning(dt: number) {
    if (this.phase !== 'spawning' || !this.spawnQueue.length) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const type = this.spawnQueue.shift()!;
      this.spawnEnemy(type);
      this.spawnTimer = spawnInterval(this.wave) * (type === 'golem' ? 2 : 1);
      if (!this.spawnQueue.length) this.phase = 'fighting';
    }
  }

  private spawnEnemy(type: string) {
    const e = new Enemy(type, hpScale(this.wave), this.chars);
    const start = this.world.path[0].clone();
    // leve desplazamiento lateral para que no vayan en fila india perfecta
    const jitter = (Math.random() - 0.5) * PATH_WIDTH * 0.35;
    const next = this.world.path[1];
    const dir = new THREE.Vector3().subVectors(next, this.world.path[0]).normalize();
    const perp = new THREE.Vector3(-dir.z, 0, dir.x);
    e.dist = 0;
    e.addTo(this.world.scene, start);
    (e as Enemy & { lane: number }).lane = jitter;
    void perp;
    this.enemies.push(e);
    // pop de aparición
    e.squash = 1;
  }

  private updateEnemies(dt: number) {
    const now = this.elapsed;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.update(dt, now, this.world);
      // añadir desviación lateral del carril
      const lane = (e as Enemy & { lane?: number }).lane ?? 0;
      if (lane !== 0 && e.dist < this.world.pathLength) {
        const ahead = posAtDistance(this.world, Math.min(e.dist + 0.5, this.world.pathLength));
        const dir = new THREE.Vector3().subVectors(ahead, e.sprite.position).normalize();
        const perp = new THREE.Vector3(-dir.z, 0, dir.x);
        e.sprite.position.addScaledVector(perp, lane);
        e.shadow.position.x = e.sprite.position.x;
        e.shadow.position.z = e.sprite.position.z;
      }
      // llegó al castillo
      if (e.dist >= this.world.pathLength - 0.5) {
        e.alive = false;
        e.removeFrom(this.world.scene);
        this.lives -= e.def.damage;
        audio.leak();
        this.effects.shake(0.9, 0.4);
        const p = this.worldToScreen(e.sprite.position.clone().add(new THREE.Vector3(0, 2, 0)));
        this.effects.damageNumber(p.x, p.y, `-${e.def.damage} ♥`, 'warn');
        // golpe al castillo: pequeño salto
        this.world.castle.scale.setScalar(1.08);
        setTimeout(() => this.world.castle.scale.setScalar(1), 150);
        if (this.lives <= 0) {
          this.lives = 0;
          this.gameOver();
        }
        this.emitStats(true);
      }
    }
    this.enemies = this.enemies.filter((e) => e.alive);
  }

  private updateTowers(dt: number) {
    for (const t of this.towers) {
      t.cooldown -= dt;
      if (t.cooldown > 0) continue;
      // objetivo: el enemigo más avanzado dentro del rango
      let best: Enemy | null = null;
      let bestDist = -1;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const d = e.sprite.position.distanceTo(t.group.position);
        if (d <= t.range && e.dist > bestDist) {
          best = e;
          bestDist = e.dist;
        }
      }
      if (!best) continue;
      t.cooldown = 1 / t.def.rate;
      // orientar sprite (flip) hacia el objetivo
      const dirX = best.sprite.position.x - t.group.position.x;
      if (Math.abs(dirX) > 0.01) t.lastDirX = Math.sign(dirX);
      const base = 2.4 + (t.level - 1) * 0.35;
      t.sprite.scale.set(base * t.lastDirX, base, 1);
      this.fireProjectile(t, best);
    }
  }

  private fireProjectile(t: Tower, target: Enemy) {
    const def = t.def;
    const from = t.group.position.clone().add(new THREE.Vector3(0, 2.2, 0));
    if (def.key === 'archer') {
      audio.shoot();
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.texArrow, transparent: true, depthWrite: false }));
      sprite.scale.set(1.4, 0.35, 1);
      this.projectiles.push({ kind: 'arrow', sprite, from, to: new THREE.Vector3(), target, t: 0, duration: 0, dmg: t.dmg, alive: true });
      this.world.scene.add(sprite);
    } else if (def.key === 'cannon') {
      audio.cannon();
      this.effects.shake(0.15, 0.12);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.texBall, transparent: true, depthWrite: false }));
      sprite.scale.setScalar(0.65);
      const to = target.sprite.position.clone();
      this.projectiles.push({ kind: 'ball', sprite, from, to, target: null, t: 0, duration: 0.55, dmg: t.dmg, splash: def.splash, alive: true });
      this.world.scene.add(sprite);
    } else {
      audio.frost();
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.texSnow, transparent: true, depthWrite: false }));
      sprite.scale.setScalar(0.9);
      this.projectiles.push({
        kind: 'frost', sprite, from, to: new THREE.Vector3(), target, t: 0, duration: 0, dmg: t.dmg, slow: def.slow, alive: true,
      });
      this.world.scene.add(sprite);
    }
    // retroceso caricaturesco de la torre
    t.sprite.scale.x *= 0.85;
  }

  private updateProjectiles(dt: number) {
    for (const p of this.projectiles) {
      if (!p.alive) continue;
      if (p.kind === 'ball') {
        p.t += dt / p.duration;
        if (p.t >= 1) {
          this.landCannonball(p);
          continue;
        }
        const pos = p.from.clone().lerp(p.to, p.t);
        pos.y += Math.sin(p.t * Math.PI) * 4;
        p.sprite.position.copy(pos);
        p.sprite.scale.setScalar(0.65 + Math.sin(p.t * Math.PI) * 0.3);
        continue;
      }
      // flechas y copos: persiguen al objetivo
      const target = p.target;
      if (!target || !target.alive) {
        p.alive = false;
        this.world.scene.remove(p.sprite);
        continue;
      }
      const targetPos = target.sprite.position.clone().add(new THREE.Vector3(0, target.def.size * 0.5, 0));
      const dir = new THREE.Vector3().subVectors(targetPos, p.sprite.position);
      const dist = dir.length();
      const speed = p.kind === 'arrow' ? 20 : 14;
      if (dist < 0.45) {
        this.hitEnemy(p, target);
        continue;
      }
      dir.normalize();
      p.sprite.position.addScaledVector(dir, Math.min(speed * dt, dist));
      // orientar en espacio de pantalla
      const a = this.worldToScreen(p.sprite.position);
      const b = this.worldToScreen(p.sprite.position.clone().add(dir));
      p.sprite.material.rotation = Math.atan2(-(b.y - a.y), b.x - a.x);
      if (p.kind === 'frost') p.sprite.material.rotation += this.elapsed * 2;
    }
    this.projectiles = this.projectiles.filter((p) => p.alive);
  }

  private landCannonball(p: Projectile) {
    p.alive = false;
    this.world.scene.remove(p.sprite);
    audio.splash();
    this.effects.shake(0.5, 0.25);
    this.effects.starBurst(p.to, 6);
    const splash = p.splash ?? 2;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.sprite.position.distanceTo(p.to) <= splash + 0.4) {
        this.damageEnemy(e, p.dmg, true);
      }
    }
  }

  private hitEnemy(p: Projectile, target: Enemy) {
    p.alive = false;
    this.world.scene.remove(p.sprite);
    if (p.kind === 'frost' && p.slow) {
      target.applySlow(p.slow.factor, p.slow.duration, this.elapsed);
      this.effects.frostPuff(target.sprite.position);
    } else {
      audio.hit();
      this.effects.hitSpark(target.sprite.position.clone().add(new THREE.Vector3(0, 1, 0)));
    }
    this.damageEnemy(target, p.dmg, false);
  }

  private damageEnemy(e: Enemy, dmg: number, isSplash: boolean) {
    if (!e.alive) return;
    e.hp -= dmg;
    e.flash = 0.08;
    e.squash = 0.8;
    const p = this.worldToScreen(e.sprite.position.clone().add(new THREE.Vector3(0, e.def.size + 0.3, 0)));
    this.effects.damageNumber(p.x, p.y, `${dmg}`, isSplash ? 'hit' : 'hit');
    if (e.hp <= 0) {
      e.alive = false;
      e.removeFrom(this.world.scene);
      const pos = e.sprite.position.clone();
      const big = e.defKey === 'golem';
      this.effects.starBurst(pos, big ? 16 : 7, big);
      this.effects.coinBurst(pos, big ? 6 : 2);
      if (big) this.effects.shake(1.2, 0.5);
      audio.die();
      audio.coin();
      this.gold += e.def.gold;
      const gp = this.worldToScreen(pos.clone().add(new THREE.Vector3(0, 1.5, 0)));
      this.effects.damageNumber(gp.x, gp.y, `+${e.def.gold}`, 'gold');
      this.emitStats(true);
    }
  }

  private checkWaveEnd() {
    if (this.phase !== 'fighting' || this.enemies.length > 0) return;
    this.phase = 'idle';
    const bonus = 15 + this.wave * 3;
    this.gold += bonus;
    this.cb.onToast(`¡Oleada superada! +${bonus} oro`);
    if (this.wave === VICTORY_WAVE && !this.victory) {
      this.victory = true;
      audio.victory();
    }
    this.emitStats(true);
  }

  private gameOver() {
    this.phase = 'over';
    audio.gameOver();
    this.emitStats(true);
  }

  // ── Utilidades ────────────────────────────────────────────
  private worldToScreen(pos: THREE.Vector3): { x: number; y: number } {
    const v = pos.clone().project(this.world.camera);
    const rect = this.world.renderer.domElement.getBoundingClientRect();
    return {
      x: (v.x * 0.5 + 0.5) * rect.width,
      y: (-v.y * 0.5 + 0.5) * rect.height,
    };
  }

  private emitStats(force = false) {
    const s: GameStats = {
      gold: this.gold,
      lives: this.lives,
      wave: this.wave,
      waveInProgress: this.phase === 'spawning' || this.phase === 'fighting',
      enemiesAlive: this.enemies.length + this.spawnQueue.length,
      gameOver: this.phase === 'over',
      victory: this.victory,
      speed: this.speed,
      started: true,
    };
    const key = JSON.stringify(s);
    if (force || key !== this.statsCache) {
      this.statsCache = key;
      this.cb.onStats(s);
    }
  }
}
