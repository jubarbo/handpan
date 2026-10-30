import { createHandpan } from './instrument/handpan.js';
import { createLayout } from './instrument/layout.js';
import { detectQuality } from './scene/quality.js';
import { createStage } from './scene/stage.js';
import { D_KURD_EXTENDED } from './sound/scale.js';

const VIEWS = {
  top: [0, 1.3, 0.001],
  side: [0, 0.02, 1.25],
  bottom: [0, -1.3, 0.001],
};

async function start() {
  const container = document.getElementById('stage');
  const quality = detectQuality();
  const stage = createStage(container, quality);
  const layout = createLayout(D_KURD_EXTENDED);
  const handpan = createHandpan(layout, quality);
  stage.scene.add(handpan.group);

  const params = new URLSearchParams(location.search);
  const view = VIEWS[params.get('view')];
  if (view) stage.camera.position.set(...view);

  await stage.environment;
  if (params.has('still')) {
    // Single frame, for automated visual checks on software renderers.
    stage.controls.update();
    stage.renderer.render(stage.scene, stage.camera);
    window.__handpanReady = true;
    return;
  }
  stage.renderer.setAnimationLoop(() => {
    stage.controls.update();
    stage.renderer.render(stage.scene, stage.camera);
  });
  window.__handpanReady = true;
}

start();
