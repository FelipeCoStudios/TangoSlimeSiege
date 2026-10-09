import * as THREE from 'three';
import { audio } from './audio';
import {
  ENEMIES, MAX_LEVEL, SELL_RATIO, START_GOLD, START_LIVES, TOWERS, VICTORY_WAVE,
  earlyWaveBonus, hpScale, spawnInterval, upgradeCost, waveComposition,
} from './config';
import { Effects } from './effects';
import { arrowTexture, loadCharacterTextures, snowflakeTexture, circleTexture, type SpriteKey } from './textures';
import { createWorld, type PadMesh, type WorldRefs } from './world';
import { Enemy, Tower, type Projectile, type GameStats, type TowerInfo, posAtDistance } from './entities';

export type { GameStats, TowerInfo };
export { posAtDistance };

export class GameEngine {
  private world!: WorldRefs; private effects!: Effects;
  private chars!: Record<SpriteKey, THREE.Texture>;
  private texArrow!: THREE.Texture; private texSnow!: THREE.Texture; private texBall!: THREE.Texture;
  private enemies: Enemy[] = []; private towers: Tower[] = []; private projectiles: Projectile[] = [];
  private spawnQueue: string[] = []; private spawnTimer = 0; private phase: 'idle' | 'spawning' | 'fighting' | 'over' = 'idle';
  private gold = START_GOLD; private lives = START_LIVES; private wave = 0; private speed = 1;
  private victory = false; private selectedType: string | null = null; private selectedTower: Tower | null = null;
  private ghost: THREE.Sprite | null = null; private ghostRing: THREE.Mesh | null = null;
  private raf = 0; private lastT = 0; private elapsed = 0; private disposed = false;
  private raycaster = new THREE.Raycaster(); private camBase = new THREE.Vector3();
  private camTarget = new THREE.Vector3(2.5, 0, 0); private statsCache = '';
  private container: HTMLElement; private overlay: HTMLElement;
  private cb: { onStats: (s: GameStats) => void; onTowerSelected: (t: TowerInfo | null) => void; onToast: (msg: string) => void };

  constructor(container: HTMLElement, overlay: HTMLElement, cb: { onStats: (s: GameStats) => void; onTowerSelected: (t: TowerInfo | null) => void; onToast: (msg: string) => void }) {
    this.container = container; this.overlay = overlay; this.cb = cb;
  }

  async init() {
    this.chars = await loadCharacterTextures();
    if (this.disposed) return;
    this.world = createWorld(this.container);
    this.effects = new Effects(this.world.scene, this.overlay);
    this.texArrow = arrowTexture(); this.texSnow = snowflakeTexture(); this.texBall = circleTexture('#2e2e2e');
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
      this.lastT = t; this.tick(dt);
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
    renderer.dispose(); renderer.domElement.remove();
  }

  private resize = () => {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    const cam = this.world.camera;
    cam.aspect = w / h;
    if (cam.aspect < 1) { cam.fov = 62; this.camBase.set(0, 33, 27); }
    else if (cam.aspect < 1.5) { cam.fov = 54; this.camBase.set(0, 32, 27); }
    else { cam.fov = 47; this.camBase.set(0, 31, 28); }
    cam.position.copy(this.camBase); cam.lookAt(this.camTarget); cam.updateProjectionMatrix();
    this.world.renderer.setSize(w, h);
  };

  startGame() { audio.init(); this.emitStats(true); }
  setSelectedType(type: string | null) {
    this.selectedType = type; this.selectedTower = null; this.hideGhost(); this.cb.onTowerSelected(null);
  }
  setSpeed(s: number) { this.speed = s; this.emitStats(true); }
  continueEndless() { this.victory = false; this.emitStats(true); }

  startWave(early: boolean) {
    if (this.phase === 'spawning' || this.phase === 'fighting' || this.phase === 'over') return;
    this.wave += 1;
    if (early && this.wave > 1) {
      const bonus = earlyWaveBonus(this.wave);
      this.gold += bonus;
      this.cb.onToast(`Bonus adelantar +${bonus}`);
    }
    const comp = waveComposition(this.wave);
    this.spawnQueue = [];
    for (const e of comp) for (let i = 0; i < e.count; i++) this.spawnQueue.push(e.type);
    const bosses = this.spawnQueue.filter((t) => t === 'golem');
    const rest = this.spawnQueue.filter((t) => t !== 'golem');
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    this.spawnQueue = [...rest, ...bosses];
    this.spawnTimer = 0.5; this.phase = 'spawning';
    audio.waveHorn();
    this.effects.announce(`Oleada ${this.wave}!`, bosses.length > 0 ? 'Golem!' : '');
    this.emitStats(true);
  }

  upgradeSelected() {
    const t = this.selectedTower;
    if (!t || t.level >= MAX_LEVEL) return;
    const cost = upgradeCost(t.def, t.level);
    if (this.gold < cost) { audio.error(); this.cb.onToast('Sin oro'); return; }
    this.gold -= cost; t.invested += cost; t.level += 1; t.popAnim = 0.001;
    t.sprite.scale.setScalar(2.4 + (t.level - 1) * 0.35);
    t.rangeRing.geometry.dispose();
    t.rangeRing.geometry = new THREE.RingGeometry(t.range - 0.15, t.range, 48);
    audio.upgrade();
    this.effects.starBurst(t.group.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 5);
    this.cb.onTowerSelected(t.info()); this.emitStats(true);
  }

  sellSelected() {
    const t = this.selectedTower;
    if (!t) return;
    this.gold += t.sellValue; t.pad.occupied = false;
    this.world.scene.remove(t.group, t.rangeRing);
    this.towers = this.towers.filter((x) => x !== t);
    this.selectedTower = null; audio.sell();
    this.effects.coinBurst(t.group.position, 4);
    this.cb.onTowerSelected(null); this.emitStats(true);
  }

  restart() {
    for (const e of this.enemies) e.removeFrom(this.world.scene);
    for (const t of this.towers) { this.world.scene.remove(t.group, t.rangeRing); t.pad.occupied = false; }
    for (const p of this.projectiles) this.world.scene.remove(p.sprite);
    this.enemies = []; this.towers = []; this.projectiles = []; this.spawnQueue = [];
    this.gold = START_GOLD; this.lives = START_LIVES; this.wave = 0;
    this.phase = 'idle'; this.victory = false; this.selectedTower = null; this.selectedType = null;
    this.cb.onTowerSelected(null); this.emitStats(true);
  }

  private pointerNDC(e: PointerEvent): THREE.Vector2 {
    const rect = this.world.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
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
    if (tower) { this.selectTower(tower); return; }
    const pad = this.padAt(e);
    if (pad) {
      if (pad.occupied) { const t = this.towers.find((x) => x.pad === pad); if (t) this.selectTower(t); return; }
      if (this.selectedType) { this.buildTower(pad, this.selectedType); return; }
      this.cb.onToast('Elige torre abajo'); audio.error(); return;
    }
    this.selectedTower = null; this.cb.onTowerSelected(null); this.hideRings();
  };
  private onPointerMove = (e: PointerEvent) => {
    if (!this.selectedType) { this.hideGhost(); return; }
    const pad = this.padAt(e);
    if (pad && !pad.occupied) this.showGhost(pad, this.selectedType);
    else this.hideGhost();
  };

  private showGhost(pad: PadMesh, type: string) {
    const def = TOWERS[type];
    if (!this.ghost) {
      this.ghost = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.chars[def.sprite ?? def.key], transparent: true, opacity: 0.6, depthWrite: false }));
      this.ghost.center.set(0.5, 0); this.ghost.scale.setScalar(2.4);
      this.ghostRing = new THREE.Mesh(new THREE.RingGeometry(def.range - 0.15, def.range, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(def.color), transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
      this.ghostRing.rotation.x = -Math.PI / 2;
      this.world.scene.add(this.ghost, this.ghostRing);
    }
    this.ghost.material.map = this.chars[def.sprite ?? def.key];
    this.ghost.position.copy(pad.position).setY(0.9);
    this.ghostRing!.position.copy(pad.position).setY(0.09);
    this.ghost.visible = true; this.ghostRing!.visible = true;
  }
  private hideGhost() {
    if (this.ghost) this.ghost.visible = false;
    if (this.ghostRing) this.ghostRing.visible = false;
  }
  private hideRings() { for (const t of this.towers) t.rangeRing.visible = false; }
  private selectTower(t: Tower) {
    this.selectedTower = t; this.selectedType = null; this.hideGhost(); this.hideRings();
    t.rangeRing.visible = true; this.cb.onTowerSelected(t.info());
  }

  private buildTower(pad: PadMesh, type: string) {
    const def = TOWERS[type];
    if (!def || this.gold < def.cost) { audio.error(); this.cb.onToast('Sin oro'); return; }
    this.gold -= def.cost; pad.occupied = true;
    const t = new Tower(type, pad, this.chars);
    this.world.scene.add(t.group, t.rangeRing);
    this.towers.push(t); audio.place();
    this.effects.starBurst(t.group.position.clone().add(new THREE.Vector3(0, 1, 0)), 4);
    this.hideGhost(); this.emitStats(true);
  }

  private tick(dt: number) {
    dt *= this.speed; this.elapsed += dt;
    if (this.phase === 'over') { this.world.renderer.render(this.world.scene, this.world.camera); return; }
    this.updateSpawns(dt); this.updateEnemies(dt); this.updateTowers(dt); this.updateProjectiles(dt);
    for (const t of this.towers) {
      if (t.popAnim > 0) {
        t.popAnim += dt * 4;
        const s = 1 + Math.sin(Math.min(t.popAnim, Math.PI)) * 0.15;
        t.sprite.scale.setScalar((2.4 + (t.level - 1) * 0.35) * s);
        if (t.popAnim > Math.PI) t.popAnim = 0;
      }
    }
    this.effects.update(dt);
    this.world.renderer.render(this.world.scene, this.world.camera);
    this.emitStats(false);
  }

  private updateSpawns(dt: number) {
    if (this.phase !== 'spawning') return;
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    if (this.spawnQueue.length === 0) { this.phase = 'fighting'; return; }
    const type = this.spawnQueue.shift()!;
    const e = new Enemy(type, hpScale(this.wave), this.chars);
    e.addTo(this.world.scene, this.world.path[0].clone());
    this.enemies.push(e);
    this.spawnTimer = spawnInterval(this.wave);
  }

  private updateEnemies(dt: number) {
    const pathLen = this.world.pathCumulative[this.world.pathCumulative.length - 1];
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.update(dt, this.elapsed, this.world);
      if (e.dist >= pathLen) {
        e.alive = false; e.removeFrom(this.world.scene);
        this.lives -= e.def.damage; audio.hurt();
        if (this.lives <= 0) { this.lives = 0; this.phase = 'over'; this.cb.onToast('Derrota'); }
      }
    }
    this.enemies = this.enemies.filter((e) => e.alive);
    if (this.phase === 'fighting' && this.enemies.length === 0 && this.spawnQueue.length === 0) {
      this.phase = 'idle';
      if (this.wave >= VICTORY_WAVE && !this.victory) { this.victory = true; this.cb.onToast('Victoria'); }
    }
  }

  private updateTowers(dt: number) {
    for (const t of this.towers) {
      t.cooldown -= dt;
      if (t.cooldown > 0) continue;
      let best: Enemy | null = null; let bestDist = -1;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const d = e.sprite.position.distanceTo(t.group.position);
        if (d <= t.range && e.dist > bestDist) { best = e; bestDist = e.dist; }
      }
      if (!best) continue;
      t.cooldown = 1 / t.def.rate;
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
    if (def.splash) {
      audio.cannon(); this.effects.shake(0.15, 0.12);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.texBall, transparent: true, depthWrite: false }));
      sprite.scale.setScalar(0.65);
      this.projectiles.push({ kind: 'ball', sprite, from, to: target.sprite.position.clone(), target: null, t: 0, duration: 0.55, dmg: t.dmg, splash: def.splash, alive: true });
      this.world.scene.add(sprite);
    } else if (def.slow) {
      audio.frost();
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.texSnow, transparent: true, depthWrite: false }));
      sprite.scale.setScalar(0.9);
      this.projectiles.push({ kind: 'frost', sprite, from, to: new THREE.Vector3(), target, t: 0, duration: 0, dmg: t.dmg, slow: def.slow, alive: true });
      this.world.scene.add(sprite);
    } else {
      audio.shoot();
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.texArrow, transparent: true, depthWrite: false }));
      sprite.scale.set(1.4, 0.35, 1);
      this.projectiles.push({ kind: 'arrow', sprite, from, to: new THREE.Vector3(), target, t: 0, duration: 0, dmg: t.dmg, alive: true });
      this.world.scene.add(sprite);
    }
    t.sprite.scale.x *= 0.85;
  }

  private updateProjectiles(dt: number) {
    for (const p of this.projectiles) {
      if (!p.alive) continue;
      if (p.kind === 'ball') {
        p.t += dt / p.duration;
        if (p.t >= 1) { this.landCannonball(p); continue; }
        const mid = p.from.clone().lerp(p.to, p.t);
        mid.y += Math.sin(p.t * Math.PI) * 3;
        p.sprite.position.copy(mid);
        continue;
      }
      const target = p.target;
      if (!target || !target.alive) { p.alive = false; this.world.scene.remove(p.sprite); continue; }
      const targetPos = target.sprite.position.clone().add(new THREE.Vector3(0, target.def.size * 0.5, 0));
      const dir = new THREE.Vector3().subVectors(targetPos, p.sprite.position);
      const dist = dir.length();
      const speed = p.kind === 'arrow' ? 20 : 14;
      if (dist < 0.45) { this.hitEnemy(p, target); continue; }
      dir.normalize();
      p.sprite.position.addScaledVector(dir, Math.min(speed * dt, dist));
      const a = this.worldToScreen(p.sprite.position);
      const b = this.worldToScreen(p.sprite.position.clone().add(dir));
      p.sprite.material.rotation = Math.atan2(-(b.y - a.y), b.x - a.x);
      if (p.kind === 'frost') p.sprite.material.rotation += this.elapsed * 2;
    }
    this.projectiles = this.projectiles.filter((p) => p.alive);
  }

  private landCannonball(p: Projectile) {
    p.alive = false; this.world.scene.remove(p.sprite);
    audio.splash(); this.effects.shake(0.5, 0.25); this.effects.starBurst(p.to, 6);
    const splash = p.splash ?? 2;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.sprite.position.distanceTo(p.to) <= splash + 0.4) this.damageEnemy(e, p.dmg, true);
    }
  }

  private hitEnemy(p: Projectile, target: Enemy) {
    p.alive = false; this.world.scene.remove(p.sprite);
    if (p.kind === 'frost' && p.slow) {
      target.applySlow(p.slow.factor, p.slow.duration, this.elapsed);
      this.effects.frostPuff(target.sprite.position);
    } else {
      audio.hit();
      this.effects.hitSpark(target.sprite.position.clone().add(new THREE.Vector3(0, 1, 0)));
    }
    this.damageEnemy(target, p.dmg, false);
  }

  private damageEnemy(e: Enemy, dmg: number, _isSplash: boolean) {
    if (!e.alive) return;
    e.hp -= dmg; e.flash = 0.08; e.squash = 0.8;
    const p = this.worldToScreen(e.sprite.position.clone().add(new THREE.Vector3(0, e.def.size + 0.3, 0)));
    this.effects.damageNumber(p.x, p.y, `${dmg}`, 'hit');
    if (e.hp <= 0) {
      e.alive = false; e.removeFrom(this.world.scene);
      const pos = e.sprite.position.clone();
      const big = e.defKey === 'golem';
      this.effects.starBurst(pos, big ? 16 : 7, big);
      this.effects.coinBurst(pos, big ? 6 : 2);
      this.gold += e.def.gold;
      audio.coin();
    }
  }

  private worldToScreen(pos: THREE.Vector3): { x: number; y: number } {
    const v = pos.clone().project(this.world.camera);
    const w = this.container.clientWidth; const h = this.container.clientHeight;
    return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h };
  }

  private emitStats(force: boolean) {
    const s: GameStats = {
      gold: this.gold, lives: this.lives, wave: this.wave,
      waveInProgress: this.phase === 'spawning' || this.phase === 'fighting',
      enemiesAlive: this.enemies.length, gameOver: this.phase === 'over' && !this.victory,
      victory: this.victory, speed: this.speed, started: true,
    };
    const key = JSON.stringify(s);
    if (force || key !== this.statsCache) { this.statsCache = key; this.cb.onStats(s); }
  }
}
