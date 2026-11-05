// Sansar Day 2 look test: one ~60 m street, three visual styles (a = realistic PBR, b = stylised-realistic, c = clean low-poly).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const STYLE = (location.pathname.match(/\/look\/([abc])/) || [])[1] || new URLSearchParams(location.search).get('s') || 'a';
const PH = '/look/assets/ph';
const TOUCH = matchMedia('(pointer: coarse)').matches;
const PAVE_Y = 0.15, HALF = 30;
const rand = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

// ---------------------------------------------------------------- renderer, scene, loading
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: STYLE !== 'a' || TOUCH, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, TOUCH ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = STYLE === 'c' ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = STYLE === 'b' ? 1.05 : 1.0;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 400);

const manager = new THREE.LoadingManager();
const bar = document.getElementById('barfill');
manager.onProgress = (_u, done, total) => { bar.style.width = `${Math.round(100 * done / Math.max(total, 1))}%`; };
const gltf = new GLTFLoader(manager), texLoader = new THREE.TextureLoader(manager);
const aniso = renderer.capabilities.getMaxAnisotropy();

// ---------------------------------------------------------------- materials per style
const PBR = { // texture, metres per tile, tint
  plaster: ['plastered_wall', 3], beige: ['beige_wall_001', 2.5], brick: ['red_brick', 1.6], ochre: ['yellow_plaster', 3],
  tile: ['concrete_tile_facade', 3], grey: ['grey_plaster', 3], green: ['painted_plaster_wall', 2.5], brick2: ['brick_wall_02', 2],
};
const FLAT_B = { plaster: 0xe8dcc6, beige: 0xd9bf98, brick: 0xb5523b, ochre: 0xd8a24a, tile: 0xb9bcbc, grey: 0xc9c4ba, green: 0x8fae94, brick2: 0xa65f45 };
const FLAT_C = { plaster: 0xf3e6cf, beige: 0xf0c99a, brick: 0xe07a5f, ochre: 0xf2cc60, tile: 0xb8d0db, grey: 0xd8d5ce, green: 0x9ccfa7, brick2: 0xd98a6c };

function pbrSet(name, tile, extra = {}) {
  const ld = (suf, srgb) => {
    const t = texLoader.load(`${PH}/textures/${name}/${name}_${suf}_1k.jpg`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / tile, 1 / tile); t.anisotropy = aniso;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const arm = ld('arm');
  return new THREE.MeshStandardMaterial({ map: ld('diff', true), normalMap: ld('nor_gl'), aoMap: arm, roughnessMap: arm, metalnessMap: arm, ...extra });
}
function flat(color, extra = {}) {
  return STYLE === 'c' ? new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra })
    : new THREE.MeshStandardMaterial({ color, roughness: 0.82, ...extra });
}

const mats = {};
function M(key) {
  if (mats[key]) return mats[key];
  const [kind, arg] = key.split(':');
  let m;
  if (kind === 'wall') m = STYLE === 'a' ? pbrSet(...PBR[arg]) : flat((STYLE === 'b' ? FLAT_B : FLAT_C)[arg]);
  else if (kind === 'trim') m = STYLE === 'a' ? pbrSet('grey_plaster', 2, { color: 0xf2efe8 }) : flat(STYLE === 'b' ? 0xf1eadb : 0xffffff);
  else if (kind === 'frame') m = STYLE === 'c' ? flat(0xffffff) : new THREE.MeshStandardMaterial({ color: STYLE === 'a' ? 0x24282a : 0x34463c, roughness: 0.45, metalness: STYLE === 'a' ? 0.6 : 0.1 });
  else if (kind === 'glass') m = STYLE === 'c' ? flat(0x7fb3d5) : new THREE.MeshStandardMaterial({ color: 0x8fa3ad, roughness: 0.04, metalness: 0.95, envMapIntensity: 1.2 });
  else if (kind === 'lit') m = STYLE === 'c' ? flat(0xffe2a0) : new THREE.MeshStandardMaterial({ color: 0x3a2a18, emissive: 0xffc77a, emissiveIntensity: 0.55, roughness: 0.1, metalness: 0.4 });
  else if (kind === 'shutter') m = STYLE === 'a' ? pbrSet('dark_planks', 1.2, { color: 0x6f8f78 }) : flat(STYLE === 'b' ? 0x4f7a62 : 0x6fb58a);
  else if (kind === 'rail') m = STYLE === 'c' ? flat(0x5a6470) : new THREE.MeshStandardMaterial({ color: 0x1d1f21, roughness: 0.5, metalness: 0.8 });
  else if (kind === 'slab') m = STYLE === 'a' ? pbrSet('grey_plaster', 2) : flat(STYLE === 'b' ? 0xd7d0c4 : 0xeeeeee);
  else if (kind === 'road') m = STYLE === 'a' ? pbrSet('asphalt_02', 5) : flat(STYLE === 'b' ? 0x55595e : 0x6b7280);
  else if (kind === 'pave') m = STYLE === 'a' ? pbrSet('concrete_pavement', 2.2) : STYLE === 'b' ? slabMat() : flat(0xe5ddd0);
  else if (kind === 'kerb') m = STYLE === 'a' ? pbrSet('grey_plaster', 1, { color: 0xbfbcb6 }) : flat(STYLE === 'b' ? 0xb8b2a8 : 0xcfc8bc);
  else if (kind === 'mark') m = STYLE === 'c' ? flat(0xffffff) : new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2 });
  else if (kind === 'planks') m = STYLE === 'a' ? pbrSet('dark_planks', 1.5) : flat(0x8a5a3b);
  else if (kind === 'room') m = flat(STYLE === 'c' ? 0xfff1d6 : 0xd9c3a0, { emissive: 0x6b4a22, emissiveIntensity: STYLE === 'c' ? 0.2 : 0.35 });
  else if (kind === 'ceiling') m = new THREE.MeshBasicMaterial({ color: 0xfff0d0 });
  else if (kind === 'dark') m = flat(0x2c2a28);
  m.name = key; return (mats[key] = m);
}
function slabMat() { // stylised pavement: soft slab grid
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#d8d0c3'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#bdb3a4'; g.lineWidth = 4;
  for (let i = 0; i <= 256; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 1.6, 1 / 1.6); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
}

// ---------------------------------------------------------------- geometry batching (one draw call per material)
const batch = {};
function box(w, h, d) { // world-scale UVs: 1 unit of uv = 1 metre
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]); }
  return g;
}
function plane(w, h) { const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h); return g; }
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), ONE = new THREE.Vector3(1, 1, 1);
function put(key, geo, base, x, y, z, ry = 0, rx = 0) {
  tmpM.compose(new THREE.Vector3(x, y, z), tmpQ.setFromEuler(tmpE.set(rx, ry, 0)), ONE);
  geo.applyMatrix4(base ? tmpM.premultiply(base) : tmpM);
  (batch[key] ||= []).push(geo);
}
function flush() {
  for (const [key, list] of Object.entries(batch)) {
    const mesh = new THREE.Mesh(mergeGeometries(list.map((g) => g.index ? g : g), false), M(key));
    mesh.castShadow = !['mark', 'glass', 'lit', 'ceiling', 'road', 'pave'].includes(key.split(':')[0]);
    mesh.receiveShadow = true; scene.add(mesh);
  }
}

// ---------------------------------------------------------------- canvas textures: signs, shop interiors, awnings
function signTex(text, bg, fg, font) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 128);
  g.strokeStyle = fg; g.globalAlpha = 0.5; g.lineWidth = 4; g.strokeRect(10, 10, 1004, 108); g.globalAlpha = 1;
  g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 512, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t;
}
function interiorTex(kind) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 256); grd.addColorStop(0, '#f6dfb4'); grd.addColorStop(1, '#a8794e');
  g.fillStyle = grd; g.fillRect(0, 0, 512, 256);
  const pal = { cafe: ['#6b3f22', '#c98d4b', '#efe1c4'], books: ['#7a2e2e', '#2f4f6f', '#c9a54a', '#3f6b3f'], bakery: ['#e8c07a', '#b9783c', '#f3e3c3'],
    pharmacy: ['#e9f2f1', '#4aa38b', '#d9e6ef'], grocery: ['#d94f3a', '#5aa847', '#f2c94c', '#e8873a'], boutique: ['#d7a8b6', '#2e2e3a', '#efe6dc'],
    lobby: ['#cfd6db', '#8a96a0'], diner: ['#b23a2e', '#f0d9a8', '#5a3a22'], home: ['#e9e1d3', '#a39a8c'] }[kind] || ['#999', '#666'];
  for (let row = 0; row < 3; row++) { // shelves of goods
    const y = 40 + row * 62; g.fillStyle = '#5a3c26'; g.fillRect(20, y + 40, 472, 6);
    for (let x = 26; x < 486; x += 10 + Math.floor(rand() * 18)) { g.fillStyle = pal[Math.floor(rand() * pal.length)]; const h = 16 + rand() * 22; g.fillRect(x, y + 40 - h, 8 + rand() * 10, h); }
  }
  g.fillStyle = '#3d2817'; g.fillRect(0, 205, 512, 51); g.fillStyle = '#6e4a2c'; g.fillRect(0, 205, 512, 6); // counter
  const glow = g.createRadialGradient(256, 0, 10, 256, 0, 300); glow.addColorStop(0, 'rgba(255,240,200,.55)'); glow.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = glow; g.fillRect(0, 0, 512, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function awningTex(a, b) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(i * 32, 0, 32, 64); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
}

// ---------------------------------------------------------------- buildings
const GF = 4.2, FL = 3.2, D = 10;
function building({ x, side, w, floors, wall, kind, sign, signBg = '#1f3b2f', signFg = '#f2e6c8', awning, shutters, balconies, office }) {
  const base = new THREE.Matrix4().compose(new THREE.Vector3(x, PAVE_Y, side * 8), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), side > 0 ? Math.PI : 0), ONE);
  const W = `wall:${wall}`, H = GF + floors * FL + 0.7, sw = w - 1.6;
  // ground floor: two piers, fascia band, stall riser, a real 3 m deep lit room behind the glass
  put(W, box(0.8, GF, D), base, -w / 2 + 0.4, GF / 2, -D / 2);
  put(W, box(0.8, GF, D), base, w / 2 - 0.4, GF / 2, -D / 2);
  put(W, box(sw, GF - 3.3, D), base, 0, 3.3 + (GF - 3.3) / 2, -D / 2);
  put(W, box(sw, 3.3, D - 3), base, 0, 1.65, -3 - (D - 3) / 2);
  put('trim', box(sw, 0.45, 0.3), base, 0, 0.225, -0.15);
  put('planks', plane(sw, 3), base, 0, 0.46, -1.5, 0, -Math.PI / 2);
  put('ceiling', plane(sw, 3), base, 0, 3.3, -1.5, 0, Math.PI / 2);
  put('room', plane(3, 2.85), base, -sw / 2, 1.875, -1.5, Math.PI / 2);
  put('room', plane(3, 2.85), base, sw / 2, 1.875, -1.5, -Math.PI / 2);
  const back = new THREE.Mesh(plane(sw, 2.85), STYLE === 'c' ? flat(0xfff1d6, { map: interiorTex(kind) }) : new THREE.MeshStandardMaterial({ map: interiorTex(kind), emissiveMap: interiorTex(kind), emissive: 0xffffff, emissiveIntensity: 0.45, roughness: 0.9 }));
  back.material.map.repeat.set(1 / sw, 1 / 2.85); back.material.map.wrapS = back.material.map.wrapT = THREE.RepeatWrapping;
  if (back.material.emissiveMap) back.material.emissiveMap.repeat.copy(back.material.map.repeat), back.material.emissiveMap.wrapS = back.material.emissiveMap.wrapT = THREE.RepeatWrapping;
  back.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 1.875, -2.99).premultiply(base)); scene.add(back);
  // shop window: glass, mullions, door on the right
  const gl = new THREE.Mesh(plane(sw, 2.85), STYLE === 'c' ? new THREE.MeshLambertMaterial({ color: 0xbfe3f2, transparent: true, opacity: 0.35 })
    : new THREE.MeshStandardMaterial({ color: 0xaab8bf, roughness: 0.03, metalness: 1, transparent: true, opacity: 0.32, envMapIntensity: 1.4 }));
  gl.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 1.875, -0.12).premultiply(base)); scene.add(gl);
  for (const mx of [-sw / 2 + 0.04, sw / 2 - 0.04, sw / 2 - 1.3, 0]) put('frame', box(0.08, 2.85, 0.1), base, mx, 1.875, -0.12);
  put('frame', box(sw, 0.08, 0.1), base, 0, 3.27, -0.12); put('frame', box(sw, 0.08, 0.1), base, 0, 0.49, -0.12);
  put('frame', box(sw - 1.3, 0.06, 0.1), base, -0.65, 2.7, -0.12);
  // fascia sign
  if (sign) {
    put('frame', box(sw + 0.2, 0.72, 0.1), base, 0, 3.75, 0.05);
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(sw, 0.6), new THREE.MeshStandardMaterial({ map: signTex(sign, signBg, signFg, kind === 'office' ? '600 64px Segoe UI, sans-serif' : 'italic 700 70px Georgia, serif'), roughness: 0.6 }));
    sm.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 3.75, 0.105).premultiply(base)); scene.add(sm);
  }
  if (awning) {
    const aw = new THREE.Mesh(new THREE.PlaneGeometry(sw, 1.6), STYLE === 'c' ? flat(0xffffff, { map: awningTex(...awning), side: THREE.DoubleSide })
      : new THREE.MeshStandardMaterial({ map: awningTex(...awning), roughness: 0.95, side: THREE.DoubleSide }));
    aw.material.map.repeat.set(sw / 2, 1); aw.castShadow = true;
    aw.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(0, 3.0, 0.68), new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.15, 0, 0)), ONE).premultiply(base)); scene.add(aw);
    const val = new THREE.Mesh(new THREE.PlaneGeometry(sw, 0.25), aw.material); val.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 2.6, 1.42).premultiply(base)); scene.add(val);
  }
  // upper floors
  put(W, box(w, H - GF, D), base, 0, GF + (H - GF) / 2, -D / 2);
  put('trim', box(w + 0.1, 0.28, 0.28), base, 0, GF, 0.06);
  put('trim', box(w + 0.35, 0.42, 0.55), base, 0, H - 0.75, 0.2);
  put('trim', box(w + 0.1, 0.14, 0.35), base, 0, H, 0.05);
  for (let f = 0; f < floors; f++) {
    const y0 = GF + f * FL + 0.75;
    if (office) {
      put(rand() < 0.3 ? 'lit' : 'glass', box(w - 0.8, 2.1, 0.06), base, 0, y0 + 1.05, 0.02);
      for (let mx = -w / 2 + 0.4; mx <= w / 2 - 0.39; mx += (w - 0.8) / Math.round((w - 0.8) / 1.5)) put('frame', box(0.07, 2.1, 0.14), base, mx, y0 + 1.05, 0.05);
      put('frame', box(w - 0.8, 0.07, 0.14), base, 0, y0 + 2.12, 0.05); put('frame', box(w - 0.8, 0.07, 0.14), base, 0, y0 - 0.02, 0.05);
      continue;
    }
    const n = Math.max(1, Math.floor((w - 0.8) / 2.3)), step = w / n;
    for (let i = 0; i < n; i++) {
      const wx = -w / 2 + step * (i + 0.5), ww = 1.1, wh = 1.75;
      put(rand() < 0.22 ? 'lit' : 'glass', plane(ww, wh), base, wx, y0 + wh / 2, 0.015);
      put('frame', box(ww + 0.12, 0.07, 0.1), base, wx, y0 + wh + 0.02, 0.04); put('frame', box(0.07, wh, 0.1), base, wx - ww / 2 - 0.03, y0 + wh / 2, 0.04);
      put('frame', box(0.07, wh, 0.1), base, wx + ww / 2 + 0.03, y0 + wh / 2, 0.04); put('frame', box(0.05, wh, 0.06), base, wx, y0 + wh / 2, 0.04);
      put('frame', box(ww, 0.05, 0.06), base, wx, y0 + wh * 0.62, 0.04);
      put('trim', box(ww + 0.4, 0.09, 0.22), base, wx, y0 - 0.04, 0.1);
      put('trim', box(ww + 0.3, 0.2, 0.08), base, wx, y0 + wh + 0.16, 0.04);
      if (shutters) for (const s of [-1, 1]) put('shutter', box(0.56, wh, 0.05), base, wx + s * (ww / 2 + 0.33), y0 + wh / 2, 0.05);
      if (balconies && f > 0) {
        put('slab', box(ww + 0.9, 0.14, 0.95), base, wx, y0 - 0.12, 0.47);
        put('rail', box(ww + 0.9, 0.05, 0.05), base, wx, y0 + 0.9, 0.92);
        for (let b = -ww / 2 - 0.42; b <= ww / 2 + 0.43; b += 0.14) put('rail', box(0.025, 0.9, 0.025), base, wx + b, y0 + 0.43, 0.92);
        for (const s of [-1, 1]) put('rail', box(0.05, 0.05, 0.95), base, wx + s * (ww / 2 + 0.45), y0 + 0.9, 0.47);
      }
    }
  }
}

const NORTH = [
  { w: 9, floors: 2, wall: 'ochre', kind: 'cafe', sign: 'Café Marta', signBg: '#203b30', awning: ['#2f5d4a', '#efe6cf'], shutters: true },
  { w: 7, floors: 3, wall: 'brick', kind: 'books', sign: 'Old Leaf Books', signBg: '#5b1f1f', signFg: '#f0d58a' },
  { w: 12, floors: 5, wall: 'plaster', kind: 'grocery', sign: 'Fresh Market', signBg: '#2d5a2b', balconies: true },
  { w: 8, floors: 2, wall: 'green', kind: 'bakery', sign: 'Sunrise Bakery', signBg: '#f1e3c4', signFg: '#6b3a1f', awning: ['#c7553d', '#f4ead6'], shutters: true },
  { w: 13, floors: 6, wall: 'tile', kind: 'lobby', sign: 'MERIDIAN HOUSE', signBg: '#20262b', signFg: '#e7ecef', office: true },
  { w: 11, floors: 3, wall: 'brick2', kind: 'diner', sign: 'The Corner Kitchen', signBg: '#1d1d1d', signFg: '#f2b630', awning: ['#7d1f1f', '#7d1f1f'] },
];
const SOUTH = [
  { w: 10, floors: 3, wall: 'beige', kind: 'pharmacy', sign: 'City Pharmacy', signBg: '#e9f2f0', signFg: '#1f6b57', shutters: true },
  { w: 7, floors: 2, wall: 'grey', kind: 'boutique', sign: 'Atelier Nine', signBg: '#2e2e3a', signFg: '#e9d7c0' },
  { w: 14, floors: 7, wall: 'tile', kind: 'lobby', sign: 'SANSAR BANK', signBg: '#14324d', signFg: '#f2d48a', office: true },
  { w: 11, floors: 4, wall: 'brick', kind: 'home', sign: 'Linden Apartments', signBg: '#3b2a20', signFg: '#efe3cc', balconies: true },
  { w: 9, floors: 2, wall: 'ochre', kind: 'grocery', sign: 'Mama Lin Grocery', signBg: '#b8362a', signFg: '#fff1d6', awning: ['#e0a32e', '#fff4dc'] },
  { w: 9, floors: 3, wall: 'plaster', kind: 'books', sign: 'Paper & Ink', signBg: '#26364a', signFg: '#f3e9d2', shutters: true },
];
function row(list, side, x0) { let x = x0; for (const b of list) { building({ ...b, x: x + b.w / 2, side }); x += b.w; } return x; }
const nEnd = row(NORTH, 1, -HALF); row(SOUTH, -1, -HALF);
// beyond the walkable 60 m the street continues, then a closing building ends each vista
for (const s of [-1, 1]) {
  let x = s > 0 ? nEnd : -HALF;
  const extra = [{ w: 10, floors: 3, wall: 'beige', kind: 'home' }, { w: 12, floors: 4, wall: 'brick2', kind: 'home', shutters: true }, { w: 10, floors: 2, wall: 'green', kind: 'home' }];
  for (const side of [1, -1]) { let xx = s > 0 ? x : x; for (const b of extra) { const w = b.w; building({ ...b, x: s > 0 ? xx + w / 2 : xx - w / 2, side }); xx += s * w; } }
}
for (const s of [-1, 1]) {
  const base = new THREE.Matrix4().compose(new THREE.Vector3(s * 70, PAVE_Y, 0), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -s * Math.PI / 2), ONE);
  put('wall:brick', box(36, 16, 10), base, 0, 8, -5);
  for (let f = 0; f < 4; f++) for (let i = 0; i < 12; i++) put(rand() < 0.2 ? 'lit' : 'glass', plane(1.2, 1.8), base, -16.5 + i * 3, 4 + f * 3.1, 0.02);
}

// street surface: road with markings, kerbs, pavements
put('road', box(150, 0.1, 8), null, 0, -0.05, 0);
for (const s of [-1, 1]) {
  put('pave', box(150, PAVE_Y, 4), null, 0, PAVE_Y / 2, s * 6);
  put('kerb', box(150, PAVE_Y + 0.01, 0.3), null, 0, PAVE_Y / 2, s * 4.15);
  put('mark', box(150, 0.01, 0.12), null, 0, 0.005, s * 3.6);
}
for (let x = -72; x < 72; x += 6) if (Math.abs(x) > 3) put('mark', box(3, 0.01, 0.13), null, x + 1.5, 0.006, 0);
for (let z = -3.4; z <= 3.4; z += 0.9) put('mark', box(3, 0.01, 0.5), null, 0, 0.007, z);
put('pave', box(400, 0.02, 400), null, 0, -0.13, 0);

// ---------------------------------------------------------------- props
const colliders = [];
async function propLoad(name) {
  const g = await gltf.loadAsync(`${PH}/models/${name}/${name}_1k.gltf`);
  g.scene.traverse((o) => {
    if (!o.isMesh) return; o.castShadow = o.receiveShadow = true;
    if (STYLE === 'b') { const m = o.material.clone(); m.color = avgColor(m.map, m.color); m.map = null; m.roughness = 0.75; m.metalness = 0.05; m.roughnessMap = null; m.metalnessMap = null; o.material = m; }
  });
  return g.scene;
}
function avgColor(tex, fallback) {
  if (!tex || !tex.image) return fallback.clone();
  const c = document.createElement('canvas'); c.width = c.height = 4; const g = c.getContext('2d'); g.drawImage(tex.image, 0, 0, 4, 4);
  const d = g.getImageData(0, 0, 4, 4).data; let r = 0, gg = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
  const col = new THREE.Color(r / 16 / 255, gg / 16 / 255, b / 16 / 255); col.convertSRGBToLinear();
  const hsl = {}; col.getHSL(hsl); col.setHSL(hsl.h, Math.min(1, hsl.s * 1.25), hsl.l); return col;
}
function place(src, x, z, ry = 0, r = 0, y = null) {
  const o = src.clone(); o.rotation.y = ry; o.position.set(x, 0, z); scene.add(o);
  const bb = new THREE.Box3().setFromObject(o); o.position.y += (y ?? (Math.abs(z) > 4 ? PAVE_Y : 0)) - bb.min.y;
  if (r) colliders.push({ x, z, r }); return o;
}
// stylised (B) and low-poly (C) primitives for things Poly Haven cannot give us at phone size
function tree(x, z) {
  const t = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 2.6, STYLE === 'c' ? 6 : 10), flat(0x6b4b34)); trunk.position.y = 1.3; t.add(trunk);
  const leaf = flat(STYLE === 'c' ? 0x7cc576 : 0x5f8f4e);
  const blobs = STYLE === 'c' ? [[0, 3.3, 0, 1.5]] : [[0, 3.2, 0, 1.3], [0.7, 2.9, 0.3, 0.95], [-0.6, 3.0, -0.4, 1.0], [0.1, 3.9, -0.2, 0.9], [-0.3, 2.8, 0.6, 0.85]];
  for (const [bx, by, bz, br] of blobs) { const s = new THREE.Mesh(STYLE === 'c' ? new THREE.IcosahedronGeometry(br, 0) : new THREE.IcosahedronGeometry(br, 2), leaf); s.position.set(bx, by, bz); t.add(s); }
  const pit = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 1.2), flat(0x4a3a2c)); pit.position.y = 0.02; t.add(pit);
  t.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }); t.position.set(x, PAVE_Y, z); scene.add(t); colliders.push({ x, z, r: 0.4 });
}
function lowLamp() {
  const g = new THREE.Group(), m = flat(0x37424d);
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 4.2, 6), m); p.position.y = 2.1; g.add(p);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.9), m); arm.position.set(0, 4.15, -0.4); g.add(arm);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.28, 0.25, 6), m); head.position.set(0, 4.05, -0.85); g.add(head);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), new THREE.MeshBasicMaterial({ color: 0xfff2c4 })); bulb.position.set(0, 3.93, -0.85); g.add(bulb);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return g;
}
function lowBench() {
  const g = new THREE.Group(), wood = flat(0xc98b52), iron = flat(0x37424d);
  for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 0.12), wood); s.position.set(0, 0.45, -0.16 + i * 0.16); g.add(s); }
  for (let i = 0; i < 2; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.04), wood); s.position.set(0, 0.62 + i * 0.16, -0.26); g.add(s); }
  for (const x of [-0.75, 0.75]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.5), iron); l.position.set(x, 0.22, -0.05); g.add(l); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return g;
}
function lowCar(color) {
  const g = new THREE.Group(), body = flat(color), dark = flat(0x2a2f36), glassM = flat(0x9cc9e0);
  const b = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.7, 1.8), body); b.position.y = 0.6; g.add(b);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.6, 1.6), glassM); cab.position.set(-0.2, 1.25, 0); g.add(cab);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 1.62), body); roof.position.set(-0.2, 1.58, 0); g.add(roof);
  for (const [x, z] of [[1.3, 0.85], [-1.3, 0.85], [1.3, -0.85], [-1.3, -0.85]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.25, STYLE === 'c' ? 8 : 16), dark); w.rotation.x = Math.PI / 2; w.position.set(x, 0.34, z); g.add(w); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }); return g;
}

async function props() {
  const lampXs = [-24, -12, 0, 12, 24];
  if (STYLE === 'c') {
    const lamp = lowLamp(), bench = lowBench();
    for (const x of lampXs) { place(lamp, x, 4.6, Math.PI, 0.2); place(lamp, x + 6, -4.6, 0, 0.2); }
    place(bench, -6, 7.2, Math.PI, 0.9); place(bench, 18, -7.2, 0, 0.9);
    place(lowCar(0xe76f51), 10, -2.4, 0, 2.2, 0); place(lowCar(0x2a9d8f), -16, 2.4, Math.PI, 2.2, 0);
    for (const [x, z] of [[-9, 5], [16, 5], [4, -5], [-20, -5]]) tree(x, z);
    return;
  }
  const names = ['street_lamp_01', 'painted_wooden_bench', 'covered_car', 'CoffeeCart_01', 'outdoor_table_chair_set_01', 'planter_box_01', 'metal_trash_can', 'shrub_02', 'utility_box_01', 'standing_chalkboard_01'];
  const P = Object.fromEntries(await Promise.all(names.map(async (n) => [n, await propLoad(n)])));
  for (const x of lampXs) { place(P.street_lamp_01, x, 4.55, Math.PI, 0.2); place(P.street_lamp_01, x + 6, -4.55, 0, 0.2); }
  place(P.painted_wooden_bench, -6, 7.3, Math.PI, 0.9); place(P.painted_wooden_bench, 18, -7.3, 0, 0.9);
  place(P.covered_car, 10, -2.3, Math.PI / 2, 2.2, 0);
  if (STYLE === 'b') place(lowCar(0xc0563f), -16, 2.4, Math.PI, 2.2, 0);
  place(P.CoffeeCart_01, -14.5, 5.4, Math.PI / 2, 0.9);
  place(P.outdoor_table_chair_set_01, -27.5, 6.4, 0, 0.8); place(P.outdoor_table_chair_set_01, -23, 6.4, 0.6, 0.8);
  place(P.standing_chalkboard_01, -19.8, 5.2, Math.PI * 0.85, 0.3);
  for (const [x, z] of [[-17.5, 7.2], [4, -7.3], [-0.5, 7.3], [27, -7.2]]) { place(P.planter_box_01, x, z, 0, 0.6); place(P.shrub_02, x, z, rand() * 6, 0, PAVE_Y + 0.45); }
  place(P.metal_trash_can, 6.5, 4.6, 0, 0.3); place(P.metal_trash_can, -9.5, -4.6, 0, 0.3);
  place(P.utility_box_01, -26, -7.4, 0, 0.5);
  if (STYLE === 'b') for (const [x, z] of [[-9, 5], [16, 5], [4, -5], [-20, -5]]) tree(x, z);
}

// ---------------------------------------------------------------- sky and light
const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.castShadow = true; sun.shadow.mapSize.set(TOUCH ? 1024 : 2048, TOUCH ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 25, bottom: -25, near: 1, far: 200 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
const sunDir = new THREE.Vector3(0.4, 0.8, 0.3).normalize();
function setSun(dir, color, intensity) { sunDir.copy(dir).normalize(); sun.position.copy(sunDir).multiplyScalar(80); sun.color.set(color); sun.intensity = intensity; sun.shadow.camera.updateProjectionMatrix(); }

function gradientSky(top, horizon, bottom) {
  const g = new THREE.SphereGeometry(300, 32, 16);
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { t: { value: new THREE.Color(top) }, h: { value: new THREE.Color(horizon) }, b: { value: new THREE.Color(bottom) } },
    vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform vec3 t,h,b; varying vec3 p; void main(){ float y=p.y; vec3 c = y>0. ? mix(h,t,pow(y,.6)) : mix(h,b,pow(-y,.4)); gl_FragColor=vec4(c,1.); }' });
  return new THREE.Mesh(g, m);
}

async function sky() {
  if (STYLE === 'a') {
    const hdr = await new RGBELoader(manager).loadAsync(`${PH}/hdri/palermo_sidewalk_1k.hdr`);
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = hdr; scene.background = hdr; scene.environmentIntensity = 0.9; scene.backgroundIntensity = 1.0;
    scene.fog = new THREE.Fog(0xc9d2d8, 90, 260);
    setSun(sunFromHdr(hdr), 0xfff1de, 3.2);
    return;
  }
  const [top, hor, bot] = STYLE === 'b' ? [0x6fa3d6, 0xf6d7b0, 0xc8b49a] : [0x7fc8f8, 0xdff3ff, 0xdff3ff];
  const dome = gradientSky(top, hor, bot); scene.add(dome);
  const pm = new THREE.PMREMGenerator(renderer), envScene = new THREE.Scene(); envScene.add(gradientSky(top, hor, bot));
  scene.environment = pm.fromScene(envScene, 0.04).texture; scene.environmentIntensity = STYLE === 'b' ? 1.6 : 0.6;
  scene.fog = new THREE.Fog(hor, 70, 240);
  if (STYLE === 'b') { setSun(new THREE.Vector3(-0.6, 0.45, 0.5), 0xffd8a8, 3.0); scene.add(new THREE.HemisphereLight(0xbcd6f0, 0xb08a66, 1.5)); }
  else { setSun(new THREE.Vector3(0.5, 0.8, 0.4), 0xffffff, 2.4); scene.add(new THREE.HemisphereLight(0xffffff, 0xd8cfc0, 1.5)); }
}
function sunFromHdr(tex) { // brightest pixel of the HDRI -> sun direction, so shadows match the photographed sky
  const { data, width, height } = tex.image; const half = data instanceof Uint16Array; let best = -1, bi = 0;
  for (let i = 0; i < width * height; i += 3) { const k = i * 4; const v = half ? THREE.DataUtils.fromHalfFloat(data[k]) + THREE.DataUtils.fromHalfFloat(data[k + 1]) : data[k] + data[k + 1]; if (v > best) { best = v; bi = i; } }
  const u = (bi % width) / width, v = Math.floor(bi / width) / height;
  const lon = (u - 0.5) * 2 * Math.PI, lat = (0.5 - v) * Math.PI;
  const d = new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.abs(Math.sin(lat)), Math.cos(lat) * Math.sin(lon));
  if (d.y < 0.35) d.y = 0.35; return d;
}

// ---------------------------------------------------------------- people
const people = []; let player;
const CLIP = { Idle: /\|(Female_)?Idle$/, Walk: /\|(Female_)?Walk(ing)?$/, Run: /\|(Female_)?Run(ning)?$/, Sit: /\|(SitIdle|Female_Sitting)$/ };
async function characters() { // Quaternius CC0 people (Poly Pizza)
  const files = ['man_casual', 'woman_dress', 'woman_casual', 'woman_sit'];
  const G = Object.fromEntries(await Promise.all(files.map(async (f) => [f, await gltf.loadAsync(`/look/assets/people/${f}.glb`)])));
  function make(file) {
    const g = G[file], o = SkeletonUtils.clone(g.scene);
    const bb = new THREE.Box3().setFromObject(g.scene); o.scale.setScalar(1.74 / (bb.max.y - bb.min.y));
    o.traverse((m) => { if (!m.isMesh) return; m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
      if (STYLE === 'a') { m.material = m.material.clone(); m.material.roughness = 0.8; } });
    const mixer = new THREE.AnimationMixer(o), act = {};
    for (const [k, re] of Object.entries(CLIP)) { const c = g.animations.find((a) => re.test(a.name)); if (c) act[k] = mixer.clipAction(c); }
    act.Idle.play(); scene.add(o); return { o, mixer, act, cur: 'Idle', heading: 0 };
  }
  player = make('man_casual'); player.o.position.set(-26, PAVE_Y, 5.6); player.heading = Math.PI / 2;
  const walker = (f, z, x0, x1) => { const p = make(f); p.o.position.set(x0, PAVE_Y, z); p.path = [x0, x1]; p.dir = x1 > x0 ? 1 : -1; anim(p, 'Walk'); people.push(p); };
  walker('woman_dress', -6.3, -24, 22); walker('woman_casual', 6.9, 20, -12);
  const sitter = make('woman_sit'); sitter.o.position.set(-23.4, PAVE_Y, 7.0); sitter.heading = Math.PI; if (sitter.act.Sit) anim(sitter, 'Sit'); people.push(sitter);
}
function anim(p, name) {
  if (p.cur === name) return; const from = p.act[p.cur], to = p.act[name];
  to.reset().setEffectiveWeight(1).play(); from.crossFadeTo(to, 0.25, false); p.cur = name;
}

// ---------------------------------------------------------------- input
const keys = new Set(); let yaw = -Math.PI / 2, pitch = 0.18, dist = 4.6;
addEventListener('keydown', (e) => keys.add(e.code)); addEventListener('keyup', (e) => keys.delete(e.code));
const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 }, look = { id: null, x: 0, y: 0 };
const jBase = document.getElementById('joy'), jKnob = document.getElementById('knob');
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  if (e.pointerType === 'touch' && e.clientX < innerWidth * 0.5 && joy.id === null) {
    Object.assign(joy, { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 });
    jBase.style.left = `${e.clientX}px`; jBase.style.top = `${e.clientY}px`; jBase.hidden = false; jKnob.style.transform = 'translate(-50%,-50%)';
  } else if (look.id === null) Object.assign(look, { id: e.pointerId, x: e.clientX, y: e.clientY });
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId === joy.id) {
    let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy; const l = Math.hypot(dx, dy), max = 55; if (l > max) { dx *= max / l; dy *= max / l; }
    joy.x = dx / max; joy.y = -dy / max; jKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  } else if (e.pointerId === look.id) {
    yaw -= (e.clientX - look.x) * 0.006; pitch = THREE.MathUtils.clamp(pitch + (e.clientY - look.y) * 0.004, -0.15, 1.1); look.x = e.clientX; look.y = e.clientY;
  }
});
const release = (e) => { if (e.pointerId === joy.id) { joy.id = null; joy.x = joy.y = 0; jBase.hidden = true; } if (e.pointerId === look.id) look.id = null; };
canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
canvas.addEventListener('wheel', (e) => { dist = THREE.MathUtils.clamp(dist + e.deltaY * 0.004, 2.5, 9); }, { passive: true });

// ---------------------------------------------------------------- loop
let composer = null;
function post() {
  if (STYLE === 'c') return;
  composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
  if (STYLE === 'a' && !TOUCH) { const ao = new GTAOPass(scene, camera, innerWidth, innerHeight); ao.blendIntensity = 0.8; ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1, thickness: 1 }); composer.addPass(ao); }
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), STYLE === 'b' ? 0.3 : 0.2, 0.5, 0.92));
  composer.addPass(new OutputPass());
}
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); composer?.setSize(innerWidth, innerHeight); });

const camTarget = new THREE.Vector3(), clock = new THREE.Clock(), fpsEl = document.getElementById('fps'); let frames = 0, acc = 0;
function step(dt) {
  let ix = joy.x, iy = joy.y;
  if (keys.has('KeyW') || keys.has('ArrowUp')) iy += 1; if (keys.has('KeyS') || keys.has('ArrowDown')) iy -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1; if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
  const mag = Math.min(1, Math.hypot(ix, iy)), p = player.o.position;
  if (mag > 0.08) {
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    let dx = fx * iy + rx * ix, dz = fz * iy + rz * ix; const l = Math.hypot(dx, dz); dx /= l; dz /= l;
    const run = keys.has('ShiftLeft') || keys.has('ShiftRight') || (joy.id !== null && mag > 0.9);
    const sp = (run ? 4.2 : 1.7) * (joy.id !== null && !run ? Math.max(0.5, mag) : 1);
    p.x += dx * sp * dt; p.z += dz * sp * dt; player.heading = Math.atan2(dx, dz); anim(player, run ? 'Run' : 'Walk');
    player.act.Walk.timeScale = sp / 1.7;
  } else anim(player, 'Idle');
  p.x = THREE.MathUtils.clamp(p.x, -HALF + 0.5, HALF - 0.5); p.z = THREE.MathUtils.clamp(p.z, -7.6, 7.6);
  for (const c of colliders) { const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), r = c.r + 0.3; if (d < r && d > 1e-4) { p.x = c.x + dx / d * r; p.z = c.z + dz / d * r; } }
  p.y += ((Math.abs(p.z) > 4.05 ? PAVE_Y : 0) - p.y) * Math.min(1, dt * 12);
  for (const n of people) {
    if (n.path) {
      n.o.position.x += n.dir * 1.25 * dt; if ((n.dir > 0 && n.o.position.x > Math.max(...n.path)) || (n.dir < 0 && n.o.position.x < Math.min(...n.path))) n.dir *= -1;
      n.heading = n.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    turn(n, dt); n.mixer.update(dt);
  }
  turn(player, dt); player.mixer.update(dt);
  camTarget.lerp(new THREE.Vector3(p.x, p.y + 1.45, p.z), Math.min(1, dt * 8));
  const cp = Math.cos(pitch);
  camera.position.set(camTarget.x + Math.sin(yaw) * cp * dist, camTarget.y + Math.sin(pitch) * dist, camTarget.z + Math.cos(yaw) * cp * dist);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -7.7, 7.7); camera.position.y = Math.max(0.5, camera.position.y);
  camera.lookAt(camTarget);
  sun.target.position.set(p.x, 0, 0); sun.position.copy(sunDir).multiplyScalar(80).add(sun.target.position);
}
const FACE = 0;
function turn(n, dt) { const want = n.heading + FACE; let d = want - n.o.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); n.o.rotation.y += d * Math.min(1, dt * 10); }

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05); step(dt);
  composer ? composer.render(dt) : renderer.render(scene, camera);
  frames++; acc += dt; if (acc > 0.5) { fpsEl.textContent = `${Math.round(frames / acc)} fps`; frames = 0; acc = 0; }
  requestAnimationFrame(frame);
}

(async () => {
  flush();
  await Promise.all([sky(), props(), characters()]);
  post();
  camTarget.set(player.o.position.x, 1.6, player.o.position.z); step(0.016);
  await renderer.compileAsync(scene, camera);
  composer ? composer.render(0.016) : renderer.render(scene, camera);
  document.getElementById('load').classList.add('done');
  window.__ready = true;
  requestAnimationFrame(frame);
})().catch((e) => { document.getElementById('loadmsg').textContent = `Could not load: ${e.message}`; console.error(e); });
window.__look = { scene, camera, get player() { return player; }, setYaw: (y, p, d) => { yaw = y; if (p !== undefined) pitch = p; if (d) dist = d; } };
