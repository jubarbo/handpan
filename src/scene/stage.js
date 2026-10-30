import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

const ENV_URL = `${import.meta.env.BASE_URL}env/forest_slope_2k.hdr`;
const INSTRUMENT_EXTENT = 0.62;

/** Renderer, camera, controls and image-based lighting. */
export function createStage(container, quality) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.maxPixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.environmentRotation.y = 2.1;
  scene.environmentIntensity = 1.0;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 20);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 0.55;
  controls.maxDistance = 2.4;
  controls.target.set(0, 0, 0);

  scene.add(createContactShadow());

  function resize() {
    const { clientWidth: w, clientHeight: h } = container;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Keep the whole instrument in frame whatever the orientation.
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const fitHeight = INSTRUMENT_EXTENT / 2 / Math.tan(vFov / 2);
    const fitWidth = fitHeight / Math.min(1, camera.aspect);
    const distance = Math.max(fitHeight, fitWidth) * 1.12;
    if (!resize.placed) {
      camera.position.set(0, distance * 0.82, distance * 0.58);
      resize.placed = true;
    }
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  const environment = new HDRLoader().loadAsync(ENV_URL).then((texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
  });

  return { renderer, scene, camera, controls, environment, resize };
}

/** Soft ambient-occlusion blob under the instrument. */
function createContactShadow() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.75)');
  g.addColorStop(0.45, 'rgba(0,0,0,0.45)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.85, 0.85),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.125;
  mesh.renderOrder = -1;
  return mesh;
}
