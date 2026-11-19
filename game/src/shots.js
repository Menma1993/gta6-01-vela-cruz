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
    // 1 — WIDE ESTABLISHING, v4: low camera OVER the river looking west
    // along the water — the river fills the foreground and works (boats,
    // glint, bridge crossing it), downtown + sunset behind. The v3 high
    // aerial sold a low-poly demo; the river port has to be IN the frame.
    // v7: golden hour (17.6) now — the sky palettes were fixed to
    // purple-pink-orange, so the river stays blue-teal against the sunset
    // instead of going amber-brown. The sheet now has four distinct times
    // (golden wide / golden chase / neon night / blue dawn).
    Object.assign(save, { cash: 24680, storyDone: 2, rep: 3, repProgress: 42, health: 82, armour: 64, day: 3, weekday: 'FRI', hour: 17.6, complete: 68 });
    G.city.setHour(17.6);
    G.renderer.setExposure(1.18);
    G.player.setMode('car', 0, 8, Math.PI);
    G.player.drive(0, 0, 0, false, G.city.colliders);
    G.wanted.setWanted(0);
    G.wanted.hideUnits(true); // no police cars parked in an establishing shot
    baseUi(G, save);
    G.ui.location = 'VELA CRUZ · The River · Old Crossing';
    G.ui.dialogue = { ...CHARACTERS.mara, line: 'The whole city in one look — river, bridge, port, downtown.' };
    // v4: VCPD river boats working the water west of the bridge, wakes and
    // all — the river has to look used, not empty.
    // v4.5: boats at 35–55 m sit below the frame edge / behind the dialogue
    // panel (the camera looks down 14° from y=40). At 75–95 m they land
    // mid-water, clear of the HUD, white hulls + wakes on the blue river.
    G.pursuitBoats.place(0, 45, -4, -Math.PI / 2);
    G.pursuitBoats.place(1, 25, 6, -Math.PI / 2);
    stageTrafficNear(G, [[0, 60], [1, -20], [2, 120], [3, -80], [4, 30], [5, -140], [6, 80], [7, -40], [8, -10], [9, 45], [10, -120], [11, 100]], [[0, -11, -30], [1, 11, -48], [2, -11, -62], [3, 11, -20], [4, -11, 80], [5, 11, 100], [6, -11, 120], [7, 11, -100], [8, -11, -8], [9, 11, 8], [10, -11, 40], [11, 11, 60]]);
    // v4.2: the raised SE camera (v4.1) still hid the river — from above,
    // the 32 m river is a thin band behind the wall + the central tower.
    // Now the camera sits OVER the river's east end looking west: the water
    // is a leading line down the middle of the frame, the bridge crosses it
    // mid-frame, downtown + sunset beyond, canyon walls framing both sides.
    cam = [110, 14, 2, -30, 3, -6];
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
    G.player.setMode('foot', -99, 37, -0.6);
    G.player.walk(0, 0, 0, -0.6, G.city.colliders);
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
    stealCar.position.set(-104, 0, 42);
    stealCar.rotation.y = 2.6; // three-quarter front toward the camera
    stealCar.visible = true;
    stageTrafficNear(G, [[5, 20]], [[0, -118, 30], [1, -100, 24], [2, -90, 34]]);
    // v4.5: keeps v4.4's framing goal (full CLUB VOLTAGE sign in frame with
    // margin, Solano GT + player centred in the lower half) but the camera
    // MUST stay north of the Vela River canyon wall: that box is centred at
    // z = +26 with 10 m depth, so its north face is z = 31, and v4.4's z = 16
    // sat south of it with the 9 m wall 10 m in front of the lens, filling
    // the whole frame. Constraint: camera z >= 33 (wall face + clearance).
    // Verified from (-84, 7, 34) -> (-102, 5, 43): the wall (z 21..31) is
    // behind the lens; view axis heading -63.4 deg; sign centre (-110, 14, 46)
    // is only ~1.9 deg off-axis at 28.6 m, and its 7.5 m half-width subtends
    // ~14.7 deg, so the whole 15 m sign spans ~13-17 deg off centre — far
    // inside the ~47 deg horizontal half-FOV (FOV 62 vertical, 1280x720).
    // Car (-104, 42) ~5 deg and player (-99, 37) ~15 deg off-axis, both below
    // the view axis, so they stay centred-ish in the lower half.
    cam = [-84, 7, 34, -102, 5, 43];
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
    // cover v8 — 5-star chase down Palm Boulevard, not on the bridge:
    // golden hour 18:00, low rear-left 3/4 chase cam with the hero car just
    // right of centre, wet asphalt running north to the low sun at the
    // avenue's vanishing point (upper-left), heli high in the upper sky near
    // centre, lit traffic ahead up the boulevard and pedestrians on the
    // sand-side sidewalks. Player sits ~150 m south of the bridge so the
    // near/mid frame is boulevard (palms both sides, east buildings right,
    // sand promenade left) and the arch is small and hazed at the vanish.
    Object.assign(save, { cash: 24680, storyDone: 5, rep: 4, repProgress: 68, health: 82, armour: 64, day: 3, weekday: 'FRI', hour: 18.0, complete: 68 });
    G.city.setHour(18.0);
    G.renderer.setExposure(1.15);
    G.player.setMode('car', 0, 150, Math.PI); // z=150, heading north up the boulevard
    G.player.speed = 42.8; // 154 km/h
    G.player.drive(0, 0, 0, false, G.city.colliders);
    G.wanted.setWanted(5);
    // 26 m ahead (z≈124), 12 m up, 9 m to the player's left: beam pool lands on the road just ahead of the hero car, inside the cover frame
    G.wanted.setHeli(26, 12, -9);
    baseUi(G, save);
    G.ui.location = 'PALM BOULEVARD · Vela Cruz';
    G.ui.dialogue = { ...CHARACTERS.mara, line: 'Lose that helicopter before you bring the money to my garage!' };
    G.ui.stolen = true;
    G.city.setWet(true);
    G.traffic.setNight(true);
    stageTrafficNear(G, [[0, 134], [1, 121], [8, 107], [9, 96], [16, -180], [17, 180]], [[0, -11, 140], [1, 11, 128], [2, -11, 113], [3, 11, 119], [4, -13, 136], [5, -17, 124], [6, -12, 148]]);
    // Cover: 5-star chase down Palm Boulevard. Low 3/4 rear-left so the rear face + left flank +
    // wheels + ground shadow all read, and the roof stops dominating.
    //   behind:  z=154 vs car rear z=150  -> 4 m behind (was 6)
    //   left:    x=-4.5 vs centreline x=0 -> 4.5 m to the car's left
    //   height:  1.05 m (down ~40% from 1.8)
    // lookAt must sit ON the ray cam -> car rear-top (0, 1.25, 150), extended forward by the same
    // factor the old shot used. Old: dir (16.7,-3.3,100)-(-2.0,1.8,156) = (18.7,-5.1,-56), |.|=59.26,
    // over the unit-ish (2,-0.55,-6) with |.|=6.35  ->  59.26/6.35 = 9.3x.
    // New: dir to rear-top = (0,1.25,150)-(-4.5,1.05,154) = (4.5, 0.2, -4), |.| = 6.02.
    //   9.3 * (4.5, 0.2, -4) = (41.85, 1.86, -37.2)
    //   lookAt = (-4.5+41.85, 1.05+1.86, 154-37.2) = (37.35, 2.91, 116.8)
    // Car stays dead-centred (rear-top is exactly on the ray); aim swings right of the road axis,
    // pushing the road vanishing point + sun disc to the upper-left (~34% width, ~27% height).
    cam = [-4.5, 1.05, 154, 37.4, 2.9, 116.8];
  }
  syncHud(G, lookH, back);
  if (cam) G.renderer.setCam(...cam);
}
