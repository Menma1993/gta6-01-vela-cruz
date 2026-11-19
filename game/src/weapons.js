// On-foot combat: 5 weapon slots with magazine + reserve ammo and reload,
// mouse aim, tracer + muzzle flash, and the Grimm crew who fight back outside
// Club Voltage. Shooting raises wanted; killing a crew member pays $50.
import * as THREE from '../vendor/three.module.min.js';
import { WEAPONS } from './config.js';

export function createWeapons(scene) {
  const slots = WEAPONS.map((w) => ({ ...w, mag: w.mag, reserve: w.reserve }));
  let selected = 2; // SMG
  let cooldown = 0;
  let reloading = 0;

  // The Grimm crew: 4 armed figures outside Club Voltage.
  const crew = [];
  const shirt = new THREE.MeshStandardMaterial({ color: 0x1f2937 });
  for (let i = 0; i < 4; i += 1) {
    const g = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.05, 0.42), shirt);
    torso.position.y = 1.15; g.add(torso);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.48), new THREE.MeshStandardMaterial({ color: 0xc98a6b }));
    head.position.y = 1.95; g.add(head);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.75, 0.35), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    legs.position.y = 0.38; g.add(legs);
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.9), new THREE.MeshStandardMaterial({ color: 0x0a0a0a }));
    gun.position.set(0.45, 1.3, 0.4); g.add(gun);
    g.position.set(-98 + i * 5, 0, 38 + (i % 2) * 6);
    g.rotation.y = Math.PI + (i - 1.5) * 0.3;
    scene.add(g);
    crew.push({ mesh: g, hp: 100, alive: true, x: g.position.x, z: g.position.z });
  }

  // Tracer line + muzzle flash, reused every shot.
  const tracerGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -30)]);
  const tracer = new THREE.Line(tracerGeo, new THREE.LineBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0 }));
  scene.add(tracer);
  const flash = new THREE.PointLight(0xffc860, 0, 14);
  scene.add(flash);

  function nearestEnemy(px, pz, heading) {
    let best = null; let bestD = 26;
    for (const c of crew) {
      if (!c.alive) continue;
      const dx = c.x - px, dz = c.z - pz;
      const d = Math.hypot(dx, dz);
      const ang = Math.abs(Math.atan2(dx, dz) - heading);
      if (d < bestD && ang < 0.5) { best = c; bestD = d; }
    }
    return best;
  }

  return {
    slots, crew,
    get selected() { return selected; },
    select(i) { if (i >= 0 && i < slots.length) selected = i; },
    get reloading() { return reloading > 0; },
    update(dt) {
      cooldown = Math.max(0, cooldown - dt);
      if (reloading > 0) {
        reloading -= dt;
        if (reloading <= 0) {
          const w = slots[selected];
          const need = w.mag === Infinity ? 0 : (WEAPONS[selected].mag - w.mag);
          const take = Math.min(need, w.reserve);
          w.mag += take; w.reserve -= take;
        }
      }
      tracer.material.opacity = Math.max(0, tracer.material.opacity - dt * 6);
      flash.intensity = Math.max(0, flash.intensity - dt * 60);
    },
    reload() {
      const w = slots[selected];
      if (w.mag === Infinity || w.reserve <= 0 || w.mag >= WEAPONS[selected].mag) return false;
      reloading = 1.1;
      return true;
    },
    /** Fire from (px,pz) along heading. Returns {hit, killed} for the HUD. */
    fire(px, pz, heading) {
      const w = slots[selected];
      if (cooldown > 0 || reloading > 0) return null;
      if (w.mag !== Infinity && w.mag <= 0) { this.reload(); return null; }
      cooldown = w.rate;
      if (w.mag !== Infinity) w.mag -= 1;
      const ox = px + Math.sin(heading) * 1.2, oz = pz + Math.cos(heading) * 1.2;
      const tx = px + Math.sin(heading) * 30, tz = pz + Math.cos(heading) * 30;
      tracerGeo.setFromPoints([new THREE.Vector3(ox, 1.4, oz), new THREE.Vector3(tx, 1.4, tz)]);
      tracer.material.opacity = 0.9;
      flash.position.set(ox, 1.5, oz);
      flash.intensity = 11; // r4: brighter muzzle flash so the night shot reads
      const target = nearestEnemy(px, pz, heading);
      if (!target) return { hit: false, killed: false };
      target.hp -= w.damage;
      if (target.hp <= 0) {
        target.alive = false;
        target.mesh.visible = false;
        return { hit: true, killed: true };
      }
      return { hit: true, killed: false };
    },
  };
}
