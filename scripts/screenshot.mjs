// Visual check: renders still frames with headless Chromium (SwiftShader).
// Usage: node scripts/screenshot.mjs <url> <outPrefix> [width] [height] [views...]
import { chromium } from 'playwright';
const [,, base, out, w = '1280', h = '900', ...views] = process.argv;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('console:', m.text()); });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
for (const v of views.length ? views : ['default']) {
  const t = Date.now();
  await page.goto(`${base}?still${v === 'default' ? '' : '&view=' + v}`);
  await page.waitForFunction(() => window.__handpanReady === true, null, { timeout: 180000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}-${v}.png`, timeout: 180000 });
  console.log(v, 'ready in', Date.now() - t, 'ms');
}
await browser.close();
