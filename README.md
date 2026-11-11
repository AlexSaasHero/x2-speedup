# SpeedUp Video Pro

Browser extension (Chrome / Edge, Manifest V3; Firefox build available) that controls the playback speed of any HTML5 video or audio — with the keyboard, without leaving the page.

**100% local, zero tracking.** Settings, statistics and bookmarks stay in the browser. The only network call is license verification (sends the license key only).

## Features

| | Free | Pro (7-day free trial) |
|---|---|---|
| Speed | 0.1x – 4x, configurable step | up to 16x |
| Keyboard shortcuts (Video Speed Controller–compatible: S D R G Z X V), custom keys with modifiers, per-site disable | ✅ | ✅ |
| Draggable on-video overlay (also in fullscreen), per-site position | ✅ | ✅ |
| Speed kept across ads, quality changes, playlists, SPA navigation, replaced `<video>` elements; native player menus respected | ✅ | ✅ |
| Seek ±N seconds (live-stream safe) | ✅ | ✅ |
| Video, audio, open shadow DOM, iframes | ✅ | ✅ |
| Time saved this week | ✅ | + today / page / total |
| Frame-by-frame, bookmarks per video, A-B repeat | | ✅ |
| Skip silence (Web Audio) | | ✅ |
| Speed rules per YouTube channel, URL pattern or site | | ✅ |
| YouTube ads at 16x muted, then restore | | ✅ |
| Hold-to-speed (default Shift+F) | | ✅ |
| Settings sync, JSON export/import, import from Video Speed Controller | ✅ | ✅ |
| Languages: en, it, es, de, fr, pt-BR, ja | ✅ | ✅ |

Free/Pro limits live in one file: [`src/config/plans.ts`](src/config/plans.ts). Every check goes through `isPro()` / `can(feature)` in [`src/shared/entitlement.ts`](src/shared/entitlement.ts).

## Development

Requirements: Node 20+.

```bash
npm install
npm run build:dev      # dist/ with dev master key + sourcemaps → load dist/ as an unpacked extension
npm run watch          # rebuild src/ on change
npm run check          # typecheck + unit tests + production build
npm run test:e2e       # production build + Playwright (Chromium with the extension loaded)
npm run test:coverage  # unit tests with coverage report (coverage/)
npm run zip            # production build + release/SpeedUp_Video_Pro_v<version>.zip
npm run build -- --target=firefox   # Firefox build → dist-firefox/ (see docs/FIREFOX.md)
```

The version of record is `public/manifest.json`. Translations: edit `src/_locales/<lang>.json` (`{1}` placeholders); the build fails if a locale misses a key.

## Layout

```
src/
  config/plans.ts        Free/Pro limits and feature flags (single source)
  shared/                pure logic: entitlement, license, storage schema + migrations,
                         shortcuts, rules, stats, sync/import, i18n, URLs
  background/            service worker: migrations, license checks (alarms), settings sync, stats
  content/               content script (dormant until media appears): media registry,
                         rate controller, shortcuts, overlay (closed shadow DOM), messages
  pro/                   lazily loaded ES modules: skip-silence, youtube-ads, rules
  popup/ options/ onboarding/ ui/
  _locales/              translation sources
public/                  manifest, HTML, CSS, icons (copied to dist/)
tests/unit/              Vitest (pure logic)
tests/e2e/               Playwright with the built extension + local fixtures
docs/                    roadmap & status, bugs, QA checklist, store listing, Firefox notes
```

## Docs

- [docs/ROADMAP_IMPL.md](docs/ROADMAP_IMPL.md) — implementation plan, status of every item, final permissions with justifications
- [docs/QA.md](docs/QA.md) — manual checklist per site
- [docs/STORE_LISTING.md](docs/STORE_LISTING.md) — store copy (EN + IT) and privacy disclosures
- [docs/FIREFOX.md](docs/FIREFOX.md) — Firefox port notes
- [docs/BUGS.md](docs/BUGS.md) — known/fixed bugs
