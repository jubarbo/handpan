import { defineConfig } from 'vite';

export default defineConfig({
  // Three.js alone is ~600 kB minified; one chunk is the right trade-off for a single-scene app.
  build: { chunkSizeWarningLimit: 900 },
});
