/**
 * Surface of revolution for one handpan shell.
 *
 * Profile: y(r) = direction * height * (1 - (r / radius)^a)^b
 * Points are addressed by arc length `s` (meters from the pole, along the
 * profile) and azimuth `angle` (radians in the x-z plane, +z = player side).
 */
const TABLE_SIZE = 4096;

export function createShellSurface({ radius, height, a, b, direction = 1 }) {
  const profile = (r) => direction * height * Math.max(0, 1 - (r / radius) ** a) ** b;

  const rs = new Float64Array(TABLE_SIZE + 1);
  const ss = new Float64Array(TABLE_SIZE + 1);
  for (let i = 1; i <= TABLE_SIZE; i++) {
    rs[i] = (radius * i) / TABLE_SIZE;
    ss[i] = ss[i - 1] + Math.hypot(rs[i] - rs[i - 1], profile(rs[i]) - profile(rs[i - 1]));
  }
  const arcLength = ss[TABLE_SIZE];

  function radiusAt(s) {
    if (s <= 0) return 0;
    if (s >= arcLength) return radius;
    let lo = 0;
    let hi = TABLE_SIZE;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (ss[mid] < s) lo = mid;
      else hi = mid;
    }
    const t = (s - ss[lo]) / (ss[hi] - ss[lo]);
    return rs[lo] + (rs[hi] - rs[lo]) * t;
  }

  /** Arc length from the pole at a given horizontal radius. */
  function arcAt(r) {
    const x = (Math.min(Math.max(r, 0), radius) / radius) * TABLE_SIZE;
    const i = Math.min(Math.floor(x), TABLE_SIZE - 1);
    return ss[i] + (ss[i + 1] - ss[i]) * (x - i);
  }

  function point(s, angle) {
    const r = radiusAt(s);
    return { x: r * Math.cos(angle), y: profile(r), z: r * Math.sin(angle) };
  }

  /** Orthonormal frame: radial (toward increasing s), tangent (increasing angle), outward normal. */
  function frame(s, angle) {
    const p = point(s, angle);
    const eps = 1e-4;
    const p0 = point(Math.max(0, s - eps), angle);
    const p1 = point(Math.min(arcLength, s + eps), angle);
    const radial = normalize({ x: p1.x - p0.x, y: p1.y - p0.y, z: p1.z - p0.z });
    const tangent = { x: -Math.sin(angle), y: 0, z: Math.cos(angle) };
    const n = cross(tangent, radial);
    const normal = normalize({ x: n.x * direction, y: n.y * direction, z: n.z * direction });
    return { point: p, radial, tangent, normal };
  }

  return { radius, height, direction, arcLength, profile, radiusAt, arcAt, point, frame };
}

export function fieldFrame(surface, field) {
  if (!field.frame) {
    Object.defineProperty(field, 'frame', { value: surface.frame(field.arc, field.angle), enumerable: false });
  }
  return field.frame;
}

/** Normalized elliptical distance of a 3D point to a field: 0 at center, 1 on the border. */
export function fieldDistance(surface, field, p) {
  const { u, v } = fieldLocalCoords(surface, field, p);
  return Math.hypot(u / (field.length / 2), v / (field.width / 2));
}

/** Point coordinates (meters) in the field tangent plane: u radial, v tangential. */
export function fieldLocalCoords(surface, field, p) {
  const { point, radial, tangent } = fieldFrame(surface, field);
  const d = { x: p.x - point.x, y: p.y - point.y, z: p.z - point.z };
  return { u: dot(d, radial), v: dot(d, tangent) };
}

const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
function normalize(v) {
  const l = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}
