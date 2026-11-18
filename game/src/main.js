// Vela Cruz — boot and the one loop. Screens: title, play, map (pause).
// ?seed=N fixes the world. ?shot=cover|night|map|boat stages that scene
// instead of running the loop, paints it a few times and sets
// window.__shotReady for a screenshot.
import { STEP, CHARACTERS } from './config.js';
import { createRandom } from './random.js';
import { createInput, ACT_CONFIRM, ACT_ENTER, ACT_RELOAD, ACT_MAP, ACT_RADIO, ACT_PAUSE, ACT_SLOT } from './input.js';
import { readSave, writeSave, ensureSave, newGameSave } from './save.js';
import { createRadio } from './radio.js';
import { createCity } from './city.js';
import { createTraffic } from './traffic.js';
import { createPlayer, createParkedCars, createPursuitBoats } from './vehicles.js';
import { createWanted } from './wanted.js';
import { createStory } from './story.js';
import { createWeapons } from './weapons.js';
import { createHud } from './hud.js';
import { createMenus } from './menus.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
createRandom(seed); // seeded world layout; the seed fixes traffic + buildings

const canvas = document.getElementById('gl');
const status = document.getElementById('status');
const city = createCity(seed);
const traffic = createTraffic(city.scene, seed + 1);
const player = createPlayer(city.scene);
const parked = createParkedCars(city.scene);
const pursuitBoats = createPursuitBoats(city.scene);
const wanted = createWanted(city.scene);
const weapons = createWeapons(city.scene);
const radio = createRadio();
const hud = createHud();
const renderer = createRenderer(canvas, city);

let save = ensureSave();
let story = createStory(save);
let screen = 'title';
let wantedTimer = 0;
let crimeTimer = 0;

const ui = {
  save, job: story.activeJob(), nextJob: story.state.jobs[1] || null,
  wanted: 0, stolen: false, bridgeLift: null, location: 'OLD CROSSING · Mara\'s Garage',
  dialogue: { ...CHARACTERS.mara, line: 'Lose that helicopter before you bring the money to my garage!' },
  radioLabel: radio.label(), speed: 0, mode: 'car', vehicleName: 'SOLANO GT',
  condition: 78, gear: 4, nitro: true, steal: null, policeRows: [], policeDots: [],
  heliDot: null, shells: city.shells, jobMarker: { x: 0, z: -100 }, weapons: weapons.slots,
  selectedWeapon: 2, clock: '17:24', player: { x: 0, z: -40, heading: Math.PI },
};

function clockStr(hour) {
  const h = Math.floor(hour) % 24;
  const m = Math.round((hour % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function announce(msg) { status.textContent = msg; }

function refreshJobUi() {
  ui.job = story.activeJob();
  ui.nextJob = story.state.jobs.find((j) => j.n === ui.job.n + 1) || null;
  ui.jobMarker = ui.job.marker;
}

function startPlay(fresh) {
  save = fresh ? newGameSave() : (readSave() || ensureSave());
  story = createStory(save);
  refreshJobUi();
  player.setMode('car', 0, -40, Math.PI);
  player.condition = 78;
  wanted.setWanted(0);
  city.setHour(save.hour);
  renderer.snap(player);
  screen = 'play';
  menus.hideAll();
  hud.showHud(true);
  radio.start();
  announce('Playing Vela Cruz. Drive with WASD, F to enter or steal a vehicle.');
}

const menus = createMenus({
  onNew: () => startPlay(true),
  onContinue: () => startPlay(false),
  onControls: () => hud.toast('WASD drive · F enter/steal · mouse aim · R reload · M map · Q radio', 4000),
  onResume: () => { screen = 'play'; menus.hideAll(); },
  onSave: () => { writeSave(save); hud.toast('GAME SAVED ✓', 2000); },
  onQuit: () => { screen = 'title'; menus.showTitle(save); },
});

function nearestStealable() {
  if (player.mode !== 'foot') return null;
  for (const c of parked) {
    if (c.taken) continue;
    const d = Math.hypot(c.x - player.x, c.z - player.z);
    if (d < 6) return { kind: 'car', obj: c, label: `${c.name} · parked · unlocked` };
  }
  const d = Math.hypot(city.dockPos.x - player.x, city.dockPos.z - player.z);
  if (d < 8) return { kind: 'boat', obj: null, label: 'Riverhawk Speedboat · docked · unlocked' };
  return null;
}

function step(dt) {
  const input = G_input;
  const { flags, slot } = input.takeActions();
  if (flags & ACT_MAP) {
    if (screen === 'play') { screen = 'map'; menus.showMap(save); }
    else if (screen === 'map') { screen = 'play'; menus.hideAll(); }
  }
  if (flags & ACT_PAUSE) {
    if (screen === 'play') { screen = 'map'; menus.showMap(save); }
    else if (screen === 'map') { screen = 'play'; menus.hideAll(); }
  }
  if (screen !== 'play') return;
  if (flags & ACT_RADIO) { radio.next(); ui.radioLabel = radio.label(); hud.toast(radio.label(), 1800); }
  if (flags & ACT_SLOT) { weapons.select(slot); ui.selectedWeapon = weapons.selected; }
  if (flags & ACT_RELOAD) weapons.reload();

  // Enter / steal / exit.
  if (flags & ACT_ENTER) {
    if (player.mode === 'foot') {
      const near = nearestStealable();
      if (near) {
        if (near.kind === 'car') {
          near.obj.taken = true;
          near.obj.mesh.visible = false;
          player.setMode('car', near.obj.x, near.obj.z, near.obj.ry);
          player.vehicleName = near.obj.name.toUpperCase();
        } else {
          player.setMode('boat', city.dockPos.x - 4, 0, Math.PI / 2);
        }
        wanted.setWanted(Math.max(wanted.wanted, 2));
        ui.stolen = true;
        hud.toast(`VEHICLE STOLEN: ${player.vehicleName}`, 2500);
        announce(`Stole ${player.vehicleName}. Wanted level ${wanted.wanted}.`);
      }
    } else {
      const mode = player.mode;
      player.setMode('foot', player.x + Math.cos(player.heading) * 3, player.z - Math.sin(player.heading) * 3, player.heading);
      ui.stolen = false;
      announce(mode === 'boat' ? 'Left the boat.' : 'Left the car.');
    }
  }

  // Drive / walk.
  if (player.mode === 'foot') {
    const fwd = input.throttle();
    const strafe = input.steer();
    const heading = player.heading + (input.mouseX() - 0.5) * 0.12;
    player.walk(dt, fwd, strafe, heading, city.colliders);
    if (input.mouseDown()) {
      const res = weapons.fire(player.x, player.z, player.heading);
      if (res) {
        if (res.killed) { save.cash += 50; hud.toast('CREW DOWN · +$50', 1500); }
        wanted.setWanted(Math.max(wanted.wanted, 3));
        crimeTimer = 0;
      }
    }
  } else {
    player.drive(dt, input.throttle(), input.steer(), input.handbrake(), city.colliders);
    if (input.handbrake() && Math.abs(player.speed) > 20 && Math.random() < dt * 0.5) {
      save.cash += 50; hud.toast('DRIFT ×2 · +$50', 1200);
    }
  }

  // Steal prompt.
  const near = nearestStealable();
  ui.steal = near ? near.label : null;

  // Wanted decay: 1 star per 45 s without crime.
  crimeTimer += dt;
  wantedTimer += dt;
  if (crimeTimer > 45 && wanted.wanted > 0 && wantedTimer > 45) {
    wanted.setWanted(wanted.wanted - 1);
    wantedTimer = 0;
    if (wanted.wanted === 0) hud.toast('HEAT CLEARED — YOU LOST THEM', 2500);
  }

  // Job marker: drive/walk to it to finish the active job.
  const jm = ui.jobMarker;
  if (Math.hypot(player.x - jm.x, player.z - jm.z) < 9) {
    const pay = story.completeJob(save);
    if (pay > 0) {
      refreshJobUi();
      wanted.setWanted(0);
      hud.toast(`JOB DONE · +$${pay.toLocaleString('en-US')}`, 3000);
      announce(`Job complete. Paid $${pay}.`);
      writeSave(save);
    }
  }

  // Shells: walk/drive over one to collect it.
  for (const s of city.shells) {
    if (!s.taken && Math.hypot(player.x - s.x, player.z - s.z) < 3) {
      s.taken = true; s.mesh.visible = false;
      story.collectShell(save);
      hud.toast('SUN SHELL +$150', 1500);
    }
  }

  // Clock advances slowly; day/night follows.
  save.hour += dt / 240;
  if (save.hour >= 24) { save.hour -= 24; save.day += 1; }
  ui.clock = clockStr(save.hour);
  city.setHour(save.hour);
  traffic.setNight(save.hour >= 19 || save.hour < 6.5);

  traffic.update(dt);
  wanted.update(dt, player);
  weapons.update(dt);
  city.update(dt, performance.now() / 1000);
  ui.speed = player.speed;
  ui.mode = player.mode;
  ui.vehicleName = player.vehicleName;
  ui.condition = player.condition;
  ui.wanted = wanted.wanted;
  ui.player = { x: player.x, z: player.z, heading: player.heading };
  ui.policeRows = wanted.rows();
  ui.policeDots = wanted.units.map((u) => ({ x: u.x, z: u.z }));
  const hp = wanted.heli.group.position;
  ui.heliDot = { x: hp.x, z: hp.z };
  ui.save = save;
  ui.radioLabel = radio.label();
  ui.weapons = weapons.slots;
  ui.selectedWeapon = weapons.selected;
}

const G_input = createInput(canvas);

function runShot(name) {
  const G = { player, wanted, city, traffic, weapons, story, ui, save, hud, menus, radio, renderer, pursuitBoats };
  stageShot(name, G);
  let painted = 0;
  function paint() {
    renderer.followSun(player); // v3: shadows stay centred on the player
    city.setPlayerLight(player.x, player.z);
    renderer.render();
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  city.setHour(save.hour);
  menus.showTitle(save);
  menus.wire();
  hud.showHud(false);
  announce('Vela Cruz. Press Space or click New Game to start.');
  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    if (screen === 'title') {
      const { flags } = G_input.takeActions();
      if (flags & ACT_CONFIRM) startPlay(false);
      traffic.update(STEP);
      city.update(STEP, now / 1000);
      renderer.follow(player, STEP);
    } else if (screen === 'play') {
      while (accumulator >= STEP) { step(STEP); accumulator -= STEP; }
      renderer.follow(player, STEP);
    } else if (screen === 'map') {
      G_input.takeActions();
      renderer.follow(player, STEP);
    }
    if (screen !== 'map') hud.update(ui);
    renderer.followSun(player); // v3: sun shadow frustum follows the player
    city.setPlayerLight(player.x, player.z);
    renderer.render();
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
