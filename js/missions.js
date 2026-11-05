// Starter missions. They never block free play: the card can be hidden and opened again from Activities.
import { book, money, calendar, YEAR_SEC } from './finance.js?v=usd1';
import { BIRTH } from './births.js';

const POOR = { homeless: 1, slum: 1, struggling: 1 };
const show = (s, n) => money(s || { country: 'Nepal' }, n);
const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));

export const LADDER = [
  { id: 'new', name: 'Newcomer', nw: 0, props: 0 },
  { id: 'earn', name: 'Earner', nw: 80000, props: 0 },
  { id: 'save', name: 'Saver', nw: 250000, props: 0 },
  { id: 'inv', name: 'Investor', nw: 1000000, props: 0 },
  { id: 'land', name: 'Landlord', nw: 2500000, props: 1 },
  { id: 'tycoon', name: 'Tycoon', nw: 10000000, props: 3 },
  { id: 'king', name: 'Monopoly King', nw: 40000000, props: 6 }
];

export function ensure(s) {
  if (!s.ms || typeof s.ms !== 'object') s.ms = {};
  if (!s.ms.paid || typeof s.ms.paid !== 'object') s.ms.paid = {};
  return s.ms;
}
export function circOf(s) {
  return (s.hh && s.hh.circ) || s.circ || 'middle';
}
export function titleOf(nw, props, s) {
  nw = Math.round(nw || 0); props = props | 0;
  let cur = LADDER[0], next = LADDER[1];
  for (let i = 0; i < LADDER.length; i++) {
    const r = LADDER[i];
    if (nw >= r.nw && props >= r.props) { cur = r; next = LADDER[i + 1] || null; }
  }
  const nxt = next ? `Next: ${next.name} at ${show(s, next.nw)}${next.props ? ' and ' + next.props + ' properties' : ''}` : 'The top of the ladder.';
  return { id: cur.id, name: cur.name, next: nxt };
}

const STEPS = {
  bed: { id: 'bed', title: 'Find a bed', line: 'Find a shelter bed and sleep', advice: 'A bed first. Food and work can wait until morning.', reward: { H: 5, cash: 100 }, gos: [{ place: 'home', label: 'Your shelter' }] },
  labour: { id: 'labour', title: 'Earn a day\'s pay', line: 'Day labour at Meridian, cash in hand', advice: 'A day\'s pay is a start. Keep it somewhere safer than a pocket.', reward: { H: 2 }, gos: [{ place: 'work', label: 'Meridian' }] },
  feet: { id: 'feet', title: 'Get on your feet', line: 'Find a job, or enrol at the college', advice: 'A job or a course is how a life starts to pay you back.', reward: { H: 4, S: 2 }, gos: [{ place: 'college', label: 'College' }, { place: 'work', label: 'Job centre' }, { place: 'uni', label: 'AIT' }] },
  bank: { id: 'bank', title: 'Open a bank account', line: 'Deposit cash. Savings pay interest. A fixed deposit pays more.', advice: 'Savings pay a little every month. A fixed deposit pays more if you can leave it alone.', reward: { S: 2 }, gos: [{ place: 'bank', label: 'Bank' }] },
  shares: { id: 'shares', title: 'Make money work', line: 'Buy a share on the Sansar Stock Exchange', advice: 'Prices move every day. Dividends pay you for holding on.', reward: { H: 3 }, gos: [{ place: 'exchange', label: 'Exchange' }] },
  plot: { id: 'plot', title: 'Own a piece of Sansar', line: 'Buy an empty plot, then build and let it', advice: 'Build a house on it and let it out. Rent arrives while you sleep.', reward: { H: 4 }, gos: [{ place: 'lot', label: 'Empty plot' }] },
  grow: { id: 'grow', title: 'Grow', line: 'Borrow for a second property, or open the shop', advice: 'Borrow only what the rent or the shop can cover. A company starts the same way.', reward: { S: 2 }, gos: [{ place: 'bank', label: 'The loan' }, { place: 'business', label: 'The shop' }] },
  king: { id: 'king', title: 'Become Sansar\'s Monopoly King', line: 'Net worth and properties climb the ladder', advice: 'The town knows your name. Keep the houses full.', reward: { H: 8 }, gos: [] }
};

function sharesHeld(s) {
  const sh = s.folio && s.folio.sh; if (!sh) return false;
  return Object.keys(sh).some((k) => sh[k] > 0);
}
export function isDone(s, id, nw) {
  const m = s.ms || {};
  if (id === 'bed') return !!m.bed;
  if (id === 'labour') return !!(m.labour || s.job);
  if (id === 'feet') return !!(s.job || s.school);
  if (id === 'bank') return !!m.deposited;
  if (id === 'shares') return sharesHeld(s);
  if (id === 'plot') return !!m.bought;
  if (id === 'grow') return !!(m.loan || s.biz);
  if (id === 'king') return titleOf(nw, (s.land && s.land.own && s.land.own.length) || 0, s).id === 'king';
  return false;
}
export function chain(s) {
  const c = circOf(s), young = (s.age | 0) < 18, out = [];
  if (c === 'homeless') out.push(STEPS.bed);
  else if (POOR[c]) out.push(STEPS.labour);
  const feet = { ...STEPS.feet, gos: STEPS.feet.gos.slice() };
  if (young) { feet.line = 'Enrol at the college. Jobs start at 18.'; feet.gos = [{ place: 'college', label: 'College' }, { place: 'uni', label: 'AIT' }]; }
  out.push(feet, STEPS.bank, STEPS.shares, STEPS.plot, STEPS.grow, STEPS.king);
  return out;
}
export function list(s, nw) {
  const steps = chain(s);
  let open = false;
  return steps.map((st) => {
    const done = isDone(s, st.id, nw);
    const current = !done && !open;
    if (current) open = true;
    return { ...st, done, current };
  });
}
export function current(s, nw) {
  return list(s, nw).find((st) => st.current) || null;
}
function apply(s, st) {
  const r = st.reward || {};
  if (r.cash) { s.cash = (s.cash || 0) + r.cash; book(s, 'inc', 'other', r.cash); }
  if (r.H) s.H = clamp((s.H || 0) + r.H);
  if (r.S) s.S = clamp((s.S || 0) + r.S);
  return { id: st.id, advice: st.advice, title: st.title };
}
export function sync(s, nw) {
  const m = ensure(s), out = [];
  for (const st of chain(s)) {
    if (!isDone(s, st.id, nw) || m.paid[st.id]) continue;
    m.paid[st.id] = 1;
    out.push(apply(s, st));
  }
  return out;
}
export function note(s, key) { ensure(s); s.ms[key] = 1; }

export const LABOUR_PER_DAY = 3;
export function dayLabour(s) {
  const pay = 800, c = calendar(s, YEAR_SEC), day = (c.y | 0) * 372 + c.m * 31 + c.d;
  if (!s.labour || s.labour.day !== day) s.labour = { day, n: 0 };
  if (s.labour.n >= LABOUR_PER_DAY) return { ok: false, msg: `Meridian only takes you for ${LABOUR_PER_DAY} shifts a day. Come back tomorrow.`, fx: [] };
  if (!(s.time > 0)) return { ok: false, msg: 'You are too worn out for a shift. Age up for a fresh year of energy.', fx: [] };
  s.time--; s.labour.n++;
  s.cash = (s.cash || 0) + pay; book(s, 'inc', 'salary', pay); note(s, 'labour');
  return { ok: true, msg: `A day hauling loads at Meridian. ${show(s, pay)} in your pocket. Shift ${s.labour.n} of ${LABOUR_PER_DAY} today.`, fx: ['+' + show(s, pay), '-1 time'] };
}
const emi = (P, rate, months) => { const i = rate / 1200; return Math.round(P * i / (1 - Math.pow(1 + i, -months))); };
export function growLoan(s) {
  ensure(s);
  if (!s.hh || !Array.isArray(s.hh.loans)) return { ok: false, msg: 'The bank has no file for you yet.', fx: [] };
  if (s.hh.loans.some((l) => l.id === 'grow' && l.state === 'ok')) return { ok: false, msg: 'You already have this loan.', fx: [] };
  const earns = !!(s.job || s.biz || (s.land && s.land.own && s.land.own.length));
  if (!earns) return { ok: false, msg: 'The bank lends against a job, a shop, or land you already hold.', fx: [] };
  const principal = 2000000, rate = 11, months = 60, instalment = emi(principal, rate, months);
  s.bank = (s.bank || 0) + principal;
  s.hh.loans.push({ id: 'grow', lender: 'Sansar Bank (property loan)', principal, start: principal, rate, months, instalment, due_day: 10, collateral: 'none', payer: 'you', missed: 0, late: 0, paid: 0, state: 'ok' });
  note(s, 'loan');
  return { ok: true, msg: `Sansar Bank lends ${show(s, principal)} at ${rate}% for 5 years. ${show(s, instalment)} a month comes out of pocket, then the bank. A second plot, or the shop, is the usual use.`, fx: ['+' + show(s, principal)] };
}
export function nearestSale(lots, x, z) {
  let best = null, bd = 1e18;
  for (const lot of lots || []) {
    if (lot.kind !== 'sale' || lot.house) continue;
    const d = (lot.x - x) * (lot.x - x) + (lot.z - z) * (lot.z - z);
    if (d < bd) { bd = d; best = lot; }
  }
  return best;
}

const TIPS = [
  { text: 'Get health insurance. A hospital bill can wipe out a month\'s pay.' },
  { text: 'Fixed deposits pay more than savings.' },
  { text: 'Rent out your second house for steady income.' },
  { text: 'Your partner remembers what you talk about. Chat with them.', mature: true }
];
function hoodName(id) {
  const h = BIRTH.hoods && BIRTH.hoods[id];
  return (h && h.name) || (id ? String(id) : 'town');
}
export function slides({ people, biz, lots, you, mature, shopAt, homeAt, s }) {
  const rows = (people || []).map((p) => ({ name: String(p.name || 'Someone').slice(0, 24), nw: Math.round(p.nw || 0), props: p.props | 0, let: p.let | 0, ai: !!p.ai }));
  const ai = new Map();
  for (const lot of lots || []) {
    if (lot.kind !== 'ai') continue;
    const name = String(lot.who || 'An estate').slice(0, 24);
    const a = ai.get(name) || { name, nw: 0, props: 0, let: 0, ai: true };
    a.nw += (lot.land || 0) + (lot.house ? 1260000 : 0);
    a.props++; if (lot.house) a.let++;
    ai.set(name, a);
  }
  for (const a of ai.values()) rows.push(a);
  if (you && you.name) {
    const i = rows.findIndex((r) => r.name === you.name && !r.ai);
    const y = { name: you.name, nw: Math.round(you.nw || 0), props: you.props | 0, let: you.let | 0, ai: false };
    if (i >= 0) rows[i] = y; else rows.push(y);
  }
  rows.sort((a, b) => b.nw - a.nw);
  const rich = rows[0] || null;
  const landlord = rows.slice().sort((a, b) => (b.let - a.let) || (b.props - a.props) || (b.nw - a.nw))[0];
  const out = [];
  if (rich) out.push({ kind: 'rich', text: `Richest in Sansar: ${rich.name} - ${show(s, rich.nw)}` });
  for (const b of (you && you.biz) || []) {
    const at = b.place === 'home' ? homeAt : shopAt;
    out.push({ kind: 'biz', text: `Now open: ${you.name}'s ${b.name} in ${hoodName(b.district)}`, x: at ? at.x : 0, z: at ? at.z : 0, place: b.place || 'business' });
  }
  for (const b of biz || []) {
    if (!b || !b.name || (you && b.player === you.name)) continue;
    const at = shopAt;
    out.push({ kind: 'biz', text: `Now open: ${b.player}'s ${b.name} in ${hoodName(b.district)}`, x: at ? at.x : 0, z: at ? at.z : 0, place: b.place || 'business' });
  }
  if (landlord && landlord.props > 0) out.push({ kind: 'land', text: `Top landlord: ${landlord.name} - ${landlord.props} properties` });
  for (const t of TIPS) { if (t.mature && !mature) continue; out.push({ kind: 'tip', text: t.text }); }
  return { slides: out, rich, landlord, rows: rows.slice(0, 8) };
}
