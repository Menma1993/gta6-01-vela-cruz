// Player vehicles: the red Solano GT (drivable, drift, damage), the on-foot
// figure, and the green Riverhawk speedboat (stealable at the Port Vela dock).
// F enters/exits; near a parked car or the dock boat, F steals it instead.
import * as THREE from '../vendor/three.module.min.js';
import { PLAYER, CAR, BOAT } from './config.js';

function buildCarMesh(color) {
  const g = new THREE.Group();
  // F3: hero car — "Solano GT". Low, wide sports coupe: a shallow main body, a
  // raked bonnet wedge, a short greenhouse pushed rearward, a flat decklid under
  // the wing. Deep clearcoat paint that actually picks up the PMREM sunset env,
  // headlights and tail bar glowing against golden hour, wide wing on struts.
  const paintMat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.18, metalness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.08, envMapIntensity: 0.7 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(CAR.width, 0.66, CAR.length), paintMat);
  body.position.y = 0.66; g.add(body);
  // Raked bonnet wedge over the front axle — the long tapering nose.
  const hood = new THREE.Mesh(new THREE.BoxGeometry(CAR.width * 0.94, 0.16, 1.5), paintMat);
  hood.rotation.x = 0.09; hood.position.set(0, 0.94, 1.5); g.add(hood);
  // Low greenhouse: shorter, lower, shifted back and tipped nose-down.
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0e14, roughness: 0.08, metalness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.05, envMapIntensity: 0.5 });
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.32, 1.15), glassMat);
  cabin.rotation.x = 0.1; cabin.position.set(0, 1.00, -0.55); g.add(cabin);
  // Sloped fastback rear glass, dropping ~0.25 m from cabin rear-top down to the decklid.
  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.9), glassMat);
  rearGlass.rotation.x = -0.28;
  rearGlass.position.set(0, 0.97, -1.52); g.add(rearGlass);
  // Sloped rear decklid, in body paint, rear edge lower.
  const deck = new THREE.Mesh(new THREE.BoxGeometry(CAR.width * 0.98, 0.07, 1.3), paintMat);
  deck.rotation.x = -0.16; deck.position.set(0, 0.97, -1.65); g.add(deck);
  // Front splitter tucked under the nose.
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(CAR.width * 0.98, 0.07, 0.4), new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.4, metalness: 0.6 }));
  splitter.position.set(0, 0.34, 2.12); g.add(splitter);
  // Dark grille strip across the nose.
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.08), new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.4, metalness: 0.6 }));
  grille.position.set(0, 0.55, 2.3); g.add(grille);
  // Chrome side skirts + mirrors on stalks.
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xc4c8ce, roughness: 0.2, metalness: 0.9 });
  const mirrorMat = new THREE.MeshStandardMaterial({ color: 0x141a24, roughness: 0.1, metalness: 0.8 });
  for (const x of [-1, 1]) {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, CAR.length * 0.7), chromeMat);
    skirt.position.set(x * (CAR.width / 2), 0.36, 0); g.add(skirt);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.14, 0.12), mirrorMat);
    mirror.position.set(x * 1.0, 1.02, 0.3); g.add(mirror);
  }
  // Wide rear wing on two small struts.
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.05, 0.22), paintMat);
  spoiler.position.set(0, 1.04, -2.18); g.add(spoiler);
  const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.32, 10);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0d0d0d });
  const hubGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.34, 8);
  const hubMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc2, roughness: 0.25, metalness: 0.8 });
  for (const [x, z] of [[-1.06, 1.45], [1.06, 1.45], [-1.06, -1.45], [1.06, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.45, z); g.add(w);
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.rotation.z = Math.PI / 2; hub.position.set(x, 0.45, z); g.add(hub);
  }
  // Radial-gradient glow texture, built locally and shared by every glow sprite.
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = 64; glowCanvas.height = 64;
  const glowCtx = glowCanvas.getContext('2d');
  const glowGrad = glowCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
  glowGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  glowGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.55)');
  glowGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
  glowCtx.fillStyle = glowGrad;
  glowCtx.fillRect(0, 0, 64, 64);
  const glowTex = new THREE.CanvasTexture(glowCanvas);
  // Headlights: two lens boxes with a glow sprite sitting just in front of each.
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xfff2cf, emissive: 0xffe9a0, emissiveIntensity: 2.2 });
  const headGlowMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffe9a0, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const x of [-0.7, 0.7]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), lightMat);
    l.position.set(x, 0.75, 2.31); g.add(l);
    const headGlow = new THREE.Sprite(headGlowMat);
    headGlow.position.set(x, 0.75, 2.45);
    headGlow.scale.set(1.8, 1.8, 1); g.add(headGlow);
  }
  // Red rear light bar — the chase camera mostly sees the back of the car.
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x881111, emissive: 0xff2233, emissiveIntensity: 2.6, roughness: 0.5, metalness: 0.0, envMapIntensity: 0 });
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.16, 0.08), tailMat);
  tail.position.set(0, 0.82, -2.32); g.add(tail);
  const tailGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff2233, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
  tailGlow.position.set(0, 0.82, -2.45);
  tailGlow.scale.set(3.0, 1.4, 1); g.add(tailGlow);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); // v3: real shadows
  // Rear bumper + exhausts.
  const bumperMat = new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.4, metalness: 0.6 });
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.22, 0.14), bumperMat);
  bumper.position.set(0, 0.42, -2.28);
  g.add(bumper);

  for (const x of [-1, 1]) {
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.18, 8), chromeMat);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(x * 0.6, 0.42, -2.36);
    g.add(exhaust);
  }

  // Ground shadow (never casts).
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.0),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(1.6, 2.6, 1);
  shadow.position.y = 0.02;
  shadow.castShadow = false;
  g.add(shadow);
  return g;
}

function buildBoatMesh() {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(BOAT.width, 0.9, BOAT.length), new THREE.MeshPhysicalMaterial({ color: 0x2e7d32, roughness: 0.3, metalness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15 }));
  hull.position.y = 0.6; g.add(hull);
  // Chrome rub rail along the hull top edge.
  const rail = new THREE.Mesh(new THREE.BoxGeometry(BOAT.width + 0.12, 0.1, BOAT.length), new THREE.MeshStandardMaterial({ color: 0xc4c8ce, roughness: 0.2, metalness: 0.9 }));
  rail.position.y = 1.0; g.add(rail);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.5, 3.2), new THREE.MeshStandardMaterial({ color: 0xe8e2d0 }));
  deck.position.set(0, 1.2, -0.4); g.add(deck);
  const motor = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.5), new THREE.MeshStandardMaterial({ color: 0x141414 }));
  motor.position.set(0, 0.8, -3.2); g.add(motor);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.18, BOAT.length), new THREE.MeshStandardMaterial({ color: 0xffd34d }));
  stripe.position.y = 0.85; g.add(stripe);
  // Wake: a fading white trail behind the hull, so the boat reads as moving.
  const wake = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 9), new THREE.MeshBasicMaterial({ color: 0xd8f0f5, transparent: true, opacity: 0.35, depthWrite: false }));
  wake.rotation.x = -Math.PI / 2;
  wake.position.set(0, 0.08, -6.2);
  g.add(wake);
  const wake2 = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 12), new THREE.MeshBasicMaterial({ color: 0xd8f0f5, transparent: true, opacity: 0.16, depthWrite: false }));
  wake2.rotation.x = -Math.PI / 2;
  wake2.position.set(0, 0.06, -8.5);
  g.add(wake2);
  return g;
}

/** VCPD pursuit boat: white hull, blue stripe, flashing light bar + wake. */
function buildPoliceBoatMesh() {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(BOAT.width, 0.9, BOAT.length), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4, metalness: 0.3 }));
  hull.position.y = 0.6; g.add(hull);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.22, BOAT.length), new THREE.MeshStandardMaterial({ color: 0x1a4fd6 }));
  stripe.position.y = 0.8; g.add(stripe);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 2.2), new THREE.MeshStandardMaterial({ color: 0x18202e, roughness: 0.3, metalness: 0.5 }));
  cab.position.set(0, 1.4, 0.4); g.add(cab);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.4), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xff2233, emissiveIntensity: 2 }));
  bar.position.set(0, 1.95, 0.4); g.add(bar);
  const motor = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.5), new THREE.MeshStandardMaterial({ color: 0x141414 }));
  motor.position.set(0, 0.8, -3.2); g.add(motor);
  const wake = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 8), new THREE.MeshBasicMaterial({ color: 0xd8f0f5, transparent: true, opacity: 0.3, depthWrite: false }));
  wake.rotation.x = -Math.PI / 2;
  wake.position.set(0, 0.08, -6);
  g.add(wake);
  return g;
}

/** Two VCPD pursuit boats for the river chase — placed by shots.js. */
export function createPursuitBoats(scene) {
  const boats = [];
  for (let i = 0; i < 2; i += 1) {
    const mesh = buildPoliceBoatMesh();
    mesh.visible = false;
    scene.add(mesh);
    boats.push({ mesh, x: 0, z: 0, heading: 0 });
  }
  return {
    boats,
    place(i, x, z, heading) {
      const b = boats[i];
      if (!b) return;
      b.x = x; b.z = z; b.heading = heading;
      b.mesh.position.set(x, 0.1, z);
      b.mesh.rotation.y = heading;
      b.mesh.visible = true;
    },
    hide() { for (const b of boats) b.mesh.visible = false; },
  };
}

function buildFigureMesh(shirtColor = 0xe85d3d) {
  const g = new THREE.Group();
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.75, 0.35), new THREE.MeshStandardMaterial({ color: 0x2a2f3a }));
  legs.position.y = 0.38; g.add(legs);
  // v3: brighter jacket + pale cap so the on-foot figure reads at night
  // instead of a dark silhouette.
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.05, 0.42), new THREE.MeshStandardMaterial({ color: shirtColor }));
  torso.position.y = 1.15; g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.48), new THREE.MeshStandardMaterial({ color: 0xd9a986 }));
  head.position.y = 1.95; g.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.16, 0.52), new THREE.MeshStandardMaterial({ color: 0xe8e2d0 }));
  cap.position.y = 2.22; g.add(cap);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.2), new THREE.MeshStandardMaterial({ color: shirtColor }));
  arm.position.set(0.5, 1.2, 0.15); arm.rotation.x = -1.2; g.add(arm); // gun arm, raised
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/** Parked, stealable cars placed around the city (the night shot's Solano GT). */
export function createParkedCars(scene) {
  const spots = [
    { name: 'Solano GT', color: 0xd92b2b, x: -96, z: 40, ry: 0.5 },
    { name: 'Dune Runner', color: 0xc9a227, x: 60, z: -40, ry: -1.2 },
    { name: 'Canyon Coupe', color: 0x4a6b8a, x: 44, z: 78, ry: 2.4 },
  ];
  return spots.map((s) => {
    const mesh = buildCarMesh(s.color);
    mesh.position.set(s.x, 0, s.z);
    mesh.rotation.y = s.ry;
    scene.add(mesh);
    return { ...s, mesh, taken: false };
  });
}

export function createPlayer(scene) {
  const carMesh = buildCarMesh(0xB81E1E);
  const figureMesh = buildFigureMesh();
  const boatMesh = buildBoatMesh();
  scene.add(carMesh); scene.add(figureMesh); scene.add(boatMesh);
  boatMesh.visible = false; figureMesh.visible = false;

  const p = {
    mode: 'car', // 'car' | 'foot' | 'boat'
    x: 0, z: -40, heading: 0, speed: 0, // heading 0 = +Z (north, up the bridge)
    vehicleName: 'SOLANO GT', condition: 78, gear: 4, nitro: true,
    vx: 0, vz: 0,
    meshes: { car: carMesh, figure: figureMesh, boat: boatMesh },
    setMode(mode, x, z, heading) {
      this.mode = mode;
      if (x !== undefined) { this.x = x; this.z = z; }
      if (heading !== undefined) this.heading = heading;
      this.speed = 0; this.vx = 0; this.vz = 0;
      carMesh.visible = mode === 'car';
      figureMesh.visible = mode === 'foot';
      boatMesh.visible = mode === 'boat';
      if (mode === 'boat') this.vehicleName = 'RIVERHAWK SPEEDBOAT';
      if (mode === 'car') this.vehicleName = 'SOLANO GT';
      if (mode === 'foot') this.vehicleName = 'ON FOOT';
    },
    drive(dt, throttle, steer, handbrake, colliders) {
      const max = this.mode === 'boat' ? BOAT.maxSpeed : PLAYER.maxSpeed;
      if (throttle > 0) this.speed = Math.min(max, this.speed + PLAYER.accel * dt);
      else if (throttle < 0) this.speed = Math.max(-PLAYER.reverseMax, this.speed - PLAYER.brake * dt);
      else this.speed *= Math.pow(0.4, dt);
      const grip = handbrake ? PLAYER.driftGrip : PLAYER.grip;
      this.heading += steer * PLAYER.steer * dt * (this.speed / max) * (handbrake ? 1.8 : 1) * (this.speed < 0 ? -1 : 1);
      const nx = this.x + Math.sin(this.heading) * this.speed * dt;
      const nz = this.z + Math.cos(this.heading) * this.speed * dt;
      // Building collision: slide along the wall, chip the condition on a hard hit.
      const hit = colliders.some((c) => nx > c.x0 - 1.2 && nx < c.x1 + 1.2 && nz > c.z0 - 1.2 && nz < c.z1 + 1.2);
      const inBounds = Math.abs(nx) < 205 && Math.abs(nz) < 205;
      const inRiver = this.mode !== 'boat' && Math.abs(nz) < 15 && Math.abs(nx) > 9;
      if (!hit && inBounds && !inRiver) { this.x = nx; this.z = nz; }
      else if (Math.abs(this.speed) > 18) { this.condition = Math.max(20, this.condition - 2); this.speed *= 0.4; }
      else this.speed *= 0.5;
      this.vx = Math.sin(this.heading) * this.speed;
      this.vz = Math.cos(this.heading) * this.speed;
      const mesh = this.mode === 'boat' ? boatMesh : carMesh;
      mesh.position.set(this.x, this.mode === 'boat' ? 0.1 + Math.sin(performance.now() / 300) * 0.08 : 0, this.z);
      mesh.rotation.y = this.heading;
      mesh.rotation.z = -steer * 0.06 * Math.min(1, Math.abs(this.speed) / 20);
      return grip;
    },
    walk(dt, fwd, strafe, heading, colliders) {
      const sp = PLAYER.walkSpeed;
      const nx = this.x + Math.sin(heading) * fwd * sp * dt + Math.cos(heading) * strafe * sp * dt;
      const nz = this.z + Math.cos(heading) * fwd * sp * dt - Math.sin(heading) * strafe * sp * dt;
      const hit = colliders.some((c) => nx > c.x0 - 0.6 && nx < c.x1 + 0.6 && nz > c.z0 - 0.6 && nz < c.z1 + 0.6);
      if (!hit && Math.abs(nx) < 205 && Math.abs(nz) < 205) { this.x = nx; this.z = nz; }
      this.heading = heading;
      figureMesh.position.set(this.x, Math.abs(Math.sin(performance.now() / 150)) * 0.04, this.z);
      figureMesh.rotation.y = heading;
    },
  };
  p.setMode('car', 0, -40, 0);
  return p;
}
