// Vela Cruz city: a sun-scorched river port built from three.js boxes.
// The Vela River runs east-west (water band z in [-16, 16]); the Vela Cruz
// Bridge carries the north-south avenue across it. Districts ring the river:
// Old Crossing, Canal Row, Mesa Verde (raised mesa, east), Port Vela (north),
// Neon Mile (west, the club strip), Ironworks (north-east).
import * as THREE from '../vendor/three.module.min.js';
import { WORLD, PALETTE, DISTRICTS, SHOPS, COLLECTIBLES_TOTAL } from './config.js';

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

/** Sky + sun colours for an hour of day (golden hour 17.4, night 23.6, sunset 18.0). */
export function skyFor(hour) {
  if (hour >= 6 && hour < 16) return { sky: 0x87b5d6, fog: 0x9fc3d8, sun: 0xfff2cf, amb: 0.8, sunY: 90, sunI: 1.7, fill: 0.9 };
  if (hour >= 16 && hour < 18.5) return { sky: 0xf2a35e, fog: 0xe89a5e, sun: 0xffb36b, amb: 0.7, sunY: 26, sunI: 2.3, fill: 1.0 };
  if (hour >= 18.5 && hour < 20) return { sky: 0xd96a4e, fog: 0xc96a55, sun: 0xff8a50, amb: 0.5, sunY: 10, sunI: 1.6, fill: 0.8 };
  return { sky: 0x0b1026, fog: 0x0b1026, sun: 0x8fa3ff, amb: 0.38, sunY: -20, sunI: 0.7, fill: 0.35 };
}

export function createCity(seed = 7) {
  let s = seed | 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) / 4294967296); };

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf2a35e);
  scene.fog = new THREE.Fog(0xe89a5e, 120, 420);

  const hemi = new THREE.HemisphereLight(0xffe0b3, 0x4a3a28, 0.6);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffb36b, 1.9);
  sun.position.set(-60, 26, -80);
  scene.add(sun);
  scene.add(sun.target);
  // Warm fill from the south (behind the chase camera) so car rears and
  // building faces toward the camera are lit, not black, at golden hour.
  const fill = new THREE.DirectionalLight(0xffd9a0, 1.0);
  fill.position.set(40, 50, 90);
  scene.add(fill);
  scene.add(fill.target);

  const colliders = []; // {x0,z0,x1,z1} building footprints the car cannot cross
  const shells = []; // collectible Sun Shells {x,z,mesh,taken}
  const lamps = [];

  // Ground: west bank sand, east bank mesa clay, canyon walls along the river.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.half * 2, WORLD.half * 2), new THREE.MeshStandardMaterial({ color: PALETTE.ground, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const mesa = box(150, 14, 130, 0x9c6b4a, 135, 7, 55); scene.add(mesa);
  colliders.push({ x0: 60, z0: -10, x1: 210, z1: 120 });
  // Canyon walls line both river banks (z = ±26), with a gap at the bridge (x = 0).
  for (const wz of [-26, 26]) {
    for (const [x0, x1] of [[-210, -10], [10, 210]]) {
      const w = (x1 - x0);
      scene.add(box(w, 9, 10, 0x7a5a3c, (x0 + x1) / 2, 4.5, wz));
      colliders.push({ x0, z0: wz - 5, x1, z1: wz + 5 });
    }
  }

  // River: a wide blue band east-west, just below road level, with a lighter current stripe.
  const river = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.half * 2, WORLD.riverHalf * 2), new THREE.MeshStandardMaterial({ color: 0x3a8a9e, roughness: 0.25, metalness: 0.35 }));
  river.rotation.x = -Math.PI / 2; river.position.y = 0.02; scene.add(river);
  const current = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.half * 2, 3), new THREE.MeshStandardMaterial({ color: 0x7fc4d4, roughness: 0.2, metalness: 0.4 }));
  current.rotation.x = -Math.PI / 2; current.position.y = 0.05; scene.add(current);

  // Roads: the north-south avenue (x=0) + east-west streets, with lane dashes.
  const roadMat = new THREE.MeshStandardMaterial({ color: PALETTE.road, roughness: 0.95 });
  function road(w, d, x, z) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat);
    r.rotation.x = -Math.PI / 2; r.position.set(x, 0.06, z); scene.add(r);
  }
  road(16, 420, 0, 0); road(420, 14, 0, -60); road(420, 14, 0, 60); road(420, 14, 0, 140); road(14, 420, -90, 0); road(14, 420, 90, 0);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xd8d8d8 });
  for (let z = -200; z < 200; z += 12) {
    if (Math.abs(z) < 24) continue; // the bridge has its own markings
    const d = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 4), dashMat);
    d.rotation.x = -Math.PI / 2; d.position.set(0, 0.09, z); scene.add(d);
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
  // Bridge towers with VELA CRUZ letters.
  for (const tz of [-34, 34]) {
    const t = box(2.5, 16, 2.5, 0x8a6a44, -8.5, 8, tz); scene.add(t);
    const t2 = box(2.5, 16, 2.5, 0x8a6a44, 8.5, 8, tz); scene.add(t2);
  }
  const bridgeSign = labelSprite('VELA CRUZ BRIDGE', '#ffd34d', 52);
  bridgeSign.position.set(0, 19, -34); scene.add(bridgeSign);

  // Buildings: seeded low-poly blocks along the streets, kept off roads/river.
  const spots = [];
  for (let i = 0; i < 90; i += 1) {
    const x = -195 + rnd() * 390;
    const z = -195 + rnd() * 390;
    if (Math.abs(x) < 26 && Math.abs(z) < 26) continue; // river + bridge corridor
    if (Math.abs(x) < 12 || Math.abs(z + 60) < 11 || Math.abs(z - 60) < 11 || Math.abs(z - 140) < 11) continue; // roads
    if (Math.abs(x + 90) < 11 || Math.abs(x - 90) < 11) continue;
    if (x > 55 && z > -5 && z < 125) continue; // mesa footprint
    if (spots.some((p) => Math.hypot(p.x - x, p.z - z) < 26)) continue;
    spots.push({ x, z });
  }
  const winMat = new THREE.MeshStandardMaterial({ color: 0x2c3a55, roughness: 0.4, metalness: 0.3, emissive: 0xffca6a, emissiveIntensity: 0 });
  for (const p of spots) {
    const w = 12 + rnd() * 10, d = 12 + rnd() * 10, h = 7 + rnd() * 22;
    const color = PALETTE.building[Math.floor(rnd() * PALETTE.building.length)];
    const b = box(w, h, d, color, p.x, h / 2, p.z);
    scene.add(b);
    const win = box(w * 0.7, h * 0.55, 0.3, 0x2c3a55, p.x, h * 0.55, p.z + d / 2 + 0.15);
    win.material = winMat; scene.add(win);
    colliders.push({ x0: p.x - w / 2, z0: p.z - d / 2, x1: p.x + w / 2, z1: p.z + d / 2 });
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

  // Shops: marked buildings with floating labels.
  for (const s of SHOPS) {
    const b = box(14, 8, 12, 0x6b4a2f, s.x, 4, s.z); scene.add(b);
    colliders.push({ x0: s.x - 7, z0: s.z - 6, x1: s.x + 7, z1: s.z + 6 });
    const lab = labelSprite(s.name.toUpperCase(), '#ffd34d', 46);
    lab.position.set(s.x, 10.5, s.z); scene.add(lab);
  }

  // Port Vela dock + a moored speedboat hull; palms and lamps along the avenue.
  const dock = box(18, 1, 8, 0x6b4a2f, -24, 0.6, 44); scene.add(dock);
  for (let i = 0; i < 10; i += 1) {
    const px = i % 2 === 0 ? -12 : 12;
    const pz = -160 + i * 36;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 7, 6), new THREE.MeshStandardMaterial({ color: 0x6b4a2f }));
    trunk.position.set(px, 3.5, pz); scene.add(trunk);
    const top = new THREE.Mesh(new THREE.ConeGeometry(3.2, 4.5, 7), new THREE.MeshStandardMaterial({ color: 0x3f7d3a }));
    top.position.set(px, 8.5, pz); scene.add(top);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 6), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    pole.position.set(-px, 3, pz + 6); scene.add(pole);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), new THREE.MeshStandardMaterial({ color: 0xfff2cf, emissive: 0xffdca0, emissiveIntensity: 1.6 }));
    lamp.position.set(-px, 6.2, pz + 6); scene.add(lamp);
    lamps.push(lamp);
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

  // District labels floating over the city.
  for (const d of DISTRICTS) {
    const lab = labelSprite(d.name, '#e8e2d0', 40);
    lab.position.set(d.x, 26, d.z);
    scene.add(lab);
  }

  return {
    scene, sun, hemi, colliders, shells, lamps, liftSpan,
    dockPos: { x: -24, z: 44 },
    clubPos: { x: -110, z: 46 },
    setHour(hour) {
      const s2 = skyFor(hour);
      scene.background.setHex(s2.sky);
      scene.fog.color.setHex(s2.fog);
      sun.color.setHex(s2.sun);
      sun.intensity = s2.sunI;
      sun.position.set(-60, s2.sunY, -80);
      hemi.intensity = s2.amb;
      fill.intensity = s2.fill;
      winMat.emissiveIntensity = hour >= 19 || hour < 6 ? 0.9 : 0;
    },
    update(dt, t) {
      liftSpan.position.y = -0.1 + Math.max(0, Math.sin(t * 0.15)) * 0.0; // lift span rests down; it rises during the Floodgate Job
      for (const sh of shells) if (!sh.taken) { sh.mesh.rotation.y += dt * 2; sh.mesh.position.y = 1.2 + Math.sin(t * 2 + sh.x) * 0.25; }
    },
  };
}
