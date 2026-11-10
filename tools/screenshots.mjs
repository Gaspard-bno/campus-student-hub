import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const keepCoach = args.includes('--coach');
const pos = args.filter((a) => !a.startsWith('--'));
let base = pos[0] || 'http://127.0.0.1:4173/';
if (!base.endsWith('/')) base += '/';
const outDir = path.resolve(root, pos[1] || 'livrables/captures');
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const mobileCtx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
  reducedMotion: 'no-preference',
});
const page = await mobileCtx.newPage();
page.on('pageerror', (e) => console.error('pageerror:', e.message));

const settle = async (p) => {
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
};
const shot = async (p, name, opts = {}) => {
  await settle(p);
  await p.screenshot({ path: path.join(outDir, name), ...opts });
  console.log('wrote', name);
};
const T = (id) => page.getByTestId(id);

async function ready(p) {
  await p.goto(base + '?reset=1');
  await p.waitForSelector('[data-testid="lang-en"]');
}

// 01 welcome (reset state)
await ready(page);
await shot(page, '01-welcome.png');

// pick English, go to home on V2
await T('lang-en').click();
await page.waitForSelector('[data-testid="search-input"]');
await page.goto(base + '?v=2&lang=en#/home');
await page.waitForSelector('[data-testid="search-input"]');
if (!keepCoach) {
  const coach = T('coach');
  if (await coach.isVisible().catch(() => false)) await T('coach-ok').click();
}
await settle(page);

// demo booking through the UI (home screenshot is taken after so "next booking" shows)
await T('search-input').fill('stress');
await page.waitForSelector('[data-testid="result-counselling-session"]');
await shot(page, '03-search-counselling.png');
await T('result-counselling-session').click();
await page.waitForSelector('[data-testid="book-session"]');
await shot(page, '04-service.png');
await T('book-session').click();
const days = page.locator('[data-testid^="day-"]');
await days.first().waitFor();
const nDays = await days.count();
let picked = false;
for (let i = 0; i < nDays && !picked; i++) {
  await days.nth(i).click();
  const free = page.locator('[data-testid^="slot-"][data-state="free"]');
  if ((await free.count()) > 0) {
    await free.first().click();
    picked = true;
  }
}
if (!picked) throw new Error('no free slot found');
await shot(page, '05-booking.png');
await T('confirm-booking').click();
await page.waitForSelector('[data-testid="confirm-title"]');
await shot(page, '06-confirmation.png');
await T('view-bookings').click();
await page.waitForSelector('[data-testid^="booking-"]');
await shot(page, '07-bookings.png');
await T('tab-help').click();
await page.waitForSelector('[data-testid="tel-188"]');
await shot(page, '08-help.png');
await T('tab-home').click();
await page.waitForSelector('[data-testid="cat-counselling"]');
await shot(page, '02-home.png');

// 09 desktop frame
const deskCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const desk = await deskCtx.newPage();
await desk.goto(base + '?reset=1');
await desk.goto(base + '?v=2&lang=en#/home');
await desk.waitForSelector('[data-testid="search-input"]');
if (!keepCoach) {
  const coach = desk.getByTestId('coach');
  if (await coach.isVisible().catch(() => false)) await desk.getByTestId('coach-ok').click();
}
await shot(desk, '09-desktop-frame.png');

// 10 v1 vs v2 side by side
async function homeShot(v) {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await c.newPage();
  await p.goto(base + '?reset=1');
  await p.goto(`${base}?v=${v}&lang=en#/home`);
  await p.waitForSelector('[data-testid="search-input"]');
  if (!keepCoach) {
    const coach = p.getByTestId('coach');
    if (await coach.isVisible().catch(() => false)) await p.getByTestId('coach-ok').click();
  }
  await settle(p);
  const buf = await p.screenshot();
  await c.close();
  return `data:image/png;base64,${buf.toString('base64')}`;
}
const [v1, v2] = [await homeShot(1), await homeShot(2)];
const comp = await browser.newContext({ viewport: { width: 1000, height: 960 }, deviceScaleFactor: 2 });
const cp = await comp.newPage();
await cp.setContent(`<body style="margin:0;background:#FBF4E4;font:600 22px system-ui;color:#0E0B0A">
<div style="display:flex;gap:40px;justify-content:center;padding:40px">
${[['V1 as tested', v1], ['V2 after test', v2]].map(([l, s]) =>
  `<figure style="margin:0;text-align:center"><img src="${s}" style="width:390px;border-radius:28px;display:block;box-shadow:0 0 0 1px #0E0B0A22"><figcaption style="margin-top:16px">${l}</figcaption></figure>`).join('')}
</div></body>`);
await cp.waitForFunction(() => [...document.images].every((i) => i.complete));
await shot(cp, '10-v1-vs-v2-home.png', { fullPage: true });

await browser.close();
console.log(`Done: ${outDir}`);
