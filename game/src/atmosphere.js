// Vela Cruz atmosphere: sky dome shader, shader water, rain + dust particles,
// and the shared glow-sprite texture every light effect uses. One clear job:
// make the air, the light and the river look like a place, not a backdrop.
import * as THREE from '../vendor/three.module.min.js';

/** Soft radial glow (white core fading out) — lamps, sirens, heli beacon, muzzle. */
export function makeGlowTexture() {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const g = c.getContext('2d');
  const r = S / 2;
  // Hot core held out to 10% of the radius, then a long tail: at sprite size
  // the lamp has a solid white heart and a wide soft skirt that blooms.
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0.00, 'rgba(255,255,255,1)');
  grad.addColorStop(0.10, 'rgba(255,255,255,1)');
  grad.addColorStop(0.22, 'rgba(255,255,255,0.86)');
  grad.addColorStop(0.38, 'rgba(255,255,255,0.46)');
  grad.addColorStop(0.58, 'rgba(255,255,255,0.18)');
  grad.addColorStop(0.78, 'rgba(255,255,255,0.055)');
  grad.addColorStop(1.00, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(c);
}

/** Short vertical streak — rain drops and wet-road lamp reflections. */
export function makeStreakTexture() {
  const W = 32, H = 128;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  const d = img.data;
  for (let y = 0; y < H; y += 1) {
    const t = y / (H - 1);
    // Long taper (bright middle, soft ends) with a tail bias downward, so a
    // drop reads as motion and a road reflection reads as a smear.
    const sy = Math.pow(Math.sin(Math.PI * t), 1.25) * (0.62 + 0.38 * t);
    for (let x = 0; x < W; x += 1) {
      const dx = (x + 0.5) / W - 0.5;
      const core = Math.exp(-(dx * dx) / (2 * 0.035 * 0.035));
      const soft = Math.exp(-(dx * dx) / (2 * 0.150 * 0.150)) * 0.38;
      const a = Math.min(1, (core + soft) * sy);
      const i = (y * W + x) * 4;
      d[i] = 255; d[i + 1] = 255; d[i + 2] = 255;
      d[i + 3] = Math.round(a * 255);
    }
  }
  g.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(c);
}

/** Smooth value-noise tile, drawn once and scrolled by the water shader. */
export function makeNoiseTexture(size = 256) {
  // Deterministic integer hash — same river every load, no flicker on reload.
  const hash = (x, y) => {
    let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    n ^= n >>> 16;
    return (n >>> 0) / 4294967296;
  };
  const fade = (t) => t * t * (3 - 2 * t);
  // Value noise on a p x p lattice, wrapped by p so every octave tiles exactly
  // across the texture edge (the old blit left a visible seam line on the river).
  const cell = (u, v, p) => {
    const x = u * p, y = v * p;
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = fade(x - x0), fy = fade(y - y0);
    const xa = ((x0 % p) + p) % p, ya = ((y0 % p) + p) % p;
    const xb = (xa + 1) % p, yb = (ya + 1) % p;
    const n00 = hash(xa, ya), n10 = hash(xb, ya);
    const n01 = hash(xa, yb), n11 = hash(xb, yb);
    const a = n00 + (n10 - n00) * fx;
    const b = n01 + (n11 - n01) * fx;
    return a + (b - a) * fy;
  };
  // Four octaves: broad swells down to the fine chop the glint path rides on.
  const OCT = [[4, 0.46], [8, 0.27], [16, 0.16], [32, 0.11]];

  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y += 1) {
    const v = y / size;
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      let n = 0;
      for (let o = 0; o < OCT.length; o += 1) n += cell(u, v, OCT[o][0]) * OCT[o][1];
      n = Math.pow(n, 0.92); // slight lift -> crest lines stay readable at distance
      const val = 64 + Math.round(n * 190);
      const i = (y * size + x) * 4;
      d[i] = val; d[i + 1] = val; d[i + 2] = val; d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * Sky dome: three-stop gradient (zenith -> mid -> horizon haze), a thick
 * horizon band the fog matches, and a sun that actually behaves like a light
 * source — hot core, four overlapping halo widths, and a scatter wash near the
 * waterline. At night the same slot becomes a smaller, tighter moon over a
 * city-glow horizon with sparse stars. No per-frame work: setHour only writes
 * uniforms.
 */
export function createSky(scene) {
  const uniforms = {
    uTop: { value: new THREE.Color(0x2e6cb4) },
    uMid: { value: new THREE.Color(0x92bedd) },
    uHorizon: { value: new THREE.Color(0xe4dcc0) },
    uSunDir: { value: new THREE.Vector3(-0.45, 0.55, -0.6).normalize() },
    uSunColor: { value: new THREE.Color(0xfff6e0) },
    uHalo: { value: new THREE.Color(0xffe6bd) },
    uGlow: { value: new THREE.Color(0x000000) },
    uSunI: { value: 1.0 },
    uNight: { value: 0.0 },
    uHaze: { value: 0.85 },
    uDisc: { value: 1.0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_Position.z = gl_Position.w; // pin the dome to the far plane
      }`,
    fragmentShader: `
      uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHorizon;
      uniform vec3 uSunDir; uniform vec3 uSunColor; uniform vec3 uHalo; uniform vec3 uGlow;
      uniform float uSunI; uniform float uNight; uniform float uHaze; uniform float uDisc;
      varying vec3 vDir;

      float hash31(vec3 p) {
        p = fract(p * 0.3183099 + vec3(0.11, 0.27, 0.43));
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y, -0.10, 1.0);

        // Zenith -> mid -> horizon. The mid knee sits low so the sky keeps a
        // saturated body instead of washing out a third of the way up.
        vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.30, h));
        col = mix(col, uTop, smoothstep(0.16, 0.70, h));

        // Horizon haze: same colour as the fog, thickest at the waterline, so
        // distant towers dissolve into the sky instead of cutting a silhouette.
        float haze = pow(1.0 - clamp(h / 0.30, 0.0, 1.0), 2.0);
        col = mix(col, uHorizon, haze * 0.62 * uHaze);

        // Light pollution bleeding up off downtown — keeps the night sky from
        // reading as one flat dark-blue card behind Neon Mile.
        col += uGlow * pow(1.0 - clamp(h / 0.26, 0.0, 1.0), 3.0) * uNight;

        // ---- sun / moon ----
        vec3 sd = normalize(uSunDir);
        float ang = acos(clamp(dot(d, sd), -1.0, 1.0)); // radians off the centre
        float k = 1.0 + uNight * 1.6;                    // moon glow is tighter
        float discR = mix(0.030, 0.015, uNight) * uDisc; // ~2 deg radius by day

        // Four falloff widths stacked: sky-wide veil, main glow, hot corona,
        // tight bloom off the limb. This is the "light source" read.
        float bloom = exp(-ang * 5.0 * k) * 0.55
                    + exp(-ang * 18.0 * k) * 0.50
                    + exp(-ang * 60.0 * k) * 0.75
                    + exp(-ang * 190.0 * k) * 1.20;
        float disc = 1.0 - smoothstep(discR * 0.55, discR, ang); // soft limb

        col += uHalo * bloom * uSunI;          // bloom halo, four stacked widths
        col += uSunColor * disc * uSunI;        // the disc itself

        // Sparse star field, only visible once uNight is up, fades to horizon.
        float sv = hash31(floor(d * 320.0));
        sv = step(0.9975, sv) * smoothstep(0.10, 0.55, h);
        col += vec3(sv) * uNight;

        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(820, 32, 16), mat);
  dome.frustumCulled = false;
  scene.add(dome);

  // top, mid, horizon, sun colour, intensity, sun elevation, fog, then
  // halo / glow / night(0..1) / haze / disc. Six ranges, wraps past midnight.
  const PALETTES = [
    { lo: 5.5,  hi: 7.5,  top: 0x1b3a66, mid: 0x4a6a93, horizon: 0xd79a6a, sun: 0xffcf9a, sunI: 0.65, sunY: 0.12, fog: 0x6a7a92, halo: 0xffb877, glow: 0x241a30, night: 0.35, haze: 1.0,  disc: 1.1 }, // dawn blue hour, warm band
    { lo: 7.5,  hi: 16.0, top: 0x2e6cb4, mid: 0x92bedd, horizon: 0xe4dcc0, sun: 0xfff6e0, sunI: 1.0,  sunY: 0.55, fog: 0xcfd8dc, halo: 0xffe6bd, glow: 0x000000, night: 0.0, haze: 0.85, disc: 1.0 }, // day
    { lo: 16.0, hi: 18.5, top: 0x3a5a86, mid: 0xcf8a4a, horizon: 0xff9a3c, sun: 0xffb24a, sunI: 1.1,  sunY: 0.18, fog: 0xd98a4a, halo: 0xff7a1e, glow: 0x000000, night: 0.0,  haze: 1.0,  disc: 1.3 }, // golden, saturated amber
    { lo: 18.5, hi: 20.0, top: 0x1e2d55, mid: 0x7a4a7a, horizon: 0xe06a4a, sun: 0xff8a5a, sunI: 0.75, sunY: 0.05, fog: 0x6a4a5a, halo: 0xff6a3a, glow: 0x2a1830, night: 0.45, haze: 1.0,  disc: 1.2 }, // dusk
    { lo: 20.0, hi: 24.0, top: 0x060a1a, mid: 0x0c1430, horizon: 0x1a2a4a, sun: 0xbfcfe0, sunI: 0.4,  sunY: 0.45, fog: 0x10182e, halo: 0x5a7aa0, glow: 0x3a2e3a, night: 1.0,  haze: 0.7,  disc: 1.0 }, // night, city-glow horizon
    { lo: 0.0,  hi: 5.5,  top: 0x060a1a, mid: 0x0c1430, horizon: 0x1a2a4a, sun: 0xbfcfe0, sunI: 0.4,  sunY: 0.45, fog: 0x10182e, halo: 0x5a7aa0, glow: 0x3a2e3a, night: 1.0,  haze: 0.7,  disc: 1.0 }, // night
  ];

  function setHour(hour) {
    const h = ((hour % 24) + 24) % 24;
    let p = PALETTES[PALETTES.length - 1];
    for (const e of PALETTES) { if (h >= e.lo && h < e.hi) { p = e; break; } }
    uniforms.uTop.value.setHex(p.top);
    uniforms.uMid.value.setHex(p.mid);
    uniforms.uHorizon.value.setHex(p.horizon);
    uniforms.uSunColor.value.setHex(p.sun);
    uniforms.uHalo.value.setHex(p.halo);
    uniforms.uGlow.value.setHex(p.glow);
    uniforms.uSunI.value = p.sunI;
    uniforms.uNight.value = p.night;
    uniforms.uHaze.value = p.haze;
    uniforms.uDisc.value = p.disc;
    // p.sunY is the sun direction's y-component (not degrees, unlike v4).
    uniforms.uSunDir.value.set(-0.55, p.sunY, -0.6).normalize(); // azimuth fixed over Neon Mile
    // Return contract kept as v4: sunY in degrees, sunColor as a hex number.
    const sunY = Math.asin(Math.min(1, Math.max(-1, p.sunY))) * 180 / Math.PI;
    return { fog: p.fog, sunY, sunColor: p.sun, sunI: p.sunI };
  }

  return { mesh: dome, uniforms, setHour };
}

/**
 * The Vela River as a real water shader: scrolling noise normals, fresnel blend
 * to the sky, a sun glint, and foam where the water meets the banks. No planar
 * reflections — the fresnel + glint sell it at chase-cam distance.
 */
export function createWater(scene, half = 210, riverHalf = 16) {
  const noise = makeNoiseTexture();
  const uniforms = {
    uTime: { value: 0 },
    uNoise: { value: noise },
    uDeep: { value: new THREE.Color(0x14586a) },
    uSky: { value: new THREE.Color(0x9fc3d8) },
    uSunDir: { value: new THREE.Vector3(-0.45, 0.55, -0.6).normalize() },
    uSunColor: { value: new THREE.Color(0xfff2cf) },
    uCam: { value: new THREE.Vector3(0, 6, 0) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: false,
    fog: false,
    vertexShader: `
      varying vec2 vUv; varying vec3 vWorld;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform float uTime; uniform sampler2D uNoise;
      uniform vec3 uDeep, uSky, uSunDir, uSunColor, uCam;
      varying vec2 vUv; varying vec3 vWorld;

      // three scrolling octaves: height in .x, raw taps in .yzw (reused below)
      vec4 chop(vec2 p, float t) {
        float a = texture2D(uNoise, p * 0.055 + vec2(t * 0.020, t * 0.009)).r;
        float b = texture2D(uNoise, p * 0.150 - vec2(t * 0.031, -t * 0.014)).r;
        float c = texture2D(uNoise, p * 0.440 + vec2(t * 0.055, -t * 0.026)).r;
        return vec4(a * 0.52 + b * 0.32 + c * 0.16, a, b, c);
      }

      void main() {
        vec2 p = vWorld.xz;                 // x = down-river, y(z) = across
        float t = uTime;
        vec4 c0 = chop(p, t);
        vec4 cx = chop(p + vec2(0.9, 0.0), t);
        vec4 cz = chop(p + vec2(0.0, 0.9), t);
        float a = c0.y, b = c0.z, c = c0.w;

        vec2 slope = clamp(vec2(c0.x - cx.x, c0.x - cz.x) * 6.0, -0.55, 0.55); // calmer normals, chop still visible at chase distance
        vec3 N = normalize(vec3(slope.x, 1.0, slope.y));

        vec3 V = normalize(uCam - vWorld);
        vec3 L = normalize(uSunDir);
        float ndv = clamp(dot(V, N), 0.0, 1.0);
        float warm = smoothstep(0.42, 0.10, L.y); // 1 at golden hour, 0 mid-morning
        // Cap Fresnel by hour: morning ~0.55 (blue body shows), golden ~0.85
        float F = clamp((0.03 + 0.97 * pow(1.0 - ndv, 4.0)) * 1.35, 0.0, mix(0.55, 0.85, warm)); // hour-aware mirror cap
        vec3 R = reflect(-V, N);
        float sd = max(dot(R, L), 0.0);

        vec3 body = uDeep * vec3(0.80, 1.02, 1.18); // blue bias, never amber
        body *= 0.86 + 0.34 * b;                    // mottled depth at 30-80 m
        body = mix(body, uSky * 0.55, 0.22);

        vec3 skyRefl = uSky * (0.92 + 0.18 * a);
        skyRefl += uSunColor * pow(sd, 12.0) * (0.10 + 0.34 * warm);
        vec3 col = mix(body, skyRefl, F);

        // current lanes: long down-river streaks
        float lane = texture2D(uNoise, vec2(p.x * 0.026 - t * 0.018, p.y * 0.55)).r;
        col += vec3(0.055, 0.105, 0.11) * smoothstep(0.52, 0.92, lane) * (0.4 + 0.9 * F);
        col *= 0.94 + 0.12 * c;

        // broken glitter lane toward the sun: broad glow, sheen, hard hits
        float laneF = 0.28 + 0.72 * smoothstep(0.34, 0.78, lane);
        vec3 glintCol = mix(uSunColor, vec3(1.0), 0.35);
        float glintT = 0.10 + 0.90 * warm;        // dawn 0.10, gold 1.0: sun lane tint only
        float glintH = glintT * glintT;           // hard hits gate quadratically, so dawn ~0
        col += glintCol * pow(sd, 7.0) * 0.10 * laneF;                    // soft sun lane, dawn-safe
        col += glintCol * pow(sd, 45.0) * 0.30 * laneF * glintT;          // warm sheen on the lane
        col += glintCol * pow(sd, 320.0) * 0.45 * laneF * glintH;         // hard core: gold only

        // sparkle pinpricks: low enough frequency to survive chase-cam range
        float sp = smoothstep(0.58, 0.94, a * b * 2.3);
        col += glintCol * sp * pow(sd, 3.0) * 0.45 * (0.35 + 0.85 * F) * glintH;
        col += glintCol * smoothstep(0.66, 0.96, b * c * 2.1) * pow(sd, 6.0) * 0.30 * glintH;

        // shore foam: irregular width and breakup instead of a painted line
        float fn = texture2D(uNoise, vec2(p.x * 0.16 - t * 0.025, p.y * 1.10 + 0.37)).r;
        float dEdge = min(vUv.y, 1.0 - vUv.y);
        float fw = 0.006 + 0.026 * fn * fn;
        float foam = 1.0 - smoothstep(0.0, fw, dEdge);
        foam *= smoothstep(0.28, 0.78, fn * 1.25 + 0.15 * c);
        foam *= 0.35 + 0.9 * F;
        vec3 foamCol = mix(vec3(0.86, 0.93, 0.94), uSky, 0.35);
        col = mix(col, foamCol, clamp(foam, 0.0, 0.75));

        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, riverHalf * 2, 1, 1), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.02;
  scene.add(mesh);
  return {
    mesh,
    uniforms,
    update(t, camPos) {
      uniforms.uTime.value = t;
      uniforms.uCam.value.copy(camPos);
    },
    setSky(skyColor, sunDir, sunColor) {
      uniforms.uSky.value.setHex(skyColor);
      uniforms.uSunDir.value.copy(sunDir);
      uniforms.uSunColor.value.setHex(sunColor);
    },
  };
}

/** Rain: ~1400 streak points round a centre; dense slanted drops + a fast fine layer. */
export function createRain(scene, streakTex) {
  const COUNT = 1400;
  const FINE = 420; // last chunk = thin fast drizzle
  const pos = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT); // fall speed
  for (let i = 0; i < COUNT; i += 1) {
    pos[i * 3] = (Math.random() - 0.5) * 70;
    pos[i * 3 + 1] = Math.random() * 28;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 70;
    // fine layer falls faster, main layer heavier
    seeds[i] = i >= COUNT - FINE ? 26 + Math.random() * 12 : 16 + Math.random() * 10;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.95, map: streakTex, transparent: true, opacity: 0.8,
    color: 0xeceadf, depthWrite: false, sizeAttenuation: true, // warm-white catches neon
  });
  const points = new THREE.Points(geo, mat);
  points.visible = false;
  points.frustumCulled = false;
  scene.add(points);
  let cx = 0, cz = 0;
  return {
    points,
    setCentre(x, z) { cx = x; cz = z; },
    setOn(on) { points.visible = on; },
    update(dt) {
      if (!points.visible) return;
      const a = geo.attributes.position.array;
      for (let i = 0; i < COUNT; i += 1) {
        a[i * 3 + 1] -= seeds[i] * dt;
        a[i * 3] += dt * 5.5; // stronger wind slant
        a[i * 3 + 2] += dt * 1.2;
        if (a[i * 3 + 1] < 0) {
          a[i * 3 + 1] = 26 + Math.random() * 3;
          a[i * 3] = cx + (Math.random() - 0.5) * 70;
          a[i * 3 + 2] = cz + (Math.random() - 0.5) * 70;
        }
      }
      geo.attributes.position.needsUpdate = true;
      points.position.set(cx, 0, cz);
    },
  };
}

/** Dust: warm golden motes; slow, soft, low — doubles as drifting dawn mist. */
export function createDust(scene, glowTex) {
  const COUNT = 360;
  const pos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i += 1) {
    pos[i * 3] = (Math.random() - 0.5) * 160;
    pos[i * 3 + 1] = 0.4 + Math.random() * 10; // kept low for mist
    pos[i * 3 + 2] = (Math.random() - 0.5) * 160;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    size: 2.6, map: glowTex, transparent: true, opacity: 0.26,
    color: 0xf0cd93, depthWrite: false, sizeAttenuation: true, // warmer golden haze
  });
  const points = new THREE.Points(geo, mat);
  points.visible = false;
  points.frustumCulled = false;
  scene.add(points);
  return {
    points,
    setOn(on) { points.visible = on; },
    update(dt, t) {
      if (!points.visible) return;
      const a = geo.attributes.position.array;
      for (let i = 0; i < COUNT; i += 1) {
        a[i * 3] += Math.sin(t * 0.12 + i) * dt * 0.35 + dt * 0.4; // slower drift
        a[i * 3 + 1] += Math.cos(t * 0.09 + i * 2) * dt * 0.12;
        if (a[i * 3] > 85) a[i * 3] = -85;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}
