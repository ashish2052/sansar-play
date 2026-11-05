// Appointments and broken promises. Pure logic: the clock, the chat line and a seed decide
// what happens. The model may colour a later conversation; it does not invent the date.
const MISS = { date: 8, anniversary: 16, proposal: 22 };
const MOVE_DROP = { date: 2, anniversary: 4, proposal: 5 };
const MEET = /\b(let'?s meet|lets meet|meet me|meet you|meet tomorrow|meet today|meet tonight|make a date|set a date|appointment)\b/i;
const MOVE = /\b(reschedul|can'?t make it|cannot make it|rain check|move (?:it|the date|our date)|another time|push it)\b/i;
const SORRY = /\b(i'?m sorry|i am sorry|apologi[sz]e|forgive me|i was wrong)\b/i;
const ANN = /\banniversar/i;
const PROP = /\b(propos(?:e|al|ing|ed)?|marry me|will you marry)\b/i;
const WHEN = /\b(tomorrow|today|tonight|at the|at \d)/i;
const FAKE = /\b(movies?|cinema|films?|theatre|theater|mall|nightclub|concert)\b/i;
const PLACES = [
  { id: 'cafe', map: 'cafe', say: 'the cafe', re: /caf[eé]|coffee/i, hour: 15 },
  { id: 'park', map: 'park', say: 'the park', re: /\bpark\b/i, hour: 16 },
  { id: 'bank', map: 'bank', say: 'the bank', re: /\bbank\b/i, hour: 11 },
  { id: 'college', map: 'college', say: 'the college', re: /\bcollege\b|\bcampus\b/i, hour: 12 },
  { id: 'gym', map: 'gym', say: 'the gym', re: /\bgym\b/i, hour: 18 },
  { id: 'bazaar', map: 'bazaar', say: 'the old bazaar', re: /\bbazaar\b/i, hour: 17 },
  { id: 'shop', map: 'business', say: 'the shop', re: /\bshop\b|\bstore\b/i, hour: 14 },
  { id: 'hospital', map: 'hospital', say: 'the hospital', re: /\bhospital\b/i, hour: 10 },
  { id: 'exchange', map: 'exchange', say: 'the exchange', re: /\bexchange\b/i, hour: 13 },
  { id: 'work', map: 'work', say: 'the office', re: /\boffice\b|\bwork\b/i, hour: 12 },
  { id: 'home', map: 'home', say: 'home', re: /\bhome\b/i, hour: 19 }
];
const clamp = (v) => Math.max(-100, Math.min(100, Math.round(v)));
const first = (n) => String(n || 'They').split(' ')[0];
export const clockLabel = (h) => { h = ((h % 24) + 24) % 24; const ap = h < 12 ? 'am' : 'pm'; return ((h % 12) || 12) + ap; };
export function placeOf(text) { const t = String(text || ''); for (const p of PLACES) if (p.re.test(t)) return p; return null; }
export function readHour(text, fallback) {
  const t = String(text || '');
  const m = t.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i) || t.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\b/i);
  if (!m) return fallback;
  let h = +m[1]; const ap = (m[3] || '').toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (!ap && h <= 7) h += 12;
  if (h < 0 || h > 23) return fallback;
  return h;
}
export function intent(text) {
  const t = String(text || '');
  if (MOVE.test(t)) return 'move';
  if (SORRY.test(t)) return 'sorry';
  if ((MEET.test(t) || ((PROP.test(t) || ANN.test(t)) && WHEN.test(t))) && FAKE.test(t) && !placeOf(t)) return 'fake';
  if (MEET.test(t) || ((PROP.test(t) || ANN.test(t)) && WHEN.test(t))) return 'meet';
  return '';
}
export function ensure(s) {
  if (!s.dates || typeof s.dates !== 'object') s.dates = { list: [], bonds: {}, inbox: [] };
  if (!Array.isArray(s.dates.list)) s.dates.list = [];
  if (!s.dates.bonds || typeof s.dates.bonds !== 'object') s.dates.bonds = {};
  if (!Array.isArray(s.dates.inbox)) s.dates.inbox = [];
  return s.dates;
}
export function bond(s, npc) {
  const d = ensure(s);
  if (!d.bonds[npc]) d.bonds[npc] = { aff: 0, bond: '', broken: 0, kept: 0, warm: 0, fresh: true, name: '' };
  return d.bonds[npc];
}
export function seedBond(s, npc, o) {
  const b = bond(s, npc);
  if (o.aff != null) b.aff = clamp(o.aff);
  if (o.bond) b.bond = o.bond === 'partner' ? 'dating' : o.bond;
  if (o.name) b.name = o.name;
  b.fresh = false;
  return b;
}
function kindOf(text) { return PROP.test(text) ? 'proposal' : ANN.test(text) ? 'anniversary' : 'date'; }
function readDay(text, now, hour) {
  let day = /\btomorrow\b/i.test(text) ? now.day + 1 : /\btonight\b/i.test(text) ? (now.hour < 20 ? now.day : now.day + 1) : /\btoday\b/i.test(text) ? now.day : now.day + 1;
  if (day === now.day && hour <= now.hour) day += 1;
  return day;
}
const abs = (day, hour) => day + hour / 24;
export function add(s, spec) {
  const d = ensure(s);
  d.list = d.list.filter((a) => !(a.npc === spec.npc && a.status === 'set'));
  const row = {
    id: 'd' + (d.list.length + 1) + '-' + spec.npc + '-' + spec.day + '-' + spec.hour,
    npc: spec.npc, name: spec.name || spec.npc, place: spec.place, say: spec.say, map: spec.map,
    day: spec.day | 0, hour: spec.hour | 0, kind: spec.kind || 'date', adult: !!spec.adult,
    status: 'set', reminded: false, went: false, pinged: false, showed: false, ontime: false, left: false
  };
  d.list.push(row);
  const b = bond(s, spec.npc);
  if (spec.name) b.name = spec.name;
  if (spec.bond) b.bond = spec.bond === 'partner' ? 'dating' : spec.bond;
  if (spec.aff != null && b.fresh) { b.aff = clamp(spec.aff); b.fresh = false; }
  return row;
}
export function planFrom(text, now) {
  const place = placeOf(text) || PLACES[0];
  const hour = readHour(text, place.hour);
  const day = readDay(text, now, hour);
  const kind = kindOf(text);
  const when = day === now.day ? 'Today' : 'Tomorrow';
  const line = `${when}, ${clockLabel(hour)} at ${place.say}. I will be there.`;
  return { ok: true, place: place.id, say: place.say, map: place.map, day, hour, kind, line };
}
function unit(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    let x = (Math.imul(seed >>> 0, 0x9E3779B1) + 0x85EBCA6B) >>> 0;
    x ^= x >>> 16; x = Math.imul(x, 0x7FEB352D); x ^= x >>> 15; x = Math.imul(x, 0x846CA68B); x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  }
  let h = 2166136261; const str = String(seed);
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}
export function odds(aff, broken) {
  if (aff >= 80) return 0;
  const gap = Math.min(1, (80 - aff) / 80);
  return Math.min(0.55, 0.04 + gap * 0.22 + Math.min(broken, 8) * 0.035);
}
function pushMsg(s, row, text) {
  const d = ensure(s);
  const msg = { id: 'm' + d.inbox.length + '-' + row.id, npc: row.npc, from: first(row.name), text, day: row.day, hour: row.hour };
  d.inbox.unshift(msg);
  if (d.inbox.length > 30) d.inbox.length = 30;
  return msg;
}
export function divorceSplit(s, who) {
  const fds = (s.fds || []).reduce((a, f) => a + (f.amt || 0), 0);
  const liquid = Math.max(0, (s.cash || 0) + (s.bank || 0) + fds);
  const half = Math.round(liquid / 2);
  let left = half;
  const bank = Math.max(0, s.bank || 0), takeB = Math.min(bank, left);
  s.bank = bank - takeB; left -= takeB;
  const cash = Math.max(0, s.cash || 0), takeC = Math.min(cash, left);
  s.cash = cash - takeC; left -= takeC;
  if (Array.isArray(s.fds)) {
    for (const f of s.fds) { if (left <= 0) break; const t = Math.min(f.amt || 0, left); f.amt -= t; left -= t; }
    s.fds = s.fds.filter((f) => f.amt > 0);
  }
  const paid = half - left;
  const amt = Math.max(1500, Math.round((paid || 1500) / 24));
  s.alimony = { name: who.name || who.npc, npc: who.npc, amt, left: 24, months: 24 };
  if (s.spouse && s.spouse.id === who.npc) s.spouse = null;
  if (Array.isArray(s.partners)) s.partners = s.partners.filter((p) => p.id !== who.npc);
  return { half: paid, alimony: amt, months: 24 };
}
function remember(b, text) { b.memory = text; }
export function localLine(s, spec) {
  const what = intent(spec.text);
  if (!what) return null;
  const now = spec.now;
  const b = bond(s, spec.npc);
  if (spec.name) b.name = spec.name;
  if (what === 'fake') return { local: true, line: 'There is no cinema in town. The cafe, the park or the bank?', aff: b.aff, mood: 'calm' };
  if (what === 'sorry') {
    if (b.broken <= 0) return null;
    const gain = 5;
    b.aff = clamp(b.aff + gain); b.broken -= 1; b.fresh = false;
    remember(b, 'you apologised for a broken promise');
    return { local: true, line: 'I heard you. Do not leave me waiting again.', aff: b.aff, d: gain, mood: 'sad', fact: 'you apologised for a broken promise', end: '' };
  }
  if (what === 'move') {
    const open = ensure(s).list.filter((a) => a.npc === spec.npc && a.status === 'set').sort((a, c) => abs(a.day, a.hour) - abs(c.day, c.hour))[0];
    if (!open) return { local: true, line: 'We do not have a time yet. Ask me properly.', aff: b.aff, mood: 'calm' };
    if (abs(now.day, now.hour) >= abs(open.day, open.hour)) return { local: true, line: 'That is too late. I am already there.', aff: b.aff, mood: 'angry' };
    const drop = MOVE_DROP[open.kind] || 2;
    b.aff = clamp(b.aff - drop); b.fresh = false;
    const place = placeOf(spec.text) || { id: open.place, map: open.map, say: open.say, hour: open.hour };
    const hour = readHour(spec.text, open.hour);
    const day = readDay(spec.text, now, hour);
    open.status = 'moved';
    const row = add(s, { npc: spec.npc, name: open.name, place: place.id, say: place.say, map: place.map, day, hour, kind: open.kind, adult: open.adult });
    remember(b, 'you moved the date at ' + open.say + ' ahead of time');
    return { local: true, line: `Alright. ${day === now.day ? 'Today' : 'Tomorrow'}, ${clockLabel(hour)} at ${place.say}. Tell me sooner next time.`, aff: b.aff, d: -drop, mood: 'sad', fact: 'you moved the date ahead of time', appt: row };
  }
  return null;
}
export function agreeText(s, spec) {
  const what = intent(spec.text);
  if (what === 'fake') return { ok: false, line: 'There is no cinema in town. The cafe, the park or the bank?' };
  if (what !== 'meet') return null;
  const plan = planFrom(spec.text, spec.now);
  const row = add(s, { npc: spec.npc, name: spec.name, place: plan.place, say: plan.say, map: plan.map, day: plan.day, hour: plan.hour, kind: plan.kind, aff: spec.aff, bond: spec.bond, adult: !!spec.adult });
  const b = bond(s, spec.npc);
  remember(b, 'you agreed to meet at ' + plan.say);
  return { ok: true, line: plan.line, appt: row, fact: 'agreed to meet at ' + plan.say };
}
function ownsHome(s) {
  const h = s && s.hh && s.hh.home;
  if (!h || h.familyStay) return false;
  if (h.youOwn) return true;
  return !!(h.own && h.payer === 'you');
}
function applyKeep(s, a, b) {
  const gain = a.ontime ? 6 : 2;
  b.aff = clamp(b.aff + gain);
  b.kept += 1; b.warm += 1;
  if (b.broken > 0) b.broken -= 1;
  b.fresh = false;
  remember(b, 'you showed up at ' + a.say);
  let married = false, needHome = false;
  if (a.kind === 'proposal' && a.adult && (b.bond === 'dating' || b.bond === 'partner') && b.aff >= 80) {
    if (!ownsHome(s)) needHome = true;
    else {
    b.bond = 'married';
    s.spouse = { name: a.name, id: a.npc, alive: true, since: s.age };
    if (!Array.isArray(s.partners)) s.partners = [];
    if (!s.partners.some((p) => p.id === a.npc)) s.partners.push({ id: a.npc, name: a.name, since: s.age });
    married = true;
    }
  }
  return { type: 'keep', npc: a.npc, name: a.name, say: a.say, d: gain, aff: b.aff, ontime: a.ontime, warm: b.warm, kept: b.kept, married, needHome, fact: 'you showed up at ' + a.say };
}
function applyMiss(s, a, b, seed) {
  const drop = MISS[a.kind] || 8;
  b.aff = clamp(b.aff - drop);
  b.broken += 1; b.fresh = false;
  remember(b, 'you stood them up at ' + a.say);
  const ev = { type: 'miss', npc: a.npc, name: a.name, say: a.say, d: -drop, aff: b.aff, broken: b.broken, kind: a.kind, fact: 'you stood them up at ' + a.say };
  const dating = b.bond === 'dating' || b.bond === 'partner' || b.bond === 'married';
  if (dating && b.aff < 80) {
    const p = odds(b.aff, b.broken);
    const roll = unit(seed == null ? (a.npc + ':' + a.day + ':' + b.broken) : seed);
    ev.p = p; ev.roll = roll;
    if (roll < p) {
      if (b.bond === 'married' || (s.spouse && s.spouse.id === a.npc)) {
        const money = divorceSplit(s, a);
        b.bond = '';
        ev.ended = 'divorce'; ev.half = money.half; ev.alimony = money.alimony; ev.months = money.months;
      } else {
        b.bond = '';
        if (Array.isArray(s.partners)) s.partners = s.partners.filter((x) => x.id !== a.npc);
        ev.ended = 'break';
      }
    }
  }
  return ev;
}
export function tick(s, now, nearOf, seed) {
  const d = ensure(s); const t = abs(now.day, now.hour); const out = [];
  for (const a of d.list) {
    if (a.status === 'moved') continue;
    const start = abs(a.day, a.hour), end = start + 1 / 24;
    const b = bond(s, a.npc);
    if (a.status === 'set' && !a.reminded && t >= start - 1 / 24 && t < start) {
      a.reminded = true;
      out.push({ type: 'remind', id: a.id, npc: a.npc, name: a.name, say: a.say, map: a.map, hour: a.hour, line: `Meet ${first(a.name)} at ${a.say} at ${clockLabel(a.hour)}` });
    }
    if ((a.status === 'set' || a.status === 'kept') && !a.went && t >= start && t < end) {
      a.went = true;
      out.push({ type: 'go', id: a.id, npc: a.npc, map: a.map, say: a.say });
    }
    if (a.status === 'set' && !a.showed && nearOf && nearOf(a.map) && t >= start && t < end) {
      a.showed = true; a.ontime = (t - start) < (20 / 60) / 24; a.status = 'kept';
      out.push(applyKeep(s, a, b));
    }
    if (!a.pinged && !a.ontime && t >= start + (20 / 60) / 24 && (a.status === 'set' || a.status === 'kept')) {
      a.pinged = true;
      const text = `Where are you? I've been waiting at ${a.say} for 20 minutes.`;
      const msg = pushMsg(s, a, text);
      out.push({ type: 'msg', id: a.id, npc: a.npc, name: a.name, say: a.say, text, msg });
    }
    if (a.status === 'set' && t >= end) {
      a.status = 'missed';
      out.push(applyMiss(s, a, b, seed));
    }
    if (a.went && !a.left && t >= end) {
      a.left = true;
      out.push({ type: 'left', id: a.id, npc: a.npc });
    }
  }
  return out;
}
export function repairGift(s, npc) {
  const b = bond(s, npc);
  if (b.broken <= 0 && b.fresh) return null;
  if (b.broken <= 0) return null;
  b.aff = clamp(b.aff + 7); b.broken -= 1; b.fresh = false;
  remember(b, 'you gave a gift after a broken promise');
  return { d: 7, aff: b.aff, broken: b.broken, fact: 'you gave a gift after a broken promise' };
}
export function reminder(s, day, hour) {
  if (!s) return null;
  const t = abs(day, hour);
  let best = null;
  for (const a of ensure(s).list) {
    if (a.status !== 'set' && a.status !== 'kept') continue;
    const start = abs(a.day, a.hour), end = start + 1 / 24;
    if (t < start - 1 / 24 || t >= end) continue;
    const during = t >= start;
    const line = during ? `${first(a.name)} is at ${a.say} now` : `Meet ${first(a.name)} at ${a.say} at ${clockLabel(a.hour)}`;
    best = { id: a.id, map: a.map, line, during, say: a.say, name: a.name };
  }
  return best;
}
export function whenLabel(a, now) {
  const rel = a.day - now.day;
  const day = rel === 0 ? 'today' : rel === 1 ? 'tomorrow' : rel === -1 ? 'yesterday' : 'in ' + rel + ' days';
  return day + ' ' + clockLabel(a.hour);
}
export function visible(s, now) {
  return ensure(s).list.filter((a) => a.status === 'set' || a.day === now.day || a.day === now.day + 1);
}
export function get(s, id) { return ensure(s).list.find((a) => a.id === id) || null; }
export function label(aff, bondName) {
  if (bondName === 'married') return 'Spouse';
  if (bondName === 'dating' || bondName === 'partner') return 'Partner';
  return aff >= 70 ? 'Close friend' : aff >= 40 ? 'Friend' : aff >= 15 ? 'Acquaintance' : 'Stranger';
}
