import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths: the build works under any GitHub Pages sub-path.
  base: './',
  // Three.js alone is ~600 kB minified; one chunk is the right trade-off for a single-scene app.
  build: { chunkSizeWarningLimit: 900 },
});
