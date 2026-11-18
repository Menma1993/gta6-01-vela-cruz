// Story + side content: 8 story jobs with names, bosses and payouts, 3 street
// races, 6 stunt jumps, 20 Sun Shell collectibles, 2 buyable properties and
// 4 shops. Everything the map shot lists exists here as real state.
import { STORY_JOBS, RACES, STUNTS, PROPERTIES, SHOPS, COLLECTIBLES_TOTAL } from './config.js';

export function createStory(save) {
  const state = {
    jobs: STORY_JOBS.map((j) => ({ ...j, done: j.n <= save.storyDone, active: j.n === save.storyDone + 1 })),
    races: RACES.map((r, i) => ({ ...r, won: i < save.racesWon })),
    stunts: STUNTS.map((s, i) => ({ name: s, done: i < save.stunts })),
    shellsFound: save.shells,
    properties: PROPERTIES.map((p) => ({ ...p })),
    shops: SHOPS,
    copsLost: save.copsLost,
  };

  return {
    state,
    /** Rebuild job done/active flags from a save (staged shots mutate the save after boot). */
    reset(saveRef) {
      state.jobs.forEach((j) => { j.done = j.n <= saveRef.storyDone; j.active = j.n === saveRef.storyDone + 1; });
      state.races.forEach((r, i) => { r.won = i < saveRef.racesWon; });
      state.stunts.forEach((s, i) => { s.done = i < saveRef.stunts; });
      state.shellsFound = saveRef.shells;
      state.properties.forEach((p, i) => { p.owned = i < saveRef.propertiesOwned; });
      state.copsLost = saveRef.copsLost;
    },
    activeJob() { return state.jobs.find((j) => j.active) || state.jobs[state.jobs.length - 1]; },
    /** Finish the active job: pay out, advance story, bump REP. Returns the payout. */
    completeJob(saveRef) {
      const job = state.jobs.find((j) => j.active);
      if (!job) return 0;
      job.done = true; job.active = false;
      const next = state.jobs.find((j) => j.n === job.n + 1);
      if (next) next.active = true;
      saveRef.cash += job.pay;
      saveRef.storyDone = job.n;
      saveRef.repProgress = Math.min(99, saveRef.repProgress + 6);
      if (saveRef.repProgress >= 90 && saveRef.rep < 5) { saveRef.rep += 1; saveRef.repProgress = 10; }
      saveRef.complete = Math.min(99, Math.round((saveRef.storyDone / 8) * 70 + (saveRef.shells / COLLECTIBLES_TOTAL) * 10 + (saveRef.stunts / 6) * 10 + (saveRef.racesWon / 3) * 10));
      return job.pay;
    },
    collectShell(saveRef) {
      if (state.shellsFound >= COLLECTIBLES_TOTAL) return false;
      state.shellsFound += 1;
      saveRef.shells = state.shellsFound;
      saveRef.cash += 150;
      return true;
    },
    winRace(saveRef, i) {
      if (state.races[i].won) return 0;
      state.races[i].won = true;
      saveRef.racesWon += 1;
      saveRef.cash += 1200;
      return 1200;
    },
    landStunt(saveRef, i) {
      if (state.stunts[i].done) return false;
      state.stunts[i].done = true;
      saveRef.stunts += 1;
      saveRef.cash += 400;
      return true;
    },
    buyProperty(saveRef, i) {
      const p = state.properties[i];
      if (p.owned || saveRef.cash < p.price) return false;
      p.owned = true;
      saveRef.cash -= p.price;
      saveRef.propertiesOwned += 1;
      return true;
    },
    /** Respray clears heat: wanted drops to zero, costs $250. */
    respray(saveRef) {
      if (saveRef.cash < 250) return false;
      saveRef.cash -= 250;
      return true;
    },
  };
}
