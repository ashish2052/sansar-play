// Sansar /world "look" module: ALL materials + lighting + sky live here, so switching style (A realistic / B / C) = swap this file.
// Style A: Poly Haven PBR textures (CC0) + Poly Haven HDRI sky + real sun shadows. Time of day drives sun, sky, fog, window glow.
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { grime, groundVary, createHills } from './kit.js?v=rd1';

export const PH = '/look/assets/ph';
const smooth = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };

export function createLook(renderer, scene, manager, touch) {
  const texLoader = new THREE.TextureLoader(manager);
  const aniso = Math.min(touch ? 4 : 8, renderer.capabilities.getMaxAnisotropy());
  const tcache = {};
  function tex(name, suf, srgb, tile) {
    const k = `${name}/${suf}/${tile}`; if (tcache[k]) return tcache[k];
    const t = texLoader.load(`${PH}/textures/${name}/${name}_${suf}_1k.${suf === 'diff' ? 'webp' : 'jpg'}`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / tile, 1 / tile); t.anisotropy = aniso; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return (tcache[k] = t);
  }
  // first load carries the colour map only; normal + ARM maps arrive in upgrade() after the first touch.
  // userData.ph survives material.clone(), so tinted copies upgrade too.
  let upgraded = false;
  function addMaps(m) { const { n, t } = m.userData.ph, arm = tex(n, 'arm', false, t); m.normalMap = tex(n, 'nor_gl', false, t); m.aoMap = m.roughnessMap = m.metalnessMap = arm; m.needsUpdate = true; }
  function pbr(name, tile, extra = {}) {
    const m = new THREE.MeshStandardMaterial({ map: tex(name, 'diff', true, tile), ...extra }); m.userData.ph = { n: name, t: tile };
    if (upgraded) addMaps(m); return m;
  }
  function upgrade() {
    if (upgraded) return; upgraded = true;
    const todo = new Set(Object.values(mats));
    scene.traverse((o) => { for (const m of [].concat(o.material || [])) todo.add(m); });
    const list = [...todo].filter((m) => m.userData && m.userData.ph && !m.normalMap);
    const step = () => { const m = list.pop(); if (m && !m.normalMap) addMaps(m); if (list.length) requestAnimationFrame(step); };
    step();
  }
  // five Poly Haven wall sets; the other colours are tints of the same textures (keeps first load small)
  const WALL = { plaster: ['plastered_wall', 3, 0xffffff], beige: ['plastered_wall', 3, 0xe6cd9d], green: ['plastered_wall', 3, 0xa6c4ae], blue: ['plastered_wall', 3, 0xaebfd2],
    brick: ['red_brick', 1.6, 0xffffff], brick2: ['red_brick', 1.6, 0xd8a58f], ochre: ['yellow_plaster', 3, 0xffffff], tile: ['concrete_tile_facade', 3, 0xffffff], grey: ['grey_plaster', 3, 0xffffff] };
  const mats = {}, custom = {};   // custom: materials world.js registers (sign atlas, shop interiors, awnings)
  function M(key) {
    if (custom[key]) return custom[key];
    if (mats[key]) return mats[key];
    const [kind, arg] = key.split(':'); let m;
    if (kind === 'wall') { const [n, t, c] = WALL[arg]; m = pbr(n, t, { color: c }); }
    else if (kind === 'trim') m = pbr('grey_plaster', 2, { color: 0xf2efe8 });
    else if (kind === 'frame') m = new THREE.MeshStandardMaterial({ color: 0x24282a, roughness: 0.45, metalness: 0.6 });
    else if (kind === 'glass') m = new THREE.MeshStandardMaterial({ color: 0x8fa3ad, roughness: 0.04, metalness: 0.95, envMapIntensity: 1.2 });
    else if (kind === 'lit') m = new THREE.MeshStandardMaterial({ color: 0x3a2a18, emissive: 0xffc77a, emissiveIntensity: 0.05, roughness: 0.1, metalness: 0.4 });
    else if (kind === 'shutter') m = pbr('dark_planks', 1.2, { color: 0x6f8f78 });
    else if (kind === 'rail') m = new THREE.MeshStandardMaterial({ color: 0x1d1f21, roughness: 0.5, metalness: 0.8 });
    else if (kind === 'slab') m = pbr('grey_plaster', 2);
    else if (kind === 'road') m = pbr('asphalt_02', 5);
    else if (kind === 'pave') m = pbr('concrete_pavement', 2.2);
    else if (kind === 'kerb') m = pbr('grey_plaster', 1, { color: 0xbfbcb6 });
    else if (kind === 'mark') m = new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2 });
    else if (kind === 'planks') m = pbr('dark_planks', 1.5);
    else if (kind === 'room') m = new THREE.MeshStandardMaterial({ color: 0xd9c3a0, roughness: 0.85, emissive: 0x6b4a22, emissiveIntensity: 0.35 });
    else if (kind === 'ceiling') m = new THREE.MeshBasicMaterial({ color: 0xfff0d0 });
    else if (kind === 'dark') m = new THREE.MeshStandardMaterial({ color: 0x2c2a28, roughness: 0.8 });
    else if (kind === 'cobble') m = pbr('cobblestone_pavement', 2.4, { color: 0xe6dccf });
    else if (kind === 'herring') m = pbr('concrete_pavement', 2.0, { color: 0xf0e2cc });
    else if (kind === 'grass') m = pbr('grass_path_2', 3, { color: 0xc9d8b0 });
    else if (kind === 'path') m = pbr('concrete_pavement', 1.6, { color: 0xe6cfb4 });
    else if (kind === 'concrete') m = pbr('grey_plaster', 2, { color: 0xd8d4cc });
    else if (kind === 'leaf') m = new THREE.MeshStandardMaterial({ color: 0x5c8a45, roughness: 0.85, flatShading: false });
    else if (kind === 'bark') m = new THREE.MeshStandardMaterial({ color: 0x5b4331, roughness: 0.95 });
    else if (kind === 'water') m = new THREE.MeshStandardMaterial({ color: 0x4d8fa6, roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.78, envMapIntensity: 1.5 });
    else if (kind === 'paint') m = new THREE.MeshPhysicalMaterial({ color: arg ? Number(arg) : 0xaa3322, roughness: 0.35, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.08 });
    else if (kind === 'tyre') m = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
    else if (kind === 'headlight') m = new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: 0xffeeaa, emissiveIntensity: 0.2 });
    else if (kind === 'lampglass') m = new THREE.MeshStandardMaterial({ color: 0xfff0c8, emissive: 0xffd9a0, emissiveIntensity: 0.1 });
    else if (kind === 'shopglass') m = new THREE.MeshStandardMaterial({ color: 0xaab8bf, roughness: 0.03, metalness: 1, transparent: true, opacity: 0.32, envMapIntensity: 1.4 });
    else if (kind === 'sign') m = new THREE.MeshStandardMaterial({ roughness: 0.6, emissive: 0xffffff, emissiveIntensity: 0.04 });
    else m = new THREE.MeshStandardMaterial({ color: 0xff00ff });
    if (kind === 'wall') grime(m, { amt: arg === 'tile' ? 0.6 : 1 }, touch);
    else if (kind === 'trim' || kind === 'slab' || kind === 'concrete') grime(m, { amt: 1.1 }, touch);
    else if (kind === 'kerb') grime(m, { amt: 1.2, base: 0.05 }, touch);
    else if (kind === 'grass') groundVary(m, 0.6, touch);
    m.name = key; return (mats[key] = m);
  }

  // ---- light + sky
  const sun = new THREE.DirectionalLight(0xffffff, 3); sun.castShadow = !touch;
  const SM = touch ? 1024 : 2048; sun.shadow.mapSize.set(SM, SM);
  Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 120 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const fogCol = new THREE.Color(), dayFog = new THREE.Color(0xc9d2d8), nightFog = new THREE.Color(0x0a1022), dusk = new THREE.Color(0xe8a97a), dayTop = new THREE.Color(0x6aa6de), nightTop = new THREE.Color(0x070d1c), duskTop = new THREE.Color(0xc45a3a);
  const stars = new THREE.Points((() => { const g = new THREE.BufferGeometry(), p = []; for (let i = 0; i < 700; i++) { const a = Math.random() * 6.283, e = Math.acos(Math.random() * .95 + .05); p.push(Math.sin(e) * Math.cos(a) * 900, Math.cos(e) * 900, Math.sin(e) * Math.sin(a) * 900); } g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); return g; })(),
    new THREE.PointsMaterial({ color: 0xdfe8ff, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  stars.renderOrder = -1; scene.add(stars);
  const skyTop = new THREE.Color(0x6aa6de), skyHor = new THREE.Color(0xe7eef4);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 64, 40), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: skyTop }, hor: { value: skyHor }, day: { value: 1 }, warm: { value: 0 }, sunD: { value: new THREE.Vector3(0.4, 0.8, 0.3) } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    // cumulus layer: fbm on a flat cloud plane, thinned toward the horizon, lit from the sun side
    fragmentShader: `varying vec3 vDir; uniform vec3 top; uniform vec3 hor; uniform float day; uniform float warm; uniform vec3 sunD;
      float ch(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float cn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(ch(i),ch(i+vec2(1,0)),f.x),mix(ch(i+vec2(0,1)),ch(i+vec2(1,1)),f.x),f.y);}
      float cf(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*cn(p);p=p*2.07+vec2(1.7,9.2);a*=.5;}return s;}
      void main(){ vec3 d = normalize(vDir); float h = d.y; float k = smoothstep(-0.04, 0.55, h); vec3 c = mix(hor, top, k);
        if (h > 0.0) { vec2 uv = d.xz / (h + 0.12) * 1.6; float n = cf(uv + vec2(3.0, 1.0)); float n2 = cf(uv * 2.3 + 7.0);
          float cov = smoothstep(0.5, 0.78, n * 0.8 + n2 * 0.28) * smoothstep(0.015, 0.22, h);
          float lit = 0.72 + 0.28 * smoothstep(0.3, 0.9, n2) + 0.12 * max(0.0, dot(d, sunD));
          vec3 cc = mix(vec3(0.62, 0.66, 0.72), vec3(1.0, 0.99, 0.97), lit) * mix(vec3(1.0), vec3(1.15, 0.82, 0.66), warm);
          c = mix(c, mix(c * 0.6, cc, day), cov * (0.35 + 0.6 * day)); }
        gl_FragColor = vec4(c, 1.0); }`
  }));
  sky.frustumCulled = false; sky.renderOrder = -2; scene.add(sky);
  const hills = createHills(scene);
  scene.background = new THREE.Color(0xc5d4e0);
  scene.fog = new THREE.Fog(0xc9d2d8, 80, 1100);
  let hdr = null;
  // a gradient sky prefiltered on the GPU stands in for the 1.7 MB HDR until loadSky() runs
  function quickSky() {
    const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
    es.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide,
      vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec3 vD; void main(){ float h = normalize(vD).y; vec3 c = h > 0.0 ? mix(vec3(1.25, 1.2, 1.12), vec3(0.62, 0.8, 1.15), smoothstep(0.0, 0.6, h)) : mix(vec3(0.62, 0.58, 0.52), vec3(0.32, 0.3, 0.27), smoothstep(0.0, -0.4, h)); gl_FragColor = vec4(c, 1.0); }' })));
    const rt = pm.fromScene(es, 0.03); scene.environment = rt.texture; scene.environmentIntensity = 0.45; pm.dispose();
  }
  async function loadSky() {
    hdr = await new RGBELoader(manager).loadAsync(`${PH}/hdri/palermo_sidewalk_1k.hdr`);
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = hdr;
    scene.environmentIntensity = 0.45;
  }
  const hooks = { lamps: null }; // world.js registers lamp-glow materials here
  const state = { night: 0, day: 1, hour: 12, haze: false, sunDir: new THREE.Vector3(0.4, 0.8, 0.3) };
  // hour 0-24, yearFrac 0-1 (the CORE-RULES calendar: 1 real hour = 1 game year drives the season = sun height)
  function applyTime(hour, yearFrac = 0.3) {
    const a = (hour - 6) / 12 * Math.PI, s = Math.sin(a), season = 0.12 * Math.sin(yearFrac * Math.PI * 2);
    const f = smooth(-0.06, 0.28, s), night = 1 - f; state.day = f; state.night = night; state.hour = hour;
    const d = state.sunDir;
    if (s > -0.06) d.set(-Math.cos(a) * 0.9, Math.max(0.12, s * (0.95 + season)), 0.42 + 0.15 * Math.cos(a)); else d.set(Math.cos(a) * 0.5, 0.55, -0.4);   // sun by day, moon by night
    d.normalize();
    sun.color.set(0xffffff).lerp(new THREE.Color(0xffa860), (1 - smooth(0, 0.45, s)) * f).lerp(new THREE.Color(0x7d9cff), night);
    sun.intensity = 3.2 * f + 0.9 * night;
    scene.environmentIntensity = 0.24 + 0.68 * f; scene.backgroundIntensity = 0.03 + 0.97 * smooth(-0.03, 0.4, s);
    const warm = (1 - smooth(0, 0.35, s)) * f * 0.65; fogCol.copy(nightFog).lerp(dayFog, f).lerp(dusk, warm);
    if (state.haze) fogCol.lerp(new THREE.Color(0xd9c7a2), 0.32);
    scene.fog.near = state.haze ? 46 : 80; scene.fog.far = state.viewFar != null ? state.viewFar : (state.haze ? 1200 : 1100);
    scene.fog.color.copy(fogCol);
    skyHor.copy(fogCol); skyTop.copy(nightTop).lerp(dayTop, f).lerp(duskTop, warm * 0.85);
    sky.material.uniforms.day.value = f; sky.material.uniforms.warm.value = warm; sky.material.uniforms.sunD.value.copy(d); hills.tint(f, warm);
    if (scene.background && scene.background.isColor) scene.background.copy(fogCol);
    stars.material.opacity = night * night; renderer.toneMappingExposure = 0.95 + 0.25 * night;
    M('lit').emissiveIntensity = 0.05 + 1.5 * night; M('lampglass').emissiveIntensity = 0.1 + 3 * night; M('headlight').emissiveIntensity = 0.2 + 2 * night;
    M('room').emissiveIntensity = 0.3 + 0.8 * night;
    if (hooks.lamps) hooks.lamps(night);
  }
  function followSun(px, pz) { sun.target.position.set(px, 0, pz); sun.target.updateMatrixWorld(); sun.position.copy(state.sunDir).multiplyScalar(110).add(sun.target.position); sky.position.set(px, 0, pz); stars.position.set(px, 0, pz); hills.grp.position.set(px, 0, pz); }
  return { M, custom, pbr, tex, sun, quickSky, loadSky, upgrade, applyTime, followSun, state, hooks, aniso };
}
