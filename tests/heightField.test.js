import { describe, expect, it } from 'vitest';
import { createDisplacement } from '../src/instrument/heightField.js';
import { createLayout } from '../src/instrument/layout.js';
import { createShellSurface, fieldFrame } from '../src/instrument/shellSurface.js';
import { D_KURD_EXTENDED } from '../src/sound/scale.js';

const layout = createLayout(D_KURD_EXTENDED);
const top = createShellSurface(layout.shell.top);
const displace = createDisplacement(top, layout.fields, { noiseAmplitude: 0 });

const offset = (frame, u, v) => ({
  x: frame.point.x + frame.radial.x * u + frame.tangent.x * v,
  y: frame.point.y + frame.radial.y * u + frame.tangent.y * v,
  z: frame.point.z + frame.radial.z * u + frame.tangent.z * v,
});

describe('createDisplacement', () => {
  const outer = layout.fields.find((f) => f.ring === 'outer');
  const inner = layout.fields.find((f) => f.ring === 'inner');
  const ding = layout.fields.find((f) => f.ring === 'ding');

  it('sinks the dimple of every tone field into the shell', () => {
    expect(displace(fieldFrame(top, outer).point)).toBeLessThan(-0.005);
    expect(displace(fieldFrame(top, inner).point)).toBeLessThan(-0.003);
  });

  it('keeps the field floor slightly below the shell between dimple and border', () => {
    const p = offset(fieldFrame(top, outer), outer.length * 0.35, 0);
    const h = displace(p);
    expect(h).toBeLessThan(0);
    expect(h).toBeGreaterThan(-0.003);
  });

  it('raises the ding as a stepped dome', () => {
    const center = displace(fieldFrame(top, ding).point);
    const step = displace(offset(fieldFrame(top, ding), 0.017, 0));
    const foot = displace(offset(fieldFrame(top, ding), 0.026, 0));
    expect(center).toBeGreaterThan(0.009);
    expect(center).toBeGreaterThan(step);
    expect(step).toBeGreaterThan(foot);
    expect(foot).toBeGreaterThan(0);
  });

  it('leaves the bare shell untouched away from fields', () => {
    const p = top.point(top.arcLength - 0.01, outer.angle);
    expect(Math.abs(displace(p))).toBeLessThan(1e-4);
  });
});
