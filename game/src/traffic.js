// Traffic + pedestrians: cars loop the avenue and cross streets, pedestrians
// walk the sidewalks. Both are real moving objects the player can see, dodge
// and (on foot) pass — the cover and night shots both need them in frame.
import * as THREE from '../vendor/three.module.min.js';

export function makeCarMesh(color, police = false) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.3 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.75, 4.4), bodyMat);
  body.position.y = 0.65; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.65, 2.2), new THREE.MeshStandardMaterial({ color: 0x18202e, roughness: 0.3, metalness: 0.5 }));
  cabin.position.set(0, 1.3, -0.2); g.add(cabin);
  if (police) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.2, 4.42), new THREE.MeshStandardMaterial({ color: 0x1a4fd6 }));
    stripe.position.y = 0.75; g.add(stripe);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.4), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xff2233, emissiveIntensity: 1.5 }));
    bar.position.set(0, 1.72, -0.2); g.add(bar);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  for (const [x, z] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.42, z); g.add(w);
  }
  return g;
}

const TRAFFIC_COLORS = [0xc9a227, 0x7e8ba0, 0x4a6b8a, 0x8a4a4a, 0x5a7d4a, 0xd8d8d8, 0x3a3a3a, 0xb98a68];

export function createTraffic(scene, seed = 11) {
  let s = seed | 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) / 4294967296); };

  // Lanes: avenue x = ±4 (both directions), cross streets z = -60/60/140, x = ±90.
  const routes = [
    { axis: 'z', lane: -4, from: -200, to: 200, dir: 1 },
    { axis: 'z', lane: 4, from: 200, to: -200, dir: -1 },
    { axis: 'x', lane: -60, from: -200, to: 200, dir: 1 },
    { axis: 'x', lane: 60, from: 200, to: -200, dir: -1 },
    { axis: 'x', lane: 140, from: -200, to: 200, dir: 1 },
    { axis: 'z', lane: -90, from: -200, to: 200, dir: 1 },
    { axis: 'z', lane: 90, from: 200, to: -200, dir: -1 },
    { axis: 'x', lane: -140, from: 200, to: -200, dir: -1 },
  ];
  const cars = [];
  for (let i = 0; i < 18; i += 1) {
    const r = routes[i % routes.length];
    const mesh = makeCarMesh(TRAFFIC_COLORS[i % TRAFFIC_COLORS.length]);
    scene.add(mesh);
    cars.push({ route: r, t: rnd() * 400 - 200, speed: 9 + rnd() * 7, mesh });
  }

  // Pedestrians: simple two-box figures strolling the sidewalks.
  const peds = [];
  const shirtColors = [0xd94f4f, 0x4f7dd9, 0x7dd94f, 0xd9c24f, 0xb04fd9, 0xe8e8e8];
  for (let i = 0; i < 28; i += 1) {
    const g = new THREE.Group();
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.4), new THREE.MeshStandardMaterial({ color: shirtColors[i % shirtColors.length] }));
    shirt.position.y = 1.05; g.add(shirt);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), new THREE.MeshStandardMaterial({ color: 0xd9a986 }));
    head.position.y = 1.8; g.add(head);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.35), new THREE.MeshStandardMaterial({ color: 0x2a2f3a }));
    legs.position.y = 0.35; g.add(legs);
    scene.add(g);
    const side = i % 2 === 0 ? -1 : 1;
    peds.push({
      mesh: g, x: side * (8 + rnd() * 60), z: -180 + rnd() * 360,
      dir: rnd() > 0.5 ? 1 : -1, speed: 1 + rnd() * 1.2, side,
    });
  }

  function placeCar(c) {
    const { route } = c;
    if (route.axis === 'z') { c.mesh.position.set(route.lane, 0, c.t); c.mesh.rotation.y = route.dir > 0 ? 0 : Math.PI; }
    else { c.mesh.position.set(c.t, 0, route.lane); c.mesh.rotation.y = route.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
  }

  return {
    cars, peds,
    update(dt) {
      for (const c of cars) {
        c.t += c.route.dir * c.speed * dt;
        if (c.t > 205) c.t = -205;
        if (c.t < -205) c.t = 205;
        placeCar(c);
      }
      for (const p of peds) {
        p.z += p.dir * p.speed * dt;
        if (p.z > 195) { p.z = 195; p.dir = -1; }
        if (p.z < -195) { p.z = -195; p.dir = 1; }
        p.mesh.position.set(p.x, 0, p.z);
        p.mesh.rotation.y = p.dir > 0 ? 0 : Math.PI;
        p.mesh.position.y = Math.abs(Math.sin(p.z * 2)) * 0.05;
      }
    },
  };
}
