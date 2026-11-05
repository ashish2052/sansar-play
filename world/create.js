// Sansar character creator: tap a tile, the head updates. No photo. Heads, hair and clothes are the ones already built.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as A from './avatar.js?v=pick1';

const $ = (s) => document.querySelector(s), qs = new URLSearchParams(location.search);
const IDK = 'sansar.id', myId = localStorage[IDK] || (localStorage[IDK] = crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const canvas = $('#gl'), renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(28, 1, .1, 50);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .3;
scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x5a4030, .26));
const key = new THREE.DirectionalLight(0xfff0e2, 2.0); key.position.set(-2.3, 3.0, 2.7); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -1.6, right: 1.6, top: 2.4, bottom: -.5, near: 1, far: 12 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02; scene.add(key);
const rim = new THREE.DirectionalLight(0xe2ebff, 2.1); rim.position.set(2.2, 2.9, -3.1); scene.add(rim);
const rim2 = new THREE.DirectionalLight(0xffe4c8, 1.0); rim2.position.set(-2.6, 3.4, -2.4); scene.add(rim2);
const fill = new THREE.DirectionalLight(0xffe9dc, .5); fill.position.set(3, 1.4, 2.6); scene.add(fill);
const plate = new THREE.Mesh(new THREE.CylinderGeometry(.95, 1.0, .05, 64), new THREE.MeshStandardMaterial({ color: 0x4a3226, roughness: .6, metalness: .1 })); plate.position.y = -.025; plate.receiveShadow = true; scene.add(plate);
const ring = new THREE.Mesh(new THREE.RingGeometry(.9, .95, 64), new THREE.MeshBasicMaterial({ color: 0xf2b630, transparent: true, opacity: .55 })); ring.rotation.x = -Math.PI / 2; ring.position.y = .003; scene.add(ring);

const pose = { speed: 0, sit: false, turn: 0 };
let look = null, av = null, tab = 'face', turn = 0, dragging = false, lastDrag = -9, cam = { y: 1, d: 6, ty: 1, td: 6 };
let slots = [null, null, null], slot = 0;
const manager = new THREE.LoadingManager();

function frame(animate) {
  const h = look ? look.h / 100 : 1.7, head = { face: 1, eyes: 1, hair: 1, colour: 1 }[tab] === 1, aspect = camera.aspect;
  const fovV = THREE.MathUtils.degToRad(camera.fov), need = head ? h * .28 : h * 1.18, dFit = (need / 2) / Math.tan(fovV / 2), dW = ((head ? .7 : 1.5) / 2) / Math.tan(fovV / 2) / aspect;
  cam.ty = head ? h * .9 : h * .5; cam.td = Math.max(dFit, dW); if (!animate) { cam.y = cam.ty; cam.d = cam.td; }
}
function resize() {
  const st = $('#stage'), w = st.clientWidth, h = st.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); frame(false);
}
addEventListener('resize', resize);
let last = performance.now(), fN = 0, fT = 0; window.__fps = 0;
function loop(now) {
  requestAnimationFrame(loop); const dt = Math.min(.05, (now - last) / 1000); last = now; fN++; fT += dt; if (fT >= 1) { window.__fps = Math.round(fN / fT); fN = fT = 0; }
  if (av && av.look) {
    if (pose.turn !== undefined) turn = pose.turn; else if (!dragging && !reduce && now / 1000 - lastDrag > 1.5) turn += dt * .5;
    av.root.rotation.y = turn; av.update(dt, pose.speed, pose.sit);
  }
  const k = 1 - Math.exp(-6 * dt); cam.y += (cam.ty - cam.y) * k; cam.d += (cam.td - cam.d) * k;
  camera.position.set(0, cam.y + cam.d * .06, cam.d); camera.lookAt(0, cam.y, 0); renderer.render(scene, camera);
}
let drag = null;
canvas.addEventListener('pointerdown', (e) => { pose.turn = undefined; drag = { id: e.pointerId, x: e.clientX }; dragging = true; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; });
canvas.addEventListener('pointermove', (e) => { if (drag && e.pointerId === drag.id) { turn += (e.clientX - drag.x) * .012; drag.x = e.clientX; } });
const dend = () => { drag = null; dragging = false; lastDrag = performance.now() / 1000; canvas.style.cursor = 'grab'; };
canvas.addEventListener('pointerup', dend); canvas.addEventListener('pointercancel', dend);
$('#front').onclick = () => { pose.turn = 0; turn = 0; };
$('#side').onclick = () => { pose.turn = Math.PI / 2; turn = Math.PI / 2; };

const svg = (inner) => `<svg viewBox="0 0 64 64" aria-hidden="true">${inner}</svg>`;
const faceIcon = (i) => { const rx = [18, 16, 22, 14, 17, 18, 23, 13, 19, 20, 15, 21][i] || 18, ry = [24, 22, 20, 26, 23, 25, 19, 26, 22, 18, 27, 21][i] || 22; return svg(`<ellipse cx="32" cy="34" rx="${rx}" ry="${ry}" fill="#e4b892" stroke="#3a2216" stroke-width="2"/><circle cx="${(32 - rx * .38).toFixed(1)}" cy="32" r="2" fill="#2a1a10"/><circle cx="${(32 + rx * .38).toFixed(1)}" cy="32" r="2" fill="#2a1a10"/><path d="M26 44 Q32 48 38 44" fill="none" stroke="#a85a5a" stroke-width="2"/>`); };
const eyeIcon = (i) => { const rx = [7, 8, 5, 7, 7, 7, 7, 9, 4, 6][i] || 7, tilt = [0, 0, 0, 0, 0, -8, 8, 0, 0, 6][i] || 0; return svg(`<g transform="rotate(${tilt} 32 32)"><ellipse cx="22" cy="32" rx="${rx}" ry="5" fill="#fff" stroke="#2a1a10" stroke-width="2"/><ellipse cx="42" cy="32" rx="${rx}" ry="5" fill="#fff" stroke="#2a1a10" stroke-width="2"/><circle cx="22" cy="32" r="2.2" fill="#3a2414"/><circle cx="42" cy="32" r="2.2" fill="#3a2414"/></g>`); };
const browIcon = (i) => { const w = [3, 1.5, 5, 3, 3.5, 2.5, 4, 2, 5, 1.4][i] || 3, y = [22, 20, 24, 18, 28, 16, 24, 20, 23, 19][i] || 22; return svg(`<path d="M12 ${y + 4} Q22 ${y - 6} 30 ${y}" fill="none" stroke="#2a1a10" stroke-width="${w}" stroke-linecap="round"/><path d="M34 ${y} Q42 ${y - 6} 52 ${y + 4}" fill="none" stroke="#2a1a10" stroke-width="${w}" stroke-linecap="round"/>`); };
const noseIcon = (i) => { const w = [8, 5, 12, 8, 7, 6, 11, 7, 8, 10][i] || 8; return svg(`<path d="M32 14 L${32 - w} 40 Q32 48 ${32 + w} 40 Z" fill="#e4b892" stroke="#3a2216" stroke-width="2"/>`); };
const lipIcon = (i) => { const h = [6, 3, 6, 9, 11, 4, 7, 8, 6, 12][i] || 6, w = [16, 12, 20, 16, 17, 12, 15, 13, 20, 16][i] || 16; return svg(`<ellipse cx="32" cy="32" rx="${w}" ry="${h}" fill="#c45b6a"/>`); };
const beardIcon = (i) => svg(`<ellipse cx="32" cy="28" rx="16" ry="14" fill="#e4b892"/><ellipse cx="32" cy="40" rx="${8 + (i % 5) * 2}" ry="${6 + (i % 4) * 2}" fill="#3a2a1a" opacity="${i ? .35 + (i % 6) * .1 : 0}"/>`);
const makeupIcon = (i) => { const lip = ['#e4b892', '#e4b892', '#e4b892', '#d7a090', '#c45b6a', '#a32030', '#e4b892', '#c45b6a', '#a32030', '#d08990'][i]; return svg(`<ellipse cx="32" cy="32" rx="16" ry="20" fill="#e4b892"/><ellipse cx="24" cy="28" rx="4" ry="2" fill="none" stroke="#2a1a10" stroke-width="${i === 1 || i === 2 || i === 7 || i === 8 ? 2 : 1}"/><ellipse cx="40" cy="28" rx="4" ry="2" fill="none" stroke="#2a1a10" stroke-width="${i === 1 || i === 2 || i === 7 || i === 8 ? 2 : 1}"/><ellipse cx="32" cy="40" rx="7" ry="3" fill="${lip}"/>`); };
const hairIcon = (label) => { const tall = /long|pony|wave|curl/i.test(label) ? 28 : /bald/i.test(label) ? 8 : 16; return svg(`<ellipse cx="32" cy="40" rx="14" ry="16" fill="#e4b892"/><path d="M16 ${36 - tall / 3} Q32 ${8 - tall / 4} 48 ${36 - tall / 3} Q44 28 32 26 Q20 28 16 ${36 - tall / 3}" fill="#2a211c"/>`); };
const bodyIcon = (i) => { const w = [10, 12, 9, 13, 14, 12, 15, 18, 10, 14][i] || 12, h = [20, 22, 26, 28, 24, 30, 32, 28, 34, 36][i] || 28; return svg(`<circle cx="32" cy="14" r="6" fill="#e4b892"/><rect x="${32 - w}" y="22" width="${w * 2}" height="${h}" rx="6" fill="#7eb0d4"/>`); };
const clothIcon = (hex) => svg(`<circle cx="32" cy="14" r="6" fill="#e4b892"/><path d="M16 28 L24 24 L32 30 L40 24 L48 28 L44 52 L20 52 Z" fill="${hex || '#5a8fc9'}"/>`);
const tile = (k, i, on, picture, label) => `<button type="button" class="tile${on ? ' on' : ''}" data-k="${k}" data-v="${i}" aria-label="${label}">${picture}<small>${label}</small></button>`;
const row = (cat, title, html, n) => `<section class="row" data-cat="${cat}" data-n="${n}"><h4>${title}</h4><div class="tiles">${html}</div></section>`;
const colors = () => A.info().colors, hairs = () => A.info().index[look.g].hair;
const outfitOn = (i) => { const s = A.OUTFITS[i][look.g]; return A.partIndex(look.g, 'top', s.tp) === look.tp && A.partIndex(look.g, 'bot', s.bt) === look.bt && A.partIndex(look.g, 'shoe', s.sh) === look.sh && s.tc === look.tc; };
const TABS = [['face', 'Face'], ['eyes', 'Eyes'], ['hair', 'Hair'], ['colour', 'Colour'], ['body', 'Body'], ['clothes', 'Clothes']];
const PANELS = {
  face: () => row('face', 'Face shape', A.FACE_OPTS.map((f, i) => tile('fs', i, look.fw === f[1] && look.fl === f[2], faceIcon(i), f[0])).join(''), A.FACE_OPTS.length)
    + row('brows', 'Brows', A.BROW_SHAPES.map((n, i) => tile('br', i, look.br === i, browIcon(i), n)).join(''), A.BROW_SHAPES.length)
    + row('nose', 'Nose', A.NOSE_SHAPES.map((n, i) => tile('ns', i, look.ns === i, noseIcon(i), n)).join(''), A.NOSE_SHAPES.length)
    + row('lips', 'Lips', A.LIP_SHAPES.map((n, i) => tile('lp', i, look.lp === i, lipIcon(i), n)).join(''), A.LIP_SHAPES.length),
  eyes: () => row('eyeshape', 'Eye shape', A.EYE_SHAPES.map((n, i) => tile('es', i, look.es === i, eyeIcon(i), n)).join(''), A.EYE_SHAPES.length)
    + row('eyecolour', 'Eye colour', colors().eyes.map((c, i) => tile('ey', i, look.ey === i, `<i class="dot" style="background:${c[1]}"></i>`, c[0])).join(''), colors().eyes.length),
  hair: () => row('hairstyle', 'Hair style', hairs().map((p, i) => tile('hs', i, look.hs === i, hairIcon(p.label), p.label)).join(''), hairs().length)
    + row('haircolour', 'Hair colour', colors().hair.map((c, i) => tile('hc', i, look.hc === i, `<i class="dot" style="background:${c[1]}"></i>`, c[0])).join(''), colors().hair.length)
    + row('beard', 'Beard and moustache', A.BEARDS.map((n, i) => tile('bd', i, look.bd === i, beardIcon(i), n)).join(''), A.BEARDS.length),
  colour: () => row('skin', 'Skin tone', colors().skin.map((c, i) => tile('sk', i, look.sk === i, `<i class="dot" style="background:${c[1]}"></i>`, c[0])).join(''), colors().skin.length)
    + row('makeup', 'Makeup', A.MAKEUP_NAMES.map((n, i) => tile('mk', i, look.mk === i, makeupIcon(i), n)).join(''), A.MAKEUP_NAMES.length),
  body: () => row('gender', 'Presentation', ['Man', 'Woman'].map((n, i) => tile('g', i, (look.g === 'f' ? 1 : 0) === i, bodyIcon(i + 3), n)).join(''), 2)
    + row('age', 'Life stage preview', A.AGES.map((a, i) => tile('ag', i, look.ag === i, bodyIcon(i + 2), a[0])).join(''), A.AGES.length)
    + row('body', 'Body', A.BODY_OPTS.map((b, i) => tile('bo', i, look.b === b[2] && look.h === A.bodyHeight(i, look.ag), bodyIcon(i), b[0])).join(''), A.BODY_OPTS.length),
  clothes: () => row('outfit', 'Outfit', A.OUTFITS.map((o, i) => tile('of', i, outfitOn(i), clothIcon(A.CLOTH[o[look.g].tc][1]), o.set + ' ' + o[look.g].name)).join(''), A.OUTFITS.length),
};
function renderPanel() {
  const p = $('#panel'), top = p.scrollTop; p.innerHTML = PANELS[tab](); p.scrollTop = top;
  $('#tabs').querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.t === tab));
}
function paintSlots() {
  $('#slots').innerHTML = [0, 1, 2].map((i) => `<button type="button" class="slot${i === slot ? ' on' : ''}" data-slot="${i}">Look ${i + 1}${slots[i] ? '' : ' empty'}</button>`).join('');
}
function readSlots() {
  try { const s = JSON.parse(localStorage['sansar.slots'] || '[]'); if (Array.isArray(s)) slots = [s[0] || null, s[1] || null, s[2] || null]; } catch (e) {}
  slot = Math.max(0, Math.min(2, +localStorage['sansar.slot'] || 0));
}
async function apply() { look = A.fixLook(look); const ok = await av.set(look); if (ok) localStorage['sansar.av'] = JSON.stringify(look); frame(true); return ok; }
function outfitIndex(g, l) {
  return A.OUTFITS.findIndex((row) => { const s = row[g]; return A.partIndex(g, 'top', s.tp) === l.tp && A.partIndex(g, 'bot', s.bt) === l.bt && A.partIndex(g, 'shoe', s.sh) === l.sh && s.tc === l.tc; });
}
$('#panel').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b || !b.dataset.k) return;
  const k = b.dataset.k, v = +b.dataset.v;
  if (k === 'g') {
    const matched = outfitIndex(look.g, look); look.g = v ? 'f' : 'm'; look.hs = 0; look.tp = 0; look.bt = 0; look.sh = 0;
    look = A.fixLook({ ...look, h: undefined }); if (matched >= 0) { look.of = matched; A.applyOutfit(look); }
  } else if (k === 'ag') { look.ag = v; look = A.fixLook({ ...look, h: undefined }); if (v === 3 && look.hc < 11) look.hc = 11; }
  else if (k === 'fs') { const f = A.FACE_OPTS[v]; look.fw = f[1]; look.fl = f[2]; }
  else if (k === 'bo') { look.h = A.bodyHeight(v, look.ag); look.b = A.BODY_OPTS[v][2]; }
  else if (k === 'of') { look.of = v; A.applyOutfit(look); }
  else look[k] = v;
  renderPanel(); apply();
});
$('#tabs').innerHTML = TABS.map(([k, n]) => `<button class="tab" type="button" data-t="${k}">${n}</button>`).join('');
$('#tabs').addEventListener('click', (e) => { const b = e.target.closest('.tab'); if (!b) return; tab = b.dataset.t; renderPanel(); frame(true); });
$('#slots').addEventListener('click', (e) => {
  const b = e.target.closest('[data-slot]'); if (!b) return; slot = +b.dataset.slot; localStorage['sansar.slot'] = String(slot);
  if (slots[slot] && slots[slot].look) { look = A.fixLook(slots[slot].look); if (slots[slot].name) $('#nm').value = slots[slot].name; renderPanel(); apply(); }
  paintSlots();
});
$('#rnd').onclick = () => { look = A.randomLook(); renderPanel(); apply(); };
async function save() {
  const name = ($('#nm').value || '').trim() || 'Resident'; look = A.fixLook(look); $('#save').disabled = true;
  slots[slot] = { look, name }; localStorage['sansar.slots'] = JSON.stringify(slots); localStorage['sansar.slot'] = String(slot);
  localStorage['sansar.av'] = JSON.stringify(look); localStorage['sansar.name'] = name;
  let ok = false; try { const r = await fetch('/api/avatar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: myId, name, look }) }); ok = r.ok; } catch (e) {}
  window.__saved = { ok, name, look, slot };
  if (!ok) { $('#save').disabled = false; $('#save').textContent = 'Save failed - tap to retry'; return false; }
  $('#save').textContent = 'Save and enter Sansar';
  if (!qs.has('stay')) location.href = '/world'; else { $('#save').disabled = false; paintSlots(); }
  return ok;
}
$('#save').onclick = save;

(async function boot() {
  try {
    A.eager(); await A.init(manager); readSlots(); let saved = null;
    try { const r = await fetch('/api/avatar?id=' + encodeURIComponent(myId)).then((x) => x.json()); if (r && r.look) saved = r; } catch (e) {}
    if (!saved && localStorage['sansar.av']) { try { saved = { look: JSON.parse(localStorage['sansar.av']), name: localStorage['sansar.name'] }; } catch (e) {} }
    look = A.fixLook(saved ? saved.look : { g: 'f', sk: 6, fw: 1, fl: 2, hs: 0, hc: 0, ey: 0, h: 163, b: 1, ag: 2 });
    $('#nm').value = (saved && saved.name) || localStorage['sansar.name'] || '';
    if (saved) $('#back').hidden = false;
    if (!slots[slot]) slots[slot] = { look, name: $('#nm').value };
    const phone = matchMedia('(pointer:coarse)').matches || innerWidth < 700;
    av = A.createAvatar(look, { close: !phone, castShadow: !phone }); scene.add(av.root); await av.ready;
    paintSlots(); renderPanel(); resize(); requestAnimationFrame(loop);
    $('#load').style.opacity = 0; setTimeout(() => $('#load').remove(), 600); window.__ready = true;
  } catch (e) { console.error(e); $('#load').textContent = 'Could not load: ' + e.message; window.__err = String(e.stack || e); }
  window.__create = {
    pose, get look() { return look; }, set(l) { look = A.fixLook(l); renderPanel(); return apply(); }, save, get av() { return av; }, scene, camera, renderer, A,
    setName(n) { $('#nm').value = n; }, tab(name) { tab = name; renderPanel(); frame(true); }, slots: () => slots, slot: () => slot,
    counts() { return [...document.querySelectorAll('[data-cat]')].map((n) => [n.dataset.cat, +n.dataset.n]); },
  };
})();
