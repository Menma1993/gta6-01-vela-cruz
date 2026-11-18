// Save / continue: one localStorage slot. The save holds cash, story progress,
// reputation, health/armour, clock, collectibles, stunts, races, cops lost and
// properties — everything the title screen's Continue line summarises.
import { SAVE_KEY, defaultSave } from './config.js';

export function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.cash !== 'number' || typeof data.storyDone !== 'number') return null;
    return { ...defaultSave(), ...data };
  } catch {
    return null;
  }
}

export function writeSave(save) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

/** Seed the mid-game save (story 6/8) the first time a fresh browser plays. */
export function ensureSave() {
  const existing = readSave();
  if (existing) return existing;
  const fresh = defaultSave();
  writeSave(fresh);
  return fresh;
}

export function newGameSave() {
  const fresh = { ...defaultSave(), cash: 500, storyDone: 0, rep: 1, repProgress: 0, health: 100, armour: 0, day: 1, weekday: 'MON', hour: 9.0, shells: 0, stunts: 0, racesWon: 0, copsLost: 0, propertiesOwned: 0, complete: 4 };
  writeSave(fresh);
  return fresh;
}
