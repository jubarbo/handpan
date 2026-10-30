// End-to-end check: opens the app, starts audio, strikes every field center
// and reports which notes the engine played.
// Usage: node scripts/play-check.mjs <url>
import { chromium } from 'playwright';
const [,, url = 'http://localhost:5173/'] = process.argv;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 900, height: 700 }, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(`${url}?debug`);
await page.waitForFunction(() => window.__handpanReady === true, null, { timeout: 180000 });
await page.mouse.click(450, 350);
const points = await page.evaluate(() => window.__handpanDebug.fieldScreenPoints());
const played = [];
for (const { note, x, y } of points) {
  await page.mouse.click(x, y);
  played.push({ expected: note, got: await page.evaluate(() => window.__handpanDebug.lastNote) });
}
const state = await page.evaluate(() => window.__handpanDebug.audioState());
// A touch outside the instrument must not play anything.
await page.evaluate(() => { window.__handpanDebug.lastNote = null; });
await page.touchscreen.tap(20, 20);
const offInstrument = await page.evaluate(() => window.__handpanDebug.lastNote);
console.log(JSON.stringify({ audioState: state, mismatches: played.filter((p) => p.expected !== p.got), total: played.length, offInstrument, errors }, null, 1));
await browser.close();
