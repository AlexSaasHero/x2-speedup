# CLAUDE.md — SpeedUp Video Pro

Browser extension (Chrome/Edge MV3, Firefox build) that controls HTML5 video/audio speed. Full context: `docs/CLAUDE_PROJECT_CONTEXT.md`; status of every item: `docs/ROADMAP_IMPL.md`.

## Product
- **Positioning (decided 2026-11-13):** a study tool for recorded lectures — "Study your recorded lectures in half the time, on Panopto, Canvas, Moodle and Echo360". Then Udemy and Coursera.
- **Speed is a bonus, not the USP:** high speed is free (on generic sites we can't beat Video Speed Controller: free, 3M users).
- **Status:** Chrome Web Store has **v1.9.0** (approved 2026-11-16, same as `main`). Pro checkout open on the landing since 2026-11-16. ~350 installs, 6 active users. Priority: **activation and compatibility** on the target platforms, then monetization.

## Free vs Pro
- **Free:** 0.1x–16x on every site, basic shortcuts, basic time-saved counter.
- **Pro:** speed memory per site/platform (`rules`), skip silence, detailed time-saved stats, checkpoints with notes, frame-by-frame, A-B loop, customizable shortcuts.
- **License:** **yearly subscription** on Lemon Squeezy with a 7-day free trial, unlocked by license key: **$4.99/year** (decided 2026-11-14). Replaces the old $1.99 one-time (those keys stay Pro forever).

## Target platforms (priority)
1. Panopto (also embedded in iframes inside Canvas and Moodle)
2. Echo360
3. Canvas and Moodle (native players)
4. Udemy, Coursera
5. YouTube and any HTML5 `<video>`

None of 1–3 is tested yet (no fixtures, not in `docs/QA.md`); add quirks to `src/content/quirks.ts`.

## Stack
- TypeScript (strict; `src/popup/index.js` is the only JS file), bundled by **esbuild** via `scripts/build.mjs` — no Vite/webpack/WXT.
- Output: `dist/` (Chrome/Edge, load unpacked from here), `dist-firefox/`, `release/*.zip` (upload to the Store). All git-ignored.
- Tests: Vitest + happy-dom (unit), Playwright (e2e/live). CI: `.github/workflows/ci.yml`.
- Key files: `public/manifest.json` (manifest + version of record) · `scripts/build.mjs` (build/zip, `--dev`, `--target=firefox`) · `scripts/firefox.mjs` (manifest rewrite for Firefox) · `scripts/locales.mjs` (`src/_locales/*.json` → `_locales/*/messages.json`, fails on missing keys) · `public/{popup,options,onboarding}/` (HTML/CSS, JS comes from `src/`).
- No license backend: the extension verifies keys directly with Lemon Squeezy (`/api/validate-license` never existed). `landing-page/` is static HTML deployed to Vercel at **https://lecturespeed.vercel.app** (x2-speedup.vercel.app redirects there) — don't move or rename the folder.
- Local-only folders (git-ignored): `_archive/release/` (old Store zips, keep), `_to_delete/` (Alex reviews and deletes by hand).

## Rules
- MV3 only: no remote code, no `eval`, service worker keeps no state in memory (everything in `chrome.storage`).
- Minimal permissions; justify any new one in `docs/ROADMAP_IMPL.md` ("Permessi finali").
- Extension privacy: no tracking/analytics; the only network call is license verification.
- Do **not** change prices, sales copy or the license backend without asking Alex.
- Free/Pro limits only in `src/config/plans.ts`; gate features only with `isPro()` / `can()` from `src/shared/entitlement.ts`, in **both** the UI and the content script. License state lives in `chrome.storage`.
- Never lock out a paying user: license server unreachable → keep Pro within the grace window (`src/shared/license.ts`).
- University players live in iframes and swap videos without reloads: keep `all_frames`, dynamic media discovery (`media-registry.ts`) and the `ratechange` re-apply without loops (`rate-controller.ts`) working; cover new players with E2E fixtures.
- Before extending skip silence to Panopto/Echo360, verify Web Audio works on their cross-origin/HLS media (CORS).
- No hardcoded UI strings: add keys to **all** `src/_locales/*.json` (`{1}` placeholders); the build fails otherwise.
- Storage shape changes: bump `SCHEMA_VERSION` in `src/shared/storage.ts` and add a step in `src/shared/migrations.ts` + unit test.
- Log found bugs in `docs/BUGS.md`; fix them only if they block the current task.
- Atomic commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`); never push unless asked.
- Tasks touching more than 2 files: plan first (plan mode), then implement.
- **Never delete files:** move them to `_to_delete/` (same folder structure) and tell Alex.
- Reply to Alex in Italian, direct and technical. Alex is still learning git: explain a git command in 1–2 sentences before running it.

## Commands
```bash
npm run build:dev      # dist/ for local testing (dev master key enabled only here)
npm run check          # typecheck + unit tests + production build — must pass before committing
npm run test:e2e       # Playwright with the built extension (set PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS=1, already in the script)
npm run qa:live        # real YouTube checks, on demand only
npm run zip            # release/SpeedUp_Video_Pro_v<version>.zip
npm run build -- --target=firefox
```
Version of record: `public/manifest.json` (keep `package.json` in sync).

## Map
- `src/content/` content script — dormant until media appears; keep it light (it runs in every frame of every site). Pro-only code goes in `src/pro/` (lazy `import()`).
- `src/background/` service worker: migrations, license (daily alarm, 7-day grace), settings sync, stats.
- `src/shared/` pure, unit-tested logic. `src/popup/`, `src/options/`, `src/onboarding/`, `src/ui/` UI.
- `tests/unit` Vitest · `tests/e2e` Playwright + local fixtures (WAV media: Chromium has no H.264) · `tests/live` real sites.
- Site quirks (e.g. Netflix: no direct `currentTime` writes) in `src/content/quirks.ts`.
