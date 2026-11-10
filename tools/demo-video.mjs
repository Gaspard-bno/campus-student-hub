import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let base = process.argv[2] || 'http://127.0.0.1:4173/';
if (!base.endsWith('/')) base += '/';

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'csh-video-'));
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: tmp, size: { width: 1440, height: 900 } },
});
const page = await ctx.newPage();
const T = (id) => page.getByTestId(id);
const pause = (ms) => page.waitForTimeout(ms);

await page.goto(base + '?reset=1');
await page.goto(base + '?v=2#/welcome');
await T('lang-en').waitFor();
const t0 = Date.now();
const until = async (sec) => { const left = sec * 1000 - (Date.now() - t0); if (left > 0) await pause(left); };

// 0-8 welcome
await until(8);

// 8-15 Portuguese, back to English through the globe
await T('lang-pt').click();
await T('search-input').waitFor();
await pause(2500);
await T('lang-button').click();
await pause(900);
await T('lang-option-en').click();
await until(15);

// 15-25 search stress -> counselling
const coach = T('coach');
if (await coach.isVisible().catch(() => false)) await T('coach-ok').click();
await pause(600);
await T('search-input').click();
await T('search-input').pressSequentially('stress', { delay: 220 });
await pause(1800);
await until(23);
await T('result-counselling-session').click();
await until(25);

// 25-40 book
await T('book-session').click();
await pause(1800);
const days = page.locator('[data-testid^="day-"]');
await days.first().waitFor();
const n = await days.count();
for (let i = 0; i < n; i++) {
  await days.nth(i).click();
  await pause(900);
  const free = page.locator('[data-testid^="slot-"][data-state="free"]');
  if ((await free.count()) > 0) { await free.first().click(); break; }
}
await until(37);
await T('confirm-booking').click();
await until(40);

// 40-48 confirmation
await T('confirm-title').waitFor();
await until(48);

// 48-55 help
await T('tab-help').click();
await until(52);
await T('chat-q-book').click().catch(() => {});
await until(55);

// 55-62 V1 / V2
await T('version-1').click();
await until(58.5);
await T('version-2').click();
await until(63);

await ctx.close();
const vid = await page.video().path();
const dest = path.join(root, 'livrables/demo-video.webm');
await fs.mkdir(path.dirname(dest), { recursive: true });
await fs.copyFile(vid, dest);
await fs.rm(tmp, { recursive: true, force: true });
await browser.close();
console.log(`Wrote livrables/demo-video.webm (${((Date.now() - t0) / 1000).toFixed(0)} s of scenario)`);
