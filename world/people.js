// Townspeople: Quaternius CC0 rigged people (walk/idle/sit/wave), A* nav on a 0.5 m grid, deterministic daily routines tied to the world clock.
import * as THREE from 'three';
import { createAvatar, npcLook } from './avatar.js?v=pick1';

export const DAY = 600;               // real seconds per visible day (the CORE-RULES calendar still runs 1 real hour = 1 game year; a 9.9 s day would strobe)
export const hourOf = (t) => ((t % DAY) / DAY) * 24;
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0); };
export const rng = (seed) => { let s = seed % 2147483647 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

export function nameLabel(text, sub) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 112; const g = c.getContext('2d');
  g.fillStyle = 'rgba(18,16,14,.62)'; g.beginPath(); g.roundRect(6, 6, 500, 100, 30); g.fill(); g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#fff4e0'; g.font = '600 44px system-ui,Segoe UI,sans-serif'; g.textAlign = 'center'; g.fillText(text, 256, 56); g.fillStyle = '#e9c27a'; g.font = '30px system-ui,Segoe UI,sans-serif'; g.fillText(sub, 256, 92);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false, transparent: true })); s.scale.set(1.0, .22, 1); return s;
}
const MOOD_INK = { flirt: '#ffb4d0', angry: '#ff9a8e', sad: '#b9cbe4', playful: '#ffe0a0', shy: '#e7c4d8', proud: '#f2c35a', friendly: '#c8e6b0', calm: '#e9c27a' };
export function retitle(sprite, name, sub, mood) {
  const c = sprite.material.map.image, g = c.getContext('2d'); g.clearRect(0, 0, 512, 112);
  g.fillStyle = 'rgba(18,16,14,.62)'; g.beginPath(); g.roundRect(6, 6, 500, 100, 30); g.fill(); g.strokeStyle = MOOD_INK[mood] || 'rgba(255,255,255,.28)'; g.lineWidth = 4; g.stroke();
  g.fillStyle = '#fff4e0'; g.font = '600 44px system-ui,Segoe UI,sans-serif'; g.textAlign = 'center'; g.fillText(name, 256, 56);
  g.fillStyle = MOOD_INK[mood] || '#e9c27a'; g.font = '30px system-ui,Segoe UI,sans-serif'; g.fillText(mood ? `${sub} · ${mood}` : sub, 256, 92);
  sprite.material.map.needsUpdate = true;
}
function bikeMesh() {
  const g = new THREE.Group(), metal = new THREE.MeshStandardMaterial({ color: 0x2f6b45, roughness: .45, metalness: .15 }), dark = new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: .7 });
  const wheel = new THREE.TorusGeometry(.34, .028, 5, 12); wheel.rotateY(Math.PI / 2);
  for (const z of [-.55, .55]) { const m = new THREE.Mesh(wheel, dark); m.position.set(0, .36, z); m.name = 'wheel'; g.add(m); }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(.05, .05, 1.15), metal); bar.position.set(0, .5, 0); g.add(bar);
  const post = new THREE.Mesh(new THREE.BoxGeometry(.04, .28, .04), metal); post.position.set(0, .62, -.2); g.add(post);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(.1, .04, .26), dark); seat.position.set(0, .76, -.18); g.add(seat);
  const fork = new THREE.Mesh(new THREE.BoxGeometry(.04, .32, .04), metal); fork.position.set(0, .52, .55); g.add(fork);
  g.visible = false; return g;
}
function lanePos(u) {
  const x0 = -32, x1 = 32, zS = -34.2, zN = 34.2, segs = [[[x0, zS], [x1, zS]], [[x1, zS], [x1, zN]], [[x1, zN], [x0, zN]], [[x0, zN], [x0, zS]]];
  const lens = segs.map((s) => Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1])); const tot = lens.reduce((a, b) => a + b, 0);
  let d = ((u % 1) + 1) % 1 * tot;
  for (let i = 0; i < 4; i++) { if (d <= lens[i]) { const t = d / Math.max(1e-4, lens[i]); const a = segs[i][0], b = segs[i][1]; return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, heading: Math.atan2(b[0] - a[0], b[1] - a[1]) }; } d -= lens[i]; }
  return { x: x0, z: zS, heading: Math.PI / 2 };
}

// ------------------------------------------------------------------ navigation grid
export function makeNav(nav) {
  const C = 0.5, B = nav.bound, N = Math.ceil(2 * B / C), R = 0.42;
  const blocked = new Uint8Array(N * N), cost = new Float32Array(N * N).fill(1);
  const ci = (v) => Math.floor((v + B) / C), cc = (i) => -B + (i + .5) * C;
  for (let iz = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++) { const x = cc(ix), z = cc(iz); let road = false;
    if (Math.abs(z + nav.ring) < 4 && Math.abs(x) < 44 || Math.abs(z - nav.ring) < 4 && Math.abs(x) < 44 || Math.abs(x + nav.ring) < 4 && Math.abs(z) < 36 || Math.abs(x - nav.ring) < 4 && Math.abs(z) < 36) road = true;
    if (road) for (const zb of nav.zebras) { if (zb.alongX ? (Math.abs(x - zb.x) < 1.6 && Math.abs(z - zb.z) < 4) : (Math.abs(z - zb.z) < 1.6 && Math.abs(x - zb.x) < 4)) { road = false; break; } }
    cost[iz * N + ix] = road ? 5 : 1; if (Math.abs(x) > B - .5 || Math.abs(z) > B - .5) blocked[iz * N + ix] = 1; }
  for (const r of nav.rects) for (let iz = Math.max(0, ci(r.z0 - R)); iz <= Math.min(N - 1, ci(r.z1 + R)); iz++) for (let ix = Math.max(0, ci(r.x0 - R)); ix <= Math.min(N - 1, ci(r.x1 + R)); ix++) blocked[iz * N + ix] = 1;
  for (const c of nav.circles) { const rr = c.r + R; for (let iz = Math.max(0, ci(c.z - rr)); iz <= Math.min(N - 1, ci(c.z + rr)); iz++) for (let ix = Math.max(0, ci(c.x - rr)); ix <= Math.min(N - 1, ci(c.x + rr)); ix++) if (Math.hypot(cc(ix) - c.x, cc(iz) - c.z) <= rr) blocked[iz * N + ix] = 1; }
  const free = (ix, iz) => ix >= 0 && iz >= 0 && ix < N && iz < N && !blocked[iz * N + ix];
  function nearest(x, z) { let ix = ci(x), iz = ci(z); if (free(ix, iz)) return [ix, iz];
    for (let r = 1; r < 14; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if ((Math.abs(dx) === r || Math.abs(dz) === r) && free(ix + dx, iz + dz)) return [ix + dx, iz + dz]; return [ix, iz]; }
  const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]];
  const g = new Float32Array(N * N), from = new Int32Array(N * N), seen = new Uint32Array(N * N); let stamp = 0;
  function lineOK(a, b, roadOK) { const dx = b[0] - a[0], dz = b[1] - a[1], n = Math.ceil(Math.hypot(dx, dz) / (C * .5)); for (let i = 0; i <= n; i++) { const ix = ci(a[0] + dx * i / n), iz = ci(a[1] + dz * i / n); if (!free(ix, iz) || (!roadOK && cost[iz * N + ix] > 1)) return false; } return true; }
  function path(sx, sz, gx, gz) {
    const [s0, s1] = nearest(sx, sz), [g0, g1] = nearest(gx, gz); stamp++; const heap = [[0, s1 * N + s0]]; g[s1 * N + s0] = 0; seen[s1 * N + s0] = stamp; from[s1 * N + s0] = -1; const goal = g1 * N + g0;
    const push = (it) => { heap.push(it); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    let found = false;
    while (heap.length) { const [, cur] = pop(); if (cur === goal) { found = true; break; } const cx = cur % N, cz = (cur / N) | 0;
      for (const [dx, dz, w] of DIRS) { const nx = cx + dx, nz = cz + dz; if (!free(nx, nz)) continue; if (dx && dz && (!free(cx + dx, cz) || !free(cx, cz + dz))) continue;
        const ni = nz * N + nx, ng = g[cur] + w * cost[ni]; if (seen[ni] !== stamp || ng < g[ni]) { seen[ni] = stamp; g[ni] = ng; from[ni] = cur; const h = Math.hypot(nx - g0, nz - g1); push([ng + h, ni]); } } }
    if (!found) return [[sx, sz], [gx, gz]];
    let pts = [], c = goal; while (c !== -1) { pts.push([cc(c % N), cc((c / N) | 0)]); c = from[c]; } pts.reverse();
    // string-pull between pavement points; keep road crossings as they are
    const out = [pts[0]]; let i = 0;
    while (i < pts.length - 1) { let j = pts.length - 1; while (j > i + 1 && !lineOK(pts[i], pts[j], false)) j--; out.push(pts[j]); i = j; }
    // collapse collinear
    const res = [out[0]]; for (let k = 1; k < out.length - 1; k++) { const a = res[res.length - 1], b = out[k], d = out[k + 1]; if (Math.abs((b[0] - a[0]) * (d[1] - b[1]) - (b[1] - a[1]) * (d[0] - b[0])) > 0.01) res.push(b); } res.push(out[out.length - 1]);
    res[0] = [sx, sz]; res[res.length - 1] = [gx, gz]; return res;
  }
  return { path, free: (x, z) => free(ci(x), ci(z)) };
}

// ------------------------------------------------------------------ cast + routines
const PLACE_MAP = { cafe: 'cafe', shop: 'shop', office: 'office', college: 'college', gym: 'gym', apartments: 'apartments', park: 'park', street: 'street', home: 'apartments', bank: 'bank' };
function cropHit(world, pts) {
  const plots = (world && world.crops && world.crops.plots) || [];
  if (!plots.length || !pts || pts.length < 2) return false;
  const inn = (x, z) => { for (const p of plots) if (x > p.x0 + 0.5 && x < p.x1 - 0.5 && z > p.z0 + 0.5 && z < p.z1 - 0.5) return true; return false; };
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2));
    for (let k = 1; k < n; k++) if (inn(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n)) return true;
  }
  return false;
}
export function buildPeople({ scene, G, cast, world, nav, route }) {
  const used = new Set(), people = [];
  const seats = world.pois.seats.slice();
  const cyc = []; for (const c of cast) if ((hash(c.id) % 5) === 0) cyc.push(c.id); for (const c of cast) if (cyc.length < 4 && !cyc.includes(c.id)) cyc.push(c.id);
  const cycleSet = new Set(cyc.slice(0, 4));
  // who sits: women (whatever their routine) get the seated-capable rig first if they spend time in a park
  const wantsPark = (c) => (c.routine || []).some((r) => PLACE_MAP[r.place] === 'park');
  const isF = (c) => /^(f|w|g)/i.test(c.gender || ''); let sitters = cast.filter((c) => wantsPark(c)).slice(0, 6).map((c) => c.id);
  cast.forEach((c, idx) => {
    const sd = hash(c.id); const r = rng(sd);
    const female = isF(c); const age = +c.age || 35;
    const key = sitters.includes(c.id) ? 'sit' : 'walker'; const look = npcLook(c), height = look.h / 100;
    const av = createAvatar(look); const speed = 1.38 * (look.h / 185) * (age > 65 ? .85 : 1) * (.95 + r() * .25);   // m/s: walk clip ground speed (stride * 1.1) at this height, so feet match the ground
    const pick = new THREE.Group(); pick.add(av.root); pick.name = c.id; scene.add(pick);
    const proxy = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, height + .2, 8), new THREE.MeshBasicMaterial({ visible: false })); proxy.position.y = (height + .2) / 2; proxy.userData.npc = c.id; pick.add(proxy);
    const label = nameLabel(c.name.split(' ')[0], c.job || ''); label.position.y = height + .45; label.visible = false; label.userData.npc = c.id; pick.add(label);
    const p = { id: c.id, cast: c, key, root: pick, av, proxy, label, speed, skew: 0, segs: [], hidden: false, heading: 0, chat: false, mood: '', lastMode: 'idle', pos: { x: 0, z: 0 }, place: '', cyclist: cycleSet.has(c.id) };
    pick.userData.npc = c.id; if (p.cyclist) { p.bike = bikeMesh(); pick.add(p.bike); }
    // pick a poi for each routine place (stable by hash)
    const poiFor = (placeRaw) => {
      const place = PLACE_MAP[placeRaw] || 'street', list = world.pois[place] || world.pois.street;
      if (place === 'park' && key === 'sit') { for (let k = 0; k < seats.length; k++) { const s = seats[(sd + k) % seats.length]; if (!used.has(s)) { used.add(s); return { seat: s, x: s.x, z: s.z, place }; } } }
      const base = list[(sd >>> 4) % list.length]; return { ...base, place };
    };
    const cache = {}; const poiOf = (pl) => (cache[pl] ||= poiFor(pl));
    let routine = (c.routine || []).map((x) => ({ from: +x.from_hour, to: +x.to_hour, place: x.place })).sort((a, b) => a.from - b.from);
    if (!routine.length) routine = [{ from: 0, to: 24, place: 'street' }];
    if (routine[routine.length - 1].place !== routine[0].place) routine.push({ from: 23.3, to: 24, place: routine[0].place });
    // build segments in seconds of day
    const segs = []; let t = 0, at = poiOf(routine[0].place);
    const stay = (t0, t1, poi) => { if (t1 <= t0) return; const mode = poi.inside ? 'hidden' : poi.seat ? 'sit' : 'idle';
      const heading = poi.seat ? seatHeading(poi.seat) : poi.face ?? (Math.atan2(world.fountain.x - poi.x, world.fountain.z - poi.z)); segs.push({ k: 'stay', t0, t1, x: poi.seat ? seatPos(poi.seat).x : poi.x, z: poi.seat ? seatPos(poi.seat).z : poi.z, heading, mode, place: poi.place }); };
    for (let i = 0; i < routine.length; i++) {
      const b = routine[i], poi = poiOf(b.place), start = Math.max(t, b.from / 24 * DAY + r() * 14 - 7);
      if (poi !== at) {
        const ax = at.seat ? approach(at.seat).x : at.x, az = at.seat ? approach(at.seat).z : at.z, bx = poi.seat ? approach(poi.seat).x : poi.x, bz = poi.seat ? approach(poi.seat).z : poi.z;
        let pts = nav.path(ax, az, bx, bz);
        const outside = Math.abs(ax) > 54 || Math.abs(az) > 54 || Math.abs(bx) > 54 || Math.abs(bz) > 54;
        if (route && (outside || pts.length <= 2 && Math.hypot(bx - ax, bz - az) > 18 || cropHit(world, pts))) pts = route(ax, az, bx, bz);
        const lens = [0]; for (let k = 1; k < pts.length; k++) lens.push(lens[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1])); const dur = lens[lens.length - 1] / speed;
        stay(t, start, at); segs.push({ k: 'walk', t0: start, t1: start + dur, pts, lens, dur, toSeat: !!poi.seat }); t = start + dur; at = poi; }
      else { stay(t, start, at); t = Math.max(t, start); }
    }
    stay(t, DAY + 1, at);
    if (p.cyclist) { let shift = 0; for (const s of segs) { s.t0 -= shift; s.t1 -= shift; if (s.k === 'walk') { const neu = s.dur / 1.85; shift += s.dur - neu; s.dur = neu; s.t1 = s.t0 + neu; s.k = 'cycle'; } } }
    p.segs = segs; p.initial = segs[0]; p.walkSpeed = speed; people.push(p);
  });
  // ---- seat geometry (tuned in QA): seated pose sits on the bench, facing away from its back
  function seatHeading(s) { return s.h !== undefined ? s.h : s.ry + (world.BENCH_FLIP ? Math.PI : 0); }
  function seatPos(s) { const h = seatHeading(s); return { x: s.x + Math.sin(h) * .22, z: s.z + Math.cos(h) * .22 }; }
  function approach(s) { const h = seatHeading(s); return { x: s.x + Math.sin(h) * 1.5, z: s.z + Math.cos(h) * 1.5 }; }

  function stateAt(p, st) {
    if (p.cyclist) { const hr = (st / DAY) * 24, start = 8 + (hash(p.id) % 8); if (hr >= start && hr < start + 2.5) { const q = lanePos((hr - start) / 2.5 + (hash(p.id) % 17) / 17); return { x: q.x, z: q.z, heading: q.heading, mode: 'cycle', place: 'street' }; } }
    const segs = p.segs; let s = segs[segs.length - 1];
    for (let i = 0; i < segs.length; i++) if (st < segs[i].t1) { s = segs[i]; break; }
    if (s.k === 'stay') return { x: s.x, z: s.z, heading: s.heading, mode: s.mode, place: s.place };
    const d = Math.min(s.dur, Math.max(0, st - s.t0)) * p.walkSpeed; let k = 1; while (k < s.lens.length - 1 && s.lens[k] < d) k++;
    const a = s.pts[k - 1], b = s.pts[k], seg = Math.max(.0001, s.lens[k] - s.lens[k - 1]), u = Math.min(1, Math.max(0, (d - s.lens[k - 1]) / seg));
    return { x: a[0] + (b[0] - a[0]) * u, z: a[1] + (b[1] - a[1]) * u, heading: Math.atan2(b[0] - a[0], b[1] - a[1]), mode: s.k === 'cycle' ? 'cycle' : 'walk', place: 'street' };
  }
  return { people, stateAt, seatHeading };
}
