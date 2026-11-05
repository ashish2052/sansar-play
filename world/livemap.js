// One baked top-down canvas for the radar and the full map. North is -Z.
export function createLiveMap({ scene, THREE, world, rows, placeById, player, yaw, people, mapOpen, goPlace, toast, onArrive, holdArrive }) {
  const bound = world.bound;
  const bw = Math.max(1, bound.x1 - bound.x0), bh = Math.max(1, bound.z1 - bound.z0);
  const bakePpm = Math.min(2048 / bw, 2048 / bh);
  const cache = document.createElement('canvas');
  cache.width = Math.max(2, Math.ceil(bw * bakePpm));
  cache.height = Math.max(2, Math.ceil(bh * bakePpm));
  const box = world.campus && world.campus.box;
  const cmap = (world.campus && world.campus.map) || null;
  const AREA = { lawn: '#8cb063', isle: '#6e9f4c', apron: '#c9c4b8', pool: '#3aa0d8', water: '#3d7ea6' };
  // the campus gets its own sharper layer so the radar reads at the gate
  const detPpm = 4, det = box ? document.createElement('canvas') : null;
  if (det) { det.width = Math.ceil((box.x1 - box.x0) * detPpm); det.height = Math.ceil((box.z1 - box.z0) * detPpm); }
  paint(cache.getContext('2d'), bakePpm, bound);
  if (det) paint(det.getContext('2d'), detPpm, box);
  function paint(bg, ppm, B) {
  bg.setTransform(ppm, 0, 0, ppm, -B.x0 * ppm, -B.z0 * ppm);
  bg.fillStyle = '#7ea85c';
  bg.fillRect(B.x0, B.z0, B.x1 - B.x0, B.z1 - B.z0);
  if (cmap && cmap.fields) {
    for (const p of cmap.fields.plots) { const c = p[5]; bg.fillStyle = p[4] ? '#9b7d5a' : `rgb(${((c >> 16) & 255) * 0.78 | 0},${((c >> 8) & 255) * 0.74 | 0},${(c & 255) * 0.55 | 0})`; bg.fillRect(p[0], p[1], p[2] - p[0], p[3] - p[1]); }
    bg.strokeStyle = 'rgba(92,80,48,0.55)'; bg.lineWidth = 1.2;
    for (const p of cmap.fields.plots) bg.strokeRect(p[0], p[1], p[2] - p[0], p[3] - p[1]);
    bg.strokeStyle = '#a88a62'; bg.lineWidth = 3.6; bg.lineJoin = 'round';
    for (const t of cmap.fields.tracks) { bg.beginPath(); t.forEach((q, i) => i ? bg.lineTo(q[0], q[1]) : bg.moveTo(q[0], q[1])); bg.stroke(); }
  }
  if (box) { bg.fillStyle = cmap ? AREA.lawn : '#5f8f52'; bg.fillRect(box.x0, box.z0, box.x1 - box.x0, box.z1 - box.z0); }
  if (cmap) for (const a of cmap.areas) {
    if (a.k === 'lawn') continue;
    bg.fillStyle = AREA[a.k] || '#8cb063'; bg.beginPath(); a.p.forEach((q, i) => i ? bg.lineTo(q[0], q[1]) : bg.moveTo(q[0], q[1])); bg.closePath(); bg.fill();
  }
  if (cmap) { bg.strokeStyle = '#e4dccb'; bg.lineWidth = 2.4; bg.lineCap = 'round'; bg.lineJoin = 'round'; for (const p of cmap.paths) { bg.beginPath(); p.forEach((q, i) => i ? bg.lineTo(q[0], q[1]) : bg.moveTo(q[0], q[1])); bg.stroke(); } }
  const geo = world.mapGeo || {};
  if (geo.pave) { bg.fillStyle = '#cbb892'; bg.fillRect(geo.pave[0], geo.pave[1], geo.pave[2], geo.pave[3]); }
  if (geo.park) { bg.fillStyle = '#6ea35a'; bg.fillRect(geo.park[0], geo.park[1], geo.park[2], geo.park[3]); }
  if (geo.plaza) { bg.fillStyle = '#d7c4a2'; bg.fillRect(geo.plaza[0], geo.plaza[1], geo.plaza[2], geo.plaza[3]); }
  bg.fillStyle = '#3d7ea6';
  const lake = world.campus && world.campus.lake;
  if (lake) { bg.beginPath(); bg.arc(lake.x, lake.z, lake.r, 0, 6.2832); bg.fill(); }
  if (geo.pond) { bg.beginPath(); bg.arc(geo.pond[0], geo.pond[1], geo.pond[2], 0, 6.2832); bg.fill(); }
  if (geo.fountain) { bg.beginPath(); bg.arc(geo.fountain[0], geo.fountain[1], geo.fountain[2], 0, 6.2832); bg.fill(); }
  const waters = (world.campus && world.campus.waters) || [];
  for (const w of waters) {
    if (!w || w.length < 3) continue;
    bg.beginPath(); w.forEach((p, i) => i ? bg.lineTo(p[0], p[1]) : bg.moveTo(p[0], p[1])); bg.closePath(); bg.fill();
  }
  bg.strokeStyle = '#5c636a'; bg.lineCap = 'butt'; bg.lineJoin = 'round'; bg.lineWidth = 8;
  bg.beginPath();
  for (const r of geo.townRoads || []) {
    const [x, z, w, d] = r;
    if (w >= d) { bg.moveTo(x - w / 2, z); bg.lineTo(x + w / 2, z); }
    else { bg.moveTo(x, z - d / 2); bg.lineTo(x, z + d / 2); }
  }
  const hw = (world.highway && world.highway.segs) || [];
  if (hw.length > 1) { bg.moveTo(hw[0][0], hw[0][1]); for (let i = 1; i < hw.length; i++) bg.lineTo(hw[i][0], hw[i][1]); }
  bg.stroke();
  const roads = (world.campus && world.campus.roads) || [];
  bg.lineWidth = 6; bg.beginPath();
  for (const r of roads) {
    if (!r || r.length < 2) continue;
    bg.moveTo(r[0][0], r[0][1]);
    for (let i = 1; i < r.length; i++) bg.lineTo(r[i][0], r[i][1]);
  }
  bg.stroke();
  if (geo.sale) {
    bg.fillStyle = 'rgba(236,206,84,0.92)'; bg.strokeStyle = '#8a6a1c'; bg.lineWidth = 1.2;
    for (const [x, z] of geo.sale) { bg.fillRect(x - 6.6, z - 7.6, 13.2, 15.2); bg.strokeRect(x - 6.6, z - 7.6, 13.2, 15.2); }
  }
  bg.fillStyle = '#4a3428';
  for (const c of world.colliders || []) {
    if (c.t === 'box' && c.y1 >= 3) {
      const w = c.x1 - c.x0, d = c.z1 - c.z0;
      if (w > 90 || d > 90 || w < 0.4 || d < 0.4) continue;
      bg.fillRect(c.x0, c.z0, w, d);
    } else if (c.t === 'obb' && c.y1 >= 3 && c.hw < 45 && c.hd < 45) {
      // three's rotation.y turns x toward -z; the canvas (x right, z down) turns the other way
      bg.save(); bg.translate(c.cx, c.cz); bg.rotate(-(c.ry || 0)); bg.fillRect(-c.hw, -c.hd, c.hw * 2, c.hd * 2); bg.restore();
    }
  }
  if (box) { bg.strokeStyle = '#f2d48a'; bg.lineWidth = 2.2; bg.strokeRect(box.x0, box.z0, box.x1 - box.x0, box.z1 - box.z0); }
  }

  const graph = buildGraph(world);
  const radar = document.querySelector('#radar');
  const radarDist = document.querySelector('#radarDist');
  const cv = document.querySelector('#mapCv');
  const mapDist = document.querySelector('#mapDist');
  const card = document.querySelector('#mapCard');
  const goBtn = document.querySelector('#mapGo');
  let view = { cx: (bound.x0 + bound.x1) / 2, cz: (bound.z0 + bound.z1) / 2, ppm: 0.2 };
  let fitted = false, zoomMem = 0, wp = null, route = null, cardId = '', builtAt = 0;
  const mat = new THREE.MeshBasicMaterial({ color: 0x3ec6ff, fog: false });
  const marker = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.25, 8), mat);
  cone.rotation.x = Math.PI; cone.position.y = 4.2;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.1, 6), mat);
  pole.position.y = 2.15;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.95, 22), mat);
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.28;
  marker.add(cone, pole, ring); marker.visible = false; scene.add(marker);

  function icons() {
    const out = [];
    for (const row of rows()) {
      const p = spot(row[0]);
      if (p) out.push({ id: row[0], name: row[1], icon: row[2], bg: row[3], x: p.x, z: p.z });
    }
    return out;
  }
  function spot(id) {
    if (id === 'uni') { const s = world.campus && world.campus.spawn; return s ? { x: s.x, z: s.z } : null; }
    const p = placeById(id); return p ? { x: p.x, z: p.z } : null;
  }
  function showCard(ic) {
    if (!card) return;
    card.hidden = false; cardId = ic.id;
    const ico = document.querySelector('#mapIco'); if (ico) { ico.textContent = ic.icon; ico.style.background = ic.bg; }
    const nm = document.querySelector('#mapNm'); if (nm) nm.textContent = ic.name;
    if (goBtn) goBtn.hidden = false;
  }
  function hideCard() { cardId = ''; if (card) card.hidden = true; }
  function fmt(m) { if (m >= 950) return (m / 1000).toFixed(1) + ' km'; return Math.round(m) + ' m'; }
  function remain() {
    const P = player(); if (!route || route.length < 2) return 0;
    let best = 1e9, at = 0, acc = 0;
    for (let i = 0; i < route.length - 1; i++) {
      const a = route[i], b = route[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1;
      let t = ((P.x - a[0]) * dx + (P.z - a[1]) * dz) / l2; t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(P.x - (a[0] + dx * t), P.z - (a[1] + dz * t));
      const along = acc + Math.sqrt(l2) * t;
      if (d < best) { best = d; at = along; }
      acc += Math.sqrt(l2);
    }
    return Math.max(0, acc - at);
  }
  function offRoute() {
    const P = player(); if (!route) return 0;
    let best = 1e9;
    for (let i = 0; i < route.length - 1; i++) {
      const a = route[i], b = route[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1;
      let t = ((P.x - a[0]) * dx + (P.z - a[1]) * dz) / l2; t = Math.max(0, Math.min(1, t));
      best = Math.min(best, Math.hypot(P.x - (a[0] + dx * t), P.z - (a[1] + dz * t)));
    }
    return best;
  }
  function paintDist() {
    const t = wp ? fmt(remain()) : '';
    if (radarDist) radarDist.textContent = t;
    if (mapDist) mapDist.textContent = t;
  }
  function clearWp() { wp = null; route = null; marker.visible = false; hideCard(); paintDist(); }
  function setWaypoint(x, z, id) {
    wp = { x, z, id: id || '' };
    marker.visible = true; marker.position.set(x, 0, z);
    const P = player();
    route = graph.route(P.x, P.z, x, z);
    builtAt = performance.now();
    paintDist();
    if (id) { const ic = icons().find((q) => q.id === id); if (ic) showCard(ic); else hideCard(); }
    else hideCard();
  }
  function blit(g, x0, z0, x1, z1) {
    const sx = (x0 - bound.x0) * bakePpm, sy = (z0 - bound.z0) * bakePpm;
    const sw = (x1 - x0) * bakePpm, sh = (z1 - z0) * bakePpm;
    if (sw < 1 || sh < 1) return;
    g.drawImage(cache, sx, sy, sw, sh, x0, z0, x1 - x0, z1 - z0);
    if (!det) return;
    const a0 = Math.max(x0, box.x0), b0 = Math.max(z0, box.z0), a1 = Math.min(x1, box.x1), b1 = Math.min(z1, box.z1);
    if (a1 - a0 < 0.5 || b1 - b0 < 0.5) return;
    g.drawImage(det, (a0 - box.x0) * detPpm, (b0 - box.z0) * detPpm, (a1 - a0) * detPpm, (b1 - b0) * detPpm, a0, b0, a1 - a0, b1 - b0);
  }
  function strokeRoute(g, width) {
    if (!route || route.length < 2) return;
    g.strokeStyle = '#3ec6ff'; g.lineWidth = width; g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath(); g.moveTo(route[0][0], route[0][1]);
    for (let i = 1; i < route.length; i++) g.lineTo(route[i][0], route[i][1]);
    g.stroke();
    const e = route[route.length - 1];
    g.fillStyle = '#ffb020'; g.beginPath(); g.arc(e[0], e[1], width * 1.3, 0, 6.2832); g.fill();
  }
  function drawRadar() {
    if (!radar) return;
    const size = radar.clientWidth || 128;
    const dpr = Math.min(2, devicePixelRatio || 1), px = Math.round(size * dpr);
    if (radar.width !== px) { radar.width = px; radar.height = px; }
    const g = radar.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, size, size);
    const cx = size / 2, cy = size / 2, rad = size / 2 - 1;
    const P = player(), yw = yaw(), range = 46, ppm = (rad - 6) / range;
    g.save();
    g.beginPath(); g.arc(cx, cy, rad, 0, 6.2832); g.clip();
    g.fillStyle = '#6a8f4a'; g.fillRect(0, 0, size, size);
    g.save();
    g.translate(cx, cy);
    g.transform(Math.cos(yw) * ppm, Math.sin(yw) * ppm, -Math.sin(yw) * ppm, Math.cos(yw) * ppm, 0, 0);
    g.translate(-P.x, -P.z);
    const pad = range * 1.45;
    blit(g, P.x - pad, P.z - pad, P.x + pad, P.z + pad);
    strokeRoute(g, 2.3);
    g.restore();
    g.fillStyle = '#e7f4ff';
    for (const p of people()) {
      if (Math.hypot(p.x - P.x, p.z - P.z) > range) continue;
      const s = screenOf(p.x, p.z, P, yw, ppm, cx, cy);
      g.beginPath(); g.arc(s[0], s[1], 3.1, 0, 6.2832); g.fill();
    }
    g.font = '700 11px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const ic of icons()) {
      if (Math.hypot(ic.x - P.x, ic.z - P.z) > range) continue;
      const s = screenOf(ic.x, ic.z, P, yw, ppm, cx, cy);
      if (Math.hypot(s[0] - cx, s[1] - cy) > rad - 8) continue;
      g.fillStyle = '#f2b630'; g.beginPath(); g.arc(s[0], s[1], 7, 0, 6.2832); g.fill();
      g.fillStyle = '#1a120c'; g.fillText(ic.icon, s[0], s[1] + 0.5);
    }
    g.save(); g.translate(cx, cy); g.rotate(P.ry - yw - Math.PI);
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -10); g.lineTo(6.5, 8); g.lineTo(0, 4); g.lineTo(-6.5, 8); g.closePath(); g.fill();
    g.restore();
    g.restore();
    const nrx = Math.sin(yw), nrz = -Math.cos(yw);
    g.fillStyle = '#fff8ea'; g.font = '800 12px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('N', cx + nrx * (rad - 11), cy + nrz * (rad - 11));
  }
  function clampPpm(ppm, w, h) {
    const minP = w > 20 && h > 20 ? Math.min(w / bw, h / bh) * 0.9 : 0.05;
    return Math.max(minP, Math.min(14, ppm));
  }
  function fit() {
    if (!cv) return;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (w < 20 || h < 20) return;
    view.ppm = Math.min(w / bw, h / bh) * 0.9;
    zoomMem = view.ppm;
    view.cx = (bound.x0 + bound.x1) / 2; view.cz = (bound.z0 + bound.z1) / 2;
    fitted = true;
  }
  // First open is the player at street level (~300 m across). Pinch and wheel zoom out; the session keeps that zoom.
  function streetLevel() {
    if (!cv) return;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (w < 20 || h < 20) return;
    const P = player();
    if (!zoomMem) zoomMem = w / 300;
    view.ppm = clampPpm(zoomMem, w, h);
    zoomMem = view.ppm;
    view.cx = P.x; view.cz = P.z;
    fitted = true;
  }
  function zoom(x, z, ppm) {
    if (!cv) return;
    const w = cv.clientWidth, h = cv.clientHeight;
    view.ppm = clampPpm(ppm, w, h);
    zoomMem = view.ppm;
    view.cx = x; view.cz = z; fitted = true;
  }
  function drawFull() {
    if (!cv) return;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (w < 20 || h < 20) return;
    if (!fitted) streetLevel();
    if (!fitted) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    g.imageSmoothingEnabled = view.ppm < 2.5;
    const x0 = view.cx - (w / 2) / view.ppm, z0 = view.cz - (h / 2) / view.ppm;
    const x1 = view.cx + (w / 2) / view.ppm, z1 = view.cz + (h / 2) / view.ppm;
    g.save();
    g.translate(w / 2, h / 2); g.scale(view.ppm, view.ppm); g.translate(-view.cx, -view.cz);
    blit(g, x0, z0, x1, z1);
    strokeRoute(g, Math.max(1.6, 3.2 / view.ppm));
    g.restore();
    const list = icons();
    const taken = [];
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '700 12px system-ui,sans-serif';
    for (const ic of list) {
      const sx = w / 2 + (ic.x - view.cx) * view.ppm, sy = h / 2 + (ic.z - view.cz) * view.ppm;
      if (sx < -20 || sy < -20 || sx > w + 20 || sy > h + 20) continue;
      g.fillStyle = '#f2b630'; g.beginPath(); g.arc(sx, sy, 9, 0, 6.2832); g.fill();
      g.fillStyle = '#1a120c'; g.font = '13px system-ui,sans-serif'; g.fillText(ic.icon, sx, sy + 0.5);
      const label = ic.name, tw = g.measureText(label).width;
      const bx = sx - tw / 2 - 3, by = sy + 12;
      let ok = true;
      for (const o of taken) if (bx < o.x + o.w && bx + tw + 6 > o.x && by < o.y + o.h && by + 14 > o.y) { ok = false; break; }
      if (!ok) continue;
      taken.push({ x: bx, y: by, w: tw + 6, h: 14 });
      g.fillStyle = '#1a120c'; g.font = '700 12px system-ui,sans-serif'; g.fillText(label, sx, sy + 22);
    }
    if (world.homes && world.homes.labels) {
      g.font = '700 12px system-ui,sans-serif'; g.fillStyle = '#24180f'; g.textAlign = 'center';
      for (const lb of world.homes.labels) {
        const sx = w / 2 + (lb.x - view.cx) * view.ppm, sy = h / 2 + (lb.z - view.cz) * view.ppm;
        if (sx < -30 || sy < -12 || sx > w + 30 || sy > h + 12) continue;
        g.fillText(lb.name, sx, sy);
      }
    }
    const P = player();
    const px = w / 2 + (P.x - view.cx) * view.ppm, py = h / 2 + (P.z - view.cz) * view.ppm;
    g.save(); g.translate(px, py); g.rotate(Math.atan2(Math.sin(P.ry), -Math.cos(P.ry)));
    g.fillStyle = '#fff'; g.strokeStyle = '#1a120c'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -12); g.lineTo(7, 9); g.lineTo(0, 4); g.lineTo(-7, 9); g.closePath(); g.fill(); g.stroke();
    g.restore();
    g.fillStyle = '#fff8ea'; g.font = '800 13px system-ui,sans-serif'; g.fillText('N', w / 2, 16);
  }
  function tick() {
    if (wp) {
      cone.position.y = 4.15 + Math.sin(performance.now() / 280) * 0.28;
      const P = player();
      const near = Math.hypot(P.x - wp.x, P.z - wp.z) < (wp.id ? 8 : 5);
      const held = holdArrive && holdArrive();
      if (near && !held) { const id = wp.id; clearWp(); if (onArrive) onArrive(id); else toast('You have arrived.'); }
      else if (performance.now() - builtAt > 900 && offRoute() > 26) {
        route = graph.route(P.x, P.z, wp.x, wp.z); builtAt = performance.now();
      }
      paintDist();
    }
    if (mapOpen()) drawFull();
    else drawRadar();
  }
  function localPoint(e) {
    const r = cv.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    return { mx, my, wx: view.cx + (mx - r.width / 2) / view.ppm, wz: view.cz + (my - r.height / 2) / view.ppm, w: r.width, h: r.height };
  }
  function onTap(e) {
    const p = localPoint(e);
    let best = null, bd = 22;
    for (const ic of icons()) {
      const sx = p.w / 2 + (ic.x - view.cx) * view.ppm, sy = p.h / 2 + (ic.z - view.cz) * view.ppm;
      const d = Math.hypot(sx - p.mx, sy - p.my);
      if (d < bd) { bd = d; best = ic; }
    }
    if (best) setWaypoint(best.x, best.z, best.id);
    else setWaypoint(p.wx, p.wz, '');
  }
  const pts = new Map();
  let drag = null, pinch = null;
  if (cv) {
    cv.addEventListener('pointerdown', (e) => {
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointers */ }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size >= 2) {
        const [a, b] = [...pts.values()];
        pinch = { d: Math.max(8, Math.hypot(a.x - b.x, a.y - b.y)), ppm: view.ppm, cx: view.cx, cz: view.cz, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
        drag = null;
      } else drag = { x: e.clientX, y: e.clientY, cx: view.cx, cz: view.cz, moved: false };
    });
    cv.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      const prev = pts.get(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size >= 2 && pinch) {
        const [a, b] = [...pts.values()];
        const d = Math.max(8, Math.hypot(a.x - b.x, a.y - b.y));
        const r = cv.getBoundingClientRect();
        const mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top;
        const anchor = localAt(pinch.mx - r.left, pinch.my - r.top, pinch);
        const ppm = clampPpm(pinch.ppm * (d / pinch.d), r.width, r.height);
        view.ppm = ppm; zoomMem = ppm;
        view.cx = anchor.wx - (mx - r.width / 2) / ppm;
        view.cz = anchor.wz - (my - r.height / 2) / ppm;
        fitted = true;
      } else if (drag && pts.size === 1) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (dx * dx + dy * dy > 36) drag.moved = true;
        view.cx = drag.cx - dx / view.ppm; view.cz = drag.cz - dy / view.ppm; fitted = true;
      }
      prev.x = e.clientX;
    });
    const end = (e) => {
      const was = drag;
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (pts.size === 0) { if (was && !was.moved) onTap(e); drag = null; }
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); pinch = null; drag = null; });
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      const p = localPoint(e);
      const factor = Math.exp(-e.deltaY * 0.0011);
      const w = cv.clientWidth, h = cv.clientHeight;
      const ppm = clampPpm(view.ppm * factor, w, h);
      view.cx = p.wx - (p.mx - p.w / 2) / ppm;
      view.cz = p.wz - (p.my - p.h / 2) / ppm;
      view.ppm = ppm; zoomMem = ppm; fitted = true;
    }, { passive: false });
  }
  if (goBtn) goBtn.addEventListener('click', () => { if (cardId) goPlace(cardId); });
  function opened() {
    fitted = false;
    if (wp && wp.id) { const ic = icons().find((q) => q.id === wp.id); if (ic) showCard(ic); }
    streetLevel();
  }
  return {
    tick, fit, zoom, setWaypoint, clear: clearWp, opened, hideCard, route: graph.route, onPath: graph.onPath,
    view: () => ({ cx: view.cx, cz: view.cz, ppm: view.ppm }),
    info: () => ({
      on: !!wp, x: wp ? wp.x : null, z: wp ? wp.z : null, id: wp ? wp.id : '',
      metres: wp ? Math.round(remain()) : 0,
      bend: route && route.length ? Math.max(...route.map((p) => p[0])) : 0,
      pts: route ? route.length : 0, marker: marker.visible, nodes: graph.nodes, card: cardId
    })
  };
}

function screenOf(x, z, P, yw, ppm, cx, cy) {
  const dx = x - P.x, dz = z - P.z;
  return [cx + (dx * Math.cos(yw) - dz * Math.sin(yw)) * ppm, cy + (dx * Math.sin(yw) + dz * Math.cos(yw)) * ppm];
}
function localAt(mx, my, pinch) {
  const r = document.querySelector('#mapCv').getBoundingClientRect();
  return { wx: pinch.cx + (mx - r.width / 2) / pinch.ppm, wz: pinch.cz + (my - r.height / 2) / pinch.ppm };
}
function thin(pts, step) {
  if (!pts || pts.length < 2) return pts || [];
  const out = [pts[0]]; let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc >= step || i === pts.length - 1) { out.push(pts[i]); acc = 0; }
  }
  return out;
}
function cropBoxes(world) {
  const out = [];
  const crops = world.crops && world.crops.plots;
  if (crops) for (const p of crops) out.push([p.x0, p.z0, p.x1, p.z1]);
  const extra = world.campus && world.campus.map && world.campus.map.fields && world.campus.map.fields.plots;
  if (extra) for (const p of extra) if (p && p.length >= 4) out.push([p[0], p[1], p[2], p[3]]);
  return out;
}
function buildGraph(world) {
  const nodes = [], edges = [], cell = 24, buckets = new Map(), plots = cropBoxes(world);
  function crosses(ax, az, bx, bz) {
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 2));
    for (let i = 1; i < n; i++) {
      const x = ax + (bx - ax) * i / n, z = az + (bz - az) * i / n;
      for (const p of plots) if (x > p[0] + 0.5 && x < p[2] - 0.5 && z > p[1] + 0.5 && z < p[3] - 0.5) return true;
    }
    return false;
  }
  function add(x, z) {
    const gx = Math.floor(x / cell), gz = Math.floor(z / cell);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const b = buckets.get((gx + dx) + '_' + (gz + dz));
      if (!b) continue;
      for (const i of b) if (Math.hypot(nodes[i][0] - x, nodes[i][1] - z) < 8) return i;
    }
    const i = nodes.length; nodes.push([x, z]);
    const k = gx + '_' + gz; let b = buckets.get(k); if (!b) buckets.set(k, b = []); b.push(i); return i;
  }
  function link(a, b, keep) {
    if (a === b) return;
    const w = Math.hypot(nodes[a][0] - nodes[b][0], nodes[a][1] - nodes[b][1]);
    if (w < 0.2) return;
    if (!keep && crosses(nodes[a][0], nodes[a][1], nodes[b][0], nodes[b][1])) return;
    edges.push([a, b, w]);
  }
  function chain(pts) {
    const t = thin(pts, 18); if (t.length < 2) return;
    let p = add(t[0][0], t[0][1]);
    for (let i = 1; i < t.length; i++) { const n = add(t[i][0], t[i][1]); link(p, n, true); p = n; }
  }
  const geo = world.mapGeo || {};
  for (const r of geo.townRoads || []) {
    const [x, z, w, d] = r;
    if (w >= d) chain([[x - w / 2, z], [x, z], [x + w / 2, z]]);
    else chain([[x, z - d / 2], [x, z], [x, z + d / 2]]);
  }
  if (world.highway && world.highway.segs) chain(world.highway.segs);
  for (const r of (world.campus && world.campus.roads) || []) chain(r);
  for (const t of (world.crops && world.crops.map && world.crops.map.tracks) || []) chain(t);
  for (const t of (world.campus && world.campus.map && world.campus.map.paths) || []) chain(t);
  for (let i = 0; i < nodes.length; i++) {
    const gx = Math.floor(nodes[i][0] / cell), gz = Math.floor(nodes[i][1] / cell);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const b = buckets.get((gx + dx) + '_' + (gz + dz)); if (!b) continue;
      for (const j of b) {
        if (j <= i) continue;
        const d = Math.hypot(nodes[i][0] - nodes[j][0], nodes[i][1] - nodes[j][1]);
        if (d < 14) link(i, j);
      }
    }
  }
  const adj = nodes.map(() => []);
  for (const [a, b, w] of edges) { adj[a].push([b, w]); adj[b].push([a, w]); }
  const segs = edges.map(([a, b]) => [a, b]);
  function snap(x, z) {
    let best = null;
    for (let i = 0; i < segs.length; i++) {
      const a = nodes[segs[i][0]], b = nodes[segs[i][1]];
      const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1;
      let t = ((x - a[0]) * dx + (z - a[1]) * dz) / l2; t = Math.max(0, Math.min(1, t));
      const px = a[0] + dx * t, pz = a[1] + dz * t, d = Math.hypot(px - x, pz - z);
      if (!best || d < best.d) best = { d, x: px, z: pz, a: segs[i][0], b: segs[i][1], da: Math.hypot(px - a[0], pz - a[1]), db: Math.hypot(px - b[0], pz - b[1]) };
    }
    return best;
  }
  function route(x0, z0, x1, z1) {
    const s = snap(x0, z0), t = snap(x1, z1);
    if (!s || !t) return [[x0, z0], [x1, z1]];
    const n = nodes.length, dist = new Float64Array(n); dist.fill(1e18);
    const prev = new Int32Array(n); prev.fill(-1);
    const heap = [];
    const push = (d, i) => { heap.push([d, i]); let k = heap.length - 1; while (k) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (!heap.length) return top; heap[0] = last; let i = 0; for (;;) { let l = i * 2 + 1, r = l + 1, m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[i], heap[m]] = [heap[m], heap[i]]; i = m; } return top; };
    const seed = (i, d) => { if (d < dist[i]) { dist[i] = d; prev[i] = -1; push(d, i); } };
    seed(s.a, s.da); seed(s.b, s.db);
    while (heap.length) {
      const [d, i] = pop(); if (d !== dist[i]) continue;
      for (const [j, w] of adj[i]) if (d + w < dist[j]) { dist[j] = d + w; prev[j] = i; push(dist[j], j); }
    }
    const goal = (dist[t.a] + t.da <= dist[t.b] + t.db) ? t.a : t.b;
    const mid = []; let c = goal, guard = 0;
    if (dist[goal] < 1e17) while (c !== -1 && guard++ < n + 2) { mid.push(nodes[c]); c = prev[c]; }
    mid.reverse();
    const out = [[x0, z0], [s.x, s.z]];
    for (const p of mid) {
      const last = out[out.length - 1];
      if (Math.hypot(last[0] - p[0], last[1] - p[1]) > 0.4) out.push(p);
    }
    const last = out[out.length - 1];
    if (Math.hypot(last[0] - t.x, last[1] - t.z) > 0.4) out.push([t.x, t.z]);
    out.push([x1, z1]);
    const hop = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]) > 36 && crosses(a[0], a[1], b[0], b[1]);
    if (out.length >= 3 && hop(out[0], out[1])) out.shift();
    if (out.length >= 3 && hop(out[out.length - 2], out[out.length - 1])) out.pop();
    return out;
  }
  function onPath(x, z, pad) {
    const lim = pad == null ? 5 : pad;
    let best = 1e9;
    for (let i = 0; i < segs.length; i++) {
      const a = nodes[segs[i][0]], b = nodes[segs[i][1]];
      const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1;
      let t = ((x - a[0]) * dx + (z - a[1]) * dz) / l2; t = Math.max(0, Math.min(1, t));
      best = Math.min(best, Math.hypot(x - (a[0] + dx * t), z - (a[1] + dz * t)));
    }
    return best <= lim;
  }
  return { route, onPath, nodes: nodes.length };
}
