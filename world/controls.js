// Look settings, the one-time controls hints, and the phone pad shown while riding (Brake, Horn, Get off, speed).
const KEY = 'sansar.ctl', HINT = 'sansar.ctlHint';

export function createControls({ touch, onOff }) {
  let set = { sens: 1, invY: false };
  try { set = Object.assign(set, JSON.parse(localStorage[KEY] || '{}')); } catch (e) { /* keep defaults */ }
  const save = () => { localStorage[KEY] = JSON.stringify(set); };

  const css = document.createElement('style');
  css.textContent = `
#vpad{position:absolute;right:max(14px,env(safe-area-inset-right));bottom:calc(84px + env(safe-area-inset-bottom));display:none;z-index:56;width:170px;height:170px;pointer-events:none}
body.riding.touch #vpad{display:block}
#vpad button{position:absolute;border-radius:50%;border:2px solid rgba(255,244,220,.55);background:rgba(20,14,10,.42);color:#fff4dc;font:800 12px/1 system-ui,sans-serif;letter-spacing:.03em;touch-action:none;pointer-events:auto;-webkit-user-select:none;user-select:none}
#vpad button.on{background:rgba(255,244,220,.85);color:#2a1a10}
#vBrake{right:0;bottom:0;width:84px;height:84px;font-size:14px!important}
#vHorn{right:14px;bottom:100px;width:58px;height:58px}
#vOff{right:100px;bottom:8px;width:58px;height:58px}
#vkmh{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(150px + env(safe-area-inset-bottom));display:none;z-index:56;padding:6px 12px;border-radius:14px;background:rgba(20,14,10,.55);color:#fff4dc;font:800 15px/1 system-ui,sans-serif;pointer-events:none;border:1px solid rgba(255,230,180,.25)}
#vkmh small{font-weight:600;font-size:11px;opacity:.75;margin-left:3px}
body.riding #vkmh{display:block}
body.riding.touch #bot,body.riding.touch #runBtn{display:none!important}
#ctlHint{position:absolute;left:50%;top:calc(168px + env(safe-area-inset-top));transform:translateX(-50%);z-index:58;max-width:min(92vw,520px);padding:10px 14px;border-radius:14px;background:rgba(20,14,10,.82);color:#fff4dc;font:500 13px/1.45 system-ui,sans-serif;border:1px solid rgba(255,230,180,.3);transition:opacity .6s;pointer-events:auto}
body.sheeting #ctlHint,body.chatting #ctlHint{display:none!important}
@media(max-width:700px){#vpad{width:132px;height:132px;right:max(8px,env(safe-area-inset-right));bottom:auto}#vBrake{width:72px;height:72px;right:0;bottom:0}#vHorn{right:8px;bottom:78px;width:48px;height:48px}#vOff{right:78px;bottom:8px;width:48px;height:48px}#vkmh{left:auto;transform:none;right:8px;bottom:auto}#ctlHint{max-width:min(86vw,300px)}}
#ctlHint b{display:block;margin-bottom:3px;color:#f2c66d}
#ctlHint button{margin-top:6px;padding:5px 12px;border-radius:10px;border:1px solid #fff5;background:transparent;color:inherit;font-weight:700}
body.locked::after{content:"";position:fixed;left:50%;top:50%;width:6px;height:6px;margin:-3px;border-radius:50%;background:rgba(255,244,220,.85);box-shadow:0 0 0 1px rgba(0,0,0,.4);pointer-events:none;z-index:40}
.ctlrow{display:flex;align-items:center;gap:10px;margin:6px 0}.ctlrow input[type=range]{flex:1}.ctlrow label{min-width:110px}`;
  document.head.appendChild(css);
  if (touch) document.body.classList.add('touch');

  const pad = document.createElement('div'); pad.id = 'vpad';
  pad.innerHTML = '<button id="vHorn" type="button">HORN</button><button id="vOff" type="button">GET<br>OFF</button><button id="vBrake" type="button">BRAKE</button>';
  document.body.appendChild(pad);
  const kmh = document.createElement('div'); kmh.id = 'vkmh'; document.body.appendChild(kmh);
  const state = { brake: false, horn: false };
  const hold = (el, k) => {
    el.addEventListener('pointerdown', (e) => { state[k] = true; el.classList.add('on'); el.setPointerCapture(e.pointerId); e.stopPropagation(); e.preventDefault(); });
    const up = () => { state[k] = false; el.classList.remove('on'); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  };
  hold(pad.querySelector('#vBrake'), 'brake'); hold(pad.querySelector('#vHorn'), 'horn');
  pad.querySelector('#vOff').addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); onOff && onOff(); });

  let shownKmh = -1;
  function riding(on, kind, speed) {
    document.body.classList.toggle('riding', !!on);
    if (!on) { state.brake = state.horn = false; return; }
    const k = Math.round(Math.abs(speed) * 3.6); if (k !== shownKmh) { shownKmh = k; kmh.innerHTML = k + '<small>km/h</small>'; }
    pad.querySelector('#vOff').innerHTML = kind === 'car' ? 'GET<br>OUT' : 'GET<br>OFF';
  }

  const seen = (() => { try { return JSON.parse(localStorage[HINT] || '{}'); } catch (e) { return {}; } })();
  const pending = [];
  const busy = () => document.body.classList.contains('sheeting') || document.body.classList.contains('chatting');
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  function nudge() {
    if (document.getElementById('ctlHint') || busy()) return;
    const run = pending.shift(); if (run) run();
  }
  function show(title, body, ms, then) {
    const el = document.createElement('div'); el.id = 'ctlHint';
    el.innerHTML = `<b>${esc(title)}</b>${esc(body)}<br><button type="button">Got it</button>`;
    document.body.appendChild(el);
    let gone = false;
    const bye = () => { if (gone) return; gone = true; el.style.opacity = '0'; setTimeout(() => { el.remove(); if (then) then(); nudge(); }, 280); };
    el.querySelector('button').onclick = bye; setTimeout(bye, ms);
    if (window.__layoutHud) window.__layoutHud();
  }
  function hint(which) {
    if (seen[which]) return;
    seen[which] = 1; localStorage[HINT] = JSON.stringify(seen);
    const T = {
      foot: touch ? ['Controls', 'The stick walks relative to the camera. Drag the right side of the screen to look. The camera stays where you leave it. Pinch to zoom. Double-tap the stick edge to sprint.']
        : ['Controls', 'The camera stays where you look it. W walks away from the camera, S turns and walks toward it, A and D walk across. Click the scene to look, Esc frees the pointer. Wheel zooms. Shift sprints. E interacts.'],
      ride: touch ? ['Riding', 'Stick up: go. Stick down: brake, then reverse in the car. Stick left and right: steer. Brake, Horn and Get off are on the right.']
        : ['Riding', 'W: throttle. S: brake, then reverse in the car. A / D: steer. Space: brake. H: horn. E: get off. The camera swings back behind you after two seconds.'],
    }[which];
    if (!T) return;
    const run = () => show(T[0], T[1], 11000);
    if (document.getElementById('ctlHint') || busy()) pending.push(run); else run();
  }
  function card(title, body, then) {
    const run = () => show(title, body, 9000, then);
    if (document.getElementById('ctlHint') || busy()) pending.push(run); else run();
  }

  function meHtml() {
    return `<div class="hdr">Controls</div>
<div class="ctlrow"><label for="ctlSens">Camera speed</label><input id="ctlSens" type="range" min="0.3" max="2.5" step="0.1" value="${set.sens}"><b id="ctlSensV">${(+set.sens).toFixed(1)}</b></div>
<div class="ctlrow"><label for="ctlInv">Invert up/down</label><input id="ctlInv" type="checkbox" ${set.invY ? 'checked' : ''}></div>`;
  }
  document.addEventListener('input', (e) => {
    if (e.target.id === 'ctlSens') { set.sens = +e.target.value; const v = document.getElementById('ctlSensV'); if (v) v.textContent = set.sens.toFixed(1); save(); }
    if (e.target.id === 'ctlInv') { set.invY = !!e.target.checked; save(); }
  });

  return { get sens() { return set.sens; }, get invY() { return set.invY; }, set(k, v) { set[k] = v; save(); }, state, riding, hint, card, nudge, seen: (w) => !!seen[w], meHtml };
}
