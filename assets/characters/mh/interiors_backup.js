// Furnished rooms, built on the first "Go inside" and thrown away on the way out. Not part of the start-up scene.
// Family uses the same Quaternius rig as the street (avatar.js). Furniture is the Poly Haven props already in the town.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { makeBatch, homeMaterials, textPlate } from './homekit.js?v=home1';
import { createAvatar, npcLook, fixLook } from './avatar.js?v=flirt1';
import { nameLabel } from './people.js?v=guide1';
import { PH } from './look.js';

const ROOM = {
  bridge: [8, 5.2, 3.2], shelter: [8, 5, 3], slum: [3.6, 5, 2.5], shack: [3.6, 3.6, 2.3],
  oneroom: [4.2, 4.2, 2.7], flat_small: [5.4, 4.6, 2.7], flat_owned: [6.4, 5.2, 2.8],
  house_small: [5.6, 4.8, 2.7], shophouse: [6.2, 7, 3], garden: [7, 6, 3], mansion: [9, 7.5, 3.6]
};
const FLOOR = { bridge: 'dirt', shelter: 'cement', slum: 'cement', shack: 'dirt', oneroom: 'cement', flat_small: 'cement', flat_owned: 'tilefl', house_small: 'tilefl', shophouse: 'cement', garden: 'parquet', mansion: 'marble' };
const WALL = { mansion: 'marble', garden: 'wall:plaster', flat_owned: 'wall:plaster', house_small: 'wall:beige', shophouse: 'wall:brick2', flat_small: 'cement', oneroom: 'cement', shelter: 'concrete', slum: 'tinblue', shack: 'tinrust', bridge: 'concrete' };
const FEM = /mother|sister|grandmother|aunt|wife|daughter|niece|girl|woman/;
const PROP = { bench: 'painted_wooden_bench', table: 'outdoor_table_chair_set_01', planter: 'planter_box_01', crate: 'wooden_crate_01' };
const cache = {};
let loader = null;

function worldOf(lx, lz, ry, cx, cz) {
  const c = Math.cos(ry), s = Math.sin(ry);
  return { x: cx + lx * c + lz * s, z: cz - lx * s + lz * c };
}
function richOf(type) { return type === 'mansion' || type === 'garden'; }
function poorOf(type) { return type === 'slum' || type === 'shack' || type === 'bridge' || type === 'shelter' || type === 'oneroom'; }

// Age picks the body. Wealth picks the clothes: a mansion mixes suit and formal, a slum is plain worn cloth, never one shared suit or the work uniform.
export function familyLook(m, type, n) {
  const rel = String(m.rel || '');
  const g = FEM.test(rel) ? 'f' : 'm';
  const age = +m.age || 30;
  const look = npcLook({ id: (m.name || 'kin') + '|' + rel, gender: g === 'f' ? 'woman' : 'man', age, nationality: 'Nepal', job: '' });
  const i = (n || 0) % 4;
  if (age < 13) {
    look.hs = g === 'f' ? 1 : 2; look.tp = g === 'f' ? 1 : 2; look.bt = g === 'f' ? 1 : 2; look.sh = g === 'f' ? 1 : 2;
    if (poorOf(type)) { look.tc = [6, 11, 5, 2][i]; look.bc = [11, 5, 6, 2][i]; look.sc = 11; }
    else if (richOf(type)) { look.tc = [1, 3, 10, 2][i]; look.bc = [3, 2, 1, 10][i]; look.sc = 2; }
    else { look.tc = [1, 7, 5, 6][i]; look.bc = [2, 5, 0, 6][i]; look.sc = 0; }
  } else if (richOf(type)) {
    const part = ((n || 0) % 2 === 0) ? 2 : 7;
    look.hs = part; look.tp = part; look.bt = part; look.sh = part;
    look.tc = g === 'f' ? [4, 3, 1, 13][i] : [3, 2, 4, 1][i];
    look.bc = [2, 3, 0, 2][i]; look.sc = 2;
  } else if (poorOf(type)) {
    const part = g === 'f' ? 1 : [4, 3, 2, 4][i];
    look.hs = g === 'f' ? 1 : [4, 2, 3, 2][i];
    look.tp = part; look.bt = part; look.sh = part === 3 ? 2 : part;
    look.tc = [6, 11, 5, 2][i]; look.bc = [11, 5, 6, 0][i]; look.sc = 11;
  } else {
    const part = g === 'f' ? [1, 2, 1, 0][i] : [2, 3, 0, 2][i];
    look.hs = part; look.tp = part; look.bt = part; look.sh = Math.min(part, 2);
    look.tc = [1, 7, 5, 10][i]; look.bc = [2, 5, 0, 3][i];
  }
  return fixLook(look);
}

function furnPlan(type, w, d) {
  const rich = richOf(type), poor = poorOf(type);
  const benchZ = -d / 2 + 1.15;
  const seatZ = benchZ + 0.46;
  const side = w / 2 - 0.42;
  const sideRoom = side - Math.min(1.2, w / 2 - 0.5);
  const items = [{ id: 'bench', x: 0, z: benchZ, ry: 0, max: Math.min(poor ? 1.55 : 1.9, w - 1.5) }];
  if (!poor && seatZ + 1.2 < d / 2 - 0.7) items.push({ id: 'table', x: 0, z: seatZ + 1.2, ry: 0, max: Math.min(0.95, w * 0.28), nochairs: true });
  if (sideRoom >= 0.75) {
    items.push({ id: 'planter', x: side, z: benchZ + 0.15, ry: 0.2, max: 0.48 });
    items.push({ id: poor ? 'crate' : 'planter', x: -side, z: benchZ + 0.1, ry: -0.15, max: 0.42 });
  } else {
    const z1 = Math.min(d / 2 - 0.6, seatZ + 1.4);
    items.push({ id: 'crate', x: 0, z: z1, ry: 0.25, max: 0.4 });
    const z2 = Math.min(d / 2 - 0.42, z1 + 0.7);
    if (z2 - z1 > 0.45) items.push({ id: 'planter', x: 0, z: z2, ry: 0, max: 0.36 });
  }
  return { items, benchZ, seatZ };
}

function noticeTex(view, money) {
  const loans = view.loans || [];
  const lines = [
    [view.hood || 'Home', 40, '#2a1d12'],
    ['Purse  ' + money(view.hh.purse), 30, '#2a1d12'],
    ['Coming in  ' + money(view.inc), 26, '#2a1d12'],
    ['Rent ' + money(view.rent) + '   loans ' + money(view.inst), 26, '#2a1d12'],
    [loans.length ? loans.map((l) => l.lender.split('(')[0].trim()).slice(0, 2).join(', ') : 'No loan on the wall', 22, '#6b4423'],
    [view.b ? view.b.name : 'No family business', 22, '#6b4423']
  ];
  return textPlate(lines, { w: 512, h: 320, bg: '#f7f1e4', pad: 18 });
}

async function modelOf(name) {
  if (!loader) loader = new GLTFLoader();
  if (!cache[name]) {
    const g = await loader.loadAsync(`${PH}/models/${name}/${name}_1k.gltf`);
    g.scene.updateMatrixWorld(true);
    cache[name] = { scene: g.scene, bb: new THREE.Box3().setFromObject(g.scene) };
  }
  return cache[name];
}

export function createInteriors({ scene, look }) {
  homeMaterials(look);
  let root = null, meta = null, job = 0;

  function drop() {
    if (meta && meta.kin) for (const k of meta.kin) { try { k.av.dispose(); } catch (e) { /* rig already gone */ } }
    if (!root) { meta = null; return; }
    scene.remove(root);
    root.traverse((o) => {
      if (o.userData.ph) return;
      if (o.geometry) o.geometry.dispose();
      if (o.userData.own && o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
    });
    root = null; meta = null;
  }
  function clear() { job++; drop(); }

  async function enter(type, ctx) {
    const my = ++job;
    drop();
    const door = ctx.door;
    const [w, d, h] = ROOM[type] || ROOM.flat_small;
    const ry = door.ry || 0, cx = door.cx, cz = door.cz;
    const B = makeBatch();
    B.at(cx, cz, ry);
    const wall = WALL[type] || 'cement';
    const back = -d / 2;
    if (type === 'bridge') {
      B.box('concrete', 0.18, 2.5, d, -w / 2, 1.25, 0);
      B.box('concrete', 0.18, 2.5, d, w / 2, 1.25, 0);
      B.box('concrete', w, 2.5, 0.18, 0, 1.25, back);
      B.box('concrete', w, 0.22, d, 0, 2.55, 0);
    } else {
      B.flat(FLOOR[type] || 'cement', w, d, 0, 0.03, 0);
      B.box(wall, 0.12, h, d, -w / 2, h / 2, 0);
      B.box(wall, 0.12, h, d, w / 2, h / 2, 0);
      B.box(wall, w, h, 0.12, 0, h / 2, back);
      B.box('frame', 0.08, h, 0.08, -0.7, h / 2, d / 2);
      B.box('frame', 0.08, h, 0.08, 0.7, h / 2, d / 2);
      B.box('frame', 1.6, 0.08, 0.08, 0, h - 0.2, d / 2);
      B.box(wall, w, 0.08, d, 0, h, 0);
    }
    const built = B.build((k) => look.M(k));
    built.name = 'home-interior';
    const mine = new THREE.Group();
    mine.name = 'home-interior';
    mine.userData.job = my;
    mine.add(built);

    const plan = furnPlan(type, w, d);
    const fam = ctx.fam || [];
    const spots = [];
    const kin = [];
    const seatN = fam.length > 1 ? Math.min(2, fam.length - 1) : fam.length;
    const byAge = fam.map((m, i) => i).sort((a, b) => (fam[b].age || 0) - (fam[a].age || 0));
    const sitting = new Set(byAge.slice(0, seatN));
    const standers = fam.map((_, i) => i).filter((i) => !sitting.has(i));

    fam.forEach((m, i) => {
      const sit = sitting.has(i);
      let lx, lz, slot;
      if (sit) {
        slot = byAge.indexOf(i);
        lx = (slot - (seatN - 1) / 2) * 0.52;
        lz = plan.seatZ;
      } else {
        slot = standers.indexOf(i);
        const rank = Math.floor(slot / 2), left = slot % 2 === 0;
        lx = (left ? -1 : 1) * Math.min(0.92 + rank * 0.58, w / 2 - 0.5);
        lz = plan.seatZ + (Math.abs(lx) > w / 2 - 0.7 ? 0.36 : 0);
      }
      const look = familyLook(m, type, i);
      const av = createAvatar(look);
      const g = new THREE.Group();
      g.add(av.root);
      const tag = nameLabel(m.name.split(' ')[0], m.rel || '');
      tag.scale.set(0.66, 0.15, 1);
      tag.position.set(slot % 2 === 0 ? -0.24 : 0.24, (sit ? 1.58 : 1.92) + (slot % 2) * 0.26, 0);
      tag.userData.own = 1;
      g.add(tag);
      const at = worldOf(lx, lz, ry, cx, cz);
      g.position.set(at.x, 0.02, at.z);
      g.rotation.y = ry;
      mine.add(g);
      kin.push({ av, sit, who: m, g, tag, lz });
      spots.push({ x: at.x, z: at.z, r: 0.85, text: 'Talk to ' + m.name.split(' ')[0], kind: 'talk', who: m });
    });

    const propNames = plan.items.map((it) => PROP[it.id]);
    let props = 0;
    const propPts = [];
    try {
      const loaded = await Promise.all(propNames.map((n) => modelOf(n)));
      if (my !== job) { for (const k of kin) { try { k.av.dispose(); } catch (e) { /* left already */ } } return null; }
      plan.items.forEach((it, i) => {
        const src = loaded[i];
        const holder = new THREE.Group();
        const clone = src.scene.clone(true);
        if (it.nochairs) {
          const drop = [];
          clone.traverse((o) => { if (o.name && /chair/i.test(o.name)) drop.push(o); });
          drop.forEach((o) => { if (o.parent) o.parent.remove(o); });
        }
        clone.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.userData.ph = 1; } });
        const bb = new THREE.Box3().setFromObject(clone);
        clone.position.y = -bb.min.y;
        const wide = Math.max(0.2, bb.max.x - bb.min.x, bb.max.z - bb.min.z);
        const s = Math.min(1, it.max / wide);
        holder.add(clone);
        holder.scale.setScalar(s);
        holder.userData.ph = 1;
        const at = worldOf(it.x, it.z, ry, cx, cz);
        holder.position.set(at.x, 0, at.z);
        holder.rotation.y = ry + it.ry;
        mine.add(holder);
        if (it.id !== 'bench') propPts.push({ x: at.x, z: at.z, r: it.id === 'table' ? 0.42 : 0.32 });
        props++;
      });
    } catch (e) { console.warn('home props', e && e.message); }

    const bed = worldOf(-1.05, plan.benchZ - 0.15, ry, cx, cz);
    const stove = worldOf(richOf(type) ? 1.15 : 0.7, 0.2, ry, cx, cz);
    const board = worldOf(0, back + 0.15, ry, cx, cz);
    spots.push({ x: bed.x, z: bed.z, r: 0.7, text: 'Sleep', kind: 'sleep' });
    spots.push({ x: stove.x, z: stove.z, r: 0.7, text: 'Eat', kind: 'eat' });
    spots.push({ x: board.x, z: board.z, r: 0.8, text: 'Household budget', kind: 'budget' });
    const out = worldOf(0, d / 2 - 0.45, ry, cx, cz);
    spots.push({ x: out.x, z: out.z, r: 1.2, text: 'Go outside', kind: 'out' });

    const tex = noticeTex(ctx.view, ctx.money);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.72), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
    const bp = worldOf(Math.min(w / 2 - 0.2, 1.55), 0.05, ry, cx, cz);
    plane.position.set(bp.x, 1.35, bp.z);
    plane.rotation.y = ry + Math.PI / 2;
    plane.userData.own = 1;
    mine.add(plane);

    const cols = [], t = 0.2, sides = [[-w / 2, t, d], [w / 2, t, d]];
    for (const [lx, ww, dd] of sides) {
      const a = worldOf(lx, 0, ry, cx, cz);
      cols.push({ t: 'box', x0: a.x - (Math.abs(Math.cos(ry)) > 0.5 ? ww : dd) / 2, x1: a.x + (Math.abs(Math.cos(ry)) > 0.5 ? ww : dd) / 2, z0: a.z - (Math.abs(Math.cos(ry)) > 0.5 ? dd : ww) / 2, z1: a.z + (Math.abs(Math.cos(ry)) > 0.5 ? dd : ww) / 2, y1: h, interior: true });
    }
    const bk = worldOf(0, back, ry, cx, cz);
    cols.push({ t: 'box', x0: bk.x - w / 2, x1: bk.x + w / 2, z0: bk.z - t, z1: bk.z + t, y1: h, interior: true });

    scene.add(mine);
    root = mine;
    try { await Promise.all(kin.map((k) => k.av.ready)); } catch (e) { console.warn('home people', e && e.message); }
    if (my !== job) { if (root === mine) drop(); return null; }
    mine.updateMatrixWorld(true);
    for (const k of kin) {
      if (!k.av.look) continue;
      if (k.sit) k.av.setSeat(0.45);
      k.av.update(0.7, 0, !!k.sit);
    }
    const tags = kin.map((k) => k.tag).filter(Boolean);
    const tv = new THREE.Vector3();
    for (let n = 0; n < 6; n++) {
      let moved = false;
      mine.updateMatrixWorld(true);
      for (let i = 0; i < tags.length; i++) for (let j = i + 1; j < tags.length; j++) {
        tags[i].getWorldPosition(tv); const ax = tv.x, ay = tv.y, az = tv.z;
        tags[j].getWorldPosition(tv);
        if (Math.hypot(ax - tv.x, az - tv.z) < 0.7 && Math.abs(ay - tv.y) < 0.18) {
          (ay <= tv.y ? tags[i] : tags[j]).position.y += 0.24;
          moved = true;
        }
      }
      if (!moved) break;
    }
    let gap = 9;
    for (const p of propPts) for (const k of kin) gap = Math.min(gap, Math.hypot(p.x - k.g.position.x, p.z - k.g.position.z) - p.r - 0.34);
    const seatClear = kin.filter((k) => k.sit).every((k) => k.lz >= plan.benchZ + 0.34);
    const lit = new THREE.PointLight(0xfff2dc, 1.05, 12, 2);
    const lp = worldOf(0, Math.min(d / 2 - 0.55, plan.benchZ + 2.6), ry, cx, cz);
    lit.position.set(lp.x, 1.85, lp.z);
    mine.add(lit);
    const standZ = Math.min(d / 2 - 0.72, Math.max(0.35, plan.seatZ + 1.7));
    const stand = worldOf(0, standZ, ry, cx, cz);
    const dist = Math.max(0.55, Math.min(richOf(type) ? 3.3 : 2.2, d / 2 - standZ - 0.18));
    const fov = w < 5.2 ? 70 : 52;
    const dress = kin.map((k) => k.av.look ? { g: k.av.look.g, ag: k.av.look.ag, tp: k.av.look.tp, hs: k.av.look.hs, tc: k.av.look.tc } : null);
    meta = { type, spots, cols, stand, yaw: ry, cam: { pitch: 0.28, dist, fov }, kin, props, gap, seatClear, dress, peopleReady: kin.every((k) => k.av.mesh && k.av.mesh.visible) };
    return meta;
  }

  return {
    get on() { return !!meta; },
    get spots() { return meta ? meta.spots : []; },
    get cols() { return meta ? meta.cols : []; },
    get meta() { return meta; },
    enter, leave: clear,
    update(dt) { if (!meta || !meta.kin) return; for (const k of meta.kin) if (k.av && k.av.look) k.av.update(dt, 0, !!k.sit); }
  };
}
