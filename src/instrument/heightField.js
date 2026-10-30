import { fbm, smoothstep } from './noise.js';
import { fieldFrame } from './shellSurface.js';

/**
 * Displacement (meters, along the outward normal) that shapes tone fields,
 * dimples, the stepped ding and the hand-hammered waviness of a shell.
 */
export function createDisplacement(surface, fields, { noiseAmplitude = 0.00022, seed = 7 } = {}) {
  const prepared = fields.map((field) => {
    const reach = (Math.max(field.length, field.width) / 2) * 1.2;
    return { field, frame: fieldFrame(surface, field), reach2: reach * reach };
  });

  return function displacement(p) {
    let h = 0;
    for (const { field, frame, reach2 } of prepared) {
      const dx = p.x - frame.point.x;
      const dy = p.y - frame.point.y;
      const dz = p.z - frame.point.z;
      if (dx * dx + dy * dy + dz * dz > reach2) continue;
      const u = dx * frame.radial.x + dy * frame.radial.y + dz * frame.radial.z;
      const v = dx * frame.tangent.x + dy * frame.tangent.y + dz * frame.tangent.z;
      h += field.ring === 'ding' ? dingProfile(u, v, field) : toneFieldProfile(u, v, field);
    }
    if (noiseAmplitude) h += noiseAmplitude * (fbm(p.x * 16 + 31, p.z * 16 + 17, 3, seed) * 2 - 1);
    return h;
  };
}

/** Shallow sunken field with a hammered border and a central dimple. */
function fieldBase(d, sink) {
  const floor = -sink * (1 - smoothstep(0.6, 1.02, d));
  const border = sink * 0.18 * Math.exp(-(((d - 1.06) / 0.09) ** 2));
  return floor + border;
}

function toneFieldProfile(u, v, field) {
  const d = Math.hypot(u / (field.length / 2), v / (field.width / 2));
  let h = fieldBase(d, field.sink);
  const { length, width, depth } = field.dimple;
  const dd = Math.hypot(u / (length / 2), v / (width / 2));
  if (dd < 1) h -= depth * (1 - dd * dd) ** 1.25;
  h += depth * 0.05 * Math.exp(-(((dd - 1.08) / 0.14) ** 2));
  return h;
}

/** Ding: sunken field crowned by a dome of stacked rounded terraces. */
function dingProfile(u, v, field) {
  const d = Math.hypot(u, v);
  let h = fieldBase(d / (field.length / 2), field.sink);
  h += 0.0038 * (1 - smoothstep(0.0262, 0.0298, d));
  h += 0.003 * (1 - smoothstep(0.0182, 0.0216, d));
  h += 0.0026 * (1 - smoothstep(0.0108, 0.0138, d));
  if (d < 0.012) h += 0.0022 * (1 - (d / 0.012) ** 2);
  return h;
}
