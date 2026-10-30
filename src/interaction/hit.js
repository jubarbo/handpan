import { fieldDistance } from '../instrument/shellSurface.js';

/** Which tone field (if any) lies under a point of the instrument, in instrument space. */
export function resolveHit(fields, topSurface, point, part) {
  if (part !== 'top') return null;
  let best = null;
  for (const field of fields) {
    const distance = fieldDistance(topSurface, field, point);
    if (distance <= 1 && (!best || distance < best.distance)) best = { field, distance };
  }
  return best;
}

const DEFAULT_VELOCITY = 0.8;

/** Maps a pointer strike to synthesis parameters. Only pens report trustworthy pressure. */
export function strikeParams({ distance, pressure, pointerType }, random = Math.random) {
  const base = pointerType === 'pen' && pressure > 0 ? 0.35 + 0.65 * pressure : DEFAULT_VELOCITY;
  // Small human variation so repeated strikes never sound mechanical.
  const velocity = Math.min(1, Math.max(0.1, base + (random() - 0.5) * 0.08));
  const brightness = 0.12 + 0.88 * Math.min(1, distance) ** 1.4;
  return { velocity, brightness };
}
