// Build script for SpeedUp Video Pro (Manifest V3).
//   node scripts/build.mjs                    Chrome/Edge production build -> dist/
//   node scripts/build.mjs --dev              dev build (__DEV__ = true, dev master key, sourcemaps)
//   node scripts/build.mjs --watch            rebuild on change
//   node scripts/build.mjs --zip              production build + release/SpeedUp_Video_Pro_v<version>.zip
//   node scripts/build.mjs --target=firefox   Firefox build -> dist-firefox/ (see docs/FIREFOX.md)
import * as esbuild from 'esbuild';
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildLocales } from './locales.mjs';
import { toFirefoxManifest } from './firefox.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const isDev = args.includes('--dev');
const isWatch = args.includes('--watch');
const isZip = args.includes('--zip');
const target = (args.find((a) => a.startsWith('--target=')) ?? '--target=chrome').split('=')[1];
if (!['chrome', 'firefox'].includes(target)) throw new Error(`unknown target ${target}`);
const outdir = path.join(root, target === 'firefox' ? 'dist-firefox' : 'dist');

// Every entry is bundled as a classic IIFE script: content scripts cannot be ES modules,
// and a single format keeps the background script free of `"type": "module"` constraints.
const entryPoints = {
  'background/background': 'src/background/index.ts',
  'popup/popup': 'src/popup/index.js',
  'options/options': 'src/options/index.ts',
  'onboarding/onboarding': 'src/onboarding/index.ts'
};

/** @type {esbuild.BuildOptions} */
const options = {
  absWorkingDir: root,
  entryPoints,
  outdir,
  bundle: true,
  format: 'iife',
  target: target === 'firefox' ? ['firefox128'] : ['chrome110'],
  platform: 'browser',
  // Readable output for store review; no remote code, no eval.
  minify: false,
  sourcemap: isDev ? 'inline' : false,
  legalComments: 'none',
  logLevel: 'warning',
  define: {
    __DEV__: JSON.stringify(isDev),
    // Offline master key for local testing; empty string in store builds.
    __DEV_MASTER_KEY__: JSON.stringify(isDev ? 'DEV-SPEEDUP-PRO-2026' : ''),
    __TARGET__: JSON.stringify(target)
  }
};

// Code injected into web pages runs in every frame of every site, so it is minified (not
// obfuscated — allowed by store policies) to cut parse time. Extension pages stay readable.
/** @type {esbuild.BuildOptions} */
const contentOptions = {
  ...options,
  entryPoints: { 'content/content': 'src/content/index.ts' },
  minify: !isDev
};

// Pro modules: separate ES modules, loaded on demand by the content script with
// import(chrome.runtime.getURL('pro/<name>.js')) so free users never parse them.
/** @type {esbuild.BuildOptions} */
const proOptions = {
  ...contentOptions,
  entryPoints: {
    'pro/skip-silence': 'src/pro/skip-silence.ts',
    'pro/youtube-ads': 'src/pro/youtube-ads.ts',
    'pro/rules': 'src/pro/rules.ts'
  },
  format: 'esm'
};

async function copyStatic() {
  await cp(path.join(root, 'public'), outdir, { recursive: true });
  await buildLocales(path.join(root, 'src/_locales'), outdir);
  if (target === 'firefox') {
    const manifestPath = path.join(outdir, 'manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    await writeFile(manifestPath, JSON.stringify(toFirefoxManifest(manifest), null, 2));
  }
}

async function zipRelease() {
  const manifest = JSON.parse(await readFile(path.join(outdir, 'manifest.json'), 'utf8'));
  const releaseDir = path.join(root, 'release');
  await mkdir(releaseDir, { recursive: true });
  const suffix = target === 'firefox' ? '_firefox' : '';
  const zipPath = path.join(releaseDir, `SpeedUp_Video_Pro_v${manifest.version}${suffix}.zip`);
  await rm(zipPath, { force: true });
  execFileSync('zip', ['-qr', '-X', zipPath, '.', '-x', '.DS_Store', '*/.DS_Store'], { cwd: outdir });
  const { size } = await stat(zipPath);
  console.log(`zip: ${path.relative(root, zipPath)} (${(size / 1024).toFixed(1)} KB)`);
}

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });
await copyStatic();

if (isWatch) {
  for (const o of [options, contentOptions, proOptions]) await (await esbuild.context(o)).watch();
  console.log('watching src/ … (public/ and locales are copied once; restart after editing them)');
} else {
  const results = await Promise.all([options, contentOptions, proOptions].map((o) => esbuild.build(o)));
  const warnings = results.reduce((n, r) => n + r.warnings.length, 0);
  if (warnings) {
    console.error(`build finished with ${warnings} warning(s)`);
    process.exit(1);
  }
  console.log(`build ok (${target}, ${isDev ? 'dev' : 'production'}) -> ${path.relative(root, outdir)}/`);
  if (isZip) await zipRelease();
}
