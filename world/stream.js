// Open-world streaming. A unit is one real (HIGH) mesh group: a town street side, an AIT cell, a bazaar row.
// Each unit has a LOW stand-in (shaded blocks, roof and wall colour from one atlas, windows drawn per metre)
// and an IMPOSTOR (taller silhouette blocks, no windows). A worker picks each band from the item's box:
// high under 95 m, low under 300 m, impostor under 900 m, otherwise unloaded. Both stand-ins fade into the
// haze colour with distance, so the horizon reads as far buildings, never blank planes.
// Live shadows stop at 40 m. The #ow overlay shows only with ?debug=1.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const HB = 95, L = 300, I = 900;
const NAMES = ['high', 'low', 'imp', 'off'];
const DEBUG = new URLSearchParams(location.search).get('debug') === '1';
const WALLS = ['#a0503c', '#e6dcc6', '#d8c29c', '#a3c1a9', '#a9bccf', '#d9b360', '#bcc5cc', '#efebe2', '#d9a593', '#bfb8ac', '#ece5d4', '#7a5a46'];
const ROOFS = ['#94462f', '#5b6066', '#4d785a', '#4e6e8e', '#aaa59b', '#a3423a'];
const TILE = { brick: 0, brick2: 8, plaster: 1, beige: 2, green: 3, blue: 4, ochre: 5, tile: 6, grey: 9, white: 7, cream: 10, dark: 11 };
const SUN = new THREE.Vector3(0.45, 0.8, 0.35).normalize(), SXZ = Math.hypot(SUN.x, SUN.z);
const hash = (x, z) => Math.abs(Math.floor(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453));

function tileUV(t) { return [((t % 8) + 0.5) / 8, 1 - (((t / 8) | 0) + 0.5) / 8]; }
function blockGeo(b, wall, roof, hMul, hMin) {
  const h = Math.max(hMin, b.h * hMul);
  const g = new THREE.BoxGeometry(Math.max(1.4, b.w), h, Math.max(1.4, b.d));
  g.translate(0, h / 2, 0);
  if (b.ry) g.rotateY(b.ry);
  g.translate(b.x, 0, b.z);
  const uv = g.attributes.uv, n = g.attributes.normal, col = new Float32Array(n.count * 3);
  const [wu, wv] = tileUV(wall), [ru, rv] = tileUV(16 + roof);
  for (let i = 0; i < n.count; i++) {
    const ny = n.getY(i), top = ny > 0.5;
    uv.setXY(i, top ? ru : wu, top ? rv : wv);
    const k = top ? 1 : ny < -0.5 ? 0.45 : 0.6 + 0.4 * Math.max(0, (n.getX(i) * SUN.x + n.getZ(i) * SUN.z) / SXZ);
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k;
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

export function createStream({ scene, look, buildings, campus }) {
  const atlas = (() => {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
    const g = cv.getContext('2d');
    WALLS.forEach((c, i) => { g.fillStyle = c; g.fillRect((i % 8) * 32, ((i / 8) | 0) * 32, 32, 32); });
    ROOFS.forEach((c, i) => { const t = 16 + i; g.fillStyle = c; g.fillRect((t % 8) * 32, ((t / 8) | 0) * 32, 32, 32); });
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
    return t;
  })();
  const winDay = new THREE.Color(0x2b3542), winNight = new THREE.Color(0x151a22);
  function farMat(win) {
    const u = { uWin: { value: winDay.clone() }, uLit: { value: 0 }, uHaze: { value: new THREE.Vector3(30, 950, win ? 0.72 : 0.84) } };
    const m = new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true });
    m.name = win ? 'ow-low' : 'ow-imp';
    m.userData.u = u;
    m.customProgramCacheKey = () => m.name;
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vW;\nvarying vec3 vN;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvN = normal;');
      sh.fragmentShader = (win ? '#define OW_WIN\n' : '') + sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vW;\nvarying vec3 vN;\nuniform vec3 uWin;\nuniform float uLit;\nuniform vec3 uHaze;')
        .replace('#include <color_fragment>', `#include <color_fragment>
#ifdef OW_WIN
if (abs(vN.y) < 0.5) {
  float along = abs(vN.x) > abs(vN.z) ? vW.z : vW.x;
  vec2 q = vec2(along / 2.7, (vW.y - 1.2) / 3.1);
  vec2 f = fract(q);
  float w = step(0.3, f.x) * step(f.x, 0.72) * step(0.3, f.y) * step(f.y, 0.8) * step(0.0, q.y);
  float aa = 1.0 - smoothstep(0.3, 0.75, max(fwidth(q.x), fwidth(q.y)));
  float lit = step(fract(sin(dot(floor(q) + floor(vW.xz * 0.05), vec2(12.9898, 78.233))) * 43758.5453), uLit);
  vec3 wc = mix(uWin, vec3(1.0, 0.78, 0.48), lit);
  diffuseColor.rgb = mix(diffuseColor.rgb, wc, (w * aa + 0.2 * (1.0 - aa)) * 0.8);
}
#endif`)
        .replace('#include <fog_fragment>', `#ifdef USE_FOG
float owHz = max(smoothstep(uHaze.x, uHaze.y, vFogDepth) * uHaze.z, smoothstep(fogNear, fogFar, vFogDepth));
gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, owHz);
#endif`);
    };
    return m;
  }
  const lowMat = farMat(true), impMat = farMat(false);

  const root = scene.getObjectByName('ait');
  if (root) for (const ch of root.children) { if (ch.name !== 'ait-extras' && ch.name !== 'ait-low') ch.visible = true; }
  if (campus && campus.lowMesh) campus.lowMesh.visible = false;

  scene.updateMatrixWorld(true);
  const units = new Map(), unitList = [], byName = new Map(), tmp = new THREE.Box3();
  scene.traverse((o) => {
    if (!o.isMesh || o.userData.keep) return;
    if (o.name === 'ait-low') { o.visible = false; return; }
    if (o.isInstancedMesh) return;
    tmp.setFromObject(o);
    if (tmp.isEmpty()) return;
    const sx = tmp.max.x - tmp.min.x, sy = tmp.max.y - tmp.min.y, sz = tmp.max.z - tmp.min.z;
    if (sy < 1.15 || sx > 280 || sz > 280) return;
    const par = o.parent;
    const grouped = !!(par && par !== scene && par.isGroup && par.name && par.name !== 'ait' && par.name !== 'ait-extras');
    const key = grouped ? par.uuid : o.uuid;
    let u = units.get(key);
    if (!u) {
      u = { id: unitList.length, name: grouped ? par.name : '', meshes: [], box: new THREE.Box3(), mode: 'high' };
      units.set(key, u); unitList.push(u);
      if (grouped) byName.set(par.name, u);
    }
    u.meshes.push({ mesh: o, box: tmp.clone(), canShadow: !!o.castShadow });
    u.box.union(tmp);
    o.userData.ow = 1;
  });

  const lowGroups = new Map(), v3 = new THREE.Vector3();
  function addBlock(b, wall, ownerName, roofs) {
    if (!b || b.h < 2) return;
    const owner = (ownerName && byName.get(ownerName)) || null;
    const key = owner ? 'u' + owner.id : 'c' + Math.floor(b.x / 100) + '_' + Math.floor(b.z / 100);
    let g = lowGroups.get(key);
    if (!g) { g = { owner, parts: [], impParts: [], box: new THREE.Box3(), mode: 'off', shown: 'off' }; lowGroups.set(key, g); }
    const roof = roofs[hash(b.x, b.z) % roofs.length];
    g.parts.push(blockGeo(b, wall, roof, 1, 2.2));
    g.impParts.push(blockGeo(b, wall, roof, 1.35, 9));
    const r = Math.hypot(b.w, b.d) / 2;
    g.box.expandByPoint(v3.set(b.x - r, 0, b.z - r)); g.box.expandByPoint(v3.set(b.x + r, 0, b.z + r));
  }
  for (const b of buildings || []) {
    if (!b.box) continue;
    const box = b.box;
    addBlock({ x: (box.x0 + box.x1) / 2, z: (box.z0 + box.z1) / 2, w: Math.abs(box.x1 - box.x0), d: Math.abs(box.z1 - box.z0), h: box.y1 || b.H || 8, ry: 0 },
      TILE[b.wall] ?? 1, b.group || ('side-' + b.side), [0, 1, 2, 3, 5]);
  }
  for (const b of (campus && campus.blocks) || []) addBlock(b, TILE.cream, b.cell != null ? 'ait-cell ' + b.cell : null, [0, 4, 4]);

  const groups = [];
  for (const g of lowGroups.values()) {
    g.low = new THREE.Mesh(g.parts.length === 1 ? g.parts[0] : mergeGeometries(g.parts, false), lowMat);
    g.imp = new THREE.Mesh(g.impParts.length === 1 ? g.impParts[0] : mergeGeometries(g.impParts, false), impMat);
    g.low.name = 'ow-low'; g.imp.name = 'ow-imp';
    g.low.userData.keep = g.imp.userData.keep = 1;
    g.parts = g.impParts = null;
    groups.push(g);
  }

  const stats = { high: 0, low: 0, imp: 0, off: 0, cells: unitList.length + groups.length, units: unitList.length, groups: groups.length, drawCalls: 0, triangles: 0, jsHeap: 0, fps: 0, source: 'local', atlas: 1, shadowM: 40 };
  let held = false, lastX = 4, lastZ = 20, sentX = 1e9, sentZ = 1e9, workerOn = false;
  const campusHB = (campus && campus.highR) || 0;
  for (const u of unitList) u.hb = campusHB && u.name.startsWith('ait-cell ') ? campusHB : HB;
  for (const g of groups) g.hb = g.owner ? g.owner.hb : HB;
  const boxes = unitList.map((u) => [u.box.min.x, u.box.min.z, u.box.max.x, u.box.max.z, u.hb]).concat(groups.map((g) => [g.box.min.x, g.box.min.z, g.box.max.x, g.box.max.z, g.hb]));
  const worker = new Worker('/world/stream-worker.js?v=aitc1');
  worker.onmessage = (ev) => {
    workerOn = true;
    if (held) return;
    const m = ev.data.modes;
    for (let i = 0; i < unitList.length; i++) unitList[i].mode = NAMES[m[i]];
    for (let i = 0; i < groups.length; i++) groups[i].mode = NAMES[m[unitList.length + i]];
    stats.source = 'worker';
    show();
  };
  worker.onerror = (e) => { console.error('stream worker', e.message || e); };
  worker.postMessage({ t: 'init', boxes, HB, L, I });

  function distBox(x, z, b) {
    const cx = Math.max(b.min.x, Math.min(x, b.max.x)), cz = Math.max(b.min.z, Math.min(z, b.max.z));
    return Math.hypot(x - cx, z - cz);
  }
  function band(d, hb = HB) { return d < hb ? 'high' : d < Math.max(L, hb) ? 'low' : d < I ? 'imp' : 'off'; }
  function setOn(mesh, on) {
    if (on) { if (!mesh.parent) scene.add(mesh); mesh.visible = true; }
    else if (mesh.parent) scene.remove(mesh);
  }
  function show() {
    let high = 0, low = 0, imp = 0, off = 0;
    for (const u of unitList) {
      const on = held ? distBox(lastX, lastZ, u.box) < 250 : u.mode === 'high';
      if (on) high++; else off++;
      u.on = on;
      for (const r of u.meshes) {
        r.mesh.visible = on;
        r.mesh.castShadow = !!(on && r.canShadow && distBox(lastX, lastZ, r.box) < 40);
      }
    }
    for (const g of groups) {
      const covered = g.owner && g.owner.on;
      const m = held || covered ? 'off' : g.mode === 'high' ? 'low' : g.mode;
      g.shown = m;
      setOn(g.low, m === 'low'); setOn(g.imp, m === 'imp');
      if (m === 'low') low++; else if (m === 'imp') imp++; else off++;
    }
    stats.high = high; stats.low = low; stats.imp = imp; stats.off = off;
    if (campus && campus.extras && campus.near) campus.extras.visible = campus.near(lastX, lastZ);
    else if (campus && campus.extras && campus.spawn) {
      const s = campus.spawn;
      campus.extras.visible = Math.hypot(lastX - s.x, lastZ - s.z) < (held ? 250 : 300);
    }
    if (campus && campus.lowMesh) campus.lowMesh.visible = false;
  }
  function applyLocal(x, z) {
    for (const u of unitList) u.mode = band(distBox(x, z, u.box), u.hb);
    for (const g of groups) g.mode = band(distBox(x, z, g.box), g.hb);
    if (!workerOn) stats.source = 'local';
    show();
  }
  function step(x, z) {
    lastX = x; lastZ = z;
    if (held) return;
    if (Math.hypot(x - sentX, z - sentZ) < 6 && workerOn) return;
    sentX = x; sentZ = z;
    worker.postMessage({ t: 'pos', x, z });
    if (!workerOn) applyLocal(x, z);
  }
  function holdFar(on) {
    held = !!on;
    look.state.viewFar = on ? 480 : null;
    if (look.applyTime) look.applyTime(look.state.hour || 10, 0.3);
    applyLocal(lastX, lastZ);
    if (!on) { workerOn = false; sentX = 1e9; step(lastX, lastZ); }
  }
  const el = document.getElementById('ow');
  if (el && !DEBUG) el.remove();
  function note(renderer) {
    const night = look.state.night || 0;
    for (const m of [lowMat, impMat]) { m.userData.u.uLit.value = night * 0.42; m.userData.u.uWin.value.copy(winDay).lerp(winNight, night); }
    const info = renderer.info;
    stats.drawCalls = info.render.calls;
    stats.triangles = info.render.triangles;
    stats.fps = window.__fps || 0;
    stats.jsHeap = (performance.memory && performance.memory.usedJSHeapSize) || 0;
    if (!DEBUG || !el) return;
    const heap = stats.jsHeap ? (stats.jsHeap / 1048576).toFixed(1) + ' MB' : 'n/a';
    el.textContent = 'units H' + stats.high + ' L' + stats.low + ' I' + stats.imp + ' off ' + stats.off
      + '\ndraws ' + stats.drawCalls + '  tri ' + stats.triangles
      + '\nheap ' + heap + '  fps ' + stats.fps
      + '\nshadow 40m  atlas 1  vtx bake  ' + stats.source;
  }
  function snapshot() {
    return { high: stats.high, low: stats.low, imp: stats.imp, unloaded: stats.off, cells: stats.cells, drawCalls: stats.drawCalls, triangles: stats.triangles, jsHeap: stats.jsHeap, fps: stats.fps, source: stats.source };
  }
  applyLocal(4, 20);
  step(4, 20);
  return { step, holdFar, note, stats: snapshot, get cells() { return stats.cells; }, debug: DEBUG };
}
