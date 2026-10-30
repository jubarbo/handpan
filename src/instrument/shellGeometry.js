import * as THREE from 'three';

/**
 * Polar grid over a shell surface, displaced along the normal.
 * UVs use an azimuthal arc-length projection, so textures keep true surface
 * proportions all the way to the rim.
 */
export function buildShellGeometry(surface, displacement, { rings, segments, startArc = 0 }) {
  const hasPole = startArc === 0;
  const vertexCount = (hasPole ? 1 : 0) + rings * segments;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const { arcLength, direction } = surface;
  const cos = new Float64Array(segments);
  const sin = new Float64Array(segments);
  for (let j = 0; j < segments; j++) {
    const a = (j / segments) * Math.PI * 2;
    cos[j] = Math.cos(a);
    sin[j] = Math.sin(a);
  }

  let k = 0;
  const p = { x: 0, y: 0, z: 0 };
  const write = (x, y, z, u, v) => {
    positions[k * 3] = x;
    positions[k * 3 + 1] = y;
    positions[k * 3 + 2] = z;
    uvs[k * 2] = u;
    uvs[k * 2 + 1] = v;
    k++;
  };

  if (hasPole) {
    const y0 = surface.profile(0);
    p.x = 0; p.y = y0; p.z = 0;
    write(0, y0 + direction * displacement(p), 0, 0.5, 0.5);
  }

  for (let i = 0; i < rings; i++) {
    const s = hasPole ? (arcLength * (i + 1)) / rings : startArc + ((arcLength - startArc) * i) / (rings - 1);
    const { r, y, dr, dy } = ringFrame(surface, s);
    const uvr = (0.5 * s) / arcLength;
    for (let j = 0; j < segments; j++) {
      p.x = r * cos[j]; p.y = y; p.z = r * sin[j];
      const h = displacement(p);
      // Outward normal of a surface of revolution: direction * (-cos·dy, dr, -sin·dy).
      const nx = -cos[j] * dy * direction;
      const ny = dr * direction;
      const nz = -sin[j] * dy * direction;
      write(p.x + nx * h, y + ny * h, p.z + nz * h, 0.5 + uvr * cos[j], 0.5 + uvr * sin[j]);
    }
  }

  const indices = [];
  const ringStart = hasPole ? 1 : 0;
  if (hasPole) {
    for (let j = 0; j < segments; j++) indices.push(0, ringStart + ((j + 1) % segments), ringStart + j);
  }
  for (let i = 0; i < rings - 1; i++) {
    const a0 = ringStart + i * segments;
    const b0 = a0 + segments;
    for (let j = 0; j < segments; j++) {
      const j1 = (j + 1) % segments;
      indices.push(a0 + j, a0 + j1, b0 + j, a0 + j1, b0 + j1, b0 + j);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(vertexCount > 65535 ? new THREE.Uint32BufferAttribute(indices, 1) : new THREE.Uint16BufferAttribute(indices, 1));
  orientOutward(geometry, surface);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function ringFrame(surface, s) {
  const eps = 1e-4;
  const s0 = Math.max(0, s - eps);
  const s1 = Math.min(surface.arcLength, s + eps);
  const r0 = surface.radiusAt(s0);
  const r1 = surface.radiusAt(s1);
  const y0 = surface.profile(r0);
  const y1 = surface.profile(r1);
  const len = Math.hypot(r1 - r0, y1 - y0) || 1;
  const r = surface.radiusAt(s);
  return { r, y: surface.profile(r), dr: (r1 - r0) / len, dy: (y1 - y0) / len };
}

/** Flips the winding if the triangles face inward, so front faces point out of the shell. */
function orientOutward(geometry, surface) {
  const pos = geometry.attributes.position;
  const index = geometry.index;
  const tri = Math.floor(index.count / 3 / 2) * 3;
  const a = new THREE.Vector3().fromBufferAttribute(pos, index.getX(tri));
  const b = new THREE.Vector3().fromBufferAttribute(pos, index.getX(tri + 1));
  const c = new THREE.Vector3().fromBufferAttribute(pos, index.getX(tri + 2));
  const faceNormal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
  const outward = new THREE.Vector3(a.x, 0, a.z).normalize().multiplyScalar(0.5).add(new THREE.Vector3(0, surface.direction, 0));
  if (faceNormal.dot(outward) >= 0) return;
  const arr = index.array;
  for (let i = 0; i < arr.length; i += 3) {
    const t = arr[i + 1];
    arr[i + 1] = arr[i + 2];
    arr[i + 2] = t;
  }
  index.needsUpdate = true;
}

/** The band where both shells are glued: a rounded flange with a fine seam groove. */
export function buildRimGeometry({ innerRadius, outerRadius, thickness }, segments) {
  const half = thickness / 2;
  const c = 0.0048;
  const pts = [];
  const arc = (cx, cy, from, to, steps = 8) => {
    for (let i = 0; i <= steps; i++) {
      const t = from + ((to - from) * i) / steps;
      pts.push(new THREE.Vector2(cx + c * Math.cos(t), cy + c * Math.sin(t)));
    }
  };
  arc(innerRadius + c, -half + c, Math.PI, Math.PI * 1.5);
  arc(outerRadius - c, -half + c, -Math.PI / 2, -0.0001);
  // Seam groove where the two halves meet.
  pts.push(new THREE.Vector2(outerRadius, -0.0007));
  pts.push(new THREE.Vector2(outerRadius - 0.0005, 0));
  pts.push(new THREE.Vector2(outerRadius, 0.0007));
  arc(outerRadius - c, half - c, 0.0001, Math.PI / 2);
  arc(innerRadius + c, half - c, Math.PI / 2, Math.PI);
  pts.push(pts[0].clone());
  const geometry = new THREE.LatheGeometry(pts, segments);
  geometry.computeVertexNormals();
  return geometry;
}

/** Gu: the bottom opening, a rounded lip turning into a short neck inside the body. */
export function buildGuGeometry(bottomSurface, { radius, neckDepth }, lipRadius, segments) {
  const yA = bottomSurface.profile(radius + lipRadius);
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const t = (i / 10) * (Math.PI / 2);
    pts.push(new THREE.Vector2(radius + lipRadius - lipRadius * Math.sin(t), yA + lipRadius - lipRadius * Math.cos(t)));
  }
  pts.push(new THREE.Vector2(radius, yA + neckDepth));
  return new THREE.LatheGeometry(pts, segments);
}
