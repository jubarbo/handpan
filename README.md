# Handpan 3D

Realistic, playable handpan in the browser: procedural Three.js model and Web Audio synthesis, played with touch or mouse.

## Run

```bash
npm install --legacy-peer-deps   # npm 10 peer-resolution bug with vitest 5
npm run dev                      # http://localhost:5173
npm test
npm run build
```

## Play

- Tap or click a tone field to play it; several fingers play chords.
- Strike near a field's center for a pure tone, near its border for a brighter one.
- Drag outside the instrument to orbit, pinch or scroll to zoom.
- Scale: D Kurd 18 (ding D3; A3 Bb3 C4 D4 E4 F4 G4 A4 Bb4 C5; D5 E5 F5 G5 A5 Bb5 C6).

## Checks

- `npm test`: unit tests (layout, geometry, synthesis, hit resolution).
- With `npm run dev` running: `npm run shot` renders still views to `screenshots/`,
  `node scripts/play-check.mjs` strikes every field in headless Chromium.
- URL flags: `?view=top|side|bottom`, `?still` (single frame), `?debug` (test hooks).

## Credits

- HDRI `public/env/forest_slope_2k.hdr`: "Forest Slope" by Poly Haven, CC0.
