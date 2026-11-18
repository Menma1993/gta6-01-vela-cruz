// Wanted system: 5 stars, named VCPD units with distance + state, a roadblock
// across the bridge, and the AIR-1 helicopter. The helicopter MUST read as a
// helicopter from the chase camera, so it is built big and low on purpose:
// a navy belly plate + a blinking red belly beacon (visible from below), a tall
// tail fin, a wide spinning rotor disc, skids, and a spotlight cone.
import * as THREE from '../vendor/three.module.min.js';
import { POLICE_UNITS } from './config.js';

function policeCarMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.75, 4.4), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4, metalness: 0.3 }));
  body.position.y = 0.65; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.65, 2.2), new THREE.MeshStandardMaterial({ color: 0x18202e, roughness: 0.3 }));
  cabin.position.set(0, 1.3, -0.2); g.add(cabin);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.22, 4.42), new THREE.MeshStandardMaterial({ color: 0x1a4fd6 }));
  stripe.position.y = 0.72; g.add(stripe);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.2, 0.45), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x2255ff, emissiveIntensity: 2 }));
  bar.position.set(0, 1.72, -0.2); g.add(bar);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  for (const [x, z] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.42, z); g.add(w);
  }
  return g;
}

/** The helicopter. Big airframe, low hover, all the read-as-helicopter parts. */
export function buildHelicopter() {
  const g = new THREE.Group();
  const navy = new THREE.MeshStandardMaterial({ color: 0x2e4d6e, roughness: 0.5, metalness: 0.35 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: 0x1d3a5c, roughness: 0.6, metalness: 0.2 });
  // Main fuselage + nose + cockpit glass.
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.0, 6.2), navy);
  body.position.y = 0; g.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.5, 1.6), navy);
  nose.position.set(0, -0.2, 3.6); g.add(nose);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.1, 1.4), new THREE.MeshStandardMaterial({ color: 0x9fd8ef, roughness: 0.15, metalness: 0.6 }));
  glass.position.set(0, 0.35, 3.4); g.add(glass);
  // NAVY BELLY PLATE — the wide dark plate a chase camera sees from below.
  const belly = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.3, 5.6), bellyMat);
  belly.position.y = -1.15; g.add(belly);
  // RED BELLY BEACON — emissive, blinking, dead centre under the belly.
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 10), new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff2020, emissiveIntensity: 3 }));
  beacon.position.set(0, -1.45, 0.5); g.add(beacon);
  // White VCPD stripe + AIR-1 marking block along the flank.
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.05, 0.5, 5.0), new THREE.MeshStandardMaterial({ color: 0xf2f2f2 }));
  stripe.position.y = 0.1; g.add(stripe);
  // Tail boom + TALL TAIL FIN (2.8 high) + tail rotor.
  const boom = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 5.2), navy);
  boom.position.set(0, 0.25, -5.4); g.add(boom);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.8, 1.9), new THREE.MeshStandardMaterial({ color: 0x1d3a5c }));
  fin.position.set(0, 1.5, -7.6); g.add(fin);
  const tailRotor = new THREE.Group();
  for (let i = 0; i < 2; i += 1) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.0, 0.3), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    blade.rotation.z = (i * Math.PI) / 2; tailRotor.add(blade);
  }
  tailRotor.position.set(0.8, 1.6, -7.6); g.add(tailRotor);
  // Main rotor: mast + two long blades + a wide translucent ROTOR DISC.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0x222222 }));
  mast.position.y = 1.5; g.add(mast);
  const rotor = new THREE.Group();
  rotor.position.y = 2.1;
  for (let i = 0; i < 2; i += 1) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.14, 0.9), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
    blade.rotation.y = (i * Math.PI) / 2; rotor.add(blade);
  }
  const disc = new THREE.Mesh(new THREE.CircleGeometry(5.8, 28), new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
  disc.rotation.x = -Math.PI / 2; rotor.add(disc);
  g.add(rotor);
  // Skids.
  for (const x of [-1.2, 1.2]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 5.0), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    skid.position.set(x, -1.7, 0.3); g.add(skid);
  }
  // Spotlight cone + ground pool live in a SEPARATE unscaled group (the
  // airframe group is scaled 1.3×, which would sink them below the ground).
  const fx = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(4.5, 10.7, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.10, side: THREE.DoubleSide, depthWrite: false }));
  cone.position.y = 5.4; fx.add(cone); // apex at the belly (~10.7), base on the ground
  const pool = new THREE.Mesh(new THREE.CircleGeometry(4.5, 20), new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.18, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = 0.15; fx.add(pool);
  return { group: g, fx, rotor, tailRotor, beacon, cone, pool };
}

export function createWanted(scene) {
  const units = POLICE_UNITS.slice(0, 4).map((u, i) => {
    const mesh = policeCarMesh();
    scene.add(mesh);
    return { ...u, mesh, x: 0, z: 0, heading: 0, speed: 0, dist: 9 + i * 7 };
  });
  // Roadblock: three VCPD cars parked across the avenue (positioned by update()).
  const roadblock = [];
  for (let i = 0; i < 3; i += 1) {
    const mesh = policeCarMesh();
    mesh.visible = false;
    scene.add(mesh);
    roadblock.push(mesh);
  }
  const heli = buildHelicopter();
  heli.group.scale.setScalar(1.15); // big airframe — it must read at chase-cam distance
  scene.add(heli.group);
  scene.add(heli.fx);

  let wanted = 5;
  let t = 0;
  let heliFwd = 12, heliY = 10, heliSide = 5;
  return {
    units, roadblock, heli,
    get wanted() { return wanted; },
    setWanted(n) { wanted = Math.max(0, Math.min(5, n)); },
    /** Chase-camera heli placement: forward/side offset (m) and hover height. */
    setHeli(fwd, y, side) { heliFwd = fwd; heliY = y; heliSide = side; },
    /** Chase positions are staged relative to the player so the HUD distances read true. */
    update(dt, player) {
      t += dt;
      const px = player.x, pz = player.z;
      // Forward (sin h, cos h) and right (cos h, -sin h) of the player's heading.
      const fx = Math.sin(player.heading), fz = Math.cos(player.heading);
      const rx = Math.cos(player.heading), rz = -Math.sin(player.heading);
      const at = (r, f) => ({ x: px + rx * r + fx * f, z: pz + rz * r + fz * f });
      // {r: right offset, f: forward offset} — negative f = behind the player.
      const offsets = [
        { r: -3.5, f: -9, heading: player.heading },
        { r: 3.8, f: -14, heading: player.heading },
        { r: -5, f: -22, heading: player.heading },
        { r: 5, f: 30, heading: player.heading + Math.PI },
      ];
      units.forEach((u, i) => {
        const o = offsets[i];
        const wob = Math.sin(t * 1.3 + i * 2) * 1.2;
        const pos = at(o.r + wob, o.f);
        u.x = pos.x; u.z = pos.z;
        u.dist = Math.max(6, Math.round(Math.hypot(u.x - px, u.z - pz)));
        u.mesh.position.set(u.x, 0, u.z);
        u.mesh.rotation.y = o.heading;
      });
      if (player.mode === 'boat') {
        // On the river the VCPD cannot follow by car: two units wait on the
        // bridge deck above, two on the south bank — visible, not floating.
        const spots = [
          { x: -3, z: -24, y: 0.15, ry: 0 }, { x: 3, z: 24, y: 0.15, ry: Math.PI },
          { x: -40, z: -60, y: 0, ry: Math.PI / 2 }, { x: 40, z: -60, y: 0, ry: -Math.PI / 2 },
        ];
        units.forEach((u, i) => {
          const s = spots[i];
          u.x = s.x; u.z = s.z;
          u.dist = Math.max(6, Math.round(Math.hypot(u.x - px, u.z - pz)));
          u.mesh.position.set(s.x, s.y, s.z);
          u.mesh.rotation.y = s.ry;
        });
      }
      // Roadblock: three cars across the road 42 m ahead, only at wanted 4+
      // and only on land — never floating on the river.
      const showBlock = wanted >= 4 && player.mode !== 'boat';
      roadblock.forEach((mesh, i) => {
        mesh.visible = showBlock;
        if (!showBlock) return;
        const pos = at([-4.5, 0, 4.5][i], 42 + (i === 1 ? 2 : 0));
        mesh.position.set(pos.x, 0, pos.z);
        mesh.rotation.y = player.heading + Math.PI; // facing the player
      });
      // Helicopter: LOW and CLOSE, turned ~40° so the chase camera sees its
      // SIDE profile — white stripe, tail boom, tall fin, belly plate, red
      // beacon and rotor disc — instead of a head-on black slab.
      const hpos = at(heliSide, heliFwd);
      heli.group.position.set(hpos.x, heliY + Math.sin(t * 0.8) * 0.6, hpos.z);
      heli.group.rotation.y = player.heading + Math.PI + 0.7 + Math.sin(t * 0.3) * 0.1;
      heli.rotor.rotation.y += dt * 22;
      heli.tailRotor.rotation.x += dt * 30;
      heli.beacon.material.emissiveIntensity = (Math.sin(t * 9) > 0 ? 3.2 : 0.4);
      heli.fx.position.set(hpos.x, 0, hpos.z);
      heli.fx.visible = wanted >= 3;
    },
    /** HUD rows: name, distance, state — exactly what the panel shows. */
    rows() {
      return units.map((u) => ({ name: u.name, dist: u.dist, state: u.state }))
        .concat([{ name: 'AIR-1', dist: 48, state: 'SPOTLIGHT' }]);
    },
  };
}
