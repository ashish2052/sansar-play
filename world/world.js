// Sansar /world: a walkable district. Ring of 4 streets (College Rd W, Linden Row N, Park Rd E, Main St S), plaza with fountain + market (east half
// of the inner square), park with pond (west half). Buildings are generated from specs; geometry is merged per street side (one draw per material).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { PH } from './look.js';
import { lotGrid, lotPaint, money } from '../js/life.js?v=exam1';
import { createBoards, createRichBoards } from './board.js?v=port1';
import { buildAit } from './aitc.js?v=aitc1';
import { createStream } from './stream.js?v=aitc1';
import { buildCasino } from './casino.js?v=usd1';
import { createTreeKit, camFadeMat, camFadeTick } from './kit.js?v=ac1';
import { buildRoadFields, buildSaleSigns } from './fields.js?v=rd2';
import { buildHomes } from './homes.js?v=rent1';

export const PAVE_Y = 0.15, RING = 40, FRONT = 48, DEPTH = 10, BOUND = 58, FIELD = 330;
const HW = { w: 8, gateX: 0, gateZ: -608 };
// ends at the south kerb of Yoongthong road, the campus road layer takes over there
const HW_SEGS = [[0, -36, 0, -160], [0, -160, 56, -160], [56, -160, 56, -280], [56, -280, 0, -280], [0, -280, 0, -553]];
const FIELD_Z1 = -553;
const rand = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const ONE = new THREE.Vector3(1, 1, 1), UP = new THREE.Vector3(0, 1, 0);
const GF = 4.2, FL = 3.2;
const SIDES = { N: { rot: 0, len: 116, at: (u) => [u, -FRONT], n: [0, 1] }, S: { rot: Math.PI, len: 116, at: (u) => [u, FRONT], n: [0, -1] },
  W: { rot: Math.PI / 2, len: 96, at: (u) => [-FRONT, u], n: [1, 0] }, E: { rot: -Math.PI / 2, len: 96, at: (u) => [FRONT, u], n: [-1, 0] } };

const SPECS = {
  N: [{ w: 7, floors: 3, wall: 'brick', kind: 'books', sign: 'Old Leaf Books', signBg: '#5b1f1f', signFg: '#f0d58a' },
    { w: 12, floors: 5, wall: 'plaster', kind: 'grocery', sign: 'Fresh Market', signBg: '#2d5a2b', balconies: true },
    { w: 8, floors: 2, wall: 'green', kind: 'bakery', sign: 'Sunrise Bakery', signBg: '#f1e3c4', signFg: '#6b3a1f', awning: ['#c7553d', '#f4ead6'], shutters: true },
    { w: 10, floors: 3, wall: 'beige', kind: 'pharmacy', sign: 'Vita Pharmacy', signBg: '#e9f2f0', signFg: '#1f6b57', shutters: true },
    { w: 9, floors: 2, wall: 'ochre', kind: 'cafe', sign: 'Café Marta', signBg: '#203b30', awning: ['#2f5d4a', '#efe6cf'], shutters: true, place: 'cafe' },
    { w: 9, floors: 2, wall: 'blue', kind: 'grocery', sign: 'YOUR BUSINESS', signBg: '#6b3f12', signFg: '#f6e7c8', place: 'business' },
    { w: 13, floors: 4, wall: 'brick2', kind: 'home', sign: 'Elm Court', signBg: '#3b2a20', signFg: '#efe3cc', balconies: true, home: true },
    { w: 7, floors: 2, wall: 'grey', kind: 'boutique', sign: 'Atelier Nine', signBg: '#2e2e3a', signFg: '#e9d7c0' },
    { w: 11, floors: 3, wall: 'brick2', kind: 'diner', sign: 'The Corner Kitchen', signBg: '#1d1d1d', signFg: '#f2b630', awning: ['#7d1f1f', '#7d1f1f'] },
    { w: 8, floors: 2, wall: 'green', kind: 'bakery', sign: 'Petal & Stem', signBg: '#3d6a52', signFg: '#f6ead0', awning: ['#e0a32e', '#fff4dc'] },
    { w: 9, floors: 3, wall: 'plaster', kind: 'books', sign: 'Paper & Ink', signBg: '#26364a', signFg: '#f3e9d2', shutters: true }],
  S: [{ w: 9, floors: 2, wall: 'ochre', kind: 'grocery', sign: 'Mama Lin Grocery', signBg: '#b8362a', signFg: '#fff1d6', awning: ['#e0a32e', '#fff4dc'] },
    { w: 14, floors: 7, wall: 'tile', kind: 'lobby', sign: 'MERIDIAN HOUSE', signBg: '#20262b', signFg: '#e7ecef', office: true, place: 'work' },
    { w: 13, floors: 4, wall: 'brick', kind: 'home', sign: 'Linden Apartments', signBg: '#3b2a20', signFg: '#efe3cc', balconies: true, place: 'home', home: true },
    { w: 9, floors: 2, wall: 'beige', kind: 'diner', sign: 'Noodle House', signBg: '#8a2a1f', signFg: '#ffe9c0', awning: ['#8a2a1f', '#f4ead6'] },
    { w: 8, floors: 3, wall: 'plaster', kind: 'books', sign: 'Second Page', signBg: '#26364a', signFg: '#f3e9d2', shutters: true },
    { w: 10, floors: 3, wall: 'beige', kind: 'pharmacy', sign: 'City Pharmacy', signBg: '#e9f2f0', signFg: '#1f6b57', shutters: true },
    { w: 12, floors: 3, wall: 'brick2', kind: 'casino', sign: 'GOLDEN RUPEE', signBg: '#4a0e18', signFg: '#f2d48a', place: 'casino' },
    { w: 12, floors: 5, wall: 'tile', kind: 'lobby', sign: 'NORTHLINE IT', signBg: '#14324d', signFg: '#9fd0ff', office: true, place: 'itco' },
    { w: 9, floors: 2, wall: 'green', kind: 'cafe', sign: 'Sunny Side', signBg: '#f1d26a', signFg: '#4a3510', awning: ['#2f6b8a', '#f4ead6'], shutters: true },
    { w: 8, floors: 2, wall: 'ochre', kind: 'bakery', sign: "Rosa's Bakery", signBg: '#7a3b1f', signFg: '#ffe8c0', awning: ['#c7553d', '#f4ead6'] }],
  W: [{ w: 17, floors: 4, wall: 'brick', kind: 'college', sign: 'SANSAR COLLEGE', signBg: '#1f2d4a', signFg: '#f2d48a', office: false, place: 'college', balconies: false, shutters: true },
    { w: 9, floors: 2, wall: 'beige', kind: 'cafe', sign: 'Union Café', signBg: '#6b3f22', signFg: '#f6e7c8', awning: ['#6b3f22', '#efe1c4'] },
    { w: 8, floors: 3, wall: 'brick2', kind: 'college', sign: 'IT COLLEGE', signBg: '#1f3b6e', signFg: '#d6e6ff', place: 'itcollege' },
    { w: 14, floors: 5, wall: 'plaster', kind: 'home', sign: 'Westside Flats', signBg: '#3b2a20', signFg: '#efe3cc', balconies: true, home: true },
    { w: 8, floors: 2, wall: 'blue', kind: 'grocery', sign: 'Print Shop', signBg: '#26364a', signFg: '#f3e9d2' },
    { w: 12, floors: 3, wall: 'grey', kind: 'books', sign: 'Cornerstone Library', signBg: '#2e2e3a', signFg: '#e9d7c0', shutters: true },
    { w: 8, floors: 2, wall: 'ochre', kind: 'grocery', sign: 'Quick Mart', signBg: '#b8362a', signFg: '#fff1d6', awning: ['#b8362a', '#fff4dc'] },
    { w: 13, floors: 4, wall: 'green', kind: 'home', sign: 'Pine Court', signBg: '#2d3d2b', signFg: '#efe3cc', balconies: true, home: true }],
  E: [{ w: 14, floors: 5, wall: 'tile', kind: 'lobby', sign: 'SANSAR BANK', signBg: '#14324d', signFg: '#f2d48a', office: true, place: 'bank' },
    { w: 14, floors: 3, wall: 'grey', kind: 'gym', sign: 'IRON & OAK GYM', signBg: '#1d1d1d', signFg: '#f2b630', place: 'gym' },
    { w: 9, floors: 2, wall: 'beige', kind: 'grocery', sign: 'Corner Deli', signBg: '#b8362a', signFg: '#fff1d6', awning: ['#c7553d', '#f4ead6'] },
    { w: 14, floors: 5, wall: 'brick2', kind: 'home', sign: 'Park View Flats', signBg: '#3b2a20', signFg: '#efe3cc', balconies: true, home: true },
    { w: 8, floors: 2, wall: 'green', kind: 'bakery', sign: 'Green Leaf', signBg: '#3d6a52', signFg: '#f6ead0', awning: ['#2f5d4a', '#efe6cf'] },
    { w: 10, floors: 3, wall: 'plaster', kind: 'lobby', sign: 'SANSAR EXCHANGE', signBg: '#102018', signFg: '#c8ff8a', place: 'exchange' },
    { w: 8, floors: 2, wall: 'blue', kind: 'grocery', sign: 'SANSAR MOTORS', signBg: '#26364a', signFg: '#f3e9d2', place: 'dealer' },
    { w: 10, floors: 3, wall: 'plaster', kind: 'pharmacy', sign: '✚ CITY HOSPITAL', signBg: '#f4f7fb', signFg: '#c62828', shutters: true, place: 'hospital' }]
};
const PLACE_INFO = { cafe: ['Cafe', 'Enter Cafe', 0xc4553a], college: ['College', 'Enter College', 0xd9a441], work: ['Company', 'Enter Company', 0x4a86d9], gym: ['Gym', 'Enter Gym', 0x56b36b], home: ['Home', 'Go inside', 0xe08b5a], bank: ['Bank', 'Enter Bank', 0x9a6bd1], itcollege: ['IT College', 'Enter IT College', 0x3a6ea5], itco: ['IT Company', 'Enter IT Company', 0x2f6b8a], business: ['Business', 'Enter Business', 0xc47b2b], casino: ['Casino', 'Enter Casino', 0xc9a227], hospital: ['City Hospital', 'Enter City Hospital', 0xc62828], dealer: ['Sansar Motors', 'Enter Sansar Motors', 0x3a6ea5], exchange: ['Exchange', 'Enter Exchange', 0x6cc47a] };

export async function buildWorld({ scene, look, manager, touch, onProgress = () => {} }) {
  const { M } = look; const gltf = new GLTFLoader(manager);
  const colliders = [], circles = [], rects = [], places = [], buildings = [], upd = [];
  const sideGroups = {}; const batch = {};
  let cur = 'N', aniso = look.aniso;

  // ---- geometry helpers (1 uv unit = 1 metre)
  function box(w, h, d) { const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]); } return g; }
  function plane(w, h) { const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h); return g; }
  function openRoadMat(f, u) { const m = M('road').clone(); m.color.set(0xb8b4ac); Object.assign(m, { polygonOffset: true, polygonOffsetFactor: f, polygonOffsetUnits: u }); return m; }
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler();
  function put(key, geo, base, x, y, z, ry = 0, rx = 0) {
    tmpM.compose(new THREE.Vector3(x, y, z), tmpQ.setFromEuler(tmpE.set(rx, ry, 0)), ONE); geo.applyMatrix4(base ? tmpM.premultiply(base) : tmpM);
    ((batch[cur] ||= {})[key] ||= []).push(geo);
  }
  const NOSHADOW = ['mark', 'glass', 'lit', 'ceiling', 'road', 'pave', 'shopglass', 'back', 'sign', 'awn', 'room'];
  function flush() {
    for (const [side, keys] of Object.entries(batch)) {
      const grp = sideGroups[side] ||= new THREE.Group(); grp.name = 'side-' + side; scene.add(grp);
      for (const [key, list] of Object.entries(keys)) {
        const mesh = new THREE.Mesh(mergeGeometries(list, false), M(key)); mesh.castShadow = !NOSHADOW.includes(key.split(':')[0]); mesh.receiveShadow = true; grp.add(mesh);
      }
    }
  }

  // ---- canvas textures: sign atlas (all shop signs in one draw), shop interiors, awnings
  const signs = []; // {text,bg,fg,font}
  let signTexture = null;
  const SIGNSETS = { town: { list: signs, W: 1024, H: 76, cols: 2, rows: 26, key: 'sign:atlas' }, bazaar: { list: [], W: 512, H: 44, cols: 2, rows: 48, key: 'sign:atlas2' } };
  let signSet = SIGNSETS.town;
  function signUV(idx, S = signSet) { const c = idx % S.cols, r = Math.floor(idx / S.cols); return [c / S.cols, 1 - (r + 1) / S.rows, 1 / S.cols, 1 / S.rows]; }
  function buildSignAtlas(S = SIGNSETS.town) {
    const SW = S.W, SH = S.H, k = SH / 76;
    const cv = document.createElement('canvas'); cv.width = SW * S.cols; cv.height = SH * S.rows; const g = cv.getContext('2d');
    S.list.forEach((s, i) => { const c = i % S.cols, r = Math.floor(i / S.cols), x0 = c * SW, y0 = r * SH;
      g.fillStyle = s.bg; g.fillRect(x0, y0, SW, SH); g.strokeStyle = s.fg; g.globalAlpha = .5; g.lineWidth = Math.max(1.5, 3 * k); g.strokeRect(x0 + 8 * k, y0 + 7 * k, SW - 16 * k, SH - 14 * k); g.globalAlpha = 1;
      g.fillStyle = s.fg; let fs = Math.round((s.office ? 48 : 54) * k); const fam = s.office ? 'Segoe UI, sans-serif' : 'Georgia, serif', wt = s.office ? '600' : 'italic 700';
      do { g.font = `${wt} ${fs}px ${fam}`; fs -= 1; } while (g.measureText(s.text).width > SW * .74 && fs > 12);
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s.text, x0 + SW / 2, y0 + SH / 2 + 2 * k); });
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; if (S === SIGNSETS.town) signTexture = t;
    const sm = M(S.key); sm.map = t; sm.emissiveMap = t; sm.needsUpdate = true;
  }
  const interiors = {};
  function interiorMat(kind) {
    if (interiors[kind]) return interiors[kind];
    const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, 256); grd.addColorStop(0, '#f6dfb4'); grd.addColorStop(1, '#a8794e'); g.fillStyle = grd; g.fillRect(0, 0, 512, 256);
    const pal = { cafe: ['#6b3f22', '#c98d4b', '#efe1c4'], books: ['#7a2e2e', '#2f4f6f', '#c9a54a', '#3f6b3f'], bakery: ['#e8c07a', '#b9783c', '#f3e3c3'], pharmacy: ['#e9f2f1', '#4aa38b', '#d9e6ef'],
      grocery: ['#d94f3a', '#5aa847', '#f2c94c', '#e8873a'], boutique: ['#d7a8b6', '#2e2e3a', '#efe6dc'], lobby: ['#cfd6db', '#8a96a0'], diner: ['#b23a2e', '#f0d9a8', '#5a3a22'], home: ['#e9e1d3', '#a39a8c'],
      gym: ['#2b2f33', '#c0392b', '#9aa5ae'], college: ['#6b4a2a', '#d9c9a0', '#3a4f6b'], casino: ['#6b1a28', '#d4af37', '#1a1a1a', '#f2e6c8'] }[kind] || ['#999', '#666'];
    for (let row = 0; row < 3; row++) { const y = 40 + row * 62; g.fillStyle = '#5a3c26'; g.fillRect(20, y + 40, 472, 6);
      for (let x = 26; x < 486; x += 10 + Math.floor(rand() * 18)) { g.fillStyle = pal[Math.floor(rand() * pal.length)]; const h = 16 + rand() * 22; g.fillRect(x, y + 40 - h, 8 + rand() * 10, h); } }
    g.fillStyle = '#3d2817'; g.fillRect(0, 205, 512, 51); g.fillStyle = '#6e4a2c'; g.fillRect(0, 205, 512, 6);
    const glow = g.createRadialGradient(256, 0, 10, 256, 0, 300); glow.addColorStop(0, 'rgba(255,240,200,.55)'); glow.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = glow; g.fillRect(0, 0, 512, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return (interiors[kind] = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.45, roughness: 0.9 }));
  }
  const awnMats = {};
  function awningMat(a, b) { const k = a + '|' + b; if (awnMats[k]) return k;
    const c = document.createElement('canvas'); c.width = 128; c.height = 8; const g = c.getContext('2d'); g.fillStyle = a; g.fillRect(0, 0, 64, 8); g.fillStyle = b; g.fillRect(64, 0, 64, 8);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1);
    awnMats[k] = true; look.custom['awn:' + k] = new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, side: THREE.DoubleSide }); return k; }

  // ---- buildings
  function building(s, sideKey, u) {
    const S = SIDES[sideKey]; const [bx, bz] = S.at(u); cur = S.batch || sideKey;
    const base = new THREE.Matrix4().compose(new THREE.Vector3(bx, PAVE_Y, bz), new THREE.Quaternion().setFromAxisAngle(UP, S.rot), ONE);
    const { w, floors, wall, kind, sign } = s; const W = `wall:${wall}`, H = GF + floors * FL + 0.7, sw = w - 1.6;
    // ground floor shell with a real 3 m lit room behind the glass
    put(W, box(0.8, GF, DEPTH), base, -w / 2 + 0.4, GF / 2, -DEPTH / 2); put(W, box(0.8, GF, DEPTH), base, w / 2 - 0.4, GF / 2, -DEPTH / 2);
    put(W, box(sw, GF - 3.3, DEPTH), base, 0, 3.3 + (GF - 3.3) / 2, -DEPTH / 2); put(W, box(sw, 3.3, DEPTH - 3), base, 0, 1.65, -3 - (DEPTH - 3) / 2);
    put('trim', box(sw, 0.45, 0.3), base, 0, 0.225, -0.15);
    put('planks', plane(sw, 3), base, 0, 0.46, -1.5, 0, -Math.PI / 2); put('ceiling', plane(sw, 3), base, 0, 3.3, -1.5, 0, Math.PI / 2);
    put('room', plane(3, 2.85), base, -sw / 2, 1.875, -1.5, Math.PI / 2); put('room', plane(3, 2.85), base, sw / 2, 1.875, -1.5, -Math.PI / 2);
    const ik = `back:${kind}`; look.custom[ik] ||= interiorMat(kind); put(ik, new THREE.PlaneGeometry(sw, 2.85), base, 0, 1.875, -2.99);
    put('shopglass', plane(sw, 2.85), base, 0, 1.875, -0.12);
    for (const mx of [-sw / 2 + 0.04, sw / 2 - 0.04, sw / 2 - 1.3, 0]) put('frame', box(0.08, 2.85, 0.1), base, mx, 1.875, -0.12);
    put('frame', box(sw, 0.08, 0.1), base, 0, 3.27, -0.12); put('frame', box(sw, 0.08, 0.1), base, 0, 0.49, -0.12); put('frame', box(sw - 1.3, 0.06, 0.1), base, -0.65, 2.7, -0.12);
    if (sign && signSet.list.length < signSet.cols * signSet.rows) { // fascia sign from the shared atlas
      put('frame', box(sw + 0.2, 0.72, 0.1), base, 0, 3.75, 0.05);
      const idx = signSet.list.length; signSet.list.push({ text: sign, bg: s.signBg || '#1f3b2f', fg: s.signFg || '#f2e6c8', office: !!s.office });
      const pw = Math.min(sw, 8.1), g = new THREE.PlaneGeometry(pw, 0.6), uv = g.attributes.uv, [u0, v0, du, dv] = signUV(idx), half = pw / 8.1 / 2;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + du * (0.5 + (uv.getX(i) - 0.5) * 2 * half), v0 + dv * uv.getY(i));
      put(signSet.key, g, base, 0, 3.75, 0.105);
    }
    if (s.awning) { const k = awningMat(...s.awning); put('awn:' + k, plane(sw, 1.6), base, 0, 3.0, 0.68, 0, -1.15); put('awn:' + k, plane(sw, 0.25), base, 0, 2.6, 1.42); }
    put(W, box(w, H - GF, DEPTH), base, 0, GF + (H - GF) / 2, -DEPTH / 2); put('trim', box(w + 0.1, 0.28, 0.28), base, 0, GF, 0.06);
    put('trim', box(w + 0.35, 0.42, 0.55), base, 0, H - 0.75, 0.2); put('trim', box(w + 0.1, 0.14, 0.35), base, 0, H, 0.05);
    for (let f = 0; f < floors; f++) {
      const y0 = GF + f * FL + 0.75;
      if (s.office) {
        put(rand() < 0.3 ? 'lit' : 'glass', box(w - 0.8, 2.1, 0.06), base, 0, y0 + 1.05, 0.02);
        for (let mx = -w / 2 + 0.4; mx <= w / 2 - 0.39; mx += (w - 0.8) / Math.round((w - 0.8) / 1.5)) put('frame', box(0.07, 2.1, 0.14), base, mx, y0 + 1.05, 0.05);
        put('frame', box(w - 0.8, 0.07, 0.14), base, 0, y0 + 2.12, 0.05); put('frame', box(w - 0.8, 0.07, 0.14), base, 0, y0 - 0.02, 0.05); continue;
      }
      const n = Math.max(1, Math.floor((w - 0.8) / 2.3)), step = w / n;
      for (let i = 0; i < n; i++) {
        const wx = -w / 2 + step * (i + 0.5), ww = 1.1, wh = 1.75;
        put(rand() < 0.28 ? 'lit' : 'glass', plane(ww, wh), base, wx, y0 + wh / 2, 0.015);
        put('frame', box(ww + 0.12, 0.07, 0.1), base, wx, y0 + wh + 0.02, 0.04); put('frame', box(0.07, wh, 0.1), base, wx - ww / 2 - 0.03, y0 + wh / 2, 0.04);
        put('frame', box(0.07, wh, 0.1), base, wx + ww / 2 + 0.03, y0 + wh / 2, 0.04); put('frame', box(0.05, wh, 0.06), base, wx, y0 + wh / 2, 0.04);
        put('frame', box(ww, 0.05, 0.06), base, wx, y0 + wh * 0.62, 0.04); put('trim', box(ww + 0.4, 0.09, 0.22), base, wx, y0 - 0.04, 0.1); put('trim', box(ww + 0.3, 0.2, 0.08), base, wx, y0 + wh + 0.16, 0.04);
        if (s.shutters) for (const sg of [-1, 1]) put('shutter', box(0.56, wh, 0.05), base, wx + sg * (ww / 2 + 0.33), y0 + wh / 2, 0.05);
        if (s.balconies && f > 0) {
          put('slab', box(ww + 0.9, 0.14, 0.95), base, wx, y0 - 0.12, 0.47); put('rail', box(ww + 0.9, 0.05, 0.05), base, wx, y0 + 0.9, 0.92);
          for (let b = -ww / 2 - 0.42; b <= ww / 2 + 0.43; b += 0.22) put('rail', box(0.025, 0.9, 0.025), base, wx + b, y0 + 0.43, 0.92);
          for (const sg of [-1, 1]) put('rail', box(0.05, 0.05, 0.95), base, wx + sg * (ww / 2 + 0.45), y0 + 0.9, 0.47);
        }
      }
    }
    // collider + door point on the pavement
    const corners = [[-w / 2, -DEPTH], [w / 2, -DEPTH], [-w / 2, 0], [w / 2, 0]].map(([x, z]) => new THREE.Vector3(x, 0, z).applyMatrix4(base));
    const x0 = Math.min(...corners.map(c => c.x)), x1 = Math.max(...corners.map(c => c.x)), z0 = Math.min(...corners.map(c => c.z)), z1 = Math.max(...corners.map(c => c.z));
    colliders.push({ t: 'box', x0, x1, z0, z1, y1: H }); rects.push({ x0: x0 - .05, x1: x1 + .05, z0: z0 - .05, z1: z1 + .05 });
    const e = { name: sign || 'House', kind, side: sideKey, group: 'side-' + cur, district: S.district || null, x: bx, z: bz, n: S.n, door: { x: bx + S.n[0] * 2.3, z: bz + S.n[1] * 2.3 }, home: !!s.home, place: s.place, H, w, wall, box: { x0, x1, z0, z1, y1: H } };
    buildings.push(e);
    if (s.place) { const [lab, verb, color] = PLACE_INFO[s.place]; e.color = color;
      const place = { id: s.place, label: lab, verb, x: e.door.x, z: e.door.z, r: s.place === 'casino' ? 1.02 : 3.2, color, top: H };
      if (s.place === 'casino') { place.approach = { x: e.door.x + S.n[0] * 2.1, z: e.door.z + S.n[1] * 2.1 }; place.face = Math.atan2(-S.n[0], -S.n[1]); }
      places.push(place); }
  }
  for (const k of ['N', 'S', 'W', 'E']) {
    const list = SPECS[k], len = SIDES[k].len, tot = list.reduce((a, b) => a + b.w, 0);
    const gapW = k === 'N' ? 14 : 0, gapAt = 0, gap0 = gapAt - gapW / 2;
    const sc = (len - gapW) / tot;
    let u = -len / 2, opened = gapW === 0;
    for (const s of list) {
      const w = s.w * sc;
      if (!opened && u < gap0 + gapW && u + w > gap0) {
        const leftW = Math.min(w, Math.max(0, gap0 - u));
        const rightW = w - leftW;
        const onLeft = leftW >= rightW;
        if (leftW > 1.2) building({ ...s, w: leftW, sign: onLeft ? s.sign : '', place: onLeft ? s.place : undefined }, k, u + leftW / 2);
        u = gap0 + gapW;
        if (rightW > 1.2) building({ ...s, w: rightW, sign: onLeft ? '' : s.sign, place: onLeft ? undefined : s.place }, k, u + rightW / 2);
        u += rightW;
        opened = true;
        continue;
      }
      building({ ...s, w }, k, u + w / 2);
      u += w;
    }
  }
  buildSignAtlas();
  onProgress(.2);

  // ---- ground: pavement slab, roads, marks, plaza, park
  cur = 'G';
  put('pave', box(120, PAVE_Y, 120), null, 0, PAVE_Y / 2, 0);
  const RY = PAVE_Y + 0.012;
  const roadRects = [[0, -RING, 88, 8], [0, RING, 88, 8], [-RING, 0, 8, 72], [RING, 0, 8, 72]];
  for (const [x, z, w, d] of roadRects) put('road', plane(w, d), null, x, RY, z, 0, -Math.PI / 2);
  for (const sx of [-1, 1]) for (const [z] of [[-RING], [RING]]) { put('mark', box(88, 0.01, 0.12), null, 0, RY + 0.004, z + sx * 3.6); }
  for (const sx of [-1, 1]) for (const x of [-RING, RING]) put('mark', box(0.12, 0.01, 72), null, x + sx * 3.6, RY + 0.004, 0);
  for (let x = -42; x < 42; x += 6) if (Math.abs(x) > 3) for (const z of [-RING, RING]) put('mark', box(3, 0.01, 0.13), null, x + 1.5, RY + 0.005, z);
  for (let z = -33; z < 33; z += 6) for (const x of [-RING, RING]) put('mark', box(0.13, 0.01, 3), null, x, RY + 0.005, z + 1.5);
  const zebras = [];
  for (const [cx, cz, alongX] of [[-24, -RING, 1], [0, -RING, 1], [24, -RING, 1], [-24, RING, 1], [0, RING, 1], [24, RING, 1], [-RING, -24, 0], [-RING, 0, 0], [-RING, 24, 0], [RING, -24, 0], [RING, 0, 0], [RING, 24, 0]]) {
    zebras.push({ x: cx, z: cz, alongX }); for (let k = -3.4; k <= 3.4; k += 0.9) alongX ? put('mark', box(3, 0.01, 0.5), null, cx, RY + 0.007, cz + k) : put('mark', box(0.5, 0.01, 3), null, cx + k, RY + 0.007, cz);
  }
  // plaza (east half of inner square) + park (west half)
  put('cobble', plane(35, 64), null, 14.5, PAVE_Y + 0.016, 0, 0, -Math.PI / 2);
  const FX = 14, FZ = 0;
  const ring = new THREE.RingGeometry(5.6, 9.5, 48), ruv = ring.attributes.uv; ring.rotateX(-Math.PI / 2); for (let i = 0; i < ruv.count; i++) ruv.setXY(i, ring.attributes.position.getX(i) / 2, ring.attributes.position.getZ(i) / 2);
  ring.translate(FX, PAVE_Y + 0.022, FZ); (batch.G ||= {}).herring = [ring];
  put('grass', plane(28, 64), null, -18, PAVE_Y + 0.016, 0, 0, -Math.PI / 2);
  // park paths: ring round the pond + spokes to the gates
  const PX = -17, PZ = 0;
  const pr = new THREE.RingGeometry(8.2, 10.2, 48); pr.rotateX(-Math.PI / 2); { const uv = pr.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, pr.attributes.position.getX(i), pr.attributes.position.getZ(i)); } pr.translate(PX, PAVE_Y + 0.024, PZ); (batch.G.path ||= []).push(pr);
  put('path', plane(2, 22), null, PX, PAVE_Y + 0.024, -21.2, 0, -Math.PI / 2); put('path', plane(2, 22), null, PX, PAVE_Y + 0.024, 21.2, 0, -Math.PI / 2);
  put('path', plane(4, 2), null, -6.6, PAVE_Y + 0.024, 0, 0, -Math.PI / 2);
  // one field under town and campus. Large enough that the edge stays inside the fog.
  put('grass', plane(1800, 1800), null, 0, -0.03, 0, 0, -Math.PI / 2);
  // low kerb strips between road and pavement
  for (const z of [-RING - 4, -RING + 4, RING - 4, RING + 4]) put('kerb', box(88, 0.03, 0.18), null, 0, PAVE_Y + 0.012, z);
  for (const x of [-RING - 4, -RING + 4, RING - 4, RING + 4]) put('kerb', box(0.18, 0.03, 72), null, x, PAVE_Y + 0.012, 0);
  // Fields and the road north to the AIT gate. One bend keeps a real campus block off the lanes.
  {
    const field = new THREE.Mesh(plane(220, -45 - FIELD_Z1), M('grass'));
    field.rotation.x = -Math.PI / 2; field.position.set(20, 0.02, (-45 + FIELD_Z1) / 2); field.receiveShadow = true; scene.add(field);
    const roadM = openRoadMat(-2, -4);
    const edgeM = new THREE.MeshStandardMaterial({ color: 0xd9d6cc, roughness: 0.85, transparent: true, opacity: 0.82, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
    const lineM = new THREE.MeshStandardMaterial({ color: 0xd8b23a, roughness: 0.8, transparent: true, opacity: 0.85, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 });
    const segs = HW_SEGS;
    const dashes = [];
    for (const [x0, z0, x1, z1] of segs) {
      const len = Math.hypot(x1 - x0, z1 - z0), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
      const road = new THREE.Mesh(plane(alongX ? len : HW.w, alongX ? HW.w : len), roadM);
      road.rotation.x = -Math.PI / 2; road.position.set(mx, PAVE_Y + 0.06, mz); road.receiveShadow = true; scene.add(road);
      for (const s of [-1, 1]) {
        const edge = new THREE.Mesh(new THREE.PlaneGeometry(alongX ? len : 0.14, alongX ? 0.14 : len), edgeM);
        edge.rotation.x = -Math.PI / 2;
        edge.position.set(mx + (alongX ? 0 : s * (HW.w / 2 - 0.22)), PAVE_Y + 0.072, mz + (alongX ? s * (HW.w / 2 - 0.22) : 0));
        scene.add(edge);
      }
      const n = Math.max(1, Math.floor(len / 9));
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        dashes.push([x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, alongX ? Math.PI / 2 : 0]);
      }
    }
    const dashMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 0.03, 3.4), lineM, dashes.length);
    const dm = new THREE.Matrix4(), dq = new THREE.Quaternion();
    dashes.forEach((p, i) => { dm.compose(new THREE.Vector3(p[0], PAVE_Y + 0.075, p[1]), dq.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p[2]), new THREE.Vector3(1, 1, 1)); dashMesh.setMatrixAt(i, dm); });
    dashMesh.instanceMatrix.needsUpdate = true; scene.add(dashMesh);
    const poleZ = [];
    for (let z = -100; z >= -150; z -= 42) poleZ.push(z);
    for (let z = -320; z >= -540; z -= 42) poleZ.push(z);
    // concrete poles with a steel crossarm, insulators and three sagging lines to the next pole of the same run
    const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.11, 0.17, 9.5, 10), M('concrete'), poleZ.length);
    const armParts = [box(2.4, 0.12, 0.12)];
    for (const x of [-1.05, 0, 1.05]) { const g = new THREE.CylinderGeometry(0.05, 0.07, 0.22, 8); g.translate(x, 0.17, 0); armParts.push(g); }
    const armG = mergeGeometries(armParts.map((g) => g.toNonIndexed()), false);
    const arm = new THREE.InstancedMesh(armG, M('frame'), poleZ.length);
    poleZ.forEach((z, i) => { dm.makeTranslation(10, PAVE_Y + 4.75, z); pole.setMatrixAt(i, dm); dm.makeTranslation(10, PAVE_Y + 8.7, z); arm.setMatrixAt(i, dm); });
    pole.castShadow = arm.castShadow = true; pole.receiveShadow = true; pole.computeBoundingSphere(); arm.computeBoundingSphere();
    const wires = [];
    for (let i = 0; i + 1 < poleZ.length; i++) {
      const za = poleZ[i], zb = poleZ[i + 1]; if (za - zb > 45) continue;
      for (const ox of [-1.05, 0, 1.05]) {
        const pts = []; for (let k = 0; k <= 16; k++) { const t = k / 16; pts.push(new THREE.Vector3(10 + ox, PAVE_Y + 8.92 - 0.75 * 4 * t * (1 - t), za + (zb - za) * t)); }
        wires.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.014, 4, false));
      }
    }
    const wireM = new THREE.Mesh(mergeGeometries(wires, false), new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.6 }));
    wireM.castShadow = true; wireM.name = 'road-wires';
    scene.add(pole, arm, wireM);
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const g2 = cv.getContext('2d');
    g2.fillStyle = '#163528'; g2.fillRect(0, 0, 512, 256); g2.strokeStyle = '#f2d48a'; g2.lineWidth = 14; g2.strokeRect(18, 18, 476, 220);
    g2.fillStyle = '#f6e7c2'; g2.font = '700 140px Segoe UI, sans-serif'; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText('AIT', 256, 128);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.2), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    board.position.set(8, PAVE_Y + 2.5, -72); scene.add(board);
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.2, 8), new THREE.MeshBasicMaterial({ color: 0xf0c42e }));
    arrow.rotation.x = -Math.PI / 2; arrow.position.set(8, PAVE_Y + 2.5, -75.2); scene.add(arrow);
    for (const ox of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.5, 0.14), new THREE.MeshBasicMaterial({ color: 0x241c16 }));
      post.position.set(8 + ox, PAVE_Y + 1.25, -72); scene.add(post);
    }
  }
  onProgress(.3);

  // ---- Old Bazaar, the first new district, south of town. The outer ring road runs x = ±77 and
  // z = -77 / 231, in the gaps between the land-lot rows, and meets the AIT road at (0, -77). Bazaar Road
  // (z = 69) runs behind the south row of town. Two market lanes cross at a stupa square.
  const RR = { x: 77, n: -77, s: 231, w: 6, bz: 69 };
  const CH = { x: 0, z: 154 };
  {
    const ringM = openRoadMat(-1, -2);
    const ringEdgeM = new THREE.MeshStandardMaterial({ color: 0xd9d6cc, roughness: 0.85, transparent: true, opacity: 0.82, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
    const ringLineM = new THREE.MeshStandardMaterial({ color: 0xd8b23a, roughness: 0.8, transparent: true, opacity: 0.85, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 });
    const segs = [[-RR.x, RR.n, RR.x, RR.n, [[0, 5]]], [RR.x, RR.n, RR.x, RR.s, [[RR.bz, 4], [CH.z, 4.5]]], [RR.x, RR.s, -RR.x, RR.s, [[0, 4.5]]], [-RR.x, RR.s, -RR.x, RR.n, [[RR.bz, 4], [CH.z, 4.5]]], [-RR.x, RR.bz, RR.x, RR.bz, [[0, 4.5]]]];
    const roadG = [], edgeG = [], dashes = [];
    for (const [x0, z0, x1, z1, gaps] of segs) {
      const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0), len = Math.hypot(x1 - x0, z1 - z0), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      const g = plane(alongX ? len + RR.w : RR.w, alongX ? RR.w : len + RR.w); g.rotateX(-Math.PI / 2); g.translate(mx, PAVE_Y + 0.05, mz); roadG.push(g);
      const a0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1), a1 = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
      const cuts = gaps.map(([c, h]) => [c - h, c + h]).sort((p, q) => p[0] - q[0]);
      const runs = []; let s = a0 + RR.w / 2;
      for (const [c0, c1] of cuts) { if (c0 > s) runs.push([s, c0]); s = Math.max(s, c1); }
      if (a1 - RR.w / 2 > s) runs.push([s, a1 - RR.w / 2]);
      for (const [r0, r1] of runs) {
        const rl = r1 - r0, rm = (r0 + r1) / 2;
        for (const side of [-1, 1]) {
          const e = new THREE.PlaneGeometry(alongX ? rl : 0.14, alongX ? 0.14 : rl); e.rotateX(-Math.PI / 2);
          e.translate(alongX ? rm : mx + side * (RR.w / 2 - 0.2), PAVE_Y + 0.062, alongX ? mz + side * (RR.w / 2 - 0.2) : rm); edgeG.push(e);
        }
        for (let t = r0 + 2; t < r1 - 2; t += 9) dashes.push(alongX ? [t, mz, Math.PI / 2] : [mx, t, 0]);
      }
    }
    const road = new THREE.Mesh(mergeGeometries(roadG, false), ringM), edges = new THREE.Mesh(mergeGeometries(edgeG, false), ringEdgeM);
    road.name = 'ring-road'; road.receiveShadow = true; scene.add(road, edges);
    const dm = new THREE.Matrix4(), dq = new THREE.Quaternion();
    const dashMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.03, 3.2), ringLineM, dashes.length);
    dashes.forEach((p, i) => { dm.compose(new THREE.Vector3(p[0], PAVE_Y + 0.07, p[1]), dq.setFromAxisAngle(UP, p[2]), ONE); dashMesh.setMatrixAt(i, dm); });
    dashMesh.instanceMatrix.needsUpdate = true; scene.add(dashMesh);
  }
  {
    const rows = {
      A: { batch: 'BZ-N', rot: Math.PI, len: 67, at: (u) => [-38.5 + u, 74], n: [0, -1] },
      B: { batch: 'BZ-N', rot: Math.PI, len: 67, at: (u) => [38.5 + u, 74], n: [0, -1] },
      C: { batch: 'BZ-L1', rot: Math.PI / 2, len: 46, at: (u) => [-4.5, 109 + u], n: [1, 0] },
      D: { batch: 'BZ-L1', rot: -Math.PI / 2, len: 46, at: (u) => [4.5, 109 + u], n: [-1, 0] },
      E1: { batch: 'BZ-X', rot: 0, len: 46, at: (u) => [-49 + u, CH.z - 4.5], n: [0, 1] },
      E2: { batch: 'BZ-X', rot: 0, len: 46, at: (u) => [49 + u, CH.z - 4.5], n: [0, 1] },
      F1: { batch: 'BZ-X', rot: Math.PI, len: 46, at: (u) => [-49 + u, CH.z + 4.5], n: [0, -1] },
      F2: { batch: 'BZ-X', rot: Math.PI, len: 46, at: (u) => [49 + u, CH.z + 4.5], n: [0, -1] },
      G: { batch: 'BZ-L2', rot: Math.PI / 2, len: 48, at: (u) => [-4.5, 200 + u], n: [1, 0] },
      H: { batch: 'BZ-L2', rot: -Math.PI / 2, len: 48, at: (u) => [4.5, 200 + u], n: [-1, 0] },
      // outer rows face the ring road; the courtyards behind them stay open, like a Newari bahal
      IN: { batch: 'BZ-L1', rot: -Math.PI / 2, len: 51, at: (u) => [-72, 111.5 + u], n: [-1, 0], shop: 0.5 },
      JN: { batch: 'BZ-L1', rot: Math.PI / 2, len: 51, at: (u) => [72, 111.5 + u], n: [1, 0], shop: 0.5 },
      IS: { batch: 'BZ-L2', rot: -Math.PI / 2, len: 55, at: (u) => [-72, 198.5 + u], n: [-1, 0], shop: 0.5 },
      JS: { batch: 'BZ-L2', rot: Math.PI / 2, len: 55, at: (u) => [72, 198.5 + u], n: [1, 0], shop: 0.5 },
      K1: { batch: 'BZ-L2', rot: 0, len: 45, at: (u) => [-38.5 + u, 226], n: [0, 1], shop: 0.4 },
      K2: { batch: 'BZ-L2', rot: 0, len: 45, at: (u) => [38.5 + u, 226], n: [0, 1], shop: 0.4 }
    };
    const SHOPS = [['General Store', 'grocery', '#b8362a', '#fff1d6'], ['Momo House', 'diner', '#8a2a1f', '#ffe9c0'], ['Tea House', 'cafe', '#203b30', '#f2e6c8'], ['Thangka Art', 'boutique', '#5b1f1f', '#f0d58a'],
      ['Pashmina House', 'boutique', '#2e2e3a', '#e9d7c0'], ['Sweet Shop', 'bakery', '#e0a32e', '#3a2410'], ['Hardware Store', 'grocery', '#26364a', '#f3e9d2'], ['Family Kitchen', 'diner', '#7d1f1f', '#f2b630'],
      ['Hat Shop', 'boutique', '#1f3b6e', '#f2d48a'], ['Gold & Silver', 'boutique', '#4a0e18', '#f2d48a'], ['Tailor Master', 'boutique', '#3b2a20', '#efe3cc'], ['Cloth House', 'grocery', '#6b1d2a', '#f6e7c8'],
      ['Pharmacy', 'pharmacy', '#e9f2f0', '#1f6b57'], ['Book Corner', 'books', '#26364a', '#f3e9d2'], ['Mobile Repair', 'grocery', '#14324d', '#9fd0ff'], ['Kitchenware', 'grocery', '#5a3c26', '#f6e7c8'],
      ['Spice Market', 'grocery', '#c4553a', '#fff4dc'], ['Juice Corner', 'cafe', '#2f6b45', '#fff4dc'], ['Grill House', 'diner', '#1d1d1d', '#f2b630'], ['Snack Bar', 'diner', '#6b3f12', '#f6e7c8'],
      ['Ring Bakery', 'bakery', '#7a3b1f', '#ffe8c0'], ['Prayer Goods', 'grocery', '#c7553d', '#fff4dc'], ['Home Goods', 'grocery', '#3d6a52', '#f6ead0'], ['Photo Studio', 'boutique', '#2e2e3a', '#f3e9d2']];
    const BWALLS = ['brick', 'brick', 'brick2', 'plaster', 'ochre', 'beige'];
    const AWN = [['#c7553d', '#f4ead6'], ['#2f6b8a', '#f4ead6'], ['#e0a32e', '#fff4dc']];
    let shopN = 0;
    signSet = SIGNSETS.bazaar;
    for (const [key, R] of Object.entries(rows)) {
      SIDES[key] = { ...R, district: 'bazaar' };
      const list = [];
      let tot = 0;
      while (tot < R.len - 6) {
        const w = 6.5 + Math.floor(rand() * 5), floors = 1 + Math.floor(rand() * 4), shop = rand() < (R.shop || 0.78);
        const sp = SHOPS[shopN++ % SHOPS.length];
        const s = { w, floors, wall: BWALLS[Math.floor(rand() * BWALLS.length)], kind: shop ? sp[1] : 'home', home: !shop || floors >= 3, balconies: floors >= 2 && rand() < 0.6, shutters: rand() < 0.5 };
        if (shop) { s.sign = sp[0]; s.signBg = sp[2]; s.signFg = sp[3]; if (rand() < 0.45) s.awning = AWN[Math.floor(rand() * AWN.length)]; }
        list.push(s); tot += w;
      }
      const sc = R.len / tot;
      let u = -R.len / 2;
      for (const s of list) { const w = s.w * sc; building({ ...s, w }, key, u + w / 2); u += w; }
    }
    cur = 'BZG';
    put('pave', box(148, PAVE_Y, 156), null, 0, PAVE_Y / 2, 150);
    put('cobble', plane(7, 156), null, 0, PAVE_Y + 0.016, 150, 0, -Math.PI / 2);
    put('cobble', plane(148, 7), null, 0, PAVE_Y + 0.016, CH.z, 0, -Math.PI / 2);
    put('wall:brick2', plane(48, 40), null, CH.x, PAVE_Y + 0.022, CH.z, 0, -Math.PI / 2);
    put('kerb', box(148, 0.03, 0.18), null, 0, PAVE_Y + 0.012, 72.1);
    // tea and vegetable stalls on the square
    cur = 'BZ-X';
    const stall = (x, z, face, tea) => {
      const base = new THREE.Matrix4().compose(new THREE.Vector3(x, PAVE_Y, z), new THREE.Quaternion().setFromAxisAngle(UP, face), ONE);
      put('planks', box(2.6, 1.0, 1.1), base, 0, 0.5, 0.1);
      for (const [px, pz, h] of [[-1.3, -0.7, 2.5], [1.3, -0.7, 2.5], [-1.3, 0.75, 2.1], [1.3, 0.75, 2.1]]) put('frame', box(0.08, h, 0.08), base, px, h / 2, pz);
      const k = awningMat(...(tea ? ['#2f6b45', '#f4ead6'] : ['#c7553d', '#f4ead6']));
      put('awn:' + k, plane(3.0, 2.3), base, 0, 2.3, 0.05, 0, -Math.PI / 2 + 0.12);
      if (tea) {
        put('frame', new THREE.CylinderGeometry(0.16, 0.2, 0.32, 10), base, -0.6, 1.16, 0.1);
        for (let i = 0; i < 4; i++) put('lampglass', new THREE.CylinderGeometry(0.04, 0.035, 0.1, 6), base, 0.1 + i * 0.16, 1.05, 0.25);
        put('planks', box(2.2, 0.08, 0.42), base, 0, 0.45, 1.9); put('frame', box(0.06, 0.45, 0.3), base, -0.95, 0.22, 1.9); put('frame', box(0.06, 0.45, 0.3), base, 0.95, 0.22, 1.9);
        const idx = signSet.list.length; signSet.list.push({ text: 'TEA  ' + money({ country: 'Nepal' }, 20), bg: '#203b30', fg: '#f2e6c8' });
        const g = new THREE.PlaneGeometry(2.4, 0.36), uv = g.attributes.uv, [u0, v0, du, dv] = signUV(idx);
        for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + du * (0.5 + (uv.getX(i) - 0.5) * 0.6), v0 + dv * uv.getY(i));
        put(signSet.key, g, base, 0, 1.25, 0.66);
      }
      colliders.push({ t: 'box', x0: x - 1.6, x1: x + 1.6, z0: z - 1.6, z1: z + 1.6, y1: 2.4 });
      rects.push({ x0: x - 1.6, x1: x + 1.6, z0: z - 1.6, z1: z + 1.6 });
    };
    stall(19, 139, -Math.PI / 2, true); stall(-19, 169, Math.PI / 2, true); stall(19, 169, -Math.PI / 2, false); stall(-21, 178, Math.PI / 2, false); stall(19, 179, -Math.PI / 2, true);
    buildSignAtlas(SIGNSETS.bazaar);
    signSet = SIGNSETS.town;
    places.push({ id: 'bazaar', label: 'Old Bazaar', verb: 'Tea and momo', x: 16.4, z: 139, r: 3.2, color: 0xc4553a, top: 3 });
  }
  { // stupa and pagoda temple: landmarks, always drawn, so the square reads from the ring road
    const keep = (m) => { m.userData.keep = 1; m.castShadow = true; m.receiveShadow = true; return m; };
    const white = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.85 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd4a640, roughness: 0.35, metalness: 0.6 });
    const brick = new THREE.MeshStandardMaterial({ color: 0x9a4a36, roughness: 0.9 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x4a2c1c, roughness: 0.8 });
    const g = new THREE.Group(); g.name = 'bazaar-landmarks'; g.userData.keep = 1;
    const lm = new Map();   // one merged mesh per material keeps the square to a handful of draws
    const at = (mesh, x, y, z) => {
      mesh.position.set(x, y, z);
      if (Array.isArray(mesh.material)) { g.add(keep(mesh)); return mesh; }
      mesh.updateMatrix(); const list = lm.get(mesh.material) || []; list.push(mesh.geometry.applyMatrix4(mesh.matrix)); lm.set(mesh.material, list); return mesh;
    };
    let y = PAVE_Y;
    for (const [s, h] of [[18, 0.6], [15, 0.6], [12.5, 0.5]]) { at(new THREE.Mesh(new THREE.BoxGeometry(s, h, s), white), CH.x, y + h / 2, CH.z); y += h; }
    at(new THREE.Mesh(new THREE.SphereGeometry(5.6, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2), white), CH.x, y, CH.z);
    y += 5.6;
    const ev = document.createElement('canvas'); ev.width = 256; ev.height = 160; const e2 = ev.getContext('2d');
    e2.fillStyle = '#d9a845'; e2.fillRect(0, 0, 256, 160);
    e2.fillStyle = '#1b1b1b'; e2.strokeStyle = '#1b1b1b'; e2.lineWidth = 7;
    for (const cx of [78, 178]) {
      e2.beginPath(); e2.moveTo(cx - 42, 64); e2.quadraticCurveTo(cx, 30, cx + 42, 64); e2.quadraticCurveTo(cx, 84, cx - 42, 64); e2.fillStyle = '#f6f2e8'; e2.fill(); e2.stroke();
      e2.fillStyle = '#2a4f8f'; e2.beginPath(); e2.arc(cx, 62, 11, 0, 6.283); e2.fill();
      e2.beginPath(); e2.moveTo(cx - 44, 36); e2.quadraticCurveTo(cx, 18, cx + 44, 36); e2.stroke();
    }
    e2.lineWidth = 6; e2.beginPath(); e2.moveTo(128, 86); e2.quadraticCurveTo(118, 112, 132, 122); e2.stroke();
    const eyeT = new THREE.CanvasTexture(ev); eyeT.colorSpace = THREE.SRGBColorSpace;
    const eyeM = new THREE.MeshStandardMaterial({ map: eyeT, roughness: 0.6 });
    at(new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 3.2), [eyeM, eyeM, gold, gold, eyeM, eyeM]), CH.x, y + 1.1, CH.z);
    y += 2.2;
    at(new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.3, 3.8), gold), CH.x, y + 0.15, CH.z); y += 0.3;
    for (let i = 0; i < 13; i++) { const r = 1.5 - i * 0.075; at(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.92, r, 0.42, 16), gold), CH.x, y + 0.21, CH.z); y += 0.42; }
    at(new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.7, 16), gold), CH.x, y + 0.35, CH.z); y += 0.7;
    at(new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8), gold), CH.x, y + 0.3, CH.z);
    const spireTop = y + 0.2;
    colliders.push({ t: 'box', x0: CH.x - 9, x1: CH.x + 9, z0: CH.z - 9, z1: CH.z + 9, y1: spireTop });
    const TX = -16.5, TZ = 141;
    let ty = PAVE_Y;
    for (const [s, h] of [[8.4, 0.5], [7.2, 0.5], [6.0, 0.5]]) { at(new THREE.Mesh(new THREE.BoxGeometry(s, h, s), brick), TX, ty + h / 2, TZ); ty += h; }
    at(new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.0, 4.4), brick), TX, ty + 1.5, TZ);
    at(new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 4.5), wood), TX, ty + 1.1, TZ);
    ty += 3.0;
    for (const [w, h] of [[8.0, 1.5], [5.8, 1.3], [3.8, 1.2]]) {
      const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.72, h, 4, 1, true), wood); roof.rotation.y = Math.PI / 4; roof.material.side = THREE.DoubleSide;
      at(roof, TX, ty + h / 2, TZ);
      at(new THREE.Mesh(new THREE.BoxGeometry(w * 0.38, 1.2, w * 0.38), brick), TX, ty + h + 0.6, TZ);
      ty += h + 1.2;
    }
    at(new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.4, 10), gold), TX, ty - 0.5, TZ);
    colliders.push({ t: 'box', x0: TX - 4.2, x1: TX + 4.2, z0: TZ - 4.2, z1: TZ + 4.2, y1: ty });
    for (const [mat, list] of lm) g.add(keep(new THREE.Mesh(mergeGeometries(list, false), mat)));
    scene.add(g);
    // prayer flags from the spire to the four corners of the square
    const flagCols = [0x2f5fb0, 0xf4f4f0, 0xc8352d, 0x2f8a4a, 0xf0c42e], fl = [];
    for (const [ex, ez] of [[-23, 135], [23, 135], [-23, 173], [23, 173]]) {
      const ax = CH.x, ay = spireTop - 2.5, az = CH.z, ey = PAVE_Y + 4.6, N = 30;
      for (let i = 1; i < N; i++) {
        const t = i / N, sag = Math.sin(t * Math.PI) * 1.4;
        fl.push({ x: ax + (ex - ax) * t, y: ay + (ey - ay) * t - sag, z: az + (ez - az) * t, ry: Math.atan2(-(ez - az), ex - ax), c: flagCols[i % 5] });
      }
    }
    const fg = new THREE.PlaneGeometry(0.34, 0.42); fg.translate(0, -0.21, 0);
    const flags = new THREE.InstancedMesh(fg, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }), fl.length);
    const fm = new THREE.Matrix4(), fq = new THREE.Quaternion(), fc = new THREE.Color();
    fl.forEach((f, i) => { fm.compose(new THREE.Vector3(f.x, f.y, f.z), fq.setFromAxisAngle(UP, f.ry), ONE); flags.setMatrixAt(i, fm); flags.setColorAt(i, fc.setHex(f.c)); });
    flags.instanceMatrix.needsUpdate = true; flags.instanceColor.needsUpdate = true; scene.add(flags);
  }

  // ---- props
  const mc = (v) => new THREE.Matrix4().makeTranslation(...v);
  const modelCache = {};
  async function model(name) { return modelCache[name] ||= gltf.loadAsync(`${PH}/models/${name}/${name}_1k.gltf`); }
  // instance every mesh of a PH model at many transforms. it: {x,z,ry,s,y}
  async function instanced(name, list, opt = {}) {
    if (!list.length) return null; const g = (await model(name)).scene; g.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(g); const out = { bb, h: bb.max.y - bb.min.y, root: new THREE.Group() }; if (!opt.hold) scene.add(out.root);
    const q = new THREE.Quaternion(), m4 = new THREE.Matrix4(), sc = new THREE.Vector3();
    g.traverse((o) => { if (!o.isMesh) return;
      const im = new THREE.InstancedMesh(o.geometry, o.material, list.length);
      list.forEach((it, i) => { const s = (it.s || 1) * (opt.scale || 1); m4.compose(new THREE.Vector3(it.x, (it.y ?? PAVE_Y) - bb.min.y * s, it.z), q.setFromAxisAngle(UP, it.ry || 0), sc.set(s, s, s)); m4.multiply(o.matrixWorld); im.setMatrixAt(i, m4); });
      im.castShadow = opt.shadow !== false; im.receiveShadow = true; im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); out.root.add(im); });
    return out;
  }
  const lampList = [], lampPts = [];
  // lamps on both kerbs of every street, arm over the road
  for (let t = -40; t <= 40; t += 16) for (const [px, pz, ux, uz] of [[t, -RING - 4.45, 0, 1], [t + 8, -RING + 4.45, 0, -1], [t, RING - 4.45, 0, 1], [t + 8, RING + 4.45, 0, -1]]) {
    if (Math.abs(px) <= 46) lampList.push({ x: px, z: pz, ry: Math.atan2(ux, uz) }); }
  for (let t = -32; t <= 32; t += 16) for (const [px, pz, ux, uz] of [[-RING - 4.45, t, 1, 0], [-RING + 4.45, t + 8, -1, 0], [RING - 4.45, t, 1, 0], [RING + 4.45, t + 8, -1, 0]]) lampList.push({ x: px, z: pz, ry: Math.atan2(ux, uz) });
  for (const [x, z] of [[-4, -14], [-4, 14], [-17, -20], [-17, 20], [-10, 0], [-24, 0], [8, -27], [20, -27], [8, 27], [20, 27], [14, 10], [14, -10], [28, 0], [3, 0]]) lampList.push({ x, z, ry: (x * 7 + z) % 6.28 });
  // 17 Oct, Chairman: nothing stands on the carriageway - drop lamps/trees whose spot falls on the ring road (|x| or |z| within 4 m of RING)
  const onRoad = (x, z) => (Math.abs(Math.abs(x) - RING) < 4.2 && Math.abs(z) < RING + 4.2) || (Math.abs(Math.abs(z) - RING) < 4.2 && Math.abs(x) < RING + 4.2);
  for (let i = lampList.length - 1; i >= 0; i--) if (onRoad(lampList[i].x, lampList[i].z)) lampList.splice(i, 1);
  for (const l of lampList) circles.push({ x: l.x, z: l.z, r: .25 });
  let lampGlass = null;
  { // procedural street lamp (the Poly Haven one is 18k triangles; 94 of them cost 1.7M per frame)
    const parts = [], glass = [];
    const cyl = (r0, r1, h, y, z = 0, seg = 8) => { const g = new THREE.CylinderGeometry(r0, r1, h, seg); g.translate(0, y, z); g.deleteAttribute('uv'); parts.push(g); };
    cyl(.2, .26, .5, .25); cyl(.1, .13, .3, .65); cyl(.055, .085, 4.6, 2.9);
    const arm = new THREE.BoxGeometry(.07, .07, 1.05); arm.translate(0, 5.18, .45); arm.deleteAttribute('uv'); parts.push(arm.toNonIndexed());
    const hd = new THREE.CylinderGeometry(.15, .34, .26, 8); hd.translate(0, 5.2, .95); hd.deleteAttribute('uv'); parts.push(hd);
    const bulb = new THREE.SphereGeometry(.14, 8, 6); bulb.translate(0, 5.04, .95); bulb.deleteAttribute('uv'); glass.push(bulb);
    const norm = (g) => (g.index ? g.toNonIndexed() : g);
    const mg = mergeGeometries(parts.map(norm), false), gg = mergeGeometries(glass.map(norm), false);
    const lampFrame = camFadeMat(M('frame').clone()); lampGlass = camFadeMat(M('lampglass').clone());
    const lm = new THREE.InstancedMesh(mg, lampFrame, lampList.length), lg = new THREE.InstancedMesh(gg, lampGlass, lampList.length); lm.name = 'lamp'; lg.name = 'lamp'; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    lampList.forEach((l, i) => { m4.compose(new THREE.Vector3(l.x, PAVE_Y, l.z), q.setFromAxisAngle(UP, l.ry), ONE); lm.setMatrixAt(i, m4); lg.setMatrixAt(i, m4); });
    lm.castShadow = true; lm.receiveShadow = true; for (const im of [lm, lg]) { im.computeBoundingSphere(); scene.add(im); } }
  const lampM = { bb: { max: { y: 5.3 / .94, z: 0.95 / .75 } } };
  { // glow sprites + ground pools at each lamp head
    const lb = lampM.bb; const tipY = lb.max.y * .94, off = lb.max.z * .75;
    const gp = [], pools = new THREE.Group();
    for (const l of lampList) { const hx = l.x + Math.sin(l.ry) * off, hz = l.z + Math.cos(l.ry) * off; gp.push(hx, PAVE_Y + tipY, hz); lampPts.push([hx, hz]); }
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,230,170,1)'); gr.addColorStop(.25, 'rgba(255,200,120,.45)'); gr.addColorStop(1, 'rgba(255,190,100,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const gt = new THREE.CanvasTexture(c); const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
    const glowM = new THREE.PointsMaterial({ map: gt, size: touch ? 38 : 46, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const glow = new THREE.Points(geo, glowM); glow.frustumCulled = false; scene.add(glow);
    const poolG = new THREE.CircleGeometry(4.2, 20); poolG.rotateX(-Math.PI / 2);
    const poolM = new THREE.MeshBasicMaterial({ map: gt, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, polygonOffset: true, polygonOffsetFactor: -3 });
    const pool = new THREE.InstancedMesh(poolG, poolM, lampPts.length); const m4 = new THREE.Matrix4(); lampPts.forEach(([x, z], i) => { m4.makeTranslation(x, PAVE_Y + 0.03, z); pool.setMatrixAt(i, m4); }); pool.frustumCulled = false; scene.add(pool);
    look.hooks.lamps = (night) => { glowM.opacity = night * .9; poolM.opacity = night * .75; if (lampGlass) lampGlass.emissiveIntensity = 0.1 + 3 * night; M('sign:atlas').emissiveIntensity = .04 + .75 * night; M('sign:atlas2').emissiveIntensity = .04 + .75 * night; for (const k in look.custom) if (k.startsWith('back:')) look.custom[k].emissiveIntensity = .45 + .6 * night; if (look.hooks.skyline) look.hooks.skyline.emissiveIntensity = night * .8; };
  }
  onProgress(.4);

  // trees: leaf-card crowns on bark trunks from the redesign kit
  const treeList = [];
  const addTree = (x, z, s = 1) => { if (onRoad(x, z)) return; treeList.push({ x, z, s: s * (0.85 + rand() * 0.4), ry: rand() * 6.28 }); circles.push({ x, z, r: .4 }); };
  for (let t = -36; t <= 36; t += 12) { addTree(t + 4, -RING + 7.6); addTree(t + 4, RING - 7.6); addTree(-RING + 7.6, t + 4 * 0); addTree(RING - 7.6, t); }
  { const spots = [[-28, -26], [-22, -28], [-10, -28], [-6, -22], [-28, -14], [-26, -4], [-28, 8], [-26, 18], [-6, 14], [-8, 24], [-14, 28], [-24, 26], [-6, 28], [-12, -14], [-24, -16], [-20, 12], [-12, 14], [-28, 28], [-5, -10], [-30, 0]];
    for (const [x, z] of spots) addTree(x, z, 1.15); for (const [x, z] of [[3, -30], [26, -30], [30, -12], [30, 12], [3, 30], [26, 30]]) addTree(x, z, 1.0); }
  for (let z = -90; z >= -150; z -= 28) addTree(-10, z, 1.2);
  for (let z = -310; z >= -540; z -= 28) addTree(-10, z, 1.2);
  for (const [x, z] of [[-23, 137], [23, 137], [-23, 171], [23, 171]]) addTree(x, z, 1.1);
  // trees don't grow through the pond or paths
  const trees = treeList.filter(t => Math.hypot(t.x - PX, t.z - PZ) > 11.5 || Math.hypot(t.x - PX, t.z - PZ) < 0);
  const treeKit = createTreeKit(touch);
  treeKit.plant(scene, trees.map((t) => ({ x: t.x, y: PAVE_Y, z: t.z, s: t.s * 0.85, ry: t.ry, kind: t.z < -80 ? 'tall' : 'street' })));
  for (let i = 0; i < trees.length * 4; i++) rand();   // four draws per tree keep the stall and prop layout below fixed
  function M2(k) { return M(k); }

  // benches (Poly Haven) + seat points for sitters; planters, tables
  const benchList = [];
  for (let a = 0; a < 6; a++) { const th = a / 6 * Math.PI * 2 + .3; benchList.push({ x: PX + Math.cos(th) * 11.3, z: PZ + Math.sin(th) * 11.3, ry: Math.atan2(-Math.cos(th), -Math.sin(th)) + 0 }); }
  benchList.push({ x: -6.5, z: -18, ry: -Math.PI / 2 }, { x: -6.5, z: 18, ry: -Math.PI / 2 }, { x: -27, z: -22, ry: Math.PI / 2 }, { x: -27, z: 22, ry: Math.PI / 2 }, { x: 14 + 7.5, z: 7.5, ry: Math.PI * .75 }, { x: 14 - 7.5, z: -7.5, ry: -Math.PI * .25 }, { x: 14 + 7.5, z: -7.5, ry: Math.PI * 1.25 }, { x: 14 - 7.5, z: 7.5, ry: Math.PI * .25 });
  // Poly Haven props wait for the first tap (they are 2.3 MB of the phone's first load)
  const props = [];
  const instancedLater = (name, list, opt) => { props.push([name, list, opt]); };
  instancedLater('painted_wooden_bench', benchList);
  const benches = benchList.map(b => ({ x: b.x, z: b.z, ry: b.ry })); for (const b of benchList) circles.push({ x: b.x, z: b.z, r: .8 });
  const tableList = [{ x: -21.5, z: -FRONT + 1.0, ry: 0 }, { x: -17.2, z: -FRONT + 1.0, ry: .5 }];
  // the cafe sits at N side start: tables right in front of it
  const cafe = buildings.find(b => b.place === 'cafe'); tableList[0] = { x: cafe.x - 2.1, z: cafe.z + 1.5, ry: 0 }; tableList[1] = { x: cafe.x + 2.4, z: cafe.z + 1.5, ry: .6 };
  instancedLater('outdoor_table_chair_set_01', tableList); for (const t of tableList) circles.push({ x: t.x, z: t.z, r: .9 });
  instancedLater('standing_chalkboard_01', [{ x: cafe.x + 0.2, z: cafe.z + 1.3, ry: Math.PI * 0.05 }]);
  const planters = [[-4, -30], [-4, 30], [30, -30], [30, 30], [8, -10], [20, 10], [20, -10], [8, 10]].map(([x, z]) => ({ x, z, ry: (x + z) % 3 }));
  instancedLater('planter_box_01', planters);
  treeKit.hedge(scene, planters.map((p) => [p.x - .45, p.z, p.x + .45, p.z]), { y: PAVE_Y + .5, h: .55, w: .5, per: 90 });
  for (const p of planters) circles.push({ x: p.x, z: p.z, r: .6 });
  const bins = [[-FRONT + 2, 10], [FRONT - 2, -10], [10, -FRONT + 2], [-10, FRONT - 2], [3, 0], [25, 5], [-7, 5], [-13, -10]].map(([x, z]) => ({ x, z, ry: 0 })); instancedLater('metal_trash_can', bins); for (const b of bins) circles.push({ x: b.x, z: b.z, r: .35 });
  instancedLater('CoffeeCart_01', [{ x: 28, z: -3, ry: Math.PI / 2 }]); circles.push({ x: 28, z: -3, r: 1.6 });
  cur = 'M'; for (const [x, z, r] of [[31, -3.8, .3], [31.5, -2.6, .9], [4, -29.6, .2], [18, -29.6, .8]]) { const base = new THREE.Matrix4().compose(new THREE.Vector3(x, PAVE_Y, z), new THREE.Quaternion().setFromAxisAngle(UP, r), ONE); put('planks', box(.7, .5, .7), base, 0, .25, 0); }
  onProgress(.55);

  // fountain: lathe basin, pedestal, water, animated jets
  { const fm = M2('concrete'); const prof = [[4.3, 0], [5.15, 0], [5.15, .75], [4.55, .75], [4.55, .2], [0.001, .2]].map(([r, y]) => new THREE.Vector2(r, y));
    const basin = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), fm); basin.material.side = THREE.DoubleSide; basin.position.set(FX, PAVE_Y, FZ); basin.castShadow = basin.receiveShadow = true; scene.add(basin);
    const ped = new THREE.Mesh(new THREE.LatheGeometry([[1.5, 0], [1.7, .0], [1.7, .6], [.9, .9], [.45, 1.0], [.45, 2.2], [.8, 2.35], [.001, 2.4]].map(([r, y]) => new THREE.Vector2(r, y)), 28), fm); ped.position.set(FX, PAVE_Y + .2, FZ); ped.castShadow = true; scene.add(ped);
    const water = new THREE.Mesh(new THREE.CircleGeometry(4.55, 40), M2('water')); water.rotation.x = -Math.PI / 2; water.position.set(FX, PAVE_Y + .58, FZ); scene.add(water);
    circles.push({ x: FX, z: FZ, r: 5.5 });
    const N = touch ? 24 : 96, dropG = new THREE.SphereGeometry(.07, 5, 4), drops = new THREE.InstancedMesh(dropG, new THREE.MeshStandardMaterial({ color: 0xdff4ff, roughness: .1, transparent: true, opacity: .8 }), N); drops.frustumCulled = false; scene.add(drops);
    const d4 = new THREE.Matrix4();
    upd.push((t) => { for (let i = 0; i < N; i++) { const k = i % 12, ph = ((t * .7 + Math.floor(i / 12) / 8) % 1), th = k / 12 * 6.283, r = 2.9 * ph + .1; const y = 2.5 + 2.4 * ph - 5.5 * ph * ph; d4.makeTranslation(FX + Math.cos(th) * r, PAVE_Y + .2 + Math.max(.38, y), FZ + Math.sin(th) * r); drops.setMatrixAt(i, d4); } drops.instanceMatrix.needsUpdate = true; water.position.y = PAVE_Y + .58 + Math.sin(t * 1.3) * .006; }); }
  // pond in the park
  { const pond = new THREE.Mesh(new THREE.CircleGeometry(6.4, 36), M2('water')); pond.rotation.x = -Math.PI / 2; pond.position.set(PX, PAVE_Y + .03, PZ); scene.add(pond);
    const rim = new THREE.Mesh(new THREE.RingGeometry(6.3, 7.1, 36), M2('concrete')); rim.rotation.x = -Math.PI / 2; rim.position.set(PX, PAVE_Y + .04, PZ); rim.receiveShadow = true; scene.add(rim); circles.push({ x: PX, z: PZ, r: 7 }); }
  // hedge line between park and plaza, with gates
  { const hedge = []; const gates = [[-5, 5], [-21, -15], [15, 21]]; const cut = (z) => gates.some(([a, b]) => z > a && z < b);
    for (let z = -31.5; z <= 31.5; z += 1.5) if (!cut(z)) { hedge.push(z); }
    const runs = []; for (const z of hedge) { const r = runs[runs.length - 1]; if (r && z - r.z1 < 1.7) r.z1 = z; else runs.push({ z0: z, z1: z }); }
    treeKit.hedge(scene, runs.map((r) => [-4, r.z0 - .75, -4, r.z1 + .75]), { y: PAVE_Y, h: 0.95, w: 1.1 });
    for (const r of runs) { rects.push({ x0: -4.7, x1: -3.3, z0: r.z0 - .8, z1: r.z1 + .8 }); colliders.push({ t: 'box', x0: -4.7, x1: -3.3, z0: r.z0 - .8, z1: r.z1 + .8, y1: 1 }); } }
  // market stalls
  const stalls = []; { const sg = []; const prodC = [0xd9442e, 0xf0b429, 0x7ab648, 0xe98a2b, 0x9c3b6b, 0xf6e27a]; const pg = [];
    for (const [x, z, face] of [[7, -26, 1], [14, -26, 1], [21, -26, 1], [7, 26, -1], [14, 26, -1], [21, 26, -1]]) {
      const base = new THREE.Matrix4().compose(new THREE.Vector3(x, PAVE_Y, z), new THREE.Quaternion().setFromAxisAngle(UP, face > 0 ? 0 : Math.PI), ONE); cur = 'M';
      put('planks', box(3.2, 1.0, 1.1), base, 0, .5, 0.2); put('frame', box(.08, 2.5, .08), base, -1.6, 1.25, -.7); put('frame', box(.08, 2.5, .08), base, 1.6, 1.25, -.7);
      put('frame', box(.08, 2.1, .08), base, -1.6, 1.05, .75); put('frame', box(.08, 2.1, .08), base, 1.6, 1.05, .75); put('planks', box(3.3, .08, .08), base, 0, 2.1, -.7);
      const k = awningMat(...(face > 0 ? ['#c7553d', '#f4ead6'] : ['#2f6b8a', '#f4ead6'])); put('awn:' + k, plane(3.6, 2.3), base, 0, 2.3, .05, 0, -Math.PI / 2 + .12);
      for (let i = 0; i < 9; i++) { const g = new THREE.SphereGeometry(.13, 8, 6); g.translate(-1.2 + (i % 5) * .6 + (i >= 5 ? .3 : 0), 1.1 + (i >= 5 ? .12 : 0), .0 + (i >= 5 ? .4 : .1) - .1); g.applyMatrix4(base); const c = new THREE.Color(prodC[(i + x) % prodC.length | 0]); const n = g.attributes.position.count, cols = new Float32Array(n * 3); for (let j = 0; j < n; j++) { cols[j * 3] = c.r; cols[j * 3 + 1] = c.g; cols[j * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.deleteAttribute('uv'); pg.push(g); }
      colliders.push({ t: 'box', x0: x - 1.7, x1: x + 1.7, z0: z - 1.0, z1: z + 1.0, y1: 2.4 }); rects.push({ x0: x - 1.7, x1: x + 1.7, z0: z - 1.0, z1: z + 1.0 }); stalls.push({ x, z, face }); }
    const pm = new THREE.Mesh(mergeGeometries(pg, false), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6 })); pm.castShadow = true; scene.add(pm); }
  onProgress(.65);

  flush();
  onProgress(.8);

  // ---- nav helpers for NPC pathing
  const nav = { circles, rects, zebras, bound: BOUND - 1, ring: RING };
  // poi lists
  const find = (p) => buildings.find(b => b.place === p);
  const pois = {
    cafe: [-2.3, 0.2, 2.6, 4.5].map((dx) => ({ x: cafe.x + dx, z: cafe.z + 3.3 + (dx > 3 ? 0.4 : 0), face: Math.atan2(cafe.n[0], cafe.n[1]) + Math.PI, work: dx < -1 })),
    street: [{ x: 8, z: 8 }, { x: 20, z: 9 }, { x: 18, z: -8 }, { x: 9, z: -9 }, { x: 24, z: 0 }, { x: 6, z: 0 }, { x: 14, z: 13 }, { x: 14, z: -13 }, { x: 2, z: 22 }, { x: 26, z: -20 }, { x: 26, z: 20 }, { x: 11, z: -20 }],
    park: [{ x: PX + 9.3, z: PZ + 4 }, { x: PX - 5, z: PZ + 9.3 }, { x: PX + 3, z: PZ - 9.3 }, { x: PX - 9.4, z: PZ - 3 }, { x: -12, z: -22 }, { x: -22, z: 21 }, { x: -9, z: 21 }],
    shop: buildings.filter(b => !b.home && !b.place && b.kind !== 'lobby' && !b.district).map(b => ({ ...b.door, inside: true })),
    apartments: buildings.filter(b => b.home && !b.district).map(b => ({ ...b.door, inside: true })),
    office: [{ ...find('work').door, inside: true }], college: [{ ...find('college').door, inside: true }], gym: [{ ...find('gym').door, inside: true }], bank: [{ ...find('bank').door, inside: true }]
  };
  pois.seats = benches.map(b => ({ x: b.x, z: b.z, ry: b.ry }));
  onProgress(1);


  function rideMesh(kind, color) {
    const g = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.35 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.75 });
    const wheelG = new THREE.TorusGeometry(kind === 'moto' ? 0.4 : 0.34, 0.045, 6, 14);
    wheelG.rotateY(Math.PI / 2);
    for (const z of (kind === 'moto' ? [-0.72, 0.78] : [-0.55, 0.55])) {
      const m = new THREE.Mesh(wheelG, dark); m.position.set(0, kind === 'moto' ? 0.42 : 0.36, z); m.name = 'wheel'; g.add(m);
    }
    if (kind === 'cycle') {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 1.2), metal); bar.position.set(0, 0.52, 0); g.add(bar);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 0.04), metal); post.position.set(0, 0.66, -0.22); g.add(post);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.28), dark); seat.position.set(0, 0.84, -0.2); g.add(seat);
      const fork = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.36, 0.04), metal); fork.position.set(0, 0.55, 0.55); g.add(fork);
      const hb = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 0.04), metal); hb.position.set(0, 0.76, 0.55); g.add(hb);
    } else {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 1.4), metal); body.position.set(0, 0.64, 0.05); g.add(body);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.42), dark); seat.position.set(0, 0.86, -0.28); g.add(seat);
      const tank = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.42), metal); tank.position.set(0, 0.86, 0.28); g.add(tank);
      const hb = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.045, 0.045), dark); hb.position.set(0, 0.98, 0.72); g.add(hb);
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.06), new THREE.MeshStandardMaterial({ color: 0xfff2cc, emissive: 0xffe0a0, emissiveIntensity: 0.7 }));
      light.position.set(0, 0.74, 0.76); g.add(light);
    }
    return g;
  }
  const rides = [];
  for (const [kind, color, x, z, ry] of [['cycle', 0x2f6b45, 9, 12, 0.4], ['moto', 0xc4553a, 8, 8, -0.2]]) {
    const mesh = rideMesh(kind, color); mesh.position.set(x, PAVE_Y, z); mesh.rotation.y = ry; mesh.traverse((o) => { o.userData.keep = 1; }); scene.add(mesh);
    rides.push({ kind, mesh });
  }

  const campus = await buildAit({ scene, look, touch, colliders, circles, places, anchor: { x: HW.gateX, z: HW.gateZ } });
  const highway = { x: 0, z: -339, w: HW.w, gateX: HW.gateX, gateZ: HW.gateZ, mid: -339, segs: [[0, -36], [0, -160], [56, -160], [56, -280], [0, -280], [0, FIELD_Z1], [HW.gateX, HW.gateZ]] };
  const mapGeo = {
    pave: [-60, -60, 120, 120], park: [-32, -32, 28, 64], plaza: [-3, -32, 35, 64],
    pond: [-17, 0, 6.4], fountain: [FX, FZ, 4.55],
    townRoads: [[0, -RING, 88, 8], [0, RING, 88, 8], [-RING, 0, 8, 72], [RING, 0, 8, 72],
      [0, RR.n, RR.x * 2 + RR.w, RR.w], [RR.x, (RR.n + RR.s) / 2, RR.w, RR.s - RR.n], [-RR.x, (RR.n + RR.s) / 2, RR.w, RR.s - RR.n], [0, RR.s, RR.x * 2 + RR.w, RR.w],
      [0, RR.bz, RR.x * 2, RR.w], [0, 150, 7, 156], [0, CH.z, 148, 7]]
  };
  places.push({ id: 'fields', label: 'Fields', verb: 'The fields', x: 0, z: highway.mid, r: 18, color: 0x6a8f4a });
  const land = campus.area || campus.box;
  let crops = null;
  {
    const hit = (p, b) => b && !(p.x1 < b.x0 || p.x0 > b.x1 || p.z1 < b.z0 || p.z0 > b.z1);
    crops = buildRoadFields({ scene, touch, treeKit, look, region: { x0: -88, x1: 128, z0: -546, z1: -322, road: [-15, 15] }, avoid: (p) => hit(p, campus.box) });
    const fs0 = look.followSun; look.followSun = (x, z) => { fs0(x, z); crops.update(x, z); };
    if (campus.map) { const f = (campus.map.fields ||= { plots: [], tracks: [] }); f.plots.push(...crops.map.plots); f.tracks.push(...crops.map.tracks); }
  }
  const bound = {
    x0: Math.min(-360, land.x0 - 24),
    x1: Math.max(360, land.x1 + 24),
    z0: Math.min(-360, land.z0 - 24),
    z1: Math.max(360, land.z1 + 24),
  };
  const casino = buildCasino({ scene, look, colliders });
  casino.street = places.find((p) => p.id === 'casino') || null;

  const lots = lotGrid();
  const lotCols = [];
  const plotG = new THREE.PlaneGeometry(13.2, 15.2); plotG.rotateX(-Math.PI / 2);
  const plotM = M('grass').clone(); plotM.color.set(0xffffff);
  const plots = new THREE.InstancedMesh(plotG, plotM, lots.length);
  const curbParts = [];
  const curbBox = (w, h, d, x, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, h / 2, z); curbParts.push(g); };
  curbBox(13.2, 0.16, 0.16, 0, -7.6); curbBox(13.2, 0.16, 0.16, 0, 7.6); curbBox(0.16, 0.16, 15.2, -6.6, 0); curbBox(0.16, 0.16, 15.2, 6.6, 0);
  const curbs = new THREE.InstancedMesh(mergeGeometries(curbParts, false), M('kerb'), lots.length);
  // a two-storey plot house (wall, floor band, roof slab and parapet, framed windows with sills, doors, roof tank) in one instanced draw
  const houseG = (() => {
    const P = { wall: [], trim: [], glass: [], planks: [], frame: [], tank: [] };
    const add = (k, g, x, y, z, ry = 0) => { g.rotateY(ry); g.translate(x, y, z); P[k].push(g.index ? g.toNonIndexed() : g); };
    add('wall', box(7.4, 6.2, 6.4), 0, 3.1, 0);
    add('trim', box(7.6, 0.24, 6.6), 0, 3.15, 0); add('trim', box(7.7, 0.22, 6.7), 0, 6.3, 0);
    for (const [w, d, x, z] of [[7.7, 0.16, 0, 3.27], [7.7, 0.16, 0, -3.27], [0.16, 6.4, 3.77, 0], [0.16, 6.4, -3.77, 0]]) add('trim', box(w, 0.75, d), x, 6.78, z);
    for (const [ry, half, n] of [[0, 3.2, 2], [Math.PI, 3.2, 2], [Math.PI / 2, 3.7, 1], [-Math.PI / 2, 3.7, 1]]) {
      const span = ry === 0 || ry === Math.PI ? 7.4 : 6.4;
      for (const fy of [0, 3.1]) for (let i = 0; i < n; i++) {
        const u = n === 1 ? 0 : (i - 0.5) * span * 0.5, isDoor = fy === 0 && i === 0 && (ry === 0 || ry === Math.PI);
        const c = Math.cos(ry), s = Math.sin(ry), at = (du, dn) => [u * c + dn * s + du * c, -u * s + dn * c - du * s];
        if (isDoor) { const [x, z] = at(0, half + 0.02); add('planks', box(1.0, 2.15, 0.06), x, 1.08, z, ry); const [fx, fz] = at(0, half + 0.03); add('frame', box(1.16, 0.08, 0.08), fx, 2.19, fz, ry); continue; }
        const y = fy + 1.65, [x, z] = at(0, half + 0.02); add('glass', box(1.15, 1.3, 0.05), x, y, z, ry);
        const [sx, sz] = at(0, half + 0.08); add('trim', box(1.4, 0.08, 0.18), sx, y - 0.7, sz, ry); add('trim', box(1.4, 0.14, 0.1), sx, y + 0.72, sz, ry);
        { const [mx, mz] = at(0, half + 0.05); add('frame', box(0.06, 1.3, 0.06), mx, y, mz, ry); }
      }
    }
    const tank = new THREE.CylinderGeometry(0.55, 0.55, 1.1, 14); add('tank', tank, -2.2, 7.0, -1.6);
    const order = ['wall', 'trim', 'glass', 'planks', 'frame', 'tank'];
    return mergeGeometries(order.map((k) => mergeGeometries(P[k], false)), true);
  })();
  const houses = new THREE.InstancedMesh(houseG, [M('wall:plaster'), M('trim'), M('glass'), M('planks'), M('frame'), new THREE.MeshStandardMaterial({ color: 0x1b1c1e, roughness: 0.45 })], lots.length);
  const HOUSE_TINTS = [0xffffff, 0xf3d9c8, 0xdfe6d2, 0xd8e2ea, 0xf0e2c0];
  houses.setColorAt(0, new THREE.Color(1, 1, 1));
  plots.receiveShadow = true; curbs.receiveShadow = true; houses.castShadow = true; houses.receiveShadow = true;
  scene.add(plots, curbs, houses);
  const saleSigns = buildSaleSigns(scene, lots.length);
  const SALE_COL = 0xd6c36a;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), col = new THREE.Color();
  function paintLots(state) {
    const paint = lotPaint(state);
    lotCols.length = 0;
    const sale = (mapGeo.sale = []);
    let built = 0;   // only built lots are drawn (an empty lot as a shrunk instance still costs its triangles, twice with shadows)
    lots.forEach((lot, i) => {
      const on = paint[i];
      if (on.color === SALE_COL && !on.built) {
        // board on the lot edge that faces the town centre (or the road out, for the lots beside it)
        const byZ = Math.abs(lot.x) < Math.abs(lot.z), s = byZ ? -Math.sign(lot.z) : -Math.sign(lot.x);
        const x = byZ ? lot.x + 4.2 : lot.x + s * 6.0, z = byZ ? lot.z + s * 7.0 : lot.z + 4.6;
        saleSigns.at(sale.length, x, PAVE_Y, z, byZ ? (s > 0 ? 0 : Math.PI) : (s > 0 ? Math.PI / 2 : -Math.PI / 2));
        sale.push([lot.x, lot.z]);
      }
      m4.compose(new THREE.Vector3(lot.x, PAVE_Y + 0.03, lot.z), q, sc.set(1, 1, 1));
      plots.setMatrixAt(i, m4); plots.setColorAt(i, col.setHex(on.color));
      curbs.setMatrixAt(i, m4);
      if (on.built) {
        m4.compose(new THREE.Vector3(lot.x, PAVE_Y, lot.z), q, sc.set(1, 1, 1));
        houses.setMatrixAt(built, m4); houses.setColorAt(built, col.setHex(HOUSE_TINTS[i % HOUSE_TINTS.length])); built++;
        lotCols.push({ t: 'box', x0: lot.x - 3.8, x1: lot.x + 3.8, z0: lot.z - 3.3, z1: lot.z + 3.3, y1: 7.2 });
      }
    });
    houses.count = built; houses.boundingSphere = null; saleSigns.done(sale.length);
    plots.instanceMatrix.needsUpdate = true; if (plots.instanceColor) plots.instanceColor.needsUpdate = true;
    curbs.instanceMatrix.needsUpdate = true; houses.instanceMatrix.needsUpdate = true; if (houses.instanceColor) houses.instanceColor.needsUpdate = true;
  }
  paintLots(null);

  const gate = campus.spawn || { x: HW.gateX, z: HW.gateZ + 20 };
  const boards = createBoards(THREE, scene, [
    { name: 'board-square', x: 16, y: 3.15, z: -31, ry: 0, w: 9, h: 3.2 },
    { name: 'board-gate', x: gate.x + 12, y: 2.35, z: gate.z + 2, ry: -Math.PI / 2, w: 4.2, h: 1.7, small: true }
  ]);
  colliders.push({ t: 'box', x0: 11.3, x1: 20.7, z0: -31.45, z1: -30.55, y1: 5 });
  colliders.push({ t: 'box', x0: gate.x + 11.7, x1: gate.x + 12.4, z0: gate.z - 0.2, z1: gate.z + 4.2, y1: 3.4 });
  const richSpots = [
    { name: 'rich-square', x: -14, y: 2.2, z: -18, ry: 0, w: 4.8, h: 2.8 },
    { name: 'rich-bazaar', x: 24, y: 3.4, z: 146, ry: Math.PI, w: 4.4, h: 2.5 },
    { name: 'rich-aitroad', x: 12, y: 3.3, z: -110, ry: -Math.PI / 2, w: 4.4, h: 2.5 },
    { name: 'rich-gate', x: gate.x + 18, y: 3.2, z: gate.z - 6, ry: -Math.PI / 2, w: 4.4, h: 2.5 },
    { name: 'rich-fields', x: 68, y: 3.3, z: -220, ry: -Math.PI / 2, w: 4.4, h: 2.5 },
    { name: 'rich-ring', x: 64, y: 3.4, z: -64, ry: Math.PI * 0.75, w: 4.4, h: 2.5 },
    { name: 'rich-rent', x: 248, y: 3.4, z: 16, ry: 0, w: 4.4, h: 2.5 }
  ];
  const rich = createRichBoards(THREE, scene, richSpots);
  for (const s of richSpots) colliders.push({ t: 'box', x0: s.x - 0.35, x1: s.x + 0.35, z0: s.z - 0.35, z1: s.z + 0.35, y1: s.y + 1.2 });
  const homes = buildHomes({ scene, look, places, colliders, buildings, mapGeo });
  const stream = createStream({ scene, THREE, look, buildings, campus });
  return { tables: tableList, colliders, places, buildings, nav, pois, benches, async loadProps(prep) {
    const outs = await Promise.all(props.splice(0).map(([n, l, o]) => instanced(n, l, { ...o, hold: true })));
    const grp = new THREE.Group(); grp.name = 'props'; for (const o of outs) if (o) grp.add(o.root);
    grp.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const list = Array.isArray(o.material) ? o.material : [o.material];
      if (list.some((m) => m && m.userData && m.userData.camFade)) return;
      const one = (m) => camFadeMat(m.clone());
      o.material = Array.isArray(o.material) ? list.map(one) : one(list[0]);
    });
    if (prep) await prep(grp); scene.add(grp);
  }, lampPts, stalls, update: (t) => upd.forEach(f => f(t)), camFade: camFadeTick, fountain: { x: FX, z: FZ }, ring: RING, sideGroups, signTexture, campus, lots, lotCols, paintLots, rides, casino, highway, bound, mapGeo, stream, crops, homes, boards, rich };
}
