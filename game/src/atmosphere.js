// Vela Cruz atmosphere: sky dome shader, shader water, rain + dust particles,
// and the shared glow-sprite texture every light effect uses. One clear job:
// make the air, the light and the river look like a place, not a backdrop.
import * as THREE from '../vendor/three.module.min.js';

/** Soft radial glow (white core fading out) — lamps, sirens, heli beacon, muzzle. */
export function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/** Short vertical streak — rain drops and wet-road lamp reflections. */
export function makeStreakTexture() {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.9)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(6, 0, 4, 64);
  return new THREE.CanvasTexture(c);
}

/** Smooth value-noise tile, drawn once and scrolled by the water shader. */
export function makeNoiseTexture(size = 256) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const g = c.getContext('2d');
  const small = document.createElement('canvas');
  small.width = 48; small.height = 48;
  const sg = small.getContext('2d');
  const img = sg.createImageData(48, 48);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + Math.floor(Math.random() * 90);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  sg.putImageData(img, 0, 0);
  g.imageSmoothingEnabled = true;
  g.drawImage(small, 0, 0, size, size);
  // Second, larger octave for broader swells.
  g.globalAlpha = 0.5;
  g.drawImage(small, 0, 0, size / 2, size / 2);
  g.drawImage(small, size / 2, size / 2, size / 2, size / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * Sky dome: three-stop gradient (zenith -> mid -> horizon haze) + a sun disc
 * with glow. One dome per scene; setHour picks the palette. The horizon band
 * is the colour the fog matches, so distant buildings melt into the sky.
 */
export function createSky(scene) {
  const uniforms = {
    uTop: { value: new THREE.Color(0x3f7ec2) },
    uMid: { value: new THREE.Color(0x9fc3d8) },
    uHorizon: { value: new THREE.Color(0xd8e4ea) },
    uSunDir: { value: new THREE.Vector3(-0.45, 0.55, -0.6).normalize() },
    uSunColor: { value: new THREE.Color(0xfff2cf) },
    uSunI: { value: 1.0 },
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
      uniform vec3 uSunDir; uniform vec3 uSunColor; uniform float uSunI;
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y, -0.08, 1.0);
        vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.22, h));
        col = mix(col, uTop, smoothstep(0.18, 0.65, h));
        float s = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);
        col += uSunColor * (pow(s, 600.0) * 1.6 + pow(s, 24.0) * 0.35) * uSunI;
        // Warm haze hugging the horizon so the world edge never goes hard.
        col = mix(col, uHorizon, pow(1.0 - clamp(h * 3.0, 0.0, 1.0), 2.0) * 0.45);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(820, 32, 16), mat);
  dome.frustumCulled = false;
  scene.add(dome);

  // Palettes: [top, mid, horizon, sun colour, sun intensity, sun elevation]
  // Early afternoon is hard pale-blue light with a warm dust horizon (shot 1);
  // late afternoon is DESATURATED amber, never pink (shot 2); dawn is blue-hour
  // mist (shot 4); night is deep blue with a pale moon (shot 3).
  const PALETTES = [
    { from: 5.5, to: 7.5, top: 0x2c4a6b, mid: 0x7d9ab5, horizon: 0xe8b98a, sun: 0xffd9a0, sunI: 1.1, sunY: 14, fog: 0xc3ccd2 },
    { from: 7.5, to: 16.0, top: 0x3f7ec2, mid: 0x9fc3d8, horizon: 0xdcd3b8, sun: 0xfff2cf, sunI: 1.2, sunY: 85, fog: 0xc4d2d6 },
    { from: 16.0, to: 18.5, top: 0x6e6a80, mid: 0xb08a62, horizon: 0xd89a5e, sun: 0xffb36b, sunI: 1.4, sunY: 24, fog: 0xcf9a72 },
    { from: 18.5, to: 20.0, top: 0x4a3a5e, mid: 0x8a5a52, horizon: 0xc96a55, sun: 0xff8a50, sunI: 1.0, sunY: 9, fog: 0xb0705e },
    { from: 20.0, to: 24.0, top: 0x050914, mid: 0x0d1730, horizon: 0x16233f, sun: 0xcdd8ff, sunI: 0.5, sunY: 40, fog: 0x0d1730 },
    { from: 0.0, to: 5.5, top: 0x050914, mid: 0x0d1730, horizon: 0x16233f, sun: 0xcdd8ff, sunI: 0.5, sunY: 40, fog: 0x0d1730 },
  ];

  return {
    mesh: dome,
    uniforms,
    /** Returns the fog colour + sun elevation for this hour (city drives lights). */
    setHour(hour) {
      const p = PALETTES.find((q) => hour >= q.from && hour < q.to) || PALETTES[1];
      uniforms.uTop.value.setHex(p.top);
      uniforms.uMid.value.setHex(p.mid);
      uniforms.uHorizon.value.setHex(p.horizon);
      uniforms.uSunColor.value.setHex(p.sun);
      uniforms.uSunI.value = p.sunI;
      const el = (p.sunY * Math.PI) / 180;
      uniforms.uSunDir.value.set(-0.55, Math.sin(el), -0.6).normalize();
      return { fog: p.fog, sunY: p.sunY, sunColor: p.sun, sunI: p.sunI };
    },
  };
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
      uniform vec3 uDeep; uniform vec3 uSky; uniform vec3 uSunDir;
      uniform vec3 uSunColor; uniform vec3 uCam;
      varying vec2 vUv; varying vec3 vWorld;
      void main() {
        // Two scrolling noise octaves -> a wobbling pseudo-normal.
        vec2 uv1 = vUv * vec2(24.0, 3.0) + vec2(uTime * 0.03, uTime * 0.008);
        vec2 uv2 = vUv * vec2(9.0, 1.5) - vec2(uTime * 0.02, -uTime * 0.011);
        float n1 = texture2D(uNoise, uv1).r;
        float n2 = texture2D(uNoise, uv2).r;
        float wob = (n1 - 0.5) * 0.9 + (n2 - 0.5) * 0.5;
        vec3 V = normalize(uCam - vWorld);
        vec3 N = normalize(vec3(wob * 0.55, 1.0, (n2 - 0.5) * 0.55));
        float fres = pow(1.0 - max(dot(V, N), 0.0), 3.0);
        vec3 col = mix(uDeep, uSky, 0.25 + fres * 0.75);
        // Sun glint: a broken glitter path toward the sun.
        vec3 R = reflect(-normalize(uSunDir), N);
        float glint = pow(max(dot(R, V), 0.0), 90.0) * 1.4;
        col += uSunColor * glint;
        // Current lanes: faint brighter streaks running down-river.
        col += vec3(0.05, 0.09, 0.09) * smoothstep(0.62, 0.95, n1) * 0.5;
        // Shore foam where the water meets the canyon banks.
        float edge = smoothstep(0.0, 0.10, vUv.y) * smoothstep(1.0, 0.90, vUv.y);
        col = mix(vec3(0.85, 0.93, 0.93), col, edge);
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

/** Rain: 900 falling streak points in a box around a centre; wraps forever. */
export function createRain(scene, streakTex) {
  const COUNT = 900;
  const pos = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i += 1) {
    pos[i * 3] = (Math.random() - 0.5) * 70;
    pos[i * 3 + 1] = Math.random() * 28;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 70;
    seeds[i] = 14 + Math.random() * 10;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.55, map: streakTex, transparent: true, opacity: 0.55,
    color: 0xbcd0e0, depthWrite: false, sizeAttenuation: true,
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
        a[i * 3] += dt * 2.5; // wind slant
        if (a[i * 3 + 1] < 0) {
          a[i * 3 + 1] = 26 + Math.random() * 2;
          a[i * 3] = cx + (Math.random() - 0.5) * 70;
          a[i * 3 + 2] = cz + (Math.random() - 0.5) * 70;
        }
      }
      geo.attributes.position.needsUpdate = true;
      points.position.set(cx, 0, cz);
    },
  };
}

/** Dust: slow warm motes drifting through the early-afternoon haze. */
export function createDust(scene, glowTex) {
  const COUNT = 260;
  const pos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i += 1) {
    pos[i * 3] = (Math.random() - 0.5) * 160;
    pos[i * 3 + 1] = 0.5 + Math.random() * 14;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 160;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    size: 1.6, map: glowTex, transparent: true, opacity: 0.32,
    color: 0xd8b98a, depthWrite: false, sizeAttenuation: true,
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
        a[i * 3] += Math.sin(t * 0.2 + i) * dt * 0.6 + dt * 0.8;
        a[i * 3 + 1] += Math.cos(t * 0.15 + i * 2) * dt * 0.25;
        if (a[i * 3] > 85) a[i * 3] = -85;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}
