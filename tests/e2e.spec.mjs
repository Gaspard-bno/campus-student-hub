import { test as base, expect } from '@playwright/test';
import fs from 'node:fs';

const readJson = (rel) => JSON.parse(fs.readFileSync(new URL(rel, import.meta.url), 'utf8'));
const I18N = readJson('../assets/data/i18n.json');
const DATA = readJson('../assets/data/services.json');
const tr = (lang, key) => I18N[lang][key];
const svcName = (id, lang) => DATA.services.find((s) => s.id === id).name[lang];

const REF_RE = /^CSH-[A-HJKMNP-Z2-9]{4}$/;
const IGNORED_NOISE = /favicon\.ico/i;

/* ---------- fixture: console / pageerror / external network guard ---------- */
const test = base.extend({
  issues: async ({ page, baseURL }, use) => {
    const issues = { errors: [], warnings: [] };
    const origin = new URL(baseURL).origin;
    page.on('console', (m) => {
      const text = m.text();
      if (IGNORED_NOISE.test(text) || IGNORED_NOISE.test(m.location().url || '')) return;
      if (m.type() === 'error') issues.errors.push(`console.error: ${text}`);
      if (m.type() === 'warning') issues.warnings.push(`console.warn: ${text}`);
    });
    page.on('pageerror', (e) => issues.errors.push(`pageerror: ${e.message}`));
    page.on('response', (r) => {
      if (r.status() >= 400 && !IGNORED_NOISE.test(r.url())) issues.errors.push(`HTTP ${r.status()}: ${r.url()}`);
    });
    page.on('request', (r) => {
      const u = r.url();
      if (/^(data|blob|about|file):/.test(u)) return;
      if (new URL(u).origin !== origin) issues.errors.push(`external request: ${u}`);
    });
    await use(issues);
    expect(issues.errors, 'console errors, page errors or external requests').toEqual([]);
  },
});
test.beforeEach(async ({ issues }) => void issues);

/* ---------- helpers ---------- */
async function fresh(page, { lang = 'en', v = 2 } = {}) {
  await page.goto('./?reset=1');
  await page.goto(`./#/home?v=${v}&lang=${lang}`);
  const home = page.getByTestId('search-input');
  const welcomeBtn = page.getByTestId(`lang-${lang}`);
  await expect(home.or(welcomeBtn)).toBeVisible();
  if (await welcomeBtn.isVisible()) await welcomeBtn.click();
  await expect(home).toBeVisible();
}

async function dismissCoach(page) {
  const coach = page.getByTestId('coach');
  if (await coach.isVisible().catch(() => false)) await page.getByTestId('coach-ok').click();
}

async function storage(page) {
  return page.evaluate(() => {
    const o = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      o[k] = localStorage.getItem(k);
    }
    return o;
  });
}
const bookingsOf = async (page) => {
  const raw = await page.evaluate(() => localStorage.getItem('csh.bookings'));
  return raw ? JSON.parse(raw) : [];
};

/** Pick the first day that has a free slot and click the first free slot. Returns {date, time}. */
async function pickFirstFreeSlot(page) {
  const days = page.locator('[data-testid^="day-"]');
  await expect(days.first()).toBeVisible();
  const n = await days.count();
  for (let i = 0; i < n; i++) {
    const day = days.nth(i);
    await day.click();
    const free = page.locator('[data-testid^="slot-"][data-state="free"]');
    if ((await free.count()) > 0) {
      const date = (await day.getAttribute('data-testid')).replace('day-', '');
      const first = free.first();
      const time = (await first.getAttribute('data-testid')).replace('slot-', '');
      await first.click();
      return { date, time };
    }
  }
  throw new Error('no day with a free slot');
}

async function bookCounselling(page) {
  await dismissCoach(page);
  await page.getByTestId('cat-counselling').click();
  await page.getByTestId('book-session').click();
  const slot = await pickFirstFreeSlot(page);
  await page.getByTestId('confirm-booking').click();
  await expect(page.getByTestId('confirm-title')).toBeVisible();
  return slot;
}

const hashOf = (page) => page.evaluate(() => location.hash);
const goRoute = (page, route) => page.evaluate((r) => { location.hash = r; }, route);

/* ---------- scenarios ---------- */
test('E1 first launch shows welcome, picks English, lands on home with csh.lang=en', async ({ page }) => {
  await page.goto('./?reset=1');
  await expect.poll(() => hashOf(page)).toMatch(/^#\/welcome/);
  await page.getByTestId('lang-en').click();
  await expect.poll(() => hashOf(page)).toMatch(/^#\/home/);
  await expect(page.getByTestId('search-input')).toBeVisible();
  expect((await storage(page))['csh.lang']).toBe('en');
});

test('E2 main flow by category: counselling, book, first free slot, confirm', async ({ page }) => {
  await fresh(page);
  const { date, time } = await bookCounselling(page);
  await expect(page.getByTestId('confirm-title')).toHaveText(tr('en', 'confirm.title'));
  const ref = (await page.getByTestId('ref-code').innerText()).trim();
  expect(ref).toMatch(REF_RE);
  const stored = await bookingsOf(page);
  expect(stored).toHaveLength(1);
  expect(stored[0]).toMatchObject({ id: ref, serviceId: 'counselling-session', date, time });
});

test('E3 main flow by search in Portuguese (psicólogo)', async ({ page }) => {
  await fresh(page, { lang: 'pt' });
  await dismissCoach(page);
  await page.getByTestId('search-input').fill('psicólogo');
  const result = page.getByTestId('result-counselling-session');
  await expect(result).toBeVisible();
  await expect(result).toContainText(svcName('counselling-session', 'pt'));
  await result.click();
  await page.getByTestId('book-session').click();
  await pickFirstFreeSlot(page);
  await page.getByTestId('confirm-booking').click();
  await expect(page.getByTestId('confirm-title')).toHaveText(tr('pt', 'confirm.title'));
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  expect(await bookingsOf(page)).toHaveLength(1);
});

test('E4 confirm without a slot shows an error and does not navigate', async ({ page }) => {
  await fresh(page);
  await dismissCoach(page);
  await page.getByTestId('cat-counselling').click();
  await page.getByTestId('book-session').click();
  const before = await hashOf(page);
  await page.getByTestId('confirm-booking').click();
  await expect(page.getByTestId('book-error')).toContainText(tr('en', 'book.chooseTime'));
  expect(await hashOf(page)).toBe(before);
  expect(await bookingsOf(page)).toHaveLength(0);
});

test('E5 second booking at the same date and time is blocked with a conflict message', async ({ page }) => {
  await fresh(page);
  const { date, time } = await bookCounselling(page);
  let blocked = false;
  for (const svc of DATA.services.filter((s) => s.id !== 'counselling-session')) {
    await goRoute(page, `/book/${svc.id}`);
    const day = page.getByTestId(`day-${date}`);
    await expect(page.getByTestId('confirm-booking')).toBeVisible();
    if ((await day.count()) === 0) continue;
    const advisors = page.locator('[data-testid^="advisor-"]');
    const nAdv = await advisors.count();
    for (let a = 0; a < Math.max(nAdv, 1); a++) {
      if (nAdv > 0) await advisors.nth(a).click();
      await day.click();
      const slot = page.locator(`[data-testid="slot-${time}"][data-state="free"]`);
      if ((await slot.count()) === 0) continue;
      await slot.click();
      await page.getByTestId('confirm-booking').click();
      await expect(page.getByTestId('book-error')).toContainText(tr('en', 'book.conflict'));
      expect(await hashOf(page)).toMatch(/^#\/book\//);
      expect(await bookingsOf(page)).toHaveLength(1);
      blocked = true;
      break;
    }
    if (blocked) break;
  }
  test.skip(!blocked, `no other service has a free slot at ${date} ${time}`);
});

test('E6 reload on booking screen and on bookings screen keeps view and data', async ({ page }) => {
  await fresh(page);
  await dismissCoach(page);
  await goRoute(page, '/book/counselling-session');
  const slots = page.locator('[data-testid^="slot-"]');
  await expect(slots.first()).toBeVisible();
  const snapshot = () => slots.evaluateAll((els) => els.map((e) => `${e.dataset.testid}:${e.dataset.state}`));
  const before = await snapshot();
  const hashBefore = await hashOf(page);
  await page.reload();
  await expect(page.locator('[data-testid^="slot-"]').first()).toBeVisible();
  expect(await hashOf(page)).toBe(hashBefore);
  expect(await snapshot()).toEqual(before);

  await goRoute(page, '/home');
  await expect(page.getByTestId('search-input')).toBeVisible();
  await bookCounselling(page);
  const ref = (await page.getByTestId('ref-code').innerText()).trim();
  await page.getByTestId('view-bookings').click();
  await expect(page.getByTestId(`booking-${ref}`)).toBeVisible();
  const hash5 = await hashOf(page);
  await page.reload();
  expect(await hashOf(page)).toBe(hash5);
  await expect(page.getByTestId(`booking-${ref}`)).toBeVisible();
});

test('E7 browser back goes confirm, booking, service, home with no console error', async ({ page }) => {
  await fresh(page);
  await bookCounselling(page);
  await page.goBack();
  await expect.poll(() => hashOf(page)).toMatch(/^#\/book\//);
  await page.goBack();
  await expect.poll(() => hashOf(page)).toMatch(/^#\/service\//);
  await page.goBack();
  await expect.poll(() => hashOf(page)).toMatch(/^#\/home/);
  await expect(page.getByTestId('cat-counselling')).toBeVisible();
});

test('E8 inline cancel removes the booking and shows the empty state', async ({ page }) => {
  await fresh(page);
  await bookCounselling(page);
  const ref = (await page.getByTestId('ref-code').innerText()).trim();
  await page.getByTestId('view-bookings').click();
  await page.getByTestId(`cancel-${ref}`).click();
  await page.getByTestId(`cancel-yes-${ref}`).click();
  await expect(page.getByTestId(`booking-${ref}`)).toHaveCount(0);
  await expect(page.getByTestId('bookings-empty')).toBeVisible();
  expect(await bookingsOf(page)).toHaveLength(0);
});

test('E9 search with no match shows empty state and Browse categories works', async ({ page }) => {
  await fresh(page);
  await dismissCoach(page);
  await page.getByTestId('search-input').fill('zzzz');
  await expect(page.getByTestId('search-empty')).toBeVisible();
  await page.getByTestId('browse-categories').click();
  await expect(page.getByTestId('cat-counselling')).toBeVisible();
  await expect(page.getByTestId('search-empty')).toHaveCount(0);
});

test('E10 help in French: 4 quick questions, free message fallback, simulated notice', async ({ page }) => {
  await fresh(page, { lang: 'fr' });
  await dismissCoach(page);
  await page.getByTestId('tab-help').click();
  await expect(page.getByTestId('chat-simulated')).toBeVisible();
  await expect(page.getByTestId('chat-simulated')).toContainText(tr('fr', 'chat.simulated'));
  const log = page.getByTestId('chat-log');
  for (const q of ['book', 'office', 'lang', 'card']) {
    await page.getByTestId(`chat-q-${q}`).click();
    await expect(log).toContainText(tr('fr', `chat.a.${q}`));
  }
  await page.getByTestId('chat-input').fill('Bonjour, une autre question');
  await page.getByTestId('chat-send').click();
  await expect(log).toContainText(tr('fr', 'chat.fallback'));
  await expect(log.locator('.chat-msg[data-from="me"]').last()).toContainText('Bonjour, une autre question');
  expect(await log.locator('.chat-msg[data-from="team"]').count()).toBeGreaterThanOrEqual(5);
});

test('E11 tel:188 and tel:192 links are present', async ({ page }) => {
  await fresh(page);
  await goRoute(page, '/help');
  await expect(page.getByTestId('tel-188')).toHaveAttribute('href', 'tel:188');
  await expect(page.getByTestId('tel-192')).toHaveAttribute('href', 'tel:192');
  await expect(page.getByText(tr('en', 'help.realNote'))).toBeVisible();
});

test('E12 version 1 vs 2: icon size 22 vs 28, coach mark only in V2', async ({ page }) => {
  const iconWidth = async () => (await page.getByTestId('cat-counselling').locator('svg').first().boundingBox()).width;
  await fresh(page, { v: 1 });
  await expect(page.locator('html')).toHaveAttribute('data-version', '1');
  expect(await iconWidth()).toBeCloseTo(22, 0);
  await expect(page.getByTestId('coach')).toHaveCount(0);

  await fresh(page, { v: 2 });
  await expect(page.locator('html')).toHaveAttribute('data-version', '2');
  expect(await iconWidth()).toBeCloseTo(28, 0);
  await expect(page.getByTestId('coach')).toBeVisible();
  await page.getByTestId('coach-ok').click();
  await expect(page.getByTestId('coach')).toHaveCount(0);
});

test('E13 ?reset=1 clears every csh.* key', async ({ page }) => {
  await fresh(page);
  await bookCounselling(page);
  const before = await storage(page);
  expect(Object.keys(before).some((k) => k.startsWith('csh.'))).toBe(true);
  await page.goto('./?reset=1');
  await expect.poll(async () => Object.keys(await storage(page)).filter((k) => /^csh\.(bookings|lang|coachmarkSeen)$/.test(k))).toEqual([]);
});

test('E14 language switch via ?lang= leaves no raw i18n key on any route', async ({ page }) => {
  await fresh(page);
  await bookCounselling(page);
  const ref = (await page.getByTestId('ref-code').innerText()).trim();
  const routes = [
    'welcome', 'home', 'search?q=psi', 'service/counselling-session', 'book/counselling-session',
    `confirm/${ref}`, 'bookings', 'help',
  ];
  const FILE_RE = /\b[\w-]+\.(png|svg|ics|csv|html|json|js|mjs|css|webp|woff2?|txt|zip|webm|mp4)\b/gi;
  const OK = new Set(['e.g', 'i.e', 'a.m', 'p.m', 'etc.']);
  const KEY_RE = /\b[a-z][a-z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*)+\b/g;
  for (const lang of ['en', 'pt', 'fr']) {
    for (const route of routes) {
      await page.goto(`./?lang=${lang}#/${route}`);
      await expect(page.locator('#view')).not.toBeEmpty();
      await page.waitForTimeout(150);
      const text = await page.evaluate(() =>
        ['#view', '#app-header', '#tabbar'].map((s) => document.querySelector(s)?.innerText || '').join('\n'));
      const cleaned = text.replace(FILE_RE, ' ').replace(/\b\d{1,2}[:.]\d{2}\b/g, ' ');
      const raw = (cleaned.match(KEY_RE) || []).filter((m) => !OK.has(m) && !OK.has(m.toLowerCase()));
      const isKey = (cleaned.match(/[a-z][\w]*(?:\.[\w]+)+/g) || []).filter((m) => m in I18N.en);
      expect(raw.concat(isKey), `raw keys on ${lang} #/${route}`).toEqual([]);
    }
  }
});

test('E15 localStorage that throws: app stays usable, no unhandled exception', async ({ page }) => {
  await page.addInitScript(() => {
    const boom = () => { throw new DOMException('denied', 'SecurityError'); };
    Storage.prototype.getItem = boom;
    Storage.prototype.setItem = boom;
    Storage.prototype.removeItem = boom;
  });
  await page.goto('./#/home?v=2&lang=en');
  const home = page.getByTestId('search-input');
  const welcomeBtn = page.getByTestId('lang-en');
  await expect(home.or(welcomeBtn)).toBeVisible();
  if (await welcomeBtn.isVisible()) await welcomeBtn.click();
  await bookCounselling(page);
  await expect(page.getByTestId('confirm-title')).toHaveText(tr('en', 'confirm.title'));
  await page.getByTestId('view-bookings').click();
  await expect(page.locator('[data-testid^="booking-"]')).toHaveCount(1);
});

test('E16 observer mode: start, run flow, auto stop at confirmation, CSV download', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1440', 'observer panel is desktop only');
  await fresh(page);
  await expect(page.getByTestId('obs-start')).toBeVisible();
  await page.getByTestId('obs-start').click();
  await bookCounselling(page);
  const done = new RegExp(
    tr('en', 'panel.testDone').replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('\\{s\\}', '\\d+(?:[.,]\\d+)?'));
  await expect(page.getByTestId('obs-result')).toHaveText(done);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('obs-export').click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  const file = await download.path();
  const csv = fs.readFileSync(file, 'utf8');
  expect(csv.trim().split(/\r?\n/).length).toBeGreaterThanOrEqual(2);
});

test('E17 no dead links (href="#", empty, missing) on any route', async ({ page }) => {
  await fresh(page);
  await bookCounselling(page);
  const ref = (await page.getByTestId('ref-code').innerText()).trim();
  const routes = ['welcome', 'home', 'search?q=psi', 'service/counselling-session', 'book/counselling-session',
    `confirm/${ref}`, 'bookings', 'help'];
  for (const route of routes) {
    await page.goto(`./#/${route}`);
    await expect(page.locator('#view')).not.toBeEmpty();
    const dead = await page.evaluate(() =>
      [...document.querySelectorAll('a')]
        .filter((a) => {
          const h = a.getAttribute('href');
          return h === null || h.trim() === '' || h.trim() === '#' || /^javascript:/i.test(h);
        })
        .map((a) => a.outerHTML.slice(0, 120)));
    expect(dead, `dead links on #/${route}`).toEqual([]);
    const idle = await page.evaluate(() =>
      [...document.querySelectorAll('button')].filter((b) => !b.disabled && !b.getAttribute('type') && !b.closest('form')
        && b.textContent.trim() === '' && !b.getAttribute('aria-label')).map((b) => b.outerHTML.slice(0, 120)));
    expect(idle, `unlabelled buttons on #/${route}`).toEqual([]);
  }
});

test('E18 full main flow with zero console errors and zero warnings', async ({ page, issues }) => {
  await fresh(page);
  await bookCounselling(page);
  await expect(page.getByTestId('confirm-title')).toHaveText(tr('en', 'confirm.title'));
  await page.getByTestId('view-bookings').click();
  await page.getByTestId('tab-help').click();
  await page.getByTestId('tab-home').click();
  expect(issues.warnings, 'console warnings').toEqual([]);
});
