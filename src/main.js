import * as THREE from 'three';
import { createHandpan } from './instrument/handpan.js';
import { createLayout } from './instrument/layout.js';
import { strikeParams } from './interaction/hit.js';
import { createPointerInput } from './interaction/pointer.js';
import { fieldFrame } from './instrument/shellSurface.js';
import { createRipples } from './interaction/ripples.js';
import { detectQuality } from './scene/quality.js';
import { createStage } from './scene/stage.js';
import { createSoundEngine } from './sound/engine.js';
import { D_KURD_EXTENDED } from './sound/scale.js';

const VIEWS = {
  top: [0, 1.3, 0.001],
  side: [0, 0.02, 1.25],
  bottom: [0, -1.3, 0.001],
};

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

function createOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="overlay__content">
      <p class="overlay__title">Handpan</p>
      <p class="overlay__hint">Forging the steel…</p>
    </div>`;
  document.body.appendChild(overlay);
  const hint = overlay.querySelector('.overlay__hint');
  return {
    ready(onStart) {
      hint.textContent = matchMedia('(pointer: coarse)').matches ? 'Tap to play' : 'Click to play';
      overlay.addEventListener('pointerup', () => {
        onStart();
        overlay.classList.add('hidden');
      }, { once: true });
    },
  };
}

async function start() {
  const params = new URLSearchParams(location.search);
  const still = params.has('still');
  const overlay = still ? null : createOverlay();
  await nextFrame();
  await nextFrame();

  const container = document.getElementById('stage');
  const quality = detectQuality();
  const stage = createStage(container, quality);
  const layout = createLayout(D_KURD_EXTENDED);
  const handpan = createHandpan(layout, quality);
  stage.scene.add(handpan.group);

  const view = VIEWS[params.get('view')];
  if (view) stage.camera.position.set(...view);

  await stage.environment;
  if (still) {
    // Single frame, for automated visual checks on software renderers.
    stage.controls.update();
    stage.renderer.render(stage.scene, stage.camera);
    window.__handpanReady = true;
    return;
  }

  const engine = createSoundEngine();
  const ripples = createRipples(stage.scene);
  const debug = params.has('debug') ? installDebugHooks(stage, handpan, layout, engine) : null;
  createPointerInput({
    element: container,
    camera: stage.camera,
    handpan,
    fields: layout.fields,
    onStrike({ field, distance, point, normal, pointerType, pressure }) {
      engine.unlock();
      const { velocity, brightness } = strikeParams({ distance, pressure, pointerType });
      engine.strike({
        id: field.id,
        frequency: field.frequency,
        ring: field.ring,
        velocity,
        brightness,
        pan: (point.x / layout.shell.radius) * 0.6,
      });
      ripples.spawn(point, normal, field.width * 0.55, velocity);
      if (debug) debug.lastNote = field.note;
    },
  });

  const badge = document.createElement('div');
  badge.className = 'badge';
  badge.textContent = `${layout.scale.name} · ${layout.scale.ding}`;
  document.body.appendChild(badge);

  const timer = new THREE.Timer();
  timer.connect(document);
  stage.renderer.setAnimationLoop((time) => {
    timer.update(time);
    const dt = Math.min(timer.getDelta(), 0.1);
    ripples.update(dt);
    stage.controls.update();
    stage.renderer.render(stage.scene, stage.camera);
  });
  overlay.ready(() => engine.unlock());
  window.__handpanReady = true;
}

/** Test hooks for automated end-to-end checks (enabled with ?debug). */
function installDebugHooks(stage, handpan, layout, engine) {
  const debug = {
    lastNote: null,
    audioState: () => engine.context?.state ?? 'locked',
    fieldScreenPoints() {
      const canvas = stage.renderer.domElement.getBoundingClientRect();
      stage.camera.updateMatrixWorld();
      return layout.fields.map((field) => {
        const { point } = fieldFrame(handpan.surfaces.top, field);
        const v = handpan.group.localToWorld(new THREE.Vector3(point.x, point.y, point.z)).project(stage.camera);
        return { note: field.note, x: canvas.left + ((v.x + 1) / 2) * canvas.width, y: canvas.top + ((1 - v.y) / 2) * canvas.height };
      });
    },
  };
  window.__handpanDebug = debug;
  return debug;
}

start();
