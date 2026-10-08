// ─────────────────────────────────────────────────────────────
// effects.ts — Partículas caricaturescas, números de daño HTML,
// temblor de cámara y textos flotantes ("juice" del juego).
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { circleTexture, coinTexture, starTexture } from './textures';

interface Particle {
  sprite: THREE.Sprite;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  gravity: number;
  spin: number;
  baseScale: number;
  active: boolean;
}

export class Effects {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private starTex: THREE.Texture;
  private starTexRed: THREE.Texture;
  private puffTex: THREE.Texture;
  private coinTex: THREE.Texture;
  private shakeTime = 0;
  private shakeMag = 0;
  shakeOffset = new THREE.Vector3();
  private overlay: HTMLElement;

  constructor(scene: THREE.Scene, overlay: HTMLElement) {
    this.scene = scene;
    this.overlay = overlay;
    this.starTex = starTexture('#ffd93b');
    this.starTexRed = starTexture('#ff6b6b');
    this.puffTex = circleTexture('#ffffff', true);
    this.coinTex = coinTexture();
    // pool de partículas
    for (let i = 0; i < 220; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.puffTex, transparent: true, depthWrite: false }));
      s.visible = false;
      this.scene.add(s);
      this.particles.push({
        sprite: s, vel: new THREE.Vector3(), life: 0, maxLife: 1, gravity: 0, spin: 0, baseScale: 1, active: false,
      });
    }
  }

  private spawn(tex: THREE.Texture, pos: THREE.Vector3, vel: THREE.Vector3, life: number, scale: number, gravity = 0, spin = 0) {
    const p = this.particles.find((q) => !q.active);
    if (!p) return;
    p.active = true;
    p.sprite.visible = true;
    p.sprite.material.map = tex;
    p.sprite.material.rotation = Math.random() * Math.PI * 2;
    p.sprite.material.opacity = 1;
    p.sprite.position.copy(pos);
    p.vel.copy(vel);
    p.life = life;
    p.maxLife = life;
    p.gravity = gravity;
    p.spin = spin;
    p.baseScale = scale;
    p.sprite.scale.setScalar(scale);
  }

  /** Explosión de estrellas al morir un enemigo. */
  starBurst(pos: THREE.Vector3, count = 7, big = false) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = (big ? 5.5 : 3.5) * (0.6 + Math.random() * 0.8);
      this.spawn(
        Math.random() < 0.3 ? this.starTexRed : this.starTex,
        pos.clone().add(new THREE.Vector3(0, 0.6, 0)),
        new THREE.Vector3(Math.cos(a) * speed, 3 + Math.random() * 3.5, Math.sin(a) * speed),
        0.7 + Math.random() * 0.4,
        (big ? 1.1 : 0.7) * (0.7 + Math.random() * 0.6),
        9,
        (Math.random() - 0.5) * 12,
      );
    }
    // nube de humo
    for (let i = 0; i < 4; i++) {
      this.spawn(
        this.puffTex,
        pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.5 + Math.random() * 0.5, (Math.random() - 0.5) * 0.8)),
        new THREE.Vector3((Math.random() - 0.5) * 1.5, 1.2 + Math.random(), (Math.random() - 0.5) * 1.5),
        0.6,
        1.4 + Math.random(),
        -1.5,
      );
    }
  }

  /** Monedas que saltan al ganar oro. */
  coinBurst(pos: THREE.Vector3, count = 3) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      this.spawn(
        this.coinTex,
        pos.clone().add(new THREE.Vector3(0, 1, 0)),
        new THREE.Vector3(Math.cos(a) * 1.5, 4 + Math.random() * 2, Math.sin(a) * 1.5),
        0.9,
        0.8,
        10,
        8,
      );
    }
  }

  /** Impacto de proyectil. */
  hitSpark(pos: THREE.Vector3) {
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2;
      this.spawn(
        this.starTex,
        pos.clone(),
        new THREE.Vector3(Math.cos(a) * 2, 1.5 + Math.random() * 2, Math.sin(a) * 2),
        0.35,
        0.45,
        6,
        10,
      );
    }
  }

  /** Estela de hielo. */
  frostPuff(pos: THREE.Vector3) {
    for (let i = 0; i < 3; i++) {
      this.spawn(
        this.puffTex,
        pos.clone().add(new THREE.Vector3((Math.random() - 0.5), 0.4 + Math.random() * 0.8, (Math.random() - 0.5))),
        new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.8, (Math.random() - 0.5) * 0.8),
        0.5,
        0.9,
        -0.5,
      );
    }
  }

  shake(magnitude: number, duration = 0.3) {
    this.shakeMag = Math.max(this.shakeMag, magnitude);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  update(dt: number) {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.sprite.visible = false;
        continue;
      }
      p.vel.y -= p.gravity * dt;
      p.sprite.position.addScaledVector(p.vel, dt);
      p.sprite.material.rotation += p.spin * dt;
      const t = p.life / p.maxLife;
      p.sprite.material.opacity = Math.min(1, t * 2);
      p.sprite.scale.setScalar(p.baseScale * (0.4 + 0.6 * t));
    }
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const m = this.shakeMag * (this.shakeTime > 0 ? this.shakeTime : 0);
      this.shakeOffset.set((Math.random() - 0.5) * m, (Math.random() - 0.5) * m, (Math.random() - 0.5) * m * 0.4);
      if (this.shakeTime <= 0) {
        this.shakeMag = 0;
        this.shakeOffset.set(0, 0, 0);
      }
    }
  }

  /** Número de daño flotante en el overlay HTML. */
  damageNumber(screenX: number, screenY: number, text: string, kind: 'hit' | 'gold' | 'warn' | 'heal' = 'hit') {
    const el = document.createElement('div');
    el.className = `dmg-number dmg-${kind}`;
    el.textContent = text;
    el.style.left = `${screenX}px`;
    el.style.top = `${screenY}px`;
    el.style.setProperty('--rot', `${(Math.random() - 0.5) * 30}deg`);
    this.overlay.appendChild(el);
    window.setTimeout(() => el.remove(), 900);
  }

  /** Anuncio grande centrado ("¡Oleada 3!", "¡BRUTAL!"). */
  announce(text: string, sub = '') {
    const el = document.createElement('div');
    el.className = 'announce';
    el.innerHTML = `<span>${text}</span>${sub ? `<small>${sub}</small>` : ''}`;
    this.overlay.appendChild(el);
    window.setTimeout(() => el.remove(), 1800);
  }

  dispose() {
    for (const p of this.particles) this.scene.remove(p.sprite);
    this.particles = [];
  }
}
