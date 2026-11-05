// Real players: nearby bubbles, direct messages, bonds, trade, loans, a shared shop.
const funds = S => Math.max(0, S.cash || 0) + Math.max(0, S.bank || 0);
function spend(S, amt) {   // pocket first, then the bank
  const c = Math.min(Math.max(0, S.cash || 0), amt); S.cash -= c; S.bank = (S.bank || 0) - (amt - c);
}
export function createSocial(api) {
  const blocks = new Set(), mutes = new Set(), stages = new Map(), names = new Map(), bubbles = new Map(), applied = new Set(), came = [];
  let pendingDeal = null;

  function host() {
    return api.$('#bubbles');
  }
  function pushInbox(from, text, fromId, id) {
    const S = api.getS(); if (!S) return null;
    if (!S.dates || typeof S.dates !== 'object') S.dates = { list: [], bonds: {}, inbox: [] };
    if (!Array.isArray(S.dates.inbox)) S.dates.inbox = [];
    const have = S.dates.inbox.find((m) => m && (id != null && m.id === id || (m.text === text && (m.player || '') === (fromId || ''))));
    if (have) { api.showPhone(have); return have; }
    const msg = { id: id != null ? id : ('p' + Date.now() + '-' + S.dates.inbox.length), from: from || 'Someone', text: text || '', player: fromId || '' };
    S.dates.inbox.unshift(msg);
    if (S.dates.inbox.length > 30) S.dates.inbox.length = 30;
    api.showPhone(msg);
    api.save();
    return msg;
  }
  function addBubble(id, name, text) {
    const elHost = host(); if (!elHost || !text) return;
    let b = bubbles.get(id);
    if (!b) {
      const el = document.createElement('div'); el.className = 'pbub'; el.dataset.from = id;
      const nm = document.createElement('b'), tx = document.createElement('span');
      el.append(nm, tx); elHost.append(el); b = { el, nm, tx }; bubbles.set(id, b);
    }
    b.nm.textContent = name || ''; b.tx.textContent = text; b.until = performance.now() + 7000; b.el.hidden = false;
  }
  function place() {
    const cam = api.camera(); if (!cam) return;
    const canvas = api.canvas; if (!canvas) return;
    const r = canvas.getBoundingClientRect(); if (!r.width) return;
    const now = performance.now();
    for (const [id, b] of bubbles) {
      if (now > b.until) { b.el.remove(); bubbles.delete(id); continue; }
      const pos = api.posOf(id);
      if (!pos) { b.el.hidden = true; continue; }
      const v = api.project(pos.x, pos.y, pos.z);
      const vx = v.x, vy = v.y, vz = v.z;
      if (vz > 1) { b.el.hidden = true; continue; }
      b.el.hidden = false;
      b.el.style.left = ((vx * 0.5 + 0.5) * r.width + r.left) + 'px';
      b.el.style.top = ((-vy * 0.5 + 0.5) * r.height + r.top) + 'px';
    }
  }
  function say(text) {
    const t = String(text || '').trim(); if (!t) return;
    api.send({ t: 'say', text: t.slice(0, 180) });
  }
  function dm(id, text) {
    const t = String(text || '').trim(); if (!id || !t) return;
    api.send({ t: 'dm', to: id, text: t.slice(0, 180) });
  }
  function owns() {
    const S = api.getS(), h = S && S.hh && S.hh.home;
    if (!h || h.familyStay) return false;
    if (h.youOwn) return true;
    return !!(h.own && h.payer === 'you');
  }
  function ask(id, kind) {
    if (!id) return;
    if (kind === 'marry' && !owns()) { api.toast('Marriage needs a home you own. A rental does not count.'); return; }
    api.send({ t: 'bond', to: id, ask: kind }); api.toast('Asked.');
  }
  function yes(id, kind) {
    if (!id) return;
    if (kind === 'marry' && !owns()) { api.toast('Marriage needs a home you own. A rental does not count.'); return; }
    api.send({ t: 'bond', to: id, yes: kind });
  }
  function block(id, on) { if (!id) return; api.send({ t: 'block', id: id, on: on ? 1 : 0 }); }
  function mute(id, on) { if (!id) return; api.send({ t: 'mute', id: id, on: on ? 1 : 0 }); }
  function report(id) {
    if (!id) return;
    const note = (api.$('#pNote') && api.$('#pNote').value) || 'report';
    api.send({ t: 'report', id: id, note: String(note).slice(0, 240) });
  }
  function deal(kind, id) {
    const usd = Math.round(+((api.$('#pAmt') && api.$('#pAmt').value) || 0));
    const note = String((api.$('#pNote') && api.$('#pNote').value) || '').slice(0, 40);
    if ((kind === 'trade' || kind === 'lend') && usd < 1) { api.toast('Name an amount.'); return; }
    if (kind === 'biz' && !note) { api.toast('Name the shop.'); return; }
    const S = api.getS();
    const amt = S && api.fromUsd ? api.fromUsd(S, usd) : usd;
    if (S && (kind === 'trade' || kind === 'lend') && funds(S) < amt) { api.toast('That is more than you have.'); return; }
    api.send({ t: 'deal', kind: kind, to: id, amt: amt, note: note });
    api.toast('Offer sent.');
  }
  function yesDeal(id) { if (id == null) return; api.send({ t: 'dealyes', id: id }); pendingDeal = null; }
  function repay(id) { api.send({ t: 'repay', id: +id || id }); }
  function failText(why) {
    if (why === 'rate') return 'Slow down a moment.';
    if (why === 'age') return 'You cannot message a player who has not confirmed they are 18.';
    if (why === 'mature') return 'Dating and marriage need both characters at 21, Mature on, and both confirmed 18+.';
    if (why === 'stage') return 'Befriend each other first.';
    if (why === 'taken') return 'One of you is already with someone.';
    if (why === 'home') return 'Marriage needs a home you own. A rental does not count.';
    if (why === 'cash') return 'That money is not there.';
    if (why === 'away') return 'They are not here to accept that.';
    return 'That did not go through.';
  }
  function dealLine(m) {
    const who = m.name || 'Someone';
    if (m.kind === 'lend') return who + ' wants to lend you ' + api.money(m.amt) + '.';
    if (m.kind === 'biz') return who + ' wants to open ' + (m.note || 'a shop') + ' with you.';
    if (m.kind === 'repay') return who + ' is paying back ' + api.money(m.amt) + '.';
    return who + ' offers ' + api.money(m.amt) + (m.note ? ' for ' + m.note : '') + '.';
  }
  function noteLife(text) {
    const S = api.getS(); if (!S || !text) return;
    S.feed.unshift({ age: S.age, text: text });
    if (S.feed.length > 220) S.feed.length = 220;
    api.hud(); api.save();
  }
  function applyDeal(m) {
    const S = api.getS(); if (!S || m.id == null) return;
    const key = (m.kind || '') + ':' + m.id;
    if (applied.has(key)) return;
    const mine = m.from === api.myId;
    const amt = +m.amt || 0;
    if ((m.kind === 'trade' || m.kind === 'lend') && mine && funds(S) < amt) { api.toast('You do not have that much.'); return; }
    applied.add(key);
    if (m.kind === 'biz') {
      S.venture = { with: mine ? m.to : m.from, name: m.note || 'Shop', since: S.age };
      noteLife('You and ' + (m.name || 'them') + ' opened ' + (m.note || 'a shop') + ' together.');
      api.toast('You are in business together.');
      return;
    }
    if (m.kind === 'repay') {
      if (mine) spend(S, Math.min(amt, funds(S))); else S.cash = (S.cash || 0) + amt;
      if (Array.isArray(S.iou)) for (const row of S.iou) if (row.id === m.id && row.open) row.open = 0;
      noteLife(mine ? 'You paid back ' + api.money(amt) + '.' : (m.name || 'They') + ' paid back ' + api.money(amt) + '.');
      return;
    }
    if (mine) spend(S, amt); else S.cash = (S.cash || 0) + amt;
    if (m.kind === 'lend') {
      if (!Array.isArray(S.iou)) S.iou = [];
      S.iou.push({ id: m.id, with: mine ? m.to : m.from, name: m.name || '', amt: amt, dir: mine ? 'out' : 'in', open: 1 });
    }
    const what = m.kind === 'lend' ? 'lent' : 'traded';
    noteLife(mine ? 'You ' + what + ' ' + api.money(amt) + (m.note ? ' (' + m.note + ')' : '') + '.' : (m.name || 'Someone') + ' ' + what + ' you ' + api.money(amt) + '.');
  }
  function hear(m) {
    if (!m || !m.t) return;
    if (m.t === 'say') { if (m.name) names.set(m.from, m.name); addBubble(m.from, m.name || '', m.text || ''); }
    else if (m.t === 'sayok') { const S = api.getS(); addBubble('me', (S && S.name) || 'You', m.text || ''); }
    else if (m.t === 'sayno' || m.t === 'dmfail' || m.t === 'bondno' || m.t === 'dealno') api.toast(failText(m.why));
    else if (m.t === 'dm') { if (m.name) names.set(m.from, m.name); pushInbox(m.name || 'Someone', m.text || '', m.from, m.id); api.toast((m.name || 'Someone') + ' messaged you.'); }
    else if (m.t === 'inbox') {
      const lines = m.lines || [];
      for (let i = 0; i < lines.length; i++) { const line = lines[i]; if (line.name) names.set(line.from, line.name); pushInbox(line.name || 'Someone', line.text || '', line.from, line.id); }
      if (lines.length > 1) api.toast(lines.length + ' messages were waiting.');
    }
    else if (m.t === 'bonds') { for (const row of (m.rows || [])) { stages.set(row.id, row.stage); if (row.name) names.set(row.id, row.name); } }
    else if (m.t === 'bondok') {
      stages.set(m.id, m.stage); if (m.name) names.set(m.id, m.name);
      api.toast((m.name || 'They') + ' — ' + (m.stage || '') + '.');
      noteLife('You and ' + (m.name || 'them') + ' are ' + (m.stage || 'close') + '.');
    }
    else if (m.t === 'bondask') {
      if (m.name) names.set(m.from, m.name);
      const word = m.ask === 'date' ? 'go out with you' : m.ask === 'marry' ? 'marry you' : 'be friends';
      api.showPhone({ from: m.name || 'Someone', text: (m.name || 'Someone') + ' wants to ' + word + '.' }, function () { yes(m.from, m.ask); });
    }
    else if (m.t === 'asks') {
      const rows = m.rows || []; if (!rows.length) return;
      const row = rows[rows.length - 1];
      const word = row.ask === 'date' ? 'go out with you' : row.ask === 'marry' ? 'marry you' : 'be friends';
      api.showPhone({ from: row.name || 'Someone', text: (row.name || 'Someone') + ' wants to ' + word + '.' }, function () { yes(row.from, row.ask); });
    }
    else if (m.t === 'blockok') {
      if (m.mute) { if (m.on) mutes.add(m.id); else mutes.delete(m.id); api.toast(m.on ? 'Muted.' : 'Unmuted.'); }
      else { if (m.on) { blocks.add(m.id); mutes.delete(m.id); } else blocks.delete(m.id); api.toast(m.on ? 'Blocked.' : 'Unblocked.'); }
    }
    else if (m.t === 'reportok') api.toast('Report sent. The messages are kept.');
    else if (m.t === 'dealask') {
      pendingDeal = m; if (m.name) names.set(m.from, m.name);
      api.showPhone({ from: m.name || 'Someone', text: dealLine(m) }, function () { yesDeal(m.id); });
    }
    else if (m.t === 'deals') {
      const rows = m.rows || []; if (!rows.length) return;
      pendingDeal = rows[rows.length - 1];
      api.showPhone({ from: pendingDeal.name || 'Someone', text: dealLine(pendingDeal) }, function () { yesDeal(pendingDeal.id); });
    }
    else if (m.t === 'dealok') applyDeal(m);
  }
  function peopleHtml() {
    const S = api.getS(); if (!S) return '';
    const inbox = (S.dates && S.dates.inbox) || [];
    const mail = inbox.slice(0, 5).map((m) => '<div class="res">' + api.esc(m.from) + ': ' + api.esc(m.text) + '</div>').join('');
    const seen = new Set(), rows = [], list = api.listPlayers();
    for (const p of list) {
      seen.add(p.id);
      const st = stages.get(p.id) || '';
      rows.push(api.opt('player:' + p.id, api.esc(p.name || 'Player'), (st ? st + ' · ' : '') + 'In town now', 'Talk'));
    }
    for (const [id, st] of stages) {
      if (seen.has(id)) continue;
      rows.push(api.opt('player:' + id, api.esc(names.get(id) || 'Player'), st, 'Away'));
    }
    const arrived = came.slice(0, 6).map((t) => '<div class="res">' + api.esc(t) + '</div>').join('');
    return (mail ? '<div class="hdr">Messages</div>' + mail : '') +
      (arrived ? '<div class="hdr">Just arrived</div>' + arrived : '') +
      '<div class="hdr">Real players</div>' +
      (rows.length ? '<div class="opts one">' + rows.join('') + '</div>' : '<div class="res">Nobody else is in town right now. When they are, they show up here and out in the street.</div>');
  }
  function sheet(id, near) {
    const S = api.getS();
    const name = names.get(id) || api.nameOf(id) || 'Player';
    const st = stages.get(id) || 'stranger';
    const blocked = blocks.has(id);
    const owed = ((S && S.iou) || []).filter((x) => x.open && x.dir === 'in' && x.with === id);
    const box = 'width:100%;padding:11px;border-radius:10px;border:1px solid #fff4;background:#2a1a10;color:#fff4dc;font-size:1rem';
    let html = '<div class="hdr">Message</div><input id="dmIn" maxlength="180" placeholder="A private message" style="' + box + '">';
    html += '<div class="opts one">' + api.opt('pdm:' + id, 'Send message', 'They get it wherever they are. If they are offline, it waits until they log in.', '') + '</div>';
    if (near) html += '<div class="opts one">' + api.opt('psay', 'Say it out loud', 'Anyone within 20 m sees a bubble over your head.', '') + '</div>';
    if (st === 'stranger') html += '<div class="opts one">' + api.opt('pfriend:' + id, 'Befriend', 'Friends first. Dating comes after.', '') + '</div>';
    if (st === 'friend') html += '<div class="opts one">' + api.opt('pdate:' + id, 'Ask to date', 'Both of you must be 21 in the game, with Mature on, and both confirmed 18+.', '') + '</div>';
    if (st === 'dating') html += '<div class="opts one">' + api.opt('pmarry:' + id, 'Ask to marry', 'You need a home in your name. A rental does not count. Both 21, Mature on, both confirmed 18+.', '') + '</div>';
    html += '<div class="hdr">Money in dollars</div><input id="pAmt" type="number" inputmode="decimal" min="1" step="1" value="5" placeholder="Dollars" style="' + box + '">';
    html += '<input id="pNote" maxlength="40" placeholder="What you trade, or the shop name" style="' + box + ';margin-top:8px">';
    html += '<div class="opts">' + api.opt('ptrade:' + id, 'Offer a trade', 'They must accept.', '') + api.opt('plend:' + id, 'Lend this amount', 'They must accept. You can ask it back.', '') + api.opt('pbiz:' + id, 'Open a shop together', 'Uses the shop name above.', '') + '</div>';
    if (owed.length) html += '<div class="opts one">' + api.opt('prepay:' + owed[0].id, 'Pay back the loan', api.esc(api.money(owed[0].amt)), '') + '</div>';
    html += '<div class="hdr">Safety</div><div class="opts">' +
      api.opt(blocked ? 'punblock:' + id : 'pblock:' + id, blocked ? 'Unblock' : 'Block', 'Blocked messages never arrive.', '') +
      api.opt(mutes.has(id) ? 'punmute:' + id : 'pmute:' + id, mutes.has(id) ? 'Unmute' : 'Mute', 'Hides their speech bubbles.', '') +
      api.opt('preport:' + id, 'Report', 'Keeps the recent messages for a review.', '') + '</div>';
    return api.head(api.esc(name), st === 'stranger' ? 'Another real player.' : st) + html;
  }
  return {
    hear, place, say, dm, ask, yes, block, mute, report, deal, yesDeal, repay, peopleHtml, sheet, blocks,
    noteLine(text) { if (!text) return; came.unshift(String(text)); if (came.length > 8) came.pop(); },
    onlineLog: () => came.slice(),
    stage: (id) => stages.get(id) || '',
    pending: () => pendingDeal
  };
}
