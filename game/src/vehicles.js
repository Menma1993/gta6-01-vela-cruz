// Player vehicles: the red Solano GT (drivable, drift, damage), the on-foot
// figure, and the green Riverhawk speedboat (stealable at the Port Vela dock).
// F enters/exits; near a parked car or the dock boat, F steals it instead.
import * as THREE from '../vendor/three.module.min.js';
import { PLAYER, CAR, BOAT } from './config.js';

function buildCarMesh(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(CAR.width, 0.8, CAR.length), new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.5 }));
  body.position.y = 0.7; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 2.0), new THREE.MeshStandardMaterial({ color: 0x141a24, roughness: 0.2, metalness: 0.6 }));
  cabin.position.set(0, 1.4, -0.3); g.add(cabin);
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 0.5), new THREE.MeshStandardMaterial({ color: 0x141414 }));
  spoiler.position.set(0, 1.25, -2.1); g.add(spoiler);
  const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.32, 10);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0d0d0d });
  for (const [x, z] of [[-1.0, 1.45], [1.0, 1.45], [-1.0, -1.45], [1.0, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.45, z); g.add(w);
  }
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xfff2cf, emissive: 0xffe9a0, emissiveIntensity: 1.2 });
  for (const x of [-0.7, 0.7]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), lightMat);
    l.position.set(x, 0.75, 2.31); g.add(l);
  }
  // Red rear light bar — the chase camera mostly sees the back of the car.
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.22, 0.1), new THREE.MeshStandardMaterial({ color: 0xaa1111, emissive: 0xff2222, emissiveIntensity: 1.4 }));
  tail.position.set(0, 0.85, -2.31); g.add(tail);
  return g;
}

function buildBoatMesh() {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(BOAT.width, 0.9, BOAT.length), new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.4, metalness: 0.3 }));
  hull.position.y = 0.6; g.add(hull);
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

function buildFigureMesh(shirtColor = 0xd94f4f) {
  const g = new THREE.Group();
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.75, 0.35), new THREE.MeshStandardMaterial({ color: 0x2a2f3a }));
  legs.position.y = 0.38; g.add(legs);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.05, 0.42), new THREE.MeshStandardMaterial({ color: shirtColor }));
  torso.position.y = 1.15; g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.48), new THREE.MeshStandardMaterial({ color: 0xd9a986 }));
  head.position.y = 1.95; g.add(head);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.2), new THREE.MeshStandardMaterial({ color: shirtColor }));
  arm.position.set(0.5, 1.2, 0.15); arm.rotation.x = -1.2; g.add(arm); // gun arm, raised
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
  const carMesh = buildCarMesh(0xd92b2b);
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
