// Sansar avatars (18 Oct 2026): realistic MakeHuman (CC0) people driven by the Quaternius skeleton and clips.
// A body is the MakeHuman base mesh plus shape deltas (heritage, age, build, face). Clothes, hair, brows, lashes and eyes are fitted to that body at
// runtime from their MakeHuman bindings (assets/characters/mh/build_chars.py), then re-skinned onto the Quaternius bone names, so every clip and pose keeps working.
// One SkinnedMesh per person with three material groups (skin, cloth, hair) on shared atlases. Character data streams after the first tap/key (or 30 s).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const AVB = '/assets/av/', MHB = '/assets/mh/', V0 = '?v=4', V = '?v=mh5';
const san = (n) => THREE.PropertyBinding.sanitizeNodeName(n);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const CLOTH = [['Original', ''], ['White', '#f1efe9'], ['Charcoal', '#33363b'], ['Navy', '#223a63'], ['Burgundy', '#762b3a'], ['Olive', '#4d5a38'], ['Sand', '#c7a97a'],
  ['Teal', '#2a7f78'], ['Mustard', '#d3a02b'], ['Crimson', '#b3303a'], ['Sky', '#5a8fc9'], ['Rust', '#a85a2a'], ['Plum', '#6c3f78'], ['Pink', '#e79ab5'], ['Forest', '#2f6b45']];
export const AGES = [['Child', 0], ['Teen', 1], ['Adult', 2], ['Elder', 3]];
export const BUILDS = ['Slim', 'Average', 'Broad'];
export const HERITAGE = ['South Asian', 'East Asian', 'African', 'European', 'Mixed'];
export const FACES = ['Soft', 'Heart', 'Round', 'Long', 'Defined'];
const HRANGE = [[100, 145], [140, 182], [145, 200], [143, 190]], HDEF = [[118, 118], [160, 168], [166, 176], [160, 170]];   // cm per age; default (f, m)
const D = { ready: null, fam: {}, parts: new Map(), core: {}, open: false };
const LUT = new Float32Array(256).map((_, i) => { const c = i / 255; return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); });
const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };   // THREE.Color from hex is already linear
const lum = (c) => c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
export const material = null;

// ---------------------------------------------------------------- gate: nothing heavy loads before the first tap or key (or 30 s)
let openGate; const gate = new Promise((r) => { openGate = r; });
function armGate() {
  if (D.armed) return; D.armed = true; const EV = ['pointerdown', 'keydown', 'touchstart'];
  const go = () => { for (const e of EV) removeEventListener(e, go, true); D.open = true; openGate(); };
  for (const e of EV) addEventListener(e, go, true); setTimeout(go, 30000);
}
export function eager() { D.open = true; openGate(); }

export function init(manager) {
  return D.ready ||= (async () => {
    armGate();
    const j = (u) => fetch(u).then((r) => r.json());
    const [index, colors] = await Promise.all([j(MHB + 'index.json' + V), j(AVB + 'colors.json' + V0)]);
    for (const g of ['f', 'm']) index[g].head = index[g].hair;
    D.index = index; D.colors = colors; D.loader = new GLTFLoader(manager);
    return D;
  })();
}
export const info = () => D;
export const partIndex = (g, cat, label) => Math.max(0, D.index[g][cat === 'head' ? 'hair' : cat].findIndex((p) => p.label === label));

// ---------------------------------------------------------------- binary readers
function reader(buf) {
  const hl = new DataView(buf).getUint32(0, true), h = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hl))); let o = 4 + hl;
  const take = (T, n) => { const bytes = n * T.BYTES_PER_ELEMENT, a = new T(buf, o, n); o += bytes + ((4 - bytes % 4) % 4); return a; };
  return { h, i16: (n) => take(Int16Array, n), u16: (n) => take(Uint16Array, n), u8: (n) => take(Uint8Array, n), f32: (n) => take(Float32Array, n) };
}
const bin = (file) => fetch(MHB + file + V).then((r) => { if (!r.ok) throw new Error(file + ' ' + r.status); return r.arrayBuffer(); });
function core(g, full) {
  const key = full ? g : g + ':lo';
  const file = full ? D.index[g].core : D.index[g].core.replace('.bin', '_lo.bin');
  return D.core[key] ||= bin(file).then((buf) => {
    const R = reader(buf), h = R.h, P0 = new Float32Array(h.nv * 3), q = R.i16(h.nv * 3);
    for (let i = 0; i < q.length; i++) P0[i] = q[i] / 16384;
    const J0 = Float32Array.from(R.f32(h.nj * 3)), deltas = h.deltas.map((d) => ({ name: d.name, n: d.n, sc: d.sc, idx: R.u16(d.n), d: R.i16(d.n * 3), dj: R.f32(h.nj * 3) }));
    return { nv: h.nv, nb: h.nb, nj: h.nj, keep: new Set(h.keep), P0, J0, deltas };
  });
}
function part(file) {
  if (!D.parts.has(file)) D.parts.set(file, bin(file).then((buf) => {
    const R = reader(buf), h = R.h, n = h.n;
    if (h.kind === 'skin' && h.nw === undefined) return { h, n, rv: R.u16(n), uv: R.u16(n * 2), si: R.u8(n * 4), sw: R.u8(n * 4), idx: R.u16(h.m) };
    const p = { h, n, ref: R.u16(n * 3), w: R.i16(n * 3), off: R.i16(n * 3), uv: R.u16(n * 2), weld: R.u16(n), si: R.u8(n * 4), sw: R.u8(n * 4), idx: R.u16(h.m), del: R.u16(h.nd) };
    if (h.np) { p.pi = R.u16(h.np); p.pw = R.u8(h.np); }       // scalp paint: body vertices tinted to the hair colour under the cards
    return p;
  }));
  return D.parts.get(file);
}

// ---------------------------------------------------------------- materials: shared atlases, vertex colour = tint (rgb x2) + "use texture luminance" (a)
const TL = new THREE.TextureLoader();
const loadTex = (f) => new Promise((res, rej) => TL.load(MHB + f + V, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = PHONE ? 1 : 4; res(t); }, undefined, rej));
function mk(map, roughness, extra, keep = 1) {             // keep < 1 squeezes texture luminance toward the tile mean (.34): light hair colours lose the black roots
  const m = new THREE.MeshStandardMaterial({ map, vertexColors: true, roughness, metalness: 0, ...extra });
  m.onBeforeCompile = (s) => {
    s.fragmentShader = s.fragmentShader.replace('#include <color_fragment>',
      `#ifdef USE_COLOR_ALPHA\n  vec3 tcol = vColor.rgb * 2.0; float tl = mix(.34, dot(diffuseColor.rgb, vec3(.2126, .7152, .0722)), ${keep.toFixed(2)});\n  diffuseColor.rgb = mix(diffuseColor.rgb * tcol, vec3(tl) * tcol, vColor.a);\n#endif`);
  };
  m.customProgramCacheKey = () => 'mhtint' + keep;
  return m;
}
const TINTFS = (keep) => `#ifdef USE_COLOR_ALPHA\n  vec3 tcol = vColor.rgb * 2.0; float tl = mix(.34, dot(diffuseColor.rgb, vec3(.2126, .7152, .0722)), ${keep.toFixed(2)});\n  diffuseColor.rgb = mix(diffuseColor.rgb * tcol, vec3(tl) * tcol, vColor.a);\n#endif`;
// hair cards: cut pass (alpha test, writes depth) + soft pass (blended strand edges, no depth write); a strand-aligned highlight
// (Kajiya-Kay) along the texture's v direction replaces the broad plastic sheen
function mkHair(map, soft) {
  const m = new THREE.MeshStandardMaterial({ map, vertexColors: true, roughness: .86, metalness: 0, side: THREE.DoubleSide, alphaTest: soft ? .04 : .5, transparent: soft, depthWrite: !soft, envMapIntensity: .2 });
  m.onBeforeCompile = (s) => {
    s.fragmentShader = s.fragmentShader.replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace(/normal \*= faceDirection;/g, ''))   // card backs keep the outward volume normal
      .replace('#include <color_fragment>', TINTFS(.6)).replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
  reflectedLight.directSpecular *= .3; reflectedLight.indirectSpecular *= .45;   // the broad GGX sheen turns black hair grey
#if NUM_DIR_LIGHTS > 0 && defined( USE_MAP )
  {
    vec3 px = dFdx(-vViewPosition), py = dFdy(-vViewPosition); vec2 ux = dFdx(vMapUv), uy = dFdy(vMapUv);
    vec3 T = py * ux.x - px * uy.x; T = normalize(T + 1e-6);
    vec3 V = normalize(vViewPosition);
    for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
      vec3 L = directionalLights[i].direction, H = normalize(L + V);
      float wrap = clamp(dot(normal, L) * .6 + .4, 0., 1.);
      float t1 = dot(T, H), t2 = dot(normalize(T + normal * .18), H);
      float k = .2 + clamp(dot(diffuseColor.rgb, vec3(.3, .6, .1)) * 4., 0., .8);   // dark hair gets a faint sheen, never a grey sheet
      float s1 = pow(sqrt(max(0., 1. - t1 * t1)), 120.) * .012 * k, s2 = pow(sqrt(max(0., 1. - t2 * t2)), 30.) * .05;
      reflectedLight.directSpecular += directionalLights[i].color * wrap * (s1 + s2 * diffuseColor.rgb * 1.6);
    }
  }
#endif`);
  };
  m.customProgramCacheKey = () => 'mhhair' + (soft ? 's' : 'c');
  return m;
}
// skin: tint with x4 headroom (light tones over the reddish MakeHuman tiles), pore-scale bump that fades with distance,
// a red-shifted wrap at the light terminator (cheap subsurface look) and a slightly glossier face than cloth
const SKIN_MUL = 4;
// measured-style face albedos (sRGB) for the 14 swatches: light European / East Asian, then Nepali and Indian browns (5-9), then African
const SKIN_ALBEDO = ['#DDB8A0', '#D8AE92', '#D2A584', '#CB9C78', '#C08E68', '#B8845E', '#A8724E', '#966444', '#845638', '#70482E', '#5E3C26', '#4E3220', '#40291A', '#342216'];
function mkSkin(map, roughness) {
  const m = new THREE.MeshStandardMaterial({ map, vertexColors: true, roughness, metalness: 0, envMapIntensity: .3 });
  m.onBeforeCompile = (s) => {
    if (PHONE) {
      s.fragmentShader = s.fragmentShader
        .replace('#include <color_fragment>', `#ifdef USE_COLOR_ALPHA\n  vec3 tcol = vColor.rgb * ${SKIN_MUL.toFixed(1)}; float tl = dot(diffuseColor.rgb, vec3(.2126, .7152, .0722));\n  diffuseColor.rgb = mix(diffuseColor.rgb * tcol, vec3(tl) * tcol, vColor.a);\n#endif`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n  roughnessFactor = mix(roughnessFactor, 1., vColor.a);`);
      return;
    }
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
float pHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float pNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(pHash(i), pHash(i + vec2(1, 0)), f.x), mix(pHash(i + vec2(0, 1)), pHash(i + vec2(1, 1)), f.x), f.y); }`)
      .replace('#include <color_fragment>', `#ifdef USE_COLOR_ALPHA
  vec3 tcol = vColor.rgb * ${SKIN_MUL.toFixed(1)}; float tl = dot(diffuseColor.rgb, vec3(.2126, .7152, .0722));
  diffuseColor.rgb = mix(diffuseColor.rgb * tcol, vec3(tl) * tcol, vColor.a);
#endif`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  roughnessFactor = mix(roughnessFactor, 1., vColor.a);   // painted scalp under the hair: no skin sheen along partings`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
#ifdef USE_MAP
  {
    vec2 q = vMapUv * 1100.; float fw = length(fwidth(q));
    float k = (1. - smoothstep(.3, .9, fw)) * 6e-5 * (1. - vColor.a);   // pore depth in metres
    if (k > 0.) {
      float hgt = pNoise(q) * .65 + pNoise(q * 2.7 + 9.1) * .35;
      vec2 dH = vec2(dFdx(hgt), dFdy(hgt)) * k;
      vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition), r1 = cross(sy, normal), r2 = cross(normal, sx);
      float det = dot(sx, r1); normal = normalize(abs(det) * normal - sign(det) * (dH.x * r1 + dH.y * r2));
    }
  }
#endif`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
#if NUM_DIR_LIGHTS > 0
  for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
    float nl = dot(normal, directionalLights[i].direction), w = clamp((nl + .45) / 1.45, 0., 1.);
    reflectedLight.directDiffuse += directionalLights[i].color * diffuseColor.rgb * vec3(1., .36, .22) * max(0., w * w - max(nl, 0.)) * .55 * (1. - vColor.a);
  }
#endif`);
  };
  m.customProgramCacheKey = () => (PHONE ? 'mhskinp' : 'mhskin');
  return m;
}
// eyes: matte iris under a wet clear coat, so every eye catches the light
function mkEye(map) {
  const m = new THREE.MeshPhysicalMaterial({ map, vertexColors: true, roughness: .45, metalness: 0, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 1.2 });
  m.onBeforeCompile = (s) => { s.fragmentShader = s.fragmentShader.replace('#include <color_fragment>', TINTFS(1)); };
  m.customProgramCacheKey = () => 'mheye';
  return m;
}
const PHONE = typeof matchMedia === 'function' && (matchMedia('(pointer: coarse)').matches || innerWidth < 700 || Math.min(screen.width, screen.height) < 600);
function mats() {
  return D.mats ||= (async () => {
    await gate;
    const [sf, sm, cl, hr] = await Promise.all(['skin_f_lo.webp', 'skin_m_lo.webp', 'cloth_lo.webp', 'hair_lo.webp'].map(loadTex));
    const M = { skin: { f: mkSkin(sf, .5), m: mkSkin(sm, .56) }, cloth: mk(cl, .86), hair: mkHair(hr, false), hairSoft: mkHair(hr, true), eye: mkEye(cl) };
    const sfx = PHONE ? '_md' : '';
    // the sharper atlas waits until the first frames are in, so it is not part of the first download
    setTimeout(function sharper() {
      if (window.__watch || document.body.classList.contains('riding') || document.body.classList.contains('sheeting')) { setTimeout(sharper, 800); return; }
      Promise.all([`skin_f${sfx}.webp`, `skin_m${sfx}.webp`, `cloth${sfx}.webp`, `hair${sfx}.webp`].map(loadTex)).then(([a, b, c, d]) => {
        const apply = () => {
          if (window.__watch || document.body.classList.contains('riding') || document.body.classList.contains('sheeting')) { setTimeout(apply, 800); return; }
          const old = [M.skin.f.map, M.skin.m.map, M.cloth.map, M.hair.map];
          M.skin.f.map = a; M.skin.m.map = b; M.cloth.map = c; M.eye.map = c; M.hair.map = d; M.hairSoft.map = d;
          for (const t of old) t.dispose();
          D.hi = true;
        };
        apply();
      }).catch((e) => console.warn('avatar textures', e));
    }, PHONE ? 8000 : 2000);
    return M;
  })();
}

// ---------------------------------------------------------------- family rig (Quaternius skeleton + clips), measured once
const MAIN = { Body: 'Hips', Hips: 'Abdomen', Abdomen: 'Torso', Torso: 'Chest', Chest: 'Neck', Neck: 'Head' };
for (const s of ['L', 'R']) {
  Object.assign(MAIN, { [`Shoulder.${s}`]: `UpperArm.${s}`, [`UpperArm.${s}`]: `LowerArm.${s}`, [`LowerArm.${s}`]: `Wrist.${s}`, [`Wrist.${s}`]: `Middle1.${s}`, [`UpperLeg.${s}`]: `LowerLeg.${s}`, [`LowerLeg.${s}`]: `Foot.${s}`, [`Thumb1.${s}`]: `Thumb2.${s}`, [`Thumb2.${s}`]: `Thumb3.${s}` });
  for (const f of ['Index', 'Middle', 'Ring', 'Pinky']) for (const k of [1, 2, 3]) MAIN[`${f}${k}.${s}`] = `${f}${k + 1}.${s}`;
}
const LIMB = /^(UpperArm|LowerArm|Wrist|Thumb|Index|Middle|Ring|Pinky|UpperLeg|LowerLeg)/;   // limbs follow the rig's directions (T-pose vs A-pose); trunk, collarbones and feet copy its rotation from rest
async function loadFam(g) {
  const [skel, gltf] = await Promise.all([fetch(AVB + `skel_${g}.json` + V0).then((r) => r.json()), D.loader.loadAsync(AVB + `rig_${g}.glb` + V0)]);
  const names = skel.bones.map(san), ix = Object.fromEntries(names.map((n, i) => [n, i]));
  const Wq = skel.ibm.map((a) => new THREE.Matrix4().fromArray(a).invert()), pq = [], Rq = [], _s = new THREE.Vector3();
  for (const m of Wq) { const p = new THREE.Vector3(), q = new THREE.Quaternion(); m.decompose(p, q, _s); pq.push(p); Rq.push(q); }
  const parent = names.map((n) => { const b = gltf.scene.getObjectByName(n); return b && b.parent ? (ix[b.parent.name] ?? -1) : -1; });
  const main = skel.bones.map((n) => (MAIN[n] ? ix[san(MAIN[n])] : -1));
  const F = { g, rig: gltf.scene, names, ix, Wq, pq, Rq, parent, main, clips: {} };
  const raw = Object.fromEntries(gltf.animations.map((c) => [c.name, c]));
  F.vWalk = stride(F, raw.Walk) * 1.1; F.vRun = stride(F, raw.Run) * 1.03;   // walk 1.1x and run 1.03x stride: directional foot slip ~0 (qa sweep)
  for (const c of gltf.animations) {
    c.tracks = c.tracks.filter((t) => !t.name.endsWith('.scale'));
    for (const t of c.tracks) {                                 // a flipped quaternion key makes the mixer spin that bone while the others stay put
      if (!t.name.endsWith('quaternion')) continue; const v = t.values; const n = (v.length / 4) | 0;
      for (let i = 1; i < n; i++) { const o = i * 4, p = o - 4, dot = v[p] * v[o] + v[p + 1] * v[o + 1] + v[p + 2] * v[o + 2] + v[p + 3] * v[o + 3]; if (dot < 0) { v[o] = -v[o]; v[o + 1] = -v[o + 1]; v[o + 2] = -v[o + 2]; v[o + 3] = -v[o + 3]; } }
    }
    // bone lengths now differ from the clips: keep rotations only; the hip bob plays on a stand-in node and is rescaled per body
    c.tracks = c.tracks.filter((t) => { if (!t.name.endsWith('.position')) return true; if (t.name === 'Body.position') { t.name = 'BodyQ.position'; return true; } return false; });
    F.clips[c.name] = c;
  }
  const I = (n) => ix[san(n)], rootInv = Wq[I('Root')].clone().invert();
  F.bodyRestQ = new THREE.Vector3().setFromMatrixPosition(rootInv.clone().multiply(Wq[I('Body')]));
  F.legQ = pq[I('UpperLeg.L')].distanceTo(pq[I('LowerLeg.L')]) + (pq[I('LowerLeg.L')].y - pq[I('Foot.L')].y - .053);
  return F;
}
const fam = (g) => D.fam[g] ||= loadFam(g);
// ground speed (m/s at scale 1) of a locomotion clip = how fast the planted foot slides backwards relative to the body
function stride(F, clip) {
  const root = SkeletonUtils.clone(F.rig), mx = new THREE.AnimationMixer(root), a = mx.clipAction(clip).play();
  const fl = root.getObjectByName(san('Foot.L')), fr = root.getObjectByName(san('Foot.R')), pt = root.getObjectByName(san('PT.L')), N = 60, dt = clip.duration / N, p = new THREE.Vector3();
  const Z = [[], []], Y = [[], []]; let fwd = 1;
  for (let i = 0; i <= N; i++) { a.time = clip.duration * i / N; mx.update(0); root.updateMatrixWorld(true);
    [fl, fr].forEach((b, k) => { b.getWorldPosition(p); Z[k].push(p.z); Y[k].push(p.y); }); if (i === 0) { pt.getWorldPosition(p); fwd = Math.sign(p.z - Z[0][0]) || 1; } }
  const v = []; for (let k = 0; k < 2; k++) { const ymin = Math.min(...Y[k]); for (let i = 0; i < N; i++) if (Y[k][i] < ymin + .05 && Y[k][i + 1] < ymin + .05) v.push(-(Z[k][i + 1] - Z[k][i]) * fwd / dt); }
  mx.stopAllAction(); v.sort((x, y) => x - y); return v.length ? v[v.length >> 1] : 1.4;
}

// ---------------------------------------------------------------- looks
export const CATS = ['head', 'top', 'bot', 'shoe'], KEY = { head: 'hs', top: 'tp', bot: 'bt', shoe: 'sh' };
// Tap-to-pick catalogues. Face, eyes, brows, nose and lips are weights on the existing head. Beard and makeup are tints on that same head.
export const FACE_OPTS = [['Soft', 0, 2], ['Heart', 1, 2], ['Round', 2, 1], ['Long', 3, 4], ['Defined', 4, 3], ['Oval', 0, 3], ['Wide', 2, 0], ['Narrow', 3, 1], ['Square', 4, 2], ['Compact', 1, 0], ['Tall', 3, 3], ['Full', 2, 2]];
export const EYE_SHAPES = ['Almond', 'Round', 'Narrow', 'Wide set', 'Close set', 'Uptilt', 'Downtilt', 'Large', 'Small', 'Hooded'];
export const BROW_SHAPES = ['Natural', 'Thin', 'Thick', 'Arched', 'Low', 'High', 'Straight', 'Soft', 'Bold', 'Sparse'];
export const NOSE_SHAPES = ['Natural', 'Narrow', 'Wide', 'Long', 'Short', 'Button', 'Broad', 'Upturned', 'Straight', 'Prominent'];
export const LIP_SHAPES = ['Natural', 'Thin', 'Wide', 'Full', 'Plush', 'Small', 'Soft', 'Bow', 'Broad', 'Heavy'];
export const BEARDS = ['Clean', 'Shadow', 'Stubble', 'Moustache', 'Goatee', 'Short', 'Full', 'Long', 'Chin strap', 'Soul patch', 'Moustache and goatee', 'Faded'];
export const MAKEUP_NAMES = ['None', 'Liner', 'Strong liner', 'Nude lip', 'Rose lip', 'Red lip', 'Blush', 'Liner and blush', 'Full', 'Soft day'];
export const BODY_OPTS = [['Petite', .12, 0], ['Short', .28, 1], ['Slim', .4, 0], ['Average', .52, 1], ['Soft', .33, 1], ['Fit', .64, 2], ['Athletic', .74, 2], ['Broad', .58, 2], ['Tall slim', .86, 0], ['Tall', .94, 1]];
const fit = (name, tp, bt, sh, tc, bc, sc = 0) => ({ name, tp, bt, sh, tc, bc, sc });
export const OUTFITS = [
  { set: 'Casual', f: fit('Tee and jeans', 'T-shirt', 'Jeans', 'White sneakers', 10, 3), m: fit('Tee and jeans', 'T-shirt', 'Jeans', 'White sneakers', 10, 3) },
  { set: 'Casual', f: fit('Jacket walk', 'Jacket', 'Jeans', 'Brown leather', 2, 0), m: fit('Jacket walk', 'Jacket', 'Jeans', 'Brown leather', 2, 0) },
  { set: 'Casual', f: fit('Striped day', 'Striped shirt', 'Jeans', 'Blue sneakers', 10, 3), m: fit('Striped day', 'Striped shirt', 'Jeans', 'Blue sneakers', 10, 3) },
  { set: 'Office', f: fit('Desk blouse', 'Blouse', 'Jeans', 'Black formal', 1, 3), m: fit('Desk shirt', 'Long sleeve', 'Suit trousers', 'Black formal', 1, 3) },
  { set: 'Office', f: fit('Skirt suit', 'Long sleeve', 'Skirt', 'Black formal', 2, 2), m: fit('Suit', 'Suit', 'Suit trousers', 'Black formal', 2, 3) },
  { set: 'Office', f: fit('Stripe and skirt', 'Striped shirt', 'Skirt', 'Brown leather', 3, 2), m: fit('Denim office', 'Denim shirt', 'Light jeans', 'Brown leather', 0, 0) },
  { set: 'Traditional', f: fit('Long formal', 'Long sleeve', 'Skirt', 'Brown leather', 6, 4), m: fit('Long formal', 'Long sleeve', 'Suit trousers', 'Brown leather', 6, 2) },
  { set: 'Traditional', f: fit('Wrapped set', 'Blouse', 'Skirt', 'Brown leather', 4, 12), m: fit('Wrapped set', 'Suit', 'Suit trousers', 'Brown leather', 4, 2) },
  { set: 'Party', f: fit('Night out', 'Blouse', 'Skirt', 'Black formal', 13, 2), m: fit('Night out', 'Jacket', 'Suit trousers', 'Black formal', 2, 2) },
  { set: 'Party', f: fit('Bright night', 'Logo tee', 'Skirt', 'White sneakers', 9, 4), m: fit('Bright night', 'White tee', 'Light jeans', 'White sneakers', 13, 0) },
  { set: 'Gym', f: fit('Training', 'T-shirt', 'Track pants', 'Blue sneakers', 7, 2), m: fit('Training', 'Work tee', 'Jeans', 'Blue sneakers', 7, 3) },
  { set: 'Gym', f: fit('Run kit', 'Logo tee', 'Track pants', 'White sneakers', 10, 5), m: fit('Run kit', 'T-shirt', 'Light jeans', 'White sneakers', 10, 0) },
  { set: 'Swim', f: fit('Shore shorts', 'Logo tee', 'Denim shorts', 'Worn sneakers', 10, 0), m: fit('Shore jeans', 'White tee', 'Light jeans', 'Worn sneakers', 10, 0) },
  { set: 'Swim', f: fit('Pool set', 'T-shirt', 'Denim shorts', 'White sneakers', 13, 8), m: fit('Pool set', 'T-shirt', 'Jeans', 'White sneakers', 10, 8) },
];
const EYE_M = [{ s: 1, sp: 0, tilt: 0 }, { s: 1.16, sp: .001, tilt: 0 }, { s: .78, sp: 0, tilt: 0 }, { s: 1.02, sp: .007, tilt: 0 }, { s: 1, sp: -.006, tilt: 0 }, { s: 1.04, sp: 0, tilt: .22 }, { s: 1.04, sp: 0, tilt: -.2 }, { s: 1.24, sp: .002, tilt: 0 }, { s: .72, sp: 0, tilt: 0 }, { s: .9, sp: 0, tilt: -.08 }];
const BROW_M = [{ t: 1, lift: 0, arch: 0 }, { t: .62, lift: .001, arch: .2 }, { t: 1.55, lift: 0, arch: 0 }, { t: 1, lift: .001, arch: 1 }, { t: 1.1, lift: -.005, arch: 0 }, { t: .95, lift: .006, arch: .35 }, { t: 1.2, lift: 0, arch: -.15 }, { t: .8, lift: .003, arch: .55 }, { t: 1.4, lift: -.001, arch: .15 }, { t: .55, lift: .002, arch: .25 }];
const NOSE_M = [{ w: 1, len: 0, tip: 0 }, { w: .7, len: 0, tip: 0 }, { w: 1.32, len: 0, tip: 0 }, { w: 1, len: .007, tip: 0 }, { w: 1, len: -.005, tip: 0 }, { w: .78, len: .002, tip: .004 }, { w: 1.22, len: .003, tip: -.002 }, { w: .88, len: 0, tip: .005 }, { w: 1.05, len: .002, tip: 0 }, { w: 1.12, len: .008, tip: .002 }];
const LIP_M = [{ wide: 1, full: 1 }, { wide: .86, full: .82 }, { wide: 1.14, full: 1 }, { wide: 1.02, full: 1.22 }, { wide: 1.04, full: 1.32 }, { wide: .9, full: .8 }, { wide: 1.02, full: 1.14 }, { wide: .86, full: 1.18 }, { wide: 1.14, full: .96 }, { wide: 1.04, full: 1.36 }];
const BEARD_K = [0, .28, .45, .7, .72, .62, .78, .82, .55, .6, .74, .4];
const MAKEUP = [null, { liner: .55 }, { liner: .4 }, { lip: [1.06, .86, .82] }, { lip: [1.12, .7, .74] }, { lip: [1.18, .55, .6] }, { blush: [1.16, .84, .88] }, { liner: .5, blush: [1.12, .86, .9] }, { liner: .45, lip: [1.16, .58, .64], blush: [1.14, .82, .86] }, { lip: [1.08, .8, .78], blush: [1.08, .9, .9] }];
export function bodyHeight(i, ag) { const [lo, hi] = HRANGE[ag] || HRANGE[2], t = (BODY_OPTS[i] || BODY_OPTS[3])[1]; return Math.round(lo + (hi - lo) * t); }
export function applyOutfit(look) {
  const row = OUTFITS[look.of]; if (!row) return look; const s = row[look.g] || row.m;
  look.tp = partIndex(look.g, 'top', s.tp); look.bt = partIndex(look.g, 'bot', s.bt); look.sh = partIndex(look.g, 'shoe', s.sh);
  look.tc = s.tc; look.bc = s.bc; look.sc = s.sc || 0; return look;
}
function emptyReg(n) { const z = new Uint8Array(n); return { counts: { head: 0, face: 0, eye: 0, brow: 0, nose: 0, lip: 0, beard: 0, cheek: 0 }, eye: [], brow: [], nose: [], lip: [], beard: [], cheek: [], eyeM: z, browM: z, noseM: z, lipM: z, beardM: z, cheekM: z, yEye: 0, yLip: 0, yChin: 0 }; }
function faceRegions(C) {
  if (C.reg) return C.reg;
  const P = C.P0, n = C.nv; let top = -1e9;
  for (let i = 0; i < n; i++) if (Math.abs(P[i * 3]) < .06 && P[i * 3 + 1] > top) top = P[i * 3 + 1];
  let noseI = -1, noseZ = -1e9;
  for (let i = 0; i < n; i++) {
    const x = Math.abs(P[i * 3]), y = P[i * 3 + 1], z = P[i * 3 + 2];
    if (x < .012 && y < top - .045 && y > top - .16 && z > noseZ) { noseZ = z; noseI = i; }
  }
  if (noseI < 0) { C.reg = emptyReg(n); return C.reg; }
  const ny = P[noseI * 3 + 1], nz = P[noseI * 3 + 2];
  const take = (x0, x1, y0, y1, zBack) => {
    const a = [];
    for (let i = 0; i < n; i++) {
      const x = Math.abs(P[i * 3]), y = P[i * 3 + 1], z = P[i * 3 + 2];
      if (x >= x0 && x <= x1 && y >= ny + y0 && y <= ny + y1 && z >= nz - zBack && z <= nz + .012) a.push(i);
    }
    return a;
  };
  let eye = take(.022, .044, .008, .022, .018), brow = take(.018, .046, .026, .036, .012);
  let nose = take(0, .011, -.01, .008, .01), lip = take(0, .022, -.032, -.016, .014);
  if (eye.length < 12) eye = take(.018, .05, .004, .028, .024);
  if (brow.length < 8) brow = take(.014, .05, .02, .04, .016);
  if (nose.length < 8) nose = take(0, .014, -.014, .012, .014);
  if (lip.length < 8) lip = take(0, .024, -.032, -.014, .014);
  const noseSet = new Set(nose);
  lip = lip.filter((i) => !noseSet.has(i));
  const beard = take(0, .046, -.055, -.02, .03).filter((i) => !lip.includes(i) && !noseSet.has(i));
  const cheek = take(.03, .055, -.02, .012, .035).filter((i) => !noseSet.has(i) && !lip.includes(i));
  const mark = (list) => { const a = new Uint8Array(n); for (const i of list) a[i] = 1; return a; };
  let yEye = ny; if (eye.length) { yEye = 0; for (const i of eye) yEye += P[i * 3 + 1]; yEye /= eye.length; }
  C.reg = { counts: { head: 0, face: eye.length + brow.length + nose.length + lip.length, eye: eye.length, brow: brow.length, nose: nose.length, lip: lip.length, beard: beard.length, cheek: cheek.length }, eye, brow, nose, lip, beard, cheek, eyeM: mark(eye), browM: mark(brow), noseM: mark(nose), lipM: mark(lip), beardM: mark(beard), cheekM: mark(cheek), yEye, yLip: ny - .02, yChin: ny - .05, ny, nz };
  return C.reg;
}
function cluster(P, ids, side) {
  let n = 0, x = 0, y = 0, z = 0;
  for (const i of ids) { const X = P[i * 3]; if (side < 0 && X >= 0) continue; if (side > 0 && X < 0) continue; x += X; y += P[i * 3 + 1]; z += P[i * 3 + 2]; n++; }
  return n ? [x / n, y / n, z / n] : null;
}
function applyFeatures(P, C, look) {
  const es = look.es | 0, br = look.br | 0, ns = look.ns | 0, lp = look.lp | 0;
  if (!es && !br && !ns && !lp) return;
  const R = C.reg || faceRegions(C);
  if (es && R.eye.length) {
    const E = EYE_M[es] || EYE_M[0];
    for (const side of [-1, 1]) {
      const c = cluster(P, R.eye, side); if (!c) continue;
      for (const i of R.eye) {
        const o = i * 3, x = P[o]; if ((side < 0 && x >= 0) || (side > 0 && x < 0)) continue;
        let dy = (P[o + 1] - c[1]) * E.s, dz = (P[o + 2] - c[2]) * E.s; const cs = Math.cos(E.tilt), sn = Math.sin(E.tilt);
        P[o] = c[0] + (x - c[0]) * E.s + side * E.sp; P[o + 1] = c[1] + dy * cs - dz * sn; P[o + 2] = c[2] + dy * sn + dz * cs;
      }
    }
  }
  if (br && R.brow.length) {
    const B = BROW_M[br] || BROW_M[0];
    for (const side of [-1, 1]) {
      const c = cluster(P, R.brow, side); if (!c) continue;
      for (const i of R.brow) {
        const o = i * 3, x = P[o]; if ((side < 0 && x >= 0) || (side > 0 && x < 0)) continue;
        const arch = B.arch * .004 * (1 - Math.min(1, Math.abs(x - c[0]) / .03));
        P[o + 1] = c[1] + (P[o + 1] - c[1]) * B.t + B.lift + arch;
      }
    }
  }
  if (ns && R.nose.length) {
    const N = NOSE_M[ns] || NOSE_M[0], c = cluster(P, R.nose, 0); if (c) for (const i of R.nose) { const o = i * 3; P[o] = c[0] + (P[o] - c[0]) * N.w; P[o + 1] += N.tip; P[o + 2] += N.len; }
  }
  if (lp && R.lip.length) {
    const L = LIP_M[lp] || LIP_M[0], c = cluster(P, R.lip, 0); if (c) for (const i of R.lip) {
      const o = i * 3, up = P[o + 1] >= c[1] ? 1 : -1;
      P[o] = c[0] + (P[o] - c[0]) * L.wide; P[o + 1] = c[1] + (P[o + 1] - c[1]) * L.full + up * (L.full - 1) * .0012; P[o + 2] += (L.full - 1) * .0016;
    }
  }
}
function beardOn(P, R, v, kind) {
  if (!kind || !R.ny) return false;
  const x = Math.abs(P[v * 3]), y = P[v * 3 + 1], z = P[v * 3 + 2], ny = R.ny, nz = R.nz;
  if (z < nz - .04 || R.lipM[v]) return false;
  const mo = x < .024 && y <= ny - .002 && y > ny - .014 && z > nz - .02;
  const chin = x < .018 && y < ny - .028 && y > ny - .058 && z > nz - .03;
  const jaw = x > .012 && x < .048 && y < ny - .016 && y > ny - .05 && z > nz - .035;
  if (kind === 3) return mo;
  if (kind === 4) return chin;
  if (kind === 9) return chin && x < .01;
  if (kind === 8) return jaw;
  if (kind === 10) return mo || chin;
  if (kind === 11) return mo || (jaw && y > ny - .032);
  if (kind === 5) return chin || jaw;
  return mo || chin || jaw;
}
function featureTint(look, C, v) {
  const R = C.reg; if (!R) return null;
  const mk = look.mk | 0, bd = look.bd | 0; if (!mk && !bd) return null;
  const P = C.P0, M = MAKEUP[mk]; let r = 1, g = 1, b = 1, hit = false;
  if (M) {
    if (M.liner && R.eyeM[v] && P[v * 3 + 1] >= R.yEye) { r *= M.liner; g *= M.liner; b *= M.liner; hit = true; }
    if (M.lip && R.lipM[v]) { r *= M.lip[0]; g *= M.lip[1]; b *= M.lip[2]; hit = true; }
    if (M.blush && R.cheekM[v]) { r *= M.blush[0]; g *= M.blush[1]; b *= M.blush[2]; hit = true; }
  }
  if (bd && beardOn(P, R, v, bd)) { const k = BEARD_K[bd] || .6; r *= 1 - k; g *= 1 - k * .92; b *= 1 - k * .88; hit = true; }
  return hit ? [r, g, b] : null;
}
export const defaultLook = (g = 'm') => ({ g, ag: 2, sk: 6, et: 0, hs: 0, hc: 0, ey: 0, es: 0, br: 0, ns: 0, lp: 0, bd: 0, mk: 0, of: 0, tp: 0, tc: 0, bt: 0, bc: 0, sh: 0, sc: 0, h: g === 'm' ? 174 : 164, b: 1, fw: 0, fl: 2 });
export function fixLook(l) {                                   // never trust a stored/received look
  const d = defaultLook(l && l.g === 'f' ? 'f' : 'm'), o = { ...d }, X = D.index[o.g], C = D.colors;
  const num = (k, lo, hi) => { const v = Math.round(+(l || {})[k]); if (Number.isFinite(v)) o[k] = clamp(v, lo, hi); };
  num('ag', 0, 3); num('sk', 0, C.skin.length - 1); num('hs', 0, X.hair.length - 1); num('hc', 0, C.hair.length - 1); num('ey', 0, C.eyes.length - 1);
  num('es', 0, EYE_SHAPES.length - 1); num('br', 0, BROW_SHAPES.length - 1); num('ns', 0, NOSE_SHAPES.length - 1); num('lp', 0, LIP_SHAPES.length - 1);
  num('bd', 0, BEARDS.length - 1); num('mk', 0, MAKEUP_NAMES.length - 1); num('of', 0, OUTFITS.length - 1);
  num('tp', 0, X.top.length - 1); num('tc', 0, CLOTH.length - 1); num('bt', 0, X.bot.length - 1); num('bc', 0, CLOTH.length - 1); num('sh', 0, X.shoe.length - 1); num('sc', 0, CLOTH.length - 1);
  num('b', 0, 2); num('fw', 0, 4); num('fl', 0, 4);
  if (l && l.et !== undefined) num('et', 0, HERITAGE.length - 1); else o.et = o.sk >= 10 ? 2 : o.sk <= 1 ? 3 : 0;
  if (l && l.es === undefined) o.es = 0; if (l && l.br === undefined) o.br = 0; if (l && l.ns === undefined) o.ns = 0; if (l && l.lp === undefined) o.lp = 0;
  if (l && l.bd === undefined) o.bd = 0; if (l && l.mk === undefined) o.mk = 0;
  if (l && Number.isFinite(+l.ma)) o.ma = clamp(Math.round(+l.ma * 100) / 100, 0, 1);
  const [lo, hi] = HRANGE[o.ag]; o.h = clamp(Math.round(+(l || {}).h || d.h), lo, hi);
  if (l && l.h === undefined) o.h = HDEF[o.ag][o.g === 'm' ? 1 : 0];
  return o;
}
// Life clock ages the face. The looks stat is unchanged: self-care holds the young face back. Age alone does not drop looks.
export function agedLook(look, age, looks) {
  const o = fixLook(look), a = Math.max(0, Math.round(+age || 0));
  if (a < 13) o.ag = 0; else if (a < 20) o.ag = 1; else if (a < 60) o.ag = 2; else o.ag = 3;
  const care = clamp((+looks || 0) / 100, 0, 1); let ma = 0;
  if (a >= 30 && a < 60) ma = clamp((a - 30) / 45, 0, .65) * (1 - care * .55);
  else if (a >= 60) ma = clamp(.45 + (a - 60) / 50, .45, .9) * (1 - care * .35);
  o.ma = Math.round(ma * 100) / 100; const [lo, hi] = HRANGE[o.ag]; o.h = clamp(o.h, lo, hi); return o;
}
export function randomLook(rnd = Math.random, over = {}) {
  const g = over.g || (rnd() < .5 ? 'm' : 'f'), X = D.index[g], C = D.colors, ag = over.ag ?? [1, 2, 2, 2, 2, 3][Math.floor(rnd() * 6)], pk = (n) => Math.floor(rnd() * n);
  const grey = ag === 3, of = over.of ?? pk(OUTFITS.length), bo = pk(BODY_OPTS.length), fit = OUTFITS[of][g];
  const o = fixLook({ g, ag, sk: pk(C.skin.length), et: pk(HERITAGE.length), hs: pk(X.hair.length), hc: grey ? (rnd() < .5 ? 11 : 15) : pk(8), ey: pk(C.eyes.length),
    es: pk(EYE_SHAPES.length), br: pk(BROW_SHAPES.length), ns: pk(NOSE_SHAPES.length), lp: pk(LIP_SHAPES.length), bd: g === 'm' || rnd() < .2 ? pk(BEARDS.length) : 0, mk: pk(MAKEUP_NAMES.length), of,
    tp: partIndex(g, 'top', fit.tp), tc: fit.tc, bt: partIndex(g, 'bot', fit.bt), bc: fit.bc, sh: partIndex(g, 'shoe', fit.sh), sc: fit.sc || 0,
    h: bodyHeight(bo, ag), b: BODY_OPTS[bo][2], fw: pk(5), fl: pk(5), ...over });
  if (over.of !== undefined && over.tp === undefined) applyOutfit(o);
  return o;
}
const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
// nationality -> heritage and skin-tone range
const SKINBY = [[/nigeria|keny|ugand|senegal|ghana|ethiop|congo|somali|sudan|guinea|mali|tanzan|rwanda|cameroon|zimbab|african/i, 2, 9, 13], [/egypt|leban|jordan|syria|iraq|iran|turk|saudi|moroc|algeria|palest|afghan/i, 3, 4, 7], [/pakist|bangla|india|nepal|sri lank|bhutan/i, 0, 5, 10],
  [/brazil|mexic|colomb|peru|chile|argent|portug|spain|ital|greek/i, 3, 2, 6], [/korea|japan|china|chinese|vietnam|thai|mongol|filip|indones|malays|tibet/i, 1, 1, 4], [/swed|finn|norw|dan|german|dutch|czech|polish|russia|brit|engl|scot|irish|america|canad|austria|swiss|france|french|ukrain|austral/i, 3, 0, 3]];
const FIT = {
  f: { rich: [['Blouse', 'Skirt'], ['Blouse', 'Jeans'], ['Striped shirt', 'Skirt'], ['Jacket', 'Jeans']], office: [['Blouse', 'Jeans'], ['Long sleeve', 'Jeans'], ['Striped shirt', 'Jeans'], ['T-shirt', 'Skirt']],
    work: [['T-shirt', 'Track pants'], ['Long sleeve', 'Jeans'], ['T-shirt', 'Jeans']], casual: [['T-shirt', 'Jeans'], ['Logo tee', 'Jeans'], ['Long sleeve', 'Track pants'], ['Jacket', 'Jeans'], ['Blouse', 'Jeans'], ['T-shirt', 'Skirt']],
    poor: [['Long sleeve', 'Track pants'], ['T-shirt', 'Jeans']] },
  m: { rich: [['Suit', 'Suit trousers'], ['Striped shirt', 'Suit trousers'], ['Jacket', 'Jeans']], office: [['Striped shirt', 'Jeans'], ['Denim shirt', 'Jeans'], ['Long sleeve', 'Suit trousers'], ['White tee', 'Light jeans']],
    work: [['Work tee', 'Overalls'], ['T-shirt', 'Jeans'], ['Denim shirt', 'Light jeans']], casual: [['T-shirt', 'Jeans'], ['White tee', 'Light jeans'], ['Long sleeve', 'Jeans'], ['Jacket', 'Jeans'], ['Denim shirt', 'Jeans']],
    poor: [['White tee', 'Jeans'], ['T-shirt', 'Light jeans']] } };
const SHOES = { rich: ['Black formal', 'Brown leather'], office: ['Brown leather', 'Black formal', 'White sneakers'], work: ['Boots', 'Worn sneakers', 'Brown leather'], casual: ['White sneakers', 'Blue sneakers', 'Brown leather'], poor: ['Worn sneakers'] };
const TINT = { rich: [1, 2, 3, 4, 12, 6, 1], office: [1, 3, 10, 7, 6, 4, 2], work: [2, 5, 11, 6, 3], casual: [1, 3, 4, 7, 8, 9, 10, 12, 13, 14, 5], poor: [2, 5, 6, 11] };
// an 'Original' top still gets a colour: the source prints (blue tees, red stripes) would otherwise put half the town in one shirt
const TOPDEF = { female_casualsuit01: 10, female_elegantsuit01: 1, female_casualsuit02: 13, male_casualsuit05: 2, male_casualsuit03: 3, male_casualsuit02: 5, male_casualsuit04: 3 };
const HAIRS = { f: ['Long', 'Centre part', 'Waves', 'Ponytail', 'Bun', 'Bob', 'Long', 'Ponytail', 'Waves'], fAf: ['Curls', 'Bun', 'Ponytail'], fOld: ['Bun', 'Bob', 'Ponytail'],
  m: ['Short', 'Side part', 'Swept back', 'Crop', 'Short', 'Side part'], mAf: ['Coils', 'Buzz', 'Crop'], mOld: ['Side part', 'Bald', 'Short', 'Swept back', 'Buzz'] };
// townsperson look from the cast file: gender, age, nationality and job decide the person, the id decides the details
export function npcLook(c) {
  const h = hashStr(c.id || c.name), r = (k) => ((Math.imul(h ^ (k * 2654435761), 2246822519) >>> 0) % 1000) / 1000, g = /^(f|w|g)/i.test(c.gender || '') ? 'f' : 'm', age = +c.age || 35;
  const ag = age < 13 ? 0 : age < 20 ? 1 : age < 62 ? 2 : 3, sb = SKINBY.find(([re]) => re.test(c.nationality || 'Nepal')) || [0, 0, 5, 10], et = sb[1], job = c.job || '';
  const tier = c.wealth || (/beggar|homeless|labou?r|porter|ragpick|sweeper/i.test(job) ? 'poor' : /doctor|professor|banker|lawyer|manager|architect|owner|director|investor|dean|ceo|surgeon/i.test(job) ? 'rich'
    : /clerk|librar|teacher|writer|nurse|accountant|engineer|designer|analyst|receptionist|officer/i.test(job) ? 'office' : /driver|repair|worker|builder|mechanic|farmer|cleaner|guard|cook|seller|vendor|shop|trainer|musician|tailor/i.test(job) ? 'work' : 'casual');
  const pk = (a, k) => a[Math.floor(r(k) * a.length)], kid = ag === 0;
  const fit = pk(FIT[g][kid ? 'casual' : tier] || FIT[g].casual, 4), hairs = ag === 3 ? HAIRS[g + 'Old'] : et === 2 ? HAIRS[g + 'Af'] : HAIRS[g];
  const dark = et !== 3 || r(9) < .35;
  const hc = ag === 3 ? (r(9) < .6 ? 11 : 15) : dark ? (r(10) < .7 ? 0 : 1) : pk([1, 2, 3, 5, 6, 7], 10);
  const ey = et === 3 ? pk([1, 2, 3, 4, 5], 3) : pk([0, 0, 1], 3), [lo, hi] = HRANGE[ag], T = TINT[kid ? 'casual' : tier] || TINT.casual;
  const tall = g === 'm' ? .55 : .4, hgt = ag === 0 ? 100 + age * 4.3 : ag === 1 ? 150 + (age - 13) * 3 : lo + (hi - lo) * (tall + (r(6) - .5) * .5) - (ag === 3 ? 4 : 0);
  const b = tier === 'work' ? (r(17) < .5 ? 2 : 1) : Math.floor(r(17) * 3);
  return fixLook({ g, ag, et: et === 0 && r(21) < .08 ? 4 : et, sk: Math.round(sb[2] + r(1) * (sb[3] - sb[2])), hs: partIndex(g, 'hair', pk(hairs, 2)), hc, ey,
    tp: partIndex(g, 'top', fit[0]), tc: pk(T, 7), bt: partIndex(g, 'bot', fit[1]), bc: tier === 'rich' ? pk([0, 2, 3], 12) : pk([0, 0, 2, 3, 6], 12), sh: partIndex(g, 'shoe', pk(SHOES[kid ? 'casual' : tier] || SHOES.casual, 14)), sc: 0,
    h: Math.round(hgt), b, fw: Math.floor(r(18) * 5), fl: 1 + Math.floor(r(19) * 3), ma: ag === 2 ? clamp((age - 28) / 34, 0, 1) : 0 });
}

// ---------------------------------------------------------------- shape: base body + weighted deltas, grounded
function shapeWeights(l) {
  const w = {};
  if (l.et === 1) w.eth_ea = 1; else if (l.et === 2) w.eth_af = 1; else if (l.et === 3) w.eth_eu = 1; else if (l.et === 4) { w.eth_eu = .35; w.eth_ea = .25; }
  if (l.ag === 0) w.child = 1; else if (l.ag === 1) w.teen = 1; else if (l.ag === 3) w.old = l.ma > 0 ? Math.max(.35, l.ma) : 1; else if (l.ma) w.old = l.ma * .55;
  const kid = l.ag === 0 ? .4 : 1;
  if (l.b === 0) w.slim = kid; else if (l.b === 2) w.broad = kid * (l.g === 'f' ? .75 : 1);
  if (l.fw) w['face' + l.fw] = l.ag === 0 ? .5 : 1;
  if (l.fl !== 2) w.long = (l.fl - 2) * .35;
  return w;
}
function blend(C, w) {
  const P = C.P0.slice(), J = C.J0.slice();
  for (const d of C.deltas) {
    const k = w[d.name]; if (!k) continue; const s = d.sc * k, I = d.idx, Dd = d.d;
    for (let i = 0; i < d.n; i++) { const v = I[i] * 3, o = i * 3; P[v] += Dd[o] * s; P[v + 1] += Dd[o + 1] * s; P[v + 2] += Dd[o + 2] * s; }
    for (let i = 0; i < J.length; i++) J[i] += d.dj[i] * k;
  }
  let lo = 1e9, hi = -1e9; for (let i = 0; i < C.nb; i++) { const y = P[i * 3 + 1]; if (y < lo) lo = y; if (y > hi) hi = y; }
  for (let i = 1; i < P.length; i += 3) P[i] -= lo; for (let i = 1; i < J.length; i += 3) J[i] -= lo;
  return { P, J, H: hi - lo };
}

// ---------------------------------------------------------------- the avatar
// colours.json eye -> [atlas iris, rgb tint]; the MakeHuman brown irises are red-brown, so browns are cooled a little
const EYEMAP = [[0, [.8, .84, .9]], [1, [.92, .95, 1]], [2, [1, .95, .8]], [2, [1, 1, 1]], [3, [1, 1, 1]], [4, [1, 1, 1]], [1, [1.1, 1, .78]], [0, [.66, .68, .72]]];
let chain = Promise.resolve();
const turn = () => (chain = chain.then(() => new Promise((r) => setTimeout(r, 0))));   // one avatar build per task, so a crowd never freezes a frame
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), AX = new THREE.Vector3(1, 0, 0), AZ = new THREE.Vector3(0, 0, 1), QX = new THREE.Quaternion().setFromAxisAngle(AX, -Math.PI / 2);
const _m1 = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _v1 = new THREE.Vector3(), ONE = new THREE.Vector3(1, 1, 1), _ray = new THREE.Ray(), _box = new THREE.Box3(), _inv = new THREE.Matrix4(), _hit = new THREE.Vector3();
export const SEAT_Y = .46;
const LOD_AT = PHONE ? 9 : 11;                                  // metres from the camera where the low-poly body takes over
// Phone: the crowd boots on the small _lo parts. Full meshes fill in one person at a time after play has started.
const fullQ = []; let fullOn = false;
function queueFull(av) {
  if (!av || av._queued || av._full || av._close) return;
  av._queued = true; fullQ.push(av);
  if (fullOn) return;
  fullOn = true;
  setTimeout(function step() {
    const g = window.__game, layer = document.getElementById('layer');
    const moving = g && g.keys && (g.keys.KeyW || g.keys.KeyA || g.keys.KeyS || g.keys.KeyD || (g.joy && (g.joy.x || g.joy.y)));
    if (window.__watch || moving || (layer && !layer.hidden)) { setTimeout(step, 400); return; }
    const one = fullQ.shift();
    if (!one) { fullOn = false; return; }
    one._full = true;
    Promise.resolve(one.look ? one.set(one.look) : null).then(() => setTimeout(step, 400), () => setTimeout(step, 400));
  }, 6000);
}
export function createAvatar(look0, { castShadow = !PHONE, close = false, lead = false } = {}) {
  const root = new THREE.Group(), av = { root, look: null, mixer: null, F: null, mesh: null, sc: 1, k: 1, tok: 0, sitW: 0, waveT: 0, pose: '', w: { idle: 1, walk: 0, run: 0, wave: 0 }, seatY: SEAT_Y, key: '', _close: !!close, _lead: !!lead, _full: false, _queued: false, _shared: false };
  const mesh = new THREE.SkinnedMesh(new THREE.BufferGeometry(), []); mesh.castShadow = castShadow; mesh.receiveShadow = true; mesh.visible = false; av.mesh = mesh;
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, .85, 0), 1.3);
  // far away: the low-poly body on the same skeleton (THREE.LOD picks per camera; added once the first build is done)
  const lodMesh = new THREE.SkinnedMesh(new THREE.BufferGeometry(), []); lodMesh.receiveShadow = true; lodMesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, .85, 0), 1.3); av.lodMesh = lodMesh;
  const lod = new THREE.LOD(); lod.addLevel(mesh, 0, .1); lod.addLevel(lodMesh, LOD_AT, .1);
  mesh.raycast = function (raycaster, hits) {                  // a body-sized box, not 30k skinned triangles
    _inv.copy(this.matrixWorld).invert(); _ray.copy(raycaster.ray).applyMatrix4(_inv); const H = av.H || 1.7;
    _box.min.set(-.28, 0, -.22); _box.max.set(.28, H, .22); if (!_ray.intersectBox(_box, _hit)) return;
    _hit.applyMatrix4(this.matrixWorld); const d = raycaster.ray.origin.distanceTo(_hit); if (d >= raycaster.near && d <= raycaster.far) hits.push({ distance: d, point: _hit.clone(), object: this });
  };
  const armQ = (b, out) => { out.identity(); const ch = []; for (let x = b; x && x !== av.rig; x = x.parent) ch.push(x); for (let i = ch.length - 1; i >= 0; i--) out.multiply(ch[i].quaternion); return out; };

  function newRig(F) {                                     // new family: rig clone, stand-in hip node, mixer
    if (av.rig) root.remove(av.rig); av.fam = F; av.rig = SkeletonUtils.clone(F.rig); root.add(av.rig);
    av.boneList = F.names.map((n) => av.rig.getObjectByName(n)); av.bones = {};
    for (const n of ['Root', 'Body', 'Hips', 'Abdomen', 'Torso', 'Chest', 'Neck', 'Head', 'UpperArm.L', 'UpperArm.R', 'UpperLeg.L', 'UpperLeg.R', 'LowerLeg.L', 'LowerLeg.R', 'Foot.L', 'Foot.R']) av.bones[n] = av.rig.getObjectByName(san(n));
    av.bodyQ = new THREE.Object3D(); av.bodyQ.name = 'BodyQ'; av.bodyQ.position.copy(F.bodyRestQ); av.rig.add(av.bodyQ);
    av.mixer = new THREE.AnimationMixer(av.rig); av.act = {};
    for (const [k, n] of [['idle', 'Idle'], ['walk', 'Walk'], ['run', 'Run'], ['wave', 'Wave']]) { const a = av.mixer.clipAction(F.clips[n]); a.play(); a.setEffectiveWeight(k === 'idle' ? 1 : 0); av.act[k] = a; }
    av.act.wave.setLoop(THREE.LoopOnce, 1); av.act.wave.clampWhenFinished = true; av.act.wave.paused = true;
    av.act.idle.time = Math.random() * av.act.idle.getClip().duration; av.act.walk.time = Math.random(); av.key = '';
  }
  // bind pose from the body's joints: Quaternius bone frames turned onto the MakeHuman limb directions
  function fitRig(F, J) {
    const n = F.names.length, pn = [], dq = [], Wn = [];
    for (let i = 0; i < n; i++) pn[i] = av.C.keep.has(i) ? F.pq[i].clone() : new THREE.Vector3(J[i * 3], J[i * 3 + 1], J[i * 3 + 2]);
    for (let i = 0; i < n; i++) {
      const c = F.main[i], limb = LIMB.test(F.names[i]); dq[i] = null;
      if (c >= 0 && limb) { const a = F.pq[c].clone().sub(F.pq[i]), b = pn[c].clone().sub(pn[i]); if (a.lengthSq() > 1e-10 && b.lengthSq() > 1e-10) dq[i] = new THREE.Quaternion().setFromUnitVectors(a.normalize(), b.normalize()); }
      if (!dq[i]) dq[i] = limb && F.parent[i] >= 0 ? dq[F.parent[i]] : new THREE.Quaternion();
      Wn[i] = new THREE.Matrix4().compose(pn[i], dq[i].clone().multiply(F.Rq[i]), ONE);
    }
    for (let i = 0; i < n; i++) {
      const b = av.boneList[i], pi = F.parent[i]; let PW;
      if (pi >= 0) PW = Wn[pi]; else { PW = new THREE.Matrix4(); for (let x = b.parent; x && x !== av.rig; x = x.parent) { x.updateMatrix(); PW.premultiply(x.matrix); } }
      _m1.copy(PW).invert().multiply(Wn[i]).decompose(b.position, b.quaternion, b.scale);
    }
    const I = (nm) => F.ix[san(nm)];
    av.ankle = ['L', 'R'].map((s) => pn[I('Foot.' + s)].clone().applyMatrix4(Wn[I('LowerLeg.' + s)].clone().invert()));
    av.k = (pn[I('UpperLeg.L')].distanceTo(pn[I('LowerLeg.L')]) + pn[I('LowerLeg.L')].distanceTo(pn[I('Foot.L')])) / F.legQ;
    av.bodyRest = av.bones.Body.position.clone(); av.hipY = av.bodyRest.y - .01 * av.k; av.kneeY = pn[I('LowerLeg.L')].y - pn[I('Root')].y - .024 * av.k;
    if (av.skeleton) av.skeleton.dispose(); av.skeleton = new THREE.Skeleton(av.boneList, Wn.map((m) => m.clone().invert())); mesh.bind(av.skeleton, new THREE.Matrix4()); lodMesh.bind(av.skeleton, new THREE.Matrix4());
    av._vr = null; av._hold = null;
  }

  // one skinned geometry: a body (B: the MakeHuman render mesh minus the skin clothes hide; or a 'lod' proxy part) plus fitted parts
  function assemble(look, P, C, cover, B, list, tile, skc, skMean) {
    const Cc = D.colors; let used = null, btri = [], nb = 0;
    if (B) {
      used = new Int32Array(B.n).fill(-1);
      for (let t = 0; t < B.idx.length; t += 3) { const a = B.idx[t], b = B.idx[t + 1], c = B.idx[t + 2]; if (cover[B.rv[a]] || cover[B.rv[b]] || cover[B.rv[c]]) continue; btri.push(a, b, c); used[a] = used[b] = used[c] = 0; }
      for (let i = 0; i < B.n; i++) if (used[i] === 0) used[i] = nb++;
    }
    let n = nb, nw = C.nv; for (const [, p] of list) n += p.n;
    const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), si = new Uint8Array(n * 4), sw = new Uint8Array(n * 4), col = new Uint8Array(n * 4), weld = new Uint32Array(n);
    const groups = [[], [], [], []];                            // skin, cloth, hair (cut), eyes; the soft hair pass reuses the hair triangles
    const hair = lin(Cc.hair[look.hc][1]), tintOf = { top: look.tc, bot: look.bc, shoe: look.sc };
    // scalp under the hair cards takes the hair colour (texture luminance), blended at a soft hairline
    const hp = list.find(([c]) => c === 'hair'), paint = new Float32Array(C.nv);
    if (hp && hp[1].pi) for (let i = 0; i < hp[1].pi.length; i++) paint[hp[1].pi[i]] = hp[1].pw[i] / 255;
    const sm = lum(skMean) || .3, pc = hair.map((x) => Math.round(clamp(x * .8 / sm / SKIN_MUL, 0, 1) * 255));
    const skinCol = (o, v) => {
      const tint = featureTint(look, C, v), base = tint ? skc.map((c, i) => Math.round(clamp(c * tint[i], 0, 255))) : skc, w = paint[v];
      for (let k = 0; k < 3; k++) col[o * 4 + k] = Math.round(base[k] + (pc[k] - base[k]) * w); col[o * 4 + 3] = Math.round(w * 255);
    };
    if (B) {
      const tr = B.h.tex[tile];
      for (let i = 0; i < B.n; i++) {
        const o = used[i]; if (o < 0) continue; const v = B.rv[i];
        pos[o * 3] = P[v * 3]; pos[o * 3 + 1] = P[v * 3 + 1]; pos[o * 3 + 2] = P[v * 3 + 2]; weld[o] = v;
        uv[o * 2] = tr[0] + B.uv[i * 2] / 65535 * (tr[2] - tr[0]); uv[o * 2 + 1] = tr[1] + B.uv[i * 2 + 1] / 65535 * (tr[3] - tr[1]);
        for (let k = 0; k < 4; k++) { si[o * 4 + k] = B.si[i * 4 + k]; sw[o * 4 + k] = B.sw[i * 4 + k]; }
        skinCol(o, v);
      }
      for (const t of btri) groups[0].push(used[t]);
    }
    // fitted parts
    let o = nb; const cardsAt = [];
    for (const [cat, p] of list) {
      const h = p.h, ws = h.wsc || 16384;
      const s = [0, 1, 2].map((a) => { const [v1, v2, den] = h.scale[a]; return Math.abs(P[v1 * 3 + a] - P[v2 * 3 + a]) / den; });
      let ti = 0, c = [1, 1, 1], a = 0, cc = null;
      if (cat === 'lod') { ti = tile; cc = skc; }
      else if (cat === 'eye') { const e = EYEMAP[look.ey] || EYEMAP[0]; ti = e[0]; c = e[1]; }
      else if (cat === 'hair' || cat === 'brow') {             // grey and silver read as hair, not white plastic; brows stay darker than the hair
        const sat = 1 - Math.min(...hair) / Math.max(...hair, 1e-3), cap = cat === 'brow' ? .1 : .3 + .25 * sat, f = (cat === 'brow' ? .75 : 1.05) * Math.min(1, cap / Math.max(lum(hair), 1e-3)); c = hair.map((x) => x * f / .34); a = 1;
      }   // hair tiles are normalised to sRGB mean .62 (.34 linear) at build
      else if (cat === 'lash') { c = [.8, .8, .8]; }
      else { const t = tintOf[cat]; if (t) { const T = lin(CLOTH[t][1]), L = lum(h.mean) || .5; c = T.map((x) => x / L); a = 1; } }
      cc ||= c.map((x) => Math.round(clamp(x * .5, 0, 1) * 255)); const r = h.tex[ti] || h.tex[0], g = cat === 'lod' ? 0 : cat === 'eye' ? 3 : cat === 'hair' || cat === 'brow' || cat === 'lash' ? 2 : 1;
      for (let i = 0; i < p.n; i++) {
        const q = i * 3, vo = o + i; let x = 0, y = 0, z = 0;
        for (let k = 0; k < 3; k++) { const v = p.ref[q + k] * 3, wt = p.w[q + k] / ws; x += P[v] * wt; y += P[v + 1] * wt; z += P[v + 2] * wt; }
        pos[vo * 3] = x + p.off[q] * h.osc * s[0]; pos[vo * 3 + 1] = y + p.off[q + 1] * h.osc * s[1]; pos[vo * 3 + 2] = z + p.off[q + 2] * h.osc * s[2];
        uv[vo * 2] = r[0] + p.uv[i * 2] / 65535 * (r[2] - r[0]); uv[vo * 2 + 1] = r[1] + p.uv[i * 2 + 1] / 65535 * (r[3] - r[1]);
        for (let k = 0; k < 4; k++) { si[vo * 4 + k] = p.si[i * 4 + k]; sw[vo * 4 + k] = p.sw[i * 4 + k]; }
        if (cat === 'lod') skinCol(vo, p.ref[q]);
        else { col[vo * 4] = cc[0]; col[vo * 4 + 1] = cc[1]; col[vo * 4 + 2] = cc[2]; col[vo * 4 + 3] = a ? 255 : 0; }
        weld[vo] = nw + p.weld[i];
      }
      if (h.cards) cardsAt.push([o, p.n, h]);
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
    // hair cards shade as one soft volume: normals mostly radial from the head centre (midpoint of the ear-to-ear scale vertices)
    for (const [o0, cnt, h] of cardsAt) {
      const [a, b] = h.scale[0], cx = (P[a * 3] + P[b * 3]) / 2, cy = (P[a * 3 + 1] + P[b * 3 + 1]) / 2 + .02, cz = (P[a * 3 + 2] + P[b * 3 + 2]) / 2 + .01;
      for (let i = o0; i < o0 + cnt; i++) {
        const q = i * 3; let x = pos[q] - cx, y = pos[q + 1] - cy, z = pos[q + 2] - cz; const l = Math.hypot(x, y, z) || 1;
        x = x / l * .8 + nrm[q] * .2; y = y / l * .8 + nrm[q + 1] * .2; z = z / l * .8 + nrm[q + 2] * .2; const m = Math.hypot(x, y, z) || 1;
        nrm[q] = x / m; nrm[q + 1] = y / m; nrm[q + 2] = z / m;
      }
    }
    if (B) groups.push(groups[2]);                              // soft strand edges only up close; the distance mesh keeps the cut pass
    const idx = new (n > 65535 ? Uint32Array : Uint16Array)(groups.reduce((s, G) => s + G.length, 0));
    const geo = new THREE.BufferGeometry(); let at = 0;
    groups.forEach((G, gi) => { idx.set(G, at); if (G.length) geo.addGroup(at, G.length, gi); at += G.length; });
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4, true)); geo.setAttribute('color', new THREE.BufferAttribute(col, 4, true));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    return { geo, n, tris: idx.length / 3 };
  }
  const farOf = (look) => { const X = D.index[look.g], e = (l) => l && (l.lo || l.file); return [['top', e(X.top[look.tp])], ['bot', e(X.bot[look.bt])], ['shoe', e(X.shoe[look.sh])], ['hair', e(X.hair[look.hs])], ['brow', X.brow]].filter((x) => x[1]); };
  async function whenCrowd() {
    for (;;) {
      const g = window.__game;
      if (!g) return;
      const layer = document.getElementById('layer');
      const sheet = layer && !layer.hidden;
      const k = g.keys;
      const moving = window.__moving || (k && (k.KeyW || k.KeyA || k.KeyS || k.KeyD || (g.joy && (g.joy.x || g.joy.y))));
      const busy = !g.playerReady || moving || window.__watch || sheet;
      if (busy) window.__crowdAt = performance.now() + 2000;
      if (!busy && performance.now() >= (window.__crowdAt || 0)) return;
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  async function build(look) {
    const tok = ++av.tok; await gate;
    const X = D.index[look.g];
    const lite = PHONE && !av._close && !av._full;
    const want = lite ? [] : [['body', X.body], ['eye', D.index.eye], ['brow', X.brow], ['lash', X.lash], ['top', X.top[look.tp].file], ['bot', X.bot[look.bt].file], ['shoe', X.shoe[look.sh].file], ['hair', X.hair[look.hs].file]].filter((x) => x[1]);
    const [F, C, M, ps, lo] = await Promise.all([fam(look.g), core(look.g, !lite), mats(), Promise.all(want.map((x) => part(x[1]))), Promise.all([part(X.lod), part(D.index.eyeLo), ...farOf(look).map((x) => part(x[1]))])]);
    if (tok !== av.tok) return false;
    await turn(); if (tok !== av.tok) return false;
    if (!av._lead) await whenCrowd(); if (tok !== av.tok) return false;
    av.C = C; if (av.fam !== F) newRig(F);
    const S = blend(C, shapeWeights(look)), P = S.P; av.H = S.H; av.feat = faceRegions(C).counts; applyFeatures(P, C, look);
    fitRig(F, S.J);
    av.F = Object.assign(Object.create(F), { vWalk: F.vWalk * av.k, vRun: F.vRun * av.k });
    if (av._shared) { lodMesh.geometry = new THREE.BufferGeometry(); av._shared = false; }
    if (lite) {
      const mean = [0.5, 0.35, 0.28], cover = new Uint8Array(C.nv);
      const skc = lin(SKIN_ALBEDO[look.sk] || SKIN_ALBEDO[6]).map((t) => Math.round(clamp(t / SKIN_MUL, 0, 1) * 255));
      const far = farOf(look).map((x, i) => [x[0], lo[i + 2]]);
      const A1 = assemble(look, P, C, cover, null, [['lod', lo[0]], ['eye', lo[1]], ...far], (look.ag === 3 ? 2 : 0) + (look.sk >= 9 ? 1 : 0), skc, mean);
      const mt = [M.skin[look.g], M.cloth, M.hair, M.eye, M.hairSoft];
      mesh.geometry.dispose(); mesh.geometry = A1.geo; lodMesh.geometry = A1.geo; av._shared = true;
      for (const m of [mesh, lodMesh]) { m.material = mt; m.boundingSphere.center.set(0, S.H * .5, 0); m.boundingSphere.radius = S.H * .8; }
      if (!lod.parent) root.add(lod);
      av.tris = A1.tris; av.trisLod = A1.tris; av.verts = A1.n; mesh.visible = true;
      queueFull(av);
      return true;
    }
    // which body vertices the clothes hide
    const cover = new Uint8Array(C.nv); ps.forEach((p, i) => { if (p.del && want[i][0] !== 'eye') for (const v of p.del) cover[v] = 1; });
    if (!look.tc) look = { ...look, tc: TOPDEF[X.top[look.tp].src] || 0 };
    const Cc = D.colors, B = ps[0], tile = (look.ag === 3 ? 2 : 0) + (look.sk >= 9 ? 1 : 0), tone = lin(Cc.skin[look.sk][1]), mean = B.h.mean[tile];
    // the swatch picks a real skin albedo (SKIN_ALBEDO); the tile is tinted so its face mean lands on it
    const skc = lin(SKIN_ALBEDO[look.sk] || SKIN_ALBEDO[6]).map((t, i) => Math.round(clamp(t / Math.max(mean[i], 1e-3) / SKIN_MUL, 0, 1) * 255));
    const parts = want.slice(1).map((x, i) => [x[0], ps[i + 1]]), far = farOf(look).map((x, i) => [x[0], lo[i + 2]]);
    const A0 = assemble(look, P, C, cover, B, parts, tile, skc, mean), A1 = assemble(look, P, C, cover, null, [['lod', lo[0]], ['eye', lo[1]], ...far], tile, skc, mean);
    const mt = [M.skin[look.g], M.cloth, M.hair, M.eye, M.hairSoft];
    mesh.geometry.dispose(); mesh.geometry = A0.geo; mesh.material = mt;
    lodMesh.geometry.dispose(); lodMesh.geometry = A1.geo; lodMesh.material = mt;
    for (const m of [mesh, lodMesh]) { m.boundingSphere.center.set(0, S.H * .5, 0); m.boundingSphere.radius = S.H * .8; }
    if (!lod.parent) root.add(lod);
    av.tris = A0.tris; av.trisLod = A1.tris; av.verts = A0.n; mesh.visible = true;
    return true;
  }
  function shape(look) {
    const sc = look.h / 100 / av.H; av.sc = sc; root.scale.setScalar(sc);
    av.lean = look.ag === 3 ? .08 : 0; av.rate = look.ag === 3 ? .88 : look.ag === 0 ? 1.05 : 1;
  }
  av.set = async (look) => { look = fixLook(look); const ok = await build(look); if (!ok) return false; shape(look); av.look = look; return true; };
  av.wave = () => { if (av.sitW > .2 || av.waveT > 0 || !av.act) return; const a = av.act.wave; a.reset(); a.paused = false; a.play(); av.waveT = a.getClip().duration; };
  av.setSeat = (y) => { av.seatY = y; };
  // speed: ground speed in m/s the body is really moving at; sit: bool.  Foot speed is matched to the clip, so feet do not slide.
  av.update = (dt, speed = 0, sit = false) => {
    if (!av.mixer || !av.look) return; const F = av.F, sc = av.sc, w = av.w, A = av.act, vw = F.vWalk * sc * av.rate, vr = F.vRun * sc * av.rate;
    av.sitW = clamp(av.sitW + (sit ? dt / .5 : -dt / .5), 0, 1); if (sit) speed = 0;
    av.waveT = Math.max(0, av.waveT - dt); const wv = av.waveT > .25 && !sit ? 1 : 0;
    const m = clamp((speed - .1) / .5, 0, 1), r = clamp((speed - vw * 1.15) / Math.max(.3, vr * .85 - vw * 1.15), 0, 1), s = r * r * (3 - 2 * r), k = Math.min(1, dt * 9);
    const T = { idle: (1 - m) * (1 - wv), walk: m * (1 - s) * (1 - wv), run: m * s * (1 - wv), wave: wv };
    for (const n in T) w[n] += (T[n] - w[n]) * k;
    const dir = av.back ? -1 : 1;   // walking backwards plays the clip in reverse
    A.walk.timeScale = dir * clamp(speed / vw, .35, 1.7); A.run.timeScale = dir * clamp(speed / vr, .5, 1.5);
    for (const n of ['idle', 'walk', 'run', 'wave']) { const on = w[n] > 0.04; A[n].enabled = on; A[n].setEffectiveWeight(on ? w[n] : 0); }   // a zero-weight clip still fights the spine if it stays enabled
    if (w.walk > .02 && w.run > .02 && w.run < .98) A.run.time = A.walk.time / A.walk.getClip().duration * A.run.getClip().duration;
    av.mixer.update(dt); post();
  };
  const deltaQ = (bn, dq, out) => { armQ(bn.parent, _q1).invert(); armQ(bn, _q2); return out.copy(_q1).multiply(dq).multiply(_q2); };
  // The mixer skips writing a bone whose clip value did not change. Multiplying that bone every frame spins it. Undo last frame's delta first.
  function applyBone(bone, slot, angle, axis) {
    if (!bone) return; const hold = av._hold || (av._hold = {}), prev = hold[slot];
    if (prev && Math.abs(bone.quaternion.dot(prev.q)) > 0.999) bone.quaternion.multiply(prev.inv);
    if (!angle) { delete hold[slot]; return; }
    _q3.setFromAxisAngle(axis || AX, angle); const local = deltaQ(bone, _q3, new THREE.Quaternion()); bone.quaternion.multiply(local);
    hold[slot] = { q: bone.quaternion.clone(), inv: local.clone().invert() };
  }
  // feet hang off the shins (the Quaternius foot bones are free, so they follow the forward-kinematic ankle)
  function placeFeet() {
    const b = av.bones; _m1.compose(b.Body.position, b.Body.quaternion, ONE);
    ['L', 'R'].forEach((s, i) => {
      _m2.copy(_m1).multiply(_mT(b['UpperLeg.' + s])).multiply(_mT(b['LowerLeg.' + s]));
      b['Foot.' + s].position.copy(_v1.copy(av.ankle[i]).applyMatrix4(_m2));
    });
  }
  const _mt = new THREE.Matrix4(), _mT = (o) => _mt.compose(o.position, o.quaternion, ONE);
  function post() {                                        // after the mixer: hip bob for this body, elder stoop, poses, sitting, then the feet
    const b = av.bones, close = av.pose === 'kiss' || av.pose === 'hug', kneel = av.pose === 'kneel';
    lodMesh.castShadow = mesh.castShadow;
    b.Body.position.copy(av.bodyQ.position).sub(av.fam.bodyRestQ).multiplyScalar(av.k).add(av.bodyRest);
    if (kneel) b.Body.position.y -= .42 * av.k;
    applyBone(b.Chest, 'lean', av.pose ? 0 : (av.lean || 0));
    applyBone(b['UpperLeg.L'], 'kneelL', kneel ? -1.05 : 0); applyBone(b['UpperLeg.R'], 'kneelR', kneel ? -1.05 : 0);
    applyBone(b.Chest, 'kiss', close ? 0.32 : 0);
    applyBone(b['UpperArm.L'], 'armL', close ? -0.7 : 0); applyBone(b['UpperArm.R'], 'armR', close ? -0.7 : 0);
    applyBone(b.Hips, 'dance', av.pose === 'dance' ? Math.sin(performance.now() / 160) * 0.18 : 0, AZ);
    if (av.sitW > .001) {
      const w = av.sitW, e = w * w * (3 - 2 * w), shin = ['L', 'R'].map((s) => armQ(b['LowerLeg.' + s], new THREE.Quaternion()));
      b.Body.position.y -= e * Math.max(0, av.hipY - Math.max(av.kneeY, av.seatY / av.sc + .08 * av.k));
      ['L', 'R'].forEach((s, i) => { const th = b['UpperLeg.' + s], sh = b['LowerLeg.' + s];
        th.quaternion.slerp(deltaQ(th, QX, new THREE.Quaternion()), e); sh.quaternion.copy(armQ(th, _q1).invert().multiply(shin[i])); });
    }
    placeFeet();
  }
  av.dispose = () => { av.tok++; av.mesh.geometry.dispose(); if (av.skeleton) av.skeleton.dispose(); if (av.root.parent) av.root.parent.remove(av.root); };
  if (look0) { const p = av.set(look0); av.built = p; av.ready = D.open ? p : Promise.resolve(true); } else av.ready = av.built = Promise.resolve(true);
  return av;
}
