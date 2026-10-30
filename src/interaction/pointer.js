import * as THREE from 'three';
import { resolveHit } from './hit.js';

/**
 * Unified mouse/touch/pen input. Listens in the capture phase on the canvas
 * container: strikes on the instrument are consumed (no orbiting), anything
 * else falls through to the orbit controls. Every pointer is independent, so
 * multitouch chords work.
 */
export function createPointerInput({ element, camera, handpan, fields, onStrike }) {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const canHover = window.matchMedia?.('(hover: hover)').matches;

  function pick(event) {
    const rect = element.getBoundingClientRect();
    ndc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const [hit] = raycaster.intersectObjects(handpan.proxies, false);
    if (!hit) return null;
    const local = handpan.group.worldToLocal(hit.point.clone());
    return { hit, target: resolveHit(fields, handpan.surfaces.top, local, hit.object.userData.part) };
  }

  function onPointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const picked = pick(event);
    if (!picked) return;
    event.stopPropagation();
    event.preventDefault();
    if (!picked.target) return;
    const normal = picked.hit.face.normal.clone().transformDirection(picked.hit.object.matrixWorld);
    onStrike({
      ...picked.target,
      point: picked.hit.point,
      normal,
      pointerType: event.pointerType,
      pressure: event.pressure,
    });
  }

  function onPointerMove(event) {
    if (event.pointerType !== 'mouse' || event.buttons) return;
    element.style.cursor = pick(event)?.target ? 'pointer' : '';
  }

  element.addEventListener('pointerdown', onPointerDown, { capture: true });
  if (canHover) element.addEventListener('pointermove', onPointerMove);
  element.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    dispose() {
      element.removeEventListener('pointerdown', onPointerDown, { capture: true });
      element.removeEventListener('pointermove', onPointerMove);
    },
  };
}
