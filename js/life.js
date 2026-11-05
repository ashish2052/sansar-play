// Sansar life engine: pure logic, no DOM, no AI. Every call is synchronous (<1 ms).
import { COUNTRIES, EVENTS, CHOICES, ACTIVITIES, JOBS, COURSES, BUSINESSES, TRACKS, COMPANIES } from './content.js?v=careers2';
import { BIRTH } from './births.js?v=birth1';
import * as Fin from './finance.js?v=payday1';
import { drawExam, bankSize, subjectOf } from './exam_bank.js?v=exam1';
export { COUNTRIES, ACTIVITIES, JOBS, COURSES, BUSINESSES, BIRTH, Fin, COMPANIES };

const clamp = v => Math.max(0, Math.min(100, Math.round(v)));
export const K = s => COUNTRIES[s.country].price * COUNTRIES[s.country].rate; // price scale: base $ -> local
export const W = s => COUNTRIES[s.country].wage * COUNTRIES[s.country].rate;  // wage scale
const loc = (s, base) => { const v = base * K(s); return v > 200 ? Math.round(v / 5) * 5 : Math.round(v); };
export function money(s, v) { return Fin.money(s, v); }
export const fromUsd = (s, usd) => Fin.fromUsd(s, usd);
export const usdOf = (s, local) => Fin.usdOf(s, local);
const pick = (a, r) => a[Math.floor(r() * a.length)];
const fillText = (s, t) => t.replace(/\{(\d+)\}/g, (_, n) => money(s, loc(s, +n)));

// circ forces a circumstance (the ?birth= test flag); birth is a life written by /api/birth (re-checked here).
export function newLife({ name, country = 'USA', look = 'a', circ, birth }, r = Math.random) {
  if (circ === 'mansion') circ = 'wealthy'; // ?birth=mansion is the wealthy house, not its own bracket
  const c = COUNTRIES[country] || COUNTRIES.USA, last = pick(c.last, r);
  if (!COUNTRIES[country]) country = 'USA';
  const s = {
    v: 1, name, country, look, age: 18, cash: 0, H: 60 + Math.floor(r() * 25), L: 60 + Math.floor(r() * 30),
    S: 40 + Math.floor(r() * 40), B: 40 + Math.floor(r() * 45), job: null, deg: [], school: null, pet: false,
    mom: { n: c.mom + ' ' + last, rel: 70, alive: true }, dad: { n: c.dad + ' ' + last, rel: 65, alive: true },
    fds: [], bank: 0, feed: [], time: 5, alive: true, shifts: 0, rejected: [], used: [], asked: false, pension: 0, lastJob: null, ageLog: 0
  };
  const given = birth && BIRTH.brackets[birth.circ] && (!circ || birth.circ === circ) ? birth : null;
  const cc = given ? given.circ : BIRTH.brackets[circ] ? circ : rollCirc(r);
  const life = normBirth(given, cc, (given && given.seed) || birthSeed(r, cc), r);
  applyBirth(s, life, r);
  Fin.birthVehicles(s, cc, rng32(hashStr(name + '|' + country + '|wheels')));
  initLand(s);
  const hh = s.hh;
  say(s, `${name} is 18, just finished school in ${country}. Your life starts now.`);
  say(s, `${birthLabel(s)}. Home: ${hh.home.desc}`);
  if (hh.story) say(s, hh.story);
  const debt = hh.loans.reduce((a, l) => a + l.principal, 0);
  say(s, `The family has ${money(s, hh.purse)} put by${debt ? ` and owes ${money(s, debt)}` : ''}. They gave you ${money(s, s.cash)} to start${s.bank ? `, and ${money(s, s.bank)} sits in a bank account in your name` : ''}.`);
  if (s.birth === 'spoon') say(s, `${s.land.own.length} family lots are already in your name.`);
  else if (s.birth === 'ordinary') say(s, 'Your family holds land past the city. It becomes yours when they are both gone.');
  noteUnlocks(s);
  return s;
}
function say(s, text) { s.feed.unshift({ age: s.age, text }); if (s.feed.length > 220) s.feed.length = 220; }

// "H+3 L-2 $+40 @pet" -> applies, returns readable bits. cash base-scaled when scale=true
export function applyFx(s, fx, scale = true, w = false) {
  const out = [];
  for (const tok of (fx || '').split(/\s+/).filter(Boolean)) {
    if (tok === '@pet') { s.pet = true; out.push('🐾 pet'); continue; }
    const m = tok.match(/^([HLSB$])([+-]\d+)$/); if (!m) continue;
    let v = +m[2];
    if (m[1] === '$') { const amt = scale ? (w ? Math.round(v * W(s)) : loc(s, Math.abs(v)) * Math.sign(v)) : v; s.cash += amt; Fin.book(s, amt > 0 ? 'inc' : 'exp', 'other', Math.abs(amt)); out.push((amt >= 0 ? '+' : '') + money(s, amt)); }
    else {
      if (v > 0) v = Math.max(1, Math.round(v * (1 - s[m[1]] / 130)));
      s[m[1]] = clamp(s[m[1]] + v); if (m[1] === 'L' && v < 0) s.why = 'Run down - junk food and long days'; out.push(m[1] + (v >= 0 ? '+' : '') + v);
    }
  }
  return out;
}
const res = (ok, msg, fx = []) => ({ ok, msg, fx });
function useTime(s) { if (s.time <= 0) return false; s.time--; return true; }
const NOTIME = () => res(false, 'You are worn out. Age up for a fresh year of energy.');
const POOR = () => res(false, 'You cannot afford that.');
const purse = s => Math.max(0, s.cash || 0) + Math.max(0, s.bank || 0);
function spendAny(s, amt) {   // pocket first, then the bank; all or nothing
  if (!(amt > 0)) return true; if (purse(s) < amt) return false;
  const p = Math.min(Math.max(0, s.cash || 0), amt); s.cash -= p; s.bank = (s.bank || 0) - (amt - p); return true;
}
function charge(s, base) { const c = loc(s, base); return spendAny(s, c) ? c : false; }
// Fees: pocket first, then the bank.
function takeMoney(s, cost) {
  cost = Math.round(cost);
  if (!(cost > 0)) return { cost: 0, fromPocket: 0, fromBank: 0 };
  if (s.bank == null) s.bank = 0;
  const pocket = Math.max(0, s.cash || 0), bank = Math.max(0, s.bank || 0);
  if (pocket + bank < cost) return null;
  const fromPocket = Math.min(pocket, cost), fromBank = cost - fromPocket;
  s.cash -= fromPocket; s.bank -= fromBank;
  s.fees = (s.fees || 0) + cost; Fin.book(s, 'exp', 'edu', cost);
  return { cost, fromPocket, fromBank };
}
function feeWords(s, paid) {
  if (!paid.fromBank) return money(s, paid.cost) + ' from your pocket';
  if (!paid.fromPocket) return money(s, paid.cost) + ' from the bank';
  return money(s, paid.fromPocket) + ' from your pocket and ' + money(s, paid.fromBank) + ' from the bank';
}

// ---------- places ----------
export function eat(s, kind) {
  const menu = { healthy: [7, 'L+3 H+1', 'You eat a fresh, colourful plate. You feel light.'], junk: [4, 'H+3 L-2', 'Greasy, salty, glorious. Your arteries file a complaint.'], coffee: [3, 'H+1 S+1', 'A strong coffee sharpens your morning.'], treat: [15, 'H+5', 'You treat a friend to cake. They will remember it.'], rice: [4, 'H+2 L+1', 'Rice, a curry, and the canteen noise.'] }[kind];
  if (!s.alive) return res(false, 'Game over.'); if (s.time <= 0) return NOTIME();
  const c = charge(s, menu[0]); if (c === false) return POOR(); s.time--; Fin.book(s, 'exp', 'food', c);
  const fx = applyFx(s, menu[1]); fx.unshift('-' + money(s, c)); say(s, 'Cafe: ' + menu[2]); return res(true, menu[2], fx);
}
export function workout(s, kind) {
  const m = { cardio: [4, 'L+4 B+1 H+1', 'You run until your lungs burn. Then a little more.'], weights: [4, 'B+4 L+2', 'You lift, you grunt, you leave taller.'], yoga: [3, 'L+2 H+3', 'Slow breath, strong core, calm head.'] }[kind];
  if (s.time <= 0) return NOTIME();
  const member = Fin.isMember(s), c = member ? 0 : charge(s, m[0]); if (c === false) return POOR(); s.time--;
  if (c) Fin.book(s, 'exp', 'gym', c); Fin.exercise(s);
  const fx = applyFx(s, m[1]); fx.unshift(member ? 'members free' : '-' + money(s, c)); say(s, 'Gym: ' + m[2]); return res(true, m[2], fx);
}
export function studyHard(s) {
  if (s.time <= 0) return NOTIME(); s.time--; const fx = applyFx(s, 'S+4 H-1');
  say(s, 'You studied hard at the college library.'); return res(true, 'You hit the library and the books hit back. Smarter already.', fx);
}
export function classSit(s) {
  if (!s.school) return res(false, 'Enrol at SOM, SERD or SET first.');
  if (s.time <= 0) return NOTIME(); s.time--; const fx = applyFx(s, 'S+4 H-1');
  say(s, 'You sat a class at AIT.'); return res(true, 'A class, a whiteboard, and the hour gone.', fx);
}
export const EXAM_PASS = 60;
export const EXAM_N = 10;
export function examMark(s) {
  ensureLife(s);
  const sp = studyPower(s);
  const base = (s.grades || 40) * 0.62 + (s.S || 40) * 0.38;
  let mark = base;
  if (sp.eff < 2) mark -= (2 - sp.eff) * 12;
  else mark += Math.min(8, (sp.eff - 2) * 1.5);
  if ((s.S || 0) >= 75 && sp.eff >= 1) mark += 6;
  return clamp(mark);
}
export function courseYear(s) {
  const sch = s && s.school;
  if (!sch) return 0;
  const y = sch.yr | 0;
  return y < 1 ? 1 : y;
}
export function examPrompt(s) { return 'Year ' + courseYear(s) + ' exam ready - take it'; }
export function examHints(s) {
  const n = (s.school && s.school.studied) || 0;
  if (n >= 40) return 4;
  if (n >= 24) return 3;
  if (n >= 12) return 2;
  if (n >= 4) return 1;
  return 0;
}
function gameDay(s) {
  const c = Fin.calendar(s, Fin.YEAR_SEC);
  return (c.y | 0) * 372 + c.m * 31 + c.d;
}
export function retakeFee(s) {
  const base = Math.max(10, Math.round(((s.school && s.school.fee) || 200) * 0.05));
  return loc(s, base);
}
export function examDue(s) {
  if (!s || !s.alive || !s.school) return false;
  if (s.school.hold) return true;
  const late = Fin.calendar(s, Fin.YEAR_SEC).m >= 10;
  return late || (s.school.tries || 0) > 0;
}
function finishDegree(s) {
  const id = s.school.id;
  const course = COURSES.find(x => x.id === id);
  if (!(s.deg || []).includes(id)) s.deg.push(id);
  s.school = null;
  s.H = clamp(s.H + 8); s.S = clamp(s.S + 3);
  say(s, `You graduated with a ${id} ${course && course.cert ? 'qualification' : 'degree'}.`);
  noteUnlocks(s);
  return id;
}
function payHeldYear(s) {
  if (!s.school || !s.school.hold) return null;
  const cost = loc(s, s.school.fee || 0);
  const paid = cost > 0 ? takeMoney(s, cost) : { cost: 0, fromPocket: 0, fromBank: 0 };
  if (!paid) return res(false, 'You already passed. Year ' + (courseYear(s) + 1) + ' fee is ' + money(s, cost) + '. Pocket and bank are short.');
  s.school.yr = courseYear(s) + 1;
  s.school.hold = false; s.school.tries = 0; s.school.examDay = null; s.school.told = 0; s.school.paper = null;
  const msg = 'Year ' + courseYear(s) + ' of ' + s.school.id + '. Fee ' + (cost ? feeWords(s, paid) : 'none') + '.';
  say(s, msg);
  return res(true, msg, cost ? ['-' + money(s, cost)] : []);
}
export function openExam(s, rng = Math.random) {
  ensureLife(s);
  if (!s.alive) return res(false, 'Game over.');
  if (!s.school) return res(false, 'Enrol first. The exam is for a course.');
  if (s.school.hold) return payHeldYear(s);
  if (s.school.paper && s.school.paper.length === EXAM_N) {
    return { ok: true, msg: 'The paper is open.', paper: s.school.paper, fee: 0, year: courseYear(s), hints: examHints(s), resume: true };
  }
  const tries = s.school.tries || 0;
  const day = gameDay(s);
  const price = retakeFee(s);
  if (tries > 0 && s.school.examDay != null && day <= s.school.examDay) {
    return res(false, 'Next sitting is tomorrow. Retake ' + money(s, price) + '.');
  }
  let fee = 0;
  if (tries > 0) {
    const paid = takeMoney(s, price);
    if (!paid) return res(false, 'Retake is ' + money(s, price) + '. Pocket and bank are short.');
    fee = price;
  }
  if (!s.examSeen || typeof s.examSeen !== 'object') s.examSeen = {};
  const seen = s.examSeen[s.school.id] || [];
  const paper = drawExam(s.school.id, seen, rng, examHints(s));
  s.school.paper = paper;
  const msg = fee ? 'Retake ' + money(s, fee) + '.' : 'First sitting. It is included in the tuition.';
  return { ok: true, msg, paper, fee, year: courseYear(s), hints: examHints(s), price, fx: fee ? ['-' + money(s, fee)] : [] };
}
function wrongPick(item) {
  const j = item.opts.findIndex((o) => !o.ok);
  return j < 0 ? 0 : j;
}
export function submitExam(s, picks) {
  ensureLife(s);
  if (!s.alive) return res(false, 'Game over.');
  if (!s.school) return res(false, 'Enrol first. The exam is for a course.');
  const paper = s.school.paper;
  if (!paper || paper.length !== EXAM_N) return res(false, 'There is no paper open.');
  const chosen = (picks || []).map((n) => n | 0);
  let correct = 0;
  const wrong = [];
  for (let i = 0; i < paper.length; i++) {
    const item = paper[i];
    const pick = chosen[i];
    const hit = pick === item.correct;
    if (hit) correct++;
    else wrong.push({ id: item.id, q: item.q, yours: (item.opts[pick] && item.opts[pick].t) || 'blank', right: item.opts[item.correct].t });
  }
  const score = Math.round(correct / EXAM_N * 100);
  const id = s.school.id;
  const ids = paper.map((item) => item.id);
  if (!s.examSeen || typeof s.examSeen !== 'object') s.examSeen = {};
  s.examSeen[id] = ids;
  s.school.paper = null;
  s.school.tries = (s.school.tries || 0) + 1;
  s.school.examDay = gameDay(s);
  s.school.last = score;
  s.school.sat = -1;
  const price = retakeFee(s);
  if (correct < 6) {
    const msg = 'Exam ' + correct + ' of 10 (' + score + '%). Fail. Pass mark is 60%. You stay in year ' + courseYear(s) + '. Retake ' + money(s, price) + '.';
    say(s, msg);
    return { ok: false, msg, score, correct, wrong, ids, year: courseYear(s), fee: price, pass: false, fx: [] };
  }
  s.school.passes = (s.school.passes || 0) + 1;
  s.school.tries = 0;
  s.school.examDay = null;
  const y = courseYear(s);
  const need = s.school.of || 1;
  if (y >= need) {
    const got = finishDegree(s);
    const msg = 'Exam ' + correct + ' of 10 (' + score + '%). Pass. You have the ' + got + ' qualification.';
    say(s, msg);
    return { ok: true, msg, score, correct, wrong, ids, year: y, fee: 0, pass: true, graduated: got, fx: ['H+8'] };
  }
  const next = y + 1;
  const prev = s.school.yr;
  const cost = s.school.fee ? loc(s, s.school.fee) : 0;
  const paid = cost ? takeMoney(s, cost) : { cost: 0, fromPocket: 0, fromBank: 0 };
  if (!paid) {
    s.school.hold = true;
    const msg = 'Exam ' + correct + ' of 10 (' + score + '%). Pass. Year ' + next + ' fee is ' + money(s, cost) + '. Pocket and bank are short, so you stay until you can pay it.';
    say(s, msg);
    return { ok: false, msg, score, correct, wrong, ids, year: courseYear(s), fee: 0, pass: true, hold: true, fx: [] };
  }
  s.school.yr = next;
  s.school.hold = false;
  s.school.told = 0;
  void prev;
  const feeBit = cost ? ' Fee ' + feeWords(s, paid) + '.' : '';
  const msg = 'Exam ' + correct + ' of 10 (' + score + '%). Pass. Year ' + courseYear(s) + ' of ' + id + '.' + feeBit;
  say(s, msg);
  return { ok: true, msg, score, correct, wrong, ids, year: courseYear(s), fee: 0, pass: true, graduated: '', fx: cost ? ['-' + money(s, cost)] : [] };
}
export function sitExam(s, answers, rng = Math.random) {
  ensureLife(s);
  if (typeof answers === 'number') {
    const opened = openExam(s, rng);
    if (!opened.ok || !opened.paper) return opened.ok ? opened : opened;
    const n = Math.max(0, Math.min(EXAM_N, answers | 0));
    const picks = opened.paper.map((item, i) => (i < n ? item.correct : wrongPick(item)));
    return submitExam(s, picks);
  }
  if (Array.isArray(answers)) return submitExam(s, answers);
  return openExam(s, rng);
}
export { bankSize, subjectOf };
export function dormRest(s) {
  if (s.time <= 0) return NOTIME(); s.time--; const fx = applyFx(s, 'L+4 H+2');
  say(s, 'You slept in the Standard dorm.'); return res(true, 'The fan, the corridor, and a few hours of sleep.', fx);
}
function holds(s, deg) {
  if ((s.deg || []).includes(deg)) return true;
  const also = { Business: ['MBA', 'DBA', 'BBA', 'BBS'], BBA: ['Business', 'BBS', 'MBA', 'DBA'], BBS: ['Business', 'BBA', 'MBA', 'DBA'], Tech: ['IT', 'MScEng'], IT: ['Tech', 'MScEng'], MBA: ['DBA'], Medicine: ['MBBS'] };
  return (also[deg] || []).some(d => (s.deg || []).includes(d));
}
// Degree ladder. Smarts can make a player fast, never let them skip a rung.
// Old saves keep whatever they hold: a master with no bachelor still counts as a master.
const RANK = { school: 0, diploma: 0, bachelor: 1, master: 2, doctorate: 3 };
const NEED_WORDS = { school: 'your school leaving certificate', bachelor: "a bachelor's degree", master: "a master's degree" };
export const needWords = c => NEED_WORDS[(c && c.needs) || 'school'];
export function topLevel(s) {
  let r = s.slc === false ? -1 : 0;
  for (const d of s.deg || []) { const c = COURSES.find(x => x.id === d); if (c) r = Math.max(r, RANK[c.level] || 0); }
  return r;
}
export function ladderMiss(s, c) {
  const need = (c && c.needs) || 'school';
  return topLevel(s) >= RANK[need] ? '' : `You need ${NEED_WORDS[need]} first.`;
}
export function enrol(s, id) {
  const c = COURSES.find(x => x.id === id); if (!c) return res(false, 'That course is not offered.');
  if (s.school) return res(false, `You are already studying ${s.school.id}.`);
  const nm = c.name || id;
  if (s.deg.includes(id)) return res(false, `You already have a ${nm} degree.`);
  const needS = c.smarts || 40;
  const miss = ladderMiss(s, c); if (miss) return res(false, miss);
  if (s.S < needS) return res(false, `Admissions want Smarts ${needS}+. Study first.`);
  const fee = Math.round(c.fee * (s.S >= 75 ? .5 : 1)); const paid = takeMoney(s, loc(s, fee));
  if (!paid) return res(false, `First-year fee is ${money(s, loc(s, fee))}. Pocket ${money(s, s.cash)} and bank ${money(s, s.bank || 0)} together are short.`);
  const words = feeWords(s, paid);
  s.school = { id, yr: 0, of: c.years, fee, place: c.place, studied: 0, study: c.study || 0, cert: !!c.cert }; say(s, `You enrolled in ${nm} (${c.years} years${c.study ? ', ' + c.study + ' study hours' : ''}). First-year fee ${words}${s.S >= 75 ? ' (scholarship: half price)' : ''}.`);
  return res(true, `Welcome to ${nm}. ${c.years} years. First-year fee ${words}. It is paid again each year you age.`, ['-' + money(s, paid.cost)]);
}
export function dropOut(s) { if (!s.school) return res(false, 'You are not enrolled.'); say(s, `You dropped out of ${s.school.id}.`); s.school = null; return res(true, 'You dropped out. Nothing wrong with that, but it stings.', ['H-5']); }
export const TUITION = 80000, MONTH_PAY = 25000, COURSE = 'College year';
export function enrolYear(s) {
  if (!s.alive) return res(false, 'Game over.');
  if (s.school) return res(false, 'You are already enrolled in ' + s.school.id + '.');
  if (s.slc === false) return res(false, 'You need your school leaving certificate first.');
  if (s.time <= 0) return NOTIME();
  const paid = takeMoney(s, TUITION);
  if (!paid) return res(false, 'Tuition is ' + money(s, TUITION) + '. Pocket ' + money(s, s.cash) + ' and bank ' + money(s, s.bank || 0) + ' together are short.');
  s.time--; s.school = { id: COURSE, yr: 1, of: 1 };
  const words = feeWords(s, paid);
  say(s, 'You enrolled in College year. Tuition ' + words + '.');
  return res(true, 'Enrolled in College year. Tuition ' + words + '.', ['-' + money(s, paid.cost)]);
}
const WORK_DAYS = 264; // 22 days a month. A painted hour is one hour of work, not a slice of the year.
export const SHIFT = [9, 10, 11, 12, 13, 14, 15, 16]; // nine to five. Eight hours.
const FULL_STUDY = 6;
export function jobOffer(s, j) {
  const hours = j.hours || 5;
  const annual = Math.round((j.sal || 0) * W(s));
  const rate = Math.max(1, Math.round(annual / (hours * WORK_DAYS)));
  const monthly = Math.max(1, Math.round(annual / 12));
  return { hours, rate, annual, monthly };
}
function giveJob(s, j, pay) {
  const o = jobOffer(s, j);
  const month = pay === 'month';
  s.job = { id: j.id, name: j.name, sal: j.sal, base: j.sal, yrs: 0, hours: month ? SHIFT.length : o.hours, rate: o.rate, monthly: o.monthly, pay: month ? 'month' : 'hour', company: j.company || '', paidMonth: '', track: j.track || '', trackName: j.trackName || '', rung: j.rung || 0, up: j.up || '', tier: j.tier || '', perk: j.perk || null };
  if (month) lockFullTime(s);
  return o;
}
const EXAM_ALIAS = { ACCA: ['ACCA', 'CA'], CA: ['CA', 'ACCA'], CFA: ['CFA'], CIPD: ['CIPD'], CLOUD: ['CLOUD'] };
const INFL = { Nepal: 5, India: 5, Brazil: 4, USA: 3, UK: 3, Australia: 3, Canada: 3, Germany: 2 };
let _ladder;
function ladderList() {
  if (_ladder) return _ladder;
  _ladder = [];
  for (const t of TRACKS) t.rungs.forEach((r, i) => _ladder.push({
    id: r.id, name: r.name, sal: r.sal, band: r.band, hours: r.hours || 8, req: {}, company: r.company || t.company,
    track: t.id, trackName: t.name, rung: i, up: r.up || (t.rungs[i + 1] && t.rungs[i + 1].id) || '',
    yrs: r.yrs || 0, from: r.from || [], deg: r.deg || [], must: r.must || [], any: r.any || [], both: r.both || [], exam: r.exam || '',
    lead: r.lead || 0, smarts: r.smarts || 0, looks: r.looks || 0, port: r.port || 0, lic: r.lic || '', perk: r.perk || null, tier: r.tier || '', top: r.top || '', cross: r.cross || []
  }));
  return _ladder;
}
export function jobById(id) { return JOBS.find(x => x.id === id) || ladderList().find(x => x.id === id) || null; }
export function trackEntries(company) { return ladderList().filter(j => j.company === company && j.rung === 0); }
function holdsExam(s, exam) { return (EXAM_ALIAS[exam] || [exam]).some(id => (s.deg || []).includes(id)); }
function holdsOne(s, id) { return holds(s, id) || holdsExam(s, id); }
export function ensureCareer(s) {
  if (!s.career || typeof s.career !== 'object') s.career = { hist: [], spent: {}, leads: 0, projects: 0, scandal: '' };
  if (!Array.isArray(s.career.hist)) s.career.hist = [];
  if (!s.career.spent) s.career.spent = {};
  return s.career;
}
function yearsToward(s, j) {
  const ids = (j.from && j.from.length) ? j.from.slice() : [];
  if (!ids.length && j.rung > 0) { const prev = ladderList().find(x => x.track === j.track && x.rung === j.rung - 1); if (prev) ids.push(prev.id); }
  let n = 0;
  for (const id of ids) n = Math.max(n, (s.career && s.career.spent[id]) || 0);
  if (s.job && ids.includes(s.job.id)) n = Math.max(n, s.job.yrs || 0);
  return n;
}
function coursePlace(id) { const c = COURSES.find(x => x.id === id); return (c && c.place) || (id === 'CLOUD' ? 'set' : 'som'); }
export function rungChecks(s, j) {
  ensureCareer(s);
  const out = [];
  if ((j.yrs || 0) > 0) { const have = yearsToward(s, j); out.push({ key: 'years', label: 'Years', have: have + '/' + j.yrs, met: have >= j.yrs, place: '', go: '' }); }
  if (j.top) { const met = topLevel(s) >= (RANK[j.top] || 1); out.push({ key: 'degree', label: 'Degree', have: met ? 'yes' : 'a degree missing', met, place: met ? '' : 'som', go: 'SOM' }); }
  if (j.deg && j.deg.length) { const met = j.deg.some(d => holdsOne(s, d)); out.push({ key: 'degree', label: 'Degree', have: met ? 'yes' : j.deg[0] + ' missing', met, place: met ? '' : coursePlace(j.deg[0]), go: 'College' }); }
  (j.must || []).forEach(d => { const met = holdsOne(s, d); out.push({ key: 'degree', label: 'Degree ' + d, have: met ? 'yes' : d + ' missing', met, place: met ? '' : coursePlace(d), go: 'College' }); });
  if (j.any && j.any.length) { const met = j.any.some(d => holdsOne(s, d)); out.push({ key: 'qual', label: 'Qualification', have: met ? 'yes' : j.any.join(' or ') + ' missing', met, place: met ? '' : coursePlace(j.any[0]), go: 'Exam centre' }); }
  if (j.exam) { const met = holdsExam(s, j.exam); out.push({ key: 'exam', label: 'Exam ' + j.exam, have: met ? 'yes' : j.exam + ' missing', met, place: met ? '' : coursePlace(j.exam), go: 'Exam centre' }); }
  (j.both || []).forEach(d => { const met = (s.deg || []).includes(d); out.push({ key: 'degree', label: 'Degree ' + d, have: met ? 'yes' : d + ' missing', met, place: met ? '' : coursePlace(d), go: 'College' }); });
  if (j.lic) { const met = (s.deg || []).includes(j.lic); out.push({ key: 'lic', label: 'Licence', have: met ? 'yes' : j.lic + ' missing', met, place: met ? '' : coursePlace(j.lic), go: 'Exam centre' }); }
  if (j.port) { const have = s.career.projects || 0; out.push({ key: 'port', label: 'Portfolio', have: have + '/' + j.port + ' projects', met: have >= j.port, place: '', go: '' }); }
  if (j.lead) { const have = s.career.leads || 0; out.push({ key: 'lead', label: 'Exposure', have: have + '/' + j.lead + ' leads', met: have >= j.lead, place: '', go: '' }); }
  if (j.smarts && s.S < j.smarts) out.push({ key: 'smarts', label: 'Smarts', have: 'Smarts ' + j.smarts + '+', met: false, place: '', go: '' });
  if (j.looks && s.B < j.looks) out.push({ key: 'looks', label: 'Looks', have: 'Looks ' + j.looks + '+', met: false, place: '', go: '' });
  return out;
}
function flatChecks(s, j) {
  const req = j.req || {}, out = [];
  if (req.S) out.push({ key: 'smarts', label: 'Smarts', have: 'Smarts ' + req.S + '+', met: s.S >= req.S, place: '', go: '' });
  if (req.B) out.push({ key: 'looks', label: 'Looks', have: 'Looks ' + req.B + '+', met: s.B >= req.B, place: '', go: '' });
  if (req.deg) { const met = holds(s, req.deg); out.push({ key: 'degree', label: 'Degree', have: met ? 'yes' : req.deg + ' missing', met, place: met ? '' : coursePlace(req.deg), go: 'College' }); }
  if (req.yrs) { const have = Math.max((s.job && s.job.yrs) || 0, (s.career && s.career.spent && s.career.spent[j.id]) || 0); out.push({ key: 'years', label: 'Years', have: have + '/' + req.yrs, met: have >= req.yrs, place: '', go: '' }); }
  return out;
}
function roleChecks(s, j) { return j && j.track ? rungChecks(s, j) : flatChecks(s, j); }
function trackCreds(track) {
  const ids = [];
  for (const r of ladderList()) if (r.track === track) for (const d of [...(r.deg || []), ...(r.must || []), ...(r.any || []), ...(r.both || []), r.exam, r.lic]) if (d && !ids.includes(d)) ids.push(d);
  return ids;
}
function foothold(s, j) {
  if (yearsToward(s, j) > 0) return true;
  if (s.job && (s.job.track === j.track || s.job.id === j.id)) return true;
  const ids = [...(j.deg || []), ...(j.must || []), ...(j.any || []), ...(j.both || []), j.exam, j.lic, ...(j.req && j.req.deg ? [j.req.deg] : []), ...(j.track ? trackCreds(j.track) : [])];
  return ids.some(id => id && (holdsOne(s, id) || (s.deg || []).includes(id)));
}
function companyOf(id) { return COMPANIES[id] || { name: id || 'Town', place: 'work' }; }
function packRole(s, j, miss) {
  const co = companyOf(j.company);
  return {
    id: j.id, name: j.name, track: j.track || '', field: j.trackName || '', company: j.company || '', companyName: co.name, place: co.place,
    sal: j.sal, band: j.band || null, miss, why: miss.map(c => c.label + ' ' + c.have).join(', ')
  };
}
export function jobBoard(s, company) {
  ensureLife(s);
  const open = [], almost = [];
  const rows = ladderList().concat(JOBS.map(j => ({ ...j, track: '', trackName: '' })));
  for (const j of rows) {
    if (company && j.company !== company) continue;
    const checks = roleChecks(s, j), miss = checks.filter(c => !c.met);
    if (!miss.length) open.push(packRole(s, j, miss));
    else if (miss.length === 1 && (foothold(s, j) || (!j.track && miss[0].key !== 'degree' && miss[0].key !== 'exam' && miss[0].key !== 'lic'))) almost.push(packRole(s, j, miss));
  }
  const mine = s.job && s.job.track;
  almost.sort((a, b) => (b.track === mine) - (a.track === mine));
  return { open, almost: almost.slice(0, 6), fields: TRACKS.length, roles: ladderList().length + JOBS.length };
}
function unlockText(roles) {
  const show = roles.slice(0, 3).map(r => r.name + ' at ' + r.companyName);
  const more = roles.length - show.length;
  if (roles.length === 1) return 'You can now apply for ' + show[0] + '.';
  if (!more) { const last = show.pop(); return 'You can now apply for ' + show.join(', ') + ' and ' + last + '.'; }
  return 'You can now apply for ' + show.join(', ') + ', and ' + more + ' more.';
}
export function noteUnlocks(s) {
  ensureCareer(s);
  const board = jobBoard(s);
  const openIds = board.open.map(r => r.id);
  if (!s.career.knownInit) { s.career.knownInit = 1; s.career.known = openIds; return null; }
  const known = new Set(s.career.known || []);
  const fresh = board.open.filter(r => !known.has(r.id) && !(s.job && s.job.id === r.id));
  for (const id of openIds) if (!known.has(id)) known.add(id);
  s.career.known = [...known];
  if (!fresh.length) return s.career.notice && !s.career.notice.shown ? s.career.notice : null;
  const place = fresh.every(r => r.place === fresh[0].place) ? fresh[0].place : fresh[0].place;
  s.career.notice = { text: unlockText(fresh), place, roles: fresh.map(r => ({ id: r.id, name: r.name, companyName: r.companyName, place: r.place })), shown: 0 };
  return s.career.notice;
}
function maybeGraduate(s) {
  const sch = s.school; if (!sch) return '';
  const course = COURSES.find(x => x.id === sch.id);
  const need = sch.of || 1;
  if ((sch.yr || 0) < need || (sch.passes || 0) < need) return '';
  if (typeof s.grades === 'number' && s.grades < 45) return '';
  if (course && course.study && (sch.studied || 0) < course.study) return '';
  const id = sch.id;
  if (!(s.deg || []).includes(id)) s.deg.push(id);
  s.school = null;
  s.H = clamp(s.H + 8); s.S = clamp(s.S + 3);
  say(s, `You graduated with a ${id} ${course && course.cert ? 'qualification' : 'degree'}.`);
  return id;
}
export function payBand(s, j) {
  const w = W(s), lo = j && j.band ? j.band[0] : (j ? j.sal * 0.85 : 0), hi = j && j.band ? j.band[1] : (j ? j.sal * 1.15 : 0);
  return [Math.round(lo * w), Math.round(hi * w)];
}
function nextPost(s) { const j = s.job && jobById(s.job.id); return j && j.up ? jobById(j.up) : null; }
export function careerView(s) {
  ensureLife(s);
  const j = s.job ? jobById(s.job.id) : null, nxt = nextPost(s), checks = nxt ? rungChecks(s, nxt) : [];
  const crosses = (j && j.cross || []).map(id => jobById(id)).filter(Boolean).map(c => ({ id: c.id, name: c.name, ready: rungChecks(s, c).every(x => x.met) }));
  return {
    track: j ? j.trackName : '', title: s.job ? s.job.name : 'No post', yrs: s.job ? (s.job.yrs || 0) : 0,
    nextName: nxt ? nxt.name : '', nextId: nxt ? nxt.id : '', band: j ? payBand(s, j) : [0, 0],
    pay: s.job ? Math.round(s.job.sal * W(s)) : 0, hist: (s.career && s.career.hist) || [], checks, crosses,
    canApply: !!(nxt && s.job && nxt.company === s.job.company && checks.every(c => c.met)),
    gos: checks.filter(c => !c.met && c.place).map(c => ({ place: c.place, label: c.go || 'Go', why: c.have })),
    tier: s.job ? s.job.tier || '' : '', perk: s.job ? s.job.perk : null
  };
}
function promoteTo(s, j) {
  const c = ensureCareer(s);
  if (s.job) c.spent[s.job.id] = Math.max(c.spent[s.job.id] || 0, s.job.yrs || 0);
  const keep = Math.max(j.sal, s.job ? s.job.sal : 0), pay = s.job && s.job.pay === 'hour' ? 'hour' : 'month';
  giveJob(s, j, pay);
  if (keep > s.job.sal) { const k = keep / s.job.sal; s.job.sal = keep; s.job.rate = Math.round(s.job.rate * k); s.job.monthly = Math.round(s.job.monthly * k); }
  s.job.base = j.sal; s.H = clamp(s.H + 6);
  const msg = `Promoted to ${j.name}. ${money(s, s.job.monthly)} a month.`;
  say(s, msg); return msg;
}
export function acceptPromo(s) {
  const id = s.promo && s.promo.id, j = id && jobById(id);
  if (!j) return res(false, 'That offer has gone.');
  s.promo = null; promoteTo(s, j); return res(true, `You are now ${j.name}.`, ['H+6']);
}
export function declinePromo(s) {
  if (s.career) s.career.declined = (s.promo && s.promo.id) || '';
  s.promo = null; return res(true, 'You stay in your post.', []);
}
export function applyInternal(s) {
  if (!s.job) return res(false, 'You have no job.');
  const nxt = nextPost(s); if (!nxt) return res(false, 'There is no rung above this one.');
  if (nxt.company !== s.job.company) return res(false, 'That post is at another company. Apply there. The questions are harder.');
  const miss = rungChecks(s, nxt).filter(c => !c.met).map(c => c.label + ' ' + c.have);
  if (miss.length) return res(false, 'Not ready. Needs: ' + miss.join(', ') + '.');
  s.promo = null; promoteTo(s, nxt); return res(true, `You move up to ${nxt.name}.`, ['H+6']);
}
export function applyCross(s, id) {
  const j = jobById(id); if (!j) return res(false, 'That post is not open.');
  const mine = s.job && jobById(s.job.id);
  if (!mine || !(mine.cross || []).includes(id)) return res(false, 'That move is not open from your post.');
  const miss = rungChecks(s, j).filter(c => !c.met).map(c => c.label + ' ' + c.have);
  if (miss.length) return res(false, 'Not ready. Needs: ' + miss.join(', ') + '.');
  if (j.company !== s.job.company) return res(false, 'That company interviews. The questions are harder.');
  promoteTo(s, j); return res(true, `You cross to ${j.name}.`, ['H+4']);
}
export function startPost(s, id, pay = 'month') {
  ensureLife(s); const j = jobById(id); if (!j) return res(false, 'No such post.');
  giveJob(s, j, pay); ensureCareer(s); return res(true, `You start as ${j.name}.`, []);
}
export function scandal(s, why) { ensureCareer(s); s.career.scandal = why || 'A scandal reaches the board.'; return s.career.scandal; }
function fireJob(s, L, why) { L(why); s.job = null; s.promo = null; applyFx(s, 'H-8', false); }
function reviewYear(s, r, L) {
  const j = s.job; if (!j) return null;
  const c = ensureCareer(s);
  const want = Math.max(12, (j.hours || 8) * 3), ratio = (s.shifts || 0) / want;
  const rated = ratio >= 0.9 ? 'Strong' : ratio >= 0.55 ? 'Solid' : 'Fair';
  const perf = ratio >= 1 ? 5 : ratio >= 0.75 ? 3 : ratio >= 0.4 ? 1 : 0;
  let pct = (INFL[s.country] || 3) + perf; if (pct < 3) pct = 3; if (pct > 10) pct = 10;
  if ((s.shifts || 0) === 0 && r() < 0.3) { fireJob(s, L, `You were fired from your job as ${j.name} for not showing up.`); return null; }
  if (c.scandal) { const why = c.scandal; c.scandal = ''; fireJob(s, L, `You were fired from ${j.name}. ${why}`); return null; }
  if (ratio < 0.2 && (j.tier === 'c' || j.tier === 'ceo') && r() < 0.35) { fireJob(s, L, `The board removed you as ${j.name} for poor performance.`); return null; }
  const bump = 1 + pct / 100;
  j.sal = Math.round(j.sal * bump); if (j.rate) j.rate = Math.round(j.rate * bump); if (j.monthly) j.monthly = Math.round(j.monthly * bump);
  L(`Annual review: rated ${rated}, +${pct}%.`);
  if (j.perk && j.perk.bonus) { const b = Math.round(j.sal * W(s) * j.perk.bonus * Math.min(1, Math.max(0.3, ratio))); s.bank = (s.bank || 0) + b; Fin.book(s, 'inc', 'salary', b); L(`Bonus ${money(s, b)} for the year.`); }
  if (j.perk && j.perk.car) { const car = Math.round(j.perk.car * W(s)); s.bank = (s.bank || 0) + car; Fin.book(s, 'inc', 'salary', car); L(`Car allowance ${money(s, car)}.`); }
  if (j.perk && j.perk.stress) { s.L = clamp(s.L - j.perk.stress); s.why = 'Run down from overwork'; L(`The hours cost you. Health -${j.perk.stress}.`); }
  if (j.tier === 'ceo') {
    if (r() < 0.5) { const b = Math.round(j.sal * W(s) * 0.15); s.bank = (s.bank || 0) + b; Fin.book(s, 'inc', 'salary', b); L(`The company had a good year. The board pays ${money(s, b)}.`); }
    else L('The company missed its year. The board is watching.');
  }
  if (rated === 'Strong' || rated === 'Solid') { c.projects = (c.projects || 0) + 1; L('You took a project through. It counts as exposure.'); }
  if (rated === 'Strong') { c.leads = (c.leads || 0) + 1; L('You led it. That is a lead.'); }
  c.hist.push({ age: s.age, id: j.id, name: j.name, sal: Math.round(j.sal * W(s)), pct, rated });
  if (c.hist.length > 40) c.hist.shift();
  if (s.job && r() < 0.03) { fireJob(s, L, 'Company-wide layoffs. You lost your job.'); return null; }
  const nxt = s.job && nextPost(s);
  if (nxt && rungChecks(s, nxt).every(x => x.met)) {
    s.promo = { id: nxt.id, name: nxt.name };
    return { promo: true, id: nxt.id, prompt: `Your review is in. They offer you ${nxt.name}.`, opts: [
      { label: 'Take ' + nxt.name, res: 'You take the post: ' + nxt.name + '.', fx: '@promo' },
      { label: 'Stay as ' + s.job.name, res: 'You stay as ' + s.job.name + '.', fx: '@stay' }
    ] };
  }
  return null;
}
export function takeJob(s, now) {
  if (!s.alive) return res(false, 'Game over.');
  if (s.job) return res(false, 'You already work as ' + s.job.name + '.');
  const j = JOBS.find(x => x.id === 'jr-accounts');
  const o = giveJob(s, j);
  say(s, `You were hired as ${j.name}. ${o.hours} hours, ${money(s, o.rate)} an hour.`);
  return res(true, `Hired as ${j.name}. ${o.hours} hours a day, ${money(s, o.rate)} an hour. Paint them as work.`, []);
}
const notice = (s, t) => { s.notice = s.notice ? s.notice + ' ' + t : t; say(s, t); };
function clockNum(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && /^\d+$/.test(v)) return +v;
  return null;
}
// The player's month: close last month's ledger, then interest, the monthly wage, the household (rent, instalments),
// and last the player's own recurring costs. Pay comes before the bills so a wage can cover them.
// `now` is only the wall clock for an old insurance wait. The month key is monthIndex(s). Offline time does not move it.
export function accruePay(s, now) {
  if (!s || !s.alive) return false;
  ensureLife(s);
  const key = monthIndex(s);
  if (s.ins && s.ins.from >= Fin.WORLD_KEY) s.ins.from = (typeof now === 'number' && now >= 1e9 && now >= s.ins.from) ? key : key + 1;
  const gone = Fin.roll(s, key, () => netWorth(s));
  const bank = accrueBank(s);
  const wage = accrueWage(s, key);
  const home = accrueHousehold(s);
  if (gone) Fin.month(s, now, gone, finCtx(s));
  return !!(gone || bank || wage || home);
}
export function proRata(monthly, hireDay) {
  const day = hireDay | 0;
  if (!(monthly > 0)) return 0;
  if (day <= 1) return Math.round(monthly);
  const frac = (Fin.MONTH_DAYS - (day - 1)) / Fin.MONTH_DAYS;
  return Math.max(1, Math.round(monthly * Math.max(0, Math.min(1, frac))));
}
function accrueWage(s, key) {
  if (!s.job || s.job.pay !== 'month' || !(s.job.monthly > 0)) return false;
  const prev = clockNum(s.job.paidMonth);
  if (prev == null) {
    const day = ageParts(s).d + 1;
    s.job.paidMonth = String(key);
    s.job.hireDay = day;
    s.job.partial = day > 1;
    return false;
  }
  if (prev >= Fin.WORLD_KEY) { s.job.paidMonth = String(key - 1); return accrueWage(s, key); }   // old world-clock key: treat as paid up to last month and pay this month's 1st now (18 Oct)
  if (prev === key) return false;
  s.job.paidMonth = String(key);
  if (key < prev) return false;
  // 18 Oct, Chairman: never skip a payday - if more than one 1st was crossed (tab asleep, long frame), pay each month missed (cap 12)
  const months = Math.min(12, key - prev);
  const amt = (s.job.partial ? proRata(s.job.monthly, s.job.hireDay || 1) : s.job.monthly) + s.job.monthly * (months - 1);
  s.job.partial = false;
  s.bank = (s.bank || 0) + amt;
  s.wages = (s.wages || 0) + amt;
  Fin.book(s, 'inc', 'salary', amt);
  notice(s, dateLabel(s) + ' - Salary ' + money(s, amt) + ' credited.');
  return true;
}
// what the finance tick needs to know about the home, the land and the loans
export function finCtx(s) {
  const hh = s.hh, h = hh && hh.home;
  const head = !!(h && h.payer === 'you');
  const staying = !!(h && h.familyStay);
  const rentDue = h && (head || h.serverRent) && (!h.own || staying) && h.rent > 0 && !(h.free > 0) ? h.rent : 0;
  const loans = hh ? hh.loans.filter(l => l.state === 'ok' && l.payer === 'you').map(l => ({ id: l.id, amt: Math.min(l.instalment, l.principal + Math.round(l.principal * l.rate / 1200)), why: l.lender + (l.late ? `, ${l.late} behind` : '') })) : [];
  const earns = !!(s.job || s.biz || (hh && hh.biz && hh.biz.owner === 'you' && hh.biz.state === 'open'));
  return { head, earns, rentDue, rentLate: !!(h && h.late > 0), home: h ? lc1(h.desc || '') : '', dist: h ? h.dist || 0 : 0, letRent: Math.round(landRentYear(s) / 12), loans };
}
export const finView = s => { ensureLife(s); return Fin.view(s, finCtx(s)); };
// ---------- bank: savings interest and fixed deposits, on the world month ----------
export const FD_MONTHS = [3, 6, 12];
export function bankRates(s) {
  const c = COUNTRIES[s.country] || COUNTRIES.Nepal, sav = c.sav ?? 1, fd = c.fd ?? sav;
  const at = m => Math.round((sav + (fd - sav) * (m >= 12 ? 1 : m >= 6 ? 0.8 : 0.5)) * 10) / 10;
  return { sav, fd: { 3: at(3), 6: at(6), 12: at(12) }, brk: sav };
}
const fdGain = (amt, rate, months) => Math.round(amt * rate * months / 1200);
export const fdPayout = f => f.amt + fdGain(f.amt, f.rate, f.months);
export function bankMonth(s) {
  ensureLife(s);
  const r = bankRates(s);
  let gain = 0;
  if (s.bank > 0 && r.sav > 0) {
    const raw = s.bank * r.sav / 1200 + (s.intFrac || 0), whole = Math.floor(raw);
    s.intFrac = raw - whole;
    if (whole > 0) { s.bank += whole; s.interest += whole; gain = whole; Fin.book(s, 'inc', 'interest', whole); }
  }
  const keep = [], done = [];
  for (const f of s.fds) {
    if (!f.months) { keep.push(f); continue; }
    f.left--;
    if (f.left > 0) { keep.push(f); continue; }
    const g = fdGain(f.amt, f.rate, f.months);
    s.bank += f.amt + g; s.interest += g; Fin.book(s, 'inc', 'interest', g); done.push({ f, g });
  }
  s.fds = keep;
  if (gain > 0) notice(s, dateLabel(s) + ` - Savings interest ${money(s, gain)} at ${r.sav}%.`);
  for (const { f, g } of done) notice(s, dateLabel(s) + ` - Fixed deposit matured: ${money(s, f.amt)} plus ${money(s, g)} interest at ${f.rate}% is in your savings.`);
  return gain > 0 || done.length > 0;
}
export function accrueBank(s) {
  const key = monthIndex(s);
  const prev = clockNum(s.bankMonth);
  if (prev == null || prev >= Fin.WORLD_KEY) { s.bankMonth = key; return false; }
  if (prev === key) return false;
  s.bankMonth = key;
  if (prev + 1 !== key) return false;
  return bankMonth(s);
}
function dueAge(s, months) {
  const a = ageParts(s), t = a.m + months;
  return `${a.y + Math.floor(t / 12)}y ${t % 12}m`;
}
export function openFD(s, amt, months) {
  ensureLife(s);
  if (!s.alive) return res(false, 'Game over.');
  months = +months; if (!FD_MONTHS.includes(months)) return res(false, 'Pick 3, 6 or 12 months.');
  amt = Math.round(+amt);
  if (!Number.isFinite(amt) || amt < 1) return res(false, 'Type an amount first.');
  const min = loc(s, 100);
  if (amt < min) return res(false, `The smallest fixed deposit is ${money(s, min)}.`);
  const bank = Math.max(0, s.bank || 0), pocket = Math.max(0, s.cash || 0);
  if (bank + pocket < amt) return res(false, `Savings ${money(s, bank)} and pocket ${money(s, pocket)} together are short.`);
  const fromBank = Math.min(bank, amt);
  s.bank -= fromBank; s.cash -= amt - fromBank;
  const r = bankRates(s), rate = r.fd[months];
  s.fdSeq = (s.fdSeq || 0) + 1;
  const f = { id: s.fdSeq, amt, start: amt, rate, months, left: months, due: dueAge(s, months) };
  s.fds.push(f);
  const msg = `Fixed deposit: ${money(s, amt)} for ${months} months at ${rate}%. It pays ${money(s, fdPayout(f))} at ${f.due}. Breaking it early pays ${r.brk}%.`;
  say(s, msg);
  return res(true, msg, ['-' + money(s, amt)]);
}
export function breakFD(s, id) {
  ensureLife(s);
  const f = s.fds.find(x => x.months && x.id === +id); if (!f) return res(false, 'That deposit is not open.');
  const r = bankRates(s), held = f.months - f.left, g = fdGain(f.amt, r.brk, held);
  s.fds = s.fds.filter(x => x !== f);
  s.bank += f.amt + g; s.interest += g; Fin.book(s, 'inc', 'interest', g);
  const msg = `You broke the ${f.months}-month deposit after ${held} month${held === 1 ? '' : 's'}. ${money(s, f.amt + g)} is in your savings: ${r.brk}% instead of ${f.rate}%.`;
  say(s, msg);
  return res(true, msg, ['+' + money(s, g) + ' interest']);
}
export function moneyLine(s) {
  ensureLife(s);
  return 'salary ' + money(s, s.wages || 0) + ' · fees ' + money(s, s.fees || 0) + ' · interest ' + money(s, s.interest || 0) + ' · bank ' + money(s, s.bank || 0) + ' · shop ' + money(s, s.shop || 0);
}
export function bankMove(s, dir, usd) {
  const amt = fromUsd(s, usd);
  if (s.bank == null) s.bank = 0;
  if (!Number.isFinite(amt) || amt < 1) return res(false, 'Type an amount first.');
  if (dir === 'in') {
    if (s.cash < amt) return res(false, 'Not enough pocket cash.');
    s.cash -= amt; s.bank += amt; say(s, 'You deposited ' + money(s, amt) + ' in the bank.');
    return res(true, 'Deposited ' + money(s, amt) + '. Pocket ' + money(s, s.cash) + ', bank ' + money(s, s.bank) + '.', []);
  }
  if (s.bank < amt) return res(false, 'Not enough in the bank.');
  s.bank -= amt; s.cash += amt; say(s, 'You withdrew ' + money(s, amt) + ' from the bank.');
  return res(true, 'Withdrew ' + money(s, amt) + '. Pocket ' + money(s, s.cash) + ', bank ' + money(s, s.bank) + '.', []);
}
export function jobStatus(s, j) {
  if (!j) return ['unknown job'];
  if (j.track) return rungChecks(s, j).filter(c => !c.met).map(c => c.label + ' ' + c.have);
  const miss = [];
  if (j.req.S && s.S < j.req.S) miss.push(`Smarts ${j.req.S}+`);
  if (j.req.B && s.B < j.req.B) miss.push(`Looks ${j.req.B}+`);
  if (j.req.deg && !holds(s, j.req.deg)) miss.push(`${j.req.deg} degree`);
  if (j.req.yrs && (!s.job || s.job.yrs < j.req.yrs)) miss.push(`${j.req.yrs} yrs work`);
  return miss;
}
export function chance(s, j) {
  let p = .5 + (s.S - (j.req.S || 30)) * .008 + (s.B - 40) * .003 + (j.req.deg ? .12 : 0);
  if (s.deg.length && !j.req.deg) p += .05; return Math.max(.08, Math.min(.95, p));
}
export function applyJob(s, id, r = Math.random) {
  const j = jobById(id); if (!j) return res(false, 'That job is not open.'); if (s.age < 18) return res(false, 'You must be 18 to work. Turn 18 first.');
  if (s.job && s.job.id === id) return res(false, 'You already work this job.');
  if (s.rejected.includes(id)) return res(false, 'They said no this year. Try again after you age up.');
  const miss = jobStatus(s, j); if (miss.length) return res(false, 'Not qualified yet. Needs: ' + miss.join(', ') + '.');
  if (r() < chance(s, j)) {
    const o = giveJob(s, j); s.lastJob = null;
    say(s, `You were hired as ${j.name}. ${o.hours} hours, ${money(s, o.rate)} an hour.`);
    s.H = clamp(s.H + 5); return res(true, `Hired. ${j.name}: ${o.hours} hours at ${money(s, o.rate)} an hour.`, ['H+5']);
  }
  s.rejected.push(id); s.H = clamp(s.H - 3); say(s, `${j.name} application rejected.`); return res(false, 'Rejected. "We went with someone else." Try again next year.', ['H-3']);
}
export function workShift(s) {
  if (!s.job) return res(false, 'You have no job. Apply at the Workplace first.'); if (s.time <= 0) return NOTIME();
  s.time--; s.shifts++; const pay = Math.round(s.job.sal * W(s) * .035); s.cash += pay; Fin.book(s, 'inc', 'salary', pay); s.H = clamp(s.H - 1); s.S = clamp(s.S + 1);
  say(s, `You worked a shift as ${s.job.name} and earned ${money(s, pay)}.`); return res(true, 'A solid shift. Tired but paid.', ['+' + money(s, pay), 'S+1', 'H-1']);
}
export function quitJob(s) { if (!s.job) return res(false, 'No job to quit.'); say(s, `You quit your job as ${s.job.name}.`); s.job = null; return res(true, 'You quit. Freedom, and a quiet panic.', []); }
export function homeRest(s) { if (s.time <= 0) return NOTIME(); s.time--; const fx = applyFx(s, 'L+4 H+2'); say(s, 'You rested at home and recharged.'); return res(true, 'A long, slow, wonderful rest.', fx); }
export function family(s, who, act) {
  const p = s[who]; const nm = who === 'mom' ? 'Mum' : 'Dad';
  if (!p.alive) return res(false, `${nm} has passed away.`);
  if (act === 'time') { if (s.time <= 0) return NOTIME(); s.time--; p.rel = clamp(p.rel + 7); const fx = applyFx(s, 'H+3'); say(s, `You spent time with ${nm}.`); return res(true, `${nm} cooks your favourite meal and asks about everything.`, fx.concat('❤+7')); }
  if (act === 'gift') { const c = charge(s, 25); if (c === false) return POOR(); Fin.book(s, 'exp', 'other', c); p.rel = clamp(p.rel + 9); const fx = applyFx(s, 'H+2'); say(s, `You gave ${nm} a gift.`); return res(true, `${nm} is touched.`, ['-' + money(s, c), '❤+9'].concat(fx)); }
  if (act === 'ask') {
    if (s.asked) return res(false, `${nm} says you already asked this year.`); s.asked = true;
    if (p.rel >= 50) { const a = loc(s, 100 + p.rel); s.cash += a; Fin.book(s, 'inc', 'other', a); p.rel = clamp(p.rel - 4); say(s, `${nm} gave you ${money(s, a)}.`); return res(true, `${nm} sighs and slips you some money.`, ['+' + money(s, a), '❤-4']); }
    p.rel = clamp(p.rel - 3); return res(false, `${nm} says no. "Earn it first."`, ['❤-3']);
  }
  if (act === 'argue') { p.rel = clamp(p.rel - 9); const fx = applyFx(s, 'H-2'); say(s, `You argued with ${nm}.`); return res(true, 'Voices are raised. Doors slam.', fx.concat('❤-9')); }
}
export function depositFD(s, baseAmt, years) {
  const amt = Math.round(baseAmt); if (amt <= 0 || amt > s.cash) return res(false, 'You do not have that much cash.');
  if (amt < loc(s, 100)) return res(false, `Minimum deposit is ${money(s, loc(s, 100))}.`);
  const rate = COUNTRIES[s.country].fd + (years >= 3 ? 1 : 0); s.cash -= amt; s.fds.push({ amt, rate, left: years, start: amt });
  say(s, `Opened a ${years}-year fixed deposit of ${money(s, amt)} at ${rate}%.`);
  return res(true, `Fixed deposit opened: ${years} year${years > 1 ? 's' : ''} at ${rate}%. It matures when you age up.`, ['-' + money(s, amt)]);
}
export function fdProjection(s, amt, years) { const rate = COUNTRIES[s.country].fd + (years >= 3 ? 1 : 0); return Math.round(amt * Math.pow(1 + rate / 100, years)); }

export function activity(s, id, r = Math.random) {
  const a = ACTIVITIES.find(x => x.id === id); if (s.time <= 0) return NOTIME();
  const c = a.cost ? charge(s, a.cost) : 0; if (c === false) return POOR(); s.time--; if (c) Fin.book(s, 'exp', 'other', c);
  const fx = c ? ['-' + money(s, c)] : []; let msg = a.text, cash0 = s.cash;
  if (a.fx === 'lottery') { const x = r(); if (x < .01) { const w = loc(s, 20000); s.cash += w; msg = `JACKPOT! You won ${money(s, w)}!!`; fx.push('+' + money(s, w)); fx.push(...applyFx(s, 'H+15', false)); } else if (x < .12) { const w = loc(s, 50); s.cash += w; msg = `A small win: ${money(s, w)}.`; fx.push('+' + money(s, w)); } else { msg = 'Nothing. The ticket joins the others in your pocket.'; fx.push(...applyFx(s, 'H-1')); } }
  else if (a.fx === 'gig') { const w = Math.round(70 * W(s)); s.cash += w; fx.push('+' + money(s, w), ...applyFx(s, 'H-1')); msg = `You did odd jobs for a few hours and earned ${money(s, w)}.`; }
  else if (a.fx === 'busk') { if (r() < .6) { const w = loc(s, 18); s.cash += w; fx.push('+' + money(s, w), ...applyFx(s, 'H+2')); msg = `A crowd gathers. ${money(s, w)} in the hat.`; } else { fx.push(...applyFx(s, 'H+1')); msg = 'Few listen, but you had fun.'; } }
  else if (a.fx === 'sell') { const w = loc(s, 40); s.cash += w; fx.push('+' + money(s, w)); msg = `You sold some old things for ${money(s, w)}.`; }
  else if (a.fx === 'crypto') { if (r() < .35) { const w = loc(s, 220) - c; s.cash += loc(s, 220); fx.push('+' + money(s, loc(s, 220)), ...applyFx(s, 'H+4')); msg = 'The coin pumps. You sell at exactly the right moment!'; } else { fx.push(...applyFx(s, 'H-3')); msg = 'The coin dumps. Your {100} is gone.'.replace('{100}', money(s, c)); } }
  else fx.push(...applyFx(s, a.fx));
  if (a.fx === 'lottery' || a.fx === 'gig' || a.fx === 'busk' || a.fx === 'sell' || a.fx === 'crypto') Fin.book(s, 'inc', 'other', s.cash - cash0);
  say(s, `${a.label}: ${msg}`); return res(true, msg, fx);
}

// ---------- ageing ----------
function eligible(s, e) {
  if (s.age < e.min || s.age > e.max) return false;
  switch (e.cond) { case 'job': return !!s.job; case 'nojob': return !s.job && s.age >= 20; case 'school': return !!s.school; case 'pet': return s.pet;
    case 'rich': return s.cash > loc(s, 5000); case 'poor': return s.cash < loc(s, 150); default: return true; }
}
function pickFrom(s, list, r, key) {
  const pool = list.filter(e => eligible(s, e) && !s.used.includes(e[key])); if (!pool.length) return null;
  const e = pick(pool, r); s.used.push(e[key]); if (s.used.length > 60) s.used.shift(); return e;
}
export function ageUp(s, r = Math.random) {
  if (!s.alive) return { lines: [], choice: null, dead: true };
  s.age++; s.time = 5; s.asked = false; s.rejected = []; s.fees = 0; const lines = []; const L = t => { lines.push(t); say(s, t); };
  if (s.interest > 0) L(`The bank paid ${money(s, s.interest)} in interest this year.`);
  s.interest = 0;
  // money
  let inc = 0, out = 0; const cashier = JOBS[0].sal * W(s);
  if (s.job) s.job.yrs = (s.job.yrs || 0) + 1;
  const earned = s.wages || 0; s.wages = 0;
  if (s.job && s.job.rate) inc += earned;
  else if (s.job) { const y = Math.round(s.job.sal * W(s)); inc += y; Fin.book(s, 'inc', 'salary', y); }
  if (s.pension) { inc += s.pension; Fin.book(s, 'inc', 'other', s.pension); }
  // Rent from let houses and living costs (food, fares, fees, the gym...) are charged each world month now (finance.js).
  void cashier;
  const tuition = 0;
  s.cash += (inc - earned) - out;
  const paidFee = null;
  if (s.school && s.school.hold) {
    const held = payHeldYear(s);
    if (held && held.ok) L(held.msg);
    else if (held) L(held.msg);
  }
  const spent = out + (paidFee ? tuition : 0);
  if (inc || spent) L(`Year ${s.age - 18}: you earned ${money(s, inc)}${spent ? ` and paid ${money(s, spent)} in tuition` : ''}. Living costs are in Finances, month by month.`);
  if (paidFee && paidFee.fromBank) L(paidFee.fromPocket ? `Tuition ${money(s, tuition)}: ${money(s, paidFee.fromPocket)} from your pocket and ${money(s, paidFee.fromBank)} from the bank.` : `Tuition ${money(s, tuition)} came from the bank.`);
  if (s.cash < 0) { applyFx(s, 'H-4', false); L(`You are in debt (${money(s, s.cash)}). The stress shows.`); }
  // one review a year: 3-10% from inflation and the hours kept, then a promotion offer if the next rung is open
  let promoChoice = null;
  if (s.job) promoChoice = reviewYear(s, r, L);
  s.shifts = 0;
  if (s.age === 65 && s.job) { s.pension = Math.round((s.job.sal || 0) * W(s) * .4); L(`You retired from ${s.job.name}. Pension: ${money(s, s.pension)} a year.`); s.job = null; applyFx(s, 'H+4', false); }
  // school
  if (s.school) {
    applyFx(s, 'S+2', false);
    const course = COURSES.find(x => x.id === s.school.id);
    if (course && course.study) s.school.studied = (s.school.studied || 0) + 24;
    const y = courseYear(s);
    L(`Year ${y} exam is still open. You stay in year ${y} of ${s.school.of}. No new tuition.`);
  }
  // FDs
  const keep = []; for (const f of s.fds) { if (f.months) { keep.push(f); continue; } f.amt = Math.round(f.amt * (1 + f.rate / 100)); f.left--; if (f.left <= 0) { s.cash += f.amt; Fin.book(s, 'inc', 'interest', f.amt - f.start); L(`💰 Fixed deposit matured: ${money(s, f.amt)} (from ${money(s, f.start)}) paid into your cash.`); applyFx(s, 'H+3', false); } else keep.push(f); } s.fds = keep;
  // natural drift
  s.H = clamp(s.H - 1 + (r() < .3 ? -1 : 0)); if (s.age > 40) { s.L = clamp(s.L - Math.floor((s.age - 35) / 18 + r())); s.why = 'Worn down by the years'; }
  for (const w of ['mom', 'dad']) { const p = s[w]; if (p.alive) { p.rel = clamp(p.rel - 2); if (s.age > 45 && r() < .05 + (s.age - 45) * .004) { p.alive = false; L(`${p.n} passed away. You feel the world get quieter.`); applyFx(s, 'H-15', false); } } }
  if (s.birth !== 'poor' && s.land && !s.land.inherited && s.mom && s.dad && !s.mom.alive && !s.dad.alive) {
    s.land.inherited = true;
    let n = 0;
    for (const lot of lotGrid()) if (lot.kind === 'family' && !s.land.own.includes(lot.id) && !(s.land.sold || []).includes(lot.id)) {
      s.land.own.push(lot.id); n++;
      if (lot.house && !s.land.built.includes(lot.id)) s.land.built.push(lot.id);
    }
    if (n) L(`The family land is yours now. ${n} lots.`);
  }
  if (s.pet && r() < .05) { s.pet = false; L('Your beloved pet passed away after many happy years.'); applyFx(s, 'H-8', false); }
  // milestones
  const M = { 18: 'You are 18: adult life begins! Jobs and college are open.', 21: 'You turn 21. A small cake, a big feeling.', 30: 'Thirty. Time for a little reflection.', 40: 'You turn 40. They say life begins now.', 50: 'Fifty! Half a century of stories.', 65: 'You turn 65. Time to think about slowing down.' };
  if (M[s.age]) L('🎂 ' + M[s.age]);
  if (s.age === 21) { const ask = leaveHomeAsk(s); if (ask) L(ask); }
  // random events (1-2) + maybe a choice
  let n = 1 + (r() < .55 ? 1 : 0), choice = null;
  for (let i = 0; i < n; i++) { const e = pickFrom(s, EVENTS, r, 'text'); if (e) { const fx = applyFx(s, e.fx); L(fillText(s, e.text) + (fx.length ? '  [' + fx.join(' ') + ']' : '')); } }
  if (promoChoice) choice = promoChoice;
  else if (r() < .45) { const c = pickFrom(s, CHOICES, r, 'prompt'); if (c) choice = { prompt: fillText(s, c.prompt), opts: c.opts.map(o => ({ label: fillText(s, o.label), res: fillText(s, o.res), fx: o.fx })) }; }
  // death
  const over = s.age - 60; let p = over > 0 ? over * over / 3500 : 0; if (s.L < 25) p += .08; if (s.L < 10) p += .25; if (s.age >= 99) p = 1;
  if (s.L <= 0 || r() < p) { s.alive = false; const cause = s.L <= 10 ? 'poor health' : s.age < 50 ? 'an unexpected illness' : 'old age'; L(`☠ ${s.name} died at ${s.age} of ${cause}.`); return { lines, choice: null, dead: true }; }
  const unlock = noteUnlocks(s);
  return { lines, choice, dead: false, unlock };
}
export function resolveChoice(s, opt) {
  if (opt && opt.fx === '@promo') { acceptPromo(s); return ['H+6']; }
  if (opt && opt.fx === '@stay') { declinePromo(s); say(s, opt.res); return []; }
  const fx = applyFx(s, opt.fx); say(s, opt.res + (fx.length ? '  [' + fx.join(' ') + ']' : '')); return fx;
}
export function netWorth(s) {
  initLand(s);
  let land = 0;
  for (const id of s.land.own) {
    const lot = lotById(id); if (!lot) continue;
    land += lot.land + (s.land.built.includes(id) ? Math.round(HOUSE_COST * 0.7) : 0);
  }
  const owe = s.hh ? s.hh.loans.filter(l => l.payer === 'you' && l.state !== 'paid').reduce((a, l) => a + l.principal, 0) : 0;
  const shares = s.folio && s.folio.value || 0;
  return Math.round(s.cash + (s.bank || 0) + (s.fds || []).reduce((a, f) => a + f.amt, 0) + land + shares + Fin.vehicleWorth(s) - owe);
}

const BLOCKS = ['sleep', 'study', 'work', 'gym', 'roam', 'free'];
export const YEAR_SEC = Fin.YEAR_SEC; // 30 real minutes = 1 game year, and only while this life is on screen
export function ageParts(s) {
  const c = Fin.calendar(s, YEAR_SEC);
  return { y: c.y, m: c.m, d: c.d };
}
export function monthIndex(s) { return Fin.calendar(s, YEAR_SEC).index; }
export function dateLabel(s) { return Fin.calendar(s, YEAR_SEC).label; }
export function daysToFirst(s) { return Fin.calendar(s, YEAR_SEC).until; }
// Walk the player clock to the next 1st. One second at a time, the same way a frame crosses the boundary.
export function crossMonth(s) {
  ensureLife(s);
  const start = monthIndex(s);
  let g = 0;
  while (monthIndex(s) === start && g++ < 4000) {
    s.yearAt += 1;
    if (s.yearAt >= YEAR_SEC) { s.yearAt -= YEAR_SEC; s.age = (s.age | 0) + 1; }
  }
  return monthIndex(s);
}
export function ageLabel(s) { const a = ageParts(s); return `${a.y}y ${a.m}m ${a.d}d`; }
export function ageWords(s) {
  const a = ageParts(s), w = (n, one) => `${n} ${one}${n === 1 ? '' : 's'}`;
  return `${w(a.y, 'year')}, ${w(a.m, 'month')}, ${w(a.d, 'day')}`;
}
export function tickAge(s, dt) {
  if (!s || !s.alive || !(dt > 0)) return false;
  if (typeof s.yearAt !== 'number' || !Number.isFinite(s.yearAt)) s.yearAt = 0;
  if (s.yearAt < YEAR_SEC) s.yearAt = Math.min(YEAR_SEC, s.yearAt + dt);
  return s.yearAt >= YEAR_SEC;
}
export function ensureLife(s) {
  if (!s) return s;
  if (typeof s.yearAt !== 'number' || !Number.isFinite(s.yearAt)) s.yearAt = 0;
  if (!Array.isArray(s.plan) || s.plan.length !== 24) s.plan = Array.from({ length: 24 }, (_, h) => (h < 8 ? 'sleep' : h < 14 ? 'study' : h === 14 ? 'gym' : h < 18 ? 'roam' : 'free'));
  if (s.bank == null) s.bank = 0;
  if (typeof s.grades !== 'number') s.grades = clamp(40 + (s.S || 40) / 5);
  if (s.biz === undefined) s.biz = null;
  if (!s.interview) s.interview = null;
  if (typeof s.wages !== 'number') s.wages = 0;
  if (typeof s.fees !== 'number') s.fees = 0;
  if (typeof s.interest !== 'number') s.interest = 0;
  if (!Array.isArray(s.fds)) s.fds = [];
  if (typeof s.shop !== 'number') s.shop = 0;
  if (!s.birth) s.birth = 'ordinary';
  initLand(s);
  if (!s.hh || !s.hh.home) ensureHousehold(s);
  Fin.ensure(s);
  ensureCareer(s);
  if (!s.examSeen || typeof s.examSeen !== 'object') s.examSeen = {};
  if (s.job) {
    const j = jobById(s.job.id) || { sal: s.job.sal || 22000, hours: s.job.hours || 5, id: s.job.id, name: s.job.name, company: s.job.company };
    const o = jobOffer(s, { ...j, sal: s.job.sal || j.sal });
    if (!(s.job.rate > 0) || !Number.isFinite(s.job.rate)) { s.job.hours = s.job.pay === 'month' ? SHIFT.length : o.hours; s.job.rate = o.rate; }
    if (!(s.job.monthly > 0)) s.job.monthly = o.monthly;
    if (s.job.pay !== 'month') s.job.pay = 'hour';
    if (!s.job.base) s.job.base = s.job.sal;
    if (j.track && !s.job.track) { s.job.track = j.track; s.job.trackName = j.trackName; s.job.up = j.up; s.job.tier = j.tier || ''; s.job.perk = j.perk || null; s.job.rung = j.rung || 0; }
  }
  settleOldKeys(s);
  return s;
}
// A world-clock key (unix/300) is not a life month. Latch it to this month so the next 1st pays once, and this month does not pay again.
function settleOldKeys(s) {
  const key = monthIndex(s);
  if (s.job) {
    const n = clockNum(s.job.paidMonth);
    if (n != null && n >= Fin.WORLD_KEY) s.job.paidMonth = String(key);
  }
  const b = clockNum(s.bankMonth);
  if (b != null && b >= Fin.WORLD_KEY) s.bankMonth = key;
  if (s.hh) { const h = clockNum(s.hh.month); if (h != null && h >= Fin.WORLD_KEY) s.hh.month = key; }
  if (s.fin) { const f = clockNum(s.fin.key); if (f != null && f >= Fin.WORLD_KEY) s.fin.key = key; }
}
export function tally(plan) {
  const c = { sleep: 0, study: 0, work: 0, gym: 0, roam: 0, free: 0 };
  for (const b of plan || []) if (c[b] != null) c[b]++;
  return c;
}
export function studyPower(s) {
  ensureLife(s);
  const c = tally(s.plan), full = !!(s.job && s.job.pay === 'month');
  const drag = full ? 0 : Math.max(0, c.work - 6) * 0.09;
  return { study: c.study, work: c.work, drag, full, eff: Math.round(c.study * Math.max(0.15, 1 - drag) * 10) / 10 };
}
export function lockFullTime(s) {
  ensureLife(s);
  for (const h of SHIFT) s.plan[h] = 'work';
  let n = 0;
  for (let h = 0; h < 24; h++) {
    if (s.plan[h] !== 'study') continue;
    n++;
    if (n >= FULL_STUDY) s.plan[h] = 'free';
  }
}
export function paintBlock(s, hour, block) {
  ensureLife(s);
  hour = +hour;
  if (!BLOCKS.includes(block) || hour < 0 || hour > 23) return res(false, 'That hour is not on the day.');
  if (s.job && s.job.pay === 'month' && SHIFT.includes(hour) && block !== 'work') return res(false, 'Nine to five stays work. A monthly wage does not move.');
  if (block === 'study' && s.job && s.job.pay === 'month') {
    const next = s.plan.slice(); next[hour] = 'study';
    if (tally(next).study >= FULL_STUDY) return res(false, 'Full-time work leaves no full-time study. Five study hours is the most. Quit, or take the hourly rate, if you want the student day.');
  }
  s.plan[hour] = block;
  return res(true, '', []);
}
export function interviewOdds(s, j, score) {
  ensureLife(s);
  let p = chance(s, j); const sp = studyPower(s);
  p *= 0.65 + (s.grades || 50) / 200;
  p *= 0.75 + Math.min(sp.eff, 8) / 16;
  if (sp.work > 8) p *= Math.max(0.4, 1 - (sp.work - 8) * 0.07);
  if (sp.study < 2 && j.req && j.req.deg) p *= 0.72;
  if (typeof score === 'number') {
    const exp = Math.min(12, ((s.shifts || 0) / 20) + ((s.job && s.job.yrs) || 0));
    if (exp > 0) p *= Math.min(1.1, 1 + exp * 0.012);
    const sc = Math.max(0, Math.min(6, score));
    p *= 0.35 + (sc / 6) * 1.15;
  }
  if (j && j.track && (j.rung || 0) >= 2) p *= 0.62;
  // 18 Oct, Chairman: a strong interview should get the job - answers now dominate the odds
  if (typeof score === 'number') { const sc = Math.max(0, Math.min(6, score)); const entry = !(j && j.track && (j.rung || 0) >= 2); if (sc >= 6) p = Math.max(p, entry ? 0.9 : 0.7); else if (sc >= 4) p = Math.max(p, entry ? 0.65 : 0.45); }
  return Math.max(0.04, Math.min(0.95, p));
}
export function decideHire(s, j, score) {
  if (!j) return { ok: false, line: 'Not this time. That job is gone.', p: 0, score: 0 };
  const sc = Math.max(0, Math.min(6, score | 0));
  const p = interviewOdds(s, j, sc);
  const ok = p >= 0.45;
  const line = ok
    ? `Hired. You scored ${sc} of 6. Smarts, your record and your hours clear ${j.name}.`
    : (sc >= 4
      ? `Not this time. You scored ${sc} of 6, but the record and the hours do not clear ${j.name} yet.`
      : `Not this time. You scored ${sc} of 6. The answers did not show the work.`);
  return { ok, line, p, score: sc };
}
export function bookInterview(s, id, pay) {
  ensureLife(s);
  const j = jobById(id); if (!j) return res(false, 'That job is not open.');
  if (s.age < 18) return res(false, 'You must be 18 to work.');
  if (s.job && s.job.id === id) return res(false, 'You already work this job.');
  const nxt = s.job && nextPost(s);
  const external = !!(s.job && j.track && j.company && j.company !== s.job.company);
  if (s.job && !external) {
    if (nxt && nxt.id === id) return res(false, 'That is your next rung here. Apply internally, or wait for the review.');
    return res(false, 'You already work as ' + s.job.name + '. Quit first.');
  }
  if (s.interview && s.interview.id === id) return { ok: true, msg: 'The interview is still open.', fx: [], resume: true };
  if (s.interview) return res(false, `An interview for ${s.interview.name} is already waiting.`);
  if (s.rejected.includes(id)) return res(false, 'They said no this year. Try again after you age up.');
  const miss = jobStatus(s, j); if (miss.length) return res(false, 'Not qualified yet. Needs: ' + miss.join(', ') + '.');
  if (pay !== 'hour' && pay !== 'month') return res(false, 'Pick the hour, or the month.');
  if (pay === 'month' && tally(s.plan).study >= 7) return res(false, 'You are studying full time. A monthly wage is nine to five, so that day does not fit. Take the hourly rate while you study, or clear the study hours.');
  const o = jobOffer(s, j);
  const hard = !!(j.track && (j.rung || 0) >= 2);
  s.interview = { id, name: j.name, pay, company: j.company || '', q: '', turns: [], hard };
  const wage = pay === 'month' ? `${money(s, o.monthly)} a month, nine to five` : `${money(s, o.rate)} an hour, and you can keep studying`;
  say(s, `Interview for ${j.name}. ${wage}.`);
  return { ok: true, msg: `Interview for ${j.name}. ${wage}. ${hard ? 'Three harder questions.' : 'Three short choices about the work.'}`, fx: [], resume: false };
}
export function noteQuestion(s, q) {
  if (!s.interview) return;
  s.interview.q = q;
}
export function noteAnswer(s, q, a, pts) {
  if (!s.interview) return;
  s.interview.turns = s.interview.turns || [];
  s.interview.turns.push({ q, a, pts: pts | 0 });
  s.interview.q = '';
}
export function finishInterview(s, ok, line) {
  const iv = s.interview; if (!iv) return res(false, 'No interview open.');
  const j = jobById(iv.id);
  s.interview = null;
  if (!ok || !j) {
    if (j) s.rejected.push(j.id);
    s.H = clamp(s.H - 3);
    say(s, line || 'They said no.');
    return res(false, line || 'Not this time. Try again after you age up.', ['H-3']);
  }
  const o = giveJob(s, j, iv.pay);
  s.H = clamp(s.H + 5);
  const bit = iv.pay === 'month'
    ? `${money(s, o.monthly)} a month, nine to five. Full-time study does not fit beside it.`
    : `${money(s, o.rate)} an hour. Paint the hours. A full study day still fits.`;
  say(s, `Hired as ${j.name}. ${bit}`);
  return res(true, line || `Hired. ${j.name}. ${bit}`, ['H+5']);
}
export function applyHour(s, hour, r = Math.random) {
  ensureLife(s);
  const block = BLOCKS.includes(s.plan[hour]) ? s.plan[hour] : 'free';
  const lines = [], c = tally(s.plan), sp = studyPower(s);
  if (hour === 0) {
    s.rejected = []; s.time = c.roam; s.shop = 0;
    const cm = commuteHours(s), lost = Math.min(s.time, Math.round(cm.hours));
    if (lost > 0) { s.time -= lost; if (s.hh.commuteSaid !== lost) { s.hh.commuteSaid = lost; lines.push(`Home is ${cm.km} km out. Getting to town and back by ${cm.mode} eats ${lost} roam hour${lost > 1 ? 's' : ''} a day.`); } }
    if (c.sleep < 6) { s.L = clamp(s.L - (6 - c.sleep) * 2); s.why = "Exhausted - you haven't slept"; lines.push(`Only ${c.sleep} hours of sleep. You feel it.`); }
    if (s.school) s.grades = clamp(s.grades + sp.eff * 0.35 - (sp.work > 8 ? (sp.work - 8) * 0.8 : 0));
  }
  if (block === 'gym') { s.L = clamp(s.L + 2); s.B = clamp(s.B + 1); Fin.exercise(s); }
  if (block === 'study' && s.school) {
    s.school.studied = (s.school.studied || 0) + 1;
    s.grades = clamp(s.grades + Math.max(0.15, 1 - sp.drag) * 0.7);
    if (sp.work > 8 && hour === s.plan.indexOf('study')) lines.push(`Work is ${sp.work} hours, so this study hour only counts at ${Math.round(Math.max(0.15, 1 - sp.drag) * 100)}%.`);
  } else if (block === 'study' && r() < 0.34) s.S = clamp(s.S + 1);
  if (block === 'work' && s.job && s.job.pay === 'month') {
    s.shifts = (s.shifts || 0) + 1;
    if (hour === 9) lines.push(`${s.job.name} is nine to five. ${money(s, s.job.monthly)} lands in the bank each month.`);
  } else if (block === 'work' && s.job && s.job.rate) {
    const pay = s.job.rate; s.bank = (s.bank || 0) + pay; s.wages = (s.wages || 0) + pay; s.shifts = (s.shifts || 0) + 1; Fin.book(s, 'inc', 'salary', pay);
    if (hour === s.plan.indexOf('work')) {
      const want = s.job.hours || 5;
      lines.push(c.work < want
        ? `${s.job.name} pays ${money(s, pay)} an hour into the bank. It wants ${want} hours and you painted ${c.work}.`
        : `${s.job.name} pays ${money(s, pay)} an hour into the bank. ${c.work} hours today.`);
    }
  }
  const fam = s.hh && s.hh.biz && s.hh.biz.state === 'open' ? s.hh.biz : null;
  if (fam && block === 'work' && !s.job) {
    fam.help = (fam.help || 0) + (fam.owner === 'you' ? 2 : 1);
    if (hour === s.plan.indexOf('work')) lines.push(`No job yet, so work hours go to the counter at the ${fam.name}.`);
  }
  if (s.biz && (block === 'free' || block === 'roam' || (block === 'work' && !s.job))) {
    const take = shopTake(s);
    if (take > 0) { s.cash += take; s.shop = (s.shop || 0) + take; Fin.book(s, 'inc', 'business', take); }
  }
  for (const t of lines) say(s, t);
  return { block, lines };
}
export function shopQuote(s, id) {
  ensureLife(s);
  const b = BUSINESSES.find(x => x.id === (id || (s.biz && s.biz.id) || 'shop'));
  if (!b) return null;
  const day = loc(s, b.daily);
  return { id: b.id, name: b.name, cost: loc(s, b.cost), day, hour: Math.max(1, Math.round(day / 10)), daily: b.daily };
}
export function shopTake(s) {
  if (!s || !s.biz) return 0;
  const q = shopQuote(s, s.biz.id);
  if (!q) return 0;
  const cut = Math.max(0.3, 1 - Math.max(0, tally(s.plan).work - 6) * 0.08);
  return Math.round(q.hour * cut);
}
export function openBusiness(s, id) {
  ensureLife(s);
  if (s.biz) return res(false, `You already run ${s.biz.name}.`);
  const b = BUSINESSES.find(x => x.id === id); if (!b) return res(false, 'That business is not on offer.');
  const q = shopQuote(s, id);
  if (!spendAny(s, q.cost)) return res(false, `${b.name} costs ${money(s, q.cost)}. Pocket and bank together hold ${money(s, purse(s))}.`);
  Fin.bought(s, `Opened a ${b.name}`, q.cost);
  s.biz = { id, name: b.name, daily: b.daily };
  say(s, `You opened a ${b.name}. Daily figure ${money(s, q.day)}.`);
  return res(true, `${b.name} is open. Daily figure ${money(s, q.day)}. A free hour or a roam hour pays ${money(s, q.hour)}.`, ['-' + money(s, q.cost)]);
}
export const counts = () => ({ events: EVENTS.length, choices: CHOICES.length, activities: ACTIVITIES.length });

// Land past the city. The grid is the same for everyone, so other people and other AI already hold most of it.
const PEOPLE = ['Aarav Thapa', 'Sita Gurung', 'Bikash Rai', 'Anita Sharma', 'Prabin Tamang', 'Sunita Karki', 'Rohan Magar', 'Maya Basnet', 'Kiran Adhikari', 'Nisha Poudel', 'Sagar KC', 'Laxmi Shrestha'];
const AIS = ['Northline Holdings', 'Meridian Estates', 'Koshi Capital', 'Seto Ghar', 'Lalit Ledger', 'Bhotekoshi', 'Sagarmatha Systems', 'Ncell Nest'];
export const HOUSE_COST = 1800000;
const COL = { sale: 0xd6c36a, family: 0x7d9a52, person: 0x8d7b5c, ai: 0x6e8494, you: 0xe0b03a, player: 0x8d7b5c };
let DEEDS = {};
export function setDeeds(map) { DEEDS = map || {}; }
let _lots = null;
function mix(a, b) {
  let h = Math.imul(a, 374761393) + Math.imul(b, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}
export function lotGrid() {
  if (_lots) return _lots;
  const lots = [];
  for (let gx = -14; gx <= 14; gx++) for (let gz = -14; gz <= 14; gz++) {
    if (Math.abs(gx) <= 3 && Math.abs(gz) <= 3) continue;
    const x = gx * 22, z = gz * 22;
    if (Math.abs(x) < 72 && z > 58 && z < 240) continue;
    if (z < -40 && z > -700 && Math.abs(x) < 16) continue;
    if (z < -145 && z > -295 && x > -8 && x < 78) continue;
    if (x <= -88 && z >= -22 && z <= 44) continue;   // Laxmi Garden Road and Hillside Estates (world/homes.js)
    if (x >= 88 && z >= 0 && z <= 44) continue;      // Eastgate Colony and Brickfield Row
    if (Math.abs(x) < 18 && z >= 220 && z < 300) continue;   // the path south from the bazaar to the new streets
    if (z >= 248 && z <= 330 && x >= -340 && x <= 250) continue;   // New Market, Kiln Road, Tin Town, Riverside Lane
    const h = mix(gx + 40, gz + 40);
    const roll = h % 100;
    const kind = roll < 22 ? 'sale' : roll < 25 ? 'family' : roll < 60 ? 'person' : 'ai';
    const house = kind !== 'sale' && (h % 7) < 3;
    const dist = Math.hypot(x, z);
    let land = Math.round((2800000 - dist * 4200) / 50000) * 50000;
    if (land < 700000) land = 700000;
    if (land > 3200000) land = 3200000;
    const price = land + (house ? 1500000 : 0);
    const rent = 6000 + (h % 9) * 1500;
    const who = kind === 'sale' ? 'For sale' : kind === 'family' ? 'Your family' : kind === 'ai' ? AIS[h % AIS.length] : PEOPLE[h % PEOPLE.length];
    lots.push({ id: `L${gx}_${gz}`, x, z, kind, who, neighbour: PEOPLE[h % PEOPLE.length], land, price, house, rent });
  }
  _lots = lots;
  return lots;
}
export function lotById(id) { return lotGrid().find(l => l.id === id) || null; }
export function initLand(s) {
  if (!s) return null;
  if (!s.land) s.land = { own: [], built: [], let: [], sold: [], inherited: false, ready: false };
  if (!Array.isArray(s.land.own)) s.land.own = [];
  if (!Array.isArray(s.land.built)) s.land.built = [];
  if (!Array.isArray(s.land.let)) s.land.let = [];
  if (!Array.isArray(s.land.sold)) s.land.sold = [];
  if (s.land.ready) return s.land;
  s.land.ready = true;
  if (s.birth === 'spoon') {
    const near = lotGrid().filter(l => l.kind === 'family').sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z)).slice(0, 4);
    for (const lot of near) {
      s.land.own.push(lot.id);
      if (lot.house) s.land.built.push(lot.id);
    }
  }
  return s.land;
}
export function lotView(s, lot) {
  initLand(s);
  const released = s.land.sold.includes(lot.id);
  const own = s.land.own.includes(lot.id);
  const built = own ? s.land.built.includes(lot.id) : (!released && !!lot.house);
  const letOut = own && s.land.let.includes(lot.id);
  const poorFam = !released && s.birth === 'poor' && lot.kind === 'family';
  const holder = own ? 'you' : released ? 'sale' : poorFam ? 'person' : lot.kind;
  const who = own ? 'You' : released ? 'For sale' : poorFam ? lot.neighbour : lot.who;
  const canBuy = !own && (released || lot.kind === 'sale' || lot.kind === 'person' || lot.kind === 'ai' || poorFam);
  const d = DEEDS[lot.id];
  if (d && d.owner && s && d.owner !== s.pid) {
    return { ...lot, own: false, built: !!d.built, letOut: false, holder: 'player', who: d.name || 'Someone', canBuy: false, offer: true, away: !!d.away };
  }
  return { ...lot, own, built, letOut, holder, who, canBuy, offer: false, away: false };
}
export function lotPaint(s) {
  return lotGrid().map(lot => {
    if (!s) {
      const built = !!lot.house;
      return { color: COL[lot.kind], built };
    }
    const v = lotView(s, lot);
    const color = v.own ? COL.you : v.holder === 'family' ? COL.family : v.holder === 'ai' ? COL.ai : v.holder === 'sale' ? COL.sale : COL.person;
    return { color, built: v.built };
  });
}
export function landRentYear(s) {
  if (!s || !s.land || !s.land.let) return 0;
  let n = 0;
  for (const id of s.land.let) { const lot = lotById(id); if (lot && s.land.built.includes(id)) n += lot.rent * 12; }
  return n;
}
export function sellPrice(s, lot) {
  const built = s.land && s.land.built.includes(lot.id);
  return Math.round((lot.land + (built ? HOUSE_COST * 0.7 : 0)) * 0.92 / 10000) * 10000;
}
export function buyLot(s, id) {
  initLand(s);
  const lot = lotById(id); if (!lot) return res(false, 'That lot is not on the map.');
  const v = lotView(s, lot);
  if (v.own) return res(false, 'You already hold this lot.');
  if (!v.canBuy) return res(false, 'Your family holds this. It is not for sale.');
  const cost = v.built ? lot.price : lot.land;
  if (!spendAny(s, cost)) return res(false, `It costs ${money(s, cost)}. Pocket and bank together hold ${money(s, purse(s))}.`);
  s.land.own.push(id); s.land.sold = s.land.sold.filter(x => x !== id); Fin.bought(s, 'Bought a lot', cost);
  if (v.built && !s.land.built.includes(id)) s.land.built.push(id);
  say(s, `You bought a lot from ${v.who} for ${money(s, cost)}.`);
  return res(true, `Bought. ${money(s, cost)} left your pocket.`, ['-' + money(s, cost)]);
}
export function sellLot(s, id) {
  initLand(s);
  const lot = lotById(id); if (!lot) return res(false, 'That lot is not on the map.');
  if (!s.land.own.includes(id)) return res(false, 'You do not hold this lot.');
  const pay = sellPrice(s, lot);
  s.cash += pay; Fin.bought(s, 'Sold a lot', -pay);
  s.land.own = s.land.own.filter(x => x !== id);
  s.land.built = s.land.built.filter(x => x !== id);
  s.land.let = s.land.let.filter(x => x !== id);
  if (!s.land.sold.includes(id)) s.land.sold.push(id);
  say(s, `You sold a lot for ${money(s, pay)}.`);
  return res(true, `Sold for ${money(s, pay)}.`, ['+' + money(s, pay)]);
}
export function buildHouse(s, id) {
  initLand(s);
  const lot = lotById(id); if (!lot) return res(false, 'That lot is not on the map.');
  if (!s.land.own.includes(id)) return res(false, 'Buy the lot first.');
  if (s.land.built.includes(id)) return res(false, 'A house already stands here.');
  if (!spendAny(s, HOUSE_COST)) return res(false, `A house costs ${money(s, HOUSE_COST)}. Pocket and bank together hold ${money(s, purse(s))}.`);
  s.land.built.push(id); Fin.bought(s, 'Built a house', HOUSE_COST);
  say(s, `You built a house for ${money(s, HOUSE_COST)}.`);
  return res(true, `The house is up. ${money(s, HOUSE_COST)} for the build.`, ['-' + money(s, HOUSE_COST)]);
}
export function letHouse(s, id) {
  initLand(s);
  const lot = lotById(id); if (!lot) return res(false, 'That lot is not on the map.');
  if (!s.land.built.includes(id)) return res(false, 'Build a house before you let it.');
  if (s.land.let.includes(id)) return res(false, 'It is already let.');
  s.land.let.push(id);
  say(s, `You let the house. Rent is ${money(s, lot.rent)} a month, paid into your bank on the month tick.`);
  return res(true, `Let. ${money(s, lot.rent)} a month, paid into your bank on the 1st.`, []);
}
export function stopLet(s, id) {
  initLand(s);
  if (!s.land.let.includes(id)) return res(false, 'It is not let.');
  s.land.let = s.land.let.filter(x => x !== id);
  say(s, 'You took the house back. The rent stops.');
  return res(true, 'The tenants are gone. The rent stops.', []);
}

// ---------- birth circumstance, household, loans and the family business (numbers live in births.js, in rupees) ----------
const NP = COUNTRIES.Nepal;
const kf = s => K(s) / (NP.price * NP.rate);
const wf = s => W(s) / (NP.wage * NP.rate);
const nice = v => { const a = Math.abs(v), q = a >= 1e6 ? 10000 : a >= 1e5 ? 1000 : a >= 1e4 ? 100 : a >= 200 ? 5 : 1; return Math.round(v / q) * q; };
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const rin = (r, g) => g[0] + r() * (g[1] - g[0]);
const rint = (r, g) => Math.round(rin(r, g));
const num = v => { if (typeof v === 'string') { const t = v.replace(/[^0-9.\-]/g, ''); v = t === '' ? NaN : +t; } return typeof v === 'number' && Number.isFinite(v) ? v : null; };
const fit = (v, g, fb) => { const n = num(v); return n == null ? fb : lim(n, g[0], g[1]); };
const txt = (v, n, fb = '') => (typeof v === 'string' && v.trim() ? v.replace(/\s+/g, ' ').trim().slice(0, n) : fb);
const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
const first = n => String(n || '').split(' ')[0];
export const emi = (P, rate, months) => {
  const i = rate / 1200; if (!(P > 0)) return 0; if (!(i > 0)) return Math.round(P / months);
  return Math.round(P * i / (1 - Math.pow(1 + i, -months)));
};
const hfac = h => 0.55 + 0.009 * h;
export const BRACKET_OF_HOME = { bridge: 'homeless', shelter: 'homeless', slum: 'slum', shack: 'slum', oneroom: 'slum', flat_small: 'struggling', flat_owned: 'middle', house_small: 'middle', shophouse: 'failing', garden: 'comfortable', mansion: 'wealthy' };
const DOWN = { mansion: 'garden', garden: 'flat_small', house_small: 'flat_small', flat_owned: 'flat_small', shophouse: 'slum', flat_small: 'oneroom', oneroom: 'slum', shack: 'shelter', slum: 'shelter', shelter: 'shelter', bridge: 'bridge' };
const SLEEP_Q = { bridge: 0.25, shelter: 0.45, slum: 0.55, shack: 0.5, oneroom: 0.6, flat_small: 0.75, flat_owned: 0.85, house_small: 0.85, shophouse: 0.8, garden: 0.95, mansion: 1 };
const MEAL = { homeless: 60, slum: 110, struggling: 200, middle: 350, failing: 300, comfortable: 700, wealthy: 1500 };
function rng32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hashStr = t => { let h = 2166136261; for (const ch of String(t)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
export const circLegacy = c => (BIRTH.brackets[c] || BIRTH.brackets.middle).legacy;
export function rollCirc(r = Math.random) {
  const o = BIRTH.order, tot = o.reduce((a, k) => a + BIRTH.brackets[k].w, 0);
  let x = r() * tot;
  for (const k of o) { x -= BIRTH.brackets[k].w; if (x < 0) return k; }
  return o[o.length - 1];
}
export const rollTwists = (r = Math.random) => Object.keys(BIRTH.twists).filter(k => r() < BIRTH.twists[k].p);
// The facts the server hands the model: it may colour them in, never change them.
export function birthSeed(r = Math.random, circ = 'middle', twists) {
  const B = BIRTH.brackets[circ] || BIRTH.brackets.middle, N = BIRTH.names;
  const home = pick(B.homes, r), hood = BIRTH.homes[home].hood;
  return {
    circ, home, district: BIRTH.hoods[hood].name, size: rint(r, B.size), surname: pick(N.surnames, r),
    father: 42 + Math.floor(r() * 14), mother: 39 + Math.floor(r() * 13),
    twists: Array.isArray(twists) ? twists.filter(k => BIRTH.twists[k]) : rollTwists(r), hook: pick(BIRTH.hooks, r)
  };
}
const ABROAD_JOBS = ['building sites in Qatar', 'a factory in Malaysia', 'a restaurant kitchen in Dubai', 'a care home in Japan', 'a security firm in Saudi Arabia'];
function twistLine(tw, fam) {
  const p = fam.find(m => m.abroad);
  return [
    tw.includes('orphan') && 'Your parents died when you were small, and your grandparents raised you.',
    tw.includes('single') && !tw.includes('orphan') && `${fam.some(m => m.rel === 'mother') ? 'Your father' : 'Your mother'} died when you were six, and the family has managed on one parent since.`,
    p && `${cap(p.rel === 'mother' ? 'your mother' : p.rel === 'father' ? 'your father' : 'your ' + p.rel)} works on ${p.job.replace(/^works on /, '')} and sends money home.`,
    tw.includes('dispute') && 'A fight over your grandfather\'s will has part of the family property tied up in court.'
  ].filter(Boolean).join(' ');
}
export function fallbackBirth(circ, seed, r = Math.random) {
  if (!BIRTH.brackets[circ]) circ = 'middle';
  const B = BIRTH.brackets[circ], N = BIRTH.names, sd = seed || birthSeed(r, circ);
  const tw = sd.twists || [], sur = sd.surname || pick(N.surnames, r);
  const temper = () => pick(BIRTH.temperaments, r);
  const fam = [];
  const fa = { name: pick(N.male, r) + ' ' + sur, rel: 'father', age: sd.father || 48, temper: temper() };
  const mo = { name: pick(N.female, r) + ' ' + sur, rel: 'mother', age: sd.mother || 45, temper: temper() };
  if (tw.includes('orphan')) fam.push({ name: pick(N.male, r) + ' ' + sur, rel: 'grandfather', age: 68 + Math.floor(r() * 10), temper: temper() }, { name: pick(N.female, r) + ' ' + sur, rel: 'grandmother', age: 64 + Math.floor(r() * 10), temper: temper() });
  else if (tw.includes('single')) fam.push(r() < 0.7 ? mo : fa);
  else fam.push(fa, mo);
  const size = Math.max(sd.size || 3, fam.length + 1);
  if (!tw.includes('orphan') && size - 1 - fam.length >= 3 && r() < 0.5) fam.push({ name: pick(N.female, r) + ' ' + sur, rel: 'grandmother', age: 70 + Math.floor(r() * 12), temper: temper() });
  const ages = [9, 12, 14, 16, 20, 22, 24, 26];
  while (fam.length < size - 1) {
    const i = Math.floor(r() * N.young.length), age = ages.splice(Math.floor(r() * ages.length), 1)[0] || 11;
    fam.push({ name: N.young[i] + ' ' + sur, rel: i % 2 ? 'sister' : 'brother', age, temper: temper() });
  }
  if (tw.includes('abroad')) { const p = fam.find(m => m.rel === 'father') || fam.find(m => m.rel === 'mother') || fam.find(m => m.age >= 20); if (p) { p.abroad = true; p.job = 'works on ' + pick(ABROAD_JOBS, r); p.earns = 0; } }
  const heads = fam.filter(m => !m.abroad && m.age >= 19 && m.age < 76).sort((a, b) => (b.rel === 'father' || b.rel === 'grandfather') - (a.rel === 'father' || a.rel === 'grandfather') || (b.age - a.age));
  const income = rint(r, B.income), nEarn = Math.min(heads.length, rint(r, B.earners)) || (heads.length ? 1 : 0);
  const jobs = [...B.jobs];
  heads.forEach((m, i) => {
    if (i < nEarn) { m.job = jobs.splice(Math.floor(r() * jobs.length), 1)[0] || pick(B.jobs, r); m.earns = nice(income * (nEarn === 1 ? 1 : i === 0 ? 0.62 : 0.38)); }
  });
  for (const m of fam) if (!m.job) {
    m.job = m.age < 18 ? 'at school' : m.age < 27 && m.rel !== 'mother' && m.rel !== 'father' ? 'college student' : m.age >= 65 ? 'retired' : 'runs the household';
    m.earns = m.earns || 0;
  }
  const head = heads[0] || fam[0];
  const biz = B.biz ? (() => {
    const kind = pick(B.biz.kinds, r), revenue = nice(rint(r, B.biz.revenue));
    return { kind, name: `${sur} ${kind.replace(/\b\w/g, c => c.toUpperCase())}`, revenue, costs: nice(revenue * rin(r, B.biz.ratio)), staff: rint(r, B.biz.staff), stock: nice(rint(r, B.biz.stock)), health: rint(r, B.biz.health) };
  })() : null;
  const lenders = [...B.debts.lenders].sort(() => r() - 0.5);
  const debts = Array.from({ length: rint(r, B.debts.n) }, (_, i) => {
    const P = nice(rint(r, B.debts.principal)), rate = Math.round(rin(r, B.debts.rate) * 10) / 10, months = rint(r, B.debts.months);
    return { lender: lenders[i % lenders.length], principal: P, rate, months, instalment: emi(P, rate, months), due_day: 1 + Math.floor(r() * 28), collateral: i === 0 ? B.debts.collateral : 'none' };
  });
  const total = rint(r, B.assets);
  const assets = (BIRTH.split[circ] || [['savings', 1]]).map(([name, f]) => ({ name, value: nice(total * f) }));
  const kinds = [...B.events].sort(() => r() - 0.5).slice(0, 2 + (r() < 0.5 ? 1 : 0));
  for (const t of tw) if (BIRTH.twists[t].event && !kinds.includes(BIRTH.twists[t].event)) kinds.unshift(BIRTH.twists[t].event);
  const events = kinds.slice(0, 3).map(kind => ({ kind, year: 1 + Math.floor(r() * 3), trigger: BIRTH.trigger_of[kind] || 'time', text: BIRTH.event_text[kind] })).sort((a, b) => a.year - b.year);
  const story = [B.story.replace(/\{surname\}/g, sur).replace(/\{head\}/g, `Your ${head ? head.rel : 'family'} ${head ? first(head.name) : ''}`.replace(/\s+$/, '')), twistLine(tw, fam), sd.hook ? cap(sd.hook) + '.' : ''].filter(Boolean).join(' ');
  return {
    circ, src: 'fallback', seed: sd, twists: tw,
    home: { type: B.homes.includes(sd.home) ? sd.home : B.homes[0], desc: BIRTH.homes[B.homes.includes(sd.home) ? sd.home : B.homes[0]].label },
    family: fam.map(m => ({ name: m.name, rel: m.rel, age: m.age, job: m.job, temper: m.temper, earns: m.earns || 0, abroad: !!m.abroad })),
    cash: nice(rint(r, B.cash)), bank: nice(rint(r, B.bank)), purse: nice(rint(r, B.purse)),
    income: fam.reduce((a, m) => a + (m.earns || 0), 0), costs: nice(rint(r, B.costs)), rent: B.own ? 0 : nice(rint(r, B.rent)),
    remit: tw.includes('abroad') ? nice(rint(r, BIRTH.twists.abroad.remit)) : 0,
    debts, business: biz, assets, story, events
  };
}
const EN = t => !/[^\x20-\x7E\u2018\u2019\u201C\u201D\u2013\u2014\u2026]/.test(t);
// Check what the model wrote against the bracket: numbers are clamped, anything odd falls back to the hand-written life.
export function normBirth(raw, circ, seed, r = Math.random) {
  if (!BIRTH.brackets[circ]) circ = 'middle';
  const B = BIRTH.brackets[circ], fb = fallbackBirth(circ, seed, r), tw = fb.twists;
  if (!raw || typeof raw !== 'object') return fb;
  const o = { ...fb, src: txt(raw.src, 12, 'model') };
  const h = raw.home && typeof raw.home === 'object' ? raw.home : {};
  const ht = B.homes.includes(h.type) ? h.type : fb.home.type, hd = txt(h.desc, 160);
  o.home = { type: ht, desc: hd && EN(hd) ? hd : BIRTH.homes[ht].label };
  o.cash = nice(fit(raw.cash, B.cash, fb.cash)); o.bank = nice(fit(raw.bank, B.bank, fb.bank)); o.purse = nice(fit(raw.purse, B.purse, fb.purse));
  o.costs = nice(fit(raw.costs, B.costs, fb.costs)); o.rent = B.own ? 0 : nice(fit(raw.rent, B.rent, fb.rent));
  o.remit = tw.includes('abroad') ? nice(fit(raw.remit, BIRTH.twists.abroad.remit, fb.remit)) : 0;
  if (Array.isArray(raw.family)) {
    const fam = raw.family.slice(0, 8).map(m => m && typeof m === 'object' ? {
      name: txt(m.name, 32), rel: txt(m.rel || m.relation, 20).toLowerCase(), age: Math.round(fit(m.age, [1, 95], 0)),
      job: txt(m.job, 48, 'none'), temper: txt(m.temper || m.temperament, 60, pick(BIRTH.temperaments, r)), earns: Math.round(fit(m.earns, [0, B.income[1]], 0)), abroad: !!m.abroad
    } : null).filter(m => m && m.name && m.rel && m.age && EN(m.name + m.job + m.temper) && !/^(you|self|me)$/.test(m.rel));
    const parents = fam.filter(m => m.rel === 'father' || m.rel === 'mother').length;
    const ok = fam.length >= 1 && fam.some(m => m.age >= 19 && !m.abroad)
      && (tw.includes('orphan') ? parents === 0 : tw.includes('single') ? parents === 1 : parents >= 1)
      && (!tw.includes('abroad') || fam.some(m => m.abroad));
    if (ok) {
      if (tw.includes('abroad')) for (const m of fam) if (m.abroad) m.earns = 0;
      o.family = fam;
    }
  }
  const inc = fit(raw.income, B.income, fb.income), earners = o.family.filter(m => m.earns > 0 && !m.abroad), sum = earners.reduce((a, m) => a + m.earns, 0);
  if (sum > 0) for (const m of earners) m.earns = nice(m.earns * inc / sum);
  else if (inc > 0) { const hd2 = o.family.filter(m => !m.abroad && m.age >= 19).sort((a, b) => b.age - a.age)[0]; if (hd2) hd2.earns = nice(inc); }
  o.income = o.family.reduce((a, m) => a + (m.abroad ? 0 : m.earns), 0);
  if (Array.isArray(raw.debts)) {
    const D = B.debts, list = raw.debts.slice(0, D.n[1]).filter(d => d && typeof d === 'object').map((d, i) => {
      const P = nice(fit(d.principal, D.principal, fb.debts[i] ? fb.debts[i].principal : D.principal[0]));
      const rate = Math.round(fit(d.rate, D.rate, D.rate[0]) * 10) / 10, i1 = rate / 1200, A = num(d.instalment);
      let months = A && A > P * i1 ? Math.round(-Math.log(1 - P * i1 / A) / Math.log(1 + i1)) : (fb.debts[i] || {}).months || D.months[0];
      months = lim(Number.isFinite(months) ? months : D.months[0], D.months[0], D.months[1]);
      const lender = txt(d.lender, 60); 
      return { lender: lender && EN(lender) ? lender : (fb.debts[i] || {}).lender || D.lenders[0], principal: P, rate, months, instalment: emi(P, rate, months), due_day: Math.round(fit(d.due_day, [1, 28], 10)), collateral: i === 0 ? D.collateral : 'none' };
    });
    while (list.length < D.n[0] && fb.debts[list.length]) list.push(fb.debts[list.length]);
    o.debts = list;
  }
  if (B.biz && raw.business && typeof raw.business === 'object') {
    const b = raw.business, kind = txt(b.kind, 40), rev = nice(fit(b.revenue, B.biz.revenue, fb.business.revenue));
    const k2 = kind && EN(kind) ? kind.toLowerCase() : fb.business.kind, nm = txt(b.name, 50);
    o.business = { kind: k2, name: nm && EN(nm) ? nm : `${fb.seed.surname} ${k2.replace(/\b\w/g, c => c.toUpperCase())}`, revenue: rev, costs: nice(fit(b.costs, [rev * B.biz.ratio[0], rev * B.biz.ratio[1]], rev * (B.biz.ratio[0] + B.biz.ratio[1]) / 2)), staff: Math.round(fit(b.staff, B.biz.staff, fb.business.staff)), stock: nice(fit(b.stock, B.biz.stock, fb.business.stock)), health: fb.business.health };
  }
  if (Array.isArray(raw.assets)) {
    const list = raw.assets.slice(0, 6).filter(a => a && typeof a === 'object').map(a => ({ name: txt(a.name, 50), value: num(a.value) })).filter(a => a.name && EN(a.name) && a.value > 0);
    const tot = list.reduce((a, x) => a + x.value, 0), want = fit(tot, B.assets, 0);
    if (list.length && want > 0) o.assets = list.map(a => ({ name: a.name, value: nice(a.value * want / tot) }));
  }
  const st = txt(raw.story, 700);
  if (st && EN(st) && st.length >= 80 && (st.match(/[.!?](\s|$)/g) || []).length >= 2) o.story = st;
  if (Array.isArray(raw.events)) {
    const ev = raw.events.slice(0, 3).filter(e => e && typeof e === 'object' && BIRTH.event_text[e.kind]).map(e => {
      const t = txt(e.text, 220);
      return { kind: e.kind, year: Math.round(fit(e.year, [1, 3], 2)), trigger: BIRTH.triggers.includes(e.trigger) ? e.trigger : BIRTH.trigger_of[e.kind] || 'time', text: t && EN(t) ? t : BIRTH.event_text[e.kind] };
    });
    for (const e of fb.events) if (ev.length < 2 && !ev.some(x => x.kind === e.kind)) ev.push(e);
    if (ev.length >= 2) o.events = ev.sort((a, b) => a.year - b.year);
  }
  return o;
}
function homeRec(s, type, desc, own, rent) {
  const H = BIRTH.homes[type], hood = H.hood;
  return { type, desc: desc || H.label, own: !!own, rent: own ? 0 : rent || 0, late: 0, payer: 'family', hood, dist: BIRTH.hoods[hood].dist, free: 0 };
}
// old = an existing save: keep its money, parents and land, only add the household around it.
export function applyBirth(s, life, r = Math.random, old = false) {
  const k = kf(s), w = wf(s), B = BIRTH.brackets[life.circ];
  const P = v => nice((v || 0) * k), Wg = v => nice((v || 0) * w);
  const tw = life.twists || (life.seed && life.seed.twists) || [];
  const grown = old ? Math.max(0, (s.age || 18) - 18) : 0;
  s.circ = life.circ;
  if (!old) { s.birth = B.legacy; s.cash = P(life.cash); s.bank = (s.bank || 0) + P(life.bank); }
  const fam = life.family.map((m, i) => ({ id: 'f' + i, name: m.name, rel: m.rel, age: m.age + grown, job: m.job, temper: m.temper, earns: Wg(m.earns), abroad: !!m.abroad, alive: true }));
  for (const [rel, key] of [['father', 'dad'], ['mother', 'mom']]) {
    const m = fam.find(x => x.rel === rel), p = s[key];
    if (!p) continue;
    if (old) { if (m) { m.name = p.n; m.alive = p.alive !== false; } }
    else if (m) { p.n = m.name; p.alive = true; p.abroad = m.abroad || undefined; }
    else p.alive = false;
  }
  const debts = life.debts.map((d, i) => { const Pp = P(d.principal); return { id: 'n' + (i + 1), lender: d.lender, principal: Pp, start: Pp, rate: d.rate, months: d.months, instalment: emi(Pp, d.rate, d.months), due_day: d.due_day || 10, collateral: d.collateral || 'none', payer: 'family', missed: 0, late: 0, paid: 0, state: 'ok' }; });
  const b = life.business;
  const months0 = e => (e.year - 1) * 12 + 1 + Math.floor(r() * 10);
  const assets = life.assets.map(a => ({ name: a.name, value: P(a.value) }));
  s.hh = {
    v: 1, circ: life.circ, src: life.src || 'fallback', twists: tw, story: life.story || '', seed: life.seed || null,
    home: homeRec(s, life.home.type, life.home.desc, B.own, P(life.rent)),
    family: fam, income: fam.reduce((a, m) => a + (m.abroad ? 0 : m.earns), 0), costs: P(life.costs), purse: P(life.purse),
    remit: tw.includes('abroad') ? Wg(life.remit) : 0, loans: debts,
    biz: b ? { kind: b.kind, name: b.name, revenue: P(b.revenue), costs: P(b.costs), staff: b.staff, stock: P(b.stock), health: b.health, base: Math.round(P(b.revenue) / hfac(b.health)), trend: B.biz.trend, owner: 'family', state: 'open', help: 0, invest: 0, profit: P(b.revenue) - P(b.costs), lossRun: 0, goodRun: 0, last: null } : null,
    assets, frozen: tw.includes('dispute') ? nice(assets.reduce((a, x) => a + x.value, 0) * 0.3) : 0,
    events: life.events.map(e => ({ kind: e.kind, year: e.year, month: months0(e), trigger: e.trigger, text: e.text, done: false })),
    months: 0, month: null, log: [], car: !!B.car, servants: B.servants ? rint(r, B.servants) : 0, incMul: 1, incLeft: 0, short: 0, helped: 0
  };
  return s.hh;
}
export function ensureHousehold(s) {
  if (!s || (s.hh && typeof s.hh === 'object' && s.hh.home)) return s && s.hh;
  const r = rng32(hashStr((s.name || '') + '|' + (s.country || '') + '|' + (s.look || '')));
  const circ = BIRTH.brackets[s.circ] ? s.circ : BIRTH.legacy[s.birth] || 'middle';
  return applyBirth(s, fallbackBirth(circ, birthSeed(r, circ, []), r), r, true);
}
export function birthLabel(s) {
  const hh = s && s.hh; if (!hh) return s && s.birth === 'spoon' ? 'Born with a silver spoon' : s && s.birth === 'poor' ? 'Born poor' : 'An ordinary family';
  const B = BIRTH.brackets[hh.circ] || BIRTH.brackets.middle;
  return [B.label, ...hh.twists.map(t => BIRTH.twists[t] && BIRTH.twists[t].label.toLowerCase())].filter(Boolean).join('; ');
}
export function econAt(key) {
  const n = Math.sin(key * 12.9898 + 78.233) * 43758.5453;
  return 1 + 0.05 * Math.sin(key / 9) + 0.03 * Math.sin(key / 3.7 + 1.3) + (n - Math.floor(n) - 0.5) * 0.06;
}
// pocket first, then the bank (the same order as every monthly cost); line books it in the Finances ledger
function payYou(s, amt, line) {
  const bank = Math.max(0, s.bank || 0), pocket = Math.max(0, s.cash || 0);
  if (bank + pocket < amt) return false;
  const p = Math.min(pocket, amt); s.cash -= p; s.bank = (s.bank || 0) - (amt - p);
  if (line) Fin.book(s, 'exp', line, amt);
  return true;
}
function syncFamily(s, hh) {
  for (const [rel, key] of [['father', 'dad'], ['mother', 'mom']]) {
    const m = hh.family.find(x => x.rel === rel), p = s[key];
    if (m && p && m.alive && p.alive === false) { m.alive = false; m.earns = 0; m.job = 'passed away'; hh.income = hh.family.reduce((a, x) => a + (x.alive && !x.abroad ? x.earns : 0), 0); }
  }
}
function headToWage(s, hh, out) {
  const m = hh.family.filter(x => x.alive && !x.abroad && x.age >= 19 && x.age < 66).sort((a, b) => b.age - a.age)[0];
  if (!m) return;
  const pay = nice(19000 * wf(s));
  m.job = 'shop assistant at the new mall'; m.earns = (m.earns || 0) + pay; hh.income += pay;
  out.push(`${first(m.name)} takes work as a shop assistant for ${money(s, pay)} a month.`);
}
function closeBiz(s, hh, state, out) {
  const b = hh.biz; b.state = state;
  for (const l of hh.loans) if (l.state === 'ok' && l.collateral === 'shop') l.collateral = hh.home.own ? 'house' : 'none';
  headToWage(s, hh, out);
}
export function homeValue(s, type) {
  const own = (s.hh && s.hh.assets || []).find(a => /^the (home|shop-house|garden house|mansion)$/.test(a.name));
  const mv = BIRTH.moves[type] || {};
  return own && s.hh.home.type === type ? own.value : nice((mv.price || (type === 'shophouse' ? 9000000 : 0)) * kf(s));
}
export function moveHome(s, type, why, out, o = {}) {
  const hh = s.hh, H = BIRTH.homes[type]; if (!hh || !H) return false;
  const from = hh.home, mv = BIRTH.moves[type] || { rent: 0 };
  const rent = o.own ? 0 : o.rent != null ? o.rent : nice((mv.rent || 0) * kf(s));
  hh.home = { ...homeRec(s, type, H.label, !!o.own, rent), payer: o.payer || 'family', moved: (from.moved || 0) + 1, from: from.type };
  if (from.own && !o.keep) hh.assets = hh.assets.filter(a => !/^the (home|shop-house|garden house|mansion)$/.test(a.name));
  if (o.own) hh.assets.unshift({ name: type === 'mansion' ? 'the mansion' : type === 'garden' ? 'the garden house' : 'the home', value: o.value || homeValue(s, type) });
  const nb = BIRTH.brackets[BRACKET_OF_HOME[type]], mid = nice((nb.costs[0] + nb.costs[1]) / 2 * kf(s));
  const up = BIRTH.order.indexOf(BRACKET_OF_HOME[type]) > BIRTH.order.indexOf(BRACKET_OF_HOME[from.type]);
  hh.costs = up ? Math.max(hh.costs, mid) : Math.min(hh.costs, mid);
  if (why) { if (out) out.push(why); else notice(s, why); }
  return true;
}
function bizMonth(s, hh, econ, out) {
  const b = hh.biz, helpK = Math.min(1, (b.help || 0) / 4);
  const rev = Math.round(b.base * hfac(b.health) * econ * (1 + 0.12 * helpK));
  const cost = Math.round(b.costs * (0.6 + 0.4 * rev / Math.max(1, b.revenue)));
  const profit = rev - cost;
  b.last = { rev, cost, profit, econ: Math.round(econ * 1000) / 1000, help: b.help || 0, invest: b.invest || 0 };
  b.profit = profit;
  const drift = b.trend + (econ - 1) * 25 + helpK * 2.8 + (b.invest ? 7 : 0) + (profit < 0 ? -0.5 : 0.2);
  b.health = lim(Math.round((b.health + drift) * 10) / 10, 0, 100);
  if (b.help > 0) hh.helped = (hh.helped || 0) + 1;
  b.help = 0; b.invest = 0;
  b.lossRun = profit < 0 ? b.lossRun + 1 : 0;
  b.goodRun = profit > 0 && b.health >= 55 ? b.goodRun + 1 : 0;
  if (b.trend < 0 && b.goodRun >= 4) { b.trend = 0.3; out.push(`The ${b.name} has turned the corner. Customers are coming back.`); }
  if (b.owner === 'you') {
    if (profit >= 0) { s.bank = (s.bank || 0) + profit; Fin.book(s, 'inc', 'business', profit); }
    else if (payYou(s, -profit)) Fin.book(s, 'inc', 'business', profit);
    else { b.health = lim(b.health - 4, 0, 100); out.push(`The ${b.name} lost ${money(s, -profit)} and you could not cover it. Suppliers go unpaid.`); }
  } else hh.purse += profit;
  if (b.health <= 3 && b.lossRun >= 3) { out.push(`The ${b.name} pulls its shutter down for good. The stock goes for ${money(s, nice(b.stock * 0.35))}.`); hh.purse += nice(b.stock * 0.35); closeBiz(s, hh, 'closed', out); }
  return profit;
}
function rentMonth(s, hh, out) {
  const h = hh.home;
  if (h.serverRent) return 0;
  if ((h.own && !h.familyStay) || !(h.rent > 0)) return 0;
  if (h.free > 0) { h.free--; return 0; }
  if (h.payer === 'you' ? payYou(s, h.rent, 'rent') : hh.purse >= h.rent) { if (h.payer !== 'you') hh.purse -= h.rent; h.late = 0; return h.rent; }
  h.late++; hh.lateRent = true;
  if (h.late === 1) out.push(`Rent of ${money(s, h.rent)} is late. The landlord wants it by next month.`);
  else { const to = DOWN[h.type] || 'shelter'; moveHome(s, to, `Two months behind on rent. The family is evicted and moves to ${lc1(BIRTH.homes[to].label)}.`, out); s.H = clamp(s.H - 8); }
  return 0;
}
function defaultLoan(s, hh, l, out) {
  const b = hh.biz;
  l.late = 0;
  if (l.collateral === 'vehicle') return Fin.repossess(s, l, out);
  if (l.collateral === 'shop' && b && b.state === 'open') {
    const val = nice(b.stock * 0.6 + b.revenue * 1.2 * (0.3 + b.health / 100));
    out.push(`Three instalments missed. ${cap(l.lender)} seizes the ${b.name} and sells the business for ${money(s, val)}.`);
    closeBiz(s, hh, 'seized', out);
    l.principal -= val;
    if (l.principal <= 0) { hh.purse -= l.principal; l.principal = 0; l.state = 'closed'; out.push('The sale covers the loan, just.'); }
    else { l.collateral = hh.home.own ? 'house' : 'none'; out.push(`${money(s, l.principal)} is still owed${l.collateral === 'house' ? ', and now the house stands behind it' : ''}.`); }
    s.H = clamp(s.H - 10);
    return 'shop';
  }
  if (l.collateral === 'house' && hh.home.own) {
    const val = nice(homeValue(s, hh.home.type) * 0.7), left = Math.max(0, val - l.principal);
    out.push(`The bank takes the house and auctions it for ${money(s, val)} to clear the ${l.lender} loan.`);
    l.principal = 0; l.state = 'closed';
    for (const x of hh.loans) if (x.state === 'ok' && x.collateral === 'house') x.collateral = 'none';
    hh.purse += left;
    const to = left > nice(150000 * kf(s)) ? 'flat_small' : 'slum';
    moveHome(s, to, `${left ? money(s, left) + ' is left after the auction. ' : ''}The family moves to ${lc1(BIRTH.homes[to].label)}.`, out);
    s.H = clamp(s.H - 12);
    return 'house';
  }
  if (!l.threat) {
    l.threat = true;
    l.rate = Math.min(72, Math.round((l.rate + 6) * 10) / 10);
    l.instalment = emi(l.principal, l.rate, Math.max(6, l.months - l.paid));
    out.push(`${cap(l.lender)} sends men to the door. The rate goes up to ${l.rate}%, and the instalment to ${money(s, l.instalment)}.`);
    s.H = clamp(s.H - 6);
    return 'threat';
  }
  l.state = 'court';
  out.push(`${cap(l.lender)} takes the family to court. From now on a third of the family wages go straight to it until ${money(s, l.principal)} is paid.`);
  s.H = clamp(s.H - 8);
  return 'court';
}
function courtMonth(s, hh, l, wages) {
  const take = Math.min(l.principal, Math.round(Math.max(0, wages) / 3));
  hh.purse -= take; l.principal -= take; l.last = { due: take, int: 0, ok: true, court: true };
  if (l.principal <= 0) { l.principal = 0; l.state = 'closed'; }
  return take;
}
const lc1 = t => t.charAt(0).toLowerCase() + t.slice(1);
const NEEDS = {
  big_order: hh => hh.biz && hh.biz.state === 'open', supplier_cut: hh => hh.biz && hh.biz.state === 'open', collapse: hh => hh.biz && hh.biz.state === 'open',
  expansion: hh => hh.biz && hh.biz.state === 'open', creditor_call: hh => hh.loans.some(l => l.state === 'ok'),
  rent_hike: hh => !hh.home.own && hh.home.rent > 0, eviction_threat: hh => !hh.home.own && hh.home.rent > 0,
  room_offer: hh => ['bridge', 'shelter'].includes(hh.home.type), remittance_stops: hh => hh.remit > 0, car_crash: hh => hh.car
};
function loanMonth(s, hh, l, out) {
  const int = Math.round(l.principal * l.rate / 1200), due = Math.min(l.instalment, l.principal + int);
  const you = l.payer === 'you';
  if (l.prepaid) { l.prepaid = false; l.last = { due, int, ok: true, early: true }; return 0; }
  if (you ? payYou(s, due, 'loan') : hh.purse >= due) {
    if (!you) hh.purse -= due;
    l.principal = l.principal + int - due; l.paid++; l.late = 0; l.last = { due, int, ok: true };
    if (l.principal <= 0) { l.principal = 0; l.state = 'closed'; out.push(`The ${l.lender} loan is paid off.`); }
    return due;
  }
  const pen = Math.round(due * 0.02);
  l.principal += int + pen; l.missed++; l.late++; hh.missedNow = true;
  l.last = { due, int, ok: false, pen };
  out.push(`${you ? 'You' : 'The family'} missed the ${l.lender} instalment of ${money(s, due)}. A ${money(s, pen)} penalty is added; the loan stands at ${money(s, l.principal)}.${l.late === 1 ? ' The bank sends a letter.' : l.late === 2 ? ' The bank sends a final notice.' : ''}`);
  if (l.late >= 3) l.last.consequence = defaultLoan(s, hh, l, out);
  return 0;
}
const TRIG = {
  time: () => true, missed: hh => hh.missedNow || hh.loans.some(l => l.late > 0), late_rent: hh => hh.lateRent || hh.home.late > 0,
  low_purse: hh => hh.purse < hh.costs * 0.5, helped: hh => (hh.helped || 0) > 0
};
function fireEvent(s, hh, e, out) {
  const k = kf(s), P = v => nice(v * k), b = hh.biz && hh.biz.state === 'open' ? hh.biz : null;
  const take = v => { const t = Math.min(hh.purse, Math.max(0, Math.round(v))); hh.purse -= t; return t; };
  let fx = '';
  switch (e.kind) {
    case 'room_offer': if (['bridge', 'shelter'].includes(hh.home.type)) { moveHome(s, 'slum', '', out); hh.home.free = 6; fx = 'The family moves into a room in Riverside Lane. Six months rent free.'; s.H = clamp(s.H + 8); } break;
    case 'school_fight': s.S = clamp(s.S + 3); s.H = clamp(s.H - 3); break;
    case 'food_crisis': s.L = clamp(s.L - 5); s.why = 'Underfed - the family is short of food'; s.H = clamp(s.H - 4); take(hh.costs * 0.3); break;
    case 'injury': case 'earner_sick': hh.incMul = e.kind === 'injury' ? 0.5 : 0.6; hh.incLeft = e.kind === 'injury' ? 6 : 4; fx = `Family income drops to ${Math.round(hh.incMul * 100)}% for ${hh.incLeft} months.`; if (e.kind === 'earner_sick') take(P(15000)); break;
    case 'eviction_threat': if (!hh.home.own && hh.home.rent > 0) hh.home.late = Math.max(hh.home.late, 1); s.H = clamp(s.H - 4); break;
    case 'rent_hike': if (!hh.home.own && hh.home.rent > 0) { hh.home.rent = nice(hh.home.rent * 1.2); fx = `Rent is now ${money(s, hh.home.rent)}.`; } break;
    case 'neighbour_help': hh.purse += P(2000); s.H = clamp(s.H + 3); break;
    case 'flood': fx = `${money(s, take(P(8000)))} lost.`; s.H = clamp(s.H - 3); break;
    case 'fee_rise': hh.costs = nice(hh.costs * 1.08); fx = `Household costs are now ${money(s, hh.costs)} a month.`; break;
    case 'promotion': { const m = hh.family.find(x => x.alive && x.earns > 0 && !x.abroad); if (m) { const add = nice(m.earns * 0.2); m.earns += add; hh.income += add; fx = `${first(m.name)} now earns ${money(s, m.earns)} a month.`; } break; }
    case 'land_offer': { const v = P(400000); hh.purse += v; fx = `The family sells a strip for ${money(s, v)}.`; break; }
    case 'wedding_cost': fx = `${money(s, take(Math.max(P(50000), hh.purse * 0.15)))} goes on the wedding.`; break;
    case 'creditor_call': for (const l of hh.loans) if (l.state === 'ok') { l.rate = Math.min(72, l.rate + 1.5); l.instalment = emi(l.principal, l.rate, Math.max(6, l.months - l.paid)); } s.H = clamp(s.H - 3); break;
    case 'big_order': if (b) { b.health = lim(b.health + 18, 0, 100); const v = nice(b.revenue * 0.15); hh.purse += v; fx = `${money(s, v)} extra, and word gets round.`; } break;
    case 'supplier_cut': if (b) { b.health = lim(b.health - 8, 0, 100); b.stock = nice(b.stock * 0.8); } break;
    case 'collapse': if (b) { b.health = lim(b.health - 15, 0, 100); b.trend -= 0.6; } break;
    case 'expansion': if (b) { b.revenue = nice(b.revenue * 1.25); b.base = nice(b.base * 1.25); b.costs = nice(b.costs * 1.2); const P2 = nice(b.revenue * 2); hh.loans.push({ id: 'n' + (hh.loans.length + 1), lender: 'Sansar Bank (expansion loan)', principal: P2, start: P2, rate: 13, months: 60, instalment: emi(P2, 13, 60), due_day: 15, collateral: 'shop', payer: 'family', missed: 0, late: 0, paid: 0, state: 'ok' }); fx = `A new ${money(s, P2)} loan at 13%.`; } break;
    case 'tax_audit': fx = `A ${money(s, take(b ? b.revenue * 0.2 : hh.income * 2))} fine.`; break;
    case 'car_crash': fx = `Repairs cost ${money(s, take(P(250000)))}.`; break;
    case 'scandal': s.H = clamp(s.H - 8); if (b) b.health = lim(b.health - 10, 0, 100); take(hh.purse * 0.03); break;
    case 'family_feud': fx = `${money(s, take(hh.purse * 0.1))} goes on lawyers.`; s.mom.rel = clamp((s.mom.rel || 50) - 6); s.dad.rel = clamp((s.dad.rel || 50) - 6); break;
    case 'market_loss': { const a = hh.assets.find(x => /shares|portfolio/.test(x.name)); if (a) { const v = nice(a.value * 0.2); a.value -= v; fx = `${money(s, v)} wiped off the shares.`; } take(hh.purse * 0.05); break; }
    case 'trust_release': { const v = nice(P(2000000)); s.bank = (s.bank || 0) + v; Fin.book(s, 'inc', 'other', v); fx = `${money(s, v)} lands in your bank account.`; s.H = clamp(s.H + 4); break; }
    case 'inheritance_dispute': fx = `${money(s, hh.frozen)} of property is frozen; ${money(s, take(hh.purse * 0.05))} goes on lawyers.`; break;
    case 'remittance_stops': if (hh.remit) { fx = `${money(s, hh.remit)} a month stops.`; hh.remit = 0; } break;
    case 'grandparent_ill': fx = `The hospital takes ${money(s, take(P(60000)))}.`; hh.costs += P(5000); break;
  }
  out.push([e.text, fx].filter(Boolean).join(' '));
}
// One world month for the household: wages, costs, the business, rent, instalments, then any event that is due.
export function householdMonth(s, key = 0) {
  const hh = ensureHousehold(s); if (!hh) return [];
  const out = []; hh.months++;
  const econ = econAt(key);
  hh.missedNow = false; hh.lateRent = false;
  syncFamily(s, hh);
  if (hh.months % 12 === 0) for (const m of hh.family) if (m.alive) m.age++;
  const wages = Math.round(hh.income * (hh.incMul || 1));
  if (hh.incLeft > 0 && --hh.incLeft === 0) hh.incMul = 1;
  hh.purse += wages + (hh.remit || 0) - hh.costs;
  const open = hh.biz && hh.biz.state === 'open', profit = open ? bizMonth(s, hh, econ, out) : 0;
  const rent = rentMonth(s, hh, out);
  let paid = 0;
  for (const l of hh.loans) if (l.state === 'ok') paid += loanMonth(s, hh, l, out); else if (l.state === 'court') paid += courtMonth(s, hh, l, wages);
  let short = 0;
  if (hh.purse < 0) { short = -hh.purse; hh.short++; s.H = clamp(s.H - 3); s.L = clamp(s.L - 1); s.why = 'Underfed - the family is short of food'; if (hh.short === 1 || hh.short % 6 === 0) out.push(`The family is ${money(s, short)} short ${hh.short > 1 ? `again, ${hh.short} months running` : 'this month'}. Meals get smaller.`); hh.purse = 0; }
  else hh.short = 0;
  for (const e of hh.events) {
    if (e.done || hh.months < e.month) continue;
    if (NEEDS[e.kind] && !NEEDS[e.kind](hh)) { e.done = 'lapsed'; continue; }
    if (TRIG[e.trigger] ? TRIG[e.trigger](hh) : true) { e.done = true; fireEvent(s, hh, e, out); break; }
    if (hh.months > e.month + 24) e.done = 'lapsed';
  }
  hh.last = { m: hh.months, econ: Math.round(econ * 1000) / 1000, wages, remit: hh.remit || 0, costs: hh.costs, profit: open ? profit : null, rent, paid, short, purse: hh.purse };
  hh.log.unshift(hh.last); if (hh.log.length > 24) hh.log.length = 24;
  for (const t of out) notice(s, t);
  return out;
}
export function accrueHousehold(s) {
  const hh = ensureHousehold(s); if (!hh) return false;
  const key = monthIndex(s);
  const prev = clockNum(hh.month);
  if (prev == null || prev >= Fin.WORLD_KEY) { hh.month = key; return false; }
  if (prev === key) return false;
  hh.month = key;
  if (prev + 1 !== key) return false;
  return householdMonth(s, key).length > 0;
}
export function familyAtHome(s, hour) {
  const hh = s && s.hh; if (!hh) return [];
  const h = ((hour % 24) + 24) % 24;
  return hh.family.filter((m) => {
    if (!m.alive || m.abroad) return false;
    if (h >= 18 || h < 6) return true;
    if (m.age < 6) return true;
    if (m.age < 18 && h >= 8 && h < 16) return false;
    if ((m.earns || 0) > 0 && h >= 8 && h < 17) return false;
    return true;
  });
}
export function householdView(s) {
  const hh = ensureHousehold(s), k = kf(s);
  const b = hh.biz && hh.biz.state === 'open' ? hh.biz : null;
  const profit = b ? (b.last ? b.last.profit : b.revenue - b.costs) : 0;
  const loans = hh.loans.filter(l => l.state === 'ok');
  const inst = loans.reduce((a, l) => a + l.instalment, 0);
  const rent = hh.home.own ? 0 : hh.home.free > 0 ? 0 : hh.home.rent;
  const inc = Math.round(hh.income * (hh.incMul || 1)) + (hh.remit || 0) + (b && b.owner !== 'you' ? profit : 0);
  const net = inc - hh.costs - (hh.home.payer === 'you' ? 0 : rent) - loans.filter(l => l.payer !== 'you').reduce((a, l) => a + l.instalment, 0);
  return { hh, b, profit, loans, inst, rent, inc, net, meal: nice(MEAL[BRACKET_OF_HOME[hh.home.type]] * k), hood: BIRTH.hoods[hh.home.hood].name, label: birthLabel(s), months: net < 0 && hh.purse > 0 ? Math.floor(hh.purse / -net) : null };
}
// ---------- what the player can do for the household ----------
export function giveFamily(s, amt) {
  ensureLife(s); amt = Math.round(+amt);
  if (!(amt > 0)) return res(false, 'Type an amount first.');
  if (!spendAny(s, amt)) return res(false, `Pocket and bank together hold ${money(s, purse(s))}.`);
  s.hh.purse += amt; Fin.book(s, 'exp', 'other', amt);
  s.mom.rel = clamp((s.mom.rel || 50) + 3); s.dad.rel = clamp((s.dad.rel || 50) + 3);
  say(s, `You gave the family ${money(s, amt)}.`);
  return res(true, `${money(s, amt)} into the family purse. It now holds ${money(s, s.hh.purse)}.`, ['H+2']);
}
export function payInstalment(s, id) {
  ensureLife(s);
  const l = s.hh.loans.find(x => x.id === id && x.state === 'ok'); if (!l) return res(false, 'That loan is closed.');
  const due = Math.min(l.instalment, l.principal + Math.round(l.principal * l.rate / 1200));
  if (!payYou(s, due, 'loan')) return res(false, `The instalment is ${money(s, due)}. Your pocket and bank are short.`);
  if (l.late > 0) { l.late--; l.principal = Math.max(0, l.principal - due); }
  else { l.principal = Math.max(0, l.principal + Math.round(l.principal * l.rate / 1200) - due); l.prepaid = true; l.paid++; }
  if (l.principal <= 0) { l.state = 'closed'; say(s, `You cleared the ${l.lender} loan.`); return res(true, `The ${l.lender} loan is cleared.`, ['H+6']); }
  say(s, `You paid ${money(s, due)} to ${l.lender}.`);
  return res(true, `${money(s, due)} paid to ${l.lender}. ${l.late ? `${l.late} instalment${l.late > 1 ? 's' : ''} still behind.` : 'Nothing is behind.'} ${money(s, l.principal)} left.`, ['H+2']);
}
export function helpShop(s) {
  ensureLife(s);
  const b = s.hh.biz; if (!b || b.state !== 'open') return res(false, 'There is no family shop to help in.');
  if (!useTime(s)) return res(false, 'No roam hours left today.');
  b.help = (b.help || 0) + 1; s.L = clamp(s.L - 1); s.why = 'Run down from overwork';
  s.dad.rel = clamp((s.dad.rel || 50) + 2);
  return res(true, `You work the counter at the ${b.name} for an hour. Help this month: ${b.help} of 4 hours that count.`, ['L-1']);
}
export function takeOverShop(s) {
  ensureLife(s);
  const b = s.hh.biz; if (!b || b.state !== 'open') return res(false, 'There is no family shop.');
  if (b.owner === 'you') return res(false, 'You already run it.');
  b.owner = 'you';
  for (const l of s.hh.loans) if (l.state === 'ok' && l.collateral === 'shop') l.payer = 'you';
  say(s, `You took over the ${b.name}. Its profit goes to your bank, and its loans are yours to pay.`);
  return res(true, `The ${b.name} is yours to run. Profit lands in your bank each month; shop loan instalments come from your bank, then pocket.`, ['H+4']);
}
export function restockShop(s) {
  ensureLife(s);
  const b = s.hh.biz; if (!b || b.state !== 'open') return res(false, 'There is no family shop.');
  if (b.invest) return res(false, 'You already restocked this month.');
  const cost = nice(b.revenue * 0.12);
  if (!payYou(s, cost, 'other')) return res(false, `Restocking and a coat of paint cost ${money(s, cost)}. Your bank and pocket are short.`);
  b.invest = 1; b.stock += cost;
  say(s, `You put ${money(s, cost)} into new stock and paint for the ${b.name}.`);
  return res(true, `${money(s, cost)} on fresh stock and paint. The shop's health will jump at the month end.`, []);
}
export function cutStaff(s) {
  ensureLife(s);
  const b = s.hh.biz; if (!b || b.state !== 'open') return res(false, 'There is no family shop.');
  if (b.staff <= 1) return res(false, 'Only one person is left. You cannot cut further.');
  b.staff--; b.costs = nice(b.costs * 0.94); b.health = lim(b.health - 2, 0, 100);
  say(s, `The ${b.name} let one worker go.`);
  return res(true, `One worker goes. Costs are now ${money(s, b.costs)} a month; ${b.staff} staff left.`, ['H-2']);
}
export function shopPrice(s) { const b = s.hh && s.hh.biz; return b ? nice(b.stock * 0.8 + Math.max(0, b.revenue * 12 * 0.12 * (b.health / 100))) : 0; }
export function sellShop(s) {
  ensureLife(s);
  const hh = s.hh, b = hh.biz; if (!b || b.state !== 'open') return res(false, 'There is no family shop to sell.');
  const price = shopPrice(s);
  let left = price, cleared = 0;
  for (const l of hh.loans) if (l.state === 'ok' && l.collateral === 'shop') { const p = Math.min(left, l.principal); l.principal -= p; left -= p; cleared += p; if (l.principal <= 0) l.state = 'closed'; }
  if (b.owner === 'you') { s.bank = (s.bank || 0) + left; Fin.bought(s, `Sold the ${b.name}`, -left); } else hh.purse += left;
  const out = [];
  closeBiz(s, hh, 'sold', out);
  const msg = `The ${b.name} is sold for ${money(s, price)}. ${money(s, cleared)} clears the shop loans; ${money(s, left)} is left.`;
  say(s, msg); for (const t of out) say(s, t);
  return res(true, msg + (out.length ? ' ' + out.join(' ') : ''), []);
}
export function moveOptions(s) {
  const hh = ensureHousehold(s), k = kf(s);
  return Object.entries(BIRTH.moves).filter(([t]) => t !== hh.home.type && BIRTH.homes[t]).map(([type, m]) => ({ type, label: BIRTH.homes[type].label, hood: BIRTH.hoods[BIRTH.homes[type].hood].name, rent: nice(m.rent * k), price: nice(m.price * k) }));
}
export function ownsHome(s) {
  const h = s && s.hh && s.hh.home;
  if (!h || h.familyStay) return false;
  if (h.youOwn) return true;
  return !!(h.own && h.payer === 'you');
}
export function familyRel(s) {
  const ps = ['mom', 'dad'].map(k => s[k]).filter(p => p && p.alive !== false);
  if (!ps.length) return 40;
  return ps.reduce((a, p) => a + (Number(p.rel) || 50), 0) / ps.length;
}
// At 21 the family either asks for rent or asks you to leave. Birth and how close you are decide which.
// A family house you pay to stay in is not a home in your name.
export function leaveHomeAsk(s) {
  if (!s || !s.hh || !s.hh.home || s.leftAsk) return null;
  if ((s.age | 0) !== 21) return null;
  s.leftAsk = 1;
  const rel = familyRel(s), h = s.hh.home, own = !!h.own;
  const circ = (s.hh && s.hh.circ) || s.circ || 'middle';
  const cold = rel < (own ? 48 : 58);
  const nowhere = circ === 'homeless' || h.type === 'bridge' || h.type === 'shelter';
  if (nowhere || cold) {
    s.mustLeave = 1;
    return 'Your family asks you to move out. Find a place. The rental office lists rooms: farther from town is cheaper, and the trip takes longer.';
  }
  let rent = h.rent > 0 ? h.rent : nice(((BIRTH.moves[h.type] && BIRTH.moves[h.type].rent) || 20000) * kf(s));
  if (!(rent > 0)) rent = nice(20000 * kf(s));
  h.rent = rent; h.payer = 'you'; h.late = 0;
  if (own) h.familyStay = 1;
  return 'Your family asks for rent: ' + money(s, rent) + ' a month from your bank. This home is not in your name.';
}
export function moveHouse(s, type, mode = 'rent') {
  ensureLife(s);
  const o = moveOptions(s).find(x => x.type === type); if (!o) return res(false, 'That home is not on offer.');
  if (mode === 'buy') {
    if (!(o.price > 0)) return res(false, `${o.label} is not for sale.`);
    if (!payYou(s, o.price)) return res(false, `${o.label} costs ${money(s, o.price)}. Your bank and pocket together are short.`);
    Fin.bought(s, `Bought ${lc1(o.label)}`, o.price);
    if (s.hh.home.own) { const v = nice(homeValue(s, s.hh.home.type) * 0.9); s.hh.purse += v; say(s, `The old home sells for ${money(s, v)}, which goes to the family.`); }
    moveHome(s, type, '', null, { own: true, value: o.price, payer: 'you' });
  } else {
    if (type === 'mansion') return res(false, 'Nobody rents out the Hillside mansions.');
    const need = o.rent * 2;
    if (o.rent > 0 && !payYou(s, need, 'rent')) return res(false, `${o.label} wants ${money(s, need)} up front (deposit and first month). Your bank and pocket are short.`);
    if (s.hh.home.own) { const v = nice(homeValue(s, s.hh.home.type) * 0.9); s.hh.purse += v; say(s, `The old home sells for ${money(s, v)}, which goes to the family.`); }
    moveHome(s, type, '', null, { rent: o.rent, payer: 'you' });
  }
  const msg = `The family moves to ${lc1(o.label)}${mode === 'buy' ? ', bought outright' : `, rent ${money(s, o.rent)} a month from your bank`}.`;
  say(s, msg);
  return res(true, msg, ['H+5']);
}
export function eatHome(s) {
  ensureLife(s);
  const v = householdView(s);
  if (s.hh.purse >= v.meal) s.hh.purse -= v.meal;
  else if (spendAny(s, v.meal)) { Fin.book(s, 'exp', 'food', v.meal); }
  else { s.H = clamp(s.H - 2); return res(false, 'There is nothing to eat at home tonight, and your pocket is empty.', ['H-2']); }
  s.L = clamp(s.L + 2); s.H = clamp(s.H + 1);
  return res(true, `A meal at home, ${money(s, v.meal)} from the family pot.`, ['L+2', 'H+1']);
}
export function sleepHome(s) {
  ensureLife(s);
  const q = SLEEP_Q[s.hh.home.type] ?? 0.7;
  const dl = Math.round(2 + 6 * q), dh = Math.round(-2 + 5 * q);
  s.L = clamp(s.L + dl); s.H = clamp(s.H + dh);
  return { q, fx: [`L+${dl}`, (dh >= 0 ? 'H+' : 'H') + dh] };
}
// Hours lost each day getting to town and back: one map metre is five real ones.
export function commuteHours(s) {
  const hh = s && s.hh; if (!hh) return { hours: 0, mode: 'walk', km: 0 };
  const km = (hh.home.dist || 0) * 5 / 1000;
  const own = Array.isArray(s.vehicles) ? s.vehicles.map(v => v.kind) : [];
  const mode = own.includes('car') || (!s.vehicles && hh.car) ? 'car' : own.includes('moto') ? 'motorbike' : own.includes('cycle') ? 'bicycle' : ['homeless', 'slum'].includes(BRACKET_OF_HOME[hh.home.type]) ? 'walk' : 'bus';
  const speed = mode === 'car' || mode === 'motorbike' ? 25 : mode === 'bus' || mode === 'bicycle' ? 12 : 4.5;
  return { hours: Math.round(2 * km / speed * 10) / 10, mode, km: Math.round(km * 10) / 10 };
}
