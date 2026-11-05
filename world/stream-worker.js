/* Band per item box (x0, z0, x1, z1, high?), nearest point to the player. 0 high, 1 low, 2 impostor, 3 unloaded.
   A fifth value overrides the high distance for that item (the compact AIT keeps its buildings high campus-wide). */
let boxes = [], HB = 95, L = 300, I = 900;
self.onmessage = (ev) => {
  const m = ev.data;
  if (!m) return;
  if (m.t === 'init') { boxes = m.boxes || []; HB = m.HB || HB; L = m.L || L; I = m.I || I; return; }
  const x = m.x, z = m.z, modes = new Uint8Array(boxes.length);
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    const cx = Math.max(b[0], Math.min(x, b[2])), cz = Math.max(b[1], Math.min(z, b[3]));
    const d = Math.hypot(x - cx, z - cz);
    const hb = b[4] || HB;
    modes[i] = d < hb ? 0 : d < Math.max(L, hb) ? 1 : d < I ? 2 : 3;
  }
  self.postMessage({ modes }, [modes.buffer]);
};
