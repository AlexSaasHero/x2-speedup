// Favicons and apple-touch-icon from landing-page/img/logo-mark.svg.
// Run from the repo root:  node docs/landing-assets/logo/make-icons.mjs
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const svg = readFileSync(path.join(root, 'landing-page/img/logo-mark.svg'), 'utf8');
// iOS rounds the corners itself: the apple-touch-icon is a full square.
const square = svg.replace('rx="15"', 'rx="0"');
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, size, src] of [['favicon-32.png', 32, svg], ['favicon-128.png', 128, svg], ['apple-touch-icon.png', 180, square]]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${src.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: path.join(root, 'landing-page', file), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  console.log('Wrote', file);
}
await browser.close();
