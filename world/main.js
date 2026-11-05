// Sansar /world main: Style A district + click-to-chat townspeople + the life loop (places, ages, activities) from the live game.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import * as L from '../js/life.js?v=exam1';
import * as Mkt from '../js/market.js?v=port1';
import * as Ms from '../js/missions.js?v=usd1';
import * as Ap from '../js/appointments.js?v=rent1';
import { createLook } from './look.js?v=rd1';
import { buildWorld, PAVE_Y } from './world.js?v=rent1';
import { createLiveMap } from './livemap.js?v=guide1';
import { makeNav, buildPeople, nameLabel, retitle, DAY } from './people.js?v=pick1';
import * as Av from './avatar.js?v=pick1';
import { createAmbient } from './ambient.js';
let createVehicles, untwist;
import { createControls } from './controls.js?v=walk1';
import { createChat } from './chat.js?v=walk1';
import { createSocial } from './players.js?v=rent1';
import * as Hosp from './hospital.js?v=pick1';
const Fin = L.Fin;

const $ = s => document.querySelector(s);
const qs = new URLSearchParams(location.search);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia('(pointer:coarse)').matches || innerWidth < 700;
const LOOKS = 'abcdefgh'.split('');
const STORE = 'sansar.life.v1', IDK = 'sansar.id';
const myId = localStorage[IDK] || (localStorage[IDK] = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)));

// ---------- renderer (style A: ACES, PBR, HDRI, sun shadows, GTAO + bloom on laptops) ----------
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !touch, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, touch ? 1 : 2));
renderer.shadowMap.enabled = !touch; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.info.autoReset = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1; renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, .1, 1600);
const manager = new THREE.LoadingManager(); let loadPart = 0;
manager.onProgress = (u, d, t) => { loadPart = d / Math.max(1, t); setBar(); };
let buildPart = 0; const setBar = () => { const pb = $('.pb u'); if (pb) pb.style.width = Math.round((buildPart * .7 + loadPart * .3) * 100) + '%'; };
const look = createLook(renderer, scene, manager, touch);
let composer = null, ao = null, bloom = null, quality = 1;
// adaptive quality: if the last 3 s averaged < 30 fps, step down (bloom -> direct render -> smaller shadows + DPR 1). Never steps up, so it cannot flicker.
function downgrade() {
  quality++; if (quality === 2) { composer = null; } else if (quality >= 3) { look.sun.shadow.mapSize.set(1024, 1024); look.sun.shadow.map && look.sun.shadow.map.dispose(); look.sun.shadow.map = null; renderer.setPixelRatio(1); resize(); }
  console.log('quality ->', quality);
}
function setupPost() {
  if (touch) return;
  const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 2 });
  composer = new EffectComposer(renderer, rt); composer.addPass(new RenderPass(scene, camera));
  if (qs.has('ao') || qs.has('hq')) { ao = new GTAOPass(scene, camera, innerWidth, innerHeight); ao.blendIntensity = .85; ao.updateGtaoMaterial({ radius: .6, distanceExponent: 1.5, thickness: 1.2 });   // GTAO costs ~10 fps here: opt-in (?ao=1 or ?hq=1)
    ao.gtaoMaterial.fragmentShader = ao.gtaoMaterial.fragmentShader.replace('ao = pow(ao, scale);', 'ao = pow(ao, scale);\nao = mix(ao, 1., smoothstep(40.0, 85.0, -viewPos.z));'); ao.gtaoMaterial.needsUpdate = true; composer.addPass(ao); }
  bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .22, .5, .92); composer.addPass(bloom); composer.addPass(new OutputPass());
  composer.addPass(new ShaderPass(GRADE));
}
// filmic grade after tone mapping (bake-off): gentle S-curve, warm highs and cool shadows, vignette
const GRADE = { uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; c = mix(c, c*c*(3.0-2.0*c), 0.2);
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c += vec3(0.018, 0.008, -0.012)*smoothstep(0.4, 1.0, l) + vec3(-0.01, 0.0, 0.014)*smoothstep(0.45, 0.0, l);
      c = mix(vec3(l), c, 1.06); vec2 d = vUv - 0.5; c *= 1.0 - 0.2*smoothstep(0.3, 0.85, length(d));
      gl_FragColor = vec4(c, 1.0); }` };
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); composer && composer.setSize(innerWidth, innerHeight); applyShift(true); layoutHud(); }
addEventListener('resize', resize);

// ---------- world clock: shared by every player (unix seconds), one visible day = DAY seconds ----------
let clockOff = qs.has('hour') ? (+qs.get('hour') / 24 * DAY - (Date.now() / 1000) % DAY) : 0;
let frozen = qs.has('freeze') ? (Date.now() / 1000 + clockOff) : null;
const clockNow = () => frozen ?? (Date.now() / 1000 + clockOff);
const hourNow = () => ((clockNow() % DAY) / DAY) * 24;
const worldDay = () => Math.floor(clockNow() / DAY) % Mkt.CYCLE;
const yearFrac = () => (clockNow() / L.YEAR_SEC) % 1;   // 30 min = 1 game year (18 Oct) drives the season (sun height)

// ---------- avatars (player + other players) ----------
let myLook = null, myName = '';
function makeChar(look, name, sub) {                       // one merged skinned mesh per person (avatar.js)
  const av = Av.createAvatar(look, { lead: true }), root = new THREE.Group(); root.add(av.root); const tag = nameLabel(name, sub || ''); tag.position.y = look.h / 100 + .32; root.add(tag); scene.add(root);
  return { root, av, tag, speed: 0 };
}
function wearAge() { return myLook && S ? Av.agedLook(myLook, S.age, S.B) : (myLook || Av.defaultLook()); }
async function loadMyAvatar() {                            // server first (saved with the life), device copy as fallback
  let r = null; try { r = await fetch('/api/avatar?id=' + encodeURIComponent(myId)).then((x) => x.json()); } catch (e) {}
  if (r && r.look) { localStorage['sansar.av'] = JSON.stringify(r.look); if (r.name) localStorage['sansar.name'] = r.name; return r; }
  if (localStorage['sansar.av']) { try { const look = JSON.parse(localStorage['sansar.av']), name = localStorage['sansar.name'] || ''; fetch('/api/avatar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: myId, name, look }) }).catch(() => {}); return { look, name }; } catch (e) {} }
  return null;
}
const locoSpeeds = () => { const a = me && me.av; return a && a.F && a.look ? { walk: a.F.vWalk * a.sc * a.rate, run: a.F.vRun * a.sc * a.rate } : { walk: 1.4, run: 3.2 }; };   // clip ground speed at timeScale 1, so planted feet stay put

// ---------- state ----------
let S = null, world = null, me = null, ws = null, saveT = 0;
const others = new Map();
const llm = {}; const lineIdx = {};
const BAK = 'sansar.life.bak';
function remember(json) {
  let bak = [];
  try { bak = JSON.parse(localStorage[BAK] || '[]'); } catch (e) { bak = []; }
  if (!Array.isArray(bak)) bak = [];
  if (bak[0] !== json) bak.unshift(json);
  if (bak.length > 3) bak.length = 3;
  try { localStorage[BAK] = JSON.stringify(bak); } catch (e) {}
}
function parseLife(raw) { try { const s = JSON.parse(raw); if (s && typeof s === 'object') return s; } catch (e) {} return null; }
function readStore() {
  const cur = parseLife(localStorage[STORE] || '');
  if (cur) return cur;
  try { localStorage.removeItem(STORE); } catch (e) {}
  let bak = [];
  try { bak = JSON.parse(localStorage[BAK] || '[]'); } catch (e) { bak = []; }
  if (!Array.isArray(bak)) return null;
  for (const raw of bak) {
    const s = parseLife(raw);
    if (s) { try { localStorage[STORE] = JSON.stringify(s); } catch (e) {} return s; }
  }
  return null;
}
function writeStore(s) {
  s.saveVer = (s.saveVer | 0) + 1; s.ts = Date.now();
  try { const json = JSON.stringify(s); localStorage[STORE] = json; remember(json); } catch (e) {}
}
function saveLocal() { if (!S) return; writeStore(S); clearTimeout(saveT); saveT = setTimeout(() => send({ t: 'save', state: S, ts: S.ts }), 500); }
function saveNow() { if (!S) return; writeStore(S); clearTimeout(saveT); send({ t: 'save', state: S, ts: S.ts }); }
let rentAt = null, rentPull = 0;
function rentSync() {
  if (!S) return;
  const key = L.monthIndex(S);
  if (rentAt === key) return;
  rentAt = key;
  saveNow();
  send({ t: 'rentmonth', key });
}
function applyRent(m) {
  if (!S || !m) return;
  if (m.board) S.rentBoard = m.board;
  rentPull = 0;
  if (m.t === 'rentboard') { if (modalOpen && cur.place === 'rentals') refresh(); return; }
  const touched = m.why && m.why !== 'arm' && m.why !== 'same' && m.why !== 'jump' && m.why !== 'migrate';
  if (touched) {
    if (typeof m.bank === 'number') S.bank = m.bank;
    if (typeof m.cash === 'number') S.cash = m.cash;
    if (m.home && S.hh) S.hh.home = m.home;
    if (m.mustLeave) S.mustLeave = 1; else if (m.why === 'take' || m.why === 'live') S.mustLeave = 0;
    if (m.charged) Fin.book(S, 'exp', 'rent', m.charged);
    if (m.paid) Fin.book(S, 'inc', 'rent', m.paid);
    for (const t of m.notes || []) { S.feed.unshift({ age: S.age, text: t }); toast(t); }
    if (S.feed.length > 220) S.feed.length = 220;
    if (m.home && world && world.homes) world.homes.place(S);
  }
  if (m.ts) S.ts = Math.max(Date.now(), m.ts + 1);
  hud(); if (touched) saveNow();
  if (modalOpen && (cur.place === 'rentals' || cur.place === 'finances' || cur.place === 'home')) refresh();
}
function send(o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }

// ---------- HUD ----------
const BARS = [['H', '😊', 'Happiness', '#f2b630'], ['L', '❤️', 'Health', '#e55b5b'], ['S', '🧠', 'Smarts', '#4a9fd9'], ['B', '✨', 'Looks', '#c97ae0']];
function hud() {
  if (!S) return; const job = S.job ? S.job.name : S.school ? 'Student: ' + S.school.id : 'Unemployed';
  L.ensureLife(S);
  $('#card').innerHTML = `<span class="nm">${esc(S.name)}</span><span class="age">${L.ageLabel(S)}</span><span class="cash">${L.money(S, S.cash)}</span>${healthShell()}`;
  const money = $('#money'); if (money) money.textContent = moneyLine(S);
  paintHealth(); paintInjury(); paintMission(); paintExamHud();
}
let hpShown = null;
function healthShell() {
  const n = S ? Math.max(0, Math.min(100, Math.round(+S.L || 0))) : 0;
  const w = hpShown == null ? n : hpShown;
  return `<span class="hp" id="hp" aria-label="Health ${n}"><i class="heart" aria-hidden="true">♥</i><b class="track"><i class="fill" style="width:${w}%"></i></b><b class="num">${n}</b><i class="bang" hidden>!</i></span>`;
}
function paintHealth() {
  const el = document.getElementById('hp'), low = document.getElementById('hpLow');
  if (!S || !el) { if (low) low.hidden = true; return; }
  const n = Math.max(0, Math.min(100, Math.round(+S.L || 0)));
  el.className = 'hp ' + Hosp.band(n) + (Hosp.pulsing(n) ? ' pulse' : '');
  el.setAttribute('aria-label', 'Health ' + n);
  const num = el.querySelector('.num'); if (num && num.textContent !== String(n)) num.textContent = String(n);
  const fill = el.querySelector('.fill');
  if (fill && hpShown !== n) {
    const from = hpShown == null ? n : hpShown;
    fill.style.width = from + '%';
    if (from !== n) { const to = n; requestAnimationFrame(() => { if (fill.isConnected) fill.style.width = to + '%'; }); }
    hpShown = n;
  }
  const bang = el.querySelector('.bang'); if (bang) bang.hidden = !Hosp.dropping(S);
  if (low) {
    low.hidden = !(S.alive && Hosp.promptOn(n));
    const tx = low.querySelector('span'), msg = Hosp.lowPrompt(S); if (tx && tx.textContent !== msg) tx.textContent = msg;
  }
}
function paintExamHud() {
  const due = !!(S && S.alive && S.school && L.examDue(S));
  const text = due ? L.examPrompt(S) : '';
  const bar = $('#examBar');
  if (bar) {
    bar.hidden = !due;
    if (due && bar.textContent !== text) bar.textContent = text;
    if (due) {
      const nav = document.getElementById('tr');
      if (nav) bar.style.top = Math.round(nav.getBoundingClientRect().top - 52) + 'px';
      bar.style.zIndex = '20';
    }
  }
  for (const id of ['badgeAct', 'badgeFeed']) {
    const b = document.getElementById(id);
    if (!b) continue;
    b.hidden = !due;
    if (due) b.textContent = 'Exam';
  }
  if (due && S.school.told !== L.courseYear(S) && !modalOpen) {
    S.school.told = L.courseYear(S);
    toast(text);
  }
}
let examPicks = [];
function examSheet() {
  const paper = (S.school && S.school.paper) || [];
  const bits = paper.map((item, i) => {
    const opts = item.opts.map((o, j) => {
      const on = examPicks[i] === j ? ' gold' : '';
      const hint = o.hint ? '<small>Hint: not this one</small>' : '';
      return `<button type="button" class="opt${on}" data-a="epick:${i}:${j}"><b>${esc(o.t)}</b>${hint}</button>`;
    }).join('');
    return `<div class="hdr">Question ${i + 1} of 10</div><div class="res">${esc(item.q)}</div><div class="opts one">${opts}</div>`;
  }).join('');
  return head('Year ' + L.courseYear(S) + ' exam', esc(S.school.id) + ' · 10 questions · pass at 60%') + bits +
    `<div class="opts one">${opt('esubmit', 'Hand it in', 'Six of ten passes. Hints come from study hours.', '')}</div>`;
}
function examResult(out) {
  const misses = (out.wrong || []).map((w) => `<div class="res bad"><b>${esc(w.q)}</b><br>You: ${esc(w.yours)}<br>Right: ${esc(w.right)}</div>`).join('');
  const price = S && S.school ? L.money(S, out.fee || L.retakeFee(S)) : '';
  const again = (!out.pass || out.hold) && S && S.school ? opt('eretake', 'Retake — ' + price, 'A new paper. One game day between sittings.', '') : '';
  cur = { place: 'exam', r: null };
  modal(head(out.pass && out.graduated ? 'Graduated' : out.pass ? 'Pass ' + out.score + '%' : 'Fail ' + out.score + '%', esc(out.msg)) + `<div class="opts one">${again}</div>` + (misses || '<div class="res">Every answer matched.</div>'), () => { cur.place = null; });
  modal.still = true;
  toast(out.msg);
  hud(); saveLocal();
}
function openYearExam() {
  if (!S || !S.school) { toast('Enrol first.'); return; }
  const opened = L.openExam(S);
  if (!opened.ok || !opened.paper) { toast(opened.msg || 'The exam is not open.'); hud(); saveLocal(); return; }
  // Picks live on the open paper so closing the sheet (or reloading) keeps them until it is handed in.
  if (!opened.resume || !Array.isArray(S.school.picks) || S.school.picks.length !== opened.paper.length) S.school.picks = opened.paper.map(() => null);
  examPicks = S.school.picks;
  cur = { place: 'exam', r: null };
  modal(examSheet(), () => { cur.place = null; });
  modal.still = true;
  hud(); saveLocal();
}
function paintMission() {
  const el = $('#mission'), line = $('#msLine'), rank = $('#msRank'), go = $('#msGo');
  if (!el || !S) return;
  const nw = L.netWorth(S), ti = Ms.titleOf(nw, (S.land && S.land.own.length) || 0, S), st = Ms.current(S, nw);
  const rem = Ap.reminder(S, Math.floor(clockNow() / DAY), hourNow());
  if (rem) {
    el.hidden = false;
    if (rank) rank.textContent = 'Date';
    if (line) line.textContent = rem.line;
    if (go) { go.hidden = false; go.dataset.place = rem.map; go.dataset.appt = rem.id; }
  } else if (S.arrive && S.arrive.stage !== 'done') {
    const go2 = S.arrive.stage === 'go';
    el.hidden = !go2;
    if (rank) rank.textContent = 'Favour';
    if (line) line.textContent = '📦 Deliver the parcel to Sunny Side cafe';
    if (go) { go.hidden = false; go.dataset.place = 'parcel'; go.dataset.appt = ''; }
  } else {
  const hide = S.ms && S.ms.hide;
  el.hidden = !!(hide || !st && ti.id !== 'king');
  if (rank) rank.textContent = ti.name;
  if (go) go.dataset.appt = '';
  if (!st) { if (line) line.textContent = 'You are Sansar\'s Monopoly King.'; if (go) go.hidden = true; }
  else { if (line) line.textContent = st.line; if (go) { go.hidden = !st.gos.length; go.dataset.place = st.gos[0] ? st.gos[0].place : ''; } }
  }
  const stEl = $('#status');
  if (phoneHud()) layoutHud();
  else if (stEl) { const b = stEl.getBoundingClientRect(); el.style.top = Math.round(b.bottom + 6) + 'px'; const tk = $('#ticker'); if (tk) tk.style.top = Math.round(b.bottom + (el.hidden ? 6 : el.offsetHeight + 12)) + 'px'; }
}
function phoneHud() { return matchMedia('(max-width: 700px)').matches; }
function layoutHud() {
  const stam = $('#stam');
  if (!phoneHud()) { if (stam) { stam.style.top = ''; stam.style.bottom = ''; stam.style.width = ''; } return; }
  const st = $('#status'), row = $('#hudRow'), radar = $('#radarWrap'), joy = $('#joy'), run = $('#runBtn'), bar = $('#tr');
  if (!st || !bar || !joy || $('#hud').hidden) return;
  const gap = 8, sheet = document.body.classList.contains('sheeting') || document.body.classList.contains('chatting');
  const stB = st.getBoundingClientRect().bottom;
  if (row) row.style.top = Math.round(stB + 6) + 'px';
  const rowB = (!sheet && row && row.offsetHeight > 2) ? row.getBoundingClientRect().bottom : stB;
  let floor = bar.getBoundingClientRect().top - gap;
  if (sheet) { const mt = $('#modal').getBoundingClientRect().top; if (mt > 40 && mt < floor) floor = mt - gap; }
  const joyH = 104, runH = 56;
  const joyTop = Math.round(floor - joyH);
  joy.style.top = joyTop + 'px'; joy.style.bottom = 'auto';
  run.style.top = Math.round(floor - runH) + 'px'; run.style.bottom = 'auto'; run.style.left = 'auto';
  if (stam) { stam.style.top = Math.round(joyTop - 22) + 'px'; stam.style.bottom = 'auto'; stam.style.width = '104px'; }
  const pad = document.getElementById('vpad');
  if (pad) { pad.style.top = Math.round(floor - 132) + 'px'; pad.style.bottom = 'auto'; pad.style.left = 'auto'; }
  radar.style.width = '92px';
  const cv = $('#radar'); if (cv) { cv.style.width = '92px'; cv.style.height = '92px'; }
  let radarH = radar.offsetHeight || 108;
  let radarTop = joyTop - gap - radarH;
  const minTop = Math.round(rowB + gap);
  if (radarTop < minTop) {
    const room = Math.max(40, joyTop - gap - minTop);
    const s = Math.max(52, Math.min(92, room - 16));
    radar.style.width = s + 'px';
    if (cv) { cv.style.width = s + 'px'; cv.style.height = s + 'px'; }
    radarH = radar.offsetHeight || s + 16;
    radarTop = joyTop - gap - radarH;
  }
  let rTop = Math.max(minTop, Math.round(radarTop));
  const rh = radar.offsetHeight || radarH;
  if (rTop + rh > joyTop - 4) rTop = Math.max(minTop, joyTop - 4 - rh);
  radar.style.top = rTop + 'px';
  radar.style.bottom = 'auto';
  radar.style.visibility = (rTop + rh > joyTop - 2) ? 'hidden' : '';
  const kmh = document.getElementById('vkmh');
  if (kmh) { kmh.style.top = rTop + 'px'; kmh.style.bottom = 'auto'; kmh.style.left = 'auto'; kmh.style.right = '8px'; kmh.style.transform = 'none'; }
  const toastEl = $('#toast');
  const toastOn = toastEl && toastEl.childElementCount > 0;
  const toastH = 36;
  const toastTop = Math.round(rTop - gap - toastH);
  if (toastEl) {
    toastEl.style.top = toastTop + 'px'; toastEl.style.bottom = 'auto'; toastEl.style.maxHeight = toastH + 'px'; toastEl.style.overflow = 'hidden';
    toastEl.style.left = '50%'; toastEl.style.right = 'auto'; toastEl.style.width = 'min(86vw, 260px)'; toastEl.style.transform = 'translateX(-50%)';
  }
  const hint = document.getElementById('ctlHint');
  if (hint && !sheet) {
    const top = rowB + gap, bot = (toastOn ? toastTop : rTop) - gap, room = Math.max(48, bot - top);
    hint.style.left = '50%'; hint.style.maxHeight = room + 'px'; hint.style.overflow = 'auto'; hint.style.transform = 'translateX(-50%)';
    const h = Math.min(hint.scrollHeight || 80, room);
    hint.style.top = Math.round(top + Math.max(0, (room - h) / 2)) + 'px';
  }
  const bot = $('#bot');
  if (bot) { bot.style.top = Math.round(floor - runH) + 'px'; bot.style.bottom = 'auto'; bot.style.left = '122px'; bot.style.right = '78px'; bot.style.width = 'auto'; bot.style.alignItems = 'center'; }
}
window.__layoutHud = layoutHud;
function paintInjury() {
  const el = $('#injury'); if (!el) return; const t = S ? Hosp.note(S, clockNow()) : '';
  el.hidden = !t; if (el.textContent !== t) el.textContent = t;
}
function injuryBlock(where) {
  if (!Hosp.active(S)) return '';
  const j = S.injury, q = Hosp.quote(S, clockNow(), L.K(S)), hosp = where !== 'hospital' ? opt('gohosp', '🏥 Go to City Hospital', 'Fast. Bill ' + mon(q.you) + (q.ins ? ' after insurance' : ''), '') : '';
  const rest = j.healAt && j.treated !== 'public' ? opt('heal:rest', '🛏 Rest the injury', 'Free · half a day off the heal date · once a day · uses 1 free time', '') : '';
  const pharm = j.healAt && !j.treated ? opt('heal:pharm', '💊 Pharmacy medicine', mon(q.pharm) + ' · heals within ' + Hosp.SEV[j.sev].pharmDays + ' days', '') : '';
  return `<div class="res bad inj-note">${esc(Hosp.note(S, clockNow()))}</div>` + (where === 'life' || where === 'home' ? `<div class="opts">${rest}${pharm}${hosp}</div>` : '');
}
function dayLine(hh, mm, blk) {
  const hm = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  if (!S) return hm;
  L.ensureLife(S);
  const sun = look.state.night > .5 ? '🌙' : '☀';
  return `${sun} ${hm} · ${blk} · ${L.money(S, S.cash)} · bank ${L.money(S, S.bank || 0)}`;
}
function paintAge() {
  const el = document.querySelector('#card .age'); if (!el || !S) return;
  const t = L.ageLabel(S); if (el.textContent !== t) { el.textContent = t; saveLocal(); }
}
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function toast(t) { const d = document.createElement('div'); d.textContent = t; $('#toast').append(d); setTimeout(() => d.remove(), 2400); while ($('#toast').children.length > 3) $('#toast').firstChild.remove(); }
const SKIN_PING = ['#DDB8A0', '#D8AE92', '#D2A584', '#CB9C78', '#C08E68', '#B8845E', '#A8724E', '#966444', '#845638', '#70482E', '#5E3C26', '#4E3220', '#40291A', '#342216'];
const pingQ = []; let pingN = 0, snapOnce = false; window.__pingN = 0;
function pingBlocked() { return mapOn || document.body.classList.contains('sheeting') || document.body.classList.contains('chatting'); }
function flushPings() { const host = $('#pings'); if (!host || pingBlocked()) return; while (pingQ.length && host.children.length < 2) showPing(pingQ.shift()); }
function showPing(item) {
  const host = $('#pings'); if (!host) return;
  if (pingBlocked() || host.children.length >= 2) { pingQ.push(item); return; }
  const b = document.createElement('button'); b.type = 'button'; b.className = 'ping';
  const dot = document.createElement('i'), label = document.createElement('span');
  dot.style.background = SKIN_PING[Math.max(0, Math.min(SKIN_PING.length - 1, item.sk | 0))];
  label.textContent = item.n + ' is online - say hi \u{1F44B}';
  b.append(dot, label);
  b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); b.remove(); goToPlayer(item.id, item.n); flushPings(); };
  host.append(b);
  setTimeout(() => { if (b.isConnected) { b.remove(); flushPings(); } }, 6000);
}
function onOnline(m) {
  if (!m || !m.id || m.id === myId) return;
  const name = String(m.n || 'Someone').slice(0, 14);
  window.__pingN = ++pingN;
  const line = name + ' is online.';
  if (S) { S.feed.unshift({ age: S.age, text: line }); if (S.feed.length > 220) S.feed.length = 220; saveLocal(); }
  if (social && social.noteLine) social.noteLine(line);
  if (modalOpen && cur && cur.place === 'people') { const box = document.querySelector('#modal .sheet-body') || $('#modal'); if (box) { const d = document.createElement('div'); d.className = 'res'; d.textContent = line; box.append(d); } }
  const item = { id: m.id, n: name, sk: m.sk | 0 };
  if (pingBlocked() || ($('#pings') && $('#pings').children.length >= 2)) pingQ.push(item); else showPing(item);
}
function showYear(lines) { const y = $('#year'); y.innerHTML = lines.slice(0, 4).map(l => `<p>${esc(l)}</p>`).join(''); clearTimeout(showYear.t); showYear.t = setTimeout(() => y.innerHTML = '', 14000); }
function feed() { openPlace('life'); modal.still = true; }
const lifeView = () => head('Life', 'Newest events first') + examBanner() + resBox(cur.r) + injuryBlock('life') + S.feed.slice(0, 80).map(e => `<div class="life-entry"><small>Age ${e.age}</small>${esc(e.text)}</div>`).join('');

// ---------- modal ----------
let modalOpen = false;
const FULL_SHEETS = new Set(['exchange', 'finances', 'bank', 'life', 'me', 'activities', 'people']);
function fillModal(html) {
  const sheet = !!S && !html.includes('class="start"');
  const full = sheet && cur && FULL_SHEETS.has(cur.place);
  $('#layer').classList.toggle('full', full);
  document.body.classList.toggle('fullsheet', full);
  if (!full) { $('#modal').innerHTML = (sheet ? '<button class="sheet-handle" aria-label="Close sheet" data-a="close"></button>' : '') + html; return; }
  $('#modal').innerHTML = `<header class="sheet-bar"><button type="button" class="x" data-a="close">Close</button><h2></h2></header><div class="sheet-body">${html}</div>`;
  const body = $('#modal .sheet-body'), h2 = body && body.querySelector('h2'), bar = $('#modal .sheet-bar h2');
  if (h2 && bar) { bar.textContent = h2.textContent; h2.remove(); }
  const x = body && body.querySelector(':scope > .x'); if (x) x.remove();
  const stick = body && body.querySelector('.stick');
  const foot = document.createElement('div'); foot.className = 'sheet-acts';
  if (stick) foot.appendChild(stick);
  else foot.innerHTML = '<div class="opts one"><button class="opt" data-a="close"><b>Close</b><small>Back to the street</small></button></div>';
  $('#modal').appendChild(foot);
}
function modalBox() { return document.querySelector('#modal .sheet-body') || $('#modal'); }
function modal(html, onClose) { const paying = html.includes('data-a="pay:'); document.body.classList.toggle('paying', paying); if (!paying && chat && chat.current) chat.close(); const sheet = !!S && !html.includes('class="start"'); $('#layer').classList.toggle('sheet', sheet); document.body.classList.toggle('sheeting', sheet); if (sheet && phoneHud()) { const t = $('#toast'); if (t) t.replaceChildren(); } fillModal(html); $('#layer').hidden = false; modalOpen = true; modal.onClose = onClose; modal.still = !!(cur && FULL_SHEETS.has(cur.place)); const box = modalBox(); if (box) box.scrollTop = 0; layoutHud(); if (!sheet) setTimeout(layoutHud, 280); }
function closeModal() { document.body.classList.remove('sheeting', 'paying', 'fullsheet'); $('#layer').classList.remove('full'); $('#layer').hidden = true; $('#modal').innerHTML = ''; modalOpen = false; const f = modal.onClose; modal.onClose = null; f && f(); layoutHud(); if (ctl) ctl.nudge(); }
const resBox = r => r ? `<div class="res ${r.ok ? '' : 'bad'}">${esc(r.msg)}<br>${(r.fx || []).map(f => `<em>${esc(f)}</em>`).join('')}</div>` : '';
const opt = (a, title, sub, tag, dis) => `<button class="opt" data-a="${a}" ${dis ? 'disabled' : ''}><b>${title}</b><small>${sub || ''}</small>${tag ? `<span class="tag">${tag}</span>` : ''}</button>`;
const head = (t, s) => `<button class="x" data-a="close">✕</button><h2>${t}</h2><div class="sub">${s || ''}</div>`;
const mon = v => L.money(S, v), base = v => Math.round(v * L.K(S));
function barHtml(label_, v, c) { return `<div class="bar"><i>${label_}</i><b><u style="width:${v}%;background:${c}"></u></b><span>${v}</span></div>`; }

let cur = { place: null, r: null }, paint = 'study', realm = 'town', hourMark = null;
const BLOCK_NAME = { sleep: 'Sleep', study: 'Study', work: 'Work', gym: 'Gym', roam: 'Roam', free: 'Free' };
function studyLine() {
  L.ensureLife(S); const sp = L.studyPower(S);
  const pay = S.job && S.job.pay === 'month'
    ? ` ${S.job.name} is ${L.money(S, S.job.monthly)} a month, nine to five. That is full time, so a full study day does not fit.`
    : S.job && S.job.rate
      ? ` ${S.job.name} is ${L.money(S, S.job.rate)} an hour, or ${L.money(S, S.job.monthly)} a month. Today is ${sp.work} work hours, so ${L.money(S, S.job.rate * sp.work)}.`
      : ' A job is an hourly rate, or a monthly wage. The month is full time.';
  const ex = !S.school ? '' : ` Year ${L.courseYear(S)} exam${typeof S.school.last === 'number' ? ' last score ' + S.school.last + '%.' : ' not sat.'} Pass mark 60.`;
  return `Study counts as ${sp.eff} hours. Work is ${sp.work}. ${sp.full ? 'The monthly wage holds nine to five, so study stays part time.' : sp.work > 6 ? 'Those work hours cut into study.' : 'Work is light enough that a full study day still fits.'}${pay} Record ${Math.round(S.grades)}.${ex}`;
}
function examOpts() {
  if (!S.school) return '';
  const tries = S.school.tries || 0;
  const price = L.money(S, L.retakeFee(S));
  const sub = (tries ? 'Retake ' + price + '. ' : 'Included in tuition. ') + 'Ten questions. Pass mark 60%.';
  return `<div class="opts one">${opt('eyear', L.examPrompt(S), sub, tries ? price : '')}</div>`;
}
function examBanner() {
  if (!S || !S.school || !L.examDue(S)) return '';
  const price = (S.school.tries || 0) ? ' Retake ' + L.money(S, L.retakeFee(S)) + '.' : '';
  return `<div class="opts one">${opt('eyear', L.examPrompt(S), 'Pass mark 60%.' + price, 'exam')}</div>`;
}
function courseButtons(place) {
  return L.COURSES.filter(c => c.place === place).map(c => {
    const has = S.deg.includes(c.id), fee = Math.round(c.fee * (S.S >= 75 ? .5 : 1));
    const on = S.school && S.school.id === c.id, locked = !!L.ladderMiss(S, c);
    const hours = c.study ? ` · ${c.study} study hours` : '';
    return opt('enrol:' + c.id, c.name || c.id, `${c.years} years · ${mon(base(fee))} a year${hours} · pocket, then the bank${c.needs && c.needs !== 'school' ? ' · needs ' + L.needWords(c) : ''}`, has ? 'degree' : on ? 'enrolled' : locked ? 'locked' : '', has || !!S.school);
  }).join('');
}
function jobButtons(company) {
  L.ensureLife(S);
  const board = L.jobBoard(S, company);
  return board.open.filter(j => !j.track).map(j => {
    const full = L.jobById(j.id), o = L.jobOffer(S, full);
    const yours = S.job && S.job.id === j.id, booked = S.interview && S.interview.id === j.id;
    if (yours) return opt('noop:' + j.id, j.name, S.job.pay === 'month' ? `${mon(o.monthly)} a month · nine to five` : `${mon(o.rate)} an hour · or ${mon(o.monthly)} a month`, 'your job', true);
    if (booked) return opt('iv:go:' + j.id, j.name, 'The interview is still open', 'continue', false);
    const wage = `${mon(o.rate)} an hour, or ${mon(o.monthly)} a month`;
    return `<div class="opt" style="display:block"><b>${esc(j.name)}</b><small>${wage}</small><div class="opts">${opt('iv:hour:' + j.id, 'By the hour', 'Part time. A full study day still fits.', '')}${opt('iv:month:' + j.id, 'By the month', 'Full time, nine to five. No full-time study.', '')}</div></div>`;
  }).join('');
}
const PLACE_VIEW = {
  college() {
    const on = !!S.school;
    const fee = mon(L.TUITION);
    return head('College', on ? 'Enrolled: ' + S.school.id : 'One course. Tuition ' + fee + ' for the year. Pocket first, then the bank.') + resBox(cur.r) +
      (on ? `<div class="res">You are enrolled in ${esc(S.school.id)}.</div><div class="opts one">${opt('dropout', 'Drop out', 'You stop the course', '')}</div>${examOpts()}` : `<div class="opts one">${opt('course', 'Enrol — College year', fee + ' · pocket, then the bank · uses 1 free time', '')}</div>`);
  },
  itcollege() {
    return head('IT College', 'A BSc in IT, in town. Not the university.') + resBox(cur.r) + `<div class="res">${esc(studyLine())}</div><div class="opts">${courseButtons('itcollege')}</div>` + (S.school ? `<div class="opts one">${opt('dropout', 'Drop out', '', '')}</div>${examOpts()}` : '');
  },
  som() { return head('School of Management', 'SOM. Business, MBA, DBA.') + resBox(cur.r) + `<div class="res">${esc(studyLine())}</div><div class="opts">${courseButtons('som')}</div>` + (S.school ? `<div class="opts one">${opt('dropout', 'Drop out', '', '')}</div>${examOpts()}` : ''); },
  serd() { return head('School of Environment', 'SERD. The MSc and the PhD sit here.') + resBox(cur.r) + `<div class="res">${esc(studyLine())}</div><div class="opts">${courseButtons('serd')}</div>` + (S.school ? `<div class="opts one">${opt('dropout', 'Drop out', '', '')}</div>${examOpts()}` : ''); },
  set() { return head('School of Engineering', 'SET. Technology, and the engineering MSc.') + resBox(cur.r) + `<div class="res">${esc(studyLine())}</div><div class="opts">${courseButtons('set')}</div>` + (S.school ? `<div class="opts one">${opt('dropout', 'Drop out', '', '')}</div>${examOpts()}` : ''); },
  class() { return head('Class', 'A teaching room in the SERD building, on the canal lawn.') + resBox(cur.r) + (S.school ? `<div class="opts one">${opt('classsit', 'Sit the class', 'One hour. It counts.', '')}</div>${examOpts()}` : `<div class="res">Enrol at SOM, SERD or SET first.</div>`); },
  dorm() { return head('Dorm Y', 'Next to Student Village. A shared room, a fan, the open corridor.') + resBox(cur.r) + `<div class="opts one">${opt('dormrest', 'Sleep', 'Health and happiness. Uses an hour.', '')}</div>`; },
  canteen() { return head('Canteen', 'The cafeteria. Rice, curry, and half the campus.') + resBox(cur.r) + `<div class="opts">${opt('eat:rice', 'Rice and curry', mon(base(4)) + ' · Happiness +2', '')}${opt('eat:coffee', 'Coffee', mon(base(3)) + ' · from the lounge', '')}</div>`; },
  library() { return head('Library', 'Above the lake. Quiet, if you ignore the bicycles.') + resBox(cur.r) + (S.school ? `<div class="opts one">${opt('study', 'Study', 'One hour in the stacks.', '')}</div>${examOpts()}` : `<div class="res">The stacks are open. Enrol, then the hour counts.</div>`); },
  school() { return head('AIT School', 'The campus school. Children in the mornings. Your course is at SOM, SERD or SET.') + resBox(cur.r); },
  union() { return head('Student Union', 'Notice boards, a cafe, and someone always between classes.') + resBox(cur.r) + `<div class="opts">${opt('eat:coffee', 'SU Cafe', mon(base(3)), '')}</div>`; },
  bazaar() { return head('Old Bazaar', 'The tea stall by the stupa. A glass of milk tea, a plate of momo dumplings, the square going past.') + resBox(cur.r) + `<div class="opts">${opt('eat:coffee', 'Milk tea', mon(base(3)) + ' · Happiness +1, Smarts +1', '')}${opt('eat:rice', 'Momo', mon(base(4)) + ' · Happiness +2', '')}</div>`; },
  fields() { return head('Fields', 'Dry fields, bunds and farm tracks either side of the road. The road north is the way to AIT.') + resBox(cur.r); },
  work() {
    const labour = Ms.current(S, L.netWorth(S));
    const day = labour && labour.id === 'labour' ? `<div class="opts one">${opt('labour', 'Day labour', 'One day hauling loads. Cash in hand. Uses 1 time · max 3 a day.', 'mission')}</div>` : '';
    return head('Meridian', 'Each job is an hourly rate, or a monthly wage. The month is nine to five. A short interview first, about the work.') + resBox(cur.r) + day + `<div class="opts">${jobButtons('meridian')}</div>` + ladderBlock('meridian') + (S.job ? `<div class="opts one">${opt('quit', 'Quit', S.job.name, '')}</div>` : '');
  },
  itco() {
    return head('Northline IT', 'By the hour while you study, or by the month if the day is free. Nine to five does not sit beside a full study day.') + resBox(cur.r) + `<div class="opts">${jobButtons('northline')}</div>` + ladderBlock('northline') + (S.job ? `<div class="opts one">${opt('quit', 'Quit', S.job.name, '')}</div>` : '');
  },
  business() {
    L.ensureLife(S);
    const q = L.shopQuote(S, S.biz ? S.biz.id : 'shop');
    if (S.biz) return head(S.biz.name, 'Open. Daily figure ' + mon(q.day) + '.') + resBox(cur.r) + `<div class="res">Daily figure ${mon(q.day)}. A free hour or a roam hour pays ${mon(q.hour)}. Today ${mon(S.shop || 0)}. Work past six hours cuts the hour.</div>`;
    return head('Corner shop', 'Stock it from your pocket. Daily figure ' + mon(q.day) + '.') + resBox(cur.r) + `<div class="res">Daily figure ${mon(q.day)}. Opening costs ${mon(q.cost)} from your pocket. A free hour or a roam hour pays ${mon(q.hour)}.</div><div class="opts">${opt('biz:shop', 'Open the corner shop', mon(q.cost) + ' from your pocket · daily ' + mon(q.day), '')}</div>`;
  },
  cafe() {
    return head('☕ Cafe', 'Marta pours you a coffee.') + resBox(cur.r) + `<div class="opts">${opt('eat:healthy', '🥗 Healthy plate', mon(base(7)) + ' · Health +3', '')}${opt('eat:junk', '🍔 Burger & fries', mon(base(4)) + ' · Happiness +3, Health −2', '')}${opt('eat:coffee', '☕ Coffee', mon(base(3)) + ' · Happiness +1, Smarts +1', '')}${opt('eat:treat', '🍰 Treat a friend', mon(base(15)) + ' · Happiness +5', '')}</div>`;
  },
  gym() {
    const mem = Fin.isMember(S), fee = c => mem ? 'free for members' : mon(base(c));
    return head('🏋 Gym', 'Coach Dev nods at you.') + resBox(cur.r) + `<div class="opts">${opt('gym:cardio', '🏃 Cardio', fee(4) + ' · Health +4, Looks +1', '')}${opt('gym:weights', '🏋 Weights', fee(4) + ' · Looks +4, Health +2', '')}${opt('gym:yoga', '🧘 Yoga', fee(3) + ' · Health +2, Happiness +3', '')}</div>` + gymHtml();
  },
  home() {
    const par = (w, nm) => { const p = S[w]; return `<div class="hdr">${nm}: ${esc(p.n)}${p.alive ? '' : ' (passed away)'}</div>` + barHtml('❤', p.rel, '#e46a8c') + (p.alive ? `<div class="opts">${opt(`fam:${w}:time`, 'Spend time', '❤ +7 · Happiness +3', '')}${opt(`fam:${w}:gift`, 'Give a gift', mon(base(25)) + ' · ❤ +9', '')}${opt(`fam:${w}:ask`, 'Ask for money', 'Works if you get along (once a year)', '')}${opt(`fam:${w}:argue`, 'Argue', '❤ −9', '')}</div>` : ''); };
    return head('🏠 Home', 'Your room, your people.') + resBox(cur.r) + injuryBlock('home') + householdHtml() + `<div class="opts one">${opt('rest', '🛏 Rest', 'Health +4, Happiness +2 · uses 1 free time', '')}${opt('fin', '💰 Finances', 'This month, last month, a year of bars', '')}</div>` + vehHtml(false) + par('mom', 'Mother') + par('dad', 'Father');
  },
  kin() { return kinView(); },
  life: () => lifeView(),
  finances() { return finSheet(); },
  dealer() {
    L.ensureLife(S);
    const cards = Object.entries(Fin.MODELS).map(([id, m]) => {
      const nw = Fin.vprice(S, id, 'buy', false), us = Fin.vprice(S, id, 'buy', true), tn = Fin.loanTerms(S, id, false), tu = Fin.loanTerms(S, id, true);
      const fuel = m.fuel[0] ? ' · fuel about ' + mon(Math.max(1, Fin.vprice(S, id, 'fuel'))) + ' a km' : ' · no fuel';
      return `<div class="opt" style="display:block"><b>${m.name}</b><small style="display:block">New ${mon(nw)} · second-hand ${mon(us)} · servicing and tax ${mon(Fin.vprice(S, id, 'svc'))} a month${fuel}</small><div class="opts">` +
        opt(`vbuy:${id}:new`, 'New, cash', mon(nw), '') + opt(`vbuy:${id}:used`, 'Second-hand, cash', mon(us), '') +
        (m.loanMonths ? opt(`vloan:${id}:new`, 'New on a loan', `${mon(tn.down)} down · ${mon(tn.emi)} a month for ${tn.months}`, '') + opt(`vloan:${id}:used`, 'Second-hand on a loan', `${mon(tu.down)} down · ${mon(tu.emi)} a month for ${tu.months}`, '') : '') + '</div></div>';
    }).join('');
    return head('🚗 Sansar Motors', `New and second-hand. Cash, or a Sansar Bank loan at ${Fin.LOAN_RATE}% a year (it wants a job or a business). What you buy parks at home.`) + resBox(cur.r) + vehHtml(true) + '<div class="hdr">On the lot</div>' + cards;
  },
  hospital() {
    const now = clockNow(), q = Hosp.quote(S, now, L.K(S)), j = S.injury, hurt = Hosp.active(S);
    const insLine = '<div class="hdr">Health plan</div>' + plansHtml(now);
    const sub = 'Reception. Emergency open all hours.';
    if (!hurt) {
      const fee = Math.round(Hosp.CHECKUP_BASE * L.K(S)), pubFee = Math.round(fee * Hosp.PUBLIC_SHARE);
      const check = (S.L || 0) >= 100 ? `<div class="res">You're in perfect health.</div>` : `<div class="hdr">Full check-up and treatment${S.why ? ' - ' + esc(S.why.toLowerCase()) : ''}</div><div class="opts">` +
        opt('heal:checkpub', '🏥 Public ward check-up', `${pubFee ? mon(pubFee) : 'Free'} · rest, stress, exhaustion or illness · health to 100 · if you cannot pay, it is waived`, 'cheap') +
        opt('heal:checkup', '✚ Private check-up', `Seen now · health to 100 · ${mon(fee)}`, 'fast') + '</div>';
      return head('🏥 City Hospital', sub) + resBox(cur.r) + check + insLine + ladderBlock('hospital');
    }
    const queued = j.treated === 'public';
    const have = Math.max(0, S.cash || 0) + Math.max(0, S.bank || 0), gap = Math.max(0, q.you - have);
    const hasLoan = S.hh && S.hh.loans && S.hh.loans.some(l => l.id === 'medloan' && l.state === 'ok');
    const loan = gap > 0 && !hasLoan ? opt('heal:loan', '🏦 Hospital loan', `Borrow ${mon(gap)} for the private bill · health to 100 · paid back monthly`, '') : '';
    const treat = queued ? '' : `<div class="hdr">Full check-up and treatment - your ${esc(j.hurt)} (${Hosp.SEV[j.sev].name.toLowerCase()})</div><div class="opts">` +
      opt('heal:private', '✚ Private treatment', `Seen now · health to 100${q.room ? ' · a private room' : ''} · bill ${mon(q.you)}${q.ins ? ` after the ${q.plan} plan (full ${mon(q.full)})` : ''} · pocket, then the bank`, 'fast') +
      opt('heal:public', '🏥 Public ward', `${mon(q.pub)} · health to 100 now · if you cannot pay, the rest is waived`, 'cheap') +
      loan +
      (j.healAt && !j.treated ? opt('heal:pharm', '💊 Pharmacy counter', mon(q.pharm) + ' · heals within ' + Hosp.SEV[j.sev].pharmDays + ' days', '') : '') + '</div>';
    return head('🏥 City Hospital', sub) + resBox(cur.r) + injuryBlock('hospital') + treat + insLine + ladderBlock('hospital');
  },
  bank() {
    L.ensureLife(S);
    const r = L.bankRates(S);
    const fds = S.fds.map(f => f.months
      ? `<div class="opt" style="display:block"><b>${mon(f.amt)} · ${f.months} months at ${f.rate}%</b><small style="display:block">Matures at ${esc(f.due)}, in ${f.left} month${f.left === 1 ? '' : 's'} · pays ${mon(L.fdPayout(f))}</small><div class="opts one">${opt('fdbreak:' + f.id, 'Break early', `Pays ${r.brk}% for the months held`, '')}</div></div>`
      : `<div class="opt" style="display:block"><b>${mon(f.start)} at ${f.rate}%</b><small style="display:block">Older deposit. Matures in ${f.left} yr on a birthday · now ${mon(f.amt)}</small></div>`).join('') || '<div class="res">No fixed deposits yet.</div>';
    return head('Bank', moneyLine(S)) + resBox(cur.r) +
      `<div class="hdr">Savings</div><b>${mon(S.bank)}</b> <small>${r.sav}% a year, paid each month · interest this year ${mon(S.interest)}</small>
      <div class="hdr">Amount in dollars</div><input id="bkAmt" type="number" inputmode="decimal" min="0.01" step="0.01" placeholder="Dollars" value="${Math.max(0, Math.min(1000, Math.floor(L.usdOf(S, Math.max(0, S.cash || 0))))) || ''}" style="width:100%;padding:11px;border-radius:10px;border:1px solid #fff4;background:#2a1a10;color:#fff4dc;font-size:1rem;user-select:text">
      <div class="opts">${opt('dep', 'Deposit', 'Pocket cash into savings', '')}${opt('wd', 'Withdraw', 'Savings into your pocket', '')}</div>
      <div class="hdr">Fixed deposit</div><small>The amount above, from savings first, then pocket. Locked until it matures. Breaking early pays ${r.brk}%.</small>
      <div class="opts">${L.FD_MONTHS.map(m => opt('fdm:' + m, m + ' months', r.fd[m] + '% a year', m === 12 ? 'best rate' : '')).join('')}</div>
      <div class="hdr">Your fixed deposits</div>${fds}` +
      `<div class="hdr">A loan for the next step</div><div class="opts">${opt('gloan', 'Borrow for a house', mon(2000000) + ' at 11% for 5 years. The bank wants a job, a shop, or land.', '')}${opt('ploan:business', 'Borrow for a business', 'Needs a shop. The same kind of loan as a vehicle.', '')}${opt('ploan:education', 'Borrow for a course', 'Needs you enrolled. Paid back monthly.', '')}</div><div class="res">A car loan is at Sansar Motors, on the same loan books.</div>` +
      `<div class="opts one" style="margin-top:12px">${opt('fin', '💰 Finances', 'Income and costs, month by month', '')}</div><div class="hdr">Health plan</div>${plansHtml(clockNow())}` + loansHtml() + ladderBlock('harbor');
  },
  exchange() {
    const day = worldDay();
    const sum = Mkt.summary(S, day, L.monthIndex(S));
    const held = sum.rows.length ? sum.rows.map((h) => `<div class="opt" style="display:block"><b>${esc(h.name)}</b><small style="display:block">${h.n} shares · avg ${mon(h.avg)} · now ${mon(h.price)} · value ${mon(h.value)}</small><small style="display:block">Unrealised ${mon(h.unreal)} (${h.pct >= 0 ? '+' : ''}${h.pct}%) · dividends ${mon(h.div)}</small><div class="opts">${opt('mbuy:' + h.id, 'Buy 1', mon(h.price), '')}${opt('msell:' + h.id, 'Sell 1', h.n + ' held', '')}${opt('msellco:' + h.id, 'Sell all', h.n + ' shares', '')}</div></div>`).join('') : '<div class="res">You hold no shares yet. Buy one. Prices move once each world day.</div>';
    const rows = Mkt.LIST.map((c) => {
      const q = Mkt.quote(c.id, day), n = (S.folio && S.folio.sh[c.id]) || 0;
      return `<div class="opt" style="display:block"><b>${esc(c.name)}</b><small style="display:block">${esc(c.sector)} · ${mon(q.price)} · ${q.chg >= 0 ? '+' : ''}${q.chg}% today · dividend ${(c.yield * 100).toFixed(1)}% a year · you hold ${n}</small><div class="opts">${opt('mbuy:' + c.id, 'Buy 1', mon(q.price), '')}${opt('msell:' + c.id, 'Sell 1', n ? n + ' held' : 'none held', '', !n)}${n ? opt('msellco:' + c.id, 'Sell all', n + ' shares', '') : ''}</div></div>`;
    }).join('');
    const pct = (sum.ret >= 0 ? '+' : '') + sum.ret + '%';
    return head('Sansar Stock Exchange', 'Ten companies. The tape moves once each world day. Dividends land in the bank.') + resBox(cur.r) + `<div class="res">${esc(Mkt.newsLine(day))}</div><div class="hdr">Your portfolio</div>${portTotals(sum, pct)}${portChart(sum.hist)}${held}<div class="opts stick">${opt('msellport', 'Sell entire portfolio', 'Books the realised gain or loss', '')}</div><div class="hdr">The board</div>${rows}`;
  },
  rentals() {
    L.ensureLife(S);
    const rows = S.rentBoard || [];
    if (!rows.length && !rentPull) { rentPull = 1; send({ t: 'rentboard' }); }
    const youRent = rows.some(u => u.tenant === 'you');
    const km = d => (Math.round((d || 0) * 5 / 100) / 10) + ' km from town';
    const cards = rows.map(u => {
      const who = u.tenant === 'you' ? 'You rent this' : u.tenant === 'ai' ? 'A resident rents it' : u.tenant === 'player' ? (esc(u.tenantName) || 'A player') + ' rents it' : 'Empty';
      const own = u.owner === 'you' ? 'You own it' : u.owner === 'player' ? (esc(u.ownerName) || 'A player') + ' owns it' : 'On the market';
      const near = (u.nearby || []).map(n => esc(n.label) + ' ' + mon(n.ask)).join(' · ');
      const showNear = true;
      let acts = opt('rgo:' + u.id, 'Walk there', km(u.dist), '');
      if (u.owner !== 'you' && u.tenant !== 'player' && u.tenant !== 'you') {
        acts += youRent ? opt('rswitch:' + u.id, 'Switch to this', 'Your old lease ends after one game month', '') : opt('rtake:' + u.id, 'Rent it', mon(u.ask) + ' a month from your bank', '');
      }
      if (u.owner !== 'you' && u.price > 0 && u.tenant !== 'player') acts += opt('rbuy:' + u.id, 'Buy it', mon(u.price) + '. Then live in it, or let it out.', '');
      if (u.owner === 'you') {
        acts += opt('rlive:' + u.id, 'Live here', 'Puts the home in your name', '');
        acts += opt('rask:' + u.id, 'Set this rent', 'Uses the dollar amount above', '');
      }
      if (u.tenant === 'you') acts += opt('rnotice:' + u.id, u.notice ? 'Notice given' : 'Give notice', 'One game month, then you move out', '', !!u.notice);
      const late = u.tenant === 'you' && u.missed ? ' · ' + u.missed + ' missed' : '';
      return `<div class="opt" style="display:block"><b>${esc(u.label)}</b><small style="display:block">${mon(u.ask)} a month · ${own} · ${who}${late} · ${km(u.dist)}</small>${showNear && near ? `<small style="display:block">Nearby rentals: ${near}</small>` : ''}<div class="opts">${acts}</div></div>`;
    }).join('');
    return head('Rental office', 'Farther from town is cheaper, and the trip takes longer. Between players the server charges the tenant on their clock and pays the landlord on theirs.') + resBox(cur.r) +
      (S.mustLeave ? '<div class="res">Your family asked you to move out. Pick a room.</div>' : '') +
      '<div class="hdr">New rent in dollars</div><input id="rentAsk" type="number" inputmode="decimal" min="1" step="1" value="90" style="width:100%;padding:11px;border-radius:10px;border:1px solid #fff4;background:#2a1a10;color:#fff4dc;font-size:1rem">' +
      '<div class="hdr">Listings</div>' + (cards || '<div class="res">The office is fetching the listings.</div>');
  }
};
// ---------- Finances: the ledger (finance.js), health plans, the gym, vehicles and your loans ----------
const trend = (a, b, exp) => b == null || a === b ? '<i class="ar">·</i>' : `<i class="ar ${(a > b) !== !!exp ? 'good' : 'bad'}">${a > b ? '▲' : '▼'}</i>`;
function portChart(hist) {
  const pts = hist && hist.length ? hist : [{ m: 0, v: 0 }];
  const w = 320, h = 70, max = Math.max(1, ...pts.map((p) => p.v || 0));
  const xy = pts.map((p, i) => {
    const x = pts.length === 1 ? w / 2 : (i / (pts.length - 1)) * (w - 8) + 4;
    const y = h - 6 - ((p.v || 0) / max) * (h - 14);
    return [x, y];
  });
  const d = xy.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  return `<svg class="pline" viewBox="0 0 ${w} ${h}" role="img" aria-label="Portfolio value by game month"><path d="${d}"/></svg>`;
}
function portTotals(sum, pct) {
  return `<div class="ftiles" data-port="1"><div><small>Invested</small><b>${mon(sum.invested)}</b></div><div><small>Value</small><b>${mon(sum.value)}</b></div><div><small>Unrealised</small><b class="${sum.unreal < 0 ? 'neg' : 'pos'}">${mon(sum.unreal)}</b></div><div><small>Realised</small><b class="${sum.realised < 0 ? 'neg' : 'pos'}">${mon(sum.realised)}</b></div><div><small>Dividends</small><b>${mon(sum.div)}</b></div><div><small>Overall return</small><b class="${sum.ret < 0 ? 'neg' : 'pos'}">${pct}</b></div></div>`;
}
function wealthHtml() {
  const sum = Mkt.summary(S, worldDay(), L.monthIndex(S));
  const pct = (sum.ret >= 0 ? '+' : '') + sum.ret + '%';
  const rows = sum.rows.length ? sum.rows.map((h) => `<div class="fdue"><span>${esc(h.name)} · ${h.n} @ ${mon(h.avg)}</span><b class="${h.unreal < 0 ? 'neg' : 'pos'}">${mon(h.unreal)} (${h.pct >= 0 ? '+' : ''}${h.pct}%)</b></div>`).join('') : '<div class="res">No shares yet. The exchange is on the east side.</div>';
  return `<div class="hdr" data-wealth="1">Wealth</div><div class="res">Shares at market value, inside net worth. The line is portfolio value each game month.</div>${portTotals(sum, pct)}${portChart(sum.hist)}${rows}`;
}
function finRows(list, side, v) {
  const c = v.cur[side], l = v.last ? v.last[side] : null;
  return list.map(([k, label]) => {
    const a = Math.round(c[k] || 0), b = l ? Math.round(l[k] || 0) : 0;
    return `<tr><th>${label}</th><td>${mon(a)}${trend(a, l ? b : null, side === 'exp')}</td><td>${l ? mon(b) : ''}</td></tr>`;
  }).join('');
}
function finBars(v) {
  const bars = v.bars.slice(-12), max = Math.max(1, ...bars.map(b => Math.max(b.inc, b.exp)));
  const pad = Array.from({ length: 12 - bars.length }, () => '<div class="fb"><i></i><i></i><small></small></div>').join('');
  const cols = bars.map((b, i) => `<div class="fb${b.cur ? ' now' : ''}"><i class="in" style="height:${Math.round(b.inc / max * 100)}%"></i><i class="ex" style="height:${Math.round(b.exp / max * 100)}%"></i><small>${b.cur ? 'now' : i - bars.length + 1}</small></div>`).join('');
  return `<div class="fbars" aria-label="Income and expenses, last 12 months">${pad}${cols}</div><div class="flegend"><span class="in">Income</span><span class="ex">Expenses</span><span>last 12 months</span></div>`;
}
function gymHtml() {
  const mem = Fin.isMember(S), fee = Fin.gymFee(S), n = (S.fin && S.fin.ex) || 0, ex = `Exercise this month: ${n} session${n === 1 ? '' : 's'} or gym hours.`;
  return '<div class="hdr">Gym membership</div>' + (mem
    ? `<div class="res">Iron & Oak member: ${mon(fee)} a month, charged on the 1st. Sessions are free. ${ex}</div><div class="opts one">${opt('gymleave', 'Cancel the membership', 'Nothing more is charged', '')}</div>`
    : `<div class="res">${ex} A month with none, and health and looks slip.</div><div class="opts one">${opt('gymjoin', '🏋 Join Iron & Oak Gym', mon(fee) + ' a month · first month now · sessions free · cancel any time', '')}</div>`);
}
function plansHtml(now) {
  L.ensureLife(S);
  const c = Fin.cover(S, now), mine = S.ins && Fin.PLANS[S.ins.plan] ? S.ins.plan : '', plans = Fin.PLANS;
  const st = c.legacy ? 'Your old yearly insurance pays 80% of hospital bills until it runs out.'
    : c.on ? `${plans[c.plan].name} plan active: it pays ${Math.round(c.share * 100)}% of hospital bills${plans[c.plan].room ? ', with a private room and no queue' : ''}.${c.next ? ` The ${plans[c.next].name} plan takes over on the next 1st.` : ''}`
    : c.waiting ? `${plans[c.plan].name} plan bought. Cover starts on the next 1st. Until then hospital bills are yours.`
    : 'No health plan. You pay the whole hospital bill.';
  const rows = Object.entries(plans).map(([id, p]) => opt('plan:' + id, '🛡 ' + p.name, `${mon(Fin.premium(S, id))} a month · ${p.sub}`, mine === id ? 'yours' : '', mine === id)).join('');
  return `<div class="res">${st} Plans cover ${Fin.INS_COVERS}. The premium is monthly and rises with age and with each claim. Cover starts on the next 1st, so buy before you need it.</div><div class="opts">${rows}</div>` +
    (mine || c.legacy ? `<div class="opts one">${opt('plancancel', 'Cancel the plan', 'No more premiums, and no more cover', '')}</div>` : '');
}
function vehHtml(dealer) {
  L.ensureLife(S);
  const rows = (S.vehicles || []).map(v => {
    const loan = v.loan && S.hh ? S.hh.loans.find(l => l.id === v.loan && l.state === 'ok') : null, fk = Fin.fuelPerKm(S, v);
    const bits = [v.family ? `the family pays servicing ${mon(Fin.vprice(S, v.model, 'svc'))} and the fuel` : `servicing ${mon(Fin.vprice(S, v.model, 'svc'))} a month`, fk ? `fuel about ${mon(Math.max(1, fk))} a km` : '', v.family ? '' : `worth ${mon(v.value)}`,
      loan ? `loan ${mon(loan.principal)} left at ${mon(loan.instalment)} a month` : '', v.family ? '' : v.ins ? `insured, ${mon(Fin.vehPremium(S, v))} a month` : 'not insured: theft or a bad crash loses it', v.driver ? 'a driver comes with it' : '', 'parked at home'].filter(Boolean).join(' · ');
    const acts = v.family ? '' : `<div class="opts">${opt('vins:' + v.id, v.ins ? 'Stop the insurance' : 'Insure it', v.ins ? 'Theft and crashes become yours' : mon(Fin.vehPremium(S, v)) + ' a month · theft and accidents', '')}${dealer ? opt('vsell:' + v.id, 'Sell or trade in', mon(Fin.tradeIn(v)) + (loan ? ' · the loan is cleared first' : ''), '') : ''}</div>`;
    return `<div class="opt" style="display:block"><b>${esc(Fin.vehLabel(v))}${v.plate ? ' · ' + esc(v.plate) : ''}</b><small style="display:block">${esc(bits)}</small>${acts}</div>`;
  }).join('');
  return '<div class="hdr">Your vehicles</div>' + (rows || `<div class="res">None. You walk, or take the bus and taxis${S.hh && S.hh.home && S.hh.home.dist > 0 ? ' (fares are on your monthly costs)' : ''}. In town the bicycle, scooter and car by the fountain are rentals. Sansar Motors, on the east side, sells new and second-hand.</div>`);
}
function loansHtml() {
  const ls = S.hh ? S.hh.loans.filter(l => l.state === 'ok' || l.state === 'court') : [];
  if (!ls.length) return '';
  return '<div class="hdr">Loans</div>' + ls.map(l => `<div class="opt" style="display:block"><b>${esc(l.lender)}</b><small style="display:block">${mon(l.principal)} left at ${l.rate}% · ${mon(l.instalment)} a month · ${l.payer === 'you' ? 'you pay' : 'the family pays'}${l.collateral && l.collateral !== 'none' ? ' · held against the ' + esc(l.collateral) : ''}${l.missed ? ` · ${l.missed} missed` : ''}${l.late ? ` · ${l.late} behind` : ''}</small>${l.payer === 'you' && l.state === 'ok' ? `<div class="opts one">${opt('loanpay:' + l.id, 'Pay an instalment now', l.late ? 'Clears one late month' : 'Counts as this month', '')}</div>` : ''}</div>`).join('');
}
function householdHtml() {
  if (!S.hh) return '';
  const v = L.householdView(S), c = L.commuteHours(S), fam = L.familyAtHome(S, hourNow());
  const who = fam.length ? fam.map(m => esc(m.name.split(' ')[0]) + ' (' + esc(m.rel) + ')').join(', ') : 'nobody';
  const moves = L.moveOptions(S).slice(0, 4).map(o => opt('hmove:' + o.type + ':rent', 'Rent ' + esc(o.hood), mon(o.rent) + ' a month', '') + (o.price > 0 ? opt('hmove:' + o.type + ':buy', 'Buy ' + esc(o.hood), mon(o.price), '') : '')).join('');
  const b = S.hh.biz;
  const shop = b && b.state === 'open' ? `<div class="hdr">${esc(b.name)}</div><div class="res">${esc(b.kind)}. Revenue ${mon(b.revenue)}, costs ${mon(b.costs)}, stock ${mon(b.stock)}, staff ${b.staff}, health ${Math.round(b.health)}. ${b.owner === 'you' ? 'You run it.' : 'The family runs it.'}</div><div class="opts">${opt('hhelp', 'Help in the shop', 'One hour. Four hours in a month start to turn it.', '')}${opt('htake', 'Take it over', 'Profit and the shop loans become yours', '')}${opt('hstock', 'Restock', 'Cash from your bank, then pocket', '')}${opt('hcut', 'Let a worker go', b.staff + ' on the books', '')}${opt('hsell', 'Sell the shop', mon(L.shopPrice(S)), '')}</div>` : '';
  const leave = S.mustLeave ? '<div class="res">Your family asked you to move out. Listings are at the rental office. Farther from town is cheaper, and the trip takes longer.</div>' : '';
  const stay = S.hh.home && S.hh.home.familyStay ? `<div class="res">You pay the family ${mon(S.hh.home.rent)} a month to stay. This home is not in your name.</div>` : '';
  return leave + stay + `<div class="res">${esc(v.label)}. ${esc(v.hood)}. ${esc(S.hh.home.desc)}</div><div class="res">Purse ${mon(S.hh.purse)}. Coming in ${mon(v.inc)}, rent ${mon(v.rent)}, loan instalments ${mon(v.inst)}. Commute ${c.hours} h by ${c.mode}, ${c.km} km. Home now: ${who}.</div>` + shop + (moves ? `<div class="hdr">Move house</div><div class="opts">${moves}</div>` : '') + `<div class="opts">${opt('hsleep', 'Sleep', 'Ends the day. You wake at 7.', '')}${opt('heat', 'Eat at home', mon(v.meal) + ' from the family pot', '')}${opt('rentopen', 'Rental office', 'Rooms across town. Farther is cheaper.', '')}</div>`;
}
function ladderBlock(company) {
  L.ensureLife(S);
  const v = L.careerView(S);
  const mine = S.job && S.job.company === company && v.canApply ? `<div class="opts one">${opt('ipromo', 'Apply internally', esc(v.nextName), 'next rung')}</div>` : '';
  const cross = (v.crosses || []).filter(c => c.ready).map(c => opt('xpromo:' + c.id, 'Cross to ' + esc(c.name), 'Same company, another track', '')).join('');
  const board = L.jobBoard(S, company);
  const entries = board.open.filter(j => j.track && !(S.job && S.job.id === j.id)).map(j => {
    const full = L.jobById(j.id), band = L.payBand(S, full);
    return opt('iv:month:' + j.id, esc(j.field) + ' · ' + esc(j.name), mon(band[0]) + '–' + mon(band[1]) + ' a year', 'open', false);
  }).join('');
  const almost = board.almost.map(j => opt('noop:' + j.id, esc(j.field ? j.field + ' · ' : '') + esc(j.name), 'Almost there. Missing ' + esc(j.why), 'almost', true)).join('');
  return (mine || cross || entries || almost) ? `<div class="hdr">You can apply</div>${mine}${cross ? `<div class="opts">${cross}</div>` : ''}<div class="opts">${entries}</div>` + (almost ? `<div class="hdr">Almost there</div><div class="opts">${almost}</div>` : '') : '';
}
function careerHtml() {
  L.ensureLife(S);
  const v = L.careerView(S);
  const hist = (v.hist || []).slice(-12);
  const max = Math.max(1, ...hist.map(h => h.sal || 0));
  const chart = hist.length ? `<div class="cbar" aria-label="Salary history">${hist.map(h => `<i style="height:${Math.max(8, Math.round((h.sal || 0) / max * 100))}%"></i>`).join('')}</div><div class="flegend"><span>Salary each review</span></div>` : '<div class="res">No review yet. A year in the same post writes the first bar.</div>';
  const checks = v.checks.length ? v.checks.map(c => `<div class="fdue"><span>${esc(c.label)}</span><b>${esc(c.have)}</b></div>`).join('') : (v.nextName ? '' : '<div class="res">Top of this ladder. A C-level post can still move to CEO.</div>');
  const gos = (v.gos || []).map(g => opt('cgo:' + g.place, 'Go', esc(g.why), '')).join('');
  const apply = v.canApply ? `<div class="opts one">${opt('ipromo', 'Apply internally', esc(v.nextName), '')}</div>` : '';
  const where = v.track ? `${esc(v.track)} · ${esc(v.title)}` : esc(v.title);
  const band = v.band && v.band[1] ? `Band ${mon(v.band[0])}–${mon(v.band[1])} a year. Now ${mon(v.pay)}.` : 'No salary band yet.';
  const next = v.nextName ? `Next: ${esc(v.nextName)}` : 'Next: —';
  return `<div class="hdr">Career</div><div class="res">${where}. ${v.yrs} year${v.yrs === 1 ? '' : 's'} in post. ${esc(band)}</div>${chart}<div class="hdr">${next}</div>${checks}${gos ? `<div class="opts">${gos}</div>` : ''}${apply}`;
}
function finSheet() {
  L.ensureLife(S);
  const v = L.finView(S), now = clockNow(), days = L.daysToFirst(S);
  const tick = days === 1 ? '1 day' : days + ' days';
  const tiles = `<div class="ftiles"><div><small>Net this month</small><b class="${v.net < 0 ? 'neg' : 'pos'}">${mon(v.net)}</b><small>${v.lastNet != null ? 'last month ' + mon(v.lastNet) : 'first month'}</small></div>` +
    `<div><small>Savings rate</small><b class="${(v.rate ?? 0) < 0 ? 'neg' : 'pos'}">${v.rate == null ? '—' : v.rate + '%'}</b><small>${v.lastRate != null ? 'last month ' + v.lastRate + '%' : 'net over income'}</small></div>` +
    `<div><small>Net worth</small><b>${mon(L.netWorth(S))}</b><small>pocket ${mon(S.cash)} · bank ${mon(S.bank || 0)}</small></div></div>`;
  const none = t => `<tr><th colspan="3" class="none">${t}</th></tr>`;
  const table = `<table class="ftab"><thead><tr><th></th><th>This month</th><th>Last month</th></tr></thead><tbody>` +
    `<tr class="fh"><th colspan="3">Income</th></tr>${finRows(Fin.INC, 'inc', v) || none('No income yet')}<tr class="ft"><th>Total income</th><td>${mon(v.ti)}${trend(v.ti, v.last ? v.li : null, false)}</td><td>${v.last ? mon(v.li) : ''}</td></tr>` +
    `<tr class="fh"><th colspan="3">Expenses</th></tr>${finRows(Fin.EXP, 'exp', v) || none('Nothing spent yet')}<tr class="ft"><th>Total expenses</th><td>${mon(v.te)}${trend(v.te, v.last ? v.le : null, true)}</td><td>${v.last ? mon(v.le) : ''}</td></tr>` +
    `<tr class="fn"><th>Net</th><td>${mon(v.net)}</td><td>${v.last ? mon(v.lastNet) : ''}</td></tr></tbody></table>`;
  const due = v.due.length ? v.due.map(d => `<div class="fdue"><span>${esc(d.why)}</span><b>${mon(d.amt)}</b></div>`).join('') + `<div class="fdue tot"><span>Total on the next tick</span><b>${mon(v.dueTotal)}</b></div>` : '<div class="res">Nothing recurring yet.</div>';
  const buys = [...v.cur.buys, ...(v.last ? v.last.buys : [])].slice(0, 4);
  const bought = buys.length ? '<div class="hdr">Bought and sold</div>' + buys.map(b => `<div class="fdue"><span>${esc(b.text)}</span><b>${mon(Math.abs(b.amt))}</b></div>`).join('') + '<small>Things you keep are not monthly costs; they count in net worth.</small>' : '';
  return head('💰 Finances', `Salary, interest and monthly costs fall due on the 1st, in ${tick}: pocket first, then the bank.`) + resBox(cur.r) + careerHtml() + tiles + wealthHtml() + finBars(v) + table +
    '<div class="hdr">Due on the next 1st</div>' + due + bought + gymHtml() + '<div class="hdr">Health plan</div>' + plansHtml(now) + vehHtml(false) + loansHtml();
}
function finParts() {
  L.ensureLife(S);
  const v = L.finView(S), now = clockNow(), days = L.daysToFirst(S);
  const tick = days === 1 ? '1 day' : days + ' days';
  return [
    () => {
      const tiles = `<div class="ftiles"><div><small>Net this month</small><b class="${v.net < 0 ? 'neg' : 'pos'}">${mon(v.net)}</b><small>${v.lastNet != null ? 'last month ' + mon(v.lastNet) : 'first month'}</small></div>` +
        `<div><small>Savings rate</small><b class="${(v.rate ?? 0) < 0 ? 'neg' : 'pos'}">${v.rate == null ? '—' : v.rate + '%'}</b><small>${v.lastRate != null ? 'last month ' + v.lastRate + '%' : 'net over income'}</small></div>` +
        `<div><small>Net worth</small><b>${mon(L.netWorth(S))}</b><small>pocket ${mon(S.cash)} · bank ${mon(S.bank || 0)}</small></div></div>`;
      return head('💰 Finances', `Salary, interest and monthly costs fall due on the 1st, in ${tick}: pocket first, then the bank.`) + resBox(cur.r) + tiles + wealthHtml();
    },
    () => finBars(v),
    () => {
      const none = t => `<tr><th colspan="3" class="none">${t}</th></tr>`;
      return `<table class="ftab"><thead><tr><th></th><th>This month</th><th>Last month</th></tr></thead><tbody>` +
        `<tr class="fh"><th colspan="3">Income</th></tr>${finRows(Fin.INC, 'inc', v) || none('No income yet')}<tr class="ft"><th>Total income</th><td>${mon(v.ti)}${trend(v.ti, v.last ? v.li : null, false)}</td><td>${v.last ? mon(v.li) : ''}</td></tr>` +
        `<tr class="fh"><th colspan="3">Expenses</th></tr>${finRows(Fin.EXP, 'exp', v) || none('Nothing spent yet')}<tr class="ft"><th>Total expenses</th><td>${mon(v.te)}${trend(v.te, v.last ? v.le : null, true)}</td><td>${v.last ? mon(v.le) : ''}</td></tr>` +
        `<tr class="fn"><th>Net</th><td>${mon(v.net)}</td><td>${v.last ? mon(v.lastNet) : ''}</td></tr></tbody></table>`;
    },
    () => {
      const due = v.due.length ? v.due.map(d => `<div class="fdue"><span>${esc(d.why)}</span><b>${mon(d.amt)}</b></div>`).join('') + `<div class="fdue tot"><span>Total on the next tick</span><b>${mon(v.dueTotal)}</b></div>` : '<div class="res">Nothing recurring yet.</div>';
      const buys = [...v.cur.buys, ...(v.last ? v.last.buys : [])].slice(0, 4);
      const bought = buys.length ? '<div class="hdr">Bought and sold</div>' + buys.map(b => `<div class="fdue"><span>${esc(b.text)}</span><b>${mon(Math.abs(b.amt))}</b></div>`).join('') + '<small>Things you keep are not monthly costs; they count in net worth.</small>' : '';
      return '<div class="hdr">Due on the next 1st</div>' + due + bought;
    },
    () => careerHtml(),
    () => gymHtml() + '<div class="hdr">Health plan</div>' + plansHtml(now),
    () => vehHtml(false) + loansHtml()
  ];
}
function paintFinances() {
  const parts = finParts();
  modal(parts[0](), () => { cur.place = null; });
  modal.still = true;
  let i = 1;
  const step = () => {
    if (!modalOpen || cur.place !== 'finances' || i >= parts.length) return;
    const box = document.createElement('div');
    box.innerHTML = parts[i++]();
    modalBox().appendChild(box);
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const openFinances = () => { if (!S) return; L.ensureLife(S); cur = { place: 'finances', r: null }; paintFinances(); };
// one-time advice cards (finance.js): shown when nothing else is open, never repeated
const ADVICE_GO = { gym: [['advgo:gym', '🏋 Go to the gym', 'Iron & Oak, on the east side'], ['advgo:cal', '📅 Paint a gym hour', 'Open the calendar']], rent: [['advgo:fin', '💰 Open Finances', 'See what falls due each month']], neg: [['advgo:fin', '💰 Open Finances', 'Find a cost to cut']] };
function adviceCard() {
  const a = Fin.nextAdvice(S); if (!a) return false;
  cur = { place: null, r: null };
  modal(`<div class="advice ms-row now">${head('💡 ' + esc(a.title), 'A tip, shown once')}<div class="res">${esc(a.text)}</div><div class="opts">${(ADVICE_GO[a.id] || []).map(([k, t, s]) => opt(k, t, s, '')).join('')}${opt('close', 'Got it', '', '')}</div></div>`, () => { Fin.doneAdvice(S, a.id); saveLocal(); });
  return true;
}
function openPlace(id) { cur = { place: id, r: null }; modal(PLACE_VIEW[id](), () => { cur.place = null; }); }
function lotSheet() {
  const lot = L.lotById(cur.lot); if (!lot) return head('Lot', 'Gone.');
  const v = L.lotView(S, lot);
  const bits = [];
  const bid = ((S.offers || []).filter(b => b.lot === lot.id).sort((a, b) => b.amt - a.amt))[0];
  if (v.canBuy) bits.push(opt('lotbuy:' + lot.id, v.built ? 'Buy lot and house' : 'Buy this lot', mon(v.built ? lot.price : lot.land), ''));
  if (v.offer) bits.push(opt('lotoffer:' + lot.id, 'Send an offer', v.away ? 'They are away. Three quiet days, then the highest offer takes it.' : 'They are here. They can take it or leave it.', ''));
  if (v.own && bid) bits.push(opt('lotaccept:' + lot.id + ':' + bid.bidder, 'Take ' + esc(bid.name) + "'s offer", mon(bid.amt), ''));
  if (v.own && !v.built) bits.push(opt('lotbuild:' + lot.id, 'Build a house', mon(L.HOUSE_COST), ''));
  if (v.own && v.built && !v.letOut) bits.push(opt('lotlet:' + lot.id, 'Rent it out', mon(lot.rent) + ' a month, paid each year', ''));
  if (v.own && v.letOut) bits.push(opt('lotstop:' + lot.id, 'Stop renting', 'The house sits empty', ''));
  if (v.own) bits.push(opt('lotsell:' + lot.id, 'Sell', mon(L.sellPrice(S, lot)), ''));
  const who = v.own ? 'Yours.' : v.holder === 'family' ? 'Your family holds this.' : v.who === 'For sale' ? 'For sale.' : v.who + ' holds this.';
  const offerBox = v.offer ? `<div class="hdr">Your price in dollars</div><input id="offAmt" type="number" inputmode="decimal" min="1" step="1" value="${Math.max(1, Math.round(L.usdOf(S, v.built ? lot.price : lot.land)))}" style="width:100%;padding:11px;border-radius:10px;border:1px solid #fff4;background:#2a1a10;color:#fff4dc;font-size:1rem">` : '';
  const state = v.built ? (v.letOut ? ' A house, let out.' : ' A house stands here.') : ' An empty lot.';
  return head('Lot', who + state) + offerBox + resBox(cur.r) + `<div class="opts">${bits.join('') || ''}</div>`;
}
function openLot(id) { cur = { place: null, lot: id, r: null }; modal(lotSheet(), () => { cur.lot = null; }); }
function refresh() {
  if (cur.lot) { const sc = modalBox().scrollTop; fillModal(lotSheet()); modalBox().scrollTop = sc; }
  else if (cur.place && PLACE_VIEW[cur.place]) { const sc = modalBox().scrollTop; fillModal(PLACE_VIEW[cur.place]()); modalBox().scrollTop = sc; }
  if (world && world.paintLots && S) world.paintLots(S);
  hud(); saveLocal();
}

function openActivities() {
  cur = { place: 'activities', r: null }; const rows = L.ACTIVITIES.map(a => opt('act:' + a.id, a.label, (a.cost ? mon(base(a.cost)) + ' · ' : 'Free · ') + (/^[HLSB]/.test(a.fx) ? a.fx.replace(/H/g, '😊').replace(/L/g, '❤️').replace(/S/g, '🧠').replace(/B/g, '✨').replace('@pet', '🐾') : 'a gamble'), '')).join('');
  modal(head('Roam', `Roam hours left today: ${S.time}. Each one uses an hour.`) + '<div id="actres"></div><div class="opts">' + rows + '</div>');
}
const PRESET = {
  student: h => h < 8 ? 'sleep' : h < 15 ? 'study' : h < 16 ? 'gym' : h < 19 ? 'roam' : 'free',
  office: h => h < 7 ? 'sleep' : h < 16 ? 'work' : h < 17 ? 'gym' : h < 19 ? 'roam' : 'free',
  split: h => h < 7 ? 'sleep' : h < 11 ? 'study' : h < 16 ? 'work' : h < 17 ? 'gym' : h < 19 ? 'roam' : 'free'
};
function openCalendar() {
  L.ensureLife(S); cur = { place: 'activities', r: null };
  const now = { day: Math.floor(clockNow() / DAY), hour: hourNow() };
  const apptHours = new Set(Ap.visible(S, now).filter((a) => a.day === now.day && a.status === 'set').map((a) => a.hour));
  const appts = Ap.visible(S, now).map((a) => `<button type="button" class="opt" data-a="apt:${a.id}"><b>${esc(String(a.name || '').split(' ')[0])} · ${esc(a.say)}</b><small>${esc(Ap.whenLabel(a, now))} · ${esc(a.kind)} · ${esc(a.status)}</small></button>`).join('');
  const mail = (S.dates && S.dates.inbox || []).slice(0, 3).map((m) => `<div class="res">${esc(m.from)}: ${esc(m.text)}</div>`).join('');
  const hours = S.plan.map((b, i) => `<button type="button" class="h-${b}${apptHours.has(i) ? ' has-appt' : ''}" data-a="hour:${i}">${String(i).padStart(2, '0')}<br>${BLOCK_NAME[b]}</button>`).join('');
  const paints = Object.keys(BLOCK_NAME).map(b => `<button type="button" class="btn ${paint === b ? 'gold' : ''}" data-a="paint:${b}">${BLOCK_NAME[b]}</button>`).join('');
  modal(head('Calendar', 'Twenty-four hours. Paint the day. The clock follows it.') + examBanner() +
    (appts ? `<div class="hdr">Appointments</div><div class="opts one">${appts}</div>` : '') + mail +
    `<div class="paints">${paints}</div><div class="hours">${hours}</div><div class="res">${esc(studyLine())}</div>` +
    `<div class="opts">${opt('preset:student', 'Student day', 'Sleep, study, gym, roam', '')}${opt('preset:office', 'Work day', 'Sleep and a long shift', '')}${opt('preset:split', 'Split day', 'Study and work share the day', '')}</div>` +
    `<div class="opts one">${opt('missions', 'Missions', 'The path from a first step to Monopoly King', '')}${opt('roamlist', 'Use a roam hour', 'The small things, while you are out', '')}</div>`);
}
function openMe() { const nw = L.netWorth(S); if (S.bank == null) S.bank = 0; L.ensureLife(S); cur = { place: 'me', r: cur && cur.r };
  const held = (S.land && S.land.own.length) || 0, letN = (S.land && S.land.let.length) || 0, ti = Ms.titleOf(nw, held, S);
  modal(head('👤 ' + esc(S.name), `${L.ageWords(S)} · ${S.country} · ${ti.name} · ${S.job ? S.job.name : 'no job'} · ${S.school ? S.school.id : 'not enrolled'}`) + careerHtml() +
    `<div class="hdr">Title</div><b>${esc(ti.name)}</b> <small>${esc(ti.next)}</small>` +
    `<div class="hdr">Land</div><b>${held} lots${letN ? ', ' + letN + ' let' : ''}</b> <small>${S.birth === 'spoon' ? 'Born with a silver spoon' : S.birth === 'poor' ? 'Born poor' : 'Family land waits'}</small>` +
    `<div class="hdr">Pocket</div><b>${mon(S.cash)}</b><div class="hdr">Bank</div><b>${mon(S.bank)}</b> <small>${L.bankRates(S).sav}% savings · interest this year ${mon(S.interest || 0)}${S.fds.length ? ' · ' + S.fds.length + ' fixed deposit' + (S.fds.length === 1 ? '' : 's') : ''}</small><div class="hdr">Record</div><b>${Math.round(S.grades || 0)}</b> <small>${S.school && typeof S.school.last === 'number' ? 'Last exam ' + S.school.last + (S.school.last >= L.EXAM_PASS ? ', pass. ' : ', fail. ') : ''}${S.interview ? 'Interview waiting: ' + esc(S.interview.name) : 'No interview booked'}</small><div class="hdr">Net worth</div><b>${mon(nw)}</b>` + BARS.map(([k, ic, nm, c]) => `<div class="hdr">${nm}</div>${barHtml(ic, S[k], c)}`).join('') +
    `<div class="opts one" style="margin-top:14px">${opt('mature', 'Mature romance', S.matureRomance ? 'On (18+ only). Explicit chat after your character turns 21. Scenes fade to black.' : 'Off. Kiss and kneel stay off until you turn this on.', S.matureRomance ? 'on' : 'off')}</div>` +
    (ctl ? ctl.meHtml() : '') +
    `<div class="opts one">${opt('newlife', 'Start a new life', 'Erases this character', '')}</div>`); }
function say(r) { if (!r) return; toast(r.msg); }

// ---------- map (tap a place, land at the door) and giving cash ----------
function mapRows() {
  const rows = [['college', 'College', '🎓', '#1f2d4a'], ['itcollege', 'IT College', '💻', '#1f3b6e'], ['work', 'Job', '💼', '#1e4d86'], ['itco', 'Northline', '🖥', '#2f6b8a'], ['bank', 'Bank', '🏦', '#14324d'], ['exchange', 'Exchange', '📈', '#102018'], ['casino', 'Casino', '♠', '#6b1d2a'], ['business', 'Shop', '🏪', '#c47b2b'], ['uni', 'AIT, Thailand', '🏛', '#2a1a10'], ['dorm', 'Dorms', 'ST', '#3b2a20'], ['school', 'School', '🏫', '#1f2d4a'], ['class', 'Class', 'CL', '#1f3b6e'], ['som', 'SOM', 'SOM', '#1f4d3a'], ['serd', 'SERD', 'SERD', '#3d6b4f'], ['set', 'SET', 'SET', '#1f3b6e'], ['canteen', 'Canteen', '🍽', '#8a2a1f'], ['library', 'Library', '📚', '#2e2e3a'], ['conference', 'AITCC', 'CC', '#14324d']];
  if (world && world.places.some(p => p.id === 'home')) { const hood = S && S.hh && S.hh.home && L.BIRTH.hoods[S.hh.home.hood]; rows.push(['home', hood ? 'Home · ' + hood.name : 'Home', '🏠', '#8a4b32']); }
  if (world && world.homes) for (const h of world.homes.labels) rows.push(['hood-' + h.id, h.name, '🏘', '#6a5a42']);
  if (world && world.places.some(p => p.id === 'hospital')) rows.push(['hospital', 'City Hospital', '✚', '#c62828']);
  if (world && world.places.some(p => p.id === 'dealer')) rows.push(['dealer', 'Sansar Motors', '🚗', '#3a6ea5']);
  rows.push(['bazaar', 'Old Bazaar', '☸', '#c4553a']);
  rows.push(['fields', 'Fields', '🌿', '#6a8f4a']);
  return rows;
}
function placeById(id) {
  if (!world) return null;
  return (world.places || []).find(q => q.id === id) || null;
}
function inCampus(x, z) {
  const box = world && world.campus && world.campus.box;
  return !!(box && x >= box.x0 && x <= box.x1 && z >= box.z0 && z <= box.z1);
}
function landAt(x, z, face) {
  realm = inCampus(x, z) ? 'ait' : 'town'; P.sit = null; P.vx = P.vz = 0;
  P.x = x; P.z = z; foc.x = x; foc.z = z;
  if (face != null) { P.ry = face; yaw = face + Math.PI; }
}
let mapOn = false, mapRAF = 0, live = null, giftWait = null, payTo = null;
function funds() { return S ? Math.max(0, S.cash || 0) + Math.max(0, S.bank || 0) : 0; }
function spendAll(amt) {   // pocket first, then the bank; all or nothing
  if (!S || funds() < amt) return false;
  const c = Math.min(Math.max(0, S.cash || 0), amt); S.cash -= c; S.bank = (S.bank || 0) - (amt - c); return true;
}
function openPay(title, fn) {
  const all = Math.floor(funds());
  if (!S) return; if (all < 1) { toast('You have nothing to give.'); return; }
  const cuts = [100, 500, 2000, Math.max(1, Math.floor(all / 2)), all].filter((v, i, a) => v >= 1 && v <= all && a.indexOf(v) === i);
  payTo = fn;
  modal(head('Give ' + esc(title), 'Pocket and bank together: ' + mon(all)) + '<div class="opts">' + cuts.map(v => opt('pay:' + v, mon(v), v === all ? 'everything you have' : '', '')).join('') + '</div>', () => { payTo = null; });
}
function payNpc(amt) {
  const n = chat && chat.current; if (!n || !S || amt < 1 || funds() < amt) return; if (chat.busy) { toast('Wait until they finish talking.'); return; }
  spendAll(amt); Fin.book(S, 'exp', (S.partners || []).some(x => x.id === String(n.id)) ? 'partner' : 'other', amt); S.feed.unshift({ age: S.age, text: `You gave ${n.cast.name.split(' ')[0]} ${L.money(S, amt)}.` }); if (S.feed.length > 220) S.feed.length = 220;
  const fix = Ap.repairGift(S, String(n.id)); if (fix) postPromise(n.id, fix);
  hud(); saveLocal(); toast('Given.'); chat.send('Here, take this gift of ' + L.money(S, amt) + '.');
}
function payPlayer(id, name, amt) {
  if (!S || amt < 1 || funds() < amt || giftWait) return;
  giftWait = { id, name, amt }; send({ t: 'gift', to: id, amt, label: L.money(S, amt) });
}
function goPlace(id) {
  if (id === 'fields') {
    const hw = world && world.highway;
    landAt(0, hw ? hw.mid : -99); closeMap();
    toast('The fields. The road north is the way to AIT.');
    return;
  }
  if (id === 'uni') {
    const spot = world && world.campus ? world.campus.spawn : { x: 0, z: 66 };
    landAt(spot.x, spot.z, spot.ry); closeMap();
    toast('AIT, Thailand. You are at the main gate. The road runs north to the palm island and the loop.');
    return;
  }
  const absent = { school: 'The compact campus has no school building. Your course is at SOM or SERD.', set: 'This campus has no SET building. Your course is at SOM or SERD.', library: 'No building inside this campus is named Library.', union: 'No building in the public map is named Student Union.' };
  const p = placeById(id); if (!p || !S) { if (absent[id]) toast(absent[id]); return; }
  landAt(p.approach ? p.approach.x : p.x, p.approach ? p.approach.z : p.z, p.face); closeMap();
}
function closeMap() { mapOn = false; cancelAnimationFrame(mapRAF); document.body.classList.remove('mapping'); const m = $('#map'); if (m) m.hidden = true; if (live) live.hideCard(); }
function openMap() {
  if (!world || !S || !live) return; closeModal();
  $('#map').hidden = false; mapOn = true; document.body.classList.add('mapping'); live.opened();
}
$('#bMap').onclick = openMap; $('#mapX').onclick = closeMap;
const phoneX = $('#phoneX'); if (phoneX) phoneX.onclick = () => { const el = $('#phone'); if (el) el.hidden = true; };
$('#bPay').onclick = () => { const b = $('#bPay'); if (b.dataset.id) openPay(b.dataset.nm || 'them', amt => payPlayer(b.dataset.id, b.dataset.nm || 'them', amt)); };
$('#cGive').onclick = () => { const n = chat && chat.current; if (!n || !S) return; openPay(n.cast.name.split(' ')[0], amt => payNpc(amt)); };

// ---------- missions, the exchange and the town board ----------
let boardSlides = [], boardI = 0, boardT = 0, boardPeople = [], boardBiz = [];
function spotOf(id) {
  if (!world) return null;
  if (id === 'uni' && world.campus && world.campus.spawn) return world.campus.spawn;
  return placeById(id);
}
function missionGo(place) {
  if (!S || !live) return;
  L.ensureLife(S);
  const st = Ms.current(S, L.netWorth(S));
  const id = place || (st && st.gos[0] && st.gos[0].place);
  if (!id) { toast('This one is the long road. It has no door.'); return; }
  if (id === 'lot') {
    const lot = Ms.nearestSale(world.lots, P.x, P.z);
    if (!lot) { toast('No empty plot is for sale.'); return; }
    live.setWaypoint(lot.x, lot.z, 'lot:' + lot.id);
    toast('Route set. The marker is on an empty plot.');
    return;
  }
  const p = spotOf(id); if (!p) { toast('That place is not on the map.'); return; }
  live.setWaypoint(p.x, p.z, id);
  toast('Route set.');
}
function markHot(sel) {
  if (!sel) return;
  const el = [...document.querySelectorAll('#modal [data-a]')].find((b) => b.dataset.a === sel || b.dataset.a.startsWith(sel));
  if (!el) return; el.classList.add('hot'); try { el.scrollIntoView({ block: 'center' }); } catch (e) { /* sheet not laid out yet */ }
}
function arriveAt(id) {
  if (id === 'parcel') return deliverParcel();
  toast('You have arrived.');
  if (!id || !S) return;
  if (mapOn) closeMap();
  const curId = (Ms.current(S, L.netWorth(S)) || {}).id;
  if (String(id).startsWith('lot:')) { openLot(id.slice(4)); requestAnimationFrame(() => markHot('lotbuy:')); return; }
  const hot = { college: 'course', bank: curId === 'grow' ? 'gloan' : 'dep', exchange: 'mbuy:', work: curId === 'labour' ? 'labour' : 'iv:', home: 'hsleep', business: 'biz:', uni: 'enrol:', hospital: 'heal:' }[id];
  if (!PLACE_VIEW[id]) return;
  openPlace(id);
  if (id === 'bank') { const inp = $('#bkAmt'); if (inp && !inp.value) inp.value = String(Math.max(0, Math.min(1000, Math.floor(L.usdOf(S, Math.max(0, S.cash || 0)))))); }
  requestAnimationFrame(() => markHot(hot));
}
function openMissions() {
  if (!S) return; L.ensureLife(S); Ms.ensure(S); S.ms.hide = 0;
  const nw = L.netWorth(S), ti = Ms.titleOf(nw, (S.land && S.land.own.length) || 0, S);
  const adv = Fin.nextAdvice(S);
  const advHtml = adv ? `<div class="ms-row now"><b>💡 ${esc(adv.title)}</b><small>${esc(adv.text)}</small><div class="opts">${(ADVICE_GO[adv.id] || []).map(([k, t, s]) => opt(k, t, s, '')).join('')}</div></div>` : '';
  const rows = Ms.list(S, nw).map((st) => {
    const gos = (st.gos || []).map((g) => opt('mgo:' + g.place, 'Go · ' + g.label, st.line, st.current ? 'now' : '')).join('');
    return `<div class="ms-row${st.done ? ' done' : ''}${st.current ? ' now' : ''}"><b>${st.done ? '✓' : '○'} ${esc(st.title)}</b><small>${esc(st.line)}</small>${st.done ? `<small>${esc(st.advice)}</small>` : ''}${gos ? `<div class="opts">${gos}</div>` : ''}</div>`;
  }).join('');
  const board = (lastRows || []).slice(0, 5).map((r, i) => `<div class="fdue"><span>${i + 1}. ${esc(r.name)}${r.ai ? ' · resident' : ''}</span><b>${mon(r.nw)}</b></div>`).join('');
  modal(head('Missions', esc(ti.name) + ' · ' + esc(ti.next)) + advHtml + rows + (board ? '<div class="hdr">Richest in Sansar</div>' + board : ''));
  paintMission();
}
let lastRows = [];
function yourBiz() {
  const out = []; if (!S) return out;
  const hood = S.hh && S.hh.home && S.hh.home.hood;
  if (S.biz && S.biz.name) out.push({ name: S.biz.name, district: hood || 'town', place: 'business' });
  const hb = S.hh && S.hh.biz;
  if (hb && hb.state === 'open' && hb.owner === 'you' && hb.name) out.push({ name: hb.name, district: hood || 'town', place: 'home' });
  return out;
}
function applySlide() {
  const sl = boardSlides[boardI]; if (!sl) return;
  if (world && world.boards) world.boards.setText(sl.text);
  const tk = $('#ticker'); if (!tk) return;
  tk.hidden = false; tk.textContent = sl.text;
  tk.dataset.kind = sl.kind || ''; tk.dataset.place = sl.place || '';
  tk.dataset.x = sl.x != null ? String(sl.x) : ''; tk.dataset.z = sl.z != null ? String(sl.z) : '';
}
function pullBoard() {
  if (!S || !world) return;
  const shopAt = placeById('business'), homeAt = placeById('home');
  const pack = Ms.slides({ people: boardPeople, biz: boardBiz, lots: world.lots, you: { name: S.name, nw: L.netWorth(S), props: (S.land && S.land.own.length) || 0, let: (S.land && S.land.let.length) || 0, biz: yourBiz() }, mature: !!(S.matureRomance && S.age >= 21), shopAt, homeAt, s: S });
  lastRows = pack.rows; boardSlides = pack.slides.length ? pack.slides : boardSlides;
  const note = S.career && S.career.notice;
  if (note && note.text) { boardSlides.unshift({ kind: 'job', text: note.text, place: note.place || 'work' }); boardI = 0; }
  if (boardI >= boardSlides.length) boardI = 0;
  applySlide();
  paintRichest(true);
}
let faceKey = '', faceBusy = false, faceTries = 0;
const portrait = new THREE.Scene();
portrait.add(new THREE.HemisphereLight(0xfff4e8, 0x6a5348, 1.35));
const faceKeyLight = new THREE.DirectionalLight(0xffffff, 2.2); faceKeyLight.position.set(0.45, 1.4, 1.6); portrait.add(faceKeyLight);
const faceCam = new THREE.PerspectiveCamera(30, 1, 0.04, 8);
const faceRT = new THREE.WebGLRenderTarget(256, 256);
const faceHead = new THREE.Vector3();
async function shootFace(av) {
  await av.built;
  if (av.update) av.update(0.05, 0, false);
  const home = av.root.parent, lp = av.root.position.clone(), lr = av.root.rotation.clone(), vis = av.root.visible;
  av.root.visible = true; portrait.add(av.root); av.root.position.set(0, 0, 0); av.root.rotation.set(0, 0, 0); av.root.updateMatrixWorld(true);
  const head = av.bones && av.bones.Head;
  if (head) head.getWorldPosition(faceHead); else faceHead.set(0, 1.55, 0);
  faceCam.position.set(faceHead.x, faceHead.y + 0.02, faceHead.z + 0.58);
  faceCam.lookAt(faceHead.x, faceHead.y, faceHead.z);
  const prev = renderer.getRenderTarget(), tm = renderer.toneMapping, clear = renderer.autoClear, clearCol = new THREE.Color();
  renderer.getClearColor(clearCol); const clearA = renderer.getClearAlpha();
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = true; renderer.setClearColor(0x241810, 1);
  renderer.setRenderTarget(faceRT); renderer.render(portrait, faceCam); renderer.setRenderTarget(prev);
  renderer.toneMapping = tm; renderer.autoClear = clear; renderer.setClearColor(clearCol, clearA);
  if (home) home.add(av.root); else portrait.remove(av.root);
  av.root.position.copy(lp); av.root.rotation.copy(lr); av.root.visible = vis; av.root.updateMatrixWorld(true);
  const buf = new Uint8Array(256 * 256 * 4);
  renderer.readRenderTargetPixels(faceRT, 0, 0, 256, 256, buf);
  let peak = 1;
  for (let i = 0; i < buf.length; i += 4) peak = Math.max(peak, buf[i], buf[i + 1], buf[i + 2]);
  const gain = Math.min(5.5, 235 / peak);
  if (gain > 1.05) for (let i = 0; i < buf.length; i += 4) { buf[i] = Math.min(255, buf[i] * gain); buf[i + 1] = Math.min(255, buf[i + 1] * gain); buf[i + 2] = Math.min(255, buf[i + 2] * gain); }
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
  const img = cv.getContext('2d').createImageData(256, 256);
  for (let y = 0; y < 256; y++) img.data.set(buf.subarray((255 - y) * 1024, (255 - y) * 1024 + 1024), y * 1024);
  cv.getContext('2d').putImageData(img, 0, 0);
  cv._buf = buf; return cv;
}
async function paintRichest(shoot) {
  if (!world || !world.rich || !S) return;
  const rich = lastRows[0] || null;
  const tips = boardSlides.filter((s) => s && s.text && s.kind !== 'rich').map((s) => s.text);
  world.rich.set({
    name: rich ? rich.name : 'Sansar',
    worth: rich ? L.money(S, rich.nw) : '',
    top: lastRows.slice(0, 3).map((r) => ({ name: r.name, worth: L.money(S, r.nw) })),
    tips
  });
  if (!rich || faceBusy) return;
  if (!shoot && window.__faceReady) return;
  const key = (rich.id || '') + ':' + rich.name;
  if (key === faceKey && window.__faceReady) return;
  faceBusy = true;
  let temp = null;
  try {
    let av = null;
    if (me && me.av && S.name === rich.name) av = me.av;
    else {
      const look = rich.look || Av.npcLook({ id: rich.name, gender: rich.look && rich.look.g === 'f' ? 'woman' : 'man', age: 40 });
      temp = Av.createAvatar(Av.fixLook(look), { castShadow: false });
      temp.root.visible = false; scene.add(temp.root); av = temp;
    }
    const img = await shootFace(av);
    const buf = img._buf, mid = buf[(128 * 256 + 128) * 4] + buf[(128 * 256 + 128) * 4 + 1], edge = buf[8 * 4] + buf[8 * 4 + 1];
    window.__faceDbg = { mid, edge, d: Math.abs(mid - edge), key };
    if (img && Math.abs(mid - edge) > 12) { faceKey = key; world.rich.setFace(img); window.__faceReady = true; faceTries = 0; }
    else if (faceTries < 8) { faceTries++; setTimeout(() => paintRichest(true), 400); }
  } catch (e) { window.__faceDbg = { err: String(e).slice(0, 180) }; if (faceTries < 8) { faceTries++; setTimeout(() => paintRichest(true), 400); } }
  if (temp) { scene.remove(temp.root); }
  faceBusy = false;
}
async function fetchBoard() {
  try {
    const j = await fetch('/api/board').then((r) => r.json());
    boardPeople = j.people || []; boardBiz = j.biz || [];
  } catch (e) { /* the town board still runs on the lots in this world */ }
  pullBoard();
}
function missionSync() {
  if (!S) return;
  const day = worldDay();
  const div = Mkt.settle(S, day);
  if (div > 0) toast('Dividends ' + L.money(S, div) + ' reached the bank.');
  const got = Ms.sync(S, L.netWorth(S));
  if (got.length) { toast(got[0].advice); showYear(got.map((g) => g.title + '. ' + g.advice)); saveLocal(); }
  paintMission();
}
const tickerEl = $('#ticker');
if (tickerEl) tickerEl.addEventListener('click', () => {
  if (!live) return;
  if (tickerEl.dataset.kind === 'job') {
    const id = tickerEl.dataset.place || 'work', p = placeById(id);
    if (!p) return;
    live.setWaypoint(p.approach ? p.approach.x : p.x, p.approach ? p.approach.z : p.z, id);
    toast('Route set.');
    return;
  }
  if (tickerEl.dataset.kind !== 'biz') return;
  const x = +tickerEl.dataset.x, z = +tickerEl.dataset.z;
  if (!Number.isFinite(x) || !Number.isFinite(z)) return;
  live.setWaypoint(x, z, tickerEl.dataset.place || 'business');
  toast('Route set.');
});

// ---------- clicks ----------
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b || b.disabled) return; const [a, p, q] = b.dataset.a.split(':'); let r;
  if (a === 'close') return closeModal();
  if (a === 'msgo') { if (b.dataset.place === 'parcel') return parcelJump(); if (b.dataset.appt) return apptRoute(b.dataset.appt); return missionGo(b.dataset.place || ''); }
  if (a === 'hpgo') { closeModal(); return missionGo('hospital'); }
  if (a === 'apt') return apptRoute(p);
  if (a === 'mgo') return missionGo(p);
  if (a === 'mshide') { if (S) { Ms.ensure(S); S.ms.hide = 1; saveLocal(); paintMission(); } return; }
  if (a === 'missions') return openMissions();
  if (a === 'mature') { if (!S) return; if (!S.matureRomance && !confirm('Mature romance contains explicit sexual chat between adult characters. Confirm you are 18 or older in real life.')) return; S.matureRomance = !S.matureRomance; if (!S.matureRomance) delete S.matureRomance; saveLocal(); openMe(); return; }
  if (a === 'pay') { const amt = +p, fn = payTo; payTo = null; closeModal(); if (fn && S && amt > 0 && funds() >= amt) fn(amt); return; }
  if (a === 'talk') return talk(p);
  if (a === 'folk') return seekPerson(p);
  if (a === 'player') return openPlayer(p);
  if (a === 'psay') return sendSay();
  if (a === 'pdm') return sendDm(p);
  if (a === 'pfriend') return social.ask(p, 'friend');
  if (a === 'pdate') return social.ask(p, 'date');
  if (a === 'pmarry') return social.ask(p, 'marry');
  if (a === 'ptrade') return social.deal('trade', p);
  if (a === 'plend') return social.deal('lend', p);
  if (a === 'pbiz') return social.deal('biz', p);
  if (a === 'prepay') return social.repay(p);
  if (a === 'pblock') return social.block(p, 1);
  if (a === 'punblock') return social.block(p, 0);
  if (a === 'pmute') return social.mute(p, 1);
  if (a === 'punmute') return social.mute(p, 0);
  if (a === 'preport') return social.report(p);
  if (a === 'newlife') { localStorage.removeItem(STORE); S = null; location.href = '/world/create'; return; }
  if (a === 'again') { closeModal(); startScreen(); return; }
  if (a === 'act') { r = L.activity(S, p); if (p === 'gig' && r && r.ok) Ms.note(S, 'labour'); missionSync(); hud(); saveLocal(); $('#actres').innerHTML = resBox(r); toast(r.msg); return; }
  if (a === 'choice') { const o = pending.opts[+p]; const fx = L.resolveChoice(S, o); pending = null; modalOpen = false; $('#layer').hidden = true; $('#modal').innerHTML = ''; toast(o.res); showYear([o.res]); hud(); saveLocal(); return; }
  if (a === 'cgo') {
    closeModal();
    const spot = placeById(p);
    if (spot && live) { live.setWaypoint(spot.approach ? spot.approach.x : spot.x, spot.approach ? spot.approach.z : spot.z, p); toast('Route set.'); }
    else { goPlace(p); toast('Route set.'); }
    return;
  }
  if (a === 'ipromo') r = L.applyInternal(S);
  if (a === 'xpromo') r = L.applyCross(S, p);
  if (a === 'hour') { const pr = L.paintBlock(S, +p, paint); if (!pr.ok) toast(pr.msg); saveLocal(); openCalendar(); return; }
  if (a === 'paint') { paint = p; openCalendar(); return; }
  if (a === 'preset') {
    const fn = PRESET[p]; if (!fn) return;
    L.ensureLife(S);
    if (p === 'student' && S.job && S.job.pay === 'month') { toast('A monthly wage is nine to five. A full study day does not fit. Take hourly work if you are studying.'); return; }
    S.plan = Array.from({ length: 24 }, (_, i) => fn(i));
    if (S.job && S.job.pay === 'month') L.lockFullTime(S);
    saveLocal(); openCalendar(); return;
  }
  if (a === 'roamlist') return openActivities();
  if (a === 'gohosp' || a === 'amb') { closeModal(); return goHospital(a === 'amb'); }
  if (a === 'heal') {
    if (p === 'private' || p === 'public' || p === 'loan' || p === 'checkup' || p === 'checkpub') return fadeThen(() => { cur.r = Hosp.treat(S, clockNow(), p, L.K(S), mon); toast(cur.r.msg); showYear([cur.r.msg]); refresh(); });
    r = Hosp.treat(S, clockNow(), p, L.K(S), mon); toast(r.msg);
  }
  if (a === 'course') r = L.enrolYear(S); else if (a === 'hire') r = L.bookInterview(S, 'jr-accounts', 'hour');
  else if (a === 'iv') r = L.bookInterview(S, q || p, p === 'go' ? 'hour' : p); else if (a === 'biz') r = L.openBusiness(S, p);
  else if (a === 'dep' || a === 'wd') { r = L.bankMove(S, a === 'dep' ? 'in' : 'out', +(($('#bkAmt') && $('#bkAmt').value) || 0)); if (r && r.ok && a === 'dep') Ms.note(S, 'deposited'); }
  else if (a === 'mbuy') r = Mkt.buy(S, p, 1, worldDay());
  else if (a === 'msell') r = Mkt.sell(S, p, 1, worldDay());
  else if (a === 'msellco') { const n = (S.folio && S.folio.sh && S.folio.sh[p]) || 0; if (!n) r = { ok: false, msg: 'You hold none of that company.', fx: [] }; else if (!confirm('Sell all ' + n + ' shares?')) return; else r = Mkt.sellAll(S, p, worldDay()); }
  else if (a === 'msellport') { if (!confirm('Sell the entire portfolio? This books the realised gain or loss.')) return; r = Mkt.sellPortfolio(S, worldDay()); }
  else if (a === 'gloan') r = Ms.growLoan(S);
  else if (a === 'labour') r = Ms.dayLabour(S);
  else if (a === 'enrol') r = L.enrol(S, p); else if (a === 'study') r = L.studyHard(S); else if (a === 'dropout') r = L.dropOut(S);
  else if (a === 'apply') r = L.applyJob(S, p); else if (a === 'shift') r = L.workShift(S); else if (a === 'quit') r = L.quitJob(S);
  else if (a === 'eat') r = L.eat(S, p); else if (a === 'gym') r = L.workout(S, p); else if (a === 'rest') r = L.homeRest(S);
  else if (a === 'classsit') r = L.classSit(S);
  else if (a === 'exam' || a === 'eyear' || a === 'eretake') { closeModal(); openYearExam(); return; }
  else if (a === 'epick') {
    examPicks[+p] = +q; saveLocal();
    const box = b.parentElement;
    if (box) box.querySelectorAll('.opt').forEach((el) => el.classList.toggle('gold', el === b));
    return;
  }
  else if (a === 'esubmit') {
    if (!S || !S.school || !S.school.paper) return;
    if (examPicks.length < 10 || examPicks.some((n) => n == null || n < 0)) { toast('Answer all ten.'); return; }
    examResult(L.submitExam(S, examPicks));
    return;
  }
  else if (a === 'dormrest') r = L.dormRest(S);
  else if (a === 'fam') r = L.family(S, p, q);
  else if (a === 'kin') r = kinTalk(+p, q);
  else if (a === 'buycar') { closeModal(); return goPlace('dealer'); }
  else if (a === 'fin') return openFinances();
  else if (a === 'advgo') { closeModal(); if (p === 'gym') goPlace('gym'); else if (p === 'cal') openCalendar(); else openFinances(); return; }
  else if (a === 'gymjoin') r = Fin.joinGym(S); else if (a === 'gymleave') r = Fin.leaveGym(S);
  else if (a === 'plan') r = Fin.buyIns(S, clockNow(), p); else if (a === 'plancancel') r = Fin.cancelIns(S);
  else if (a === 'vbuy' || a === 'vloan') { r = Fin.buyVehicle(S, p, q === 'used', a === 'vloan' ? 'loan' : 'cash'); if (r.ok) syncOwned(); }
  else if (a === 'vsell') { if (veh && veh.active && veh.active.id === p) { toast('Get off it first.'); return; } r = Fin.sellVehicle(S, p); if (r.ok) syncOwned(); }
  else if (a === 'vins') { const v = (S.vehicles || []).find(x => x.id === p); r = Fin.insureVehicle(S, p, !(v && v.ins)); }
  else if (a === 'loanpay') r = L.payInstalment(S, p);
  else if (a === 'hsleep') { Ms.note(S, 'bed'); doSleep(); closeModal(); missionSync(); return; }
  else if (a === 'heat') r = L.eatHome(S);
  else if (a === 'hhelp') r = L.helpShop(S);
  else if (a === 'htake') r = L.takeOverShop(S);
  else if (a === 'hstock') r = L.restockShop(S);
  else if (a === 'hcut') r = L.cutStaff(S);
  else if (a === 'hsell') r = L.sellShop(S);
  else if (a === 'hmove') { if (indoors) leaveHome(); r = L.moveHouse(S, p, q || 'rent'); if (r && r.ok && world.homes) world.homes.place(S); }
  else if (a === 'ploan') r = Fin.purposeLoan(S, p);
  else if (a === 'rentopen') { rentPull = 0; send({ t: 'rentboard' }); openPlace('rentals'); return; }
  else if (a === 'rgo') {
    const row = (S.rentBoard || []).find(u => u.id === p);
    closeModal();
    if (row && live) { live.setWaypoint(row.x, row.z, 'rentals'); toast('Route set.'); }
    return;
  }
  else if (a === 'rtake' || a === 'rbuy' || a === 'rlive' || a === 'rswitch' || a === 'rnotice') {
    const map = { rtake: 'renttake', rbuy: 'rentbuy', rlive: 'rentlive', rswitch: 'rentswitch', rnotice: 'rentnotice' };
    saveNow(); send({ t: map[a], unit: p }); return;
  }
  else if (a === 'rask') {
    const usd = +((document.getElementById('rentAsk') || {}).value || 0);
    const local = L.fromUsd(S, usd);
    if (!(local > 0)) { toast('Type a rent in dollars.'); return; }
    saveNow(); send({ t: 'rentask', unit: p, ask: local }); return;
  }
  else if (a === 'lotbuy') {
    if (ws && ws.readyState === 1) { send({ t: 'claim', lot: p }); return; }
    r = L.buyLot(S, p); if (r && r.ok) Ms.note(S, 'bought');
  }
  else if (a === 'lotoffer') {
    const amt = L.fromUsd(S, Math.round(+((document.getElementById('offAmt') && document.getElementById('offAmt').value) || 0)));
    if (amt < 1) { toast('Name a price.'); return; }
    if (funds() < amt) { toast('That is more than you have.'); return; }
    send({ t: 'offer', lot: p, amt }); toast('The offer is in.'); return;
  }
  else if (a === 'lotaccept') { send({ t: 'accept', lot: p, bidder: q }); toast('Taken.'); return; }
  else if (a === 'lotsell') { r = L.sellLot(S, p); if (r && r.ok) send({ t: 'release', lot: p }); }
  else if (a === 'lotbuild') r = L.buildHouse(S, p);
  else if (a === 'lotlet') r = L.letHouse(S, p);
  else if (a === 'lotstop') r = L.stopLet(S, p);
  else if (a === 'fdm') r = L.openFD(S, L.fromUsd(S, +(($('#bkAmt') && $('#bkAmt').value) || 0)), +p);
  else if (a === 'fdbreak') r = L.breakFD(S, +p);
  if (r && r.ok && (a === 'iv' || a === 'hire') && S.interview) { closeModal(); openJobChat(); return; }
  if (r) { cur.r = r; missionSync(); refresh(); if (cur.place === 'work' && r.ok && a === 'apply') pop('hired'); }
});
function pop() { }
let pending = null;
const stillSheet = (fn) => (...a) => { const out = fn(...a); if (modalOpen) modal.still = true; return out; };
openCalendar = stillSheet(openCalendar); openActivities = stillSheet(openActivities); openMe = stillSheet(openMe); openPeople = stillSheet(openPeople);
$('#bAct').onclick = (e) => { if (e.target.closest('.exambadge')) return openYearExam(); openCalendar(); };
$('#bFeed').onclick = (e) => { if (e.target.closest('.exambadge')) return openYearExam(); feed(); };
$('#examBar').onclick = () => openYearExam();
$('#bPeople').onclick = openPeople; $('#bMe').onclick = () => { L.ensureLife(S); openMe(); }; $('#bFin').onclick = openFinances;
$('#layer').addEventListener('pointerdown', e => { if (e.target.id === 'layer' && !pending && !deadShown) closeModal(); });
let deadShown = false;
function ageUp() {
  if (!S || modalOpen) return; if (!S.alive) return;
  if (S.yearAt >= L.YEAR_SEC) S.yearAt -= L.YEAR_SEC;
  const r = L.ageUp(S); S.vehCost = 0; if (me && me.av) me.av.set(wearAge()); hud(); showYear(r.lines); toast(L.ageLabel(S) + ': ' + (r.lines[0] || ''));
  if (world && world.paintLots) world.paintLots(S);
  if (r.dead) { deadShown = true; saveLocal(); return modal(head('☠ Game over', `${esc(S.name)} died at ${L.ageWords(S)}.`) + `<div class="res">Net worth at death: ${mon(L.netWorth(S))}<br>Degrees: ${S.deg.join(', ') || 'none'} · Job: ${S.job ? S.job.name : 'none'}</div><div class="opts one">${opt('again', 'Start a new life', '', '')}</div>`, () => { deadShown = false; }); }
  if (r.choice) { pending = r.choice; modal(`<h2>🤔 Decision</h2><div class="res" style="font-size:1.02rem">${esc(r.choice.prompt)}</div><div class="opts one">${r.choice.opts.map((o, i) => opt('choice:' + i, esc(o.label), '', '')).join('')}</div>`); }
  careerPing();
  saveLocal();
}


// ---------- input / player ----------
const keys = {};
addEventListener('keydown', e => { if (document.activeElement && document.activeElement.tagName === 'INPUT') return; keys[e.code] = true; if (e.code === 'KeyE' || e.code === 'Enter') interact(); if (e.code === 'Escape' && mapOn) closeMap(); if (e.code === 'Escape' && modalOpen && !pending) closeModal();  });
addEventListener('keyup', e => keys[e.code] = false); addEventListener('blur', () => { for (const k in keys) keys[k] = false; sprintHold = false; });
const joy = { x: 0, y: 0, id: null }; let yaw = -.46, pitch = .3, dist = 6.5, drag = null;
let joyEdge = false, joyEdgeT = 0, joySprintUntil = 0, sprintHold = false;
const jEl = $('#joy'), jk = jEl.firstElementChild;
jEl.addEventListener('pointerdown', e => { joy.id = e.pointerId; if (!document.body.classList.contains('sheeting') && !document.body.classList.contains('chatting')) document.body.classList.add('holding'); jEl.setPointerCapture(e.pointerId); jmove(e); e.stopPropagation(); });
jEl.addEventListener('pointermove', e => { if (e.pointerId === joy.id) jmove(e); });
const jend = e => { if (e.pointerId === joy.id) { joy.id = null; document.body.classList.remove('holding'); joy.x = joy.y = 0; joyEdge = false; jk.style.transform = ''; } }; jEl.addEventListener('pointerup', jend); jEl.addEventListener('pointercancel', jend);
function jmove(e) { const r = jEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = (e.clientX - cx) / 55, dy = (e.clientY - cy) / 55; const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; } joy.x = dx; joy.y = -dy; jk.style.transform = `translate(${dx * 40}px,${dy * 40}px)`; const edge = m > .85; if (edge && !joyEdge) { const now = performance.now(); if (now - joyEdgeT < 450) joySprintUntil = now + 2000; joyEdgeT = now; } joyEdge = edge; }
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let hover = null;
function tapBoard(cx, cy) {
  if (!world || !world.boards || !camera) return false;
  const r = canvas.getBoundingClientRect(); if (!r.width || !r.height) return false;
  ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(world.boards.meshes(), false)[0]; if (!hit) return false;
  const sl = boardSlides[boardI];
  if (sl && sl.kind === 'biz' && live && Number.isFinite(sl.x)) { live.setWaypoint(sl.x, sl.z, sl.place || 'business'); toast('Route set.'); }
  else if (sl && sl.kind === 'job' && live) {
    const p = placeById(sl.place || 'work');
    if (p) live.setWaypoint(p.approach ? p.approach.x : p.x, p.approach ? p.approach.z : p.z, sl.place || 'work');
    toast('Route set.');
  }
  else if (sl) toast(sl.text);
  return true;
}
function pickNpc(cx, cy) {
  if (!crowd && !campus.length) return null; const r = canvas.getBoundingClientRect(); if (!r.width || !r.height) return null;
  ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
  const live = allFolk(); const objs = [];
  for (const p of live) { objs.push(p.proxy, p.label); if (p.av.mesh) objs.push(p.av.mesh); }
  const hit = ray.intersectObjects(objs, true)[0];
  if (hit) { let o = hit.object; while (o && !o.userData.npc) o = o.parent; if (o) return live.find(p => p.id === o.userData.npc) || null; }
  let best = null, bd = touch ? 64 : 36;
  for (const p of live) { const v = new THREE.Vector3(p.pos.x, 1.45, p.pos.z).project(camera); if (v.z > 1) continue; const sx = (v.x * .5 + .5) * r.width + r.left, sy = (-v.y * .5 + .5) * r.height + r.top, d = Math.hypot(sx - cx, sy - cy); if (d < bd) { bd = d; best = p; } }
  return best;
}
// look: drag (touch or mouse, left or right button), or click to lock the pointer and look with the mouse; Esc frees it
const locked = () => document.pointerLockElement === canvas, pinch = new Map(); let pinchD = 0;
const PMIN = -35 * Math.PI / 180, PMAX = 60 * Math.PI / 180;
const lookBy = (dx, dy, k) => { const s = ctl ? ctl.sens : 1, inv = ctl && ctl.invY ? -1 : 1; yaw -= dx * k * s; pitch = Math.max(PMIN, Math.min(PMAX, pitch + dy * k * .8 * s * inv)); lookT = 0; };
function pickPlayer(cx, cy) {
  const r = canvas.getBoundingClientRect(); if (!r.width || !r.height) return null;
  let best = null, bd = touch ? 64 : 36;
  for (const [id, o] of others) {
    if (String(id).endsWith('_pending') || !o.root) continue;
    const v = new THREE.Vector3(o.root.position.x, 1.5, o.root.position.z).project(camera);
    if (v.z > 1) continue;
    const sx = (v.x * .5 + .5) * r.width + r.left, sy = (-v.y * .5 + .5) * r.height + r.top, d = Math.hypot(sx - cx, sy - cy);
    if (d < bd) { bd = d; best = id; }
  }
  return best;
}
function tryTalk(cx, cy) { const p = pickNpc(cx, cy); if (!p) return false; if (Math.hypot(p.pos.x - P.x, p.pos.z - P.z) > 14) toast(`Walk a little closer to ${p.cast.name.split(' ')[0]}`); else { if (locked()) document.exitPointerLock(); talk(p.id); } return true; }
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch') { pinch.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pinch.size === 2) { const [a, b] = [...pinch.values()]; pinchD = Math.hypot(a.x - b.x, a.y - b.y); drag = null; return; } if (e.clientX < innerWidth * 0.46) return; }
  if (e.pointerType === 'mouse' && locked()) { if (e.button === 0 && S && !modalOpen && !(chat && chat.current)) { const r = canvas.getBoundingClientRect(); tryTalk(r.left + r.width / 2, r.top + r.height / 2); } return; }
  if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2) return;
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), btn: e.button }; try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
});
let hoverT = 0;
canvas.addEventListener('pointermove', e => {
  if (e.pointerType === 'touch' && pinch.has(e.pointerId)) { pinch.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pinch.size === 2) { const [a, b] = [...pinch.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinchD > 0 && d > 0) dist = Math.max(3, Math.min(14, dist * pinchD / d)); pinchD = d; return; } }
  if (drag && drag.id === e.pointerId) { lookBy(e.clientX - drag.x, e.clientY - drag.y, .005); drag.x = e.clientX; drag.y = e.clientY; }
  else if (e.pointerType === 'mouse' && !locked() && performance.now() - hoverT > 60) { hoverT = performance.now(); hover = pickNpc(e.clientX, e.clientY); canvas.classList.toggle('hov', !!hover); }
});
canvas.addEventListener('pointercancel', e => { pinch.delete(e.pointerId); if (drag && drag.id === e.pointerId) drag = null; });
canvas.addEventListener('pointerup', e => {
  pinch.delete(e.pointerId); if (pinch.size < 2) pinchD = 0;
  const d = drag; drag = null; if (d && Math.hypot(e.clientX-d.sx,e.clientY-d.sy)<14 && modalOpen && $('#layer').classList.contains('sheet') && !pending) { closeModal(); return; } if (!d || d.id !== e.pointerId) return;
  if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < (touch ? 28 : 14) && performance.now() - d.t < 700 && S && !modalOpen && !(chat && chat.current) && d.btn !== 2) {
    if (tapBoard(e.clientX, e.clientY)) return;
    const who = pickPlayer(e.clientX, e.clientY);
    if (who) { openPlayer(who); return; }
    if (!tryTalk(e.clientX, e.clientY) && e.pointerType === 'mouse' && !touch) { try { const q = canvas.requestPointerLock(); if (q && q.catch) q.catch(() => {}); } catch (err) { /* pointer lock refused */ } }
  }
});
document.addEventListener('mousemove', e => { if (locked()) lookBy(e.movementX, e.movementY, .0026); });
document.addEventListener('pointerlockchange', () => { document.body.classList.toggle('locked', locked()); if (locked()) { hover = null; canvas.classList.remove('hov'); } });
canvas.addEventListener('wheel', e => { dist = Math.max(3, Math.min(14, dist + e.deltaY * .006)); }, { passive: true });
if (touch) jEl.hidden = false;

let runOn = false, seats = [];
const P = { sit: null, x: 4, z: 20, vx: 0, vz: 0, ry: Math.PI, spd: 0 };
let near = null, indoors = false, homeSeq = 0;
function collide(x, z, skipCircles, skipPeople, rad) {
  const r = rad || .4, cols = world.colliders;
  const cb = world.casino && world.casino.box;
  const b = world.bound || { x0: -360, x1: 2400, z0: -1000, z1: 1600 };
  if (cb && x > cb.x0 - 3 && x < cb.x1 + 3 && z > cb.z0 - 3 && z < cb.z1 + 3) {
    x = Math.max(cb.x0, Math.min(cb.x1, x)); z = Math.max(cb.z0, Math.min(cb.z1, z));
  } else {
    x = Math.max(b.x0, Math.min(b.x1, x)); z = Math.max(b.z0, Math.min(b.z1, z));
  }
  for (let pass = 0; pass < 2; pass++) {
    const extras = world.lotCols || [];
    for (const c of cols.concat(extras)) {
      if (c.skip || (c.interior && !indoors)) continue;
      if (c.t === 'box') { const cx = Math.max(c.x0, Math.min(x, c.x1)), cz = Math.max(c.z0, Math.min(z, c.z1)); let dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz);
        if (d < r) { if (d < 1e-4) { x = c.x1 + r; } else { x = cx + dx / d * r; z = cz + dz / d * r; } } }
      else if (c.t === 'obb') {
        const co = Math.cos(c.ry), si = Math.sin(c.ry), dx = x - c.cx, dz = z - c.cz;
        let lx = dx * co - dz * si, lz = dx * si + dz * co;
        const nx = Math.max(-c.hw, Math.min(lx, c.hw)), nz = Math.max(-c.hd, Math.min(lz, c.hd));
        const ox = lx - nx, oz = lz - nz, d = Math.hypot(ox, oz);
        if (d < r) {
          if (d < 1e-4) { lx = c.hw + r; lz = 0; } else { lx = nx + ox / d * r; lz = nz + oz / d * r; }
          x = c.cx + lx * co + lz * si; z = c.cz - lx * si + lz * co;
        }
      }
    }
    if (!skipCircles) for (const c of world.nav.circles) { const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), m = r + c.r; if (d < m && d > 1e-4) { x = c.x + dx / d * m; z = c.z + dz / d * m; } }
    if (!skipPeople) for (const p of allFolk()) { const dx = x - p.pos.x, dz = z - p.pos.z, d = Math.hypot(dx, dz), m = r + .3; if (d < m && d > 1e-4) { x = p.pos.x + dx / d * m; z = p.pos.z + dz / d * m; } }
  }
  return [x, z];
}
// ---------- vehicles (vehicles.js): cycle, motorbike, car ----------
let ride = null, veh = null, ctl = null, vehDist = null, lookT = 9;
const VEH_NAME = { cycle: 'cycle', moto: 'motorbike', car: 'car' };
const moneyLine = (s) => L.moneyLine(s) + (s.vehCost ? ' · fuel and repairs ' + L.money(s, s.vehCost) : '') + (s.outings ? ' · outings ' + L.money(s, s.outings) : '');
// Town rides by the fountain are rentals, never yours: an unlock fee, then a rate per km (fuel included). Nepal rupees.
// Billed per km, not per hour: one game hour is under half a real second, so an hourly rate would be noise.
const RENTAL = { cycle: [50, 10, 'Bike-share'], moto: [150, 25, 'Scooter hire'], car: [800, 60, 'Car hire'] };
const rentQuote = kind => { const r = RENTAL[kind], k = Fin.kf(S); return { fee: Math.round(r[0] * k), km: Math.round(r[1] * k * 100) / 100, name: r[2] }; };
const vehRec = v => v && v.owned && S ? (S.vehicles || []).find(r => r.id === v.id) || null : null;
function payLine(amt, line) {   // pocket first, then the bank; booked on a Finances line. Returns what was paid.
  amt = Math.round(amt); if (!S || !(amt > 0)) return 0;
  const have = Math.max(0, S.cash || 0) + Math.max(0, S.bank || 0), paid = Math.min(have, amt), c = Math.min(Math.max(0, S.cash || 0), paid);
  S.cash -= c; S.bank = (S.bank || 0) - (paid - c); Fin.book(S, 'exp', line, paid); return paid;
}
function mount(v) {
  if (P.sit) standUp(); if (!veh || !me || !S || !S.alive) return;
  if (!v.owned) {
    const q = rentQuote(v.kind);
    if ((S.cash || 0) + (S.bank || 0) < q.fee) { toast(`${q.name}: ${mon(q.fee)} to unlock. You cannot cover it.`); return; }
    if (!veh.mount(v, me, P)) return;
    payLine(q.fee, 'vehicle'); v.rentKm = v.km; toast(`${q.name}: ${mon(q.fee)} to unlock, then ${mon(q.km)} a km.`); hud();
  } else if (!veh.mount(v, me, P)) return;
  vehDist = dist; dist = v.kind === 'car' ? 6.2 : v.kind === 'moto' ? 5.2 : 4.4; lookT = 9; if (ctl) ctl.hint('ride');
}
function dismount() { if (veh) veh.dismount(); }
function vehPay(b, why, v) {   // vehicles.js calls this with base $: fuel by the km, repairs on a knock
  if (!S || !(b > 0)) return true;
  if (why === 'fuel') {
    if (v && !v.owned) return true;   // a rental's rate per km includes fuel
    const rec = vehRec(v), hh = S.hh, km = v && v.spec.fuel ? b / v.spec.fuel : 0;
    const amt = rec ? km * Fin.fuelPerKm(S, rec) : b * L.K(S);
    if (rec && rec.family && hh && hh.purse >= amt) { hh.purse -= amt; return true; }   // the family fills its own car
    if ((S.cash || 0) + (S.bank || 0) < amt) return false;
    S.vehCost = (S.vehCost || 0) + amt; finFrac(amt); return true;
  }
  const amt = b * L.K(S); if ((S.cash || 0) + (S.bank || 0) < amt) return false;
  payLine(amt, why === 'clinic' ? 'other' : 'vehicle'); S.vehCost = (S.vehCost || 0) + amt; hud(); saveLocal(); return true;
}
let fuelOwed = 0;
function finFrac(amt) { fuelOwed += amt; if (fuelOwed >= 1) { const whole = Math.floor(fuelOwed); fuelOwed -= whole; payLine(whole, 'vehicle'); } }   // fuel comes in fractions of a rupee
function homeCarSpot(i = 0) {
  const b = world && (world.buildings || []).find((q) => q.place === 'home'); if (!b || !b.door) return null;
  const n = b.n || [0, 1], nx = n[0] ?? n.x ?? 0, nz = n[1] ?? n.z ?? 1, along = 3.2 + i * 2.8, x = b.door.x + nx * 4.6 + nz * along, z = b.door.z + nz * 4.6 - nx * along;
  return { x, z, h: Math.atan2(nz, -nx) };
}
// owned and family vehicles live in S.vehicles (finance.js); keep a mesh for each one, parked where it was left
function syncOwned() {
  if (!veh || !S) return; L.ensureLife(S); const recs = S.vehicles || [];
  for (const v of veh.list.filter((q) => q.owned)) if (!recs.some((r) => r.id === v.id) && veh.active !== v) veh.remove(v);
  recs.forEach((r, i) => {
    if (veh.list.some((q) => q.owned && q.id === r.id)) return;
    if (r.x == null) { const sp = homeCarSpot(i); if (!sp) return; r.x = +sp.x.toFixed(2); r.z = +sp.z.toFixed(2); r.h = +sp.h.toFixed(3); }
    const m = Fin.MODELS[r.model];
    const v = veh.add(r.kind, r.x, r.z, r.h, { color: r.color, plate: r.plate, owned: true, id: r.id, spec: m && m.spec });
    if (v && v.mesh) window.__vehHot = Promise.resolve(window.__vehHot).then(() => renderer.compileAsync(v.mesh, camera, scene)).catch(() => {});
  });
}
function vehExit(v, crash) {
  if (vehDist != null) { dist = vehDist; vehDist = null; }
  const rec = vehRec(v);
  if (rec) { rec.x = +v.x.toFixed(2); rec.z = +v.z.toFixed(2); rec.h = +v.h.toFixed(3); }
  if (!v.owned && v.rentKm != null && S) {
    const q = rentQuote(v.kind), km = Math.max(0, v.km - v.rentKm), due = Math.round(km * q.km); v.rentKm = null;
    const paid = payLine(due, 'vehicle'); if (due > 0) toast(`${q.name}: ${km.toFixed(1)} km, ${mon(paid)}${paid < due ? ' (all you had)' : ''}.`);
  }
  if (S) { syncOwned(); hud(); saveLocal(); }
  if (!crash) toast(v.kind === 'car' ? 'Out of the car.' : 'Off the ' + VEH_NAME[v.kind] + '.');
}
function wreckCheck(v, impact) {   // a bad crash writes off an uninsured vehicle of your own
  const rec = vehRec(v); if (!rec || rec.family || impact < (v.kind === 'car' ? 22 : 16)) return;
  if (Fin.wreck(S, rec.id)) { toast(`The ${rec.name} is written off. It was not insured.`); if (veh.active === v) dismount(); }
  else if (rec.ins) toast(`Insurance pays to repair the ${rec.name}.`);
  saveLocal();
}
function vehImpact(v, impact, kind, other, off) {
  if (!S || !S.alive) return;
  if (kind === 'traffic' && v.kind !== 'car' && off) { struck({ x: other.x, z: other.z, v: impact, kind: other.kind }); return; }
  wreckCheck(v, impact);
  if (v.kind === 'car') {
    if (impact > 6 && !(vehRec(v) && vehRec(v).ins)) { const bill = Math.round(18 + (impact - 6) * 22); if (vehPay(bill, 'repair')) toast('Dented. Repairs ' + L.money(S, bill * L.K(S)) + '.'); }
    if (impact > 14) crashHurt('car', 'You crashed the car hard.', impact);
    return;
  }
  if (off) crashHurt(v.kind, impact > 11 ? `You came off the ${VEH_NAME[v.kind]} at speed.` : `You came off the ${VEH_NAME[v.kind]}.`, impact);
}
function crashHurt(kind, text, impact) {
  if (!S || !S.alive || (S.injury && S.injury.fatal)) return;
  const sev = Hosp.severityFor(kind, impact || 0);
  S.L = Math.max(1, S.L - (sev === 'critical' ? 30 : sev === 'serious' ? 18 : 8)); Hosp.hurt(S, clockNow(), { kind: 'crash', by: VEH_NAME[kind] || kind, sev, text });
  S.feed.unshift({ age: S.age, text: S.injury.text }); if (S.feed.length > 220) S.feed.length = 220; saveLocal(); hud(); toast('Injured. You are slowed.'); showYear([Hosp.note(S, clockNow())]);
  if (S.injury.sev === 'critical') ambulanceOffer();
}
function ambulanceOffer(title = '🚑 Critical injury') {
  const q = Hosp.quote(S, clockNow(), L.K(S));
  modal(head(title, esc(Hosp.note(S, clockNow()))) + `<div class="opts one">${opt('amb', '🚑 Call an ambulance', 'Straight to City Hospital emergency · ' + mon(q.amb) + ' · waived if you cannot pay', 'fast')}${opt('close', 'Not now', 'Health keeps dropping until you are treated', '')}</div>`);
}
function fadeThen(fn) {
  const f = $('#fade'); if (!f) { fn(); return; }
  f.classList.add('on'); setTimeout(() => { try { fn(); } finally { setTimeout(() => f.classList.remove('on'), 250); } }, 650);
}
function goHospital(amb) {
  if (!S) return; const p = placeById('hospital');
  const go = () => fadeThen(() => {
    let paid = 0; if (amb) paid = Hosp.pay(S, Hosp.quote(S, clockNow(), L.K(S)).amb, true);
    if (p) landAt(p.approach ? p.approach.x : p.x, p.approach ? p.approach.z : p.z, p.face);
    openPlace('hospital');
    if (amb) { cur.r = { ok: true, msg: `The ambulance brought you to the emergency entrance. Ride ${mon(paid)}.`, fx: [] }; refresh(); }
  });
  if (veh && veh.busy) { veh.dismount(); setTimeout(go, 1600); } else go();
}
function vehPed(v, p, speed) {   // the pedestrian rule, turned around: slower than 6.2 m/s hurts them, faster puts them in hospital
  if (!S || !S.alive) return; const who = p.cast ? p.cast.name.split(' ')[0] : 'someone', fast = speed >= 6.2, bill = fast ? 900 : 120;
  const text = fast ? `You hit ${who} at speed. They went to hospital and you paid the bill.` : `You knocked ${who} down. You paid for the clinic.`;
  vehPay(bill, 'clinic'); if (p.pos) { const a = Math.atan2(p.pos.x - v.x, p.pos.z - v.z); p.pos.x += Math.sin(a) * 1.2; p.pos.z += Math.cos(a) * 1.2; }
  S.feed.unshift({ age: S.age, text }); if (S.feed.length > 220) S.feed.length = 220; saveLocal(); hud(); toast(text);
}
let hiddenDoor = null;
function leaveHome() {
  if (!indoors) return;
  homeSeq++;
  indoors = false; delete P.shotFov;
  if (me) me.root.visible = true;
  if (hiddenDoor) {
    if (hiddenDoor.hide && hiddenDoor.group) hiddenDoor.group.visible = true;
    if (hiddenDoor.col) hiddenDoor.col.skip = false;
    P.x = hiddenDoor.x; P.z = hiddenDoor.z; foc.x = P.x; foc.z = P.z; P.vx = P.vz = 0;
    hiddenDoor = null;
  }
  if (world && world.interior) {
    for (const c of world.interior.cols) { const i = world.colliders.indexOf(c); if (i >= 0) world.colliders.splice(i, 1); }
    world.interior.leave();
  }
}
async function enterHome() {
  if (!S || !world || !world.homes) return null;
  L.ensureLife(S);
  if (!world.interior) { const mod = await import('./interiors.js?v=pick1'); world.interior = mod.createInteriors({ scene, look }); }
  if (indoors) leaveHome();
  const seq = ++homeSeq;
  const type = S.hh.home.type;
  const door = world.homes.doors[type] || world.homes.doors.shelter;
  if (!door) return null;
  if (door.hide && door.group) door.group.visible = false;
  if (door.col) door.col.skip = true;
  hiddenDoor = door;
  const meta = await world.interior.enter(type, { door, fam: L.familyAtHome(S, hourNow()), view: L.householdView(S), money: (v) => L.money(S, v) });
  if (seq !== homeSeq || !meta) {
    if (seq === homeSeq && hiddenDoor) {
      if (hiddenDoor.hide && hiddenDoor.group) hiddenDoor.group.visible = true;
      if (hiddenDoor.col) hiddenDoor.col.skip = false;
      hiddenDoor = null;
    }
    return null;
  }
  for (const c of meta.cols) world.colliders.push(c);
  indoors = true;
  P.x = meta.stand.x; P.z = meta.stand.z; P.vx = P.vz = 0; foc.x = P.x; foc.z = P.z;
  yaw = meta.yaw; pitch = meta.cam.pitch; dist = meta.cam.dist; lookT = 0;
  return meta;
}
function frameHome() {
  if (!world || !world.interior || !world.interior.meta) return null;
  const m = world.interior.meta;
  if (me) me.root.visible = false;
  P.x = m.stand.x; P.z = m.stand.z; foc.x = P.x; foc.z = P.z; P.vx = P.vz = 0;
  yaw = m.yaw; pitch = m.cam.pitch; dist = m.cam.dist;
  P.shotFov = innerWidth < 700 ? 74 : (m.cam.fov || 50); lookT = 99;
  camera.fov = P.shotFov; camera.updateProjectionMatrix();
  return { type: m.type, people: world.interior.spots.filter((s) => s.kind === 'talk').length };
}
function doSleep() {
  if (!S) return;
  L.sleepHome(S);
  const h = hourNow(), addH = h < 7 ? 7 - h : 24 - h + 7, sec = addH / 24 * DAY;
  clockOff += sec; if (frozen != null) frozen += sec;
  const msg = 'You sleep. It is morning.';
  S.feed.unshift({ age: S.age, text: msg }); if (S.feed.length > 220) S.feed.length = 220;
  toast(msg); hud(); saveLocal();
  if (indoors) { const back = hiddenDoor; leaveHome(); hiddenDoor = back; enterHome(); }
}
function kinView() {
  const m = S && S.hh && S.hh.family[cur.kin];
  if (!m) return head('Family', 'They stepped out.');
  const bond = m.bond == null ? 55 : m.bond;
  const nm = m.name.split(' ')[0];
  return head(esc(m.name), esc(m.rel) + ' · ' + (m.age | 0) + ' · ' + esc(m.job || 'at home')) + resBox(cur.r) +
    `<div class="res">${esc(nm)} is ${esc(m.temper || 'quiet')}.${m.earns ? ' Earns ' + mon(m.earns) + ' a month.' : ' No wage of their own.'}</div>` +
    barHtml('❤', bond, '#e46a8c') +
    `<div class="opts">${opt('kin:' + cur.kin + ':time', 'Spend time', '❤ +7 · Happiness +3', '')}${opt('kin:' + cur.kin + ':gift', 'Give a gift', mon(base(25)) + ' · ❤ +9', '')}${opt('kin:' + cur.kin + ':ask', 'Ask for money', 'Once, if you get along', '')}${opt('kin:' + cur.kin + ':argue', 'Argue', '❤ −9', '')}</div>`;
}
function kinTalk(i, act) {
  const m = S && S.hh && S.hh.family[i];
  if (!m || m.alive === false) return { ok: false, msg: 'They are not here.', fx: [] };
  if (m.bond == null) m.bond = 55;
  const nm = m.name.split(' ')[0];
  const say = (text) => { S.feed.unshift({ age: S.age, text }); if (S.feed.length > 220) S.feed.length = 220; };
  if (act === 'time') {
    if ((S.time || 0) <= 0) return { ok: false, msg: 'No free time left today.', fx: [] };
    S.time--; m.bond = Math.min(100, m.bond + 7); S.H = Math.min(100, (S.H || 0) + 3);
    say('You spent time with ' + nm + '.');
    return { ok: true, msg: nm + ' sits with you and asks how the day went.', fx: ['❤+7'] };
  }
  if (act === 'gift') {
    const c = base(25); if (!spendAll(c)) return { ok: false, msg: 'You do not have ' + mon(c) + ' for a gift.', fx: [] };
    m.bond = Math.min(100, m.bond + 9); S.H = Math.min(100, (S.H || 0) + 2);
    say('You gave ' + nm + ' a gift.');
    return { ok: true, msg: nm + ' is touched.', fx: ['-' + mon(c), '❤+9'] };
  }
  if (act === 'ask') {
    if (m.asked) return { ok: false, msg: nm + ' says you already asked.', fx: [] };
    m.asked = true;
    if (m.bond >= 50) {
      const a = base(40 + m.bond); S.cash += a; m.bond = Math.max(0, m.bond - 4);
      say(nm + ' gave you ' + mon(a) + '.');
      return { ok: true, msg: nm + ' sighs and slips you some money.', fx: ['+' + mon(a), '❤-4'] };
    }
    m.bond = Math.max(0, m.bond - 3);
    return { ok: false, msg: nm + ' says no. "Earn it first."', fx: ['❤-3'] };
  }
  if (act === 'argue') {
    m.bond = Math.max(0, m.bond - 9); S.H = Math.max(0, (S.H || 0) - 2);
    say('You argued with ' + nm + '.');
    return { ok: true, msg: 'Voices are raised. Doors slam.', fx: ['❤-9'] };
  }
  return { ok: false, msg: 'Nothing to say.', fx: [] };
}
function openKin(m) {
  if (!S || !S.hh || !m) return;
  const i = S.hh.family.indexOf(m);
  if (i < 0) return;
  cur = { place: 'kin', kin: i, r: null };
  const k = world.interior && world.interior.meta && (world.interior.meta.kin || []).find((x) => x.who === m);
  if (k && k.av && k.av.wave && !k.sit) k.av.wave();
  modal(kinView(), () => { cur.place = null; cur.kin = null; });
}
function interact() { if (modalOpen || (chat && chat.current) || !near || !S) return; if (near.act) return near.act(); if (near.rideOff) return dismount(); if (near.rideOn) return mount(near.rideOn); if (near.stand) return standUp(); if (near.seat) return sitDown(near.seat); if (near.lot) return openLot(near.lot); if (near.place === 'home') return enterHome(); if (near.place) openPlace(near.place); if (near.player) return openSay(near.player); talk(near.npc); }
$('#prompt').onclick = interact;
let runDownAt = 0;
const runBtn = $('#runBtn');
runBtn.addEventListener('pointerdown', (e) => { sprintHold = true; runDownAt = performance.now(); try { runBtn.setPointerCapture(e.pointerId); } catch (err) { /* already gone */ } e.preventDefault(); e.stopPropagation(); });
const runUp = () => { const held = performance.now() - runDownAt; sprintHold = false; if (held < 260) { runOn = !runOn; runBtn.classList.toggle('on', runOn); } };
runBtn.addEventListener('pointerup', runUp); runBtn.addEventListener('pointercancel', runUp);
runBtn.hidden = false;
// ---------- sitting: benches (world.pois.seats) and the two cafe table sets ----------
function initSeats() {
  seats = world.pois.seats.map((s) => { const h = crowd.seatHeading(s); return { x: s.x + Math.sin(h) * .22, z: s.z + Math.cos(h) * .22, h, kind: 'bench' }; });
  for (const t of world.tables || []) for (const c of [{ x: -.11, z: .56, h: Math.PI }, { x: .07, z: -.5, h: 0 }]) { const cs = Math.cos(t.ry), sn = Math.sin(t.ry); seats.push({ x: t.x + c.x * cs + c.z * sn, z: t.z - c.x * sn + c.z * cs, h: c.h + t.ry, kind: 'chair' }); }
  if (world.casino) for (const s of world.casino.seats) seats.push(s);
}
function sitDown(s) {
  P.sit = { x: s.x, z: s.z, h: s.h, kind: s.kind || '' };
  if (s.kind === 'bj' || s.kind === 'roulette' || s.kind === 'slot') { document.body.classList.add('seated'); yaw = s.h + Math.PI; pitch = 0.34; dist = 3.5; }
}
function standUp() {
  const s = P.sit; if (!s) return; P.sit = null; P.nocol = .8; P.vx = Math.sin(s.h) * 1.4; P.vz = Math.cos(s.h) * 1.4;
  document.body.classList.remove('seated'); if (world && world.casino) world.casino.onStand();
}
function struck(v) {
  const fast = v.v >= 6.2, again = !!(S.injury && S.injury.hits), who = v.kind === 'bike' ? 'motorbike' : 'car';
  P.hitCd = 1.6; const away = Math.atan2(P.x - v.x, P.z - v.z); P.x += Math.sin(away) * 1.4; P.z += Math.cos(away) * 1.4; P.vx = Math.sin(away) * 2; P.vz = Math.cos(away) * 2;
  // First 5 years (lives start at 18) a hit is never fatal; after that only a second hit or one at health < 10.
  if (S.age >= 23 && (again || S.L < 10)) {
    S.injury = { kind: 'traffic', by: who, hits: ((S.injury && S.injury.hits) || 0) + 1, fatal: true, text: again ? `A second ${who} hit you while you were hurt.` : `A ${fast ? 'fast ' : ''}${who} hit you.` };
    S.L = 0; S.alive = false; S.feed.unshift({ age: S.age, text: S.injury.text + ' You died.' }); if (S.feed.length > 220) S.feed.length = 220;
    deadShown = true; saveLocal(); hud(); showYear([S.injury.text, 'This life is over.']);
    modal(head('☠ Game over', `${esc(S.name)} was killed by a ${who} at ${L.ageWords(S)}.`) + `<div class="res">${esc(S.injury.text)}<br>Net worth at death: ${mon(L.netWorth(S))}</div><div class="opts one">${opt('again', 'Start a new life', '', '')}</div>`, () => { deadShown = false; });
    return;
  }
  S.L = Math.max(1, S.L - 28);
  Hosp.hurt(S, clockNow(), { kind: 'traffic', by: who, sev: Hosp.severityFor('traffic', v.v), text: `Hit by a moving ${who}.` });
  S.feed.unshift({ age: S.age, text: S.injury.text }); saveLocal(); hud(); ambulanceOffer(`🚑 Hit by a ${who}`); toast(`Hit by a ${who}. Get to hospital.`);
}

// ---------- townspeople ----------
let crowd = null, chat = null, ambient = null, cast = [], campus = [];
const CAMPUS_ROUTES = [
  [[14, 90], [14, 200], [32, 158], [32, 122], [14, 122]],
  [[14, 122], [-48, 122], [-48, 170], [14, 172]],
  [[-48, 108], [-48, 176], [-18, 198], [14, 204]],
  [[32, 116], [32, 158], [14, 204], [-18, 198]],
  [[52, 132], [52, 154], [32, 154], [32, 122]]
];
const CAMPUS_STILL = [[26, 116], [-14, 114], [30, 150]];
function pathAt(pts, u) {
  const q = pts.concat([pts[0]]); let len = 0; const seg = [];
  for (let i = 0; i < q.length - 1; i++) { const a = q[i], b = q[i + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]); seg.push(d); len += d; }
  let d = ((u % 1) + 1) % 1 * (len || 1);
  for (let i = 0; i < seg.length; i++) { if (d <= seg[i]) { const t = seg[i] ? d / seg[i] : 0; const a = q[i], b = q[i + 1]; return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, h: Math.atan2(b[0] - a[0], b[1] - a[1]) }; } d -= seg[i]; }
  return { x: q[0][0], z: q[0][1], h: 0 };
}
function allFolk() {
  const a = []; if (crowd) for (const p of crowd.people) if (p.root.visible) a.push(p);
  for (const p of campus) if (p.root.visible) a.push(p); return a;
}
function spawnCampus(students) {
  campus = [];
  students.forEach((c, i) => {
    const look = Av.npcLook(c), av = Av.createAvatar(look), root = new THREE.Group(), height = look.h / 100;
    root.add(av.root); root.name = c.id; root.userData.npc = c.id;
    const proxy = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, height + .2, 8), new THREE.MeshBasicMaterial({ visible: false }));
    proxy.position.y = (height + .2) / 2; proxy.userData.npc = c.id; root.add(proxy);
    const label = nameLabel(c.name.split(' ')[0], (c.job || 'student').split(' ')[0]); label.position.y = height + .45; label.userData.npc = c.id; root.add(label);
    const routes = (world && world.campus && world.campus.routes && world.campus.routes.length) ? world.campus.routes : CAMPUS_ROUTES;
    const still = i >= students.length - 3, pts = routes[i % routes.length];
    const door = world.places.find((q) => q.id === 'canteen') || world.places.find((q) => q.id === 'som');
    const spot = still ? (door ? [door.x + 6, door.z + 4] : pts[0]) : pts[0];
    const p = { id: c.id, cast: c, root, av, proxy, label, pos: { x: spot[0], z: spot[1] }, heading: 0, chat: false, mood: '', still, pts, speed: 0.85 + (i % 4) * 0.12, off: (i * 19) % 70, walkSpeed: 1.25, state: { mode: still ? 'idle' : 'walk', place: 'college' } };
    root.position.set(spot[0], PAVE_Y, spot[1]); scene.add(root); campus.push(p);
  });
}
function updateCampus(dt, t) {
  const px = P.x, pz = P.z;
  for (const p of campus) {
    if (p.lead) { stepLead(p, dt); pullPlayer(p); }
    else if (p.errand) stepErrand(p, dt);
    else {
    const away = p.follow && Math.hypot(p.pos.x - px, p.pos.z - pz) > 2.4;
    if (p.follow && (!p.chat || away)) { const f = steerFollow(p, dt); p.pos.x = f.x; p.pos.z = f.z; p.heading = f.heading; p._moving = f.moving; }
    else if (p.hold) { p.pos.x = p.hold.x; p.pos.z = p.hold.z; p._moving = false; }
    else if (!p.still && !p.chat) { const q = pathAt(p.pts, (t * p.speed + p.off) / 52); p.pos.x = q.x; p.pos.z = q.z; p.heading = q.h; p._moving = true; }
    else p._moving = false;
    if (p.chat && p.meet && !(p.follow && away)) { p.pos.x = p.meet.x; p.pos.z = p.meet.z; p.heading = Math.atan2(px - p.meet.x, pz - p.meet.z); p._moving = false; }
    }
    p.root.position.set(p.pos.x, PAVE_Y, p.pos.z);
    const d = Math.hypot(p.pos.x - px, p.pos.z - pz); p.root.visible = d < 140 || !!p.lead || !!p.errand; if (!p.root.visible) continue;
    let head = p.chat ? Math.atan2(px - p.pos.x, pz - p.pos.z) : p.heading;
    let da = head - p.root.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); p.root.rotation.y += da * Math.min(1, dt * 7);
    const walking = !!(p._moving && !p.chat);
    p.state = { mode: walking ? 'walk' : 'idle', place: 'college' };
    if (p.chat && p.mood === 'flirt' && !p.pose) p.av.lean = .16; else if (p.av.look) p.av.lean = p.av.look.ag === 3 ? .08 : 0;
    const sitPose = syncPose(p, walking);
    p.av.update(dt, walking ? p.walkSpeed : 0, sitPose); p.av.mesh.castShadow = d < 40;
    p.label.visible = d < 14 || p === hover || p.chat;
  }
}
function findPerson(id) { return (crowd && crowd.people.find(x => x.id === id)) || campus.find(x => x.id === id) || null; }
function talk(id) { const p = findPerson(id); if (!p || !p.root.visible || modalOpen || chat.current) return; chat.open(p); }
let known = {}, knownAt = 0, approachT = 0, lastApproach = 0;
function refreshKnown() {
  const pid = (S && S.pid) || myId; if (!pid) return;
  fetch('/api/npc/circle?pid=' + encodeURIComponent(pid) + '&hour=' + Math.floor(hourNow())).then(r => r.json()).then(j => {
    const next = {}; for (const row of (j.people || [])) next[row.id] = row; known = next; knownAt = performance.now();
    if (S && Fin.syncPartners(S, j.people || [])) saveLocal();
  }).catch(() => {});
}
function openPeople() {
  if (!S) return; cur = { place: 'people', r: null };
  modal(head('People', 'Who you have met, and who already likes you.'));
  const pid = S.pid || myId;
  fetch('/api/npc/circle?pid=' + encodeURIComponent(pid) + '&hour=' + Math.floor(hourNow())).then(r => r.json()).then(j => {
    if (!modalOpen || cur.place !== 'people') return;
    const people = j.people || []; known = {}; for (const row of people) known[row.id] = row; knownAt = performance.now();
    if (Fin.syncPartners(S, people)) saveLocal();
    const town = social.peopleHtml();
    if (!people.length) { modal(head('People', 'Nobody yet.') + '<div class="res">Talk to someone out in the world. If they take to you, they stay here, and they may come and find you.</div>' + town); return; }
    const rows = people.map(p => opt('folk:' + p.id, esc(p.name), `${esc(p.label)} ${p.aff > 0 ? '+' : ''}${p.aff} · ${esc(p.personality || p.job || '')}. ${esc(p.where)}. ${esc(p.hours)}${p.memory ? '. Remembers: ' + esc(p.memory) : ''}`, p.out ? 'Talk' : 'Away')).join('');
    modal(head('People', 'Tap a name to stand with them. They keep their own hours. If they like you, they may start the talk, and your looks change how often.') + '<div class="opts one">' + rows + '</div>' + town);
  }).catch(() => { if (modalOpen) modal(head('People', 'The list did not load.') + '<div class="res">Try again in a moment.</div>' + social.peopleHtml()); });
}
function openPlayer(id) {
  if (!S || !id) return;
  const o = others.get(id);
  const near = !!(o && o.root && Math.hypot(P.x - o.root.position.x, P.z - o.root.position.z) < 20);
  cur = { place: 'player', r: null };
  modal(social.sheet(id, near));
}
function blockedSpot(x, z) {
  if (!world) return false;
  if (insideWall(x, 1.1, z)) return true;
  const [nx, nz] = collide(x, z, false, true, 0.45);
  return Math.hypot(nx - x, nz - z) > 0.55;
}
function nearestOutdoor(x, z, face) {
  const base = face || 0;
  for (let rad = 2.2; rad <= 16; rad += 1.2) {
    for (let i = 0; i < 16; i++) {
      const a = base + i / 16 * Math.PI * 2, px = x + Math.sin(a) * rad, pz = z + Math.cos(a) * rad;
      if (!blockedSpot(px, pz)) return { x: px, z: pz };
    }
  }
  const [nx, nz] = collide(x, z, true, true, 0.45);
  return { x: nx, z: nz };
}
function goToPlayer(id, name) {
  const who = name || 'They';
  const o = others.get(id);
  if (!o || !o.root || String(id).endsWith('_pending')) { toast(who + ' just left'); return; }
  if (veh && veh.abort) veh.abort();
  if (indoors) leaveHome();
  if (P.sit) standUp();
  const x = +o.tx, z = +o.tz, r = +o.try || 0;
  let sx = x + Math.sin(r) * 2, sz = z + Math.cos(r) * 2;
  if (o.veh || o.ind || blockedSpot(x, z) || blockedSpot(sx, sz)) {
    const p = nearestOutdoor(x, z, r);
    sx = p.x; sz = p.z;
  }
  [sx, sz] = collide(sx, sz, false, true, 0.45);
  if (insideWall(sx, 1.1, sz)) { const p = nearestOutdoor(x, z, r); sx = p.x; sz = p.z; }
  const face = Math.atan2(x - sx, z - sz);
  landAt(sx, sz, face);
  pitch = Math.max(PMIN, Math.min(PMAX, 0.28)); dist = 6.2; lookT = 9;
  openPlayer(id);
}
function openSay(id) {
  if (!S) return;
  const o = others.get(id), name = (o && o.name) || 'them';
  cur = { place: null, r: null };
  modal(head('Talk to ' + esc(name), 'People within 20 m see a bubble over your head.') +
    '<input id="sayIn" maxlength="180" placeholder="Say something" style="width:100%;padding:11px;border-radius:10px;border:1px solid #fff4;background:#2a1a10;color:#fff4dc;font-size:1rem">' +
    '<div class="opts one">' + opt('psay', 'Say it', 'Out loud, nearby.', '') + opt('player:' + id, 'Message instead', 'A private note, even if they walk off.', '') + '</div>');
}
function sendSay() { const el = $('#sayIn') || $('#dmIn'); social.say(el ? el.value : ''); closeModal(); }
function sendDm(id) { const el = $('#dmIn'); social.dm(id, el ? el.value : ''); closeModal(); }
function seekPerson(id) {
  if (S && S.tour && id === S.tour.friend) { const f = findPerson(id); if (f) f.vanish = 0; if (S.tour.stage !== 'done') return tourResume(); }
  const row = known[id] || {}, p = findPerson(id); closeModal();
  if (!p) { toast('They are not in this world.'); return; }
  const who = p.cast.name.split(' ')[0];
  if (p.hidden) { toast(who + ' is ' + (row.where || 'indoors') + (row.until ? ', ' + row.until.toLowerCase() : '') + '.'); return; }
  const x = p.pos.x, z = p.pos.z + 1.8;
  landAt(x, z, Math.atan2(p.pos.x - x, p.pos.z - z));
  toast(who + '. ' + (row.where || 'Out') + '.');
  setTimeout(() => { const q = findPerson(id); if (!q || chat.current) return; q.root.visible = true; talk(id); }, 90);
}
function maybeApproach(dt) {
  approachT += dt; if (approachT < 14) return; approachT = 0;
  if (!S || !S.alive || (chat && chat.current) || modalOpen || mapOn || ride || tourActive() || tourOpen) return;
  if (performance.now() - knownAt > 25000) refreshKnown();
  if (performance.now() - lastApproach < 80000) return;
  const looks = Math.max(0, Math.min(100, S.B || 40));
  let pick = null;
  for (const p of allFolk()) {
    const k = known[p.id]; if (!k || k.aff < 15 || p.chat || p.hidden || p.vanish > performance.now()) continue;
    const d = Math.hypot(p.pos.x - P.x, p.pos.z - P.z); if (d < 2.4 || d > 16) continue;
    const score = k.aff * looks; if (score < 1100) continue;
    const pull = Math.min(0.4, (score - 1100) / 14000);
    if (Math.random() < pull) pick = p;
  }
  if (!pick) return;
  lastApproach = performance.now(); pick.started = true;
  const dx = P.x - pick.pos.x, dz = P.z - pick.pos.z, m = Math.hypot(dx, dz) || 1;
  pick.meet = { x: P.x - dx / m * 1.8, z: P.z - dz / m * 1.8 };
  toast(pick.cast.name.split(' ')[0] + ' comes over.');
  chat.open(pick);
}
function openJobChat() {
  const iv = S && S.interview; if (!iv || !chat) return;
  chat.openInterview({
    id: iv.id, name: iv.name, pay: iv.pay,
    turns: iv.turns || [],
    onQuestion(q) { if (!S.interview) return; L.noteQuestion(S, q); saveLocal(); },
    onAnswer(q, a, pts) { if (!S.interview) return; L.noteAnswer(S, q, a, pts); saveLocal(); },
    onDone(score) {
      const j = L.JOBS.find(x => x.id === iv.id);
      const d = L.decideHire(S, j, score);
      const out = L.finishInterview(S, d.ok, d.line);
      if (S.tour && tourOpen === 'job') S.tour.iv = d.ok;
      hud(); saveLocal(); toast(out.msg); return d;
    }
  });
}
function openExamChat() {
  if (!S || !S.school || !chat) return;
  chat.openExam({
    id: S.school.id, name: S.school.id,
    onDone(score) {
      const out = L.sitExam(S, score);
      careerPing();
      hud(); saveLocal(); toast(out.msg); return out;
    }
  });
}
const ACT = { walk: 'walking along', cycle: 'riding a bicycle', sit: 'sitting on a bench', idle: 'standing', hidden: 'indoors' };
function npcCtx(p) { const s = p.state || {}; const kept = (S && S.dates && S.dates.bonds && p && S.dates.bonds[p.id] && S.dates.bonds[p.id].kept) || 0; return { hour: Math.floor(hourNow()), day: Math.floor(clockNow() / DAY), act: ACT[s.mode] || 'standing', place: s.place === 'apartments' ? 'apartments' : (s.place || 'street'), beauty: S ? Math.round(S.B || 40) : 40, age: S ? (S.age | 0) : 0, gender: (myLook && myLook.g) || 'm', mature: S && S.matureRomance ? '1' : '', started: p && p.started ? '1' : '', kept, name: S ? S.name : '' }; }
function syncPose(p, moving) {
  if (!p.av) return false;
  if (p.poseUntil && performance.now() > p.poseUntil) { p.pose = ''; p.poseUntil = 0; }
  if (moving && p.pose) { p.pose = ''; p.poseUntil = 0; }
  p.av.pose = p.pose || '';
  return p.pose === 'sit';
}
const SIT_Y = 0;
let navMesh = null, escort = null;
function destPoint(kind) {
  const pl = (world && world.places) || [];
  const find = (id) => pl.find((p) => p.id === id);
  const lake = world && world.campus && world.campus.lake;
  if (kind === 'college') { const p = find('college'); return p ? [p.x, p.z] : [0, 40]; }
  if (kind === 'job') { const p = find('work'); return p ? [p.x, p.z] : [10, 30]; }
  if (kind === 'bank') { const p = find('bank'); return p ? [p.x, p.z] : [20, 20]; }
  if (kind === 'home') { const p = find('home'); return p ? [p.x, p.z] : [-20, 20]; }
  if (kind === 'park') return [-17, 4];
  if (kind === 'lake') return lake ? [lake.x, lake.z + (lake.r || 10) + 2] : [-6, 136];
  const cafe = find('cafe'); return cafe ? [cafe.x, cafe.z] : [0, -30];
}
const PLACE_SAY = { cafe: 'the cafe', park: 'the park', lake: 'the lake', college: 'the college', bank: 'the bank', home: 'home', job: 'work', fields: 'the fields' };
const sayPlace = (k) => PLACE_SAY[k] || 'the cafe';
const fmtM = (m) => { m = Math.max(0, Math.round(m)); return m >= 950 ? (m / 1000).toFixed(1) + ' km' : m + ' m'; };
const DATE_COST = { cafe: 450, park: 120, lake: 80, college: 180, bank: 40, home: 60, job: 90, fields: 0 };
function fieldPlots() {
  if (!world) return [];
  if (world._plots) return world._plots;
  const out = [];
  if (world.crops && world.crops.plots) for (const p of world.crops.plots) out.push([p.x0, p.z0, p.x1, p.z1]);
  const extra = world.campus && world.campus.map && world.campus.map.fields && world.campus.map.fields.plots;
  if (extra) for (const p of extra) if (p && p.length >= 4) out.push([p[0], p[1], p[2], p[3]]);
  world._plots = out; return out;
}
function inField(x, z) { for (const p of fieldPlots()) if (x > p[0] + 0.5 && x < p[2] - 0.5 && z > p[1] + 0.5 && z < p[3] - 0.5) return true; return false; }
function segHitsField(x0, z0, x1, z1) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 2));
  for (let i = 1; i < n; i++) if (inField(x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n)) return true;
  return false;
}
function fieldSlow(x, z) { if (!inField(x, z)) return 1; if (live && live.onPath && live.onPath(x, z, 5)) return 1; return 0.45; }
function routeTo(x0, z0, x1, z1) {
  if (live && live.route) return live.route(x0, z0, x1, z1);
  return [[x0, z0], [x1, z1]];
}
function paintGuide() {
  const el = $('#guide'); if (!el) return;
  const p = escort;
  if (!p || !p.lead) { el.hidden = true; return; }
  const who = ((p.cast && p.cast.name) || 'They').split(' ')[0];
  const m = live && live.info ? live.info().metres : 0;
  el.hidden = false;
  el.textContent = who + ' is taking you to ' + sayPlace(p.lead.kind) + ' (' + fmtM(m) + ')';
}
function endGuide(p, kind, date) {
  const who = ((p.cast && p.cast.name) || 'They').split(' ')[0];
  const el = $('#guide'); if (el) el.hidden = true;
  if (live) live.clear();
  toast('You have arrived at ' + sayPlace(kind) + '.');
  if (date) playDate(p, kind, who);
}
function playDate(p, kind, who) {
  const base = DATE_COST[kind] == null ? 200 : DATE_COST[kind];
  const cost = Math.round(base * (S ? Fin.kf(S) : 1));
  document.body.classList.add('fadeblack');
  setTimeout(() => document.body.classList.remove('fadeblack'), 1600);
  p.mood = 'friendly';
  if (p.label) retitle(p.label, who, ((p.cast && p.cast.job) || '').split(' ')[0], p.mood);
  if (S) {
    const paid = cost > 0 ? payLine(cost, 'partner') : 0;
    if (paid) S.outings = (S.outings || 0) + paid;
    const bill = paid ? ' It cost ' + L.money(S, paid) + '.' : (cost > 0 ? ' You could not cover the bill.' : '');
    S.feed.unshift({ age: S.age, text: 'You and ' + who + ' went to ' + sayPlace(kind) + '.' + bill });
    if (S.feed.length > 220) S.feed.length = 220;
    hud(); saveLocal();
  }
  toast(who + ' enjoyed the outing.');
  const pid = (S && S.pid) || myId;
  fetch('/api/npc/outing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pid, npc: p.id }) })
    .then((r) => r.json()).then((j) => {
      if (!j || !j.ok) return;
      p.rel = j; p.mood = j.mood || p.mood;
      if (p.label) retitle(p.label, who, ((p.cast && p.cast.job) || '').split(' ')[0], p.mood);
    }).catch(() => {});
}
function beginGuide(p, kind, date) {
  const goal = destPoint(kind);
  p.lead = { pts: routeTo(p.pos.x, p.pos.z, goal[0], goal[1]), i: 0, kind, date: !!date };
  p.follow = false; p.hold = null; p.chat = false; p.meet = null; p.hidden = false;
  if (p.root) p.root.visible = true;
  escort = p;
  if (live) live.setWaypoint(goal[0], goal[1], kind);
  paintGuide();
  const el = $('#guide');
  toast(el && el.textContent ? el.textContent : ((p.cast && p.cast.name) || 'They').split(' ')[0] + ' is taking you to ' + sayPlace(kind) + '.');
}
function stepLead(p, dt) {
  const lead = p.lead;
  if (!lead || !lead.pts || lead.pts.length < 2) { p._moving = false; p.lead = null; if (escort === p) escort = null; return; }
  let budget = 1.7 * dt * fieldSlow(p.pos.x, p.pos.z);
  while (budget > 0 && lead.i < lead.pts.length - 1) {
    const b = lead.pts[lead.i + 1];
    const dx = b[0] - p.pos.x, dz = b[1] - p.pos.z, dist = Math.hypot(dx, dz);
    if (dist < 0.45) { lead.i++; continue; }
    const step = Math.min(budget, dist);
    p.pos.x += (dx / dist) * step; p.pos.z += (dz / dist) * step; p.heading = Math.atan2(dx, dz); p._moving = true; budget -= step;
    if (step + 0.05 < dist) break;
    lead.i++;
  }
  const end = lead.pts[lead.pts.length - 1];
  if (lead.i >= lead.pts.length - 1 && Math.hypot(end[0] - p.pos.x, end[1] - p.pos.z) < 1.3) {
    const kind = lead.kind || 'cafe', date = !!lead.date;
    p.lead = null; p._moving = false; p.hold = { x: p.pos.x, z: p.pos.z }; p.holdFar = 0; if (escort === p) escort = null;
    endGuide(p, kind, date);
  }
}
function beginErrand(p, mapId) {
  const goal = destPoint(mapId);
  p.errand = { pts: routeTo(p.pos.x, p.pos.z, goal[0], goal[1]), i: 0, map: mapId, x: goal[0], z: goal[1], wait: false };
  p.follow = false; p.lead = null; p.hold = null; p.chat = false; p.hidden = false;
  if (p.root) p.root.visible = true;
}
function stepErrand(p, dt) {
  const er = p.errand;
  if (!er) { p._moving = false; return; }
  if (er.wait) { p.pos.x = er.x; p.pos.z = er.z; p._moving = false; return; }
  if (!er.pts || er.pts.length < 2) { er.wait = true; p.pos.x = er.x; p.pos.z = er.z; p._moving = false; return; }
  let budget = 1.7 * dt * fieldSlow(p.pos.x, p.pos.z);
  while (budget > 0 && er.i < er.pts.length - 1) {
    const b = er.pts[er.i + 1];
    const dx = b[0] - p.pos.x, dz = b[1] - p.pos.z, dist = Math.hypot(dx, dz);
    if (dist < 0.45) { er.i++; continue; }
    const step = Math.min(budget, dist);
    p.pos.x += (dx / dist) * step; p.pos.z += (dz / dist) * step; p.heading = Math.atan2(dx, dz); p._moving = true; budget -= step;
    if (step + 0.05 < dist) break;
    er.i++;
  }
  const end = er.pts[er.pts.length - 1];
  if (er.i >= er.pts.length - 1 && Math.hypot(end[0] - p.pos.x, end[1] - p.pos.z) < 1.6) {
    p.pos.x = er.x; p.pos.z = er.z; er.wait = true; p._moving = false;
  }
}
function apptRoute(id) {
  const row = Ap.get(S, id); if (!row || !live) return;
  const g = destPoint(row.map);
  live.setWaypoint(g[0], g[1], row.map);
  if (mapOn) return;
  toast('Route set. ' + row.say + '.');
}
// ---------- arrival: a new life's first favour (Doris -> parcel -> Sunny Side cafe). Scripted, never waits on the LLM.
// Sunny Side, not Mira's Café Marta: its door is ~66 m (under a minute) on foot from the spawn; Marta is 181 m.
const DORIS = 'doris_okello', ARRIVE_FACT = 'helped me with the parcel on day one';
let parcelWp = false;
function parcelDoor() { const b = world && (world.buildings || []).find((q) => q.name === 'Sunny Side'); return b && b.door ? b : null; }
function parcelRoute(quiet) {
  const b = parcelDoor(); if (!b || !live) return;
  live.setWaypoint(b.door.x, b.door.z, 'parcel'); parcelWp = true;
  if (!quiet) toast('Route set. Sunny Side cafe is marked.');
}
function parcelJump() {   // the objective's Go: straight to the cafe door, delivered on arrival
  const b = parcelDoor(); if (!b || !S || !S.arrive || S.arrive.stage !== 'go') return;
  const go = () => fadeThen(() => { if (mapOn) closeMap(); landAt(b.door.x, b.door.z, Math.atan2(-b.n[0], -b.n[1])); deliverParcel(); });
  if (veh && veh.busy) { veh.dismount(); setTimeout(go, 1600); } else go();
}
function offerParcel(p) {
  const a = S.arrive; a.stage = 'offer'; a.offers = (a.offers | 0) + 1; p.errand = null; p.hold = { x: p.pos.x, z: p.pos.z }; p.holdFar = 0; p.meet = null;
  chat.open(p, { line: 'You\'re new here? Could you do me a small favour - take this parcel to the Sunny Side cafe across the square? I\'ll make it worth your while.', opts: [
    { t: 'Sure', fn: () => { a.stage = 'go'; parcelRoute(true); paintMission(); saveLocal(); toast('📦 Parcel for Sunny Side cafe. Tap Go or follow the arrow.'); return 'Bless you. They will be expecting it.'; } },
    { t: 'Not now', fn: () => { if (a.offers >= 2) a.stage = 'done'; else { a.stage = 'wait'; a.next = Date.now() + 60000; } paintMission(); saveLocal(); return a.stage === 'done' ? 'Never mind, dear. They will manage.' : 'No hurry. I\'ll catch you in a bit.'; } }
  ] });
}
function deliverParcel() {
  const a = S && S.arrive; if (!a || a.stage !== 'go') return;
  const pay = Math.round(12 * L.K(S)); // a healthy meal (7) and a coffee (3) at local prices, with change
  a.stage = 'done'; a.paid = pay; parcelWp = false; if (live) live.clear();
  S.cash = (S.cash || 0) + pay; Fin.book(S, 'inc', 'other', pay);
  S.feed.unshift({ age: S.age, text: 'You took Doris\'s parcel to Sunny Side cafe. The owner paid you ' + mon(pay) + '.' }); if (S.feed.length > 220) S.feed.length = 220;
  postPromise(DORIS, { d: 15, fact: ARRIVE_FACT });
  const c = document.createElement('div'); c.className = 'coins'; c.textContent = '🪙 +' + mon(pay); document.body.append(c); setTimeout(() => c.remove(), 2000);
  toast('Shopkeeper: "From Doris? Bless her. Here, for your trouble."'); toast('+' + mon(pay) + ' · Doris likes you more');
  showYear(['Parcel delivered. +' + mon(pay) + '.', 'Next: the shopkeeper may have work for you.']);
  hud(); paintMission(); saveLocal();
}
function arriveTick() {
  const a = S && S.arrive;
  if (!a || a.stage === 'done' || !playerReady || !S.alive) return;
  if (a.stage === 'go') {
    if (!parcelWp) parcelRoute(true);
    const b = parcelDoor(); if (b && Math.hypot(P.x - b.door.x, P.z - b.door.z) < 4) deliverParcel();
    return;
  }
  if (a.stage !== 'wait' || Date.now() < (a.next || 0) || modalOpen || chat.current || indoors || mapOn) return;
  walkUp(DORIS, offerParcel);
}
// a scripted NPC walks up to the player, then offer(p) opens the chat
function walkUp(id, offer) {
  const p = findPerson(id); if (!p) return;
  const d = Math.hypot(p.pos.x - P.x, p.pos.z - P.z);
  if (d < 3 && (!p.errand || p.errand.wait)) return offer(p);
  if (p.errand && p.errand.arrive && !p.errand.wait) { if (Date.now() - p.errand.t > 4000) { p.pos.x = p.errand.x; p.pos.z = p.errand.z; p.errand.wait = true; } return; } // a slow frame rate (late assets loading) must not keep her walking
  // walk up from a few steps away (or from where she stands, if close), stopping just short of the player
  const sx = d < 14 ? p.pos.x : P.x + 7, sz = d < 14 ? p.pos.z : P.z - 5, gx = P.x + 1.1, gz = P.z - 0.8;
  p.pos.x = sx; p.pos.z = sz; p.follow = false; p.lead = null; p.hold = null; p.chat = false; p.hidden = false; if (p.root) p.root.visible = true;
  p.errand = { pts: [[sx, sz], [gx, gz]], i: 0, map: 'street', x: gx, z: gz, wait: false, arrive: true, t: Date.now() }; // straight across the pavement: the road graph detours on short hops
}
// ---------- arrival: the best-friend tour (new lives from 19 Oct 2026; replaces Doris's parcel). Scripted lines, never waits on the LLM.
// An opposite-gender close friend walks up, then each Yes fades to the next stop: job agency, bank, exchange, a word of FYI, the richest billboard.
// The X (or End tour) stops it; tapping the friend in People picks it up again.
const TOUR_FRIEND = { f: 'leo_park', m: 'aisha_rahman' }, TOUR_FACT = 'your best friend since school';
const RICH_SPOT = { x: -14, z: -11.5, face: Math.PI, phoneZ: -5.5 }; // in front of the rich-square billboard (world.js), facing it; phones stand back so it clears the status panel
const TOUR = {
  job: { at: 'work', btn: 'Show me the jobs', line: () => 'Try an interview for a job you think could build your future.' },
  bank: { at: 'bank', btn: 'Show me the bank', line: () => 'You can leave your money in savings, or lock it in a fixed deposit for more interest.' },
  exchange: { at: 'exchange', btn: 'Show me the market', line: () => 'And this is the stock market - where you can win big.' },
  fyi: { btn: 'Next', line: () => 'FYI - there\'s a casino, but you need to be 21. You can buy land and build a house. A degree from AIT can help you become a CEO one day. And you can have a girlfriend or boyfriend and get married once you\'re 21. Who knows - if you get rich, I could be your ' + (tourFriend().cast.gender === 'man' ? 'boyfriend' : 'girlfriend') + ' 😉' },
  rich: { at: 'rich', btn: 'Next', line: () => { const r = lastRows[0]; return r && r.name === S.name ? 'That\'s you - the richest person in Sansar! I wonder when my name will be up there.' : (r ? r.name : 'Nobody yet') + ' is the richest person in Sansar. I wonder when my name will be up there.'; } },
  bye: { btn: 'See you!', line: () => 'Okay, that\'s it for now. See you around!' }
};
const TOUR_NEXT = { job: 'bank', bank: 'exchange', exchange: 'fyi', fyi: 'rich', rich: 'bye' };
let tourOpen = ''; // the tour stop whose sheet is open; tourTick moves on once it (and any interview) closes
function tourFriend() { return S && S.tour ? findPerson(S.tour.friend) : null; }
function tourActive() { const t = S && S.tour; return !!(t && TOUR[t.stage] && !t.off); }
function besideMe(p) {   // a step ahead and to the side, where the camera sees them
  const f = P.ry || 0, fx = Math.sin(f), fz = Math.cos(f);
  const spots = [[1.1, 1.1], [1.1, -1.1], [0, 1.4], [0, -1.4]].map(([a, b]) => [P.x + fx * a + fz * b, P.z + fz * a - fx * b]);
  const [x, z] = spots.find(([x, z]) => !blockedSpot(x, z)) || spots[0];
  p.pos.x = x; p.pos.z = z; p.errand = null; p.follow = false; p.lead = null; p.meet = null; p.vanish = 0;
  p.hold = { x, z }; p.holdFar = 0; p.hidden = false; if (p.root) p.root.visible = true;
}
function tourSay(line, opts, last) {
  const p = tourFriend(); if (!p || !chat) return;
  chat.open(p, { line, opts: [...opts, last || { t: '✕ End tour', fn: () => { S.tour.off = 1; tourOpen = ''; saveLocal(); return 'Okay! Find me in People when you want the rest.'; } }] });
}
function tourOffer(p) {
  const t = S.tour, fresh = t.stage === 'meet' || t.stage === 'no';
  p.errand = null; p.hold = { x: p.pos.x, z: p.pos.z }; p.holdFar = 0; p.meet = null;
  tourSay(fresh ? 'Hey! You\'re 18 now - you\'ve got to get a job. Want me to take you to the job agency?' : 'Want me to show you the rest of Sansar?',
    [{ t: 'Yes', fn: () => { setTimeout(() => tourStep(fresh ? 'job' : t.stage), 0); } }],
    { t: fresh ? 'No, I\'ll explore on my own' : 'Not now', fn: () => { if (fresh) t.stage = 'no'; t.off = 1; saveLocal(); return 'Fair enough. Find me if you change your mind.'; } });
}
function tourStep(stage) {
  const t = S && S.tour, s = TOUR[stage]; if (!t || !s) return;
  t.stage = stage; t.off = 0; tourOpen = ''; saveLocal();
  const talk = () => {
    const p = tourFriend(); if (!p) return; besideMe(p); tourSay(s.line(), [{ t: s.btn, fn: () => { setTimeout(() => tourOn(stage), 0); } }]);
    if (s.at === 'rich') { chatYawT = RICH_SPOT.face + Math.PI + (phoneHud() ? .22 : 0); chatPitchT = phoneHud() ? .04 : .12; } // the chat camera looks past the pair at the billboard
  };
  if (!s.at) return talk();
  const go = () => fadeThen(() => {
    if (mapOn) closeMap(); if (modalOpen) closeModal(); if (indoors) leaveHome();
    const p = s.at === 'rich' ? { ...RICH_SPOT, z: phoneHud() ? RICH_SPOT.phoneZ : RICH_SPOT.z } : placeById(s.at);
    if (p) landAt(p.approach ? p.approach.x : p.x, p.approach ? p.approach.z : p.z, p.face);
    talk();
  });
  if (veh && veh.busy) { veh.dismount(); setTimeout(go, 1600); } else go();
}
function tourOn(stage) {   // the friend's button: open the stop's sheet, or go on
  if (stage === 'bye') return tourBye();
  if (TOUR[stage].at && PLACE_VIEW[TOUR[stage].at]) { openPlace(TOUR[stage].at); tourOpen = stage; return; }
  tourStep(TOUR_NEXT[stage]);
}
function tourAfterJob() {
  const t = S.tour, ok = t.iv; delete t.iv; t.stage = 'bank'; saveLocal();
  if (ok) { const c = document.createElement('div'); c.className = 'coins'; c.textContent = '🎉 Hired!'; document.body.append(c); setTimeout(() => c.remove(), 2000); }
  const p = tourFriend(); if (!p) return; besideMe(p);
  const first = ok ? 'You got the job! Yaay!' : ok === false ? 'No problem - you can interview again next time.' : 'No rush - you can interview any time.';
  tourSay(first + ' Let me walk you through the rest.', [{ t: 'Next', fn: () => { setTimeout(() => tourStep('bank'), 0); } }]);
}
function tourBye() {
  const p = tourFriend(); S.tour.stage = 'done'; saveLocal(); lastApproach = performance.now(); if (!p) return; // no one walks straight back up for a chat
  const f = P.ry || 0, gx = p.pos.x + Math.cos(f) * 7, gz = p.pos.z - Math.sin(f) * 7; // walks off sideways, then is gone
  p.hold = null; p.errand = { pts: [[p.pos.x, p.pos.z], [gx, gz]], i: 0, map: 'street', x: gx, z: gz, wait: false };
  setTimeout(() => { p.errand = null; p.vanish = performance.now() + 90000; }, 3800);
}
function tourResume() {   // from People: the friend comes back and offers the rest
  const p = tourFriend(); if (!p) return; closeModal(); besideMe(p); toast(p.cast.name.split(' ')[0] + ' comes over.'); tourOffer(p);
}
function tourTick() {
  const t = S && S.tour;
  if (!t || t.stage === 'done' || !playerReady || !S.alive) return;
  if (tourOpen) {
    if (modalOpen || chat.current || mapOn) return;
    const st = tourOpen; tourOpen = '';
    return st === 'job' ? tourAfterJob() : tourStep(TOUR_NEXT[st]);
  }
  if (t.stage !== 'meet' || t.off || modalOpen || chat.current || indoors || mapOn) return;
  if (!t.aff) { t.aff = 1; saveLocal(); postPromise(t.friend, { aff: 75, fact: TOUR_FACT }); }
  walkUp(t.friend, tourOffer);
}
function showPhone(msg, yes, label) {
  const el = $('#phone'); if (!el || !msg) return;
  const who = $('#phoneWho'), body = $('#phoneBody'), y = $('#phoneYes');
  if (who) who.textContent = msg.from || '';
  if (body) body.textContent = msg.text || '';
  if (y) { y.hidden = !yes; y.textContent = label || 'Accept'; y.onclick = yes ? () => { y.hidden = true; el.hidden = true; yes(); } : null; }
  el.hidden = false;
}
function careerPing() {
  const n = S && S.career && S.career.notice;
  if (!n || !n.text || n.shown) return;
  n.shown = 1;
  S.feed.unshift({ age: S.age, text: n.text }); if (S.feed.length > 220) S.feed.length = 220;
  pullBoard();
  showPhone({ from: 'Careers', text: n.text }, () => {
    const p = placeById(n.place || 'work');
    if (p && live) live.setWaypoint(p.approach ? p.approach.x : p.x, p.approach ? p.approach.z : p.z, n.place || 'work');
    toast('Route set.');
  }, 'Go');
}
function postPromise(npc, ev) {
  const pid = (S && S.pid) || myId;
  const body = { pid, npc, d: ev.d || 0, fact: ev.fact || '', end: ev.ended || ev.end || '', mood: ev.mood || '', bond: ev.bond || '' };
  if (ev.aff != null) body.aff = ev.aff;
  fetch('/api/npc/promise', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {});
}
function applyDateEvent(e) {
  if (!S || !e) return;
  if (e.type === 'remind') { const g = destPoint(e.map); if (live) live.setWaypoint(g[0], g[1], e.map); toast(e.line); }
  if (e.type === 'go') { const p = findPerson(e.npc); if (p && !p.errand) beginErrand(p, e.map); }
  if (e.type === 'left') { const p = findPerson(e.npc); if (p) p.errand = null; }
  if (e.type === 'msg' && e.msg) { showPhone(e.msg); toast(e.msg.from + ': ' + e.text); }
  if (e.type === 'keep') { toast((e.ontime ? 'You made it. ' : 'You were late. ') + String(e.name || '').split(' ')[0] + ' noticed.'); if (e.married) toast('You are married.'); if (e.needHome) toast('They will not marry you until the home is in your name.'); }
  if (e.type === 'miss') toast(String(e.name || '').split(' ')[0] + ' waited. Affection ' + e.d + '.');
  if (e.ended === 'break') toast(String(e.name || '').split(' ')[0] + ' ended it. Too many broken promises.');
  if (e.ended === 'divorce') {
    Fin.book(S, 'exp', 'family', e.half || 0);
    const line = String(e.name || '').split(' ')[0] + ' filed for divorce. Half the money you held is gone, and alimony follows.';
    toast(line); S.feed.unshift({ age: S.age, text: line }); if (S.feed.length > 220) S.feed.length = 220;
  }
  if (e.fact) postPromise(e.npc, e);
  hud(); saveLocal();
}
let datePause = false;
function dateTick(seed) {
  if (!S || datePause) return [];
  const now = { day: Math.floor(clockNow() / DAY), hour: hourNow() };
  const near = (mapId) => { const g = destPoint(mapId); return Math.hypot(P.x - g[0], P.z - g[1]) < 12; };
  const ev = Ap.tick(S, now, near, seed);
  for (const e of ev) applyDateEvent(e);
  return ev;
}
function pullPlayer(p) {
  if (escort !== p || !p.lead) return;
  const h = p.heading || 0;
  P.x = p.pos.x - Math.sin(h) * 1.5; P.z = p.pos.z - Math.cos(h) * 1.5; P.vx = P.vz = 0; P.ry = h;
}
function followRoute(p, tx, tz, dt, cap) {
  const now = performance.now();
  if (!p._fp || now - (p._fpAt || 0) > 1200 || Math.hypot((p._fpx || 0) - tx, (p._fpz || 0) - tz) > 8) {
    p._fp = routeTo(p.pos.x, p.pos.z, tx, tz); p._fpi = 0; p._fpAt = now; p._fpx = tx; p._fpz = tz;
  }
  const pts = p._fp; if (!pts || pts.length < 2) return null;
  let i = p._fpi || 0, x = p.pos.x, z = p.pos.z, heading = p.heading, moving = false;
  let budget = Math.min(cap, 1.7) * dt * fieldSlow(x, z);
  while (budget > 0 && i < pts.length - 1) {
    const b = pts[i + 1], dx = b[0] - x, dz = b[1] - z, dist = Math.hypot(dx, dz);
    if (dist < 0.45) { i++; continue; }
    const step = Math.min(budget, dist);
    x += (dx / dist) * step; z += (dz / dist) * step; heading = Math.atan2(dx, dz); moving = true; budget -= step;
    if (step + 0.05 < dist) break;
    i++;
  }
  p._fpi = i;
  if (i >= pts.length - 1 && Math.hypot(tx - x, tz - z) > 2.2) {
    const dx = tx - x, dz = tz - z, dist = Math.hypot(dx, dz) || 1, step = Math.min(dist, cap * 0.45 * dt);
    let nx = x + (dx / dist) * step, nz = z + (dz / dist) * step;
    [nx, nz] = collide(nx, nz, false, true);
    x = nx; z = nz; heading = Math.atan2(dx, dz); moving = true;
  }
  return { x, z, heading, moving };
}
function steerFollow(p, dt) {
  const pack = allFolk().filter((q) => q.follow);
  const i = Math.max(0, pack.indexOf(p));
  const behind = ride ? 2.6 : 1.5;
  const side = (i - (pack.length - 1) / 2) * 0.85;
  const tx = P.x - Math.sin(P.ry) * behind + Math.cos(P.ry) * side;
  const tz = P.z - Math.cos(P.ry) * behind - Math.sin(P.ry) * side;
  let dx = tx - p.pos.x, dz = tz - p.pos.z, dist = Math.hypot(dx, dz);
  const cap = ride ? (ride.kind === 'cycle' ? 9.2 : 16) : 5.6;
  if (dist > 22 || (dist > 3 && segHitsField(p.pos.x, p.pos.z, tx, tz))) {
    const along = followRoute(p, tx, tz, dt, cap);
    if (along) return along;
  }
  p._fp = null;
  let x = p.pos.x, z = p.pos.z, heading = p.heading, moving = dist > 1.15;
  if (dist > 30) { x = tx; z = tz; moving = false; }
  else if (moving && dist > 0.05) {
    const spd = Math.min(cap, Math.max(1.55, (P.spd || 0) + 1.1)) * fieldSlow(p.pos.x, p.pos.z);
    const step = Math.min(dist, spd * dt);
    let nx = x + (dx / dist) * step, nz = z + (dz / dist) * step;
    [nx, nz] = collide(nx, nz, false, true);
    if (Math.hypot(nx - x, nz - z) < step * 0.3 && dist > 2.2) {
      const s = p._side || (p._side = 1);
      [nx, nz] = collide(x + (-dz / dist) * s * 0.75, z + (dx / dist) * s * 0.75, false, true);
      p._stuck = (p._stuck || 0) + dt;
      if (p._stuck > 1.2) { p._side = -s; p._stuck = 0; nx = tx; nz = tz; }
    } else p._stuck = 0;
    heading = Math.atan2(tx - x, tz - z); x = nx; z = nz;
  } else heading = Math.atan2(P.x - x, P.z - z);
  const dxp = x - P.x, dzp = z - P.z, dp = Math.hypot(dxp, dzp);
  if (dp < 1.2 && dp > 0.02) { x = P.x + dxp / dp * 1.2; z = P.z + dzp / dp * 1.2; }
  return { x, z, heading, moving };
}
function updatePeople(dt) {
  const st = clockNow(); const px = P.x, pz = P.z;
  for (const p of crowd.people) {
    if (p.chat || p.follow || p.hold) p.skew += dt;
    let s = crowd.stateAt(p, (((st - p.skew) % DAY) + DAY) % DAY);
    const away = p.follow && Math.hypot(p.pos.x - px, p.pos.z - pz) > 2.4;
    if (p.lead) { stepLead(p, dt); pullPlayer(p); s = { x: p.pos.x, z: p.pos.z, heading: p.heading, mode: p._moving ? 'walk' : 'idle', place: 'street' }; }
    else if (p.errand) { stepErrand(p, dt); s = { x: p.pos.x, z: p.pos.z, heading: p.heading, mode: p._moving ? 'walk' : 'idle', place: p.errand ? p.errand.map : 'street' }; }
    else if (p.follow && (!p.chat || away)) { const f = steerFollow(p, dt); s = { x: f.x, z: f.z, heading: f.heading, mode: f.moving ? 'walk' : 'idle', place: 'street' }; }
    else if (p.chat && p.meet) s = { x: p.meet.x, z: p.meet.z, heading: Math.atan2(px - p.meet.x, pz - p.meet.z), mode: 'idle', place: s.place };
    else if (p.hold) {
      const far = Math.hypot(p.hold.x - px, p.hold.z - pz) > 40;
      p.holdFar = far ? (p.holdFar || 0) + dt : 0;
      if (p.holdFar > 25) p.hold = null; else s = { x: p.hold.x, z: p.hold.z, heading: p.heading, mode: 'idle', place: 'street' };
    }
    if (!p.lead && !p.follow && (s.mode === 'walk' || s.mode === 'cycle') && (fieldSlow(p.pos.x, p.pos.z) < 1 || fieldSlow(s.x, s.z) < 1)) {
      const cap = (p.walkSpeed || 1.3) * 0.45 * dt, dx = s.x - p.pos.x, dz = s.z - p.pos.z, dist = Math.hypot(dx, dz);
      if (dist > cap && dist > 0.02) s = { ...s, x: p.pos.x + dx / dist * cap, z: p.pos.z + dz / dist * cap };
    }
    p.state = s; p.pos.x = s.x; p.pos.z = s.z;
    const d = Math.hypot(s.x - px, s.z - pz), vis = ((s.mode !== 'hidden' && d < 100) || !!p.lead || !!p.errand) && !(p.vanish > performance.now()); p.root.visible = vis; p.hidden = s.mode === 'hidden' && !p.lead && !p.errand; if (!vis) continue;
    let mode = s.mode, head = s.heading; if (p.chat && !(p.follow && mode === 'walk')) { if (mode === 'walk' || mode === 'cycle') mode = 'idle'; if (mode !== 'sit') head = Math.atan2(px - s.x, pz - s.z); if (p.mood === 'angry') head += Math.PI; }
    p.root.position.set(s.x, PAVE_Y + (mode === 'sit' ? SIT_Y : 0), s.z);
    let da = head - p.root.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); p.root.rotation.y += da * (mode === 'sit' ? 1 : Math.min(1, dt * 7));
    if (p.bike) { const on = mode === 'cycle'; p.bike.visible = on; if (on) for (const ch of p.bike.children) if (ch.name === 'wheel') ch.rotation.x -= dt * 10; }
    if (p.av.setSeat) p.av.setSeat(mode === 'cycle' ? .72 : .46);
    if (p.chat && p.mood === 'flirt' && !p.pose) p.av.lean = .16; else if (p.av.look) p.av.lean = p.av.look.ag === 3 ? .08 : 0;
    const sitPose = syncPose(p, mode === 'walk' || mode === 'cycle');
    p.acc = (p.acc || 0) + dt; const step = d < 30 ? 0 : d < 60 ? 1 / 15 : 1 / 6; if (p.acc >= step) { p.av.update(p.acc, mode === 'walk' ? p.walkSpeed : 0, mode === 'sit' || mode === 'cycle' || sitPose); p.acc = 0; }
    p.av.mesh.castShadow = d < 38;
    p.label.visible = d < 12 || p === hover || p.chat; p.mode = mode;
  }
}
const pedsNow = () => { const a = [{ x: P.x, z: P.z }]; for (const [, o] of others) a.push({ x: o.root.position.x, z: o.root.position.z }); for (const p of allFolk()) a.push(p.pos); return a; };

// ---------- camera framing while chatting ----------
const foc = { x: P.x, z: P.z }; const shift = { x: 0, y: 0 }, shiftT = { x: 0, y: 0 }; let chatFocus = null, distBefore = 6.5;
function applyShift(force) {
  if (!(chat && chat.current)) { shiftT.x = shiftT.y = 0; } else if (innerWidth > 700) { shiftT.x = Math.min(390, innerWidth * .38) / 2 + 7; shiftT.y = 0; } else { shiftT.y = Math.min(innerHeight * .56, 470) / 2 + 10; shiftT.x = 0; }
  if (force) { shift.x = shiftT.x; shift.y = shiftT.y; }
}

// camera ray vs building boxes: how far the camera may sit from (fx,fz) along (yw,pt) before it would be inside a wall
function rayFree(fx, fz, yw, pt, maxd) {
  let dd = maxd; const ox = Math.sin(yw) * Math.cos(pt), oz = Math.cos(yw) * Math.cos(pt), oy = Math.sin(pt);
  for (const c of world.colliders) {
    if (c.skip || (c.interior && !indoors)) continue;
    if (c.t === 'obb') {
      const co = Math.cos(c.ry), si = Math.sin(c.ry);
      const lx = (fx - c.cx) * co - (fz - c.cz) * si, lz = (fx - c.cx) * si + (fz - c.cz) * co;
      const dlx = ox * co - oz * si, dlz = ox * si + oz * co;
      let t0 = 0, t1 = dd + 1, ok = true; const o = [lx, 1.5, lz], d = [dlx, oy, dlz], lo = [-c.hw - .4, 0, -c.hd - .4], hi = [c.hw + .4, c.y1 + .5, c.hd + .4];
      for (let i = 0; i < 3 && ok; i++) { if (Math.abs(d[i]) < 1e-6) { if (o[i] < lo[i] || o[i] > hi[i]) ok = false; } else { let a = (lo[i] - o[i]) / d[i], b = (hi[i] - o[i]) / d[i]; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) ok = false; } }
      if (ok && t0 < dd) dd = Math.max(0.35, t0 - .15);
      continue;
    }
    if (c.t !== 'box') continue;
    let t0 = 0, t1 = dd + 1, ok = true; const o = [fx, 1.5, fz], d = [ox, oy, oz], lo = [c.x0 - .4, 0, c.z0 - .4], hi = [c.x1 + .4, c.y1 + .5, c.z1 + .4];
    for (let i = 0; i < 3 && ok; i++) { if (Math.abs(d[i]) < 1e-6) { if (o[i] < lo[i] || o[i] > hi[i]) ok = false; } else { let a = (lo[i] - o[i]) / d[i], b = (hi[i] - o[i]) / d[i]; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) ok = false; } }
    if (ok && t0 < dd) dd = Math.max(0.35, t0 - .15); }
  return dd;
}
function insideWall(x, y, z) {
  if (!world) return false;
  for (const c of world.colliders) {
    if (c.skip || (c.interior && !indoors)) continue;
    if (c.t === 'obb') {
      const co = Math.cos(c.ry), si = Math.sin(c.ry), lx = (x - c.cx) * co - (z - c.cz) * si, lz = (x - c.cx) * si + (z - c.cz) * co;
      if (Math.abs(lx) < c.hw - 0.08 && Math.abs(lz) < c.hd - 0.08 && y > 0.15 && y < c.y1 - 0.1) return true;
    } else if (c.t === 'box' && x > c.x0 + 0.08 && x < c.x1 - 0.08 && z > c.z0 + 0.08 && z < c.z1 - 0.08 && y > 0.15 && y < c.y1 - 0.1) return true;
  }
  return false;
}
let chatYawT = 0, chatDistT = 5.6, chatPitchT = .17;
function pickChatYaw(p) {   // choose the side of the conversation with the clearest view (not through a shop wall)
  const mx = (P.x + p.pos.x) / 2, mz = (P.z + p.pos.z) / 2, base = Math.atan2(P.x - p.pos.x, P.z - p.pos.z), want = touch ? 8.6 : 5.6; let best = base, bd = -1;
  for (const off of [.9, -.9, 1.3, -1.3, .45, -.45, 0, 2.2, -2.2]) { const d = rayFree(mx, mz, base + off, .17, want); if (d > bd + .01) { bd = d; best = base + off; } if (bd >= want) break; }
  chatYawT = best; chatDistT = Math.max(3.4, Math.min(want, bd)); chatPitchT = bd < want ? .3 : .17;
}
// ---------- frame ----------
let last = performance.now(), fpsN = 0, fpsT = 0; window.__fps = 0; let netT = 0, timeT = 0, clockT = 0, lowN = 0, playerReady = false;
let onBattery = false, drawn = 0, still = 0;
if (navigator.getBattery) navigator.getBattery().then((b) => { const f = () => { onBattery = !b.charging; }; f(); b.addEventListener('chargingchange', f); }).catch(() => {});
const capMs = () => 1000 / (qs.has('fps') ? +qs.get('fps') : touch || onBattery ? 36 : 60);   // 36 lands on a vsync step that stays at or above 30 (every other frame at 60 Hz, every fourth at 144 Hz)
function frame(now) {
  requestAnimationFrame(frame); if (document.hidden) return;
  if (now - drawn < capMs() - 2) return; drawn = now;   // 2 ms slack so a 60 Hz display is not halved by vsync jitter
  const dt = Math.min(.05, (now - last) / 1000); last = now; const t = now / 1000;
  fpsN++; fpsT += dt; if (fpsT >= 1) { window.__fps = Math.round(fpsN / fpsT); fpsN = 0; fpsT = 0; lowN = window.__fps < 24 && !document.hidden && now > 6000 ? lowN + 1 : 0; if (lowN >= 3 && quality < 3 && !qs.has('hq')) { lowN = 0; downgrade(); } }
  if (!world) { renderer.render(scene, camera); return; }
  if (mapOn || (modalOpen && modal.still)) { if (mapOn && live) live.tick(dt); return; }   // a full sheet covers the view; do not spend a frame drawing the world under it (the open map still draws)
  const chatting = !!(chat && chat.current);
  let ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + joy.x, iz = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) + joy.y;
  if (!playerReady) ix = iz = 0;
  if ((modalOpen && (!$('#layer').classList.contains('sheet') || modal.still)) || mapOn || !S || !S.alive || chatting && joy.id === null) ix = iz = 0; const m = Math.hypot(ix, iz); if (m > 1) { ix /= m; iz /= m; }
  window.__moving = m > 0.08;
  if (window.__qaIn) { ix = window.__qaIn.x || 0; iz = window.__qaIn.y || 0; }   // QA autopilot (analog stick)
  if (P.sit) { if (m > .25 && !chatting) standUp(); else { ix = iz = 0; } }
  const LS = locoSpeeds(); const hurt = Hosp.slow(S);
  const fit = S ? Math.max(0, Math.min(100, ((+S.L || 0) + (+S.B || 0)) / 2)) : 40;
  const walk = LS.walk * 1.15, runS = LS.run * 1.25;
  let sprintS = Math.max(walk * 1.8, runS * 1.08) * (1 + Math.max(-0.06, (fit - 40) * 0.0016));
  if (LS.run > 0.2) sprintS = Math.min(sprintS, LS.run * 1.45);
  P.walkPace = walk; P.runPace = runS; P.sprintPace = sprintS; P.fit = +fit.toFixed(1);
  const free = !modalOpen && !mapOn && !chatting && !!S;
  if (free && (keys.KeyQ || keys.KeyR)) { yaw += ((keys.KeyQ ? 1 : 0) - (keys.KeyR ? 1 : 0)) * 2.1 * dt * (ctl ? ctl.sens : 1); lookT = 0; }
  if (locked() && !free) document.exitPointerLock();
  ride = veh && veh.busy ? veh.active : null;
  let sprinting = false, running = false;
  if (ride) { P._go = false; veh.step(dt, { throttle: iz, steer: ix, brake: free && (!!keys.Space || ctl.state.brake), horn: free && (!!keys.KeyH || ctl.state.horn) }, P); }
  else {   // on foot: stick picks a direction, the body turns to it, and speed is only along the facing (never a backpedal)
    const move = Math.hypot(ix, iz);
    const sprintWant = move > .08 && (sprintHold || keys.ShiftLeft || keys.ShiftRight || performance.now() < joySprintUntil);
    sprinting = sprintWant && !Hosp.noSprint(S) && (P.stam == null || P.stam > (P._spr ? 0.04 : 0.14));
    running = !sprinting && move > .08 && (sprintWant || runOn || (move > .85 && joy.id !== null));
    const pace = (sprinting ? sprintS : running ? runS : walk) * Math.min(1, move) * hurt * fieldSlow(P.x, P.z);
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const dx = fx * iz + rx * ix, dz = fz * iz + rz * ix; const len = Math.hypot(dx, dz) || 1;
    const wx = dx / len, wz = dz / len;
    const qx = ix > .35 ? 1 : ix < -.35 ? -1 : 0, qz = iz > .35 ? 1 : iz < -.35 ? -1 : 0, qk = qx + ':' + qz;
    if (move > .08 && P._qk !== qk) { P._qk = qk; P._hold = Math.atan2(wx, wz); }
    if (move <= .08) P._qk = '';
    const hx = Math.sin(P._hold || 0), hz = Math.cos(P._hold || 0);
    const faceX = Math.sin(P.ry), faceZ = Math.cos(P.ry);
    const align = move > .08 ? Math.max(0, faceX * hx + faceZ * hz) : 0; const k = 1 - Math.exp(-10 * dt);
    P._dx = move > .08 ? hx : 0; P._dz = move > .08 ? hz : 0; P._go = move > .08; P.back = false; P.leg = 0;
    const spd = pace * align;
    P.vx += (faceX * spd - P.vx) * k; P.vz += (faceZ * spd - P.vz) * k;
  }
  if (P.stam == null) P.stam = 1;
  const stamT = 5 + fit * 0.04;
  if (sprinting) { P.stam = Math.max(0, P.stam - dt / stamT); P._spr = P.stam > 0.04; P.stamCd = 0.65; }
  else { P._spr = false; P.stamCd = Math.max(0, (P.stamCd || 0) - dt); if (P.stamCd <= 0) P.stam = Math.min(1, P.stam + dt / Math.max(2.2, 3.6 - fit * 0.008)); }
  P.gait = sprinting ? 'sprint' : running ? 'run' : (Math.hypot(ix, iz) > .08 ? 'walk' : 'idle');
  const stamEl = $('#stam');
  if (stamEl) { const show = !ride && (sprinting || P.stam < 0.995); stamEl.hidden = !show; const u = stamEl.firstElementChild; if (u) u.style.width = (P.stam * 100) + '%'; stamEl.classList.toggle('low', P.stam < 0.28); }
  if (ride) { /* the vehicle moved the player */ }
  else if (escort && escort.lead) { P.vx = P.vz = 0; P.spd = 0; }
  else if (P.sit) { const kk = 1 - Math.exp(-7 * dt); P.x += (P.sit.x - P.x) * kk; P.z += (P.sit.z - P.z) * kk; P.vx = P.vz = 0; P.spd = 0; } else { P.nocol = Math.max(0, (P.nocol || 0) - dt); [P.x, P.z] = collide(P.x + P.vx * dt, P.z + P.vz * dt, P.nocol > 0, !!window.__qaIn); P.spd = Math.hypot(P.vx, P.vz); }
  realm = inCampus(P.x, P.z) ? 'ait' : 'town';
  if (chatting && chatFocus) { const want = Math.atan2(chatFocus.pos.x - P.x, chatFocus.pos.z - P.z); let d = want - P.ry; d = Math.atan2(Math.sin(d), Math.cos(d)); P.ry += d * (1 - Math.exp(-6 * dt));
    let dy = chatYawT - yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); yaw += dy * (1 - Math.exp(-3 * dt)); dist += (chatDistT - dist) * (1 - Math.exp(-3 * dt)); pitch += (chatPitchT - pitch) * (1 - Math.exp(-3 * dt)); }
  else if (P.sit) { let d = P.sit.h - P.ry; d = Math.atan2(Math.sin(d), Math.cos(d)); P.ry += d * (1 - Math.exp(-8 * dt)); }
  else if (!ride && Math.hypot(ix, iz) > .08 && !P.sit) { const want = Math.atan2(P._dx || 0, P._dz || 0); let d = Math.atan2(Math.sin(want - P.ry), Math.cos(want - P.ry)); const cap = 12 * dt; if (d > cap) d = cap; else if (d < -cap) d = -cap; P.ry += d; }
  if (indoors && world.interior && world.interior.update) world.interior.update(dt);
  if (me) {
    if (indoors) me.root.visible = false;
    if (ride) { P.an = 'sit'; veh.unpose(me.av); if (untwist) untwist(me.av); me.av.back = false; me.av.update(dt, 0, false); veh.pose(P); }
    else {
      if (veh) veh.unpose(me.av); if (untwist) untwist(me.av);
      me.root.position.set(P.x, PAVE_Y, P.z); me.root.rotation.set(0, P.ry, 0); me.av.root.rotation.y = 0;   // all three: a quaternion restore (bike fit) leaves x = z = PI, which mirrors her to run backwards me.av.back = false;
      P.an = P.sit ? 'sit' : P.gait === 'sprint' ? 'sprint' : P.spd > .3 ? 'walk' : 'idle'; if (me.av.setSeat) me.av.setSeat(0.46); me.av.update(dt, P.spd, !!P.sit);
    }
  }
  if (veh) { veh.update(dt, P.x, P.z); const a = veh.busy ? veh.active : null; const wasRide = document.body.classList.contains('riding'); ctl.riding(!!a, a && a.kind, a ? a.u : 0); if (wasRide !== document.body.classList.contains('riding')) layoutHud(); }
  // camera: orbit behind the player (or the midpoint of a conversation), kept out of buildings
  const vc = ride ? veh.cam() : null;   // chase camera: swings back behind the vehicle after 2 s without look input, pulls back and widens with speed
  lookT += dt; if (vc && lookT > 2 && vc.phase !== 'thrown') { let d = vc.yaw - yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); yaw += d * (1 - Math.exp(-2.4 * dt)); pitch += (.22 - pitch) * (1 - Math.exp(-1.6 * dt)); }
  const fovT = (P.shotFov || 55) + (vc ? vc.fov : 0); if (Math.abs(camera.fov - fovT) > .02) { camera.fov += (fovT - camera.fov) * (1 - Math.exp(-3 * dt)); camera.updateProjectionMatrix(); }
  const tfx = chatting && chatFocus ? (P.x + chatFocus.pos.x) / 2 : P.x, tfz = chatting && chatFocus ? (P.z + chatFocus.pos.z) / 2 : P.z, fk = vc ? 16 : 6; foc.x += (tfx - foc.x) * (1 - Math.exp(-fk * dt)); foc.z += (tfz - foc.z) * (1 - Math.exp(-fk * dt));
  let dd = dist + (vc ? vc.back : 0); const ox = Math.sin(yaw) * Math.cos(pitch), oz = Math.cos(yaw) * Math.cos(pitch), oy = Math.sin(pitch);
  dd = rayFree(foc.x, foc.z, yaw, pitch, dd);
  let cx = foc.x + ox * dd, cz = foc.z + oz * dd, cy = Math.max(0.28, 1.5 + oy * dd);
  if (insideWall(cx, cy, cz)) { cx = foc.x; cy = 1.7; cz = foc.z; }
  const ck = reduce ? 1 : 1 - Math.exp(-9 * dt); camera.position.x += (cx - camera.position.x) * ck; camera.position.y += (cy - camera.position.y) * ck; camera.position.z += (cz - camera.position.z) * ck;
  if (insideWall(camera.position.x, camera.position.y, camera.position.z)) camera.position.set(cx, cy, cz);
  camera.lookAt(foc.x, vc && vc.kind === 'car' ? 1.25 : 1.45, foc.z);
  if (world.camFade) world.camFade(camera.position, { x: foc.x, y: 1.45, z: foc.z });
  if (!pingBlocked()) flushPings();
  applyShift(false); shift.x += (shiftT.x - shift.x) * (1 - Math.exp(-8 * dt)); shift.y += (shiftT.y - shift.y) * (1 - Math.exp(-8 * dt));
  if (Math.abs(shift.x) + Math.abs(shift.y) > .5) camera.setViewOffset(innerWidth, innerHeight, shift.x, shift.y, innerWidth, innerHeight); else if (camera.view && camera.view.enabled) camera.clearViewOffset();
  // time of day (4 Hz), sun follows the player
  timeT += dt; if (timeT > .25) { timeT = 0; const box = world.campus && world.campus.box; look.state.haze = !!(box && P.x > box.x0 && P.x < box.x1 && P.z > box.z0 && P.z < box.z1); look.applyTime(hourNow(), yearFrac()); }
  if (S && S.alive && !document.hidden) { const due = L.tickAge(S, dt); paintExamHud(); if (S.notice) { const n = S.notice; S.notice = ''; toast(n); showYear([n]); hud(); saveLocal(); } if (due && !modalOpen) ageUp(); }
  if (S && S.alive && !document.hidden && L.accruePay(S, clockNow())) { if (S.notice) { const n = S.notice; S.notice = ''; toast(n); showYear([n]); } syncOwned(); hud(); saveLocal(); rentSync(); if (modalOpen && cur.place === 'finances') refresh(); }
  if (world && world.boards && boardSlides.length) { boardT += dt; if (boardT >= 8) { boardT = 0; boardI = (boardI + 1) % boardSlides.length; applySlide(); if (world.rich && world.rich.next) world.rich.next(); paintRichest(false); } }
  if (S && S.hh && world.homes && S.hh.home.type !== world.homes.current) { if (indoors) leaveHome(); world.homes.place(S); }
  if (S && S.alive && !modalOpen && !mapOn && !(chat && chat.current) && !ride && !pending && S.fin && S.fin.advice.length) adviceCard();
  look.followSun(P.x, P.z); world.update(reduce ? 0 : t);
  if (world.stream) world.stream.step(P.x, P.z);
  if (crowd) updatePeople(dt);
  if (campus.length) updateCampus(dt, t);
  if (S && S.alive) maybeApproach(dt);
  if (ambient) ambient.update(dt, t, pedsNow());
  if (ambient && S && S.alive && !P.sit && !ride && !chatting) {
    P.hitCd = Math.max(0, (P.hitCd || 0) - dt);
    if (P.hitCd <= 0) for (const v of ambient.vehicles) {
      if (v.v < .85) continue; const dx = P.x - v.x, dz = P.z - v.z, lx = dx * Math.cos(v.h) - dz * Math.sin(v.h), lz = dx * Math.sin(v.h) + dz * Math.cos(v.h);
      if (Math.abs(lx) < v.hw + .35 && Math.abs(lz) < v.hl + .35) { struck(v); break; }
    }
  }
  // interaction target
  near = null; let best = 99;
  if (indoors && world.interior && world.interior.on) {
    const st = world.interior.meta.stand;
    if (Math.hypot(P.x - st.x, P.z - st.z) > 9) leaveHome();
    else for (const s of world.interior.spots) {
      const d = Math.hypot(P.x - s.x, P.z - s.z);
      if (d < s.r && d < best) { best = d; near = { text: s.text, act: s.kind === 'sleep' ? doSleep : s.kind === 'eat' ? () => { const r = L.eatHome(S); toast(r.msg); hud(); saveLocal(); } : s.kind === 'out' ? leaveHome : s.kind === 'budget' ? () => openPlace('home') : () => openKin(s.who) }; }
    }
  }
  if (!indoors) for (const p of world.places) { if (p.id === 'casino' || !p.r) continue; const d = Math.hypot(P.x - p.x, P.z - p.z); if (d < p.r && d < best) { best = d; near = { place: p.id, text: p.verb }; } }
  if (world.lots && S) {
    let ld = 8;
    for (const lot of world.lots) {
      const d = Math.hypot(P.x - lot.x, P.z - lot.z);
      if (d < ld && d < best) { ld = d; const v = L.lotView(S, lot); near = { lot: lot.id, text: v.own ? 'Your lot' : v.holder === 'sale' ? 'Empty lot, for sale' : 'Lot held by ' + v.who.split(' ')[0] }; best = d; }
    }
  }
  if (!indoors) for (const p of allFolk()) { if (p.vanish > performance.now()) continue; const d = Math.hypot(P.x - p.pos.x, P.z - p.pos.z); if (d < 3.3 && d < best) { best = d; near = { npc: p.id, text: 'Talk to ' + p.cast.name.split(' ')[0] }; } }
  if (!indoors) for (const [id, o] of others) { if (String(id).endsWith('_pending') || !o.root) continue; const d = Math.hypot(P.x - o.root.position.x, P.z - o.root.position.z); if (d < 3.6 && d < best) { best = d; near = { player: id, text: 'Talk to ' + (o.name || 'them') }; } }
  if (P.sit) near = { stand: true, text: 'Stand up' }; else if (!indoors) for (const s of seats) { const d = Math.hypot(P.x - s.x, P.z - s.z); if (d < 1.9 && d < best) { best = d; near = { seat: s, text: 'Sit down' }; } }
  if (ride) near = veh.phase === 'ride' ? { rideOff: true, text: ride.kind === 'car' ? 'Get out' : 'Get off' } : null;
  else if (veh && !P.sit) { const v = veh.nearest(P.x, P.z); if (v) { const rec = vehRec(v), go = v.kind === 'car' ? 'Drive' : 'Ride'; near = { rideOn: v, text: rec ? `${go} ${rec.family ? 'the family' : 'your'} ${v.kind === 'car' ? 'car' : rec.model === 'scooter' ? 'scooter' : VEH_NAME[v.kind]}` : `Rent the ${VEH_NAME[v.kind]} · ${mon(rentQuote(v.kind).fee)}` }; } }
  if (world.casino) world.casino.frame(dt, { P, S, modalOpen, mapOn });
  const pr = $('#prompt'); if (near && !modalOpen && !mapOn && S && !chatting && !document.body.classList.contains('seated')) { pr.hidden = false; const tx = (touch ? 'Tap: ' : 'E / tap: ') + near.text; if (pr.textContent !== tx) pr.textContent = tx; } else pr.hidden = true;
  let payer = null, pd = 4.2;
  for (const [id, o] of others) { if (String(id).endsWith('_pending')) continue; const d = Math.hypot(P.x - o.root.position.x, P.z - o.root.position.z); if (d < pd) { pd = d; payer = { id, name: o.name || 'them' }; } }
  const bp = $('#bPay'); if (payer && S && S.alive && !modalOpen && !mapOn && !chatting) { bp.hidden = false; bp.textContent = 'Give ' + payer.name; bp.dataset.id = payer.id; bp.dataset.nm = payer.name; } else bp.hidden = true;
  clockT += dt; if (clockT > .5) { clockT = 0; const h = hourNow(), hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    if (S) { L.ensureLife(S); paintAge(); const blk = BLOCK_NAME[S.plan[hh]] || '';
      if (hourMark == null) hourMark = hh; else if (hh !== hourMark && S.alive) { hourMark = hh; const out = L.applyHour(S, hh); if (out.lines.length) { toast(out.lines[0]); showYear(out.lines); } hud(); saveLocal(); }
      if (S.alive) { const ev = Hosp.tick(S, clockNow()); if (ev) { toast(ev.msg); showYear([ev.msg]); if (ev.healed && cur.place) refresh(); hud(); saveLocal(); } missionSync(); dateTick(); arriveTick(); tourTick(); }
      $('#clock').textContent = dayLine(hh, mm, blk); const money = $('#money'); if (money) money.textContent = moneyLine(S); paintHealth(); paintInjury(); layoutHud(); }
    else $('#clock').textContent = dayLine(hh, mm, ''); }
  // network
  for (const [id, o] of others) { const x0 = o.root.position.x, z0 = o.root.position.z; o.root.position.x += (o.tx - x0) * Math.min(1, dt * 10); o.root.position.z += (o.tz - z0) * Math.min(1, dt * 10); o.root.position.y = PAVE_Y; let d = o.try - o.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); o.root.rotation.y += d * Math.min(1, dt * 10);
    const sp = Math.hypot(o.root.position.x - x0, o.root.position.z - z0) / Math.max(dt, 1e-3); o.speed += (sp - o.speed) * Math.min(1, dt * 8); o.av.update(dt, o.speed < .2 ? 0 : o.speed, o.an === 'sit'); }
  netT += dt; if (netT > .1 && S) { netT = 0; send({ t: 'pos', w: '2', x: +P.x.toFixed(2), z: +P.z.toFixed(2), r: +P.ry.toFixed(2), a: P.an || 'idle', age: S.age, adult: S.matureRomance ? 1 : 0, v: ride ? 1 : 0, ind: indoors ? 1 : 0 }); }
  if (social) social.place();
  if (escort && escort.lead) paintGuide();
  if (live) live.tick(dt);
  if (mapOn || (modalOpen && modal.still)) { if (still++) return; } else still = 0;   // one last frame, then nothing behind the map or a full sheet
  renderer.info.reset();
  composer ? composer.render(dt) : renderer.render(scene, camera);
  if (world.stream) world.stream.note(renderer);
}


// ---------- multiplayer ----------
const _pv = new THREE.Vector3();
let holdNet = false;
const social = createSocial({
  $: $, send, getS: () => S, myId, toast, showPhone, save: () => saveLocal(), hud, money: (n) => (S ? L.money(S, n) : String(n)), fromUsd: (n) => (S ? L.fromUsd(S, n) : Math.round(+n || 0)), esc, opt, head,
  camera: () => camera, canvas, project: (x, y, z) => _pv.set(x, y, z).project(camera),
  posOf(id) {
    if (id === 'me') { if (!me || !me.root) return null; return { x: me.root.position.x, y: me.root.position.y + 1.9, z: me.root.position.z }; }
    const o = others.get(id); if (!o || String(id).endsWith('_pending') || !o.root) return null;
    return { x: o.root.position.x, y: o.root.position.y + 1.9, z: o.root.position.z };
  },
  listPlayers() { const out = []; for (const [id, o] of others) { if (String(id).endsWith('_pending') || !o.root) continue; out.push({ id, name: o.name || 'Player' }); } return out; },
  nameOf: (id) => { const o = others.get(id); return (o && o.name) || ''; }
});
function connect() {
  if (holdNet) return;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'; ws = new WebSocket(`${proto}://${location.host}/ws`);
  ws.onopen = () => { $('#online').classList.add('on'); if (S) hello(); };
  ws.onclose = () => { $('#online').classList.remove('on'); $('#online').textContent = 'offline'; for (const [, o] of others) scene.remove(o.root); others.clear(); if (!holdNet) setTimeout(connect, 2000); };
  ws.onmessage = async ev => {
    const m = JSON.parse(ev.data);
    social.hear(m);
    if (m.t === 'online') onOnline(m);
    if (m.t === 'giftok' && giftWait && m.amt === giftWait.amt && S) { const g = giftWait; giftWait = null; spendAll(g.amt); S.feed.unshift({ age: S.age, text: `You gave ${g.name} ${L.money(S, g.amt)}.` }); if (S.feed.length > 220) S.feed.length = 220; hud(); saveLocal(); toast('Given to ' + g.name + '.'); }
    if (m.t === 'giftfail' && giftWait) { giftWait = null; toast('They are not here to take it.'); }
    if (m.t === 'gift' && S) { const amt = +m.amt || 0; if (amt > 0) { S.cash += amt; S.feed.unshift({ age: S.age, text: `${m.name || 'Someone'} gave you ${m.label || amt}.` }); if (S.feed.length > 220) S.feed.length = 220; hud(); saveLocal(); toast((m.name || 'Someone') + ' gave you ' + (m.label || amt) + '.'); } }
    if (m.t === 'state' && m.state && S && m.state.ts > (S.ts || 0)) {
      const offers = S.offers, note = m.state.notice, kept = (S.dates && S.dates.inbox) || [];
      const had = new Set(kept.map((x) => x && x.text));
      S = m.state; S.pid = myId; S.notice = ''; if (offers) S.offers = offers;
      if (!S.dates || typeof S.dates !== 'object') S.dates = { list: [], bonds: {}, inbox: [] };
      if (!Array.isArray(S.dates.inbox)) S.dates.inbox = [];
      const have = new Set(S.dates.inbox.map((x) => x && x.text));
      for (const row of kept) if (row && row.text && !have.has(row.text)) S.dates.inbox.unshift(row);
      if (S.dates.inbox.length > 30) S.dates.inbox.length = 30;
      const fresh = S.dates.inbox.filter((x) => x && x.text && !had.has(x.text));
      if (fresh.length) showPhone(fresh[0]);
      hud(); if (world && world.paintLots) world.paintLots(S); if (note) toast(note);
    }
    if (m.t === 'deeds') { L.setDeeds(m.lots || {}); if (world && world.paintLots && S) world.paintLots(S); }
    if (m.t === 'letters' && S && m.lines && m.lines.length) { toast(m.lines[0]); showYear(m.lines); }
    if ((m.t === 'rentboard' || m.t === 'rentstate') && S) applyRent(m);
    if (m.t === 'rentno' && S) { toast(m.msg || 'The rental office could not do that.'); if (m.board) { S.rentBoard = m.board; rentPull = 0; if (modalOpen && cur.place === 'rentals') refresh(); } }
    if (m.t === 'claimok' && S) { const r = L.buyLot(S, m.lot); if (r.ok) Ms.note(S, 'bought'); if (!r.ok && !(S.land && S.land.own.includes(m.lot))) send({ t: 'release', lot: m.lot }); cur.r = r; missionSync(); refresh(); }
    if (m.t === 'claimfail') toast((m.name || 'Someone') + ' already holds that. Send an offer.');
    if (m.t === 'offerfail' && m.msg) toast(m.msg);
    if (m.t === 'offerin' && S) { S.offers = S.offers || []; S.offers = S.offers.filter(b => !(b.lot === m.lot && b.bidder === m.bidder)); S.offers.push({ lot: m.lot, bidder: m.bidder, name: m.name || 'Someone', amt: m.amt }); toast((m.name || 'Someone') + ' offers ' + L.money(S, m.amt) + ' for your land.'); if (cur.lot === m.lot) refresh(); }
    if (m.t === 'snap') {
      const ids = new Set(Object.keys(m.p)); $('#online').textContent = (ids.size) + ' online';
      for (const id of ids) { if (id === myId) continue; const p = m.p[id]; let o = others.get(id);
        if (!o) { if (others.has(id + '_pending')) continue; others.set(id + '_pending', 1); const c = makeChar(p.av ? Av.agedLook(p.av, p.age, 40) : Av.npcLook({ id, age: p.age, gender: 'man' }), p.n, 'age ' + p.age); others.delete(id + '_pending'); c.tx = p.x; c.tz = p.z; c.try = p.r; c.root.position.set(p.x, 0, p.z); others.set(id, c); o = c; }
        o.tx = p.x; o.tz = p.z; o.try = p.r; o.an = p.a; o.name = p.n; o.veh = p.v ? 1 : 0; o.ind = p.ind ? 1 : 0; }
      for (const [id, o] of others) if (!ids.has(id) && !id.endsWith('_pending')) { scene.remove(o.root); others.delete(id); }
      if (playerReady && !snapOnce) { snapOnce = true; const n = [...ids].filter((id) => id !== myId).length; if (n) toast(n === 1 ? '1 person online' : n + ' people online'); }
    }
  };
}
function hello() {
  L.ensureLife(S);
  const key = L.monthIndex(S);
  if (S.fin && (typeof S.fin.key !== 'number' || S.fin.key >= L.Fin.WORLD_KEY)) S.fin.key = key;
  rentAt = key;
  send({ t: 'hello', w: '2', id: myId, name: S.name, look: S.look, country: S.country, state: S, ts: S.ts || 0 });
  send({ t: 'rentmonth', key });
}


// ---------- start ----------
function startScreen() {
  const names = Object.keys(L.COUNTRIES); const saved = readStore();
  const cont = saved && saved.alive ? `<div class="opts one">${opt('cont', 'Continue as ' + esc(saved.name), `Age ${saved.age} · ${saved.country} · ${L.money(saved, saved.cash)}`, 'saved')}</div><div class="hdr">Or start a new life</div>` : '';
  modal(`<div class="start"><h2>🌍 Welcome to Sansar</h2><div class="sub">A shared town. Live a whole life. Pick where it begins.</div>${cont}
    <label>Your name</label><input id="nm" maxlength="14" value="${esc(saved ? saved.name : myName)}" placeholder="Name" autocomplete="off">
    <label>Born in</label><select id="co">${names.map(n => `<option>${n}</option>`).join('')}</select>
    <a class="btn" href="/world/create" style="display:flex;align-items:center;justify-content:center;margin-top:12px;text-decoration:none;color:inherit">Change my character</a>
    <div class="opts one" style="margin-top:14px"><button class="btn gold big" id="go">Start living</button></div></div>`);
  pending = { opts: [] }; // blocks backdrop-close
  $('#go').onclick = async () => {
    const btn = $('#go'); if (btn) btn.disabled = true;
    const nm = ($('#nm').value || '').trim() || 'Resident';
    let circ = qs.get('birth') || undefined; if (circ === 'mansion') circ = 'wealthy'; let birth = null;
    try {
      const r = await fetch('/api/birth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ force: circ, model: true }), signal: AbortSignal.timeout(8000) });
      birth = await r.json();
    } catch (e) { birth = null; }
    try { const life = L.newLife({ name: nm, country: $('#co').value, look: 'a', circ, birth: birth && birth.circ ? birth : null }); life.tour = { stage: 'meet', friend: TOUR_FRIEND[myLook && myLook.g === 'f' ? 'f' : 'm'] }; await begin(life); }
    catch (e) { console.error(e); if (btn) btn.disabled = false; }
  };
  const c = document.querySelector('[data-a=cont]'); if (c) c.onclick = async () => { try { await begin(saved); } catch (e) { console.error(e); } };
}
async function begin(state) {
  playerReady = false; parcelWp = false; tourOpen = '';
  S = state; S.pid = myId; L.ensureLife(S); if (world && world.paintLots) world.paintLots(S); pending = null; closeModal(); $('#hud').hidden = false; hud();
  if (veh) veh.abort(); if (veh) { for (const v of veh.list.filter((q) => q.owned)) veh.remove(v); syncOwned(); }
  if (ctl && phoneHud() && S.hh && S.hh.story && !ctl.seen('foot')) ctl.card('Your story', S.hh.story, () => ctl.hint('foot'));
  else if (ctl) setTimeout(() => ctl.hint('foot'), 2500);
  if (me) scene.remove(me.root); P.sit = null; me = makeChar(wearAge(), S.name, ''); P.x = 4; P.z = 20; yaw = -.46; if (indoors) leaveHome(); if (world.homes) world.homes.place(S);
  try {
    if (me.av && me.av.built) await me.av.built;
    await renderer.compileAsync(me.root, camera, scene);
    if (me.av && me.av.update) { me.av.update(0.05, 1.4, false); me.av.update(0.05, 0, false); if (me.av.setSeat) me.av.setSeat(0.46); me.av.update(0.05, 0, true); }
    const cycle = veh && veh.list && veh.list.find((q) => q.kind === 'cycle');
    const px = P.x, pz = P.z, ph = P.ry;
    if (cycle && veh.mount(cycle, me, P)) { for (let i = 0; i < 16; i++) veh.step(0.08, { throttle: i < 8 ? 0 : 1, steer: 0.2, brake: i < 8, horn: false }, P); }
    if (cycle && cycle.mesh) await renderer.compileAsync(cycle.mesh, camera, scene);
    if (veh) veh.abort();
    P.x = px; P.z = pz; P.ry = ph; P.vx = P.vz = 0; me.root.position.set(px, PAVE_Y, pz);
    if (me.av && me.av.update) me.av.update(0.05, 0, false);
  } catch (e) { if (veh) veh.abort(); }
  try {
    const px0 = P.x, pz0 = P.z;
    for (const dz of [0, -6, -12]) {
      P.z = pz0 + dz; foc.x = P.x; foc.z = P.z;
      camera.position.set(P.x + 1.6, 2.6, P.z + 5.2);
      camera.lookAt(P.x, 1.3, P.z);
      if (world.stream) world.stream.step(P.x, P.z);
      await new Promise((r) => setTimeout(r, 120));
      await renderer.compileAsync(scene, camera);
    }
    P.x = px0; P.z = pz0; foc.x = px0; foc.z = pz0; P.vx = P.vz = 0;
    camera.position.set(px0, 3.2, pz0 + 6); camera.lookAt(px0, 1.4, pz0);
    await new Promise((r) => setTimeout(r, 280));
  } catch (e) {}
  playerReady = true; window.__crowdAt = performance.now() + 2000;
  setTimeout(() => { const h = $('#chatHint'); h.hidden = false; setTimeout(() => h.style.opacity = 0, 7000); }, 800); saveLocal(); hello();
  showYear(S.feed.slice(0, 2).map(f => f.text));
  armLate(); fetchBoard();
}
// the HDR sky, normal/roughness maps and Poly Haven props load after the first touch in the world
let lateOn = false;
const worldBusy = () => window.__watch || keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD || document.body.classList.contains('riding') || document.body.classList.contains('sheeting');
function whenQuiet() { return worldBusy() ? new Promise((r) => setTimeout(r, 400)).then(whenQuiet) : Promise.resolve(); }
function loadLate() {
  if (lateOn || !world) return;
  if (worldBusy()) { setTimeout(loadLate, 600); return; }
  lateOn = true; window.__lateAt = performance.now();
  look.upgrade();
  Promise.all([look.loadSky(), world.loadProps((g) => whenQuiet().then(() => renderer.compileAsync(g, camera, scene)))]).then(() => whenQuiet()).then(() => { window.__late = true; }).catch((e) => console.warn('late assets', e));
}
function armLate() {
  const go = (e) => {
    const t = e && e.target;
    if (e && e.isTrusted === false) return;
    if (e && e.type === 'keydown' && !/^(KeyW|KeyA|KeyS|KeyD|ArrowUp|ArrowDown|ArrowLeft|ArrowRight)$/.test(e.code || '')) return;
    if (t && t.closest && t.closest('#layer, #modal, #hud, button, a, input, select, textarea')) return;
    window.__lateWhy = (e && e.type) ? e.type + ':' + (e.code || '') + ':' + ((t && (t.id || t.tagName)) || '') + (e.isTrusted ? ':trusted' : ':script') : 'timer';
    removeEventListener('pointerdown', go, true); removeEventListener('keydown', go, true); loadLate();
  };
  addEventListener('pointerdown', go, true); addEventListener('keydown', go, true); setTimeout(go, touch ? 120000 : 30000);
}

// ---------- boot ----------
(async function boot() {
  try {
    const t0 = performance.now();
    await Av.init(manager); const mine = await loadMyAvatar();
    if (!mine && !qs.has('noav')) { location.replace('/world/create'); return; }
    myLook = Av.fixLook(mine ? mine.look : Av.npcLook({ id: myId, gender: 'man', age: 30 })); myName = (mine && mine.name) || localStorage['sansar.name'] || '';
    look.quickSky();
    world = await buildWorld({ scene, look, manager, touch, onProgress: p => { buildPart = p; setBar(); } });
    live = createLiveMap({
      scene, THREE, world, rows: mapRows, placeById, player: () => P, yaw: () => yaw, mapOpen: () => mapOn, goPlace, toast, onArrive: arriveAt, holdArrive: () => !!(escort && escort.lead),
      people() {
        const out = [];
        if (crowd) for (const p of crowd.people) if (p.root && p.root.visible && p.pos) out.push(p.pos);
        for (const p of campus) if (p.root && p.root.visible) out.push(p.pos || { x: p.root.position.x, z: p.root.position.z });
        for (const [id, o] of others) if (!String(id).endsWith('_pending') && o.root) out.push({ x: o.root.position.x, z: o.root.position.z });
        return out;
      }
    });
    if (world.casino) world.casino.bind({
      land: (x, z, h) => landAt(x, z, h), toast, hud, save: saveLocal, S: () => S, pid: myId, stand: () => standUp(),
      money(d) { if (S) Fin.book(S, d > 0 ? 'inc' : 'exp', 'other', Math.abs(d)); },
      life(text) { if (!S || !text) return; S.feed.unshift({ age: S.age, text }); if (S.feed.length > 220) S.feed.length = 220; showYear([text]); saveLocal(); }
    });
    const tW = performance.now() - t0;
    let students = [];
    try { const c = await fetch('/api/npc/cast').then(r => r.json()); const all = c.cast || []; cast = all.filter(x => x.workplace !== 'ait'); students = all.filter(x => x.workplace === 'ait'); } catch (e) { cast = []; }
    const nav = navMesh = makeNav(world.nav); crowd = buildPeople({ scene, cast, world, nav, route: (x0, z0, x1, z1) => live.route(x0, z0, x1, z1) }); initSeats(); spawnCampus(students);
    await Promise.race([Promise.all(crowd.people.concat(campus).map((p) => p.av.built)), new Promise((r) => setTimeout(r, 12000))]);
    try { await renderer.compileAsync(scene, camera); } catch (e) {}
    ambient = createAmbient({ scene, look, world, peds: pedsNow });
    ctl = createControls({ touch, onOff: () => dismount() });
    if (!createVehicles) { const vehMod = await import('./vehicles.js?v=stab1'); createVehicles = vehMod.createVehicles; untwist = vehMod.untwist; }
    veh = createVehicles({ scene, look, world, collide, PAVE_Y, phone: touch || innerWidth < 700, ambient: () => ambient && ambient.vehicles, people: allFolk, onExit: vehExit, onImpact: vehImpact, onPed: vehPed, onCost: (b, why, v) => vehPay(b, why, v), toast });
    const rideAt = {}; for (const r of world.rides || []) { rideAt[r.kind] = { x: r.mesh.position.x, z: r.mesh.position.z, h: r.mesh.rotation.y }; scene.remove(r.mesh); }
    const cyc = rideAt.cycle || { x: 9, z: 12, h: 0 }, mot = rideAt.moto || rideAt.bike || { x: 8, z: 8, h: 0 };
    veh.add('cycle', cyc.x, cyc.z, cyc.h); veh.add('moto', mot.x, mot.z, mot.h, { plate: 'BA 12 PA 3456' }); veh.add('car', mot.x - 4.2, mot.z + 1.2, mot.h, { plate: 'BA 2 CHA 7781' });
    world.rides = veh.list;
    chat = createChat({ pid: myId, getName: () => (S ? S.name : 'a visitor'), getCtx: npcCtx,
      onMood: (p, mood) => { if (!p || !p.label) return; p.mood = mood; retitle(p.label, p.cast.name.split(' ')[0], (p.cast.job || '').split(' ')[0], mood); },
      onAct: (p, act) => {
        const who = (p.cast.name || 'They').split(' ')[0];
        const grown = (v) => { const n = parseInt(String(v == null ? '' : v), 10); return Number.isFinite(n) && n >= 21; };
        const adultPath = !!(S && S.matureRomance && grown(S.age) && grown(p.cast && p.cast.age));
        if (act === 'bend') { if (!adultPath) return; act = 'private'; }
        if (act === 'private') {
          if (!adultPath) return;
          document.body.classList.add('fadeblack');
          if (S) { S.feed.unshift({ age: S.age, text: 'You and ' + who + ' grew closer.' }); if (S.feed.length > 220) S.feed.length = 220; saveLocal(); }
          setTimeout(() => document.body.classList.remove('fadeblack'), 1500);
          toast('The world goes quiet.'); return;
        }
        if (act === 'lead' || act === 'date') { beginGuide(p, p._leadKind || 'cafe', act === 'date'); return; }
        if (act === 'follow') { p.follow = true; p.lead = null; if (escort === p) escort = null; p.hold = null; p.hidden = false; toast(who + ' is with you.'); return; }
        if (act === 'wait') { p.follow = false; p.lead = null; if (escort === p) escort = null; p.hold = { x: p.pos.x, z: p.pos.z }; p.holdFar = 0; toast(who + ' will wait here.'); return; }
        if (act === 'wave') { p.av && p.av.wave(); toast(who + ' waves.'); return; }
        if (act === 'stand') { p.pose = ''; p.poseUntil = 0; if (p.av) p.av.pose = ''; toast(who + ' is up.'); return; }
        if (act === 'kiss' || act === 'hug') {
          const dx = P.x - p.pos.x, dz = P.z - p.pos.z, dist = Math.hypot(dx, dz) || 1, gap = 0.9;
          const nx = P.x - dx / dist * gap, nz = P.z - dz / dist * gap;
          p.meet = { x: nx, z: nz }; p.pos.x = nx; p.pos.z = nz;
        }
        const ms = { sit: 0, dance: 8000, kiss: 1800, hug: 1800, kneel: 8000 };
        if (ms[act] == null) return;
        p.pose = act; p.poseUntil = ms[act] ? performance.now() + ms[act] : 0; if (p.av) p.av.pose = act;
        if (act === 'kneel' && adultPath) {
          document.body.classList.add('fadeblack');
          if (S) { S.feed.unshift({ age: S.age, text: 'You and ' + who + ' grew closer.' }); if (S.feed.length > 220) S.feed.length = 220; saveLocal(); }
          setTimeout(() => { document.body.classList.remove('fadeblack'); if (p.pose === 'kneel') { p.pose = ''; p.poseUntil = 0; if (p.av) p.av.pose = ''; } }, 1500);
        }
        toast(who + (act === 'kneel' ? ' kneels.' : act === 'sit' ? ' sits.' : act === 'dance' ? ' dances.' : ' comes closer.'));
      },
      onOpen: p => { if (!p) return; if (modalOpen) closeModal(); document.body.classList.add('chatting'); p.chat = true; chatFocus = p; layoutHud(); setTimeout(() => { if (p.mood === 'angry') return; if (p.mood === 'flirt' && !p.pose) p.av.lean = .16; if (me) me.av.wave(); if (p.state && p.state.mode !== 'sit') p.av.wave(); }, 450); pickChatYaw(p); distBefore = dist; $('#chatHint').hidden = true; applyShift(false); }, onClose: p => { document.body.classList.remove('chatting'); if (p) { p.chat = false; p.meet = null; p.started = false; } chatFocus = null; dist = Math.max(dist, distBefore || dist); layoutHud(); if (ctl) ctl.nudge(); setTimeout(refreshKnown, 1500); },
      onAppt: (p, j) => { if (!S || !j) return; const adult = !!(S.matureRomance && (S.age | 0) >= 21 && parseInt(p.cast && p.cast.age, 10) >= 21); Ap.add(S, { npc: p.id, name: p.cast.name, place: j.place, say: j.say, map: j.map, day: j.day, hour: j.hour, kind: j.kind, aff: j.aff, bond: j.bond, adult }); saveLocal(); paintMission(); },
      onPromise: (p, text, st) => { if (!S) return null; const what = Ap.intent(text); if (!what || what === 'meet') return null; const b = Ap.bond(S, p.id); if (b.fresh) Ap.seedBond(S, p.id, { aff: st.aff, bond: st.bond === 'partner' ? 'dating' : (st.bond || ''), name: p.cast.name }); const hit = Ap.localLine(S, { npc: p.id, name: p.cast.name, text, now: { day: Math.floor(clockNow() / DAY), hour: hourNow() } }); if (!hit) return null; hit.label = Ap.label(hit.aff, Ap.bond(S, p.id).bond); if (hit.fact) postPromise(p.id, hit); saveLocal(); paintMission(); return hit; } });
    look.applyTime(hourNow(), yearFrac()); setupPost(); resize();
    crowd.people.forEach(p => p.root.visible = false);
    camera.position.set(4, 4, 28); updatePeople(0.016);
    await renderer.compileAsync(scene, camera);
    buildPart = 1; loadPart = 1; setBar();
    connect(); requestAnimationFrame(frame);
    try { const r = await fetch('/api/resident?id=' + myId).then(r => r.json()); if (r.state && !localStorage[STORE]) localStorage[STORE] = JSON.stringify(r.state); } catch (e) {}
    setTimeout(() => { $('#load').style.opacity = 0; setTimeout(() => $('#load').remove(), 700); startScreen(); }, 250);
    console.log('world ready in', Math.round(performance.now() - t0), 'ms (assets+build', Math.round(tW), 'ms)', 'npcs', crowd.people.length);
    window.__ready = true;
  } catch (e) { console.error(e); const p = document.querySelector('#load p'); if (p) p.textContent = 'Could not load: ' + e.message; window.__err = String(e && e.stack || e); }
  window.__game = { P, get S() { return S; }, get world() { return world; }, get crowd() { return crowd; }, get chat() { return chat; }, get ambient() { return ambient; }, look, camera, renderer, scene, others, L, composer: () => composer, tp(x, z) { P.x = x; P.z = z; foc.x = x; foc.z = z; }, get me() { return me; }, get seats() { return seats; }, sitDown, standUp, Av,
    setHour(h) { frozen = null; clockOff = h / 24 * DAY - ((Date.now() / 1000) % DAY); }, freeze(v) { frozen = v ? clockNow() : null; }, folk: allFolk, get realm() { return realm; },
    hour: hourNow, clock: clockNow, skip(sec) { clockOff += sec; if (frozen != null) frozen += sec; }, Hosp, crashHurt, struck, goHospital, feed, get modalStill() { return !!(modalOpen && modal.still); }, get still() { return still; }, ageUp, interact, get near() { return near; }, openActivities, openPlace, setView(y, p, d) { yaw = y; if (p !== undefined) pitch = p; if (d) dist = d; lookT = 0; }, talk, hoverFix(p) { hover = p; },
    get stream() { return world && world.stream; }, loadLate, get veh() { return veh; }, hideMe(h) { if (me) me.root.visible = !h; }, get ctl() { return ctl; }, keys, get yaw() { return yaw; }, get pitch() { return pitch; }, get dist() { return dist; }, project: (x, y, z) => _pv.set(x, y, z).project(camera),
    setWp(x, z, id) { if (live) live.setWaypoint(x, z, id || ''); }, openLot, mapFit() { if (live) live.fit(); }, mapZoom(x, z, ppm) { if (live) live.zoom(x, z, ppm); },
    route(x0, z0, x1, z1) { return routeTo(x0, z0, x1, z1); }, onPath(x, z, pad) { return !!(live && live.onPath && live.onPath(x, z, pad)); }, fieldSlow,
    rushGuide() { const p = escort; if (!p || !p.lead) return { done: true, n: 0 }; let n = 0; while (p.lead && n++ < 900) { stepLead(p, 1.5); pullPlayer(p); } return { done: !p.lead, n, x: +p.pos.x.toFixed(1), z: +p.pos.z.toFixed(1) }; },
    Ap, openCalendar, bookMeet(id, text, aff, bond) { const p = findPerson(id); const now = { day: Math.floor(clockNow() / DAY), hour: hourNow() }; return Ap.agreeText(S, { npc: id, name: (p && p.cast && p.cast.name) || id, text, now, aff, bond, adult: !!(S && S.matureRomance && (S.age | 0) >= 21) }); },
    dateTick, pauseDates(v) { datePause = !!v; }, jump(day, hour) { const target = day * DAY + (hour / 24) * DAY; frozen = target; clockOff = target - Date.now() / 1000; const ev = dateTick(); paintMission(); return ev; },
    rushErrand(id) { const p = findPerson(id); if (!p || !p.errand) return { done: true, wait: !!(p && p.errand && p.errand.wait) }; let n = 0; while (p.errand && !p.errand.wait && n++ < 1200) stepErrand(p, 1.5); if (p.root) p.root.position.set(p.pos.x, PAVE_Y, p.pos.z); return { wait: !!(p.errand && p.errand.wait), x: +p.pos.x.toFixed(1), z: +p.pos.z.toFixed(1), n }; },
    guide() { const el = $('#guide'); return el && !el.hidden ? el.textContent : ''; }, person(id) { return findPerson(id); },
    enterHome, leaveHome, frameHome, get indoors() { return indoors; },
    wpView() { return live ? live.view() : null; }, get wp() { return live ? live.info() : null; }, tourStep, get tourOpen() { return tourOpen; }, get richRows() { return lastRows; }, get myLook() { return myLook; }, openMap, closeMap, Fin, openFinances, adviceCard, syncOwned, Ms, Mkt, openMissions, missionGo, worldDay, get slides() { return boardSlides; }, pullBoard, careerPing, camInWall() { return insideWall(camera.position.x, camera.position.y, camera.position.z); }, get faceReady() { return !!window.__faceReady; },
    get playerReady() { return playerReady; },
    id: myId, say(text) { social.say(text); }, dm(id, text) { social.dm(id, text); }, block(id) { social.block(id, 1); },
    bond(id, ask) { social.ask(id, ask); }, bondYes(id, ask) { social.yes(id, ask); }, stage(id) { return social.stage(id); },
    drop() { holdNet = true; try { if (ws) ws.close(); } catch (e) {} }, reconnect() { holdNet = false; connect(); }, save: saveLocal, blocks: social.blocks };
})();
