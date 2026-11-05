// Sansar redesign kit (17 Oct 2026), from the opus bake-off: world-space grime and ground variation (shader only, no bytes),
// leaf-card trees with bark trunks, horizon hill ridges. look.js applies the shaders; world.js and aitc.js plant the trees.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const V3 = THREE.Vector3;
const mulberry = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

const NOISE = (oct) => `
varying vec3 vWP;
float gh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float gn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(gh(i),gh(i+vec2(1,0)),f.x),mix(gh(i+vec2(0,1)),gh(i+vec2(1,1)),f.x),f.y);}
float gfbm(vec2 p){float s=0.,a=.5;for(int i=0;i<${oct};i++){s+=a*gn(p);p*=2.03;a*=.5;}return s;}
`;
const WP_VERT = (sh) => {
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
    .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
    { vec4 gwp = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
      gwp = instanceMatrix * gwp;
      #endif
      vWP = (modelMatrix * gwp).xyz; }`);
};

// Foliage, lamps and thin props that sit on the camera-to-character segment are stippled to about 0.25
// so a crown cannot paint the view black. Staying in the opaque pass keeps the depth of the rest of the tree.
const camShaders = [];
export function camFadeMat(mat) {
  if (!mat || mat.userData.camFade) return mat;
  mat.userData.camFade = 1;
  const prev = mat.onBeforeCompile;
  const prevKey = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : (() => '');
  mat.customProgramCacheKey = () => prevKey() + '|camfade';
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev.call(mat, sh, r);
    sh.uniforms.uCam = { value: new THREE.Vector3() };
    sh.uniforms.uHero = { value: new THREE.Vector3(0, 1.4, 0) };
    camShaders.push(sh);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCamW;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
      { vec4 gcw = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
        gcw = instanceMatrix * gcw;
        #endif
        vCamW = (modelMatrix * gcw).xyz; }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uCam;\nuniform vec3 uHero;\nvarying vec3 vCamW;')
      .replace('#include <alphatest_fragment>', `#include <alphatest_fragment>
      {
        vec3 ab = uHero - uCam; float d2 = dot(ab, ab);
        float t = d2 < 1e-6 ? 0.0 : clamp(dot(vCamW - uCam, ab) / d2, 0.0, 1.0);
        float d = length(vCamW - (uCam + ab * t));
        float cover = max(smoothstep(2.6, 0.85, length(vCamW - uCam)), smoothstep(2.8, 1.05, d));
        if (cover > 0.55) {
          float h = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
          if (h > 0.25) discard;
        }
      }`);
  };
  return mat;
}
export function camFadeTick(cam, hero) {
  for (const sh of camShaders) {
    sh.uniforms.uCam.value.set(cam.x, cam.y, cam.z);
    sh.uniforms.uHero.value.set(hero.x, hero.y, hero.z);
  }
}

// rising damp near the ground, vertical rain streaks, soft blotches. base = ground height in world y.
export function grime(mat, o = {}, touch = false) {
  const amt = o.amt ?? 1, base = o.base ?? 0.15, tint = o.tint ?? [0.62, 0.58, 0.52], streak = o.streak ?? 1, oct = touch ? 3 : 4;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev && prev.call(mat, sh, r);
    WP_VERT(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>' + NOISE(oct))
      .replace('#include <map_fragment>', `#include <map_fragment>
      {
        float side = vWP.x*0.9 + vWP.z*0.9;
        float h = vWP.y - ${base.toFixed(3)};
        float damp = smoothstep(1.1, 0.0, h) * (0.55 + 0.45*gfbm(vec2(side*1.3, h*2.0)));
        float st = smoothstep(0.55, 0.85, gn(vec2(side*7.0, h*0.35))) * smoothstep(0.35, 0.7, gfbm(vec2(side*0.7, h*0.15)));
        float blot = smoothstep(0.45, 0.8, gfbm(vec2(side*0.45, h*0.45) + 3.1));
        float g = clamp((damp*0.75 + st*0.45*${streak.toFixed(2)} + blot*0.28) * ${amt.toFixed(2)}, 0.0, 0.85);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*vec3(${tint.map((v) => v.toFixed(3)).join(',')}), g);
        diffuseColor.rgb *= 0.94 + 0.12*gfbm(vec2(side*0.21, h*0.21) + 7.0);
      }`);
  };
  const key = 'grime' + amt + base + streak + tint.join() + oct;
  mat.customProgramCacheKey = () => key + (mat.normalMap ? 'n' : '');
  return mat;
}

// big patches of dry and green so a lawn or field never reads as one flat colour
export function groundVary(mat, k = 1, touch = false) {
  const oct = touch ? 3 : 4;
  mat.onBeforeCompile = (sh) => {
    WP_VERT(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>' + NOISE(oct))
      .replace('#include <map_fragment>', `#include <map_fragment>
        float ga = gfbm(vWP.xz*0.025), gb = gfbm(vWP.xz*0.11 + 5.0), gc = gfbm(vWP.xz*0.006 + 11.0);
        #ifdef USE_MAP
        { vec2 ru = mat2(0.8, -0.6, 0.6, 0.8) * vMapUv * 0.37 + vec2(0.37, 0.71);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuse * texture2D(map, ru).rgb, 0.35 + 0.4*smoothstep(0.3, 0.7, gb)); }
        #endif
        diffuseColor.rgb *= mix(vec3(0.72,0.80,0.58), vec3(1.12,1.02,0.86), ga) * (0.85 + 0.3*gb);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*vec3(0.85,0.95,0.7), ${k.toFixed(2)}*smoothstep(0.55,0.8,gb));
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*vec3(1.18,1.04,0.78), smoothstep(0.5,0.75,gc)*0.6);`);
  };
  const key = 'gv' + k + oct;
  mat.customProgramCacheKey = () => key + (mat.normalMap ? 'n' : '');
  return mat;
}

function leafTexture(rnd, hue = 0) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  for (let k = 0; k < 13; k++) {
    const cx = 30 + rnd() * 196, cy = 30 + rnd() * 196, ang = rnd() * Math.PI * 2, len = 50 + rnd() * 35;
    x.strokeStyle = '#3b4a22'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len); x.stroke();
    for (let i = 0; i < 11; i++) for (const s of [-1, 1]) {
      const t = (i + 0.5) / 11, px = cx + Math.cos(ang) * len * t, py = cy + Math.sin(ang) * len * t, la = ang + s * 1.25;
      const g = 75 + rnd() * 50, r = 40 + rnd() * 35 + hue;
      x.fillStyle = `rgb(${r},${g + 20},${25 + rnd() * 20})`;
      x.save(); x.translate(px + Math.cos(la) * 5.5, py + Math.sin(la) * 5.5); x.rotate(la); x.beginPath(); x.ellipse(0, 0, 6, 2.7, 0, 0, Math.PI * 2); x.fill(); x.restore();
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function barkTexture(rnd) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 512; const x = c.getContext('2d');
  x.fillStyle = '#6e665c'; x.fillRect(0, 0, 128, 512);
  for (let i = 0; i < 1400; i++) { const v = 70 + rnd() * 70; x.fillStyle = `rgba(${v},${v - 6},${v - 14},0.5)`; x.fillRect(rnd() * 128, rnd() * 512, 1 + rnd() * 3, 6 + rnd() * 40); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 3); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// one template tree: tapered tube limbs + leaf cards whose normals point out of the crown (soft volume, no noisy card lighting)
function templateTree(rnd, o) {
  const tubes = [], tips = [], radial = o.radial ?? 6;
  function limb(p0, dir, len, r, depth) {
    const p1 = p0.clone().addScaledVector(dir, len);
    const mid = p0.clone().lerp(p1, 0.5).add(new V3((rnd() - 0.5) * len * 0.15, len * 0.06, (rnd() - 0.5) * len * 0.15));
    if (depth === 0) { tips.push(p1); return; }   // twigs sit inside the leaf shell: no geometry
    const curve = new THREE.CatmullRomCurve3([p0, mid, p1]);
    const g = new THREE.TubeGeometry(curve, 4, r, radial, false), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const ring = Math.floor(i / (radial + 1)) / 4, k = 1 - ring * 0.35, c = curve.getPoint(ring); p.setXYZ(i, c.x + (p.getX(i) - c.x) * k, c.y + (p.getY(i) - c.y) * k, c.z + (p.getZ(i) - c.z) * k); }
    g.deleteAttribute('normal'); g.computeVertexNormals(); tubes.push(g);
    const kids = depth > 1 ? 3 : 2;
    for (let i = 0; i < kids; i++) {
      const az = rnd() * Math.PI * 2 + i * 2.1;
      const nd = dir.clone().multiplyScalar(o.upright ?? 0.55).add(new V3(Math.cos(az), 0.25 + rnd() * 0.3, Math.sin(az))).normalize();
      if (depth <= 1) nd.y = Math.max(0.08, nd.y * (o.flat ?? 0.7));
      limb(p1, nd.normalize(), len * (0.6 + rnd() * 0.18), r * 0.6, depth - 1);
    }
  }
  limb(new V3(0, 0, 0), new V3((rnd() - 0.5) * 0.1, 1, (rnd() - 0.5) * 0.1).normalize(), o.trunk, o.r, o.depth ?? 3);
  const flare = new THREE.CylinderGeometry(o.r * 1.0, o.r * 1.7, 0.5, radial, 1, true); flare.translate(0, 0.2, 0);
  tubes.push(flare);
  const trunk = mergeGeometries(tubes.map((g) => { g.deleteAttribute('uv'); const t = g.index ? g.toNonIndexed() : g; return t; }), false);
  { const p = trunk.attributes.position, uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { uv[i * 2] = Math.atan2(p.getX(i), p.getZ(i)) / 6.283 * 2 + p.getX(i) * 0.3; uv[i * 2 + 1] = p.getY(i) * 0.5; } trunk.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); }
  // crown: cards on the outer shell of a lumpy ellipsoid plus clusters round the branch tips (an inner card is never seen but still costs fill)
  const cards = [], C = new V3(0, o.cy, 0), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new V3();
  const base = new THREE.PlaneGeometry(1, 1), lumps = [...Array(5)].map(() => [rnd() * 6.28, rnd() * 6.28, 0.12 + rnd() * 0.12]);
  for (let k = 0; k < o.cards; k++) {
    let p;
    if (k < tips.length * 4) { const tp = tips[k % tips.length]; p = tp.clone().add(new V3((rnd() - 0.5) * 1.4, (rnd() - 0.1) * 0.9, (rnd() - 0.5) * 1.4)); }
    else {
      const a = rnd() * Math.PI * 2, y = rnd() * 1.7 - 0.7, rr = Math.sqrt(Math.max(0, 1 - y * y));
      let bump = 1; for (const [la, lb, lh] of lumps) bump += lh * Math.cos(a * 2 + la) * Math.cos(y * 3 + lb);
      const sh = (0.8 + 0.2 * rnd()) * bump; p = new V3(Math.cos(a) * rr * o.rx * sh, o.cy + y * o.ry * sh * (y < 0 ? 0.65 : 1), Math.sin(a) * rr * o.rx * sh);
    }
    e.set(rnd() * 6.28, rnd() * 6.28, rnd() * 6.28); q.setFromEuler(e); const s = o.card * (0.7 + rnd() * 0.6); sc.set(s, s, s);
    const g = base.clone(); m4.compose(p, q, sc); g.applyMatrix4(m4);
    const n = p.clone().sub(C); n.y = n.y * 1.4 + 0.6; n.normalize();
    const na = g.attributes.normal; for (let i = 0; i < na.count; i++) na.setXYZ(i, n.x, n.y, n.z);
    const shade = 0.55 + 0.45 * Math.min(1, Math.max(0, (p.y - (o.cy - o.ry)) / (2 * o.ry))) + (rnd() - 0.5) * 0.15;
    const col = new Float32Array(na.count * 3); for (let i = 0; i < na.count; i++) { col[i * 3] = shade; col[i * 3 + 1] = shade; col[i * 3 + 2] = shade * 0.96; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    cards.push(g);
  }
  return { trunk, leaves: mergeGeometries(cards, false), h: o.cy + o.ry };
}

export const TREE_KINDS = {
  // town street tree (about 7 m), umbrella rain tree (AIT), tall upright roadside tree
  street: { trunk: 2.4, r: 0.2, depth: 3, cy: 5.0, rx: 2.9, ry: 2.0, cards: 230, card: 1.5, upright: 0.7 },
  rain: { trunk: 2.8, r: 0.32, depth: 3, cy: 6.4, rx: 6.0, ry: 2.0, cards: 420, card: 1.7, upright: 0.45, flat: 0.5 },
  tall: { trunk: 3.6, r: 0.22, depth: 3, cy: 7.0, rx: 2.5, ry: 2.9, cards: 230, card: 1.5, upright: 0.85 },
};

export function createTreeKit(touch = false) {
  const rnd = mulberry(11);
  const leafMap = leafTexture(rnd), bark = barkTexture(rnd);
  const leafMat = new THREE.MeshLambertMaterial({ map: leafMap, alphaTest: 0.45, side: THREE.DoubleSide, color: 0x9aad7c, vertexColors: true });
  // card normals point out of the crown; DoubleSide would flip them on back faces and the crown goes black
  leafMat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n#ifndef FLAT_SHADED\nnormal = normalize(vNormal);\n#endif'); };
  leafMat.customProgramCacheKey = () => 'leafshell';
  camFadeMat(leafMat);
  const barkMat = new THREE.MeshStandardMaterial({ map: bark, roughness: 0.95, color: 0xb5ab9e });
  const cache = {};
  function variant(kind, i) {
    const k = kind + i; if (cache[k]) return cache[k];
    const o = { ...TREE_KINDS[kind] }; if (touch) o.cards = Math.round(o.cards * 0.75);
    return (cache[k] = templateTree(mulberry(31 + i * 17 + kind.length * 3), o));
  }
  // list: [{x, y, z, s, ry, kind}] -> InstancedMeshes added to parent. Returns the meshes.
  function plant(parent, list, opt = {}) {
    const out = [], groups = {};
    list.forEach((t, i) => { const k = (t.kind || opt.kind || 'street') + '|' + (i % 3); (groups[k] ||= []).push(t); });
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new V3(), col = new THREE.Color(), UP = new V3(0, 1, 0);
    const rr = mulberry(5);
    for (const [k, ts] of Object.entries(groups)) {
      const [kind, vi] = k.split('|'), v = variant(kind, +vi);
      const tr = new THREE.InstancedMesh(v.trunk, barkMat, ts.length), lf = new THREE.InstancedMesh(v.leaves, leafMat, ts.length);
      ts.forEach((t, i) => {
        const sc = t.s ?? 1; m4.compose(new V3(t.x, t.y ?? 0, t.z), q.setFromAxisAngle(UP, t.ry ?? rr() * 6.28), s.set(sc, sc * (0.92 + rr() * 0.16), sc));
        tr.setMatrixAt(i, m4); lf.setMatrixAt(i, m4);
        const l = 0.82 + rr() * 0.3; lf.setColorAt(i, col.setRGB(l * (0.9 + rr() * 0.14), l, l * (0.82 + rr() * 0.12)));
      });
      for (const im of [tr, lf]) { im.castShadow = opt.shadow ?? true; im.receiveShadow = true; im.computeBoundingSphere(); im.name = 'tree-' + kind; parent.add(im); out.push(im); }
    }
    return out;
  }
  // leaf-card hedge along a segment (x0,z0)-(x1,z1), about 1 m tall
  function hedge(parent, segs, opt = {}) {
    const per = opt.per ?? (touch ? 26 : 40), h = opt.h ?? 1.0, w = opt.w ?? 1.1, y0 = opt.y ?? 0.15;
    let n = 0; for (const [x0, z0, x1, z1] of segs) n += Math.ceil(Math.hypot(x1 - x0, z1 - z0) * per);
    const hedgeMat = camFadeMat(new THREE.MeshStandardMaterial({ map: leafMap, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9, envMapIntensity: 0.4, color: 0x7d9660 }));
    const card = new THREE.PlaneGeometry(0.5, 0.5), im = new THREE.InstancedMesh(card, hedgeMat, n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color(), rr = mulberry(9); let i = 0;
    for (const [x0, z0, x1, z1] of segs) {
      const L = Math.hypot(x1 - x0, z1 - z0), c = Math.ceil(L * per), nx = -(z1 - z0) / L, nz = (x1 - x0) / L;
      for (let k = 0; k < c; k++) {
        const t = rr(), off = (rr() - 0.5) * w, y = y0 + 0.1 + Math.pow(rr(), 0.7) * h;
        e.set(rr() * 6.28, rr() * 6.28, rr() * 6.28); q.setFromEuler(e);
        m4.compose(new V3(x0 + (x1 - x0) * t + nx * off, y, z0 + (z1 - z0) * t + nz * off), q, new V3(1, 1, 1)); im.setMatrixAt(i, m4);
        const l = 0.7 + 0.45 * (y - y0) / h; im.setColorAt(i, col.setRGB(l, l, l * 0.92)); i++;
      }
    }
    im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); parent.add(im); return im;
  }
  return { plant, hedge, leafMat, barkMat, leafMap };
}

// two hazy ridgelines far out (vertex colour, no fog), moved with the player. tint() darkens them at night.
export function createHills(scene) {
  const grp = new THREE.Group(); grp.name = 'hills';
  const mats = [];
  const ridge = (r, h0, h1, seed, col) => {
    const N = 360, pos = [], cols = [], idx = [], c = new THREE.Color(col), c2 = c.clone().multiplyScalar(0.78);
    const f = (t) => { let s = 0, a = 1, fr = 1; for (let i = 0; i < 5; i++) { s += a * Math.sin(t * fr * 3 + seed * (i + 1) * 1.7) * Math.cos(t * fr * 1.3 + seed * i); a *= 0.5; fr *= 2.1; } return s; };
    for (let i = 0; i <= N; i++) {
      const t = i / N * Math.PI * 2, h = h0 + (h1 - h0) * (0.5 + 0.5 * f(t)), x = Math.cos(t) * r, z = Math.sin(t) * r;
      pos.push(x, -20, z, x, h, z); cols.push(c2.r, c2.g, c2.b, c.r, c.g, c.b);
      if (i < N) { const b = i * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.setIndex(idx);
    const m = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: false, toneMapped: false, depthWrite: false });
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = -1.5 + mats.length * 0.1; grp.add(mesh); mats.push(m);
  };
  ridge(1450, 60, 170, 2.3, 0x9fadbb);
  ridge(1250, 25, 75, 5.1, 0x8e9e93);
  scene.add(grp);
  const day = new THREE.Color(1, 1, 1), night = new THREE.Color(0.08, 0.1, 0.16), dusk = new THREE.Color(1.0, 0.78, 0.66);
  return { grp, tint(f, warm) { for (const m of mats) m.color.copy(night).lerp(day, f).lerp(dusk, warm * 0.6); } };
}
