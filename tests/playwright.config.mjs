import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const external = !!process.env.BASE_URL;
let baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173/';
if (!baseURL.endsWith('/')) baseURL += '/';

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.mjs/,
  outputDir: path.join(root, 'test-results', 'artifacts'),
  fullyParallel: true,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(root, 'test-results', 'report'), open: 'never' }],
  ],
  use: { baseURL, browserName: 'chromium', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: external
    ? undefined
    : {
        command: 'python3 -m http.server 4173 --bind 127.0.0.1',
        cwd: root,
        url: 'http://127.0.0.1:4173/',
        reuseExistingServer: true,
        timeout: 15_000,
      },
  projects: [
    {
      name: 'mobile-390',
      use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    },
    {
      name: 'desktop-1440',
      use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'small-320',
      use: { browserName: 'chromium', viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    },
  ],
});
