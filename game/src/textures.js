// Vela Cruz texture atlases (v3): procedural CanvasTexture detail so the city
// reads as a place at tile size, not flat boxes. All textures are drawn once,
// shared, and cheap: the facade atlas tints through instanceColor, the strata
// atlas gives the canyon walls rock banding, the ground gets larger tonal
// patches. No new draw calls — these ride on materials that already exist.
import * as THREE from '../vendor/three.module.min.js';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

/**
 * Facade atlas (256x512): light warm-grey plaster so the per-district
 * instanceColor still provides the hue (map * color * instanceColor).
 * Window grid with varied glass, floor separator lines, a darker ground-floor
 * shopfront band, and a parapet cap. Applied to every building face, so a
 * block seen from any angle has windows instead of a blank slab.
 */
export function facadeTexture() {
  const [c, g] = canvas(256, 512);
  g.fillStyle = '#e8dfcb'; g.fillRect(0, 0, 256, 512);
  // Per-floor tone wash: warm / cool alternation, stays light for tinting.
  for (let f = 0; f < 8; f += 1) {
    g.fillStyle = f % 2 === 0 ? 'rgba(255,226,182,0.20)' : 'rgba(200,214,234,0.15)';
    g.fillRect(0, f * 64, 256, 64);
    g.fillStyle = f % 3 === 0 ? 'rgba(120,96,66,0.05)' : 'rgba(255,255,255,0.06)';
    g.fillRect(0, f * 64, 256, 64);
  }
  // Plaster grain.
  for (let i = 0; i < 1800; i += 1) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(120,100,70,0.06)' : 'rgba(255,250,235,0.08)';
    g.fillRect(Math.random() * 256, Math.random() * 512, 2 + Math.random() * 4, 2 + Math.random() * 4);
  }
  // Floor lines every 64 px: soft shadow gradient + dark core + light lip.
  for (let y = 64; y < 512; y += 64) {
    const gr = g.createLinearGradient(0, y - 4, 0, y + 6);
    gr.addColorStop(0, 'rgba(90,70,50,0)');
    gr.addColorStop(0.45, 'rgba(88,68,46,0.24)');
    gr.addColorStop(0.6, 'rgba(70,52,34,0.30)');
    gr.addColorStop(1, 'rgba(90,70,50,0)');
    g.fillStyle = gr;
    g.fillRect(0, y - 4, 256, 10);
    g.fillStyle = 'rgba(255,250,238,0.20)';
    g.fillRect(0, y + 3, 256, 1);
  }
  // Windows: 4 cols x 7 floors, heavier frames, blinds, lit panes, AC boxes.
  for (let fy = 0; fy < 7; fy += 1) {
    for (let fx = 0; fx < 4; fx += 1) {
      const x = 18 + fx * 58;
      const y = 22 + fy * 64;
      const r = Math.random();
      // Recessed frame.
      g.fillStyle = r > 0.78 ? 'rgba(56,40,24,0.52)' : 'rgba(72,56,38,0.28)';
      g.fillRect(x - 2, y - 2, 38, 44);
      let glass;
      if (r < 0.46) glass = '#3d4c66';
      else if (r < 0.62) glass = '#2c3a50';
      else if (r < 0.76) glass = '#46587a';
      else if (r < 0.9) glass = '#ffc46a';
      else glass = '#9fd8ef';
      g.fillStyle = glass;
      g.fillRect(x, y, 34, 40);
      // Mullion + head reveal.
      g.fillStyle = 'rgba(28,22,16,0.26)';
      g.fillRect(x + 16, y, 2, 40);
      g.fillStyle = 'rgba(255,255,255,0.14)';
      g.fillRect(x, y, 34, 2);
      // Half-drawn blind = pale horizontal bar mid-pane.
      if (r > 0.26 && r < 0.42) {
        g.fillStyle = 'rgba(236,226,204,0.62)';
        g.fillRect(x, y + 3, 34, 12 + Math.random() * 8);
        g.fillStyle = 'rgba(120,108,88,0.35)';
        g.fillRect(x, y + 16 + Math.random() * 5, 34, 1);
      }
      // Sill shadow + lit top edge.
      g.fillStyle = 'rgba(52,40,26,0.34)';
      g.fillRect(x - 3, y + 40, 40, 4);
      g.fillStyle = 'rgba(255,248,232,0.24)';
      g.fillRect(x - 3, y + 40, 40, 1);
      // AC box tucked under some sills.
      if (Math.random() < 0.16) {
        g.fillStyle = '#bab3a5';
        g.fillRect(x + 7, y + 44, 20, 9);
        g.fillStyle = 'rgba(40,34,26,0.45)';
        g.fillRect(x + 7, y + 44, 20, 1);
        g.fillRect(x + 7, y + 52, 20, 1);
        g.fillStyle = 'rgba(40,34,26,0.22)';
        g.fillRect(x + 7, y + 48, 20, 1);
      }
    }
  }
  // Shopfront band: darker plaster + striped awning over two shops.
  g.fillStyle = '#a48d74'; g.fillRect(0, 448, 256, 64);
  g.fillStyle = 'rgba(58,42,26,0.20)'; g.fillRect(0, 448, 256, 2);
  for (let sx = 0; sx < 256; sx += 16) {
    g.fillStyle = (sx / 16) % 2 === 0 ? '#c9682c' : '#e7d5ae';
    g.fillRect(sx, 448, 16, 14);
  }
  g.fillStyle = 'rgba(48,32,18,0.45)'; g.fillRect(0, 462, 256, 2);
  // Left shop: teal glass.
  g.fillStyle = '#17565c'; g.fillRect(16, 464, 96, 34);
  g.fillStyle = 'rgba(150,230,235,0.32)'; g.fillRect(16, 464, 96, 5);
  g.fillStyle = 'rgba(8,26,30,0.35)'; g.fillRect(16, 494, 96, 4);
  // Right shop: warm glass.
  g.fillStyle = '#8a5a26'; g.fillRect(144, 464, 96, 34);
  g.fillStyle = 'rgba(255,204,130,0.38)'; g.fillRect(144, 464, 96, 6);
  g.fillStyle = 'rgba(255,240,200,0.16)'; g.fillRect(144, 476, 96, 8);
  g.fillStyle = 'rgba(52,32,12,0.35)'; g.fillRect(144, 494, 96, 4);
  // Mullions across both panes.
  g.fillStyle = 'rgba(30,22,14,0.45)';
  g.fillRect(62, 464, 3, 34);
  g.fillRect(190, 464, 3, 34);
  g.fillStyle = 'rgba(255,248,232,0.18)';
  g.fillRect(0, 498, 256, 1);
  // Parapet cap at the roofline.
  g.fillStyle = '#8d7c63'; g.fillRect(0, 0, 256, 10);
  g.fillStyle = 'rgba(255,248,232,0.22)'; g.fillRect(0, 0, 256, 3);
  g.fillStyle = 'rgba(50,38,24,0.32)'; g.fillRect(0, 10, 256, 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Rock strata atlas (512x256): horizontal bands of ochre / rust / tan with
 * wavy edges, darker vertical crevice streaks, speckle noise and a few scrub
 * dots near the base. Applied to canyon walls and the mesa sides so they read
 * as rock at tile size instead of a flat orange slab.
 */
export function strataTexture() {
  const [c, g] = canvas(512, 256);
  // Three readable families, worst-case contrast kept below barcode level.
  const tan = ['#c9b189', '#c1a678', '#d2bb95'];
  const ochre = ['#b2864f', '#a87c50', '#bb9160'];
  const rust = ['#8d5a33', '#7c4d2a', '#98663c'];
  const seq = [tan, ochre, rust, ochre, tan, rust, ochre];
  const bounds = [];
  let y = 0;
  let bi = 0;
  while (y < 256) {
    const h = 36 + Math.random() * 28;
    const fam = seq[bi % seq.length];
    g.fillStyle = fam[(Math.random() * fam.length) | 0];
    g.beginPath();
    g.moveTo(0, y + Math.sin(bi * 1.7) * 4);
    for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x * 0.014 + bi * 1.7) * 4);
    g.lineTo(512, y + h);
    g.lineTo(0, y + h);
    g.closePath();
    g.fill();
    // Inner shading gives each layer a rounded top/bottom.
    g.save();
    g.clip();
    const sh = g.createLinearGradient(0, y - 6, 0, y + h);
    sh.addColorStop(0, 'rgba(255,240,214,0.15)');
    sh.addColorStop(0.35, 'rgba(255,240,214,0)');
    sh.addColorStop(0.72, 'rgba(48,30,14,0.10)');
    sh.addColorStop(1, 'rgba(38,24,12,0.22)');
    g.fillStyle = sh;
    g.fillRect(0, y - 8, 512, h + 16);
    g.restore();
    bounds.push({ y, phase: bi * 1.7 });
    y += h;
    bi += 1;
  }
  // Soft boundary edges (two passes) + thin dark parting line between bands.
  bounds.forEach((b) => {
    for (let pass = 0; pass < 2; pass += 1) {
      const half = pass === 0 ? 7 : 2.5;
      g.fillStyle = pass === 0 ? 'rgba(52,34,16,0.09)' : 'rgba(52,34,16,0.16)';
      g.beginPath();
      g.moveTo(0, b.y + Math.sin(b.phase) * 4 - half);
      for (let x = 0; x <= 512; x += 32) g.lineTo(x, b.y + Math.sin(x * 0.014 + b.phase) * 4 - half);
      for (let x = 512; x >= 0; x -= 32) g.lineTo(x, b.y + Math.sin(x * 0.014 + b.phase) * 4 + half);
      g.closePath();
      g.fill();
    }
    g.strokeStyle = 'rgba(40,26,12,0.30)';
    g.lineWidth = 1 + Math.random();
    g.beginPath();
    g.moveTo(0, b.y + Math.sin(b.phase) * 4);
    for (let x = 0; x <= 512; x += 16) g.lineTo(x, b.y + Math.sin(x * 0.014 + b.phase) * 4);
    g.stroke();
  });
  // Vertical crevice streaks with soft gradients + lit lip.
  for (let i = 0; i < 64; i += 1) {
    const x = Math.random() * 512;
    const w = 1.5 + Math.random() * 5;
    const len = 26 + Math.random() * 110;
    const sy = Math.random() * 210;
    const grad = g.createLinearGradient(0, sy, 0, sy + len);
    grad.addColorStop(0, 'rgba(38,24,12,0.34)');
    grad.addColorStop(0.55, 'rgba(38,24,12,0.19)');
    grad.addColorStop(1, 'rgba(38,24,12,0)');
    g.fillStyle = grad;
    g.fillRect(x, sy, w, len);
    if (Math.random() < 0.55) {
      g.fillStyle = 'rgba(240,214,168,0.12)';
      g.fillRect(x + w + 1, sy, 1.5, len * 0.7);
    }
  }
  // Speckle.
  for (let i = 0; i < 4200; i += 1) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(60,40,20,0.14)' : 'rgba(224,196,148,0.11)';
    g.fillRect(Math.random() * 512, Math.random() * 256, 1 + Math.random() * 3, 1 + Math.random() * 3);
  }
  // Boulders and scrub dots along the base.
  for (let i = 0; i < 90; i += 1) {
    const bx = Math.random() * 512;
    const by = 190 + Math.random() * 66;
    const rad = 2 + Math.random() * 6;
    g.fillStyle = Math.random() < 0.35 ? 'rgba(104,102,62,0.55)' : 'rgba(58,44,28,0.55)';
    g.beginPath();
    g.ellipse(bx, by, rad, rad * 0.7, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(250,230,190,0.14)';
    g.beginPath();
    g.ellipse(bx - rad * 0.3, by - rad * 0.4, rad * 0.5, rad * 0.3, 0, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Asphalt atlas (256x256): dark grey with dense speckle, a few darker
 * patches and faint hairline cracks, so roads read as asphalt instead of a
 * flat grey plane. Tiled every ~8 m via UV scaling at the call site.
 */
export function asphaltTexture() {
  const S = 256;
  const [c, g] = canvas(S, S);
  // Redraw fn at wrapped offsets so nothing cuts at the tile border.
  const wrap = (x, y, pad, fn) => {
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        const px = x + dx * S, py = y + dy * S;
        if (px + pad < 0 || px - pad > S || py + pad < 0 || py - pad > S) continue;
        fn(px, py);
      }
    }
  };
  // r4: warm brown-grey base (was neutral #2e2e34) — golden-hour asphalt, not cold grey.
  g.fillStyle = '#38302a';
  g.fillRect(0, 0, S, S);

  // Broad mottle: keeps the wet pass reading patchy instead of one flat dark.
  for (let i = 0; i < 10; i += 1) {
    const x = Math.random() * S, y = Math.random() * S, r = 44 + Math.random() * 70;
    const pale = Math.random() < 0.4;
    const rgb = pale ? '104,104,116' : '14,14,18';
    const a = pale ? 0.05 : 0.06 + Math.random() * 0.05;
    wrap(x, y, r, (px, py) => {
      const grd = g.createRadialGradient(px, py, 0, px, py, r);
      grd.addColorStop(0, `rgba(${rgb},${a})`);
      grd.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = grd;
      g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill();
    });
  }

  // Tar-seal patches: irregular clusters of soft dark blobs.
  for (let i = 0; i < 12; i += 1) {
    const cx = Math.random() * S, cy = Math.random() * S;
    const rad = 16 + Math.random() * 30;
    const a = 0.05 + Math.random() * 0.07;
    for (let k = 0; k < 7; k += 1) {
      const ox = (Math.random() - 0.5) * rad * 2, oy = (Math.random() - 0.5) * rad * 2;
      const rx = rad * (0.35 + Math.random() * 0.65), ry = rad * (0.3 + Math.random() * 0.6);
      const rot = Math.random() * Math.PI;
      wrap(cx + ox, cy + oy, rad * 2, (px, py) => {
        g.fillStyle = `rgba(15,15,19,${a})`;
        g.beginPath(); g.ellipse(px, py, rx, ry, rot, 0, Math.PI * 2); g.fill();
      });
    }
  }

  // Pale oil-stain rings: thin, low alpha, double outline.
  for (let i = 0; i < 5; i += 1) {
    const x = Math.random() * S, y = Math.random() * S;
    const rx = 14 + Math.random() * 26, ry = rx * (0.5 + Math.random() * 0.45);
    const rot = Math.random() * Math.PI;
    wrap(x, y, rx + ry, (px, py) => {
      g.lineWidth = 1;
      g.strokeStyle = 'rgba(198,198,210,0.075)';
      g.beginPath(); g.ellipse(px, py, rx, ry, rot, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = 'rgba(198,198,210,0.05)';
      g.beginPath(); g.ellipse(px, py, rx * 0.7, ry * 0.7, rot, 0, Math.PI * 2); g.stroke();
    });
  }

  // Wheel-polish streaks: horizontal only, so 8 m tiling never stripes.
  for (let i = 0; i < 9; i += 1) {
    const x = Math.random() * S, y = Math.random() * S;
    const len = 70 + Math.random() * 110, h = 2 + Math.random() * 6;
    const a = 0.018 + Math.random() * 0.03;
    wrap(x, y, len, (px, py) => {
      const grd = g.createLinearGradient(px - len / 2, 0, px + len / 2, 0);
      grd.addColorStop(0, 'rgba(126,126,138,0)');
      grd.addColorStop(0.5, `rgba(126,126,138,${a})`);
      grd.addColorStop(1, 'rgba(126,126,138,0)');
      g.fillStyle = grd;
      g.fillRect(px - len / 2, py - h / 2, len, h);
    });
  }

  // Dense aggregate: pale chips, dark tar dots, quartz glints.
  for (let i = 0; i < 9500; i += 1) {
    const v = Math.random();
    g.fillStyle = v < 0.42 ? 'rgba(154,154,166,0.22)'
      : v < 0.78 ? 'rgba(11,11,15,0.28)'
      : 'rgba(216,210,192,0.12)';
    const w = 1 + Math.random() * 2, h = 1 + Math.random() * 2;
    const x = Math.random() * S, y = Math.random() * S;
    g.fillRect(x, y, w, h);
    if (x + w > S) g.fillRect(x - S, y, w, h);
    if (y + h > S) g.fillRect(x, y - S, w, h);
    if (x + w > S && y + h > S) g.fillRect(x - S, y - S, w, h);
  }

  // Hairline cracks: short dark polylines with a dominant direction.
  for (let i = 0; i < 16; i += 1) {
    const x0 = Math.random() * S, y0 = Math.random() * S;
    const ang = Math.random() * Math.PI * 2;
    const step = 13 + Math.random() * 24;
    const segs = 3 + Math.floor(Math.random() * 4);
    const pts = [];
    let x = 0, y = 0;
    for (let s = 0; s < segs; s += 1) {
      const a = ang + (Math.random() - 0.5) * 0.9;
      x += Math.cos(a) * step; y += Math.sin(a) * step;
      pts.push([x, y]);
    }
    wrap(x0, y0, step * segs * 1.3, (px, py) => {
      g.strokeStyle = 'rgba(10,10,13,0.32)';
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(px, py);
      for (let k = 0; k < pts.length; k += 1) g.lineTo(px + pts[k][0], py + pts[k][1]);
      g.stroke();
    });
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function groundTexture() {
  const S = 512;
  const [c, g] = canvas(S, S);
  // Redraw fn at wrapped offsets so nothing cuts at the tile border.
  const wrap = (x, y, pad, fn) => {
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        const px = x + dx * S, py = y + dy * S;
        if (px + pad < 0 || px - pad > S || py + pad < 0 || py - pad > S) continue;
        fn(px, py);
      }
    }
  };
  g.fillStyle = '#8a7a5e';
  g.fillRect(0, 0, S, S);

  // Broad tonal bands: pale dust vs packed dirt, soft enough to survive 7x7.
  for (let i = 0; i < 16; i += 1) {
    const x = Math.random() * S, y = Math.random() * S;
    const r = 90 + Math.random() * 150;
    const pale = Math.random() < 0.55;
    const rgb = pale ? '200,174,124' : '72,54,32';
    const a = pale ? 0.10 + Math.random() * 0.08 : 0.09 + Math.random() * 0.07;
    wrap(x, y, r, (px, py) => {
      const grd = g.createRadialGradient(px, py, 0, px, py, r);
      grd.addColorStop(0, `rgba(${rgb},${a})`);
      grd.addColorStop(0.6, `rgba(${rgb},${a * 0.55})`);
      grd.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = grd;
      g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill();
    });
  }

  // Darker tire-track arcs: low alpha, curved, wide.
  for (let i = 0; i < 4; i += 1) {
    const x = Math.random() * S, y = Math.random() * S;
    const len = 150 + Math.random() * 220;
    const bow = (Math.random() - 0.5) * 170;
    const a = 0.04 + Math.random() * 0.04;
    const lw = 10 + Math.random() * 12;
    wrap(x, y, len, (px, py) => {
      g.strokeStyle = `rgba(56,42,24,${a})`;
      g.lineWidth = lw;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(px - len / 2, py - bow * 0.5);
      g.quadraticCurveTo(px, py + bow, px + len / 2, py - bow * 0.5);
      g.stroke();
    });
  }

  // Mid-scale packed-dirt blotches to bridge the big bands and the speckle.
  for (let i = 0; i < 20; i += 1) {
    const x = Math.random() * S, y = Math.random() * S;
    const rx = 26 + Math.random() * 46, ry = rx * (0.55 + Math.random() * 0.5);
    const rot = Math.random() * Math.PI;
    const pale = Math.random() < 0.5;
    const rgb = pale ? '196,170,122' : '74,56,34';
    const a = pale ? 0.10 : 0.11;
    wrap(x, y, rx + ry, (px, py) => {
      g.fillStyle = `rgba(${rgb},${a})`;
      g.beginPath(); g.ellipse(px, py, rx, ry, rot, 0, Math.PI * 2); g.fill();
    });
  }

  // Fine speckle.
  for (let i = 0; i < 5000; i += 1) {
    const x = Math.random() * S, y = Math.random() * S, r = 1 + Math.random() * 3;
    g.fillStyle = Math.random() < 0.5 ? 'rgba(58,44,26,0.16)' : 'rgba(214,192,150,0.13)';
    wrap(x, y, r, (px, py) => {
      g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill();
    });
  }

  // Pebbles: body plus a tiny cast shadow.
  for (let i = 0; i < 620; i += 1) {
    const x = Math.random() * S, y = Math.random() * S;
    const r = 1.4 + Math.random() * 2.6;
    const rot = Math.random() * Math.PI;
    const col = Math.random() < 0.5 ? '#a8906c' : '#6b5a44';
    wrap(x, y, r + 3, (px, py) => {
      g.fillStyle = 'rgba(38,28,16,0.26)';
      g.beginPath(); g.ellipse(px + 0.8, py + 1, r * 1.1, r * 0.9, rot, 0, Math.PI * 2); g.fill();
      g.fillStyle = col;
      g.beginPath(); g.ellipse(px, py, r, r * 0.82, rot, 0, Math.PI * 2); g.fill();
    });
  }

  // Dry grass tufts: fan of pale straw blades, sparse.
  for (let i = 0; i < 190; i += 1) {
    const x = Math.random() * S, y = Math.random() * S;
    const n = 3 + Math.floor(Math.random() * 4);
    const spread = 6 + Math.random() * 9, tall = 7 + Math.random() * 12;
    const rgb = Math.random() < 0.5 ? '198,176,116' : '168,146,94';
    const blades = [];
    for (let b = 0; b < n; b += 1) {
      blades.push({
        t: b / Math.max(1, n - 1) - 0.5,
        a: 0.28 + Math.random() * 0.26,
        h: tall * (0.65 + Math.random() * 0.55),
        w: (Math.random() - 0.5) * 5,
      });
    }
    wrap(x, y, 26, (px, py) => {
      g.lineWidth = 1;
      g.lineCap = 'round';
      for (let b = 0; b < blades.length; b += 1) {
        const bl = blades[b];
        g.strokeStyle = `rgba(${rgb},${bl.a})`;
        g.beginPath();
        g.moveTo(px + bl.t * spread, py);
        g.quadraticCurveTo(px + bl.t * spread * 1.7, py - bl.h * 0.55, px + bl.t * spread * 2.1 + bl.w, py - bl.h);
        g.stroke();
      }
    });
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(7, 7);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
