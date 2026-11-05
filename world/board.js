// Two LED boards: a canvas on a frame of boxes. No new models. The town square one is large; the gate one is smaller.
export function createBoards(THREE, scene, spots) {
  const boards = spots.map((s) => make(THREE, scene, s));
  function setText(text) {
    for (const b of boards) paint(b, text);
  }
  function meshes() { return boards.map((b) => b.screen); }
  return { setText, meshes, count: boards.length, boards };
}
function make(THREE, scene, s) {
  const cv = document.createElement('canvas');
  cv.width = s.small ? 512 : 1024; cv.height = s.small ? 256 : 384;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), mat);
  screen.position.z = 0.06; screen.name = s.name;
  const g = new THREE.Group();
  g.name = s.name; g.position.set(s.x, s.y, s.z); g.rotation.y = s.ry || 0;
  g.add(screen);
  const frame = new THREE.MeshStandardMaterial({ color: 0x14181c, roughness: 0.45, metalness: 0.55 });
  const bar = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), frame); m.position.set(x, y, z); g.add(m); };
  const t = s.small ? 0.08 : 0.14;
  bar(s.w + t * 2, t, t, 0, s.h / 2 + t / 2, 0);
  bar(s.w + t * 2, t, t, 0, -s.h / 2 - t / 2, 0);
  bar(t, s.h, t, -s.w / 2 - t / 2, 0, 0);
  bar(t, s.h, t, s.w / 2 + t / 2, 0, 0);
  const drop = s.y - s.h / 2;
  bar(0.16, drop, 0.16, -s.w / 2, -s.h / 2 - drop / 2, 0);
  bar(0.16, drop, 0.16, s.w / 2, -s.h / 2 - drop / 2, 0);
  scene.add(g);
  const b = { cv, tex, ctx: cv.getContext('2d'), screen, g, w: s.w, h: s.h, small: !!s.small };
  paint(b, 'Sansar');
  return b;
}
function paint(b, text) {
  const g = b.ctx, w = b.cv.width, h = b.cv.height;
  g.fillStyle = '#07140e'; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(80,180,90,0.16)';
  for (let y = 8; y < h; y += 10) g.fillRect(0, y, w, 1);
  g.fillStyle = '#e6b15a'; g.font = '700 ' + (b.small ? 22 : 28) + 'px ui-monospace, Consolas, monospace';
  g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText('SANSAR', 18, 14);
  g.fillStyle = '#c8ff8a'; g.font = '700 ' + (b.small ? 28 : 42) + 'px ui-monospace, Consolas, monospace';
  const words = String(text || '').split(/\s+/), lines = []; let line = '';
  const max = w - 36;
  for (const word of words) {
    const next = line ? line + ' ' + word : word;
    if (g.measureText(next).width > max && line) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  const lh = b.small ? 36 : 52, top = b.small ? 52 : 70;
  lines.slice(0, 4).forEach((ln, i) => g.fillText(ln, 18, top + i * lh));
  b.tex.needsUpdate = true;
}

// Portrait boards for the richest resident: face, then a Top 3 slide, then the same tips the LED boards already cycle.
export function createRichBoards(THREE, scene, spots) {
  const boards = spots.map((s) => make(THREE, scene, { ...s, small: true, w: s.w, h: s.h }));
  const face = { img: null, name: '', worth: '', top: [], tips: [], i: 0 };
  function wrap(g, text, max, size) {
    g.font = '700 ' + size + 'px ui-sans-serif, Segoe UI, sans-serif';
    const words = String(text || '').split(/\s+/), lines = []; let line = '';
    for (const word of words) {
      const next = line ? line + ' ' + word : word;
      if (g.measureText(next).width > max && line) { lines.push(line); line = word; } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  }
  function paintOne(b) {
    const g = b.ctx, w = b.cv.width, h = b.cv.height, n = 2 + (face.tips.length || 0), slide = ((face.i % n) + n) % n;
    g.fillStyle = '#140e0c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f2b630'; g.font = '700 22px ui-sans-serif, Segoe UI, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'top';
    if (slide === 0) {
      const side = h - 28;
      if (face.img) g.drawImage(face.img, 14, 14, side, side);
      else { g.fillStyle = '#c4a574'; g.beginPath(); g.arc(14 + side / 2, 14 + side / 2, side * 0.32, 0, Math.PI * 2); g.fill(); }
      const x = side + 32;
      g.fillStyle = '#f2b630'; g.font = '700 20px ui-sans-serif, Segoe UI, sans-serif'; g.fillText('RICHEST IN SANSAR', x, 18);
      g.fillStyle = '#fff8ea'; g.font = '800 36px ui-sans-serif, Segoe UI, sans-serif';
      wrap(g, face.name || 'Sansar', w - x - 16, 36).slice(0, 2).forEach((ln, i) => g.fillText(ln, x, 52 + i * 40));
      g.fillStyle = '#c8ff8a'; g.font = '700 32px ui-sans-serif, Segoe UI, sans-serif'; g.fillText(face.worth || '', x, h - 58);
    } else if (slide === 1) {
      g.fillText('TOP 3', 24, 16);
      face.top.slice(0, 3).forEach((r, i) => {
        g.fillStyle = '#fff8ea'; g.font = '700 28px ui-sans-serif, Segoe UI, sans-serif';
        g.fillText((i + 1) + '. ' + r.name, 24, 58 + i * 62);
        g.fillStyle = '#c8ff8a'; g.font = '700 22px ui-sans-serif, Segoe UI, sans-serif';
        g.fillText(r.worth || '', 24, 90 + i * 62);
      });
    } else {
      g.fillText('SANSAR', 24, 16);
      g.fillStyle = '#fff8ea';
      wrap(g, face.tips[slide - 2] || '', w - 40, 32).slice(0, 4).forEach((ln, i) => g.fillText(ln, 24, 62 + i * 40));
    }
    b.tex.needsUpdate = true;
  }
  function paintAll() { for (const b of boards) paintOne(b); }
  function set(state) {
    if (!state) return;
    if (state.name != null) face.name = state.name;
    if (state.worth != null) face.worth = state.worth;
    if (state.top) face.top = state.top;
    if (state.tips) face.tips = state.tips;
    if (state.i != null) face.i = state.i;
    paintAll();
  }
  function setFace(img) { face.img = img; face.i = 0; paintAll(); }
  function next() { face.i++; paintAll(); }
  paintAll();
  return { set, setFace, next, count: boards.length, meshes() { return boards.map((b) => b.screen); }, boards };
}
