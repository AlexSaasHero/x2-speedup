# SpeedUp Video Pro — Piano di implementazione (ROADMAP_IMPL)

> Stato: piano **approvato** (2026-11-11) con le 4 proposte di default: rimozione GA4, build step TS+esbuild, commit baseline, split Free/Pro come da §Decisioni.
> Baseline: commit `51cb7a3` (v1.5.1.8).
>
> | Fase | Stato |
> |---|---|
> | 0 — Fondamenta | ✅ |
> | 1 — Parità leader | ⏳ |
> | 2 — Pro | ⏳ |
> | 3 — Prodotto/crescita | ⏳ |
> | 4 — Qualità | ⏳ (smoke E2E già attivi da Fase 0) |

Legenda stato: ✅ fatto · ⚠️ parziale (+motivo) · ❌ non fatto (+motivo) · ⏳ da fare

---

## 0. Architettura attuale (as-is)

| Area | File | Note |
|---|---|---|
| Manifest | `manifest.json` | MV3, permessi `storage`, `activeTab`, `tabs`; `host_permissions: <all_urls>`; un content script su `<all_urls>`, `all_frames: true`, `document_start`. Nessuna pagina options, nessun `_locales`. |
| Service worker | `background/background.js` (87 righe) | `onInstalled` → apre `x2-speedup.vercel.app/#welcome` su install, inizializza default in `storage.local`; listener `UPDATE_BADGE`. Già stateless. |
| Content script | `content/content.js` (751) + `content/content.css` | IIFE vanilla JS. Discovery video (DOM + shadow DOM via scan di `*`), enforcement `playbackRate` con listener capture su `window`, HUD iniettato nel parent del video (classi globali, niente Shadow DOM), scorciatoie, message handler per il popup. Solo `<video>`, niente `<audio>`. |
| Popup | `popup/popup.html/.css/.js` (~2.800 righe) | ES module. 3 tab (Speed / Shortcuts / Precision), modal Pro, attivazione licenza, checkpoint per video. Testi misti IT/EN hardcoded. |
| Telemetria | `utils/analytics.js` | **GA4 Measurement Protocol** con `api_secret` in chiaro, eventi `popup_opened`, `speed_updated`, `cta_upgrade_clicked` (con dominio visitato). |
| Licenza | dentro `popup.js` + duplicata in `content.js` | Validazione: `POST x2-speedup.vercel.app/api/validate-license` → fallback Lemon Squeezy `/v1/licenses/validate` → fallback offline per formato. Stato salvato come flag booleani (`is_pro`, `isPro`, `isLicensed`, `license_key`, `licenseKey`). Nessuna rivalidazione periodica. |
| Landing | `landing-page/index.html`, `privacy.html` | **HTML statico + Tailwind CDN**, non Next.js. Checkout Lemon Squeezy (trial 7 gg, $0 oggi, $1.99 lifetime dopo). Il backend `/api/validate-license` **non è in questo repo**. |
| Build/test | — | **Nessuno**: niente `package.json`, bundler, TypeScript, test. Le release sono zip committati nella root (15 file). |

### Divergenze tra il prompt e il repo (ipotesi che adotto)
1. **"Landing Next.js"**: è HTML statico. Non la tocco salvo `docs/STORE_LISTING.md` (Fase 4).
2. **`src/config/plans.ts`**: serve un build step. Propongo di introdurlo (Fase 0, sotto).
3. **Trial**: la trial è gestita da Lemon Squeezy (chiave emessa al checkout, addebito dopo 7 gg). L'estensione non ha trial locale. Mantengo questo modello: "attiva trial" = CTA verso il checkout esistente + incolla chiave. Lo stato "trial scaduta / key revocata" arriva dalla rivalidazione periodica (Fase 3).
4. **Free/Pro oggi**: scorciatoie personalizzate, seek ±5s, frame-step e checkpoint sono Pro. La Fase 1 del prompt rende **free** scorciatoie personalizzabili e seek ±N (parità con VSC). Frame-step e checkpoint/segnalibri restano Pro. Il range free diventa 0.1x–4x (oggi 0.25x–2x).

---

## Fase 0 — Fondamenta (prerequisito, proposta)

Senza questa fase le regole "config unico", "isPro() unico", "test verdi", "lazy-load moduli Pro" non sono realizzabili in modo pulito.

| # | Cosa | Stato |
|---|---|---|
| 0.1 | Commit baseline v1.5.1.8; zip di release spostati in `release/` (ignorata da git; restano nella storia). | ✅ |
| 0.2 | Toolchain: `package.json`, TypeScript, esbuild (`scripts/build.mjs`), script `build`, `build:dev`, `watch`, `zip`, `typecheck`, `test`, `test:e2e`, `check`. Output IIFE leggibile (non minificato) in `dist/`. | ✅ |
| 0.3 | Layout `src/` (codice) + `public/` (manifest, HTML, CSS, icone, copiati in `dist/`). | ⚠️ parziale: `src/content/index.js` e `src/popup/index.js` sono ancora JS monolitici (spostati 1:1 e ricollegati ai moduli condivisi). Lo split in moduli TS del content script avviene in Fase 1, dove viene comunque riscritto; il popup viene diviso man mano che le Fasi 1–3 lo toccano. |
| 0.4 | `src/config/plans.ts`: limiti e feature per piano, `clampSpeed`, `formatSpeed`. Valori **invariati** rispetto alla baseline (free 0.25–2x): il passaggio a 4x è il primo commit di Fase 1. | ✅ |
| 0.5 | `src/shared/entitlement.ts`: `isPro()` / `can(feature)` unici, usati da content e popup. Comportamento baseline preservato (BUGS #1, fix in Fase 3). | ✅ |
| 0.6 | `src/shared/storage.ts` (schema v1, default) + `src/shared/migrations.ts` (pura, idempotente) eseguita dal SW su install/update; rimuove `is_pro`, `license_key`, `isLicensed`, `preservePitch`, `telemetry_client_id` (anche da `storage.sync`). Migrazione hotkey rinviata alla Fase 1 (quando cambiano i default). | ✅ |
| 0.7 | GA4 rimosso (`utils/analytics.js` + 7 chiamate); `telemetry_client_id` non più inviato al validate endpoint. Master key DEV iniettata solo nei build `--dev` (verificato: assente da `dist/` in produzione). | ✅ |
| 0.8 | Vitest (16 test: plans, entitlement, migrazioni) + Playwright smoke (3 test: migrazione all'install, velocità applicata/clampata dal content script, popup senza errori e senza richieste di rete). | ✅ |

### Struttura proposta
```
src/
  config/plans.ts            limiti e feature per piano
  shared/                    storage, entitlement, messages (tipi), url-normalize, shortcuts-parse, i18n helper
  background/index.ts        SW: install/update, badge, license refresh (chrome.alarms), migrations
  content/
    index.ts                 bootstrap leggero
    media-registry.ts        discovery video/audio, shadow DOM, MutationObserver incrementale
    rate-controller.ts       enforcement playbackRate con guard + rispetto cambi utente
    shortcuts.ts             keydown/keyup, filtro editabili, blacklist dominio
    overlay/                 overlay in Shadow DOM, drag, fullscreen
    spa.ts                   yt-navigate-finish, History API
  pro/                       moduli caricati on-demand (dynamic import)
    skip-silence.ts  ads-youtube.ts  hold-to-speed.ts  ab-repeat.ts  rules.ts  stats.ts
  popup/  options/  onboarding/
_locales/<lang>/messages.json
tests/unit/**  tests/e2e/**  tests/fixtures/*.html
```

---

## Fase 1 — Parità con i leader (free)

| # | Feature | File | Note tecniche |
|---|---|---|---|
| 1.1 | Range 0.1–16x, step configurabile (default 0.1), input numerico | `plans.ts`, `rate-controller.ts`, popup, options | Free 0.1–4x, Pro 0.1–16x. Clamp unico in `plans.ts`. Slider free con max 4, preset 3x/4x non più Pro. |
| 1.2 | Scorciatoie VSC-compatibili (`S` `D` `R` `Z` `X` `V`) + modificatori, personalizzabili | `shortcuts.ts`, `shared/shortcuts-parse.ts`, options | Binding = `{key, code, shift, alt, ctrl, meta}`; match su `e.code` per layout non-US. Filtro editabili: `composedPath()` per attraversare shadow DOM, `isContentEditable`, `role="textbox"`, iframe di Google Docs (`.docs-texteventtarget-iframe`), Monaco/CodeMirror (`.monaco-editor`, `.cm-editor`), Notion. Blacklist per dominio (default vuota) + toggle "disattiva su questo sito" nel popup. Rimuovo i tasti hardcoded `d`/`s`/`]`/`[` che oggi scattano anche se l'utente li ha rimappati. Migrazione: utenti esistenti con `]`/`[`/`g` personalizzati mantengono i loro tasti. |
| 1.3 | Overlay velocità | `overlay/*` | Host element con `attachShadow({mode:'closed'})`, CSS dentro lo shadow root (niente più `content.css` globale). Agganciato a `document.fullscreenElement` quando presente (`fullscreenchange`), altrimenti posizionato con `getBoundingClientRect` del video in un container `position:fixed` (non modifico più `position` del parent del sito — oggi lo faccio ed è invasivo). Host `pointer-events:none`, solo il badge `auto`. Drag con Pointer Events, posizione relativa (%) salvata per dominio. Auto-hide 2s. `V` mostra/nasconde. |
| 1.4 | Persistenza velocità | `rate-controller.ts`, `spa.ts` | Listener `ratechange`, `loadedmetadata`, `play`, `emptied`, `loadstart`. Guard: flag `applying` + contatore per finestra (max N re-apply/secondo → poi stop e log debug) contro loop. **Cambi utente via controlli nativi**: se un `ratechange` avviene entro ~500ms da un `pointerdown`/`keydown` sul player (e non è nostro), lo accetto come nuova velocità target invece di sovrascriverlo. Oggi faccio `stopImmediatePropagation` sempre → i menu velocità di YouTube/Vimeo sono rotti. SPA: `yt-navigate-finish` + Navigation API (`navigatesuccess`, Chrome 102+) dove disponibile, fallback `popstate` + osservazione del `<title>` (niente polling, niente patch di `history.pushState` nel MAIN world). |
| 1.5 | Rilevamento media robusto | `media-registry.ts` | `<video>` + `<audio>`. MutationObserver che esamina **solo i nodi aggiunti** (oggi a ogni mutazione faccio `querySelectorAll('*')` su tutto il documento: costo enorme su YouTube). Shadow root aperti: scan dei nodi aggiunti + listener capture `play`/`loadedmetadata` su `window` (gli eventi media non bubblano ma la capture li vede anche da shadow DOM aperti — già usato oggi). Iframe same-origin: già coperti da `all_frames`; aggiungo `match_about_blank`/`match_origin_as_fallback`. Target: media in riproduzione → sotto il mouse → più grande visibile. Opzione "applica a tutti". |
| 1.6 | Seek ±N (default 10s) | `rate-controller.ts`, options | Clamp `[0, duration]`; se `duration === Infinity` (live) clamp a `seekable.end(last)`. |

Permessi Fase 1: nessuno nuovo. Rimuovo `tabs` (vedi §Permessi).

---

## Fase 2 — Funzioni Pro

Gating: `can('skipSilence')` ecc. da `entitlement.ts`. UI: controllo visibile con lucchetto → click apre il modal esistente con CTA trial. Mai eccezioni.
Moduli in `src/pro/` caricati con `import(chrome.runtime.getURL(...))` solo se Pro **e** feature attiva → richiede `web_accessible_resources` con `use_dynamic_url: true` (limita il fingerprinting).

| # | Feature | Note / rischi |
|---|---|---|
| 2.1 | **Skip silence** | `AudioContext` + `MediaElementAudioSourceNode` → `AnalyserNode` → `destination`. Cache sorgenti in `WeakMap`. Campionamento RMS con `setInterval` a ~50ms **solo mentre il media è in play** (rAF si ferma in tab nascosta). Isteresi + margini pre/post. **Rischio critico CORS**: su media cross-origin senza CORS, `createMediaElementSource` produce zeri **e silenzia l'audio** reale, irreversibilmente per quell'elemento. Mitigazione: prima di agganciare verifico `currentSrc` (`blob:`/same-origin/`crossOrigin` impostato → ok, altrimenti non aggancio e mostro "Non disponibile su questo player"). In più, se dopo 3s di play l'RMS è esattamente 0 → disattivo e avviso. Una volta creata la sorgente non si può staccare: la feature spenta lascia il grafo in passthrough (nessun degrado). `AudioContext` creato al primo gesto utente / `resume()` su `play`. |
| 2.2 | Regole velocità (canale > URL glob > dominio > default) | `pro/rules.ts` + `shared/rules-resolve.ts` (puro, testabile). Canale YouTube: `ytInitialPlayerResponse` non è leggibile dall'isolated world → uso `link[itemprop="name"]` dentro `[itemprop="author"]`, `ytd-channel-name a`, `meta[itemprop="channelId"]`, con fallback a nessuna regola canale. Bottone "crea regola da questa pagina" nel popup. Migra gli attuali `domainSpeeds`. |
| 2.3 | Ads YouTube 16x + mute | Observer sugli attributi `class` di `#movie_player` (`.ad-showing`, `.ad-interrupting`). Salvo velocità/volume/muted, ripristino alla fine. Se `#movie_player` non esiste o la struttura cambia → no-op + log debug. ⚠️ Policy: il Chrome Web Store non vieta questa funzione, ma YouTube può rilevarla; la tengo opt-in, default OFF. |
| 2.4 | Hold-to-speed | `keydown` (ignora `e.repeat`) / `keyup`, ripristino anche su `blur`, `visibilitychange`, `pagehide`. Default `Shift+F` configurabile. |
| 2.5 | Statistiche tempo risparmiato | Accumulo in memoria nel content script `Δcontenuto − Δreale` da `timeupdate`; flush max 1/30s + su `pagehide` → messaggio al SW che aggrega per giorno in `storage.local` (`stats:YYYY-MM-DD`, ultimi 400 giorni). Sessione = tab corrente. Popup: "Questa settimana hai risparmiato 3h 12m". Visibile anche in free (è il miglior argomento di upsell); dettaglio storico Pro — ⚠️ da confermare. |
| 2.6 | A-B repeat + segnalibri | Riusa i checkpoint esistenti; chiave = URL normalizzato (rimuove `t`, `utm_*`, `fbclid`, `gclid`, `si`, `feature`, hash; YouTube → `youtube.com/watch?v=ID`). A-B: loop su `timeupdate` + scorciatoie. |

Permessi Fase 2: nessuno nuovo (Web Audio non richiede permessi).

---

## Fase 3 — Prodotto e crescita

| # | Feature | Note |
|---|---|---|
| 3.1 | Licenza | Spostata nel SW. Stato `{key, status: active|trial|expired|revoked|invalid, lastCheckedAt, lastValidAt}`. Rivalidazione con `chrome.alarms` max 1/giorno. Server irraggiungibile → resta valida per **grace period 7 giorni** da `lastValidAt`. Rimuovo: fallback offline per formato (`PRO-*`, `TRIAL-*`, UUID accettati senza rete), "qualsiasi chiave > 3 caratteri = Pro", master key DEV nel bundle di produzione (resta solo nel build `dev`). **"Cache firmata"**: senza una firma del server (es. JWT/Ed25519 restituito da `/api/validate-license`) la cache resta falsificabile da chi modifica lo storage; lo annoto e non tocco il backend (regola 6). Troppi dispositivi: Lemon Squeezy supporta `activation_limit` via `/v1/licenses/activate` + `instance_id`; il backend attuale non è in questo repo → ⚠️ da verificare con te. Aggiunge permesso `alarms`. |
| 3.2 | Onboarding / changelog | Pagina locale `onboarding.html` (demo scorciatoie su video locale + CTA trial) su `install`. Su `update` apro changelog solo se cambia major/minor. Sostituisce l'apertura della landing esterna. |
| 3.3 | Sync + import/export | Impostazioni in `storage.sync` (regole in chunk ≤ 7KB, indice + checksum; fallback a local se quota superata). Stats, licenza e segnalibri restano in `local`. Export/import JSON con `schemaVersion` + validazione manuale (niente lib pesanti). Import da VSC: mappa `speeds`, `keyBindings`, `blacklist`. |
| 3.4 | i18n | `_locales/{en,it,es,de,fr,pt_BR,ja}`; `default_locale: en`; `data-i18n` nell'HTML. Traduzioni non-en/it generate da me: ⚠️ da far rileggere a un madrelingua. |
| 3.5 | Richiesta recensione | Dopo 30 min risparmiati totali, una volta; "non ora" = +14 giorni. Banner nel popup (non notifiche → niente permesso `notifications`). |
| 3.6 | Edge / Firefox | Edge: stesso build. Firefox: target `dist-firefox/` con `browser_specific_settings.gecko.id`, `background.scripts` (Firefox MV3 non supporta `service_worker`), niente `use_dynamic_url`. Annoto API non supportate in `docs/FIREFOX.md`. |

---

## Fase 4 — Qualità

| # | Cosa | Note |
|---|---|---|
| 4.1 | Vitest | gating free/Pro, risoluzione regole, parsing scorciatoie, tempo risparmiato, licenza/grace, normalizzazione URL, migrazioni storage. |
| 4.2 | Playwright | Chromium con `--load-extension=dist` (persistent context), fixture locali: video base, shadow DOM, iframe same-origin, sostituzione `<video>`, fullscreen, input/contenteditable focus, ratechange forzato dal "player". |
| 4.3 | `docs/QA.md` | Checklist YouTube, Netflix, Prime Video, Udemy, Coursera, Twitch, Vimeo, Spotify web. |
| 4.4 | Performance | Nessun polling continuo (skip-silence campiona solo in play), observer incrementali, moduli Pro lazy, content script base target < 25KB minificato. |
| 4.5 | `README.md`, `docs/STORE_LISTING.md` (EN+IT) | Aggiorno anche `CHROMEWEBSTORE.md` (oggi dichiara `scripting` che non è nel manifest e prezzi $3.99 non allineati alla landing $1.99). |

---

## Permessi finali previsti

| Permesso | Giustificazione |
|---|---|
| `storage` | Impostazioni, regole, statistiche, stato licenza — tutto locale/sync. |
| `activeTab` | Il popup legge URL/titolo della scheda attiva (regola "da questa pagina", segnalibri). Sufficiente: rende `tabs` superfluo. |
| `alarms` (nuovo, Fase 3) | Rivalidazione licenza 1/giorno senza tenere vivo il service worker. |
| `content_scripts.matches: <all_urls>`, `all_frames` | Scorciatoie, overlay e persistenza velocità devono funzionare su qualsiasi sito con video **senza** che l'utente apra il popup; `activeTab`+`scripting` coprirebbe solo l'iniezione on-click e romperebbe scorciatoie e persistenza. È il modello di VSC e Global Speed. |
| `host_permissions` | Ristretto da `<all_urls>` a `https://x2-speedup.vercel.app/*` e `https://api.lemonsqueezy.com/*` (solo verifica licenza dal SW). |
| ~~`tabs`~~ | **Rimosso**: `activeTab` dà già l'URL della scheda attiva al popup; il badge usa `sender.tab.id`. |
| ~~`scripting`~~ | Non necessario (non presente nemmeno oggi, ma dichiarato in `CHROMEWEBSTORE.md`). |

---

## Rischi principali

1. **Skip silence + CORS** può ammutolire l'audio di un sito se agganciato male (vedi 2.1). È la feature più rischiosa: la proteggo con check preventivo + E2E dedicato.
2. **Gestione `ratechange`**: cambiare la logica di enforcement può far regredire YouTube >2x. Copertura E2E con fixture che simula un player che resetta la velocità.
3. **Licenza oggi aggirabile** (vedi BUGS.md #1–#3): chiunque digiti 4 caratteri ha Pro. Correggerlo in Fase 3 cambia l'esperienza di chi oggi ha una chiave "per formato": utenti con chiavi valide su Lemon Squeezy non sono impattati.
4. **Default scorciatoie**: passare da `]`/`[` a `S`/`D` cambia abitudini degli utenti esistenti → migrazione che preserva i tasti personalizzati; per chi aveva i default mostro una nota nel changelog.
5. **Ads YouTube**: YouTube cambia spesso il DOM e combatte gli strumenti anti-ads; fallback no-op, opt-in.
6. **Introduzione build step**: cambia il flusso di rilascio (zip da `dist/`). Script `npm run zip` per mantenere la stessa comodità.
7. **Quota `storage.sync`** con molte regole: chunking + fallback a local.

---

## Decisioni (risolte 2026-11-11: approvate tutte le proposte)

1. **Telemetria GA4** in `utils/analytics.js` (invia dominio visitato + `api_secret` in chiaro) contraddice "nessun tracking, nessuna chiamata di rete tranne la licenza". Proposta: **rimuoverla** (e smettere di inviare `telemetry_client_id` al validate endpoint).
2. **Build step** TypeScript + esbuild + Vitest + Playwright (dipendenze npm, `dist/` come output). Proposta: **sì**.
3. **Modifiche non committate** v1.5.1.8: le committo come baseline prima di iniziare? Proposta: **sì**, e sposto gli zip di release in `release/` ignorata da git.
4. **Free vs Pro**: confermi che scorciatoie personalizzate e seek ±N diventano free (come da Fase 1), mentre frame-step, checkpoint/segnalibri, A-B, regole, skip-silence, ads, hold-to-speed, statistiche storiche restano Pro?

---

## Sviluppo

```bash
npm install
npm run build:dev      # dist/ con master key DEV, sourcemap inline → carica dist/ come estensione non pacchettizzata
npm run watch          # rebuild continuo di src/ (public/ copiato solo all'avvio)
npm run check          # typecheck + unit test + build di produzione
npm run test:e2e       # build + Playwright (Chromium con l'estensione caricata)
npm run zip            # build di produzione + release/SpeedUp_Video_Pro_v<versione>.zip
```
La versione di riferimento è in `public/manifest.json`.
