// The four staged screenshots behind ?shot=cover|night|map|boat. Each one
// sets the real game state (player, wanted, clock, dialogue, cash) and the real
// world (traffic, police, helicopter, crew) to a fixed scenario, then renders
// it — so every frame is what the game really looks like, and the same seed
// always gives the same frame. Nothing is composited or borrowed.
import { CHARACTERS } from './config.js';

function clockStr(hour) {
  const h = Math.floor(hour) % 24;
  const m = Math.round((hour % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function baseUi(G, save) {
  G.story.reset(save);
  const job = G.story.activeJob();
  const next = G.story.state.jobs.find((j) => j.n === job.n + 1) || null;
  G.ui.save = save;
  G.ui.job = job;
  G.ui.nextJob = next;
  G.ui.clock = clockStr(save.hour);
  G.ui.radioLabel = G.radio.label();
  G.ui.weapons = G.weapons.slots;
  G.ui.selectedWeapon = G.weapons.selected;
  G.ui.shells = G.city.shells;
  G.ui.jobMarker = job.marker;
  G.ui.stolen = false;
  G.ui.bridgeLift = null;
  G.ui.steal = null;
  G.ui.nitro = true;
  G.ui.gear = 4;
}

function syncHud(G, lookH = 1.6, back = 0) {
  G.wanted.update(0.5, G.player);
  G.ui.policeRows = G.wanted.rows();
  G.ui.policeDots = G.wanted.units.map((u) => ({ x: u.x, z: u.z }));
  const hp = G.wanted.heli.group.position;
  G.ui.heliDot = { x: hp.x, z: hp.z };
  G.ui.speed = G.player.speed;
  G.ui.mode = G.player.mode;
  G.ui.vehicleName = G.player.vehicleName;
  G.ui.condition = G.player.condition;
  G.ui.wanted = G.wanted.wanted;
  G.ui.player = { x: G.player.x, z: G.player.z, heading: G.player.heading };
  G.hud.update(G.ui);
  G.renderer.snap(G.player, lookH, back);
}

function stageTrafficNear(G, cars, peds) {
  // Put real traffic + pedestrians where the camera can see them.
  cars.forEach(([i, t]) => { if (G.traffic.cars[i]) G.traffic.cars[i].t = t; });
  peds.forEach(([i, x, z]) => { if (G.traffic.peds[i]) { G.traffic.peds[i].x = x; G.traffic.peds[i].z = z; } });
  G.traffic.update(0);
}

export function stageShot(name, G) {
  const save = G.save;
  let lookH = 1.6; // camera aim height; chase shots aim up so the heli reads
  let back = 0;
  G.hud.showHud(true);
  G.menus.hideAll();
  if (name === 'night') {
    Object.assign(save, { cash: 7420, storyDone: 5, rep: 3, repProgress: 42, health: 74, armour: 45, day: 3, weekday: 'SAT', hour: 23.67, complete: 68 });
    G.city.setHour(23.67);
    G.player.setMode('foot', -80, 44, -1.22);
    G.player.walk(0, 0, 0, -1.22, G.city.colliders);
    G.wanted.setWanted(3);
    G.wanted.setHeli(24, 14, 6); // night: heli further out, cone narrower in frame
    G.weapons.select(2);
    G.weapons.fire(G.player.x, G.player.z, G.player.heading); // muzzle flash + tracer in frame
    baseUi(G, save);
    G.ui.location = 'NEON MILE · Club Voltage · Neon Mile';
    G.ui.dialogue = { ...CHARACTERS.silas, line: 'You picked the wrong club, kid. My crew owns this street!' };
    G.ui.steal = 'Solano GT · parked · unlocked';
    stageTrafficNear(G, [[5, 20]], [[0, -70, 40], [1, -118, 62], [2, -100, 70]]);
  } else if (name === 'map') {
    Object.assign(save, { cash: 24680, storyDone: 5, rep: 4, repProgress: 68, health: 82, armour: 64, day: 3, weekday: 'FRI', hour: 17.4, complete: 68 });
    G.city.setHour(17.4);
    G.player.setMode('car', 0, -40, Math.PI);
    G.player.drive(0, 0, 0, false, G.city.colliders);
    G.wanted.setWanted(5);
    baseUi(G, save);
    G.ui.location = 'VELA CRUZ BRIDGE · Old Crossing';
    G.ui.dialogue = { ...CHARACTERS.mara, line: 'Lose that helicopter before you bring the money to my garage!' };
    G.menus.showMap(save);
    G.hud.showHud(false);
    syncHud(G);
    return;
  } else if (name === 'boat') {
    Object.assign(save, { cash: 24680, storyDone: 5, rep: 4, repProgress: 68, health: 82, armour: 64, day: 3, weekday: 'FRI', hour: 18.03, complete: 68 });
    G.city.setHour(18.03);
    G.player.setMode('boat', -30, 0, Math.PI / 2);
    G.player.speed = 30; // 108 km/h
    G.player.condition = 91;
    G.player.drive(0, 0, 0, false, G.city.colliders);
    G.wanted.setWanted(4);
    G.wanted.setHeli(16, 11, -8);
    baseUi(G, save);
    G.ui.location = 'VELA RIVER · under the bridge · Old Crossing';
    G.ui.dialogue = { ...CHARACTERS.nina, line: 'Stay on the river — the VCPD boats cannot turn as fast as us!' };
    G.ui.stolen = true;
    stageTrafficNear(G, [[0, 10], [1, -5]], []);
    lookH = 4.2;
  } else {
    // cover — 5-star bridge chase at golden hour.
    Object.assign(save, { cash: 24680, storyDone: 5, rep: 4, repProgress: 68, health: 82, armour: 64, day: 3, weekday: 'FRI', hour: 17.4, complete: 68 });
    G.city.setHour(17.4);
    G.player.setMode('car', 0, -40, Math.PI);
    G.player.speed = 42.8; // 154 km/h
    G.player.drive(0, 0, 0, false, G.city.colliders);
    G.wanted.setWanted(5);
    G.wanted.setHeli(16, 11, -8);
    baseUi(G, save);
    G.ui.location = 'VELA CRUZ BRIDGE · Old Crossing';
    G.ui.dialogue = { ...CHARACTERS.mara, line: 'Lose that helicopter before you bring the money to my garage!' };
    G.ui.stolen = true;
    G.ui.bridgeLift = '0:12';
    stageTrafficNear(G, [[0, -58], [1, -75], [3, -20]], [[0, -11, -30], [1, 11, -48], [2, -11, -62], [3, 11, -20]]);
    G.hud.toast('DRIFT ×3  ·  +$150 NEAR MISS', 60000);
    lookH = 4.2;
    back = 13;
  }
  syncHud(G, lookH, back);
}
