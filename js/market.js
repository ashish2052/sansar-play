// Sansar Stock Exchange. Prices are a shared function of the world day: trend, noise and a news shock.
// A 10-year cycle is built once so a live clock (unix days) never walks millions of steps.
import { book, bought, money } from './finance.js?v=usd1';

export const CYCLE = 3650;
export const LIST = [
  { id: 'himal', name: 'Himal Tea', sector: 'Food', px: 180, drift: 0.00115, vol: 0.015, yield: 0.028 },
  { id: 'koshi', name: 'Koshi Power', sector: 'Energy', px: 640, drift: 0.00075, vol: 0.018, yield: 0.035 },
  { id: 'bagmati', name: 'Bagmati Cement', sector: 'Industry', px: 310, drift: 0.00085, vol: 0.016, yield: 0.022 },
  { id: 'sagar', name: 'Sagar Textiles', sector: 'Consumer', px: 95, drift: 0.00105, vol: 0.02, yield: 0.03 },
  { id: 'terai', name: 'Terai Agro', sector: 'Agriculture', px: 140, drift: 0.00095, vol: 0.016, yield: 0.04 },
  { id: 'peak', name: 'Peak Telecom', sector: 'Telecom', px: 880, drift: 0.0012, vol: 0.019, yield: 0.018 },
  { id: 'lumbini', name: 'Lumbini Pharma', sector: 'Health', px: 520, drift: 0.001, vol: 0.014, yield: 0.02 },
  { id: 'everest', name: 'Everest Hotels', sector: 'Hospitality', px: 260, drift: 0.00065, vol: 0.022, yield: 0.025 },
  { id: 'seti', name: 'Seti Motors', sector: 'Auto', px: 410, drift: 0.0008, vol: 0.021, yield: 0.015 },
  { id: 'narayani', name: 'Narayani Steel', sector: 'Materials', px: 205, drift: 0.00075, vol: 0.017, yield: 0.032 }
];

const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
function unit(id, day) {
  const h = hash(id + ':' + day);
  const a = (h % 10000) / 9999, b = ((h >>> 8) % 10000) / 9999;
  return a + b - 1;
}
function shock(id, day) {
  const h = hash(id + ':n:' + day);
  if (h % 28 !== 0) return 0;
  const sign = (h & 4) ? 1 : -1;
  return sign * (0.05 + (h % 7) / 100);
}
const NEWS = {
  Food: ['a dry season', 'a strong harvest'],
  Energy: ['a river running low', 'full reservoirs'],
  Industry: ['a kiln shutdown', 'a new contract'],
  Consumer: ['weak festival sales', 'a busy festival'],
  Agriculture: ['flooded fields', 'a good monsoon'],
  Telecom: ['a tower outage', 'a new licence'],
  Health: ['a failed trial', 'a drug approval'],
  Hospitality: ['empty rooms', 'a full season'],
  Auto: ['a parts delay', 'a new model'],
  Materials: ['cheap imports', 'a building boom']
};

const PATH = new Map();
function build(co) {
  const px = new Float64Array(CYCLE + 1);
  const sh = new Float64Array(CYCLE + 1);
  px[0] = co.px; sh[0] = 0;
  let log = 0;
  for (let d = 1; d <= CYCLE; d++) {
    const j = shock(co.id, d);
    sh[d] = j;
    log += co.drift + co.vol * unit(co.id, d) + j;
    px[d] = Math.max(1, Math.round(co.px * Math.exp(log)));
  }
  PATH.set(co.id, { px, sh });
}
for (const co of LIST) build(co);

export const indexOf = (day) => { const n = Math.floor(Number(day) || 0); return ((n % CYCLE) + CYCLE) % CYCLE; };
export function priceOf(id, day) {
  const row = PATH.get(id); if (!row) return 1;
  return row.px[indexOf(day)];
}
export function quote(id, day) {
  const co = LIST.find((c) => c.id === id); if (!co) return null;
  const d = indexOf(day), row = PATH.get(id);
  const price = row.px[d], prev = row.px[d === 0 ? 0 : d - 1];
  const chg = prev ? Math.round((price - prev) / prev * 1000) / 10 : 0;
  return { id, name: co.name, sector: co.sector, price, prev, chg, yield: co.yield, shock: row.sh[d] };
}
export function newsLine(day) {
  const d = indexOf(day);
  for (const co of LIST) {
    const j = PATH.get(co.id).sh[d];
    if (!j) continue;
    const pair = NEWS[co.sector] || ['a surprise', 'a surprise'];
    return j < 0 ? `${co.name}: ${pair[0]} pulls the price down.` : `${co.name}: ${pair[1]} lifts the price.`;
  }
  return 'A quiet day on the Sansar exchange. Prices still move.';
}
export function folio(s) {
  if (!s.folio || typeof s.folio !== 'object') s.folio = { sh: {}, div: 0, divDay: null, value: 0 };
  if (!s.folio.sh || typeof s.folio.sh !== 'object') s.folio.sh = {};
  if (!s.folio.lots || typeof s.folio.lots !== 'object') s.folio.lots = {};
  if (!s.folio.divCo || typeof s.folio.divCo !== 'object') s.folio.divCo = {};
  if (!Array.isArray(s.folio.hist)) s.folio.hist = [];
  if (typeof s.folio.realised !== 'number') s.folio.realised = 0;
  if (typeof s.folio.spent !== 'number') s.folio.spent = 0;
  return s.folio;
}
// One lot per buy. Old saves that only stored a count become one lot at today's price.
function lotsOf(f, id, day) {
  if (!Array.isArray(f.lots[id])) {
    const n = f.sh[id] || 0;
    const px = priceOf(id, day);
    f.lots[id] = n > 0 ? [{ q: n, px }] : [];
    if (n > 0) f.spent += px * n;
  }
  return f.lots[id];
}
function heldOf(f, id) {
  const lots = f.lots[id];
  if (!Array.isArray(lots)) return f.sh[id] || 0;
  const n = lots.reduce((a, lot) => a + (lot.q || 0), 0);
  if (n > 0) f.sh[id] = n; else delete f.sh[id];
  return n;
}
function costOf(lots) { return lots.reduce((a, lot) => a + lot.q * lot.px, 0); }
function takeLots(lots, qty) {
  let left = qty, cost = 0;
  while (left > 0 && lots.length) {
    const lot = lots[0], n = Math.min(left, lot.q);
    cost += n * lot.px; lot.q -= n; left -= n;
    if (lot.q <= 1e-9) lots.shift();
  }
  return cost;
}
export function mark(s, day) {
  const f = folio(s); let v = 0;
  for (const co of LIST) v += heldOf(f, co.id) * priceOf(co.id, day);
  f.value = Math.round(v); f.day = indexOf(day); return f.value;
}
export function sample(s, month, day) {
  const f = folio(s); mark(s, day);
  const m = month | 0, v = f.value || 0;
  const last = f.hist[f.hist.length - 1];
  if (!last || last.m !== m) f.hist.push({ m, v });
  else last.v = v;
  if (f.hist.length > 36) f.hist.splice(0, f.hist.length - 36);
  return f.hist;
}
function take(s, cost) {
  const pocket = Math.max(0, s.cash || 0), bank = Math.max(0, s.bank || 0);
  if (pocket + bank < cost) return false;
  const p = Math.min(pocket, cost); s.cash -= p; s.bank = bank - (cost - p); return true;
}
export function buy(s, id, qty, day) {
  const co = LIST.find((c) => c.id === id); qty = Math.round(+qty);
  if (!co || !(qty >= 1)) return { ok: false, msg: 'That share is not listed.', fx: [] };
  const px = priceOf(id, day), cost = px * qty;
  if (!take(s, cost)) return { ok: false, msg: `One ${co.name} share is ${money(s, px)}. Pocket and bank together are short.`, fx: [] };
  const f = folio(s);
  lotsOf(f, id, day).push({ q: qty, px });
  f.sh[id] = (f.sh[id] || 0) + qty;
  f.spent += cost;
  bought(s, 'Bought ' + co.name, cost); mark(s, day);
  return { ok: true, msg: `Bought ${qty} ${co.name} at ${money(s, px)}. Dividends reach the bank on dividend days.`, fx: ['-' + money(s, cost)] };
}
function sellCore(s, id, qty, day, line) {
  const co = LIST.find((c) => c.id === id); qty = Math.round(+qty);
  if (!co || !(qty >= 1)) return { ok: false, msg: 'That share is not listed.', fx: [], gain: 0, pay: 0 };
  const f = folio(s), lots = lotsOf(f, id, day), held = heldOf(f, id);
  if (held < qty) return { ok: false, msg: `You hold ${held} ${co.name}.`, fx: [], gain: 0, pay: 0 };
  const px = priceOf(id, day), pay = px * qty, cost = takeLots(lots, qty), gain = pay - cost;
  heldOf(f, id);
  f.realised += gain;
  s.cash = (s.cash || 0) + pay;
  const text = line(co, qty, gain);
  if (text) bought(s, text, -pay);
  mark(s, day);
  return { ok: true, msg: `${text} ${money(s, pay)} is in your pocket.`.trim(), fx: ['+' + money(s, pay)], gain, pay, name: co.name };
}
export function sell(s, id, qty, day) {
  const r = sellCore(s, id, qty, day, (co, q, gain) => `Sold ${q} ${co.name}. Realised ${gain >= 0 ? '+' : ''}${Math.round(gain)}.`);
  return { ok: r.ok, msg: r.msg, fx: r.fx || [] };
}
export function sellAll(s, id, day) {
  const f = folio(s), n = heldOf(f, id);
  if (!(n >= 1)) return { ok: false, msg: 'You hold none of that company.', fx: [] };
  const r = sellCore(s, id, n, day, (co, q, gain) => `Sold all ${co.name}. Realised ${gain >= 0 ? '+' : ''}${Math.round(gain)}. Holdings 0.`);
  return { ok: r.ok, msg: r.msg, fx: r.fx || [], realised: r.gain || 0 };
}
export function sellPortfolio(s, day) {
  const f = folio(s);
  const ids = LIST.filter((c) => heldOf(f, c.id) > 0).map((c) => c.id);
  if (!ids.length) return { ok: false, msg: 'The portfolio is already empty.', fx: [] };
  let gain = 0, pay = 0;
  for (const id of ids) {
    const n = heldOf(f, id);
    const r = sellCore(s, id, n, day, () => '');
    if (r.ok) { gain += r.gain; pay += r.pay; }
  }
  const text = `Sold the portfolio. Realised ${gain >= 0 ? '+' : ''}${Math.round(gain)}. Holdings 0.`;
  bought(s, text, -pay);
  mark(s, day);
  return { ok: true, msg: `${text} ${money(s, pay)} is in your pocket.`, fx: ['+' + money(s, pay)], realised: gain };
}
// Dividends: one twelfth of the annual yield, every 30th world day, into the bank.
export function settle(s, day) {
  const f = folio(s), d = indexOf(day);
  if (f.divDay == null) { f.divDay = d; mark(s, d); return 0; }
  if (f.divDay === d) { mark(s, d); return 0; }
  let gap = d - f.divDay; if (gap < 0) gap += CYCLE;
  const from = gap > 40 ? d : f.divDay;
  f.divDay = d;
  let pay = 0;
  for (let k = (gap > 40 ? d : from + 1); k <= d; k++) {
    if (k % 30 !== 0) continue;
    for (const co of LIST) {
      const n = f.sh[co.id] || 0; if (!n) continue;
      const raw = n * priceOf(co.id, k) * co.yield / 12;
      if (raw > 0) {
        const chunk = Math.max(1, Math.round(raw));
        pay += chunk;
        f.divCo[co.id] = (f.divCo[co.id] || 0) + chunk;
      }
    }
  }
  if (pay > 0) { s.bank = (s.bank || 0) + pay; f.div = (f.div || 0) + pay; book(s, 'inc', 'invest', pay); }
  mark(s, d); return pay;
}
export function holdings(s, day) {
  const f = folio(s);
  return LIST.filter((c) => heldOf(f, c.id) > 0).map((c) => {
    const lots = lotsOf(f, c.id, day), n = heldOf(f, c.id), price = priceOf(c.id, day);
    const cost = costOf(lots), value = n * price, unreal = value - cost;
    const avg = n ? cost / n : 0;
    const pct = cost > 0 ? Math.round(unreal / cost * 1000) / 10 : 0;
    return { id: c.id, name: c.name, n, avg, price, value, cost, unreal, pct, div: f.divCo[c.id] || 0 };
  });
}
export function summary(s, day, month) {
  if (month != null) sample(s, month, day); else mark(s, day);
  const f = folio(s), rows = holdings(s, day);
  const invested = rows.reduce((a, h) => a + h.cost, 0);
  const value = rows.reduce((a, h) => a + h.value, 0);
  const unreal = value - invested;
  const realised = f.realised || 0;
  const div = f.div || 0;
  const spent = f.spent || invested;
  const ret = spent > 0 ? Math.round((unreal + realised + div) / spent * 1000) / 10 : 0;
  return { invested, value, unreal, realised, div, ret, rows, hist: f.hist };
}
// What the node test reads: 365 world days from a flat open.
export function simulate(days = 365) {
  const n = Math.max(2, Math.min(CYCLE, days | 0));
  const rows = LIST.map((co) => {
    const row = PATH.get(co.id);
    let peak = row.px[0], worst = 0, min = row.px[0];
    for (let d = 0; d <= n; d++) {
      const px = row.px[d];
      if (px < min) min = px;
      if (px > peak) peak = px;
      const dd = peak > 0 ? (peak - px) / peak : 0;
      if (dd > worst) worst = dd;
    }
    return { id: co.id, start: row.px[0], end: row.px[n], min, drawdown: worst };
  });
  const avg = rows.reduce((a, r) => a + r.end / r.start, 0) / rows.length;
  const neg = rows.some((r) => r.min < 1 || r.end < 1 || r.start < 1);
  return { days: n, avg, neg, drawdowns: rows.filter((r) => r.drawdown >= 0.08).length, rows };
}
