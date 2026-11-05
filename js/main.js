import * as THREE from 'three';
import { buildWorld, loadGLB, label, NPC_SPOTS, BOUND } from './world.js';
import * as L from './life.js';
import { NPCS } from './content.js';

const $ = s => document.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia('(pointer:coarse)').matches || innerWidth < 700;
const LOOKS = 'abcdefgh'.split('');
const STORE = 'sansar.life.v1', IDK = 'sansar.id';
const myId = localStorage[IDK] || (localStorage[IDK] = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)));

// ---------- renderer ----------
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, touch ? 1.5 : 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0xf4d9b5, 110, 420);
const camera = new THREE.PerspectiveCamera(55, 1, .1, 1200);
scene.add(new THREE.HemisphereLight(0xcfe6ff, 0xa88a60, 1.7));
const sun = new THREE.DirectionalLight(0xffe2b3, 2.6); sun.castShadow = true; const sm = touch ? 1024 : 2048; sun.shadow.mapSize.set(sm, sm);
Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38, near: 1, far: 140 }); sun.shadow.bias = -.0004; sun.shadow.normalBias = .04; scene.add(sun, sun.target);
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

// ---------- characters ----------
const CH_H = 1.75;
async function makeChar(letter, name, sub) {
  const gl = await loadGLB(`assets/ch/character-${letter}.glb`);
  const root = new THREE.Group(); const body = gl.scene.clone(true); // node-animated rig (not skinned): plain clone is safe
  const bb = new THREE.Box3().setFromObject(body); const k = CH_H / (bb.max.y - bb.min.y); body.scale.setScalar(k); body.position.y = -bb.min.y * k;
  body.traverse(o => { if (o.isMesh) { o.castShadow = true; } }); root.add(body);
  const mixer = new THREE.AnimationMixer(body); const act = {};
  for (const c of gl.animations) act[c.name] = mixer.clipAction(c);
  const tag = label(name + (sub ? ' · ' + sub : ''), 0x3a2216, .62); tag.position.y = CH_H + .55; root.add(tag);
  const o = { root, mixer, act, cur: null, tag, setName(n) { }, play(n) { const a = act[n] || act.idle; if (!a || o.cur === a) return; a.reset().fadeIn(.18).play(); if (o.cur) o.cur.fadeOut(.18); o.cur = a; } };
  o.play('idle'); scene.add(root); return o;
}

// ---------- state ----------
let S = null, world = null, me = null, ws = null, saveT = 0;
const others = new Map();
const llm = {}; const lineIdx = {};
function saveLocal() { if (!S) return; S.ts = Date.now(); try { localStorage[STORE] = JSON.stringify(S); } catch (e) {} clearTimeout(saveT); saveT = setTimeout(() => send({ t: 'save', state: S, ts: S.ts }), 500); }
function send(o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }

// ---------- HUD ----------
const BARS = [['H', '😊', 'Happiness', '#f2b630'], ['L', '❤️', 'Health', '#e55b5b'], ['S', '🧠', 'Smarts', '#4a9fd9'], ['B', '✨', 'Looks', '#c97ae0']];
function hud() {
  if (!S) return; const job = S.job ? S.job.name : S.school ? 'Student: ' + S.school.id : 'Unemployed';
  $('#card').innerHTML = `<div class="row"><span class="nm">${esc(S.name)}</span><span class="age">Age ${S.age}</span></div>
  <div class="row"><span class="cash">${L.money(S, S.cash)}</span><span class="sub">${S.country}</span></div>
  <div class="sub">${esc(job)} · ⏳ free time ${S.time}/5${S.pet ? ' · 🐾' : ''}</div>` +
    BARS.map(([k, ic, nm, c]) => `<div class="bar" title="${nm}"><i>${ic}</i><b><u style="width:${S[k]}%;background:${c}"></u></b><span>${S[k]}</span></div>`).join('');
}
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function toast(t) { const d = document.createElement('div'); d.textContent = t; $('#toast').append(d); setTimeout(() => d.remove(), 2400); while ($('#toast').children.length > 3) $('#toast').firstChild.remove(); }
function showYear(lines) { const y = $('#year'); y.innerHTML = lines.slice(0, 4).map(l => `<p>${esc(l)}</p>`).join(''); clearTimeout(showYear.t); showYear.t = setTimeout(() => y.innerHTML = '', 14000); }
function feed() {
  const f = $('#feed'); if (!f.hidden) { f.hidden = true; return; } f.hidden = false; let last = -1, h = '';
  for (const e of S.feed.slice(0, 80)) { if (e.age !== last) { h += `<h4>Age ${e.age}</h4>`; last = e.age; } h += `<p>${esc(e.text)}</p>`; } f.innerHTML = h;
}

// ---------- modal ----------
let modalOpen = false;
function modal(html, onClose) { $('#modal').innerHTML = html; $('#layer').hidden = false; modalOpen = true; modal.onClose = onClose; $('#modal').scrollTop = 0; }
function closeModal() { $('#layer').hidden = true; $('#modal').innerHTML = ''; modalOpen = false; const f = modal.onClose; modal.onClose = null; f && f(); }
const resBox = r => r ? `<div class="res ${r.ok ? '' : 'bad'}">${esc(r.msg)}<br>${(r.fx || []).map(f => `<em>${esc(f)}</em>`).join('')}</div>` : '';
const opt = (a, title, sub, tag, dis) => `<button class="opt" data-a="${a}" ${dis ? 'disabled' : ''}><b>${title}</b><small>${sub || ''}</small>${tag ? `<span class="tag">${tag}</span>` : ''}</button>`;
const head = (t, s) => `<button class="x" data-a="close">✕</button><h2>${t}</h2><div class="sub">${s || ''}</div>`;
const mon = v => L.money(S, v), base = v => Math.round(v * L.K(S));
function barHtml(label_, v, c) { return `<div class="bar"><i>${label_}</i><b><u style="width:${v}%;background:${c}"></u></b><span>${v}</span></div>`; }

let cur = { place: null, r: null };
const PLACE_VIEW = {
  college() {
    const c = L.COURSES.map(x => { const fee = Math.round(x.fee * (S.S >= 75 ? .5 : 1)); const has = S.deg.includes(x.id);
      return opt('enrol:' + x.id, `${x.id} degree`, `${x.years} years · fee ${mon(base(fee))}/yr${S.S >= 75 ? ' (scholarship)' : ''} · needs Smarts 40+`, has ? '✔ degree' : S.school && S.school.id === x.id ? 'enrolled' : '', has || !!S.school); }).join('');
    return head('🎓 College', S.school ? `Studying ${S.school.id}: year ${S.school.yr}/${S.school.of}` : `Degrees: ${S.deg.join(', ') || 'none yet'}`) + resBox(cur.r) +
      `<div class="opts one">${opt('study', 'Study hard in the library', 'Smarts +4 · uses 1 free time', '')}</div><div class="hdr">Enrol in a course</div><div class="opts">${c}</div>` + (S.school ? `<div class="opts one">${opt('dropout', 'Drop out', 'You stop paying tuition', '')}</div>` : '');
  },
  work() {
    const rows = L.JOBS.map(j => { const miss = L.jobStatus(S, j); const p = Math.round(L.chance(S, j) * 100);
      return opt('apply:' + j.id, j.name, `${mon(Math.round(j.sal * L.W(S)))}/yr · ${miss.length ? 'needs ' + miss.join(', ') : p + '% chance'}`, S.job && S.job.id === j.id ? 'your job' : '', !!miss.length || (S.job && S.job.id === j.id)); }).join('');
    return head('💼 Workplace', S.job ? `${S.job.name} · ${mon(Math.round(S.job.sal * L.W(S)))}/yr · ${S.job.yrs} yrs` : 'Unemployed. Apply below.') + resBox(cur.r) +
      `<div class="opts one">${opt('shift', 'Work a shift', S.job ? 'Earn about ' + mon(Math.round(S.job.sal * L.W(S) * .035)) + ' · uses 1 free time · work 2+ shifts a year for a raise' : 'You need a job first', '', !S.job)}</div>` +
      `<div class="hdr">Apply for a job</div><div class="opts">${rows}</div>` + (S.job ? `<div class="opts one">${opt('quit', 'Quit job', '', '')}</div>` : '');
  },
  cafe() {
    return head('☕ Cafe', 'Marta pours you a coffee.') + resBox(cur.r) + `<div class="opts">${opt('eat:healthy', '🥗 Healthy plate', mon(base(7)) + ' · Health +3', '')}${opt('eat:junk', '🍔 Burger & fries', mon(base(4)) + ' · Happiness +3, Health −2', '')}${opt('eat:coffee', '☕ Coffee', mon(base(3)) + ' · Happiness +1, Smarts +1', '')}${opt('eat:treat', '🍰 Treat a friend', mon(base(15)) + ' · Happiness +5', '')}</div>`;
  },
  gym() {
    return head('🏋 Gym', 'Coach Dev nods at you.') + resBox(cur.r) + `<div class="opts">${opt('gym:cardio', '🏃 Cardio', mon(base(4)) + ' · Health +4, Looks +1', '')}${opt('gym:weights', '🏋 Weights', mon(base(4)) + ' · Looks +4, Health +2', '')}${opt('gym:yoga', '🧘 Yoga', mon(base(3)) + ' · Health +2, Happiness +3', '')}</div>`;
  },
  home() {
    const par = (w, nm) => { const p = S[w]; return `<div class="hdr">${nm}: ${esc(p.n)}${p.alive ? '' : ' (passed away)'}</div>` + barHtml('❤', p.rel, '#e46a8c') + (p.alive ? `<div class="opts">${opt(`fam:${w}:time`, 'Spend time', '❤ +7 · Happiness +3', '')}${opt(`fam:${w}:gift`, 'Give a gift', mon(base(25)) + ' · ❤ +9', '')}${opt(`fam:${w}:ask`, 'Ask for money', 'Works if you get along (once a year)', '')}${opt(`fam:${w}:argue`, 'Argue', '❤ −9', '')}</div>` : ''); };
    return head('🏠 Home', 'Your room, your people.') + resBox(cur.r) + `<div class="opts one">${opt('rest', '🛏 Rest', 'Health +4, Happiness +2 · uses 1 free time', '')}</div>` + par('mom', 'Mother') + par('dad', 'Father');
  },
  bank() {
    const fds = S.fds.map(f => `<small>• ${mon(f.start)} at ${f.rate}% · matures in ${f.left} yr · now ${mon(f.amt)}</small>`).join('<br>') || '<small>No fixed deposits yet.</small>';
    const rate = L.COUNTRIES[S.country].fd; const a = Math.max(0, Math.floor(L.usdOf(S, S.cash || 0) / 2));
    return head('🏦 Bank', `Cash ${mon(S.cash)} · Fixed deposit rate ${rate}% (1 yr), ${rate + 1}% (3 yr)`) + resBox(cur.r) +
      `<div class="hdr">Your fixed deposits</div>${fds}<div class="hdr">Open a fixed deposit</div>
      <input id="fdAmt" type="number" inputmode="numeric" value="${a}" min="0" style="width:100%;padding:11px;border-radius:10px;border:1px solid #fff4;background:#2a1a10;color:#fff4dc;font-size:1rem">
      <div class="opts">${opt('fd:1', '1-year deposit', `${rate}% a year · pays back on your next birthday`, '')}${opt('fd:3', '3-year deposit', `${rate + 1}% a year · pays back after 3 birthdays`, 'higher rate')}</div>
      <small id="fdHint" style="opacity:.75">Tap Age to mature the deposit.</small>`;
  }
};
function openPlace(id) { cur = { place: id, r: null }; modal(PLACE_VIEW[id](), () => { cur.place = null; }); }
function refresh() { if (cur.place) { const sc = $('#modal').scrollTop; $('#modal').innerHTML = PLACE_VIEW[cur.place](); $('#modal').scrollTop = sc; } hud(); saveLocal(); }

function openActivities() {
  cur = { place: null, r: null }; const rows = L.ACTIVITIES.map(a => opt('act:' + a.id, a.label, (a.cost ? mon(base(a.cost)) + ' · ' : 'Free · ') + (/^[HLSB]/.test(a.fx) ? a.fx.replace(/H/g, '😊').replace(/L/g, '❤️').replace(/S/g, '🧠').replace(/B/g, '✨').replace('@pet', '🐾') : 'a gamble'), '')).join('');
  modal(head('🎭 Activities', `Free time left this year: ${S.time}/5. Each activity uses 1.`) + '<div id="actres"></div><div class="opts">' + rows + '</div>');
}
function openMe() { const nw = L.netWorth(S);
  modal(head('👤 ' + esc(S.name), `Age ${S.age} · ${S.country} · ${S.job ? S.job.name : 'no job'} · degrees: ${S.deg.join(', ') || 'none'}`) +
    `<div class="hdr">Net worth</div><b>${mon(nw)}</b> <small>(cash ${mon(S.cash)} + deposits ${mon(nw - S.cash)})</small>` + BARS.map(([k, ic, nm, c]) => `<div class="hdr">${nm}</div>${barHtml(ic, S[k], c)}`).join('') +
    `<div class="opts one" style="margin-top:14px">${opt('newlife', 'Start a new life', 'Erases this character', '')}</div>`); }
function say(r) { if (!r) return; toast(r.msg); }

// ---------- NPC talk ----------
function talk(id) {
  const n = NPCS[id], i = lineIdx[id] = ((lineIdx[id] ?? -1) + 1) % n.lines.length; let line = n.lines[i], ai = false;
  if (id === 'teacher' && S.school) line = `You are doing ${S.school.id}, year ${S.school.yr} of ${S.school.of}. Keep going.`;
  if (id === 'cafe' && S.H < 35) line = 'You look a bit down. Sit, have something warm. On the house... almost.';
  if (id === 'trainer' && S.L < 40) line = 'Your health is low. Start gentle: yoga, then cardio.';
  if (llm[id]) { line = llm[id]; llm[id] = null; ai = true; }
  const url = `/api/npc?id=${id}&age=${S.age}&cash=${Math.round(L.usdOf(S, S.cash || 0))}&job=${encodeURIComponent(S.job ? S.job.name : 'none')}&h=${S.H}&l=${S.L}&s=${S.S}`;
  fetch(url).then(r => r.json()).then(j => { if (j.line) llm[id] = j.line; }).catch(() => {}); // background, never awaited by the player
  modal(head(`💬 ${n.name}`, n.role) + `<div class="res" style="font-size:1rem">“${esc(line)}”</div>${ai ? '<small style="opacity:.6">✨ local AI line</small>' : ''}<div class="opts">${opt('talk:' + id, 'Talk again', '', '')}${opt('close', 'Goodbye', '', '')}</div>`);
}

// ---------- clicks ----------
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b || b.disabled) return; const [a, p, q] = b.dataset.a.split(':'); let r;
  if (a === 'close') return closeModal();
  if (a === 'talk') return talk(p);
  if (a === 'newlife') { localStorage.removeItem(STORE); S = null; closeModal(); startScreen(); return; }
  if (a === 'again') { closeModal(); startScreen(); return; }
  if (a === 'act') { r = L.activity(S, p); hud(); saveLocal(); $('#actres').innerHTML = resBox(r); toast(r.msg); return; }
  if (a === 'choice') { const o = pending.opts[+p]; const fx = L.resolveChoice(S, o); pending = null; modalOpen = false; $('#layer').hidden = true; $('#modal').innerHTML = ''; toast(o.res); showYear([o.res]); hud(); saveLocal(); return; }
  if (a === 'enrol') r = L.enrol(S, p); else if (a === 'study') r = L.studyHard(S); else if (a === 'dropout') r = L.dropOut(S);
  else if (a === 'apply') r = L.applyJob(S, p); else if (a === 'shift') r = L.workShift(S); else if (a === 'quit') r = L.quitJob(S);
  else if (a === 'eat') r = L.eat(S, p); else if (a === 'gym') r = L.workout(S, p); else if (a === 'rest') r = L.homeRest(S);
  else if (a === 'fam') r = L.family(S, p, q);
  else if (a === 'fd') r = L.depositFD(S, L.fromUsd(S, +($('#fdAmt').value || 0)), +p);
  if (r) { cur.r = r; refresh(); if (cur.place === 'work' && r.ok && a === 'apply') pop('hired'); }
});
function pop() { }
let pending = null;
$('#ageBtn').onclick = ageUp; $('#bAct').onclick = openActivities; $('#bFeed').onclick = feed; $('#bMe').onclick = openMe;
$('#layer').addEventListener('pointerdown', e => { if (e.target.id === 'layer' && !pending && !deadShown) closeModal(); });
let deadShown = false;
function ageUp() {
  if (!S || modalOpen) return; if (!S.alive) return;
  const r = L.ageUp(S); hud(); showYear(r.lines); toast('Age ' + S.age + ': ' + (r.lines[0] || ''));
  if (r.dead) { deadShown = true; saveLocal(); return modal(head('☠ Game over', `${esc(S.name)} died at ${S.age}.`) + `<div class="res">Net worth at death: ${mon(L.netWorth(S))}<br>Degrees: ${S.deg.join(', ') || 'none'} · Job: ${S.job ? S.job.name : 'none'}</div><div class="opts one">${opt('again', 'Start a new life', '', '')}</div>`, () => { deadShown = false; }); }
  if (r.choice) { pending = r.choice; modal(`<h2>🤔 Decision</h2><div class="res" style="font-size:1.02rem">${esc(r.choice.prompt)}</div><div class="opts one">${r.choice.opts.map((o, i) => opt('choice:' + i, esc(o.label), '', '')).join('')}</div>`); }
  saveLocal();
}

// ---------- input / player ----------
const keys = {}; addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'KeyE' || e.code === 'Enter') interact(); if (e.code === 'Escape' && modalOpen && !pending) closeModal(); if (e.code === 'KeyF' && !modalOpen) ageUp(); });
addEventListener('keyup', e => keys[e.code] = false); addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
const joy = { x: 0, y: 0, id: null }; let yaw = 0, pitch = .5, dist = 15, drag = null;
const jEl = $('#joy'), jk = jEl.firstElementChild;
jEl.addEventListener('pointerdown', e => { joy.id = e.pointerId; jEl.setPointerCapture(e.pointerId); jmove(e); e.stopPropagation(); });
jEl.addEventListener('pointermove', e => { if (e.pointerId === joy.id) jmove(e); });
const jend = e => { if (e.pointerId === joy.id) { joy.id = null; joy.x = joy.y = 0; jk.style.transform = ''; } }; jEl.addEventListener('pointerup', jend); jEl.addEventListener('pointercancel', jend);
function jmove(e) { const r = jEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = (e.clientX - cx) / 55, dy = (e.clientY - cy) / 55; const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; } joy.x = dx; joy.y = -dy; jk.style.transform = `translate(${dx * 40}px,${dy * 40}px)`; }
canvas.addEventListener('pointerdown', e => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => { if (drag && drag.id === e.pointerId) { yaw -= (e.clientX - drag.x) * .005; pitch = Math.max(.18, Math.min(1.1, pitch + (e.clientY - drag.y) * .004)); drag.x = e.clientX; drag.y = e.clientY; } });
canvas.addEventListener('pointerup', () => drag = null); canvas.addEventListener('wheel', e => { dist = Math.max(8, Math.min(26, dist + e.deltaY * .01)); }, { passive: true });
if (touch) jEl.hidden = false;

const P = { x: 4, z: 10, vx: 0, vz: 0, ry: Math.PI, spd: 0 };
let near = null;
function collide(x, z) {
  const r = .45; x = Math.max(-BOUND, Math.min(BOUND, x)); z = Math.max(-BOUND, Math.min(BOUND, z));
  for (let pass = 0; pass < 2; pass++) for (const c of world.colliders) {
    if (c.t === 'box') { const cx = Math.max(c.x0, Math.min(x, c.x1)), cz = Math.max(c.z0, Math.min(z, c.z1)); let dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz);
      if (d < r) { if (d < 1e-4) { x = c.x1 + r; } else { x = cx + dx / d * r; z = cz + dz / d * r; } } }
    else { const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), m = r + c.r; if (d < m && d > 1e-4) { x = c.x + dx / d * m; z = c.z + dz / d * m; } }
  }
  return [x, z];
}
const npcObjs = {};
function interact() { if (modalOpen || !near || !S) return; if (near.place) openPlace(near.place); else talk(near.npc); }
$('#prompt').onclick = interact;
let last = performance.now(), fpsN = 0, fpsT = 0; window.__fps = 0; let netT = 0;
function frame(now) {
  requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000); last = now; const t = now / 1000;
  fpsN++; fpsT += dt; if (fpsT >= 1) { window.__fps = Math.round(fpsN / fpsT); fpsN = 0; fpsT = 0; }
  if (!world) { renderer.render(scene, camera); return; }
  let ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + joy.x, iz = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) + joy.y;
  if (modalOpen || !S) ix = iz = 0; const m = Math.hypot(ix, iz); if (m > 1) { ix /= m; iz /= m; }
  const run = keys.ShiftLeft || keys.ShiftRight || m > .85 && joy.id !== null; const speed = (run ? 8.2 : 4.6) * Math.min(1, m);
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const dx = fx * iz + rx * ix, dz = fz * iz + rz * ix; const k = 1 - Math.exp(-14 * dt);
  P.vx += (dx * speed - P.vx) * k; P.vz += (dz * speed - P.vz) * k;
  [P.x, P.z] = collide(P.x + P.vx * dt, P.z + P.vz * dt); P.spd = Math.hypot(P.vx, P.vz);
  if (P.spd > .3) { const target = Math.atan2(P.vx, P.vz); let d = target - P.ry; d = Math.atan2(Math.sin(d), Math.cos(d)); P.ry += d * (1 - Math.exp(-12 * dt)); }
  if (me) { me.root.position.set(P.x, 0, P.z); me.root.rotation.y = P.ry; const an = P.spd > 6 ? 'sprint' : P.spd > .4 ? 'walk' : 'idle'; me.play(an); P.an = an; me.mixer.update(dt * (an === 'walk' ? Math.max(.6, P.spd / 4.6) : 1)); }
  // camera follow
  let dd = dist; const ox = Math.sin(yaw) * Math.cos(pitch), oz = Math.cos(yaw) * Math.cos(pitch), oy = Math.sin(pitch);
  for (const c of world.colliders) { if (c.t !== 'box') continue; // keep the camera outside buildings: slab test of the ray player->camera
    let t0 = 0, t1 = dd + 1, ok = true; const o = [P.x, 1.4, P.z], d = [ox, oy, oz], lo = [c.x0 - .5, 0, c.z0 - .5], hi = [c.x1 + .5, c.y1 + .5, c.z1 + .5];
    for (let i = 0; i < 3 && ok; i++) { if (Math.abs(d[i]) < 1e-6) { if (o[i] < lo[i] || o[i] > hi[i]) ok = false; } else { let a = (lo[i] - o[i]) / d[i], b = (hi[i] - o[i]) / d[i]; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) ok = false; } }
    if (ok && t0 < dd) dd = Math.max(3.5, t0 - .3); }
  const cx = P.x + ox * dd, cz = P.z + oz * dd, cy = 1.4 + oy * dd;
  const ck = reduce ? 1 : 1 - Math.exp(-6 * dt); camera.position.x += (cx - camera.position.x) * ck; camera.position.y += (cy - camera.position.y) * ck; camera.position.z += (cz - camera.position.z) * ck; if (!window.__ov) camera.lookAt(P.x, 1.2, P.z); else { camera.position.set(0, 75, 50); camera.lookAt(0, 0, 0); }
  sun.position.set(P.x - 26, 48, P.z - 20); sun.target.position.set(P.x, 0, P.z); sun.target.updateMatrixWorld();
  world.update(reduce ? 0 : t);
  // NPCs + interaction target
  near = null; let best = 99;
  for (const p of world.places) { const d = Math.hypot(P.x - p.x, P.z - p.z); if (d < p.r && d < best) { best = d; near = { place: p.id, text: p.verb }; } }
  for (const id in npcObjs) { const o = npcObjs[id]; o.mixer.update(dt); const d = Math.hypot(P.x - o.sx, P.z - o.sz); if (d < 6) { const want = Math.atan2(P.x - o.sx, P.z - o.sz); let a = Math.atan2(Math.sin(want - o.root.rotation.y), Math.cos(want - o.root.rotation.y)); o.root.rotation.y += a * .1; } if (d < 3.4 && d < best) { best = d; near = { npc: id, text: 'Talk to ' + NPCS[id].name }; } }
  const pr = $('#prompt'); if (near && !modalOpen && S) { pr.hidden = false; const tx = (touch ? 'Tap: ' : 'E / tap: ') + near.text; if (pr.textContent !== tx) pr.textContent = tx; } else pr.hidden = true;
  // network
  for (const [id, o] of others) { o.root.position.x += (o.tx - o.root.position.x) * Math.min(1, dt * 10); o.root.position.z += (o.tz - o.root.position.z) * Math.min(1, dt * 10); let d = o.try - o.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); o.root.rotation.y += d * Math.min(1, dt * 10); o.play(o.an || 'idle'); o.mixer.update(dt); }
  netT += dt; if (netT > .1 && S) { netT = 0; send({ t: 'pos', x: +P.x.toFixed(2), z: +P.z.toFixed(2), r: +P.ry.toFixed(2), a: P.an || 'idle', age: S.age }); }
  renderer.render(scene, camera);
}

// ---------- multiplayer ----------
function connect() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'; ws = new WebSocket(`${proto}://${location.host}/ws`);
  ws.onopen = () => { $('#online').classList.add('on'); if (S) hello(); };
  ws.onclose = () => { $('#online').classList.remove('on'); $('#online').textContent = 'offline'; for (const [, o] of others) scene.remove(o.root); others.clear(); setTimeout(connect, 2000); };
  ws.onmessage = async ev => {
    const m = JSON.parse(ev.data);
    if (m.t === 'state' && m.state && S && m.state.ts > (S.ts || 0)) { S = m.state; hud(); toast('Resumed your saved life from the server'); }
    if (m.t === 'snap') {
      const ids = new Set(Object.keys(m.p)); $('#online').textContent = (ids.size) + ' online';
      for (const id of ids) { if (id === myId) continue; const p = m.p[id]; let o = others.get(id);
        if (!o) { if (others.has(id + '_pending')) continue; others.set(id + '_pending', 1); const c = await makeChar(LOOKS.includes(p.l) ? p.l : 'a', p.n, 'age ' + p.age); others.delete(id + '_pending'); c.tx = p.x; c.tz = p.z; c.try = p.r; c.root.position.set(p.x, 0, p.z); others.set(id, c); o = c; }
        o.tx = p.x; o.tz = p.z; o.try = p.r; o.an = p.a; }
      for (const [id, o] of others) if (!ids.has(id) && !id.endsWith('_pending')) { scene.remove(o.root); others.delete(id); }
    }
  };
}
function hello() { send({ t: 'hello', id: myId, name: S.name, look: S.look, country: S.country, state: S, ts: S.ts || 0 }); }

// ---------- start ----------
function startScreen() {
  const names = Object.keys(L.COUNTRIES); const saved = localStorage[STORE] ? JSON.parse(localStorage[STORE]) : null;
  const cont = saved && saved.alive ? `<div class="opts one">${opt('cont', 'Continue as ' + esc(saved.name), `Age ${saved.age} · ${saved.country} · ${L.money(saved, saved.cash)}`, 'saved')}</div><div class="hdr">Or start a new life</div>` : '';
  modal(`<div class="start"><h2>🌍 Welcome to Sansar</h2><div class="sub">A shared town. Live a whole life. Pick where it begins.</div>${cont}
    <label>Your name</label><input id="nm" maxlength="14" value="${esc(saved ? saved.name : '')}" placeholder="Name" autocomplete="off">
    <label>Born in</label><select id="co">${names.map(n => `<option>${n}</option>`).join('')}</select>
    <label>Look</label><select id="lk">${LOOKS.map((l, i) => `<option value="${l}">Character ${i + 1}</option>`).join('')}</select>
    <div class="opts one" style="margin-top:14px"><button class="btn gold big" id="go">Start living</button></div></div>`);
  pending = { opts: [] }; // blocks backdrop-close
  $('#go').onclick = () => { const nm = ($('#nm').value || '').trim() || 'Resident'; begin(L.newLife({ name: nm, country: $('#co').value, look: $('#lk').value })); };
  const c = document.querySelector('[data-a=cont]'); if (c) c.onclick = () => begin(saved);
}
async function begin(state) {
  S = state; pending = null; closeModal(); $('#hud').hidden = false; hud();
  if (me) scene.remove(me.root); me = await makeChar(S.look || 'a', S.name, ''); P.x = 4; P.z = 10; yaw = 0; saveLocal(); hello();
  showYear(S.feed.slice(0, 2).map(f => f.text));
}
(async function boot() {
  const pb = $('.pb u');
  world = await buildWorld(scene, p => pb.style.width = Math.round(p * 70) + '%');
  for (const n of NPC_SPOTS) { const o = await makeChar(n.glb, NPCS[n.id].name, NPCS[n.id].role.split(' ').pop()); o.root.position.set(n.x, 0, n.z); o.sx = n.x; o.sz = n.z; o.root.rotation.y = Math.PI * .8; npcObjs[n.id] = o; world.colliders.push({ t: 'circle', x: n.x, z: n.z, r: .6 }); }
  pb.style.width = '100%'; camera.position.set(0, 14, 34); connect(); requestAnimationFrame(frame);
  try { const r = await fetch('/api/resident?id=' + myId).then(r => r.json()); if (r.state && !localStorage[STORE]) localStorage[STORE] = JSON.stringify(r.state); } catch (e) {}
  setTimeout(() => { $('#load').style.opacity = 0; setTimeout(() => $('#load').remove(), 700); startScreen(); }, 250);
  window.__game = { P, get S() { return S; }, world, tp(x, z) { P.x = x; P.z = z; }, ageUp, interact, get near() { return near; }, others, L, openActivities, openPlace, camera, renderer, setYaw(v) { yaw = v; } };
})();
