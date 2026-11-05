// Sansar character creator: turntable avatar under studio light, live updates, phone sheet / laptop side panel.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as A from './avatar.js';

const $ = (s) => document.querySelector(s), qs = new URLSearchParams(location.search);
const IDK = 'sansar.id', myId = localStorage[IDK] || (localStorage[IDK] = crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------- stage: Style A light (warm key, cool rim, soft fill) on a turntable
const canvas = $('#gl'), renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(28, 1, .1, 50);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .5;
scene.add(new THREE.HemisphereLight(0xcfdcff, 0x6a4a36, .55));
const key = new THREE.DirectionalLight(0xffdcb0, 3.1); key.position.set(-2.6, 3.4, 3.4); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -1.6, right: 1.6, top: 2.4, bottom: -.5, near: 1, far: 12 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02; scene.add(key);
const rim = new THREE.DirectionalLight(0x9cc0ff, 2.2); rim.position.set(2.8, 2.4, -3); scene.add(rim);
const fill = new THREE.DirectionalLight(0xffeeda, .7); fill.position.set(3, 1, 3); scene.add(fill);
const plate = new THREE.Mesh(new THREE.CylinderGeometry(.95, 1.0, .05, 64), new THREE.MeshStandardMaterial({ color: 0x4a3226, roughness: .6, metalness: .1 })); plate.position.y = -.025; plate.receiveShadow = true; scene.add(plate);
const ring = new THREE.Mesh(new THREE.RingGeometry(.9, .95, 64), new THREE.MeshBasicMaterial({ color: 0xf2b630, transparent: true, opacity: .55 })); ring.rotation.x = -Math.PI / 2; ring.position.y = .003; scene.add(ring);

// ---------------------------------------------------------------- state
const pose = { speed: 0, sit: false };                     // QA hook: window.__create.pose
let look = null, av = null, tab = 'skin', turn = 0, dragging = false, lastDrag = -9, cam = { y: 1, d: 6, ty: 1, td: 6 };
const manager = new THREE.LoadingManager();

function frame(animate) {                                  // camera target per tab: head for face/hair/eyes, body otherwise
  const h = look ? look.h / 100 : 1.7, head = { skin: 0, hair: 1, face: 1, eyes: 1 }[tab] === 1, aspect = camera.aspect;
  const fovV = THREE.MathUtils.degToRad(camera.fov), need = head ? h * .3 : h * 1.18, dFit = (need / 2) / Math.tan(fovV / 2), dW = ((head ? .75 : 1.5) / 2) / Math.tan(fovV / 2) / aspect;
  cam.ty = head ? h * .9 : h * .5; cam.td = Math.max(dFit, dW); if (!animate) { cam.y = cam.ty; cam.d = cam.td; }
}
function resize() {
  const st = $('#stage'), w = st.clientWidth, h = st.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); frame(false);
}
addEventListener('resize', resize);
let last = performance.now(), fN = 0, fT = 0; window.__fps = 0;
function loop(now) {
  requestAnimationFrame(loop); const dt = Math.min(.05, (now - last) / 1000); last = now; fN++; fT += dt; if (fT >= 1) { window.__fps = Math.round(fN / fT); fN = fT = 0; }
  if (av && av.look) { if (pose.turn !== undefined) turn = pose.turn; if (!dragging && !reduce && now / 1000 - lastDrag > 1.5) turn += dt * .5; av.root.rotation.y = turn; av.update(dt, pose.speed, pose.sit); }
  const k = 1 - Math.exp(-6 * dt); cam.y += (cam.ty - cam.y) * k; cam.d += (cam.td - cam.d) * k;
  camera.position.set(0, cam.y + cam.d * .06, cam.d); camera.lookAt(0, cam.y, 0); renderer.render(scene, camera);
}
let drag = null;
canvas.addEventListener('pointerdown', (e) => { drag = { id: e.pointerId, x: e.clientX }; dragging = true; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; });
canvas.addEventListener('pointermove', (e) => { if (drag && e.pointerId === drag.id) { turn += (e.clientX - drag.x) * .012; drag.x = e.clientX; } });
const dend = () => { drag = null; dragging = false; lastDrag = performance.now() / 1000; canvas.style.cursor = 'grab'; };
canvas.addEventListener('pointerup', dend); canvas.addEventListener('pointercancel', dend);

// ---------------------------------------------------------------- panel
const D = () => A.info(), FAMN = { m: 'Masculine', f: 'Feminine' };
const TABS = [['skin', 'Skin'], ['hair', 'Hair'], ['face', 'Face'], ['eyes', 'Eyes'], ['clothes', 'Clothes'], ['body', 'Body'], ['presets', 'Presets']];
const hex = (arr) => arr.map((c) => c[1]);
const sw = (k, list, cur, noneFirst) => `<div class="sws">${list.map((h, i) => `<button class="sw${noneFirst && i === 0 ? ' none' : ''}${i === cur ? ' on' : ''}" data-k="${k}" data-v="${i}" style="${noneFirst && i === 0 ? '' : 'background:' + h}" aria-label="${k} ${i + 1}" title="${(noneFirst ? A.CLOTH : D().colors.skin)[i] ? '' : ''}"></button>`).join('')}</div>`;
const chips = (k, labels, cur) => `<div class="chips">${labels.map((l, i) => `<button class="chip${i === cur ? ' on' : ''}" data-k="${k}" data-v="${i}">${l}</button>`).join('')}</div>`;
const lab = (cat) => D().index[look.g][cat].map((p) => p.label);
const PRESETS = [
  ['Aarav', 'young adult', { g: 'm', ag: 2, sk: 7, hs: 'Casual_2', hc: 0, ey: 1, tp: 'Casual_2', bt: 'Casual_2', sh: 'Casual_2', h: 172 }],
  ['Mira', 'adult', { g: 'f', ag: 2, sk: 12, hs: 'Casual', hc: 0, ey: 0, tp: 'Casual', tc: 7, bt: 'Casual', sh: 'Casual', h: 168 }],
  ['Jonas', 'adult', { g: 'm', ag: 2, sk: 3, hs: 'Suit', hc: 2, ey: 3, tp: 'Suit', bt: 'Suit', sh: 'Suit', h: 180, b: 2 }],
  ['Lina', 'adult', { g: 'f', ag: 2, sk: 4, hs: 'Suit', hc: 5, ey: 2, tp: 'Suit', tc: 3, bt: 'Suit', sh: 'Suit', h: 165 }],
  ['Haruto', 'elder', { g: 'm', ag: 3, sk: 3, hs: 'Casual_Hoodie', hc: 15, ey: 0, tp: 'Casual_Hoodie', tc: 5, bt: 'Casual_Hoodie', sh: 'Casual_Hoodie', h: 164, b: 0 }],
  ['Doris', 'elder', { g: 'f', ag: 3, sk: 11, hs: 'Casual', hc: 11, ey: 0, tp: 'Casual', tc: 4, bt: 'Casual', sh: 'Casual', h: 156 }],
  ['Yara', 'teen', { g: 'f', ag: 1, sk: 12, hs: 'Casual', hc: 0, ey: 0, tp: 'Casual', tc: 10, bt: 'Casual', sh: 'Casual', h: 160, b: 0 }],
  ['Sami', 'child', { g: 'm', ag: 0, sk: 2, hs: 'Casual_Hoodie', hc: 1, ey: 1, tp: 'Casual_Hoodie', tc: 8, bt: 'Casual_Hoodie', sh: 'Casual_Hoodie', h: 118 }]];
function presetLook(o) { const X = D().index[o.g], at = (cat, s) => Math.max(0, X[cat].findIndex((p) => p.style === s)); return { ...o, hs: at('head', o.hs), tp: at('top', o.tp), bt: at('bot', o.bt), sh: at('shoe', o.sh) }; }
const PANELS = {
  skin: () => `<h4>Skin tone</h4>${sw('sk', hex(D().colors.skin), look.sk)}`,
  hair: () => `<h4>Hair and head style</h4>${chips('hs', lab('head'), look.hs)}<h4>Hair colour</h4>${sw('hc', hex(D().colors.hair), look.hc)}`,
  face: () => `<h4>Face width</h4>${chips('fw', ['Narrow', 'Slim', 'Medium', 'Wide', 'Broad'], look.fw)}<h4>Face length</h4>${chips('fl', ['Short', 'Compact', 'Medium', 'Long', 'Tall'], look.fl)}`,
  eyes: () => `<h4>Eye colour</h4>${sw('ey', hex(D().colors.eyes), look.ey)}`,
  clothes: () => `<h4>Top</h4>${chips('tp', lab('top'), look.tp)}<h4>Top colour</h4>${sw('tc', A.CLOTH.map((c) => c[1]), look.tc, true)}<h4>Bottom</h4>${chips('bt', lab('bot'), look.bt)}<h4>Bottom colour</h4>${sw('bc', A.CLOTH.map((c) => c[1]), look.bc, true)}<h4>Shoes</h4>${chips('sh', lab('shoe'), look.sh)}<h4>Shoe colour</h4>${sw('sc', A.CLOTH.map((c) => c[1]), look.sc, true)}`,
  body: () => `<h4>Body type</h4>${chips('g', ['Masculine', 'Feminine'], look.g === 'm' ? 0 : 1)}<h4>Age</h4>${chips('ag', A.AGES.map((a) => a[0]), look.ag)}<h4>Build</h4>${chips('b', A.BUILDS, look.b)}<h4>Height</h4><div class="rng"><input type="range" id="hgt" min="${HR[look.ag][0]}" max="${HR[look.ag][1]}" value="${look.h}"><b id="hv">${look.h} cm</b></div>`,
  presets: () => `<h4>Start from a person</h4><div class="chips">${PRESETS.map((p, i) => `<button class="pre" data-pre="${i}">${p[0]}<small>${p[1]} · ${p[2].g === 'm' ? 'masculine' : 'feminine'}</small></button>`).join('')}</div>`,
};
const HR = [[100, 145], [140, 182], [145, 200], [143, 190]];
function renderPanel() {
  const p = $('#panel'), top = p.scrollTop; p.innerHTML = PANELS[tab](); p.scrollTop = top; const r = $('#hgt');
  if (r) r.oninput = () => { look.h = +r.value; $('#hv').textContent = r.value + ' cm'; apply(); };
  $('#tabs').querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.t === tab));
}
let applyT = 0;
async function apply() { look = A.fixLook(look); const ok = await av.set(look); if (ok) { localStorage['sansar.av'] = JSON.stringify(look); } frame(true); }
$('#panel').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.pre) { const pr = PRESETS[+b.dataset.pre]; look = A.fixLook(presetLook(pr[2])); $('#nm').value ||= pr[0]; renderPanel(); apply(); return; }
  const k = b.dataset.k; if (!k) return; let v = +b.dataset.v;
  if (k === 'g') { look.g = v ? 'f' : 'm'; look.h = A.fixLook({ ...look, h: undefined }).h; } else if (k === 'ag') { look.ag = v; look.h = A.fixLook({ ...look, h: undefined }).h; if (v === 3 && look.hc < 11) look.hc = 11; } else look[k] = v;
  renderPanel(); apply(); if (k === 'g') prefetch();
});
$('#tabs').innerHTML = TABS.map(([k, n]) => `<button class="tab" data-t="${k}">${n}</button>`).join('');
$('#tabs').addEventListener('click', (e) => { const b = e.target.closest('.tab'); if (!b) return; tab = b.dataset.t; renderPanel(); frame(true); prefetch(); });
$('#rnd').onclick = () => { look = A.randomLook(); renderPanel(); apply(); };
function prefetch() {                                      // warm the parts of the visible tab so a tap is instant
  const want = { hair: ['head'], clothes: ['top', 'bot', 'shoe'] }[tab]; if (!want) return;
  const fx = A.info().index[look.g]; setTimeout(() => want.forEach((c) => fx[c].forEach((p) => fetch('/assets/av/' + p.file + '?v=4'))), 300);
}
async function save() {
  const name = ($('#nm').value || '').trim() || 'Resident'; look = A.fixLook(look); $('#save').disabled = true;
  localStorage['sansar.av'] = JSON.stringify(look); localStorage['sansar.name'] = name;
  let ok = false; try { const r = await fetch('/api/avatar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: myId, name, look }) }); ok = r.ok; } catch (e) {}
  window.__saved = { ok, name, look };
  if (!ok) {
    $('#save').disabled = false;
    $('#save').textContent = 'Save failed - tap to retry';
    return false;
  }
  $('#save').textContent = 'Save and enter Sansar';
  if (!qs.has('stay')) location.href = '/world'; else $('#save').disabled = false;
  return ok;
}
$('#save').onclick = save;

// ---------------------------------------------------------------- boot
(async function boot() {
  try {
    await A.init(manager); let saved = null;
    try { const r = await fetch('/api/avatar?id=' + encodeURIComponent(myId)).then((x) => x.json()); if (r && r.look) { saved = r; } } catch (e) {}
    if (!saved && localStorage['sansar.av']) { try { saved = { look: JSON.parse(localStorage['sansar.av']), name: localStorage['sansar.name'] }; } catch (e) {} }
    look = A.fixLook(saved ? saved.look : presetLook(PRESETS[0][2])); $('#nm').value = (saved && saved.name) || localStorage['sansar.name'] || '';
    if (saved) $('#back').hidden = false;
    av = A.createAvatar(look); scene.add(av.root); await av.ready;
    renderPanel(); resize(); requestAnimationFrame(loop);
    $('#load').style.opacity = 0; setTimeout(() => $('#load').remove(), 600); window.__ready = true;
  } catch (e) { console.error(e); $('#load').textContent = 'Could not load: ' + e.message; window.__err = String(e.stack || e); }
  window.__create = { pose, get look() { return look; }, set(l) { look = A.fixLook(l); renderPanel(); return apply(); }, save, get av() { return av; }, scene, camera, renderer, A, setName(n) { $('#nm').value = n; } };
})();
