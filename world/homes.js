// Neighbourhood streets in the empty fields, one named group per street so the streamer treats each as a cell.
// The player's own door is a separate group that stays loaded; the interior (interiors.js) is built only on entry.
import * as THREE from 'three';
import { makeBatch, homeMaterials, textPlate } from './homekit.js?v=home1';

const NAME = {
  hillside: 'Hillside Estates', laxmi: 'Laxmi Garden Road', eastgate: 'Eastgate Colony', brickfield: 'Brickfield Row',
  newmarket: 'New Market Lane', kiln: 'Kiln Road', riverside: 'Riverside Lane', tintown: 'Tin Town'
};

function fwd(ry) { return [Math.sin(ry), Math.cos(ry)]; }
function doorAt(x, z, ry, d) {
  const [fx, fz] = fwd(ry), dist = d / 2 + 2.1;
  return { x: x + fx * dist, z: z + fz * dist, ax: x + fx * (dist + 2.4), az: z + fz * (dist + 2.4), face: Math.atan2(-fx, -fz) };
}

function shell(B, wall, roof, w, d, h, o = {}) {
  const t = 0.2, door = o.door == null ? 1.05 : o.door;
  B.box(wall, t, h, d, -w / 2, h / 2, 0);
  B.box(wall, t, h, d, w / 2, h / 2, 0);
  B.box(wall, w, h, t, 0, h / 2, -d / 2);
  if (door > 0) B.wall(wall, -w / 2, w / 2, 0, h, d / 2, t, [[-door / 2, door / 2, 0, Math.min(2.15, h - 0.3)]]);
  else B.box(wall, w, h, t, 0, h / 2, d / 2);
  if (door > 0) B.door(0, door, Math.min(2.15, h - 0.3), d / 2, { leaf: o.leaf || 'planks', step: o.step !== false });
  B.box(roof, w + 0.6, o.roofH || 0.22, d + 0.6, 0, h + (o.roofH || 0.22) / 2, 0);
  if (o.win !== false && h > 2.4) {
    const y = Math.min(h - 0.7, 2.4);
    if (w > 3.2) B.win(-w * 0.28, y, Math.min(1.1, w * 0.22), Math.min(1.2, h * 0.35), d / 2, o.win || {});
    if (w > 6) B.win(w * 0.28, y, Math.min(1.1, w * 0.22), Math.min(1.2, h * 0.35), d / 2, o.win || {});
  }
}

function colBox(colliders, x, z, w, d, h, tag) {
  const c = { t: 'box', x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, y1: h, home: tag || '' };
  colliders.push(c);
  return c;
}

function streetSign(look, parent, x, z, title) {
  const tex = textPlate([[title, 48, '#2a1d12'], ['a Sansar neighbourhood', 22, '#6b5438']], { w: 512, h: 180, align: 'center', bg: '#f4ecd8' });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.1), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }));
  board.position.set(x, 2.4, z); board.userData.keep = 1;
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.4, 0.1), look.M('frame'));
  post.position.set(x, 1.2, z); post.userData.keep = 1;
  parent.add(board, post);
}

function road(B, x0, x1, z, width = 7) {
  const x = (x0 + x1) / 2, w = Math.abs(x1 - x0);
  B.at(x, z, 0);
  B.flat('pave', w, width, 0, 0.04, 0);
  B.flat('mark', w * 0.92, 0.12, 0, 0.05, 0);
}

function finish(B, look, name) {
  const g = B.build((k) => look.M(k));
  g.name = name;
  return g;
}

// One enterable door. keep = always loaded (the streamer must not turn it back on after we hide it).
function ownHouse(scene, look, colliders, buildings, spec) {
  const B = makeBatch();
  B.at(spec.x, spec.z, spec.ry || 0);
  spec.draw(B);
  const g = finish(B, look, 'door-' + spec.type);
  g.traverse((o) => { if (o.isMesh) o.userData.keep = 1; });
  scene.add(g);
  const d = doorAt(spec.x, spec.z, spec.ry || 0, spec.d);
  const col = spec.solid === false ? null : colBox(colliders, spec.x, spec.z, spec.w, spec.d, spec.h, spec.type);
  // no buildings[] entry: these meshes are marked keep, and a streamed stand-in would draw a second house on top
  return { type: spec.type, hood: spec.hood, group: g, col, hide: spec.hide !== false, w: spec.w, d: spec.d, h: spec.h, ry: spec.ry || 0, cx: spec.x, cz: spec.z, ...d };
}

function fillerRow(scene, look, colliders, buildings, name, houses) {
  const B = makeBatch();
  for (const h of houses) {
    B.at(h.x, h.z, h.ry || 0);
    shell(B, h.wall, h.roof, h.w, h.d, h.h, h.opt || {});
    colBox(colliders, h.x, h.z, h.w, h.d, h.h, '');
    buildings.push({ name, kind: 'home', group: name, wall: 'plaster', H: h.h, w: h.w, box: { x0: h.x - h.w / 2, x1: h.x + h.w / 2, z0: h.z - h.d / 2, z1: h.z + h.d / 2, y1: h.h } });
  }
  const g = finish(B, look, name);
  scene.add(g);
  return g;
}

export function buildHomes({ scene, look, places, colliders, buildings, mapGeo }) {
  homeMaterials(look);
  const doors = {};
  const add = (spec) => { doors[spec.type] = ownHouse(scene, look, colliders, buildings, spec); };

  // Hillside, close to town: walled mansions. Road runs west from the ring along z = 6.
  {
    const B = makeBatch(); road(B, -70, -185, 6);
    const g = finish(B, look, 'hood-hillside'); scene.add(g);
    streetSign(look, g, -78, 12, NAME.hillside);
  }
  add({
    type: 'mansion', hood: 'hillside', x: -140, z: -12, ry: 0, w: 16, d: 12, h: 8, wall: 'plaster',
    draw(B) {
      shell(B, 'wall:plaster', 'wall:tile', 16, 12, 8, { door: 1.6, leaf: 'woodlt', win: { chajja: true } });
      B.box('marble', 4, 0.2, 2, 0, 0.1, 7.2);
      B.wall('wall:plaster', -14, 14, 0, 1.5, 11, 0.25, [[-1.6, 1.6, 0, 1.5]]);
      B.box('wall:plaster', 0.4, 2.4, 0.4, -1.8, 1.2, 11);
      B.box('wall:plaster', 0.4, 2.4, 0.4, 1.8, 1.2, 11);
      B.box('leafy', 3, 1.4, 3, -10, 0.7, 4); B.box('leafy', 2.4, 1.1, 2.4, 10, 0.55, 2);
    }
  });
  fillerRow(scene, look, colliders, buildings, 'hood-hillside-houses', [
    { x: -108, z: -10, w: 11, d: 9, h: 7, wall: 'wall:plaster', roof: 'wall:tile' },
    { x: -176, z: -10, w: 12, d: 9, h: 7, wall: 'wall:beige', roof: 'wall:tile' }
  ]);

  // Laxmi Garden Road, the next stretch west.
  {
    const B = makeBatch(); road(B, -185, -290, 6); const g = finish(B, look, 'hood-laxmi'); scene.add(g);
    streetSign(look, g, -188, 12, NAME.laxmi);
  }
  add({
    type: 'garden', hood: 'laxmi', x: -236, z: -8, ry: 0, w: 12, d: 10, h: 6.2, wall: 'plaster',
    draw(B) {
      shell(B, 'wall:beige', 'wall:brick', 12, 10, 6.2, { win: { chajja: true } });
      B.flat('grass', 18, 16, 0, 0.02, 1);
      B.box('leafy', 2.2, 1.6, 2.2, -7, 0.8, 3); B.box('leafy', 1.6, 1.2, 1.6, 7, 0.6, 2);
      B.box('path', 2.2, 0.06, 6, 0, 0.05, 7);
    }
  });
  fillerRow(scene, look, colliders, buildings, 'hood-laxmi-houses', [
    { x: -198, z: -7, w: 10, d: 8, h: 5.5, wall: 'wall:plaster', roof: 'wall:brick' },
    { x: -274, z: -7, w: 10, d: 8, h: 5.5, wall: 'wall:green', roof: 'wall:brick' }
  ]);

  // Eastgate, then Brickfield Row further along the same east road.
  {
    const B = makeBatch(); road(B, 60, 250, 22); const g = finish(B, look, 'hood-eastgate'); scene.add(g);
    streetSign(look, g, 68, 14, NAME.eastgate);
  }
  add({
    type: 'house_small', hood: 'eastgate', x: 140, z: 40, ry: Math.PI, w: 8, d: 7, h: 6, wall: 'brick',
    draw(B) { shell(B, 'wall:brick', 'tin', 8, 7, 6, { win: { grill: true } }); }
  });
  add({
    type: 'flat_owned', hood: 'eastgate', x: 205, z: 42, ry: Math.PI, w: 14, d: 9, h: 11, wall: 'plaster',
    draw(B) { shell(B, 'wall:plaster', 'concrete', 14, 9, 11, { door: 1.3, win: { chajja: true } }); B.box('concrete', 2, 0.8, 1.2, 4, 11.5, -1); }
  });
  fillerRow(scene, look, colliders, buildings, 'hood-eastgate-houses', [
    { x: 108, z: 40, ry: Math.PI, w: 8, d: 7, h: 6, wall: 'wall:brick2', roof: 'tin' },
    { x: 172, z: 40, ry: Math.PI, w: 9, d: 7, h: 9, wall: 'wall:plaster', roof: 'concrete' },
    { x: 242, z: 40, ry: Math.PI, w: 8, d: 7, h: 6, wall: 'wall:beige', roof: 'tin' }
  ]);

  {
    const B = makeBatch(); road(B, 250, 325, 22); const g = finish(B, look, 'hood-brickfield'); scene.add(g);
    streetSign(look, g, 258, 14, NAME.brickfield);
  }
  add({
    type: 'flat_small', hood: 'brickfield', x: 292, z: 38, ry: Math.PI, w: 8, d: 7, h: 8, wall: 'plaster',
    draw(B) { shell(B, 'wall:grey', 'concrete', 8, 7, 8, { win: { grill: true } }); }
  });
  fillerRow(scene, look, colliders, buildings, 'hood-brickfield-houses', [
    { x: 262, z: 38, ry: Math.PI, w: 7, d: 6, h: 7, wall: 'wall:grey', roof: 'concrete' },
    { x: 318, z: 38, ry: Math.PI, w: 6, d: 6, h: 6, wall: 'wall:ochre', roof: 'tin' }
  ]);

  // South of the bazaar: New Market, Kiln Road, then the far riverside.
  {
    const B = makeBatch(); road(B, -20, 130, 292); const g = finish(B, look, 'hood-newmarket'); scene.add(g);
    const L = makeBatch(); L.at(0, 262, 0); L.flat('pave', 7, 62, 0, 0.04, 0);
    scene.add(finish(L, look, 'hood-southlink'));
    streetSign(look, g, 8, 284, NAME.newmarket);
  }
  add({
    type: 'shophouse', hood: 'newmarket', x: 55, z: 274, ry: 0, w: 8, d: 9, h: 7, wall: 'brick',
    draw(B) {
      shell(B, 'wall:brick2', 'tin', 8, 9, 7, { door: 1.4, win: { grill: true } });
      B.box('planks', 3.2, 0.9, 1.2, 0, 0.45, 5.2);
      B.box('trim', 3.4, 0.08, 1.4, 0, 0.92, 5.2);
    }
  });
  fillerRow(scene, look, colliders, buildings, 'hood-newmarket-houses', [
    { x: 18, z: 274, w: 7, d: 8, h: 6, wall: 'wall:brick', roof: 'tin', opt: { win: { grill: true } } },
    { x: 92, z: 274, w: 7, d: 8, h: 6.5, wall: 'wall:ochre', roof: 'tin', opt: { win: { grill: true } } }
  ]);

  {
    const B = makeBatch(); road(B, 140, 240, 292); const g = finish(B, look, 'hood-kiln'); scene.add(g);
    streetSign(look, g, 148, 284, NAME.kiln);
  }
  add({
    type: 'oneroom', hood: 'kiln', x: 190, z: 276, ry: 0, w: 5, d: 5, h: 3.1, wall: 'plaster',
    draw(B) { shell(B, 'cement', 'tinrust', 5, 5, 3.1, { door: 0.9, win: { grill: true, chajja: false } }); }
  });
  fillerRow(scene, look, colliders, buildings, 'hood-kiln-houses', [
    { x: 158, z: 276, w: 4.6, d: 4.6, h: 3, wall: 'cement', roof: 'tinrust' },
    { x: 222, z: 276, w: 5, d: 4.8, h: 3.1, wall: 'wall:ochre', roof: 'tin' }
  ]);

  // Far edge, a long walk: Tin Town, then Riverside Lane and the bridge.
  {
    const B = makeBatch(); road(B, -340, -160, 292);
    B.at(-328, 300, 0); B.flat('water', 14, 70, 0, 0.02, 0);
    const g = finish(B, look, 'hood-riverside'); scene.add(g);
    streetSign(look, g, -250, 284, NAME.riverside);
    streetSign(look, g, -300, 284, NAME.tintown);
  }
  add({
    type: 'shack', hood: 'tintown', x: -300, z: 274, ry: 0, w: 4.4, d: 4.2, h: 2.5, wall: 'tin',
    draw(B) { shell(B, 'tinrust', 'tinblue', 4.4, 4.2, 2.5, { door: 0.8, roofH: 0.12, win: false, step: false }); }
  });
  add({
    type: 'slum', hood: 'riverside', x: -250, z: 274, ry: 0, w: 4.2, d: 6, h: 2.7, wall: 'tin',
    draw(B) { shell(B, 'tinblue', 'tinrust', 4.2, 6, 2.7, { door: 0.85, roofH: 0.1, win: false }); B.box('concrete', 1.1, 0.5, 1.1, 3.2, 0.25, 1); }
  });
  add({
    type: 'shelter', hood: 'riverside', x: -200, z: 276, ry: 0, w: 10, d: 6, h: 3.2, wall: 'concrete',
    draw(B) { shell(B, 'concrete', 'concrete', 10, 6, 3.2, { door: 1.2, win: false }); }
  });
  add({
    type: 'bridge', hood: 'riverside', x: -330, z: 312, ry: 0, w: 9, d: 6, h: 3.6, wall: 'concrete', solid: false, hide: false,
    draw(B) {
      B.box('concrete', 10, 0.45, 7, 0, 3.5, 0);
      B.box('concrete', 0.55, 3.5, 0.55, -4.4, 1.75, -2.8);
      B.box('concrete', 0.55, 3.5, 0.55, 4.4, 1.75, -2.8);
      B.box('concrete', 0.55, 3.5, 0.55, -4.4, 1.75, 2.8);
      B.box('concrete', 0.55, 3.5, 0.55, 4.4, 1.75, 2.8);
      B.flat('dirt', 8, 5, 0, 0.03, 0);
    }
  });

  const labels = [
    ['hillside', -140, -28], ['laxmi', -236, -26], ['eastgate', 170, 8], ['brickfield', 292, 8],
    ['newmarket', 55, 308], ['kiln', 190, 308], ['tintown', -300, 258], ['riverside', -230, 308]
  ].map(([id, x, z]) => ({ id, name: NAME[id], x, z }));
  for (const h of labels) places.push({ id: 'hood-' + h.id, label: h.name, verb: h.name, x: h.x, z: h.z, r: 0, color: 0x6a5a42 });

  for (const r of [[-160, 6, 230, 7], [190, 22, 270, 7], [55, 292, 160, 7], [190, 292, 100, 7], [-250, 292, 180, 7], [0, 262, 7, 62]]) {
    (mapGeo.townRoads ||= []).push(r);
  }

  places.push({ id: 'rentals', label: 'Rental office', verb: 'See listings', x: 262, z: 30, r: 3.4, color: 0x8a5a32, approach: { x: 262, z: 24 }, face: Math.PI });
  let current = '';
  function place(S) {
    const type = S && S.hh && S.hh.home && S.hh.home.type;
    const d = doors[type] || doors.shelter;
    if (!d) return;
    let p = places.find((q) => q.id === 'home');
    if (!p) { p = { id: 'home', color: 0xe08b5a, top: 3 }; places.push(p); }
    p.x = d.x; p.z = d.z; p.r = 4.2; p.verb = 'Go inside'; p.label = 'Home';
    p.approach = { x: d.ax, z: d.az }; p.face = d.face; p.hood = d.hood;
    current = d.type;
  }
  return { doors, labels, names: NAME, place, get current() { return current; } };
}
