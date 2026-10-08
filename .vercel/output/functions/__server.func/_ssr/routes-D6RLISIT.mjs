import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as SphereGeometry, D as TorusGeometry, E as TextureLoader, O as Vector2, S as Scene, T as SpriteMaterial, _ as PerspectiveCamera, a as Color, b as RingGeometry, c as DirectionalLight, d as Group, f as HemisphereLight, g as MeshLambertMaterial, h as MeshBasicMaterial, i as CircleGeometry, k as Vector3, l as DodecahedronGeometry, m as Mesh, n as BoxGeometry, o as ConeGeometry, p as MathUtils, r as CanvasTexture, s as CylinderGeometry, t as WebGLRenderer, u as Fog, v as PlaneGeometry, w as Sprite, x as SRGBColorSpace, y as Raycaster } from "../_libs/three.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-D6RLISIT.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var AudioEngine = class {
	ctx = null;
	master;
	musicBus;
	sfxBus;
	noiseBuf;
	musicTimer = null;
	nextNoteTime = 0;
	step = 0;
	musicOn = true;
	sfxOn = true;
	/** Debe llamarse desde un gesto de usuario (click/tap). */
	init() {
		if (this.ctx) {
			if (this.ctx.state === "suspended") this.ctx.resume();
			return;
		}
		const AC = window.AudioContext || window.webkitAudioContext;
		this.ctx = new AC();
		this.master = this.ctx.createGain();
		this.master.gain.value = .55;
		this.master.connect(this.ctx.destination);
		this.musicBus = this.ctx.createGain();
		this.musicBus.gain.value = .4;
		this.musicBus.connect(this.master);
		this.sfxBus = this.ctx.createGain();
		this.sfxBus.gain.value = .9;
		this.sfxBus.connect(this.master);
		const len = this.ctx.sampleRate * 1;
		this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
		const d = this.noiseBuf.getChannelData(0);
		for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
		this.startMusic();
	}
	setMusic(on) {
		this.musicOn = on;
		if (this.ctx) this.musicBus.gain.setTargetAtTime(on ? .4 : 0, this.ctx.currentTime, .05);
	}
	setSfx(on) {
		this.sfxOn = on;
		if (this.ctx) this.sfxBus.gain.setTargetAtTime(on ? .9 : 0, this.ctx.currentTime, .05);
	}
	BPM = 132;
	CHORDS = [
		[
			261.63,
			329.63,
			392
		],
		[
			196,
			246.94,
			392
		],
		[
			220,
			261.63,
			329.63
		],
		[
			174.61,
			220,
			349.23
		]
	];
	MEL = [
		0,
		-1,
		7,
		12,
		-1,
		7,
		4,
		-1,
		0,
		-1,
		7,
		12,
		16,
		-1,
		12,
		7,
		12,
		-1,
		7,
		4,
		-1,
		0,
		4,
		-1,
		7,
		-1,
		12,
		-1,
		7,
		4,
		0,
		-1,
		9,
		-1,
		12,
		16,
		-1,
		12,
		9,
		-1,
		4,
		-1,
		9,
		12,
		-1,
		9,
		4,
		-1,
		12,
		-1,
		16,
		19,
		-1,
		16,
		12,
		-1,
		7,
		-1,
		12,
		16,
		19,
		-1,
		24,
		-1
	];
	startMusic() {
		if (!this.ctx || this.musicTimer !== null) return;
		this.nextNoteTime = this.ctx.currentTime + .1;
		this.step = 0;
		const tick = () => {
			if (!this.ctx) return;
			const stepDur = 60 / this.BPM / 4;
			while (this.nextNoteTime < this.ctx.currentTime + .25) {
				this.scheduleStep(this.step, this.nextNoteTime, stepDur);
				this.nextNoteTime += stepDur;
				this.step = (this.step + 1) % 64;
			}
		};
		tick();
		this.musicTimer = window.setInterval(tick, 100);
	}
	scheduleStep(step, t, stepDur) {
		if (!this.ctx) return;
		const bar = Math.floor(step / 16);
		const chord = this.CHORDS[bar];
		const s16 = step % 16;
		if (s16 % 4 === 0) {
			const bassF = chord[0] / 2 * (s16 % 8 === 4 ? 1.5 : 1);
			this.tone("triangle", bassF, t, stepDur * 3.4, .5, this.musicBus);
		}
		if (s16 % 8 === 0) this.kick(t, .25, this.musicBus);
		if (s16 % 2 === 1) this.hat(t, .05, this.musicBus);
		const melIdx = step;
		const semi = this.MEL[melIdx];
		if (semi >= 0) {
			const f = chord[0] * 2 * Math.pow(2, semi / 12);
			this.lead(f, t, stepDur * 1.6);
		}
		if (s16 % 4 === 2) {
			const f = chord[s16 / 4 % 3 | 0] * 2;
			this.tone("square", f, t, stepDur * 1.2, .06, this.musicBus);
		}
	}
	tone(type, freq, t, dur, vol, bus, slideTo) {
		if (!this.ctx) return;
		const o = this.ctx.createOscillator();
		const g = this.ctx.createGain();
		o.type = type;
		o.frequency.setValueAtTime(freq, t);
		if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
		g.gain.setValueAtTime(0, t);
		g.gain.linearRampToValueAtTime(vol, t + .008);
		g.gain.exponentialRampToValueAtTime(.001, t + dur);
		o.connect(g).connect(bus);
		o.start(t);
		o.stop(t + dur + .05);
	}
	lead(freq, t, dur) {
		if (!this.ctx) return;
		const o = this.ctx.createOscillator();
		const g = this.ctx.createGain();
		const lfo = this.ctx.createOscillator();
		const lfoG = this.ctx.createGain();
		o.type = "square";
		o.frequency.setValueAtTime(freq, t);
		lfo.type = "sine";
		lfo.frequency.value = 7;
		lfoG.gain.setValueAtTime(freq * .008, t + dur * .4);
		lfoG.gain.setValueAtTime(0, t);
		lfoG.gain.linearRampToValueAtTime(freq * .01, t + dur * .5);
		lfo.connect(lfoG).connect(o.frequency);
		g.gain.setValueAtTime(0, t);
		g.gain.linearRampToValueAtTime(.11, t + .01);
		g.gain.exponentialRampToValueAtTime(.001, t + dur);
		o.connect(g).connect(this.musicBus);
		o.start(t);
		lfo.start(t);
		o.stop(t + dur + .05);
		lfo.stop(t + dur + .05);
	}
	kick(t, vol, bus) {
		this.tone("sine", 150, t, .12, vol, bus, 40);
	}
	hat(t, vol, bus) {
		if (!this.ctx) return;
		const src = this.ctx.createBufferSource();
		src.buffer = this.noiseBuf;
		const f = this.ctx.createBiquadFilter();
		f.type = "highpass";
		f.frequency.value = 7e3;
		const g = this.ctx.createGain();
		g.gain.setValueAtTime(vol, t);
		g.gain.exponentialRampToValueAtTime(.001, t + .04);
		src.connect(f).connect(g).connect(bus);
		src.start(t, Math.random() * .5);
		src.stop(t + .06);
	}
	noiseBurst(t, dur, vol, filterFreq, type = "lowpass") {
		if (!this.ctx) return;
		const src = this.ctx.createBufferSource();
		src.buffer = this.noiseBuf;
		src.loop = true;
		const f = this.ctx.createBiquadFilter();
		f.type = type;
		f.frequency.value = filterFreq;
		const g = this.ctx.createGain();
		g.gain.setValueAtTime(vol, t);
		g.gain.exponentialRampToValueAtTime(.001, t + dur);
		src.connect(f).connect(g).connect(this.sfxBus);
		src.start(t, Math.random() * .5);
		src.stop(t + dur + .05);
	}
	now() {
		return this.ctx ? this.ctx.currentTime : 0;
	}
	shoot() {
		if (!this.ctx || !this.sfxOn) return;
		const t = this.now();
		this.tone("square", 900 + Math.random() * 200, t, .09, .12, this.sfxBus, 300);
	}
	cannon() {
		if (!this.ctx || !this.sfxOn) return;
		const t = this.now();
		this.noiseBurst(t, .3, .35, 500);
		this.tone("sine", 120, t, .25, .3, this.sfxBus, 35);
	}
	frost() {
		if (!this.ctx || !this.sfxOn) return;
		const t = this.now();
		this.tone("sine", 1800, t, .15, .08, this.sfxBus, 2400);
		this.tone("sine", 2400, t + .05, .12, .06, this.sfxBus, 3e3);
	}
	hit() {
		if (!this.ctx || !this.sfxOn) return;
		this.noiseBurst(this.now(), .06, .15, 2500, "bandpass");
	}
	splash() {
		if (!this.ctx || !this.sfxOn) return;
		const t = this.now();
		this.noiseBurst(t, .2, .3, 900);
		this.tone("sine", 200, t, .18, .2, this.sfxBus, 60);
	}
	coin() {
		if (!this.ctx || !this.sfxOn) return;
		const t = this.now();
		this.tone("sine", 988, t, .07, .14, this.sfxBus);
		this.tone("sine", 1319, t + .07, .15, .14, this.sfxBus);
	}
	die() {
		if (!this.ctx || !this.sfxOn) return;
		const t = this.now();
		this.tone("square", 500, t, .2, .12, this.sfxBus, 90);
		this.noiseBurst(t, .12, .12, 1800);
	}
	place() {
		if (!this.ctx || !this.sfxOn) return;
		const t = this.now();
		this.tone("sine", 300, t, .15, .3, this.sfxBus, 80);
		this.noiseBurst(t + .02, .08, .15, 1200);
	}
	upgrade() {
		if (!this.ctx || !this.sfxOn) return;
		const t = this.now();
		[
			523,
			659,
			784,
			1047
		].forEach((f, i) => this.tone("square", f, t + i * .07, .12, .1, this.sfxBus));
	}
	sell() {
		if (!this.ctx || !this.sfxOn) return;
		const t = this.now();
		[
			784,
			659,
			523
		].forEach((f, i) => this.tone("square", f, t + i * .06, .1, .1, this.sfxBus));
	}
	leak() {
		if (!this.ctx || !this.sfxOn) return;
		const t = this.now();
		this.tone("sawtooth", 300, t, .35, .18, this.sfxBus, 90);
		this.tone("sawtooth", 150, t + .1, .4, .15, this.sfxBus, 60);
	}
	waveHorn() {
		if (!this.ctx || !this.sfxOn) return;
		const t = this.now();
		[
			392,
			392,
			523
		].forEach((f, i) => {
			this.tone("square", f, t + i * .14, .16, .14, this.sfxBus);
			this.tone("square", f / 2, t + i * .14, .16, .1, this.sfxBus);
		});
	}
	error() {
		if (!this.ctx || !this.sfxOn) return;
		this.tone("square", 180, this.now(), .15, .14, this.sfxBus, 120);
	}
	victory() {
		if (!this.ctx || !this.sfxOn) return;
		const t = this.now();
		[
			523,
			659,
			784,
			1047,
			784,
			1047,
			1319
		].forEach((f, i) => this.tone("square", f, t + i * .13, .22, .13, this.sfxBus));
	}
	gameOver() {
		if (!this.ctx || !this.sfxOn) return;
		const t = this.now();
		[
			392,
			370,
			349,
			311
		].forEach((f, i) => this.tone("sawtooth", f, t + i * .3, .34, .15, this.sfxBus));
	}
};
var audio = new AudioEngine();
var ENEMIES = {
	slime: {
		key: "slime",
		name: "Slime",
		hp: 26,
		speed: 2.3,
		gold: 6,
		damage: 1,
		size: 1.7
	},
	goblin: {
		key: "goblin",
		name: "Duende",
		hp: 17,
		speed: 3.7,
		gold: 8,
		damage: 1,
		size: 1.8
	},
	mushroom: {
		key: "mushroom",
		name: "Champiñón",
		hp: 75,
		speed: 1.6,
		gold: 12,
		damage: 2,
		size: 1.9
	},
	golem: {
		key: "golem",
		name: "Gólem",
		hp: 420,
		speed: 1.1,
		gold: 45,
		damage: 5,
		size: 3.4
	}
};
var TOWERS = {
	archer: {
		key: "archer",
		name: "Gato Arquero",
		desc: "Rápido y barato",
		cost: 50,
		dmg: 9,
		rate: 1.8,
		range: 6.8,
		color: "#ffb84d"
	},
	cannon: {
		key: "cannon",
		name: "Rana Cañón",
		desc: "Daño en área",
		cost: 90,
		dmg: 26,
		rate: .6,
		range: 5.6,
		splash: 2.3,
		color: "#7ddb52"
	},
	frost: {
		key: "frost",
		name: "Pingüino Mago",
		desc: "Ralentiza enemigos",
		cost: 70,
		dmg: 5,
		rate: 1.1,
		range: 6.2,
		slow: {
			factor: .5,
			duration: 1.6
		},
		color: "#7fd8ff"
	}
};
var TOWER_ORDER = [
	"archer",
	"cannon",
	"frost"
];
function upgradeCost(def, level) {
	return Math.round(def.cost * (level === 1 ? .8 : 1.2));
}
var SELL_RATIO = .7;
/** Composición de la oleada n (1-indexed). */
function waveComposition(n) {
	const out = [];
	const slime = 4 + Math.ceil(n * 1.6);
	out.push({
		type: "slime",
		count: slime
	});
	if (n >= 2) out.push({
		type: "goblin",
		count: Math.ceil(n * 1.3)
	});
	if (n >= 3) out.push({
		type: "mushroom",
		count: Math.floor(n * .8)
	});
	if (n % 5 === 0) out.push({
		type: "golem",
		count: Math.max(1, Math.floor(n / 5))
	});
	return out;
}
/** Multiplicador de vida por oleada. */
function hpScale(n) {
	return 1 + (n - 1) * .28 + Math.max(0, n - 10) * .15;
}
function spawnInterval(n) {
	return Math.max(.42, .95 - n * .03);
}
/** Oro extra por adelantar la oleada. */
function earlyWaveBonus(n) {
	return 10 + n * 2;
}
function makeCanvas(size) {
	const c = document.createElement("canvas");
	c.width = c.height = size;
	return {
		c,
		ctx: c.getContext("2d")
	};
}
function toTexture(c) {
	const t = new CanvasTexture(c);
	t.colorSpace = SRGBColorSpace;
	return t;
}
function starTexture(color = "#ffd93b") {
	const { c, ctx } = makeCanvas(128);
	ctx.translate(64, 64);
	ctx.beginPath();
	const spikes = 5, outer = 56, inner = 24;
	for (let i = 0; i < 10; i++) {
		const r = i % 2 === 0 ? outer : inner;
		const a = i * Math.PI / spikes - Math.PI / 2;
		ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
	}
	ctx.closePath();
	ctx.fillStyle = color;
	ctx.strokeStyle = "#3a2409";
	ctx.lineWidth = 9;
	ctx.stroke();
	ctx.fill();
	ctx.beginPath();
	ctx.arc(-12, -14, 10, 0, Math.PI * 2);
	ctx.fillStyle = "rgba(255,255,255,0.85)";
	ctx.fill();
	return toTexture(c);
}
function circleTexture(color = "#ffffff", soft = false) {
	const { c, ctx } = makeCanvas(64);
	if (soft) {
		const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
		g.addColorStop(0, color);
		g.addColorStop(1, "rgba(255,255,255,0)");
		ctx.fillStyle = g;
	} else ctx.fillStyle = color;
	ctx.beginPath();
	ctx.arc(32, 32, 28, 0, Math.PI * 2);
	ctx.fill();
	return toTexture(c);
}
function coinTexture() {
	const { c, ctx } = makeCanvas(96);
	ctx.translate(48, 48);
	ctx.beginPath();
	ctx.arc(0, 0, 40, 0, Math.PI * 2);
	ctx.fillStyle = "#ffcf3d";
	ctx.strokeStyle = "#8a5a00";
	ctx.lineWidth = 8;
	ctx.stroke();
	ctx.fill();
	ctx.beginPath();
	ctx.arc(0, 0, 26, 0, Math.PI * 2);
	ctx.fillStyle = "#ffe27a";
	ctx.fill();
	ctx.fillStyle = "#8a5a00";
	ctx.font = "bold 34px sans-serif";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("$", 0, 2);
	return toTexture(c);
}
function arrowTexture() {
	const c = document.createElement("canvas");
	c.width = 128;
	c.height = 32;
	const ctx = c.getContext("2d");
	ctx.lineWidth = 5;
	ctx.strokeStyle = "#5b3a1e";
	ctx.beginPath();
	ctx.moveTo(18, 16);
	ctx.lineTo(104, 16);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(104, 6);
	ctx.lineTo(124, 16);
	ctx.lineTo(104, 26);
	ctx.closePath();
	ctx.fillStyle = "#9aa5ad";
	ctx.strokeStyle = "#3a2409";
	ctx.lineWidth = 3;
	ctx.stroke();
	ctx.fill();
	ctx.beginPath();
	ctx.moveTo(16, 16);
	ctx.lineTo(2, 6);
	ctx.lineTo(8, 16);
	ctx.lineTo(2, 26);
	ctx.closePath();
	ctx.fillStyle = "#ff5a5a";
	ctx.fill();
	const t = new CanvasTexture(c);
	t.colorSpace = SRGBColorSpace;
	return t;
}
function snowflakeTexture() {
	const { c, ctx } = makeCanvas(96);
	ctx.translate(48, 48);
	ctx.strokeStyle = "#bfeaff";
	ctx.lineWidth = 7;
	ctx.lineCap = "round";
	ctx.shadowColor = "#4db8ff";
	ctx.shadowBlur = 10;
	for (let i = 0; i < 6; i++) {
		ctx.rotate(Math.PI / 3);
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.lineTo(0, -38);
		ctx.moveTo(0, -24);
		ctx.lineTo(-10, -32);
		ctx.moveTo(0, -24);
		ctx.lineTo(10, -32);
		ctx.stroke();
	}
	return toTexture(c);
}
async function loadCharacterTextures() {
	const loader = new TextureLoader();
	const entries = await Promise.all([
		"slime",
		"goblin",
		"mushroom",
		"golem",
		"archer",
		"cannon",
		"frost"
	].map((k) => new Promise((resolve, reject) => {
		loader.load(`/sprites/${k}.png`, (t) => {
			t.colorSpace = SRGBColorSpace;
			t.anisotropy = 4;
			resolve([k, t]);
		}, void 0, reject);
	})));
	return Object.fromEntries(entries);
}
var Effects = class {
	scene;
	particles = [];
	starTex;
	starTexRed;
	puffTex;
	coinTex;
	shakeTime = 0;
	shakeMag = 0;
	shakeOffset = new Vector3();
	overlay;
	constructor(scene, overlay) {
		this.scene = scene;
		this.overlay = overlay;
		this.starTex = starTexture("#ffd93b");
		this.starTexRed = starTexture("#ff6b6b");
		this.puffTex = circleTexture("#ffffff", true);
		this.coinTex = coinTexture();
		for (let i = 0; i < 220; i++) {
			const s = new Sprite(new SpriteMaterial({
				map: this.puffTex,
				transparent: true,
				depthWrite: false
			}));
			s.visible = false;
			this.scene.add(s);
			this.particles.push({
				sprite: s,
				vel: new Vector3(),
				life: 0,
				maxLife: 1,
				gravity: 0,
				spin: 0,
				baseScale: 1,
				active: false
			});
		}
	}
	spawn(tex, pos, vel, life, scale, gravity = 0, spin = 0) {
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
	starBurst(pos, count = 7, big = false) {
		for (let i = 0; i < count; i++) {
			const a = Math.random() * Math.PI * 2;
			const speed = (big ? 5.5 : 3.5) * (.6 + Math.random() * .8);
			this.spawn(Math.random() < .3 ? this.starTexRed : this.starTex, pos.clone().add(new Vector3(0, .6, 0)), new Vector3(Math.cos(a) * speed, 3 + Math.random() * 3.5, Math.sin(a) * speed), .7 + Math.random() * .4, (big ? 1.1 : .7) * (.7 + Math.random() * .6), 9, (Math.random() - .5) * 12);
		}
		for (let i = 0; i < 4; i++) this.spawn(this.puffTex, pos.clone().add(new Vector3((Math.random() - .5) * .8, .5 + Math.random() * .5, (Math.random() - .5) * .8)), new Vector3((Math.random() - .5) * 1.5, 1.2 + Math.random(), (Math.random() - .5) * 1.5), .6, 1.4 + Math.random(), -1.5);
	}
	/** Monedas que saltan al ganar oro. */
	coinBurst(pos, count = 3) {
		for (let i = 0; i < count; i++) {
			const a = Math.random() * Math.PI * 2;
			this.spawn(this.coinTex, pos.clone().add(new Vector3(0, 1, 0)), new Vector3(Math.cos(a) * 1.5, 4 + Math.random() * 2, Math.sin(a) * 1.5), .9, .8, 10, 8);
		}
	}
	/** Impacto de proyectil. */
	hitSpark(pos) {
		for (let i = 0; i < 3; i++) {
			const a = Math.random() * Math.PI * 2;
			this.spawn(this.starTex, pos.clone(), new Vector3(Math.cos(a) * 2, 1.5 + Math.random() * 2, Math.sin(a) * 2), .35, .45, 6, 10);
		}
	}
	/** Estela de hielo. */
	frostPuff(pos) {
		for (let i = 0; i < 3; i++) this.spawn(this.puffTex, pos.clone().add(new Vector3(Math.random() - .5, .4 + Math.random() * .8, Math.random() - .5)), new Vector3((Math.random() - .5) * .8, .8, (Math.random() - .5) * .8), .5, .9, -.5);
	}
	shake(magnitude, duration = .3) {
		this.shakeMag = Math.max(this.shakeMag, magnitude);
		this.shakeTime = Math.max(this.shakeTime, duration);
	}
	update(dt) {
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
			p.sprite.scale.setScalar(p.baseScale * (.4 + .6 * t));
		}
		if (this.shakeTime > 0) {
			this.shakeTime -= dt;
			const m = this.shakeMag * (this.shakeTime > 0 ? this.shakeTime : 0);
			this.shakeOffset.set((Math.random() - .5) * m, (Math.random() - .5) * m, (Math.random() - .5) * m * .4);
			if (this.shakeTime <= 0) {
				this.shakeMag = 0;
				this.shakeOffset.set(0, 0, 0);
			}
		}
	}
	/** Número de daño flotante en el overlay HTML. */
	damageNumber(screenX, screenY, text, kind = "hit") {
		const el = document.createElement("div");
		el.className = `dmg-number dmg-${kind}`;
		el.textContent = text;
		el.style.left = `${screenX}px`;
		el.style.top = `${screenY}px`;
		el.style.setProperty("--rot", `${(Math.random() - .5) * 30}deg`);
		this.overlay.appendChild(el);
		window.setTimeout(() => el.remove(), 900);
	}
	/** Anuncio grande centrado ("¡Oleada 3!", "¡BRUTAL!"). */
	announce(text, sub = "") {
		const el = document.createElement("div");
		el.className = "announce";
		el.innerHTML = `<span>${text}</span>${sub ? `<small>${sub}</small>` : ""}`;
		this.overlay.appendChild(el);
		window.setTimeout(() => el.remove(), 1800);
	}
	dispose() {
		for (const p of this.particles) this.scene.remove(p.sprite);
		this.particles = [];
	}
};
/** Camino en zig-zag (x, z). El castillo está en el último punto. */
var PATH_POINTS = [
	[-26, -10],
	[-15, -10],
	[-15, 7],
	[-3, 7],
	[-3, -7],
	[10, -7],
	[10, 8],
	[19, 8],
	[23, 8]
];
var PATH_WIDTH = 3.4;
/** Parcelas de construcción (x, z). */
var PADS = [
	[-20.5, -4.5],
	[-9.5, -4.5],
	[-20.5, -14.5],
	[-9, -14.5],
	[-21.5, 7],
	[-9, 13],
	[2.5, 12.5],
	[-9.5, 1],
	[3.5, -1.5],
	[3.5, -12.5],
	[16, -12],
	[16, -1.5],
	[4, 2.5],
	[17, 13.5]
];
var C = {
	grass: 7326287,
	grassDark: 5746748,
	dirt: 14262363,
	dirtEdge: 11565630,
	trunk: 9067051,
	leaf: 4103742,
	leaf2: 3112751,
	rock: 10134443,
	stone: 13617339,
	castleWall: 15262420,
	castleRoof: 14833484,
	sky: 9426687
};
function lambert(color) {
	return new MeshLambertMaterial({ color });
}
function buildPathRibbon(pts, width, y, mat) {
	const group = new Group();
	for (let i = 0; i < pts.length - 1; i++) {
		const a = pts[i], b = pts[i + 1];
		const len = a.distanceTo(b);
		const geo = new PlaneGeometry(len + width, width);
		const m = new Mesh(geo, mat);
		m.rotation.x = -Math.PI / 2;
		const ang = Math.atan2(b.z - a.z, b.x - a.x);
		m.rotation.z = -ang;
		m.position.set((a.x + b.x) / 2, y, (a.z + b.z) / 2);
		m.receiveShadow = true;
		group.add(m);
	}
	for (let i = 1; i < pts.length - 1; i++) {
		const m = new Mesh(new CircleGeometry(width / 2, 24), mat);
		m.rotation.x = -Math.PI / 2;
		m.position.set(pts[i].x, y, pts[i].z);
		m.receiveShadow = true;
		group.add(m);
	}
	return group;
}
function makeTree(scale = 1) {
	const g = new Group();
	const trunk = new Mesh(new CylinderGeometry(.28, .4, 1.4, 7), lambert(C.trunk));
	trunk.position.y = .7;
	trunk.castShadow = true;
	const l1 = new Mesh(new ConeGeometry(1.5, 2.2, 8), lambert(C.leaf));
	l1.position.y = 2.2;
	l1.castShadow = true;
	const l2 = new Mesh(new ConeGeometry(1.1, 1.8, 8), lambert(C.leaf2));
	l2.position.y = 3.4;
	l2.castShadow = true;
	const l3 = new Mesh(new ConeGeometry(.7, 1.3, 8), lambert(C.leaf));
	l3.position.y = 4.4;
	l3.castShadow = true;
	g.add(trunk, l1, l2, l3);
	g.scale.setScalar(scale);
	return g;
}
function makeRock(scale = 1) {
	const r = new Mesh(new DodecahedronGeometry(.8, 0), lambert(C.rock));
	r.scale.set(scale, scale * .7, scale);
	r.castShadow = true;
	r.rotation.y = Math.random() * Math.PI;
	return r;
}
function makeFlower(color) {
	const g = new Group();
	const stem = new Mesh(new CylinderGeometry(.04, .04, .5, 5), lambert(4103742));
	stem.position.y = .25;
	const head = new Mesh(new SphereGeometry(.18, 8, 8), lambert(color));
	head.position.y = .55;
	g.add(stem, head);
	return g;
}
function makeCloud() {
	const g = new Group();
	const mat = new MeshLambertMaterial({ color: 16777215 });
	const blobs = 3 + Math.floor(Math.random() * 3);
	for (let i = 0; i < blobs; i++) {
		const s = .9 + Math.random() * 1.1;
		const b = new Mesh(new SphereGeometry(s, 10, 10), mat);
		b.position.set(i * 1.3 - blobs * .6, Math.random() * .5, Math.random() * .8);
		b.scale.y = .7;
		g.add(b);
	}
	return g;
}
function makeCastle() {
	const g = new Group();
	const wall = new Mesh(new BoxGeometry(5.5, 4.2, 3.6), lambert(C.castleWall));
	wall.position.y = 2.1;
	wall.castShadow = true;
	g.add(wall);
	for (let i = -2; i <= 2; i++) {
		const m = new Mesh(new BoxGeometry(.7, .7, .7), lambert(C.castleWall));
		m.position.set(i * 1.1, 4.5, -1.4);
		g.add(m);
		const m2 = m.clone();
		m2.position.z = 1.4;
		g.add(m2);
	}
	for (const sx of [-2.9, 2.9]) for (const sz of [-1.9, 1.9]) {
		const t = new Mesh(new CylinderGeometry(.9, 1.05, 5.6, 10), lambert(C.castleWall));
		t.position.set(sx, 2.8, sz);
		t.castShadow = true;
		const roof = new Mesh(new ConeGeometry(1.25, 1.8, 10), lambert(C.castleRoof));
		roof.position.set(sx, 6.4, sz);
		roof.castShadow = true;
		g.add(t, roof);
	}
	const door = new Mesh(new BoxGeometry(1.6, 2.4, .3), lambert(7029286));
	door.position.set(0, 1.2, 1.85);
	g.add(door);
	const pole = new Mesh(new CylinderGeometry(.06, .06, 2.2, 6), lambert(7029286));
	pole.position.set(0, 5.2, 0);
	const flag = new Mesh(new PlaneGeometry(1.2, .7), new MeshLambertMaterial({
		color: 14833484,
		side: 2
	}));
	flag.position.set(.62, 5.9, 0);
	g.add(pole, flag);
	g.userData.flag = flag;
	return g;
}
function makePortal() {
	const g = new Group();
	const torus = new Mesh(new TorusGeometry(1.7, .32, 10, 24), new MeshLambertMaterial({ color: 6963125 }));
	torus.position.y = 2.1;
	torus.castShadow = true;
	const disc = new Mesh(new CircleGeometry(1.45, 24), new MeshBasicMaterial({
		color: 11627519,
		transparent: true,
		opacity: .85
	}));
	disc.position.y = 2.1;
	const base = new Mesh(new CylinderGeometry(1.3, 1.6, .5, 12), lambert(C.rock));
	base.position.y = .25;
	g.add(torus, disc, base);
	return {
		group: g,
		disc
	};
}
function createWorld(container) {
	const scene = new Scene();
	scene.background = new Color(C.sky);
	scene.fog = new Fog(C.sky, 55, 110);
	const camera = new PerspectiveCamera(47, 1, .1, 200);
	camera.position.set(0, 31, 28);
	camera.lookAt(2.5, 0, 0);
	const renderer = new WebGLRenderer({ antialias: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = 2;
	container.appendChild(renderer.domElement);
	const hemi = new HemisphereLight(12577023, 6136645, .9);
	scene.add(hemi);
	const sun = new DirectionalLight(16774102, 1.6);
	sun.position.set(-18, 30, 12);
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	sun.shadow.camera.left = -35;
	sun.shadow.camera.right = 35;
	sun.shadow.camera.top = 35;
	sun.shadow.camera.bottom = -35;
	sun.shadow.bias = -5e-4;
	scene.add(sun);
	const groundGeo = new PlaneGeometry(82, 64, 40, 28);
	const pos = groundGeo.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i);
		const y = pos.getY(i);
		const edge = Math.max(0, Math.abs(x) - 26) + Math.max(0, Math.abs(y) - 17);
		const h = edge > 0 ? Math.min(edge * .16, 2.4) * (.7 + .5 * Math.sin(x * .5) * Math.cos(y * .4)) : 0;
		pos.setZ(i, h);
	}
	groundGeo.computeVertexNormals();
	const ground = new Mesh(groundGeo, lambert(C.grass));
	ground.rotation.x = -Math.PI / 2;
	ground.receiveShadow = true;
	scene.add(ground);
	const path = PATH_POINTS.map(([x, z]) => new Vector3(x, 0, z));
	scene.add(buildPathRibbon(path, 4.2, .02, lambert(C.dirtEdge)));
	scene.add(buildPathRibbon(path, PATH_WIDTH, .04, lambert(C.dirt)));
	const pathCumulative = [0];
	for (let i = 1; i < path.length; i++) pathCumulative.push(pathCumulative[i - 1] + path[i].distanceTo(path[i - 1]));
	const pathLength = pathCumulative[pathCumulative.length - 1];
	const decor = new Group();
	const flowerColors = [
		16739229,
		16767291,
		16747586,
		13134847,
		16777215
	];
	let seed = 7;
	const rand = () => {
		seed = seed * 16807 % 2147483647;
		return (seed - 1) / 2147483646;
	};
	const tooCloseToPath = (x, z) => {
		for (let i = 0; i < path.length - 1; i++) {
			const a = path[i], b = path[i + 1];
			const abx = b.x - a.x, abz = b.z - a.z;
			const t = Math.max(0, Math.min(1, ((x - a.x) * abx + (z - a.z) * abz) / (abx * abx + abz * abz)));
			const dx = x - (a.x + abx * t), dz = z - (a.z + abz * t);
			if (Math.hypot(dx, dz) < 3.3) return true;
		}
		return false;
	};
	const tooCloseToPads = (x, z) => PADS.some(([px, pz]) => Math.hypot(x - px, z - pz) < 2.4);
	const inLoopInterior = (x, z) => x > -8 && x < 15 && z > -11 && z < 11;
	for (let i = 0; i < 46; i++) {
		const x = (rand() - .5) * 68;
		const z = (rand() - .5) * 46;
		if (tooCloseToPath(x, z) || tooCloseToPads(x, z) || inLoopInterior(x, z)) continue;
		const r = rand();
		if (r < .55) {
			const t = makeTree(.7 + rand() * .8);
			t.position.set(x, 0, z);
			t.rotation.y = rand() * Math.PI * 2;
			decor.add(t);
		} else if (r < .8) {
			const rock = makeRock(.5 + rand() * .9);
			rock.position.set(x, .3, z);
			decor.add(rock);
		} else {
			const f = makeFlower(flowerColors[Math.floor(rand() * flowerColors.length)]);
			f.position.set(x, 0, z);
			decor.add(f);
		}
	}
	scene.add(decor);
	const clouds = [];
	for (let i = 0; i < 6; i++) {
		const c = makeCloud();
		c.position.set((Math.random() - .5) * 90, 14 + Math.random() * 8, -20 + Math.random() * 30);
		c.scale.setScalar(1.2 + Math.random());
		clouds.push(c);
		scene.add(c);
	}
	const castle = makeCastle();
	const end = path[path.length - 1];
	castle.position.set(end.x + 2.5, 0, end.z);
	castle.rotation.y = Math.PI / 2;
	scene.add(castle);
	const { group: portal, disc: portalDisc } = makePortal();
	const start = path[0];
	portal.position.set(start.x - 1.5, 0, start.z);
	portal.rotation.y = Math.PI / 2;
	scene.add(portal);
	return {
		scene,
		camera,
		renderer,
		portal,
		portalDisc,
		castle,
		clouds,
		pads: PADS.map(([x, z], i) => {
			const geo = new CylinderGeometry(1.25, 1.4, .35, 18);
			const mesh = new Mesh(geo, new MeshLambertMaterial({ color: 14208942 }));
			mesh.position.set(x, .17, z);
			mesh.receiveShadow = true;
			mesh.castShadow = true;
			mesh.userData.padIndex = i;
			const ring = new Mesh(new RingGeometry(1.35, 1.6, 24), new MeshBasicMaterial({
				color: 16777215,
				transparent: true,
				opacity: .9,
				side: 2
			}));
			ring.rotation.x = -Math.PI / 2;
			ring.position.set(x, .37, z);
			ring.visible = false;
			scene.add(mesh, ring);
			return {
				position: new Vector3(x, .35, z),
				mesh,
				ring,
				occupied: false,
				index: i
			};
		}),
		path,
		pathLength,
		pathCumulative
	};
}
var Enemy = class {
	defKey;
	hp;
	maxHp;
	dist = 0;
	alive = true;
	sprite;
	shadow;
	hpBg;
	hpFg;
	phase = Math.random() * Math.PI * 2;
	slowUntil = 0;
	flash = 0;
	squash = 0;
	lastDirX = 1;
	time = 0;
	slowFactor = 1;
	constructor(defKey, scaleHp, chars) {
		this.defKey = defKey;
		const def = ENEMIES[defKey];
		this.maxHp = Math.round(def.hp * scaleHp);
		this.hp = this.maxHp;
		const mat = new SpriteMaterial({
			map: chars[def.key],
			transparent: true,
			depthWrite: false
		});
		this.sprite = new Sprite(mat);
		this.sprite.center.set(.5, .02);
		this.sprite.scale.setScalar(def.size);
		this.shadow = new Mesh(new CircleGeometry(def.size * .32, 16), new MeshBasicMaterial({
			color: 1719570,
			transparent: true,
			opacity: .3,
			depthWrite: false
		}));
		this.shadow.rotation.x = -Math.PI / 2;
		const white = circleTexture("#ffffff");
		this.hpBg = new Sprite(new SpriteMaterial({
			map: white,
			color: 3151371,
			depthWrite: false
		}));
		this.hpFg = new Sprite(new SpriteMaterial({
			map: white,
			color: 5820734,
			depthWrite: false
		}));
		this.hpBg.scale.set(1.5, .18, 1);
		this.hpFg.scale.set(1.4, .12, 1);
	}
	get def() {
		return ENEMIES[this.defKey];
	}
	addTo(scene, pos) {
		this.sprite.position.copy(pos);
		this.shadow.position.set(pos.x, .07, pos.z);
		scene.add(this.sprite, this.shadow, this.hpBg, this.hpFg);
		this.updateBars();
	}
	removeFrom(scene) {
		scene.remove(this.sprite, this.shadow, this.hpBg, this.hpFg);
		this.sprite.material.dispose();
	}
	updateBars() {
		const frac = Math.max(0, this.hp / this.maxHp);
		const y = this.def.size + .45;
		this.hpBg.position.set(this.sprite.position.x, y, this.sprite.position.z);
		this.hpFg.position.set(this.sprite.position.x, y, this.sprite.position.z + .001);
		this.hpFg.scale.x = 1.4 * frac;
		this.hpFg.material.color.setHSL(.33 * frac, .85, .5);
		const vis = frac < 1;
		this.hpBg.visible = vis;
		this.hpFg.visible = vis;
	}
	applySlow(factor, duration, now) {
		this.slowUntil = now + duration;
		this.slowFactor = factor;
		this.sprite.material.color.set(10475775);
	}
	update(dt, now, world) {
		const def = this.def;
		const slowed = now < this.slowUntil;
		if (!slowed && this.sprite.material.color.getHex() !== 16777215) this.sprite.material.color.set(16777215);
		const speed = def.speed * (slowed ? this.slowFactor : 1);
		const prev = this.sprite.position.clone();
		this.dist += speed * dt;
		const pos = posAtDistance(world, this.dist);
		this.time += dt * (1 + speed * .3);
		const wob = Math.sin(this.time * 9 + this.phase);
		const squashY = 1 + wob * .09;
		const squashX = 1 - wob * .07 + this.squash * -.35;
		this.squash = Math.max(0, this.squash - dt * 4);
		const dirX = pos.x - prev.x;
		if (Math.abs(dirX) > .001) this.lastDirX = Math.sign(dirX);
		const flip = this.lastDirX < 0 ? -1 : 1;
		this.sprite.scale.set(def.size * squashX * flip * (1 + this.squash * .3), def.size * squashY * (1 + this.squash * .3), 1);
		this.sprite.material.rotation = wob * .09;
		this.sprite.position.copy(pos);
		this.shadow.position.set(pos.x, .07, pos.z);
		this.shadow.scale.setScalar(squashX);
		if (this.flash > 0) {
			this.flash -= dt;
			this.sprite.material.color.set(16777215);
		}
		this.updateBars();
	}
};
/** Interpola posición sobre el camino por distancia recorrida. */
function posAtDistance(world, dist) {
	const { path, pathCumulative } = world;
	if (dist <= 0) return path[0].clone();
	for (let i = 1; i < path.length; i++) if (dist <= pathCumulative[i]) {
		const t = (dist - pathCumulative[i - 1]) / (pathCumulative[i] - pathCumulative[i - 1]);
		return path[i - 1].clone().lerp(path[i], t);
	}
	return path[path.length - 1].clone();
}
var towerIdCounter = 1;
var Tower = class {
	id = towerIdCounter++;
	level = 1;
	cooldown = 0;
	invested;
	group = new Group();
	sprite;
	rangeRing;
	pad;
	lastDirX = 1;
	popAnim = 0;
	defKey;
	constructor(defKey, pad, chars) {
		this.defKey = defKey;
		this.pad = pad;
		const def = this.def;
		this.invested = def.cost;
		const base = new Mesh(new CylinderGeometry(.95, 1.15, .8, 12), new MeshLambertMaterial({ color: 12563614 }));
		base.position.y = .4;
		base.castShadow = true;
		base.userData.towerId = this.id;
		const trim = new Mesh(new CylinderGeometry(1, 1, .18, 12), new MeshLambertMaterial({ color: new Color(def.color) }));
		trim.position.y = .82;
		trim.userData.towerId = this.id;
		this.sprite = new Sprite(new SpriteMaterial({
			map: chars[def.key],
			transparent: true,
			depthWrite: false
		}));
		this.sprite.center.set(.5, 0);
		this.sprite.scale.setScalar(2.4);
		this.sprite.position.y = .9;
		this.sprite.userData.towerId = this.id;
		this.group.add(base, trim, this.sprite);
		this.group.position.copy(pad.position).setY(0);
		this.rangeRing = new Mesh(new RingGeometry(def.range - .15, def.range, 48), new MeshBasicMaterial({
			color: new Color(def.color),
			transparent: true,
			opacity: .7,
			side: 2,
			depthWrite: false
		}));
		this.rangeRing.rotation.x = -Math.PI / 2;
		this.rangeRing.position.copy(pad.position).setY(.09);
		this.rangeRing.visible = false;
		this.popAnim = .001;
	}
	get def() {
		return TOWERS[this.defKey];
	}
	get dmg() {
		return Math.round(this.def.dmg * Math.pow(1.8, this.level - 1));
	}
	get range() {
		return this.def.range * (1 + (this.level - 1) * .12);
	}
	get sellValue() {
		return Math.round(this.invested * SELL_RATIO);
	}
	info() {
		return {
			id: this.id,
			type: this.defKey,
			level: this.level,
			dmg: this.dmg,
			range: Math.round(this.range * 10) / 10,
			upgradeCost: this.level < 3 ? upgradeCost(this.def, this.level) : null,
			sellValue: this.sellValue
		};
	}
};
var GameEngine = class {
	world;
	effects;
	chars;
	texArrow;
	texSnow;
	texBall;
	enemies = [];
	towers = [];
	projectiles = [];
	spawnQueue = [];
	spawnTimer = 0;
	phase = "idle";
	gold = 130;
	lives = 20;
	wave = 0;
	speed = 1;
	victory = false;
	selectedType = null;
	selectedTower = null;
	ghost = null;
	ghostRing = null;
	raf = 0;
	lastT = 0;
	elapsed = 0;
	disposed = false;
	raycaster = new Raycaster();
	camBase = new Vector3();
	camTarget = new Vector3(2.5, 0, 0);
	camFocusX = 0;
	flagTime = 0;
	statsCache = "";
	container;
	overlay;
	cb;
	constructor(container, overlay, cb) {
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
		this.texBall = circleTexture("#2e2e2e");
		this.camBase.copy(this.world.camera.position);
		this.resize();
		window.addEventListener("resize", this.resize);
		const el = this.world.renderer.domElement;
		el.addEventListener("pointerdown", this.onPointerDown);
		el.addEventListener("pointermove", this.onPointerMove);
		this.lastT = performance.now();
		const loop = (t) => {
			if (this.disposed) return;
			this.raf = requestAnimationFrame(loop);
			const dt = Math.min(.05, (t - this.lastT) / 1e3);
			this.lastT = t;
			this.tick(dt);
		};
		this.raf = requestAnimationFrame(loop);
		this.emitStats(true);
	}
	dispose() {
		this.disposed = true;
		if (this.raf) cancelAnimationFrame(this.raf);
		window.removeEventListener("resize", this.resize);
		this.effects?.dispose();
		const renderer = this.world?.renderer;
		if (!renderer) return;
		renderer.domElement.removeEventListener("pointerdown", this.onPointerDown);
		renderer.domElement.removeEventListener("pointermove", this.onPointerMove);
		renderer.dispose();
		renderer.domElement.remove();
	}
	resize = () => {
		const w = this.container.clientWidth || 1;
		const h = this.container.clientHeight || 1;
		const cam = this.world.camera;
		cam.aspect = w / h;
		if (cam.aspect < 1) {
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
	startGame() {
		audio.init();
		this.emitStats(true);
	}
	setSelectedType(type) {
		this.selectedType = type;
		this.selectedTower = null;
		this.hideGhost();
		this.cb.onTowerSelected(null);
	}
	startWave(early) {
		if (this.phase === "spawning" || this.phase === "fighting" || this.phase === "over") return;
		this.wave += 1;
		if (early && this.wave > 1) {
			const bonus = earlyWaveBonus(this.wave);
			this.gold += bonus;
			this.cb.onToast(`¡Bonus por adelantar! +${bonus} oro`);
		}
		const comp = waveComposition(this.wave);
		this.spawnQueue = [];
		for (const e of comp) for (let i = 0; i < e.count; i++) this.spawnQueue.push(e.type);
		const bosses = this.spawnQueue.filter((t) => t === "golem");
		const rest = this.spawnQueue.filter((t) => t !== "golem");
		for (let i = rest.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[rest[i], rest[j]] = [rest[j], rest[i]];
		}
		this.spawnQueue = [...rest, ...bosses];
		this.spawnTimer = .5;
		this.phase = "spawning";
		audio.waveHorn();
		const boss = bosses.length > 0;
		this.effects.announce(`¡Oleada ${this.wave}!`, boss ? "¡Cuidado, viene un GÓLEM!" : "");
		this.emitStats(true);
	}
	setSpeed(s) {
		this.speed = s;
		this.emitStats(true);
	}
	upgradeSelected() {
		const t = this.selectedTower;
		if (!t || t.level >= 3) return;
		const cost = upgradeCost(t.def, t.level);
		if (this.gold < cost) {
			audio.error();
			this.cb.onToast("¡No tienes suficiente oro!");
			return;
		}
		this.gold -= cost;
		t.invested += cost;
		t.level += 1;
		t.popAnim = .001;
		t.sprite.scale.setScalar(2.4 + (t.level - 1) * .35);
		t.rangeRing.geometry.dispose();
		t.rangeRing.geometry = new RingGeometry(t.range - .15, t.range, 48);
		audio.upgrade();
		this.effects.starBurst(t.group.position.clone().add(new Vector3(0, 1.5, 0)), 5);
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
		this.gold = 130;
		this.lives = 20;
		this.wave = 0;
		this.phase = "idle";
		this.victory = false;
		this.selectedTower = null;
		this.selectedType = null;
		this.cb.onTowerSelected(null);
		this.emitStats(true);
	}
	pointerNDC(e) {
		const rect = this.world.renderer.domElement.getBoundingClientRect();
		return new Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
	}
	padAt(e) {
		this.raycaster.setFromCamera(this.pointerNDC(e), this.world.camera);
		const hits = this.raycaster.intersectObjects(this.world.pads.map((p) => p.mesh));
		if (!hits.length) return null;
		return this.world.pads[hits[0].object.userData.padIndex];
	}
	towerAt(e) {
		this.raycaster.setFromCamera(this.pointerNDC(e), this.world.camera);
		const objs = [];
		for (const t of this.towers) t.group.traverse((o) => objs.push(o));
		const hits = this.raycaster.intersectObjects(objs);
		if (!hits.length) return null;
		let o = hits[0].object;
		while (o && o.userData.towerId === void 0) o = o.parent;
		const id = hits[0].object.userData.towerId ?? o?.userData.towerId;
		return this.towers.find((t) => t.id === id) ?? null;
	}
	onPointerDown = (e) => {
		if (this.phase === "over") return;
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
			this.cb.onToast("Elige una torre abajo primero");
			audio.error();
			return;
		}
		this.selectedTower = null;
		this.cb.onTowerSelected(null);
		this.hideRings();
	};
	onPointerMove = (e) => {
		if (!this.selectedType) {
			this.hideGhost();
			return;
		}
		const pad = this.padAt(e);
		if (pad && !pad.occupied) this.showGhost(pad, this.selectedType);
		else this.hideGhost();
	};
	showGhost(pad, type) {
		const def = TOWERS[type];
		if (!this.ghost) {
			this.ghost = new Sprite(new SpriteMaterial({
				map: this.chars[def.key],
				transparent: true,
				opacity: .6,
				depthWrite: false
			}));
			this.ghost.center.set(.5, 0);
			this.ghost.scale.setScalar(2.4);
			this.ghostRing = new Mesh(new RingGeometry(.95, 1, 48), new MeshBasicMaterial({
				color: 16777215,
				transparent: true,
				opacity: .5,
				side: 2,
				depthWrite: false
			}));
			this.ghostRing.rotation.x = -Math.PI / 2;
			this.world.scene.add(this.ghost, this.ghostRing);
		}
		this.ghost.material.map = this.chars[def.key];
		this.ghost.position.copy(pad.position).setY(.9);
		this.ghost.visible = true;
		this.ghostRing.scale.setScalar(def.range);
		this.ghostRing.position.copy(pad.position).setY(.09);
		this.ghostRing.visible = true;
	}
	hideGhost() {
		if (this.ghost) this.ghost.visible = false;
		if (this.ghostRing) this.ghostRing.visible = false;
	}
	selectTower(t) {
		this.selectedTower = t;
		this.selectedType = null;
		this.hideGhost();
		this.hideRings();
		t.rangeRing.visible = true;
		audio.shoot();
		this.cb.onTowerSelected(t.info());
	}
	hideRings() {
		for (const t of this.towers) t.rangeRing.visible = false;
	}
	buildTower(pad, type) {
		const def = TOWERS[type];
		if (this.gold < def.cost) {
			audio.error();
			this.cb.onToast(`Falta oro: ${def.name} cuesta ${def.cost}`);
			const p = this.worldToScreen(pad.position.clone().add(new Vector3(0, 2, 0)));
			this.effects.damageNumber(p.x, p.y, "¡Sin oro!", "warn");
			return;
		}
		this.gold -= def.cost;
		pad.occupied = true;
		const t = new Tower(type, pad, this.chars);
		this.towers.push(t);
		this.world.scene.add(t.group, t.rangeRing);
		audio.place();
		this.effects.shake(.25, .18);
		this.effects.starBurst(pad.position.clone().add(new Vector3(0, 1, 0)), 5);
		this.hideGhost();
		this.emitStats(true);
	}
	tick(dtRaw) {
		const dt = dtRaw * this.speed;
		this.elapsed += dt;
		const w = this.world;
		for (const c of w.clouds) {
			c.position.x += dt * .5;
			if (c.position.x > 60) c.position.x = -60;
		}
		w.portalDisc.rotation.z += dt * 2.5;
		const s = 1 + Math.sin(this.elapsed * 3) * .08;
		w.portalDisc.scale.setScalar(s);
		this.flagTime += dt;
		const flag = w.castle.userData.flag;
		if (flag) flag.rotation.y = Math.sin(this.flagTime * 6) * .35;
		if (this.phase === "spawning" || this.phase === "fighting") {
			this.updateSpawning(dt);
			this.updateEnemies(dt);
			this.updateTowers(dt);
			this.updateProjectiles(dt);
			this.checkWaveEnd();
		}
		for (const t of this.towers) if (t.popAnim > 0) {
			t.popAnim = Math.min(1, t.popAnim + dtRaw * 3.5);
			const k = 1 + Math.sin(t.popAnim * Math.PI) * .25;
			t.group.scale.setScalar(t.popAnim < 1 ? t.popAnim * k : 1);
			if (t.popAnim >= 1) t.popAnim = 0;
		}
		this.effects.update(dtRaw);
		let focusX = 0;
		if (w.camera.aspect < 1) {
			const alive = this.enemies.filter((e) => e.alive);
			if (alive.length) focusX = alive.reduce((s, e) => s + e.sprite.position.x, 0) / alive.length;
			focusX = MathUtils.clamp(focusX, -9, 9);
		}
		this.camFocusX += (focusX - this.camFocusX) * Math.min(1, dtRaw * 1.6);
		const sway = new Vector3(Math.sin(this.elapsed * .3) * .35, Math.sin(this.elapsed * .42) * .2, 0);
		w.camera.position.copy(this.camBase).add(new Vector3(this.camFocusX, 0, 0)).add(sway).add(this.effects.shakeOffset);
		w.camera.lookAt(this.camTarget.x + this.camFocusX, this.camTarget.y, this.camTarget.z);
		w.renderer.render(w.scene, w.camera);
		this.emitStats();
	}
	updateSpawning(dt) {
		if (this.phase !== "spawning" || !this.spawnQueue.length) return;
		this.spawnTimer -= dt;
		if (this.spawnTimer <= 0) {
			const type = this.spawnQueue.shift();
			this.spawnEnemy(type);
			this.spawnTimer = spawnInterval(this.wave) * (type === "golem" ? 2 : 1);
			if (!this.spawnQueue.length) this.phase = "fighting";
		}
	}
	spawnEnemy(type) {
		const e = new Enemy(type, hpScale(this.wave), this.chars);
		const start = this.world.path[0].clone();
		const jitter = (Math.random() - .5) * PATH_WIDTH * .35;
		const next = this.world.path[1];
		const dir = new Vector3().subVectors(next, this.world.path[0]).normalize();
		new Vector3(-dir.z, 0, dir.x);
		e.dist = 0;
		e.addTo(this.world.scene, start);
		e.lane = jitter;
		this.enemies.push(e);
		e.squash = 1;
	}
	updateEnemies(dt) {
		const now = this.elapsed;
		for (const e of this.enemies) {
			if (!e.alive) continue;
			e.update(dt, now, this.world);
			const lane = e.lane ?? 0;
			if (lane !== 0 && e.dist < this.world.pathLength) {
				const ahead = posAtDistance(this.world, Math.min(e.dist + .5, this.world.pathLength));
				const dir = new Vector3().subVectors(ahead, e.sprite.position).normalize();
				const perp = new Vector3(-dir.z, 0, dir.x);
				e.sprite.position.addScaledVector(perp, lane);
				e.shadow.position.x = e.sprite.position.x;
				e.shadow.position.z = e.sprite.position.z;
			}
			if (e.dist >= this.world.pathLength - .5) {
				e.alive = false;
				e.removeFrom(this.world.scene);
				this.lives -= e.def.damage;
				audio.leak();
				this.effects.shake(.9, .4);
				const p = this.worldToScreen(e.sprite.position.clone().add(new Vector3(0, 2, 0)));
				this.effects.damageNumber(p.x, p.y, `-${e.def.damage} ♥`, "warn");
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
	updateTowers(dt) {
		for (const t of this.towers) {
			t.cooldown -= dt;
			if (t.cooldown > 0) continue;
			let best = null;
			let bestDist = -1;
			for (const e of this.enemies) {
				if (!e.alive) continue;
				if (e.sprite.position.distanceTo(t.group.position) <= t.range && e.dist > bestDist) {
					best = e;
					bestDist = e.dist;
				}
			}
			if (!best) continue;
			t.cooldown = 1 / t.def.rate;
			const dirX = best.sprite.position.x - t.group.position.x;
			if (Math.abs(dirX) > .01) t.lastDirX = Math.sign(dirX);
			const base = 2.4 + (t.level - 1) * .35;
			t.sprite.scale.set(base * t.lastDirX, base, 1);
			this.fireProjectile(t, best);
		}
	}
	fireProjectile(t, target) {
		const def = t.def;
		const from = t.group.position.clone().add(new Vector3(0, 2.2, 0));
		if (def.key === "archer") {
			audio.shoot();
			const sprite = new Sprite(new SpriteMaterial({
				map: this.texArrow,
				transparent: true,
				depthWrite: false
			}));
			sprite.scale.set(1.4, .35, 1);
			this.projectiles.push({
				kind: "arrow",
				sprite,
				from,
				to: new Vector3(),
				target,
				t: 0,
				duration: 0,
				dmg: t.dmg,
				alive: true
			});
			this.world.scene.add(sprite);
		} else if (def.key === "cannon") {
			audio.cannon();
			this.effects.shake(.15, .12);
			const sprite = new Sprite(new SpriteMaterial({
				map: this.texBall,
				transparent: true,
				depthWrite: false
			}));
			sprite.scale.setScalar(.65);
			const to = target.sprite.position.clone();
			this.projectiles.push({
				kind: "ball",
				sprite,
				from,
				to,
				target: null,
				t: 0,
				duration: .55,
				dmg: t.dmg,
				splash: def.splash,
				alive: true
			});
			this.world.scene.add(sprite);
		} else {
			audio.frost();
			const sprite = new Sprite(new SpriteMaterial({
				map: this.texSnow,
				transparent: true,
				depthWrite: false
			}));
			sprite.scale.setScalar(.9);
			this.projectiles.push({
				kind: "frost",
				sprite,
				from,
				to: new Vector3(),
				target,
				t: 0,
				duration: 0,
				dmg: t.dmg,
				slow: def.slow,
				alive: true
			});
			this.world.scene.add(sprite);
		}
		t.sprite.scale.x *= .85;
	}
	updateProjectiles(dt) {
		for (const p of this.projectiles) {
			if (!p.alive) continue;
			if (p.kind === "ball") {
				p.t += dt / p.duration;
				if (p.t >= 1) {
					this.landCannonball(p);
					continue;
				}
				const pos = p.from.clone().lerp(p.to, p.t);
				pos.y += Math.sin(p.t * Math.PI) * 4;
				p.sprite.position.copy(pos);
				p.sprite.scale.setScalar(.65 + Math.sin(p.t * Math.PI) * .3);
				continue;
			}
			const target = p.target;
			if (!target || !target.alive) {
				p.alive = false;
				this.world.scene.remove(p.sprite);
				continue;
			}
			const targetPos = target.sprite.position.clone().add(new Vector3(0, target.def.size * .5, 0));
			const dir = new Vector3().subVectors(targetPos, p.sprite.position);
			const dist = dir.length();
			const speed = p.kind === "arrow" ? 20 : 14;
			if (dist < .45) {
				this.hitEnemy(p, target);
				continue;
			}
			dir.normalize();
			p.sprite.position.addScaledVector(dir, Math.min(speed * dt, dist));
			const a = this.worldToScreen(p.sprite.position);
			const b = this.worldToScreen(p.sprite.position.clone().add(dir));
			p.sprite.material.rotation = Math.atan2(-(b.y - a.y), b.x - a.x);
			if (p.kind === "frost") p.sprite.material.rotation += this.elapsed * 2;
		}
		this.projectiles = this.projectiles.filter((p) => p.alive);
	}
	landCannonball(p) {
		p.alive = false;
		this.world.scene.remove(p.sprite);
		audio.splash();
		this.effects.shake(.5, .25);
		this.effects.starBurst(p.to, 6);
		const splash = p.splash ?? 2;
		for (const e of this.enemies) {
			if (!e.alive) continue;
			if (e.sprite.position.distanceTo(p.to) <= splash + .4) this.damageEnemy(e, p.dmg, true);
		}
	}
	hitEnemy(p, target) {
		p.alive = false;
		this.world.scene.remove(p.sprite);
		if (p.kind === "frost" && p.slow) {
			target.applySlow(p.slow.factor, p.slow.duration, this.elapsed);
			this.effects.frostPuff(target.sprite.position);
		} else {
			audio.hit();
			this.effects.hitSpark(target.sprite.position.clone().add(new Vector3(0, 1, 0)));
		}
		this.damageEnemy(target, p.dmg, false);
	}
	damageEnemy(e, dmg, isSplash) {
		if (!e.alive) return;
		e.hp -= dmg;
		e.flash = .08;
		e.squash = .8;
		const p = this.worldToScreen(e.sprite.position.clone().add(new Vector3(0, e.def.size + .3, 0)));
		this.effects.damageNumber(p.x, p.y, `${dmg}`, isSplash ? "hit" : "hit");
		if (e.hp <= 0) {
			e.alive = false;
			e.removeFrom(this.world.scene);
			const pos = e.sprite.position.clone();
			const big = e.defKey === "golem";
			this.effects.starBurst(pos, big ? 16 : 7, big);
			this.effects.coinBurst(pos, big ? 6 : 2);
			if (big) this.effects.shake(1.2, .5);
			audio.die();
			audio.coin();
			this.gold += e.def.gold;
			const gp = this.worldToScreen(pos.clone().add(new Vector3(0, 1.5, 0)));
			this.effects.damageNumber(gp.x, gp.y, `+${e.def.gold}`, "gold");
			this.emitStats(true);
		}
	}
	checkWaveEnd() {
		if (this.phase !== "fighting" || this.enemies.length > 0) return;
		this.phase = "idle";
		const bonus = 15 + this.wave * 3;
		this.gold += bonus;
		this.cb.onToast(`¡Oleada superada! +${bonus} oro`);
		if (this.wave === 15 && !this.victory) {
			this.victory = true;
			audio.victory();
		}
		this.emitStats(true);
	}
	gameOver() {
		this.phase = "over";
		audio.gameOver();
		this.emitStats(true);
	}
	worldToScreen(pos) {
		const v = pos.clone().project(this.world.camera);
		const rect = this.world.renderer.domElement.getBoundingClientRect();
		return {
			x: (v.x * .5 + .5) * rect.width,
			y: (-v.y * .5 + .5) * rect.height
		};
	}
	emitStats(force = false) {
		const s = {
			gold: this.gold,
			lives: this.lives,
			wave: this.wave,
			waveInProgress: this.phase === "spawning" || this.phase === "fighting",
			enemiesAlive: this.enemies.length + this.spawnQueue.length,
			gameOver: this.phase === "over",
			victory: this.victory,
			speed: this.speed,
			started: true
		};
		const key = JSON.stringify(s);
		if (force || key !== this.statsCache) {
			this.statsCache = key;
			this.cb.onStats(s);
		}
	}
};
var SPRITE = (k) => `/sprites/${k}.png`;
function App() {
	const containerRef = (0, import_react.useRef)(null);
	const overlayRef = (0, import_react.useRef)(null);
	const engineRef = (0, import_react.useRef)(null);
	const [ready, setReady] = (0, import_react.useState)(false);
	const [started, setStarted] = (0, import_react.useState)(false);
	const [stats, setStats] = (0, import_react.useState)(null);
	const [selectedType, setSelectedType] = (0, import_react.useState)(null);
	const [towerInfo, setTowerInfo] = (0, import_react.useState)(null);
	const [toast, setToast] = (0, import_react.useState)(null);
	const [musicOn, setMusicOn] = (0, import_react.useState)(true);
	const [sfxOn, setSfxOn] = (0, import_react.useState)(true);
	const toastTimer = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const container = containerRef.current;
		const overlay = overlayRef.current;
		const engine = new GameEngine(container, overlay, {
			onStats: (s) => setStats(s),
			onTowerSelected: (t) => {
				setTowerInfo(t);
				if (t) setSelectedType(null);
			},
			onToast: (msg) => {
				setToast(msg);
				if (toastTimer.current) window.clearTimeout(toastTimer.current);
				toastTimer.current = window.setTimeout(() => setToast(null), 2200);
			}
		});
		engineRef.current = engine;
		window.__engine = engine;
		engine.init().then(() => setReady(true)).catch(console.error);
		return () => {
			engine.dispose();
			engineRef.current = null;
		};
	}, []);
	const pickTower = (0, import_react.useCallback)((type) => {
		const next = selectedType === type ? null : type;
		setSelectedType(next);
		setTowerInfo(null);
		engineRef.current?.setSelectedType(next);
	}, [selectedType]);
	const begin = () => {
		audio.init();
		setStarted(true);
		engineRef.current?.startGame();
	};
	const gold = stats?.gold ?? 0;
	const waveInProgress = stats?.waveInProgress ?? false;
	const gameOver = stats?.gameOver ?? false;
	const victory = stats?.victory ?? false;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "game-root",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				ref: containerRef,
				className: "game-canvas"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				ref: overlayRef,
				className: "fx-overlay"
			}),
			!started && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "menu-screen",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "menu-panel",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
							className: "game-title",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "SLIME" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "title-alt",
								children: "SIEGE"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "game-subtitle",
							children: "Defensa de torres del Reino Gelatina"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "menu-chars",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: SPRITE("archer"),
									alt: "Gato Arquero"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: SPRITE("slime"),
									alt: "Slime"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: SPRITE("frost"),
									alt: "Pingüino Mago"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "btn-3d btn-play",
							onClick: begin,
							disabled: !ready,
							children: ready ? "¡JUGAR!" : "Cargando…"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "menu-hint",
							children: "Coloca torres en las parcelas de piedra y detén a los monstruos antes de que lleguen al castillo."
						})
					]
				})
			}),
			started && stats && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "hud-top",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hud-group",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "hud-pill hud-lives",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "hud-icon",
									children: "♥"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: stats.lives })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "hud-pill hud-gold",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "hud-icon",
									children: "●"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: stats.gold })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "hud-pill hud-wave",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "hud-label",
									children: "Oleada"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [stats.wave, stats.wave > 15 ? " ∞" : `/15`] })]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hud-group",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: `btn-3d btn-small ${stats.speed === 2 ? "btn-active" : ""}`,
								onClick: () => engineRef.current?.setSpeed(stats.speed === 2 ? 1 : 2),
								children: stats.speed === 2 ? "▶▶ x2" : "▶ x1"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: `btn-3d btn-small ${musicOn ? "" : "btn-off"}`,
								onClick: () => {
									const v = !musicOn;
									setMusicOn(v);
									audio.setMusic(v);
								},
								"aria-label": "Música",
								children: musicOn ? "♫" : "♪̶"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: `btn-3d btn-small ${sfxOn ? "" : "btn-off"}`,
								onClick: () => {
									const v = !sfxOn;
									setSfxOn(v);
									audio.setSfx(v);
								},
								"aria-label": "Efectos de sonido",
								children: sfxOn ? "🔊" : "🔇"
							})
						]
					})]
				}),
				!waveInProgress && !gameOver && !victory && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "btn-3d btn-wave pulse",
					onClick: () => engineRef.current?.startWave(stats.wave > 0),
					children: stats.wave === 0 ? "¡Empezar Oleada 1!" : `¡Oleada ${stats.wave + 1}!`
				}),
				towerInfo && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "tower-popup",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "tower-popup-head",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: SPRITE(towerInfo.type),
							alt: TOWERS[towerInfo.type].name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: TOWERS[towerInfo.type].name }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "tower-popup-sub",
							children: [
								"Nv. ",
								towerInfo.level,
								" · Daño ",
								towerInfo.dmg,
								" · Rango ",
								towerInfo.range
							]
						})] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "tower-popup-actions",
						children: [towerInfo.upgradeCost !== null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: "btn-3d btn-upgrade",
							disabled: gold < towerInfo.upgradeCost,
							onClick: () => engineRef.current?.upgradeSelected(),
							children: ["⬆ Mejorar · ", towerInfo.upgradeCost]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "max-level",
							children: "¡NIVEL MÁX!"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: "btn-3d btn-sell",
							onClick: () => engineRef.current?.sellSelected(),
							children: ["Vender · +", towerInfo.sellValue]
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "tower-bar",
					children: TOWER_ORDER.map((key) => {
						const def = TOWERS[key];
						const affordable = gold >= def.cost;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: `tower-card ${selectedType === key ? "selected" : ""} ${affordable ? "" : "cant-afford"}`,
							onClick: () => pickTower(key),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: SPRITE(def.key),
								alt: def.name,
								draggable: false
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "tower-card-info",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: def.name }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "tower-desc",
										children: def.desc
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "tower-cost",
										children: ["● ", def.cost]
									})
								]
							})]
						}, key);
					})
				}),
				selectedType && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "hint-bar",
					children: "Toca una parcela de piedra para construir · toca de nuevo la carta para cancelar"
				}),
				toast && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "toast",
					children: toast
				}),
				victory && !gameOver && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "end-screen",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "end-panel victory-panel",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "¡VICTORIA!" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
								"Has defendido el Reino Gelatina durante ",
								15,
								" oleadas."
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								className: "end-img",
								src: SPRITE("golem"),
								alt: "Gólem derrotado"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "end-actions",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "btn-3d btn-play",
									onClick: () => engineRef.current?.continueEndless(),
									children: "Modo Infinito ∞"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "btn-3d btn-secondary",
									onClick: () => engineRef.current?.restart(),
									children: "Jugar de nuevo"
								})]
							})
						]
					})
				}),
				gameOver && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "end-screen",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "end-panel",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "¡EL CASTILLO HA CAÍDO!" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
								"Sobreviviste hasta la oleada ",
								stats.wave,
								"."
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "end-actions",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "btn-3d btn-play",
									onClick: () => engineRef.current?.restart(),
									children: "¡Otra vez!"
								})
							})
						]
					})
				})
			] })
		]
	});
}
var SplitComponent = App;
//#endregion
export { SplitComponent as component };
