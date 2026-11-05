// Sansar injuries and the City Hospital: pure logic on the life state S. `now` is the shared world clock (unix seconds).
// Illness, old age and childbirth reuse this through admit(S, now, { kind, sev, hurt }): same note, same treatment paths.
import { DAY } from './people.js?v=pick1';
import * as Fin from '../js/finance.js?v=payday1';

const HOUR = DAY / 24;
export const SEV = {
  minor: { name: 'Minor', hurts: ['sprained ankle', 'bruised knee', 'twisted wrist'], restDays: 5, pharmDays: 3, bill: 60, drop: 0, slow: .85 },
  serious: { name: 'Serious', hurts: ['broken arm', 'cracked ribs', 'deep cut on the leg'], restDays: 0, pharmDays: 0, bill: 450, drop: 1, slow: .7 },
  critical: { name: 'Critical', hurts: ['head injury', 'broken leg and internal bleeding'], restDays: 0, pharmDays: 0, bill: 1800, drop: 2, slow: .55 }
};
export const PHARM_BASE = 6, AMBULANCE_BASE = 40, INSURE_BASE = 90, INSURE_SHARE = .8, PUBLIC_SHARE = .3;
export const LOW_PROMPT = 'Health low - go to hospital. At 0 this life ends.';
// the low-health prompt names what is draining you: an injury, or the S.why the last drain left behind
export const lowPrompt = (S) => active(S) ? `Injured - ${S.injury.hurt}. Go to hospital. At 0 this life ends.` : `${(S && S.why) || 'Run down'}. Go to hospital for a check-up. At 0 this life ends.`;
export const CHECKUP_BASE = 30;
export const band =(n) => { const v = Math.max(0, Math.min(100, Math.round(+n || 0))); return v > 60 ? 'g' : v >= 30 ? 'a' : 'r'; };
export const pulsing = (n) => Math.round(+n || 0) < 15;
export const promptOn = (n) => Math.round(+n || 0) <= 20;
const PUBLIC_WAIT = { minor: 3, serious: 5, critical: 1 };   // world hours in the public queue
const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function severityFor(kind, impact) {
  if (kind === 'car') return impact > 22 ? 'critical' : 'serious';
  if (kind === 'traffic') return impact >= 3.5 ? 'serious' : 'minor';
  return impact > 16 ? 'critical' : impact > 11 ? 'serious' : 'minor';
}
export function hurt(S, now, { kind, by, sev, text }) {
  const prev = S.injury, hits = ((prev && prev.hits) || 0) + 1;
  const worse = prev && !prev.fatal && order(prev.sev) > order(sev) ? prev.sev : sev;
  const d = SEV[worse], name = d.hurts[Math.floor(Math.random() * d.hurts.length)];
  S.injury = { kind, by, hits, fatal: false, sev: worse, hurt: prev && prev.sev === worse ? prev.hurt : name, at: now, healAt: d.restDays ? now + d.restDays * DAY : null, treated: null, dropAt: now + HOUR, text: '' };
  S.injury.text = (text ? text + ' ' : '') + note(S, now);
  return S.injury;
}
export function admit(S, now, { kind, sev = 'serious', hurt: name, text }) {
  hurt(S, now, { kind, by: kind, sev, text });
  if (name) { S.injury.hurt = name; S.injury.text = (text ? text + ' ' : '') + note(S, now); }
  return S.injury;
}
export function dropping(S) {
  const j = S && S.injury;
  return !!(active(S) && j && !j.healAt && SEV[j.sev] && SEV[j.sev].drop > 0);
}
const order = (s) => ['minor', 'serious', 'critical'].indexOf(s);
export const active = (S) => !!(S && S.alive && S.injury && !S.injury.fatal && S.injury.sev);
export const slow = (S) => !S || !S.alive || !S.injury ? 1 : S.injury.sev ? (S.injury.treated === 'public' ? .85 : SEV[S.injury.sev].slow) : .7;
// serious/critical (and untreated default) can still walk and run at the slow factor, never sprint
export const noSprint = (S) => slow(S) < .8;
export function when(now, at) {
  const left = Math.max(0, at - now), d = Math.floor(left / DAY), h = Math.ceil((left - d * DAY) / HOUR);
  const day = Math.floor(at / DAY), hr = Math.floor((at % DAY) / HOUR);
  const span = d ? `${d} day${d === 1 ? '' : 's'}${h && h < 24 ? ` ${h} h` : ''}` : `${Math.max(1, h)} hour${h === 1 ? '' : 's'}`;
  return { span, date: `${WEEK[((day % 7) + 7) % 7]} ${String(hr).padStart(2, '0')}:00` };
}
export function note(S, now) {
  const j = S.injury; if (!active(S)) return '';
  const head = `🤕 Injured - ${j.hurt}. ${noSprint(S) ? 'You limp: walk and run slower, no sprint.' : 'You walk a little slower.'}`;
  if (j.treated === 'public') { const w = when(now, j.healAt); return `${head} In the public hospital queue: treated and healed in ${w.span} (${w.date}).`; }
  if (j.healAt) { const w = when(now, j.healAt); return `${head} ${j.treated === 'pharmacy' ? 'With pharmacy medicine it' : 'Rest at home'} heals in ${w.span} (${w.date}), or go to the hospital.`; }
  return `${head} ${SEV[j.sev].name} - this needs the hospital. Health drops every hour until you are treated.`;
}
const local = (S, base, K) => Math.round(base * K);
// health plans live in finance.js: a monthly premium, a share of the bill, and one world month before cover starts
export function insured(S, now) { const c = Fin.cover(S, now); return c.on && c.share > 0; }
export function quote(S, now, K) {
  const j = S.injury, sev = active(S) ? j.sev : 'minor', full = local(S, SEV[sev].bill, K);
  const c = Fin.cover(S, now), ins = c.on && c.share > 0, you = ins ? Math.round(full * (1 - c.share)) : full;
  const plan = Fin.PLANS[c.plan] || null, room = !!(ins && plan && plan.room);
  return { full, you, ins, share: ins ? c.share : 0, plan: ins && plan ? plan.name : '', room, waiting: !!c.waiting, startsAt: c.startsAt || 0, pub: Math.round((ins ? you : full) * PUBLIC_SHARE), pharm: local(S, PHARM_BASE, K), amb: local(S, AMBULANCE_BASE, K), premium: Fin.premium(S, 'standard'), wait: room ? 0 : PUBLIC_WAIT[sev] };
}
export const pay = (S, amt, partial) => take(S, amt, partial) || 0;
function take(S, amt, partial) {
  const have = Math.max(0, S.cash || 0) + Math.max(0, S.bank || 0);
  if (have < amt && !partial) return null;
  const paid = Math.min(have, amt), fromCash = Math.min(Math.max(0, S.cash || 0), paid);
  S.cash -= fromCash; S.bank = (S.bank || 0) - (paid - fromCash); S.medical = (S.medical || 0) + paid;
  Fin.book(S, 'exp', 'hospital', paid);
  return paid;
}
const res = (ok, msg, fx = []) => ({ ok, msg, fx });
function healed(S, how) {
  const j = S.injury; S.injury = null; S.L = Math.min(100, (S.L || 0) + (j && j.sev === 'minor' ? 4 : 10));
  S.feed.unshift({ age: S.age, text: `Healed: ${j ? j.hurt : 'injury'} (${how}).` }); if (S.feed.length > 220) S.feed.length = 220;
}
function setFull(S, how, detail) {
  const j = S.injury; S.injury = null; S.L = 100; S.why = null;
  S.feed.unshift({ age: S.age, text: `Treated - health 100. ${j ? j.hurt : 'injury'} (${how}).${detail || ''}` });
  if (S.feed.length > 220) S.feed.length = 220;
}
const cured = (S, how, paid, money, extra) => { setFull(S, how, paid > 0 || extra ? ` Bill ${money(paid || 0)}${extra || ''}.` : ''); return res(true, 'Treated - health 100', ['L=100']); };
function loansOf(S) {
  if (!S.hh || typeof S.hh !== 'object') S.hh = { loans: [] };
  if (!Array.isArray(S.hh.loans)) S.hh.loans = [];
  return S.hh.loans;
}
// path: rest | pharm | private | public | insure
export function treat(S, now, path, K, money) {
  if (path === 'insure' || /^insure:/.test(path)) {
    const plan = path.split(':')[1] || 'standard';
    if (S.ins && S.ins.plan === plan) return res(false, `You already have the ${Fin.PLANS[plan].name} plan.`);
    return Fin.buyIns(S, now, plan);
  }
  if (path === 'cancel-ins') return Fin.cancelIns(S);
  // full check-up: an injury takes its normal bill; otherwise a small fee for rest, stress, exhaustion or illness
  if (path === 'checkup' || path === 'checkpub') {
    if (active(S)) path = path === 'checkup' ? 'private' : 'public';
    else {
      if ((S.L || 0) >= 100) return res(false, "You're in perfect health.");
      const fee = local(S, CHECKUP_BASE, K), pub = path === 'checkpub', due = pub ? Math.round(fee * PUBLIC_SHARE) : fee;
      const p = take(S, due, pub); if (p == null) return res(false, `The private check-up is ${money(due)}. Not enough money. The public ward treats you now.`);
      const why = S.why; S.why = null; S.injury = null; S.L = 100;
      S.feed.unshift({ age: S.age, text: `Treated - health 100. Full check-up${why ? ': ' + why.toLowerCase() : ''} (${pub ? 'public ward' : 'City Hospital'}).${p ? ` Bill ${money(p)}.` : ''}` }); if (S.feed.length > 220) S.feed.length = 220;
      return res(true, 'Treated - health 100', ['L=100']);
    }
  }
  if (!active(S)) return res(false, 'You are not injured.');
  const j = S.injury, q = quote(S, now, K), sev = SEV[j.sev];
  if (path === 'rest') {
    if (!j.healAt) return res(false, `${sev.name} injuries do not heal with rest. Go to the hospital.`);
    if (j.treated === 'public') return res(false, 'You are in the public hospital queue.');
    if (j.restedDay === Math.floor(now / DAY)) return res(false, 'You already rested it today. Come back tomorrow.');
    if ((S.time || 0) <= 0) return res(false, 'No free time left today.');
    S.time--; j.restedDay = Math.floor(now / DAY); j.healAt = Math.max(now, j.healAt - DAY / 2); S.L = Math.min(100, (S.L || 0) + 2);
    if (j.healAt <= now) { healed(S, 'rest at home'); return res(true, 'Rested at home. You are healed.'); }
    const w = when(now, j.healAt); return res(true, `You rested the ${j.hurt} at home. Heals in ${w.span} (${w.date}).`, ['L+2']);
  }
  if (path === 'pharm') {
    if (!j.healAt || j.treated === 'public') return res(false, `Pharmacy medicine does not fix a ${j.hurt}. Go to the hospital.`);
    if (j.treated === 'pharmacy') return res(false, 'You already have the medicine.');
    const p = take(S, q.pharm); if (p == null) return res(false, 'Not enough money for the medicine.');
    j.treated = 'pharmacy'; j.healAt = Math.min(j.healAt, now + sev.pharmDays * DAY);
    const w = when(now, j.healAt); return res(true, `Painkillers and a support bandage. Heals in ${w.span} (${w.date}).`, ['-' + money(p)]);
  }
  if (path === 'loan') {
    const have = Math.max(0, S.cash || 0) + Math.max(0, S.bank || 0);
    if (have >= q.you) return res(false, 'You can pay the bill. Take private treatment.');
    const loans = loansOf(S);
    if (loans.some(l => l.id === 'medloan' && l.state === 'ok')) return res(false, 'The hospital loan is already open. The public ward treats you now and waives what you cannot pay.');
    const gap = q.you - have, rate = 9, months = 12, instalment = Fin.emi(gap, rate, months);
    S.bank = (S.bank || 0) + gap;
    loans.push({ id: 'medloan', lender: 'Sansar Bank (hospital loan)', principal: gap, start: gap, rate, months, instalment, due_day: 10, collateral: 'none', payer: 'you', missed: 0, late: 0, paid: 0, state: 'ok' });
    Fin.book(S, 'inc', 'other', gap);
    const p = take(S, q.you); if (p == null) return res(false, 'The loan did not cover the bill. The public ward will still treat you.');
    if (q.ins) Fin.claim(S);
    return cured(S, 'hospital loan', p, money, '');
  }
  if (path === 'private') {
    const p = take(S, q.you); if (p == null) return res(false, `The bill is ${money(q.you)}. Not enough money. The public ward treats you now and waives the rest. A hospital loan covers this bill, or a health plan for the next one.`);
    if (q.ins) Fin.claim(S);
    return cured(S, 'City Hospital', p, money, q.ins ? `, insurance paid ${money(q.full - q.you)}` : '');
  }
  if (path === 'public') {
    const p = take(S, q.pub, true) || 0; if (q.ins) Fin.claim(S);
    return cured(S, 'public ward', p, money, p < q.pub ? ', the rest waived' : '');
  }
  return res(false, 'Unknown treatment.');
}
// called twice a second: heals on the date, untreated serious/critical lose health each world hour
export function tick(S, now) {
  if (S && S.alive && S.injury && !S.injury.fatal && !S.injury.sev) { hurt(S, now, { kind: S.injury.kind, by: S.injury.by, sev: 'minor', text: '' }); return { msg: note(S, now) }; }
  if (!active(S)) return null; const j = S.injury;
  if (j.healAt && now >= j.healAt) {
    if (j.treated === 'public') { setFull(S, 'public hospital', ''); return { healed: true, msg: 'Treated - health 100' }; }
    const how = j.treated === 'pharmacy' ? 'pharmacy medicine and rest' : 'rest at home'; healed(S, how); return { healed: true, msg: `Healed. Your ${S.feed[0].text.slice(8).split(' (')[0]} is better.` };
  }
  if (!j.healAt && j.dropAt && now >= j.dropAt) { j.dropAt = now + HOUR; const d = SEV[j.sev].drop; S.L = Math.max(1, (S.L || 0) - d); return { drop: d, msg: `Your ${j.hurt} is getting worse. Health -${d}. Go to the hospital.` }; }
  return null;
}
