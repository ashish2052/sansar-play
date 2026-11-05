// Crop fields beside the road out to AIT (redesign r2): rice paddies, mustard, maize, ploughed and fallow plots,
// earth bunds, dirt tracks. Ground rows are canvas textures; near plots also get instanced crop clumps.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { groundVary } from './kit.js?v=rd1';

const mulberry = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

// kind: ground colours (base, row), row gap in metres, clump spec (null = bare ground)
const CROPS = {
  rice: { base: '#4a5638', row: '#6f8a3c', gap: 0.8, rough: 0.22, map: 0x6d8f3a, clump: { h: 0.62, w: 0.55, step: 0.8, tex: 'rice' } },
  mustard: { base: '#5e5a34', row: '#6c7a34', gap: 0.75, rough: 0.9, map: 0xd8c43a, clump: { h: 1.0, w: 0.8, step: 0.72, tex: 'mustard' } },
  maize: { base: '#6e5840', row: '#5a6a34', gap: 1.0, rough: 0.95, map: 0x7f9a46, clump: { h: 2.3, w: 1.1, step: 0.85, tex: 'maize' } },
  plough: { base: '#55402e', row: '#634a34', gap: 0.7, rough: 1, map: 0x8a6a48, clump: null, clods: 1 },
  fallow: { base: '#8a8256', row: '#7d7a4c', gap: 2.2, rough: 1, map: 0xa89a62, clump: null, clods: 0.5 },
};

function groundTex(c, rnd) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d');
  x.fillStyle = c.base; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) { const v = rnd(); x.fillStyle = v < 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,240,200,0.06)'; x.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 4, 1 + rnd() * 4); }
  const rows = 4;
  for (let r = 0; r < rows; r++) {
    const cx = (r + 0.5) * 256 / rows;
    for (let y = 0; y < 256; y += 2) {
      const w = 14 + Math.sin(y * 0.11 + r) * 3 + rnd() * 6;
      x.fillStyle = c.row; x.globalAlpha = 0.55 + rnd() * 0.35; x.fillRect(cx - w / 2 + (rnd() - 0.5) * 3, y, w, 2);
    }
  }
  x.globalAlpha = 1;
  if (c.clods) for (let i = 0; i < 1800 * c.clods; i++) { const v = rnd(); x.fillStyle = v < 0.5 ? 'rgba(30,20,12,0.35)' : v < 0.8 ? 'rgba(150,125,90,0.3)' : 'rgba(90,110,50,0.35)'; x.beginPath(); x.ellipse(rnd() * 256, rnd() * 256, 1 + rnd() * 4, 1 + rnd() * 3, rnd() * 3, 0, 6.3); x.fill(); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

function clumpTex(kind, rnd) {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256; const x = cv.getContext('2d');
  const blade = (x0, y0, x1, y1, w, col) => { x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo((x0 + x1) / 2 + (rnd() - 0.5) * 20, (y0 + y1) / 2, x1, y1); x.stroke(); };
  const green = (l = 0) => `rgb(${70 + rnd() * 40 + l},${110 + rnd() * 45 + l},${35 + rnd() * 25})`;
  if (kind === 'rice') {
    for (let i = 0; i < 34; i++) blade(64 + (rnd() - 0.5) * 14, 256, 64 + (rnd() - 0.5) * 120, 20 + rnd() * 120, 2 + rnd() * 2, green(10));
  } else if (kind === 'mustard') {
    for (let i = 0; i < 18; i++) { const tx = 64 + (rnd() - 0.5) * 100, ty = 20 + rnd() * 90; blade(64 + (rnd() - 0.5) * 20, 256, tx, ty, 2, green(-10)); }
    for (let i = 0; i < 26; i++) { x.fillStyle = 'rgba(70,90,40,0.9)'; x.beginPath(); x.ellipse(64 + (rnd() - 0.5) * 70, 150 + rnd() * 100, 9, 5, rnd() * 3, 0, 6.3); x.fill(); }
    for (let i = 0; i < 260; i++) { const a = rnd() * 6.28, r = Math.sqrt(rnd()); x.fillStyle = `rgb(${225 + rnd() * 30},${190 + rnd() * 40},${20 + rnd() * 40})`; x.beginPath(); x.arc(64 + Math.cos(a) * r * 54, 62 + Math.sin(a) * r * 48, 2 + rnd() * 2.5, 0, 6.3); x.fill(); }
  } else {
    x.strokeStyle = '#7d8a3e'; x.lineWidth = 7; x.beginPath(); x.moveTo(64, 256); x.lineTo(64 + (rnd() - 0.5) * 6, 18); x.stroke();
    for (let i = 0; i < 9; i++) { const y = 230 - i * 22, s = i % 2 ? 1 : -1; blade(64, y, 64 + s * (40 + rnd() * 22), y + 30 + rnd() * 25, 6 + rnd() * 3, green(0)); }
    for (let i = 0; i < 7; i++) blade(64, 22, 64 + (rnd() - 0.5) * 30, rnd() * 10, 2, '#c8b26a');
    x.fillStyle = '#d8c27a'; x.beginPath(); x.ellipse(70, 140, 5, 14, 0.2, 0, 6.3); x.fill();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// three crossed cards; normals lean up so a clump lights like a soft volume, not three flat panes
function clumpGeo(w, h) {
  const parts = [];
  for (let k = 0; k < 3; k++) { const g = new THREE.PlaneGeometry(w, h); g.translate(0, h / 2, 0); g.rotateY(k * Math.PI / 3); parts.push(g); }
  const g = mergeGeometries(parts, false), n = g.attributes.normal;
  for (let i = 0; i < n.count; i++) { const v = new THREE.Vector3(n.getX(i) * 0.35, 1, n.getZ(i) * 0.35).normalize(); n.setXYZ(i, v.x, v.y, v.z); }
  return g;
}

export function buildRoadFields({ scene, touch, treeKit, look, region, avoid = () => false }) {
  const rnd = mulberry(7071), R = region;   // R: { x0, x1, z0, z1, road: [xa, xb] } road = the strip kept clear
  const grp = new THREE.Group(); grp.name = 'road-fields'; scene.add(grp);
  // columns either side of the road, a farm track between columns, a cross track at the middle
  const colsW = [], colsE = [], tracks = [];
  { let x = R.road[0]; while (x - 30 > R.x0) { const w = 30 + rnd() * 10, x1 = x, x0 = Math.max(R.x0, x - w); colsW.push([x0, x1]); x = x0 - 3; if (x - 20 > R.x0) tracks.push([x0 - 3, R.z0, x0, R.z1]); } }
  { let x = R.road[1]; while (x + 30 < R.x1) { const w = 30 + rnd() * 10, x0 = x, x1 = Math.min(R.x1, x + w); colsE.push([x0, x1]); x = x1 + 3; if (x + 20 < R.x1) tracks.push([x1, R.z0, x1 + 3, R.z1]); } }
  const zMid = (R.z0 + R.z1) / 2 + (rnd() - 0.5) * 20;
  tracks.push([R.x0, zMid - 1.6, R.road[0], zMid + 1.6], [R.road[1], zMid - 1.6, R.x1, zMid + 1.6]);
  const plots = [];
  const kinds = ['rice', 'rice', 'rice', 'mustard', 'mustard', 'maize', 'maize', 'plough', 'fallow'];
  for (const [x0, x1] of [...colsW, ...colsE]) {
    for (const [za, zb] of [[R.z1, zMid + 1.6], [zMid - 1.6, R.z0]]) {
      let z = za;
      while (z - 18 > zb) {
        const d = 26 + rnd() * 18, z1 = z, z0 = Math.max(zb, z - d);
        if (z0 - zb < 14) { plots.push({ x0, x1, z0: zb, z1, kind: kinds[(rnd() * kinds.length) | 0] }); break; }
        plots.push({ x0, x1, z0, z1, kind: kinds[(rnd() * kinds.length) | 0] }); z = z0;
      }
    }
  }
  const live = plots.filter((p) => !avoid(p));
  if (!live.length) return { grp, update() {}, plots: [], map: { plots: [], tracks: [] } };
  // ground: one merged mesh per crop kind, UVs in metres so the rows run along each plot's long side
  const mats = {};
  for (const [k, c] of Object.entries(CROPS)) {
    const m = new THREE.MeshStandardMaterial({ map: groundTex(c, rnd), roughness: c.rough, metalness: 0, envMapIntensity: k === 'rice' ? 1.3 : 0.6 });
    if (k !== 'rice') groundVary(m, 0.4, touch);
    mats[k] = m;
  }
  const byKind = {};
  for (const p of live) {
    const c = CROPS[p.kind], w = p.x1 - p.x0, d = p.z1 - p.z0, alongZ = d >= w;
    const g = new THREE.PlaneGeometry(w - 0.6, d - 0.6); g.rotateX(-Math.PI / 2); g.translate((p.x0 + p.x1) / 2, 0.045, (p.z0 + p.z1) / 2);
    const pos = g.attributes.position, uv = g.attributes.uv, tile = c.gap * 4;
    for (let i = 0; i < pos.count; i++) { const px = pos.getX(i), pz = pos.getZ(i); alongZ ? uv.setXY(i, px / tile, pz / 8) : uv.setXY(i, pz / tile, px / 8); }
    p.alongZ = alongZ; (byKind[p.kind] ||= []).push(g);
  }
  for (const [k, gs] of Object.entries(byKind)) { const m = new THREE.Mesh(mergeGeometries(gs, false), mats[k]); m.receiveShadow = true; m.name = 'field-' + k; grp.add(m); }
  // bunds: low earth ridges on every plot edge; tracks: packed dirt
  const soil = new THREE.MeshStandardMaterial({ color: 0x7c6a50, roughness: 1 }); groundVary(soil, 0.3, touch);
  const bundM = new THREE.MeshStandardMaterial({ color: 0x8c7a5c, roughness: 1, vertexColors: true }); groundVary(bundM, 0.5, touch);
  const bund = [];
  for (const p of live) {
    const w = p.x1 - p.x0, d = p.z1 - p.z0, cx = (p.x0 + p.x1) / 2, cz = (p.z0 + p.z1) / 2;
    for (const [bw, bd, x, z] of [[w, 0.7, cx, p.z0 + 0.35], [w, 0.7, cx, p.z1 - 0.35], [0.7, d, p.x0 + 0.35, cz], [0.7, d, p.x1 - 0.35, cz]]) {
      const g = new THREE.BoxGeometry(bw, 0.2, bd, Math.max(1, Math.round(bw / 3)), 1, Math.max(1, Math.round(bd / 3))); g.translate(x, 0.07, z);
      // tapered ridge with a grassy crown and bare earth sides
      const ps = g.attributes.position, cl = new Float32Array(ps.count * 3);
      for (let i = 0; i < ps.count; i++) {
        const top = ps.getY(i) > 0.1;
        if (top) { ps.setY(i, ps.getY(i) + (Math.sin(ps.getX(i) * 0.7) + Math.cos(ps.getZ(i) * 0.9)) * 0.03); if (bw < bd) ps.setX(i, x + (ps.getX(i) - x) * 0.45); else ps.setZ(i, z + (ps.getZ(i) - z) * 0.45); }
        const gr = top ? 0.5 + 0.5 * Math.abs(Math.sin(ps.getX(i) * 1.3 + ps.getZ(i) * 0.7)) : 0;
        cl[i * 3] = 0.85 - gr * 0.3; cl[i * 3 + 1] = 0.82 + gr * 0.05; cl[i * 3 + 2] = 0.72 - gr * 0.35;
      }
      g.setAttribute('color', new THREE.BufferAttribute(cl, 3)); g.computeVertexNormals();
      bund.push(g);
    }
  }
  const bm = new THREE.Mesh(mergeGeometries(bund, false), bundM); bm.receiveShadow = true; bm.name = 'field-bunds'; grp.add(bm);
  const tg = tracks.filter(([x0, z0, x1, z1]) => x1 > x0 && z1 > z0).map(([x0, z0, x1, z1]) => { const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, 0.05, (z0 + z1) / 2); return g; });
  const tm = new THREE.Mesh(mergeGeometries(tg, false), soil); tm.receiveShadow = true; tm.name = 'field-tracks'; grp.add(tm);
  // crop clumps: one InstancedMesh per plot, shown only when the player is near (rows far off read from the ground texture)
  const clumpMats = {}, clumpGeos = {}, near = [];
  const col = new THREE.Color(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  const thin = touch ? 1.45 : 1;
  for (const p of live) {
    const c = CROPS[p.kind].clump; if (!c) continue;
    if (!clumpMats[c.tex]) {
      const m = new THREE.MeshLambertMaterial({ map: clumpTex(c.tex, rnd), alphaTest: 0.5, side: THREE.DoubleSide });
      m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n#ifndef FLAT_SHADED\nnormal = normalize(vNormal);\n#endif'); };
      m.customProgramCacheKey = () => 'cropcard';
      clumpMats[c.tex] = m; clumpGeos[c.tex] = clumpGeo(c.w, c.h);
    }
    const gap = CROPS[p.kind].gap, step = c.step * thin, pts = [];
    const w = p.x1 - p.x0 - 1.4, d = p.z1 - p.z0 - 1.4, across = p.alongZ ? w : d, along = p.alongZ ? d : w;
    for (let a = gap / 2; a < across; a += gap * (touch ? 1.3 : 1)) for (let b = step / 2; b < along; b += step) {
      const u = a + (rnd() - 0.5) * 0.12, v = b + (rnd() - 0.5) * step * 0.4;
      pts.push(p.alongZ ? [p.x0 + 0.7 + u, p.z0 + 0.7 + v] : [p.x0 + 0.7 + v, p.z0 + 0.7 + u]);
    }
    const im = new THREE.InstancedMesh(clumpGeos[c.tex], clumpMats[c.tex], pts.length);
    pts.forEach(([x, z], i) => {
      const s = 0.8 + rnd() * 0.4; m4.compose(new THREE.Vector3(x, 0.04, z), q.setFromAxisAngle(UP, rnd() * 6.28), sc.set(s, s * (0.85 + rnd() * 0.3), s)); im.setMatrixAt(i, m4);
      const l = 0.82 + rnd() * 0.3; im.setColorAt(i, col.setRGB(l, l * (0.96 + rnd() * 0.08), l * 0.9));
    });
    im.computeBoundingSphere(); im.castShadow = false; im.receiveShadow = true; im.visible = false; im.name = 'crop-' + p.kind; grp.add(im);
    near.push({ im, cx: (p.x0 + p.x1) / 2, cz: (p.z0 + p.z1) / 2, r: Math.hypot(p.x1 - p.x0, p.z1 - p.z0) / 2 });
  }
  // trees along the farm tracks and a few on bund corners
  if (treeKit) {
    const tl = [];
    for (const [x0, z0, x1, z1] of tracks) {
      const vert = z1 - z0 > x1 - x0, L = vert ? z1 - z0 : x1 - x0;
      for (let t = 10; t < L - 6; t += 30 + rnd() * 24) tl.push({ x: vert ? x1 + 0.9 : x0 + t, y: 0.05, z: vert ? z0 + t : z1 + 0.9, s: 0.8 + rnd() * 0.35, kind: rnd() < 0.5 ? 'tall' : 'street' });
    }
    treeKit.plant(grp, tl.filter((t) => !avoid({ x0: t.x - 1, x1: t.x + 1, z0: t.z - 1, z1: t.z + 1 })));
  }
  const RNEAR = touch ? 110 : 150;
  let lx = 1e9, lz = 1e9;
  function update(px, pz) {
    if (Math.abs(px - lx) + Math.abs(pz - lz) < 4) return; lx = px; lz = pz;
    for (const n of near) n.im.visible = Math.hypot(px - n.cx, pz - n.cz) - n.r < RNEAR;
  }
  const MAPCOL = { rice: 0x8fb05a, mustard: 0xe2cc4a, maize: 0x9fb46a, plough: 0xb08a62, fallow: 0xd2c08a };
  return {
    grp, update, plots: live,
    map: { plots: live.map((p) => [p.x0, p.z0, p.x1, p.z1, p.kind === 'plough' ? 1 : 0, MAPCOL[p.kind]]), tracks: tracks.map(([x0, z0, x1, z1]) => (z1 - z0 > x1 - x0 ? [[(x0 + x1) / 2, z0], [(x0 + x1) / 2, z1]] : [[x0, (z0 + z1) / 2], [x1, (z0 + z1) / 2]])) },
  };
}

// "FOR SALE" boards on posts, instanced; at(i) places sign i, count = how many are shown
export function buildSaleSigns(scene, max) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 160; const x = cv.getContext('2d');
  x.fillStyle = '#f4f1e8'; x.fillRect(0, 0, 256, 160); x.fillStyle = '#c0392b'; x.fillRect(0, 0, 256, 54);
  x.fillStyle = '#ffffff'; x.font = '800 40px Segoe UI, Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('FOR SALE', 128, 29);
  x.fillStyle = '#2a2a2a'; x.font = '700 30px Segoe UI, Arial, sans-serif'; x.fillText('Empty plot', 128, 92); x.font = '600 22px Segoe UI, Arial, sans-serif'; x.fillText('Ask at the lot', 128, 130);
  x.strokeStyle = '#2a2a2a'; x.lineWidth = 6; x.strokeRect(3, 3, 250, 154);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const post = [], board = [];
  for (const ox of [-0.55, 0.55]) { const g = new THREE.BoxGeometry(0.08, 1.9, 0.08); g.translate(ox, 0.95, 0); post.push(g.toNonIndexed()); }
  { const g = new THREE.BoxGeometry(1.5, 0.94, 0.04); g.translate(0, 1.5, -0.06); post.push(g.toNonIndexed()); }
  for (const s of [1, -1]) { const g = new THREE.PlaneGeometry(1.44, 0.9); if (s < 0) g.rotateY(Math.PI); g.translate(0, 1.5, s > 0 ? -0.035 : -0.085); board.push(g.toNonIndexed()); }
  const geo = mergeGeometries([mergeGeometries(post, false), mergeGeometries(board, false)], true);
  const mats = [new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.9 }), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.06 })];
  const im = new THREE.InstancedMesh(geo, mats, Math.max(1, max)); im.castShadow = true; im.receiveShadow = true; im.name = 'sale-signs'; im.count = 0;
  scene.add(im);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
  return {
    im,
    at(i, x, y, z, ry) { m4.compose(v.set(x, y, z), q.setFromAxisAngle(UP, ry), one); im.setMatrixAt(i, m4); },
    done(n) { im.count = n; im.instanceMatrix.needsUpdate = true; im.boundingSphere = null; im.computeBoundingSphere(); },
  };
}
