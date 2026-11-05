// Ambient life: cars looping the ring road (they brake for people), pigeons in the plaza (they scatter when you walk up).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const PAVE_Y = 0.15;
function loopPts(h, r, dir) { // rounded square, sampled every ~0.6 m; dir +1 / -1
  const step = 0.6;
  const P = [];
  const line = (x0, z0, x1, z1) => { const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / step)); for (let i = 0; i < n; i++) P.push([x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n]); };
  const arc = (cx, cz, a0, a1) => { const n = Math.max(2, Math.round(Math.abs(a1 - a0) * r / step)); for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * i / n; P.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); } };
  line(-(h - r), -h, h - r, -h); arc(h - r, -(h - r), -Math.PI / 2, 0); line(h, -(h - r), h, h - r); arc(h - r, h - r, 0, Math.PI / 2);
  line(h - r, h, -(h - r), h); arc(-(h - r), h - r, Math.PI / 2, Math.PI); line(-h, h - r, -h, -(h - r)); arc(-(h - r), -(h - r), Math.PI, Math.PI * 1.5);
  if (dir < 0) P.reverse();
  const L = [0]; for (let i = 1; i <= P.length; i++) { const a = P[i - 1], b = P[i % P.length]; L.push(L[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  return { P, L, total: L[P.length] };
}
function at(path, s) {
  s = ((s % path.total) + path.total) % path.total; let lo = 0, hi = path.P.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (path.L[m] <= s) lo = m; else hi = m - 1; }
  const a = path.P[lo], b = path.P[(lo + 1) % path.P.length], u = (s - path.L[lo]) / Math.max(1e-6, path.L[lo + 1] - path.L[lo]);
  return { x: a[0] + (b[0] - a[0]) * u, z: a[1] + (b[1] - a[1]) * u, h: Math.atan2(b[0] - a[0], b[1] - a[1]) };
}

function carMesh(look, color) {
  const g = new THREE.Group(), body = look.M('paint:' + color), dark = new THREE.MeshStandardMaterial({ color: 0x14181c, roughness: .08, metalness: .9 });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  add(new THREE.BoxGeometry(1.8, .62, 4.3), body, 0, .62, 0);                       // z = forward
  add(new THREE.BoxGeometry(1.7, .3, 3.2), body, 0, .98, -.1);
  add(new THREE.BoxGeometry(1.6, .5, 2.1), dark, 0, 1.32, -.25);                    // glasshouse
  add(new THREE.BoxGeometry(1.5, .06, 1.8), body, 0, 1.6, -.25);                    // roof
  add(new THREE.BoxGeometry(1.5, .16, .06), look.M('headlight'), 0, .72, 2.17);
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(.4, .14, .06), look.M('headlight'), sx * .6, .72, 2.17);
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(.4, .14, .06), new THREE.MeshStandardMaterial({ color: 0x7a0b0b, emissive: 0xff1010, emissiveIntensity: .35 }), sx * .6, .72, -2.17);
  const wg = new THREE.CylinderGeometry(.34, .34, .24, 14); wg.rotateZ(Math.PI / 2);
  for (const [x, z] of [[.9, 1.35], [-.9, 1.35], [.9, -1.35], [-.9, -1.35]]) add(wg, look.M('tyre'), x, .34, z);
  return g;
}

function bikeMesh(look, color) {
  const g = new THREE.Group(), body = look.M('paint:' + color), dark = new THREE.MeshStandardMaterial({ color: 0x14181c, roughness: .4, metalness: .4 });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  add(new THREE.BoxGeometry(.28, .22, 1.35), body, 0, .72, .05);
  add(new THREE.BoxGeometry(.22, .16, .4), dark, 0, .92, -.15);
  add(new THREE.BoxGeometry(.7, .08, .16), body, 0, .78, -.05);
  const wg = new THREE.CylinderGeometry(.32, .32, .12, 10); wg.rotateZ(Math.PI / 2);
  add(wg, look.M('tyre'), 0, .32, .85); add(wg, look.M('tyre'), 0, .32, -.7);
  add(new THREE.BoxGeometry(.16, .1, .06), look.M('headlight'), 0, .78, 1.05);
  return g;
}
function signal(scene, x, z, ax, face) {
  const g = new THREE.Group(), poleM = new THREE.MeshStandardMaterial({ color: 0x2a2e33, roughness: .55, metalness: .25 });
  const pole = new THREE.Mesh(new THREE.BoxGeometry(.14, 4.2, .14), poleM); pole.position.y = 2.1; g.add(pole);
  const housing = new THREE.Mesh(new THREE.BoxGeometry(.36, 1.05, .28), poleM); housing.position.set(0, 3.7, .08); g.add(housing);
  const bulbs = [0xff2a2a, 0xffb000, 0x37d36a].map((c, i) => { const m = new THREE.MeshStandardMaterial({ color: 0x141414, emissive: c, emissiveIntensity: .05, roughness: .3 }); const s = new THREE.Mesh(new THREE.SphereGeometry(.16, 10, 8), m); s.position.set(0, 4.02 - i * .3, .2); g.add(s); return m; });
  g.position.set(x, PAVE_Y, z); g.rotation.y = face; scene.add(g); return { bulbs, ax, x, z };
}
const STOPS = [
  { lane: 0, x0: 26, x1: 36.2, z0: -44.6, z1: -40.0, ax: 'ew' },
  { lane: 1, x0: 35.4, x1: 40.6, z0: -36.2, z1: -26.0, ax: 'ns' },
  { lane: 0, x0: -36.2, x1: -26, z0: 40.0, z1: 44.6, ax: 'ew' },
  { lane: 1, x0: -40.6, x1: -35.4, z0: 26.0, z1: 36.2, ax: 'ns' },
];
function phaseOf(t) {
  const c = ((t % 18) + 18) % 18;
  if (c < 7) return { ns: 'green', ew: 'red' };
  if (c < 9) return { ns: 'amber', ew: 'red' };
  if (c < 16) return { ns: 'red', ew: 'green' };
  return { ns: 'red', ew: 'amber' };
}

export function createAmbient({ scene, look, world, peds }) {
  const cars = [], bikes = [], vehicles = [], cols = ['0xa1272a', '0x1f4f7a', '0xd9d5c9', '0x2f6b4e'];
  const lanes = [loopPts(42.3, 5, 1), loopPts(37.7, 5, -1)];
  [[0, 0], [0, 150], [1, 20], [1, 165]].forEach(([li, s0], i) => { const m = carMesh(look, cols[i % cols.length]); scene.add(m); cars.push({ m, lane: lanes[li], li, s: s0, v: 0, top: [4.2, 4.6, 6.8, 4.4][i], kind: 'car', hw: 1.05, hl: 2.25 }); });
  [[0, 48], [1, 96], [0, 210]].forEach(([li, s0], i) => { const m = bikeMesh(look, ['0xc4553a', '0x22262c', '0xd3a02b'][i]); scene.add(m); bikes.push({ m, lane: lanes[li], li, s: s0, v: 0, top: [4.3, 8.0, 7.2][i], kind: 'bike', hw: .55, hl: 1.2 }); });
  const fleet = cars.concat(bikes);
  const lights = [signal(scene, 33.4, -40.6, 'ew', -Math.PI / 2), signal(scene, 40.6, -33.4, 'ns', 0), signal(scene, -33.4, 40.6, 'ew', Math.PI / 2), signal(scene, -40.6, 33.4, 'ns', Math.PI)];
  const laneMat = new THREE.MeshStandardMaterial({ color: 0x2f6b45, roughness: 1 });
  const laneBits = [];
  for (const [x, z, w, d] of [[0, -34.2, 70, .85], [0, 34.2, 70, .85], [-34.2, 0, .85, 60], [34.2, 0, .85, 60]]) { const geo = new THREE.BoxGeometry(w, .012, d); geo.translate(x, PAVE_Y + .02, z); laneBits.push(geo); }
  const laneMesh = new THREE.Mesh(mergeGeometries(laneBits), laneMat); laneMesh.receiveShadow = true; scene.add(laneMesh);
  let phase = phaseOf(0);
  function updateCars(dt, t) {
    phase = phaseOf(t);
    const on = { red: 0, amber: 1, green: 2 };
    for (const L of lights) { const idx = on[phase[L.ax]]; L.bulbs.forEach((m, i) => { m.emissiveIntensity = i === idx ? 2.6 : .03; }); }
    vehicles.length = 0;
    for (const c of fleet) {
      const here = at(c.lane, c.s); let block = false;
      if (phase) for (const st of STOPS) if (st.lane === c.li && phase[st.ax] !== 'green' && here.x >= st.x0 && here.x <= st.x1 && here.z >= st.z0 && here.z <= st.z1) block = true;
      for (const o of fleet) if (o !== c && o.lane === c.lane) { let gap = (o.s - c.s) % c.lane.total; if (gap < 0) gap += c.lane.total; if (gap < (c.kind === 'bike' ? 6 : 9)) block = true; }
      const target = block ? 0 : c.top; c.v += Math.sign(target - c.v) * Math.min(Math.abs(target - c.v), (target < c.v ? 12 : 2.6) * dt);
      c.s += c.v * dt; const a = at(c.lane, c.s); c.m.position.set(a.x, PAVE_Y + .012, a.z); let d = a.h - c.m.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); c.m.rotation.y += d * Math.min(1, dt * 8);
      vehicles.push({ x: a.x, z: a.z, h: a.h, v: c.v, kind: c.kind, hw: c.hw, hl: c.hl });
    }
  }
  // ---- pigeons
  const pg = (() => { const parts = []; const b = new THREE.SphereGeometry(.11, 8, 6); b.scale(1, .85, 1.7); b.translate(0, .15, 0); const h = new THREE.SphereGeometry(.065, 7, 5); h.translate(0, .24, .17); const t = new THREE.BoxGeometry(.1, .02, .16); t.translate(0, .16, -.2);
    const bk = new THREE.ConeGeometry(.015, .05, 4); bk.rotateX(Math.PI / 2); bk.translate(0, .235, .24); for (const x of [b, h, t, bk]) { x.deleteAttribute('uv'); parts.push(x.index ? x.toNonIndexed() : x); } return mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)), false); })();
  const N = 16, pm = new THREE.InstancedMesh(pg, new THREE.MeshStandardMaterial({ color: 0x8c93a0, roughness: .9 }), N);
  const wg = new THREE.BoxGeometry(.3, .012, .16); wg.translate(.15, 0, 0); const wm = new THREE.MeshStandardMaterial({ color: 0x70778a, roughness: .9 });
  const wl = new THREE.InstancedMesh(wg, wm, N), wr = new THREE.InstancedMesh(wg, wm, N);
  for (const m of [pm, wl, wr]) { m.castShadow = true; m.frustumCulled = false; scene.add(m); }
  const birds = []; for (let i = 0; i < N; i++) { const a = Math.random() * 6.28, r = 7 + Math.random() * 9; birds.push({ x: world.fountain.x + Math.cos(a) * r, z: world.fountain.z + Math.sin(a) * r, y: 0, h: Math.random() * 6.28, st: 'peck', t: Math.random() * 3, fx: 0, fz: 0, tx: 0, tz: 0, t0: 0, dur: 1 }); }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), zero = new THREE.Vector3(.001, .001, .001), UPV = new THREE.Vector3(0, 1, 0), mw = new THREE.Matrix4(), fl = new THREE.Matrix4();
  function updateBirds(dt, t, pl) {
    const asleep = look.state.night > .7;
    birds.forEach((b, i) => {
      const near = pl.some((p) => Math.hypot(p.x - b.x, p.z - b.z) < 3.0);
      if (b.st !== 'fly' && (near || (Math.random() < dt * .02))) { // scatter
        const a = Math.random() * 6.28, r = near ? 8 + Math.random() * 6 : 3 + Math.random() * 4; b.fx = b.x; b.fz = b.z; b.tx = Math.max(-2, Math.min(30, b.x + Math.cos(a) * r)); b.tz = Math.max(-28, Math.min(28, b.z + Math.sin(a) * r)); b.st = 'fly'; b.t0 = t; b.dur = 1.3 + Math.hypot(b.tx - b.x, b.tz - b.z) / 7; b.h = Math.atan2(b.tx - b.x, b.tz - b.z); }
      let flap = 0, pitch = 0;
      if (b.st === 'fly') { const u = Math.min(1, (t - b.t0) / b.dur); b.x = b.fx + (b.tx - b.fx) * u; b.z = b.fz + (b.tz - b.fz) * u; b.y = Math.sin(u * Math.PI) * 2.6; flap = Math.sin(t * 38 + i) * .9 + .2; pitch = -.2; if (u >= 1) { b.st = 'peck'; b.y = 0; b.t = 1 + Math.random() * 3; } }
      else { b.t -= dt; if (b.t < 0) { b.st = b.st === 'peck' ? 'walk' : 'peck'; b.t = .6 + Math.random() * 2.2; b.h += (Math.random() - .5) * 2; }
        if (b.st === 'walk') { b.x += Math.sin(b.h) * .35 * dt; b.z += Math.cos(b.h) * .35 * dt; } pitch = b.st === 'peck' ? .55 * Math.max(0, Math.sin(t * 7 + i * 2)) : 0; }
      q.setFromEuler(e.set(pitch, b.h, 0)); mw.compose(new THREE.Vector3(b.x, PAVE_Y + .02 + b.y, b.z), q, asleep ? zero : one); pm.setMatrixAt(i, mw);
      for (const [im, sg] of [[wl, 1], [wr, -1]]) { fl.compose(new THREE.Vector3(sg * .08, .19, 0), q.setFromEuler(e.set(0, sg < 0 ? Math.PI : 0, sg * flap)), b.st === 'fly' && !asleep ? one : zero); im.setMatrixAt(i, new THREE.Matrix4().multiplyMatrices(mw, fl)); }
    });
    for (const m of [pm, wl, wr]) m.instanceMatrix.needsUpdate = true;
  }
  return { update(dt, t, playerPts) { updateCars(dt, t); updateBirds(dt, t, playerPts); }, cars, bikes, birds, lights, vehicles, phase: () => phase };
}
