// Vela Cruz city: a sun-scorched river port built from three.js boxes.
// The Vela River runs east-west (water band z in [-16, 16]); the Vela Cruz
// Bridge carries the north-south avenue across it. Districts ring the river:
// Old Crossing, Canal Row, Mesa Verde (raised mesa, east), Port Vela (north),
// Neon Mile (west, the club strip), Ironworks (north-east).
import * as THREE from '../vendor/three.module.min.js';
import { WORLD, PALETTE, DISTRICTS, SHOPS, COLLECTIBLES_TOTAL } from './config.js';
import { createSky, createWater, createRain, createDust, makeGlowTexture, makeStreakTexture } from './atmosphere.js';
import { facadeTexture, strataTexture, groundTexture } from './textures.js';

function box(w, h, d, color, x, y, z, opts = {}) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.05, emissive: opts.emissive || 0x000000, emissiveIntensity: opts.ei || 1 }),
  );
  m.position.set(x, y, z);
  if (opts.ry) m.rotation.y = opts.ry;
  return m;
}

function labelSprite(text, color = '#ffd34d', size = 44) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const g = c.getContext('2d');
  g.font = `800 ${size}px system-ui, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = color;
  g.fillText(text, 256, 48);
  const tex = new THREE.CanvasTexture(c);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(22, 4.1, 1);
  return sp;
}

/** Sun + light values for an hour of day. The sky dome owns the colours;
 *  this drives the lights so faces toward the camera stay lit, not black.
 *  Golden hour is 17.4 (cover), early afternoon 14.5 is hard pale light,
 *  dawn 6.2 is blue-hour mist, night 23.6 is sodium + cyan. */
export function skyFor(hour) {
  if (hour >= 6 && hour < 7.5) return { sky: 0x7d9ab5, fog: 0xc3ccd2, sun: 0xffd9a0, amb: 0.55, sunY: 14, sunI: 1.1, fill: 0.6, fogD: 0.0045 };
  if (hour >= 7.5 && hour < 16) return { sky: 0x9fc3d8, fog: 0xc4d2d6, sun: 0xfff2cf, amb: 0.85, sunY: 85, sunI: 1.6, fill: 0.9, fogD: 0.0022 };
  if (hour >= 16 && hour < 18.5) return { sky: 0xb08a62, fog: 0xcf9a72, sun: 0xffb36b, amb: 0.6, sunY: 24, sunI: 2.0, fill: 0.9, fogD: 0.0028 };
  if (hour >= 18.5 && hour < 20) return { sky: 0x8a5a52, fog: 0xb0705e, sun: 0xff8a50, amb: 0.45, sunY: 9, sunI: 1.4, fill: 0.7, fogD: 0.0030 };
  return { sky: 0x0d1730, fog: 0x0d1730, sun: 0x8fa3ff, amb: 0.35, sunY: -20, sunI: 0.5, fill: 0.3, fogD: 0.0035 };
}

/** Window atlas: a grid of windows, some lit warm, some dark — the emissive
 *  map every building window strip shares. At night it lights the city. */
function windowAtlas() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#10151f'; g.fillRect(0, 0, 128, 256);
  for (let y = 8; y < 248; y += 22) {
    for (let x = 8; x < 120; x += 18) {
      const lit = Math.random() < 0.42;
      g.fillStyle = lit ? (Math.random() < 0.75 ? '#ffc46a' : '#9fd8ef') : '#1a2230';
      g.fillRect(x, y, 12, 14);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createCity(seed = 7) {
  let s = seed | 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) / 4294967296); };

  const scene = new THREE.Scene();
  // The sky dome owns the background; the scene colour is only a fallback.
  scene.background = new THREE.Color(0x9fc3d8);
  scene.fog = new THREE.FogExp2(0xc4d2d6, 0.0022);
  const sky = createSky(scene);

  const hemi = new THREE.HemisphereLight(0xffe0b3, 0x4a3a28, 0.6);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffb36b, 1.9);
  sun.position.set(-60, 26, -80);
  scene.add(sun);
  scene.add(sun.target);
  // v3: the sun's shadow frustum follows the player (followSun), and the
  // night gets a warm point light that rides with the player so the on-foot
  // figure reads as a person, not a dark silhouette.
  const playerLight = new THREE.PointLight(0xffd9a0, 0, 30, 1.5);
  playerLight.position.set(0, 4, 0);
  scene.add(playerLight);
  let sunYeff = 26;
  // Warm fill from the south (behind the chase camera) so car rears and
  // building faces toward the camera are lit, not black, at golden hour.
  const fill = new THREE.DirectionalLight(0xffd9a0, 1.0);
  fill.position.set(40, 50, 90);
  scene.add(fill);
  scene.add(fill.target);

  const colliders = []; // {x0,z0,x1,z1} building footprints the car cannot cross
  const shells = []; // collectible Sun Shells {x,z,mesh,taken}
  const lamps = [];
  const streaks = []; // wet-road lamp streaks (visible only when wet)
  const pools = []; // warm light pools on the ground under lamps (night only)

  // Shared rock strata material: canyon walls + mesa sides read as layered
  // rock instead of flat orange slabs. One texture, two repeats.
  const strataTex = strataTexture();
  strataTex.repeat.set(6, 1);
  const strataMat = new THREE.MeshStandardMaterial({ map: strataTex, roughness: 0.95, metalness: 0 });
  const mesaTex = strataTexture();
  mesaTex.repeat.set(3, 1); // taller bands on the mesa side faces
  const mesaMat = new THREE.MeshStandardMaterial({ map: mesaTex, roughness: 0.95, metalness: 0 });
  const screeMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 });

  // Atmosphere pieces this city owns: shader river, rain, dust, glow sprites.
  const water = createWater(scene, WORLD.half, WORLD.riverHalf);
  const glowTex = makeGlowTexture();
  const streakTex = makeStreakTexture();
  const rain = createRain(scene, streakTex);
  const dust = createDust(scene, glowTex);

  // Ground: speckled dirt, not a flat brown plane. Receives shadows (v3).
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.half * 2, WORLD.half * 2), new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const mesa = new THREE.Mesh(new THREE.BoxGeometry(150, 14, 130), mesaMat);
  mesa.position.set(135, 7, 55); mesa.castShadow = true; mesa.receiveShadow = true; scene.add(mesa);
  colliders.push({ x0: 60, z0: -10, x1: 210, z1: 120 });
  // Mesa Verde shanties + a water tower on the mesa top — the flat top read
  // as an empty orange slab from any high camera; structures break it up.
  // v3: more of them, plus an antenna mast and a billboard, so the top reads
  // as a lived-in district from the wide shot.
  const mesaTop = [
    [10, 6, 8, 0x8a6a4a, 90, 17, 20], [8, 5, 10, 0x7a5a3c, 150, 16.5, 60],
    [7, 4, 6, 0xb98a5a, 70, 16, 0], [9, 5, 7, 0x8a6a4a, 180, 16.5, 100],
    [6, 4, 6, 0x6b4a2f, 110, 16, 100], [3, 2, 3, 0x6b4a2f, 95, 15, 80],
    [4, 2.5, 3, 0x6b4a2f, 165, 15.2, 30], [3, 2, 4, 0x6b4a2f, 130, 15, 10],
    [8, 4, 7, 0x9c7a50, 140, 16, 30], [6, 3.5, 6, 0xb98a5a, 100, 15.8, 45],
    [5, 3, 5, 0x7a5a3c, 170, 15.5, 75], [7, 4, 5, 0x8a6a4a, 85, 16, 95],
  ];
  for (const [w, h, d, c, x, y, z] of mesaTop) {
    const m = box(w, h, d, c, x, y, z);
    m.castShadow = true; m.receiveShadow = true; scene.add(m);
  }
  // Antenna mast + billboard on the mesa top: vertical accents for the skyline.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 22, 6), new THREE.MeshStandardMaterial({ color: 0x3a3a3a }));
  mast.position.set(120, 25, 40); mast.castShadow = true; scene.add(mast);
  const mastBar = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: 0x3a3a3a }));
  mastBar.position.set(120, 32, 40); scene.add(mastBar);
  const billboard = box(14, 6, 0.8, 0x2e7d6b, 150, 17, 20, { emissive: 0x2e7d6b, ei: 0.25 });
  billboard.rotation.y = 0.5; billboard.castShadow = true; scene.add(billboard);
  const billboardLegs = box(1, 3, 1, 0x3a3a3a, 150, 15.5, 20);
  scene.add(billboardLegs);
  const towerLegs = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 8, 6), new THREE.MeshStandardMaterial({ color: 0x4a4a4a }));
  towerLegs.position.set(120, 18, 90); scene.add(towerLegs);
  const towerTank = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 4, 10), new THREE.MeshStandardMaterial({ color: 0x7d9ab5, roughness: 0.6, metalness: 0.3 }));
  towerTank.position.set(120, 24, 90); towerTank.castShadow = true; scene.add(towerTank);
  // Canyon walls line both river banks (z = ±26), with a gap at the bridge (x = 0).
  // v3: strata-textured rock + scree strips + boulders at the base, so the
  // walls read as canyon, not painted flats.
  for (const wz of [-26, 26]) {
    for (const [x0, x1] of [[-210, -10], [10, 210]]) {
      const w = (x1 - x0);
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 9, 10), strataMat);
      wall.position.set((x0 + x1) / 2, 4.5, wz);
      wall.castShadow = true; wall.receiveShadow = true;
      scene.add(wall);
      colliders.push({ x0, z0: wz - 5, x1, z1: wz + 5 });
      // Scree strip at the wall base + scattered boulders.
      // v3.3: boulders use their OWN prng (seed+999) — drawing them from the
      // city's rnd() shifted the stream and moved every building, including
      // one into the river in front of the boat camera.
      const brnd = (() => { let s2 = (seed + 999) | 0; return () => { s2 = (s2 * 1664525 + 1013904223) | 0; return ((s2 >>> 0) / 4294967296); }; })();
      const scree = new THREE.Mesh(new THREE.PlaneGeometry(w, 7), screeMat);
      scree.rotation.x = -Math.PI / 2;
      scree.position.set((x0 + x1) / 2, 0.05, wz + (wz < 0 ? 8 : -8));
      scree.receiveShadow = true;
      scene.add(scree);
      for (let b = 0; b < 9; b += 1) {
        const bw = 1.5 + brnd() * 2.5;
        const boulder = new THREE.Mesh(new THREE.BoxGeometry(bw, bw * 0.7, bw), new THREE.MeshStandardMaterial({ color: 0x7d5a3a, roughness: 1 }));
        boulder.position.set(x0 + 8 + brnd() * (w - 16), bw * 0.3, wz + (wz < 0 ? 8 : -8) + (brnd() - 0.5) * 3);
        boulder.rotation.y = brnd() * 3;
        boulder.castShadow = true;
        scene.add(boulder);
      }
    }
  }

  // Roads: the north-south avenue (x=0) + east-west streets, with lane dashes.
  // roadMat is shared so setWet() can make every road glossy in one place.
  const roadMat = new THREE.MeshStandardMaterial({ color: PALETTE.road, roughness: 0.95 });
  function road(w, d, x, z) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat);
    r.rotation.x = -Math.PI / 2; r.position.set(x, 0.06, z); r.receiveShadow = true; scene.add(r);
  }
  road(16, 420, 0, 0); road(420, 14, 0, -60); road(420, 14, 0, 60); road(420, 14, 0, 140); road(14, 420, -90, 0); road(14, 420, 90, 0);
  // Sidewalks: pale strips flanking the avenue + the two main cross streets.
  const walkMat = new THREE.MeshStandardMaterial({ color: 0x9a8a6e, roughness: 1 });
  function walk(w, d, x, z) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), walkMat);
    r.rotation.x = -Math.PI / 2; r.position.set(x, 0.07, z); r.receiveShadow = true; scene.add(r);
  }
  walk(3, 400, -9.5, 0); walk(3, 400, 9.5, 0);
  walk(400, 3, 0, -68.5); walk(400, 3, 0, -51.5);
  walk(400, 3, 0, 51.5); walk(400, 3, 0, 68.5);
  // v3: all road paint in ONE InstancedMesh — avenue centre dashes, edge
  // lines, and zebra crosswalks at the three avenue intersections. Paint is
  // what makes a road read as a road at street level (cover + night shots).
  {
    const markGeo = new THREE.PlaneGeometry(1, 1);
    const markMat = new THREE.MeshBasicMaterial({ color: 0xd8d8d8 });
    const marks = [];
    const put = (x, z, w, d) => marks.push([x, z, w, d]);
    for (let z = -200; z < 200; z += 12) {
      if (Math.abs(z) < 24) continue; // the bridge has its own markings
      put(0, z, 0.5, 4); // avenue centre dashes
    }
    for (const cz of [-60, 60, 140]) {
      for (const dz of [-10, 10]) {
        for (let x = -7; x <= 7; x += 2) put(x, cz + dz, 0.7, 3.2); // zebra across the avenue
      }
      for (let x = -200; x < 200; x += 12) {
        if (Math.abs(x) < 14) continue;
        put(x, cz, 4, 0.5); // cross-street centre dashes
      }
    }
    for (const z0 of [[-200, -24], [24, 200]]) {
      put(-7.4, (z0[0] + z0[1]) / 2, 0.25, z0[1] - z0[0]); // avenue edge lines
      put(7.4, (z0[0] + z0[1]) / 2, 0.25, z0[1] - z0[0]);
    }
    const inst = new THREE.InstancedMesh(markGeo, markMat, marks.length);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    const pos = new THREE.Vector3();
    const sc = new THREE.Vector3();
    marks.forEach(([x, z, w, d], i) => {
      pos.set(x, 0.09, z); sc.set(w, d, 1);
      m4.compose(pos, q, sc);
      inst.setMatrixAt(i, m4);
    });
    inst.instanceMatrix.needsUpdate = true;
    scene.add(inst);
    // Bridge deck dashes (on the deck top, y=0.12).
    const deckMarks = [];
    for (let z = -60; z <= 60; z += 12) deckMarks.push(z);
    const deckInst = new THREE.InstancedMesh(markGeo, markMat, deckMarks.length);
    deckMarks.forEach((z, i) => {
      pos.set(0, 0.12, z); sc.set(0.5, 4, 1);
      m4.compose(pos, q, sc);
      deckInst.setMatrixAt(i, m4);
    });
    deckInst.instanceMatrix.needsUpdate = true;
    scene.add(deckInst);
  }

  // Vela Cruz Bridge: deck over the river (top at y≈0.1, so cars drive ON it),
  // railings, pillars in the water beside the deck, and a lift span (the
  // "BRIDGE LIFT" mechanic) that can rise for boats.
  const deck = box(16, 0.5, WORLD.bridgeHalf * 2, 0x3a3b40, 0, -0.15, 0); scene.add(deck);
  const liftSpan = box(15, 0.5, 18, 0x4a4b52, 0, -0.1, 0); scene.add(liftSpan);
  for (const sx of [-8.4, 8.4]) { const rail = box(0.5, 1.4, WORLD.bridgeHalf * 2, 0x6b5a3a, sx, 1.0, 0); scene.add(rail); }
  for (const pz of [-10, 10]) {
    for (const px of [-10, 10]) {
      const p = box(3, 8, 3, 0x8a7a5e, px, -2, pz); scene.add(p);
    }
  }
  // Bridge towers with VELA CRUZ letters, joined by a crossbeam so each
  // pair reads as a gate, not two bare posts.
  for (const tz of [-34, 34]) {
    const t = box(2.5, 16, 2.5, 0x8a6a44, -8.5, 8, tz); t.castShadow = true; scene.add(t);
    const t2 = box(2.5, 16, 2.5, 0x8a6a44, 8.5, 8, tz); t2.castShadow = true; scene.add(t2);
    const beam = box(19.5, 1.6, 2, 0x8a6a44, 0, 15.2, tz); beam.castShadow = true; scene.add(beam);
  }
  const bridgeSign = labelSprite('VELA CRUZ BRIDGE', '#ffd34d', 52);
  bridgeSign.position.set(0, 19, -34); scene.add(bridgeSign);

  // Buildings: seeded low-poly blocks along the streets, kept off roads/river.
  // One InstancedMesh for all facades (instanceColor per district palette)
  // and one for the window strips — two draw calls instead of ~80.
  const spots = [];
  for (let i = 0; i < 90; i += 1) {
    const x = -195 + rnd() * 390;
    const z = -195 + rnd() * 390;
    if (Math.abs(z) < 32) continue; // v3.3: the river runs the full width —
    // the old filter only excluded the bridge rectangle, so blocks could
    // spawn IN the river (one blocked the boat camera).
    if (Math.abs(x) < 12 || Math.abs(z + 60) < 11 || Math.abs(z - 60) < 11 || Math.abs(z - 140) < 11) continue; // roads
    if (Math.abs(x + 90) < 11 || Math.abs(x - 90) < 11) continue;
    if (x > 55 && z > -5 && z < 125) continue; // mesa footprint
    if (spots.some((p) => Math.hypot(p.x - x, p.z - z) < 26)) continue;
    spots.push({ x, z });
  }
  // Downtown towers: a taller cluster near the bridge so the skyline reads.
  const towers = [
    { x: -34, z: -44, w: 16, d: 16, h: 38 }, { x: 30, z: -46, w: 14, d: 15, h: 30 },
    { x: -30, z: 44, w: 15, d: 14, h: 34 }, { x: 34, z: 42, w: 16, d: 16, h: 44 },
    { x: 44, z: -84, w: 14, d: 14, h: 28 },
  ];
  const allSpots = spots.map((p) => ({ ...p, w: 12 + rnd() * 10, d: 12 + rnd() * 10, h: 7 + rnd() * 22 }))
    .concat(towers);
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  // v3: the facade atlas gives every building face windows, floor lines and
  // a shopfront band — the blocks stop reading as plain boxes. The atlas is
  // light so the per-district instanceColor still provides the hue.
  const facadeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.05, map: facadeTexture() });
  const facades = new THREE.InstancedMesh(unitBox, facadeMat, allSpots.length);
  facades.castShadow = true;
  facades.receiveShadow = true;
  const winMat = new THREE.MeshStandardMaterial({
    color: 0x2c3a55, roughness: 0.4, metalness: 0.3,
    emissive: 0xffffff, emissiveMap: windowAtlas(), emissiveIntensity: 0,
  });
  const windows = new THREE.InstancedMesh(unitBox, winMat, allSpots.length);
  {
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const sc = new THREE.Vector3();
    const col = new THREE.Color();
    allSpots.forEach((p, i) => {
      const color = PALETTE.building[Math.floor(rnd() * PALETTE.building.length)];
      pos.set(p.x, p.h / 2, p.z); sc.set(p.w, p.h, p.d);
      m4.compose(pos, q, sc); facades.setMatrixAt(i, m4);
      facades.setColorAt(i, col.setHex(color));
      pos.set(p.x, p.h * 0.55, p.z + p.d / 2 + 0.15); sc.set(p.w * 0.7, p.h * 0.55, 0.3);
      m4.compose(pos, q, sc); windows.setMatrixAt(i, m4);
      colliders.push({ x0: p.x - p.w / 2, z0: p.z - p.d / 2, x1: p.x + p.w / 2, z1: p.z + p.d / 2 });
    });
    facades.instanceMatrix.needsUpdate = true;
    if (facades.instanceColor) facades.instanceColor.needsUpdate = true;
    windows.instanceMatrix.needsUpdate = true;
  }
  scene.add(facades);
  scene.add(windows);

  // v3: roof props on the downtown towers — AC boxes, vents and an antenna
  // per tower, so the skyline has a roofline instead of flat caps.
  for (const t of towers) {
    const ac1 = box(3, 1.2, 2.4, 0x5a5a5a, t.x - 3, t.h + 0.6, t.z - 2);
    ac1.castShadow = true; scene.add(ac1);
    const ac2 = box(2.2, 1, 2, 0x6b6b6b, t.x + 3.5, t.h + 0.5, t.z + 3);
    ac2.castShadow = true; scene.add(ac2);
    const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 2.2, 8), new THREE.MeshStandardMaterial({ color: 0x4a4a4a }));
    vent.position.set(t.x + 1, t.h + 1.1, t.z - 4); vent.castShadow = true; scene.add(vent);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 7, 6), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    ant.position.set(t.x - 5, t.h + 3.5, t.z + 4); scene.add(ant);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff2020, emissiveIntensity: 2 }));
    beacon.position.set(t.x - 5, t.h + 7.2, t.z + 4); scene.add(beacon);
  }

  // Neon Mile: Club Voltage + neon signs (emissive boxes that glow at night).
  const club = box(26, 12, 16, 0x241a33, -110, 6, 55); scene.add(club);
  colliders.push({ x0: -123, z0: 47, x1: -97, z1: 63 });
  const neonColors = [0xff2e88, 0x00e5ff, 0xffd400, 0x7cff4d, 0xff6b00];
  neonColors.forEach((c, i) => {
    const sign = box(8 + (i % 2) * 3, 1.6, 0.6, 0x111111, -118 + i * 4.5, 10 + (i % 2) * 2.5, 46.8, { emissive: c, ei: 2.2 });
    scene.add(sign);
  });
  const clubSign = labelSprite('CLUB VOLTAGE', '#ff2e88', 56);
  clubSign.position.set(-110, 15.5, 46); scene.add(clubSign);
  const mileSign = labelSprite('NEON MILE', '#00e5ff', 48);
  mileSign.position.set(-110, 20, 60); scene.add(mileSign);
  // v3: the club's north face gets a lit window strip (it was a black wall
  // in the night shot) + a paved plaza in front, so the wet-road look reads
  // where the player stands.
  const clubWinMat = new THREE.MeshStandardMaterial({ color: 0x2c3a55, roughness: 0.4, metalness: 0.3, emissive: 0xffffff, emissiveMap: windowAtlas(), emissiveIntensity: 0, side: THREE.DoubleSide });
  const clubWindows = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 9),
    clubWinMat,
  );
  clubWindows.position.set(-110, 5, 46.8);
  clubWindows.rotation.y = Math.PI;
  scene.add(clubWindows);
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(36, 20), roadMat);
  plaza.rotation.x = -Math.PI / 2; plaza.position.set(-110, 0.05, 38); plaza.receiveShadow = true;
  scene.add(plaza);
  // v3: freestanding neon billboards near the club — the night shot had one
  // neon sign; now the whole street glows.
  function neonBoard(x, z, w, color, ry = 0) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 7, 6), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    pole.position.set(x, 3.5, z); pole.castShadow = true; scene.add(pole);
    const panel = box(w, 2.2, 0.5, 0x111111, x, 8, z, { emissive: color, ei: 2.4 });
    panel.rotation.y = ry; scene.add(panel);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.set(7, 4, 1);
    glow.position.set(x, 8, z); scene.add(glow);
  }
  neonBoard(-88, 38, 9, 0xff2e88, 0.4);
  neonBoard(-132, 62, 8, 0x00e5ff, -0.5);
  neonBoard(-96, 74, 7, 0xffd400, 0.2);

  // Shops: marked buildings with floating labels.
  for (const s of SHOPS) {
    const b = box(14, 8, 12, 0x6b4a2f, s.x, 4, s.z); scene.add(b);
    colliders.push({ x0: s.x - 7, z0: s.z - 6, x1: s.x + 7, z1: s.z + 6 });
    const lab = labelSprite(s.name.toUpperCase(), '#ffd34d', 46);
    lab.position.set(s.x, 10.5, s.z); scene.add(lab);
  }

  // Port Vela dock + a moored speedboat hull; street lamps along the avenue.
  // No palms — Vela Cruz is a river port, not a beach. Each lamp gets a glow
  // sprite (so it reads at night) and a wet-road streak plane (rain shots).
  // v3: each lamp also gets a warm light pool on the ground (night only) —
  // pools of light are what make a night street read as lit, not black.
  const poolGeo = new THREE.CircleGeometry(2.4, 18);
  function addLampPool(x, z) {
    const pool = new THREE.Mesh(poolGeo, new THREE.MeshBasicMaterial({ color: 0xffdca0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(x, 0.09, z);
    scene.add(pool);
    pools.push(pool);
  }
  const dock = box(18, 1, 8, 0x6b4a2f, -24, 0.6, 44); scene.add(dock);
  for (let i = 0; i < 10; i += 1) {
    const px = i % 2 === 0 ? -12 : 12;
    const pz = -160 + i * 36;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 6, 6), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    pole.position.set(-px, 3, pz + 6); scene.add(pole);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), new THREE.MeshStandardMaterial({ color: 0xfff2cf, emissive: 0xffdca0, emissiveIntensity: 1.6 }));
    lamp.position.set(-px, 6.2, pz + 6); scene.add(lamp);
    lamps.push(lamp);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffdca0, transparent: true, opacity: 0.55, depthWrite: false }));
    glow.scale.set(4.5, 4.5, 1);
    glow.position.set(-px, 6.2, pz + 6); scene.add(glow);
    const streak = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 7),
      new THREE.MeshBasicMaterial({ map: streakTex, color: 0xffdca0, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide }),
    );
    streak.rotation.x = -Math.PI / 2;
    streak.position.set(-px, 0.1, pz + 6);
    scene.add(streak);
    streaks.push(streak);
    addLampPool(-px, pz + 6);
  }

  // Two lamps flanking Club Voltage's north face — the club district has no
  // avenue lamps, and without them the night shot is a black wall.
  for (const [lx, lz] of [[-100, 40], [-120, 40]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 6, 6), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    pole.position.set(lx, 3, lz); scene.add(pole);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), new THREE.MeshStandardMaterial({ color: 0xfff2cf, emissive: 0xffdca0, emissiveIntensity: 1.6 }));
    lamp.position.set(lx, 6.2, lz); scene.add(lamp);
    lamps.push(lamp);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffdca0, transparent: true, opacity: 0.55, depthWrite: false }));
    glow.scale.set(4.5, 4.5, 1);
    glow.position.set(lx, 6.2, lz); scene.add(glow);
    const streak = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 7),
      new THREE.MeshBasicMaterial({ map: streakTex, color: 0xffdca0, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide }),
    );
    streak.rotation.x = -Math.PI / 2;
    streak.position.set(lx, 0.1, lz);
    scene.add(streak);
    streaks.push(streak);
    addLampPool(lx, lz);
  }

  // Port Vela gantry cranes + container stacks — the industrial silhouette
  // that says "working river port" in one glance from the wide shot.
  function gantryCrane(x, z, ry = 0) {
    const g = new THREE.Group();
    const steel = new THREE.MeshStandardMaterial({ color: 0xc96a2e, roughness: 0.6, metalness: 0.4 });
    for (const lx of [-6, 6]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(1.6, 19, 1.6), steel);
      leg.position.set(lx, 9.5, 0); g.add(leg);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(15, 1.6, 2.2), steel);
    beam.position.set(0, 19, 0); g.add(beam);
    const jib = new THREE.Mesh(new THREE.BoxGeometry(20, 1.2, 1.6), steel);
    jib.position.set(8, 19.5, 0); g.add(jib);
    const cable = new THREE.Mesh(new THREE.BoxGeometry(0.25, 7, 0.25), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    cable.position.set(14, 15.5, 0); g.add(cable);
    const hook = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), new THREE.MeshStandardMaterial({ color: 0x333333 }));
    hook.position.set(14, 11.5, 0); g.add(hook);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(3, 2.4, 2.6), new THREE.MeshStandardMaterial({ color: 0x2e7d6b }));
    cab.position.set(0, 17, 0); g.add(cab);
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    scene.add(g);
    return g;
  }
  gantryCrane(-72, 132, 0.35);
  gantryCrane(48, 138, -0.3);
  const containerColors = [0xc96a2e, 0x2e7d6b, 0x8a4a4a, 0x4a6b8a, 0xb98a2e];
  function containerStack(x, z, rows, cols) {
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const m = box(6, 2.6, 2.6, containerColors[(r * cols + c) % containerColors.length], x + c * 6.4, 1.3 + r * 2.7, z);
        scene.add(m);
      }
    }
    colliders.push({ x0: x - 3, z0: z - 2, x1: x + cols * 6.4, z1: z + 2 });
  }
  containerStack(-96, 118, 2, 4);
  containerStack(62, 122, 3, 3);
  containerStack(-40, 150, 2, 3);
  // Ironworks silos (north-east).
  for (const [sx, sz] of [[118, 148], [128, 148]]) {
    const silo = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 16, 10), new THREE.MeshStandardMaterial({ color: 0x8a7a5e, roughness: 0.8, metalness: 0.2 }));
    silo.position.set(sx, 8, sz); scene.add(silo);
  }

  // Distant canyon ridges: flat silhouette layers that melt into the fog so
  // the world keeps going past the last street. (Fog does the depth work.)
  const ridgeMat = new THREE.MeshBasicMaterial({ color: 0x6b5a48 });
  for (const [rx, rz, rw, rh] of [[0, -268, 560, 52], [0, 268, 560, 44], [268, 0, 20, 58], [-268, 0, 20, 48]]) {
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(rw, rh, 20), ridgeMat);
    ridge.position.set(rx, rh / 2 - 4, rz);
    scene.add(ridge);
  }

  // 20 Sun Shell collectibles: small glowing gold spheres, river/mesa/port.
  const shellGeo = new THREE.SphereGeometry(0.55, 10, 10);
  const shellMat = new THREE.MeshStandardMaterial({ color: 0xffd34d, emissive: 0xffb020, emissiveIntensity: 1.4 });
  for (let i = 0; i < COLLECTIBLES_TOTAL; i += 1) {
    const x = -180 + rnd() * 360;
    const z = -180 + rnd() * 360;
    if (Math.abs(z) < 20) continue;
    const m = new THREE.Mesh(shellGeo, shellMat);
    m.position.set(x, 1.2, z);
    scene.add(m);
    shells.push({ x, z, mesh: m, taken: false });
  }

  // District labels floating over the city — low enough to read from a
  // chase camera without floating in the sky.
  for (const d of DISTRICTS) {
    const lab = labelSprite(d.name, '#e8e2d0', 40);
    lab.scale.set(16, 3.0, 1);
    lab.position.set(d.x, 15, d.z);
    scene.add(lab);
  }

  let wet = false;
  return {
    scene, sun, hemi, colliders, shells, lamps, liftSpan,
    sky, water, rain, dust,
    dockPos: { x: -24, z: 44 },
    clubPos: { x: -110, z: 46 },
    /** Wet roads: glossy dark asphalt + visible lamp streaks. Dry: matte. */
    setWet(on) {
      wet = on;
      roadMat.roughness = on ? 0.25 : 0.95;
      roadMat.metalness = on ? 0.55 : 0.05;
      for (const s of streaks) s.material.opacity = on ? 0.55 : 0;
    },
    setHour(hour) {
      const s2 = skyFor(hour);
      const pal = sky.setHour(hour);
      scene.background.setHex(s2.sky);
      scene.fog.color.setHex(pal.fog);
      scene.fog.density = s2.fogD;
      sun.color.setHex(s2.sun);
      sun.intensity = s2.sunI;
      sunYeff = Math.max(s2.sunY, 30); // never light from below the horizon
      sun.position.set(-60, sunYeff, -80);
      hemi.intensity = s2.amb;
      fill.intensity = s2.fill;
      // Windows glow after dark / before dawn; the atlas does the rest.
      // v3: brighter (1.7) + the club face joins in, and lamp pools + the
      // player light switch on with the dark.
      const night = (hour >= 19 || hour < 6.5);
      winMat.emissiveIntensity = night ? 1.7 : 0;
      clubWinMat.emissiveIntensity = night ? 1.7 : 0;
      for (const p of pools) p.material.opacity = night ? 0.32 : (hour >= 17.5 && hour < 19 ? 0.14 : 0);
      playerLight.intensity = night ? 3.0 : (hour >= 17.5 && hour < 19 ? 0.7 : 0);
      // Water takes the sky + sun so the river mirrors the hour.
      water.setSky(pal.fog, sky.uniforms.uSunDir.value, s2.sun);
    },
    /** Keep the sun (and its shadow frustum) centred on the player. */
    followSun(px, pz) {
      sun.position.set(px - 78, sunYeff, pz - 104);
      sun.target.position.set(px, 0, pz);
      sun.target.updateMatrixWorld();
    },
    /** Park the warm player light over the on-foot figure (night shots). */
    setPlayerLight(x, z) {
      playerLight.position.set(x, 4.5, z);
    },
    update(dt, t) {
      liftSpan.position.y = -0.1 + Math.max(0, Math.sin(t * 0.15)) * 0.0; // lift span rests down; it rises during the Floodgate Job
      for (const sh of shells) if (!sh.taken) { sh.mesh.rotation.y += dt * 2; sh.mesh.position.y = 1.2 + Math.sin(t * 2 + sh.x) * 0.25; }
      rain.update(dt);
      dust.update(dt, t);
    },
  };
}
