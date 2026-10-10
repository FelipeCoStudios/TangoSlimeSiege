// ─────────────────────────────────────────────────────────────
// audio.ts — Música chiptune procedural + SFX sintetizados (Web Audio)
// Sin assets: todo se genera con osciladores y ruido filtrado.
// ─────────────────────────────────────────────────────────────

type OscType = OscillatorType;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private noiseBuf!: AudioBuffer;
  private musicTimer: number | null = null;
  private nextNoteTime = 0;
  private step = 0;
  musicOn = true;
  sfxOn = true;

  /** Debe llamarse desde un gesto de usuario (click/tap). */
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = this.musicOn ? 0.4 : 0;
    this.musicBus.connect(this.master);
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = 0.9;
    this.sfxBus.connect(this.master);
    // buffer de ruido blanco reutilizable
    const len = this.ctx.sampleRate * 1;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.startMusic();
  }

  setMusic(on: boolean) {
    this.musicOn = on;
    if (this.ctx) this.musicBus.gain.setTargetAtTime(on ? 0.4 : 0, this.ctx.currentTime, 0.05);
  }
  setSfx(on: boolean) {
    this.sfxOn = on;
    if (this.ctx) this.sfxBus.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.05);
  }

  // ── Música: secuenciador chiptune alegre ──────────────────
  // Progresión I–V–vi–IV en Do mayor, 132 BPM, 16 pasos por acorde.
  private readonly BPM = 132;
  private readonly CHORDS = [
    [261.63, 329.63, 392.0], // C
    [196.0, 246.94, 392.0], // G
    [220.0, 261.63, 329.63], // Am
    [174.61, 220.0, 349.23], // F
  ];
  // Melodía (semitonos relativos a la raíz del acorde, -1 = silencio)
  private readonly MEL: number[] = [
    0, -1, 7, 12, -1, 7, 4, -1, 0, -1, 7, 12, 16, -1, 12, 7,
    12, -1, 7, 4, -1, 0, 4, -1, 7, -1, 12, -1, 7, 4, 0, -1,
    9, -1, 12, 16, -1, 12, 9, -1, 4, -1, 9, 12, -1, 9, 4, -1,
    12, -1, 16, 19, -1, 16, 12, -1, 7, -1, 12, 16, 19, -1, 24, -1,
  ];

  private startMusic() {
    if (!this.ctx || this.musicTimer !== null) return;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.step = 0;
    const tick = () => {
      if (!this.ctx) return;
      const stepDur = 60 / this.BPM / 4; // semicorcheas
      while (this.nextNoteTime < this.ctx.currentTime + 0.25) {
        this.scheduleStep(this.step, this.nextNoteTime, stepDur);
        this.nextNoteTime += stepDur;
        this.step = (this.step + 1) % 64;
      }
    };
    tick();
    this.musicTimer = window.setInterval(tick, 100);
  }

  private scheduleStep(step: number, t: number, stepDur: number) {
    if (!this.ctx) return;
    const bar = Math.floor(step / 16);
    const chord = this.CHORDS[bar];
    const s16 = step % 16;
    // Bajo: bombo-chiptune en negras (raíz y quinta alternadas)
    if (s16 % 4 === 0) {
      const bassF = chord[0] / 2 * (s16 % 8 === 4 ? 1.5 : 1);
      this.tone('triangle', bassF, t, stepDur * 3.4, 0.5, this.musicBus);
    }
    // "Kick" suave en tiempos fuertes
    if (s16 % 8 === 0) this.kick(t, 0.25, this.musicBus);
    // Hats de ruido en contratiempos
    if (s16 % 2 === 1) this.hat(t, 0.05, this.musicBus);
    // Melodía principal (onda cuadrada con vibrato cartoon)
    const melIdx = step;
    const semi = this.MEL[melIdx];
    if (semi >= 0) {
      const f = chord[0] * 2 * Math.pow(2, semi / 12);
      this.lead(f, t, stepDur * 1.6);
    }
    // Arpegio de acompañamiento cada 4 pasos (pulpo saltarín)
    if (s16 % 4 === 2) {
      const f = chord[(s16 / 4) % 3 | 0] * 2;
      this.tone('square', f, t, stepDur * 1.2, 0.06, this.musicBus);
    }
  }

  private tone(type: OscType, freq: number, t: number, dur: number, vol: number, bus: GainNode, slideTo?: number) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private lead(freq: number, t: number, dur: number) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoG = this.ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(freq, t);
    lfo.type = 'sine';
    lfo.frequency.value = 7;
    lfoG.gain.setValueAtTime(freq * 0.008, t + dur * 0.4);
    lfoG.gain.setValueAtTime(0, t);
    lfoG.gain.linearRampToValueAtTime(freq * 0.01, t + dur * 0.5);
    lfo.connect(lfoG).connect(o.frequency);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.11, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.musicBus);
    o.start(t);
    lfo.start(t);
    o.stop(t + dur + 0.05);
    lfo.stop(t + dur + 0.05);
  }

  private kick(t: number, vol: number, bus: GainNode) {
    this.tone('sine', 150, t, 0.12, vol, bus, 40);
  }

  private hat(t: number, vol: number, bus: GainNode) {
    if (!this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    src.connect(f).connect(g).connect(bus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + 0.06);
  }

  private noiseBurst(t: number, dur: number, vol: number, filterFreq: number, type: BiquadFilterType = 'lowpass') {
    if (!this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.sfxBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  // ── SFX ────────────────────────────────────────────────────
  private now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  shoot() {
    if (!this.ctx || !this.sfxOn) return;
    const t = this.now();
    this.tone('square', 900 + Math.random() * 200, t, 0.09, 0.12, this.sfxBus, 300);
  }
  cannon() {
    if (!this.ctx || !this.sfxOn) return;
    const t = this.now();
    this.noiseBurst(t, 0.3, 0.35, 500);
    this.tone('sine', 120, t, 0.25, 0.3, this.sfxBus, 35);
  }
  frost() {
    if (!this.ctx || !this.sfxOn) return;
    const t = this.now();
    this.tone('sine', 1800, t, 0.15, 0.08, this.sfxBus, 2400);
    this.tone('sine', 2400, t + 0.05, 0.12, 0.06, this.sfxBus, 3000);
  }
  hit() {
    if (!this.ctx || !this.sfxOn) return;
    this.noiseBurst(this.now(), 0.06, 0.15, 2500, 'bandpass');
  }
  splash() {
    if (!this.ctx || !this.sfxOn) return;
    const t = this.now();
    this.noiseBurst(t, 0.2, 0.3, 900);
    this.tone('sine', 200, t, 0.18, 0.2, this.sfxBus, 60);
  }
  coin() {
    if (!this.ctx || !this.sfxOn) return;
    const t = this.now();
    this.tone('sine', 988, t, 0.07, 0.14, this.sfxBus);
    this.tone('sine', 1319, t + 0.07, 0.15, 0.14, this.sfxBus);
  }
  die() {
    if (!this.ctx || !this.sfxOn) return;
    const t = this.now();
    this.tone('square', 500, t, 0.2, 0.12, this.sfxBus, 90);
    this.noiseBurst(t, 0.12, 0.12, 1800);
  }
  place() {
    if (!this.ctx || !this.sfxOn) return;
    const t = this.now();
    this.tone('sine', 300, t, 0.15, 0.3, this.sfxBus, 80);
    this.noiseBurst(t + 0.02, 0.08, 0.15, 1200);
  }
  upgrade() {
    if (!this.ctx || !this.sfxOn) return;
    const t = this.now();
    [523, 659, 784, 1047].forEach((f, i) => this.tone('square', f, t + i * 0.07, 0.12, 0.1, this.sfxBus));
  }
  sell() {
    if (!this.ctx || !this.sfxOn) return;
    const t = this.now();
    [784, 659, 523].forEach((f, i) => this.tone('square', f, t + i * 0.06, 0.1, 0.1, this.sfxBus));
  }
  leak() {
    if (!this.ctx || !this.sfxOn) return;
    const t = this.now();
    this.tone('sawtooth', 300, t, 0.35, 0.18, this.sfxBus, 90);
    this.tone('sawtooth', 150, t + 0.1, 0.4, 0.15, this.sfxBus, 60);
  }
  waveHorn() {
    if (!this.ctx || !this.sfxOn) return;
    const t = this.now();
    [392, 392, 523].forEach((f, i) => {
      this.tone('square', f, t + i * 0.14, 0.16, 0.14, this.sfxBus);
      this.tone('square', f / 2, t + i * 0.14, 0.16, 0.1, this.sfxBus);
    });
  }
  error() {
    if (!this.ctx || !this.sfxOn) return;
    this.tone('square', 180, this.now(), 0.15, 0.14, this.sfxBus, 120);
  }
  victory() {
    if (!this.ctx || !this.sfxOn) return;
    const t = this.now();
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) =>
      this.tone('square', f, t + i * 0.13, 0.22, 0.13, this.sfxBus),
    );
  }
  gameOver() {
    if (!this.ctx || !this.sfxOn) return;
    const t = this.now();
    [392, 370, 349, 311].forEach((f, i) => this.tone('sawtooth', f, t + i * 0.3, 0.34, 0.15, this.sfxBus));
  }
}

export const audio = new AudioEngine();
