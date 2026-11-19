// Rendering only: the WebGL renderer, the chase camera and the day/night
// lighting. The camera sits behind the player (car / on foot / boat), looks
// ahead along the heading, and rises slightly with speed — the GTA chase cam.
import * as THREE from '../vendor/three.module.min.js';

export function createRenderer(canvas, city) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  // Capture mode (?shot=) renders the still at pixel ratio 2 for a crisper sheet.
  const capture = new URLSearchParams(window.location.search).has('shot');
  renderer.setPixelRatio(capture ? 2 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  // Global look: ACES filmic tone mapping + sRGB output is the one-pass grade
  // the whole game shares — warm highlights, cool shadows, no blown sky.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  // r4: golden-hour default exposure for live play (staged shots override per shot).
  const GOLDEN_HOUR_EXPOSURE = 1.18;
  renderer.toneMappingExposure = GOLDEN_HOUR_EXPOSURE;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // v3: real shadows. One directional sun with a tight frustum that follows
  // the player (see followSun) — this is what makes buildings, cars and the
  // bridge read as solid instead of flat-shaded boxes. PCF soft, 2048 in
  // capture mode (still frames), 1024 in live play.
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const captureShadow = capture ? 2048 : 1024;
  if (city.sun) {
    city.sun.castShadow = true;
    city.sun.shadow.mapSize.set(captureShadow, captureShadow);
    city.sun.shadow.camera.left = -70;
    city.sun.shadow.camera.right = 70;
    city.sun.shadow.camera.top = 70;
    city.sun.shadow.camera.bottom = -70;
    city.sun.shadow.camera.near = 10;
    city.sun.shadow.camera.far = 420;
    city.sun.shadow.bias = -0.0005;
    city.sun.shadow.normalBias = 0.6;
  }
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);

  // --- Environment / IBL from the sky dome ---------------------------------
  // PMREM pre-filters the sky into the roughness mips used by
  // scene.environment. We render a clone of the dome (fromScene needs a
  // scene with ONLY the dome) so we never disturb the main scene graph.
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envScene = new THREE.Scene();
  const envDome = city.sky.mesh.clone();          // clone, don't remove the real one
  envDome.material = city.sky.mesh.material;      // share the live ShaderMaterial (same uniforms)
  envScene.add(envDome);
  let envRT = null;
  let envHour = null; // last hour the env was generated for
  function updateEnv(hour) {
    // The dome's shader uniforms were already updated by city.setHour(hour),
    // so rendering it now captures the current hour's sky. Regenerate only
    // when the hour moved enough to matter (the game loop calls setHour
    // every frame; a PMREM gen per frame would tank it).
    if (hour !== undefined && envHour !== null && Math.abs(hour - envHour) < 0.1) return;
    if (envRT) envRT.dispose();
    envRT = pmrem.fromScene(envScene);
    city.scene.environment = envRT.texture;
    if (hour !== undefined) envHour = hour;
  }
  updateEnv(); // boot: matches whatever hour city started at
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const camPos = new THREE.Vector3(0, 6, -12);
  const lookAt = new THREE.Vector3();
  let freeCam = false; // staged wide shots lock the camera; follow()/snap() release it

  return {
    camera,
    render() {
      if (city.water) city.water.update(performance.now() / 1000, camera.position);
      renderer.render(city.scene, camera);
    },
    /** Keep the sun's shadow frustum centred on the player, so shadows stay
     *  crisp where the camera is instead of smeared across the whole city. */
    followSun(player) {
      if (city.followSun) city.followSun(player.x, player.z);
    },
    setHour(hour) { city.setHour(hour); updateEnv(hour); },
    /** Regenerate scene.environment from the sky dome (called by the
     *  city.setHour wrapper in main.js, since staging calls that directly). */
    updateEnv(hour) { updateEnv(hour); },
    setExposure(e) { renderer.toneMappingExposure = e; },
    /** Free camera for staged wide shots: position + aim, locked until follow/snap. */
    setCam(x, y, z, lx, ly, lz) {
      camPos.set(x, y, z);
      camera.position.copy(camPos);
      lookAt.set(lx, ly, lz);
      camera.lookAt(lookAt);
      freeCam = true;
    },
    /** Chase camera: behind the player along the heading, looking ahead. */
    follow(player, dt) {
      if (freeCam) return; // staged wide shot holds its camera
      const fx = Math.sin(player.heading), fz = Math.cos(player.heading);
      const back = player.mode === 'foot' ? 7 : player.mode === 'boat' ? 13 : 11;
      const height = player.mode === 'foot' ? 4.5 : player.mode === 'boat' ? 6 : 5 + Math.min(2.5, Math.abs(player.speed) * 0.05);
      const tx = player.x - fx * back;
      const tz = player.z - fz * back;
      const k = 1 - Math.pow(0.001, dt); // smooth follow
      camPos.x += (tx - camPos.x) * k;
      camPos.y += (height - camPos.y) * k;
      camPos.z += (tz - camPos.z) * k;
      camera.position.copy(camPos);
      lookAt.set(player.x + fx * 14, player.mode === 'boat' ? 1.5 : 1.6, player.z + fz * 14);
      camera.lookAt(lookAt);
    },
    /** Snap the camera behind the player (used when staging screenshots).
     *  lookH raises the aim point so the helicopter reads in chase shots. */
    snap(player, lookH = 1.6, backOverride = 0) {
      freeCam = false;
      const fx = Math.sin(player.heading), fz = Math.cos(player.heading);
      const back = backOverride || (player.mode === 'foot' ? 7 : player.mode === 'boat' ? 13 : 11);
      camPos.set(player.x - fx * back, player.mode === 'foot' ? 4.5 : 5.5, player.z - fz * back);
      camera.position.copy(camPos);
      lookAt.set(player.x + fx * 14, lookH, player.z + fz * 14);
      camera.lookAt(lookAt);
    },
  };
}
