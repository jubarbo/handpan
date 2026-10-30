import * as THREE from 'three';

const POOL_SIZE = 12;
const DURATION = 0.7;
const Z_AXIS = new THREE.Vector3(0, 0, 1);

/** Subtle expanding glow ring at each strike, oriented to the surface. */
export function createRipples(scene) {
  const geometry = new THREE.RingGeometry(0.82, 1, 64);
  const pool = Array.from({ length: POOL_SIZE }, () => {
    const material = new THREE.MeshBasicMaterial({
      color: 0xffe2b0,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    mesh.userData = { age: DURATION, size: 0.05, strength: 1 };
    scene.add(mesh);
    return mesh;
  });
  let next = 0;

  function spawn(point, normal, size, strength = 1) {
    const mesh = pool[next];
    next = (next + 1) % POOL_SIZE;
    mesh.position.copy(point).addScaledVector(normal, 0.003);
    mesh.quaternion.setFromUnitVectors(Z_AXIS, normal);
    mesh.userData.age = 0;
    mesh.userData.size = size;
    mesh.userData.strength = strength;
    mesh.visible = true;
  }

  function update(dt) {
    for (const mesh of pool) {
      if (!mesh.visible) continue;
      const data = mesh.userData;
      data.age += dt;
      const t = data.age / DURATION;
      if (t >= 1) {
        mesh.visible = false;
        continue;
      }
      const eased = 1 - (1 - t) ** 3;
      mesh.scale.setScalar(data.size * (0.15 + 0.85 * eased));
      mesh.material.opacity = 0.45 * data.strength * (1 - t) ** 1.5;
    }
  }

  return { spawn, update };
}
