# CLAUDE.md — SpeedUp Video Pro

Browser extension (Chrome/Edge MV3, Firefox build) that controls HTML5 video/audio speed. Freemium: Pro via Lemon Squeezy license (7-day trial, then $1.99 one-time). Full context: `docs/CLAUDE_PROJECT_CONTEXT.md`; status of every item: `docs/ROADMAP_IMPL.md`.

## Rules
- MV3 only: no remote code, no `eval`, service worker keeps no state in memory (everything in `chrome.storage`).
- Minimal permissions; justify any new one in `docs/ROADMAP_IMPL.md` ("Permessi finali").
- Extension privacy: no tracking/analytics; the only network call is license verification.
- Do **not** change prices, sales copy or the license backend without asking Alex.
- Free/Pro limits only in `src/config/plans.ts`; gate features only with `isPro()` / `can()` from `src/shared/entitlement.ts`.
- No hardcoded UI strings: add keys to **all** `src/_locales/*.json` (`{1}` placeholders); the build fails otherwise.
- Storage shape changes: bump `SCHEMA_VERSION` in `src/shared/storage.ts` and add a step in `src/shared/migrations.ts` + unit test.
- Log found bugs in `docs/BUGS.md`; fix them only if they block the current task.
- Atomic commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`); never push unless asked. Reply to Alex in Italian.

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
