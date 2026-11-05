// Sansar town: Kenney CC0 kits + procedural landmark/sky/mountains. Everything on a 6-unit tile grid.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const loader = new GLTFLoader();
const cache = {};
export function loadGLB(url) { return cache[url] || (cache[url] = loader.loadAsync(url)); }
async function model(url, scale = 1) { const g = (await loadGLB(url)).scene.clone(true); g.scale.setScalar(scale); g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g; }

const PLACES = [
  { id: 'college', label: '🎓 College', verb: 'Enter College', file: 'c/building-n.glb', s: 4.2, x: -12, z: -26, rot: 0, color: 0xd9a441 },
  { id: 'work', label: '💼 Workplace', verb: 'Enter Workplace', file: 'c/building-skyscraper-c.glb', s: 5, x: 12, z: -26, rot: 0, color: 0x4a86d9 },
  { id: 'cafe', label: '☕ Cafe', verb: 'Enter Cafe', file: 'c/building-d.glb', s: 5, x: 26, z: -9, rot: -Math.PI / 2, color: 0xc4553a },
  { id: 'gym', label: '🏋 Gym', verb: 'Enter Gym', file: 'c/building-b.glb', s: 5, x: 26, z: 11, rot: -Math.PI / 2, color: 0x56b36b },
  { id: 'home', label: '🏠 Home', verb: 'Go Home', file: 's/building-type-l.glb', s: 6, x: -11, z: 26, rot: Math.PI, color: 0xe08b5a },
  { id: 'bank', label: '🏦 Bank', verb: 'Visit the Bank', file: 'c/building-c.glb', s: 5, x: 11, z: 26, rot: Math.PI, color: 0x9a6bd1 }
];
export const NPC_SPOTS = [{ id: 'cafe', x: 10, z: -5, glb: 'e' }, { id: 'teacher', x: -10, z: -6, glb: 'f' }, { id: 'trainer', x: 10, z: 7, glb: 'g' }];
export const BOUND = 38;

function label(text, color, h = 1.9) {
  const c = document.createElement('canvas'), x = c.getContext('2d'); x.font = 'bold 60px system-ui,Segoe UI,sans-serif'; const cw = Math.max(200, Math.ceil(x.measureText(text).width) + 80); c.width = cw; c.height = 128;
  x.fillStyle = '#' + color.toString(16).padStart(6, '0'); x.beginPath(); x.roundRect(6, 10, cw - 12, 108, 30); x.fill();
  x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 5; x.stroke();
  x.fillStyle = '#fff'; x.font = 'bold 60px system-ui,Segoe UI,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, cw / 2, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false })); sp.scale.set(h * cw / 128, h, 1); return sp;
}
export { label };

function paving() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#d8c6a5'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#cdb792' : '#dccaa8'; x.fillRect(i * 64 + 2, j * 64 + 2, 60, 60); }
  x.strokeStyle = 'rgba(120,90,60,.35)'; x.lineWidth = 2; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, 256); x.moveTo(0, i * 64); x.lineTo(256, i * 64); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function grass() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#7fae5a'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 500; i++) { x.fillStyle = Math.random() < .5 ? '#6f9e4d' : '#92bd68'; x.fillRect(Math.random() * 128, Math.random() * 128, 3, 3); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(70, 70); return t;
}

export async function buildWorld(scene, onProgress = () => {}) {
  const colliders = []; const places = []; const T = 6; const upd = [];
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .85, flatShading: true, ...o });
  // ground
  const g = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ map: grass(), roughness: 1 })); g.rotation.x = -Math.PI / 2; g.receiveShadow = true; scene.add(g);
  const pave = paving(); pave.repeat.set(9, 9);
  const base = new THREE.Mesh(new THREE.PlaneGeometry(56, 56), new THREE.MeshStandardMaterial({ map: pave, roughness: .95 })); base.rotation.x = -Math.PI / 2; base.position.y = .01; base.receiveShadow = true; scene.add(base);
  const pl = paving(); pl.repeat.set(5, 5);
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ map: pl, color: 0xf0b88c, roughness: .9 })); plaza.rotation.x = -Math.PI / 2; plaza.position.y = .03; plaza.receiveShadow = true; scene.add(plaza);
  const trim = new THREE.Mesh(new THREE.RingGeometry(1, 1, 4), mat(0xb04a35)); // brick-red plaza border
  for (const [w, h, x, z] of [[30.8, .8, 0, -15.2], [30.8, .8, 0, 15.2], [.8, 30.8, -15.2, 0], [.8, 30.8, 15.2, 0]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, .08, h), mat(0xb04a35)); b.position.set(x, .06, z); scene.add(b); }
  onProgress(.1);
  // ring road (tile index +-3 -> +-18)
  const rs = await loadGLB('assets/r/road-straight.glb'), rb = await loadGLB('assets/r/road-bend.glb');
  const put = (gl, x, z, rot) => { const m = gl.scene.clone(true); m.scale.setScalar(T); m.position.set(x, .04, z); m.rotation.y = rot; m.traverse(o => o.isMesh && (o.receiveShadow = true)); scene.add(m); };
  for (let i = -3; i <= 3; i++) {
    if (Math.abs(i) < 3) { put(rs, i * T, -3 * T, 0); put(rs, i * T, 3 * T, 0); put(rs, -3 * T, i * T, Math.PI / 2); put(rs, 3 * T, i * T, Math.PI / 2); }
  }
  put(rb, -3 * T, -3 * T, 0); put(rb, 3 * T, -3 * T, -Math.PI / 2); put(rb, 3 * T, 3 * T, Math.PI); put(rb, -3 * T, 3 * T, Math.PI / 2);
  onProgress(.25);
  // enterable buildings
  for (const p of PLACES) {
    const m = await model('assets/' + p.file, p.s); m.rotation.y = p.rot; m.position.set(p.x, 0, p.z); scene.add(m); m.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(m); colliders.push({ t: 'box', x0: bb.min.x + .2, x1: bb.max.x - .2, z0: bb.min.z + .2, z1: bb.max.z - .2, y1: bb.max.y });
    const f = new THREE.Vector2(Math.sin(p.rot), Math.cos(p.rot)); const half = Math.abs(f.x) > .5 ? (bb.max.x - bb.min.x) / 2 : (bb.max.z - bb.min.z) / 2;
    const dx = p.x + f.x * (half + 1.6), dz = p.z + f.y * (half + 1.6);
    const sign = label(p.label, p.color, 2.2); sign.position.set(p.x, bb.max.y + 1.6, p.z); scene.add(sign);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.7, 40), new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: .9, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.set(dx, .12, dz); scene.add(ring);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, 7, 20, 1, true), new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: .22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); beam.position.set(dx, 3.5, dz); scene.add(beam);
    upd.push(t => { ring.scale.setScalar(1 + Math.sin(t * 3 + p.x) * .08); beam.material.opacity = .18 + Math.sin(t * 2 + p.z) * .06; });
    places.push({ id: p.id, label: p.label, verb: p.verb, x: dx, z: dz, r: 3 });
  }
  onProgress(.5);
  // filler buildings and houses
  const fill = [
    ['c/building-f.glb', 5, -26, -9, Math.PI / 2], ['s/building-type-a.glb', 6, -26, 11, Math.PI / 2], ['c/building-h.glb', 5, -26, 1, Math.PI / 2],
    ['c/building-skyscraper-a.glb', 5, -27, -27, 0], ['c/building-skyscraper-d.glb', 5, 27, -27, 0], ['s/building-type-c.glb', 6, -27, 27, Math.PI], ['s/building-type-h.glb', 6, 27, 27, Math.PI],
    ['c/building-e.glb', 5, 26, 1, -Math.PI / 2], ['s/building-type-q.glb', 6, 0, 28, Math.PI], ['c/building-a.glb', 5, 0, -28, 0]
  ];
  for (const [f, s, x, z, r] of fill) { const m = await model('assets/' + f, s); m.rotation.y = r; m.position.set(x, 0, z); scene.add(m); m.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(m); colliders.push({ t: 'box', x0: bb.min.x + .2, x1: bb.max.x - .2, z0: bb.min.z + .2, z1: bb.max.z - .2, y1: bb.max.y }); }
  // back skyline: full Kenney buildings in a ring, facing the plaza
  const back = ['c/building-a.glb', 'c/building-b.glb', 'c/building-c.glb', 'c/building-d.glb', 'c/building-e.glb', 'c/building-f.glb', 'c/building-h.glb', 'c/building-n.glb', 's/building-type-a.glb', 's/building-type-c.glb', 's/building-type-h.glb', 's/building-type-q.glb'];
  let k = 0; for (let i = -5; i <= 5; i++) for (const [ax, az, rot] of [[1, 0, Math.PI], [-1, 0, 0], [0, 1, Math.PI / 2], [0, -1, -Math.PI / 2]]) {
    const o = i * 9 + ((k * 7) % 5), f = back[k++ % back.length]; const d = 46 + (k % 3) * 3; const x = ax ? ax * d : o, z = az ? az * d : o;
    const m = await model('assets/' + f, f[0] === 's' ? 6 : 5 + (k % 2)); m.position.set(x, 0, z); m.rotation.y = Math.atan2(-x, -z) + (ax || az ? 0 : 0); scene.add(m); }
  onProgress(.7);
  // trees, lamps
  const tree = await loadGLB('assets/s/tree-large.glb'), tree2 = await loadGLB('assets/s/tree-small.glb'), lamp = await loadGLB('assets/r/light-square.glb');
  const addTree = (x, z, s = 7) => { const m = (Math.random() < .5 ? tree : tree2).scene.clone(true); m.scale.setScalar(s * (.85 + Math.random() * .4)); m.position.set(x, 0, z); m.rotation.y = Math.random() * 6; m.traverse(o => o.isMesh && (o.castShadow = true)); scene.add(m); colliders.push({ t: 'circle', x, z, r: .9 }); };
  for (let i = -36; i <= 36; i += 6) { addTree(i, -35.5); addTree(i, 35.5); addTree(-35.5, i + 3); addTree(35.5, i + 3); }
  for (const [x, z] of [[-13, -13], [13, -13], [-13, 13], [13, 13], [-13, 0], [13, 0], [0, -13], [0, 13]]) addTree(x * .98, z * .98, 6);
  const poles = [];
  for (const [x, z, r] of [[-14, -14, 0], [14, -14, 0], [-14, 14, Math.PI], [14, 14, Math.PI], [0, -14, 0], [0, 14, Math.PI], [-14, 0, Math.PI / 2], [14, 0, -Math.PI / 2]]) {
    const m = lamp.scene.clone(true); m.scale.setScalar(9); m.position.set(x, 0, z); m.rotation.y = r; scene.add(m); poles.push(new THREE.Vector3(x, 5.6, z)); colliders.push({ t: 'circle', x, z, r: .4 });
    const bulb = new THREE.PointLight(0xffd9a0, 8, 14, 2); bulb.position.set(x, 5.4, z); /* decor only, cheap */
  }
  // bunting: coloured flags on strings between poles
  const order = [0, 4, 1, 7, 3, 5, 2, 6]; const cols = [0xe34a3a, 0xf2b630, 0x3fa9e0, 0x4fb36a, 0xffffff, 0xe34a3a, 0xf2b630, 0x3fa9e0]; const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-.35, 0, 0, .35, 0, 0, 0, -.7, 0], 3)); tri.computeVertexNormals();
  const segs = [[0, 4], [4, 1], [1, 7], [7, 3], [3, 5], [5, 2], [2, 6], [6, 0]]; const N = 12; const inst = new THREE.InstancedMesh(tri, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), segs.length * N); let q = 0; const d = new THREE.Object3D();
  const strP = []; for (const [a, b] of segs) { const A = poles[a], B = poles[b]; const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push(new THREE.Vector3(A.x + (B.x - A.x) * u, A.y - Math.sin(u * Math.PI) * 1.1, A.z + (B.z - A.z) * u)); } strP.push(new THREE.BufferGeometry().setFromPoints(pts));
    for (let i = 1; i <= N; i++) { const u = i / (N + 1); d.position.set(A.x + (B.x - A.x) * u, A.y - Math.sin(u * Math.PI) * 1.1 - .05, A.z + (B.z - A.z) * u); d.rotation.set(0, Math.atan2(B.x - A.x, B.z - A.z) + Math.PI / 2, 0); d.updateMatrix(); inst.setMatrixAt(q, d.matrix); inst.setColorAt(q, new THREE.Color(cols[(q) % cols.length])); q++; } }
  scene.add(inst); for (const gm of strP) scene.add(new THREE.Line(gm, new THREE.LineBasicMaterial({ color: 0x5a3a22 })));
  // landmark: clock tower + pool
  const tw = new THREE.Group(); const brick = mat(0xb5523a), timber = mat(0x7a4a2a), cream = mat(0xf3e6c8), copper = mat(0x3f9c8a);
  const parts = [[new THREE.BoxGeometry(4.4, 1, 4.4), cream, 0, .5], [new THREE.BoxGeometry(3.4, 7, 3.4), brick, 0, 4.5], [new THREE.BoxGeometry(3.9, .5, 3.9), timber, 0, 8.25], [new THREE.BoxGeometry(3, 2.6, 3), cream, 0, 9.8], [new THREE.BoxGeometry(3.5, .4, 3.5), timber, 0, 11.3]];
  for (const [ge, m, x, y] of parts) { const me = new THREE.Mesh(ge, m); me.position.set(x, y, 0); me.castShadow = me.receiveShadow = true; tw.add(me); }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.9, 3.4, 4), copper); roof.position.y = 13.2; roof.rotation.y = Math.PI / 4; roof.castShadow = true; tw.add(roof);
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(.05, .08, 1.8, 6), mat(0xf2b630)); spire.position.y = 15.8; tw.add(spire);
  const fc = document.createElement('canvas'); fc.width = fc.height = 128; const fx = fc.getContext('2d'); fx.fillStyle = '#fff8e6'; fx.beginPath(); fx.arc(64, 64, 60, 0, 7); fx.fill(); fx.strokeStyle = '#4a2c1a'; fx.lineWidth = 6; fx.stroke(); fx.lineWidth = 5; fx.lineCap = 'round'; fx.beginPath(); fx.moveTo(64, 64); fx.lineTo(64, 24); fx.moveTo(64, 64); fx.lineTo(92, 74); fx.stroke();
  const ft = new THREE.CanvasTexture(fc); ft.colorSpace = THREE.SRGBColorSpace;
  for (let i = 0; i < 4; i++) { const face = new THREE.Mesh(new THREE.CircleGeometry(1.1, 24), new THREE.MeshBasicMaterial({ map: ft })); face.position.set(0, 9.8, 1.52); const pv = new THREE.Group(); pv.rotation.y = i * Math.PI / 2; pv.add(face); tw.add(pv); }
  scene.add(tw); colliders.push({ t: 'circle', x: 0, z: 0, r: 6.2 });
  const pool = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.8, .7, 32), mat(0xe9d9b8)); pool.position.y = .35; pool.receiveShadow = true; scene.add(pool);
  const water = new THREE.Mesh(new THREE.CircleGeometry(5.1, 32), new THREE.MeshStandardMaterial({ color: 0x3aa6c9, roughness: .15, metalness: .1, transparent: true, opacity: .85 })); water.rotation.x = -Math.PI / 2; water.position.y = .62; scene.add(water);
  upd.push(t => { water.material.color.setHSL(.54 + Math.sin(t * .6) * .01, .6, .5 + Math.sin(t * 1.2) * .03); });
  // benches
  for (const [x, z, r] of [[-8, 9, 0], [8, 10, 0], [-9, -10, Math.PI], [9, -11, Math.PI]]) { const b = new THREE.Group(); const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, .15, .8), mat(0x8a5a33)); seat.position.y = .6; const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, .7, .1), mat(0x8a5a33)); back.position.set(0, 1, -.35); const l1 = new THREE.Mesh(new THREE.BoxGeometry(.12, .6, .7), mat(0x333)); l1.position.set(-1, .3, 0); const l2 = l1.clone(); l2.position.x = 1; b.add(seat, back, l1, l2); b.position.set(x, 0, z); b.rotation.y = r; b.traverse(o => o.isMesh && (o.castShadow = true)); scene.add(b); colliders.push({ t: 'circle', x, z, r: 1 }); }
  // mountains + sky + clouds
  const mg = new THREE.Group(); const mm = mat(0x6c80a6), snow = mat(0xffffff);
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2 + Math.sin(i * 7) * .08, r = 190 + (i % 3) * 25, h = 55 + ((i * 37) % 50), w = 55 + (i * 13) % 40;
    const c = new THREE.Mesh(new THREE.ConeGeometry(w, h, 6 + i % 2), mm); c.position.set(Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r); c.rotation.y = i; mg.add(c);
    const sn = new THREE.Mesh(new THREE.ConeGeometry(w * .34, h * .34, 6 + i % 2), snow); sn.position.set(c.position.x, h * .83 - 2, c.position.z); sn.rotation.y = i; mg.add(sn); }
  scene.add(mg);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(520, 24, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec3 p; void main(){ float h = clamp(p.y,0.,1.); vec3 hor=vec3(1.,.82,.62), mid=vec3(.55,.76,.95), top=vec3(.22,.42,.82); vec3 c = mix(hor, mid, smoothstep(0.,.25,h)); c = mix(c, top, smoothstep(.25,.9,h)); float sun = pow(max(dot(p, normalize(vec3(-.5,.45,-.6))),0.), 60.); c += vec3(1.,.8,.5)*sun*.9; gl_FragColor = vec4(c,1.); }' }));
  scene.add(sky);
  const clouds = new THREE.Group(); const cm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .92 });
  for (let i = 0; i < 9; i++) { const c = new THREE.Group(); for (let j = 0; j < 4; j++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(7 + j * 1.5, 0), cm); s.position.set(j * 8 - 12, Math.sin(j * 2) * 2, 0); s.scale.y = .55; c.add(s); } c.position.set(-250 + i * 62, 120 + (i % 3) * 14, -150 + (i * 53) % 280); clouds.add(c); }
  scene.add(clouds); upd.push(t => { clouds.position.x = ((t * 1.2) % 120); });
  onProgress(1);
  return { colliders, places, update: t => upd.forEach(f => f(t)), poles };
}
