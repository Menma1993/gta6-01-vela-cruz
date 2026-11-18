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
  renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = false;
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
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
    setHour(hour) { city.setHour(hour); },
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
