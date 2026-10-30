import { describe, expect, it } from 'vitest';
import { resolveHit, strikeParams } from '../src/interaction/hit.js';
import { createLayout } from '../src/instrument/layout.js';
import { createShellSurface, fieldFrame } from '../src/instrument/shellSurface.js';
import { D_KURD_EXTENDED } from '../src/sound/scale.js';

const layout = createLayout(D_KURD_EXTENDED);
const top = createShellSurface(layout.shell.top);

describe('resolveHit', () => {
  it('finds the field under a point on the top shell', () => {
    for (const field of layout.fields) {
      const hit = resolveHit(layout.fields, top, fieldFrame(top, field).point, 'top');
      expect(hit.field).toBe(field);
      expect(hit.distance).toBeCloseTo(0, 6);
    }
  });

  it('reports how far from the field center the strike landed', () => {
    const field = layout.fields[3];
    const { point, radial } = fieldFrame(top, field);
    const r = (field.length / 2) * 0.9;
    const p = { x: point.x + radial.x * r, y: point.y + radial.y * r, z: point.z + radial.z * r };
    const hit = resolveHit(layout.fields, top, p, 'top');
    expect(hit.field).toBe(field);
    expect(hit.distance).toBeCloseTo(0.9, 1);
  });

  it('returns null on bare shell, the bottom shell and the rim', () => {
    const bare = top.point(top.arcLength - 0.008, layout.fields[1].angle);
    expect(resolveHit(layout.fields, top, bare, 'top')).toBeNull();
    expect(resolveHit(layout.fields, top, { x: 0, y: -0.1, z: 0 }, 'bottom')).toBeNull();
    expect(resolveHit(layout.fields, top, { x: 0.28, y: 0, z: 0 }, 'rim')).toBeNull();
  });
});

describe('strikeParams', () => {
  it('brightens toward the field border and uses pen/touch pressure when real', () => {
    const center = strikeParams({ distance: 0, pressure: 0.5, pointerType: 'mouse' }, () => 0.5);
    const edge = strikeParams({ distance: 1, pressure: 0.5, pointerType: 'mouse' }, () => 0.5);
    expect(edge.brightness).toBeGreaterThan(center.brightness);
    const soft = strikeParams({ distance: 0, pressure: 0.2, pointerType: 'pen' }, () => 0.5);
    const hard = strikeParams({ distance: 0, pressure: 1, pointerType: 'pen' }, () => 0.5);
    expect(hard.velocity).toBeGreaterThan(soft.velocity);
  });

  it('falls back to a default velocity when the device reports no pressure', () => {
    const mouse = strikeParams({ distance: 0, pressure: 0.5, pointerType: 'mouse' }, () => 0.5);
    const touch = strikeParams({ distance: 0, pressure: 0, pointerType: 'touch' }, () => 0.5);
    expect(mouse.velocity).toBeCloseTo(0.8, 2);
    expect(touch.velocity).toBeCloseTo(0.8, 2);
  });
});
