import { noteToFrequency } from '../sound/scale.js';

/**
 * Physical layout of the instrument: single source of truth shared by
 * geometry, materials, sound and interaction. Units are meters.
 *
 * Angles follow the top view of the reference photo: 0° = player's right,
 * 90° = toward the player (+z). Positions are measured along the shell
 * surface (`arc`) from the top pole, so field sizes are true surface sizes.
 */
export const SHELL = Object.freeze({
  radius: 0.28,
  top: { radius: 0.28, height: 0.118, a: 2.1, b: 0.8, direction: 1 },
  bottom: { radius: 0.28, height: 0.112, a: 2.0, b: 0.85, direction: -1 },
  rim: { innerRadius: 0.2745, outerRadius: 0.2865, thickness: 0.0105 },
  gu: { radius: 0.052, neckDepth: 0.018 },
});

const deg = (d) => (d * Math.PI) / 180;

// Angles read from the reference photo, regularized into a zigzag that starts
// on the player side; the small offsets keep the hand-made irregularity.
const OUTER_SLOTS = [
  { angle: 97, arc: 0.214 },
  { angle: 135, arc: 0.212 },
  { angle: 61, arc: 0.213 },
  { angle: 171, arc: 0.21 },
  { angle: 26, arc: 0.211 },
  { angle: 206, arc: 0.209 },
  { angle: 351, arc: 0.21 },
  { angle: 243, arc: 0.207 },
  { angle: 313, arc: 0.208 },
  { angle: 278, arc: 0.205 },
];

const INNER_SLOTS = [
  { angle: 87, arc: 0.122 },
  { angle: 122, arc: 0.12 },
  { angle: 53, arc: 0.121 },
  { angle: 157, arc: 0.119 },
  { angle: 17, arc: 0.12 },
  { angle: 197, arc: 0.118 },
  { angle: 341, arc: 0.118 },
];

const BOTTOM_SLOTS = [90, 135, 45, 180, 0, 225, 315, 270];

/** Tone field size shrinks with pitch, like a real hand-tuned instrument. */
function fieldSize(ring, frequency) {
  if (ring === 'ding') return { length: 0.112, width: 0.112 };
  if (ring === 'outer') {
    const length = 0.112 * (frequency / 220) ** -0.35;
    return { length, width: length * 0.8 };
  }
  const length = 0.06 * (frequency / 587.33) ** -0.35;
  return { length, width: length * 0.88 };
}

function dimpleFor(ring, field) {
  if (ring === 'ding') return { length: 0.058, width: 0.058, depth: 0 };
  if (ring === 'outer') return { length: field.length * 0.4, width: field.width * 0.36, depth: 0.0055 };
  return { length: field.length * 0.36, width: field.width * 0.36, depth: 0.0032 };
}

function createField(ring, index, note, slot) {
  const frequency = noteToFrequency(note);
  const size = fieldSize(ring, frequency);
  const field = {
    id: `${ring}-${index}`,
    ring,
    note,
    frequency,
    angle: deg(slot.angle),
    arc: slot.arc,
    ...size,
    sink: ring === 'inner' ? 0.0012 : 0.0018,
  };
  field.dimple = dimpleFor(ring, field);
  return field;
}

export function createLayout(scale) {
  if (scale.outer.length !== OUTER_SLOTS.length || scale.inner.length !== INNER_SLOTS.length) {
    throw new Error(`Scale "${scale.name}" does not fit a ${OUTER_SLOTS.length}+${INNER_SLOTS.length} layout`);
  }
  const fields = [
    createField('ding', 0, scale.ding, { angle: 90, arc: 0 }),
    ...scale.outer.map((note, i) => createField('outer', i, note, OUTER_SLOTS[i])),
    ...scale.inner.map((note, i) => createField('inner', i, note, INNER_SLOTS[i])),
  ];

  const bottomFields = BOTTOM_SLOTS.map((angle, i) => ({
    id: `bottom-${i}`,
    ring: 'bottom',
    angle: deg(angle),
    arc: 0.165,
    length: 0.078,
    width: 0.066,
    sink: 0.0012,
    dimple: { length: 0.03, width: 0.026, depth: 0.0035 },
  }));

  return { shell: SHELL, scale, fields, bottomFields };
}
