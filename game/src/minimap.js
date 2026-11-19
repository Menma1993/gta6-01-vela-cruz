// Live minimap: a 190x190 round canvas, north-up. River band across the
// middle, the bridge avenue crossing it, district blocks, and dots for the
// player (white arrow), VCPD (red), the active job (yellow diamond) and
// Sun Shells (cyan). Redrawn every frame from live state — cheap at this size.
import { WORLD } from './config.js';

export function createMinimap(canvas) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const toX = (x) => ((x + WORLD.half) / (WORLD.half * 2)) * W;
  const toY = (z) => ((z + WORLD.half) / (WORLD.half * 2)) * H;

  return {
    draw(state) {
      ctx.clearRect(0, 0, W, H);
      // Land + districts.
      ctx.fillStyle = '#E8DCC0'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#D8C9A8';
      ctx.fillRect(toX(-150), toY(-105), 108, 81); // Old Crossing
      ctx.fillRect(toX(30), toY(-98), 99, 77); // Canal Row
      ctx.fillStyle = '#C9B18A';
      ctx.fillRect(toX(60), toY(-10), 135, 117); // Mesa Verde
      ctx.fillStyle = '#D8C9A8';
      ctx.fillRect(toX(-125), toY(75), 117, 81); // Port Vela
      ctx.fillRect(toX(-165), toY(10), 99, 81); // Neon Mile
      // District names — so the minimap reads as a map, not green blobs.
      ctx.fillStyle = 'rgba(90,70,40,0.95)';
      ctx.font = 'bold 9px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('OLD CROSSING', toX(-96), toY(-64));
      ctx.fillText('CANAL ROW', toX(80), toY(-60));
      ctx.fillText('MESA VERDE', toX(127), toY(48));
      ctx.fillText('PORT VELA', toX(-66), toY(115));
      ctx.fillText('NEON MILE', toX(-115), toY(50));
      // River (east-west band) + bridge deck.
      ctx.fillStyle = '#A8D8E8';
      ctx.fillRect(0, toY(-16), W, toY(16) - toY(-16));
      ctx.fillStyle = '#8A8A8A';
      ctx.fillRect(toX(-8), 0, toX(8) - toX(-8), H);
      // Roads.
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(0, toY(-60)); ctx.lineTo(W, toY(-60)); ctx.moveTo(0, toY(60)); ctx.lineTo(W, toY(60)); ctx.stroke();
      // Sun Shells.
      ctx.fillStyle = '#F5B81D';
      for (const s of state.shells || []) {
        if (s.taken) continue;
        ctx.beginPath(); ctx.arc(toX(s.x), toY(s.z), 2, 0, Math.PI * 2); ctx.fill();
      }
      // Active job marker.
      if (state.jobMarker) {
        ctx.fillStyle = '#E8442E';
        const jx = toX(state.jobMarker.x), jy = toY(state.jobMarker.z);
        ctx.beginPath(); ctx.moveTo(jx, jy - 6); ctx.lineTo(jx + 6, jy); ctx.lineTo(jx, jy + 6); ctx.lineTo(jx - 6, jy); ctx.closePath(); ctx.fill();
      }
      // VCPD units.
      ctx.fillStyle = '#E5484D';
      for (const u of state.police || []) {
        ctx.beginPath(); ctx.arc(toX(u.x), toY(u.z), 3.5, 0, Math.PI * 2); ctx.fill();
      }
      // Helicopter.
      if (state.heli) {
        ctx.fillStyle = '#FF7A1E';
        ctx.beginPath(); ctx.arc(toX(state.heli.x), toY(state.heli.z), 3, 0, Math.PI * 2); ctx.fill();
      }
      // Player arrow, rotated by heading: canvas up is -Z, heading 0 drives +Z.
      const px = toX(state.player.x), py = toY(state.player.z);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.PI - state.player.heading);
      ctx.fillStyle = '#141428';
      ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(5, 6); ctx.lineTo(0, 3); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
      ctx.restore();
      // North marker.
      ctx.fillStyle = '#141428';
      ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('N', W / 2, 14);
    },
  };
}
