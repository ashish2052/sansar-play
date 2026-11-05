// Click-to-chat sheet: streams /api/npc/chat (ndjson) token by token. Phone = bottom sheet, laptop = right panel.
import { jobPaper, examPaper } from '../js/papers.js?v=exam1';
const $ = (s) => document.querySelector(s);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const show = (t) => t.replace(/\*[^*]*\*?/g, '').replace(/^\s+/, '');   // hide *stage directions* even while they stream
export const ttfw = (window.__ttfw = []);                                // every reply's time-to-first-word, for QA

const FOLLOW = /(?:^follow$)|(\b(follow me|please follow|can you follow|come with me|come along|walk with me|tag along|stay with me)\b)/i;
const WAIT = /\b(stop following|don'?t follow|do not follow|wait here|stay here|go back|leave me|^stop$)\b/i;
const LEAD = /\b(lead the way|show me|take me to|guide me)\b/i;
const DATE = /\b(go out|take me out|would you like to go|let'?s go|lets go|want to go)\b/i;
const MISSING = /\b(movies?|cinema|films?|theatre|theater|mall|nightclub|concert)\b/i;
const PLACE_OF = [[/caf[eé]|coffee/i, 'cafe'], [/college|campus|school/i, 'college'], [/job|work|office|company/i, 'job'], [/bank/i, 'bank'], [/\bhome\b|apartment|dorm|house/i, 'home'], [/lake/i, 'lake'], [/park/i, 'park']];
function knownPlace(text) { for (const [re, id] of PLACE_OF) if (re.test(text)) return id; return null; }
function leadPlace(text) { return knownPlace(text) || 'cafe'; }
function yearsOf(v) { const n = parseInt(String(v == null ? '' : v), 10); return Number.isFinite(n) ? n : 0; }
const ACTS = [
  { re: /\b(on your knees|get on (?:your )?knees?|kneel(?: for me)?)\b/i, act: 'kneel', need: 'close', line: 'Like this?' },
  { re: /\b(bend over|bend down|lean over)\b/i, act: 'bend', need: 'close', line: 'Not out here.' },
  { re: /\b(kiss(?:\s+u)?|kiss me|kiss you|give me a kiss)\b/i, act: 'kiss', need: 'close', line: 'Come here.' },
  { re: /\b(take (?:your |the )?(?:clothes|shirt|top|dress) off|undress|get naked|strip)\b/i, act: 'private', need: 'close', line: 'Yes. Come here. The door is shut.' },
  { re: /\b(hug me|give me a hug|hold me)\b/i, act: 'hug', need: 'warm', line: 'Come here.' },
  { re: /\bdance\b/i, act: 'dance', need: 'ok', line: 'Only for a minute.' },
  { re: /\bwave\b/i, act: 'wave', need: 'ok', line: 'Hello.' },
  { re: /\b(sit down|have a seat)\b/i, act: 'sit', need: 'ok', line: 'I am sitting.' },
  { re: /\b(stand up|get up)\b/i, act: 'stand', need: 'ok', line: 'I am up.' },
];
export function createChat({ pid, getCtx, onOpen, onClose, onMood, onAct, onAppt, onPromise, getName }) {
  const el = $('#chat'), log = $('#cLog'), inp = $('#cIn'), form = $('#cForm'); let cur = null, busy = false, iv = null, op = null, st = { aff: 0, mood: 'calm' };
  const PTS = { best: 2, ok: 1, weak: 0 };
  const ownPts = (text) => {
    const t = text.trim();
    const w = t.split(/\s+/).filter(Boolean);
    if (w.length >= 4 && !/^(yes|no|ok|hi|hello|hey|sure|idk|nope)[.!]?$/i.test(t)) return 1;
    return 0;
  };
  const goodOpts = (opts) => {
    if (!Array.isArray(opts) || opts.length !== 4) return false;
    const ks = opts.map((o) => o && o.k);
    return ks.filter((k) => k === 'best').length === 1 && ks.filter((k) => k === 'ok').length === 1 && ks.filter((k) => k === 'weak').length === 2 && opts.every((o) => o && o.t && String(o.t).length > 2);
  };
  const shuffled = (opts, salt) => {
    const a = opts.slice();
    let h = 2166136261;
    for (let i = 0; i < salt.length; i++) h = Math.imul(h ^ salt.charCodeAt(i), 16777619);
    for (let i = a.length - 1; i > 0; i--) {
      h = Math.imul(h ^ (h >>> 16), 2246822519);
      const j = (h >>> 0) % (i + 1);
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };
  const bindBox = (box) => {
    box.onclick = (e) => {
      if (!iv || busy) return;
      const own = e.target.closest('[data-own]');
      if (own) { form.hidden = false; inp.placeholder = 'Your answer'; if (!matchMedia('(pointer:coarse)').matches) inp.focus(); return; }
      const b = e.target.closest('.mcqopt');
      if (!b || b.disabled) return;
      choose(b.dataset.k, b.textContent);
    };
  };
  const paintOpts = (box, item) => {
    const opts = shuffled(item.opts, item.q);
    box.innerHTML = opts.map((o) => `<button type="button" class="mcqopt" data-k="${esc(o.k)}">${esc(o.t)}</button>`).join('')
      + '<button type="button" class="mcqown" data-own="1">Answer in your own words</button>';
    bindBox(box);
  };
  const mergePaper = (paper, remote) => paper.map((item, i) => {
    const r = remote && remote[i];
    if (!r || r.q !== item.q || !goodOpts(r.opts)) return item;
    return { q: item.q, opts: r.opts };
  });
  function pullCached(kind, id) {
    const url = kind === 'exam' ? `/api/exam/paper?course=${encodeURIComponent(id)}` : `/api/job/paper?job=${encodeURIComponent(id)}`;
    fetch(url).then((r) => (r.ok ? r.json() : null)).then((j) => {
      if (!iv || iv.kindId !== id || iv.turns.length || !j || j.src !== 'model') return;
      iv.paper = mergePaper(iv.paper, j.qs);
      const box = log.querySelector('.mcq.live');
      if (box && iv.turns.length === 0) paintOpts(box, iv.paper[0]);
    }).catch(() => {});
  }
  function record(q, a, pts) {
    iv.turns.push({ q, a, pts });
    iv.q = '';
    iv.onAnswer && iv.onAnswer(q, a, pts);
    const box = log.querySelector('.mcq.live');
    if (box) { box.classList.remove('live'); box.querySelectorAll('button').forEach((b) => { b.disabled = true; }); }
  }
  function showQ() {
    const n = iv.turns.length;
    if (n >= 3 || n >= iv.paper.length) return finishMcq();
    const item = iv.paper[n];
    iv.q = item.q;
    iv.onQuestion && iv.onQuestion(item.q);
    const lead = n === 0
      ? (iv.exam ? `Hello. Three questions for ${iv.name}, then the mark. ` : `Hello. Three questions about the work of a ${iv.name}, then we decide. `)
      : '';
    bubble('npc', esc(lead + item.q));
    const box = document.createElement('div');
    box.className = 'mcq live';
    paintOpts(box, item);
    log.append(box);
    log.scrollTop = log.scrollHeight;
    form.hidden = true;
  }
  async function choose(k, text) {
    if (!iv || busy) return;
    busy = true;
    const q = iv.q;
    bubble('me', esc(text));
    record(q, text, PTS[k] ?? 0);
    if (iv && iv.turns.length >= 3) await finishMcq();
    else if (iv) showQ();
    busy = false;
  }
  async function finishMcq() {
    if (!iv) return;
    const spec = iv;
    iv = null;
    form.hidden = true;
    let line = spec.exam ? 'The paper did not land.' : 'Not this time.';
    try {
      const score = spec.turns.reduce((n, t) => n + (t.pts | 0), 0);
      const j = await spec.onDone(score);
      line = (j && (j.line || j.msg)) || line;
    } catch (e) { /* keep the fallback line */ }
    bubble('npc', esc(line), 'result');
    busy = false;
  }
  const setHeart = (aff, label, mood) => {
    $('#cHeart').style.width = ((aff + 100) / 2) + '%'; $('#cHeart').style.background = aff <= -15 ? '#c0554a' : aff < 40 ? '#e8a1b4' : '#ff5c8a';
    st.aff = aff; st.mood = mood || st.mood || 'calm';
    $('#cLabel').textContent = `${label} · ${aff > 0 ? '+' : ''}${aff} · ${st.mood}`;
    $('#cHearts').textContent = st.mood === 'flirt' ? '😘' : st.mood === 'angry' ? '💢' : aff <= -15 ? '💔' : aff >= 70 ? '❤️‍🔥' : aff >= 40 ? '❤️' : aff >= 15 ? '🩷' : '🤍';
    el.classList.remove('mood-calm', 'mood-friendly', 'mood-flirt', 'mood-angry', 'mood-sad', 'mood-playful', 'mood-shy', 'mood-proud'); el.classList.add('mood-' + st.mood);
    if (cur) { cur.mood = st.mood; onMood && onMood(cur, st.mood); }
  };
  const bubble = (who, html, cls = '') => { const d = document.createElement('div'); d.className = `b ${who} ${cls}`; d.innerHTML = html; log.append(d); log.scrollTop = log.scrollHeight; return d; };
  function chips() {
    const facts = (st.facts || []).join(' ').toLowerCase(), nm = getName(), aff = st.aff;
    const g = (cur && cur.cast && cur.cast.gender) || '';
    const ask = /^(f|w)/i.test(g) ? 'Be my girlfriend' : /^m/i.test(g) ? 'Be my boyfriend' : 'Be my partner';
    const c = [facts.includes('name') ? 'How is your day going?' : `Hi, I'm ${nm}`, aff >= 15 ? 'Tell me about yourself' : 'What do you do here?', aff >= 40 ? "What's on your mind lately?" : "What's good around here?"];
    if (st.bond !== 'partner' && aff >= 80) c.push(ask);
    const grown = (v) => { const n = parseInt(String(v == null ? '' : v), 10); return Number.isFinite(n) && n >= 21; };
    const ctx = getCtx(cur) || {};
    const gf = st.bond === 'partner' && grown(cur.cast.age) && grown(ctx.age) && (ctx.mature === '1' || ctx.mature === true);
    if (gf) { c.push(cur.follow ? 'Stop following' : 'Follow'); c.push('Kiss'); c.push('Kneel'); }
    else if (cur && cur.follow) c.push('Wait here');
    else if (aff > -15) c.push('Follow me');
    if (aff > -15 && !gf) c.push('Dance');
    $('#cChips').innerHTML = c.map((t) => `<button type="button" class="chip">${esc(t)}</button>`).join('');
  }
  function openQuiz(spec, exam) {
    if (cur) close();
    const paper = exam ? examPaper(spec.id) : jobPaper(spec.id, spec.name);
    iv = { id: spec.id, kindId: spec.id, name: spec.name, exam: !!exam, q: '', turns: (spec.turns || []).map((t) => ({ q: t.q, a: t.a, pts: t.pts | 0 })), paper, onQuestion: spec.onQuestion, onAnswer: spec.onAnswer, onDone: spec.onDone };
    cur = { id: (exam ? 'exam:' : 'job:') + spec.id, interview: true, cast: { name: exam ? 'Exam' : 'Hiring desk', job: spec.name, age: '' } };
    el.hidden = false; el.classList.add('quiz'); requestAnimationFrame(() => el.classList.add('on')); log.innerHTML = ''; busy = false;
    $('#cAv').textContent = exam ? 'E' : 'H';
    $('#cName').textContent = exam ? 'Exam' : 'Hiring desk';
    $('#cSub').textContent = exam ? spec.name : spec.name + (spec.pay === 'month' ? ' · full time, nine to five' : ' · by the hour');
    $('#cGive').hidden = true; setHeart(0, exam ? 'Exam' : 'Interview', 'calm'); $('#cChips').innerHTML = '';
    form.hidden = true;
    document.body.classList.add('chatting');
    if (iv.turns.length >= 3) finishMcq(); else showQ();
    pullCached(exam ? 'exam' : 'job', spec.id);
  }
  function openInterview(spec) { openQuiz(spec, false); }
  function openExam(spec) { openQuiz(spec, true); }
  // opener = { line, opts: [{ t, fn }] }: a scripted first line with buttons; fn() may return her reply. The last option is the dismiss.
  async function open(npc, opener) {
    iv = null; cur = npc; op = opener || null; el.hidden = false; el.classList.remove('quiz'); requestAnimationFrame(() => el.classList.add('on')); log.innerHTML = ''; busy = false; form.hidden = false;
    $('#cGive').hidden = false; $('#cAv').textContent = npc.cast.name[0]; $('#cName').textContent = npc.cast.name; $('#cSub').textContent = `${npc.cast.job || ''} · ${npc.cast.age || ''}`; setHeart(0, 'Stranger', npc.mood || 'calm'); $('#cChips').innerHTML = '';
    onOpen && onOpen(npc);
    if (opener) { bubble('npc', esc(opener.line)); $('#cChips').innerHTML = opener.opts.map((o, i) => `<button type="button" class="chip" data-op="${i}">${esc(o.t)}</button>`).join(''); }
    try {
      const ctx = getCtx(npc) || {}; if (npc.started) ctx.started = '1';
      const j = await fetch(`/api/npc/open?pid=${encodeURIComponent(pid)}&npc=${npc.id}&` + new URLSearchParams(ctx)).then((r) => r.json());
      if (cur !== npc) return; st.facts = j.facts; st.bond = j.bond || ''; st.stage = j.stage || (st.bond === 'partner' ? 'dating' : 'stranger'); st.turns = j.turns || 0; setHeart(j.aff, j.label, j.mood || 'calm'); if (!opener) { bubble('npc', esc(j.greeting)); chips(); }
    } catch (e) { if (!opener) { bubble('npc', 'Hello there.'); chips(); } }
    if (!matchMedia('(pointer:coarse)').matches) inp.focus();
  }
  function pick(i) {
    const o = op && op.opts[i]; if (!o) return; op = null; $('#cChips').innerHTML = ''; bubble('me', esc(o.t));
    const say = o.fn(), n = cur; if (!say) { close(); return; } // no reply: the option moves straight on (scripted tours)
    bubble('npc', esc(say));
    setTimeout(() => { if (cur === n) close(); }, 1600);
  }
  function close() { if (op) { const o = op.opts[op.opts.length - 1]; op = null; o.fn(); } if (!cur) return; el.classList.remove('on'); el.classList.remove('quiz'); const n = cur, wasIv = !!iv; cur = null; iv = null; setTimeout(() => { if (!cur) el.hidden = true; }, 220); onClose && onClose(wasIv ? null : n); inp.blur(); }
  async function send(text) {
    text = text.trim(); if (!text || !cur || busy) return;
    if (iv) {
      busy = true; inp.value = ''; form.hidden = true; bubble('me', esc(text));
      record(iv.q || '', text, ownPts(text));
      if (iv && iv.turns.length >= 3) await finishMcq(); else if (iv) showQ();
      busy = false; return;
    }
    busy = true; inp.value = ''; $('#cChips').innerHTML = '';
    const npc = cur;
    if (WAIT.test(text) && (npc.follow || npc.lead)) {
      bubble('me', esc(text)); onAct && onAct(npc, 'wait'); bubble('npc', 'I will wait here.'); busy = false; chips(); return;
    }
    if (LEAD.test(text) || DATE.test(text)) {
      bubble('me', esc(text));
      const known = knownPlace(text);
      if (MISSING.test(text) && !known) {
        bubble('npc', 'There is no cinema in town. The cafe, the park or the lake?');
        busy = false; chips(); return;
      }
      npc._leadKind = known || 'cafe'; npc._date = DATE.test(text);
      onAct && onAct(npc, npc._date ? 'date' : 'lead'); close(); busy = false; return;
    }
    if (FOLLOW.test(text)) {
      bubble('me', esc(text));
      if (st.aff <= -15) bubble('npc', 'No. I am not coming with you.');
      else { onAct && onAct(npc, 'follow'); bubble('npc', 'Alright. I am with you.'); }
      busy = false; chips(); return;
    }
    const asked = ACTS.find((a) => a.re.test(text));
    if (asked && asked.act === 'kiss') {
      bubble('me', esc(text));
      const stage = st.stage || (st.bond === 'partner' ? 'dating' : '');
      const place = ((getCtx(npc) || {}).place) || '';
      const hour = (getCtx(npc) || {}).hour || 0;
      const crowded = /street|college|cafe|park|shop/.test(place);
      let line = 'Come here.';
      if (yearsOf(npc.cast.age) < 21) line = 'No.';
      else if (stage !== 'dating') line = 'I am not there with you yet.';
      else if (st.mood === 'angry') line = 'Not while I am cross with you.';
      else if (crowded && hour % 5 === 0 && st.mood !== 'flirt') line = 'Not here. People are watching.';
      else onAct && onAct(npc, 'kiss');
      bubble('npc', line); busy = false; chips(); return;
    }
    if (asked) {
      bubble('me', esc(text));
      const grown = (v) => { const n = parseInt(String(v == null ? '' : v), 10); return Number.isFinite(n) && n >= 21; };
      const mine = (getCtx(npc) || {}).age;
      const adult = grown(npc.cast.age) && grown(mine);
      let line = asked.line, walkOff = false;
      if (st.aff <= -15) { line = 'No.'; walkOff = asked.need === 'close' && asked.act !== 'kiss'; }
      else if (asked.need === 'close' && !adult) { line = 'No.'; walkOff = asked.act !== 'kiss'; }
      else if (asked.need === 'close' && st.bond !== 'partner') { line = 'Ask me to be yours first.'; walkOff = asked.act !== 'kiss'; }
      else if (asked.need === 'close' && st.aff < 90) { line = 'Not yet. Stay close to me a while longer.'; walkOff = asked.act !== 'kiss'; }
      else if (asked.need === 'warm' && st.aff < 40) line = 'Not yet.';
      else onAct && onAct(npc, asked.act);
      bubble('npc', line); busy = false; if (!walkOff) chips();
      if (walkOff) setTimeout(() => { if (cur === npc) close(); }, 900);
      return;
    }
    if (onPromise) {
      const hit = onPromise(npc, text, st);
      if (hit && hit.local) {
        bubble('me', esc(text)); bubble('npc', esc(hit.line || ''));
        if (hit.aff != null) setHeart(hit.aff, hit.label || (st.bond === 'partner' ? 'Partner' : 'Friend'), hit.mood || st.mood);
        busy = false; chips(); return;
      }
    }
    bubble('me', esc(text)); let nb = bubble('npc', '<i class="dots"><u></u><u></u><u></u></i>', 'typing'), raw = '', shown = false, lateBubble = null, endIt = false;
    const t0 = performance.now(); let first = null;
    try {
      const r = await fetch('/api/npc/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pid, npc: npc.id, text, ctx: getCtx(npc) }) });
      const rd = r.body.getReader(), dec = new TextDecoder(); let buf = '';
      for (;;) {
        const { value, done } = await rd.read(); if (done) break; buf += dec.decode(value, { stream: true }); let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i); buf = buf.slice(i + 1); if (!line.trim()) continue; const j = JSON.parse(line);
          if (j.t === 'fb') { nb.classList.remove('typing'); nb.classList.add('fb'); nb.textContent = j.v; if (first === null) { first = performance.now() - t0; ttfw.push({ npc: npc.id, ms: Math.round(first), fb: true }); } }
          else if (j.t === 'tok') {
            if (first === null) { first = performance.now() - t0; ttfw.push({ npc: npc.id, ms: Math.round(first), fb: false }); }
            if (j.late) { if (!lateBubble) { lateBubble = bubble('npc', ''); raw = ''; } raw += j.v; lateBubble.textContent = show(raw); }
            else { raw += j.v; nb.classList.remove('typing'); nb.textContent = show(raw); }
            log.scrollTop = log.scrollHeight;
          } else if (j.t === 'done') { if (j.text) (lateBubble || nb).textContent = j.text; log.scrollTop = log.scrollHeight; }
          else if (j.t === 'mood') { setHeart(j.aff, j.label, j.mood); }
          else if (j.t === 'end') endIt = true;
          else if (j.t === 'scene') { onAct && onAct(npc, 'private'); document.body.classList.add('private'); setTimeout(() => document.body.classList.remove('private'), 4000); }
          else if (j.t === 'kiss') { onAct && onAct(npc, 'kiss'); }
          else if (j.t === 'appt') { onAppt && onAppt(npc, j); }
          else if (j.t === 'aff') {
            st.facts = j.facts; st.bond = j.bond || ''; if (j.stage) st.stage = j.stage; else if (st.bond === 'partner') st.stage = 'dating'; setHeart(j.aff, j.label, j.mood); const d = document.createElement('div'); d.className = 'delta ' + (j.d >= 0 ? 'up' : 'down'); d.textContent = j.d === 0 ? '·' : (j.d > 0 ? '+' + j.d + ' ❤' : j.d + ' 💔'); $('#cHeartWrap').append(d); setTimeout(() => d.remove(), 1800); chips();
          }
        }
      }
    } catch (e) { nb.classList.remove('typing'); if (!nb.textContent) nb.textContent = 'Hm, sorry, what was that?'; }
    busy = false;
    if (nb.classList.contains('typing')) {
      nb.classList.remove('typing');
      if (nb.querySelector('.dots') || !nb.textContent.trim()) nb.textContent = '...';
    }
    if (endIt) setTimeout(() => { if (cur === npc) close(); }, 900);
  }
  form.addEventListener('submit', (e) => { e.preventDefault(); send(inp.value); });
  $('#cChips').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (b && b.dataset.op != null) pick(+b.dataset.op); else if (b) send(b.textContent); });
  $('#cX').onclick = close;
  addEventListener('keydown', (e) => { if (e.code === 'Escape' && cur) { e.preventDefault(); close(); } }, true);
  inp.addEventListener('keydown', (e) => e.stopPropagation());
  // swipe down on the grip / header closes (phone)
  let sy = null; const hd = $('#cHead');
  hd.addEventListener('pointerdown', (e) => { sy = e.clientY; });
  addEventListener('pointerup', (e) => { if (sy !== null && e.clientY - sy > 60) close(); sy = null; });
  return { open, openInterview, openExam, close, send, get current() { return cur; }, get busy() { return busy; } };
}
