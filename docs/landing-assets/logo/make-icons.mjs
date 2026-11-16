// LectureSpeed favicons and apple-touch-icon from the SVG marks in landing-page/img/.
// Run from the repo root:  node docs/landing-assets/logo/make-icons.mjs
//   favicon-16.png  ← logo-mark-16.svg (drawn for 16 px)
//   favicon-32.png, favicon-128.png ← logo-mark.svg
//   apple-touch-icon.png (180, full square: iOS rounds the corners) ← logo-mark.svg
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (f) => readFileSync(path.join(root, 'landing-page/img', f), 'utf8');
const mark = read('logo-mark.svg');
const jobs = [
  ['favicon-16.png', 16, read('logo-mark-16.svg')],
  ['favicon-32.png', 32, mark],
  ['favicon-128.png', 128, mark],
  ['apple-touch-icon.png', 180, mark.replace('rx="15"', 'rx="0"')]
];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, size, src] of jobs) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${src.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: path.join(root, 'landing-page', file), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  console.log('Wrote', file);
}
await browser.close();
