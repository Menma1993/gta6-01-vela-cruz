// HUD: every DOM panel in index.html, driven from live game state each frame.
// Mission panel, VCPD response list, wanted stars, cash/clock, health/armour/
// REP bars, weapon slots, speed + vehicle + condition, radio line, dialogue
// with portrait, location card, badges, steal prompt, crosshair and toasts.
import { REP_RANKS, WEAPONS } from './config.js';
import { createMinimap } from './minimap.js';

const $ = (id) => document.getElementById(id);
const money = (n) => '$' + Math.floor(n).toLocaleString('en-US');

// F5 — drawn flat cartoon portrait for the dialogue box (fills the 52x52 circular div)
const FACE_SKIN = { M: '#E8B98A', N: '#C98A5A', D: '#D9A986', S: '#E8C39A', R: '#C98A5A' };
const FACE_HAIR = {
  M: { hair: '<path d="M26 14C17 14 11 20 11 30v9h5v-9c0-5 4-9 10-9s10 4 10 9v9h5v-9c0-10-6-16-15-16z" fill="#2A1A12"/>' },
  N: { hair: '<path d="M26 15c-8 0-13 6-13 14v3h4v-3c0-5 4-9 9-9s9 4 9 9v3h4v-3c0-8-5-14-13-14z" fill="#141414"/><circle cx="40" cy="22" r="4" fill="#141414"/>' },
  D: { hair: '<path d="M13 29c0-8 6-13 13-13s13 5 13 13c-2-5-6-7-13-7s-11 2-13 7z" fill="#1A1A1A"/>' },
  S: { hair: '<path d="M13 28c0-8 6-13 13-13s13 5 13 13c-3-4-7-5-13-5s-10 1-13 5z" fill="#8A8A8A"/>' },
  R: { hair: '<path d="M13 29c0-8 6-13 13-13s13 5 13 13c-2-5-6-7-13-7s-11 2-13 7z" fill="#5A2E1A"/><circle cx="26" cy="10" r="5" fill="#5A2E1A"/>' }
};
function faceSVG(d) {
  const k = (d && d.initial) ? d.initial : 'D';
  const skin = FACE_SKIN[k] || '#D9A986';
  const hair = (FACE_HAIR[k] || FACE_HAIR.D).hair;
  const bg = (d && d.color) ? d.color : '#333';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" width="52" height="52" style="display:block">` +
    `<rect width="52" height="52" fill="${bg}"/>` +
    `<ellipse cx="26" cy="30" rx="13" ry="14" fill="${skin}"/>` +
    hair +
    `<circle cx="21" cy="30" r="1.8" fill="#1A1A1A"/>` +
    `<circle cx="31" cy="30" r="1.8" fill="#1A1A1A"/>` +
    `<path d="M21 38Q26 42 31 38" stroke="#7A3A2A" stroke-width="1.6" fill="none" stroke-linecap="round"/>` +
    `</svg>`;
}

export function createHud() {
  const minimap = createMinimap($('minimap'));
  const weaponEl = $('weapons');
  const slots = WEAPONS.map((w, i) => {
    const d = document.createElement('div');
    d.className = 'wslot' + (i === 2 ? ' sel' : '');
    weaponEl.appendChild(d);
    return d;
  });
  let toastTimer = null;

  function stars(n) {
    let s = '';
    for (let i = 0; i < 5; i += 1) s += i < n ? '★' : '<span class="off">★</span>';
    return s;
  }

  return {
    update(state) {
      const job = state.job;
      $('missionTitle').textContent = `MISSION ${job.n} / 8 · ${job.name}`;
      $('missionObj').textContent = job.obj;
      $('missionSub').textContent = `STORY ${state.save.storyDone} / 8 · REP ${state.save.rep} · ${state.save.repProgress}%`;
      const next = state.nextJob;
      $('missionNext').textContent = next ? `NEXT ▸ ${next.name} — ${money(next.pay)}` : 'NEXT ▸ —';
      const rows = state.policeRows.map((r) => `<tr><td>${r.name}</td><td class="d">${r.dist} m</td><td class="s">${r.state}</td></tr>`).join('');
      $('vcpdTable').innerHTML = rows;
      $('pursuitBanner').style.display = 'none'; // v7: banner removed — top entries have no centre banner
      $('vcpdTag').textContent = state.wanted >= 3 ? 'IN SIGHT' : state.wanted > 0 ? 'PURSUIT' : 'CLEAR';
      $('wantedLine').textContent = state.wanted > 0 ? `WANTED${state.wanted >= 3 ? ' · AIR-1' : ''}` : 'WANTED · CLEAR';
      $('stars').innerHTML = stars(state.wanted);
      $('cash').textContent = money(state.save.cash);
      $('clock').textContent = `${state.save.weekday} ${state.clock} · DAY ${state.save.day}`;
      $('healthBar').style.width = state.save.health + '%';
      $('armourBar').style.width = state.save.armour + '%';
      $('repBar').style.width = state.save.repProgress + '%';
      $('repBar').parentElement.previousSibling.textContent = `REP ${state.save.rep} · ${REP_RANKS[state.save.rep]}`;
      $('locCard').textContent = state.location;
      $('portrait').innerHTML = faceSVG(state.dialogue);
      $('portrait').style.background = state.dialogue.color;
      $('dlgWho').textContent = state.dialogue.name;
      $('dlgLine').textContent = state.dialogue.line;
      slots.forEach((el, i) => {
        const w = state.weapons[i];
        el.classList.toggle('sel', i === state.selectedWeapon);
        const ammo = w.mag === Infinity ? '∞' : `${w.mag} / ${w.reserve}`;
        el.innerHTML = `${i + 1} · ${w.name}<div class="ammo">${ammo}</div>`;
      });
      const kmh = Math.round(Math.abs(state.speed) * 3.6);
      $('speed').innerHTML = `${kmh} <small>KM/H</small>`;
      $('vehName').textContent = state.vehicleName;
      $('vehCond').textContent = state.mode === 'foot'
        ? `ON FOOT · ${state.save.health}% HEALTH`
        : state.mode === 'boat'
          ? `HULL ${state.condition}% · RIVER`
          : `CONDITION ${state.condition}% · G${state.gear} · ${state.nitro ? 'NITRO READY' : 'NITRO EMPTY'}`;
      $('radio').textContent = state.radioLabel;
      $('badgeRoadblock').style.display = state.wanted >= 4 && state.mode !== 'boat' ? 'block' : 'none';
      $('badgeStolen').style.display = state.stolen ? 'block' : 'none';
      $('badgeStolen').textContent = `VEHICLE STOLEN: ${state.vehicleName}`;
      $('badgeBridge').style.display = state.bridgeLift ? 'block' : 'none';
      $('badgeBridge').textContent = `🌉 BRIDGE LIFT ${state.bridgeLift}`;
      $('stealPrompt').style.display = state.steal ? 'block' : 'none';
      if (state.steal) $('stealSub').textContent = state.steal;
      $('crosshair').style.display = state.mode === 'foot' ? 'block' : 'none';
      minimap.draw({
        player: state.player, police: state.policeDots, heli: state.heliDot,
        shells: state.shells, jobMarker: state.jobMarker,
      });
    },
    toast(msg, ms = 2200) {
      const el = $('toast');
      el.textContent = msg;
      el.style.top = '14%';          // anchor near top, clear of the centre-frame hero car
      el.style.bottom = 'auto';
      el.style.display = 'block';
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { el.style.display = 'none'; }, ms);
    },
    showHud(show) { $('hud').style.display = show ? '' : 'none'; },
  };
}
