// The four staged screenshots behind ?shot=wide|cover|night|boat. Each one
// sets the real game state (player, wanted, clock, dialogue, cash) and the real
// world (traffic, police, helicopter, crew) to a fixed scenario, then renders
// it — so every frame is what the game really looks like, and the same seed
// always gives the same frame. Nothing is composited or borrowed.
//
// v2: four different times/weather, free cameras, denser staging.
//   wide  — early-afternoon establishing, dust haze, whole city in one look
//   cover — 5-star bridge chase, low chase cam, desaturated amber
//   night — rain on foot at Neon Mile, over-shoulder, PRESS F – STEAL
//   boat  — dawn river chase under the bridge, blue-hour mist, pursuit boats
import { CHARACTERS } from './config.js';
import { makeCarMesh } from './traffic.js';

let stealCar = null; // the parked Solano GT outside Club Voltage (night shot only)

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
  let cam = null; // [x, y, z, lx, ly, lz] free camera, applied after syncHud
  G.hud.showHud(true);
  G.menus.hideAll();
  // Clean slate: every shot opts its weather in explicitly.
  G.city.rain.setOn(false);
  G.city.dust.setOn(true);
  G.city.setWet(false);
  G.traffic.setNight(false);
  G.pursuitBoats.hide();
  G.wanted.hideUnits(false);
  if (stealCar) stealCar.visible = false;

  if (name === 'wide') {
    // 1 — WIDE ESTABLISHING: hard early-afternoon light, dust haze, the
    // whole city in one look — canyon, bridge, port cranes, downtown, river.
    Object.assign(save, { cash: 24680, storyDone: 2, rep: 3, repProgress: 42, health: 82, armour: 64, day: 3, weekday: 'FRI', hour: 14.5, complete: 68 });
    G.city.setHour(14.5);
    G.renderer.setExposure(1.12);
    G.player.setMode('car', 0, -30, Math.PI / 2);
    G.player.drive(0, 0, 0, false, G.city.colliders);
    G.wanted.setWanted(0);
    G.wanted.hideUnits(true); // no police cars parked in an establishing shot
    baseUi(G, save);
    G.ui.location = 'VELA CRUZ · RIVERSIDE · Old Crossing';
    G.ui.dialogue = { ...CHARACTERS.mara, line: 'The whole city in one look — river, bridge, port, downtown.' };
    stageTrafficNear(G, [[0, 60], [1, -20], [2, 120], [3, -80], [4, 30], [5, -140], [6, 80], [7, -40], [8, -10], [9, 45], [10, -120], [11, 100]], [[0, -11, -30], [1, 11, -48], [2, -11, -62], [3, 11, -20], [4, -11, 80], [5, 11, 100], [6, -11, 120], [7, 11, -100], [8, -11, -8], [9, 11, 8], [10, -11, 40], [11, 11, 60]]);
    // v3.3: high SE camera again (v3.1 framing) — with the brighter water
    // the river wedge past the bridge should now read.
    cam = [60, 58, 200, -50, 2, -40];
  } else if (name === 'night') {
    // 3 — NIGHT RAIN ON FOOT: over-shoulder close at Neon Mile, wet road
    // lamp streaks, lit windows, muzzle flash, PRESS F – STEAL.
    // Staged NORTH of the club: the neon signs + CLUB VOLTAGE label face
    // north, and the player stands on open ground, not inside the club box.
    Object.assign(save, { cash: 7420, storyDone: 2, rep: 3, repProgress: 42, health: 74, armour: 45, day: 3, weekday: 'SAT', hour: 23.67, complete: 68 });
    G.city.setHour(23.67);
    G.renderer.setExposure(1.4); // lift the dark so the frame reads at tile size
    G.city.rain.setOn(true);
    G.city.dust.setOn(false);
    G.city.setWet(true);
    G.traffic.setNight(true); // headlights + taillights on
    G.player.setMode('foot', -104, 30, -0.24);
    G.player.walk(0, 0, 0, -0.24, G.city.colliders);
    G.city.setPlayerLight(G.player.x, G.player.z); // warm light over the figure
    G.wanted.setWanted(3);
    G.wanted.setHeli(24, 14, 6); // night: heli further out, cone narrower in frame
    G.weapons.select(2);
    G.weapons.fire(G.player.x, G.player.z, G.player.heading); // muzzle flash + tracer in frame
    baseUi(G, save);
    G.ui.location = 'NEON MILE · Club Voltage · Neon Mile';
    G.ui.dialogue = { ...CHARACTERS.silas, line: 'You picked the wrong club, kid. My crew owns this street!' };
    G.ui.steal = 'Solano GT · parked · unlocked';
    if (!stealCar) {
      stealCar = makeCarMesh(0xd94f4f);
      G.city.scene.add(stealCar);
    }
    stealCar.position.set(-99, 0, 26);
    stealCar.rotation.y = 2.5; // three-quarter profile to the over-shoulder camera
    stealCar.visible = true;
    stageTrafficNear(G, [[5, 20]], [[0, -118, 30], [1, -100, 24], [2, -90, 34]]);
    // v3.2: aim right + up — the CLUB VOLTAGE sign shifts left + down in
    // frame, clear of the VCPD panel.
    cam = [-96, 3.4, 22, -108, 6, 50];
  } else if (name === 'boat') {
    // 4 — DAWN RIVER CHASE: blue-hour mist, wake + spray, bridge arches
    // overhead, pursuit boats + helicopter. Police cars stay off the water.
    Object.assign(save, { cash: 24680, storyDone: 5, rep: 4, repProgress: 68, health: 82, armour: 64, day: 3, weekday: 'FRI', hour: 6.2, complete: 68 });
    G.city.setHour(6.2);
    G.renderer.setExposure(1.15);
    G.city.dust.setOn(false);
    G.player.setMode('boat', -30, 0, Math.PI / 2);
    G.player.speed = 30; // 108 km/h
    G.player.condition = 91;
    G.player.drive(0, 0, 0, false, G.city.colliders);
    G.wanted.setWanted(5);
    G.wanted.setHeli(16, 11, -8);
    G.wanted.hideUnits(true);
    G.pursuitBoats.place(0, -36, 9, Math.PI / 2);
    G.pursuitBoats.place(1, -38, -8, Math.PI / 2);
    baseUi(G, save);
    G.ui.location = 'VELA RIVER · under the bridge · Old Crossing';
    G.ui.dialogue = { ...CHARACTERS.nina, line: 'Stay on the river — the VCPD boats cannot turn as fast as us!' };
    G.ui.stolen = true;
    stageTrafficNear(G, [[0, 10], [1, -5]], []);
    // v3.3: back to the v2 camera — low, on the water, looking down-river.
    // The v3.1/v3.2 higher cameras put the bank buildings in the sightline
    // and hid the boat, the pursuit boats and the heli.
    cam = [-56, 8, 2, 25, 1, -2];
  } else {
    // cover — 5-star bridge chase at golden hour, low chase camera.
    Object.assign(save, { cash: 24680, storyDone: 5, rep: 4, repProgress: 68, health: 82, armour: 64, day: 3, weekday: 'FRI', hour: 17.8, complete: 68 });
    G.city.setHour(17.8);
    G.renderer.setExposure(1.05);
    G.player.setMode('car', 0, 18, Math.PI);
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
    // v3.2: back to the v3.0 framing — the closer v3.1 camera made the
    // Solano GT block the frame and cropped the helicopter.
    cam = [1.5, 3.0, 30, 0, 2.2, -30];
  }
  syncHud(G, lookH, back);
  if (cam) G.renderer.setCam(...cam);
}
