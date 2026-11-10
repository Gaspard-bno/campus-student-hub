import QRCode from 'qrcode';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = process.argv[2];
if (!url) {
  console.error('Usage: node tools/qr.mjs <url>');
  process.exit(1);
}

const color = { dark: '#0E0B0A', light: '#FBF4E4' };
const svgPath = path.join(root, 'assets/img/qr-code.svg');
const pngPath = path.join(root, 'livrables/qr-code.png');
await fs.mkdir(path.dirname(svgPath), { recursive: true });
await fs.mkdir(path.dirname(pngPath), { recursive: true });

const svg = await QRCode.toString(url, { type: 'svg', margin: 4, color, errorCorrectionLevel: 'M' });
await fs.writeFile(svgPath, svg);
await QRCode.toFile(pngPath, url, { type: 'png', width: 1024, margin: 4, color, errorCorrectionLevel: 'M' });

console.log(`Encoded URL: ${url}`);
console.log(`Wrote ${path.relative(root, svgPath)}`);
console.log(`Wrote ${path.relative(root, pngPath)}`);
