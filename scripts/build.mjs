// Build script for SpeedUp Video Pro (Chrome MV3).
//   node scripts/build.mjs           production build -> dist/
//   node scripts/build.mjs --dev     dev build (__DEV__ = true, sourcemaps)
//   node scripts/build.mjs --watch   rebuild on change (implies nothing else)
//   node scripts/build.mjs --zip     production build + release/SpeedUp_Video_Pro_v<version>.zip
import * as esbuild from 'esbuild';
import { cp, mkdir, readFile, rm, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const isDev = args.has('--dev');
const isWatch = args.has('--watch');
const isZip = args.has('--zip');
const outdir = path.join(root, 'dist');

// Every entry is bundled as a classic IIFE script: content scripts cannot be ES modules,
// and a single format keeps the service worker free of `"type": "module"` constraints.
const entryPoints = {
  'background/background': 'src/background/index.ts',
  'content/content': 'src/content/index.ts',
  'popup/popup': 'src/popup/index.js',
  'options/options': 'src/options/index.ts'
};

/** @type {esbuild.BuildOptions} */
const options = {
  absWorkingDir: root,
  entryPoints,
  outdir,
  bundle: true,
  format: 'iife',
  target: ['chrome110'],
  platform: 'browser',
  // Readable output for Chrome Web Store review; no remote code, no eval.
  minify: false,
  sourcemap: isDev ? 'inline' : false,
  legalComments: 'none',
  logLevel: 'warning',
  define: {
    __DEV__: JSON.stringify(isDev),
    // Offline master key for local testing; empty string in store builds.
    __DEV_MASTER_KEY__: JSON.stringify(isDev ? 'DEV-SPEEDUP-PRO-2026' : '')
  }
};

// Pro modules: separate ES modules, loaded on demand by the content script with
// import(chrome.runtime.getURL('pro/<name>.js')) so free users never parse them.
/** @type {esbuild.BuildOptions} */
const proOptions = {
  ...options,
  entryPoints: {
    'pro/skip-silence': 'src/pro/skip-silence.ts',
    'pro/youtube-ads': 'src/pro/youtube-ads.ts'
  },
  format: 'esm'
};

async function copyStatic() {
  await cp(path.join(root, 'public'), outdir, { recursive: true });
}

async function zipRelease() {
  const manifest = JSON.parse(await readFile(path.join(outdir, 'manifest.json'), 'utf8'));
  const releaseDir = path.join(root, 'release');
  await mkdir(releaseDir, { recursive: true });
  const zipPath = path.join(releaseDir, `SpeedUp_Video_Pro_v${manifest.version}.zip`);
  await rm(zipPath, { force: true });
  execFileSync('zip', ['-qr', '-X', zipPath, '.', '-x', '.DS_Store', '*/.DS_Store'], { cwd: outdir });
  const { size } = await stat(zipPath);
  console.log(`zip: ${path.relative(root, zipPath)} (${(size / 1024).toFixed(1)} KB)`);
}

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });
await copyStatic();

if (isWatch) {
  for (const o of [options, proOptions]) await (await esbuild.context(o)).watch();
  console.log('watching src/ … (public/ is copied once; restart after editing static files)');
} else {
  const results = await Promise.all([esbuild.build(options), esbuild.build(proOptions)]);
  const warnings = results.reduce((n, r) => n + r.warnings.length, 0);
  if (warnings) {
    console.error(`build finished with ${warnings} warning(s)`);
    process.exit(1);
  }
  console.log(`build ok (${isDev ? 'dev' : 'production'}) -> dist/`);
  if (isZip) await zipRelease();
}
