// Treasure Hunt in the browser: a third-person 3D maze game built on three.js.
// maze.js holds the maze, the level layout, collision and line of sight (pure functions,
// unit-tested in Node); this file is the rendering, input, sentries, sound and screens.
import * as THREE from './vendor/three.module.min.js';
import { LEVELS, cells, centre, collide, generate, isWall, layout, lineOfSight, rayDistance, rng, tileOf } from './maze.js';

// ------------------------------------------------------------------------- tuning
const S = 3;                          // tile size in world units
const WALL_H = 2.6;
const LOOK_Y = 1.1;                   // the camera looks at the explorer's chest height
const LOOK_AHEAD = 2.2;               // ...a little ahead of the explorer
const PLAYER_R = 0.42;
const SPEED = { walk: 5.2, run: 7.6 };
const DASH = { speed: 17, time: 0.2, cooldown: 1.1 };
const MAX_HP = 100;
const HURT_GRACE = 0.8;               // seconds of invulnerability after a hit
const POTION_HEAL = 35;
const ORB = { damage: 15, speed: 9, radius: 0.28, life: 3 };
const SPIKES = { damage: 10, period: 3.4, warn: 0.7, up: 0.8 };
const SIGHT = { range: 12, fov: 1.75, sense: 2.4, charge: 0.75, turn: 4, speed: 2.3 };
const CAUSES = {
  orb: { damage: ORB.damage, short: 'Sentry orb', long: "a sentry's orb" },
  spikes: { damage: SPIKES.damage, short: 'Spike trap', long: 'a spike trap' },
};
const TIPS = [
  'Collect every coin to open the exit. A sentry sees everything in its lit cone, so stay out of it.',
  'Spike traps glow orange before they rise. Wait for them to drop, then cross.',
  'A sentry charges for a moment before it fires. Dash (Space) straight through the orb to dodge it.',
  'Break line of sight at a corner. A sentry that loses you looks around, then goes back to its route.',
  'The heart of the temple: five sentries and six traps stand between you and the treasure.',
];
// each level gets its own stone, moss and light
const THEMES = [
  { stone: '#a08e70', mortar: '#5c4f3c', moss: '#6f8a3c', top: '#5f7c3b', floor: '#a38f6e', grout: '#6b5b45', fog: '#1d2433', sky: '#cad8ff', ground: '#4a3b2a', sun: '#ffdcae' },
  { stone: '#7f8c6b', mortar: '#46503a', moss: '#4f8f3a', top: '#447433', floor: '#838868', grout: '#4d5340', fog: '#162420', sky: '#c4e8cc', ground: '#2f3a25', sun: '#eaf6cc' },
  { stone: '#72848f', mortar: '#3e4b57', moss: '#3f807a', top: '#386470', floor: '#707f88', grout: '#435059', fog: '#121c29', sky: '#b0d8ff', ground: '#233040', sun: '#d4ebff' },
  { stone: '#9a7562', mortar: '#56392f', moss: '#8a6a3a', top: '#735039', floor: '#93735e', grout: '#5a4034', fog: '#231918', sky: '#ffd6b8', ground: '#3b2520', sun: '#ffc590' },
  { stone: '#736587', mortar: '#3b3350', moss: '#5c4b8a', top: '#4c3e6b', floor: '#716584', grout: '#3f3752', fog: '#171328', sky: '#dcd0ff', ground: '#241c36', sun: '#ffd680' },
];

const $ = (id) => document.getElementById(id);
const TEST = new URLSearchParams(location.search).has('test');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const TAU = Math.PI * 2;
const wrap = (a) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
const turnTowards = (a, b, step) => { const d = wrap(b - a); return Math.abs(d) <= step ? a + d : a + Math.sign(d) * step; };
const damp = (rate, dt) => 1 - Math.exp(-rate * dt);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16), to = k < 0 ? 0 : 255, p = Math.abs(k);
  const f = (v) => Math.round(v + (to - v) * p);
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
};

// ------------------------------------------------------------------------- progress
const SAVE_KEY = 'treasure-hunt-progress';
function loadProgress() {
  const fresh = { unlocked: 1, best: {}, muted: false };
  try { return { ...fresh, ...JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') }; } catch { return fresh; }
}
function saveProgress() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(progress)); } catch { /* private browsing: progress lasts for this visit */ }
}
const progress = loadProgress();

// ------------------------------------------------------------------------- renderer and scene
const canvas = $('view');
const stage = $('stage');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (err) {
  $('loading').textContent = 'This game needs WebGL, which is turned off or not available in this browser.';
  throw err;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.5 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = !coarse;
renderer.shadowMap.type = THREE.PCFShadowMap;
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  pause();
  $('loading').hidden = false;
  $('loading').textContent = 'The graphics driver reset. Reload the page to keep playing.';
});

const scene = new THREE.Scene();
scene.background = new THREE.Color();
scene.fog = new THREE.Fog(0x000000, 16, 46);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 1.5);
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;
sun.shadow.radius = 2.5;
Object.assign(sun.shadow.camera, { near: 1, far: 90 });
scene.add(hemi, sun, sun.target);

function followSun(x, z, half) {
  // snap to shadow-map texels so shadow edges do not shimmer as the explorer walks
  const texel = (2 * half) / sun.shadow.mapSize.x;
  x = Math.round(x / texel) * texel;
  z = Math.round(z / texel) * texel;
  sun.position.set(x + 14, 30, z + 9);
  sun.target.position.set(x, 0, z);
  const c = sun.shadow.camera;
  if (c.right !== half) {
    c.left = c.bottom = -half;
    c.right = c.top = half;
    c.updateProjectionMatrix();
  }
}

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w / h < 0.8 ? 68 : 55;   // a narrow portrait screen needs a wider view
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);

// ------------------------------------------------------------------------- textures
function canvasTexture(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}

function speckle(g, n, r, count, dark = 0.14, light = 0.07) {
  for (let i = 0; i < count; i++) {
    g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${r() * dark})` : `rgba(255,255,255,${r() * light})`;
    g.fillRect(r() * n, r() * n, 1 + r() * 2, 1 + r() * 2);
  }
}

function wallTexture(theme, seed) {
  return canvasTexture(256, 256, (g, n) => {
    const r = rng(seed);
    g.fillStyle = theme.mortar;
    g.fillRect(0, 0, n, n);
    const rows = 8, bh = n / rows, bw = n / 4;
    for (let row = 0; row < rows; row++) {
      const off = row % 2 ? bw / 2 : 0, y = row * bh;
      for (let i = -1; i < 4; i++) {
        const x = i * bw + off;
        g.fillStyle = shade(theme.stone, (r() - 0.5) * 0.3);
        g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
        g.fillStyle = 'rgba(255,255,255,0.10)';
        g.fillRect(x + 2, y + 2, bw - 4, 3);
        g.fillStyle = 'rgba(0,0,0,0.22)';
        g.fillRect(x + 2, y + bh - 5, bw - 4, 3);
      }
    }
    speckle(g, n, r, 2500);
    for (let i = 0; i < 70; i++) {   // moss creeping up from the floor
      g.fillStyle = rgba(theme.moss, 0.2 + r() * 0.35);
      g.beginPath();
      g.arc(r() * n, n - r() * r() * n * 0.5, 2 + r() * 9, 0, TAU);
      g.fill();
    }
  });
}

function floorTexture(theme, seed) {
  return canvasTexture(256, 256, (g, n) => {
    const r = rng(seed + 1), h = n / 2;
    g.fillStyle = theme.grout;
    g.fillRect(0, 0, n, n);
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < 2; i++) {
        const x = i * h, y = j * h, base = (r() - 0.5) * 0.2;
        const grad = g.createLinearGradient(x, y, x + h, y + h);
        grad.addColorStop(0, shade(theme.floor, base + 0.06));
        grad.addColorStop(1, shade(theme.floor, base - 0.08));
        g.fillStyle = grad;
        g.fillRect(x + 3, y + 3, h - 6, h - 6);
        if (r() < 0.6) {   // a crack
          g.strokeStyle = 'rgba(0,0,0,0.25)';
          g.lineWidth = 1.2;
          g.beginPath();
          let cx = x + 12 + r() * (h - 24), cy = y + 12 + r() * (h - 24);
          g.moveTo(cx, cy);
          for (let k = 0; k < 4; k++) {
            cx = clamp(cx + (r() - 0.5) * 36, x + 4, x + h - 4);
            cy = clamp(cy + (r() - 0.5) * 36, y + 4, y + h - 4);
            g.lineTo(cx, cy);
          }
          g.stroke();
        }
      }
    }
    speckle(g, n, r, 3000, 0.14, 0.06);
  });
}

function topTexture(theme, seed) {
  return canvasTexture(128, 128, (g, n) => {
    const r = rng(seed + 2);
    g.fillStyle = shade(theme.stone, -0.38);
    g.fillRect(0, 0, n, n);
    speckle(g, n, r, 1400, 0.18, 0.05);
    for (let i = 0; i < 260; i++) {   // tufts of moss, in clumps
      const cx = r() * n, cy = r() * n;
      g.fillStyle = rgba(theme.top, 0.25 + r() * 0.35);
      for (let k = 0; k < 4; k++) g.fillRect(cx + (r() - 0.5) * 8, cy + (r() - 0.5) * 8, 1 + r() * 2, 1 + r() * 2);
    }
    g.strokeStyle = 'rgba(0,0,0,0.25)';   // a dark rim, so the tops read as blocks
    g.lineWidth = 3;
    g.strokeRect(0, 0, n, n);
  });
}

const glowTex = canvasTexture(64, 64, (g, n) => {
  const grad = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.2, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.12)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, n, n);
});
glowTex.wrapS = glowTex.wrapT = THREE.ClampToEdgeWrapping;

const beamTex = canvasTexture(4, 128, (g, w, h) => {
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.12)');
  grad.addColorStop(1, 'rgba(255,255,255,0.55)');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
});
beamTex.wrapS = beamTex.wrapT = THREE.ClampToEdgeWrapping;

const swirlTex = canvasTexture(256, 256, (g, n) => {
  const c = n / 2;
  const grad = g.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.35, 'rgba(160,240,255,0.6)');
  grad.addColorStop(1, 'rgba(40,160,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, n, n);
  g.strokeStyle = 'rgba(255,255,255,0.55)';
  g.lineWidth = 5;
  for (let arm = 0; arm < 3; arm++) {
    g.beginPath();
    for (let t = 0; t <= 1; t += 0.01) {
      const a = (arm * TAU) / 3 + t * 5, rr = t * c * 0.95;
      g.lineTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr);
    }
    g.stroke();
  }
});
swirlTex.wrapS = swirlTex.wrapT = THREE.ClampToEdgeWrapping;

const markTex = (ch, color) => canvasTexture(64, 64, (g, n) => {
  g.fillStyle = color;
  g.beginPath();
  g.arc(n / 2, n / 2, n / 2 - 3, 0, TAU);
  g.fill();
  g.lineWidth = 4;
  g.strokeStyle = 'rgba(0,0,0,0.6)';
  g.stroke();
  g.fillStyle = '#1a1206';
  g.font = `900 ${Math.round(n * 0.62)}px system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(ch, n / 2, n / 2 + 3);
});
const MARKS = { alert: markTex('!', '#ff5a4a'), search: markTex('?', '#ffd84a') };

// a soft sky for metal and glass to reflect
(function environment() {
  const tex = canvasTexture(256, 128, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#fff3dc');
    grad.addColorStop(0.45, '#9aa6c0');
    grad.addColorStop(0.55, '#4a4036');
    grad.addColorStop(1, '#1a1612');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,230,190,0.9)';
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.arc(20 + i * 42, 30 + (i % 2) * 10, 7, 0, TAU);
      g.fill();
    }
  });
  tex.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromEquirectangular(tex).texture;
  scene.environmentIntensity = 0.4;
  pm.dispose();
  tex.dispose();
})();

// ------------------------------------------------------------------------- shared meshes
const GEO = {
  wall: new THREE.BoxGeometry(S, WALL_H, S),
  coin: new THREE.CylinderGeometry(0.4, 0.4, 0.08, 32).rotateX(Math.PI / 2),
  orb: new THREE.SphereGeometry(ORB.radius, 16, 12),
  plate: new THREE.BoxGeometry(2.4, 0.06, 2.4),
  spike: new THREE.ConeGeometry(0.13, 0.6, 8),
  bulb: new THREE.SphereGeometry(0.28, 20, 14),
  neck: new THREE.CylinderGeometry(0.09, 0.11, 0.22, 12),
  cork: new THREE.CylinderGeometry(0.1, 0.09, 0.1, 12),
  bracket: new THREE.BoxGeometry(0.12, 0.34, 0.3),
  bowl: new THREE.CylinderGeometry(0.17, 0.08, 0.16, 10),
  flame: new THREE.ConeGeometry(0.11, 0.34, 8),
};
const MAT = {
  coin: new THREE.MeshStandardMaterial({ color: '#ffc93c', metalness: 1, roughness: 0.3, emissive: '#7a5200', emissiveIntensity: 0.45 }),
  orb: new THREE.MeshBasicMaterial({ color: '#ffd9c4' }),
  spike: new THREE.MeshStandardMaterial({ color: '#c9ccd6', metalness: 0.9, roughness: 0.3 }),
  potion: new THREE.MeshStandardMaterial({ color: '#ff4f7b', emissive: '#c01848', emissiveIntensity: 0.9, roughness: 0.2 }),
  cork: new THREE.MeshStandardMaterial({ color: '#8a5a2b', roughness: 0.9 }),
  iron: new THREE.MeshStandardMaterial({ color: '#3a3530', metalness: 0.7, roughness: 0.5 }),
  flame: new THREE.MeshBasicMaterial({ color: '#ffb347' }),
};
const SHARED = new Set([...Object.values(GEO), ...Object.values(MAT), glowTex, beamTex, swirlTex, ...Object.values(MARKS)]);
const glowMats = new Map();
function glow(color, size, own = false) {
  let mat = own ? null : glowMats.get(color);
  if (!mat) {
    // additive glows skip the fog, which would otherwise tint them grey
    mat = new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
    if (!own) {
      glowMats.set(color, mat);
      SHARED.add(mat);
    }
  }
  const s = new THREE.Sprite(mat);
  s.scale.setScalar(size);
  return s;
}

function disposeGroup(group) {
  group.traverse((o) => {
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      if (SHARED.has(m)) continue;
      if (m.map && !SHARED.has(m.map)) m.map.dispose();
      m.dispose();
    }
    if (o.isSprite) return;   // sprites share one geometry inside three.js
    if (o.geometry && !SHARED.has(o.geometry)) o.geometry.dispose();
    if (o.isInstancedMesh) o.dispose();
  });
}

// ------------------------------------------------------------------------- particles
const particles = (() => {
  const N = 480;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), vel = new Float32Array(N * 3), base = new Float32Array(N * 3);
  const life = new Float32Array(N), max = new Float32Array(N).fill(1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.3, map: glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  points.frustumCulled = false;
  scene.add(points);
  const c = new THREE.Color();
  let next = 0;
  return {
    burst(x, y, z, color, count, speed = 3, up = 2, time = 0.6) {
      c.set(color);
      for (let k = 0; k < count; k++) {
        const i = next;
        next = (next + 1) % N;
        const a = Math.random() * TAU, s = speed * (0.3 + Math.random() * 0.7);
        pos.set([x, y, z], i * 3);
        vel.set([Math.cos(a) * s, up * (0.3 + Math.random()), Math.sin(a) * s], i * 3);
        base.set([c.r, c.g, c.b], i * 3);
        life[i] = max[i] = time * (0.6 + Math.random() * 0.6);
      }
    },
    update(dt) {
      for (let i = 0; i < N; i++) {
        if (life[i] <= 0) continue;
        life[i] -= dt;
        vel[i * 3 + 1] -= 6 * dt;
        for (let k = 0; k < 3; k++) pos[i * 3 + k] += vel[i * 3 + k] * dt;
        const f = Math.max(0, life[i] / max[i]);   // additive blending: darker is fainter
        for (let k = 0; k < 3; k++) col[i * 3 + k] = base[i * 3 + k] * f;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
})();

// ------------------------------------------------------------------------- models
function makeExplorer() {
  const group = new THREE.Group();
  // each part has a twin drawn only where something stands in front of the explorer,
  // so the explorer shows through walls as a blue silhouette instead of disappearing
  const xray = new THREE.MeshBasicMaterial({ color: '#8fd8ff', depthFunc: THREE.GreaterDepth, depthWrite: false, fog: false });
  const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.75 });
  const M = { skin: mat('#e7b48b'), shirt: mat('#d8b878'), trousers: mat('#4f4538'), hat: mat('#70472a'), band: mat('#2c2119'), boots: mat('#35291f'), bag: mat('#8a6438'), eye: mat('#1c1c1c') };
  const part = (parent, geo, material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.renderOrder = 2;
    const ghost = new THREE.Mesh(geo, xray);
    ghost.renderOrder = 1;
    mesh.add(ghost);
    parent.add(mesh);
    return mesh;
  };
  const body = new THREE.Group();
  group.add(body);
  part(body, new THREE.CapsuleGeometry(0.27, 0.42, 4, 12), M.shirt, 0, 1.08, 0);
  part(body, new THREE.BoxGeometry(0.56, 0.08, 0.36), M.band, 0, 0.84, 0);           // belt
  part(body, new THREE.SphereGeometry(0.21, 20, 14), M.skin, 0, 1.6, 0);             // head
  part(body, new THREE.SphereGeometry(0.035, 8, 6), M.eye, -0.075, 1.63, 0.19);
  part(body, new THREE.SphereGeometry(0.035, 8, 6), M.eye, 0.075, 1.63, 0.19);
  part(body, new THREE.CylinderGeometry(0.4, 0.4, 0.035, 28), M.hat, 0, 1.73, 0);     // brim
  part(body, new THREE.CylinderGeometry(0.19, 0.23, 0.2, 20), M.hat, 0, 1.84, 0);     // crown
  part(body, new THREE.CylinderGeometry(0.235, 0.235, 0.05, 20), M.band, 0, 1.765, 0);
  part(body, new THREE.BoxGeometry(0.4, 0.46, 0.2), M.bag, 0, 1.12, -0.3);            // backpack
  const limb = (x, y, r, len, material, end) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    body.add(pivot);
    part(pivot, new THREE.CapsuleGeometry(r, len, 4, 10), material, 0, -(len / 2 + r * 0.5), 0);
    end(pivot, -(len + r * 1.4));
    return pivot;
  };
  const foot = (pivot, y) => part(pivot, new THREE.BoxGeometry(0.17, 0.1, 0.28), M.boots, 0, y, 0.05);
  const hand = (pivot, y) => part(pivot, new THREE.SphereGeometry(0.075, 10, 8), M.skin, 0, y, 0);
  const legs = [limb(-0.13, 0.66, 0.1, 0.46, M.trousers, foot), limb(0.13, 0.66, 0.1, 0.46, M.trousers, foot)];
  const arms = [limb(-0.37, 1.34, 0.075, 0.4, M.shirt, hand), limb(0.37, 1.34, 0.075, 0.4, M.shirt, hand)];
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.02;
  blob.visible = !renderer.shadowMap.enabled;   // a soft blob where there are no real shadows
  group.add(blob);
  group.scale.setScalar(1.15);
  scene.add(group);
  return { group, body, legs, arms, walk: 0 };
}

function makeSentry() {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const stone = new THREE.MeshStandardMaterial({ color: '#6a6380', roughness: 0.6, metalness: 0.1, flatShading: true });
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#ffd28a', emissive: '#ff9a1f', emissiveIntensity: 2.2 });
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), stone);
  head.scale.set(1, 0.95, 1.05);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), eyeMat);
  eye.position.set(0, 0.04, 0.44);
  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.14), stone);
  brow.position.set(0, 0.21, 0.4);
  brow.rotation.x = 0.35;
  const horn = new THREE.ConeGeometry(0.09, 0.36, 6);
  const hornL = new THREE.Mesh(horn, stone);
  hornL.position.set(-0.3, 0.42, 0);
  hornL.rotation.z = 0.5;
  const hornR = new THREE.Mesh(horn, stone);
  hornR.position.set(0.3, 0.42, 0);
  hornR.rotation.z = -0.5;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.045, 8, 40), new THREE.MeshStandardMaterial({ color: '#b3a7ff', emissive: '#6a5cff', emissiveIntensity: 1.2 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.42;
  const eyeGlow = glow('#ff9a1f', 1.3, true);
  eyeGlow.position.copy(eye.position);
  body.add(head, eye, brow, hornL, hornR, ring, eyeGlow);
  body.position.y = 1.35;
  body.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const mark = new THREE.Sprite(new THREE.SpriteMaterial({ map: MARKS.alert, depthTest: false, transparent: true }));
  mark.position.y = 2.4;
  mark.scale.setScalar(0.75);
  mark.renderOrder = 6;
  mark.visible = false;
  group.add(mark);
  return { group, body, eye, eyeMat, eyeGlow, ring, mark };
}

// the part of the floor a sentry can see: its cone ahead, a small circle behind, cut off by walls
const CONE = { front: 24, back: 10 };
function makeCone() {
  const rim = CONE.front + CONE.back + 1;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((rim + 1) * 3), 3));
  const index = [];
  for (let i = 1; i < rim; i++) index.push(0, i, i + 1);
  geo.setIndex(index);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
  mesh.position.y = 0.1;
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  return mesh;
}
function updateCone(s, grid) {
  const attr = s.cone.geometry.attributes.position, a = attr.array;
  a[0] = s.x;
  a[2] = s.z;
  let i = 1;
  const ray = (angle, reach) => {
    const dx = Math.sin(angle), dz = Math.cos(angle), d = rayDistance(grid, S, s.x, s.z, dx, dz, reach);
    a[i * 3] = s.x + dx * d;
    a[i * 3 + 2] = s.z + dz * d;
    i++;
  };
  const half = SIGHT.fov / 2;
  for (let k = 0; k <= CONE.front; k++) ray(s.facing - half + (k / CONE.front) * SIGHT.fov, SIGHT.range);
  for (let k = 1; k <= CONE.back; k++) ray(s.facing + half + (k / CONE.back) * (TAU - SIGHT.fov), SIGHT.sense);
  attr.needsUpdate = true;
}

function makePotion() {
  const g = new THREE.Group();
  const bulb = new THREE.Mesh(GEO.bulb, MAT.potion);
  const neck = new THREE.Mesh(GEO.neck, MAT.potion);
  neck.position.y = 0.3;
  const cork = new THREE.Mesh(GEO.cork, MAT.cork);
  cork.position.y = 0.45;
  bulb.castShadow = true;
  g.add(bulb, neck, cork, glow('#ff4f7b', 1.5));
  return g;
}

function makeTorch() {
  const g = new THREE.Group();
  const bracket = new THREE.Mesh(GEO.bracket, MAT.iron);
  bracket.position.z = 0.08;
  const bowl = new THREE.Mesh(GEO.bowl, MAT.iron);
  bowl.position.set(0, 0.2, 0.22);
  const flame = new THREE.Mesh(GEO.flame, MAT.flame);
  flame.position.set(0, 0.42, 0.22);
  const halo = glow('#ff9a3c', 1.7);
  halo.position.copy(flame.position);
  g.add(bracket, bowl, flame, halo);
  return { group: g, flame, halo, phase: Math.random() * 10 };
}

function makeExit(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const dais = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.4, 0.22, 40), new THREE.MeshStandardMaterial({ color: '#8d8a84', roughness: 0.8 }));
  dais.position.y = 0.11;
  dais.castShadow = dais.receiveShadow = true;
  const runeMat = new THREE.MeshStandardMaterial({ color: '#40181c', emissive: '#c0283a', emissiveIntensity: 0.9 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.06, 8, 48), runeMat);
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.23;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.0, 48), new THREE.MeshBasicMaterial({ map: swirlTex, color: '#7fe8ff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.25;
  disc.visible = false;
  const crystalMat = new THREE.MeshStandardMaterial({ color: '#ff6b6b', emissive: '#b3122e', emissiveIntensity: 1.2, roughness: 0.2, metalness: 0.2, flatShading: true });
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 0), crystalMat);
  crystal.position.y = 1.6;
  crystal.castShadow = true;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 16, 24, 1, true), new THREE.MeshBasicMaterial({ map: beamTex, color: '#6fe3ff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  beam.position.y = 8;
  beam.visible = false;
  const light = new THREE.PointLight('#6fe3ff', 0, 12, 1.6);
  light.position.y = 1.6;
  g.add(dais, rim, disc, crystal, beam, light);
  return { group: g, x, z, disc, crystal, crystalMat, runeMat, beam, light };
}

// ------------------------------------------------------------------------- sound (synthesised, no files)
const sound = {
  ctx: null, out: null, noiseBuf: null,
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.out = this.ctx.createGain();
      this.out.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, len);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    this.out.gain.value = progress.muted ? 0 : 0.45;
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  tone(freq, dur, { type = 'sine', vol = 0.2, to = 0, at = 0 } = {}) {
    const c = this.ctx, t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + dur + 0.05);
  },
  noise(dur, { vol = 0.2, freq = 1000, q = 0.8, at = 0 } = {}) {
    const c = this.ctx, t = c.currentTime + at;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.out);
    src.start(t);
    src.stop(t + dur + 0.05);
  },
  play(name, dist = 0) {
    if (!this.ctx || progress.muted) return;
    const v = 1 - dist / 22;   // quieter with distance
    if (v <= 0.02) return;
    const seq = (notes, step, opts) => notes.forEach((f, i) => this.tone(f, opts.dur, { ...opts, at: i * step }));
    switch (name) {
      case 'coin': this.tone(988, 0.09, { type: 'square', vol: 0.07 }); this.tone(1480, 0.16, { type: 'square', vol: 0.07, at: 0.07 }); break;
      case 'open': seq([523, 659, 784, 1047], 0.1, { type: 'triangle', vol: 0.18, dur: 0.3 }); break;
      case 'hurt': this.noise(0.2, { vol: 0.35, freq: 700 }); this.tone(180, 0.28, { type: 'sawtooth', vol: 0.12, to: 70 }); break;
      case 'spikes': this.noise(0.12, { vol: 0.25 * v, freq: 3200, q: 2 }); break;
      case 'click': this.tone(1400, 0.04, { type: 'square', vol: 0.05 * v }); break;
      case 'fire': this.tone(720, 0.3, { type: 'sawtooth', vol: 0.09 * v, to: 180 }); break;
      case 'charge': this.tone(260, SIGHT.charge, { vol: 0.12 * v, to: 900 }); break;
      case 'alert': this.tone(880, 0.09, { type: 'square', vol: 0.07 * v }); this.tone(660, 0.12, { type: 'square', vol: 0.07 * v, at: 0.1 }); break;
      case 'dash': this.noise(0.22, { vol: 0.18, freq: 1800, q: 0.6 }); break;
      case 'dodge': this.tone(1200, 0.14, { vol: 0.1, to: 1900 }); break;
      case 'potion': seq([520, 700, 900], 0.06, { vol: 0.12, dur: 0.12 }); break;
      case 'win': seq([523, 659, 784, 1047, 1319], 0.12, { type: 'triangle', vol: 0.18, dur: 0.36 }); break;
      case 'lose': seq([440, 370, 311, 220], 0.16, { type: 'triangle', vol: 0.18, dur: 0.4 }); break;
      case 'ui': this.tone(660, 0.05, { type: 'triangle', vol: 0.08 }); break;
      default: break;
    }
  },
};
function setMuted(muted) {
  progress.muted = muted;
  saveProgress();
  if (sound.out) sound.out.gain.value = muted ? 0 : 0.45;
  const b = $('btnSound');
  b.textContent = muted ? 'Sound off' : 'Sound on';
  b.setAttribute('aria-pressed', String(!muted));
}

// ------------------------------------------------------------------------- state
const state = { mode: 'loading' };   // loading | menu | play | paused | won | lost
const hero = makeExplorer();
const player = { x: 0, z: 0, vx: 0, vz: 0, facing: 0, hp: MAX_HP, dashT: 0, dashCd: 0, dashX: 0, dashZ: 1, hurtT: 0, dodged: null };
const cam = { yaw: 0, yawTarget: 0, pitch: 1.05, dist: 10.5, distTarget: 10.5, shake: 0, orbit: 0 };
const PITCH = { min: 0.62, max: 1.38 };
const events = [];   // everything the player was told, for the test hook
let level = null;
let peaceful = false;   // test hook: sentries ignore the explorer

function buildLevel(index) {
  if (level) {
    scene.remove(level.group);
    disposeGroup(level.group);
  }
  const def = LEVELS[index], theme = THEMES[index % THEMES.length];
  const grid = generate(def.cells, def.cells, rng(def.seed));
  const plan = layout(grid, def, rng(def.seed * 7919 + 1));
  const w = grid[0].length, h = grid.length;
  const group = new THREE.Group();

  scene.background.set(theme.fog);
  scene.fog.color.set(theme.fog);
  hemi.color.set(theme.sky);
  hemi.groundColor.set(theme.ground);
  sun.color.set(theme.sun);

  const floorMap = floorTexture(theme, def.seed);
  floorMap.repeat.set(w, h);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w * S, h * S), new THREE.MeshStandardMaterial({ map: floorMap, roughness: 0.92 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((w * S) / 2, 0, (h * S) / 2);
  floor.receiveShadow = true;
  group.add(floor);

  const blocks = [];
  for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) if (grid[z][x]) blocks.push([x, z]);
  const side = new THREE.MeshStandardMaterial({ map: wallTexture(theme, def.seed), roughness: 0.9 });
  const top = new THREE.MeshStandardMaterial({ map: topTexture(theme, def.seed), roughness: 0.95 });
  const walls = new THREE.InstancedMesh(GEO.wall, [side, side, top, side, side, side], blocks.length);
  const m = new THREE.Matrix4(), tint = new THREE.Color(), r = rng(def.seed + 99);
  blocks.forEach(([x, z], k) => {
    m.makeTranslation((x + 0.5) * S, WALL_H / 2, (z + 0.5) * S);
    walls.setMatrixAt(k, m);
    walls.setColorAt(k, tint.setScalar(0.86 + r() * 0.2));
  });
  walls.castShadow = walls.receiveShadow = true;
  group.add(walls);

  const coins = plan.coins.map(([tx, tz], k) => {
    const [x, z] = centre(S, tx, tz);
    const g = new THREE.Group();
    g.position.set(x, 1, z);
    const coin = new THREE.Mesh(GEO.coin, MAT.coin);
    coin.castShadow = true;
    g.add(coin, glow('#ffcf4a', 1.5));
    group.add(g);
    return { group: g, coin, x, z, taken: false, phase: k * 0.7 };
  });

  const potions = plan.potions.map(([tx, tz], k) => {
    const [x, z] = centre(S, tx, tz);
    const g = makePotion();
    g.position.set(x, 0.8, z);
    group.add(g);
    return { group: g, x, z, taken: false, phase: k * 1.9 };
  });

  const traps = plan.traps.map(([tx, tz], k) => {
    const [x, z] = centre(S, tx, tz);
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const plate = new THREE.Mesh(GEO.plate, new THREE.MeshStandardMaterial({ color: '#55525a', metalness: 0.7, roughness: 0.45, emissive: '#ff6a1a', emissiveIntensity: 0 }));
    plate.position.y = 0.03;
    plate.receiveShadow = true;
    const spikes = new THREE.Group();
    for (let a = -1; a <= 1; a++) {
      for (let b = -1; b <= 1; b++) {
        const spike = new THREE.Mesh(GEO.spike, MAT.spike);
        spike.position.set(a * 0.7, 0.3, b * 0.7);
        spike.castShadow = true;
        spikes.add(spike);
      }
    }
    spikes.position.y = -0.7;
    g.add(plate, spikes);
    group.add(g);
    return { group: g, plate, spikes, x, z, offset: k * 1.13, phase: 'down', hitCycle: -1 };
  });

  const sentries = plan.guards.map((guard, k) => {
    const model = makeSentry();
    const route = guard.route.map(([tx, tz]) => centre(S, tx, tz));
    const [x, z] = route[0];
    const cone = makeCone();
    group.add(model.group, cone);
    const facing = route.length > 1 ? Math.atan2(route[1][0] - x, route[1][1] - z) : 0;
    return { ...model, cone, route, idx: 0, dir: 1, wait: 0, x, z, facing, state: 'patrol', cooldown: 1, chargeT: 0, lostT: 0, searchT: 0, visible: false, bob: k * 1.3 };
  });

  const torches = [];
  const tr = rng(def.seed + 5);
  const spots = cells(grid).map((c) => [tr(), c]).sort((a, b) => a[0] - b[0]).map(([, c]) => c);
  for (const [tx, tz] of spots.slice(0, Math.round(def.cells * 1.4))) {
    const faces = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => isWall(grid, tx + dx, tz + dz));
    if (!faces.length) continue;
    const [dx, dz] = faces[Math.floor(tr() * faces.length)];
    const [cx, cz] = centre(S, tx, tz);
    const t = makeTorch();
    t.group.position.set(cx + dx * (S / 2 - 0.02), 1.55, cz + dz * (S / 2 - 0.02));
    t.group.rotation.y = Math.atan2(-dx, -dz);
    group.add(t.group);
    torches.push(t);
  }

  const exit = makeExit(...centre(S, ...plan.exit));
  group.add(exit.group);
  scene.add(group);

  level = {
    index, def, theme, grid, plan, group, coins, potions, traps, sentries, torches, exit,
    orbs: [], open: false, collected: 0, time: 0, hits: 0, lastCause: 'orb', exitNag: -9, fullNag: -9,
    seen: new Uint8Array(w * h), lastTile: [-1, -1],
  };
  mini.dirty = true;
  resetPlayer();
}

function resetPlayer() {
  const [sx, sz] = level.plan.start;
  [player.x, player.z] = centre(S, sx, sz);
  Object.assign(player, { vx: 0, vz: 0, hp: MAX_HP, dashT: 0, dashCd: 0, hurtT: 0, dodged: null });
  // face down the first open corridor, with the camera behind
  const [dx, dz] = [[1, 0], [0, 1], [-1, 0], [0, -1]].find(([a, b]) => !isWall(level.grid, sx + a, sz + b)) || [0, 1];
  player.facing = Math.atan2(dx, dz);
  cam.yaw = cam.yawTarget = Math.atan2(-dx, -dz);
  cam.pitch = 1.05;
  cam.dist = cam.distTarget = 10.5;
  cam.shake = 0;
  hero.group.position.set(player.x, 0, player.z);
  hero.group.rotation.y = player.facing;
  hero.group.visible = true;
}

// ------------------------------------------------------------------------- input
const keys = new Set();
const touch = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
const drag = { id: null, x: 0, y: 0 };
const pad = { x: 0, y: 0, prev: [] };
const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight'];

addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (state.mode === 'play' && MOVE_KEYS.includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.repeat) return;
  switch (e.code) {
    case 'KeyP': case 'Escape': togglePause(); break;
    case 'Space': dash(); break;
    case 'KeyQ': turnCamera(1); break;
    case 'KeyE': turnCamera(-1); break;
    case 'KeyM': sound.unlock(); setMuted(!progress.muted); break;
    default: break;
  }
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

function turnCamera(dir) {
  if (state.mode !== 'play') return;
  // snap to the corridors: a quarter turn from the nearest grid direction
  const q = Math.PI / 2;
  cam.yawTarget = Math.round(cam.yawTarget / q) * q + dir * q;
}

function moveInput() {
  let x = pad.x + touch.x, z = pad.y + touch.y;
  if (keys.has('KeyW') || keys.has('ArrowUp')) z += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) z -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
  const len = Math.hypot(x, z);
  return len > 1 ? [x / len, z / len] : [x, z];
}

canvas.addEventListener('pointerdown', (e) => {
  sound.unlock();
  if (state.mode !== 'play') return;
  const rect = stage.getBoundingClientRect();
  if (e.pointerType === 'touch' && touch.id === null && e.clientX - rect.left < rect.width * 0.45) {
    Object.assign(touch, { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 });
    const stick = $('stick');
    stick.style.left = `${e.clientX - rect.left}px`;
    stick.style.top = `${e.clientY - rect.top}px`;
    $('knob').style.transform = '';
    stick.hidden = false;
  } else if (drag.id === null) {
    Object.assign(drag, { id: e.pointerId, x: e.clientX, y: e.clientY });
  } else return;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId === touch.id) {
    const R = 56;
    let dx = e.clientX - touch.ox, dy = e.clientY - touch.oy;
    const d = Math.hypot(dx, dy);
    if (d > R) { dx *= R / d; dy *= R / d; }
    touch.x = dx / R;
    touch.y = -dy / R;
    $('knob').style.transform = `translate(${dx}px, ${dy}px)`;
  } else if (e.pointerId === drag.id) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    const k = e.pointerType === 'touch' ? 0.009 : 0.006;
    cam.yaw -= dx * k;
    cam.yawTarget = cam.yaw;
    cam.pitch = clamp(cam.pitch + dy * k * 0.7, PITCH.min, PITCH.max);
  }
});
function endPointer(e) {
  if (e.pointerId === touch.id) {
    Object.assign(touch, { id: null, x: 0, y: 0 });
    $('stick').hidden = true;
  }
  if (e.pointerId === drag.id) drag.id = null;
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('wheel', (e) => {
  if (state.mode !== 'play') return;
  e.preventDefault();
  cam.distTarget = clamp(cam.distTarget * (1 + Math.sign(e.deltaY) * 0.1), 6, 15);
}, { passive: false });
$('btnDash').addEventListener('pointerdown', (e) => { e.preventDefault(); sound.unlock(); dash(); });

function pollPad(dt) {
  const gp = [...(navigator.getGamepads?.() || [])].find((p) => p && p.connected);
  if (!gp) { pad.x = pad.y = 0; return; }
  const dz = (v) => (Math.abs(v || 0) < 0.18 ? 0 : v);
  const edge = (i) => {
    const now = !!gp.buttons[i]?.pressed, was = pad.prev[i];
    pad.prev[i] = now;
    return now && !was;
  };
  if (edge(9)) togglePause();
  if (state.mode !== 'play') return;
  if (edge(0)) dash();
  if (edge(4)) turnCamera(1);
  if (edge(5)) turnCamera(-1);
  pad.x = dz(gp.axes[0]);
  pad.y = -dz(gp.axes[1]);
  const turn = dz(gp.axes[2]), tilt = dz(gp.axes[3]);
  if (turn) { cam.yaw -= turn * dt * 2.6; cam.yawTarget = cam.yaw; }
  if (tilt) cam.pitch = clamp(cam.pitch + tilt * dt * 1.5, PITCH.min, PITCH.max);
}

// ------------------------------------------------------------------------- the game
function dash() {
  if (state.mode !== 'play' || player.dashCd > 0 || player.dashT > 0) return;
  const [ix, iz] = moveInput();
  let dx = Math.sin(player.facing), dz = Math.cos(player.facing);
  if (ix || iz) {
    dx = Math.cos(cam.yaw) * ix - Math.sin(cam.yaw) * iz;
    dz = -Math.sin(cam.yaw) * ix - Math.cos(cam.yaw) * iz;
  }
  const len = Math.hypot(dx, dz) || 1;
  Object.assign(player, { dashX: dx / len, dashZ: dz / len, dashT: DASH.time, dashCd: DASH.cooldown });
  player.facing = Math.atan2(dx, dz);
  sound.play('dash');
}

function hurt(cause, from) {
  if (state.mode !== 'play' || player.hurtT > 0 || player.dashT > 0) return false;
  const { damage, short } = CAUSES[cause];
  player.hp = Math.max(0, player.hp - damage);
  player.hurtT = HURT_GRACE;
  level.hits++;
  level.lastCause = cause;
  cam.shake = reduceMotion ? 0.06 : 0.35;
  sound.play('hurt');
  const flash = $('hurt');
  flash.classList.add('on');
  requestAnimationFrame(() => requestAnimationFrame(() => flash.classList.remove('on')));
  if (from) pointAt(from.x, from.z);
  toast(`${short} −${damage}`, 'bad');
  if (player.hp <= 0) lose();
  return true;
}

// an arrow round the middle of the screen, pointing at whoever hit you
function pointAt(x, z) {
  const dx = x - player.x, dz = z - player.z;
  const ahead = -dx * Math.sin(cam.yaw) - dz * Math.cos(cam.yaw);
  const right = dx * Math.cos(cam.yaw) - dz * Math.sin(cam.yaw);
  const el = $('hitArrow');
  el.style.setProperty('--a', `${Math.atan2(right, ahead)}rad`);
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}

function update(dt) {
  const L = level;
  L.time += dt;
  updatePlayer(dt);
  // pick-ups
  for (const c of L.coins) {
    if (c.taken || Math.hypot(player.x - c.x, player.z - c.z) > 1.05) continue;
    c.taken = true;
    c.group.visible = false;
    L.collected++;
    particles.burst(c.x, 1, c.z, '#ffd24a', 18, 2.5, 3, 0.7);
    sound.play('coin');
    const pill = $('coinPill');
    pill.classList.remove('bump');
    void pill.offsetWidth;
    pill.classList.add('bump');
    if (L.collected === L.coins.length) openExit();
  }
  for (const p of L.potions) {
    if (p.taken || Math.hypot(player.x - p.x, player.z - p.z) > 1.05) continue;
    if (player.hp >= MAX_HP) {
      if (L.time - L.fullNag > 4) { L.fullNag = L.time; toast('Health is full: save the potion for later'); }
      continue;
    }
    p.taken = true;
    p.group.visible = false;
    const healed = Math.min(POTION_HEAL, MAX_HP - player.hp);
    player.hp += healed;
    particles.burst(p.x, 1, p.z, '#ff6f9a', 16, 2, 3, 0.7);
    sound.play('potion');
    toast(`Potion +${Math.round(healed)}`, 'good');
  }
  const de = Math.hypot(player.x - L.exit.x, player.z - L.exit.z);
  if (de < 1.2) {
    if (L.open) return win();
    if (L.time - L.exitNag > 3) {
      L.exitNag = L.time;
      const left = L.coins.length - L.collected;
      toast(`The exit is sealed: ${left} coin${left === 1 ? '' : 's'} still to find`);
    }
  }
  updateTraps(dt);
  for (const s of L.sentries) updateSentry(s, dt);
  updateOrbs(dt);
  reveal();
  updateHud();
}

function updatePlayer(dt) {
  const [ix, iz] = moveInput();
  const running = keys.has('ShiftLeft') || keys.has('ShiftRight');
  const speed = running ? SPEED.run : SPEED.walk;
  // camera-relative: "up" on the stick or W always walks away from the camera
  const wx = (Math.cos(cam.yaw) * ix - Math.sin(cam.yaw) * iz) * speed;
  const wz = (-Math.sin(cam.yaw) * ix - Math.cos(cam.yaw) * iz) * speed;
  player.dashCd = Math.max(0, player.dashCd - dt);
  player.hurtT = Math.max(0, player.hurtT - dt);
  if (player.dashT > 0) {
    player.dashT -= dt;
    player.vx = player.dashX * DASH.speed;
    player.vz = player.dashZ * DASH.speed;
    particles.burst(player.x, 0.9, player.z, '#8fd3ff', 2, 0.6, 0.5, 0.35);
  } else {
    const k = damp(ix || iz ? 14 : 10, dt);
    player.vx += (wx - player.vx) * k;
    player.vz += (wz - player.vz) * k;
  }
  const x0 = player.x, z0 = player.z;
  // short steps, so a fast dash cannot skip through the corner of a wall
  const steps = Math.max(1, Math.ceil((Math.hypot(player.vx, player.vz) * dt) / 0.2));
  for (let i = 0; i < steps; i++) {
    [player.x, player.z] = collide(level.grid, S, player.x + (player.vx * dt) / steps, player.z + (player.vz * dt) / steps, PLAYER_R);
  }
  for (const s of level.sentries) {   // sentries are solid
    const dx = player.x - s.x, dz = player.z - s.z, d = Math.hypot(dx, dz), min = PLAYER_R + 0.55;
    if (d < min && d > 1e-6) [player.x, player.z] = collide(level.grid, S, s.x + (dx / d) * min, s.z + (dz / d) * min, PLAYER_R);
  }
  const moved = Math.hypot(player.x - x0, player.z - z0) / Math.max(dt, 1e-6);
  if (Math.hypot(player.vx, player.vz) > 0.4) player.facing = turnTowards(player.facing, Math.atan2(player.vx, player.vz), dt * 14);
  // walk cycle
  const k = Math.min(1, moved / SPEED.run);
  hero.walk += moved * dt * 1.9;
  const swing = Math.sin(hero.walk) * 0.8 * k;
  hero.legs[0].rotation.x = swing;
  hero.legs[1].rotation.x = -swing;
  hero.arms[0].rotation.x = -swing * 0.9;
  hero.arms[1].rotation.x = swing * 0.9;
  hero.body.position.y = Math.abs(Math.sin(hero.walk)) * 0.07 * k;
  hero.body.rotation.x += ((player.dashT > 0 ? 0.35 : 0.08 * k) - hero.body.rotation.x) * damp(12, dt);
  hero.group.position.set(player.x, 0, player.z);
  hero.group.rotation.y = player.facing;
  hero.group.visible = player.hurtT <= 0 || Math.floor(player.hurtT * 12) % 2 === 0;   // blink while invulnerable
}

function openExit() {
  const e = level.exit;
  level.open = true;
  e.disc.visible = e.beam.visible = true;
  e.crystalMat.color.set('#8ff0ff');
  e.crystalMat.emissive.set('#1aa6d6');
  e.runeMat.emissive.set('#27c4ff');
  e.light.intensity = 8;
  mini.dirty = true;
  sound.play('open');
  toast('All coins found: the exit is open!', 'gold');
  banner('The exit is open', 'Follow the beam of light. It shows on the map, too.', 3.5);
}

function updateTraps(dt) {
  const { period, warn, up } = SPIKES;
  for (const t of level.traps) {
    const clockT = level.time + t.offset, cycle = Math.floor(clockT / period), phaseT = clockT - cycle * period;
    const phase = phaseT >= period - up ? 'up' : phaseT >= period - up - warn ? 'warn' : 'down';
    const near = Math.hypot(player.x - t.x, player.z - t.z);
    if (phase !== t.phase) {
      if (phase === 'warn') sound.play('click', near);
      if (phase === 'up') sound.play('spikes', near);
      t.phase = phase;
    }
    const target = phase === 'up' ? 0 : phase === 'warn' ? -0.52 : -0.7;
    t.spikes.position.y += (target - t.spikes.position.y) * damp(phase === 'up' ? 30 : 10, dt);
    const pulse = 0.6 + 0.4 * Math.sin(level.time * 18);
    t.plate.material.emissiveIntensity = phase === 'up' ? 1.1 : phase === 'warn' ? 0.9 * pulse : 0;
    t.plate.material.emissive.set(phase === 'up' ? '#ff2a1a' : '#ff7a1a');
    if (phase === 'up' && cycle !== t.hitCycle && Math.abs(player.x - t.x) < 1.35 && Math.abs(player.z - t.z) < 1.35) {
      if (hurt('spikes')) t.hitCycle = cycle;
    }
  }
}

function updateSentry(s, dt) {
  const L = level;
  const dx = player.x - s.x, dz = player.z - s.z, dist = Math.hypot(dx, dz);
  const toward = Math.atan2(dx, dz);
  const los = dist < SIGHT.range + 6 && lineOfSight(L.grid, S, s.x, s.z, player.x, player.z);
  const sees = !peaceful && los && (dist < SIGHT.sense || (dist < SIGHT.range && Math.abs(wrap(toward - s.facing)) < SIGHT.fov / 2));
  s.visible = (los && dist < 18) || dist < 6;
  if (sees && (s.state === 'patrol' || s.state === 'search')) {
    s.state = 'alert';
    s.cooldown = Math.max(s.cooldown, 0.4);   // a moment to react before the first charge
    sound.play('alert', dist);
  }
  if (s.state === 'alert') {
    s.facing = turnTowards(s.facing, toward, SIGHT.turn * dt);
    if (sees) s.lostT = 0;
    else if ((s.lostT += dt) > 0.6) { s.state = 'search'; s.searchT = 2.5; }
    if (sees) s.cooldown -= dt;
    if (sees && s.cooldown <= 0 && Math.abs(wrap(toward - s.facing)) < 0.2) {
      s.state = 'charge';
      s.chargeT = SIGHT.charge;
      sound.play('charge', dist);
    }
  } else if (s.state === 'charge') {
    s.facing = turnTowards(s.facing, toward, SIGHT.turn * 0.5 * dt);   // it tracks you while charging, but slowly
    if ((s.chargeT -= dt) <= 0) {
      fire(s, dist);
      s.cooldown = L.def.fireEvery;
      s.state = sees ? 'alert' : 'search';
      s.searchT = 2.5;
    }
  } else if (s.state === 'search') {
    s.facing += Math.sin(L.time * 2.4 + s.bob) * dt * 1.8;   // looks around for you
    if ((s.searchT -= dt) <= 0) s.state = 'patrol';
  } else {
    patrol(s, dt, dist);
  }
  // looks
  const charging = s.state === 'charge' ? 1 - s.chargeT / SIGHT.charge : 0;
  const hostile = s.state === 'alert' || s.state === 'charge';
  s.cone.material.color.set(hostile ? '#ff4d4d' : s.state === 'search' ? '#ffe066' : '#ffb347');
  s.cone.material.opacity = hostile ? 0.24 : 0.15;
  s.eyeMat.emissive.set(hostile ? '#ff2a1a' : '#ff9a1f');
  s.eyeMat.emissiveIntensity = 2.2 + charging * 7;
  s.eye.scale.setScalar(1 + charging * 0.7);
  s.eyeGlow.material.color.set(hostile ? '#ff3a2a' : '#ff9a1f');
  s.eyeGlow.scale.setScalar(1.3 + charging * 2.2);
  s.mark.visible = s.state !== 'patrol';
  s.mark.material.map = s.state === 'search' ? MARKS.search : MARKS.alert;
  s.group.position.set(s.x, 0, s.z);
  s.group.rotation.y = s.facing;
  updateCone(s, L.grid);
}

function patrol(s, dt, playerDist) {
  if (s.route.length < 2) { s.facing += 0.7 * dt; return; }   // a sentry without a route scans in place
  if (s.wait > 0) { s.wait -= dt; s.facing += Math.sin(level.time * 1.7 + s.bob) * dt; return; }
  const [tx, tz] = s.route[s.idx];
  const dx = tx - s.x, dz = tz - s.z, d = Math.hypot(dx, dz);
  if (d < 0.05) {
    if (s.idx + s.dir < 0 || s.idx + s.dir >= s.route.length) {   // turn back at the ends
      s.dir *= -1;
      s.wait = 0.8;
    }
    s.idx += s.dir;
    return;
  }
  const want = Math.atan2(dx, dz);
  s.facing = turnTowards(s.facing, want, SIGHT.turn * dt);
  if (Math.abs(wrap(want - s.facing)) < 0.3 && playerDist > 1.3) {
    const step = Math.min(d, SIGHT.speed * dt);
    s.x += (dx / d) * step;
    s.z += (dz / d) * step;
  }
}

const orbGlow = () => glow('#ff5a3c', 1.8);
function fire(s, dist) {
  const dx = Math.sin(s.facing), dz = Math.cos(s.facing);
  const mesh = new THREE.Mesh(GEO.orb, MAT.orb);
  mesh.add(orbGlow());
  const x = s.x + dx * 0.6, z = s.z + dz * 0.6;
  mesh.position.set(x, 1.2, z);
  level.group.add(mesh);
  level.orbs.push({ mesh, x, z, dx, dz, life: ORB.life, from: s });
  sound.play('fire', dist);
}

function updateOrbs(dt) {
  const L = level;
  for (const o of L.orbs) {
    o.life -= dt;
    o.x += o.dx * ORB.speed * dt;
    o.z += o.dz * ORB.speed * dt;
    o.mesh.position.set(o.x, 1.2, o.z);
    if (o.life <= 0 || isWall(L.grid, ...tileOf(S, o.x, o.z))) {
      o.dead = true;
      particles.burst(o.x - o.dx * 0.3, 1.2, o.z - o.dz * 0.3, '#ff7a4a', 10, 2, 1.5, 0.4);
      continue;
    }
    if (Math.hypot(player.x - o.x, player.z - o.z) < PLAYER_R + ORB.radius) {
      if (hurt('orb', o.from)) {
        player.vx += o.dx * 7;
        player.vz += o.dz * 7;
        o.dead = true;
        particles.burst(o.x, 1.2, o.z, '#ff5a3c', 16, 3, 2, 0.5);
      } else if (player.dashT > 0 && player.dodged !== o) {   // dashed straight through it
        player.dodged = o;
        sound.play('dodge');
        toast('Dodged!', 'good');
      }
    }
  }
  for (const o of L.orbs) if (o.dead) L.group.remove(o.mesh);
  L.orbs = L.orbs.filter((o) => !o.dead);
}

function animate(dt, t) {
  const L = level, bob = reduceMotion ? 0 : 1;
  for (const c of L.coins) {
    if (c.taken) continue;
    c.coin.rotation.y = t * 2.2 + c.phase;
    c.group.position.y = 1 + Math.sin(t * 2 + c.phase) * 0.1 * bob;
  }
  for (const p of L.potions) if (!p.taken) p.group.position.y = 0.8 + Math.sin(t * 2.4 + p.phase) * 0.08 * bob;
  for (const tc of L.torches) {
    const f = 0.85 + 0.15 * Math.sin(t * 13 + tc.phase) * Math.sin(t * 7.3 + tc.phase * 2);
    tc.flame.scale.set(1, f * (1 + 0.1 * bob), 1);
    tc.halo.scale.setScalar(1.6 * f);
  }
  for (const s of L.sentries) {
    s.body.position.y = 1.35 + Math.sin(t * 2 + s.bob) * 0.08 * bob;
    s.ring.rotation.z += dt * 1.5;
  }
  const e = L.exit;
  e.crystal.rotation.y = t * 1.2;
  e.crystal.position.y = 1.6 + Math.sin(t * 1.6) * 0.12 * bob;
  if (L.open) {
    e.disc.rotation.z = -t * 1.5;
    e.beam.material.opacity = 0.7 + 0.3 * Math.sin(t * 3);
  }
}

// ------------------------------------------------------------------------- camera
function updateCamera(dt) {
  if (state.mode === 'menu' || state.mode === 'loading') {
    // a slow fly-round of the maze behind the menu
    const w = level.grid[0].length * S, h = level.grid.length * S, R = Math.max(w, h) * 0.72;
    cam.orbit += dt * (reduceMotion ? 0 : 0.05);
    camera.position.set(w / 2 + Math.sin(cam.orbit + 0.8) * R, R * 0.95, h / 2 + Math.cos(cam.orbit + 0.8) * R);
    camera.lookAt(w / 2, 0, h / 2);
    followSun(w / 2, h / 2, Math.max(w, h) / 2 + 4);
    return;
  }
  cam.yaw += wrap(cam.yawTarget - cam.yaw) * damp(10, dt);
  cam.dist += (cam.distTarget - cam.dist) * damp(8, dt);
  // the camera never drops to wall height: at every zoom it looks down from above the walls,
  // so it can never end up inside one
  const minPitch = Math.max(PITCH.min, Math.asin(Math.min(1, (WALL_H + 0.7 - LOOK_Y) / cam.dist)));
  cam.pitch = clamp(cam.pitch, minPitch, PITCH.max);
  // aim a little ahead of the explorer, so more of the maze in front is on screen than behind
  const tx = player.x - Math.sin(cam.yaw) * LOOK_AHEAD, tz = player.z - Math.cos(cam.yaw) * LOOK_AHEAD;
  const across = Math.cos(cam.pitch) * cam.dist;
  camera.position.set(tx + Math.sin(cam.yaw) * across, LOOK_Y + Math.sin(cam.pitch) * cam.dist, tz + Math.cos(cam.yaw) * across);
  if (cam.shake > 0) {
    camera.position.x += (Math.random() - 0.5) * cam.shake;
    camera.position.z += (Math.random() - 0.5) * cam.shake;
    cam.shake = Math.max(0, cam.shake - dt * 1.2);
  }
  camera.lookAt(tx, LOOK_Y, tz);
  followSun(player.x, player.z, 22);
}

// ------------------------------------------------------------------------- map
const mini = { el: $('minimap'), base: document.createElement('canvas'), dirty: true };
mini.g = mini.el.getContext('2d');

function reveal() {
  const L = level, [tx, tz] = tileOf(S, player.x, player.z);
  if (tx === L.lastTile[0] && tz === L.lastTile[1]) return;
  L.lastTile = [tx, tz];
  const w = L.grid[0].length, h = L.grid.length, R = 4;
  for (let z = Math.max(0, tz - R); z <= Math.min(h - 1, tz + R); z++) {
    for (let x = Math.max(0, tx - R); x <= Math.min(w - 1, tx + R); x++) {
      if (L.seen[z * w + x] || L.grid[z][x]) continue;
      const [cx, cz] = centre(S, x, z);
      if (lineOfSight(L.grid, S, player.x, player.z, cx, cz)) {
        L.seen[z * w + x] = 1;
        mini.dirty = true;
      }
    }
  }
}

function drawMinimap(t) {
  const L = level, grid = L.grid, w = grid[0].length, h = grid.length;
  const size = mini.el.width, cell = size / Math.max(w, h);
  const seenAt = (x, z) => L.seen[z * w + x] === 1;
  if (mini.dirty) {
    mini.dirty = false;
    const b = mini.base;
    b.width = b.height = size;
    const g = b.getContext('2d');
    for (let z = 0; z < h; z++) {
      for (let x = 0; x < w; x++) {
        let show = !grid[z][x] && seenAt(x, z);
        if (grid[z][x]) {   // a wall shows once the floor beside it has been seen
          for (let dz = -1; dz <= 1 && !show; dz++) {
            for (let dx = -1; dx <= 1 && !show; dx++) {
              const X = x + dx, Z = z + dz;
              show = X >= 0 && Z >= 0 && X < w && Z < h && !grid[Z][X] && seenAt(X, Z);
            }
          }
        }
        if (!show) continue;
        g.fillStyle = grid[z][x] ? '#6b7389' : '#273042';
        g.fillRect(Math.floor(x * cell), Math.floor(z * cell), Math.ceil(cell), Math.ceil(cell));
      }
    }
  }
  const g = mini.g;
  g.clearRect(0, 0, size, size);
  g.drawImage(mini.base, 0, 0);
  const px = (v) => (v / S) * cell;
  const known = (x, z) => { const [tx, tz] = tileOf(S, x, z); return seenAt(tx, tz); };
  const dot = (x, z, r, color) => {
    g.fillStyle = color;
    g.beginPath();
    g.arc(px(x), px(z), r, 0, TAU);
    g.fill();
  };
  for (const tr of L.traps) {
    if (!known(tr.x, tr.z)) continue;
    g.fillStyle = tr.phase === 'down' ? '#7a5230' : '#ff8a3c';
    g.fillRect(px(tr.x) - cell * 0.28, px(tr.z) - cell * 0.28, cell * 0.56, cell * 0.56);
  }
  for (const c of L.coins) if (!c.taken && known(c.x, c.z)) dot(c.x, c.z, cell * 0.32, '#ffd24a');
  for (const p of L.potions) if (!p.taken && known(p.x, p.z)) dot(p.x, p.z, cell * 0.3, '#ff5c8a');
  if (L.open || known(L.exit.x, L.exit.z)) {
    const pulse = L.open ? 0.5 + 0.5 * Math.sin(t * 5) : 0;
    dot(L.exit.x, L.exit.z, cell * (0.42 + pulse * 0.3), L.open ? '#5fe3ff' : '#98a1b3');
  }
  for (const s of L.sentries) if (s.visible) dot(s.x, s.z, cell * 0.36, s.state === 'patrol' ? '#ffb347' : '#ff4d4d');
  for (const o of L.orbs) dot(o.x, o.z, cell * 0.18, '#ff7a5a');
  // the explorer, and a wedge for where the camera looks
  const x = px(player.x), z = px(player.z), look = Math.atan2(-Math.cos(cam.yaw), -Math.sin(cam.yaw));
  g.fillStyle = 'rgba(255,255,255,0.13)';
  g.beginPath();
  g.moveTo(x, z);
  g.arc(x, z, cell * 2.6, look - 0.55, look + 0.55);
  g.fill();
  const f = Math.atan2(Math.cos(player.facing), Math.sin(player.facing)), r = Math.max(4, cell * 0.5);
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.moveTo(x + Math.cos(f) * r, z + Math.sin(f) * r);
  g.lineTo(x + Math.cos(f + 2.5) * r, z + Math.sin(f + 2.5) * r);
  g.lineTo(x + Math.cos(f - 2.5) * r, z + Math.sin(f - 2.5) * r);
  g.fill();
}

// ------------------------------------------------------------------------- HUD and screens
const shown = {};
function put(id, value) {
  if (shown[id] === value) return;
  shown[id] = value;
  $(id).textContent = value;
}
function updateHud() {
  const L = level, left = L.coins.length - L.collected;
  put('levelName', `${L.index + 1}. ${L.def.name}`);
  put('coins', `${L.collected}/${L.coins.length}`);
  put('timer', clock(L.time));
  put('objective', L.open ? 'The exit is open: follow the beam of light' : `Find ${left} more coin${left === 1 ? '' : 's'} to open the exit`);
  const hp = Math.ceil(player.hp);
  if (shown.hp !== hp) {
    shown.hp = hp;
    $('healthFill').style.width = `${hp}%`;
    $('healthText').textContent = hp;
    $('health').classList.toggle('low', hp <= 30);
  }
  const ready = Math.round((1 - player.dashCd / DASH.cooldown) * 20) / 20;
  if (shown.dash !== ready) {
    shown.dash = ready;
    $('dashFill').style.width = `${ready * 100}%`;
    $('btnDash').style.setProperty('--ready', ready);
    $('dash').classList.toggle('ready', ready >= 1);
  }
}

function toast(text, kind = '') {
  events.push({ t: level ? Math.round(level.time * 100) / 100 : 0, text, kind });
  const box = $('toasts'), el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = text;
  box.prepend(el);
  while (box.children.length > 3) box.lastElementChild.remove();
  setTimeout(() => el.classList.add('out'), 1900);
  setTimeout(() => el.remove(), 2400);
}

let bannerTimer = 0;
function banner(title, text, seconds = 5) {
  $('bannerTitle').textContent = title;
  $('bannerText').textContent = text;
  $('banner').classList.add('show');
  $('hud').classList.add('banner-on');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => {
    $('banner').classList.remove('show');
    $('hud').classList.remove('banner-on');
  }, seconds * 1000);
}

const screens = { menu: $('screenMenu'), pause: $('screenPause'), win: $('screenWin'), lose: $('screenLose') };
function showScreen(name) {
  for (const [key, el] of Object.entries(screens)) el.hidden = key !== name;
  $('hud').hidden = !(name === null || name === 'pause');
  if (name) screens[name].querySelector('[data-autofocus]')?.focus({ preventScroll: true });
  else canvas.focus({ preventScroll: true });
}

function renderLevels() {
  const box = $('levels');
  box.textContent = '';
  LEVELS.forEach((def, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'level';
    b.disabled = i >= progress.unlocked;
    const best = progress.best[i];
    b.innerHTML = '<span class="n"></span><span class="nm"></span><span class="best"></span>';
    b.querySelector('.n').textContent = `Level ${i + 1}`;
    b.querySelector('.nm').textContent = def.name;
    b.querySelector('.best').textContent = b.disabled ? 'Locked' : best != null ? `Best ${clock(best)}` : 'Not cleared yet';
    b.setAttribute('aria-label', `Level ${i + 1}, ${def.name}${b.disabled ? ', locked' : ''}`);
    b.addEventListener('click', () => startLevel(i));
    box.append(b);
  });
  const next = Math.min(progress.unlocked, LEVELS.length) - 1;
  $('playLevel').textContent = `Level ${next + 1}: ${LEVELS[next].name}`;
}

function startLevel(i) {
  buildLevel(i);
  events.length = 0;
  for (const k of Object.keys(shown)) delete shown[k];
  $('toasts').textContent = '';
  scene.fog.near = 16;
  scene.fog.far = 46;
  state.mode = 'play';
  showScreen(null);
  banner(`Level ${i + 1}: ${LEVELS[i].name}`, TIPS[i]);
  updateHud();
  sound.play('ui');
}

function win() {
  const L = level, i = L.index, best = progress.best[i], record = best == null || L.time < best;
  state.mode = 'won';
  if (record) progress.best[i] = L.time;
  progress.unlocked = Math.max(progress.unlocked, Math.min(LEVELS.length, i + 2));
  saveProgress();
  sound.play('win');
  const last = i === LEVELS.length - 1;
  $('winTitle').textContent = last ? 'You found the treasure!' : 'Level complete';
  $('statTime').textContent = clock(L.time);
  $('statHits').textContent = L.hits;
  $('statBest').textContent = record ? `${clock(L.time)} ★` : clock(best);
  $('btnNext').textContent = last ? 'Play again from level 1' : `Next: ${LEVELS[i + 1].name}`;
  showScreen('win');
}

function lose() {
  state.mode = 'lost';
  sound.play('lose');
  $('loseCause').textContent = `The last hit was ${CAUSES[level.lastCause].long} in ${level.def.name}, after ${clock(level.time)}.`;
  showScreen('lose');
}

function pause() {
  if (state.mode !== 'play') return;
  state.mode = 'paused';
  keys.clear();
  $('pauseInfo').textContent = `${level.def.name} · ${level.collected} of ${level.coins.length} coins · ${clock(level.time)}`;
  showScreen('pause');
}
function resume() {
  if (state.mode !== 'paused') return;
  state.mode = 'play';
  showScreen(null);
}
function togglePause() {
  if (state.mode === 'play') pause();
  else if (state.mode === 'paused') resume();
}

function toMenu() {
  state.mode = 'menu';
  scene.fog.near = 70;
  scene.fog.far = 170;
  renderLevels();
  showScreen('menu');
}

document.addEventListener('click', (e) => { if (e.target.closest('button')) sound.unlock(); });
$('btnPlay').addEventListener('click', () => startLevel(Math.min(progress.unlocked, LEVELS.length) - 1));
$('btnPause').addEventListener('click', pause);
$('btnResume').addEventListener('click', resume);
$('btnRestart').addEventListener('click', () => startLevel(level.index));
$('btnMenu').addEventListener('click', toMenu);
$('btnNext').addEventListener('click', () => startLevel(level.index + 1 < LEVELS.length ? level.index + 1 : 0));
$('btnWinMenu').addEventListener('click', toMenu);
$('btnRetry').addEventListener('click', () => startLevel(level.index));
$('btnLoseMenu').addEventListener('click', toMenu);
$('btnSound').addEventListener('click', () => setMuted(!progress.muted));
const fsTarget = document.documentElement;
if (!(fsTarget.requestFullscreen || fsTarget.webkitRequestFullscreen)) $('btnFull').hidden = true;
$('btnFull').addEventListener('click', () => {
  if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  else (fsTarget.requestFullscreen || fsTarget.webkitRequestFullscreen).call(fsTarget)?.catch?.(() => {});
});

// ------------------------------------------------------------------------- main loop
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  const t = now / 1000;
  pollPad(dt);
  if (state.mode === 'play') update(dt);
  animate(dt, t);
  particles.update(dt);
  updateCamera(dt);
  renderer.render(scene, camera);
  if (state.mode === 'play') drawMinimap(t);
}

setMuted(progress.muted);
buildLevel(Math.min(progress.unlocked, LEVELS.length) - 1);
resize();
toMenu();
requestAnimationFrame((now) => {
  last = now;
  frame(now);
  $('loading').hidden = true;
});

if (TEST) {
  window.__game = {
    S, WALL_H, LEVELS,
    start: startLevel,
    info: () => ({
      mode: state.mode, level: level.index, time: level.time, hp: player.hp, hits: level.hits,
      collected: level.collected, coins: level.coins.length, open: level.open,
      player: { x: player.x, z: player.z, facing: player.facing },
      camera: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      sentries: level.sentries.map((s) => ({ x: s.x, z: s.z, facing: s.facing, state: s.state })),
      traps: level.traps.map((tr) => ({ x: tr.x, z: tr.z, phase: tr.phase })),
      orbs: level.orbs.length, events: events.slice(-20),
    }),
    plan: () => level.plan,
    grid: () => level.grid,
    teleport(tx, tz) {
      [player.x, player.z] = centre(S, tx, tz);
      player.vx = player.vz = 0;
    },
    setHp(v) { player.hp = v; },
    look(x, z) { cam.yaw = cam.yawTarget = Math.atan2(player.x - x, player.z - z); },
    // run the game for this many seconds of game time at 60 steps a second, without waiting for frames
    step(seconds) {
      for (let i = 0; i < Math.round(seconds * 60) && state.mode === 'play'; i++) {
        update(1 / 60);
        animate(1 / 60, level.time);
        updateCamera(1 / 60);
      }
      if (seconds === 0) updateCamera(1 / 60);
      return this.info();
    },
    key(code, down) { if (down) keys.add(code); else keys.delete(code); },
    peaceful(on) { peaceful = on; },
  };
}
