// ─────────────────────────────────────────────────────────────
// textures.ts — Texturas canvas para partículas/proyectiles + carga de sprites
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';

function makeCanvas(size: number) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return { c, ctx: c.getContext('2d')! };
}

function toTexture(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function starTexture(color = '#ffd93b'): THREE.CanvasTexture {
  const { c, ctx } = makeCanvas(128);
  ctx.translate(64, 64);
  ctx.beginPath();
  const spikes = 5, outer = 56, inner = 24;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i * Math.PI) / spikes - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.strokeStyle = '#3a2409';
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.fill();
  // brillo
  ctx.beginPath();
  ctx.arc(-12, -14, 10, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fill();
  return toTexture(c);
}

export function circleTexture(color = '#ffffff', soft = false): THREE.CanvasTexture {
  const { c, ctx } = makeCanvas(64);
  if (soft) {
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = color;
  }
  ctx.beginPath();
  ctx.arc(32, 32, 28, 0, Math.PI * 2);
  ctx.fill();
  return toTexture(c);
}

export function coinTexture(): THREE.CanvasTexture {
  const { c, ctx } = makeCanvas(96);
  ctx.translate(48, 48);
  ctx.beginPath();
  ctx.arc(0, 0, 40, 0, Math.PI * 2);
  ctx.fillStyle = '#ffcf3d';
  ctx.strokeStyle = '#8a5a00';
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.fillStyle = '#ffe27a';
  ctx.fill();
  ctx.fillStyle = '#8a5a00';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', 0, 2);
  return toTexture(c);
}

export function emojiTexture(emoji: string): THREE.CanvasTexture {
  const { c, ctx } = makeCanvas(128);
  ctx.clearRect(0, 0, 128, 128);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '100px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  ctx.shadowColor = 'rgba(25, 20, 12, 0.28)';
  ctx.shadowBlur = 8;
  ctx.fillText(emoji, 64, 66);
  return toTexture(c);
}

export function arrowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 32;
  const ctx = c.getContext('2d')!;
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#5b3a1e';
  // astil
  ctx.beginPath();
  ctx.moveTo(18, 16);
  ctx.lineTo(104, 16);
  ctx.stroke();
  // punta
  ctx.beginPath();
  ctx.moveTo(104, 6);
  ctx.lineTo(124, 16);
  ctx.lineTo(104, 26);
  ctx.closePath();
  ctx.fillStyle = '#9aa5ad';
  ctx.strokeStyle = '#3a2409';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fill();
  // plumas
  ctx.beginPath();
  ctx.moveTo(16, 16);
  ctx.lineTo(2, 6);
  ctx.lineTo(8, 16);
  ctx.lineTo(2, 26);
  ctx.closePath();
  ctx.fillStyle = '#ff5a5a';
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function snowflakeTexture(): THREE.CanvasTexture {
  const { c, ctx } = makeCanvas(96);
  ctx.translate(48, 48);
  ctx.strokeStyle = '#bfeaff';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.shadowColor = '#4db8ff';
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

// ── Carga de sprites de personajes (PNG generados) ──────────
export type SpriteKey =
  | 'slime' | 'goblin' | 'mushroom' | 'golem'
  | 'archer' | 'cannon' | 'frost'
  | 'dog_runner' | 'dog_flower' | 'dog_boxer' | 'dog_bard' | 'dog_mage' | 'boxer_portrait'
  | 'dog_bubble' | 'dog_cyborg' | 'dog_star' | 'dog_mummy' | 'dog_worker'
  | 'normaldog' | 'sneaker' | 'boxer' | 'sunflower' | 'bard' | 'bubble'
  | 'firemage' | 'crystal' | 'electrician' | 'mecha' | 'mummy'
  | 'tower_boxer' | 'tower_sunflower' | 'tower_bubble' | 'tower_bard';

const SPRITE_FALLBACKS: Partial<Record<SpriteKey, SpriteKey>> = {
  normaldog: 'dog_runner',
  sneaker: 'dog_runner',
  dog_runner: 'normaldog',
  boxer: 'dog_boxer',
  dog_boxer: 'boxer',
  boxer_portrait: 'dog_boxer',
  sunflower: 'dog_flower',
  dog_flower: 'sunflower',
  bard: 'dog_bard',
  dog_bard: 'bard',
  bubble: 'dog_bubble',
  dog_bubble: 'bubble',
  firemage: 'dog_mage',
  dog_mage: 'firemage',
  crystal: 'dog_star',
  dog_star: 'crystal',
  electrician: 'dog_worker',
  dog_worker: 'electrician',
  mecha: 'dog_cyborg',
  dog_cyborg: 'mecha',
  mummy: 'dog_mummy',
  dog_mummy: 'mummy',
  tower_boxer: 'dog_boxer',
  tower_sunflower: 'dog_flower',
  tower_bubble: 'dog_bubble',
  tower_bard: 'dog_bard',
};

function loadTexture(loader: THREE.TextureLoader, url: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
}

function makeMissingSpriteTexture(key: SpriteKey): THREE.CanvasTexture {
  const { c, ctx } = makeCanvas(128);
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = '#253347';
  ctx.beginPath();
  ctx.arc(64, 64, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(key.replace(/_/g, ' ').slice(0, 14), 64, 64, 108);
  return toTexture(c);
}

export async function loadCharacterTextures(): Promise<Record<SpriteKey, THREE.Texture>> {
  const loader = new THREE.TextureLoader();
  const keys: SpriteKey[] = [
    'slime', 'goblin', 'mushroom', 'golem', 'archer', 'cannon', 'frost',
    'dog_runner', 'dog_flower', 'dog_boxer', 'dog_bard', 'dog_mage', 'boxer_portrait',
    'dog_bubble', 'dog_cyborg', 'dog_star', 'dog_mummy', 'dog_worker',
    'normaldog', 'sneaker', 'boxer', 'sunflower', 'bard', 'bubble',
    'firemage', 'crystal', 'electrician', 'mecha', 'mummy',
    'tower_boxer', 'tower_sunflower', 'tower_bubble', 'tower_bard',
  ];

  // Las cuatro torres problemáticas usan ilustraciones SVG independientes.
  const spriteFile = (key: SpriteKey) => key.startsWith('tower_') ? `${key}.svg` : key === 'boxer_portrait' ? 'boxer_portrait.webp' : `${key}.png`;

  // Una imagen defectuosa no debe bloquear el resto del juego.
  const entries = await Promise.all(keys.map(async (key): Promise<[SpriteKey, THREE.Texture]> => {
    const fallback = SPRITE_FALLBACKS[key] ?? 'dog_runner';
    const urls = [...new Set([
      `${import.meta.env.BASE_URL}sprites/${spriteFile(key)}`,
      `/sprites/${spriteFile(key)}`,
      `${import.meta.env.BASE_URL}sprites/${spriteFile(fallback)}`,
      `/sprites/${spriteFile(fallback)}`,
    ])];

    for (const url of urls) {
      try {
        const texture = await loadTexture(loader, url);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        return [key, texture];
      } catch {
        // Prueba la ruta alternativa o la imagen equivalente.
      }
    }

    console.warn(`No se pudo cargar el sprite "${key}"; se usa una textura de reserva.`);
    return [key, makeMissingSpriteTexture(key)];
  }));

  return Object.fromEntries(entries) as Record<SpriteKey, THREE.Texture>;
}
