// Shared kit for the neighbourhoods (homes.js) and the home interiors (interiors.js): batched boxes in metre UVs,
// merged into one mesh per material, plus the few materials the town did not need (tin, tarp, marble, fabric).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function boxG(w, h, d, tm = 1) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let i = 0; i < uv.count; i++) { const f = dims[Math.floor(i / 4)]; uv.setXY(i, uv.getX(i) * f[0] / tm, uv.getY(i) * f[1] / tm); }
  return g;
}
export function planeG(w, d, tm = 1) {
  const g = new THREE.PlaneGeometry(w, d), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / tm, uv.getY(i) * d / tm);
  g.rotateX(-Math.PI / 2); return g;
}
// One batch = one group of merged meshes. at(x, z, ry) sets the transform for the next pieces.
export function makeBatch() {
  const lists = {}; let T = new THREE.Matrix4();
  const push = (key, g) => { g.applyMatrix4(T); (lists[key] ||= []).push(g.index ? g.toNonIndexed() : g); };
  const B = {
    lists,
    at(x, z, ry = 0, y = 0) { T = new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z); return B; },
    box(key, w, h, d, x, y, z, ry = 0, tm = 1) { if (w <= 0 || h <= 0 || d <= 0) return; const g = boxG(w, h, d, tm); if (ry) g.rotateY(ry); g.translate(x, y, z); push(key, g); },
    tilt(key, w, h, d, x, y, z, rx, ry = 0, tm = 1) { const g = boxG(w, h, d, tm); g.rotateX(rx); if (ry) g.rotateY(ry); g.translate(x, y, z); push(key, g); },
    cyl(key, r0, r1, h, x, y, z, seg = 12) { const g = new THREE.CylinderGeometry(r0, r1, h, seg); g.translate(x, y, z); push(key, g); },
    ball(key, r, x, y, z, sy = 1) { const g = new THREE.SphereGeometry(r, 12, 8); g.scale(1, sy, 1); g.translate(x, y, z); push(key, g); },
    flat(key, w, d, x, y, z, ry = 0, tm = 1) { const g = planeG(w, d, tm); if (ry) g.rotateY(ry); g.translate(x, y, z); push(key, g); },
    geo(key, g) { push(key, g); },
    // wall with rectangular holes: opens = [[x0, x1, y0, y1]] along local x, y from y0 of the wall
    wall(key, x0, x1, y0, h, z, t, opens = [], ry = 0) {
      let cx = x0;
      for (const o of [...opens].sort((a, b) => a[0] - b[0])) {
        if (o[0] > cx) B.box(key, o[0] - cx, h, t, (cx + o[0]) / 2, y0 + h / 2, z, ry);
        if (o[2] > 0) B.box(key, o[1] - o[0], o[2], t, (o[0] + o[1]) / 2, y0 + o[2] / 2, z, ry);
        if (o[3] < h) B.box(key, o[1] - o[0], h - o[3], t, (o[0] + o[1]) / 2, y0 + (o[3] + h) / 2, z, ry);
        cx = o[1];
      }
      if (cx < x1) B.box(key, x1 - cx, h, t, (cx + x1) / 2, y0 + h / 2, z, ry);
    },
    // a window or door in a front wall at local z = zf (facing +z): frame, glass, sill, chajja sunshade, grill
    win(x, y, w, h, zf, o = {}) {
      const fk = o.frame || 'frame', fz = zf - 0.06;
      B.box(fk, w, 0.06, 0.08, x, y + h / 2 - 0.03, fz); B.box(fk, w, 0.06, 0.08, x, y - h / 2 + 0.03, fz);
      B.box(fk, 0.06, h, 0.08, x - w / 2 + 0.03, y, fz); B.box(fk, 0.06, h, 0.08, x + w / 2 - 0.03, y, fz);
      if (w > 0.8) B.box(fk, 0.045, h, 0.06, x, y, fz);
      B.box(o.glass || 'glass', w - 0.08, h - 0.08, 0.02, x, y, fz - 0.02);
      if (o.sill !== false) B.box('trim', w + 0.2, 0.07, 0.3, x, y - h / 2 - 0.035, zf + 0.06);
      if (o.chajja) B.box('trim', w + 0.5, 0.08, 0.55, x, y + h / 2 + 0.2, zf + 0.22);
      if (o.grill) { const n = Math.max(3, Math.round(w / 0.13)); for (let i = 1; i < n; i++) B.box('rail', 0.016, h - 0.06, 0.016, x - w / 2 + i * w / n, y, zf + 0.05); B.box('rail', w, 0.02, 0.02, x, y, zf + 0.05); }
    },
    door(x, w, h, zf, o = {}) {
      B.box(o.frame || 'frame', w + 0.14, 0.08, 0.1, x, h + 0.04, zf); B.box(o.frame || 'frame', 0.07, h, 0.1, x - w / 2 - 0.035, h / 2, zf); B.box(o.frame || 'frame', 0.07, h, 0.1, x + w / 2 + 0.035, h / 2, zf);
      B.box(o.leaf || 'planks', w, h, 0.05, x, h / 2, zf - 0.04);
      if (o.step !== false) B.box('concrete', w + 0.6, 0.16, 0.5, x, 0.08, zf + 0.25);
    },
    rail(x0, x1, y, z, h = 1.0, ry = 0) {   // balcony railing along local x
      const n = Math.max(2, Math.round((x1 - x0) / 0.12));
      B.box('rail', x1 - x0, 0.05, 0.05, (x0 + x1) / 2, y + h, z, ry); B.box('rail', x1 - x0, 0.03, 0.03, (x0 + x1) / 2, y + 0.1, z, ry);
      for (let i = 0; i <= n; i++) B.box('rail', 0.016, h, 0.016, x0 + i * (x1 - x0) / n, y + h / 2, z, ry);
    },
    build(M, opt = {}) {
      const g = new THREE.Group();
      for (const [key, list] of Object.entries(lists)) {
        if (!list.length) continue;
        const m = new THREE.Mesh(mergeGeometries(list, false), M(key));
        m.castShadow = opt.shadow !== false && !/^(glass|grass|road|pave|dirt|water|marble|tilefl|parquet|rug|carpet)/.test(key); m.receiveShadow = true; m.name = key;
        m.geometry.computeBoundingSphere(); g.add(m);
        list.length = 0;
      }
      return g;
    }
  };
  return B;
}
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
let rs = 7; const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
// registers the extra materials into look.custom so look.M(key) finds them
export function homeMaterials(look) {
  const C = look.custom; if (C.tin) return;
  const tinTex = (base, rust) => canvasTex(128, 128, (g, w, h) => {
    for (let x = 0; x < w; x++) { const s = 0.5 + 0.5 * Math.cos(x / w * Math.PI * 2 * 13); const v = Math.round(base * (0.72 + 0.28 * s)); g.fillStyle = `rgb(${v},${v},${Math.round(v * 1.02)})`; g.fillRect(x, 0, 1, h); }
    for (let i = 0; i < rust; i++) { g.fillStyle = `rgba(${120 + rnd() * 40 | 0},${55 + rnd() * 25 | 0},${25},${0.15 + rnd() * 0.35})`; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 3 + rnd() * 16, 2 + rnd() * 30, 0, 0, 6.3); g.fill(); }
  });
  const std = (o) => new THREE.MeshStandardMaterial(o);
  C.tin = std({ map: tinTex(190, 10), metalness: 0.55, roughness: 0.5 });
  C.tinrust = std({ map: tinTex(150, 60), metalness: 0.35, roughness: 0.75, color: 0xd9b49a });
  C.tinblue = std({ map: tinTex(200, 18), metalness: 0.3, roughness: 0.55, color: 0x6f93bf });
  C.tingreen = std({ map: tinTex(200, 18), metalness: 0.3, roughness: 0.55, color: 0x7fa37a });
  C.tarp = std({ color: 0x2c64b8, roughness: 0.55, side: THREE.DoubleSide });
  C.tarpo = std({ color: 0xd9732b, roughness: 0.6, side: THREE.DoubleSide });
  C.card = std({ map: canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#a77d4e'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 4) { g.fillStyle = 'rgba(80,50,20,.16)'; g.fillRect(0, y, w, 1); } }), roughness: 1 });
  C.dirt = std({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#8b7356'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2200; i++) { const v = 90 + rnd() * 80 | 0; g.fillStyle = `rgba(${v + 30},${v + 10},${v - 20},.35)`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3); } }), roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  C.marble = std({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#ece7df'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(140,130,120,.25)'; for (let i = 0; i < 14; i++) { g.lineWidth = 0.5 + rnd() * 1.5; g.beginPath(); let x = rnd() * w, y = rnd() * h; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (rnd() - 0.5) * 70; y += (rnd() - 0.3) * 40; g.lineTo(x, y); } g.stroke(); } g.strokeStyle = 'rgba(90,80,70,.35)'; g.lineWidth = 1; g.strokeRect(0, 0, w, h); }), roughness: 0.18, metalness: 0.05 });
  C.tilefl = std({ map: canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#d8cbb4'; g.fillRect(0, 0, w, h); g.fillStyle = '#c9b89d'; g.fillRect(0, 0, w / 2, h / 2); g.fillRect(w / 2, h / 2, w / 2, h / 2); g.strokeStyle = 'rgba(80,70,60,.45)'; g.strokeRect(0, 0, w / 2, h / 2); g.strokeRect(w / 2, h / 2, w / 2, h / 2); }), roughness: 0.45 });
  C.parquet = std({ map: canvasTex(128, 128, (g, w, h) => { for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 * 32; x < w + 64; x += 64) { const v = 120 + rnd() * 40 | 0; g.fillStyle = `rgb(${v + 40},${v},${v - 50})`; g.fillRect(x - 64, y, 63, 15); } }), roughness: 0.55 });
  C.cement = std({ map: canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#9d9890'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { const v = 120 + rnd() * 60 | 0; g.fillStyle = `rgba(${v},${v},${v - 6},.3)`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } }), roughness: 0.95 });
  C.lamp = std({ color: 0xfff2d0, emissive: 0xffd28a, emissiveIntensity: 1.4 });
  C.screen = std({ color: 0x0b0d10, roughness: 0.12, metalness: 0.6, emissive: 0x16305a, emissiveIntensity: 0.25 });
  C.lpg = std({ color: 0xb3261e, roughness: 0.4, metalness: 0.5 });
  C.steel = std({ color: 0xb9bcbf, roughness: 0.3, metalness: 0.85 });
  C.white = std({ color: 0xf1f0ec, roughness: 0.4 });
  C.black = std({ color: 0x1b1c1e, roughness: 0.45 });
  C.gold = std({ color: 0xc9a24a, roughness: 0.3, metalness: 0.9 });
  C.rebar = std({ color: 0x6a4a36, roughness: 0.7, metalness: 0.6 });
  C.leafy = std({ color: 0x4f7a3a, roughness: 0.85 });
  C.pot = std({ color: 0xa4552e, roughness: 0.9 });
  C.water2 = std({ color: 0x4f7f8f, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.86, envMapIntensity: 1.2 });
  for (const [k, c] of Object.entries({ red: 0x9e2b2b, blue: 0x2f4f86, green: 0x4d6b3a, cream: 0xe7dcc4, brown: 0x6b4a32, grey: 0x6f7378, orange: 0xd27a34, pink: 0xd98aa0, teal: 0x2f7d7a, mustard: 0xc9a33a, maroon: 0x6e2232, navy: 0x1f2c4f, beige: 0xcdbb98 }))
    C['fab:' + k] = std({ color: c, roughness: 0.95 });
  C.wood = std({ map: canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#7a5434'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(${40 + rnd() * 30 | 0},${25 + rnd() * 15 | 0},10,${0.1 + rnd() * 0.2})`; g.fillRect(0, y, w, 1 + rnd() * 2); } }), roughness: 0.6 });
  C.woodlt = std({ map: C.wood.map, color: 0xe2c7a2, roughness: 0.6 });
}
// a sign atlas: names drawn into cells; returns { mat, uv(i) -> [u0, v0, u1, v1] }
export function signAtlas(names, o = {}) {
  const cols = 4, rows = Math.ceil(names.length / cols), cw = 256, ch = 64;
  const tex = canvasTex(cols * cw, rows * ch, (g) => {
    names.forEach((n, i) => {
      const x = (i % cols) * cw, y = Math.floor(i / cols) * ch, pal = o.pal || ['#b8322a', '#1f4f8a', '#2e6b3a', '#c48a1a', '#6b2a6b', '#1a6b6b', '#8a3a12', '#33363b'];
      g.fillStyle = pal[i % pal.length]; g.fillRect(x, y, cw, ch); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x, y + ch - 8, cw, 4);
      g.fillStyle = '#fff6e0'; g.font = `700 ${n.length > 18 ? 22 : 28}px system-ui,Segoe UI,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n, x + cw / 2, y + ch / 2 - 2, cw - 14);
    });
  });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.05 });
  return { mat, uv: (i) => { const c = i % cols, r = Math.floor(i / cols); return [c / cols, 1 - (r + 1) / rows, (c + 1) / cols, 1 - r / rows]; } };
}
// a flat sign facing +z with its UVs on one atlas cell
export function signG(w, h, cell) {
  const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, cell[0] + uv.getX(i) * (cell[2] - cell[0]), cell[1] + uv.getY(i) * (cell[3] - cell[1]));
  return g;
}
export function textPlate(lines, o = {}) {
  const w = o.w || 512, h = o.h || 256;
  const t = canvasTex(w, h, (g) => {
    g.fillStyle = o.bg || '#f4ecd8'; g.fillRect(0, 0, w, h);
    if (o.ink !== false) { g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); }
    let y = o.pad || 30;
    for (const [txt, size, col] of lines) { g.fillStyle = col || '#2a1d12'; g.font = `${size > 30 ? 700 : 500} ${size}px system-ui,Segoe UI,sans-serif`; g.textAlign = o.align || 'left'; g.textBaseline = 'top'; g.fillText(txt, o.align === 'center' ? w / 2 : 22, y, w - 40); y += size * 1.25; }
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}
