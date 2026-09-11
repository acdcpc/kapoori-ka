// Browser matrix checks for the web build (run from the repo root):
//   pnpm build:web && npx serve -l 4173 dist &
//   BASE_URL=http://localhost:4173 npm i playwright && node scripts/browser-matrix.mjs
// Desktop Chrome + Firefox: automated here. iPhone Safari/PWA + Android Chrome
// physical-device passes still require real devices.
// Playwright is not a repo dependency (keeps the app tree lean). Provide it via
// PW_PATH=/path/to/node_modules/playwright/index.js or `npm i -D playwright`.
const pw = await import(process.env.PW_PATH || 'playwright');
const { chromium, firefox } = pw.default ?? pw;

const BASE = process.env.BASE_URL ?? 'http://localhost:4173';
const results = [];
const check = (name, cond, detail = '') => { results.push([name, !!cond, detail]); console.log((cond ? 'PASS ' : 'FAIL ') + name + (detail ? ` [${detail}]` : '')); };

async function testEngine(engine, label) {
  const browser = await engine.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 120)));

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  check(`${label}: landing renders`, (await page.content()).includes('कपूरी क'));
  check(`${label}: hero card (Nepali default)`, await page.locator('text=तपाईंको बच्चाको स्वास्थ्य किताब').first().isVisible().catch(() => false));

  await page.locator('text=EN').first().click().catch(() => {});
  await page.waitForTimeout(400);
  check(`${label}: EN toggle switches hero`, await page.locator('text=Your child’s health book').first().isVisible().catch(() => false));

  await page.getByRole('button', { name: /Get started|सुरु गर्नुहोस्/ }).first().click().catch(async () => {
    await page.locator('text=Get started').first().click();
  });
  await page.waitForTimeout(700);
  check(`${label}: Get started opens the app (login)`, /Log ?in|लगइन|password/i.test(await page.content()));

  const sw = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length > 0);
  check(`${label}: service worker registers`, sw);

  check(`${label}: no page errors`, pageErrors.length === 0, pageErrors.join(' | '));
  await browser.close();
}

await testEngine(chromium, 'Chrome');
await testEngine(firefox, 'Firefox');

// mobile + overflow + returning-visitor rules on Chrome
const browser = await chromium.launch();
const mob = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mp = await mob.newPage();
await mp.goto(`${BASE}/`, { waitUntil: 'networkidle' });
const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check('Chrome mobile 390px: no horizontal overflow', overflow <= 1, `${overflow}px`);
await mp.evaluate(() => localStorage.setItem('kk_landing_seen', '1'));
await mp.reload({ waitUntil: 'networkidle' });
check('returning visitor skips the landing', !/How it works/i.test(await mp.content()));
const swRegs = await mp.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length > 0);
check('service worker registers (mobile)', swRegs);
await browser.close();

const fails = results.filter(r => !r[1]);
console.log(`\n=== ${results.length - fails.length}/${results.length} PASSED ===`);
if (fails.length) process.exit(1);
