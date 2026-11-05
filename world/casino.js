// Golden Rupee: a room you walk into. Cards, the wheel and the reels only show what the server drew.
import * as THREE from 'three';
import { money } from '../js/finance.js?v=usd1';

export const OX = 2000, OZ = 0;
const SUIT = { S: '\u2660', H: '\u2665', D: '\u2666', C: '\u2663' };
const CHIP = { 500: 0xb42318, 1000: 0x1d4e89, 5000: 0x1f7a3a, 10000: 0x222222, 25000: 0x6c3f78, 50000: 0xc9a227 };

function paintCard(code) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 180; const g = c.getContext('2d');
  g.fillStyle = '#f4efe4'; g.fillRect(0, 0, 128, 180); g.strokeStyle = '#2a241c'; g.lineWidth = 4; g.strokeRect(3, 3, 122, 174);
  if (code === '??') {
    g.fillStyle = '#6e1c2c'; g.fillRect(10, 10, 108, 160);
    g.strokeStyle = '#e6c56b'; g.strokeRect(16, 16, 96, 148);
    g.fillStyle = '#e6c56b'; g.font = '700 28px Georgia, serif'; g.textAlign = 'center'; g.fillText('S', 64, 96);
  } else {
    const red = code[1] === 'H' || code[1] === 'D';
    g.fillStyle = red ? '#a61b14' : '#1c1c1c';
    g.font = '700 46px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(code[0] === 'T' ? '10' : code[0], 64, 58);
    g.font = '68px Georgia, serif'; g.fillText(SUIT[code[1]] || '', 64, 118);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.55 });
}

function label(text, sub) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = 'rgba(18,12,10,.72)'; g.fillRect(8, 16, 496, 96);
  g.fillStyle = '#fff4e0'; g.font = '700 42px Georgia, serif'; g.textAlign = 'center'; g.fillText(text, 256, 58);
  g.fillStyle = '#e6c56b'; g.font = '28px Georgia, serif'; g.fillText(sub, 256, 96);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.set(1.15, 0.29, 1); return s;
}

function person(clothHex) {
  const g = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color: clothHex, roughness: 0.7 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc68642, roughness: 0.62 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 3, 8), cloth); body.position.y = 1.0; body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), skin); head.position.y = 1.55; head.castShadow = true;
  g.add(body, head); return g;
}

export function buildCasino({ scene, look, colliders }) {
  const g = new THREE.Group();
  g.position.set(OX, 0, OZ);
  scene.add(g);
  const felt = new THREE.MeshStandardMaterial({ color: 0x0e6a38, roughness: 0.92 });
  const wood = look.pbr('dark_planks', 1.2).clone(); wood.metalness = 0; wood.metalnessMap = null;
  const wallM = new THREE.MeshStandardMaterial({ color: 0x4a2030, roughness: 0.86 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xe6c56b, roughness: 0.4, metalness: 0.35, emissive: 0x7a5a20, emissiveIntensity: 0.25 });
  const carpetCv = document.createElement('canvas'); carpetCv.width = 128; carpetCv.height = 128; {
    const cg = carpetCv.getContext('2d'); cg.fillStyle = '#6e2433'; cg.fillRect(0, 0, 128, 128);
    cg.strokeStyle = '#8d3a46'; cg.lineWidth = 3; cg.strokeRect(8, 8, 112, 112); cg.beginPath(); cg.moveTo(64, 16); cg.lineTo(112, 64); cg.lineTo(64, 112); cg.lineTo(16, 64); cg.closePath(); cg.stroke();
  }
  const carpetT = new THREE.CanvasTexture(carpetCv); carpetT.colorSpace = THREE.SRGBColorSpace; carpetT.wrapS = carpetT.wrapT = THREE.RepeatWrapping; carpetT.repeat.set(4, 3);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14.2, 11.2), new THREE.MeshStandardMaterial({ map: carpetT, roughness: 0.95, emissive: 0x5a2030, emissiveIntensity: 0.45 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.16; floor.receiveShadow = true; g.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(14.2, 11.2), new THREE.MeshStandardMaterial({ color: 0x2a1418, roughness: 0.9, emissive: 0x3a2018, emissiveIntensity: 0.35 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = 3.7; g.add(ceil);

  function wall(w, h, d, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallM); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m);
    colliders.push({ t: 'box', x0: OX + x - w / 2, x1: OX + x + w / 2, z0: OZ + z - d / 2, z1: OZ + z + d / 2, y1: y + h / 2 });
  }
  wall(14.6, 3.7, 0.28, 0, 1.9, -5.55);
  wall(0.28, 3.7, 11.2, -7.15, 1.9, 0);
  wall(0.28, 3.7, 11.2, 7.15, 1.9, 0);
  wall(5.6, 3.7, 0.28, -4.3, 1.9, 5.5);
  wall(5.6, 3.7, 0.28, 4.3, 1.9, 5.5);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 0.28), wallM); lintel.position.set(0, 3.3, 5.5); g.add(lintel);

  for (const [x, z] of [[-3.2, -1.2], [3.2, -1.2], [0, 2.4]]) {
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.16, 12), gold); shade.position.set(x, 3.45, z); g.add(shade);
    const bulb = new THREE.PointLight(0xffc48a, 40, 24, 2); bulb.position.set(x, 3.15, z); g.add(bulb);
  }

  const skirt = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.72, 1.15), wood); skirt.position.set(0, 0.52, -1.15); skirt.castShadow = skirt.receiveShadow = true; g.add(skirt);
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.06, 1.0), felt); top.position.set(0, 0.9, -1.15); top.receiveShadow = true; g.add(top);
  colliders.push({ t: 'box', x0: OX - 1.05, x1: OX + 1.05, z0: OZ - 1.72, z1: OZ - 0.58, y1: 1.0 });
  const rail = document.createElement('canvas'); rail.width = 512; rail.height = 64;
  const railCtx = rail.getContext('2d');
  const railT = new THREE.CanvasTexture(rail); railT.colorSpace = THREE.SRGBColorSpace;
  function paintRail(country) {
    const s = { country: country || 'Nepal' };
    railCtx.fillStyle = '#143024'; railCtx.fillRect(0, 0, 512, 64);
    railCtx.fillStyle = '#f3e6c0'; railCtx.font = '600 20px Georgia, serif'; railCtx.textAlign = 'center'; railCtx.textBaseline = 'middle';
    railCtx.fillText('Blackjack  3:2   ·   soft 17   ·   ' + money(s, 500) + '–' + money(s, 50000), 256, 32);
    railT.needsUpdate = true;
  }
  paintRail('Nepal');
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.2), new THREE.MeshBasicMaterial({ map: railT }));
  plaque.position.set(0, 0.72, -0.62); g.add(plaque);

  const dealer = person(0x1a1a1a); dealer.position.set(0, 0, -2.15); const dl = label('Dealer', 'Blackjack'); dl.position.set(0, 1.95, -2.15); g.add(dealer, dl);
  const cashier = person(0x8a6a32); cashier.position.set(-4.6, 0, 2.2); const cl = label('Cashier', 'Chips'); cl.position.set(-4.6, 1.95, 2.2); g.add(cashier, cl);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 0.7), wood); counter.position.set(-4.6, 0.5, 2.9); counter.castShadow = true; g.add(counter);
  colliders.push({ t: 'box', x0: OX - 5.7, x1: OX - 3.5, z0: OZ + 2.5, z1: OZ + 3.3, y1: 1.1 });

  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.08, 24), new THREE.MeshStandardMaterial({ color: 0x0c5a30, roughness: 0.5 }));
  wheel.position.set(-4.3, 0.92, -2.6); g.add(wheel);
  const wskirt = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.7, 1.3), wood); wskirt.position.set(-4.3, 0.5, -2.5); g.add(wskirt);
  const wsign = document.createElement('canvas'); wsign.width = 512; wsign.height = 64; {
    const wg = wsign.getContext('2d'); wg.fillStyle = '#143024'; wg.fillRect(0, 0, 512, 64);
    wg.fillStyle = '#f3e6c0'; wg.font = '600 24px Georgia, serif'; wg.textAlign = 'center'; wg.textBaseline = 'middle';
    wg.fillText('Roulette  ·  single zero', 256, 32);
  }
  const wt = new THREE.CanvasTexture(wsign); wt.colorSpace = THREE.SRGBColorSpace;
  const wp = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.18), new THREE.MeshBasicMaterial({ map: wt }));
  wp.position.set(-4.3, 0.7, -1.82); g.add(wp);
  colliders.push({ t: 'box', x0: OX - 5.5, x1: OX - 3.1, z0: OZ - 3.2, z1: OZ - 1.85, y1: 1.0 });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.3 }));
  ball.position.set(-4.3, 1.02, -2.15); g.add(ball);

  const reelMats = [0, 1, 2].map(() => new THREE.MeshStandardMaterial({ color: 0xf7f1e4, roughness: 0.45 }));
  const reels = [];
  const machine = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.8, 0.7), new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.55, metalness: 0.2 }));
  machine.position.set(4.6, 1.15, -1.6); machine.castShadow = true; g.add(machine);
  for (let i = 0; i < 3; i++) {
    const reel = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.48, 0.04), reelMats[i]);
    reel.position.set(4.15 + i * 0.42, 1.35, -1.22); g.add(reel); reels.push(reel);
  }
  const slotCv = document.createElement('canvas'); slotCv.width = 512; slotCv.height = 96; {
    const sg = slotCv.getContext('2d'); sg.fillStyle = '#1a120c'; sg.fillRect(0, 0, 512, 96);
    sg.fillStyle = '#f2d48a'; sg.font = '700 36px Georgia, serif'; sg.textAlign = 'center'; sg.textBaseline = 'middle';
    sg.fillText('SLOTS    RTP 95.5%', 256, 48);
  }
  const st = new THREE.CanvasTexture(slotCv); st.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.24), new THREE.MeshBasicMaterial({ map: st }));
  sp.position.set(4.6, 1.9, -1.22); g.add(sp);
  colliders.push({ t: 'box', x0: OX + 3.8, x1: OX + 5.4, z0: OZ - 2.0, z1: OZ - 1.2, y1: 2.1 });

  function chair(x, z, h) {
    const c = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.42), wood); seat.position.y = 0.48;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.06), wood); back.position.set(0, 0.75, 0.18);
    c.add(seat, back); c.position.set(x, 0, z); c.rotation.y = h; g.add(c);
  }
  chair(0, -0.05, 0);
  chair(-4.3, -1.35, 0);
  chair(4.6, 0.55, 0);

  const cardGeo = new THREE.PlaneGeometry(0.32, 0.44);
  const back = paintCard('??');
  const faces = {};
  const cardRoot = new THREE.Group(); scene.add(cardRoot);
  const chipRoot = new THREE.Group(); scene.add(chipRoot);
  const shoe = new THREE.Vector3(OX + 0.85, 1.15, OZ - 1.55);
  const shoeBox = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.2), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 }));
  shoeBox.position.copy(shoe); scene.add(shoeBox);

  const box = { x0: OX - 6.7, x1: OX + 6.7, z0: OZ - 5.15, z1: OZ + 5.2 };
  const api = {
    box,
    street: null,
    exit: { x: OX, z: OZ + 4.95 },
    enterAt: { x: OX, z: OZ + 2.6 },
    seats: [
      { x: OX, z: OZ - 0.05, h: Math.PI, kind: 'bj' },
      { x: OX - 4.3, z: OZ - 1.35, h: Math.PI, kind: 'roulette' },
      { x: OX + 4.6, z: OZ + 0.55, h: Math.PI, kind: 'slot' },
    ],
    bet: 500,
    rou: 'red',
    lock: 0,
    busyTravel: false,
    busy: false,
    cardMap: {},
    flying: [],
    hooks: {},
    ball, reels, reelMats, wheel,
    contains(x, z) { return x >= box.x0 && x <= box.x1 && z >= box.z0 && z <= box.z1; },
    bind(hooks) { this.hooks = hooks; this._ui(); },
    clearCards() {
      for (const k of Object.keys(this.cardMap)) cardRoot.remove(this.cardMap[k].mesh);
      this.cardMap = {}; this.flying = [];
    },
    slotPos(who, hi, i) {
      const y = 0.945 + i * 0.004;
      if (who === 'd') return new THREE.Vector3(OX - 0.28 + i * 0.36, y, OZ - 1.38);
      const x0 = hi === 0 ? OX - 0.7 : OX + 0.15;
      return new THREE.Vector3(x0 + i * 0.34, y, OZ - 0.9);
    },
    syncCards(view) {
      if (!view || view.game !== 'bj') return;
      const want = [];
      (view.dealer || []).forEach((code, i) => want.push(['d', 0, i, code]));
      (view.hands || []).forEach((h, hi) => (h.cards || []).forEach((code, i) => want.push(['p', hi, i, code])));
      const next = {};
      for (const [who, hi, i, code] of want) {
        const key = who + hi + '-' + i;
        let rec = this.cardMap[key];
        if (rec && rec.code === code) { next[key] = rec; continue; }
        if (rec && rec.code === '??' && code !== '??') {
          rec.code = code; rec.mesh.material = faces[code] ||= paintCard(code); next[key] = rec; continue;
        }
        if (rec) cardRoot.remove(rec.mesh);
        const mat = code === '??' ? back : (faces[code] ||= paintCard(code));
        const mesh = new THREE.Mesh(cardGeo, mat); mesh.rotation.x = -Math.PI / 2;
        const to = this.slotPos(who, hi, i); mesh.position.copy(shoe); cardRoot.add(mesh);
        rec = { mesh, code, to, t: 0, from: shoe.clone() };
        this.flying.push(rec); next[key] = rec;
      }
      for (const k of Object.keys(this.cardMap)) if (!next[k]) cardRoot.remove(this.cardMap[k].mesh);
      this.cardMap = next;
    },
    chips(amount) {
      while (chipRoot.children.length) chipRoot.remove(chipRoot.children[0]);
      const denoms = [50000, 25000, 10000, 5000, 1000, 500];
      let left = Math.max(0, amount | 0), n = 0;
      const geo = new THREE.CylinderGeometry(0.045, 0.045, 0.014, 10);
      for (const d of denoms) while (left >= d && n < 10) {
        const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: CHIP[d], roughness: 0.45 }));
        m.position.set(OX + 0.15, 0.95 + n * 0.016, OZ - 0.55); chipRoot.add(m); left -= d; n++;
      }
    },
    paintReel(i, sym) {
      const name = { '7': '7', B: 'BAR', E: 'BELL', C: 'CHY', L: 'LEM' }[sym] || sym;
      const c = document.createElement('canvas'); c.width = 128; c.height = 128; const ctx = c.getContext('2d');
      ctx.fillStyle = '#f7f1e4'; ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = sym === '7' ? '#a61b14' : '#1c1c1c'; ctx.font = '700 36px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(name, 64, 64);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      this.reelMats[i].map = t; this.reelMats[i].needsUpdate = true;
    },
    _ui() {
      const bar = document.getElementById('casinoBar'); if (!bar || bar.dataset.wired) return; bar.dataset.wired = '1';
      bar.querySelectorAll('[data-bet]').forEach((b) => b.addEventListener('click', () => {
        this.bet = +b.dataset.bet; bar.querySelectorAll('[data-bet]').forEach((x) => x.classList.toggle('on', x === b)); this.chips(this.bet);
      }));
      const click = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
      click('bjDeal', () => this.send({ game: 'bj', action: 'deal', bet: this.bet }, true));
      click('bjHit', () => this.send({ game: 'bj', action: 'hit' }));
      click('bjStand', () => this.send({ game: 'bj', action: 'stand' }));
      click('bjDouble', () => this.send({ game: 'bj', action: 'double' }));
      click('bjSplit', () => this.send({ game: 'bj', action: 'split' }));
      click('rouRed', () => { this.rou = 'red'; });
      click('rouBlack', () => { this.rou = 'black'; });
      click('rouSpin', () => this.send({ game: 'roulette', action: 'spin', bet: this.bet, kind: this.rou }));
      click('slotSpin', () => this.send({ game: 'slot', action: 'spin', bet: this.bet }));
      click('bjLeave', () => { if (this.hooks.stand) this.hooks.stand(); });
    },
    async send(body, fresh) {
      if (this.busy) return;
      const S = this.hooks.S && this.hooks.S(); if (!S) return;
      if ((S.age | 0) < 21) { this.hooks.toast('The floor is 21 and over.'); return; }
      this.busy = true;
      window.__casino = Object.assign(window.__casino || {}, { busy: true });
      if (fresh) this.clearCards();
      body.pid = S.pid || this.hooks.pid; body.age = S.age | 0; body.cash = S.cash | 0; body.country = S.country || 'Nepal';
      let r;
      try { r = await fetch('/api/casino', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((x) => x.json()); }
      catch (e) { this.busy = false; window.__casino = Object.assign(window.__casino || {}, { busy: false }); this.hooks.toast('The table did not answer.'); return; }
      this.busy = false;
      window.__casino = Object.assign(window.__casino || {}, { busy: false });
      this.apply(r, body.game);
    },
    apply(r, game) {
      const S = this.hooks.S(); if (!S || !r) return;
      this.seq = (this.seq || 0) + 1;
      window.__casino = Object.assign({ seq: this.seq, inside: true }, r);
      if (!r.ok) { this.hooks.toast(r.err || 'Refused.'); if (r.phase) this.paint(r); return; }
      if (typeof r.cash === 'number') { const d = r.cash - (S.cash || 0); S.cash = r.cash; if (d && this.hooks.money) this.hooks.money(d); }
      if (r.line) this.hooks.life(r.line);
      if (r.note) this.hooks.toast(r.note);
      this.hooks.hud(); this.hooks.save();
      if ((game || r.game) === 'bj') { this.syncCards(r); const pot = (r.hands || []).reduce((a, h) => a + (h.bet || 0), 0); this.chips(pot || this.bet); }
      if (r.game === 'roulette') this.spinBall(r.n);
      if (r.game === 'slot' && r.reels) r.reels.forEach((s, i) => this.paintReel(i, s));
      this.view = r; this.paint(r);
    },
    spinBall(n) {
      this._spin = { n: n | 0, t: 0 };
    },
    paint(r) {
      const bar = document.getElementById('casinoBar'); if (!bar) return;
      const title = document.getElementById('casinoTitle');
      const act = document.getElementById('casinoAct');
      const bet = document.getElementById('casinoBet');
      const rou = document.getElementById('casinoRou');
      const slot = document.getElementById('casinoSlot');
      const kind = (this._seat && this._seat.kind) || '';
      const playing = r && r.game === 'bj' && r.phase === 'play';
      if (act) act.hidden = !(kind === 'bj' && playing);
      if (bet) bet.hidden = kind === 'bj' && playing;
      if (rou) rou.hidden = kind !== 'roulette' || playing;
      if (slot) slot.hidden = kind !== 'slot' || playing;
      const deal = document.getElementById('bjDeal'); if (deal) deal.hidden = kind !== 'bj' || playing;
      if (playing && r.can) {
        const set = (id, on) => { const b = document.getElementById(id); if (b) b.disabled = !on; };
        set('bjHit', !!r.can.hit); set('bjStand', !!r.can.stand); set('bjDouble', !!r.can.double); set('bjSplit', !!r.can.split);
      }
      if (title) {
        const S = this.hooks.S && this.hooks.S();
        const bet = S ? money(S, this.bet) : ('$' + this.bet);
        if (kind === 'bj' && r && r.hands && r.hands.length) {
          const you = r.hands.map((h) => h.total).join(' / ');
          title.textContent = 'You ' + you + (r.dealerTotal != null ? '   Dealer ' + r.dealerTotal : '   Dealer shows ' + (r.dealer && r.dealer[0] || ''));
        } else if (kind === 'roulette') title.textContent = 'European roulette. Bet ' + bet + ' on ' + this.rou + '.';
        else if (kind === 'slot') title.textContent = 'Slots. RTP 95.5%. Bet ' + bet + '.';
        else title.textContent = bet;
      }
      window.__casino = Object.assign({}, window.__casino, r, { bet: this.bet, kind, phase: r && r.phase || (window.__casino && window.__casino.phase) });
    },
    go(inward) {
      if (this.busyTravel) return;
      this.busyTravel = true;
      document.body.classList.add('casinofade');
      const land = this.hooks.land;
      setTimeout(() => {
        if (inward) land(this.enterAt.x, this.enterAt.z, Math.PI);
        else if (this.street && this.street.approach) land(this.street.approach.x, this.street.approach.z, this.street.face);
        document.body.classList.remove('casinofade');
        this.busyTravel = false;
        this.lock = performance.now() + 800;
      }, 280);
    },
    onStand() {
      this._seat = null; this._synced = false;
      const bar = document.getElementById('casinoBar'); if (bar) bar.hidden = true;
      document.body.classList.remove('seated');
    },
    frame(dt, env) {
      const now = performance.now();
      for (const rec of this.flying) {
        rec.t += dt / 0.32; const k = Math.min(1, rec.t), s = k * k * (3 - 2 * k);
        rec.mesh.position.lerpVectors(rec.from, rec.to, s);
      }
      this.flying = this.flying.filter((rec) => rec.t < 1);
      if (this._spin) {
        this._spin.t += dt;
        const a = this._spin.t * 9;
        this.ball.position.set(-4.3 + Math.cos(a) * 0.45, 1.02, -2.6 + Math.sin(a) * 0.45);
        this.wheel.rotation.y = a * 0.4;
        if (this._spin.t > 0.9) this._spin = null;
      }
      const P = env.P, S = env.S;
      if (S && S.country && S.country !== this._limC) { this._limC = S.country; paintRail(S.country); }
      if (!S || !S.alive || env.modalOpen || env.mapOn || this.busyTravel || now < this.lock) return;
      const inside = this.contains(P.x, P.z);
      window.__casino = Object.assign(window.__casino || {}, { inside, x: P.x, z: P.z });
      if (!inside) {
        if (!this.street) return;
        const d = Math.hypot(P.x - this.street.x, P.z - this.street.z);
        if (d < 1.02) {
          if ((S.age | 0) < 21) {
            if (!this.warned) { this.warned = true; this.hooks.toast('The door is for 21 and over.'); }
            if (this.street.approach) this.hooks.land(this.street.approach.x, this.street.approach.z, this.street.face);
            this.lock = now + 600;
          } else this.go(true);
        } else this.warned = false;
        return;
      }
      if (!P.sit && Math.hypot(P.x - this.exit.x, P.z - this.exit.z) < 0.72) { this.go(false); return; }
      const casinoSeat = P.sit && (P.sit.kind === 'bj' || P.sit.kind === 'roulette' || P.sit.kind === 'slot');
      if (casinoSeat) {
        this._seat = P.sit;
        const bar = document.getElementById('casinoBar');
        if (bar) bar.hidden = false;
        document.body.classList.add('seated');
        if (!this._synced) { this._synced = true; this.send({ game: 'bj', action: 'sync' }); }
        else if (!this.view || this.view.phase !== 'play') this.paint(this.view || { phase: 'idle' });
      }
    },
    update() {},
  };
  api.chips(500);
  api.paintReel(0, '7'); api.paintReel(1, 'B'); api.paintReel(2, 'C');
  return api;
}
