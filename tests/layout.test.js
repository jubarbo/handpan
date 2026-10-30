import { describe, expect, it } from 'vitest';
import { createLayout } from '../src/instrument/layout.js';
import { createShellSurface, fieldDistance, fieldFrame } from '../src/instrument/shellSurface.js';
import { D_KURD_EXTENDED } from '../src/sound/scale.js';

const layout = createLayout(D_KURD_EXTENDED);
const top = createShellSurface(layout.shell.top);

function boundaryPoints(surface, field, samples = 48, scale = 1) {
  const { point, radial, tangent } = fieldFrame(surface, field);
  const points = [];
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * Math.PI * 2;
    const u = Math.cos(t) * (field.length / 2) * scale;
    const v = Math.sin(t) * (field.width / 2) * scale;
    points.push({
      x: point.x + radial.x * u + tangent.x * v,
      y: point.y + radial.y * u + tangent.y * v,
      z: point.z + radial.z * u + tangent.z * v,
    });
  }
  return points;
}

describe('createLayout', () => {
  it('creates 18 playable top fields: ding, 10 outer, 7 inner', () => {
    const rings = layout.fields.map((f) => f.ring);
    expect(layout.fields).toHaveLength(18);
    expect(rings.filter((r) => r === 'ding')).toHaveLength(1);
    expect(rings.filter((r) => r === 'outer')).toHaveLength(10);
    expect(rings.filter((r) => r === 'inner')).toHaveLength(7);
  });

  it('matches the 56 cm x 24 cm reference dimensions', () => {
    expect(layout.shell.radius * 2).toBeCloseTo(0.56, 3);
    const totalHeight = layout.shell.top.height + layout.shell.bottom.height;
    expect(totalHeight).toBeGreaterThan(0.22);
    expect(totalHeight).toBeLessThan(0.245);
  });

  it('assigns the scale notes with frequencies', () => {
    const notes = layout.fields.map((f) => f.note);
    expect(notes).toEqual([D_KURD_EXTENDED.ding, ...D_KURD_EXTENDED.outer, ...D_KURD_EXTENDED.inner]);
    layout.fields.forEach((f) => expect(f.frequency).toBeGreaterThan(100));
  });

  it('starts each ring on the player side and alternates sides (zigzag)', () => {
    const playerSide = Math.PI / 2; // +z points toward the player
    for (const ring of ['outer', 'inner']) {
      const fields = layout.fields.filter((f) => f.ring === ring);
      expect(Math.abs(fields[0].angle - playerSide)).toBeLessThan((15 * Math.PI) / 180);
      // The last note may sit on the far apex, so only the pairs before it alternate.
      for (let i = 1; i < fields.length - 2; i++) {
        const sideA = Math.sign(Math.cos(fields[i].angle));
        const sideB = Math.sign(Math.cos(fields[i + 1].angle));
        expect(sideA).not.toBe(sideB);
      }
      expect(Math.sin(fields.at(-1).angle)).toBeLessThan(0);
    }
  });

  it('makes lower notes larger within a ring', () => {
    for (const ring of ['outer', 'inner']) {
      const fields = layout.fields.filter((f) => f.ring === ring);
      for (let i = 1; i < fields.length; i++) {
        expect(fields[i].length).toBeLessThan(fields[i - 1].length);
      }
    }
  });

  it('keeps every field inside the top shell, away from the rim', () => {
    for (const f of layout.fields) {
      expect(f.arc + f.length / 2).toBeLessThan(top.arcLength - 0.015);
    }
  });

  it('never overlaps two tone fields', () => {
    for (const a of layout.fields) {
      for (const b of layout.fields) {
        if (a === b) continue;
        for (const p of boundaryPoints(top, a)) {
          expect(fieldDistance(top, b, p)).toBeGreaterThan(1.02);
        }
      }
    }
  });

  it('places decorative bottom fields without notes', () => {
    expect(layout.bottomFields.length).toBeGreaterThan(0);
    layout.bottomFields.forEach((f) => expect(f.note).toBeUndefined());
  });
});

describe('fieldDistance', () => {
  it('is 0 at the field center and 1 on its border', () => {
    const field = layout.fields[1];
    const { point } = fieldFrame(top, field);
    expect(fieldDistance(top, field, point)).toBeCloseTo(0, 6);
    for (const p of boundaryPoints(top, field, 8)) {
      expect(fieldDistance(top, field, p)).toBeCloseTo(1, 1);
    }
  });
});
