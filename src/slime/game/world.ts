// ─────────────────────────────────────────────────────────────
// world.ts — Escenario 3D: terreno, camino, decorado, castillo,
// portal y parcelas de construcción.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';

export const WORLD_W = 52;
export const WORLD_H = 34;

/** Camino en zig-zag (x, z). El castillo está en el último punto. */
export const PATH_POINTS: [number, number][] = [
  [-26, -10],
  [-15, -10],
  [-15, 7],
  [-3, 7],
  [-3, -7],
  [10, -7],
  [10, 8],
  [19, 8],
  [23, 8],
];

export const PATH_WIDTH = 3.4;

/** Parcelas de construcción (x, z). */
export const PADS: [number, number][] = [
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
  [17, 13.5],
];

const C = {
  grass: 0x6fca4f,
  grassDark: 0x57b03c,
  dirt: 0xd9a05b,
  dirtEdge: 0xb07a3e,
  trunk: 0x8a5a2b,
  leaf: 0x3e9e3e,
  leaf2: 0x2f7f2f,
  rock: 0x9aa3ab,
  stone: 0xcfc8bb,
  castleWall: 0xe8e2d4,
  castleRoof: 0xe2574c,
  sky: 0x8fd6ff,
};

export interface WorldRefs {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  portal: THREE.Group;
  portalDisc: THREE.Mesh;
  castle: THREE.Group;
  clouds: THREE.Group[];
  pads: PadMesh[];
  /** Puntos del camino como Vector3 para la lógica de movimiento */
  path: THREE.Vector3[];
  pathLength: number;
  /** Distancia acumulada por punto */
  pathCumulative: number[];
}

export interface PadMesh {
  position: THREE.Vector3;
  mesh: THREE.Mesh;
  ring: THREE.Mesh;
  occupied: boolean;
  index: number;
}

function lambert(color: number) {
  return new THREE.MeshLambertMaterial({ color });
}

function buildPathRibbon(pts: THREE.Vector3[], width: number, y: number, mat: THREE.Material) {
  const group = new THREE.Group();
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = a.distanceTo(b);
    const geo = new THREE.PlaneGeometry(len + width, width);
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    const ang = Math.atan2(b.z - a.z, b.x - a.x);
    m.rotation.z = -ang;
    m.position.set((a.x + b.x) / 2, y, (a.z + b.z) / 2);
    m.receiveShadow = true;
    group.add(m);
  }
  // juntas circulares en las esquinas
  for (let i = 1; i < pts.length - 1; i++) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(width / 2, 24), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(pts[i].x, y, pts[i].z);
    m.receiveShadow = true;
    group.add(m);
  }
  return group;
}

function makeTree(scale = 1): THREE.Group {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 1.4, 7), lambert(C.trunk));
  trunk.position.y = 0.7;
  trunk.castShadow = true;
  const l1 = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.2, 8), lambert(C.leaf));
  l1.position.y = 2.2;
  l1.castShadow = true;
  const l2 = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.8, 8), lambert(C.leaf2));
  l2.position.y = 3.4;
  l2.castShadow = true;
  const l3 = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.3, 8), lambert(C.leaf));
  l3.position.y = 4.4;
  l3.castShadow = true;
  g.add(trunk, l1, l2, l3);
  g.scale.setScalar(scale);
  return g;
}

function makeRock(scale = 1): THREE.Mesh {
  const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8, 0), lambert(C.rock));
  r.scale.set(scale, scale * 0.7, scale);
  r.castShadow = true;
  r.rotation.y = Math.random() * Math.PI;
  return r;
}

function makeFlower(color: number): THREE.Group {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 5), lambert(0x3e9e3e));
  stem.position.y = 0.25;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), lambert(color));
  head.position.y = 0.55;
  g.add(stem, head);
  return g;
}

function makeCloud(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const blobs = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < blobs; i++) {
    const s = 0.9 + Math.random() * 1.1;
    const b = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 10), mat);
    b.position.set(i * 1.3 - blobs * 0.6, Math.random() * 0.5, Math.random() * 0.8);
    b.scale.y = 0.7;
    g.add(b);
  }
  return g;
}

function makeCastle(): THREE.Group {
  const g = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(5.5, 4.2, 3.6), lambert(C.castleWall));
  wall.position.y = 2.1;
  wall.castShadow = true;
  g.add(wall);
  // almenas
  for (let i = -2; i <= 2; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), lambert(C.castleWall));
    m.position.set(i * 1.1, 4.5, -1.4);
    g.add(m);
    const m2 = m.clone();
    m2.position.z = 1.4;
    g.add(m2);
  }
  // torres con tejado
  for (const sx of [-2.9, 2.9]) {
    for (const sz of [-1.9, 1.9]) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.05, 5.6, 10), lambert(C.castleWall));
      t.position.set(sx, 2.8, sz);
      t.castShadow = true;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.25, 1.8, 10), lambert(C.castleRoof));
      roof.position.set(sx, 6.4, sz);
      roof.castShadow = true;
      g.add(t, roof);
    }
  }
  // puerta
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.3), lambert(0x6b4226));
  door.position.set(0, 1.2, 1.85);
  g.add(door);
  // bandera
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6), lambert(0x6b4226));
  pole.position.set(0, 5.2, 0);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.7), new THREE.MeshLambertMaterial({ color: 0xe2574c, side: THREE.DoubleSide }));
  flag.position.set(0.62, 5.9, 0);
  g.add(pole, flag);
  g.userData.flag = flag;
  return g;
}

function makePortal(): { group: THREE.Group; disc: THREE.Mesh } {
  const g = new THREE.Group();
  const torus = new THREE.Mesh(
    new THREE.TorusGeometry(1.7, 0.32, 10, 24),
    new THREE.MeshLambertMaterial({ color: 0x6a3fb5 }),
  );
  torus.position.y = 2.1;
  torus.castShadow = true;
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.45, 24),
    new THREE.MeshBasicMaterial({ color: 0xb16bff, transparent: true, opacity: 0.85 }),
  );
  disc.position.y = 2.1;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.6, 0.5, 12), lambert(C.rock));
  base.position.y = 0.25;
  g.add(torus, disc, base);
  return { group: g, disc };
}

export function createWorld(container: HTMLElement): WorldRefs {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.sky);
  scene.fog = new THREE.Fog(C.sky, 55, 110);

  const camera = new THREE.PerspectiveCamera(47, 1, 0.1, 200);
  camera.position.set(0, 31, 28);
  camera.lookAt(2.5, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // luces
  const hemi = new THREE.HemisphereLight(0xbfe8ff, 0x5da345, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3d6, 1.6);
  sun.position.set(-18, 30, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -35;
  sun.shadow.camera.right = 35;
  sun.shadow.camera.top = 35;
  sun.shadow.camera.bottom = -35;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  // suelo: hierba con colinas suaves en los bordes
  const groundGeo = new THREE.PlaneGeometry(WORLD_W + 30, WORLD_H + 30, 40, 28);
  const pos = groundGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const edge = Math.max(0, Math.abs(x) - WORLD_W / 2) + Math.max(0, Math.abs(y) - WORLD_H / 2);
    const h = edge > 0 ? Math.min(edge * 0.16, 2.4) * (0.7 + 0.5 * Math.sin(x * 0.5) * Math.cos(y * 0.4)) : 0;
    pos.setZ(i, h);
  }
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo, lambert(C.grass));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // camino (doble capa: borde + relleno)
  const path = PATH_POINTS.map(([x, z]) => new THREE.Vector3(x, 0, z));
  scene.add(buildPathRibbon(path, PATH_WIDTH + 0.8, 0.02, lambert(C.dirtEdge)));
  scene.add(buildPathRibbon(path, PATH_WIDTH, 0.04, lambert(C.dirt)));

  // longitudes acumuladas
  const pathCumulative = [0];
  for (let i = 1; i < path.length; i++) {
    pathCumulative.push(pathCumulative[i - 1] + path[i].distanceTo(path[i - 1]));
  }
  const pathLength = pathCumulative[pathCumulative.length - 1];

  // decorado: árboles, rocas, flores (fuera del camino)
  const decor = new THREE.Group();
  const flowerColors = [0xff6b9d, 0xffd93b, 0xff8c42, 0xc86bff, 0xffffff];
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const tooCloseToPath = (x: number, z: number) => {
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      const abx = b.x - a.x, abz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((x - a.x) * abx + (z - a.z) * abz) / (abx * abx + abz * abz)));
      const dx = x - (a.x + abx * t), dz = z - (a.z + abz * t);
      if (Math.hypot(dx, dz) < PATH_WIDTH / 2 + 1.6) return true;
    }
    return false;
  };
  const tooCloseToPads = (x: number, z: number) => PADS.some(([px, pz]) => Math.hypot(x - px, z - pz) < 2.4);
  // mantener despejado el interior del bucle del camino (visibilidad)
  const inLoopInterior = (x: number, z: number) => x > -8 && x < 15 && z > -11 && z < 11;
  for (let i = 0; i < 46; i++) {
    const x = (rand() - 0.5) * (WORLD_W + 16);
    const z = (rand() - 0.5) * (WORLD_H + 12);
    if (tooCloseToPath(x, z) || tooCloseToPads(x, z) || inLoopInterior(x, z)) continue;
    const r = rand();
    if (r < 0.55) {
      const t = makeTree(0.7 + rand() * 0.8);
      t.position.set(x, 0, z);
      t.rotation.y = rand() * Math.PI * 2;
      decor.add(t);
    } else if (r < 0.8) {
      const rock = makeRock(0.5 + rand() * 0.9);
      rock.position.set(x, 0.3, z);
      decor.add(rock);
    } else {
      const f = makeFlower(flowerColors[Math.floor(rand() * flowerColors.length)]);
      f.position.set(x, 0, z);
      decor.add(f);
    }
  }
  scene.add(decor);

  // nubes
  const clouds: THREE.Group[] = [];
  for (let i = 0; i < 6; i++) {
    const c = makeCloud();
    c.position.set((Math.random() - 0.5) * 90, 14 + Math.random() * 8, -20 + Math.random() * 30);
    c.scale.setScalar(1.2 + Math.random());
    clouds.push(c);
    scene.add(c);
  }

  // castillo y portal
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

  // parcelas de construcción
  const pads: PadMesh[] = PADS.map(([x, z], i) => {
    const geo = new THREE.CylinderGeometry(1.25, 1.4, 0.35, 18);
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0xd8cfae }));
    mesh.position.set(x, 0.17, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    mesh.userData.padIndex = i;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.35, 1.6, 24),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.37, z);
    ring.visible = false;
    scene.add(mesh, ring);
    return { position: new THREE.Vector3(x, 0.35, z), mesh, ring, occupied: false, index: i };
  });

  return { scene, camera, renderer, portal, portalDisc, castle, clouds, pads, path, pathLength, pathCumulative };
}
