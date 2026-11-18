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
  g.fillStyle = '#e6dcc8'; g.fillRect(0, 0, 256, 512);
  // Subtle plaster noise.
  for (let i = 0; i < 1400; i += 1) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(120,100,70,0.06)' : 'rgba(255,250,235,0.07)';
    g.fillRect(Math.random() * 256, Math.random() * 512, 2 + Math.random() * 4, 2 + Math.random() * 4);
  }
  // Floor separator lines (every 64 px = one floor). v3.1: faint — at close
  // range in the night shot the strong lines read as a barcode.
  g.fillStyle = 'rgba(90,70,50,0.16)';
  for (let y = 64; y < 512; y += 64) g.fillRect(0, y, 256, 2);
  // Window grid: 4 columns x 7 floors. Glass is mid blue-grey (not near-black)
  // so faces don't go stripy in low light; a few are warm-lit.
  for (let fy = 0; fy < 7; fy += 1) {
    for (let fx = 0; fx < 4; fx += 1) {
      const x = 18 + fx * 58;
      const y = 22 + fy * 64;
      const r = Math.random();
      if (r < 0.62) g.fillStyle = '#3d4c66';
      else if (r < 0.78) g.fillStyle = '#2c3a50';
      else if (r < 0.9) g.fillStyle = '#ffc46a';
      else g.fillStyle = '#9fd8ef';
      g.fillRect(x, y, 34, 40);
      // Window frame + sill highlight.
      g.fillStyle = 'rgba(255,255,255,0.10)';
      g.fillRect(x, y, 34, 3);
      g.fillStyle = 'rgba(60,45,30,0.3)';
      g.fillRect(x, y + 40, 34, 3);
    }
  }
  // Ground-floor shopfront band: darker plaster + big glass panes + awning stripe.
  g.fillStyle = '#a08a72'; g.fillRect(0, 448, 256, 64);
  g.fillStyle = '#2c3a50';
  g.fillRect(16, 462, 96, 38);
  g.fillRect(144, 462, 96, 38);
  g.fillStyle = '#c96a2e'; g.fillRect(0, 448, 256, 8);
  // Parapet cap at the roofline.
  g.fillStyle = '#8a7a62'; g.fillRect(0, 0, 256, 10);
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
  // v3.1: bands in a NARROW ochre value range with soft edges — the v3
  // high-contrast bands read as a barcode on the canyon walls and mesa.
  const bands = ['#a87c50', '#96683f', '#b0885c', '#8a6a44', '#b59a6a', '#9c7448', '#8a6a44'];
  let y = 0;
  let bi = 0;
  while (y < 256) {
    const h = 36 + Math.random() * 28; // fewer, taller bands
    g.fillStyle = bands[bi % bands.length];
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x * 0.02 + bi) * 4);
    g.lineTo(512, y + h);
    g.lineTo(0, y + h);
    g.closePath();
    g.fill();
    y += h;
    bi += 1;
  }
  // Darker vertical crevice streaks running down the face (v3.1: softer).
  for (let i = 0; i < 46; i += 1) {
    const x = Math.random() * 512;
    const w = 2 + Math.random() * 6;
    const len = 30 + Math.random() * 120;
    const sy = Math.random() * 200;
    const grad = g.createLinearGradient(0, sy, 0, sy + len);
    grad.addColorStop(0, 'rgba(40,25,12,0.32)');
    grad.addColorStop(1, 'rgba(40,25,12,0)');
    g.fillStyle = grad;
    g.fillRect(x, sy, w, len);
  }
  // Speckle + a few pale lichen dots.
  for (let i = 0; i < 2600; i += 1) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(60,40,20,0.14)' : 'rgba(220,190,140,0.10)';
    g.fillRect(Math.random() * 512, Math.random() * 256, 1 + Math.random() * 3, 1 + Math.random() * 3);
  }
  for (let i = 0; i < 60; i += 1) {
    g.fillStyle = 'rgba(122,122,90,0.5)';
    g.beginPath();
    g.arc(Math.random() * 512, 190 + Math.random() * 66, 2 + Math.random() * 5, 0, Math.PI * 2);
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
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#35353b'; g.fillRect(0, 0, 256, 256);
  // Darker worn patches.
  for (let i = 0; i < 22; i += 1) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(20,20,24,0.20)' : 'rgba(70,70,78,0.14)';
    g.beginPath();
    g.ellipse(Math.random() * 256, Math.random() * 256, 14 + Math.random() * 42, 10 + Math.random() * 30, Math.random() * 3, 0, Math.PI * 2);
    g.fill();
  }
  // Dense aggregate speckle: pale stone chips + dark tar dots.
  for (let i = 0; i < 5200; i += 1) {
    const v = Math.random();
    g.fillStyle = v < 0.45 ? 'rgba(150,150,160,0.20)' : v < 0.8 ? 'rgba(15,15,18,0.22)' : 'rgba(210,205,190,0.10)';
    g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  // Hairline cracks: short dark polylines.
  for (let i = 0; i < 14; i += 1) {
    g.strokeStyle = 'rgba(12,12,14,0.35)';
    g.lineWidth = 1;
    g.beginPath();
    let x = Math.random() * 256, y = Math.random() * 256;
    g.moveTo(x, y);
    for (let s = 0; s < 5; s += 1) { x += (Math.random() - 0.5) * 36; y += (Math.random() - 0.5) * 36; g.lineTo(x, y); }
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function groundTexture() {
  const [c, g] = canvas(512, 512);
  g.fillStyle = '#8a7a5e'; g.fillRect(0, 0, 512, 512);
  // Large soft patches: sun-baked pale dust vs darker packed dirt.
  for (let i = 0; i < 34; i += 1) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(190,165,120,0.14)' : 'rgba(70,52,32,0.13)';
    g.beginPath();
    g.ellipse(Math.random() * 512, Math.random() * 512, 30 + Math.random() * 70, 22 + Math.random() * 50, Math.random() * 3, 0, Math.PI * 2);
    g.fill();
  }
  // Fine speckle.
  for (let i = 0; i < 5200; i += 1) {
    const v = Math.random();
    g.fillStyle = v < 0.5 ? 'rgba(60,45,28,0.16)' : 'rgba(210,190,150,0.12)';
    const r = 1 + Math.random() * 3;
    g.beginPath(); g.arc(Math.random() * 512, Math.random() * 512, r, 0, Math.PI * 2); g.fill();
  }
  // Pebbles.
  for (let i = 0; i < 260; i += 1) {
    g.fillStyle = Math.random() < 0.5 ? '#6b5a44' : '#a8906c';
    g.beginPath();
    g.arc(Math.random() * 512, Math.random() * 512, 1.5 + Math.random() * 2, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(7, 7);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
