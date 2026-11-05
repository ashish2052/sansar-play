// Sansar player vehicles (17 Oct 2026): a road bicycle, a 150cc commuter motorbike and a small right-hand-drive hatchback, all built in code.
// Arcade feel: acceleration and brake curves, speed-dependent steering, lean on two wheels, roll, pitch and bob on the car, skids, reverse.
// The rider is posed with two-bone IK on the people rig and fitted to each body (saddle height, torso lean, seat slide, column reach).
// Sound is synthesised with WebAudio (no files) and stays silent until the first tap or key press.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const V3 = THREE.Vector3, Q = THREE.Quaternion, UP = new V3(0, 1, 0), AXX = new V3(1, 0, 0);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const damp = (k, dt) => 1 - Math.exp(-k * dt);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const at = (o, d, t) => [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t];
const KMH = 3.6;

// top in m/s; a0 launch acceleration (m/s^2) fading as (v/top)^ap; coast = engine braking + rolling; rad = collision radius
export const SPEC = {
  cycle: { kind: 'cycle', label: 'cycle', top: 25 / KMH, a0: 1.55, ap: 2.2, brake: 4.6, coast: .2, rev: 4 / KMH, wb: .98, steer: .6, steerV: 3.6, steerRate: 4.5, lean: .55, grip: 6.4, rad: .42, back: .3, pull: .9, fov: 3, crash: 7.5, fuel: 0, park: -.22, half: [.3, .9] },
  moto: { kind: 'moto', label: 'motorbike', top: 90 / KMH, a0: 4.6, ap: 1.7, brake: 7.6, coast: .85, rev: 5 / KMH, wb: 1.33, steer: .5, steerV: 5.5, steerRate: 4, lean: .78, grip: 8.8, rad: .55, back: .8, pull: 2.6, fov: 8, crash: 9.5, fuel: .07, park: -.38, gears: [0, 15, 27, 40, 56, 72, 94], idle: 1400, red: 9500, half: [.4, 1.05] },
  car: { kind: 'car', label: 'car', top: 110 / KMH, a0: 4.2, ap: 2.6, brake: 8.6, coast: .7, rev: 16 / KMH, wb: 2.43, steer: .56, steerV: 6.8, steerRate: 2.8, lean: 0, grip: 8.2, rad: .86, back: 1.4, pull: 2.9, fov: 9, crash: 14, fuel: .2, park: 0, gears: [0, 24, 44, 68, 92, 118], idle: 850, red: 6300, half: [.88, 1.95] },
};

// ------------------------------------------------------------------ geometry helpers (geometries come out pre-transformed, so they merge)
function rodGeo(a, b, r0, r1 = r0, rs = 10) {
  const A = new V3(...a), B = new V3(...b), d = B.clone().sub(A), len = Math.max(1e-4, d.length());
  const g = new THREE.CylinderGeometry(r1, r0, len, rs, 1);
  g.applyQuaternion(new Q().setFromUnitVectors(UP, d.normalize())); g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2); return g;
}
function xf(g, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] } = {}) {
  return g.applyMatrix4(new THREE.Matrix4().compose(new V3(...p), new Q().setFromEuler(new THREE.Euler(...r)), new V3(...s)));
}
const boxGeo = (w, h, d, p, r) => xf(new THREE.BoxGeometry(w, h, d), { p, r });
const tubeGeo = (pts, r, seg = 24, rs = 8) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new V3(...p)), false, 'centripetal'), seg, r, rs, false);
const latheGeo = (pts, seg = 24) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
function barXZ(a, b, w, t) {   // flat spoke in the wheel plane (lathe space: axle = Y)
  const dx = b[0] - a[0], dz = b[2] - a[2], len = Math.hypot(dx, dz); const g = new THREE.BoxGeometry(len, t, w);
  g.rotateY(-Math.atan2(dz, dx)); g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); return g;
}
function patchGeo(c, nu, nv, bow = 0, n = null) {   // bilinear patch over 4 corners [00,10,01,11], bowed along n
  const g = new THREE.PlaneGeometry(1, 1, nu, nv), p = g.attributes.position, C = c.map((x) => new V3(...x)), N = n ? new V3(...n) : null, a = new V3(), b = new V3(), q = new V3();
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) + .5, v = p.getY(i) + .5; a.lerpVectors(C[0], C[1], u); b.lerpVectors(C[2], C[3], u); q.lerpVectors(a, b, v);
    if (N && bow) q.addScaledVector(N, bow * (1 - (2 * u - 1) ** 2) * (1 - .6 * (2 * v - 1) ** 2)); p.setXYZ(i, q.x, q.y, q.z);
  }
  g.computeVertexNormals(); return g;
}
function tyrePts(R, hr, hw, p) {   // superellipse tyre section, outer side rising so the lathe normals face out
  const out = [], rc = R - hr, N = 24;
  for (let i = 0; i <= N; i++) { const t = -Math.PI / 2 + (i / N) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t); out.push([rc + hr * Math.sign(c) * Math.abs(c) ** (2 / p), hw * Math.sign(s) * Math.abs(s) ** (2 / p)]); }
  return out;
}
function norm(g) {
  const x = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(x.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') x.deleteAttribute(k);
  if (!x.attributes.normal) x.computeVertexNormals();
  if (!x.attributes.uv) x.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(x.attributes.position.count * 2), 2));
  return x;
}
function parts() {   // collect geometry per material, then one mesh per material
  const m = new Map();
  return {
    add(mat, g) { if (!m.has(mat)) m.set(mat, []); m.get(mat).push(g); return g; },
    bake(grp, shadow = true) {
      for (const [mat, gs] of m) { const mesh = new THREE.Mesh(mergeGeometries(gs.map(norm), false), mat); mesh.castShadow = shadow && !mat.transparent; mesh.receiveShadow = !mat.transparent; grp.add(mesh); }
      m.clear(); return grp;
    }
  };
}
function plateTex(text) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 80; const g = c.getContext('2d');
  g.fillStyle = '#b3141b'; g.fillRect(0, 0, 256, 80); g.strokeStyle = '#f4f1ea'; g.lineWidth = 5; g.strokeRect(5, 5, 246, 70);
  g.fillStyle = '#f4f1ea'; g.font = '700 36px Segoe UI, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 42);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function poolTex() {   // headlight pool on the road (additive)
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 230, 4, 64, 150, 150); gr.addColorStop(0, 'rgba(255,240,205,1)'); gr.addColorStop(.45, 'rgba(255,232,190,.45)'); gr.addColorStop(1, 'rgba(255,230,190,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function makeMats() {
  const S = (o) => new THREE.MeshStandardMaterial(o);
  return {
    chrome: S({ color: 0xf2f4f6, metalness: 1, roughness: .12 }), alu: S({ color: 0xc6c9cd, metalness: 1, roughness: .3 }), gun: S({ color: 0x3b3e43, metalness: .85, roughness: .36 }),
    black: S({ color: 0x121315, metalness: .35, roughness: .42 }), plastic: S({ color: 0x1c1d20, metalness: 0, roughness: .6 }), rubber: S({ color: 0x141414, metalness: 0, roughness: .92 }),
    tape: S({ color: 0x17171a, roughness: .85 }), leather: S({ color: 0x17130f, roughness: .5 }), fabric: S({ color: 0x2d3036, roughness: .95 }), carpet: S({ color: 0x1b1c1f, roughness: 1 }),
    spoke: S({ color: 0x9da2a8, metalness: 1, roughness: .35 }), engine: S({ color: 0x8f9296, metalness: .85, roughness: .45 }), fins: S({ color: 0x2a2c2f, metalness: .6, roughness: .5 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x1c2a31, metalness: 0, roughness: .03, transparent: true, opacity: .34, depthWrite: false, envMapIntensity: 1.6, side: THREE.DoubleSide }),
    visor: new THREE.MeshPhysicalMaterial({ color: 0x2a3036, metalness: 0, roughness: .05, transparent: true, opacity: .55, depthWrite: false, side: THREE.DoubleSide }),
    mirror: S({ color: 0xe4eaee, metalness: 1, roughness: .03 }), amber: S({ color: 0xd98a1c, emissive: 0x7a4300, emissiveIntensity: .2, roughness: .25, metalness: .1 }),
    reflector: S({ color: 0x9d1a12, emissive: 0x3a0000, emissiveIntensity: .4, roughness: .3 }), bottle: S({ color: 0xdfe4e6, roughness: .45 }), caliper: S({ color: 0x9a1b1b, metalness: .4, roughness: .4 }),
    gold: S({ color: 0xc9a14a, metalness: .9, roughness: .3 }), screen: S({ color: 0x0c1a22, emissive: 0x2a7fa8, emissiveIntensity: .35, roughness: .3 }),
  };
}
function lampMats() {   // per vehicle, so one bike's brake light does not light another's
  return {
    head: new THREE.MeshStandardMaterial({ color: 0xe9edf0, metalness: .55, roughness: .12, emissive: 0xfff1d8, emissiveIntensity: 0 }),
    tail: new THREE.MeshStandardMaterial({ color: 0x6a0a0a, metalness: .2, roughness: .25, emissive: 0xff1608, emissiveIntensity: 0 }),
    brake: new THREE.MeshStandardMaterial({ color: 0x4a0606, metalness: .2, roughness: .25, emissive: 0xff1608, emissiveIntensity: 0 }),
    rev: new THREE.MeshStandardMaterial({ color: 0xdfe2e4, metalness: .3, roughness: .2, emissive: 0xffffff, emissiveIntensity: 0 }),
  };
}
const paintMat = (hex, side) => new THREE.MeshPhysicalMaterial({ color: hex, metalness: .22, roughness: .42, clearcoat: .85, clearcoatRoughness: .1, envMapIntensity: .55, side: side || THREE.FrontSide });

// a wheel: spin group (rotates about X) holding an inner group in lathe space (axle = Y, +Y -> right side)
function wheelGroup(build) { const spin = new THREE.Group(), inner = new THREE.Group(); inner.rotation.z = Math.PI / 2; spin.add(inner); build(inner); return spin; }
function bikeWheel(M, R, rear) {
  return wheelGroup((g) => {
    const P = parts();
    P.add(M.rubber, latheGeo(tyrePts(R, .0145, .0125, 2.2), 44));
    P.add(M.black, latheGeo([[R - .052, -.004], [R - .03, -.0105], [R - .0135, -.0105], [R - .0135, .0105], [R - .03, .0105], [R - .052, .004], [R - .052, -.004]], 44));
    P.add(M.alu, latheGeo([[.006, -.056], [.021, -.05], [.022, -.038], [.013, -.032], [.013, .032], [.022, .038], [.021, .05], [.006, .056]], 16));
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, s = i % 2 ? 1 : -1, ta = rear ? a + s * .24 : a; P.add(M.spoke, rodGeo([Math.cos(ta) * .02, s * .036, Math.sin(ta) * .02], [Math.cos(a) * (R - .05), s * .002, Math.sin(a) * (R - .05)], .0012, .0012, 4)); }
    if (rear) for (let k = 0; k < 9; k++) P.add(M.gun, xf(new THREE.CylinderGeometry(.052 - k * .0035, .052 - k * .0035, .0018, 22), { p: [0, .018 + k * .0032, 0] }));
    P.bake(g);
  });
}
function motoWheel(M, R, rear) {
  return wheelGroup((g) => {
    const P = parts(), rimR = .216, hw = rear ? .05 : .041;
    P.add(M.rubber, latheGeo(tyrePts(R, (R - rimR + .006) / 2, hw, 2.6), 40));
    P.add(M.black, latheGeo([[rimR - .03, -hw * .8], [rimR + .004, -hw * .85], [rimR + .008, -hw * .7], [rimR - .004, -hw * .55], [rimR - .004, hw * .55], [rimR + .008, hw * .7], [rimR + .004, hw * .85], [rimR - .03, hw * .8], [rimR - .03, -hw * .8]], 40));
    P.add(M.alu, latheGeo([[rimR + .0005, -hw * .9], [rimR + .009, -hw * .72], [rimR + .009, -hw * .66], [rimR + .0005, -hw * .62]], 40));
    P.add(M.alu, latheGeo([[rimR + .0005, hw * .62], [rimR + .009, hw * .66], [rimR + .009, hw * .72], [rimR + .0005, hw * .9]], 40));
    for (let k = 0; k < 5; k++) {
      const a = k / 5 * Math.PI * 2, pt = (r, aa) => [Math.cos(aa) * r, 0, Math.sin(aa) * r];
      P.add(M.black, barXZ(pt(.05, a), pt(.135, a), .024, .016)); P.add(M.black, barXZ(pt(.13, a), pt(rimR - .026, a + .17), .016, .013)); P.add(M.black, barXZ(pt(.13, a), pt(rimR - .026, a - .17), .016, .013));
    }
    P.add(M.engine, latheGeo([[.01, -.065], [.055, -.06], [.06, -.03], [.045, -.02], [.045, .02], [.06, .03], [.055, .06], [.01, .065]], 20));
    if (rear) { P.add(M.engine, latheGeo([[.02, .045], [.085, .05], [.088, .075], [.02, .08]], 24)); P.add(M.gun, xf(new THREE.CylinderGeometry(.1, .1, .006, 30), { p: [0, -.068, 0] })); }
    else { P.add(M.alu, xf(new THREE.CylinderGeometry(.13, .13, .005, 36), { p: [0, .062, 0] })); P.add(M.gun, xf(new THREE.CylinderGeometry(.085, .085, .007, 24), { p: [0, .062, 0] })); }
    P.bake(g);
  });
}
function carWheel(M, R) {
  return wheelGroup((g) => {
    const P = parts(), rimR = .178, hw = .088;
    P.add(M.rubber, latheGeo(tyrePts(R, (R - rimR + .01) / 2, hw, 3.4), 40));
    P.add(M.alu, latheGeo([[rimR - .02, -hw * .8], [rimR + .006, -hw * .82], [rimR + .012, -hw * .7], [rimR, -hw * .6], [rimR, hw * .55], [rimR + .012, hw * .66], [rimR + .008, hw * .8], [rimR - .03, hw * .74], [rimR - .03, -hw * .8]], 36));
    P.add(M.gun, latheGeo([[.0, hw * .5], [.06, hw * .52], [.062, hw * .38], [.04, hw * .2], [.01, hw * .2]], 20));
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, r0 = .055, r1 = rimR - .02; P.add(M.alu, barXZ([Math.cos(a) * r0, hw * .55, Math.sin(a) * r0], [Math.cos(a) * r1, hw * .62, Math.sin(a) * r1], k % 2 ? .02 : .028, .022)); }
    P.add(M.alu, latheGeo([[.0, hw * .66], [.035, hw * .64], [.05, hw * .55], [.06, hw * .52]], 20));
    P.add(M.gun, xf(new THREE.CylinderGeometry(.13, .13, .02, 30), { p: [0, -.01, 0] }));
    P.bake(g);
  });
}

// ------------------------------------------------------------------ the three models. Local frame: +Z forward, +Y up, +X is the rider's LEFT.
function buildCycle(M, hex) {
  const L = lampMats(), paint = paintMat(hex), root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const R = .336, RA = [0, R, -.49], FA = [0, R, .49], BB = [0, .272, -.08], sd = [0, .9588, -.284], hd = [0, .9563, -.2924], hn = [0, .2924, .9563];
  const A0 = at(FA, hn, -.045), crown = at(A0, hd, .368), HB = at(A0, hd, .385), HT = at(A0, hd, .54), STT = at(BB, sd, .52);
  const F = parts();
  F.add(paint, rodGeo(HB, HT, .021, .0195, 16));
  F.add(paint, rodGeo(at(STT, sd, -.03), at(HT, hd, -.035), .0145, .0165, 12));
  F.add(paint, rodGeo([0, BB[1] + .015, BB[2] + .02], at(HB, hd, .015), .0245, .021, 14));
  F.add(paint, rodGeo(at(BB, sd, -.01), STT, .0175, .0155, 12));
  for (const s of [-1, 1]) {
    F.add(paint, rodGeo([s * .016, STT[1] - .03, STT[2] + .008], [s * .063, RA[1] + .012, RA[2] + .012], .0088, .0072, 8));
    F.add(paint, rodGeo([s * .034, BB[1], BB[2] - .02], [s * .064, RA[1] - .004, RA[2] + .012], .011, .0078, 8));
  }
  F.add(paint, xf(new THREE.CylinderGeometry(.022, .022, .074, 16), { p: BB, r: [0, 0, Math.PI / 2] }));
  F.add(M.black, boxGeo(.05, .028, .02, [0, .655, -.27], [-.3, 0, 0]));
  const dd = new V3(0, .70 - .287, .334 + .06).normalize(), dm = new V3(0, .44, .1), bc = dm.clone().add(new V3(0, dd.z, -dd.y).multiplyScalar(.046));
  F.add(M.bottle, rodGeo(bc.clone().addScaledVector(dd, -.095).toArray(), bc.clone().addScaledVector(dd, .085).toArray(), .034, .034, 16));
  F.add(M.black, rodGeo(bc.clone().addScaledVector(dd, .085).toArray(), bc.clone().addScaledVector(dd, .11).toArray(), .02, .015, 12));
  // drivetrain on the right (-X): chain runs, derailleur, chainring and spider live on the crank
  F.add(M.gun, rodGeo([-.066, BB[1] + .104, BB[2]], [-.05, RA[1] + .046, RA[2]], .0042, .0042, 5));
  F.add(M.gun, rodGeo([-.066, BB[1] - .104, BB[2]], [-.056, RA[1] - .07, RA[2] + .02], .0042, .0042, 5));
  F.add(M.gun, boxGeo(.02, .07, .03, [-.062, RA[1] - .045, RA[2] + .012], [.2, 0, 0]));
  const stand = new THREE.Group(); body.add(stand);
  { const SP = parts(); SP.add(M.black, rodGeo([.045, .262, -.16], [.16, .006, -.27], .007, .006, 6)); SP.bake(stand); }
  F.bake(body);
  // saddle on a seatpost that slides along the seat tube (bike fit)
  const seat = new THREE.Group(); seat.position.set(...STT); body.add(seat);
  { const P = parts(); P.add(M.black, rodGeo(at([0, 0, 0], sd, -.24), at([0, 0, 0], sd, .02), .0135, .0135, 12));
    const sg = new THREE.SphereGeometry(1, 28, 14), p = sg.attributes.position;
    for (let i = 0; i < p.count; i++) { let x = p.getX(i) * .072, y = p.getY(i) * .024, z = p.getZ(i) * .138; if (z > 0) x *= 1 - .64 * (z / .138); if (y < 0) y *= .45; p.setXYZ(i, x, y + .052, z + .008); }
    sg.computeVertexNormals(); P.add(M.leather, sg);
    for (const s of [-1, 1]) P.add(M.alu, rodGeo([s * .022, .03, -.09], [s * .016, .03, .1], .0035, .0035, 5));
    P.add(M.black, boxGeo(.026, .045, .022, [0, -.03, -.03])); P.add(L.tail, boxGeo(.02, .032, .006, [0, -.03, -.042]));
    P.bake(seat); }
  // steering: head frame tilted to the head angle, steer spins about its local Y
  const head = new THREE.Group(); head.position.set(...HT); head.rotation.x = -Math.asin(.2924); const steer = new THREE.Group(); head.add(steer); body.add(head);
  head.updateMatrix(); const inv = head.matrix.clone().invert(); const toS = (g) => g.applyMatrix4(inv);
  { const P = parts(), top = at(HT, hd, .065), SE = [0, .905, .352];
    P.add(M.black, toS(rodGeo(HT, top, .0175, .0175, 12))); P.add(M.black, toS(rodGeo(top, SE, .017, .015, 12)));
    P.add(M.black, toS(boxGeo(.045, .04, .03, SE)));
    P.add(paint, toS(boxGeo(.095, .032, .05, [0, crown[1] + .008, crown[2] + .004], [-.3, 0, 0])));
    for (const s of [-1, 1]) {
      P.add(paint, toS(rodGeo([s * .046, crown[1] - .005, crown[2] + .005], [s * .05, FA[1], FA[2]], .0135, .0075, 10)));
      const bar = [[0, .905, .352], [s * .12, .905, .352], [s * .186, .906, .357], [s * .205, .905, .386], [s * .21, .893, .414], [s * .21, .858, .43], [s * .21, .82, .416], [s * .21, .792, .387], [s * .21, .787, .342]];
      P.add(M.tape, toS(tubeGeo(bar, .0125, 26, 8)));
      P.add(M.rubber, toS(xf(new THREE.CapsuleGeometry(.0165, .035, 4, 10), { p: [s * .207, .923, .41], r: [1.25, 0, 0] })));
      P.add(M.black, toS(rodGeo([s * .207, .912, .43], [s * .205, .815, .445], .006, .005, 6)));
    }
    P.add(M.black, toS(boxGeo(.05, .026, .02, [0, crown[1] - .02, crown[2] + .035])));
    P.add(M.black, toS(boxGeo(.03, .03, .05, [.07, .907, .37]))); P.add(L.head, toS(boxGeo(.024, .022, .004, [.07, .907, .396])));
    P.bake(steer); }
  const crank = new THREE.Group(); crank.position.set(...BB); body.add(crank);
  const pedals = [];
  { const P = parts();
    P.add(M.gun, xf(latheGeo([[.07, -.0025], [.106, -.0025], [.106, .0025], [.07, .0025], [.07, -.0025]], 48), { p: [-.066, 0, 0], r: [0, 0, Math.PI / 2] }));
    for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + .4; P.add(M.black, rodGeo([-.07, 0, 0], [-.07, Math.cos(a) * .075, Math.sin(a) * .075], .008, .006, 6)); }
    P.add(M.black, rodGeo([-.088, 0, 0], [-.088, -.172, 0], .011, .0085, 8)); P.add(M.black, rodGeo([.088, 0, 0], [.088, .172, 0], .011, .0085, 8));
    P.add(M.alu, rodGeo([-.09, 0, 0], [.09, 0, 0], .009, .009, 10)); P.bake(crank);
    for (const s of [-1, 1]) { const pg = new THREE.Group(); pg.position.set(s * .118, s * .172, 0); crank.add(pg); const Q2 = parts(); Q2.add(M.black, boxGeo(.065, .016, .085, [s * .01, 0, 0])); Q2.add(M.alu, rodGeo([-s * .03, 0, 0], [s * .03, 0, 0], .005, .005, 6)); Q2.bake(pg); pedals.push(pg); }
  }
  const wr = bikeWheel(M, R, true), wf = bikeWheel(M, R, false); wr.position.set(...RA); body.add(wr);
  const fw = new V3(...FA).applyMatrix4(inv); wf.position.copy(fw); steer.add(wf);
  const gripL = new V3(.2, .938, .403).applyMatrix4(inv), gripR = new V3(-.2, .938, .403).applyMatrix4(inv);
  return { root, body, steer: [steer], wheels: [{ g: wr, R, s: 1 }, { g: wf, R, s: 1 }], crank, pedals, stand, seat, lamps: L, paint, rig: { sd, STT, BB, gripL, gripR, seatTop: [0, .074, .002] } };
}

function buildMoto(M, hex) {
  const L = lampMats(), paint = paintMat(hex), paint2 = paintMat(hex, THREE.DoubleSide), root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const R = .298, RA = [0, R, -.63], FA = [0, R, .70], hd = [0, .8988, -.4384], hn = [0, .4384, .8988], A0 = at(FA, hn, -.025), HS = at(A0, hd, .63);
  const F = parts();
  // frame, engine, exhaust, swingarm, shocks, chain, pegs
  F.add(M.black, rodGeo(at(A0, hd, .5), at(A0, hd, .72), .032, .032, 14));
  F.add(M.black, tubeGeo([at(A0, hd, .64), [0, .80, .32], [0, .73, .06], [0, .62, -.1]], .024, 16, 8));
  F.add(M.black, tubeGeo([at(A0, hd, .52), [0, .55, .38], [0, .38, .3]], .022, 12, 8));
  for (const s of [-1, 1]) F.add(M.black, tubeGeo([[s * .07, .66, -.12], [s * .1, .72, -.38], [s * .09, .76, -.62]], .014, 12, 6));
  F.add(M.engine, boxGeo(.27, .25, .38, [0, .40, .03])); F.add(M.engine, boxGeo(.24, .08, .3, [0, .3, .0]));
  F.add(M.alu, xf(latheGeo([[.0, .0], [.1, .0], [.118, .012], [.11, .03], [.06, .045], [0, .05]], 28), { p: [.135, .41, .0], r: [0, 0, -Math.PI / 2] }));
  F.add(M.alu, xf(latheGeo([[.0, .0], [.085, .0], [.1, .012], [.09, .028], [.05, .04], [0, .044]], 28), { p: [-.135, .42, .1], r: [0, 0, Math.PI / 2] }));
  const cyl = (y) => [0, .5 + y * .9659, .2 + y * .2588];
  F.add(M.engine, rodGeo(cyl(0), cyl(.2), .07, .066, 18));
  for (let k = 0; k < 8; k++) F.add(M.fins, xf(new THREE.BoxGeometry(.19, .007, .17), { p: cyl(.02 + k * .023), r: [.26, 0, 0] }));
  F.add(M.engine, xf(new THREE.BoxGeometry(.17, .07, .15), { p: cyl(.235), r: [.26, 0, 0] }));
  F.add(M.black, boxGeo(.12, .1, .12, [0, .62, .03])); F.add(M.black, boxGeo(.16, .14, .2, [0, .66, -.16]));
  const ex = [[0, .55, .3], [-.02, .42, .37], [-.08, .26, .26], [-.13, .23, .02], [-.16, .28, -.22]];
  F.add(M.chrome, tubeGeo(ex, .021, 28, 10));
  F.add(M.black, rodGeo([-.165, .29, -.2], [-.19, .44, -.68], .056, .046, 18)); F.add(M.chrome, rodGeo([-.19, .44, -.68], [-.193, .45, -.72], .04, .028, 14));
  F.add(M.chrome, rodGeo([-.215, .33, -.3], [-.232, .41, -.58], .022, .02, 10));
  for (const s of [-1, 1]) {
    F.add(M.gun, rodGeo([s * .11, .44, -.07], [s * .115, R, RA[2]], .021, .017, 8));
    F.add(M.chrome, rodGeo([s * .125, .33, -.54], [s * .125, .73, -.44], .009, .009, 8));
    const hel = []; for (let i = 0; i <= 90; i++) { const t = i / 90, a = t * Math.PI * 2 * 9; hel.push([s * .125 + Math.cos(a) * .026, .42 + t * .26, -.52 + t * .065 + Math.sin(a) * .026]); }
    F.add(M.caliper, tubeGeo(hel, .0042, 180, 5));
    F.add(M.black, rodGeo([s * .125, .4, -.525], [s * .125, .43, -.518], .03, .03, 12)); F.add(M.black, rodGeo([s * .125, .69, -.45], [s * .125, .73, -.44], .03, .03, 12));
    F.add(M.rubber, rodGeo([s * .15, .33, -.07], [s * .24, .33, -.07], .014, .014, 10)); F.add(M.alu, rodGeo([s * .1, .38, -.05], [s * .155, .33, -.07], .008, .008, 6));
    F.add(M.rubber, rodGeo([s * .15, .42, -.42], [s * .22, .42, -.42], .012, .012, 8)); F.add(M.alu, rodGeo([s * .1, .5, -.38], [s * .155, .42, -.42], .007, .007, 6));
  }
  F.add(M.gun, rodGeo([.115, .44, .0], [.12, R + .1, RA[2]], .005, .005, 5)); F.add(M.gun, rodGeo([.115, .36, .0], [.12, R - .1, RA[2]], .005, .005, 5));
  F.add(M.black, boxGeo(.015, .05, .55, [.13, .42, -.3], [-.17, 0, 0]));
  F.add(M.black, rodGeo([-.12, .34, -.04], [-.13, .30, .13], .006, .006, 5)); F.add(M.black, rodGeo([.12, .36, -.02], [.13, .33, .1], .006, .006, 5));
  // bodywork: tank, shrouds, seat, side panels, tail, fenders, lamps, plate
  const tg = new THREE.SphereGeometry(1, 36, 20), tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) { let x = tp.getX(i), y = tp.getY(i), z = tp.getZ(i); if (y < -.35) y = -.35 + (y + .35) * .25; x *= .17 * (1 + .18 * Math.max(0, -z)); y *= .125; z *= .27; tp.setXYZ(i, x, y, z); }
  tg.computeVertexNormals(); F.add(paint, xf(tg, { p: [0, .925, .17], r: [-.13, 0, 0] }));
  F.add(M.chrome, xf(new THREE.CylinderGeometry(.04, .042, .012, 20), { p: [0, 1.045, .22], r: [-.13, 0, 0] }));
  for (const s of [-1, 1]) { const sh = new THREE.Shape([[0, 0], [.26, .08], [.3, .2], [.12, .17], [-.02, .1]].map(([a, b]) => new THREE.Vector2(a, b))); const g = new THREE.ExtrudeGeometry(sh, { depth: .02, bevelEnabled: true, bevelSize: .008, bevelThickness: .006, bevelSegments: 2 });
    g.rotateY(-Math.PI / 2); g.translate(s > 0 ? .145 : -.165, .66, .12); F.add(M.black, g); }
  const seatSh = new THREE.Shape([[-.02, .745], [-.05, .79], [-.2, .805], [-.36, .795], [-.41, .835], [-.62, .85], [-.67, .825], [-.65, .765], [-.02, .745]].map(([a, b]) => new THREE.Vector2(a, b)));
  const sg = new THREE.ExtrudeGeometry(seatSh, { depth: .2, bevelEnabled: true, bevelSize: .025, bevelThickness: .03, bevelSegments: 4, curveSegments: 6 }); sg.rotateY(-Math.PI / 2); sg.translate(.1, 0, 0);
  F.add(M.leather, sg);
  for (const s of [-1, 1]) F.add(paint, boxGeo(.02, .16, .32, [s * .13, .66, -.32], [-.12, 0, 0]));
  const tailSh = new THREE.Shape([[-.55, .70], [-.76, .80], [-.82, .79], [-.75, .67], [-.55, .66]].map(([a, b]) => new THREE.Vector2(a, b)));
  const tgg = new THREE.ExtrudeGeometry(tailSh, { depth: .16, bevelEnabled: true, bevelSize: .015, bevelThickness: .025, bevelSegments: 3 }); tgg.rotateY(-Math.PI / 2); tgg.translate(.08, 0, 0); F.add(paint, tgg);
  F.add(L.tail, boxGeo(.13, .045, .03, [0, .773, -.836], [-.5, 0, 0])); F.add(L.brake, boxGeo(.08, .02, .031, [0, .752, -.83], [-.5, 0, 0]));
  for (const s of [-1, 1]) { F.add(M.black, rodGeo([s * .06, .7, -.8], [s * .15, .7, -.82], .006, .006, 6)); F.add(M.amber, boxGeo(.04, .025, .03, [s * .165, .7, -.825])); }
  F.add(M.gun, tubeGeo([[.1, .79, -.5], [.11, .82, -.7], [0, .83, -.76], [-.11, .82, -.7], [-.1, .79, -.5]], .011, 20, 6));
  const rf = new THREE.CylinderGeometry(R + .045, R + .045, .11, 22, 1, true, 1.2, 1.5); rf.rotateZ(Math.PI / 2); rf.translate(...RA); F.add(M.plastic, rf);
  F.add(M.black, boxGeo(.03, .2, .03, [0, .62, -.86], [-.3, 0, 0]));
  const plateM = new THREE.MeshStandardMaterial({ map: plateTex('BA 12 PA 3456'), roughness: .5 });
  F.add(plateM, boxGeo(.2, .065, .004, [0, .54, -.885], [-.15, Math.PI, 0]));
  F.bake(body);
  const stand = new THREE.Group(); body.add(stand); { const P = parts(); P.add(M.black, rodGeo([.11, .3, -.05], [.29, .008, -.16], .009, .007, 6)); P.bake(stand); }
  // steer: forks, clamps, bar, grips, levers, mirrors, cowl, headlamp, front fender, plate
  const head = new THREE.Group(); head.position.set(...HS); head.rotation.x = -Math.asin(.4384); const steer = new THREE.Group(); head.add(steer); body.add(head);
  head.updateMatrix(); const inv = head.matrix.clone().invert(); const toS = (g) => g.applyMatrix4(inv);
  { const P = parts();
    for (const s of [-1, 1]) {
      const b = [s * .098, A0[1], A0[2]];
      P.add(M.alu, toS(rodGeo(at(b, hd, -.03), at(b, hd, .3), .033, .031, 14))); P.add(M.chrome, toS(rodGeo(at(b, hd, .29), at(b, hd, .69), .0195, .0195, 14)));
      P.add(M.black, toS(rodGeo(at(b, hd, .3), at(b, hd, .33), .036, .036, 14)));
      const bar = [[s * .37, 1.005, .245], [s * .27, .99, .3], [s * .12, .975, .33], [0, .972, .335]]; P.add(M.chrome, toS(tubeGeo(bar, .011, 16, 8)));
      P.add(M.rubber, toS(rodGeo([s * .275, .992, .292], [s * .375, 1.006, .243], .0175, .0175, 12))); P.add(M.black, toS(boxGeo(.05, .04, .045, [s * .245, .99, .3])));
      P.add(M.alu, toS(tubeGeo([[s * .24, .997, .315], [s * .3, 1.0, .33], [s * .36, 1.005, .29]], .005, 10, 5)));
      P.add(M.chrome, toS(rodGeo([s * .21, .99, .31], [s * .28, 1.17, .3], .006, .005, 6))); P.add(M.black, toS(xf(new THREE.SphereGeometry(1, 16, 10), { p: [s * .29, 1.19, .3], s: [.058, .036, .018] })));
      P.add(M.mirror, toS(xf(new THREE.CircleGeometry(1, 18), { p: [s * .29, 1.19, .282], r: [0, Math.PI, 0], s: [.05, .03, 1] })));
      P.add(M.amber, toS(boxGeo(.035, .025, .04, [s * .13, .78, .64])));
    }
    P.add(M.black, toS(boxGeo(.3, .03, .1, at([0, A0[1], A0[2]], hd, .55)))); P.add(M.black, toS(boxGeo(.3, .035, .1, at([0, A0[1], A0[2]], hd, .67))));
    const cowl = new THREE.Shape(); cowl.moveTo(-.15, 0); cowl.lineTo(.15, 0); cowl.quadraticCurveTo(.17, .12, .07, .25); cowl.lineTo(-.07, .25); cowl.quadraticCurveTo(-.17, .12, -.15, 0);
    const cg = new THREE.ExtrudeGeometry(cowl, { depth: .05, bevelEnabled: true, bevelSize: .015, bevelThickness: .02, bevelSegments: 3 }); xf(cg, { p: [0, .78, .6], r: [-.42, 0, 0] }); P.add(paint, toS(cg));
    P.add(M.visor, toS(patchGeo([[-.08, .99, .54], [.08, .99, .54], [-.06, 1.07, .5], [.06, 1.07, .5]], 4, 2)));
    P.add(M.screen, toS(boxGeo(.13, .07, .02, [0, .95, .51], [-.6, 0, 0])));
    P.add(M.chrome, toS(xf(latheGeo([[.0, -.05], [.07, -.045], [.085, 0], [.08, .02]], 24), { p: [0, .79, .63], r: [Math.PI / 2 - .2, 0, 0] })));
    P.add(L.head, toS(xf(new THREE.CircleGeometry(.078, 24), { p: [0, .797, .652], r: [-.2, 0, 0] })));
    const ff = new THREE.CylinderGeometry(R + .04, R + .04, .1, 20, 1, true, -.25, 1.85); ff.rotateZ(Math.PI / 2); ff.translate(...FA); P.add(paint2, toS(ff));
    P.add(M.caliper, toS(boxGeo(.03, .08, .06, [-.085, FA[1] + .1, FA[2] - .06])));
    P.add(plateM, toS(boxGeo(.14, .045, .004, [0, .69, .7], [-.15, 0, 0])));
    P.bake(steer); }
  const wr = motoWheel(M, R, true), wf = motoWheel(M, R, false); wr.position.set(...RA); body.add(wr);
  wf.position.copy(new V3(...FA).applyMatrix4(inv)); steer.add(wf);
  const gripL = new V3(.32, 1.0, .27).applyMatrix4(inv), gripR = new V3(-.32, 1.0, .27).applyMatrix4(inv);
  return { root, body, steer: [steer], wheels: [{ g: wr, R, s: 1 }, { g: wf, R, s: 1 }], stand, lamps: L, paint, rig: { gripL, gripR, hip: [0, .905, -.2], pegL: [.19, .333, -.07], pegR: [-.19, .333, -.07] } };
}

function buildCar(M, hex, plate) {
  const L = lampMats(), paint = paintMat(hex), paintD = paintMat(hex, THREE.DoubleSide), blackD = new THREE.MeshStandardMaterial({ color: 0x0f1012, roughness: .4, metalness: .3, side: THREE.DoubleSide });
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const W = 1.7, HWd = W / 2, R = .295, ZF = 1.215, ZR = -1.215, bt = .07, bs = .05;
  // body: side profile extruded across the width; the cabin is a tub so the doors, seats and dash can sit in it
  const s = new THREE.Shape(), arc = (cz, cy, r, a0, a1, n = 14) => { for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; s.lineTo(cz + r * Math.cos(a), cy + r * Math.sin(a)); } };
  s.moveTo(-1.78, .27); s.quadraticCurveTo(-1.84, .28, -1.845, .4); s.lineTo(-1.84, .58); s.quadraticCurveTo(-1.82, .72, -1.8, .86); s.quadraticCurveTo(-1.78, .93, -1.72, .935);
  s.lineTo(-.9, .935); s.lineTo(-.88, .44); s.lineTo(.5, .44); s.lineTo(.52, .935); s.lineTo(.86, .94);
  s.quadraticCurveTo(1.35, .9, 1.72, .80); s.quadraticCurveTo(1.88, .76, 1.9, .62); s.lineTo(1.9, .4); s.quadraticCurveTo(1.89, .28, 1.8, .27);
  s.lineTo(1.62, .25); arc(ZF, .3, .385, -.13, Math.PI + .13); s.lineTo(-.82, .25); arc(ZR, .3, .385, -.13, Math.PI + .13); s.lineTo(-1.78, .27);
  let bg = new THREE.ExtrudeGeometry(s, { depth: W - 2 * bt, bevelEnabled: true, bevelThickness: bt, bevelSize: bs, bevelSegments: 4, curveSegments: 10 });
  bg.rotateY(-Math.PI / 2); bg.translate((W - 2 * bt) / 2, 0, 0); bg.deleteAttribute('normal'); bg.deleteAttribute('uv'); bg = mergeVertices(bg, 1e-4);
  { const p = bg.attributes.position; for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i); const z = p.getZ(i);
      if (z > 1.4) x *= 1 - .12 * ((z - 1.4) / .55) ** 2; if (z < -1.55) x *= 1 - .06 * ((-1.55 - z) / .35) ** 2;
      if (y > .7 && z > .86) y += .028 * (1 - (x / HWd) ** 2); p.setXY(i, x, y); } }
  bg.computeVertexNormals();
  const F = parts(); F.add(paint, bg);
  // greenhouse corners: belt (y .98) and roof (y 1.47) at front and rear
  const bF = [.81, .985, .86], bR = [.79, .99, -1.74], rF = [.66, 1.465, .1], rR = [.64, 1.46, -1.47], mx = (p, sx = 1) => [p[0] * sx, p[1], p[2]];
  const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  F.add(M.glass, patchGeo([mx(bF, -1), mx(bF), mx(rF, -1), mx(rF)], 10, 4, .05, [0, .5, .86]));
  F.add(M.glass, patchGeo([mx(bR), mx(bR, -1), mx(rR), mx(rR, -1)], 8, 3, .03, [0, .3, -.95]));
  const bB = [.81, .985, -.33], rB = [.655, 1.464, -.4];
  for (const sx of [-1, 1]) {
    F.add(M.glass, patchGeo([mx(bR, sx), mx(bB, sx), mx(rR, sx), mx(rB, sx)], 4, 2));
    const cB = [.805, .987, -1.1], cR = [.648, 1.462, -1.2], o = (p) => [p[0] * sx * 1.006, p[1], p[2]];
    F.add(paintD, patchGeo([o(bR), o(cB), o(rR), o(cR)], 3, 2));
    F.add(blackD, patchGeo([o(lerp3(bB, bF, -.02)), o(lerp3(bB, bF, .05)), o(lerp3(rB, rF, -.02)), o(lerp3(rB, rF, .07))], 1, 1));
    F.add(paint, rodGeo(mx(bF, sx), mx(rF, sx), .032, .028, 8)); F.add(paint, rodGeo(mx(bR, sx), mx(rR, sx), .04, .034, 8));
    F.add(M.black, rodGeo(mx(rF, sx), mx(rR, sx), .016, .016, 6)); F.add(M.chrome, rodGeo([sx * .835, .975, -1.1], [sx * .835, .972, .84], .006, .006, 5));
    F.add(M.black, boxGeo(.012, .03, .3, [sx * .852, .94, -.62])); F.add(M.chrome, boxGeo(.02, .022, .12, [sx * .862, .86, -.52]));
  }
  F.add(paint, patchGeo([mx(rF, -1), mx(rF), mx(rR, -1), mx(rR)], 8, 8, .04, [0, 1, 0]));
  F.add(paint, xf(new THREE.BoxGeometry(1.16, .045, .2), { p: [0, 1.46, -1.53], r: [.18, 0, 0] }));
  F.add(L.brake, boxGeo(.36, .022, .02, [0, 1.47, -1.63]));
  // nose and tail
  F.add(M.black, boxGeo(.86, .14, .04, [0, .6, 1.935])); F.add(M.chrome, boxGeo(.86, .012, .042, [0, .675, 1.935]));
  F.add(M.black, boxGeo(1.06, .14, .05, [0, .36, 1.94])); F.add(M.plastic, boxGeo(1.62, .1, .3, [0, .28, 1.86]));
  const plateM = new THREE.MeshStandardMaterial({ map: plateTex(plate || 'BA 2 CHA 4521'), roughness: .5 });
  F.add(plateM, boxGeo(.46, .11, .006, [0, .49, 1.958])); F.add(plateM, boxGeo(.46, .11, .006, [0, .62, -1.905], [0, Math.PI, 0]));
  F.add(M.plastic, boxGeo(1.6, .18, .12, [0, .33, -1.85])); F.add(M.black, boxGeo(1.0, .06, .05, [0, .26, -1.9]));
  for (const sx of [-1, 1]) {
    F.add(M.black, xf(new THREE.BoxGeometry(.3, .115, .04), { p: [sx * .55, .69, 1.918], r: [-.42, sx * .16, 0] }));
    F.add(L.head, xf(new THREE.BoxGeometry(.2, .085, .03), { p: [sx * .52, .692, 1.934], r: [-.42, sx * .16, 0] }));
    F.add(M.amber, xf(new THREE.BoxGeometry(.07, .06, .03), { p: [sx * .665, .686, 1.905], r: [-.42, sx * .3, 0] }));
    F.add(L.tail, xf(new THREE.BoxGeometry(.11, .2, .07), { p: [sx * .72, .82, -1.852], r: [.1, -sx * .12, 0] }));
    F.add(L.rev, xf(new THREE.BoxGeometry(.112, .05, .072), { p: [sx * .72, .695, -1.876], r: [.05, -sx * .12, 0] }));
    F.add(L.brake, xf(new THREE.BoxGeometry(.112, .06, .072), { p: [sx * .72, .92, -1.83], r: [.25, -sx * .12, 0] }));
    F.add(paint, xf(new THREE.BoxGeometry(.06, .08, .15), { p: [sx * .9, 1.02, .58], r: [0, 0, sx * .2] })); F.add(M.mirror, boxGeo(.004, .07, .12, [sx * .935, 1.02, .58]));
    // arch liners keep the tub of the body from showing through the wheel arches
    for (const z of [ZF, ZR]) { const lg = new THREE.CylinderGeometry(.34, .34, .2, 18, 1, true, -.13, Math.PI + .26); lg.rotateZ(Math.PI / 2); lg.translate(sx * .74, .3, z); F.add(blackD, lg); }
  }
  F.add(M.plastic, boxGeo(1.5, .02, 3.4, [0, .23, 0]));
  // interior: carpet, dash, binnacle (right-hand drive), seats, console, pedals
  F.add(M.carpet, boxGeo(1.6, .02, 1.3, [0, .5, -.19]));
  F.add(M.plastic, boxGeo(1.6, .36, .46, [0, .78, .68])); F.add(M.plastic, xf(new THREE.BoxGeometry(1.6, .05, .46), { p: [0, .975, .66], r: [.12, 0, 0] }));
  F.add(M.plastic, boxGeo(.3, .1, .14, [-.36, .99, .5])); F.add(M.screen, boxGeo(.22, .13, .02, [0, .9, .49], [-.2, 0, 0]));
  F.add(M.plastic, boxGeo(.22, .26, .7, [0, .58, .12]));
  F.add(M.black, rodGeo([0, .7, .2], [0, .84, .17], .008, .008, 6)); F.add(M.leather, xf(new THREE.SphereGeometry(.028, 12, 8), { p: [0, .85, .17] }));
  for (const px of [-.27, -.4, -.5]) F.add(M.black, boxGeo(.07, .1, .015, [px, .36, .38], [-.4, 0, 0]));
  F.bake(body);
  // seats (front seats slide on rails, bike-fit style) and rear bench
  const seats = [];
  for (const sx of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(sx * .36, 0, -.3); body.add(g); const P = parts();
    P.add(M.fabric, xf(new THREE.BoxGeometry(.48, .12, .5), { p: [0, .52, .02], r: [-.08, 0, 0] }));
    P.add(M.fabric, xf(new THREE.BoxGeometry(.48, .62, .12), { p: [0, .86, -.24], r: [-.2, 0, 0] }));
    P.add(M.fabric, xf(new THREE.BoxGeometry(.26, .17, .1), { p: [0, 1.25, -.33], r: [-.2, 0, 0] }));
    P.add(M.black, boxGeo(.4, .06, .4, [0, .44, 0])); P.bake(g); seats.push(g);
  }
  { const P = parts(); P.add(M.fabric, boxGeo(1.4, .12, .34, [0, .56, -.66])); P.add(M.fabric, xf(new THREE.BoxGeometry(1.4, .5, .12), { p: [0, .86, -.82], r: [-.12, 0, 0] })); P.bake(body); }
  // steering column and wheel (telescopic: the fit moves the column group)
  const col = new THREE.Group(); col.position.set(-.36, .93, .02); col.rotation.x = .42; body.add(col);
  const swheel = new THREE.Group(); col.add(swheel);
  { const P = parts(); P.add(M.plastic, rodGeo([0, 0, .02], [0, 0, .5], .028, .035, 10)); P.bake(col);
    const Q2 = parts(); Q2.add(M.leather, new THREE.TorusGeometry(.185, .017, 10, 40)); Q2.add(M.plastic, xf(new THREE.CylinderGeometry(.055, .06, .05, 20), { r: [Math.PI / 2, 0, 0] }));
    for (const a of [0, Math.PI, -Math.PI / 2]) Q2.add(M.plastic, rodGeo([0, 0, 0], [Math.cos(a) * .175, Math.sin(a) * .175, -.01], .012, .012, 6));
    Q2.bake(swheel); }
  // doors: separate panels, the right front one opens (right-hand drive). Front windows ride on the doors.
  const doors = [];
  for (const sx of [-1, 1]) for (const [z0, z1] of [[-.335, .54], [-.88, -.345]]) {
    const len = z1 - z0, pivot = new THREE.Group(); pivot.position.set(sx * .842, 0, z1); body.add(pivot);
    const mats = sx > 0 ? [paint, M.fabric, M.black, paint, paint, paint] : [M.fabric, paint, M.black, paint, paint, paint];
    const panel = new THREE.Mesh(new THREE.BoxGeometry(.05, .55, len - .008), mats); panel.position.set(-sx * .0, .71, -len / 2); panel.castShadow = true; pivot.add(panel);
    if (z0 > -.34) { const gl = new THREE.Mesh(patchGeo([mx(bB, sx), mx(bF, sx), mx(rB, sx), mx(rF, sx)], 4, 2), M.glass); pivot.updateMatrix(); gl.geometry.applyMatrix4(pivot.matrix.clone().invert()); pivot.add(gl);
      const fr = new THREE.Mesh(rodGeo(mx(rB, sx), mx(rF, sx), .012, .012, 5).applyMatrix4(pivot.matrix.clone().invert()), M.black); pivot.add(fr); }
    doors.push({ pivot, side: sx, front: z0 > -.34 });
  }
  // wheels: front pair on steering knuckles
  const wheels = [], steer = [];
  for (const sx of [-1, 1]) for (const z of [ZF, ZR]) {
    const w = carWheel(M, R); if (sx > 0) w.children[0].rotation.y = Math.PI;
    if (z === ZF) { const k = new THREE.Group(); k.position.set(sx * .735, R, z); root.add(k); k.add(w); steer.push(k); const cal = new THREE.Mesh(boxGeo(.05, .1, .08, [-sx * .02, .09, -.1]), M.caliper); k.add(cal); }
    else { w.position.set(sx * .735, R, z); root.add(w); }
    wheels.push({ g: w, R, s: 1 });
  }
  const driverDoor = doors.find((d) => d.side < 0 && d.front);
  return { root, body, steer, wheels, doors, door: driverDoor, swheel, col, seats, lamps: L, paint, rig: { hip: [-.36, .6, -.32], pedals: [[-.3, .36, .33], [-.47, .36, .3]] } };
}

// ------------------------------------------------------------------ sound (WebAudio, synthesised; created on the first gesture)
function createAudio() {
  const A = { ctx: null, muted: false };
  let master, eng, tick, skid, wind, roll;
  function noise(sec) { const b = A.ctx.createBuffer(1, Math.floor(A.ctx.sampleRate * sec), A.ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
  function loopNoise(filterType, f, q) { const s = A.ctx.createBufferSource(); s.buffer = A.nbuf; s.loop = true; const fl = A.ctx.createBiquadFilter(); fl.type = filterType; fl.frequency.value = f; fl.Q.value = q || 1; const g = A.ctx.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(master); s.start(); return { s, fl, g }; }
  function build() {
    const c = A.ctx; master = c.createGain(); master.gain.value = A.muted ? 0 : .5; master.connect(c.destination); A.nbuf = noise(2);
    const real = new Float32Array(24), imag = new Float32Array(24); for (let n = 1; n < 24; n++) imag[n] = (n % 2 ? 1 : .55) / n ** 1.1;
    const wave = c.createPeriodicWave(real, imag);
    const o1 = c.createOscillator(), o2 = c.createOscillator(); o1.setPeriodicWave(wave); o2.type = 'sawtooth'; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2.2;
    const g1 = c.createGain(), g2 = c.createGain(), eg = c.createGain(); g1.gain.value = .6; g2.gain.value = .25; eg.gain.value = 0;
    o1.connect(g1); o2.connect(g2); g1.connect(lp); g2.connect(lp); lp.connect(eg); eg.connect(master); o1.start(); o2.start();
    const breath = loopNoise('bandpass', 400, 1.4); breath.fl.disconnect(); breath.fl.connect(breath.g); breath.g.disconnect(); breath.g.connect(eg);
    eng = { o1, o2, lp, eg, breath };
    const t = c.createOscillator(); t.type = 'square'; const th = c.createBiquadFilter(); th.type = 'highpass'; th.frequency.value = 2600; const tg = c.createGain(); tg.gain.value = 0; t.connect(th); th.connect(tg); tg.connect(master); t.start(); tick = { o: t, g: tg };
    skid = loopNoise('bandpass', 1400, 5); wind = loopNoise('lowpass', 520, .7); roll = loopNoise('lowpass', 180, .8);
  }
  A.unlock = () => { if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; } try { A.ctx = new (window.AudioContext || window.webkitAudioContext)(); build(); } catch (e) { A.ctx = null; } };
  A.setMuted = (m) => { A.muted = !!m; if (master) master.gain.setTargetAtTime(m ? 0 : .5, A.ctx.currentTime, .05); };
  const set = (p, v, tc = .05) => p.setTargetAtTime(v, A.ctx.currentTime, tc);
  // per frame for the vehicle you are on: kind, rpm, load (0..1), speed m/s, coasting cadence (Hz), skid 0..1
  A.frame = (o) => {
    if (!A.ctx || A.ctx.state !== 'running') return;
    if (!o) { set(eng.eg.gain, 0, .1); set(tick.g.gain, 0, .05); set(skid.g.gain, 0, .05); set(wind.g.gain, 0, .2); set(roll.g.gain, 0, .2); return; }
    const sp = Math.abs(o.v);
    if (o.kind === 'cycle') { set(eng.eg.gain, 0); set(tick.g.gain, o.coast && sp > .8 ? .035 : 0, .03); set(tick.o.frequency, clamp(sp / .336 * 24 / (Math.PI * 2), 4, 140), .02); }
    else {
      const f = o.kind === 'moto' ? o.rpm / 60 : o.rpm / 30; set(eng.o1.frequency, f, .03); set(eng.o2.frequency, f * (o.kind === 'moto' ? 2.003 : 1.502), .03);
      set(eng.lp.frequency, 180 + o.rpm * (o.kind === 'moto' ? .16 : .12) * (.55 + .45 * o.load), .04); set(eng.breath.fl.frequency, 260 + o.rpm * .09, .05);
      set(eng.eg.gain, (o.kind === 'moto' ? .2 : .16) * (.45 + .55 * o.load) * (o.on ? 1 : 0), .06); set(tick.g.gain, 0);
    }
    set(skid.g.gain, o.skid * clamp(sp / 8, 0, 1) * .22, .04); set(wind.g.gain, clamp(sp / 30, 0, 1) ** 2 * .18, .2); set(roll.g.gain, clamp(sp / 18, 0, 1) * (o.kind === 'car' ? .1 : .06), .2);
  };
  A.horn = (kind) => {
    if (!A.ctx || A.ctx.state !== 'running') return; const c = A.ctx, t0 = c.currentTime;
    if (kind === 'cycle') { for (const dt of [0, .22]) for (const [f, a] of [[2350, .22], [5650, .07], [7100, .04]]) { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; g.gain.setValueAtTime(a, t0 + dt); g.gain.exponentialRampToValueAtTime(.0005, t0 + dt + 1.1); o.connect(g); g.connect(master); o.start(t0 + dt); o.stop(t0 + dt + 1.2); } return; }
    const fs = kind === 'car' ? [415, 495] : [560], bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = kind === 'car' ? 1100 : 1500; bp.Q.value = .9; const g = c.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.32, t0 + .02); g.gain.setValueAtTime(.32, t0 + .42); g.gain.linearRampToValueAtTime(0, t0 + .48);
    bp.connect(g); g.connect(master); for (const f of fs) { const o = c.createOscillator(); o.type = 'square'; o.frequency.value = f; o.connect(bp); o.start(t0); o.stop(t0 + .5); }
  };
  A.thud = (power) => {
    if (!A.ctx || A.ctx.state !== 'running') return; const c = A.ctx, t0 = c.currentTime, s = c.createBufferSource(); s.buffer = A.nbuf; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; const g = c.createGain();
    g.gain.setValueAtTime(clamp(power, 0, 1) * .7, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + .35); s.connect(lp); lp.connect(g); g.connect(master); s.start(t0); s.stop(t0 + .4);
  };
  return A;
}

// ------------------------------------------------------------------ rider IK on the people rig
const RB = ['Body', 'Hips', 'Abdomen', 'Torso', 'Chest', 'Neck', 'Head', 'Shoulder.L', 'Shoulder.R', 'UpperArm.L', 'LowerArm.L', 'Wrist.L', 'UpperArm.R', 'LowerArm.R', 'Wrist.R', 'UpperLeg.L', 'LowerLeg.L', 'UpperLeg.R', 'LowerLeg.R', 'Foot.L', 'Foot.R'];
const FING = []; for (const s of ['L', 'R']) for (const f of ['Index', 'Middle', 'Ring', 'Pinky']) for (const k of [1, 2, 3]) FING.push(f + k + '.' + s);
const _a = new V3(), _b = new V3(), _c = new V3(), _d = new V3(), _q = new Q(), _q2 = new Q(), _q3 = new Q();
function rigOf(av) {
  if (!av || !av.rig || !av.skeleton || !av.skeleton.bones) return null;
  if (av._vr && av._vr.rig === av.rig) return av._vr;
  const san = THREE.PropertyBinding.sanitizeNodeName, sk = av.skeleton, bw = new Map();
  sk.bones.forEach((b, i) => bw.set(b, sk.boneInverses[i].clone().invert()));
  const B = {}, rest = {}, snap = {};
  for (const n of RB.concat(FING)) {
    const b = av.rig.getObjectByName(san(n)); if (!b || !bw.has(b)) continue; B[n] = b;
    const W = bw.get(b), Pw = bw.get(b.parent), Lm = Pw ? Pw.clone().invert().multiply(W) : W.clone(), p = new V3(), q = new Q(), s = new V3(); Lm.decompose(p, q, s);
    rest[n] = { p, q }; snap[n] = { p: new V3(), q: new Q() };
  }
  const bp = (n) => new V3().setFromMatrixPosition(bw.get(B[n]));
  return av._vr = { rig: av.rig, B, rest, snap, shinK: bp('LowerLeg.L').distanceTo(bp('Foot.L')) / bp('UpperLeg.L').distanceTo(bp('LowerLeg.L')), posed: false };
}
const wpos = (o, out) => out.setFromMatrixPosition(o.matrixWorld);
function aimY(bone, target, child) {
  bone.updateMatrixWorld(true); const p = wpos(bone, _a); bone.getWorldQuaternion(_q);
  const cur = child ? wpos(child, _b).sub(p).normalize() : _b.set(0, 1, 0).applyQuaternion(_q);
  const des = _c.copy(target).sub(p).normalize(); _q2.setFromUnitVectors(cur, des).multiply(_q);
  bone.parent.getWorldQuaternion(_q3); bone.quaternion.copy(_q3.invert().multiply(_q2)); bone.updateMatrixWorld(true);
}
function ik2(b1, b2, end, target, pole, l1, l2, child2) {   // returns the reached end point
  b1.updateMatrixWorld(true); const a = wpos(b1, new V3()), d = target.clone().sub(a); let L = d.length(); const mx = (l1 + l2) * .999;
  if (L > mx) { d.multiplyScalar(mx / L); L = mx; } L = Math.max(L, Math.abs(l1 - l2) + 1e-3); const dn = d.clone().normalize(), t = a.clone().addScaledVector(dn, L);
  const x = (l1 * l1 - l2 * l2 + L * L) / (2 * L), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const pn = pole.clone().sub(a); pn.addScaledVector(dn, -pn.dot(dn)); if (pn.lengthSq() < 1e-8) pn.set(0, 0, 1); pn.normalize();
  const knee = a.clone().addScaledVector(dn, x).addScaledVector(pn, h);
  aimY(b1, knee, end); aimY(b2, t, child2); return t;
}
function rotWorld(bone, axis, ang) { if (!bone || !ang) return; bone.getWorldQuaternion(_q); _q2.setFromAxisAngle(axis, ang).multiply(_q); bone.parent.getWorldQuaternion(_q3); bone.quaternion.copy(_q3.invert().multiply(_q2)); bone.updateMatrixWorld(true); }
let CURL = -1;
export const _setCurl = (c) => { CURL = c; };
// pose: { root (me.root), quat (world), seat V3, lean, roll, legs: [{ t V3, pole V3, pitch }|null x2 (L,R)], arms: [{ t, pole }|null x2], grip 0..1 }
function poseRider(av, T, e) {
  const R = rigOf(av); if (!R) return; const B = R.B;
  if (!R.posed) { for (const n in B) { R.snap[n].q.copy(B[n].quaternion); R.snap[n].p.copy(B[n].position); } R.posed = true; }
  T.root.quaternion.copy(T.quat); av.root.rotation.set(0, 0, 0); av.root.position.set(0, 0, 0);
  for (const n of RB) { const b = B[n]; if (!b) continue; b.quaternion.copy(R.rest[n].q); if (n === 'Body' || n === 'Foot.L' || n === 'Foot.R') b.position.copy(R.rest[n].p); }
  T.root.updateMatrixWorld(true);
  const hm = wpos(B['UpperLeg.L'], _d).add(wpos(B['UpperLeg.R'], _a)).multiplyScalar(.5);
  T.root.position.add(T.seat.clone().sub(hm)); T.root.updateMatrixWorld(true);
  const lat = AXX.clone().applyQuaternion(T.quat), fwd = new V3(0, 0, 1).applyQuaternion(T.quat);
  rotWorld(B.Abdomen, lat, T.lean * .55); rotWorld(B.Chest, lat, T.lean * .45); rotWorld(B.Neck, lat, -T.lean * .6); rotWorld(B.Head, lat, -T.lean * .32);
  if (T.roll) rotWorld(B.Head, fwd, -T.roll * .5);
  const l1 = wpos(B['UpperLeg.L'], _a).distanceTo(wpos(B['LowerLeg.L'], _b)), l2 = l1 * R.shinK;
  ['L', 'R'].forEach((s, i) => {
    const g = T.legs[i]; if (!g) return; const ft = B['Foot.' + s];
    const end = ik2(B['UpperLeg.' + s], B['LowerLeg.' + s], null, g.t, g.pole, l1, l2, null);
    const rt = ft.parent; rt.updateMatrixWorld(true); ft.position.copy(rt.worldToLocal(end.clone())); ft.quaternion.copy(R.rest['Foot.' + s].q);
    if (g.pitch) { ft.updateMatrixWorld(true); rotWorld(ft, lat, g.pitch); }
  });
  const a1 = wpos(B['UpperArm.L'], _a).distanceTo(wpos(B['LowerArm.L'], _b)), a2 = wpos(B['LowerArm.L'], _a).distanceTo(wpos(B['Wrist.L'], _b));
  ['L', 'R'].forEach((s, i) => {   // the grip point is the palm: the wrist stops short of it along the reach
    const g = T.arms[i]; if (!g) return; const sh = wpos(B['UpperArm.' + s], new V3()), t = g.t.clone(), d = t.clone().sub(sh).normalize();
    t.addScaledVector(d, -.07); ik2(B['UpperArm.' + s], B['LowerArm.' + s], B['LowerArm.' + s], t, g.pole, a1, a2, B['Wrist.' + s]);
  });
  if (T.grip) for (const n of FING) { const b = B[n]; if (!b) continue; b.quaternion.copy(R.rest[n].q); _q.setFromAxisAngle(AXX, CURL * (n.startsWith('Index') ? .75 : .95) * T.grip); b.quaternion.multiply(_q); }
  if (e < 1) for (const n in B) { const b = B[n], sn = R.snap[n]; _q.copy(b.quaternion); b.quaternion.copy(sn.q).slerp(_q, e); b.position.lerpVectors(sn.p, b.position.clone(), e); }
}
// on foot, strafing: the legs take the move direction, the spine turns back toward the camera (world up axis). untwist before the mixer runs.
export function twist(av, ang) {
  if (!av || !av.rig || !av.skeleton || Math.abs(ang) < .01) return; const R = rigOf(av), B = R.B; if (R.posed || R.tw) return;
  R.tw = [B.Abdomen.quaternion.clone(), B.Torso.quaternion.clone(), B.Neck.quaternion.clone()];
  av.root.updateMatrixWorld(true); rotWorld(B.Abdomen, UP, ang * .45); rotWorld(B.Torso, UP, ang * .35); rotWorld(B.Neck, UP, ang * .2);
}
export function untwist(av) { const R = av && av._vr; if (!R || !R.tw || R.rig !== av.rig) return; R.B.Abdomen.quaternion.copy(R.tw[0]); R.B.Torso.quaternion.copy(R.tw[1]); R.B.Neck.quaternion.copy(R.tw[2]); R.tw = null; }
function unpose(av) { const R = av && av._vr; if (!R || !R.posed || R.rig !== av.rig) return; for (const n in R.B) { R.B[n].quaternion.copy(R.snap[n].q); R.B[n].position.copy(R.snap[n].p); } R.posed = false; }

// ------------------------------------------------------------------ the vehicle manager
export function createVehicles(o) {
  const { scene, look, world, collide } = o, M = makeMats(), audio = createAudio(), list = [];
  const pool = poolTex();
  for (const ev of ['pointerdown', 'keydown', 'touchstart']) addEventListener(ev, () => audio.unlock(), { capture: true, passive: true });
  const groundY = (x, z) => {
    const hw = world.highway; if (hw) { for (let i = 0; i < hw.segs.length - 1; i++) { const [x0, z0] = hw.segs[i], [x1, z1] = hw.segs[i + 1]; if (x >= Math.min(x0, x1) - hw.w / 2 && x <= Math.max(x0, x1) + hw.w / 2 && z >= Math.min(z0, z1) - hw.w / 2 && z <= Math.max(z0, z1) + hw.w / 2) return o.PAVE_Y + .06; } }
    for (const [cx, cz, w, d] of (world.mapGeo && world.mapGeo.townRoads) || []) if (Math.abs(x - cx) <= w / 2 && Math.abs(z - cz) <= d / 2) return o.PAVE_Y + .05;
    return o.PAVE_Y;
  };
  function add(kind, x, z, h, opt = {}) {
    const m = kind === 'cycle' ? buildCycle(M, opt.color ?? 0x0f5f7d) : kind === 'moto' ? buildMoto(M, opt.color ?? 0x8f1218) : buildCar(M, opt.color ?? 0x1d3f73, opt.plate);
    const v = { kind, spec: opt.spec ? { ...SPEC[kind], ...opt.spec } : SPEC[kind], mesh: m.root, m, x, z, h, u: 0, delta: 0, lean: kind === 'car' ? 0 : -.17, roll: 0, rv: 0, pitch: 0, pv: 0, bob: 0, bv: 0, beta: 0, skid: 0, crank: Math.PI / 2, gear: 1, rpm: 0, shiftT: 0, fallen: 0, km: 0, y: groundY(x, z), owned: !!opt.owned, id: opt.id || kind, brake: 0, rev: 0, on: false, lastAx: 0, hitT: 0, marks: 0, fit: null };
    m.root.traverse((q) => { q.userData.keep = 1; if (o.phone && q.isMesh) q.castShadow = false; });
    m.root.position.set(x, v.y, z); m.root.rotation.y = h; scene.add(m.root);
    if (kind !== 'car') { const p = new THREE.Mesh(new THREE.PlaneGeometry(4, 9), new THREE.MeshBasicMaterial({ map: pool, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -12 })); p.rotation.x = -Math.PI / 2; p.position.set(0, .07, 5.3); m.root.add(p); v.pool = p; }
    else { const p = new THREE.Mesh(new THREE.PlaneGeometry(6, 13), new THREE.MeshBasicMaterial({ map: pool, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -12 })); p.rotation.x = -Math.PI / 2; p.position.set(0, .07, 8.2); m.root.add(p); v.pool = p; }
    v.pool.renderOrder = 2;
    list.push(v); place(v); return v;
  }
  function remove(v) { const i = list.indexOf(v); if (i >= 0) list.splice(i, 1); scene.remove(v.mesh); }
  function place(v) {
    const m = v.m; m.root.position.set(v.x, v.y, v.z); m.root.rotation.y = v.h + v.beta;
    if (v.kind === 'car') { m.body.rotation.set(v.pitch, 0, v.roll); m.body.position.y = v.bob; }
    else { m.body.rotation.set(clamp(-v.lastAx * .0028, -.025, .025), 0, v.lean + (v.fallen ? 0 : 0)); }
    for (const s of m.steer) s.rotation.y = -v.delta;
    if (m.swheel) m.swheel.rotation.z = v.delta * 3.9;
    if (m.crank) { m.crank.rotation.x = v.crank; for (const p of m.pedals) p.rotation.x = -v.crank; }
  }

  // ---------------- riding state
  let lastHit = null;
  let A = null;   // { v, me, phase: 'in'|'ride'|'out'|'thrown', t, from {x,z,h}, side, exitTo }
  const skidPool = [], skidGeo = new THREE.PlaneGeometry(.2, .55), skidMat = new THREE.MeshBasicMaterial({ color: 0x0b0b0b, transparent: true, opacity: .5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -10 });
  let skidI = 0;
  function mark(x, y, z, h, a) { let m = skidPool[skidI]; if (!m) { m = new THREE.Mesh(skidGeo, skidMat); m.rotation.order = 'YXZ'; m.userData.keep = 1; scene.add(m); skidPool[skidI] = m; } m.position.set(x, y + .065, z); m.rotation.set(-Math.PI / 2, h, 0); m.material.opacity = .5; m.scale.set(1, a, 1); skidI = (skidI + 1) % 160; }

  function fitRider(v, me) {   // bike fit: saddle height, torso lean and seat slide that reach the bars, pedals and wheel
    const av = me.av; if (!av || !av.rig || !av.skeleton) return null; const R = rigOf(av); if (!R) return null; const B = R.B;
    const savedQ = me.root.quaternion.clone(), savedP = me.root.position.clone();
    const tmp = { root: me.root, quat: new Q(), seat: new V3(0, 1, 0), lean: 0, legs: [null, null], arms: [null, null] };
    me.root.position.set(0, 0, 0); poseRider(av, tmp, 1); me.root.updateMatrixWorld(true);
    const hipH = 1 - me.root.position.y, hm = wpos(B['UpperLeg.L'], new V3()).add(wpos(B['UpperLeg.R'], new V3())).multiplyScalar(.5);
    const leg = hm.distanceTo(wpos(B['LowerLeg.L'], new V3())) * (1 + R.shinK), arm = wpos(B['UpperArm.L'], new V3()).distanceTo(wpos(B['LowerArm.L'], new V3())) + wpos(B['LowerArm.L'], new V3()).distanceTo(wpos(B['Wrist.L'], new V3()));
    const shoulderAt = (lean) => { tmp.lean = lean; poseRider(av, tmp, 1); me.root.updateMatrixWorld(true); return wpos(B['UpperArm.L'], new V3()).sub(tmp.seat); };
    const out = { leg, arm, hipH, lean: 0, post: .17 };
    const k = v.kind, rg = v.m.rig;
    let grip = null;
    if (k === 'cycle') {
      const ank = new V3(0, rg.BB[1] - .172 + .06, rg.BB[2] - .05); let lo = .02, hi = .34;
      for (let i = 0; i < 18; i++) { const mid = (lo + hi) / 2, hip = new V3(...at(rg.STT, rg.sd, mid)).add(new V3(rg.seatTop[0], rg.seatTop[1] + .07, rg.seatTop[2])); if (hip.distanceTo(ank) > leg * .94) hi = mid; else lo = mid; }
      out.post = (lo + hi) / 2; v.m.seat.position.set(...at(rg.STT, rg.sd, out.post)); v.m.root.updateMatrixWorld(true);
      grip = v.m.body.worldToLocal(v.m.steer[0].localToWorld(rg.gripL.clone()));
      out.hip = new V3(...at(rg.STT, rg.sd, out.post)).add(new V3(0, rg.seatTop[1] + .07, rg.seatTop[2] - .01));
    } else if (k === 'moto') {
      out.hip = new V3(...rg.hip); v.m.root.updateMatrixWorld(true); grip = v.m.body.worldToLocal(v.m.steer[0].localToWorld(rg.gripL.clone()));
    } else {
      const ped = new V3(...rg.pedals[0]); out.hip = new V3(rg.hip[0], rg.hip[1], ped.z - Math.sqrt(Math.max(.05, (leg * .9) ** 2 - (rg.hip[1] - ped.y) ** 2)));
      out.hip.z = clamp(out.hip.z, -.48, -.16); for (const s of v.m.seats) if (s.position.x < 0) s.position.z = out.hip.z + .02;
    }
    if (grip) {   // sit as far back and as upright as the reach allows: slide forward on the seat first, then lean the torso
      tmp.seat.set(0, 1, 0); const offs = k === 'moto' ? [0, .04, .08, .12] : [0, .02, .04], l0 = k === 'cycle' ? .5 : .3, lmax = k === 'cycle' ? 1.2 : .95, shs = new Map();
      const shAt = (ln) => { const key = ln.toFixed(2); if (!shs.has(key)) shs.set(key, shoulderAt(ln)); return shs.get(key); };
      let found = null;
      for (const dz of offs) { const g = grip.clone().sub(out.hip).sub(new V3(0, 0, dz)); for (let ln = l0; ln <= lmax + 1e-6; ln += .05) if (shAt(ln).distanceTo(g) <= arm * .97) { found = [dz, ln]; break; } if (found) break; }
      if (!found) found = [offs[offs.length - 1], lmax];
      out.hip.z += found[0]; out.lean = found[1];
    } else {   // car: upright, the column comes to the hands
      const sh = shoulderAt(-.08); out.lean = -.08; const reach = arm * .82; const c = out.hip.clone().add(sh).add(new V3(0, -.12, Math.sqrt(Math.max(.01, reach * reach - .12 * .12))));
      v.m.col.position.set(out.hip.x, c.y, clamp(c.z, -.2, .3));
    }
    unpose(av); me.root.quaternion.copy(savedQ); me.root.position.copy(savedP); me.root.updateMatrixWorld(true);
    return out;
  }

  function seatPose(v, me, e) {
    const m = v.m, f = v.fit || {}; m.root.updateMatrixWorld(true);
    const L2W = (p) => m.body.localToWorld(new V3(...(p.toArray ? p.toArray() : p)));
    const quat = new Q(); m.body.getWorldQuaternion(quat);
    const T = { root: me.root, quat, seat: L2W(f.hip || new V3(0, 1, 0)), lean: f.lean || 0, roll: v.kind === 'car' ? 0 : v.lean, legs: [null, null], arms: [null, null], grip: 1 };
    const fwdW = new V3(0, 0, 1).applyQuaternion(quat), upW = new V3(0, 1, 0).applyQuaternion(quat), latW = new V3(1, 0, 0).applyQuaternion(quat);
    const armPole = (t, s) => t.clone().addScaledVector(upW, -.35).addScaledVector(latW, s * .3).addScaledVector(fwdW, -.25);
    const legPole = (t, s) => t.clone().addScaledVector(fwdW, .6).addScaledVector(upW, .3).addScaledVector(latW, s * .08);
    if (v.kind === 'cycle') {
      const gl = m.steer[0].localToWorld(m.rig.gripL.clone()), gr = m.steer[0].localToWorld(m.rig.gripR.clone());
      T.arms = [{ t: gl, pole: armPole(gl, 1) }, { t: gr, pole: armPole(gr, -1) }];
      const pl = m.pedals[1].getWorldPosition(new V3()).addScaledVector(upW, .055).addScaledVector(fwdW, -.04), pr = m.pedals[0].getWorldPosition(new V3()).addScaledVector(upW, .055).addScaledVector(fwdW, -.04);
      T.legs = [{ t: pl, pole: legPole(pl, 1), pitch: .15 * Math.sin(v.crank) }, { t: pr, pole: legPole(pr, -1), pitch: -.15 * Math.sin(v.crank) }];
      if (v.footDown > .01) { const g = m.root.localToWorld(new V3(.34, .05, -.12)); T.legs[0] = { t: T.legs[0].t.clone().lerp(g, v.footDown), pole: legPole(g, 1).addScaledVector(latW, .2), pitch: 0 }; }
      T.seat.addScaledVector(upW, Math.abs(Math.sin(v.crank)) * .006 * (v.pedal || 0));
    } else if (v.kind === 'moto') {
      const gl = m.steer[0].localToWorld(m.rig.gripL.clone()), gr = m.steer[0].localToWorld(m.rig.gripR.clone());
      T.arms = [{ t: gl, pole: armPole(gl, 1) }, { t: gr, pole: armPole(gr, -1) }];
      const pl = L2W([m.rig.pegL[0] - .02, m.rig.pegL[1] + .06, m.rig.pegL[2] - .07]), pr = L2W([m.rig.pegR[0] + .02, m.rig.pegR[1] + .06, m.rig.pegR[2] - .07]);
      T.legs = [{ t: pl, pole: legPole(pl, 1).addScaledVector(latW, .25), pitch: .1 }, { t: pr, pole: legPole(pr, -1).addScaledVector(latW, -.25), pitch: .1 }];
      if (v.footDown > .01) { const g = m.root.localToWorld(new V3(.38, .05, -.08)); T.legs[0] = { t: pl.clone().lerp(g, v.footDown), pole: legPole(g, 1).addScaledVector(latW, .3), pitch: 0 }; }
    } else {
      const col = m.col, sw = m.swheel, ang = clamp(sw.rotation.z, -1.1, 1.1), c = Math.cos(ang), s = Math.sin(ang);
      const hp = (x) => col.localToWorld(new V3(x * c, x * s, -.005));
      const gl = hp(.178), gr = hp(-.178); T.arms = [{ t: gl, pole: armPole(gl, 1) }, { t: gr, pole: armPole(gr, -1) }];
      const [pa, pb] = m.rig.pedals, rf = L2W([pa[0], pa[1] + .05, pa[2] - .02]), lf = L2W([pb[0], pb[1] + .05, pb[2] - .02]);
      T.legs = [{ t: lf, pole: legPole(lf, 1), pitch: -.45 }, { t: rf, pole: legPole(rf, -1), pitch: -.45 + (v.brake ? .1 : -.1 * (v.thr || 0)) }];
    }
    if (e < 1 && A && A.from) {   // get on / get off: glide from beside the vehicle, legs and arms blend in
      const w = e * e * (3 - 2 * e), fq = new Q().setFromAxisAngle(UP, A.from.h);
      T.seat.lerpVectors(new V3(A.from.x, A.from.y + (f.hipH || .95), A.from.z), T.seat.clone(), w); T.quat = fq.slerp(T.quat, w); T.lean *= w;
    }
    poseRider(me.av, T, e);
  }

  function sidePoint(v, flip) {
    const s = (v.kind === 'car' ? -1.25 : .62) * (flip ? -1 : 1), ox = Math.cos(v.h) * s, oz = -Math.sin(v.h) * s, dz = v.kind === 'car' ? -.25 : -.1;
    return { x: v.x + ox + Math.sin(v.h) * dz, z: v.z + oz + Math.cos(v.h) * dz };
  }
  function mount(v, me, P) {
    if (A || !me || !me.av) return false;
    if (v.fallen) { v.fallen = 0; v.lean = -.17; }
    v.u = 0; v.fit = fitRider(v, me); v.on = true;
    A = { v, me, phase: 'in', t: 0, from: { x: P.x, z: P.z, y: me.root.position.y, h: P.ry }, dur: v.kind === 'car' ? .85 : .6 };
    v.m.stand && (v.m.stand.visible = true);
    return true;
  }
  function dismount() { if (!A || A.phase !== 'ride') return false; A.wantOut = true; return true; }
  function finishOut(P) {
    const v = A.v, me = A.me; unpose(me.av); me.root.quaternion.identity(); me.root.rotation.set(0, A.to.h, 0); me.av.root.rotation.set(0, 0, 0);
    P.x = A.to.x; P.z = A.to.z; P.ry = A.to.h; P.vx = P.vz = 0; P.spd = 0; v.on = false; v.u = 0; v.delta = 0; const was = A; A = null; o.onExit && o.onExit(v, was.crash);
  }
  function throwOff(why) {
    if (!A || A.v.kind === 'car') return false; const v = A.v, me = A.me, sp = Math.max(4, Math.abs(v.u));
    unpose(me.av);
    A = { v, me, phase: 'thrown', t: 0, crash: why || 'crash', rx: v.x, ry: v.y + .9, rz: v.z, vx: Math.sin(v.h) * sp * .55, vy: 2.6, vz: Math.cos(v.h) * sp * .55, spin: 0, to: null };
    v.fallen = v.lean >= 0 ? 1 : -1; v.on = false; audio.thud(1); return true;
  }

  // input: { throttle -1..1, steer -1..1, brake bool, horn bool }
  function drive(v, dt, inp) {
    const S = v.spec; let u = v.u, ax = 0; const thr = clamp(inp.throttle || 0, -1, 1), st = clamp(inp.steer || 0, -1, 1), brk = !!inp.brake;
    v.brake = 0; v.rev = 0; v.thr = Math.max(0, thr); v.pedal = 0;
    const fuelOk = !S.fuel || v.fuelOk !== false;
    if (brk) { if (Math.abs(u) > .05) { v.brake = 1; ax = -Math.sign(u) * S.brake; } }
    else if (thr > .05) {
      if (u < -.3) { ax = S.brake * thr; v.brake = 1; }
      else { const p = Math.max(0, 1 - Math.pow(Math.max(0, u) / S.top, S.ap)); ax = (fuelOk ? S.a0 * thr * p * (v.shiftT > 0 ? .3 : 1) : 0) - (u > 0 ? .05 : 0); v.pedal = thr; }
    } else if (thr < -.05) {
      if (u > .3) { ax = S.brake * thr; v.brake = 1; }
      else if (S.rev) { v.rev = 1; const p = Math.max(0, 1 - (Math.max(0, -u) / S.rev) ** 2); ax = fuelOk ? 2.8 * thr * p : 0; if (u > 0) ax = -S.brake; }
      else if (Math.abs(u) > .05) { v.brake = 1; ax = -Math.sign(u) * S.brake * -thr; }
    } else ax = -Math.sign(u) * (S.coast + .012 * u * u);
    let nu = u + ax * dt; if ((v.brake || (Math.abs(thr) < .05 && !v.rev)) && Math.sign(nu) !== Math.sign(u) && u !== 0) nu = 0; if (!S.rev && nu < 0) nu = 0;
    v.lastAx += ((nu - u) / Math.max(dt, 1e-3) - v.lastAx) * damp(10, dt); u = nu;
    const dmax = S.steer / (1 + (Math.abs(u) / S.steerV) ** 2); v.delta += clamp(st * dmax - v.delta, -S.steerRate * dt, S.steerRate * dt);
    let r = -u * Math.tan(v.delta) / S.wb; const lat = Math.abs(u * r);
    const lock = S.kind === 'car' && v.brake && Math.abs(u) > 9 ? .45 : 0;
    v.skid += (Math.max(lock, clamp((lat - S.grip) / (S.grip * .45), 0, 1)) - v.skid) * damp(8, dt);
    if (lat > S.grip) r *= (S.grip / lat) * (1 + .3 * v.skid);
    v.h += r * dt; u -= Math.sign(u) * v.skid * 3.2 * dt; v.u = u;
    v.beta += ((S.kind === 'car' ? .3 : .12) * v.skid * Math.sign(r) * (lock ? 0 : 1) - v.beta) * damp(5, dt);
    v.x += Math.sin(v.h) * u * dt; v.z += Math.cos(v.h) * u * dt; v.km += Math.abs(u) * dt / 1000; v.yawRate = r;
    return { r, lat };
  }
  function physicsAfter(v, dt, r) {
    const S = v.spec, u = v.u;
    if (S.kind !== 'car') {
      const stopped = Math.abs(u) < .7 && !(v.thr > .05);
      v.footDown += ((stopped ? 1 : 0) - (v.footDown || 0)) * damp(stopped ? 6 : 10, dt);
      const tgt = stopped ? -.13 : clamp(-Math.atan(u * r / 9.81), -S.lean, S.lean);
      v.lean += (tgt - v.lean) * damp(stopped ? 4 : 7, dt);
      if (S.kind === 'cycle') {
        if (v.pedal > .05 && !v.brake) v.crank += Math.max(u, 1.3 * v.pedal) / .336 / 2.6 * dt;
        else { const tg = Math.round((v.crank - Math.PI / 2) / Math.PI) * Math.PI + Math.PI / 2; v.crank += (tg - v.crank) * damp(3, dt); }
      }
    } else {
      const ay = u * r, tr = clamp(.0105 * ay, -.075, .075), tp = clamp(-v.lastAx * .0065, -.055, .055);
      v.rv += ((tr - v.roll) * 70 - v.rv * 9) * dt; v.roll += v.rv * dt;
      v.pv += ((tp - v.pitch) * 80 - v.pv * 10) * dt; v.pitch += v.pv * dt;
      const road = Math.sin(v.km * 1000 * 1.7) * Math.sin(v.km * 1000 * .63) * .006 * clamp(Math.abs(u) / 10, 0, 1);
      v.bv += ((road - v.bob) * 160 - v.bv * 14) * dt; v.bob += v.bv * dt;
    }
    if (S.gears) {
      const kmh = Math.abs(u) * KMH, n = S.gears.length - 1; v.shiftT = Math.max(0, v.shiftT - dt);
      if (v.rev) v.gear = 1; else { if (kmh > S.gears[v.gear] * .93 && v.gear < n) { v.gear++; v.shiftT = S.kind === 'car' ? .28 : .16; } if (v.gear > 1 && kmh < S.gears[v.gear - 1] * .55) v.gear--; }
      const tr = Math.abs(u) < .4 ? S.idle + (v.thr || 0) * 1400 : Math.max(S.idle, S.red * kmh / S.gears[v.gear] * (v.rev ? 2.2 : 1));
      v.rpm += (clamp(tr, S.idle * .9, S.red) * (v.shiftT > 0 ? .78 : 1) - v.rpm) * damp(9, dt);
    }
    for (const w of v.m.wheels) w.g.rotation.x += u * dt / w.R * w.s;
  }
  function hitWorld(v, dt) {
    const S = v.spec, offs = S.kind === 'car' ? [1.1, 0, -1.1] : [0]; let best = null, bl = 0;
    for (const k of offs) { const cx = v.x + Math.sin(v.h) * k, cz = v.z + Math.cos(v.h) * k; const [nx, nz] = collide(cx, cz, false, true, S.rad); const dx = nx - cx, dz = nz - cz, l = Math.hypot(dx, dz); if (l > bl) { bl = l; best = [dx, dz]; } }
    const amb = o.ambient && o.ambient(); let other = null;
    if (amb) for (const t of amb) { const dx = v.x - t.x, dz = v.z - t.z; if (dx * dx + dz * dz > 36) continue; const c = Math.cos(t.h), s = Math.sin(t.h), lx = dx * c - dz * s, lz = dx * s + dz * c, px = clamp(lx, -t.hw, t.hw), pz = clamp(lz, -t.hl, t.hl), ex = lx - px, ez = lz - pz, d = Math.hypot(ex, ez), rr = S.rad * (S.kind === 'car' ? 1.05 : 1);
      if (d < rr) { const push = d < 1e-4 ? rr : rr - d, nx = d < 1e-4 ? 1 : ex / d, nz = d < 1e-4 ? 0 : ez / d, wx = nx * c + nz * s, wz = -nx * s + nz * c; if (push > bl) { bl = push; best = [wx * push, wz * push]; other = t; } } }
    if (o.people) for (const p of o.people()) { const dx = v.x - p.pos.x, dz = v.z - p.pos.z; if (dx * dx + dz * dz > 25) continue; const c = Math.cos(v.h), s = Math.sin(v.h), lx = dx * c - dz * s, lz = dx * s + dz * c, [hw, hl] = S.half;
      if (Math.abs(lx) < hw + .3 && Math.abs(lz) < hl + .3) { const sp = Math.abs(v.u); if (sp > 1.2 && !(p._vehHit > performance.now())) { p._vehHit = performance.now() + 3000; o.onPed && o.onPed(v, p, sp); } const d = Math.hypot(dx, dz) || 1, need = Math.max(hw, hl * .5) + .35; if (need - d > bl) { bl = Math.max(.02, need - d); best = [dx / d * bl, dz / d * bl]; } } }
    if (!best || bl < .002) return;
    v.x += best[0]; v.z += best[1]; const n = new V3(best[0], 0, best[1]).normalize(), vel = new V3(Math.sin(v.h) * v.u, 0, Math.cos(v.h) * v.u);
    if (other) vel.sub(new V3(Math.sin(other.h) * other.v, 0, Math.cos(other.h) * other.v));
    const vn = vel.dot(n); if (vn >= 0) return; const impact = -vn;
    const nv = new V3(Math.sin(v.h) * v.u, 0, Math.cos(v.h) * v.u).addScaledVector(n, -1.25 * vn).multiplyScalar(1 - Math.min(.6, impact * .05)); v.u = nv.x * Math.sin(v.h) + nv.z * Math.cos(v.h);
    const ridden = A && A.v === v && A.phase === 'ride';
    if (impact > .8 && performance.now() > v.hitT) {
      v.hitT = performance.now() + 450; audio.thud(clamp(impact / 12, .15, 1)); if (S.kind === 'car') { v.pv += impact * .25 * Math.sign(v.u || 1); v.rv += impact * .05; }
      if (!ridden) return;
      const kind = other ? 'traffic' : 'wall', off = S.kind !== 'car' && (impact >= S.crash || (other && impact > 2.5));
      lastHit = { vehicle: S.kind, impact: +impact.toFixed(2), hit: kind, x: +v.x.toFixed(1), z: +v.z.toFixed(1), thrown: off };
      if (off) throwOff(kind);
      o.onImpact && o.onImpact(v, impact, kind, other, off);
    }
  }

  // step = physics (before the animation mixer); pose = rider bones (after it). Both run every frame while busy.
  function step(dt, inp, P) {
    if (!A) return false; const v = A.v;
    if (A.phase === 'in' || A.phase === 'out') {
      A.t = Math.min(1, A.t + dt / A.dur); v.u *= Math.exp(-dt * 6);
      if (v.m.door) v.m.door.pivot.rotation.y = -Math.sin(Math.min(1, A.t * 1.25) * Math.PI) * 1.05 * v.m.door.side;
      if (v.kind !== 'car') v.lean += ((A.phase === 'in' ? -.13 : -.17) - v.lean) * damp(5, dt);
      if (v.m.stand) v.m.stand.visible = A.phase === 'out' ? A.t > .55 : A.t < .45;
      place(v); P.x = v.x; P.z = v.z; P.ry = v.h; P.spd = 0;
      A.e = A.phase === 'in' ? A.t : 1 - A.t;
      if (A.t >= 1) { if (A.phase === 'in') { A.phase = 'ride'; A.from = null; A.e = 1; } else A.done = true; }
      return true;
    }
    if (A.phase === 'thrown') {
      A.t += dt; const g = groundY(A.rx, A.rz); A.vy -= 9.8 * dt; A.rx += A.vx * dt; A.ry += A.vy * dt; A.rz += A.vz * dt;
      if (A.ry <= g + .12) { A.ry = g + .12; A.vy = 0; const f = Math.exp(-dt * 4); A.vx *= f; A.vz *= f; }
      const [cx, cz] = collide(A.rx, A.rz, false, true, .35); A.rx = cx; A.rz = cz;
      P.x = A.rx; P.z = A.rz; P.spd = 0;
      v.u *= Math.exp(-dt * 2.5); v.x += Math.sin(v.h) * v.u * dt; v.z += Math.cos(v.h) * v.u * dt; v.lean += (v.fallen * 1.32 - v.lean) * damp(5, dt); hitWorld(v, dt); place(v);
      if (A.t > 2.6) { A.to = { x: A.rx, z: A.rz, h: v.h }; A.done = true; }
      return true;
    }
    const want = A.wantOut;
    const res = drive(v, dt, want ? { throttle: 0, steer: 0, brake: true } : inp);
    hitWorld(v, dt);
    if (A.phase === 'thrown') return true;
    physicsAfter(v, dt, res.r);
    if (inp.horn && !want && performance.now() > (v.hornT || 0)) { v.hornT = performance.now() + (v.kind === 'cycle' ? 900 : 520); audio.horn(v.kind); o.onHorn && o.onHorn(v); }
    v.y += (groundY(v.x, v.z) - v.y) * damp(12, dt); place(v);
    if (v.skid > .25 && Math.abs(v.u) > 4) { v.marks += Math.abs(v.u) * dt; if (v.marks > .5) { v.marks = 0; const back = v.kind === 'car' ? -1.2 : -.5; for (const sx of (v.kind === 'car' ? [-.73, .73] : [0])) mark(v.x + Math.sin(v.h) * back + Math.cos(v.h) * sx, v.y, v.z + Math.cos(v.h) * back - Math.sin(v.h) * sx, v.h, 1); } }
    if (v.spec.fuel && o.onCost) { v.fuelKm = (v.fuelKm || 0) + Math.abs(v.u) * dt / 1000; if (v.fuelKm >= .05) { const ok = o.onCost(v.spec.fuel * v.fuelKm, 'fuel', v); v.fuelKm = 0; if (ok === false && v.fuelOk !== false) { v.fuelOk = false; o.toast && o.toast('No money left for fuel.'); } else if (ok !== false) v.fuelOk = true; } }
    P.x = v.x; P.z = v.z; P.ry = v.h; P.spd = Math.abs(v.u); P.vx = Math.sin(v.h) * v.u; P.vz = Math.cos(v.h) * v.u;
    A.e = 1;
    if (want && Math.abs(v.u) < 1.1) {
      let to = sidePoint(v, false); const [tx, tz] = collide(to.x, to.z, false, false); if (Math.hypot(tx - to.x, tz - to.z) > .2) to = sidePoint(v, true);
      A.phase = 'out'; A.t = 0; A.wantOut = false; A.to = { x: to.x, z: to.z, h: v.h }; A.from = { x: to.x, z: to.z, y: groundY(to.x, to.z), h: v.h };
    }
    return true;
  }
  function pose(P) {
    if (!A) return; const v = A.v, me = A.me;
    if (A.phase === 'thrown') {
      const tumble = Math.min(1, A.t / .45), up = A.t > 1.9 ? Math.min(1, (A.t - 1.9) / .7) : 0;
      const sl = .9 * tumble * (1 - up); me.root.position.set(A.rx + Math.sin(v.h) * sl, A.ry - .12 * up, A.rz + Math.cos(v.h) * sl); me.root.rotation.set(0, v.h, 0); me.root.rotateX(-Math.PI / 2 * tumble * (1 - up)); me.av.root.rotation.set(0, 0, 0);
    } else seatPose(v, me, A.e ?? 1);
    if (A.done) finishOut(P);
  }

  function update(dt, px, pz) {   // every vehicle: lights, fallen bikes, parked lean, skid marks fading; far ones hidden, mid ones cast no shadow
    const night = clamp((look.state.night - .3) / .4, 0, 1);
    for (const v of list) {
      if (px != null) { const d = Math.hypot(v.x - px, v.z - pz), band = d > 110 ? 2 : d > 28 ? 1 : 0;
        if (band !== v._band) { v._band = band; v.mesh.visible = band < 2; if (!o.phone) v.mesh.traverse((q) => { if (q.isMesh && !q.material.transparent && q !== v.pool) q.castShadow = band === 0; }); } }
      const L = v.m.lamps, active = A && A.v === v && A.phase === 'ride';
      const lit = night > 0 && (v.on || v.kind === 'cycle' && active);
      L.head.emissiveIntensity = lit ? 2.6 * night : 0; L.tail.emissiveIntensity = (lit ? .9 : 0) + (v.brake && active ? 2.2 : 0);
      L.brake.emissiveIntensity = v.brake && active ? 3 : (lit ? .5 : 0); L.rev.emissiveIntensity = v.rev && active ? 2 : 0;
      v.pool.material.opacity = lit ? .55 * night : 0; v.pool.visible = lit;
      if (!active && !(A && A.v === v)) {
        if (v.fallen) { v.u *= Math.exp(-dt * 2.5); if (Math.abs(v.u) > .05) { v.x += Math.sin(v.h) * v.u * dt; v.z += Math.cos(v.h) * v.u * dt; } v.lean += (v.fallen * 1.32 - v.lean) * damp(5, dt); place(v); }
        else if (v.kind !== 'car' && (Math.abs(v.lean + .17) > .002 || Math.abs(v.delta - v.spec.park) > .002)) { v.lean += (-.17 - v.lean) * damp(4, dt); v.delta += (v.spec.park - v.delta) * damp(3, dt); place(v); }
        if (v.m.stand) v.m.stand.visible = !v.fallen;
      }
    }
    if (skidPool.length) skidMat.opacity = Math.max(.18, skidMat.opacity - dt * .01);
    const cur = A && A.phase === 'ride' ? A.v : null;
    audio.frame(cur ? { kind: cur.kind, rpm: cur.rpm || 0, load: cur.thr || 0, v: cur.u, coast: !(cur.pedal > .05), skid: cur.skid, on: true } : null);
  }
  function nearest(px, pz) {
    let best = null, bd = 99; for (const v of list) { if (A && A.v === v) continue; const d = Math.hypot(px - v.x, pz - v.z) - (v.kind === 'car' ? 1.1 : 0); if (d < (v.kind === 'car' ? 1.9 : 2.4) && d < bd) { bd = d; best = v; } }
    return best;
  }
  function cam() { if (!A || !A.v) return null; const v = A.v, k = clamp(Math.abs(v.u) / v.spec.top, 0, 1); return { yaw: v.h + v.beta * .5 + Math.PI, back: v.spec.back + v.spec.pull * k, fov: v.spec.fov * k ** 1.4, kind: v.kind, speed: v.u, phase: A.phase }; }
  return {
    list, add, remove, mount, dismount, throwOff, step, pose, update, nearest, cam, groundY, audio, unpose, SPEC,
    abort() { if (!A) return; unpose(A.me.av); A.v.on = false; A.v.u = 0; A = null; },
    get active() { return A ? A.v : null; }, get lastHit() { return lastHit; }, get phase() { return A ? A.phase : ''; }, get busy() { return !!A; },
    rec: null,
  };
}
