// AIT, compact. Chairman, 17 Oct 2026: about 300 m across, the landmarks he lived with close together and each one
// built, not boxed. Walk order from the main gate: the gate, the palm island and WELCOME, the motorbike apron and the
// orange block, Student Village and Dorm Y, AITCC with its annex and pool, the cafeteria, then SOM and SERD on one
// lawn and canal. Look notes: qa/ait-streetview.md and the CEO audit in qa/ait-gaps.md. Dorm Y is 4 storeys, about
// 49 x 18.5 m, in the OSM extract (game/assets/ait/campus.json). SERD has no street-view sheet; it uses the academic
// style of v25, v37 and v39. The old OSM campus box becomes field plots.
// Local frame: x east, n metres north of the gate arch. World = (anchor.x + x, anchor.z - n).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { PH } from './look.js';

const Y = 0.15;
const LOOP = { x0: -56, x1: 56, n0: 70, n1: 202, r: 26, w: 7 };
const ISLE = { x: 0, n: 92, a: 28, b: 12 };
const BST = { n: 114, w: 7 };
const GW = 12;
const BOX = { x0: -130, x1: 150, n0: -62, n1: 272 };
const YT = { n: -45, x0: -190, x1: 190 };
// the OSM campus box this replaces, in world metres (read from the 17 Oct build): it becomes fields
const OLD = { x0: -439, x1: 1624, z0: -1507, z1: -138 };
const STOPS = [
  { id: 'gate', label: 'Main gate', at: [0, -20], look: [0, 10] },
  { id: 'island', label: 'Palm island, WELCOME', at: [0, 58], look: [0, 86] },
  { id: 'apron', label: 'Motorbike apron, orange block', at: [-56, 100], look: [-90, 99] },
  { id: 'dorms', label: 'Student Village and Dorm Y', at: [-56, 152], look: [-92, 166] },
  { id: 'aitcc', label: 'AITCC, annex and pool', at: [-30, 204], look: [-36, 236] },
  { id: 'canteen', label: 'AIT Cafeteria', at: [20, 204], look: [28, 238] },
  { id: 'schools', label: 'SOM and SERD on the canal lawn', at: [64, 211.5], look: [104, 215] }
];

function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
function T(g, x, y, z, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e); _m.compose(_v.set(x, y, z), _q, _s.set(sx, sy, sz)); return g.applyMatrix4(_m);
}
function boxG(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]); }
  return g;
}
function cyl(r0, r1, h, seg = 8) { const g = new THREE.CylinderGeometry(r1, r0, h, seg); g.translate(0, h / 2, 0); return g; }
// a cylinder from point a to point b (local coords)
function rod(a, b, r0, r1, seg = 6) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, L, seg); g.translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  g.translate(a.x, a.y, a.z); return g;
}
// polygon in (x, n) -> prism from y0 to y1 in campus-local coords
function prismXN(pts, y0, y1) {
  const sh = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
  const g = new THREE.ExtrudeGeometry(sh, { depth: y1 - y0, bevelEnabled: false, curveSegments: 1 });
  g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); return g;
}
function flatXN(pts, y) {
  const g = new THREE.ShapeGeometry(new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1]))));
  g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return g;
}
function area2(pts) { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return a; }
// offset a simple polygon inward by d (negative d grows it). Miter joins.
function inset(pts, d) {
  if (!d) return pts.map((p) => p.slice());
  const s = area2(pts) > 0 ? 1 : -1, n = pts.length, out = [];
  const lines = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l * s, ny = dx / l * s;
    lines.push([a[0] + nx * d, a[1] + ny * d, dx / l, dy / l]);
  }
  for (let i = 0; i < n; i++) {
    const A = lines[(i - 1 + n) % n], B = lines[i];
    const den = A[2] * B[3] - A[3] * B[2];
    if (Math.abs(den) < 1e-6) { out.push([B[0], B[1]]); continue; }
    const t = ((B[0] - A[0]) * B[3] - (B[1] - A[1]) * B[2]) / den;
    out.push([A[0] + A[2] * t, A[1] + A[3] * t]);
  }
  return out;
}
function bez(p0, c, p2, t) { const u = 1 - t; return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p2[1]]; }
function polyLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
// walk a polyline in (x, n): cb(x, n, dx, dn, s) every step metres
function along(pts, step, cb, from = 0, closed = false) {
  const q = closed ? pts.concat([pts[0]]) : pts; let s = from, acc = 0;
  for (let i = 0; i < q.length - 1; i++) {
    const a = q[i], b = q[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (!L) continue;
    const dx = (b[0] - a[0]) / L, dn = (b[1] - a[1]) / L;
    while (s <= acc + L) { const t = s - acc; cb(a[0] + dx * t, a[1] + dn * t, dx, dn, s); s += step; }
    acc += L;
  }
}
function offsetLine(pts, d, closed = false) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dn = b[1] - a[1]; const l = Math.hypot(dx, dn) || 1; dx /= l; dn /= l;
    out.push([pts[i][0] - dn * d, pts[i][1] + dx * d]);
  }
  return out;
}
// flat strip along a polyline in (x, n), y up, metre UVs
function ribbon(pts, width, y, closed = false, off = 0) {
  const q = closed ? pts.concat([pts[0]]) : pts;
  const L = offsetLine(q, off + width / 2), R = offsetLine(q, off - width / 2), pos = [], uv = [], nor = [];
  let run = 0;
  for (let i = 0; i < q.length - 1; i++) {
    const seg = Math.hypot(q[i + 1][0] - q[i][0], q[i + 1][1] - q[i][1]);
    const quad = [L[i], R[i], R[i + 1], L[i], R[i + 1], L[i + 1]];
    const us = [run, run, run + seg, run, run + seg, run + seg], vs = [width, 0, 0, width, 0, width];
    for (let k = 0; k < 6; k++) { pos.push(quad[k][0], y, -quad[k][1]); uv.push(us[k], vs[k]); nor.push(0, 1, 0); }
    run += seg;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}
function loopPts(L, step = 2) {
  const { x0, x1, n0, n1, r } = L, out = [];
  const seg = (ax, an, bx, bn) => { const d = Math.hypot(bx - ax, bn - an), k = Math.max(1, Math.round(d / step)); for (let i = 0; i < k; i++) out.push([ax + (bx - ax) * i / k, an + (bn - an) * i / k]); };
  const arc = (cx, cn, a0, a1) => { const k = Math.max(4, Math.round(Math.abs(a1 - a0) * r / step)); for (let i = 0; i < k; i++) { const a = a0 + (a1 - a0) * i / k; out.push([cx + Math.cos(a) * r, cn + Math.sin(a) * r]); } };
  seg(0, n0, x1 - r, n0); arc(x1 - r, n0 + r, -Math.PI / 2, 0); seg(x1, n0 + r, x1, n1 - r); arc(x1 - r, n1 - r, 0, Math.PI / 2);
  seg(x1 - r, n1, x0 + r, n1); arc(x0 + r, n1 - r, Math.PI / 2, Math.PI); seg(x0, n1 - r, x0, n0 + r); arc(x0 + r, n0 + r, Math.PI, Math.PI * 1.5); seg(x0 + r, n0, 0, n0);
  return out;
}
function ellipse(cx, cn, a, b, k = 48) { const o = []; for (let i = 0; i < k; i++) { const t = i / k * Math.PI * 2; o.push([cx + Math.cos(t) * a, cn + Math.sin(t) * b]); } return o; }
function canvasTex(w, h, draw, srgb = true) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

// ---------- procedural textures (no download) ----------
function leafTex(seed, flowers) {
  const r = rng(seed);
  return canvasTex(512, 512, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    g.strokeStyle = 'rgba(70,55,40,0.9)'; g.lineWidth = 2;
    for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(W / 2 + (r() - 0.5) * 60, H / 2 + (r() - 0.5) * 60); g.lineTo(40 + r() * (W - 80), 40 + r() * (H - 80)); g.stroke(); }
    const blobs = [];
    for (let i = 0; i < 18; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 170; blobs.push([W / 2 + Math.cos(a) * d, H / 2 + Math.sin(a) * d, 60 + r() * 60]); }
    for (const [bx, by, br] of blobs) {
      for (let k = 0; k < 340; k++) {
        const a = r() * Math.PI * 2, d = Math.pow(r(), 0.6) * br, x = bx + Math.cos(a) * d, y = by + Math.sin(a) * d;
        if (x < 6 || y < 6 || x > W - 6 || y > H - 6) continue;
        const lit = 0.5 + 0.5 * (1 - (y - by + br) / (2 * br));
        g.fillStyle = `hsl(${74 + r() * 32},${34 + r() * 24}%,${24 + lit * 26 + r() * 10}%)`;
        g.beginPath(); g.ellipse(x, y, 3 + r() * 5, 1.5 + r() * 2.4, r() * Math.PI, 0, Math.PI * 2); g.fill();
        if (flowers && r() < 0.08) { g.fillStyle = flowers[(r() * flowers.length) | 0]; g.beginPath(); g.arc(x, y, 2.2 + r() * 2.5, 0, Math.PI * 2); g.fill(); }
      }
    }
  });
}
function hedgeTex(seed, flowers) {
  const r = rng(seed);
  const t = canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = '#2c4a22'; g.fillRect(0, 0, W, H);
    for (let k = 0; k < 2600; k++) {
      const x = r() * W, y = r() * H;
      g.fillStyle = `hsl(${82 + r() * 26},${34 + r() * 20}%,${14 + r() * 26}%)`;
      g.beginPath(); g.ellipse(x, y, 2 + r() * 3.5, 1 + r() * 2, r() * Math.PI, 0, Math.PI * 2); g.fill();
      if (flowers && r() < 0.18) { g.fillStyle = flowers[(r() * flowers.length) | 0]; g.beginPath(); g.arc(x, y, 1.6 + r() * 2.2, 0, Math.PI * 2); g.fill(); }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function barkTex() {
  const r = rng(77);
  const t = canvasTex(128, 256, (g, W, H) => {
    g.fillStyle = '#8a8075'; g.fillRect(0, 0, W, H);
    for (let k = 0; k < 220; k++) { const x = r() * W; g.strokeStyle = `rgba(${40 + r() * 40},${36 + r() * 30},${30 + r() * 25},${0.35 + r() * 0.4})`; g.lineWidth = 1 + r() * 2.5; g.beginPath(); g.moveTo(x, r() * H); g.lineTo(x + (r() - 0.5) * 6, r() * H); g.stroke(); }
    for (let k = 0; k < 90; k++) { g.fillStyle = `rgba(${150 + r() * 50},${145 + r() * 40},${130 + r() * 40},0.25)`; g.fillRect(r() * W, r() * H, 2 + r() * 8, 3 + r() * 14); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function palmTex() {
  const r = rng(91);
  const t = canvasTex(64, 256, (g, W, H) => {
    g.fillStyle = '#bdb6aa'; g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 5 + r() * 4) { g.fillStyle = `rgba(${90 + r() * 30},${84 + r() * 26},${74 + r() * 20},${0.35 + r() * 0.3})`; g.fillRect(0, y, W, 1.5 + r() * 1.5); }
    for (let k = 0; k < 60; k++) { g.fillStyle = 'rgba(70,64,56,0.2)'; g.fillRect(r() * W, r() * H, 1 + r() * 2, 6 + r() * 20); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function frondTex() {
  return canvasTex(128, 512, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    g.strokeStyle = '#6b7a3a'; g.lineWidth = 4; g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke();
    for (let y = 8; y < H - 4; y += 7) {
      const len = (W / 2 - 4) * Math.sin(Math.PI * Math.min(1, (y / H) * 1.05 + 0.08));
      for (const s of [-1, 1]) {
        g.strokeStyle = `hsl(${88 + (y % 13)},${42 + (y % 7)}%,${22 + (y % 11)}%)`; g.lineWidth = 3.2;
        g.beginPath(); g.moveTo(W / 2, y); g.quadraticCurveTo(W / 2 + s * len * 0.5, y + 6, W / 2 + s * len, y + 18); g.stroke();
      }
    }
  });
}
function breezeTex() {
  const t = canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = '#efede6'; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'destination-out';
    const c = W / 4;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const x = i * c + c / 2, y = j * c + c / 2;
      g.beginPath(); g.arc(x, y, c * 0.34, 0, Math.PI * 2); g.fill();
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.beginPath(); g.moveTo(x + dx * c * 0.47, y + dy * c * 0.18); g.lineTo(x + dx * c * 0.47, y + dy * c * 0.47); g.lineTo(x + dx * c * 0.18, y + dy * c * 0.47); g.closePath(); g.fill(); }
    }
    g.globalCompositeOperation = 'source-over';
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function linkTex() {
  const t = canvasTex(64, 64, (g, W, H) => {
    g.clearRect(0, 0, W, H); g.strokeStyle = '#3d6b45'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(W, H); g.moveTo(W, 0); g.lineTo(0, H); g.stroke();
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function tileTex() {
  const t = canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = '#c9cdcf'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const v = 236 + ((i * 7 + j * 13) % 9); g.fillStyle = `rgb(${v},${v},${v - 2})`; g.fillRect(i * 32 + 1.5, j * 32 + 1.5, 29, 29); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function radialTex() {
  return canvasTex(128, 128, (g, W) => {
    const gr = g.createRadialGradient(W / 2, W / 2, 4, W / 2, W / 2, W / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, W);
  }, false);
}
const FLAGS = [
  (g, w, h) => { const c = ['#a51931', '#f4f5f8', '#2d2a4a', '#2d2a4a', '#f4f5f8', '#a51931']; c.forEach((k, i) => { g.fillStyle = k; g.fillRect(0, i * h / 6, w, h / 6 + 1); }); },
  (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#bc002d'; g.beginPath(); g.arc(w / 2, h / 2, h * 0.3, 0, 7); g.fill(); },
  (g, w, h) => { ['#ff9933', '#ffffff', '#138808'].forEach((k, i) => { g.fillStyle = k; g.fillRect(0, i * h / 3, w, h / 3 + 1); }); g.strokeStyle = '#000080'; g.lineWidth = 2; g.beginPath(); g.arc(w / 2, h / 2, h * 0.12, 0, 7); g.stroke(); },
  (g, w, h) => { g.fillStyle = '#da251d'; g.fillRect(0, 0, w, h); star(g, w / 2, h / 2, h * 0.28, '#ffff00'); },
  (g, w, h) => { g.fillStyle = '#ce1126'; g.fillRect(0, 0, w, h / 2); g.fillStyle = '#fff'; g.fillRect(0, h / 2, w, h / 2); },
  (g, w, h) => { g.fillStyle = '#006a4e'; g.fillRect(0, 0, w, h); g.fillStyle = '#f42a41'; g.beginPath(); g.arc(w * 0.45, h / 2, h * 0.3, 0, 7); g.fill(); },
  (g, w, h) => { g.fillStyle = '#de2910'; g.fillRect(0, 0, w, h); star(g, w * 0.18, h * 0.28, h * 0.16, '#ffde00'); for (let i = 0; i < 4; i++) star(g, w * 0.34 + (i % 2) * 6, h * 0.12 + i * h * 0.1, h * 0.05, '#ffde00'); },
  (g, w, h) => { g.fillStyle = '#0038a8'; g.fillRect(0, 0, w, h / 2); g.fillStyle = '#ce1126'; g.fillRect(0, h / 2, w, h / 2); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, 0); g.lineTo(h * 0.86, h / 2); g.lineTo(0, h); g.fill(); star(g, h * 0.28, h / 2, h * 0.1, '#fcd116'); },
  (g, w, h) => { ['#fecb00', '#34b233', '#ea2839'].forEach((k, i) => { g.fillStyle = k; g.fillRect(0, i * h / 3, w, h / 3 + 1); }); star(g, w / 2, h * 0.55, h * 0.3, '#fff'); },
  (g, w, h) => { g.fillStyle = '#ce1126'; g.fillRect(0, 0, w, h); g.fillStyle = '#002868'; g.fillRect(0, h / 4, w, h / 2); g.fillStyle = '#fff'; g.beginPath(); g.arc(w / 2, h / 2, h * 0.16, 0, 7); g.fill(); },
  (g, w, h) => { g.fillStyle = '#032ea1'; g.fillRect(0, 0, w, h); g.fillStyle = '#e00025'; g.fillRect(0, h / 4, w, h / 2); g.fillStyle = '#fff'; g.fillRect(w * 0.38, h * 0.36, w * 0.24, h * 0.28); },
  (g, w, h) => { for (let i = 0; i < 14; i++) { g.fillStyle = i % 2 ? '#fff' : '#cc0001'; g.fillRect(0, i * h / 14, w, h / 14 + 1); } g.fillStyle = '#010066'; g.fillRect(0, 0, w / 2, h * 0.57); g.fillStyle = '#fc0'; g.beginPath(); g.arc(w * 0.2, h * 0.28, h * 0.17, 0, 7); g.fill(); g.fillStyle = '#010066'; g.beginPath(); g.arc(w * 0.24, h * 0.28, h * 0.15, 0, 7); g.fill(); },
  (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w * 0.25, h); g.fillStyle = '#01411c'; g.fillRect(w * 0.25, 0, w * 0.75, h); g.fillStyle = '#fff'; g.beginPath(); g.arc(w * 0.62, h / 2, h * 0.27, 0, 7); g.fill(); g.fillStyle = '#01411c'; g.beginPath(); g.arc(w * 0.67, h * 0.45, h * 0.24, 0, 7); g.fill(); },
  (g, w, h) => { ['#000', '#dd0000', '#ffce00'].forEach((k, i) => { g.fillStyle = k; g.fillRect(0, i * h / 3, w, h / 3 + 1); }); },
  (g, w, h) => { ['#0055a4', '#fff', '#ef4135'].forEach((k, i) => { g.fillStyle = k; g.fillRect(i * w / 3, 0, w / 3 + 1, h); }); },
  (g, w, h) => { ['#009246', '#fff', '#ce2b37'].forEach((k, i) => { g.fillStyle = k; g.fillRect(i * w / 3, 0, w / 3 + 1, h); }); },
  (g, w, h) => { ['#ae1c28', '#fff', '#21468b'].forEach((k, i) => { g.fillStyle = k; g.fillRect(0, i * h / 3, w, h / 3 + 1); }); },
  (g, w, h) => { g.fillStyle = '#006aa7'; g.fillRect(0, 0, w, h); g.fillStyle = '#fecc00'; g.fillRect(w * 0.31, 0, w * 0.12, h); g.fillRect(0, h * 0.42, w, h * 0.16); },
  (g, w, h) => { for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#fff' : '#b22234'; g.fillRect(0, i * h / 13, w, h / 13 + 1); } g.fillStyle = '#3c3b6e'; g.fillRect(0, 0, w * 0.4, h * 0.54); },
  (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#cd2e3a'; g.beginPath(); g.arc(w / 2, h / 2, h * 0.25, Math.PI, 0); g.fill(); g.fillStyle = '#0047a0'; g.beginPath(); g.arc(w / 2, h / 2, h * 0.25, 0, Math.PI); g.fill(); },
  (g, w, h) => { g.fillStyle = '#ba0c2f'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.fillRect(w * 0.28, 0, w * 0.16, h); g.fillRect(0, h * 0.38, w, h * 0.24); g.fillStyle = '#00205b'; g.fillRect(w * 0.32, 0, w * 0.08, h); g.fillRect(0, h * 0.44, w, h * 0.12); },
  (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#003580'; g.fillRect(w * 0.28, 0, w * 0.14, h); g.fillRect(0, h * 0.4, w, h * 0.2); },
  (g, w, h) => { g.fillStyle = '#5b92e5'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(w / 2, h / 2, h * 0.24, 0, 7); g.stroke(); }
];
function star(g, x, y, r, c) { g.fillStyle = c; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.4 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }

// ---------- materials ----------
function makeMats(look) {
  const { M, tex, pbr } = look;
  const std = (o) => new THREE.MeshStandardMaterial(o);
  // dirt at the foot of each wall, rain streaks per column, slow colour drift: the wear a render picks up in a wet season
  const grime = (m, k = 1) => {
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vAw;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAw = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vAw;')
        .replace('#include <map_fragment>', `#include <map_fragment>
{ float gy = vAw.y;
  float base = mix(${(1 - 0.22 * k).toFixed(3)}, 1.0, smoothstep(0.2, 1.8, gy));
  float h = fract(sin(floor(vAw.x * 1.6 + vAw.z * 1.6) * 12.9898) * 43758.5453);
  float streak = smoothstep(0.62, 1.0, h) * (0.3 + 0.7 * fract(-gy / 3.3)) * ${(0.13 * k).toFixed(3)};
  float blot = sin(vAw.x * 0.31 + vAw.z * 0.27 + gy * 0.7) * sin(vAw.z * 0.19 - gy * 0.45) * ${(0.06 * k).toFixed(3)};
  diffuseColor.rgb *= clamp(base - streak + blot, 0.0, 1.1); }`);
    };
    m.customProgramCacheKey = () => 'aitw' + k;
    return m;
  };
  const plaster = (hex, k = 1, tile = 3) => {
    const m = std({ map: tex('white_render', 'diff', true, tile), color: hex, roughness: 0.92 });
    m.userData.ph = { n: 'plastered_wall', t: tile };
    return grime(m, k);
  };
  const tint = (m, hex) => { const c = m.clone(); c.color.setHex(hex); return c; };
  const ground = (name, tile, hex, extra = {}) => {
    const m = std({ map: tex(name, 'diff', true, tile), color: hex, roughness: 1, ...extra });
    m.userData.aitNor = { n: name, t: tile }; return m;
  };
  const bark = barkTex(), hedge = hedgeTex(5), bouga = hedgeTex(9, ['#d1307a', '#e24f98', '#b81f63']), leafs = [leafTex(11), leafTex(23), leafTex(37)];
  const flat = (hex, f = -2) => std({ color: hex, roughness: 0.75, polygonOffset: true, polygonOffsetFactor: f, polygonOffsetUnits: f * 2 });
  return {
    white: plaster(0xf5f4ef), trim: plaster(0xfcfbf7, 0.5, 2), mint: plaster(0xa9d9b4), lime: plaster(0x9ccc5a, 0.7), orange: plaster(0xe5a03a),
    maroon: plaster(0x7a3b30, 0.8), cream: plaster(0xe9e1cd), ccwall: plaster(0xdcdad3), oxblood: plaster(0x8e1f1f, 0.6), pink: plaster(0xe8c4c0),
    grey: grime(pbr('grey_plaster', 2.5, { color: 0x8d9295 }), 0.6),
    brick: grime(tint(M('wall:brick'), 0xc07a66), 0.5),
    laterite: grime(tint(M('wall:brick'), 0x9a6656), 0.4),
    concrete: grime(pbr('grey_plaster', 2, { color: 0xd8d5ce }), 0.5),
    pave: pbr('concrete_pavement', 2.2, { color: 0xd7d2c8 }),
    glass: std({ color: 0x1c2328, roughness: 0.08, metalness: 0.8, envMapIntensity: 1.2 }),
    lobby: std({ color: 0x45565c, roughness: 0.06, metalness: 0.7, envMapIntensity: 1.3 }),
    frame: std({ color: 0x31363b, roughness: 0.42, metalness: 0.6 }),
    redframe: std({ color: 0xa8322a, roughness: 0.5, metalness: 0.2 }),
    black: std({ color: 0x1d1f21, roughness: 0.5, metalness: 0.35 }),
    iron: std({ color: 0x23402f, roughness: 0.4, metalness: 0.6 }),
    gold: std({ color: 0xd0aa55, roughness: 0.3, metalness: 0.9 }),
    steel: std({ color: 0xe2e5e8, roughness: 0.2, metalness: 0.95 }),
    letterW: std({ color: 0xf7f7f3, roughness: 0.45 }),
    letterK: std({ color: 0x1b1c1e, roughness: 0.5 }),
    paintO: std({ color: 0xe8862e, roughness: 0.6 }), paintY: std({ color: 0xeab83a, roughness: 0.6 }), paintR: std({ color: 0xc0392b, roughness: 0.6 }),
    blueU: std({ color: 0x2f6fb6, roughness: 0.7, side: THREE.DoubleSide }), whiteU: std({ color: 0xf4f4f0, roughness: 0.7, side: THREE.DoubleSide }),
    corr: std({ color: 0xc9ccd0, roughness: 0.5, metalness: 0.55, side: THREE.DoubleSide }),
    breeze: std({ map: breezeTex(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 }),
    link: std({ map: linkTex(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.4 }),
    tile: std({ map: tileTex(), roughness: 0.35 }),
    pool: std({ color: 0x2a9fd6, roughness: 0.04, metalness: 0.1, envMapIntensity: 1.4, transparent: true, opacity: 0.9 }),
    canal: std({ color: 0x3d5e3f, roughness: 0.62, metalness: 0.0, envMapIntensity: 0.35 }),
    lotus: std({ color: 0x4f7d3a, roughness: 0.6, side: THREE.DoubleSide }),
    hedge: std({ map: hedge, roughness: 0.95 }), bouga: std({ map: bouga, roughness: 0.95 }),
    bark: std({ map: bark, roughness: 0.95, color: 0xd6cec4 }),
    palmBark: std({ map: palmTex(), color: 0xffffff, roughness: 0.85 }), shaft: std({ color: 0x6f8c45, roughness: 0.6 }),
    leaf: leafs.map((t) => std({ map: t, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.85 })),
    frond: std({ map: frondTex(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 }),
    flower: std({ map: leafTex(51, ['#fff8e8', '#fdf0d0', '#f7e3a8']), alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.85 }),
    asphalt: pbr('asphalt_02', 5, { color: 0xc4c2bd, side: THREE.DoubleSide }),
    asphaltN: pbr('asphalt_02', 5, { color: 0x7d7e80, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
    apron: pbr('asphalt_02', 5, { color: 0xe3e1db, side: THREE.DoubleSide }),
    lawn: ground('leafy_grass', 4, 0xd9d8a8),
    isle: ground('leafy_grass', 4, 0xb3cf84, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
    dirt: ground('dry_decay_leaves', 3, 0xe6d6bc, { transparent: true, depthWrite: false, alphaMap: radialTex(), polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -3 }),
    soil: ground('farm_soil', 4, 0xc8b298, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -3 }),
    field: ground('withered_grass', 5, 0xffffff, { vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
    plough: ground('farm_soil', 4, 0xffffff, { vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
    bund: ground('withered_grass', 3, 0xb9b07c),
    lineW: flat(0xf2f2ee), lineY: flat(0xe3b23c), lineK: flat(0x2a2a2a),
    pole: std({ color: 0x8e9398, roughness: 0.5, metalness: 0.6 }),
    lampHead: std({ color: 0xf2efe6, emissive: 0xffe2b0, emissiveIntensity: 0.05, roughness: 0.4 }),
    kerb: std({ color: 0xffffff, roughness: 0.7 }),
    cart: std({ color: 0xf2f2ef, roughness: 0.35, metalness: 0.2 }),
    tyre: std({ color: 0x1a1a1a, roughness: 0.9 }),
    cloth: std({ color: 0xffffff, roughness: 0.8, side: THREE.DoubleSide }),
    ride: std({ color: 0xffffff, roughness: 0.45, metalness: 0.45 }),
    car: std({ color: 0xffffff, roughness: 0.3, metalness: 0.6 })
  };
}

// ---------- vegetation geometry ----------
function rainTree(seed, R, cards, sparse) {
  const r = rng(seed), wood = [], leaf = [];
  const H = 2.8 + r() * 0.9;
  wood.push(cyl(0.55, 0.36, H, 9));
  const top = H + 5.2 + r() * 1.2, cy = top - 3.2;
  const limbs = 5 + ((r() * 2) | 0);
  for (let i = 0; i < limbs; i++) {
    const a = i / limbs * Math.PI * 2 + r() * 0.5, t = 0.85 + r() * 0.35, L = R * (0.62 + r() * 0.2);
    const base = new THREE.Vector3(0, H - 0.2, 0), tip = new THREE.Vector3(Math.cos(a) * L * Math.sin(t), H + L * Math.cos(t) * 0.9, Math.sin(a) * L * Math.sin(t));
    wood.push(rod(base, tip, 0.3, 0.12, 6));
    for (let k = 0; k < 2; k++) {
      const mid = base.clone().lerp(tip, 0.55 + k * 0.2), b = a + (k ? 0.6 : -0.6);
      wood.push(rod(mid, mid.clone().add(new THREE.Vector3(Math.cos(b) * 2.6, 1.4 + r(), Math.sin(b) * 2.6)), 0.1, 0.04, 5));
    }
  }
  // umbrella crown: a broad flat-topped dome, cards mostly face up, the rim ones tip outward
  const nCards = Math.round(cards * 1.9);
  for (let k = 0; k < nCards; k++) {
    const a = r() * Math.PI * 2, f = Math.sqrt(0.04 + r() * 0.96), rho = f * R;
    const y = top - 2.6 * Math.pow(f, 2.2) + (r() - 0.5) * 1.3 - (k % 4 === 0 ? 1.0 : 0);
    const s = (sparse ? 2.8 : 4.0) + r() * 1.8;
    const g = new THREE.PlaneGeometry(s, s * 0.85);
    T(g, Math.cos(a) * rho, y, Math.sin(a) * rho, r() * Math.PI * 2, -Math.PI / 2 + (r() - 0.5) * 0.5 + f * 0.5, (r() - 0.5) * 0.5);
    const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) { _v.set(p.getX(i), p.getY(i) - cy, p.getZ(i)).normalize(); _v.y = _v.y * 0.6 + 0.5; _v.normalize(); n.setXYZ(i, _v.x, _v.y, _v.z); }
    leaf.push(g);
  }
  return { wood: mergeGeometries(wood.map((g) => g.index ? g.toNonIndexed() : g), false), leaf: mergeGeometries(leaf.map((g) => g.toNonIndexed()), false), top, R };
}
function palm(seed, h) {
  const r = rng(seed), fr = [];
  const prof = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8; prof.push(new THREE.Vector2(0.27 + 0.1 * Math.sin(Math.PI * Math.min(1, t * 1.6)) - 0.06 * t, t * h)); }
  const trunk = new THREE.LatheGeometry(prof, 8);
  const shaft = cyl(0.3, 0.24, 2.0, 8); shaft.translate(0, h, 0);
  const n = 13;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + r() * 0.3, elev = 0.75 - (i % 3) * 0.45 + r() * 0.2, L = 3.8 + r() * 0.9;
    const pos = [], uv = [], segs = 8;
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), side = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
    for (let k = 0; k <= segs; k++) {
      const t = k / segs, along = L * t;
      const c = new THREE.Vector3(0, h + 1.9, 0).addScaledVector(dir, along * Math.cos(elev * (1 - t * 0.4))).add(new THREE.Vector3(0, along * Math.sin(elev) - 2.4 * t * t, 0));
      const w = 0.75 * Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.05));
      for (const s of [-1, 0, 1]) {
        const q = c.clone().addScaledVector(side, s * w); q.y -= Math.abs(s) * w * 0.35;
        pos.push(q.x, q.y, q.z); uv.push((s + 1) / 2, t);
      }
    }
    const idx = [];
    for (let k = 0; k < segs; k++) for (let j = 0; j < 2; j++) { const a0 = k * 3 + j, b0 = a0 + 1, c0 = a0 + 3, d0 = a0 + 4; idx.push(a0, c0, b0, b0, c0, d0); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    fr.push(g.toNonIndexed());
  }
  return { trunk: trunk.toNonIndexed(), shaft: shaft.toNonIndexed(), frond: mergeGeometries(fr, false) };
}
function shrub(seed, s) {
  const r = rng(seed), out = [];
  for (let k = 0; k < 7; k++) { const g = new THREE.PlaneGeometry(s, s * 0.8); T(g, (r() - 0.5) * s * 0.4, s * 0.45 + r() * s * 0.3, (r() - 0.5) * s * 0.4, r() * 3.1, -Math.PI / 2 + (r() - 0.5) * 1.6, 0); out.push(g.toNonIndexed()); }
  return mergeGeometries(out, false);
}

export async function buildAit({ scene, look, touch, colliders, circles, places, anchor }) {
  const AX = anchor ? anchor.x : 0, AZ = anchor ? anchor.z : -608;
  const W = (x, n) => [AX + x, AZ - n];
  const font = await new FontLoader().loadAsync('/look/vendor/addons/fonts/helvetiker_bold.typeface.json');
  const R = rng(1709);
  const MAT = makeMats(look);
  const FLAT = new Set(['lineW', 'lineY', 'lineK', 'asphalt', 'asphaltN', 'apron', 'pave', 'lawn', 'isle', 'dirt', 'soil', 'canal', 'pool', 'tile', 'lotus', 'field', 'plough', 'bund']);
  const root = new THREE.Group(); root.name = 'ait'; root.position.set(AX, 0, AZ); scene.add(root);
  const extras = new THREE.Group(); extras.name = 'ait-extras'; root.add(extras);
  const blocks = [], mapAreas = [], mapPaths = [], roadsXN = [];
  const P3 = (x, y, n) => new THREE.Vector3(x, y, -n);

  // one batch per group, one draw per material
  function Batch() {
    const m = new Map();
    return {
      put(key, g) { if (!g) return; if (g.index) g = g.toNonIndexed(); if (!g.attributes.normal) g.computeVertexNormals(); (m.get(key) || m.set(key, []).get(key)).push(g); },
      into(parent, shadow = true) {
        for (const [k, list] of m) {
          const geo = list.length === 1 ? list[0] : mergeGeometries(list, false); if (!geo) { console.warn('aitc merge', k); continue; }
          const mesh = new THREE.Mesh(geo, MAT[k]); mesh.castShadow = shadow && !FLAT.has(k); mesh.receiveShadow = true; mesh.name = 'aitc-' + k; parent.add(mesh);
        }
      }
    };
  }
  const groups = [];
  function group(name) { const g = new THREE.Group(); g.name = 'ait-cell ' + name; root.add(g); const b = Batch(); groups.push([g, b]); return b; }
  const ground = Batch();
  const solid = (x, n, w, d, yaw, h) => { const [wx, wz] = W(x, n); colliders.push({ t: 'obb', cx: wx, cz: wz, hw: w / 2, hd: d / 2, ry: yaw, y1: h }); };
  const block = (name, x, n, w, d, yaw, h) => { const [wx, wz] = W(x, n); blocks.push({ x: wx, z: wz, w, d, h, ry: yaw, cell: name }); };
  const tree = (x, n, r = 0.45) => { const [wx, wz] = W(x, n); circles.push({ x: wx, z: wz, r }); };
  function text(str, size, depth, letterSpace = 0) {
    if (!letterSpace) { const g = new TextGeometry(str, { font, size, depth, curveSegments: 3, bevelEnabled: false }); g.computeBoundingBox(); const b = g.boundingBox; g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -depth / 2); return g; }
    const parts = []; let x = 0;
    for (const ch of str) { if (ch === ' ') { x += size * 0.45 + letterSpace; continue; } const g = new TextGeometry(ch, { font, size, depth, curveSegments: 3, bevelEnabled: false }); g.computeBoundingBox(); const w = g.boundingBox.max.x - g.boundingBox.min.x; g.translate(x - g.boundingBox.min.x, 0, -depth / 2); parts.push(g); x += w + letterSpace; }
    const g = mergeGeometries(parts, false); g.translate(-x / 2, 0, 0); return g;
  }
  // a building in its own frame: facade faces local +z, u along it. yaw 0 faces south (to the gate), PI/2 east.
  function bld(b, x, n, yaw) {
    const BM = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, 0, -n);
    const add = (key, g) => { g.applyMatrix4(BM); b.put(key, g); return g; };
    const box = (key, u, y0, v, w, h, d, ry = 0) => add(key, T(boxG(w, h, d), u, y0 + h / 2, v, ry));
    const prism = (key, pts, y0, y1) => { const sh = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], -p[1]))); const g = new THREE.ExtrudeGeometry(sh, { depth: y1 - y0, bevelEnabled: false, curveSegments: 1 }); g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); return add(key, g); };
    const toXN = (u, v) => [x + u * Math.cos(yaw) + v * Math.sin(yaw), n - (-u * Math.sin(yaw) + v * Math.cos(yaw))];
    const solidU = (u, v, w, d, h) => { const [cx, cn] = toXN(u, v); solid(cx, cn, w, d, yaw, h); };
    const word = (key, str, size, depth, u, y, v, ry = 0, sp = 0) => add(key, T(text(str, size, depth, sp), u, y, v, ry));
    // mullions round a glass band of a footprint polygon
    const mullions = (pts, ins, y0, y1, step = 1.6) => {
      const q = inset(pts, ins), s = area2(q) > 0 ? 1 : -1;
      for (let i = 0; i < q.length; i++) {
        const a = q[i], c = q[(i + 1) % q.length], L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L < 1) continue;
        const k = Math.max(1, Math.round(L / step)), ry = Math.atan2(c[0] - a[0], c[1] - a[1]) + Math.PI / 2;
        const nx = (c[1] - a[1]) / L * s, nv = -(c[0] - a[0]) / L * s;
        for (let j = 0; j <= k; j++) { const t = j / k; box('frame', a[0] + (c[0] - a[0]) * t + nx * 0.04, y0, a[1] + (c[1] - a[1]) * t + nv * 0.04, 0.07, y1 - y0, 0.09, ry); }
        box('frame', (a[0] + c[0]) / 2 + nx * 0.04, y0 + (y1 - y0) * 0.55, (a[1] + c[1]) / 2 + nv * 0.04, 0.05, 0.05, L, ry + Math.PI / 2);
      }
    };
    // ribbon-window modernism: per floor a solid spandrel, a recessed glass band, then a projecting slab
    const ribbonFloors = (pts, wall, floors, fh, opt = {}) => {
      const y0 = opt.y0 || 0, sp = opt.spandrel || 1.05, rec = opt.recess || 0.35, fin = opt.fin == null ? 0.7 : opt.fin;
      for (let f = 0; f < floors; f++) {
        const yb = y0 + f * fh;
        prism(wall, pts, yb, yb + sp);
        prism(opt.glass || 'glass', inset(pts, rec), yb + sp, yb + fh - 0.22);
        if (!opt.noMullion) mullions(pts, rec, yb + sp, yb + fh - 0.22, opt.mstep || 1.6);
        prism(opt.slab || 'trim', inset(pts, -fin), yb + fh - 0.22, yb + fh);
      }
      return y0 + floors * fh;
    };
    const ring = (key, pts, wdt, y0, y1) => {
      const sh = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], -p[1])));
      sh.holes.push(new THREE.Path(inset(pts, wdt).map((p) => new THREE.Vector2(p[0], -p[1]))));
      const g = new THREE.ExtrudeGeometry(sh, { depth: y1 - y0, bevelEnabled: false, curveSegments: 1 }); g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); return add(key, g);
    };
    const roof = (pts, y, over = 0.6, para = 0.7, key = 'trim') => { prism(key, inset(pts, -over), y, y + 0.32); prism('concrete', inset(pts, 0.2), y + 0.32, y + 0.4); ring(key, pts, 0.25, y + 0.32, y + para); };
    const punch = (a, c, y, w, h, step, frameKey = 'trim', depth = 0.22) => {
      const L = Math.hypot(c[0] - a[0], c[1] - a[1]), k = Math.max(1, Math.floor(L / step)), ry = Math.atan2(c[0] - a[0], c[1] - a[1]) - Math.PI / 2;
      const nx = -(c[1] - a[1]) / L, nv = (c[0] - a[0]) / L;
      for (let j = 0; j < k; j++) {
        const t = (j + 0.5) / k, u = a[0] + (c[0] - a[0]) * t, v = a[1] + (c[1] - a[1]) * t;
        box('glass', u + nx * 0.01, y, v + nv * 0.01, w, h, 0.04, ry);
        for (const s of [-1, 1]) box(frameKey, u + nx * depth / 2 + Math.cos(ry) * s * (w / 2 + 0.07), y - 0.05, v + nv * depth / 2 - Math.sin(ry) * s * (w / 2 + 0.07), 0.14, h + 0.1, depth, ry);
        box(frameKey, u + nx * depth / 2, y + h, v + nv * depth / 2, w + 0.28, 0.12, depth, ry);
        box(frameKey, u + nx * (depth / 2 + 0.05), y - 0.12, v + nv * (depth / 2 + 0.05), w + 0.36, 0.1, depth + 0.1, ry);
        box('frame', u + nx * 0.03, y + h * 0.5, v + nv * 0.03, 0.04, h, 0.05, ry);
      }
    };
    const ac = (u, y, v, ry) => { box('concrete', u, y, v, 0.85, 0.6, 0.32, ry); box('frame', u + 0.17 * Math.sin(ry), y + 0.15, v + 0.17 * Math.cos(ry), 0.6, 0.3, 0.02, ry); };
    const rail = (u0, v0, u1, v1, y, h = 1.0, key = 'trim', step = 0.14) => {
      const L = Math.hypot(u1 - u0, v1 - v0), ry = Math.atan2(u1 - u0, v1 - v0);
      box(key, (u0 + u1) / 2, y + h - 0.05, (v0 + v1) / 2, 0.06, 0.06, L, ry);
      const k = Math.max(1, Math.round(L / step));
      for (let j = 0; j <= k; j++) { const t = j / k; box(key, u0 + (u1 - u0) * t, y, v0 + (v1 - v0) * t, 0.03, h, 0.03); }
    };
    return { add, box, prism, ring, solidU, word, mullions, ribbonFloors, roof, punch, ac, rail, toXN };
  }
  const rect = (w, d, cu = 0, cv = 0) => [[cu - w / 2, cv - d / 2], [cu + w / 2, cv - d / 2], [cu + w / 2, cv + d / 2], [cu - w / 2, cv + d / 2]];

  // ---------- instanced props, filled as we go ----------
  const inst = { kerb: [], dash: [], topiary: [], lampR: [], lampG: [], bike: [], moto: [], cone: [], flame: [], trees: [], palms: [], shrubs: [], blooms: [], car: [], post: [] };
  const KERB_RW = [0xc0392b, 0xf2f2f2], KERB_G = 0xbdb9b1;
  function kerbLine(pts, colours = KERB_RW, closed = false, step = 1.0, skip = null) { let i = 0; along(pts, step, (x, n, dx, dn) => { i++; if (skip && skip(x, n)) return; inst.kerb.push([x, n, Math.atan2(dx, -dn), colours[i % colours.length]]); }, step / 2, closed); }
  // road mouths and path crossings on the loop: no kerb, no lamp
  const MOUTHS = [[-6.6, 6.6, 60, 69], [55, 64, 132.5, 139.5], [-49, -43, 199, 210], [25.5, 31, 199, 210], [-20, -16, 199, 210], [34, 46, 196, 210], [-64, -55, 118, 122], [-64, -55, 140, 145], [-64, -55, 82, 116], [-64, -55, 176, 196]];
  const inMouth = (x, n) => MOUTHS.some((m) => x > m[0] && x < m[1] && n > m[2] && n < m[3]);
  function roadMarks(pts, w, opt = {}) {
    if (opt.centre !== false) along(pts, 6, (x, n, dx, dn) => inst.dash.push([x, n, Math.atan2(dx, -dn), opt.centreW ? 0 : 1]), 1.5, !!opt.closed);
    if (opt.edges !== false) for (const s of [-1, 1]) ground.put('lineW', ribbon(pts, 0.13, Y + 0.05, !!opt.closed, s * (w / 2 - 0.35)));
  }
  function road(pts, w, key, y, opt = {}) {
    ground.put(key, ribbon(pts, w, y, !!opt.closed));
    roadMarks(pts, w, opt);
    if (opt.kerb) kerbLine(offsetLine(pts, w / 2 + 0.15, !!opt.closed), opt.kerb, !!opt.closed, 1.0, opt.skip);
    if (opt.kerb2) kerbLine(offsetLine(pts, -(w / 2 + 0.15), !!opt.closed), opt.kerb2, !!opt.closed, 1.0, opt.skip2);
    roadsXN.push(opt.closed ? pts.concat([pts[0]]) : pts);
  }
  const arrow = (b, x, n, yaw, key = 'lineW') => {
    const sh = new THREE.Shape([new THREE.Vector2(-0.12, -1.6), new THREE.Vector2(0.12, -1.6), new THREE.Vector2(0.12, 0.3), new THREE.Vector2(0.45, 0.3), new THREE.Vector2(0, 1.4), new THREE.Vector2(-0.45, 0.3), new THREE.Vector2(-0.12, 0.3)]);
    const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); T(g, x, Y + 0.052, -n, yaw); b.put(key, g);
  };
  const hatch = (x0, n0, x1, n1, key = 'lineW', ang = 0.7) => {
    ground.put(key, ribbon([[x0, n0], [x1, n0], [x1, n1], [x0, n1]], 0.18, Y + 0.052, true));
    const cx = (x0 + x1) / 2, cn = (n0 + n1) / 2, L = Math.hypot(x1 - x0, n1 - n0);
    for (let s = -L / 2; s < L / 2; s += 0.9) {
      const pts = [];
      for (const t of [-L, L]) { const x = cx + Math.cos(ang) * t - Math.sin(ang) * s, n = cn + Math.sin(ang) * t + Math.cos(ang) * s; pts.push([x, n]); }
      const clip = clipSeg(pts[0], pts[1], x0, n0, x1, n1); if (clip) ground.put(key, ribbon(clip, 0.35, Y + 0.052));
    }
  };
  function clipSeg(a, b, x0, n0, x1, n1) {
    let t0 = 0, t1 = 1; const dx = b[0] - a[0], dn = b[1] - a[1];
    for (const [p, q] of [[-dx, a[0] - x0], [dx, x1 - a[0]], [-dn, a[1] - n0], [dn, n1 - a[1]]]) { if (!p) { if (q < 0) return null; continue; } const t = q / p; if (p < 0) { if (t > t1) return null; if (t > t0) t0 = t; } else { if (t < t0) return null; if (t < t1) t1 = t; } }
    return [[a[0] + dx * t0, a[1] + dn * t0], [a[0] + dx * t1, a[1] + dn * t1]];
  }
  const hedgeRun = (pts, h = 0.85, w = 0.8, key = 'hedge', balls = 0, closed = false) => {
    const q = closed ? pts.concat([pts[0]]) : pts;
    for (let i = 0; i < q.length - 1; i++) {
      const a = q[i], c = q[i + 1], L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L < 0.2) continue;
      ground.put(key, T(boxG(w, h, L + w * 0.6), (a[0] + c[0]) / 2, Y + h / 2, -(a[1] + c[1]) / 2, Math.atan2(c[0] - a[0], -(c[1] - a[1]))));
    }
    if (balls) along(q, balls, (x, n) => inst.topiary.push([x, n, h + 0.35]), balls / 2);
  };
  // stripes repeat along the road and run across it; ew: the road runs east-west
  const zebra = (x, n, ew, w, band = 4) => { for (let k = -band / 2 + 0.25; k <= band / 2 - 0.25; k += 1.0) ground.put('lineW', ew ? T(boxG(0.5, 0.012, w - 0.6), x + k, Y + 0.052, -n) : T(boxG(w - 0.6, 0.012, 0.5), x, Y + 0.052, -(n + k))); };
  const dirtAt = (x, n, r) => inst.dirt ? inst.dirt.push([x, n, r]) : (inst.dirt = [[x, n, r]]);
  const rainAt = (x, n, s = 1, v = -1) => { inst.trees.push([x, n, s, v < 0 ? (R() * 3) | 0 : v, R() * 6.28]); tree(x, n, 0.5 * s); dirtAt(x, n, 4.6 * s); };

  // ---------- ground, Yoongthong, the apron ----------
  ground.put('lawn', flatXN([[BOX.x0, BOX.n0], [BOX.x1, BOX.n0], [BOX.x1, BOX.n1], [BOX.x0, BOX.n1]], Y - 0.005));
  mapAreas.push({ k: 'lawn', p: [[BOX.x0, BOX.n0], [BOX.x1, BOX.n0], [BOX.x1, BOX.n1], [BOX.x0, BOX.n1]] });
  for (const nn of [YT.n - 6.5, YT.n + 6.5]) road([[YT.x0, nn], [YT.x1, nn]], 7, 'asphalt', Y + 0.03, { centreW: true });
  kerbLine([[YT.x0, YT.n - 10.15], [YT.x1, YT.n - 10.15]], [0x8c2f3c, 0xf2f2f2], false, 1.0, (x) => Math.abs(x) < 5);
  ground.put('isle', flatXN([[YT.x0, YT.n - 3], [YT.x1, YT.n - 3], [YT.x1, YT.n + 3], [YT.x0, YT.n + 3]], Y + 0.06));
  kerbLine([[YT.x0, YT.n - 3], [YT.x1, YT.n - 3]], [0x8c2f3c, 0xf2f2f2]); kerbLine([[YT.x0, YT.n + 3], [YT.x1, YT.n + 3]], [0x8c2f3c, 0xf2f2f2]);
  for (let x = YT.x0 + 6; x < YT.x1; x += 12) { if (Math.abs(x) < 9) continue; inst.flame.push([x, YT.n, R() * 6.28]); }
  for (let x = YT.x0 + 12; x < YT.x1; x += 35) { inst.lampR.push([x, YT.n, 0, 10]); inst.lampR.push([x, YT.n, Math.PI, 10]); }
  kerbLine([[YT.x0, YT.n + 10.15], [-21.5, YT.n + 10.15]], [0x8c2f3c, 0xf2f2f2]); kerbLine([[21.5, YT.n + 10.15], [YT.x1, YT.n + 10.15]], [0x8c2f3c, 0xf2f2f2]);
  for (let x = YT.x0 + 4; x < YT.x1; x += 32) { if (Math.abs(x) < 8) continue; inst.post.push([x, YT.n - 12, 9]); }
  roadsXN.push([[0, YT.n - 10], [0, 0]]);
  zebra(-9, YT.n - 6.5, true, 7); zebra(-9, YT.n + 6.5, true, 7);
  // apron: splayed mouth about 42 m wide at Yoongthong, 14 m at the arch
  const apL = [], apR = [];
  for (let i = 0; i <= 14; i++) { const t = i / 14; apL.push(bez([-7, 0], [-8.5, -24], [-21, YT.n + 10], t)); apR.push(bez([7, 0], [8.5, -24], [21, YT.n + 10], t)); }
  const apron = apL.slice().reverse().concat(apR).map((p) => [p[0], p[1]]);
  ground.put('apron', flatXN(apron.concat([[21, YT.n + 3], [-21, YT.n + 3]]), Y + 0.025));
  mapAreas.push({ k: 'apron', p: apron.concat([[21, YT.n + 10], [-21, YT.n + 10]]) }, { k: 'apron', p: [[-GW / 2, 0], [GW / 2, 0], [GW / 2, LOOP.n0 - 3.5], [-GW / 2, LOOP.n0 - 3.5]] });
  kerbLine(apL); kerbLine(apR);
  hatch(-15.5, -31, -9.5, -17, 'lineW', 0.9); hatch(9.5, -31, 15.5, -17, 'lineW', -0.9);
  arrow(ground, -4.6, -14, 0); arrow(ground, -1.4, -14, 0); arrow(ground, -4.6, -4, 0); arrow(ground, -1.4, -4, 0); arrow(ground, 3.6, -10, Math.PI);
  along([[0, -34], [0, -1]], 6, (x, n) => inst.dash.push([x + 1.5, n, 0, 1]), 1);
  along([[-3, -34], [-3, -1]], 6, (x, n) => inst.dash.push([x, n, 0, 0]), 1);

  // ---------- the gate: brick pillars, iron arch, seal, lettered laterite wall, drum, flags ----------
  {
    const b = bld(group('gate'), 0, 0, 0);
    const SPAN = 14.9, PX = SPAN / 2 + 0.55;
    for (const s of [-1, 1]) {
      const u = s * PX;
      b.box('trim', u, 0, 0, 1.4, 0.45, 1.4); b.box('brick', u, 0.45, 0, 1.1, 2.15, 1.1); b.box('trim', u, 2.6, 0, 1.22, 0.22, 1.22); b.box('brick', u, 2.82, 0, 1.1, 2.38, 1.1);
      b.box('trim', u, 5.2, 0, 1.5, 0.32, 1.5); b.box('trim', u, 5.52, 0, 1.2, 0.12, 1.2);
      for (const [du, dv] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box('iron', u + du * 0.27, 5.64, dv * 0.27, 0.05, 0.85, 0.05);
      for (const yy of [5.66, 6.1, 6.46]) for (const s2 of [-1, 1]) { b.box('iron', u + s2 * 0.27, yy, 0, 0.05, 0.05, 0.6); b.box('iron', u, yy, s2 * 0.27, 0.6, 0.05, 0.05); }
      b.box('lampHead', u, 5.7, 0, 0.36, 0.7, 0.36);
      b.add('iron', T(new THREE.ConeGeometry(0.46, 0.42, 4), u, 6.7, 0, Math.PI / 4)); b.add('gold', T(new THREE.ConeGeometry(0.05, 0.45, 6), u, 7.12, 0));
      b.add('gold', T(new THREE.SphereGeometry(0.11, 8, 6), u, 6.18, 0));
      b.solidU(u, 0, 1.5, 1.5, 6);
    }
    // shallow arc: rise 1.5 m over the span, band 0.6 m deep with the name on a cream strip
    const sx = SPAN / 2, rise = 1.5, Rr = (sx * sx + rise * rise) / (2 * rise), cyA = 5.15 + rise - Rr, th = Math.asin(sx / Rr);
    const strip = (r0, r1, z, flip, key) => {
      const pos = [], uv = [], N = 40;
      for (let i = 0; i < N; i++) {
        const a0 = -th + 2 * th * i / N, a1 = -th + 2 * th * (i + 1) / N;
        const P = (a, rr) => [Math.sin(a) * rr, cyA + Math.cos(a) * rr];
        const q = [P(a0, r0), P(a1, r0), P(a1, r1), P(a0, r0), P(a1, r1), P(a0, r1)];
        const us = [i / N, (i + 1) / N, (i + 1) / N, i / N, (i + 1) / N, i / N], vs = [0, 0, 1, 0, 1, 1];
        const ord = flip ? [0, 2, 1, 3, 5, 4] : [0, 1, 2, 3, 4, 5];
        for (const k of ord) { pos.push(q[k][0], q[k][1], z); uv.push(flip ? 1 - us[k] : us[k], vs[k]); }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
      b.add(key, g);
    };
    MAT.band = new THREE.MeshStandardMaterial({ map: canvasTex(2048, 128, (g, w, h) => {
      g.fillStyle = '#e9e2c8'; g.fillRect(0, 0, w, h); g.fillStyle = '#23402f'; g.fillRect(0, 0, w, 12); g.fillRect(0, h - 12, w, 12);
      g.font = '700 74px Georgia, "Times New Roman", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#6b4e12'; g.fillText('ASIAN  INSTITUTE  OF  TECHNOLOGY', w / 2 + 2, h / 2 + 4); g.fillStyle = '#b8892e'; g.fillText('ASIAN  INSTITUTE  OF  TECHNOLOGY', w / 2, h / 2 + 2);
    }), roughness: 0.55, metalness: 0.15 });
    strip(Rr - 0.3, Rr + 0.3, 0.13, false, 'band'); strip(Rr - 0.3, Rr + 0.3, -0.13, true, 'band');
    const arcRod = (rr, rad, a0 = -th, a1 = th, z = 0, key = 'iron') => { const N = 30; for (let i = 0; i < N; i++) { const p = (a) => P3(Math.sin(a) * rr, cyA + Math.cos(a) * rr, -z); b.add(key, rod(p(a0 + (a1 - a0) * i / N), p(a0 + (a1 - a0) * (i + 1) / N), rad, rad, 5)); } };
    for (const z of [-0.14, 0.14]) { arcRod(Rr - 0.32, 0.05, -th, th, z); arcRod(Rr + 0.32, 0.05, -th, th, z); }
    arcRod(Rr + 1.35, 0.06, -th * 0.94, th * 0.94);
    for (let i = 0; i <= 22; i++) {
      const a = -th * 0.94 + 2 * th * 0.94 * i / 22, p0 = P3(Math.sin(a) * (Rr + 0.32), cyA + Math.cos(a) * (Rr + 0.32), 0), p1 = P3(Math.sin(a) * (Rr + 1.35), cyA + Math.cos(a) * (Rr + 1.35), 0);
      b.add('iron', rod(p0, p1, 0.025, 0.025, 4));
      if (i < 22 && Math.abs(a) > 0.06) {
        const am = a + th * 0.94 / 22, c = P3(Math.sin(am) * (Rr + 0.82), cyA + Math.cos(am) * (Rr + 0.82), 0);
        const sc = new THREE.TorusGeometry(0.2, 0.022, 4, 14, Math.PI * 1.55); T(sc, c.x, c.y + 0.12, 0, 0, 0, am + (i % 2 ? 0.3 : 3.4)); b.add(i % 4 === 1 ? 'gold' : 'iron', sc);
        const sc2 = new THREE.TorusGeometry(0.13, 0.02, 4, 12, Math.PI * 1.5); T(sc2, c.x, c.y - 0.22, 0, 0, 0, am + (i % 2 ? 3.6 : 0.5)); b.add('iron', sc2);
      }
    }
    const crest = cyA + Rr + 1.35, sealY = crest + 0.95;
    MAT.seal = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.4, metalness: 0.3, map: canvasTex(256, 256, (g) => {
      g.fillStyle = '#16362a'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
      g.strokeStyle = '#d8b25a'; g.lineWidth = 9; g.beginPath(); g.arc(128, 128, 112, 0, 7); g.stroke(); g.lineWidth = 3; g.beginPath(); g.arc(128, 128, 96, 0, 7); g.stroke();
      g.fillStyle = '#d8b25a'; g.font = '700 16px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const s = 'ASIAN INSTITUTE OF TECHNOLOGY • ';
      for (let i = 0; i < s.length; i++) { const a = -Math.PI / 2 + (i / s.length) * Math.PI * 2; g.save(); g.translate(128 + Math.cos(a) * 104, 128 + Math.sin(a) * 104); g.rotate(a + Math.PI / 2); g.fillText(s[i], 0, 0); g.restore(); }
      g.lineWidth = 4; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; g.beginPath(); g.ellipse(128 + Math.cos(a) * 60, 128 + Math.sin(a) * 60, 14, 5, a + 0.6, 0, Math.PI * 1.3); g.stroke(); }
      g.font = '700 54px Georgia, serif'; g.fillText('AIT', 128, 132);
    }) });
    b.add('seal', T(new THREE.CircleGeometry(0.8, 32), 0, sealY, 0.06)); b.add('seal', T(new THREE.CircleGeometry(0.8, 32), 0, sealY, -0.06, Math.PI));
    b.add('gold', T(new THREE.TorusGeometry(0.84, 0.07, 6, 32), 0, sealY, 0)); b.add('gold', T(new THREE.CylinderGeometry(0.8, 0.8, 0.1, 32), 0, sealY, 0, 0, Math.PI / 2));
    for (const s of [-1, 1]) {
      for (let k = 0; k < 3; k++) { const sc = new THREE.TorusGeometry(0.34 - k * 0.07, 0.03, 4, 14, Math.PI * 1.4); T(sc, s * (1.2 + k * 0.62), crest + 0.25 + k * 0.08, 0, 0, 0, s > 0 ? 3.6 - k * 0.4 : -0.5 + k * 0.4); b.add(k === 1 ? 'gold' : 'iron', sc); }
      b.add('gold', T(new THREE.ConeGeometry(0.05, 0.4, 6), s * 0.55, sealY + 0.95, 0));
    }
    b.add('gold', T(new THREE.ConeGeometry(0.07, 0.6, 6), 0, sealY + 1.12, 0));
    // the lettered wall: low curved laterite wall from the west pillar to the Yoongthong corner drum
    const wP0 = [-9.4, -1.4], wC = [-12.4, -27.5], wP2 = [-30.5, YT.n + 11.6];
    const wall = []; for (let i = 0; i <= 28; i++) wall.push(bez(wP0, wC, wP2, i / 28));
    const wb = bld(group('gatewall'), 0, 0, 0);
    for (let i = 0; i < wall.length - 1; i++) {
      const a = wall[i], c = wall[i + 1], L = Math.hypot(c[0] - a[0], c[1] - a[1]), yaw = Math.atan2(c[0] - a[0], -(c[1] - a[1]));
      wb.add('laterite', T(boxG(0.55, 1.4, L + 0.05), (a[0] + c[0]) / 2, 0.7, -(a[1] + c[1]) / 2, yaw));
      wb.add('concrete', T(boxG(0.7, 0.1, L + 0.05), (a[0] + c[0]) / 2, 1.45, -(a[1] + c[1]) / 2, yaw));
      wb.add('laterite', T(boxG(1.4, 0.55, L + 0.05), (a[0] + c[0]) / 2 - Math.cos(yaw) * 1.6, 0.27, -(a[1] + c[1]) / 2 + Math.sin(yaw) * 1.6, yaw));
      solid((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, 0.6, L, yaw, 1.5);
    }
    const name = 'ASIAN INSTITUTE OF TECHNOLOGY', wl = polyLen(wall);
    // read from the road: the first letter sits at the drum end (the reader's left), the last by the pillar
    let s0 = wl * 0.12; const step = (wl * 0.78) / name.length;
    for (const ch of name) {
      if (ch !== ' ') {
        let acc = 0; const sAt = wl - s0;
        for (let i = 0; i < wall.length - 1; i++) {
          const a = wall[i], c = wall[i + 1], L = Math.hypot(c[0] - a[0], c[1] - a[1]);
          if (acc + L >= sAt) {
            const t = (sAt - acc) / L, x = a[0] + (c[0] - a[0]) * t, n = a[1] + (c[1] - a[1]) * t, yaw = Math.atan2(c[0] - a[0], -(c[1] - a[1]));
            const g = text(ch, 0.46, 0.06); T(g, x + Math.cos(yaw) * 0.31, 0.62, -n - Math.sin(yaw) * 0.31, yaw + Math.PI / 2);
            wb.add('steel', g); break;
          }
          acc += L;
        }
      }
      s0 += step;
    }
    const drum = cyl(2.0, 2.0, 3.0, 28); T(drum, wP2[0] - 1.6, 0, -(wP2[1] - 0.6)); wb.add('oxblood', drum);
    const cap = cyl(2.1, 2.1, 0.16, 28); T(cap, wP2[0] - 1.6, 3.0, -(wP2[1] - 0.6)); wb.add('trim', cap);
    { const [dx, dz] = W(wP2[0] - 1.6, wP2[1] - 0.6); circles.push({ x: dx, z: dz, r: 2.1 }); }
    // flags: twenty national flags on 6 m white poles, following the wall behind the planter
    const fl = offsetLine(wall, 4.2), fgeo = [], pgeo = [];
    MAT.flags = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8, map: canvasTex(1024, 240, (g) => { FLAGS.forEach((f, i) => { g.save(); g.translate((i % 8) * 128, ((i / 8) | 0) * 80); g.beginPath(); g.rect(0, 0, 128, 80); g.clip(); f(g, 128, 80); g.restore(); }); }) });
    for (let i = 0; i < 20; i++) {
      const t = 0.05 + 0.9 * i / 19, p = fl[Math.round(t * (fl.length - 1))];
      pgeo.push(T(cyl(0.05, 0.035, 6.4, 6), p[0], 0, -p[1]));
      const g = new THREE.PlaneGeometry(1.5, 1.0, 8, 1), pa = g.attributes.position, uv = g.attributes.uv, k = i % 23, cu = (k % 8) / 8, cv = 1 - (((k / 8) | 0) + 1) * 80 / 240;
      for (let j = 0; j < pa.count; j++) { const x = pa.getX(j) + 0.75; pa.setX(j, x); pa.setZ(j, Math.sin(x * 3.1 + i) * 0.09 * x); pa.setY(j, pa.getY(j) - x * 0.06); uv.setXY(j, cu + uv.getX(j) / 8, cv + uv.getY(j) * 80 / 240); }
      g.computeVertexNormals(); T(g, p[0], 5.7, -p[1], Math.PI / 2 + 0.5 + (i % 3) * 0.12); fgeo.push(g);
    }
    wb.add('cloth', mergeGeometries(pgeo.map((g) => g.toNonIndexed()), false)); MAT.cloth.color.setHex(0xf4f4f0);
    wb.add('flags', mergeGeometries(fgeo.map((g) => g.toNonIndexed()), false));
    along(offsetLine(wall, 1.7), 2.2, (x, n) => inst.blooms.push([x, n, 1.3 + R() * 0.4]), 1);
    block('gate', 0, 0, 18, 2, 0, 8);
  }
  // east of the arch: red-white kerb on the splay, a raised grass island, the rain-tree park on dry dirt
  ground.put('isle', flatXN([[9.5, -30], [17, -30], [12, -6], [9, -6]], Y + 0.06));
  for (const [x, n, s] of [[16, -24, 1.1], [30, -12, 1.2], [26, 10, 1], [42, 26, 1.15], [20, 32, 0.95], [44, -2, 1], [34, 48, 1.1], [-26, -2, 0.9], [-44, 8, 1.1], [-40, 52, 1]]) rainAt(x, n, s);

  // ---------- inside the arch: gate road, booth island, guard house, bike shed, stalls ----------
  road([[0, 0], [0, LOOP.n0 - LOOP.w / 2 + 0.2]], GW, 'apron', Y + 0.03, { centre: false, kerb: KERB_RW, kerb2: KERB_RW });
  along([[1.2, 2], [1.2, 30]], 6, (x, n) => inst.dash.push([x, n, 0, 1]), 1); along([[1.2, 49], [1.2, 64]], 6, (x, n) => inst.dash.push([x, n, 0, 1]), 1);
  along([[-2.6, 2], [-2.6, 64]], 6, (x, n) => inst.dash.push([x, n, 0, 0]), 1);
  for (const s of [-1, 1]) ground.put('lineW', ribbon([[s * (GW / 2 - 0.35), 0], [s * (GW / 2 - 0.35), LOOP.n0 - LOOP.w / 2]], 0.13, Y + 0.05));
  ground.put('pave', ribbon([[-GW / 2 - 1.4, 0], [-GW / 2 - 1.4, LOOP.n0 - 4]], 2.6, Y + 0.08));
  for (const n of [4, 20, 36, 52]) inst.lampR.push([-GW / 2 - 1.1, n, Math.PI / 2, 8]);
  hedgeRun([[GW / 2 + 1.0, 3], [GW / 2 + 1.0, 60]], 0.8, 0.9, 'bouga');
  for (let k = 0; k < 11; k++) ground.put(k % 2 ? 'lineK' : 'lineY', T(boxG(0.6, 0.012, 1.4), -5.7 + k * 0.6, Y + 0.052, -27));
  {
    MAT.paint = new THREE.MeshStandardMaterial({ roughness: 0.7, transparent: true, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6, map: canvasTex(512, 256, (g) => { g.clearRect(0, 0, 512, 256); g.fillStyle = '#e88a22'; g.font = '800 200px Segoe UI, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('AIT', 256, 130); }) });
    const pg = new THREE.PlaneGeometry(5.6, 2.8); pg.rotateX(-Math.PI / 2); T(pg, -2.6, Y + 0.054, -53, 0); ground.put('paint', pg);
    for (let k = 0; k < 3; k++) for (const s of [-1, 1]) ground.put('paintO', T(boxG(0.32, 0.012, 1.9), -2.6 + s * 1.1, Y + 0.052, -(57.5 + k * 1.3), s * 0.75));
  }
  {
    const b = bld(group('gatehouse'), 0, 0, 0);
    // booth island and booth (v74): maroon walls, white corner columns, white overhanging flat roof
    b.box('concrete', 1.9, 0, -40, 3.0, 0.2, 14); kerbLine([[0.35, 33], [0.35, 47], [3.45, 47], [3.45, 33]], KERB_RW, true, 0.7);
    b.box('maroon', 1.9, 0.2, -40, 2.4, 2.6, 2.4); for (const [du, dv] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box('trim', 1.9 + du * 1.18, 0.2, -40 + dv * 1.18, 0.24, 2.7, 0.24);
    for (const [u, v, w, d] of [[1.9, -38.78, 1.5, 0.05], [1.9, -41.22, 1.5, 0.05], [0.68, -40, 0.05, 1.4], [3.12, -40, 0.05, 1.4]]) b.box('glass', u, 1.1, v, w, 1.1, d);
    b.box('trim', 1.9, 2.9, -40, 3.6, 0.22, 3.6); b.box('trim', 1.9, 2.8, -40, 3.4, 0.1, 3.4);
    MAT.welcome = new THREE.MeshStandardMaterial({ roughness: 0.6, map: canvasTex(512, 96, (g) => { g.fillStyle = '#123a6e'; g.fillRect(0, 0, 512, 96); g.fillStyle = '#fff'; g.font = '700 54px Segoe UI, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('WELCOME TO AIT', 256, 50); }) });
    b.add('welcome', T(new THREE.PlaneGeometry(2.3, 0.42), 1.9, 2.48, -38.74));
    b.solidU(1.9, -40, 2.8, 2.8, 3.1);
    // lift barriers, raised: each arm pivots on its post and points up over its lanes
    for (const [u, v, s] of [[-0.2, -45.2, -1], [3.9, -34.8, 1]]) { b.box('paintY', u, 0.2, v, 0.22, 1.0, 0.22); const th = 0.9; b.add('paintR', T(boxG(3.6, 0.09, 0.09), u + s * 1.8 * Math.cos(th), 1.1 + 1.8 * Math.sin(th), v, 0, 0, s * th)); }
    for (let k = 0; k < 6; k++) inst.cone.push([-5.4 + k * 1.05, 47.4]);
    for (let k = 0; k < 3; k++) inst.cone.push([4.0 + k * 0.7, 31.5]);
    // guard house (v74): single storey, maroon walls, white frames, white flat roof with a deep fascia, round veranda columns
    const g2 = bld(group('guardhouse'), -17, 26, Math.PI / 2);
    g2.box('paintR', 0, 0, 0, 12.2, 0.45, 6.2); g2.box('maroon', 0, 0.45, -0.4, 12, 2.75, 5.2);
    g2.punch([-5.6, 2.2], [5.6, 2.2], 1.05, 1.3, 1.25, 2.4, 'trim', 0.14);
    g2.box('glass', 0, 0.45, 2.21, 1.2, 2.2, 0.04); g2.box('trim', 0, 2.65, 2.25, 1.5, 0.12, 0.14);
    g2.box('trim', 0, 3.2, 0.2, 13.4, 0.32, 7.6); g2.box('trim', 0, 3.52, 0.2, 13.4, 0.36, 0.22, 0);
    for (let k = -2; k <= 2; k++) g2.add('trim', T(cyl(0.16, 0.16, 2.75, 10), k * 2.8, 0.45, 2.95));
    g2.box('concrete', 0, 0, 2.6, 12.6, 0.45, 2.2); g2.ac(-6.2, 1.8, -1.3, -Math.PI / 2);
    g2.solidU(0, -0.4, 12.2, 5.4, 3.6);
    block('guardhouse', -17, 26, 12, 6, Math.PI / 2, 3.6);
    // covered bike shed behind it, flat roof on posts
    const sh = bld(group('bikeshed'), -29, 26, Math.PI / 2);
    sh.box('corr', 0, 2.55, 0, 24, 0.08, 4.4); sh.box('trim', 0, 2.48, 2.2, 24, 0.2, 0.12); sh.box('trim', 0, 2.48, -2.2, 24, 0.2, 0.12);
    for (let k = -4; k <= 4; k++) for (const s of [-1, 1]) { sh.box('frame', k * 2.95, 0, s * 1.95, 0.1, 2.55, 0.1); const [cx, cn] = sh.toXN(k * 2.95, s * 1.95); tree(cx, cn, 0.12); }
    for (let k = 0; k < 30; k++) inst.bike.push([-29 + (k % 2 ? 0.9 : -0.9), 15 + (k >> 1) * 1.45, 0.1 + (k % 2) * 3.0, k]);
    // stalls by the guard house: blue and white umbrellas over tables, a white golf-cart shuttle
    for (const [x, n, c] of [[-10.6, 37.5, 'blueU'], [-11.2, 41.8, 'whiteU'], [-10.4, 46, 'blueU']]) {
      b.add('frame', T(cyl(0.035, 0.035, 2.3, 5), x, 0, -n));
      const top = new THREE.ConeGeometry(1.35, 0.42, 8, 1, true); T(top, x, 2.35, -n); b.add(c, top);
      b.box('cream', x, 0.72, -n, 1.4, 0.06, 0.8); b.box('frame', x, 0, -n, 0.06, 0.72, 0.06);
      tree(x, n, 0.25);
    }
    b.box('cart', -11.4, 0.35, -22, 1.3, 0.75, 2.4); b.box('cart', -11.4, 2.0, -22.2, 1.4, 0.08, 2.5); for (const [du, dv] of [[-0.6, -1.0], [0.6, -1.0], [-0.6, 0.9], [0.6, 0.9]]) b.box('frame', -11.4 + du, 1.1, -22.2 + dv, 0.05, 0.9, 0.05);
    b.box('glass', -11.4, 1.15, -20.98, 1.2, 0.7, 0.03); for (const [du, dv] of [[-0.62, -0.8], [0.62, -0.8], [-0.62, 0.8], [0.62, 0.8]]) b.add('tyre', T(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 12), -11.4 + du, 0.24, -22 + dv, 0, 0, Math.PI / 2));
    b.box('paintY', -11.2, 0, -12.5, 0.6, 0.95, 0.6); b.box('cream', -11.2, 0, -14.5, 0.75, 1.1, 0.45);
    MAT.signA = new THREE.MeshStandardMaterial({ roughness: 0.6, map: canvasTex(64, 64, (g) => { g.fillStyle = '#1a4a8a'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#fff'; g.font = '800 46px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('A', 32, 35); }) });
    b.box('pole', -6.9, 0, -30, 0.06, 2.2, 0.06); b.add('signA', T(new THREE.PlaneGeometry(0.5, 0.5), -6.9, 2.3, -29.96));
    // police check point outside, across from the wall (v07): cream walls, red trim, flat roof
    const pb = bld(group('checkpoint'), -52, -27, Math.PI / 2);
    pb.box('cream', 0, 0, 0, 7, 3, 5); pb.box('paintR', 0, 3, 0, 7.4, 0.35, 5.4); pb.box('trim', 0, 3.35, 0, 7.6, 0.12, 5.6);
    pb.punch([-3, 2.51], [3, 2.51], 1.0, 1.2, 1.2, 2.6, 'trim', 0.12);
    MAT.police = new THREE.MeshStandardMaterial({ roughness: 0.6, map: canvasTex(512, 64, (g) => { g.fillStyle = '#f4efe2'; g.fillRect(0, 0, 512, 64); g.fillStyle = '#7d1f1f'; g.font = '700 30px Segoe UI, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('AIT CHECK POINT  ·  POLICE', 256, 34); }) });
    pb.add('police', T(new THREE.PlaneGeometry(5.4, 0.5), 0, 3.18, 2.72)); pb.solidU(0, 0, 7.2, 5.2, 3.5);
    block('checkpoint', -52, -27, 7, 5, Math.PI / 2, 3.5);
  }

  // ---------- the loop road, B Street, the palm island ----------
  const loop = loopPts(LOOP, 2);
  // the loop runs anticlockwise, so kerb (left) is the inner verge: only north of B Street, the island has its own
  road(loop, LOOP.w, 'asphalt', Y + 0.035, { closed: true, kerb: [KERB_G], kerb2: [KERB_G], skip: (x, n) => n < BST.n + 4, skip2: inMouth });
  const bst = [[LOOP.x0 + LOOP.w / 2 - 0.4, BST.n], [LOOP.x1 - LOOP.w / 2 + 0.4, BST.n]];
  road(bst, BST.w, 'asphaltN', Y + 0.04, { kerb: KERB_RW, kerb2: KERB_RW });
  for (const x of [-38, -26, -14, -2, 10, 22, 34]) { inst.palms.push([x, BST.n + 5.6, 0.62, 1]); inst.palms.push([x + 6, BST.n - 5.4, 0.66, 1]); tree(x, BST.n + 5.6, 0.3); tree(x + 6, BST.n - 5.4, 0.3); }
  for (const x of [-44, -18, 8, 30]) inst.lampR.push([x, BST.n - 4.4, Math.PI, 8]);
  zebra(-14, LOOP.n0, true, LOOP.w);
  zebra(LOOP.x0, 132, false, LOOP.w);
  hatch(-9, LOOP.n0 - 2.6, -2, LOOP.n0 + 2.6, 'lineW', 0.8);
  arrow(ground, -1.5, LOOP.n0 - 8, 0); arrow(ground, -4.6, LOOP.n0 - 8, 0);
  // rumble strip of wide diagonal yellow bars on the bend before the motorbike apron (chairman-island-loop-3)
  {
    let bi = 0, bd = 1e9; loop.forEach((p, i) => { const d = Math.hypot(p[0] + 47, p[1] - 79); if (d < bd) { bd = d; bi = i; } });
    const p = loop[bi], q = loop[(bi + 1) % loop.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]), tx = (q[0] - p[0]) / L, tn = (q[1] - p[1]) / L, yaw = Math.atan2(tx, -tn);
    for (let k = -2; k <= 2; k++) ground.put('lineY', T(boxG(LOOP.w - 0.6, 0.012, 0.45), p[0] + tx * k * 1.1, Y + 0.052, -(p[1] + tn * k * 1.1), yaw + Math.PI / 2 + 0.35));
  }
  // island block between the loop's south side, its legs and B Street: watered lawn, red-white kerb
  const isleBlock = [];
  {
    const { x0, x1, n0, r } = LOOP, e = LOOP.w / 2 + 0.3, nTop = BST.n - BST.w / 2 - 0.3;
    isleBlock.push([x1 - e, nTop]);
    for (let i = 0; i <= 10; i++) { const a = 0 - (Math.PI / 2) * i / 10; isleBlock.push([x1 - r + Math.cos(a) * (r - e), n0 + r + Math.sin(a) * (r - e)]); }
    for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 - (Math.PI / 2) * i / 10; isleBlock.push([x0 + r + Math.cos(a) * (r - e), n0 + r + Math.sin(a) * (r - e)]); }
    isleBlock.push([x0 + e, nTop]);
  }
  ground.put('isle', flatXN(isleBlock, Y + 0.02));
  mapAreas.push({ k: 'isle', p: isleBlock });
  kerbLine(isleBlock, KERB_RW, false, 1.0);
  {
    const b = bld(group('island'), 0, 0, 0);
    const oval = ellipse(ISLE.x, ISLE.n, ISLE.a, ISLE.b, 56);
    hedgeRun(oval, 0.65, 0.75, 'hedge', 0, true);
    for (const s of [-1, 1]) {
      const rc = [[s * 5, 88.6], [s * 21.5, 88.6], [s * 21.5, 95.4], [s * 5, 95.4]];
      hedgeRun(rc, 0.55, 0.6, 'hedge', 0, true);
      const ch = [[s * 6.5, 91.1], [s * 20, 91.1], [s * 20, 92.9], [s * 6.5, 92.9]];
      ground.put('canal', flatXN(ch, Y + 0.07)); ground.put('concrete', ribbon(ch, 0.35, Y + 0.12, true));
      for (let k = 0; k < 6; k++) inst.lotus = (inst.lotus || []).concat([[s * (8 + k * 2), 91.6 + (k % 2) * 0.8]]);
    }
    for (let i = 0; i < 22; i++) { const t = i / 22 * Math.PI * 2; const x = Math.cos(t) * ISLE.a * 0.8, n = ISLE.n + Math.sin(t) * ISLE.b * 0.72; inst.palms.push([x, n, 0.66 + R() * 0.16, 0]); tree(x, n, 0.3); }
    for (const x of [-24, -12.5, 12.5, 24]) for (const n of [86, 98]) { if (Math.abs(x) > 23 && Math.abs(n - ISLE.n) > 4) continue; inst.palms.push([x + (R() - 0.5), n, 0.72 + R() * 0.14, 0]); tree(x, n, 0.3); }
    for (const [x, n] of [[-34, 104], [36, 103], [-42, 82], [44, 82]]) rainAt(x, n, 0.95, 2);
    // the shrine: plinth, a small gold-roofed niche and a white figure
    b.box('trim', 0, 0, -92, 2.4, 0.5, 2.4); b.box('trim', 0, 0.5, -92, 1.6, 0.8, 1.6); b.box('gold', 0, 1.3, -92, 1.75, 0.08, 1.75);
    b.add('letterW', T(cyl(0.26, 0.2, 0.9, 10), 0, 1.38, -92)); b.add('letterW', T(new THREE.SphereGeometry(0.18, 10, 8), 0, 2.42, -92)); b.add('gold', T(new THREE.ConeGeometry(0.1, 0.32, 8), 0, 2.72, -92));
    b.solidU(0, -92, 2.4, 2.4, 2.8);
    for (let k = 0; k < 12; k++) { const t = k / 12 * Math.PI * 2; inst.blooms.push([Math.cos(t) * 3.2, 92 + Math.sin(t) * 3.2, 0.9]); }
    // WELCOME: freestanding white letters on the hedge line, facing the gate road
    b.word('letterW', 'WELCOME', 0.85, 0.16, 0, Y + 0.08, -(ISLE.n - ISLE.b - 1.6), 0, 0.22);
    for (let i = 0; i < 7; i++) b.box('concrete', -3.6 + i * 1.2, 0, -(ISLE.n - ISLE.b - 1.6), 0.9, 0.08, 0.35);
    block('island', 0, 92, 56, 24, 0, 1.2);
  }
  // hedges with clipped balls on the spine verges, lamps every 30 m
  const hx = LOOP.x0 - LOOP.w / 2 - 1.2, hn = LOOP.n1 + LOOP.w / 2 + 1.2;
  for (const [a, c] of [[116, 138], [146, 176]]) hedgeRun([[hx, a], [hx, c]], 0.85, 0.8, 'hedge', 7);
  for (const [a, c] of [[-30, -37], [-19, 23], [33, 30]]) if (Math.abs(c - a) > 2) hedgeRun([[Math.min(a, c), hn], [Math.max(a, c), hn]], 0.85, 0.8, 'hedge', 7);
  along(loop, 32, (x, n, dx, dn) => { const lx = x + dn * (LOOP.w / 2 + 0.7), ln = n - dx * (LOOP.w / 2 + 0.7); if (!inMouth(lx, ln)) inst.lampR.push([lx, ln, Math.atan2(-dn, -dx), 8]); }, 10, true);

  // ---------- stop 3: motorbike apron and the orange block ----------
  {
    const x = -93, n = 98;
    const b = bld(group('orange'), x, n, Math.PI / 2);
    const fp = rect(24, 14);
    b.prism('orange', fp, 0, 0.5); b.prism('orange', inset(fp, 0.2), 0.5, 3.4);
    b.punch([-11, 6.81], [-1.6, 6.81], 0.95, 1.6, 1.5, 2.3, 'redframe', 0.16); b.punch([2.4, 6.81], [11, 6.81], 0.95, 1.6, 1.5, 2.3, 'redframe', 0.16);
    b.box('trim', 0, 0, 7.0, 3.6, 3.6, 0.5); b.box('lobby', 0, 0, 6.7, 2.6, 2.8, 0.06);
    b.box('trim', 0, 3.4, 0, 24.8, 0.3, 14.8);
    const top = b.ribbonFloors(inset(fp, 0.1), 'white', 1, 3.3, { y0: 3.7, spandrel: 1.0, fin: 0.9 });
    b.roof(fp, top, 0.5, 0.75);
    for (const u of [-8, -2, 4, 10]) b.ac(u, 4.4, -7.25, Math.PI);
    b.solidU(0, 0, 24, 14, top + 1);
    block('orange', x, n, 24, 14, Math.PI / 2, top + 1);
    const ap = [[-84.5, 82], [LOOP.x0 - LOOP.w / 2, 82], [LOOP.x0 - LOOP.w / 2, 114], [-84.5, 114]];
    ground.put('pave', flatXN(ap, Y + 0.035)); mapAreas.push({ k: 'apron', p: ap });
    for (const cx of [-81.5, -77.5, -71, -67]) for (let k = 0; k < 28; k++) if (R() < 0.82) inst.moto.push([cx + (R() - 0.5) * 0.3, 84 + k * 1.05, cx < -75 ? Math.PI / 2 : -Math.PI / 2, (R() * 7) | 0]);
    for (let k = 0; k < 16; k++) inst.bike.push([-84.2 + (k % 2) * 0.3, 85 + k * 1.6, Math.PI / 2, k]);
    MAT.nopark = new THREE.MeshStandardMaterial({ roughness: 0.6, map: canvasTex(256, 128, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 128); g.strokeStyle = '#c0392b'; g.lineWidth = 10; g.strokeRect(6, 6, 244, 116); g.fillStyle = '#c0392b'; g.font = '700 38px Segoe UI, Arial'; g.textAlign = 'center'; g.fillText('NO PARKING', 128, 58); g.fillStyle = '#333'; g.font = '600 22px Segoe UI, Arial'; g.fillText('motorbikes on the apron', 128, 96); }) });
    const gb = bld(group('apron-sign'), -61.5, 117, Math.PI / 2);
    gb.box('pole', -0.7, 0, 0, 0.07, 1.9, 0.07); gb.box('pole', 0.7, 0, 0, 0.07, 1.9, 0.07); gb.add('nopark', T(new THREE.PlaneGeometry(1.6, 0.8), 0, 1.6, 0.05)); gb.add('nopark', T(new THREE.PlaneGeometry(1.6, 0.8), 0, 1.6, -0.05, Math.PI));
    for (const [tx, tn] of [[-110, 84], [-112, 116], [-70, 76]]) rainAt(tx, tn, 0.9, 2);
    inst.lampG.push([-84, 80], [-84, 116], [-62, 80]);
  }

  // ---------- stop 4: Student Village (mint, stepped) and Dorm Y ----------
  const sv = (label, cx, cn, floors) => {
    const b = bld(group(label), cx, cn, Math.PI / 2);
    const L = 18, D = 12; let fp = rect(L, D), y = 0, front = D / 2;
    for (let f = 0; f < floors; f++) {
      const h = 3.1;
      b.prism('mint', fp, y, y + 1.2); b.prism('glass', inset(fp, 0.3), y + 1.2, y + h - 0.45); b.mullions(fp, 0.3, y + 1.2, y + h - 0.45, 1.2);
      b.prism('mint', inset(fp, 0.05), y + h - 0.45, y + h - 0.25);
      b.prism('white', inset(fp, -0.25), y + h - 0.25, y + h);
      y += h;
      if (f < floors - 1) {
        const v1 = front - 2.2;
        b.rail(-L / 2 + 0.2, front - 0.15, L / 2 - 0.2, front - 0.15, y, 1.0, 'trim');
        for (const s of [-1, 1]) b.rail(s * (L / 2 - 0.2), v1, s * (L / 2 - 0.2), front - 0.15, y, 1.0, 'trim');
        for (let k = -3; k <= 3; k++) b.box('concrete', k * 2.5, y, v1 + 1.0, 0.6, 0.05, 0.6);
        front = v1; fp = [[-L / 2, -D / 2], [L / 2, -D / 2], [L / 2, front], [-L / 2, front]];
      }
    }
    b.roof(fp, y, 0.45, 0.55, 'white');
    b.word('letterK', label, 0.8, 0.08, -L / 2 + 2.6, y - 1.6, front + 0.05);
    b.solidU(0, 0, L, D, y + 1); block(label, cx, cn, L, D, Math.PI / 2, y + 1);
    for (const u of [-6, 0, 6]) b.ac(u, 1.6, -D / 2 - 0.17, Math.PI);
  };
  sv('SV 1', -84, 125, 2); sv('SV 2', -84, 147, 3);
  {
    const x = -103.5, n = 189, L = 46, D = 15, FH = 3.1, F = 4;
    const b = bld(group('dorm-y'), x, n, Math.PI / 2);
    const core = rect(L, D - 2.4, 0, -1.2);
    for (let f = 0; f < F; f++) {
      const y = f * FH;
      b.prism('white', core, y, y + FH);
      b.punch([L / 2, -D / 2], [-L / 2, -D / 2], y + 1.0, 1.3, 1.25, 3.6, 'trim', 0.16);
      for (let k = 0; k < 10; k++) {
        const u = -L / 2 + 3.4 + k * 4.4; b.box('orange', u + 0.75, y, 5.14, 0.7, 2.25, 0.08); b.box('frame', u, y, 5.13, 0.95, 2.1, 0.06); b.box('glass', u - 1.25, y + 1.0, 5.12, 1.0, 0.9, 0.04);
      }
      if (f > 0) {
        b.box('concrete', 0, y - 0.2, D / 2 - 1.2, L - 0.4, 0.2, 2.4);
        b.box('white', 0, y, D / 2 - 0.05, L - 0.4, 1.0, 0.18); b.box('lime', 0, y - 0.2, D / 2 + 0.04, L - 0.2, 0.3, 0.06);
      }
      b.box('lime', 0, y + FH - 0.3, -D / 2 - 0.03, L + 0.1, 0.3, 0.06);
    }
    for (let k = -4; k <= 4; k++) b.box('white', k * 5.6, 0, D / 2 - 0.3, 0.45, FH * F, 0.45);
    for (const s of [-1, 1]) {
      const u = s * (L / 2 + 2.2);
      b.box('white', u, 0, -1.2, 4.4, FH * F + 1.2, 0.3); b.box('white', u, 0, -1.2 - 3.5, 4.4, FH * F + 1.2, 0.3);
      b.box('white', u - s * 2.05, 0, -2.95, 0.3, FH * F + 1.2, 3.8);
      b.box('trim', u, FH * F + 1.2, -2.95, 4.8, 0.25, 4.2);
      for (let f = 0; f < F; f++) b.box('concrete', u, f * FH + 1.5, -2.95, 3.8, 0.12, 3.2);
      // breeze-block lattice: a white concrete screen with real holes, double skin
      for (const off of [0, 0.14]) { const g = new THREE.PlaneGeometry(3.8, FH * F + 0.6); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3.8 / 0.8, uv.getY(i) * (FH * F + 0.6) / 0.8); T(g, u + s * 2.2 + s * off, (FH * F + 0.6) / 2 + 0.3, -2.95, Math.PI / 2); b.add('breeze', g); }
      b.solidU(u, -2.95, 4.6, 4.2, FH * F + 1.4);
    }
    b.word('letterK', 'Y', 2.0, 0.2, L / 2 + 2.2, FH * F - 2.6, -1.2 + 0.16 + 0.1, 0);
    b.word('letterK', 'DORM Y', 0.55, 0.06, -L / 2 + 4, 0.9, D / 2 + 0.1, 0, 0.06);
    b.roof(core, FH * F, 0.5, 0.65, 'white'); b.prism('lime', inset(core, -0.52), FH * F + 0.32, FH * F + 0.42);
    b.solidU(0, -1.2, L, D - 2.4, FH * F + 1);
    block('dorm-y', x, n, L + 9, D, Math.PI / 2, FH * F + 1);
    ground.put('pave', flatXN([[-95, 168], [-70, 168], [-70, 210], [-95, 210]], Y + 0.03));
    for (let k = 0; k < 22; k++) inst.bike.push([-93.4 + (k % 2) * 0.35, 170 + k * 1.7, Math.PI / 2, k + 3]);
    for (let k = 0; k < 12; k++) inst.moto.push([-73.5, 172 + k * 1.6, -Math.PI / 2, k]);
    ground.put('pave', ribbon([[-78, 120], [-70, 120], [-70, 210]], 2.4, Y + 0.05)); mapPaths.push([[-78, 120], [-70, 120], [-70, 210]]);
    inst.lampG.push([-68.6, 128], [-68.6, 152], [-68.6, 176], [-68.6, 200]);
    for (const [tx, tn, s] of [[-117, 140, 1], [-116, 168, 0.9], [-66, 138, 0.8], [-122, 230, 1.1], [-118, 104, 0.9]]) rainAt(tx, tn, s);  }

  // ---------- stop 5: AITCC, the annex, the pool ----------
  {
    const x = -28, n = 232, L = 44, D = 26;
    const b = bld(group('aitcc'), x, n, 0);
    const fp = rect(L, D);
    b.prism('ccwall', fp, 0, 0.6); b.prism('lobby', inset(fp, 1.4), 0.6, 4.6); b.mullions(fp, 1.4, 0.6, 4.6, 2.2);
    for (let k = -5; k <= 5; k++) b.box('trim', k * 4.2, 0.6, D / 2 - 0.4, 0.55, 4.0, 0.55);
    b.box('trim', 0, 4.6, 0, L + 0.8, 0.35, D + 0.8);
    b.prism('ccwall', fp, 4.95, 6.0); b.prism('glass', inset(fp, 0.4), 6.0, 8.0); b.mullions(fp, 0.4, 6.0, 8.0, 1.8);
    for (let k = 0; k < 5; k++) b.box('trim', 0, 6.15 + k * 0.38, D / 2 + 0.25, L, 0.07, 0.5);
    b.prism('ccwall', inset(fp, -0.3), 8.0, 9.6); b.prism('concrete', inset(fp, 0.4), 9.0, 9.5);
    b.word('letterK', 'AIT CONFERENCE CENTER', 0.72, 0.1, 0, 8.4, D / 2 + 0.36, 0, 0.05);
    // the porte-cochere: a broad flat canopy on four columns, steps, pink-flowered beds
    b.box('trim', 0, 4.4, D / 2 + 4.0, 16, 0.42, 8.6); for (const u of [-7, 7]) for (const v of [D / 2 + 1.0, D / 2 + 7.6]) { b.add('trim', T(cyl(0.3, 0.3, 4.4, 14), u, 0, v)); const [cx, cn] = b.toXN(u, v); tree(cx, cn, 0.35); }
    for (let k = 0; k < 3; k++) b.box('concrete', 0, k * 0.16, D / 2 + 0.5 + k * 0.4 * 0, 14 - k, 0.16, 1.2 - k * 0.35);
    for (const s of [-1, 1]) { b.box('concrete', s * 14, 0, D / 2 + 2.2, 8, 0.55, 2.2); for (let k = 0; k < 7; k++) inst.blooms.push([x + s * 14 - 3.5 + k * 1.15, n - (D / 2 + 2.2), 0.9]); }
    b.solidU(0, 0, L, D, 9.6); block('aitcc', x, n, L, D, 0, 9.6);
    // AITCC ANNEX (v31): grey-and-black 2-storey box, vertical black slat screen, white letters, steps used as seats
    const a = bld(group('aitcc-annex'), -59, 228, 0);
    const af = rect(14, 12);
    a.prism('grey', af, 0, 7.2); a.prism('black', inset(af, -0.15), 7.2, 7.7);
    a.box('lobby', -3, 0, 6.02, 6.5, 3.1, 0.05); a.box('black', -3, 3.1, 6.1, 7.0, 0.3, 0.25);
    for (let k = 0; k < 26; k++) a.box('black', -6.6 + k * 0.52, 3.6, 6.25, 0.12, 3.4, 0.22);
    a.box('black', 3.6, 0, 6.1, 0.12, 3.1, 0.2);
    a.word('letterW', 'AITCC ANNEX', 0.55, 0.06, 3.0, 2.2, 6.06, 0, 0.03);
    for (let k = 0; k < 4; k++) a.box('concrete', 0, k * 0.4, 6 + 3.2 - k * 0.8, 14, 0.4, 0.8);
    a.solidU(0, 0, 14, 12, 7.7); block('aitcc-annex', -59, 228, 14, 12, 0, 7.7);
    // the pool (v32): blue water with lane ropes, white tiled deck, green chain-link on a low white wall, the sports building
    const p = bld(group('pool'), -85, 240, 0);
    // deck as a ring round the water, water 6 cm below the coping
    p.box('tile', 0, 0, 8.3, 32, 0.32, 3.4); p.box('tile', 0, 0, -8.3, 32, 0.32, 3.4); p.box('tile', 14.4, 0, 0, 3.2, 0.32, 13.2); p.box('tile', -14.4, 0, 0, 3.2, 0.32, 13.2);
    p.box('pool', 0, 0, 0, 25.6, 0.26, 13.2);
    p.box('tile', 0, 0.32, 6.45, 25.6, 0.05, 0.4); p.box('tile', 0, 0.32, -6.45, 25.6, 0.05, 0.4); p.box('tile', 12.7, 0.32, 0, 0.4, 0.05, 12.5); p.box('tile', -12.7, 0.32, 0, 0.4, 0.05, 12.5);
      for (let k = 1; k < 6; k++) for (let j = 0; j < 25; j++) p.box(j % 2 ? 'paintR' : 'whiteU', -12.5 + j + 0.5, 0.25, -6.25 + k * 2.08, 0.9, 0.06, 0.06);
    const fence = [[-16.2, -10.2], [16.2, -10.2], [16.2, 10.2], [-16.2, 10.2]];
    for (let i = 0; i < 4; i++) {
      const A = fence[i], C = fence[(i + 1) % 4], L2 = Math.hypot(C[0] - A[0], C[1] - A[1]), ry = Math.atan2(C[0] - A[0], C[1] - A[1]);
      p.box('trim', (A[0] + C[0]) / 2, 0, (A[1] + C[1]) / 2, 0.22, 0.6, L2, ry);
      const g = new THREE.PlaneGeometry(L2, 1.9); const uv = g.attributes.uv; for (let q = 0; q < uv.count; q++) uv.setXY(q, uv.getX(q) * L2 / 0.12, uv.getY(q) * 1.9 / 0.12); T(g, (A[0] + C[0]) / 2, 1.55, (A[1] + C[1]) / 2, ry + Math.PI / 2); p.add('link', g);
      for (let q = 0; q <= Math.round(L2 / 3); q++) { const t = q / Math.round(L2 / 3); p.box('iron', A[0] + (C[0] - A[0]) * t, 0, A[1] + (C[1] - A[1]) * t, 0.07, 2.55, 0.07); }
      const [cx, cn] = p.toXN((A[0] + C[0]) / 2, (A[1] + C[1]) / 2); solid(cx, cn, i % 2 ? 0.3 : L2, i % 2 ? L2 : 0.3, 0, 2.4);
    }
    for (let k = 0; k < 6; k++) { p.box('whiteU', -10 + k * 4, 0.32, 8.2, 0.7, 0.35, 1.9); p.box('whiteU', -10 + k * 4, 0.67, 7.5, 0.7, 0.45, 0.12, 0); }
    const sb = bld(group('pool-house'), -85, 254.5, 0);
    const sf = rect(30, 7.5);
    const top = sb.ribbonFloors(sf, 'white', 2, 3.3, { spandrel: 1.1, fin: 0.6 }); sb.roof(sf, top, 0.5, 0.6);
    sb.solidU(0, 0, 30, 7.5, top + 1); block('pool-house', -85, 254.5, 30, 7.5, 0, top + 1);
    for (const [tx, tn] of [[-104, 230], [-66, 251], [-102, 250]]) { inst.palms.push([tx, tn, 0.7, 1]); tree(tx, tn, 0.3); }
    mapAreas.push({ k: 'pool', p: [[-97.5, 233.75], [-72.5, 233.75], [-72.5, 246.25], [-97.5, 246.25]] });
    ground.put('pave', ribbon([[-46, 207.5], [-46, 214], [-70, 214], [-70, 226]], 2.4, Y + 0.05)); mapPaths.push([[-46, 207.5], [-46, 214], [-70, 214], [-70, 226]]);
    inst.lampG.push([-47.5, 212], [-71.5, 220]);
    for (const [tx, tn, s] of [[-4, 214, 1.05], [-52, 212, 0.85], [-6, 262, 1]]) rainAt(tx, tn, s, 0);
  }

  // ---------- stop 6: the AIT Cafeteria, long curved white front behind a lawn and rain trees ----------
  {
    const cx = 28, apex = 232, Rc = 45, half = 24, back = 254;
    const b = bld(group('cafeteria'), cx, 0, 0);
    const front = [];
    for (let i = 0; i <= 16; i++) { const u = -half + (2 * half) * i / 16; front.push([u, -(apex + (Rc - Math.sqrt(Rc * Rc - u * u)))]); }
    const fp = front.concat([[half, -back], [-half, -back]]).map((p) => [p[0], p[1]]);
    const fpB = fp.map((p) => [p[0], p[1]]);
    b.prism('white', fpB, 0, 0.75);
    b.prism('glass', inset(fpB, 0.45), 0.75, 3.55); b.mullions(fpB, 0.45, 0.75, 3.55, 1.9);
    b.prism('white', inset(fpB, -0.15), 3.55, 4.5);
    b.prism('glass', inset(fpB, 0.35), 4.5, 6.6); b.mullions(fpB, 0.35, 4.5, 6.6, 1.5);
    b.prism('white', inset(fpB, -0.05), 6.6, 7.6);
    b.prism('trim', inset(fpB, -1.5), 7.6, 7.85);
    b.prism('concrete', inset(fpB, 0.5), 7.85, 7.95);
    // entrance: a glazed bay with a thin canopy, signboard on the lawn
    b.box('trim', 0, 3.0, -(apex - 2.0), 9, 0.2, 4.2); b.box('lobby', 0, 0.75, -(apex - 0.05), 4.4, 2.6, 0.08);
    MAT.cafe = new THREE.MeshStandardMaterial({ roughness: 0.55, map: canvasTex(512, 128, (g) => { g.fillStyle = '#f6f4ee'; g.fillRect(0, 0, 512, 128); g.fillStyle = '#7a1f1f'; g.fillRect(0, 0, 512, 14); g.fillStyle = '#1e2a33'; g.font = '700 50px Segoe UI, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('AIT CAFETERIA', 256, 62); g.font = '500 22px Segoe UI, Arial'; g.fillStyle = '#555'; g.fillText('food court · open 07:00 - 21:00', 256, 104); }) });
    b.box('trim', -9.5, 0, -(apex - 8), 0.2, 1.4, 0.2); b.box('trim', -5.5, 0, -(apex - 8), 0.2, 1.4, 0.2); b.box('trim', -7.5, 1.4, -(apex - 8), 4.4, 1.1, 0.24); b.add('cafe', T(new THREE.PlaneGeometry(4.0, 1.0), -7.5, 1.95, -(apex - 8) + 0.13));
    b.word('letterK', 'AIT CAFETERIA', 0.6, 0.06, 0, 6.85, -(apex - 0.1), 0, 0.04);
    // outdoor steel stair at the east end, AC units on the west side
    for (let k = 0; k < 16; k++) b.box('frame', half + 1.2, k * 0.42, -(back - 3 - k * 0.32), 1.1, 0.05, 0.3);
    b.box('frame', half + 1.75, 0, -(back - 8.2), 0.06, 7.6, 0.06); b.box('frame', half + 0.65, 0, -(back - 8.2), 0.06, 7.6, 0.06); b.box('concrete', half + 1.2, 6.6, -(back - 9), 1.6, 0.12, 2);
    for (const v of [240, 244, 248]) b.ac(-half - 0.6, 1.2, -v, -Math.PI / 2), b.ac(-half - 0.6, 5.3, -v, -Math.PI / 2);
    for (let i = 0; i < front.length - 1; i++) { const A = front[i], C = front[i + 1], mu = (A[0] + C[0]) / 2, mv = -(A[1] + C[1]) / 2; solid(cx + mu, mv + 7, Math.hypot(C[0] - A[0], C[1] - A[1]), 14, 0, 8); }
    solid(cx, (apex + back) / 2 + 4, 2 * half, back - apex - 8, 0, 8);
    block('cafeteria', cx, 244, 2 * half, 20, 0, 8);
    for (const [tx, tn, s] of [[8, 216, 1.15], [14, 226, 1.0], [53, 229, 1.1], [-2, 228, 0.9], [58, 240, 0.95]]) rainAt(tx, tn, s, 0);
    ground.put('pave', ribbon([[28, 205.6], [28, 226]], 3, Y + 0.05)); mapPaths.push([[28, 205.6], [28, 226]]);
    for (let k = 0; k < 4; k++) inst.lampG.push([25.4, 209 + k * 4.5]);
  }

  // ---------- stop 7: SOM and SERD facing one lawn and canal ----------
  {
    const cn = 218;
    const canal = [[58, cn - 3.5], [150, cn - 3.5], [150, cn + 3.5], [58, cn + 3.5]];
    ground.put('canal', flatXN(canal, Y + 0.02)); mapAreas.push({ k: 'water', p: canal });
    const cb = bld(group('canal'), 0, 0, 0);
    for (const s of [-1, 1]) { cb.add('concrete', T(boxG(92, 0.35, 0.5), 104, Y + 0.05, -(cn + s * 3.75))); }
    for (let k = 0; k < 40; k++) (inst.lotus = inst.lotus || []).push([60 + R() * 88, cn + (R() - 0.5) * 5.6]);
    // footbridge: concrete deck, white rails, from the south path to the north path
    cb.box('concrete', 96, 0.25, -cn, 2.8, 0.25, 11.4); cb.rail(94.55, -cn - 5.6, 94.55, -cn + 5.6, 0.5, 1.0, 'trim', 0.3); cb.rail(97.45, -cn - 5.6, 97.45, -cn + 5.6, 0.5, 1.0, 'trim', 0.3);
    for (const [x0, x1] of [[58, 94.2], [97.8, 150]]) solid((x0 + x1) / 2, cn, x1 - x0, 7.4, 0, 0.8);
    const pS = [[40, 206], [64, 211.5], [146, 211.5]], pN = [[64, 224.5], [146, 224.5]];
    ground.put('pave', ribbon(pS, 2.4, Y + 0.05)); ground.put('pave', ribbon(pN, 2.4, Y + 0.05));
    mapPaths.push(pS, pN, [[96, 212.7], [96, 223.3]]);
    for (const x of [72, 86, 110, 126, 142]) { inst.lampG.push([x, 210], [x, 226]); }
    // SOM (v59): white 2-storey, a long faceted front, square punched windows upstairs, a glazed ground band
    const som = bld(group('som'), 96, 239, 0);
    const fp = [[-26, -7.5], [26, -7.5], [26, 6.2], [9, 7.6], [-9, 7.6], [-26, 6.2]];
    som.prism('white', fp, 0, 0.6); som.prism('lobby', inset(fp, 0.5), 0.6, 3.6); som.mullions(fp, 0.5, 0.6, 3.6, 1.8);
    som.prism('trim', inset(fp, -0.9), 3.6, 3.9);
    som.prism('white', fp, 3.9, 7.4);
    for (const [A, C] of [[[-26, 6.2], [-9, 7.6]], [[-9, 7.6], [9, 7.6]], [[9, 7.6], [26, 6.2]]]) som.punch(A, C, 4.8, 1.5, 1.5, 3.0, 'trim', 0.3);
    som.punch([26, -7.5], [-26, -7.5], 4.8, 1.5, 1.5, 3.4, 'trim', 0.2);
    som.roof(fp, 7.4, 0.7, 0.75);
    som.word('letterK', 'SCHOOL OF MANAGEMENT', 0.5, 0.06, 0, 7.6 - 0.02, 7.6 + 0.75, 0, 0.04);
    som.solidU(0, 0, 52, 15, 8.2); block('som', 96, 239, 52, 15, 0, 8.2);
    // the low sign wall in front, black iron board on cream piers with gold letters (old ait.js sign, rebuilt)
    MAT.somSign = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.3, map: canvasTex(1024, 180, (g) => { g.fillStyle = '#16191b'; g.fillRect(0, 0, 1024, 180); g.fillStyle = '#e2c27a'; g.font = '700 70px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SCHOOL OF MANAGEMENT', 512, 76); g.font = '500 30px Georgia, serif'; g.fillText('Asian Institute of Technology', 512, 140); }) });
    const ss = bld(group('som-sign'), 80, 226.5, 0);
    for (const u of [-3.5, 3.5]) ss.box('cream', u, 0, 0, 0.45, 2.1, 0.45); ss.box('black', 0, 0.75, 0, 7, 1.25, 0.12); ss.add('somSign', T(new THREE.PlaneGeometry(6.6, 1.15), 0, 1.38, 0.07)); ss.box('concrete', 0, 0, 0, 8.4, 0.25, 1.4);
    for (let k = 0; k < 6; k++) inst.blooms.push([74.5 + k * 2.2, 225.2, 0.85]);
    // SERD: white 3-storey academic block on pilotis, deep sunshade bands and ribbon windows (v25, v37, v39)
    const serd = bld(group('serd'), 95, 197, Math.PI);
    const sp = rect(44, 13);
    serd.prism('white', inset(sp, 2.6), 0, 3.4); serd.punch([-19.4, 3.9], [-4, 3.9], 0.9, 1.6, 1.6, 3.0, 'trim', 0.16);
    serd.box('lobby', 6, 0, 3.92, 7, 3.0, 0.06);
    for (let k = -3; k <= 3; k++) for (const s of [-1, 1]) { serd.box('trim', k * 7, 0, s * 6.0, 0.55, 3.6, 0.55); const [px, pn] = serd.toXN(k * 7, s * 6.0); tree(px, pn, 0.35); }
    serd.prism('trim', inset(sp, -0.3), 3.4, 3.7);
    const top = serd.ribbonFloors(sp, 'white', 2, 3.4, { y0: 3.7, spandrel: 1.0, recess: 0.45, fin: 1.1 });
    for (let f = 0; f < 2; f++) for (let k = 0; k < 3; k++) serd.prism('trim', inset(sp, -1.1), 3.7 + f * 3.4 + 1.5 + k * 0.5, 3.7 + f * 3.4 + 1.55 + k * 0.5);
    serd.roof(sp, top, 0.8, 0.7);
    // rooftop letters on the parapet line, the full name along the first-floor spandrel
    serd.word('letterK', 'SERD', 1.3, 0.14, -14, top + 0.7, 6.3, 0, 0.1);
    for (const u of [-18.5, -9.5]) serd.box('frame', u, top + 0.4, 6.2, 0.08, 0.5, 0.08);
    serd.word('letterK', 'SCHOOL OF ENVIRONMENT, RESOURCES AND DEVELOPMENT', 0.32, 0.04, 4, 3.95, 6.53, 0, 0.02);
    serd.solidU(0, 0, 44, 13, top + 1); block('serd', 95, 197, 44, 13, Math.PI, top + 1);
    MAT.serdSign = new THREE.MeshStandardMaterial({ roughness: 0.5, map: canvasTex(1024, 220, (g) => { g.fillStyle = '#244a35'; g.fillRect(0, 0, 1024, 220); g.fillStyle = '#f2ead2'; g.font = '700 92px Segoe UI, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SERD', 512, 76); g.font = '500 34px Segoe UI, Arial'; g.fillText('School of Environment, Resources and Development', 512, 160); }) });
    const rs = bld(group('serd-sign'), 116, 209.5, Math.PI);
    rs.box('concrete', 0, 0, 0, 5.4, 0.3, 1.2); rs.box('trim', 0, 0.3, 0, 5, 1.6, 0.3); rs.add('serdSign', T(new THREE.PlaneGeometry(4.8, 1.03), 0, 1.1, 0.16));
    for (const [tx, tn, s, v] of [[132, 206, 1.1, 0], [62, 232, 0.95, 2], [134, 232, 1.05, 1], [70, 199, 0.9, 0], [146, 196, 1, 2]]) rainAt(tx, tn, s, v);
  }

  // ---------- inside the loop: the central lawn, footpaths, a sala, rain trees ----------
  {
    const paths = [[[0, BST.n + 3.5], [0, LOOP.n1 - 3.5]], [[LOOP.x0 + 3.5, 160], [LOOP.x1 - 3.5, 160]], [[-36, 128], [36, 192]], [[-36, 192], [36, 128]]];
    for (const p of paths) { ground.put('pave', ribbon(p, 2.4, Y + 0.05)); mapPaths.push(p); }
    for (const [x, n] of [[-24, 136], [24, 136], [-34, 178], [34, 180], [-12, 186], [14, 150], [-38, 150], [40, 166], [-18, 168]]) rainAt(x, n, 0.95 + R() * 0.25);
    for (const [x, n] of [[0, 128], [0, 146], [0, 176], [0, 192], [-24, 160], [24, 160]]) inst.lampG.push([x + 1.6, n]);
    const s = bld(group('sala'), -20, 150, 0.6);
    s.box('concrete', 0, 0, 0, 5.4, 0.4, 4.2); for (const [du, dv] of [[-2.3, -1.7], [2.3, -1.7], [-2.3, 1.7], [2.3, 1.7]]) s.box('cream', du, 0.4, dv, 0.2, 2.4, 0.2);
    const roofG = new THREE.ConeGeometry(4.3, 1.6, 4, 1); T(roofG, 0, 3.6, 0, Math.PI / 4, 0, 0, 1, 1, 0.8); MAT.salaRoof = new THREE.MeshStandardMaterial({ color: 0x3f6b44, roughness: 0.6 }); s.add('salaRoof', roofG);
    s.box('cream', 0, 0.4, -1.4, 4.2, 0.45, 0.5);
    block('sala', -20, 150, 5.4, 4.2, 0.6, 4.4);
  }

  // ---------- east side: car park under white carports, fence round the campus ----------
  {
    const b = bld(group('carports'), 104, 122, 0);
    b.add('pave', flatXN([[-34, -30], [34, -30], [34, 30], [-34, 30]], Y + 0.03));
    for (const v of [-16, 4, 22]) {
      b.box('corr', 0, 2.65, v, 40, 0.08, 6.2); b.box('trim', 0, 2.55, v + 3.05, 40, 0.18, 0.1);
      for (let k = -6; k <= 6; k++) { b.box('frame', k * 3.3, 0, v + 2.6, 0.1, 2.65, 0.1); const [px, pn] = b.toXN(k * 3.3, v + 2.6); tree(px, pn, 0.12); }
      for (let k = -5; k <= 5; k++) if (R() < 0.7) inst.car.push([104 + k * 3.3, 122 - v + 0.6, R() < 0.5 ? 0 : Math.PI, (R() * 6) | 0]);
    }
    ground.put('pave', ribbon([[LOOP.x1 + LOOP.w / 2, 136], [70, 136]], 6, Y + 0.04));
    block('carports', 104, 122, 40, 44, 0, 2.8);
    for (const [x, n] of [[80, 70], [132, 78], [142, 160], [78, 172], [120, 168], [140, 40], [100, 20], [60, 30], [130, 250], [-112, 262], [-60, 266], [20, 266]]) rainAt(x, n, 0.9 + R() * 0.3);
  }
  {
    // gaps where the farm tracks leave: north at x 20, east at n 120
    const runs = [[[BOX.x0, YT.n + 11], [BOX.x0, BOX.n1]], [[BOX.x0, BOX.n1], [14, BOX.n1]], [[26, BOX.n1], [BOX.x1, BOX.n1]], [[BOX.x1, BOX.n1], [BOX.x1, 126]], [[BOX.x1, 114], [BOX.x1, YT.n + 11]]];
    const b = bld(group('fence'), 0, 0, 0);
    for (const [A, C] of runs) {
      along([A, C], 3, (x, n) => inst.post.push([x, n, 1.6]), 0);
      const L = Math.hypot(C[0] - A[0], C[1] - A[1]), ry = Math.atan2(C[0] - A[0], -(C[1] - A[1])), ew = A[1] === C[1];
      for (const yy of [0.6, 1.1, 1.55]) b.add('frame', T(boxG(0.02, 0.02, L), (A[0] + C[0]) / 2, yy, -(A[1] + C[1]) / 2, ry));
      solid((A[0] + C[0]) / 2, (A[1] + C[1]) / 2, ew ? L : 0.3, ew ? 0.3 : L, 0, 1.8);
    }
  }

  for (const [g, b] of groups) b.into(g, true);
  ground.into(root, false);
  for (const ch of root.children) if (ch.isMesh && ch.material === MAT.lawn) ch.receiveShadow = true;

  // ---------- instanced: kerbs, dashes, trees, palms, shrubs, lamps, bikes ----------
  const m4 = new THREE.Matrix4(), col = new THREE.Color(), q = new THREE.Quaternion(), e = new THREE.Euler(), p3 = new THREE.Vector3(), s3 = new THREE.Vector3();
  const mk = (geo, mat, list, fill, shadow = false) => {
    if (!list.length) return null;
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((it, i) => { fill(it, i); im.setMatrixAt(i, m4); if (im.instanceColor || it.c != null) { if (it.c != null) im.setColorAt(i, col.setHex(it.c)); } });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = shadow; im.receiveShadow = true; extras.add(im); return im;
  };
  const place = (x, y, n, yaw, s = 1, sy = s) => m4.compose(p3.set(x, y, -n), q.setFromEuler(e.set(0, yaw, 0)), s3.set(s, sy, s));
  { const g = boxG(0.3, 0.24, 0.96); g.translate(0, Y + 0.12, 0); const im = mk(g, MAT.kerb, inst.kerb, (k) => place(k[0], 0, k[1], k[2])); if (im) inst.kerb.forEach((k, i) => im.setColorAt(i, col.setHex(k[3]))); if (im && im.instanceColor) im.instanceColor.needsUpdate = true; }
  for (const [kind, mat] of [[0, MAT.lineW], [1, MAT.lineY]]) { const g = boxG(0.13, 0.012, 3); g.translate(0, Y + 0.052, 0); mk(g, mat, inst.dash.filter((d) => d[3] === kind), (d) => place(d[0], 0, d[1], d[2])); }
  { const g = new THREE.SphereGeometry(0.55, 10, 7); g.scale(1, 0.85, 1); mk(g, MAT.hedge, inst.topiary, (t) => place(t[0], Y + t[2] - 0.1, t[1], 0)); }
  // rain trees: three crowns (two full, one dry-season sparse), leaf cards over real limbs
  const variants = [rainTree(3, 9, 34, false), rainTree(8, 7.6, 30, false), rainTree(14, 8.4, 14, true)];
  variants.forEach((v, k) => {
    const list = inst.trees.filter((t) => t[3] === k);
    mk(v.wood, MAT.bark, list, (t) => place(t[0], Y, t[1], t[4], t[2]), !touch);
    const im = mk(v.leaf, MAT.leaf[k], list, (t) => place(t[0], Y, t[1], t[4], t[2]), !touch);
    if (im) { list.forEach((t, i) => im.setColorAt(i, col.setHSL(0.2 + R() * 0.07, 0.25 + R() * 0.2, 0.72 + R() * 0.25))); im.instanceColor.needsUpdate = true; }
  });
  // flame trees on the Yoongthong median: smaller crowns with orange-red flowers
  { const v = rainTree(21, 4.2, 16, false); const fm = new THREE.MeshStandardMaterial({ map: leafTex(61, ['#e2482a', '#f06a2c', '#d63a24']), alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.85 });
    mk(v.wood, MAT.bark, inst.flame, (t) => place(t[0], Y + 0.1, t[1], t[2], 0.62), !touch); mk(v.leaf, fm, inst.flame, (t) => place(t[0], Y + 0.1, t[1], t[2], 0.62), !touch); }
  { const pv = [palm(4, 12), palm(9, 9)];
    pv.forEach((v, k) => { const list = inst.palms.filter((p) => p[3] === k); const f = (p) => place(p[0], Y, p[1], p[0] * 1.7 + p[1], p[2]);
      mk(v.trunk, MAT.palmBark, list, f, !touch); mk(v.shaft, MAT.shaft, list, f, false); mk(v.frond, MAT.frond, list, f, !touch); }); }
  { const g = shrub(5, 1.4); mk(g, MAT.flower, inst.blooms, (b) => place(b[0], Y, b[1], b[0] * 3.1, b[2])); }
  if (inst.lotus) { const g = new THREE.CircleGeometry(0.45, 9); g.rotateX(-Math.PI / 2); g.translate(0, Y + 0.09, 0); mk(g, MAT.lotus, inst.lotus, (l) => place(l[0], 0, l[1], l[0], 0.7 + (Math.abs(l[0] * 7.3) % 1) * 0.6)); }
  if (inst.dirt) { const g = new THREE.CircleGeometry(1, 20); g.rotateX(-Math.PI / 2); const uv = g.attributes.uv; const pp = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (pp.getX(i) + 1) / 2, (-pp.getZ(i) + 1) / 2); g.translate(0, Y + 0.012, 0);
    const im = mk(g, MAT.dirt, inst.dirt, (d) => place(d[0], 0, d[1], d[0], d[2], 1)); if (im) im.renderOrder = -1; MAT.dirt.alphaMap.wrapS = MAT.dirt.alphaMap.wrapT = THREE.ClampToEdgeWrapping; }
  // dirt texture tiles in metres while the soft edge follows the circle: alpha from the radial map, colour from world position
  MAT.dirt.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vDw;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvec4 dw = instanceMatrix * vec4(transformed, 1.0); vDw = dw.xz / 3.0;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vDw;').replace('#include <map_fragment>', 'diffuseColor *= texture2D(map, vDw);');
  };
  // road lamps (slim grey single arm) and footpath globe lamps
  // built at 8 m, scaled whole for the 10 m Yoongthong poles
  { const pole = cyl(0.11, 0.07, 8, 7), arm = T(boxG(0.07, 0.07, 1.7), 0, 7.86, 0.8), head = T(boxG(0.3, 0.13, 0.62), 0, 7.8, 1.55);
    const geo = mergeGeometries([pole.toNonIndexed(), arm.toNonIndexed()], false);
    const lamps = inst.lampR, fit = (l) => m4.compose(p3.set(l[0], Y, -l[1]), q.setFromEuler(e.set(0, l[2], 0)), s3.setScalar(l[3] / 8));
    mk(geo, MAT.pole, lamps, fit, !touch); mk(head.toNonIndexed(), MAT.lampHead, lamps, fit);
    lamps.forEach((l) => { const [wx, wz] = W(l[0], l[1]); circles.push({ x: wx, z: wz, r: 0.18 }); });
    const gp = cyl(0.06, 0.05, 3.8, 7), gb = T(new THREE.SphereGeometry(0.24, 12, 9), 0, 4.0, 0);
    mk(gp.toNonIndexed(), MAT.pole, inst.lampG, (l) => place(l[0], Y, l[1], 0));
    mk(gb.toNonIndexed(), MAT.lampHead, inst.lampG, (l) => place(l[0], Y, l[1], 0));
    inst.lampG.forEach((l) => { const [wx, wz] = W(l[0], l[1]); circles.push({ x: wx, z: wz, r: 0.15 }); });
    const prev = look.hooks.lamps; look.hooks.lamps = (night) => { if (prev) prev(night); MAT.lampHead.emissiveIntensity = 0.05 + 2.6 * night; };
    // concrete power poles with wires along Yoongthong, posts of the campus fence
    const pp = cyl(0.14, 0.1, 1, 6); mk(pp.toNonIndexed(), MAT.concrete, inst.post, (p) => m4.compose(p3.set(p[0], Y, -p[1]), q.identity(), s3.set(p[2] > 5 ? 1.3 : 0.7, p[2], p[2] > 5 ? 1.3 : 0.7)));
    const wires = []; for (const yy of [8.2, 8.6, 9.0]) wires.push(ribbon([[YT.x0, YT.n - 12], [YT.x1, YT.n - 12]], 0.03, Y + yy));
    const wm = new THREE.Mesh(mergeGeometries(wires, false), MAT.black); wm.name = 'aitc-wires'; root.add(wm); }
  // bicycles and motorbikes (v17, v46, chairman-island-loop-2): parked in rows, mixed colours
  { const parts = [];
    const tube = (a, b) => parts.push(rod(new THREE.Vector3(...a), new THREE.Vector3(...b), 0.022, 0.022, 4).toNonIndexed());
    for (const z of [-0.5, 0.5]) { const w = new THREE.TorusGeometry(0.32, 0.03, 4, 14); w.rotateY(Math.PI / 2); w.translate(0, 0.33, z); parts.push(w.toNonIndexed()); }
    tube([0, 0.33, -0.5], [0, 0.55, -0.05]); tube([0, 0.55, -0.05], [0, 0.33, 0.5]); tube([0, 0.55, -0.05], [0, 0.85, -0.12]); tube([0, 0.33, -0.5], [0, 0.8, 0.38]); tube([0, 0.8, 0.38], [0, 0.33, 0.5]);
    parts.push(T(boxG(0.36, 0.03, 0.03), 0, 0.98, 0.42).toNonIndexed()); tube([0, 0.8, 0.38], [0, 0.98, 0.42]); parts.push(T(boxG(0.12, 0.04, 0.24), 0, 0.88, -0.14).toNonIndexed());
    const cols = [0x2a6a45, 0xc4553a, 0x1f3b6e, 0x22262c, 0xd8a23a, 0x4a7a8c, 0xe8e8e2];
    const im = mk(mergeGeometries(parts, false), MAT.ride, inst.bike, (b) => place(b[0], Y, b[1], b[2]));
    if (im) { inst.bike.forEach((b, i) => im.setColorAt(i, col.setHex(cols[b[3] % cols.length]))); im.instanceColor.needsUpdate = true; }
    const mp = [];
    // a step-through scooter: slim body, footboard, seat, front shield, bars; tyres stay black via a darker band
    for (const z of [-0.62, 0.62]) { const w = new THREE.TorusGeometry(0.24, 0.065, 6, 16); w.rotateY(Math.PI / 2); w.translate(0, 0.27, z); mp.push(w.toNonIndexed()); }
    mp.push(T(boxG(0.24, 0.08, 0.62), 0, 0.36, 0.02).toNonIndexed(), T(boxG(0.26, 0.3, 0.52), 0, 0.56, -0.36).toNonIndexed(), T(boxG(0.24, 0.1, 0.5), 0, 0.76, -0.3).toNonIndexed(),
      T(boxG(0.3, 0.52, 0.08), 0, 0.62, 0.42, 0, -0.18).toNonIndexed(), T(boxG(0.1, 0.36, 0.1), 0, 0.84, 0.5, 0, -0.2).toNonIndexed(), T(boxG(0.56, 0.035, 0.035), 0, 1.02, 0.54).toNonIndexed(), T(boxG(0.12, 0.08, 0.06), 0, 0.92, 0.6).toNonIndexed());
    const mcols = [0x7e2a26, 0x1d1f22, 0xb9bcbf, 0x2c3f66, 0x6d7176, 0x2c4a36, 0xd9d6cf, 0x1d1f22, 0x9a9da1];
    const mi = mk(mergeGeometries(mp, false), MAT.ride, inst.moto, (b) => place(b[0], Y, b[1], b[2]), !touch);
    if (mi) { inst.moto.forEach((b, i) => mi.setColorAt(i, col.setHex(mcols[b[3] % mcols.length]))); mi.instanceColor.needsUpdate = true; }
    const cone = new THREE.ConeGeometry(0.2, 0.62, 10); cone.translate(0, Y + 0.31, 0); mk(cone, MAT.paintO, inst.cone, (c) => place(c[0], 0, c[1], 0));
    const car = []; car.push(T(boxG(1.75, 0.62, 4.3), 0, 0.55, 0).toNonIndexed(), T(boxG(1.55, 0.5, 2.2), 0, 1.1, -0.2).toNonIndexed());
    for (const [dx, dz] of [[-0.8, 1.35], [0.8, 1.35], [-0.8, -1.35], [0.8, -1.35]]) car.push(T(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 12), dx, 0.32, dz, 0, 0, Math.PI / 2).toNonIndexed());
    const ccols = [0xc9ccd0, 0xf2f2ef, 0x22262b, 0x7c1e22, 0x3a4f6a, 0xa8a9ab];
    const ci = mk(mergeGeometries(car, false), MAT.car, inst.car, (c) => place(c[0], Y, c[1], c[2]), !touch);
    if (ci) { inst.car.forEach((c, i) => ci.setColorAt(i, col.setHex(ccols[c[3] % ccols.length]))); ci.instanceColor.needsUpdate = true; }
    inst.car.forEach((c) => { const [wx, wz] = W(c[0], c[1]); circles.push({ x: wx, z: wz, r: 1.1 }); }); }

  // ---------- fields: the freed land of the old campus box ----------
  const fields = buildFields();
  function buildFields() {
    const holes = [
      { x0: AX + BOX.x0 - 2, x1: AX + BOX.x1 + 2, z0: AZ - BOX.n1 - 2, z1: AZ - BOX.n0 },
      { x0: AX + YT.x0, x1: AX + YT.x1, z0: AZ - (YT.n + 15), z1: AZ - BOX.n0 },
      { x0: -90, x1: 130, z0: -553, z1: -45 }
    ];
    const F = { x0: OLD.x0 - 40, x1: OLD.x1 + 40, z0: OLD.z0 - 40, z1: OLD.z1 + 20 };
    const sub = (r, h) => {
      if (r.x1 <= h.x0 || r.x0 >= h.x1 || r.z1 <= h.z0 || r.z0 >= h.z1) return [r];
      const out = [];
      if (r.z0 < h.z0) out.push({ ...r, z1: h.z0 });
      if (r.z1 > h.z1) out.push({ ...r, z0: h.z1 });
      const z0 = Math.max(r.z0, h.z0), z1 = Math.min(r.z1, h.z1);
      if (r.x0 < h.x0) out.push({ ...r, x1: h.x0, z0, z1 });
      if (r.x1 > h.x1) out.push({ ...r, x0: h.x1, z0, z1 });
      return out;
    };
    const fr = rng(4242), plots = [], cols = [0xf0e2b8, 0xe6d6a6, 0xd9d3a2, 0xc9cb98, 0xf3ead0, 0xdcc89a, 0xbfc792];
    const xs = [F.x0]; while (xs[xs.length - 1] < F.x1) xs.push(Math.min(F.x1, xs[xs.length - 1] + 70 + fr() * 50));
    const zs = [F.z0]; while (zs[zs.length - 1] < F.z1) zs.push(Math.min(F.z1, zs[zs.length - 1] + 80 + fr() * 60));
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
      let parts = [{ x0: xs[i], x1: xs[i + 1], z0: zs[j], z1: zs[j + 1] }];
      for (const h of holes) parts = parts.flatMap((r) => sub(r, h));
      const plough = fr() < 0.16, c = cols[(fr() * cols.length) | 0];
      for (const r of parts) if (r.x1 - r.x0 > 4 && r.z1 - r.z0 > 4) plots.push({ ...r, plough, c });
    }
    const fpos = [[], []], fuv = [[], []], fcol = [[], []], bunds = [];
    for (const p of plots) {
      const k = p.plough ? 1 : 0, c = new THREE.Color(p.c);
      const q4 = [[p.x0, p.z0], [p.x1, p.z0], [p.x1, p.z1], [p.x0, p.z0], [p.x1, p.z1], [p.x0, p.z1]];
      for (const [x, z] of [q4[0], q4[2], q4[1], q4[3], q4[5], q4[4]]) { fpos[k].push(x - AX, 0.03, z - AZ); fuv[k].push(x, -z); fcol[k].push(c.r, c.g, c.b); }
      for (const [a, b] of [[[p.x0, p.z0], [p.x1, p.z0]], [[p.x1, p.z0], [p.x1, p.z1]]]) bunds.push(T(boxG(0.7, 0.14, Math.hypot(b[0] - a[0], b[1] - a[1])), (a[0] + b[0]) / 2 - AX, 0.07, (a[1] + b[1]) / 2 - AZ, Math.atan2(b[0] - a[0], b[1] - a[1])).toNonIndexed());
    }
    const fg = new THREE.Group(); fg.name = 'aitc-fields'; root.add(fg);
    for (const k of [0, 1]) {
      if (!fpos[k].length) continue;
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(fpos[k], 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(fuv[k], 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(fcol[k], 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(fpos[k].length).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
      const m = new THREE.Mesh(g, k ? MAT.plough : MAT.field); m.receiveShadow = true; m.userData.keep = 1; fg.add(m);
    }
    const bm = new THREE.Mesh(mergeGeometries(bunds, false), MAT.bund); bm.receiveShadow = true; bm.userData.keep = 1; fg.add(bm);
    // two farm tracks: one east from the campus fence, one north from it
    const tracks = [];
    const wig = (pts) => pts.map((p, i) => [p[0] + (i % 2 ? 6 : -4) * (i > 0 && i < pts.length - 1 ? 1 : 0), p[1]]);
    tracks.push(wig([[AX + BOX.x1, AZ - 120], [AX + 420, AZ - 140], [AX + 760, AZ - 115], [AX + 1100, AZ - 150], [OLD.x1 - 10, AZ - 130]]));
    tracks.push(wig([[AX + 20, AZ - BOX.n1], [AX + 40, -1050], [AX + 10, -1250], [AX + 60, OLD.z0 + 10]]));
    tracks.push([[AX + 760, AZ - 115], [AX + 790, -400], [AX + 770, OLD.z1 - 6]]);
    const tg = [];
    for (const t of tracks) { const xn = t.map((p) => [p[0] - AX, AZ - p[1]]); tg.push(ribbon(xn, 3.6, 0.05)); }
    const tm = new THREE.Mesh(mergeGeometries(tg, false), MAT.soil); tm.receiveShadow = true; tm.userData.keep = 1; fg.add(tm);
    // a few trees on the bunds and the tracks
    const ft = [];
    for (let i = 0; i < 150; i++) {
      const p = plots[(fr() * plots.length) | 0]; if (!p) break;
      const onX = fr() < 0.5, x = onX ? p.x0 + fr() * (p.x1 - p.x0) : p.x1, z = onX ? p.z0 : p.z0 + fr() * (p.z1 - p.z0);
      ft.push([x - AX, AZ - z, 0.7 + fr() * 0.5, fr() < 0.4 ? 2 : (fr() < 0.5 ? 0 : 1), fr() * 6.28]);
    }
    for (const t of tracks) for (let i = 0; i < t.length - 1; i++) for (let k = 0; k < 4; k++) { const u = fr(); ft.push([t[i][0] + (t[i + 1][0] - t[i][0]) * u - AX + 4, AZ - (t[i][1] + (t[i + 1][1] - t[i][1]) * u), 0.8 + fr() * 0.3, (k % 3), fr() * 6.28]); }
    const fv = [rainTree(31, 8, 18, false), rainTree(37, 6.5, 16, false), rainTree(41, 7, 10, true)];
    fv.forEach((v, k) => {
      const list = ft.filter((t) => t[3] === k); if (!list.length) return;
      for (const [geo, mat] of [[v.wood, MAT.bark], [v.leaf, MAT.leaf[k]]]) {
        const im = new THREE.InstancedMesh(geo, mat, list.length);
        list.forEach((t, i) => { place(t[0], 0.03, t[1], t[4], t[2]); im.setMatrixAt(i, m4); });
        im.instanceMatrix.needsUpdate = true; im.userData.keep = 1; fg.add(im);
      }
      for (const t of list) { const [wx, wz] = W(t[0], t[1]); circles.push({ x: wx, z: wz, r: 0.45 * t[2] }); }
    });
    return { plots: plots.map((p) => [p.x0, p.z0, p.x1, p.z1, p.plough ? 1 : 0, p.c]), tracks };
  }

  // ---------- late normal maps for the new ground textures ----------
  {
    const loader = new THREE.TextureLoader(), done = new Map();
    const prev = look.upgrade;
    look.upgrade = () => {
      prev();
      for (const m of Object.values(MAT)) {
        if (!m || !m.userData || !m.userData.aitNor || m.normalMap) continue;
        const { n, t } = m.userData.aitNor;
        let tx = done.get(n + t);
        if (!tx) { tx = loader.load(`${PH}/textures/${n}/${n}_nor_gl_512.jpg`); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(1 / t, 1 / t); done.set(n + t, tx); }
        m.normalMap = tx; m.normalScale.set(0.9, 0.9); m.needsUpdate = true;
      }
    };
  }

  // ---------- places, routes, spawn ----------
  const placeAt = (id, label, x, n, faceTo) => {
    const [wx, wz] = W(x, n), [tx, tz] = W(faceTo[0], faceTo[1]);
    places.push({ id, label, verb: 'Enter ' + label, x: wx, z: wz, r: 4.2, face: Math.atan2(tx - wx, tz - wz) });
  };
  placeAt('dorm', 'Dorm Y', -90.5, 182, [-96, 182]);
  placeAt('canteen', 'AIT Cafeteria', 28, 226, [28, 236]);
  placeAt('som', 'School of Management', 96, 228, [96, 236]);
  placeAt('serd', 'SERD', 101, 207.5, [101, 202]);
  placeAt('class', 'SERD lecture rooms', 83, 207.5, [83, 202]);
  placeAt('conference', 'AIT Conference Center', -28, 214, [-28, 222]);
  const routeXN = [
    ellipse(0, 92, 33, 17.5, 30),
    [[-36, 128], [0, 160], [36, 192], [0, 192], [0, 128]],
    [[-70, 122], [-70, 208], [-46, 214], [-46, 207.5], [-70, 200]],
    [[28, 207], [28, 224], [40, 207], [64, 211.5], [96, 211.5], [96, 224.5], [140, 224.5], [146, 211.5], [64, 211.5]],
    [[-6, 12], [-8.5, 60], [-30, 64], [-24, 40], [-12, 30]]
  ];
  const routes = routeXN.map((r) => r.map((p) => W(p[0], p[1])));
  const wBox = { x0: AX + BOX.x0, x1: AX + BOX.x1, z0: AZ - BOX.n1, z1: AZ - BOX.n0 };
  // the walkable land: the old box plus the field margin (bound adds 24 m, the plots run 40 m past the old box)
  const area = { x0: Math.min(OLD.x0 - 16, wBox.x0), x1: Math.max(OLD.x1 + 16, wBox.x1), z0: Math.min(OLD.z0 - 16, wBox.z0), z1: Math.max(OLD.z1, wBox.z1) };
  const cx = (wBox.x0 + wBox.x1) / 2, cz = (wBox.z0 + wBox.z1) / 2;
  const canalW = W(100, 218);
  const toW = (pts) => pts.map((p) => W(p[0], p[1]));
  return {
    spawn: { x: AX, z: AZ + 20, ry: Math.PI },
    box: wBox, area,
    lake: { x: canalW[0], z: canalW[1], r: 3.2 },
    routes,
    roads: roadsXN.map(toW),
    waters: mapAreas.filter((a) => a.k === 'water' || a.k === 'pool').map((a) => toW(a.p)),
    map: { areas: mapAreas.map((a) => ({ k: a.k, p: toW(a.p) })), paths: mapPaths.map(toW), fields },
    stops: STOPS.map((s) => { const [x, z] = W(s.at[0], s.at[1]), [lx, lz] = W(s.look[0], s.look[1]); return { id: s.id, label: s.label, x, z, lx, lz }; }),
    near: (x, z) => Math.hypot(x - cx, z - cz) < 420,
    lod() {},
    bytes: 0,
    extras,
    lowMesh: null,
    blocks,
    highR: 330
  };
}
