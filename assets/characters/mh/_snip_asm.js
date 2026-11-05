  // one skinned geometry: a body (B: the MakeHuman render mesh minus the skin clothes hide; or a 'lod' proxy part) plus fitted parts
  function assemble(look, P, C, cover, B, list, tile, skc) {
    const Cc = D.colors; let used = null, btri = [], nb = 0;
    if (B) {
      used = new Int32Array(B.n).fill(-1);
      for (let t = 0; t < B.idx.length; t += 3) { const a = B.idx[t], b = B.idx[t + 1], c = B.idx[t + 2]; if (cover[B.rv[a]] || cover[B.rv[b]] || cover[B.rv[c]]) continue; btri.push(a, b, c); used[a] = used[b] = used[c] = 0; }
      for (let i = 0; i < B.n; i++) if (used[i] === 0) used[i] = nb++;
    }
    let n = nb, nw = C.nv; for (const [, p] of list) n += p.n;
    const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), si = new Uint8Array(n * 4), sw = new Uint8Array(n * 4), col = new Uint8Array(n * 4), weld = new Uint32Array(n);
    const groups = [[], [], []];
    if (B) {
      const tr = B.h.tex[tile];
      for (let i = 0; i < B.n; i++) {
        const o = used[i]; if (o < 0) continue; const v = B.rv[i];
        pos[o * 3] = P[v * 3]; pos[o * 3 + 1] = P[v * 3 + 1]; pos[o * 3 + 2] = P[v * 3 + 2]; weld[o] = v;
        uv[o * 2] = tr[0] + B.uv[i * 2] / 65535 * (tr[2] - tr[0]); uv[o * 2 + 1] = tr[1] + B.uv[i * 2 + 1] / 65535 * (tr[3] - tr[1]);
        for (let k = 0; k < 4; k++) { si[o * 4 + k] = B.si[i * 4 + k]; sw[o * 4 + k] = B.sw[i * 4 + k]; }
        col[o * 4] = skc[0]; col[o * 4 + 1] = skc[1]; col[o * 4 + 2] = skc[2]; col[o * 4 + 3] = 0;
      }
      for (const t of btri) groups[0].push(used[t]);
    }
    // fitted parts
    const hair = lin(Cc.hair[look.hc][1]), tintOf = { top: look.tc, bot: look.bc, shoe: look.sc };
    let o = nb;
    for (const [cat, p] of list) {
      const h = p.h, ws = h.wsc || 16384;
      const s = [0, 1, 2].map((a) => { const [v1, v2, den] = h.scale[a]; return Math.abs(P[v1 * 3 + a] - P[v2 * 3 + a]) / den; });
      let ti = 0, c = [1, 1, 1], a = 0, cc = null;
      if (cat === 'lod') { ti = tile; cc = skc; }
      else if (cat === 'eye') { const e = EYEMAP[look.ey] || EYEMAP[0]; ti = e[0]; c = [e[1], e[1], e[1]]; }
      else if (cat === 'hair' || cat === 'brow') { const f = cat === 'brow' ? .75 : 1.05; c = hair.map((x) => x * f / .34); a = 1; }   // hair tiles are normalised to sRGB mean .62 (.34 linear) at build
      else if (cat === 'lash') { c = [.8, .8, .8]; }
      else { const t = tintOf[cat]; if (t) { const T = lin(CLOTH[t][1]), L = lum(h.mean) || .5; c = T.map((x) => x / L); a = 1; } }
      cc ||= c.map((x) => Math.round(clamp(x * .5, 0, 1) * 255)); const r = h.tex[ti] || h.tex[0], g = cat === 'lod' ? 0 : cat === 'hair' || cat === 'brow' || cat === 'lash' ? 2 : 1;
      for (let i = 0; i < p.n; i++) {
        const q = i * 3, vo = o + i; let x = 0, y = 0, z = 0;
        for (let k = 0; k < 3; k++) { const v = p.ref[q + k] * 3, wt = p.w[q + k] / ws; x += P[v] * wt; y += P[v + 1] * wt; z += P[v + 2] * wt; }
        pos[vo * 3] = x + p.off[q] * h.osc * s[0]; pos[vo * 3 + 1] = y + p.off[q + 1] * h.osc * s[1]; pos[vo * 3 + 2] = z + p.off[q + 2] * h.osc * s[2];
        uv[vo * 2] = r[0] + p.uv[i * 2] / 65535 * (r[2] - r[0]); uv[vo * 2 + 1] = r[1] + p.uv[i * 2 + 1] / 65535 * (r[3] - r[1]);
        for (let k = 0; k < 4; k++) { si[vo * 4 + k] = p.si[i * 4 + k]; sw[vo * 4 + k] = p.sw[i * 4 + k]; }
        col[vo * 4] = cc[0]; col[vo * 4 + 1] = cc[1]; col[vo * 4 + 2] = cc[2]; col[vo * 4 + 3] = a ? 255 : 0; weld[vo] = nw + p.weld[i];
      }
      let keep = null;
      if (cat === 'eye') keep = (v) => !(p.uv[v * 2] > 56000 && p.uv[v * 2 + 1] < 10500);   // the cornea shell (UVs on the white disc, bottom right) would hide the iris
      else if (cat === 'lod') keep = (v) => !cover[p.ref[v * 3]];                          // the proxy's skin under clothes
      if (keep) { for (let t = 0; t < p.idx.length; t += 3) if (keep(p.idx[t]) && keep(p.idx[t + 1]) && keep(p.idx[t + 2])) groups[g].push(o + p.idx[t], o + p.idx[t + 1], o + p.idx[t + 2]); }
      else for (let t = 0; t < p.idx.length; t++) groups[g].push(o + p.idx[t]);
      o += p.n; nw += h.nw;
    }
    // smooth normals per welded vertex (UV seams share one normal)
    const acc = new Float32Array(nw * 3), nrm = new Float32Array(n * 3);
    for (const G of groups) for (let t = 0; t < G.length; t += 3) {
      const a = G[t] * 3, b = G[t + 1] * 3, c = G[t + 2] * 3;
      const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const v of [G[t], G[t + 1], G[t + 2]]) { const w3 = weld[v] * 3; acc[w3] += nx; acc[w3 + 1] += ny; acc[w3 + 2] += nz; }
    }
    for (let i = 0; i < n; i++) { const w3 = weld[i] * 3, x = acc[w3], y = acc[w3 + 1], z = acc[w3 + 2], l = Math.hypot(x, y, z) || 1; nrm[i * 3] = x / l; nrm[i * 3 + 1] = y / l; nrm[i * 3 + 2] = z / l; }
    const idx = new (n > 65535 ? Uint32Array : Uint16Array)(groups[0].length + groups[1].length + groups[2].length);
    const geo = new THREE.BufferGeometry(); let at = 0;
    groups.forEach((G, gi) => { idx.set(G, at); if (G.length) geo.addGroup(at, G.length, gi); at += G.length; });
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4, true)); geo.setAttribute('color', new THREE.BufferAttribute(col, 4, true));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    return { geo, n, tris: idx.length / 3 };
  }
