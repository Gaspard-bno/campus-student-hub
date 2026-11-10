# Campus Student Hub

A conceptual interactive prototype of a mobile web app that helps international students find a campus service and book an advisor. It is **not a working MVP**: every service, advisor, room and time slot is fictional demo data, and nothing is sent anywhere.

Made by Crousty Studio for the FAE Creativity & Innovation course, Project 4.

## Run locally

No build step, no runtime dependency. Serve the folder with any static server:

```bash
npm install          # dev tools only (Playwright, esbuild, qrcode)
npm run serve        # http://127.0.0.1:4173/
```

On a screen at least 900 px wide the app sits in a phone frame next to a side panel (version switch, reset, test session, QR code).

### URL parameters

| Param | Values | Effect |
|---|---|---|
| `v` | `1`, `2` | V1 is the version as tested, V2 applies what the test taught us (default 2) |
| `lang` | `en`, `pt`, `fr` | Sets the interface language |
| `reset` | `1` | Clears all `csh.*` data stored in the browser |

They work in the query string (`/?v=1&lang=pt`) or after the hash (`/#/home?v=1`).

## Tests

```bash
npx playwright install chromium
npm test                                  # E1 to E18 on mobile 390, desktop 1440, small 320
npx playwright test -c tests/playwright.config.mjs -g "E2 "
BASE_URL=https://example.github.io/campus-student-hub/ npm test   # against a deployed site
```

The HTML report is written to `test-results/report`.

## Tools

```bash
node tools/qr.mjs <url>                       # assets/img/qr-code.svg + livrables/qr-code.png
node tools/screenshots.mjs [baseURL] [outDir]  # livrables/captures/*.png (add --coach to keep the coach mark)
node tools/inline.mjs                         # offline/index.html + livrables/campus-student-hub-offline.zip
node tools/demo-video.mjs [baseURL]           # livrables/demo-video.webm
```

`offline/index.html` is a single file that works when double-clicked (`file://`).

## Privacy

No tracking, no analytics, no cookies, no network call at runtime. Bookings and preferences stay in the browser's `localStorage` (`csh.*` keys). The Help screen lists only real Brazilian public services: CVV 188 and SAMU 192. The chat is simulated.

## Licences

- Code: MIT, see `LICENSE`.
- Fonts (Hanken Grotesk, JetBrains Mono): SIL Open Font License 1.1.
- Icons: Lucide, ISC licence.
