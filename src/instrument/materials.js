import * as THREE from 'three';

function dataTexture(data, size, { srgb = false, anisotropy = 8 } = {}) {
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  return texture;
}

/** Back faces (the inside of the instrument, seen through the gu) are darker, unpolished steel. */
function darkenBackFaces(material, factor) {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      if (!gl_FrontFacing) diffuseColor.rgb *= ${factor.toFixed(2)};`,
    );
  };
}

/** Nitrided steel: fully metallic, color and roughness driven by the procedural maps. */
export function createShellMaterial(maps, { anisotropy = 8 } = {}) {
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 1,
    roughness: 1,
    map: dataTexture(maps.color, maps.size, { srgb: true, anisotropy }),
    roughnessMap: dataTexture(maps.roughness, maps.size, { anisotropy }),
    normalMap: dataTexture(maps.normal, maps.normalSize, { anisotropy }),
    normalScale: new THREE.Vector2(0.25, 0.25),
    side: THREE.DoubleSide,
  });
  darkenBackFaces(material, 0.3);
  return material;
}

export function createRimMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color().setRGB(0.42, 0.32, 0.22, THREE.SRGBColorSpace),
    metalness: 1,
    roughness: 0.32,
    side: THREE.DoubleSide,
  });
}
