import * as THREE from 'three';
import { createDisplacement } from './heightField.js';
import { createRimMaterial, createShellMaterial } from './materials.js';
import { buildGuGeometry, buildRimGeometry, buildShellGeometry } from './shellGeometry.js';
import { createShellSurface } from './shellSurface.js';
import { generateShellMaps } from './textures.js';

const GU_LIP = 0.004;
const flat = () => 0;

/**
 * Builds the full instrument. Returns the render group, the shell surfaces
 * (for hit testing in surface coordinates) and low-poly raycast proxies.
 */
export function createHandpan(layout, quality) {
  const { shell } = layout;
  const top = createShellSurface(shell.top);
  const bottom = createShellSurface(shell.bottom);
  const guStart = bottom.arcAt(shell.gu.radius + GU_LIP);

  const topMaps = generateShellMaps({ surface: top, fields: layout.fields, size: quality.mapSize, normalSize: quality.normalSize, seed: 3, tone: 'top' });
  const bottomMaps = generateShellMaps({ surface: bottom, fields: layout.bottomFields, size: quality.mapSize / 2, normalSize: quality.normalSize / 2, seed: 5, tone: 'bottom' });
  const topMaterial = createShellMaterial(topMaps, quality);
  const bottomMaterial = createShellMaterial(bottomMaps, quality);
  const rimMaterial = createRimMaterial();

  const group = new THREE.Group();
  group.name = 'handpan';

  const topMesh = new THREE.Mesh(buildShellGeometry(top, createDisplacement(top, layout.fields, { seed: 7 }), quality.top), topMaterial);
  const bottomMesh = new THREE.Mesh(
    buildShellGeometry(bottom, createDisplacement(bottom, layout.bottomFields, { seed: 13 }), { ...quality.bottom, startArc: guStart }),
    bottomMaterial,
  );
  const rimMesh = new THREE.Mesh(buildRimGeometry(shell.rim, quality.top.segments / 2), rimMaterial);
  const guMesh = new THREE.Mesh(buildGuGeometry(bottom, shell.gu, GU_LIP, quality.bottom.segments / 2), bottomMaterial);
  for (const mesh of [topMesh, bottomMesh, rimMesh, guMesh]) {
    mesh.castShadow = true;
    group.add(mesh);
  }

  const hidden = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
  const proxy = (geometry, part) => {
    const mesh = new THREE.Mesh(geometry, hidden);
    mesh.userData.part = part;
    group.add(mesh);
    return mesh;
  };
  const proxies = [
    proxy(buildShellGeometry(top, flat, { rings: 48, segments: 96 }), 'top'),
    proxy(buildShellGeometry(bottom, flat, { rings: 32, segments: 96, startArc: guStart }), 'bottom'),
    proxy(buildRimGeometry(shell.rim, 96), 'rim'),
  ];

  return { group, surfaces: { top, bottom }, proxies, meshes: { top: topMesh, bottom: bottomMesh, rim: rimMesh } };
}
