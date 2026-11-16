// Extension icons from the LectureSpeed marks in landing-page/img/ (same source as the website).
// Run from the repo root:  node scripts/make-icons.mjs
//   icon16.png  ← logo-mark-16.svg (drawn for 16 px)
//   icon32.png, icon48.png ← logo-mark.svg
//   icon128.png ← logo-mark.svg drawn at 96×96 with 16 px transparent padding (Chrome Web Store guideline)
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(path.join(root, 'landing-page/img', f), 'utf8');
const mark = read('logo-mark.svg');
const jobs = [
  ['icon16.png', 16, read('logo-mark-16.svg'), 0],
  ['icon32.png', 32, mark, 0],
  ['icon48.png', 48, mark, 0],
  ['icon128.png', 128, mark, 16]
];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, size, svg, pad] of jobs) {
  const inner = size - pad * 2;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent"><div style="padding:${pad}px;width:${size}px;height:${size}px;box-sizing:border-box">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body></html>`);
  await page.screenshot({ path: path.join(root, 'public/icons', file), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  console.log('Wrote public/icons/' + file);
}
await browser.close();
