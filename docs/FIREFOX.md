# Firefox (MV3) — note di porting

Build: `npm run build -- --target=firefox` → `dist-firefox/` (zip: `npm run build -- --target=firefox --zip`).
La conversione del manifest è in `scripts/firefox.mjs`, coperta da unit test.

## Differenze applicate automaticamente

| Chrome | Firefox | Motivo |
|---|---|---|
| `background.service_worker` | `background.scripts` | Firefox MV3 usa event page, non service worker. Il codice del background non usa API solo-SW. |
| — | `browser_specific_settings.gecko.id = speedup-video-pro@x2-speedup`, `strict_min_version 128.0` | ID obbligatorio per AMO e per `storage.sync`. ⚠️ Scegli l'ID definitivo prima della prima pubblicazione: non si può cambiare dopo. |
| `content_scripts[].match_origin_as_fallback` | rimosso | Chiave solo Chrome (iframe `about:blank`/`srcdoc` restano coperti da `match_about_blank`). |

## API usate e stato su Firefox

| API | Stato | Note |
|---|---|---|
| namespace `chrome.*` | ✅ | Firefox lo espone in MV3 (promesse supportate). |
| `chrome.storage.local/sync/session` | ✅ | `session` da Firefox 115. `sync` richiede l'account Firefox e un gecko id stabile. |
| `chrome.alarms` | ✅ | |
| `chrome.action.setBadgeText` | ✅ | |
| `chrome.i18n` | ✅ | stessi `_locales`. |
| `import()` dinamico di `moz-extension://…/pro/*.js` da content script | ✅ (da verificare) | Supportato da Firefox 89; non usiamo `use_dynamic_url`. |
| Web Audio su elementi della pagina dal content script (skip silence) | ⚠️ da verificare | Gli Xray wrapper di Firefox possono rifiutare `createMediaElementSource` su un elemento della pagina: in quel caso il modulo segna il player "non disponibile" (nessun audio perso, perché l'errore arriva prima del collegamento). |
| `HTMLMediaElement.preservesPitch` | ✅ | Firefox 101+. |
| Fullscreen API | ✅ | |

## Da sapere prima di pubblicare su AMO

1. **Permessi host opzionali**: in Firefox MV3 i permessi host e i content script su `<all_urls>` sono concessi dall'utente (non automaticamente all'install). Finché l'utente non li concede, le scorciatoie non funzionano sui siti. Da aggiungere: un passo nell'onboarding con `chrome.permissions.request({ origins: ['<all_urls>'] })` — non implementato (non testabile qui).
2. **Link recensione**: punta a `addons.mozilla.org/firefox/addon/speedup-video-pro/` (slug ipotizzato, da allineare).
3. **Codice sorgente per la review AMO**: il build è leggibile (non minificato), ma AMO può chiedere i sorgenti + istruzioni (`npm ci && npm run build -- --target=firefox`).
4. ⚠️ **Non testato** su Firefox reale: Playwright non carica estensioni in Firefox. Checklist manuale in `docs/QA.md`.

## Edge

Stesso pacchetto della build Chrome (`dist/`). Il link "Valuta" usa Edge Add-ons quando lo user agent è Edge. ⚠️ Non testato su Edge reale.
