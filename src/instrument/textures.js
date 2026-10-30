import { createRandom, fbm, smoothstep } from './noise.js';
import { fieldFrame } from './shellSurface.js';

/**
 * Procedural surface maps for one shell, painted in the shell's azimuthal
 * arc-length UV space (see buildShellGeometry). Pure data, no DOM/WebGL.
 */
const PALETTE = {
  top: { base: [198, 172, 136], warm: [212, 168, 100], cool: [158, 163, 170], blue: [136, 150, 180], oxide: [104, 78, 52] },
  bottom: { base: [168, 138, 104], warm: [190, 146, 88], cool: [140, 140, 142], blue: [120, 130, 150], oxide: [86, 62, 42] },
};

export function generateShellMaps({ surface, fields, size = 1024, normalSize = 2048, seed = 1, tone = 'top' }) {
  const info = createFieldLookup(surface, fields);
  const sample = createSampler(surface);
  return {
    color: paintColor(sample, info, size, seed, PALETTE[tone]),
    roughness: paintRoughness(sample, info, size, seed, tone),
    normal: paintNormal(sample, info, normalSize, seed, surface.arcLength),
    size,
    normalSize,
  };
}

function createSampler(surface) {
  return (u, v) => {
    const du = u - 0.5;
    const dv = v - 0.5;
    const s = Math.min(1, 2 * Math.hypot(du, dv)) * surface.arcLength;
    const p = surface.point(s, Math.atan2(dv, du));
    p.t = s / surface.arcLength;
    return p;
  };
}

/** Nearest field to a point: elliptical distance to its border (d) and to its dimple (dd). */
function createFieldLookup(surface, fields) {
  const prepared = fields.map((field) => {
    const reach = (Math.max(field.length, field.width) / 2) * 1.25;
    return { field, frame: fieldFrame(surface, field), reach2: reach * reach };
  });
  const result = { d: Infinity, dd: Infinity, field: null };
  return (p) => {
    result.d = Infinity;
    result.dd = Infinity;
    result.field = null;
    for (const { field, frame, reach2 } of prepared) {
      const dx = p.x - frame.point.x;
      const dy = p.y - frame.point.y;
      const dz = p.z - frame.point.z;
      if (dx * dx + dy * dy + dz * dz > reach2) continue;
      const u = dx * frame.radial.x + dy * frame.radial.y + dz * frame.radial.z;
      const v = dx * frame.tangent.x + dy * frame.tangent.y + dz * frame.tangent.z;
      const d = Math.hypot(u / (field.length / 2), v / (field.width / 2));
      if (d < result.d) {
        result.d = d;
        result.dd = Math.hypot(u / (field.dimple.length / 2), v / (field.dimple.width / 2));
        result.field = field;
      }
    }
    return result;
  };
}

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function paintColor(sample, info, size, seed, pal) {
  const out = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const p = sample((x + 0.5) / size, (y + 0.5) / size);
      const wx = p.x * 9 + 3.1;
      const wz = p.z * 9 + 7.7;
      let c = mix(pal.base, pal.warm, smoothstep(0.45, 0.75, fbm(wx, wz, 4, seed)) * 0.65);
      c = mix(c, pal.cool, smoothstep(0.52, 0.8, fbm(wz + 11, wx - 5, 4, seed + 1)) * 0.55);
      c = mix(c, pal.blue, smoothstep(0.6, 0.85, fbm(wx * 0.7 - 9, wz * 0.7 + 4, 3, seed + 2)) * 0.4);
      // Oxidation creeping from the rim, broken up by noise.
      const rust = smoothstep(0.74, 1.0, p.t) * (0.45 + 0.55 * fbm(wx * 3, wz * 3, 3, seed + 3));
      c = mix(c, pal.oxide, rust * 0.7);
      // Tone fields are cleaner: tuning and playing polish them.
      const f = info(p);
      if (f.field) c = mix(c, [c[0] * 1.03, c[1] * 1.025, c[2] * 1.015], 1 - smoothstep(0.85, 1.0, f.d));
      const grain = 0.93 + 0.07 * fbm(p.x * 220, p.z * 220, 2, seed + 4);
      const i = (y * size + x) * 4;
      out[i] = c[0] * grain;
      out[i + 1] = c[1] * grain;
      out[i + 2] = c[2] * grain;
      out[i + 3] = 255;
    }
  }
  return out;
}

function paintRoughness(sample, info, size, seed, tone) {
  const out = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const p = sample((x + 0.5) / size, (y + 0.5) / size);
      let r = (tone === 'top' ? 0.2 : 0.3) + (fbm(p.x * 14, p.z * 14, 4, seed + 9) - 0.5) * 0.12;
      r += 0.08 * smoothstep(0.8, 1.0, p.t);
      const f = info(p);
      if (f.field) {
        r -= 0.05 * (1 - smoothstep(0.85, 1.0, f.d));
        r += 0.015 * Math.exp(-(((f.d - 1.05) / 0.08) ** 2));
        if (f.dd < 1) r -= 0.03;
      }
      r += (fbm(p.x * 300, p.z * 300, 2, seed + 10) - 0.5) * 0.04;
      const i = (y * size + x) * 4;
      const value = Math.min(0.75, Math.max(0.08, r)) * 255;
      out[i] = value;
      out[i + 1] = value;
      out[i + 2] = value;
      out[i + 3] = 255;
    }
  }
  return out;
}

/** Hand-hammer marks plus fine grain, converted to a tangent-space normal map. */
function paintNormal(sample, info, size, seed, arcLength) {
  const height = new Float32Array(size * size);
  const rand = createRandom(seed * 7919);
  const pxPerMeter = size / (2 * arcLength);
  const dents = 6000;
  for (let n = 0; n < dents; n++) {
    const u = rand();
    const v = rand();
    if (Math.hypot(u - 0.5, v - 0.5) > 0.5) continue;
    const f = info(sample(u, v));
    if (f.field && f.dd < 1.1) continue;
    const inField = f.field && f.d < 1;
    const radius = (0.004 + rand() * 0.006) * (inField ? 0.8 : 1) * pxPerMeter;
    const depth = (0.3 + rand() * 0.7) * (inField ? 0.3 : 1) * radius * 0.35;
    const stretch = 0.75 + rand() * 0.5;
    const cx = u * size;
    const cy = v * size;
    const x0 = Math.max(0, Math.floor(cx - radius * 1.5));
    const x1 = Math.min(size - 1, Math.ceil(cx + radius * 1.5));
    const y0 = Math.max(0, Math.floor(cy - radius * 1.5));
    const y1 = Math.min(size - 1, Math.ceil(cy + radius * 1.5));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d2 = ((x - cx) / radius) ** 2 + ((y - cy) / (radius * stretch)) ** 2;
        if (d2 < 1) height[y * size + x] -= depth * (1 - d2) ** 2;
      }
    }
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      height[y * size + x] += (fbm((x / size) * 400, (y / size) * 400, 2, seed + 20) - 0.5) * 1.2;
    }
  }

  const out = new Uint8Array(size * size * 4);
  const strength = 0.09;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xl = height[y * size + Math.max(0, x - 1)];
      const xr = height[y * size + Math.min(size - 1, x + 1)];
      const yd = height[Math.max(0, y - 1) * size + x];
      const yu = height[Math.min(size - 1, y + 1) * size + x];
      const nx = -(xr - xl) * strength;
      const ny = -(yu - yd) * strength;
      const len = Math.hypot(nx, ny, 1);
      const i = (y * size + x) * 4;
      out[i] = (nx / len * 0.5 + 0.5) * 255;
      out[i + 1] = (ny / len * 0.5 + 0.5) * 255;
      out[i + 2] = (1 / len * 0.5 + 0.5) * 255;
      out[i + 3] = 255;
    }
  }
  return out;
}
