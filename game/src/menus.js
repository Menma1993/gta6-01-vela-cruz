// Menus: the title screen (New Game / Continue with save summary / Controls)
// and the pause map (full city map, story job list with prices + states, stats,
// shops, the factual FEATURES line, Resume / Save Game / Quit to Title).
import { STORY_JOBS, DISTRICTS } from './config.js';

const $ = (id) => document.getElementById(id);
const money = (n) => '$' + Math.floor(n).toLocaleString('en-US');

export function createMenus(callbacks) {
  const title = $('titleOverlay');
  const map = $('mapOverlay');

  function jobRows(save) {
    return STORY_JOBS.map((j) => {
      const st = j.n <= save.storyDone ? '<span class="done">✓ DONE</span>'
        : j.n === save.storyDone + 1 ? '<span class="active">▶ ACTIVE</span>'
        : '<span class="locked">🔒 LOCKED</span>';
      return `<tr><td>${j.n}. ${j.name} — ${j.boss}</td><td class="price">${money(j.pay)}</td><td class="st">${st}</td></tr>`;
    }).join('');
  }

  function drawMapCanvas(save) {
    const c = $('mapCanvas');
    const g = c.getContext('2d');
    const W = c.width, H = c.height;
    g.fillStyle = '#0a1410'; g.fillRect(0, 0, W, H);
    const toX = (x) => ((x + 210) / 420) * W;
    const toY = (z) => ((z + 210) / 420) * H;
    // District blocks.
    g.fillStyle = '#3a5a44';
    for (const d of DISTRICTS) {
      g.fillRect(toX(d.x - d.w / 2), toY(d.z - d.d / 2), (d.w / 420) * W, (d.d / 420) * H);
      g.fillStyle = '#e8e2d0';
      g.font = 'bold 11px system-ui, sans-serif'; g.textAlign = 'center';
      g.fillText(d.name, toX(d.x), toY(d.z) - 4);
      g.fillStyle = '#3a5a44';
    }
    // River + bridge.
    g.fillStyle = '#2e7d9e'; g.fillRect(0, toY(-16), W, toY(16) - toY(-16));
    g.fillStyle = '#c9a227'; g.fillRect(toX(-8), toY(-16), toX(8) - toX(-8), toY(16) - toY(-16));
    g.fillStyle = '#e8e2d0'; g.font = 'bold 10px system-ui, sans-serif'; g.textAlign = 'left';
    g.fillText('VELA CRUZ BRIDGE', 8, toY(-22));
    // Roads.
    g.strokeStyle = '#555'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, toY(-60)); g.lineTo(W, toY(-60)); g.moveTo(0, toY(60)); g.lineTo(W, toY(60)); g.stroke();
    // Shops / points of interest (short labels, offset below the icon).
    const pois = [
      ['🏠', -48, -20, 'Safehouse'], ['🔫', -52, -58, 'Vela Arms'],
      ['👕', 54, -52, 'Threadline'], ['🎨', -56, 48, 'Respray Bay'],
      ['⚓', -24, 44, 'Boat dock'], ['🏥', -70, 130, 'VCPD HQ'],
    ];
    g.font = '12px system-ui, sans-serif'; g.textAlign = 'left';
    for (const [icon, x, z, label] of pois) {
      g.fillText(icon, toX(x) - 6, toY(z) + 4);
      // Boat dock's label goes below its icon so it cannot hit Respray Bay.
      if (label === 'Boat dock') g.fillText(label, toX(x) - 6, toY(z) + 20);
      else g.fillText(label, toX(x) + 10, toY(z) + 4);
    }
    // Player marker.
    g.fillStyle = '#ffd34d';
    g.beginPath(); g.arc(toX(0), toY(-40), 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#201600'; g.font = 'bold 10px system-ui, sans-serif'; g.textAlign = 'center';
    g.fillText('YOU', toX(0), toY(-40) + 3);
  }

  return {
    showTitle(save) {
      title.style.display = '';
      map.style.display = 'none';
      $('continueSub').textContent = save
        ? `Story ${save.storyDone + 1}/8 · ${money(save.cash)} · ${save.complete}% · Rep ${save.rep} · ${save.weekday} ${String(Math.floor(save.hour)).padStart(2, '0')}:${String(Math.round((save.hour % 1) * 60)).padStart(2, '0')}`
        : 'No save yet — start a new game';
      $('btnContinue').disabled = !save;
      $('btnContinue').style.opacity = save ? '' : '0.45';
    },
    showMap(save) {
      title.style.display = 'none';
      map.style.display = '';
      $('mapSub').textContent = `River port · canyon · mesa — ${save.complete}% COMPLETE · Story ${save.storyDone}/8 · ${money(save.cash)} · ${save.complete}% · REP ${save.rep}`;
      $('jobTable').innerHTML = jobRows(save);
      $('mapStats').innerHTML = `Cash ${money(save.cash)} · REP ${save.rep} · Sun Shells ${save.shells}/20 · Stunts ${save.stunts}/6 · Races won ${save.racesWon}/3 · Cops lost ${save.copsLost} · Properties ${save.propertiesOwned}/2<br>Shops: Vela Arms (gun store) · Threadline (clothing) · Respray Bay (respray — clears heat) · Safehouse (save + heal)<br>Next: THE CAUSEWAY RUN — The Floodgate Job — $6,000`;
      drawMapCanvas(save);
    },
    hideAll() { title.style.display = 'none'; map.style.display = 'none'; },
    wire() {
      $('btnNew').addEventListener('click', () => callbacks.onNew());
      $('btnContinue').addEventListener('click', () => callbacks.onContinue());
      $('btnControls').addEventListener('click', () => callbacks.onControls());
      $('btnResume').addEventListener('click', () => callbacks.onResume());
      $('btnSave').addEventListener('click', () => callbacks.onSave());
      $('btnQuit').addEventListener('click', () => callbacks.onQuit());
    },
  };
}
