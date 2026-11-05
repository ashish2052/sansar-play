// Sansar money (Chairman, 17 Oct 2026): one ledger per world month. Every rupee in or out is booked on a line, so the
// Finances sheet can show this month, last month and a year of bars. Recurring costs fall due on the world month tick
// (the same tick as pay and interest), pocket first, then the bank. A shortfall on an essential becomes a bank overdraft
// in the household loans; a shortfall on a luxury lapses it. Also here: the gym membership, monthly health plans,
// owned vehicles (dealer prices, loans, upkeep, theft) and the one-time advice cards.
// Pure logic, no DOM. Base numbers are Nepali rupees, scaled to the player's country.
import { COUNTRIES } from './content.js?v=usd1';

export const MONTH_SEC = 300; // legacy world-clock month; payday uses the player calendar below
export const YEAR_SEC = 1800; // 30 real minutes = 1 game year, and only while the player is present
export const WORLD_KEY = 100000; // a saved month key at or above this is the old unix month, not a life month
export const MONTH_DAYS = 365 / 12;
const MONTH_NAME = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// One calendar for every monthly event. index = completed months (age*12 + month). label is the day the player sees.
export function calendar(s, yearSec) {
  const ysec = yearSec > 0 ? yearSec : YEAR_SEC;
  const yearAt = Math.max(0, Math.min(ysec - 1e-6, (s && s.yearAt) || 0));
  const into = yearAt / ysec * 365;
  let m = Math.floor(into / MONTH_DAYS);
  let d = Math.floor(into - m * MONTH_DAYS);
  if (m > 11) m = 11;
  if (m < 0) m = 0;
  if (d < 0) d = 0;
  const y = (s && s.age) | 0;
  const dayIn = into - Math.min(11, Math.floor(into / MONTH_DAYS)) * MONTH_DAYS;
  return { y, m, d, index: y * 12 + m, label: (d + 1) + ' ' + MONTH_NAME[m], until: Math.max(1, Math.ceil(MONTH_DAYS - dayIn - 1e-9)) };
}
const NP = COUNTRIES.Nepal;
const cty = s => COUNTRIES[s && s.country] || NP;
export const kf = s => { const c = cty(s); return (c.price * c.rate) / (NP.price * NP.rate); };
const nice = v => { const a = Math.abs(v), q = a >= 1e6 ? 10000 : a >= 1e5 ? 1000 : a >= 1e4 ? 100 : a >= 200 ? 5 : 1; return Math.round(v / q) * q; };
const clamp = v => Math.max(0, Math.min(100, Math.round(v)));
const first = n => String(n || '').split(' ')[0];
export function rateOf(s) { const r = cty(s).rate; return r > 0 ? r : 1; }
// Display only. `v` stays in the country's own units; COUNTRIES.rate is local units per 1 USD.
export function money(s, v) {
  const usd = Number(v) / rateOf(s);
  if (!Number.isFinite(usd)) return '$0';
  const sg = usd < 0 ? '-' : '', a = Math.abs(usd);
  if (a >= 1e6) { const m = a / 1e6; return sg + '$' + (m >= 100 ? Math.round(m).toLocaleString('en-US') : m.toFixed(1)) + 'M'; }
  if (a >= 100) return sg + '$' + Math.round(a).toLocaleString('en-US');
  if (a < 0.005) return sg + '$0';
  return sg + '$' + a.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function fromUsd(s, usd) { const n = Number(usd); return Number.isFinite(n) ? Math.round(n * rateOf(s)) : 0; }
export function usdOf(s, local) { const n = Number(local) / rateOf(s); return Number.isFinite(n) ? n : 0; }
function say(s, text) { if (!Array.isArray(s.feed)) s.feed = []; s.feed.unshift({ age: s.age, text }); if (s.feed.length > 220) s.feed.length = 220; }
function notice(s, t) { s.notice = s.notice ? s.notice + ' ' + t : t; say(s, t); }
const res = (ok, msg, fx = []) => ({ ok, msg, fx });

// ---------- the ledger ----------
export const INC = [['salary', 'Salary and hourly pay'], ['interest', 'Bank interest and FDs'], ['invest', 'Investments (dividends)'], ['business', 'Business profit'], ['rent', 'Rent from houses you let'], ['other', 'Other income']];
export const EXP = [['rent', 'Rent'], ['food', 'Food'], ['edu', 'Education fees'], ['partner', 'Partner: dates and gifts'], ['family', 'Spouse and children'], ['gym', 'Gym'], ['vehicle', 'Vehicles, fuel and fares'], ['loan', 'Loan instalments'], ['hospital', 'Hospital bills'], ['insurance', 'Health insurance'], ['other', 'Other spending']];
function blank(partial) {
  const o = { inc: {}, exp: {}, buys: [], partial: !!partial };
  for (const [k] of INC) o.inc[k] = 0;
  for (const [k] of EXP) o.exp[k] = 0;
  return o;
}
export function ensure(s) {
  if (!s) return null;
  if (!s.fin || typeof s.fin !== 'object') s.fin = { v: 1, key: null, cur: blank(true), hist: [], ex: 0, idle: 0, seen: {}, advice: [], gym: null };
  const f = s.fin;
  if (!f.cur || !f.cur.inc || !f.cur.exp) f.cur = blank(true);
  for (const [k] of INC) if (typeof f.cur.inc[k] !== 'number') f.cur.inc[k] = 0;
  for (const [k] of EXP) if (typeof f.cur.exp[k] !== 'number') f.cur.exp[k] = 0;
  if (!Array.isArray(f.cur.buys)) f.cur.buys = [];
  if (!Array.isArray(f.hist)) f.hist = [];
  if (!f.seen || typeof f.seen !== 'object') f.seen = {};
  if (!Array.isArray(f.advice)) f.advice = [];
  if (typeof f.ex !== 'number') f.ex = 0;
  if (!Array.isArray(s.vehicles) && (s.hh || s.car)) migrateVehicles(s);   // old saves: wait for the household
  if (!Array.isArray(s.partners)) s.partners = [];
  return f;
}
// side 'inc' or 'exp'; amounts are kept exact so the month nets to the rupee (business may be negative: a loss)
export function book(s, side, line, amt) {
  if (!s || !Number.isFinite(amt) || amt === 0) return;
  const f = ensure(s), b = side === 'inc' ? f.cur.inc : f.cur.exp;
  if (!(line in b)) line = 'other';
  b[line] += amt;
}
// a purchase or sale of something you keep (land, a house, a vehicle, a shop): listed on the sheet, not a monthly cost
export function bought(s, text, amt) { const f = ensure(s); f.cur.buys.unshift({ text, amt: Math.round(amt) }); if (f.cur.buys.length > 6) f.cur.buys.length = 6; }
export const total = o => Object.values(o || {}).reduce((a, v) => a + (Number.isFinite(v) ? v : 0), 0);
// Close the bucket when the player's month changes. Returns months passed (0 = same month). nw() is only called on a change.
export function roll(s, key, nw) {
  const f = ensure(s);
  if (typeof f.key === 'number' && f.key >= WORLD_KEY) { f.key = key; return 0; } // old world clock: this month is already open
  if (typeof f.key !== 'number') { f.key = key; f.cur.partial = true; return 0; }
  if (key === f.key) return 0;
  const gone = key - f.key;
  f.hist.push({ key: f.key, inc: f.cur.inc, exp: f.cur.exp, buys: f.cur.buys, ex: f.ex, partial: !!f.cur.partial, nw: Math.round(typeof nw === 'function' ? nw() : 0), cash: Math.round((s.cash || 0) + (s.bank || 0)) });
  if (f.hist.length > 12) f.hist.splice(0, f.hist.length - 12);
  f.cur = blank(gone !== 1); f.key = key; f.ex = 0;
  return gone;
}
export function exercise(s) { const f = ensure(s); if (f) f.ex++; }
function spend(s, amt) {   // pocket first, then the bank; all or nothing
  amt = Math.round(amt); if (!(amt > 0)) return 0;
  const pocket = Math.max(0, s.cash || 0), bank = Math.max(0, s.bank || 0);
  if (pocket + bank < amt) return -1;
  const p = Math.min(pocket, amt); s.cash -= p; s.bank = (s.bank || 0) - (amt - p); return amt;
}
export const emi = (P, rate, months) => { const i = rate / 1200; if (!(P > 0)) return 0; if (!(i > 0)) return Math.round(P / months); return Math.round(P * i / (1 - Math.pow(1 + i, -months))); };
export const OD_RATE = 18;
function overdraft(s, amt) {
  const hh = s.hh;
  if (!hh || !Array.isArray(hh.loans)) { s.cash = (s.cash || 0) - amt; return; }
  let l = hh.loans.find(x => x.od && x.state === 'ok');
  if (!l) { l = { id: 'od' + (hh.loans.length + 1), od: true, lender: 'Sansar Bank (overdraft)', principal: 0, start: 0, rate: OD_RATE, months: 12, instalment: 0, due_day: 1, collateral: 'none', payer: 'you', missed: 0, late: 0, paid: 0, state: 'ok' }; hh.loans.push(l); }
  l.principal += amt; l.start += amt; l.paid = 0; l.instalment = emi(l.principal, l.rate, l.months);
}
function essential(s, line, amt, f) {   // must be paid: what pocket and bank hold, the rest as an overdraft
  amt = Math.round(amt); if (!(amt > 0)) return amt;
  const have = Math.max(0, s.cash || 0) + Math.max(0, s.bank || 0), p = Math.min(have, amt);
  if (p > 0) spend(s, p);
  if (amt > p) { overdraft(s, amt - p); f.odNow = (f.odNow || 0) + amt - p; }
  book(s, 'exp', line, amt); return amt;
}

// ---------- what a month costs ----------
export const HOME_TIER = { bridge: 'homeless', shelter: 'homeless', slum: 'slum', shack: 'slum', oneroom: 'slum', flat_small: 'struggling', flat_owned: 'middle', house_small: 'middle', shophouse: 'failing', garden: 'comfortable', mansion: 'wealthy' };
const FOOD = { homeless: 3000, slum: 4500, struggling: 6000, middle: 8000, failing: 7500, comfortable: 13000, wealthy: 25000 };   // one adult, a month
const LIFE = { homeless: .35, slum: .5, struggling: .7, middle: 1, failing: .9, comfortable: 1.6, wealthy: 3 };
const TIER_WORD = { homeless: 'street', slum: 'slum', struggling: 'working-class', middle: 'middle-class', failing: 'middle-class', comfortable: 'comfortable', wealthy: 'wealthy' };
export const EDU_MONTH = 2500, DATE_MONTH = 4000, SPOUSE_MONTH = 12000, CHILD_MONTH = 6000, SCHOOL_MONTH = 3500, GYM_MONTH = 3000, FARE_MONTH = 1500;
export const tierOf = s => HOME_TIER[s && s.hh && s.hh.home && s.hh.home.type] || 'middle';
export const lifeK = s => LIFE[tierOf(s)] || 1;
export const datingCost = s => nice(DATE_MONTH * lifeK(s) * kf(s));
export const gymFee = s => nice(GYM_MONTH * kf(s));
const kidsOf = s => (Array.isArray(s.kids) ? s.kids : []).filter(c => c && c.alive !== false);
const FARE_CUT = { homeless: 0.45, slum: 0.65 };   // a poor start still pays the bus; the fare is just smaller
function fares(s, ctx) {
  if ((s.vehicles || []).length) return false;
  return !!(ctx.dist > 0 || (s.hh && s.hh.home && s.hh.home.dist > 0));
}
// ctx (from life.js): head = you pay for the home; earns = a job or a business; dist = metres to town; letRent; rent; loans
export function costs(s, ctx = {}) {
  ensure(s);
  const t = tierOf(s), lf = lifeK(s), k = kf(s), out = [];
  const add = (line, amt, why, opt, id) => { amt = nice(amt); if (amt > 0) out.push({ line, amt, why, opt: !!opt, id: id || line }); };
  const sp = s.spouse && s.spouse.alive !== false ? 1 : 0, kids = kidsOf(s), heads = 1 + sp + 0.6 * kids.length;
  if (ctx.head) add('food', FOOD[t] * k * heads, `${heads > 1 ? 'Your household' : 'You'}, at ${TIER_WORD[t]} prices`);
  else if (ctx.earns) add('food', FOOD[t] * k * 0.5, 'Your share of the family kitchen', false, 'chipin');
  if (s.school) add('edu', EDU_MONTH * k, `Books, exam and campus fees (${s.school.id})`);
  if (sp) add('family', SPOUSE_MONTH * lf * k, `Household share for ${first(s.spouse.name) || 'your spouse'}`);
  if (s.alimony && s.alimony.left > 0) add('family', s.alimony.amt, `Alimony to ${first(s.alimony.name)}`, false, 'alimony');
  for (const c of kids) add('family', (CHILD_MONTH + (c.age >= 5 && c.age < 18 ? SCHOOL_MONTH : 0)) * lf * k, `${first(c.name) || 'Your child'}: food, school, healthcare`, false, 'kid:' + (c.id || c.name));
  for (const p of s.partners || []) add('partner', DATE_MONTH * lf * k, `Dates and gifts with ${first(p.name)}`, true, 'date:' + p.id);
  if (s.fin.gym) add('gym', gymFee(s), 'Iron & Oak Gym membership', true, 'gym');
  for (const v of s.vehicles || []) {
    if (v.family) continue;
    add('vehicle', vprice(s, v.model, 'svc'), `${v.name}: servicing, road tax, third-party cover`, false, 'svc:' + v.id);
    if (v.ins) add('vehicle', vehPremium(s, v), `${v.name}: full insurance`, true, 'vins:' + v.id);
  }
  if (fares(s, ctx)) add('vehicle', FARE_MONTH * (FARE_CUT[t] || 1) * k, 'Bus and taxi fares to town and back', false, 'fares');
  if (s.ins && PLANS[s.ins.plan]) add('insurance', premium(s, s.ins.plan), `${PLANS[s.ins.plan].name} health plan`, true, 'ins');
  return out;
}
// The month tick for the player's own money. Runs after pay, interest and the household (rent, instalments).
export function month(s, now, gone, ctx = {}, r = Math.random) {
  const f = ensure(s), out = [];
  if (gone !== 1) return out;   // first sight, or back from offline: your time stopped, so nothing is charged
  f.odNow = 0;
  drift(s, f);
  if (ctx.letRent > 0) { s.bank = (s.bank || 0) + ctx.letRent; book(s, 'inc', 'rent', ctx.letRent); out.push(`Your tenants paid ${money(s, ctx.letRent)} rent into the bank.`); }
  for (const c of costs(s, ctx)) {
    if (!c.opt) { essential(s, c.line, c.amt, f); if (c.id === 'chipin' && s.hh) s.hh.purse = (s.hh.purse || 0) + c.amt; continue; }
    if (spend(s, c.amt) > 0) { book(s, 'exp', c.line, c.amt); if (c.id === 'ins' && s.ins) s.ins.last = c.amt; continue; }
    miss(s, c, out);
  }
  vehicleMonth(s, now, r, out);
  const cal = calendar(s, YEAR_SEC);
  if (s.ins && s.ins.from >= WORLD_KEY) s.ins.from = (typeof now === 'number' && now >= 1e9 && now >= s.ins.from) ? cal.index : cal.index + 1;
  if (s.ins && PLANS[s.ins.plan] && cal.index >= s.ins.from && !s.ins.said) { s.ins.said = true; out.push(`Your ${PLANS[s.ins.plan].name} health cover is active. It pays ${Math.round(PLANS[s.ins.plan].share * 100)}% of hospital bills.`); }
  if (ctx.rentDue > 0 && !f.seen.rent) {
    f.seen.rent = 1;
    advise(s, 'rent', 'Rent is due every month', `Rent for ${ctx.home || 'your home'} is ${money(s, ctx.rentDue)} a month. It comes out on the 1st: pocket first, then the bank.${ctx.rentLate ? ' This month it could not be paid, so it is late.' : ''} Two months behind and you are evicted.`);
  }
  if (!f.seen.neg && (f.odNow > 0 || (s.cash || 0) + (s.bank || 0) < 0)) {
    f.seen.neg = 1;
    advise(s, 'neg', 'Your money ran out', f.odNow > 0
      ? `Your pocket and bank could not cover this month's bills. Sansar Bank lent you ${money(s, f.odNow)} as an overdraft at ${OD_RATE}% a year, repaid each month. Cut a cost or earn more before it grows.`
      : `You are in the red: ${money(s, (s.cash || 0) + (s.bank || 0))}. Earn something or cut a monthly cost.`);
  }
  if (s.alimony && s.alimony.left > 0) {
    s.alimony.left -= 1;
    if (s.alimony.left <= 0) { const n = first(s.alimony.name); s.alimony = null; out.push(`Alimony to ${n} has ended.`); }
  }
  for (const t of out) notice(s, t);
  return out;
}
function miss(s, c, out) {
  if (c.id === 'gym') { s.fin.gym = null; out.push('Your gym membership lapsed: the fee bounced.'); return; }
  if (c.id === 'ins') { const n = PLANS[s.ins.plan].name; s.ins = null; out.push(`Your ${n} health plan lapsed: the premium bounced. Hospital bills are yours again.`); return; }
  if (c.id.startsWith('vins:')) { const v = (s.vehicles || []).find(x => 'vins:' + x.id === c.id); if (v) { v.ins = false; out.push(`Insurance on the ${v.name} lapsed: the premium bounced.`); } return; }
  if (c.id.startsWith('date:')) { s.H = clamp((s.H || 50) - 3); out.push(`No money for a date this month. ${c.why.replace('Dates and gifts with ', '')} noticed.`); }
}
// No exercise for a month: health and looks drift down. Age alone never takes looks (core rule 7).
export const DRIFT_L = 2, DRIFT_B = 2;
function drift(s, f) {
  const m = f.hist[f.hist.length - 1];
  if (!m || m.partial) return;
  if ((m.ex || 0) > 0) { f.idle = 0; return; }
  f.idle = (f.idle || 0) + 1;
  s.L = Math.max(1, clamp((s.L || 50) - DRIFT_L)); s.why = 'Out of shape - no exercise for months'; s.B = clamp((s.B || 40) - DRIFT_B);
  if (!f.seen.gym) {
    f.seen.gym = 1;
    say(s, `A month with no exercise. Health -${DRIFT_L}, Looks -${DRIFT_B}.`);
    advise(s, 'gym', 'Time to move', "You haven't exercised in a while. Your health and looks are slipping. Join the gym or paint a gym hour on your calendar.");
  } else say(s, `${f.idle} month${f.idle === 1 ? '' : 's'} with no exercise. Health -${DRIFT_L}, Looks -${DRIFT_B}.`);
}
function advise(s, id, title, text) { const f = ensure(s); if (f.advice.some(a => a.id === id)) return; f.advice.push({ id, title, text }); }
export const nextAdvice = s => (s && s.fin && s.fin.advice && s.fin.advice[0]) || null;
export function doneAdvice(s, id) { const f = ensure(s); f.advice = f.advice.filter(a => a.id !== id); }

// ---------- partner and gym ----------
export function syncPartners(s, rows) {
  if (!s || !Array.isArray(rows)) return false;
  ensure(s);
  const now = rows.filter(r => r && r.bond === 'partner').map(r => ({ id: String(r.id), name: String(r.name || 'your partner') }));
  const old = s.partners;
  if (now.length === old.length && now.every(p => old.some(o => o.id === p.id))) return false;
  for (const p of now) if (!old.some(o => o.id === p.id)) say(s, `You are seeing ${first(p.name)}. Dates and small gifts cost about ${money(s, datingCost(s))} a month.`);
  s.partners = now.map(p => ({ ...p, since: (old.find(o => o.id === p.id) || {}).since || s.age }));
  return true;
}
export function joinGym(s) {
  const f = ensure(s);
  if (f.gym) return res(false, 'You are already a member.');
  const fee = gymFee(s);
  if (spend(s, fee) < 0) return res(false, `Membership is ${money(s, fee)} a month. Pocket and bank together are short.`);
  book(s, 'exp', 'gym', fee); f.gym = { since: f.key, fee };
  say(s, `You joined Iron & Oak Gym: ${money(s, fee)} a month.`);
  return res(true, `Welcome to Iron & Oak. ${money(s, fee)} a month, charged on the 1st. Sessions here are free for members.`, ['-' + money(s, fee)]);
}
export function leaveGym(s) {
  const f = ensure(s); if (!f.gym) return res(false, 'You are not a member.');
  f.gym = null; say(s, 'You cancelled the gym membership.');
  return res(true, 'Membership cancelled. Nothing more is charged.', []);
}
export const isMember = s => !!(s && s.fin && s.fin.gym);

// ---------- health plans: monthly premium, one world month wait, cancel any time ----------
export const PLANS = {
  basic: { name: 'Basic', share: 0.6, rs: 700, sub: 'Pays 60% of hospital bills' },
  standard: { name: 'Standard', share: 0.8, rs: 1300, sub: 'Pays 80% of hospital bills' },
  premium: { name: 'Premium', share: 0.95, rs: 2900, sub: 'Pays 95%, a private room, no queue', room: true, fast: true }
};
export const INS_COVERS = 'injury, illness and childbirth';
export function premium(s, plan) {
  const p = PLANS[plan]; if (!p) return 0;
  const over = Math.max(0, (s.age || 18) - 30), claims = Math.min(6, s.insClaims || 0);
  return nice(p.rs * kf(s) * (1 + over * 0.035) * (1 + claims * 0.15));
}
export function cover(s, now) {
  const i = s && s.ins;
  if (i && PLANS[i.plan]) {
    if (i.from >= WORLD_KEY) i.from = (typeof now === 'number' && now >= 1e9 && now >= i.from) ? calendar(s, YEAR_SEC).index : calendar(s, YEAR_SEC).index + 1;
    if (calendar(s, YEAR_SEC).index >= i.from) return { share: PLANS[i.plan].share, plan: i.plan, on: true };
    if (i.prev && PLANS[i.prev]) return { share: PLANS[i.prev].share, plan: i.prev, on: true, next: i.plan, startsAt: i.from };
    return { share: 0, plan: i.plan, on: false, waiting: true, startsAt: i.from };
  }
  if (s && s.insurance && s.insurance.until > now) return { share: 0.8, plan: 'standard', on: true, legacy: true };
  return { share: 0, plan: '', on: false };
}
export function buyIns(s, now, plan) {
  ensure(s);
  const p = PLANS[plan]; if (!p) return res(false, 'Pick Basic, Standard or Premium.');
  if (s.ins && s.ins.plan === plan) return res(false, `You already have the ${p.name} plan.`);
  const cost = premium(s, plan);
  if (spend(s, cost) < 0) return res(false, `The ${p.name} plan is ${money(s, cost)} a month. Pocket and bank together are short.`);
  book(s, 'exp', 'insurance', cost);
  const c = cover(s, now);
  const key = calendar(s, YEAR_SEC).index;
  s.ins = { plan, from: key + 1, since: key, prev: c.on ? c.plan : '', last: cost };
  delete s.insurance;
  const was = c.on ? ` Your ${PLANS[c.plan].name} cover carries on until then.` : ' Until then, hospital bills are yours.';
  const msg = `${p.name} health plan: ${money(s, cost)} a month. It covers ${INS_COVERS}. Cover starts on the next 1st.${was}`;
  say(s, msg);
  return res(true, msg, ['-' + money(s, cost)]);
}
export function cancelIns(s) {
  if (!s.ins && !s.insurance) return res(false, 'You have no health plan.');
  const n = s.ins && PLANS[s.ins.plan] ? PLANS[s.ins.plan].name : 'Standard';
  s.ins = null; delete s.insurance;
  say(s, `You cancelled the ${n} health plan.`);
  return res(true, `${n} plan cancelled. No more premiums, and no more cover.`, []);
}
export function claim(s) { s.insClaims = (s.insClaims || 0) + 1; }

// ---------- vehicles: a dealer catalogue in local prices, loans, upkeep, theft ----------
// np = Nepal [new, second-hand] in rupees (import duty included); usd for countries without their own row.
export const MODELS = {
  cycle: { name: 'City bicycle', kind: 'cycle', np: [28000, 11000], usd: [450, 180], svc: [250, 8], fuel: [0, 0], loanMonths: 0, theft: 0.012, color: 0x2f6b45, dep: 0.985 },
  scooter: { name: 'Scooter 125cc', kind: 'moto', np: [245000, 115000], usd: [2800, 1300], svc: [1100, 45], fuel: [3.7, 0.05], loanMonths: 24, theft: 0.006, color: 0xd8cfbd, dep: 0.985, spec: { top: 78 / 3.6, a0: 3.6 } },
  moto: { name: '150cc motorbike', kind: 'moto', np: [390000, 180000], usd: [3800, 1700], svc: [1500, 55], fuel: [4.2, 0.06], loanMonths: 36, theft: 0.006, color: 0x8f1218, dep: 0.985 },
  hatch: { name: 'Small hatchback', kind: 'car', np: [2850000, 1250000], usd: [17000, 8000], svc: [6500, 190], fuel: [9.5, 0.1], loanMonths: 60, theft: 0.002, color: 0x6b1f2a, dep: 0.988 },
  suv: { name: 'Compact SUV', kind: 'car', np: [5900000, 3000000], usd: [32000, 17000], svc: [10500, 280], fuel: [14, 0.15], loanMonths: 60, theft: 0.002, color: 0x2e3b2c, dep: 0.988, spec: { top: 125 / 3.6, a0: 4.5 } },
  lux: { name: 'Luxury saloon', kind: 'car', np: [24500000, 11500000], usd: [78000, 36000], svc: [36000, 750], fuel: [19, 0.22], loanMonths: 60, theft: 0.0015, color: 0x121417, dep: 0.988, spec: { top: 165 / 3.6, a0: 5.8 } }
};
export const LOAN_RATE = 12.5;
const INDIA = { car: 0.18, cycle: 0.36, moto: 0.36 };
export function vprice(s, model, field, used) {
  const m = MODELS[model]; if (!m) return 0;
  const c = s && s.country, i = field === 'buy' ? (used ? 1 : 0) : 0;
  const pick = field === 'buy' ? [m.np[i], m.usd[i]] : field === 'svc' ? [m.svc[0], m.svc[1]] : [m.fuel[0], m.fuel[1]];
  const raw = c === 'Nepal' || !COUNTRIES[c] ? pick[0] : c === 'India' ? pick[0] * INDIA[m.kind] * (field === 'buy' ? 1 : 1.6) : pick[1] * cty(s).rate;
  return field === 'fuel' ? Math.round(raw * 100) / 100 : nice(raw);
}
export const vehPremium = (s, v) => nice((v.value || 0) * 0.024 / 12);
export const tradeIn = v => nice((v.value || 0) * 0.85);
const PLATE_MID = { cycle: '', moto: 'PA', car: 'CHA' };
function plateFor(s, kind, n) {
  if (kind === 'cycle') return '';
  const h = Math.abs(String(s.name || 'x').split('').reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) + n * 977) % 9000;
  return `BA ${1 + (n % 9)} ${PLATE_MID[kind]} ${1000 + h}`;
}
function newVehicle(s, model, used, o = {}) {
  const m = MODELS[model]; s.vehSeq = (s.vehSeq || 0) + 1;
  const price = vprice(s, model, 'buy', used);
  return { id: 'v' + s.vehSeq, model, kind: m.kind, name: (used ? 'second-hand ' : '') + m.name.charAt(0).toLowerCase() + m.name.slice(1), used: !!used, price, value: price, ins: false, loan: null, family: !!o.family, driver: !!o.driver, plate: plateFor(s, m.kind, s.vehSeq), color: m.color, since: s.age };
}
export function vehLabel(v) { return v.name.charAt(0).toUpperCase() + v.name.slice(1); }
function migrateVehicles(s) {
  s.vehicles = [];
  if (s.car && typeof s.car === 'object') {
    const v = newVehicle(s, 'hatch', true); v.x = s.car.x; v.z = s.car.z; v.h = s.car.h; v.value = vprice(s, 'hatch', 'buy', true);
    s.vehicles.push(v); delete s.car;
  }
  const hh = s.hh;
  if (hh && hh.car && hh.circ) s.vehicles.push(familyCar(s, hh.circ));
}
function familyCar(s, circ) {
  const model = circ === 'wealthy' ? 'lux' : circ === 'comfortable' ? 'suv' : 'hatch', v = newVehicle(s, model, circ === 'failing', { family: true, driver: circ === 'wealthy' });
  v.name = 'the family ' + MODELS[model].name.toLowerCase();
  return v;
}
// Birth decides the start: poor walks; an ordinary family may hand down a cycle or an old scooter; business and wealthy families have a car.
export function birthVehicles(s, circ, r = Math.random) {
  s.vehicles = []; s.vehSeq = 0;
  if (circ === 'middle') { const x = r(); if (x < 0.45) s.vehicles.push(newVehicle(s, 'cycle', true)); else if (x < 0.7) s.vehicles.push(newVehicle(s, 'scooter', true)); }
  else if (circ === 'failing' || circ === 'comfortable' || circ === 'wealthy') s.vehicles.push(familyCar(s, circ));
  if (s.hh) s.hh.car = s.vehicles.some(v => v.kind === 'car');
  return s.vehicles;
}
const earning = s => !!(s.job || s.biz || (s.hh && s.hh.biz && s.hh.biz.owner === 'you' && s.hh.biz.state === 'open'));
export function loanTerms(s, model, used) {
  const m = MODELS[model], price = vprice(s, model, 'buy', used), down = nice(price * (m.kind === 'car' ? 0.3 : 0.2)), P = price - down;
  return { price, down, P, months: m.loanMonths, rate: LOAN_RATE, emi: emi(P, LOAN_RATE, m.loanMonths) };
}
export function buyVehicle(s, model, used, pay) {
  ensure(s);
  const m = MODELS[model]; if (!m) return res(false, 'That model is not on the lot.');
  if (!Array.isArray(s.vehicles)) s.vehicles = [];
  if (s.vehicles.filter(v => !v.family).length >= 4) return res(false, 'Four vehicles is all your home can park.');
  const price = vprice(s, model, 'buy', used), nm = (used ? 'second-hand ' : 'new ') + m.name.toLowerCase();
  if (pay === 'loan') {
    if (!m.loanMonths) return res(false, 'The bank does not lend for a bicycle. Pay cash.');
    if (!earning(s)) return res(false, 'The bank wants a salary or a business before it lends for a vehicle.');
    if (!s.hh || !Array.isArray(s.hh.loans)) return res(false, 'The bank cannot open a loan right now.');
    const t = loanTerms(s, model, used);
    if (spend(s, t.down) < 0) return res(false, `The down payment is ${money(s, t.down)}. Pocket and bank together are short.`);
    const v = newVehicle(s, model, used);
    const l = { id: 'vl' + s.vehSeq, lender: 'Sansar Bank (vehicle loan)', principal: t.P, start: t.P, rate: t.rate, months: t.months, instalment: t.emi, due_day: 1, collateral: 'vehicle', veh: v.id, payer: 'you', missed: 0, late: 0, paid: 0, state: 'ok' };
    s.hh.loans.push(l); v.loan = l.id; s.vehicles.push(v);
    bought(s, `Bought a ${nm} (down payment)`, t.down);
    const msg = `You bought a ${nm} for ${money(s, price)}: ${money(s, t.down)} down, and a loan of ${money(s, t.P)} at ${t.rate}% for ${t.months} months, ${money(s, t.emi)} a month. It is parked at home.`;
    say(s, msg); return Object.assign(res(true, msg, ['-' + money(s, t.down)]), { v });
  }
  if (spend(s, price) < 0) return res(false, `The ${nm} costs ${money(s, price)}. Pocket and bank together are short. Ask about a loan.`);
  const v = newVehicle(s, model, used); s.vehicles.push(v);
  bought(s, `Bought a ${nm}`, price);
  const msg = `You bought a ${nm} for ${money(s, price)}, cash. It is parked at home. Servicing and road tax are ${money(s, vprice(s, model, 'svc'))} a month.`;
  say(s, msg); return Object.assign(res(true, msg, ['-' + money(s, price)]), { v });
}
export function sellVehicle(s, id) {
  ensure(s);
  const v = (s.vehicles || []).find(x => x.id === id); if (!v) return res(false, 'That vehicle is gone.');
  if (v.family) return res(false, 'That belongs to the family. It is not yours to sell.');
  const price = tradeIn(v), l = v.loan && s.hh ? s.hh.loans.find(x => x.id === v.loan && x.state === 'ok') : null;
  const owed = l ? l.principal : 0;
  if (owed > price) return res(false, `The dealer offers ${money(s, price)}, but ${money(s, owed)} is still owed on the loan. Clear some of it first.`);
  if (l) { l.principal = 0; l.state = 'closed'; }
  s.bank = (s.bank || 0) + price - owed;
  s.vehicles = s.vehicles.filter(x => x !== v);
  bought(s, `Sold the ${v.name}`, -(price - owed));
  const msg = `Sansar Motors bought the ${v.name} for ${money(s, price)}${owed ? `; ${money(s, owed)} cleared the loan` : ''}. ${money(s, price - owed)} is in your bank.`;
  say(s, msg); return Object.assign(res(true, msg, ['+' + money(s, price - owed)]), { gone: id });
}
export function insureVehicle(s, id, on) {
  const v = (ensure(s), (s.vehicles || []).find(x => x.id === id)); if (!v) return res(false, 'That vehicle is gone.');
  if (v.family) return res(false, 'The family insures its own car.');
  if (!on) { v.ins = false; say(s, `You stopped the insurance on the ${v.name}.`); return res(true, `Insurance on the ${v.name} stopped. Theft or a bad crash now loses it.`, []); }
  if (v.ins) return res(false, 'It is already insured.');
  const p = vehPremium(s, v); if (spend(s, p) < 0) return res(false, `Insurance is ${money(s, p)} a month. Pocket and bank together are short.`);
  book(s, 'exp', 'vehicle', p); v.ins = true; say(s, `You insured the ${v.name}: ${money(s, p)} a month.`);
  return res(true, `The ${v.name} is insured: ${money(s, p)} a month. Theft and accidents are covered.`, ['-' + money(s, p)]);
}
function vehicleMonth(s, now, r, out) {
  for (const v of [...(s.vehicles || [])]) {
    const m = MODELS[v.model]; if (!m) continue;
    v.value = Math.max(nice(v.price * 0.12), nice(v.value * m.dep));
    if (v.family || !(r() < m.theft)) continue;
    if (v.ins) { const pay = nice(v.value * 0.85); s.bank = (s.bank || 0) + pay; book(s, 'inc', 'other', pay); s.vehicles = s.vehicles.filter(x => x !== v); out.push(`Your ${v.name} was stolen. Insurance paid ${money(s, pay)} into the bank.`); }
    else { s.vehicles = s.vehicles.filter(x => x !== v); out.push(`Your ${v.name} was stolen in the night. It was not insured.${v.loan ? ' The loan is still yours to pay.' : ''}`); }
    s.vehLost = v.id;
  }
}
// A bad crash: insurance repairs it, otherwise it is written off. Returns true when the vehicle is gone.
export function wreck(s, id) {
  const v = (ensure(s), (s.vehicles || []).find(x => x.id === id)); if (!v || v.family) return false;
  if (v.ins) { say(s, `The ${v.name} was badly damaged. Insurance paid for the repairs.`); return false; }
  s.vehicles = s.vehicles.filter(x => x !== v);
  say(s, `The ${v.name} is written off. It was not insured.${v.loan ? ' The loan is still yours to pay.' : ''}`);
  return true;
}
// called from the household loans when three vehicle instalments are missed
export function repossess(s, l, out) {
  const v = (s.vehicles || []).find(x => x.id === l.veh);
  l.late = 0;
  if (!v) { l.collateral = 'none'; return 'threat'; }
  const val = nice(v.value * 0.6);
  s.vehicles = s.vehicles.filter(x => x !== v); s.vehLost = v.id;
  l.principal = Math.max(0, l.principal - val); if (l.principal <= 0) l.state = 'closed'; l.collateral = 'none';
  out.push(`Three instalments missed. Sansar Bank takes the ${v.name} and sells it for ${money(s, val)}.${l.principal > 0 ? ` ${money(s, l.principal)} is still owed.` : ''}`);
  s.H = clamp((s.H || 50) - 8);
  return 'vehicle';
}
export const vehicleWorth = s => (s.vehicles || []).filter(v => !v.family).reduce((a, v) => a + (v.value || 0), 0);
export const fuelPerKm = (s, v) => v && MODELS[v.model] ? vprice(s, v.model, 'fuel') : 0;

// House, business and education use the same loan object as a vehicle loan. The car loan stays at the dealer.
const PURPOSE = {
  business: { id: 'bizloan', lender: 'Sansar Bank (business loan)', base: 800000, rate: 13, months: 36, collateral: 'shop' },
  education: { id: 'eduloan', lender: 'Sansar Bank (education loan)', base: 400000, rate: 9, months: 48, collateral: 'none' },
};
export function purposeLoan(s, kind) {
  const spec = PURPOSE[kind];
  if (!spec) return res(false, 'The bank does not offer that.');
  ensure(s);
  if (!s.hh || !Array.isArray(s.hh.loans)) return res(false, 'The bank has no file for you yet.');
  if (s.hh.loans.some(l => l.id === spec.id && l.state === 'ok')) return res(false, 'You already have this loan.');
  if (kind === 'business' && !(s.biz || (s.hh.biz && s.hh.biz.state === 'open'))) return res(false, 'The bank wants a shop before it lends for a business.');
  if (kind === 'education' && !s.school) return res(false, 'Enrol first. The bank lends for a course you are on.');
  const principal = nice(spec.base * kf(s)), instalment = emi(principal, spec.rate, spec.months);
  s.bank = (s.bank || 0) + principal;
  s.hh.loans.push({ id: spec.id, lender: spec.lender, principal, start: principal, rate: spec.rate, months: spec.months, instalment, due_day: 10, collateral: spec.collateral, payer: 'you', missed: 0, late: 0, paid: 0, state: 'ok' });
  book(s, 'inc', 'other', principal);
  const msg = spec.lender + ': ' + money(s, principal) + ' at ' + spec.rate + '% for ' + spec.months + ' months, ' + money(s, instalment) + ' a month.';
  say(s, msg);
  return res(true, msg, ['+' + money(s, principal)]);
}

// ---------- the Finances sheet's numbers ----------
export function view(s, ctx = {}) {
  const f = ensure(s), last = f.hist[f.hist.length - 1] || null, prev = f.hist[f.hist.length - 2] || null;
  const ti = total(f.cur.inc), te = total(f.cur.exp), li = last ? total(last.inc) : 0, le = last ? total(last.exp) : 0;
  const due = costs(s, ctx);
  if (ctx.rentDue > 0) due.unshift({ line: 'rent', amt: ctx.rentDue, why: `Rent for ${ctx.home || 'your home'}`, id: 'rent' });
  for (const l of ctx.loans || []) due.push({ line: 'loan', amt: l.amt, why: l.why, id: 'loan:' + l.id });
  const bars = f.hist.slice(-11).map(m => ({ key: m.key, inc: total(m.inc), exp: total(m.exp), partial: m.partial })).concat([{ key: f.key, inc: ti, exp: te, cur: true }]);
  return {
    cur: f.cur, last, prev, ti, te, li, le, net: ti - te, lastNet: last ? li - le : null,
    rate: ti > 0 ? Math.round((ti - te) / ti * 100) : null, lastRate: li > 0 ? Math.round((li - le) / li * 100) : null,
    due, dueTotal: due.reduce((a, c) => a + c.amt, 0), bars, month: f.key, idle: f.idle || 0
  };
}
