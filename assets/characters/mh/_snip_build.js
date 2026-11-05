    // which body vertices the clothes hide
    const cover = new Uint8Array(C.nv); ps.forEach((p, i) => { if (p.del && want[i][0] !== 'eye') for (const v of p.del) cover[v] = 1; });
    const Cc = D.colors, B = ps[0], tile = (look.ag === 3 ? 2 : 0) + (look.sk >= 9 ? 1 : 0), tone = lin(Cc.skin[look.sk][1]), mean = B.h.mean[tile];
    // swatches are saturated display colours: aim at their brightness (real albedo is lower for light tones) and only partly at their hue
    const alb = 1 - .5 * Math.sqrt(lum(tone)), ln = lum(tone) * alb / lum(mean), skc = tone.map((t, i) => Math.round(clamp((t * alb * .45 + mean[i] * ln * .55) / mean[i] * .5, 0, 1) * 255));
    const parts = want.slice(1).map((x, i) => [x[0], ps[i + 1]]), far = parts.filter(([c]) => c !== 'eye' && c !== 'lash');
    const A0 = assemble(look, P, C, cover, B, parts, tile, skc), A1 = assemble(look, P, C, cover, null, [['lod', lo[0]], ['eye', lo[1]], ...far], tile, skc);
    const mt = [M.skin[look.g], M.cloth, M.hair];
    mesh.geometry.dispose(); mesh.geometry = A0.geo; mesh.material = mt;
    lodMesh.geometry.dispose(); lodMesh.geometry = A1.geo; lodMesh.material = mt;
    for (const m of [mesh, lodMesh]) { m.boundingSphere.center.set(0, S.H * .5, 0); m.boundingSphere.radius = S.H * .8; }
    if (!lod.parent) root.add(lod);
    av.tris = A0.tris; av.trisLod = A1.tris; av.verts = A0.n; mesh.visible = true;
