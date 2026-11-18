// Radio: two WebAudio stations, no audio files. Each station loops a short
// bass + pluck pattern built from its own scale; Q switches station. Audio
// only starts after a user gesture (start button / Space), per browser rules.
import { RADIO } from './config.js';

export function createRadio() {
  let ctx = null;
  let master = null;
  let station = 0;
  let timer = null;
  let step = 0;
  let on = false;

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.05;
    master.connect(ctx.destination);
  }

  function note(freq, when, dur, type, vol) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.connect(g); g.connect(master);
    osc.start(when); osc.stop(when + dur + 0.02);
  }

  function tick() {
    if (!on || !ctx) return;
    const st = RADIO[station];
    const now = ctx.currentTime + 0.05;
    const beat = 0.24;
    const deg = st.scale[step % st.scale.length];
    const f = st.base * Math.pow(2, deg / 12);
    if (step % 2 === 0) note(st.base / 2, now, beat * 1.8, 'triangle', 0.5);
    note(f, now, beat * 0.9, 'square', 0.12);
    if (step % 4 === 2) note(f * 2, now, beat * 0.5, 'sine', 0.15);
    step += 1;
    timer = setTimeout(tick, beat * 1000);
  }

  return {
    start() {
      ensure();
      if (!ctx) return;
      ctx.resume();
      if (!on) { on = true; step = 0; tick(); }
    },
    next() {
      station = (station + 1) % RADIO.length;
      step = 0;
      return RADIO[station];
    },
    current() { return RADIO[station]; },
    label() {
      const s = RADIO[station];
      return `♪ ${s.freq} · ${s.name} — ${s.song} · ${s.artist}`;
    },
    stop() { on = false; if (timer) clearTimeout(timer); },
  };
}
