/** Picks mesh and texture resolution for the device. */
export function detectQuality() {
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  const smallScreen = Math.min(window.screen.width, window.screen.height) < 820;
  const lowMemory = (navigator.deviceMemory ?? 8) <= 4;
  const mobile = coarse && (smallScreen || lowMemory);
  return mobile
    ? { tier: 'mobile', maxPixelRatio: 2, mapSize: 1024, normalSize: 1024, anisotropy: 4, top: { rings: 190, segments: 448 }, bottom: { rings: 90, segments: 256 } }
    : { tier: 'desktop', maxPixelRatio: 2, mapSize: 1024, normalSize: 2048, anisotropy: 8, top: { rings: 300, segments: 768 }, bottom: { rings: 140, segments: 448 } };
}
