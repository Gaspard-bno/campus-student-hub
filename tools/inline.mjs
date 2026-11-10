import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const abs = (...p) => path.join(root, ...p);
const MIME = {
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
};
const dataUri = async (file) => {
  const ext = path.extname(file).toLowerCase();
  const buf = await fs.readFile(file);
  return `data:${MIME[ext] || 'application/octet-stream'};base64,${buf.toString('base64')}`;
};
const exists = (f) => fs.access(f).then(() => true, () => false);
const safeScript = (code) => code.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

let html = await fs.readFile(abs('index.html'), 'utf8');

// 1. JS bundle
const entry = abs('assets/js/app.js');
const out = await build({
  entryPoints: [entry], bundle: true, format: 'iife', minify: true, write: false, target: 'es2020', legalComments: 'none',
});
let js = out.outputFiles[0].text;

// 2. QR as data URI (html + bundle)
const qrFile = abs('assets/img/qr-code.svg');
let qrUri = null;
if (await exists(qrFile)) {
  qrUri = await dataUri(qrFile);
  js = js.split('assets/img/qr-code.svg').join(qrUri);
}

// 3. CSS: inline every stylesheet link, in order
const linkRe = /<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi;
const links = html.match(linkRe) || [];
let css = '';
for (const tag of links) {
  const href = /href=["']([^"']+)["']/i.exec(tag)?.[1];
  if (!href || /^https?:/i.test(href)) continue;
  const file = abs(href.split('?')[0].replace(/^\.?\//, ''));
  let text = await fs.readFile(file, 'utf8');
  const dir = path.dirname(file);
  const urlRe = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^'")\s]+))\s*\)/g;
  const found = [...text.matchAll(urlRe)];
  for (const m of found) {
    const ref = m[1] ?? m[2] ?? m[3];
    if (/^(data:|https?:|#)/i.test(ref)) continue;
    const target = path.resolve(dir, ref.split(/[?#]/)[0]);
    if (!(await exists(target))) { console.warn(`warning: missing ${path.relative(root, target)} (from ${href})`); continue; }
    text = text.split(m[0]).join(`url("${await dataUri(target)}")`);
  }
  css += `/* ${href} */\n${text}\n`;
}
html = html.replace(linkRe, (tag) => (/href=["'](?!https?:)/i.test(tag) ? '' : tag));
html = html.replace(/<link\b[^>]*rel=["'](?:preload|modulepreload)["'][^>]*>/gi, '');

// 4. other local asset references in index.html (icons, images) -> data URIs
const attrRe = /\b(src|href)=["'](assets\/[^"'#?]+\.(?:svg|png|jpe?g|webp|ico))["']/gi;
for (const m of [...html.matchAll(attrRe)]) {
  const f = abs(m[2]);
  if (await exists(f)) html = html.split(m[0]).join(`${m[1]}="${await dataUri(f)}"`);
}

// 5. strip module script tags, inject style + data + bundle
html = html.replace(/<script\b[^>]*type=["']module["'][^>]*>\s*<\/script>/gi, '');
const services = JSON.parse(await fs.readFile(abs('assets/data/services.json'), 'utf8'));
const i18n = JSON.parse(await fs.readFile(abs('assets/data/i18n.json'), 'utf8'));
const dataScript = `<script>window.__CSH_DATA__=${safeScript(JSON.stringify({ services, i18n }))};</script>`;
const style = `<style>\n${css}</style>`;
html = html.includes('</head>') ? html.replace('</head>', () => `${style}\n</head>`) : style + html;
const tail = `${dataScript}\n<script>${safeScript(js)}</script>`;
html = html.includes('</body>') ? html.replace('</body>', () => `${tail}\n</body>`) : html + tail;

await fs.mkdir(abs('offline'), { recursive: true });
await fs.writeFile(abs('offline/index.html'), html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`Wrote offline/index.html (${kb} KB)`);

// 6. zip
await fs.mkdir(abs('livrables'), { recursive: true });
const stage = await fs.mkdtemp(path.join(os.tmpdir(), 'csh-offline-'));
await fs.mkdir(path.join(stage, 'offline'));
await fs.copyFile(abs('offline/index.html'), path.join(stage, 'offline/index.html'));
await fs.writeFile(path.join(stage, 'README.txt'),
`Campus Student Hub - offline build
Conceptual interactive prototype with demo data, by Crousty Studio (Creativity & Innovation, Project 4).

Open offline/index.html by double-clicking it. It is a single self-contained file:
no internet connection, no installation, no tracking.
All services, advisors and slots are fictional. Urgent help lists only the real
Brazilian public services CVV 188 and SAMU 192.
URL options: ?v=1 or ?v=2, ?lang=en|pt|fr, ?reset=1
`);
const zipPath = abs('livrables/campus-student-hub-offline.zip');
await fs.rm(zipPath, { force: true });
execFileSync('zip', ['-r', '-q', zipPath, 'offline', 'README.txt'], { cwd: stage });
await fs.rm(stage, { recursive: true, force: true });
console.log('Wrote livrables/campus-student-hub-offline.zip');
