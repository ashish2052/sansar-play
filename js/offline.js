/* Sansar static play. Loaded first. On the live server (port 8830 / the tunnel) this file does nothing.
   On GitHub Pages, or any page marked data-sansar="static", or ?offline=1, it answers /api and /ws
   in the page. Saves use localStorage. NPC lines are the written fallbacks, never a model.
   Other players are absent. server.py is not involved. */
(function () {
  var host = location.hostname;
  var on = /(^|\.)github\.io$/i.test(host) || /(?:^|[?&])offline=1(?:&|$)/.test(location.search) || document.documentElement.getAttribute('data-sansar') === 'static';
  if (!on) return;

  var origFetch = window.fetch.bind(window);
  var RATES = { Nepal: 133, USA: 1, UK: 0.8, India: 84, Australia: 1.5, Canada: 1.38, Germany: 0.93, Brazil: 5.2 };
  var BIRTH_ORDER = ['homeless', 'slum', 'struggling', 'middle', 'failing', 'comfortable', 'wealthy'];
  var BIRTH_W = { homeless: 5, slum: 15, struggling: 25, middle: 25, failing: 10, comfortable: 12, wealthy: 7 };
  var AVK = { ag: 3, sk: 13, hs: 8, hc: 15, ey: 7, tp: 8, tc: 14, bt: 8, bc: 14, sh: 8, sc: 14, b: 2, fw: 4, fl: 4 };
  var EXTRA = { et: 4, es: 9, br: 9, ns: 9, lp: 9, bd: 11, mk: 9, of: 15 };
  var MIN_BET = 500, MAX_BET = 50000, BIG = 10000;
  var RANKS = 'A23456789TJQK';
  var RED = { 1: 1, 3: 1, 5: 1, 7: 1, 9: 1, 12: 1, 14: 1, 16: 1, 18: 1, 19: 1, 21: 1, 23: 1, 25: 1, 27: 1, 30: 1, 32: 1, 34: 1, 36: 1 };
  var REEL = ['7', 'B', 'B', 'E', 'E', 'E', 'C', 'C', 'C', 'C'].concat(Array(10).fill('L'));
  var SLOT_PAY = { '7': 100, B: 40, E: 15, C: 8, L: 4 };
  var CATALOG = [
    ['U-river', 'riverside', 'A room on Riverside Lane', 840, 3500, 0, -250, 274],
    ['U-river2', 'riverside', 'A second room on Riverside Lane', 820, 4200, 0, -180, 290],
    ['U-tin', 'tintown', 'A shack in Tin Town', 750, 4800, 0, -300, 274],
    ['U-kiln', 'kiln', 'A room on Kiln Road', 650, 6000, 0, 190, 276],
    ['U-brick', 'brickfield', 'A flat in Brickfield Row', 535, 12000, 2800000, 292, 38],
    ['U-brick2', 'brickfield', 'The next flat in Brickfield Row', 520, 15000, 3200000, 262, 38],
    ['U-market', 'newmarket', 'A room above New Market', 385, 18000, 9000000, 55, 274],
    ['U-east', 'eastgate', 'A flat in Eastgate Colony', 200, 28000, 9500000, 205, 42],
    ['U-east2', 'eastgate', 'A house in Eastgate Colony', 210, 32000, 14000000, 140, 40],
    ['U-laxmi', 'laxmi', 'A house on Laxmi Garden Road', 140, 90000, 45000000, -236, -8]
  ];
  var HOME_TYPE = { riverside: 'slum', tintown: 'shack', kiln: 'oneroom', brickfield: 'flat_small', newmarket: 'shophouse', eastgate: 'flat_owned', laxmi: 'garden' };
  var IDS = {};
  CATALOG.forEach(function (r) { IDS[r[0]] = 1; });
  var PLACE_WORD = { cafe: 'the cafe', shop: 'the shop', office: 'the office', college: 'campus', gym: 'the gym', apartments: 'home', park: 'the park', street: 'out', bank: 'the bank', home: 'home' };
  var INDOOR = { shop: 1, apartments: 1, office: 1, gym: 1, bank: 1, home: 1 };
  var FILLS = ['I heard you.', 'Go on.', 'That landed.', 'Fair.', 'I am still here.', 'Say the rest.', 'Hmm.', 'Right.', 'I caught that.', 'Keep going.', 'Noted.', 'You have my ear.', 'Alright.', 'I see it.', 'True enough.', 'Sit with that.', 'I will remember.', 'That is you.', 'Okay.', 'I am listening.'];
  var PERSONA = {
    cafe: 'The kettle is on. Sit, tell me how the day is treating you.',
    teacher: 'Books first, then the rest of the day.',
    trainer: 'Show up. That is the whole trick.'
  };
  var RUDE = /\b(stupid|idiot|shut up|ugly|hate you|dumb|loser|fuck|shit|bitch|moron|useless|go away|piss off|screw you|asshole|bastard|jerk)\b/i;
  var KIND = /\b(thank|thanks|please|nice|love|great|kind|sorry|appreciate|wonderful|lovely|beautiful|amazing|cool|glad|friend|how are you|how's your|good to see)\b/i;
  var GIFT = /\bgift of\b|\btake this gift\b/i;
  var ASK_OUT = /\b(?:be my (?:girl\s?friend|boy\s?friend|gf|bf|partner)|go out with me|be together|will you be mine)\b/i;
  var CINEMA = /\bcinema\b|\bmovie theatre\b|\bmovies\b/i;
  var BAD_SAY = /\b(?:fuck(?:ing|er)?|shit|bitch|asshole|bastard|cunt|dick|cock|pussy|nigger|nigga|faggot|retard|rape|molest|slut|whore)\b/gi;
  var GRACE = 3 * 24 * 3600;
  var KEY = 'sansar.offline.v1';
  var SESS = {};
  var sock = null;
  var me = null;
  var byId = {};
  var order = [];
  var db;

  function siteBase() {
    var p = location.pathname;
    var mark = '/world/create/';
    var i = p.indexOf(mark);
    if (i >= 0) return p.slice(0, i + 1);
    if (/\/index\.html$/i.test(p)) p = p.slice(0, p.lastIndexOf('/') + 1);
    else if (p.slice(-1) !== '/') p = p.replace(/\/[^/]*$/, '/');
    return p || '/';
  }
  function asset(path) { return siteBase() + String(path || '').replace(/^\//, ''); }
  function mapNav(url) {
    var raw = String(url || '');
    if (!raw || /^[a-z]+:/i.test(raw) && raw.indexOf(location.origin) !== 0 && raw.charAt(0) !== '/') return raw;
    var u;
    try { u = new URL(raw, location.href); } catch (e) { return raw; }
    if (u.origin !== location.origin) return raw;
    var path = u.pathname;
    var base = siteBase();
    if (path === '/world/create' || path === '/world/create/') return base + 'world/create/' + u.search + u.hash;
    if (path === '/world' || path === '/world/' || path === '/') return base + u.search + u.hash;
    if (base !== '/' && path.charAt(0) === '/' && path.indexOf(base) !== 0) return base.replace(/\/$/, '') + path + u.search + u.hash;
    return raw;
  }
  function rewriteAsset(urlStr) {
    var u;
    try { u = new URL(urlStr, location.href); } catch (e) { return urlStr; }
    if (u.origin !== location.origin) return urlStr;
    if (u.pathname.indexOf('/api/') === 0 || u.pathname === '/api') return urlStr;
    var base = siteBase();
    if (base === '/' || u.pathname.indexOf(base) === 0) return u.href;
    if (u.pathname.charAt(0) === '/') {
      u.pathname = base.replace(/\/$/, '') + u.pathname;
      return u.href;
    }
    return u.href;
  }

  function loadDb() {
    try { db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { db = null; }
    if (!db || typeof db !== 'object') db = {};
    db.avatars = db.avatars || {};
    db.residents = db.residents || {};
    db.baks = db.baks || {};
    db.mem = db.mem || {};
    db.hist = db.hist || {};
    db.deeds = db.deeds || {};
    db.bids = db.bids || {};
    db.letters = db.letters || [];
    db.clock = db.clock || {};
    if (!Array.isArray(db.units) || !db.units.length) {
      db.units = CATALOG.map(function (row) {
        return { id: row[0], hood: row[1], label: row[2], dist: row[3], market: row[4], price: row[5], x: row[6], z: row[7], owner: '', owner_name: '', ask: row[4], tenant: '', tenant_name: '', missed: 0, notice: 0 };
      });
    }
    persist();
  }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }
  function num(v) { var n = parseInt(v, 10); return n === n ? n : 0; }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function moneyUsd(amount, country) {
    var n = +amount; if (n !== n) n = 0;
    var rate = RATES[country] || RATES.Nepal || 1;
    if (rate <= 0) rate = 1;
    var usd = n / rate, sign = usd < 0 ? '-' : '', a = Math.abs(usd), body;
    if (a >= 1000000) { var m = a / 1000000; body = m >= 100 ? String(Math.round(m)) : m.toFixed(1); return sign + '$' + body + 'M'; }
    if (a >= 100) return sign + '$' + Math.round(a).toLocaleString('en-US');
    if (a < 0.005) return sign + '$0';
    return sign + '$' + a.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function cleanLook(l) {
    if (!l || typeof l !== 'object') return null;
    var o = { g: l.g === 'f' ? 'f' : 'm' }, k;
    for (k in AVK) {
      var mx = AVK[k];
      var v = parseInt(l[k], 10);
      o[k] = clamp(v === v ? v : 0, 0, mx);
    }
    for (k in EXTRA) {
      if (l[k] == null) continue;
      v = parseInt(l[k], 10);
      if (v === v) o[k] = clamp(v, 0, EXTRA[k]);
    }
    v = parseInt(l.h, 10);
    o.h = clamp(v === v ? v : 170, 100, 200);
    return o;
  }
  function parseState(raw) {
    if (raw && typeof raw === 'object') return raw;
    try { var st = JSON.parse(raw); return st && typeof st === 'object' ? st : null; } catch (e) { return null; }
  }
  function saveResident(pid, name, state, ts) {
    if (!pid || !state || typeof state !== 'object') return;
    ts = num(ts);
    var row = db.residents[pid];
    if (row && num(row.ts) > ts) return;
    if (row && row.state) {
      db.baks[pid] = db.baks[pid] || [];
      db.baks[pid].unshift({ state: row.state, ts: row.ts });
      db.baks[pid] = db.baks[pid].slice(0, 3);
    }
    state.saveVer = num(state.saveVer) + 1;
    db.residents[pid] = { name: String(name || state.name || 'Resident').slice(0, 14), state: state, ts: ts || Date.now() };
    syncDeeds(pid, db.residents[pid].name, state);
    persist();
  }
  function recover(pid) {
    var row = db.residents[pid];
    var st = row && parseState(row.state);
    if (st) return st;
    var baks = db.baks[pid] || [];
    for (var i = 0; i < baks.length; i++) {
      st = parseState(baks[i].state);
      if (st) return st;
    }
    return null;
  }
  function syncDeeds(pid, name, state) {
    var land = state.land || {};
    var own = (land.own || []).filter(function (x) { return typeof x === 'string' && x.length <= 24; });
    var built = {}, letout = {}, kept = {}, i;
    (land.built || []).forEach(function (x) { if (typeof x === 'string') built[x] = 1; });
    (land.let || []).forEach(function (x) { if (typeof x === 'string') letout[x] = 1; });
    var now = Date.now() / 1000;
    for (i = 0; i < own.length; i++) {
      var lot = own[i], row = db.deeds[lot];
      if (!row) db.deeds[lot] = { owner: pid, name: String(name || '?').slice(0, 14), built: built[lot] ? 1 : 0, let: letout[lot] ? 1 : 0, seen: now };
      else if (row.owner === pid) { row.name = String(name || '?').slice(0, 14); row.built = built[lot] ? 1 : 0; row.let = letout[lot] ? 1 : 0; row.seen = now; }
      if (db.deeds[lot] && db.deeds[lot].owner === pid) kept[lot] = 1;
    }
    Object.keys(db.deeds).forEach(function (lot2) {
      if (db.deeds[lot2].owner === pid && !kept[lot2]) { delete db.deeds[lot2]; delete db.bids[lot2]; }
    });
  }
  function deedMap() {
    var online = {};
    if (me) online[me.id] = 1;
    var now = Date.now() / 1000, out = {};
    Object.keys(db.deeds).forEach(function (lot) {
      var d = db.deeds[lot];
      var away = !online[d.owner];
      out[lot] = { owner: d.owner, name: d.name, built: d.built ? 1 : 0, let: d.let ? 1 : 0, away: away, left: away ? Math.max(0, Math.floor(GRACE - (now - (d.seen || now)))) : 0 };
    });
    return out;
  }
  function push(obj) {
    if (!sock || sock.readyState !== 1) return;
    var ev = { data: JSON.stringify(obj) };
    if (sock.onmessage) sock.onmessage(ev);
  }
  function settleDue() {
    var now = Date.now() / 1000;
    Object.keys(db.deeds).forEach(function (lot) {
      var d = db.deeds[lot];
      if (me && d.owner === me.id) return;
      if (now - (d.seen || now) < GRACE) return;
      var bids = db.bids[lot] || [];
      bids.sort(function (a, b) { return b.amt - a.amt; });
      for (var i = 0; i < bids.length; i++) {
        if (bids[i].bidder === d.owner) continue;
        if (transfer(lot, d.owner, bids[i].bidder, bids[i].amt, d.built)) break;
      }
    });
    persist();
  }
  function transfer(lot, owner, bidder, amt, built) {
    var orow = db.residents[owner], brow = db.residents[bidder];
    if (!orow || !brow) return null;
    var ost = parseState(orow.state), bst = parseState(brow.state);
    if (!ost || !bst) return null;
    var cash = num(bst.cash), bank = num(bst.bank);
    if (Math.max(0, cash) + Math.max(0, bank) < amt) return null;
    var fromCash = Math.min(Math.max(0, cash), amt);
    bst.cash = cash - fromCash;
    bst.bank = bank - (amt - fromCash);
    ost.cash = num(ost.cash) + amt;
    function drop(st) {
      st.land = st.land || {};
      ['own', 'built', 'let'].forEach(function (k) { st.land[k] = (st.land[k] || []).filter(function (x) { return x !== lot; }); });
      st.land.sold = st.land.sold || [];
      if (st.land.sold.indexOf(lot) < 0) st.land.sold.push(lot);
    }
    function take(st) {
      st.land = st.land || { own: [], built: [], let: [], sold: [], ready: true };
      if (st.land.own.indexOf(lot) < 0) st.land.own.push(lot);
      st.land.sold = (st.land.sold || []).filter(function (x) { return x !== lot; });
      if (built && st.land.built.indexOf(lot) < 0) st.land.built.push(lot);
    }
    drop(ost); take(bst);
    var bnm = String(brow.name || 'Someone').slice(0, 14);
    var sold = bnm + ' bought your land for ' + moneyUsd(amt, ost.country || 'Nepal') + '. The money is in your pocket.';
    var bought = 'Your offer took the land. ' + moneyUsd(amt, bst.country || 'Nepal') + ' left your pocket.';
    noteLife(ost, sold); noteLife(bst, bought);
    db.deeds[lot].owner = bidder; db.deeds[lot].name = bnm; db.deeds[lot].seen = Date.now() / 1000;
    delete db.bids[lot];
    saveResident(owner, orow.name, ost, Date.now());
    saveResident(bidder, brow.name, bst, Date.now());
    if (me && me.id === owner) push({ t: 'state', state: ost });
    if (me && me.id === bidder) push({ t: 'state', state: bst });
    push({ t: 'deeds', lots: deedMap() });
    return true;
  }
  function noteLife(st, text) {
    st.feed = Array.isArray(st.feed) ? st.feed : [];
    st.feed.unshift({ age: st.age || 0, text: text });
    st.feed = st.feed.slice(0, 220);
    st.notice = text;
  }

  function freshUnit(id) { for (var i = 0; i < db.units.length; i++) if (db.units[i].id === id) return db.units[i]; return null; }
  function usdOf(st, amt) { return moneyUsd(amt, (st && st.country) || 'Nepal'); }
  function takeMoney(st, amt, bankFirst) {
    var bank = Math.max(0, num(st.bank)), cash = Math.max(0, num(st.cash));
    amt = num(amt);
    if (amt < 1 || bank + cash < amt) return false;
    if (bankFirst) { var b = Math.min(bank, amt); st.bank = bank - b; st.cash = cash - (amt - b); }
    else { var c = Math.min(cash, amt); st.cash = cash - c; st.bank = bank - (amt - c); }
    return true;
  }
  function homeOf(st) {
    if (!st.hh || typeof st.hh !== 'object') st.hh = {};
    if (!st.hh.home || typeof st.hh.home !== 'object') st.hh.home = {};
    return st.hh.home;
  }
  function shelter(st) {
    var h = homeOf(st);
    var keys = Object.keys(h);
    for (var i = 0; i < keys.length; i++) delete h[keys[i]];
    Object.assign(h, { type: 'shelter', desc: 'A bed in the City Night Shelter', own: false, rent: 0, late: 0, payer: 'family', hood: 'riverside', dist: 840, free: 0, serverRent: 0, unit: '', familyStay: 0, youOwn: 0 });
    st.mustLeave = 1;
  }
  function occupy(st, u, mode) {
    var h = homeOf(st), own = mode === 'own', keys = Object.keys(h), i;
    for (i = 0; i < keys.length; i++) delete h[keys[i]];
    Object.assign(h, { type: HOME_TYPE[u.hood] || 'flat_small', desc: u.label, own: own, rent: own ? 0 : num(u.ask), late: 0, payer: 'you', hood: u.hood, dist: num(u.dist), free: 0, serverRent: own ? 0 : 1, unit: u.id, familyStay: 0, youOwn: own ? 1 : 0 });
    st.mustLeave = 0;
  }
  function clearTenant(u) { u.tenant = ''; u.tenant_name = ''; u.missed = 0; u.notice = 0; }
  function rentBoard(pid) {
    var rows = db.units, out = [];
    rows.forEach(function (u) {
      var near = rows.filter(function (o) { return o.id !== u.id; }).sort(function (a, b) { return Math.abs(num(a.dist) - num(u.dist)) - Math.abs(num(b.dist) - num(u.dist)); }).slice(0, 3);
      out.push({
        id: u.id, hood: u.hood, label: u.label, dist: num(u.dist), market: num(u.market), ask: num(u.ask), price: num(u.price), x: u.x, z: u.z,
        missed: num(u.missed), notice: num(u.notice),
        owner: u.owner === pid ? 'you' : (u.owner ? 'player' : 'market'), ownerName: u.owner_name || '',
        tenant: u.tenant === pid ? 'you' : (u.tenant === 'ai' ? 'ai' : (u.tenant ? 'player' : '')), tenantName: u.tenant_name || '',
        nearby: near.map(function (n) { return { id: n.id, label: n.label, ask: num(n.ask), dist: num(n.dist), hood: n.hood }; })
      });
    });
    out.sort(function (a, b) { return b.dist - a.dist; });
    return out;
  }
  function rentReply(pid, st, notes, charged, paid, why, ok, msg) {
    var h = null;
    if (st && st.hh && st.hh.home) h = st.hh.home;
    return { ok: ok !== false, why: why, msg: msg || '', notes: notes || [], charged: charged || 0, paid: paid || 0, bank: st ? num(st.bank) : 0, cash: st ? num(st.cash) : 0, home: h, mustLeave: st && st.mustLeave ? 1 : 0, board: rentBoard(pid) };
  }
  function rentAct(pid, kind, uid, ask) {
    var st = recover(pid);
    var u = freshUnit(uid);
    if (kind === 'board') return { t: 'rentboard', board: rentBoard(pid) };
    if (kind === 'month') {
      var key = num(ask);
      if (db.clock[pid] == null) { db.clock[pid] = key; persist(); return rentReply(pid, st || {}, [], 0, 0, 'arm'); }
      var prev = num(db.clock[pid]);
      if (prev >= 100000 && key < 100000) { db.clock[pid] = key; persist(); return rentReply(pid, st || {}, [], 0, 0, 'migrate'); }
      if (key <= prev) return rentReply(pid, st || {}, [], 0, 0, 'same');
      if (key !== prev + 1) { db.clock[pid] = key; persist(); return rentReply(pid, st || {}, [], 0, 0, 'jump'); }
      if (!st) return rentReply(pid, {}, [], 0, 0, 'nosave', false, 'Your life is not on the server yet.');
      var notes = [], charged = 0, paid = 0, home = homeOf(st), hid = home.unit || '';
      if (home.serverRent && hid) {
        u = freshUnit(hid);
        if (u && u.tenant === pid) {
          var rent = num(u.ask);
          if (takeMoney(st, rent, true)) {
            charged += rent; u.missed = 0; home.late = 0; home.rent = rent;
            notes.push('Rent ' + usdOf(st, rent) + ' left your bank for ' + u.label + '.');
            if (num(u.notice)) { clearTenant(u); shelter(st); notes.push('Your notice is up. You have moved out. Find another place, or stay out.'); }
          } else {
            u.missed = num(u.missed) + 1; home.late = u.missed;
            if (u.missed >= 2) { clearTenant(u); shelter(st); notes.push('Two months with no rent. You are evicted from ' + u.label + '.'); }
            else notes.push('Rent warning: ' + usdOf(st, rent) + ' did not leave your bank. One more missed month and you are evicted.');
          }
        }
      }
      db.units.forEach(function (unit) {
        if (unit.tenant === pid && num(unit.notice) && unit.id !== (homeOf(st).unit || '')) { clearTenant(unit); notes.push('The notice on ' + unit.label + ' has ended.'); }
      });
      db.units.forEach(function (unit) {
        if (unit.owner !== pid) return;
        if (unit.tenant) {
          var got = num(unit.ask);
          st.bank = num(st.bank) + got; paid += got;
          notes.push('The game paid you ' + usdOf(st, got) + ' for ' + unit.label + '. It does not depend on the tenant paying.');
        } else if (Math.random() < Math.max(0.05, Math.min(0.9, 0.75 * Math.max(1, num(unit.market)) / Math.max(1, num(unit.ask))))) {
          unit.tenant = 'ai'; unit.tenant_name = 'A resident'; unit.missed = 0; unit.notice = 0;
          notes.push('A resident took ' + unit.label + ' at ' + usdOf(st, unit.ask) + ' a month. You are paid from your next month.');
        }
      });
      notes.forEach(function (t) { noteLife(st, t); });
      db.clock[pid] = key;
      var ts = Date.now(); st.ts = ts;
      saveResident(pid, st.name, st, ts);
      var out = rentReply(pid, st, notes, charged, paid, 'tick');
      out.ts = ts;
      return out;
    }
    if (!u || !IDS[uid]) return rentReply(pid, st || {}, [], 0, 0, 'bad', false, 'That unit is not on the books.');
    if (!st) return rentReply(pid, {}, [], 0, 0, 'nosave', false, 'Your life is not on the server yet.');
    if (kind === 'buy') {
      if (num(u.price) < 1) return rentReply(pid, st, [], 0, 0, 'sale', false, 'That one is not for sale.');
      if (u.owner) return rentReply(pid, st, [], 0, 0, 'owned', false, 'Someone already owns it.');
      if (u.tenant && u.tenant !== 'ai') return rentReply(pid, st, [], 0, 0, 'busy', false, 'A player is living there.');
      if (!takeMoney(st, num(u.price), false)) return rentReply(pid, st, [], 0, 0, 'short', false, 'The price is ' + usdOf(st, u.price) + '. Pocket and bank together are short.');
      u.owner = pid; u.owner_name = String(st.name || 'You').slice(0, 14); clearTenant(u); u.ask = num(u.market);
      var text = 'You bought ' + u.label + ' for ' + usdOf(st, u.price) + '. Set a rent and let it, or live in it.';
      noteLife(st, text); ts = Date.now(); st.ts = ts; saveResident(pid, st.name, st, ts);
      out = rentReply(pid, st, [text], 0, 0, 'buy'); out.ts = ts; return out;
    }
    if (kind === 'take' || kind === 'switch') {
      if (u.owner === pid) return rentReply(pid, st, [], 0, 0, 'own', false, 'You own it. Live there, or let it out.');
      if (u.tenant && u.tenant !== 'ai' && u.tenant !== '' && u.tenant !== pid) return rentReply(pid, st, [], 0, 0, 'busy', false, 'A player already rents that.');
      db.units.forEach(function (o) { if (o.tenant === pid && o.id !== uid) o.notice = 1; });
      u = freshUnit(uid);
      u.tenant = pid; u.tenant_name = String(st.name || 'You').slice(0, 14); u.missed = 0; u.notice = 0;
      occupy(st, u, 'rent');
      text = 'You rent ' + u.label + ' for ' + usdOf(st, u.ask) + ' a month. It leaves your bank on your own month, and only while you play.';
      noteLife(st, text); ts = Date.now(); st.ts = ts; saveResident(pid, st.name, st, ts);
      out = rentReply(pid, st, [text], 0, 0, 'take'); out.ts = ts; return out;
    }
    if (kind === 'live') {
      if (u.owner !== pid) return rentReply(pid, st, [], 0, 0, 'own', false, 'You do not own that.');
      if (u.tenant && u.tenant !== 'ai' && u.tenant !== '' && u.tenant !== pid) return rentReply(pid, st, [], 0, 0, 'busy', false, 'A player is renting it. They leave after notice.');
      db.units.forEach(function (o) { if (o.tenant === pid && o.id !== uid) o.notice = 1; });
      u = freshUnit(uid); clearTenant(u); occupy(st, u, 'own');
      text = u.label + ' is your home now. Marriage can use a home in your name.';
      noteLife(st, text); ts = Date.now(); st.ts = ts; saveResident(pid, st.name, st, ts);
      out = rentReply(pid, st, [text], 0, 0, 'live'); out.ts = ts; return out;
    }
    if (kind === 'ask') {
      if (u.owner !== pid) return rentReply(pid, st, [], 0, 0, 'own', false, 'Only the owner can change the rent.');
      var market = Math.max(1, num(u.market)), lo = Math.max(1, Math.floor(market * 0.4)), hi = Math.floor(market * 3);
      ask = clamp(num(ask), lo, hi); u.ask = ask;
      text = 'Rent for ' + u.label + ' is now ' + usdOf(st, ask) + ' a month.';
      noteLife(st, text); ts = Date.now(); st.ts = ts; saveResident(pid, st.name, st, ts);
      out = rentReply(pid, st, [text], 0, 0, 'ask'); out.ts = ts; out.ask = ask; return out;
    }
    if (kind === 'notice') {
      if (u.tenant !== pid) return rentReply(pid, st, [], 0, 0, 'tenant', false, 'You do not rent that.');
      u.notice = 1;
      text = 'Notice given on ' + u.label + '. One game month, then you move out.';
      noteLife(st, text); ts = Date.now(); st.ts = ts; saveResident(pid, st.name, st, ts);
      out = rentReply(pid, st, [text], 0, 0, 'notice'); out.ts = ts; return out;
    }
    return rentReply(pid, st, [], 0, 0, 'bad', false, 'The rental office could not do that.');
  }

  function shoe() {
    var s = [], r, k;
    for (var n = 0; n < 6; n++) for (r = 0; r < RANKS.length; r++) for (k = 0; k < 4; k++) s.push(RANKS[r] + 'SHDC'[k]);
    for (var i = s.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = s[i]; s[i] = s[j]; s[j] = tmp; }
    return s;
  }
  function takeCard(st) { if (!st.shoe.length) st.shoe = shoe(); return st.shoe.pop(); }
  function total(cards) {
    var t = 0, aces = 0, i;
    for (i = 0; i < cards.length; i++) {
      var r = cards[i][0];
      if (r === 'A') { aces++; t += 11; }
      else if ('TJQK'.indexOf(r) >= 0) t += 10;
      else t += parseInt(r, 10);
    }
    while (t > 21 && aces) { t -= 10; aces--; }
    return [t, aces > 0 && t <= 21];
  }
  function natural(cards, split) { return !split && cards.length === 2 && total(cards)[0] === 21; }
  function slotMult(a, b, c) {
    if (a === b && b === c) return SLOT_PAY[a];
    if ((a === 'C') + (b === 'C') + (c === 'C') === 2) return 3;
    return 0;
  }
  function ageOk(body) { return num(body.age) >= 21; }
  function betOf(body) { var b = num(body.bet); return b < MIN_BET || b > MAX_BET ? null : b; }
  function noteNet(net, country) {
    if (net > 0) return 'Won ' + moneyUsd(net, country) + '.';
    if (net < 0) return 'Lost ' + moneyUsd(-net, country) + '.';
    return 'Push.';
  }
  function lineNet(game, net, country) {
    if (Math.abs(net) < BIG) return '';
    return 'Casino: you ' + (net > 0 ? 'won' : 'lost') + ' ' + moneyUsd(Math.abs(net), country) + ' at ' + game + '.';
  }
  function viewBj(st, note, line) {
    var show = st.phase === 'done';
    var dealer = show ? st.dealer.slice() : (st.dealer.length ? [st.dealer[0], '??'] : []);
    var hands = st.hands.map(function (h) { return { cards: h.cards.slice(), bet: h.bet, done: h.done, total: total(h.cards)[0] }; });
    var active = st.active || 0;
    var h = st.hands.length && active < st.hands.length && st.phase === 'play' ? st.hands[active] : null;
    var can = { hit: false, stand: false, double: false, split: false };
    if (h && !h.done) {
      can.hit = !h.aces; can.stand = true;
      var two = h.cards.length === 2 && !h.aces;
      can.double = two && st.cash >= h.bet;
      can.split = two && !h.split && h.cards[0][0] === h.cards[1][0] && st.cash >= h.bet;
    }
    return { ok: true, game: 'bj', phase: st.phase, cash: st.cash, dealer: dealer, dealerTotal: show && st.dealer.length ? total(st.dealer)[0] : null, hands: hands, active: st.phase === 'play' ? active : -1, can: can, note: note || '', line: line || '', limits: [MIN_BET, MAX_BET] };
  }
  function settleBj(st) {
    var dNat = natural(st.dealer);
    if (!dNat && st.hands.some(function (h) { return total(h.cards)[0] <= 21 && !natural(h.cards, h.split); })) {
      while (total(st.dealer)[0] < 17) st.dealer.push(takeCard(st));
    }
    var dt = total(st.dealer)[0];
    st.hands.forEach(function (h) {
      var pt = total(h.cards)[0], b = h.bet, pNat = natural(h.cards, h.split);
      if (pNat && dNat) st.cash += b;
      else if (pNat) st.cash += Math.floor(b * 5 / 2);
      else if (dNat || pt > 21) return;
      else if (dt > 21 || pt > dt) st.cash += b * 2;
      else if (pt === dt) st.cash += b;
    });
    st.phase = 'done';
    var net = st.cash - st.start;
    return viewBj(st, noteNet(net, st.country), lineNet('blackjack', net, st.country));
  }
  function advanceBj(st) {
    var i = st.active;
    while (i < st.hands.length && st.hands[i].done) i++;
    if (i >= st.hands.length) return settleBj(st);
    st.active = i;
    return viewBj(st);
  }
  function blackjack(body) {
    if (!ageOk(body)) return { ok: false, err: 'The floor is 21 and over.' };
    var pid = String(body.pid || '').slice(0, 40);
    if (!pid) return { ok: false, err: 'No player.' };
    var action = String(body.action || ''), st = SESS[pid];
    if (action === 'sync') {
      if (!st || st.game !== 'bj') return { ok: true, game: 'bj', phase: 'idle', cash: Math.max(0, num(body.cash)), hands: [], dealer: [], can: {} };
      return viewBj(st);
    }
    if (action === 'deal') {
      if (st && st.phase === 'play') { var v = viewBj(st); v.ok = false; v.err = 'Finish this hand first.'; return v; }
      var bet = betOf(body);
      if (bet == null) return { ok: false, err: 'The table takes ' + moneyUsd(MIN_BET, body.country || 'Nepal') + ' to ' + moneyUsd(MAX_BET, body.country || 'Nepal') + '.' };
      var cash = Math.max(0, num(body.cash));
      if (bet > cash) return { ok: false, err: 'You do not have that much in your pocket.' };
      st = { game: 'bj', cash: cash - bet, start: cash, phase: 'play', active: 0, shoe: shoe(), country: String(body.country || 'Nepal').slice(0, 24), dealer: [], hands: [] };
      SESS[pid] = st;
      var p1 = takeCard(st), d1 = takeCard(st), p2 = takeCard(st), d2 = takeCard(st);
      st.dealer = [d1, d2];
      st.hands = [{ cards: [p1, p2], bet: bet, split: false, done: false, aces: false }];
      if (natural(st.dealer) || natural(st.hands[0].cards)) return settleBj(st);
      return viewBj(st);
    }
    if (!st || st.phase !== 'play') return { ok: false, err: 'No hand on the table.' };
    var h = st.hands[st.active];
    if (action === 'hit') {
      if (h.done || h.aces) return { ok: false, err: 'You cannot hit that hand.' };
      h.cards.push(takeCard(st));
      if (total(h.cards)[0] >= 21) h.done = true;
      return h.done ? advanceBj(st) : viewBj(st);
    }
    if (action === 'stand') { h.done = true; return advanceBj(st); }
    if (action === 'double') {
      if (h.done || h.aces || h.cards.length !== 2) return { ok: false, err: 'You can only double the first two cards.' };
      if (st.cash < h.bet) return { ok: false, err: 'You do not have enough to double.' };
      st.cash -= h.bet; h.bet += h.bet; h.cards.push(takeCard(st)); h.done = true; return advanceBj(st);
    }
    if (action === 'split') {
      if (h.done || h.split || h.cards.length !== 2 || h.cards[0][0] !== h.cards[1][0]) return { ok: false, err: 'Those cards do not split.' };
      if (st.cash < h.bet) return { ok: false, err: 'You do not have enough to split.' };
      st.cash -= h.bet;
      var aces = h.cards[0][0] === 'A';
      var h1 = { cards: [h.cards[0], takeCard(st)], bet: h.bet, split: true, done: aces, aces: aces };
      var h2 = { cards: [h.cards[1], takeCard(st)], bet: h.bet, split: true, done: aces, aces: aces };
      st.hands.splice(st.active, 1, h1, h2);
      return aces ? advanceBj(st) : viewBj(st);
    }
    return { ok: false, err: 'Unknown action.' };
  }
  function roulette(body) {
    if (!ageOk(body)) return { ok: false, err: 'The floor is 21 and over.' };
    var bet = betOf(body);
    if (bet == null) return { ok: false, err: 'The table takes ' + moneyUsd(MIN_BET, body.country || 'Nepal') + ' to ' + moneyUsd(MAX_BET, body.country || 'Nepal') + '.' };
    var cash = Math.max(0, num(body.cash));
    if (bet > cash) return { ok: false, err: 'You do not have that much in your pocket.' };
    var kind = String(body.kind || 'red'), n = Math.floor(Math.random() * 37), win = false, mult = 0;
    if (kind === 'red') { win = !!RED[n]; mult = 1; }
    else if (kind === 'black') { win = n !== 0 && !RED[n]; mult = 1; }
    else if (kind === 'even') { win = n !== 0 && n % 2 === 0; mult = 1; }
    else if (kind === 'odd') { win = n % 2 === 1; mult = 1; }
    else return { ok: false, err: 'That bet is not on the layout.' };
    cash = win ? cash + bet * mult : cash - bet;
    var net = win ? bet * mult : -bet;
    return { ok: true, game: 'roulette', phase: 'done', n: n, win: win, cash: cash, note: noteNet(net, body.country || 'Nepal'), line: lineNet('roulette', net, body.country || 'Nepal'), color: n === 0 ? 'green' : (RED[n] ? 'red' : 'black') };
  }
  function slots(body) {
    if (!ageOk(body)) return { ok: false, err: 'The floor is 21 and over.' };
    var bet = betOf(body);
    if (bet == null) return { ok: false, err: 'The machine takes ' + moneyUsd(MIN_BET, body.country || 'Nepal') + ' to ' + moneyUsd(MAX_BET, body.country || 'Nepal') + '.' };
    var cash = Math.max(0, num(body.cash));
    if (bet > cash) return { ok: false, err: 'You do not have that much in your pocket.' };
    var a = REEL[Math.floor(Math.random() * REEL.length)], b = REEL[Math.floor(Math.random() * REEL.length)], c = REEL[Math.floor(Math.random() * REEL.length)];
    var mult = slotMult(a, b, c);
    cash = cash - bet + bet * mult;
    var net = bet * (mult - 1);
    return { ok: true, game: 'slot', phase: 'done', reels: [a, b, c], mult: mult, cash: cash, note: noteNet(net, body.country || 'Nepal'), line: lineNet('the slots', net, body.country || 'Nepal'), rtp: 0.955 };
  }

  function labelOf(aff) { return aff >= 70 ? 'Close friend' : aff >= 40 ? 'Friend' : aff >= 15 ? 'Acquaintance' : aff <= -50 ? 'Hostile' : aff <= -15 ? 'Wary' : 'Stranger'; }
  function partnerTitle(c) {
    var g = String((c && c.gender) || '').toLowerCase();
    if (g.charAt(0) === 'f' || g.charAt(0) === 'w') return 'Girlfriend';
    if (g.charAt(0) === 'm') return 'Boyfriend';
    return 'Partner';
  }
  function shown(aff, c, bond) { return bond === 'partner' ? partnerTitle(c) : labelOf(aff); }
  function blankMem() { return { aff: 0, summary: '', facts: [], turns: 0, mood: 'calm', bond: '', stage: 'stranger', met_day: null }; }
  function memOf(pid, npc) {
    db.mem[pid] = db.mem[pid] || {};
    if (!db.mem[pid][npc]) db.mem[pid][npc] = blankMem();
    return db.mem[pid][npc];
  }
  function relStage(m) {
    if (m.bond === 'partner' || m.stage === 'dating') return 'dating';
    if (m.aff >= 70) return 'close';
    if (m.aff >= 40) return 'friend';
    return 'stranger';
  }
  function years(v) { var n = parseInt(v, 10); return n === n ? n : 0; }
  function approach(c, aff, beauty) {
    var pretty = beauty >= 65, b = labelOf(aff);
    if (b === 'Close friend') return pretty ? 'There you are. I was hoping you would be out.' : 'I saw you. Come here a minute.';
    if (b === 'Friend') return pretty ? 'You look good today. Got a minute?' : 'Got a minute? I felt like talking.';
    if (b === 'Acquaintance') return pretty ? 'I had to say hello. You caught my eye.' : 'Hey. I almost walked past, then I did not.';
    return 'Hello there.';
  }
  function openNpc(q) {
    var c = byId[q.get('npc')];
    if (!c) return { status: 404, body: { error: 'no such person' } };
    var pid = String(q.get('pid') || '').slice(0, 80);
    var m = memOf(pid, c.id);
    var b = labelOf(m.aff) === 'Close friend' ? 'close_friend' : labelOf(m.aff) === 'Friend' ? 'friend' : labelOf(m.aff) === 'Acquaintance' ? 'acquaintance' : labelOf(m.aff) === 'Hostile' || labelOf(m.aff) === 'Wary' ? 'wary' : 'stranger';
    var greets = c.greetings || {};
    var g = greets[b] || (b === 'wary' ? greets.stranger : null) || 'Hello there.';
    if (b === 'wary') g = '...You again.';
    if (m.bond === 'partner') g = 'There you are. I missed you.';
    else if (q.get('started') === '1') {
      var beauty = parseInt(q.get('beauty') || '40', 10);
      g = approach(c, m.aff, clamp(beauty === beauty ? beauty : 40, 0, 100));
    }
    return { status: 200, body: { greeting: g, aff: m.aff, label: shown(m.aff, c, m.bond), bond: m.bond || '', stage: relStage(m), mood: m.mood || 'calm', facts: m.facts || [], turns: m.turns || 0, memory: '', name: c.name, job: c.job, age: c.age } };
  }
  function chatLines(c, m, text, ctx) {
    var reply, d = 0;
    if (RUDE.test(text)) d -= 6;
    if (KIND.test(text)) d += 2;
    if (GIFT.test(text)) d += 4;
    if (text.indexOf('?') >= 0) d += 1;
    if (ASK_OUT.test(text)) {
      var age = years(c.age), py = years(ctx.age);
      if (age < 21) reply = 'I do not date.';
      else if (py && py < 21) reply = 'No.';
      else if (m.bond === 'partner') reply = 'I already said yes. I am yours.';
      else if (m.aff >= 40 && m.mood !== 'angry') { m.bond = 'partner'; m.stage = 'dating'; reply = 'Yes. I want to be your ' + partnerTitle(c).toLowerCase() + '.'; }
      else reply = 'Not yet. We are not close enough.';
      m.mood = m.bond === 'partner' ? 'flirt' : 'calm';
    } else if (CINEMA.test(text)) {
      reply = 'There is no cinema in town. The cafe, the park or the bank?';
    } else {
      var lines = (c.fallback_lines && c.fallback_lines.length) ? c.fallback_lines : FILLS;
      reply = lines[Math.floor(Math.random() * lines.length)];
      m.mood = d < 0 ? 'angry' : d > 2 ? 'friendly' : (m.mood || 'calm');
    }
    m.aff = clamp(num(m.aff) + d, -100, 100);
    m.turns = num(m.turns) + 1;
    m.stage = relStage(m);
    m.facts = Array.isArray(m.facts) ? m.facts : [];
    return { reply: reply, d: d, m: m };
  }
  function ndjson(objs) { return objs.map(function (o) { return JSON.stringify(o); }).join('\n') + '\n'; }
  function circle(q) {
    var pid = String(q.get('pid') || '').slice(0, 80);
    var bag = db.mem[pid] || {};
    var people = [];
    Object.keys(bag).forEach(function (id) {
      var m = bag[id], c = byId[id];
      if (!c || !(m.turns > 0 || m.aff >= 15)) return;
      people.push({ id: id, name: c.name, job: c.job || '', age: c.age || '', aff: m.aff, label: shown(m.aff, c, m.bond), bond: m.bond || '', mood: m.mood || 'calm', turns: m.turns || 0, memory: '', personality: (c.personality || []).slice(0, 3).join(', '), where: 'Out', hours: 'Out all day', until: 'Until 12am', out: true });
    });
    people.sort(function (a, b) { return b.aff - a.aff; });
    return { people: people };
  }
  function rollBirth(force) {
    if (force === 'mansion') force = 'wealthy';
    if (BIRTH_W[force]) return force;
    var tot = 0, k;
    for (k = 0; k < BIRTH_ORDER.length; k++) tot += BIRTH_W[BIRTH_ORDER[k]];
    var x = Math.random() * tot;
    for (k = 0; k < BIRTH_ORDER.length; k++) { x -= BIRTH_W[BIRTH_ORDER[k]]; if (x < 0) return BIRTH_ORDER[k]; }
    return 'middle';
  }
  function board() {
    var people = [], biz = [];
    Object.keys(db.residents).forEach(function (pid) {
      var row = db.residents[pid], st = parseState(row.state);
      if (!st || st.alive === false) return;
      var land = st.land || {}, own = (land.own || []).filter(function (x) { return typeof x === 'string'; });
      var built = {}; (land.built || []).forEach(function (x) { built[x] = 1; });
      var nw = num(st.cash) + num(st.bank);
      (st.fds || []).forEach(function (f) { if (f && typeof f === 'object') nw += num(f.amt); });
      if (st.folio && typeof st.folio === 'object') nw += num(st.folio.value);
      nw += 700000 * own.length;
      own.forEach(function (x) { if (built[x]) nw += 1260000; });
      var av = db.avatars[pid];
      var rowp = { name: String(st.name || row.name || 'Someone').slice(0, 24), nw: nw, props: own.length, let: ((land.let || []).filter(function (x) { return typeof x === 'string'; })).length, ai: false, id: pid };
      if (av && av.look) rowp.look = av.look;
      people.push(rowp);
    });
    order.forEach(function (id) {
      var c = byId[id];
      if (!c) return;
      people.push({ name: String(c.name).slice(0, 24), nw: 20000 + (id.length * 137) % 80000, props: 0, let: 0, ai: true, id: id });
    });
    people.sort(function (a, b) { return b.nw - a.nw; });
    return { people: people.slice(0, 40), biz: biz.slice(0, 12) };
  }

  function jsonRes(obj, status) {
    return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  }
  function textRes(text, status, type) {
    return new Response(text, { status: status || 200, headers: { 'content-type': type || 'text/plain', 'cache-control': 'no-store' } });
  }
  function readBody(opts) {
    opts = opts || {};
    if (opts.body == null) return Promise.resolve({});
    if (typeof opts.body === 'string') { try { return Promise.resolve(JSON.parse(opts.body) || {}); } catch (e) { return Promise.resolve({}); } }
    if (typeof opts.body.text === 'function') return opts.body.text().then(function (t) { try { return JSON.parse(t) || {}; } catch (e) { return {}; } });
    return Promise.resolve({});
  }
  function route(url, opts) {
    var u = new URL(url, location.href);
    var path = u.pathname.replace(/\/+$/, '') || '/';
    var method = ((opts && opts.method) || 'GET').toUpperCase();
    if (path === '/api/health') return jsonRes({ ok: true, online: me ? 1 : 0, saved: Object.keys(db.residents).length });
    if (path === '/api/err') return jsonRes({ ok: true });
    if (path === '/api/avatar' && method === 'GET') {
      var row = db.avatars[String(u.searchParams.get('id') || '').slice(0, 80)];
      return jsonRes(row ? { name: row.name, look: row.look } : {});
    }
    if (path === '/api/resident') {
      var st = recover(String(u.searchParams.get('id') || '').slice(0, 80));
      return jsonRes({ state: st });
    }
    if (path === '/api/board') return jsonRes(board());
    if (path === '/api/npc') {
      var id = u.searchParams.get('id');
      return jsonRes({ line: PERSONA[id] || null });
    }
    if (path === '/api/npc/cast') {
      var keys = ['id', 'name', 'age', 'gender', 'nationality', 'job', 'workplace', 'routine', 'personality'];
      return castReady.then(function () {
        return jsonRes({ model: 'fallback', cast: order.map(function (i) { var c = byId[i], o = {}; keys.forEach(function (k) { o[k] = c[k]; }); return o; }) });
      });
    }
    if (path === '/api/npc/open') return castReady.then(function () { var opened = openNpc(u.searchParams); return jsonRes(opened.body, opened.status); });
    if (path === '/api/npc/circle') return castReady.then(function () { return jsonRes(circle(u.searchParams)); });
    if (path === '/api/exam/paper' || path === '/api/job/paper') return jsonRes({ src: 'hand', qs: [] });
    return readBody(opts).then(function (body) {
      if (path === '/api/avatar' && method === 'POST') {
        var pid = String(body.id || '').slice(0, 80), look = cleanLook(body.look), name = String(body.name || 'Resident').trim().slice(0, 14) || 'Resident';
        if (!pid || !look) return jsonRes({ ok: false }, 400);
        db.avatars[pid] = { name: name, look: look, ts: Date.now() };
        persist();
        return jsonRes({ ok: true });
      }
      if (path === '/api/birth') {
        var circ = rollBirth(body.force);
        return jsonRes({ circ: circ, src: 'fallback', ms: 1 });
      }
      if (path === '/api/casino') {
        var game = String(body.game || 'bj');
        if (game === 'roulette') return jsonRes(roulette(body));
        if (game === 'slot') return jsonRes(slots(body));
        return jsonRes(blackjack(body));
      }
      if (path === '/api/npc/chat') return castReady.then(function () {
        var c = byId[body.npc], pid2 = String(body.pid || '').slice(0, 80), text = String(body.text || '').trim().slice(0, 300);
        if (!c || !pid2 || !text) return jsonRes({ error: 'missing' }, 400);
        var ctx = body.ctx && typeof body.ctx === 'object' ? body.ctx : {};
        var hit = chatLines(c, memOf(pid2, c.id), text, ctx);
        persist();
        var lab = shown(hit.m.aff, c, hit.m.bond);
        var lines = [{ t: 'mood', mood: hit.m.mood, aff: hit.m.aff, label: lab, bond: hit.m.bond || '', stage: hit.m.stage }];
        String(hit.reply).split(/(\s+)/).forEach(function (tok) { if (tok) lines.push({ t: 'tok', v: tok }); });
        lines.push({ t: 'done', ms: 1, fb: true, text: hit.reply });
        lines.push({ t: 'aff', d: hit.d, aff: hit.m.aff, label: lab, mood: hit.m.mood, facts: hit.m.facts, bond: hit.m.bond || '', stage: hit.m.stage });
        return textRes(ndjson(lines), 200, 'application/x-ndjson');
      });
      if (path === '/api/npc/outing') return castReady.then(function () {
        var c = byId[body.npc], pid2 = String(body.pid || '').slice(0, 80);
        if (!c || !pid2) return jsonRes({ ok: false }, 404);
        var mm = memOf(pid2, c.id);
        mm.aff = clamp(num(mm.aff) + 18, -100, 100);
        mm.mood = mm.aff >= 40 ? 'flirt' : 'friendly';
        mm.facts = mm.facts || [];
        if (mm.facts.indexOf('went out together') < 0) mm.facts.push('went out together');
        mm.facts = mm.facts.slice(-12);
        mm.stage = relStage(mm);
        persist();
        return jsonRes({ ok: true, aff: mm.aff, mood: mm.mood, stage: mm.stage, label: shown(mm.aff, c, mm.bond) });
      });
      if (path === '/api/npc/promise') return castReady.then(function () {
        var c = byId[body.npc], pid2 = String(body.pid || '').slice(0, 80);
        if (!c || !pid2) return jsonRes({ ok: false });
        mm = memOf(pid2, c.id);
        var delta = clamp(num(body.d), -30, 15);
        if (body.aff != null && body.aff === body.aff) mm.aff = clamp(num(body.aff), -100, 100);
        else mm.aff = clamp(num(mm.aff) + delta, -100, 100);
        var fact = String(body.fact || '').slice(0, 80);
        mm.facts = (mm.facts || []).filter(function (x) { return typeof x === 'string'; });
        if (fact && mm.facts.indexOf(fact) < 0) mm.facts.push(fact);
        mm.facts = mm.facts.slice(-12);
        if (body.end === 'break' || body.end === 'divorce') { mm.bond = ''; mm.mood = body.end === 'break' ? 'angry' : 'sad'; }
        else if (body.bond === 'partner' || body.bond === 'dating' || body.bond === 'married') mm.bond = 'partner';
        mm.stage = relStage(mm);
        persist();
        return jsonRes({ ok: true, aff: mm.aff, mood: mm.mood, stage: mm.stage, bond: mm.bond || '', facts: mm.facts, label: shown(mm.aff, c, mm.bond) });
      });
      if (path === '/api/job/grade') {
        var turns = Array.isArray(body.turns) ? body.turns : [], good = 0;
        turns.forEach(function (t) {
          var a = String((t && t.a) || '').trim();
          if (a.split(/\s+/).length >= 4 && !/^(yes|no|ok|idk|nope|sure|hi|hello)[.!]?$/i.test(a)) good++;
        });
        var ok = good >= 2;
        return jsonRes({ ok: ok, line: ok ? 'You know the work. The job is yours.' : 'That did not sound like the work. Not this time.' });
      }
      if (path === '/api/job/ask') return jsonRes({ q: 'Tell me how you would do the work of a ' + String(body.name || 'worker').slice(0, 60) + '.' });
      return jsonRes({ ok: false, err: 'No such call.' }, 404);
    });
  }

  window.fetch = function (input, opts) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var abs;
    try { abs = new URL(url, location.href); } catch (e) { return origFetch(input, opts); }
    if (abs.origin === location.origin && (abs.pathname.indexOf('/api/') === 0 || abs.pathname === '/api')) {
      var method = (opts && opts.method) || (input && input.method) || 'GET';
      var next = Object.assign({}, opts || {}, { method: method });
      if ((!next.body) && input && input.clone) {
        return input.clone().text().then(function (t) { next.body = t; return route(abs.href, next); });
      }
      return Promise.resolve(route(abs.href, next));
    }
    var rewritten = rewriteAsset(abs.href);
    if (typeof input === 'string') return origFetch(rewritten, opts);
    return origFetch(rewritten, opts);
  };
  if (navigator.sendBeacon) {
    var origBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function (url) {
      try {
        var abs = new URL(url, location.href);
        if (abs.pathname.indexOf('/api/') === 0) return true;
      } catch (e) {}
      return origBeacon.apply(navigator, arguments);
    };
  }
  var xo = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    var args = Array.prototype.slice.call(arguments);
    if (typeof url === 'string') {
      try {
        var abs = new URL(url, location.href);
        if (abs.pathname.indexOf('/api/') !== 0) args[1] = rewriteAsset(abs.href);
      } catch (e) {}
    }
    return xo.apply(this, args);
  };
  // Three.js loads textures with Image, which never touches fetch or XHR.
  try {
    var imgSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    if (imgSrc && imgSrc.set) {
      Object.defineProperty(HTMLImageElement.prototype, 'src', {
        configurable: true,
        get: function () { return imgSrc.get.call(this); },
        set: function (v) { imgSrc.set.call(this, v ? rewriteAsset(String(v)) : v); }
      });
    }
  } catch (e) {}
  var setAttr = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    if (String(name).toLowerCase() === 'src' && (this instanceof HTMLImageElement || this instanceof HTMLSourceElement)) {
      value = value ? rewriteAsset(String(value)) : value;
    }
    return setAttr.call(this, name, value);
  };
  var NativeWorker = window.Worker;
  window.Worker = function (url, opts) {
    return new NativeWorker(rewriteAsset(String(url)), opts);
  };
  try { window.Worker.prototype = NativeWorker.prototype; } catch (e) {}

  function FakeSocket() {
    this.readyState = 0;
    this.bufferedAmount = 0;
    this.url = '';
    var self = this;
    setTimeout(function () {
      if (self.readyState === 3) return;
      self.readyState = 1;
      sock = self;
      if (self.onopen) self.onopen({ type: 'open' });
    }, 0);
  }
  FakeSocket.CONNECTING = 0; FakeSocket.OPEN = 1; FakeSocket.CLOSING = 2; FakeSocket.CLOSED = 3;
  FakeSocket.prototype.addEventListener = function () {};
  FakeSocket.prototype.close = function () { this.readyState = 3; if (sock === this) sock = null; if (this.onclose) this.onclose({ type: 'close' }); };
  FakeSocket.prototype.send = function (data) {
    var m; try { m = JSON.parse(data); } catch (e) { return; }
    var t = m.t;
    if (t === 'hello' && typeof m.id === 'string' && m.id.length < 80) {
      me = { id: m.id, name: String(m.name || '?').slice(0, 14), x: 0, z: 17, r: 0, a: 'idle', w: '2' };
      var row = db.residents[m.id];
      var clientTs = num(m.ts);
      if (row && num(row.ts) > clientTs) push({ t: 'state', state: parseState(row.state) });
      else if (m.state && typeof m.state === 'object') saveResident(m.id, me.name, m.state, clientTs || Date.now());
      if (db.deeds) Object.keys(db.deeds).forEach(function (lot) { if (db.deeds[lot].owner === m.id) db.deeds[lot].seen = Date.now() / 1000; });
      push({ t: 'deeds', lots: deedMap() });
      var held = recover(m.id);
      var key = held && held.fin && held.fin.key != null ? num(held.fin.key) : 0;
      if (db.clock[m.id] == null) db.clock[m.id] = key;
      push({ t: 'rentboard', board: rentBoard(m.id) });
      persist();
      return;
    }
    if (!me) return;
    if (t === 'pos') { me.x = +m.x || 0; me.z = +m.z || 0; me.r = +m.r || 0; me.a = String(m.a || 'idle').slice(0, 6); }
    else if (t === 'save' && m.state && typeof m.state === 'object') saveResident(me.id, me.name, m.state, m.ts || Date.now());
    else if (t === 'rentmonth') { var out = rentAct(me.id, 'month', '', m.key); out.t = out.ok === false ? 'rentno' : 'rentstate'; push(out); }
    else if (t === 'rentboard') push({ t: 'rentboard', board: rentBoard(me.id) });
    else if (t === 'renttake' || t === 'rentbuy' || t === 'rentlive' || t === 'rentask' || t === 'rentnotice' || t === 'rentswitch') {
      var kind = { renttake: 'take', rentbuy: 'buy', rentlive: 'live', rentask: 'ask', rentnotice: 'notice', rentswitch: 'switch' }[t];
      out = rentAct(me.id, kind, String(m.unit || '').slice(0, 24), m.ask);
      out.t = out.ok ? 'rentstate' : 'rentno';
      push(out);
    } else if (t === 'claim') {
      var lot = String(m.lot || '').slice(0, 24);
      if (lot.indexOf('L') !== 0) push({ t: 'claimfail', msg: 'That lot is not on the map.' });
      else if (db.deeds[lot] && db.deeds[lot].owner !== me.id) push({ t: 'claimfail', name: db.deeds[lot].name || 'Someone' });
      else {
        if (!db.deeds[lot]) db.deeds[lot] = { owner: me.id, name: me.name, built: 0, let: 0, seen: Date.now() / 1000 };
        persist();
        push({ t: 'claimok', lot: lot });
        push({ t: 'deeds', lots: deedMap() });
      }
    } else if (t === 'release') {
      lot = String(m.lot || '').slice(0, 24);
      if (db.deeds[lot] && db.deeds[lot].owner === me.id) { delete db.deeds[lot]; delete db.bids[lot]; persist(); }
      push({ t: 'deeds', lots: deedMap() });
    } else if (t === 'offer') push({ t: 'offerfail', msg: 'Nobody else is here to take an offer.' });
    else if (t === 'accept') push({ t: 'offerfail', msg: 'That offer is no longer there.' });
    else if (t === 'gift') push({ t: 'giftfail' });
    else if (t === 'say') {
      var clean = String(m.text || '').replace(BAD_SAY, '***').trim().slice(0, 180);
      push(clean ? { t: 'sayok', text: clean } : { t: 'sayno', why: 'bad' });
    } else if (t === 'dm') push({ t: 'dmfail', why: 'away' });
    else if (t === 'deal' || t === 'dealyes' || t === 'repay') push({ t: 'dealno', why: 'away' });
    else if (t === 'bond') push({ t: 'bondno', why: 'bad' });
    else if (t === 'block' || t === 'mute') push({ t: 'blockok', id: m.id, on: m.on ? 1 : 0, mute: t === 'mute' ? 1 : 0 });
    else if (t === 'report') push({ t: 'reportok' });
  };
  var NativeWS = window.WebSocket;
  window.WebSocket = function (url) {
    if (String(url).indexOf('/ws') >= 0) return new FakeSocket();
    return new NativeWS(url);
  };
  try { window.WebSocket.prototype = NativeWS.prototype; } catch (e) {}
  window.WebSocket.CONNECTING = 0; window.WebSocket.OPEN = 1; window.WebSocket.CLOSING = 2; window.WebSocket.CLOSED = 3;

  try {
    var rep = Location.prototype.replace, asn = Location.prototype.assign;
    Location.prototype.replace = function (url) { return rep.call(this, mapNav(url)); };
    Location.prototype.assign = function (url) { return asn.call(this, mapNav(url)); };
  } catch (e) {}
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.charAt(0) !== '/') return;
    e.preventDefault();
    location.href = mapNav(href);
  }, true);

  setInterval(settleDue, 30000);
  setInterval(function () {
    if (!sock || sock.readyState !== 1 || !me) return;
    var snap = { t: 'snap', p: {} };
    snap.p[me.id] = { n: me.name, x: me.x, z: me.z, r: me.r, a: me.a, age: 18 };
    push(snap);
  }, 1000);

  loadDb();
  function takeCast(d) {
    var lst = Array.isArray(d) ? d : ((d && (d.characters || d.npcs || d.cast)) || []);
    lst.forEach(function (c) {
      if (c && c.id && c.name && !byId[c.id]) { byId[c.id] = c; order.push(c.id); }
    });
  }
  var castReady = Promise.all([
    origFetch(asset('data/npcs_draft.json')).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    origFetch(asset('data/npcs_campus.json')).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; })
  ]).then(function (pair) { takeCast(pair[0]); takeCast(pair[1]); });
})();
