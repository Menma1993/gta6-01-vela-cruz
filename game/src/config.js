// Vela Cruz — every tuning number, name and story datum in one place.
// The world is a river port split by the Vela River (water band z in [-16, 16]),
// crossed by the Vela Cruz Bridge on the north-south avenue x = 0. Districts:
// Old Crossing (south-west), Canal Row (south-east), Mesa Verde (east mesa),
// Port Vela (north), Neon Mile (west), Ironworks (north-east). Units are metres.

export const STEP = 1 / 60;
export const WORLD = { half: 210, riverHalf: 16, bridgeHalf: 70 };
export const SAVE_KEY = 'velacruz.save.v1';

export const PLAYER = {
  accel: 26, brake: 34, maxSpeed: 46, reverseMax: 12, steer: 1.9,
  driftGrip: 0.35, grip: 0.94, walkSpeed: 6.5, runSpeed: 10,
};

export const CAR = { length: 4.6, width: 2.0, height: 1.15 };
export const BOAT = { length: 6.4, width: 2.4, maxSpeed: 34 };

export const REP_RANKS = ['NOBODY', 'STREET KID', 'HUSTLER', 'KNOWN DRIVER', 'RIVER HUSTLER', 'VELA LEGEND'];
// index = rep level 0..5; level 4 shows "RIVER HUSTLER" (matches the 68% save).

export const CHARACTERS = {
  mara: { name: 'Mara Voss', initial: 'M', color: '#b3261e', role: 'fixer, Old Crossing garage' },
  nina: { name: 'Nina Kade', initial: 'N', color: '#7c3aed', role: 'river pilot, Port Vela' },
  dante: { name: 'Dante Reyes', initial: 'D', color: '#0e7490', role: 'wheelman, Mesa Verde' },
  silas: { name: 'Silas Grimm', initial: 'S', color: '#166534', role: 'club boss, Neon Mile' },
  rosa: { name: 'Rosa Delgado', initial: 'R', color: '#9a3412', role: 'Ironworks crew chief' },
};

export const STORY_JOBS = [
  { n: 1, name: 'THE FIRST KEY', boss: 'Mara Voss', pay: 1500, obj: 'Steal the Solano GT from the Canal Row lot', marker: { x: 60, z: -40 } },
  { n: 2, name: 'DUSTLINE RUN', boss: 'Dante Reyes', pay: 2200, obj: 'Outrun the VCPD across Mesa Verde', marker: { x: 120, z: 60 } },
  { n: 3, name: 'NEON DEBT', boss: 'Silas Grimm', pay: 2800, obj: 'Collect from Club Voltage — on foot, loud', marker: { x: -110, z: 55 } },
  { n: 4, name: 'THE RIVER CUT', boss: 'Nina Kade', pay: 3500, obj: 'Steal the Riverhawk speedboat at the Port Vela dock', marker: { x: -24, z: 44 } },
  { n: 5, name: 'IRONWORKS HEIST', boss: 'Rosa Delgado', pay: 4500, obj: 'Lift the Ironworks payroll truck', marker: { x: 110, z: 130 } },
  { n: 6, name: 'THE CAUSEWAY RUN', boss: 'Mara Voss', pay: 6000, obj: 'Ram the VCPD roadblock, then lose the cops', marker: { x: 0, z: -100 } },
  { n: 7, name: 'THE FLOODGATE JOB', boss: 'Nina Kade', pay: 6000, obj: 'Open the floodgate — escape by boat', marker: { x: 0, z: 100 } },
  { n: 8, name: 'VELA CRUZ', boss: 'Mara Voss', pay: 10000, obj: 'One last run: the whole city is watching', marker: { x: -48, z: -20 } },
];

export const RACES = [
  { name: 'Port Loop', boss: 'Nina Kade', laps: 3 },
  { name: 'Mesa Dash', boss: 'Dante Reyes', laps: 2 },
  { name: 'Canal Sprint', boss: 'Mara Voss', laps: 3 },
];

export const STUNTS = [
  'Mesa Drop', 'Bridge Gap', 'Canal Hop', 'Ironworks Ramp', 'Port Vela Leap', 'Neon Mile Jump',
];

export const COLLECTIBLES_TOTAL = 20; // Sun Shells hidden around the river, mesa and port
export const SHOPS = [
  { name: 'Vela Arms', kind: 'gun store', x: -52, z: -58 },
  { name: 'Threadline', kind: 'clothing', x: 54, z: -52 },
  { name: 'Respray Bay', kind: 'respray — clears heat', x: -56, z: 48 },
  { name: 'Safehouse', kind: 'save + heal', x: -48, z: -20 },
];
export const PROPERTIES = [
  { name: 'Canal Row Safehouse', price: 8000, owned: true },
  { name: 'Mesa Verde Garage', price: 12000, owned: false },
];

export const WEAPONS = [
  { name: 'FISTS', mag: Infinity, reserve: Infinity, damage: 12, rate: 0.35, auto: false },
  { name: 'PISTOL', mag: 12, reserve: 84, damage: 22, rate: 0.22, auto: false },
  { name: 'SMG', mag: 30, reserve: 120, damage: 14, rate: 0.08, auto: true },
  { name: 'SHOTGUN', mag: 6, reserve: 18, damage: 55, rate: 0.9, auto: false },
  { name: 'RIFLE', mag: 24, reserve: 96, damage: 34, rate: 0.14, auto: true },
];

export const RADIO = [
  { freq: 'RIO 92.5', name: 'Desert Radio', song: '“Canyon Lights”', artist: 'The Vultures', base: 196, scale: [0, 3, 5, 7, 10, 12] },
  { freq: 'VELA 88.1', name: 'Neon Drive', song: '“Midnight Ferry”', artist: 'Glass Palms', base: 220, scale: [0, 2, 3, 7, 8, 10] },
];

export const POLICE_UNITS = [
  { name: 'FALCON-2', state: 'RAMMING' },
  { name: 'COYOTE-7', state: 'RAMMING' },
  { name: 'HERON-11', state: 'PURSUIT' },
  { name: 'JAGUAR-4', state: 'ROADBLOCK' },
  { name: 'AIR-1', state: 'SPOTLIGHT' },
];

export const DISTRICTS = [
  { name: 'OLD CROSSING', x: -90, z: -60, w: 120, d: 90 },
  { name: 'CANAL ROW', x: 85, z: -55, w: 110, d: 85 },
  { name: 'MESA VERDE', x: 120, z: 60, w: 130, d: 110 },
  { name: 'PORT VELA', x: -60, z: 120, w: 130, d: 90 },
  { name: 'NEON MILE', x: -110, z: 55, w: 110, d: 90 },
  { name: 'IRONWORKS', x: 110, z: 130, w: 120, d: 90 },
];

export const PALETTE = {
  skyDay: 0x87b5d6, skyDusk: 0xf2a35e, skyNight: 0x0b1026,
  sunDusk: 0xffb36b, sunDay: 0xfff2cf, sunNight: 0x8fa3ff,
  ground: 0x8a7a5e, groundEast: 0x9c6b4a, road: 0x2e2f33, river: 0x2e6f7e,
  building: [0xF59E4C, 0xF27D6B, 0xFFC94D, 0xE87A90, 0xF2D8A7, 0x5A7D5A],
  police: 0xf2f2f2, policeTrim: 0x1a4fd6, heliBody: 0x1c2f4a, heliBelly: 0x0e1e3a,
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** The mid-game save the staged screenshots (and Continue) start from. */
export function defaultSave() {
  return {
    cash: 24680, storyDone: 5, rep: 4, repProgress: 68, health: 82, armour: 64,
    day: 3, weekday: 'FRI', hour: 17.4, shells: 7, stunts: 1, racesWon: 1,
    copsLost: 6, propertiesOwned: 1, complete: 68,
  };
}
