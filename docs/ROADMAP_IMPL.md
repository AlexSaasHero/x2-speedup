# SpeedUp Video Pro — Piano di implementazione (ROADMAP_IMPL)

> Stato: piano **approvato** (2026-11-11) con le 4 proposte di default: rimozione GA4, build step TS+esbuild, commit baseline, split Free/Pro come da §Decisioni.
> Baseline: commit `51cb7a3` (v1.5.1.8).
>
> | Fase | Stato |
> |---|---|
> | 0 — Fondamenta | ✅ |
> | 1 — Parità leader | ✅ (v1.6.0) |
> | 2 — Pro | ✅ (v1.7.0) |
> | 3 — Prodotto/crescita | ✅ (v1.8.0) |
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
| 0.3 | Layout `src/` (codice) + `public/` (manifest, HTML, CSS, icone, copiati in `dist/`). | ✅ content script riscritto in moduli TS in Fase 1. ⚠️ `src/popup/index.js` resta JS (ricollegato ai moduli condivisi): viene diviso man mano che le Fasi 2–3 lo toccano. |
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

## Fase 1 — Parità con i leader (free) — ✅ v1.6.0

Content script riscritto in `src/content/`: `index.ts` (bootstrap), `media-registry.ts`, `rate-controller.ts`, `shortcuts.ts`, `editable.ts`, `overlay.ts`, `messages.ts`, `spa.ts`, `settings.ts`, `pointer.ts`. Logica pura in `src/shared/` (`shortcuts.ts`, `media-math.ts`, `hosts.ts`), editor scorciatoie condiviso in `src/ui/shortcut-editor.ts`, nuova pagina `options/`. Schema storage **v2**.

| # | Feature | Stato | Note |
|---|---|---|---|
| 1.1 | Range 0.1–16x, step configurabile, input numerico | ✅ | Free 0.1–4x, Pro 0.1–16x (`plans.ts`). Step default 0.1 (opzioni), usato da scorciatoie e bottoni fini del popup. Preset 3x/4x ora free. Oltre 4x in free l'overlay mostra "Free max 4.0x · Pro 16x". |
| 1.2 | Scorciatoie VSC + modificatori + blacklist | ✅ | Default `S` `D` `R` `G` `Z` `X` `V`; più tasti per azione; Shift/Alt/Ctrl/⌘; fallback su `e.code` per Alt su macOS e layout non latini. Ignorate in input/textarea/select/contenteditable/`role=textbox`, shadow DOM aperti, Monaco/CodeMirror/Ace/ProseMirror/Slate/Quill/Notion/Google Docs, `designMode`. Solo i tasti gestiti vengono bloccati. Blacklist per dominio (popup: "Disable shortcuts on <sito>"; opzioni: lista). Migrazione: chi aveva `]`/`[` li mantiene in aggiunta ai nuovi default; un tasto personalizzato vince sul nuovo default in conflitto. Scorciatoie ora **free** (prima Pro). |
| 1.3 | Overlay | ✅ | Shadow DOM chiuso, host `position:fixed` con `pointer-events:none` (solo la pillola è cliccabile), z-index massimo, non modifica più il DOM/CSS del player. Trascinabile, posizione salvata per dominio (frazioni del video), auto-hide configurabile (default 2s), compare al passaggio del mouse sul video, si sposta dentro `document.fullscreenElement`. `V` lo nasconde per la sessione. ⚠️ Se il sito mette in fullscreen il `<video>` stesso (non il contenitore) l'overlay non può comparire sopra: limite del top layer del browser. |
| 1.4 | Persistenza velocità | ✅ | Riapplica su `loadstart`, `loadedmetadata`, `play`, `emptied` e su `ratechange` non nostri. Anti-loop: `ReapplyBudget` (max 8 riapplicazioni/s, poi pausa di 3s). Cambi dal **menu nativo** del player accettati se preceduti (≤1s) da un gesto dentro il player e non subito dopo un caricamento. SPA: `yt-navigate-finish`, Navigation API, `popstate`, `pageshow`. La velocità non si propaga più live alle altre schede (BUGS #9); "Remember speed" la usa per le pagine nuove. |
| 1.5 | Rilevamento media | ✅ | `<video>` e `<audio>`, shadow root aperti (anche aggiunti dopo), iframe (`all_frames`, `match_about_blank`, `match_origin_as_fallback`). Observer incrementale (solo nodi aggiunti). Target: sotto il mouse → in riproduzione → video più grande; opzione "Apply to all". Solo i frame con media rispondono al popup (BUGS #12). ⚠️ Non rilevabili: shadow root chiusi e `new Audio()` mai inseriti nel DOM (richiederebbe uno script nel MAIN world). |
| 1.6 | Seek ±N | ✅ | Default 10s (opzioni), clamp a `[0, duration]`; live (`duration = Infinity`) clamp alla finestra `seekable`. Free (prima Pro). |

Permessi: rimosso `tabs`; `host_permissions` ristretto ai 2 domini della licenza; `content.css` globale rimosso. Aggiunto `options_ui` (non è un permesso).

Test: 39 unit (Vitest) + 22 E2E (Playwright, Chromium con l'estensione caricata). Gli E2E usano un WAV generato in memoria perché Chromium open-source non decodifica H.264.

⚠️ Non verificato automaticamente su siti reali (YouTube, Netflix, …): checklist manuale in `docs/QA.md`.

## Fase 2 — Funzioni Pro — ✅ v1.7.0

Gating unico: `can(feature)` (`shared/entitlement.ts`) sulle feature di `config/plans.ts` (`skipSilence`, `rules`, `youtubeAds`, `holdToSpeed`, `abRepeat`, `statsDetails`). In free ogni controllo resta visibile con 🔒: nel popup apre il modal trial, sul video mostra "🔒 … · Pro". Nessun errore. Moduli pesanti caricati solo se Pro **e** attivi: `dist/pro/skip-silence.js`, `dist/pro/youtube-ads.js` (ES module separati, `import(chrome.runtime.getURL(…))`). Schema storage **v3**.

| # | Feature | Stato | Note |
|---|---|---|---|
| 2.1 | Skip silence | ✅ | `MediaElementAudioSourceNode` → `AnalyserNode` (+ collegamento diretto agli altoparlanti, audio invariato). RMS ogni 50 ms **solo mentre il media è in play**. Impostazioni: soglia (dB), attesa prima di accelerare (margine prima), velocità silenzio, tempo minimo a velocità normale dopo il suono (margine dopo). Sorgenti in cache `WeakMap`. Media cross-origin senza CORS: rifiutati **prima** di collegarli (messaggio sul video e nel popup); fallback se arrivano comunque campioni a zero per 5 s. `AudioContext` collegato solo quando è `running`, altrimenti riprova al play successivo (mai audio muto). Media mutati = mai accelerati. ⚠️ Modalità "salta" non implementata: in tempo reale non si conosce la durata del silenzio, solo accelerazione. ⚠️ Una volta collegato, l'elemento resta nel grafo Web Audio fino al reload della pagina (limite dell'API): se l'estensione viene aggiornata/disattivata mentre la pagina è aperta, quell'elemento può restare muto finché non si ricarica. |
| 2.2 | Regole velocità | ✅ | Canale > URL (glob `*`, confrontato senza protocollo/www/parametri di tracking) > sito (vince il più specifico) > default. Canale YouTube da: link proprietario (più layout), URL dei canali, microdata solo se descrive il video corrente; altrimenti nessuna regola canale. Rivalutazione dopo navigazione SPA (0/0.6/1.5/3.5 s, niente polling). Una regola applicata non sovrascrive la velocità "ricordata". Popup (tab Smart): "Always play at X for: Channel / This video / This site" + rimuovi regola attiva. Opzioni: tabella con modifica/eliminazione/aggiunta. `domainSpeeds` migrato in regole sito. |
| 2.3 | Pubblicità YouTube 16x + mute | ✅ | Observer sulle classi del player (`ad-showing`, `ad-interrupting`), ripristino di velocità e mute a fine ad. Solo su host YouTube, opt-in (default off). Nessun player trovato → nessuna azione (log in dev). ⚠️ Testato con unit test sulla rilevazione; il flusso completo va verificato a mano su YouTube (`docs/QA.md`): non è riproducibile in E2E perché il dominio è HSTS-preloaded. |
| 2.4 | Hold-to-speed | ✅ | Default `Shift+F`, velocità configurabile (2.5x). Rilascio con il tasto principale (anche se Shift viene rilasciato prima), `blur`, `visibilitychange`, `pagehide`. Implementato come override temporaneo: la velocità dell'utente non cambia. |
| 2.5 | Tempo risparmiato | ✅ | `(Δ contenuto − Δ reale)` solo durante riproduzione continua (seek/pause esclusi). Content → worker ogni 5 s mentre si guarda; il worker tiene un buffer in `storage.session` e scrive gli **aggregati giornalieri** in `storage.local` al massimo ogni 30 s (scritture serializzate). Popup: "This week you saved …" per tutti; oggi/pagina/totale con Pro (`statsDetails`). Settimana da lunedì. Conservazione 400 giorni. ⚠️ Fino a 5 s per scheda possono andare persi chiudendo la scheda, e fino a 30 s chiudendo il browser. |
| 2.6 | A-B repeat + segnalibri | ✅ | A-B: scorciatoia `Shift+A` (A → B → off) e bottoni nel tab Precision; si azzera se cambia il video nell'elemento. Segnalibri (ex checkpoint): chiave `normalizeMediaUrl` (YouTube watch/shorts/youtu.be → id video; via `t`, `utm_*`, `fbclid`, `si`, …); chiavi esistenti migrate e unite. |

Altre modifiche: `RateController` ora supporta override temporanei con priorità (ads > hold > silence) che non toccano la velocità dell'utente e compaiono nell'overlay (`· ad`, `· hold`, `⏩`). Nuove azioni scorciatoia `hold` e `abRepeat` aggiunte agli elenchi esistenti se il tasto è libero.

Permessi: nessuno nuovo. `web_accessible_resources` espone solo `pro/*.js` (necessario per l'import dinamico dal content script). ⚠️ `use_dynamic_url` non è utilizzabile: l'URL dinamico non rientra in `'self'` della CSP e l'import fallisce. Ogni sito può quindi sapere che l'estensione è installata (fingerprinting): rischio basso, annotato.

Test: 69 unit + 34 E2E (skip silence verificato con audio reale tono/silenzio, rifiuto cross-origin, modulo Pro mai caricato in free, hold, regole, A-B, statistiche, gating).

⚠️ Dimensione: `content.js` 65 KB non minificato (target Fase 4: < 25 KB minificato).

## Fase 3 — Prodotto e crescita — ✅ v1.8.0

| # | Feature | Stato | Note |
|---|---|---|---|
| 3.1 | Licenza | ✅ / ⚠️ | Tutta la validazione è nel service worker (`src/background/license.ts`, logica pura in `src/shared/license.ts`). Stato `license = {key, status, lastCheckedAt, lastValidAt, source, expiresAt}`. Controllo **max 1 volta al giorno** (`chrome.alarms` orario + `needsCheck`), più all'avvio e all'attivazione. **Grace**: Pro resta attivo fino a 1 giorno (intervallo) + 7 giorni dall'ultima conferma del server. **Nessun blocco se il server non risponde**: errori di rete, timeout, 5xx, 404, 429 non cambiano lo stato. Stati gestiti: trial/licenza scaduta (`expired`), chiave disattivata/rimborsata (`revoked`), chiave inesistente (`invalid`), troppi dispositivi (`limit`), ognuno con messaggio nel popup e chiave rimovibile. Fonti: endpoint X2 (primario) + Lemon Squeezy `/v1/licenses/validate` (seconda opinione), valido se uno dei due conferma. **Rimossi** (BUGS #1, #2): "qualsiasi chiave > 3 caratteri = Pro" e accettazione offline per formato (`PRO-*`, `TRIAL-*`, UUID). Gli utenti con chiave salvata vengono migrati come "da riverificare" e controllati subito: chi aveva una chiave vera resta Pro, chi l'aveva solo "per formato" torna Free. Solo le pagine dell'estensione possono attivare/rimuovere una licenza (controllo del mittente). ⚠️ **Cache non firmata crittograficamente**: il server non restituisce una firma da verificare, quindi chi modifica lo storage locale a mano può falsificare lo stato (vale per ogni estensione senza firma lato server). Per chiuderlo serve che `/api/validate-license` restituisca un token firmato (es. Ed25519) → backend, da decidere con te. ⚠️ **Troppi dispositivi**: l'estensione non chiama `/v1/licenses/activate` di Lemon Squeezy (non registra istanze), quindi il limite dispositivi si rileva solo se un server lo segnala (`activation_usage > activation_limit` o stato `limit`). Attivarlo cambierebbe il modello commerciale (quanti browser per chiave): decisione tua. ⚠️ Lo schema esatto delle risposte di `/api/validate-license` non è nel repo: interpretate le forme già accettate (`status: valid`, `valid: true`, `is_valid: true`) più parole di stato comuni. |
| 3.2 | Onboarding e changelog | ✅ | Pagina locale `onboarding/onboarding.html` su `install`: come fissare l'icona, **demo interattiva delle scorciatoie** (audio generato in pagina, nessun file media incluso, usa i tasti reali dell'utente), CTA trial esistente + campo chiave di licenza, novità. Su `update` apre `#whats-new` in background **solo** se cambia major/minor (`isFeatureUpdate`). Sostituisce l'apertura della landing esterna all'install. |
| 3.3 | Sync, import/export, import VSC | ✅ | Impostazioni (`SYNC_KEYS`: step, seek, scorciatoie, blacklist, regole, skip silence, hold, ads, overlay, pitch, loop…) replicate in `chrome.storage.sync` dal service worker: JSON stabile diviso in chunk da 6000 caratteri (`cfg_0…n` + `cfg_meta` con hash FNV, versione, device, data), sotto gli 8 KB per item; oltre ~90 KB totali la sync si mette in pausa e lo dice nelle opzioni. Prima esecuzione su un nuovo dispositivo: **adotta** le impostazioni esistenti invece di sovrascriverle con i default. Niente loop di eco (hash + device id). Licenza, statistiche, segnalibri, posizioni overlay, `deviceId` restano locali. Toggle nelle opzioni. Export/import JSON (`format`, `version`, `settings`) con validazione tramite la migrazione dello schema (limiti, chiavi ignote scartate, versioni più nuove rifiutate). Import da **Video Speed Controller**: incollando il JSON delle sue impostazioni (`keyBindings` con keyCode, `blacklist`, `rememberSpeed`, `startHidden`) → scorciatoie, step, secondi di seek, velocità preferita, blacklist; azioni senza equivalente (`mark`, `jump`, `louder`, `softer`, `pause`, `muted`) e righe regex della blacklist vengono elencate come "non importate". |
| 3.4 | i18n | ✅ / ⚠️ | `_locales` en (default), it, es, de, fr, pt_BR, ja; nome e descrizione del manifest localizzati. Sorgenti leggibili in `src/_locales/<lang>.json` con `{1}` come segnaposto, compilati in `messages.json` dal build (che fallisce se una lingua ha chiavi mancanti/in più o segnaposto diversi). Popup, opzioni, onboarding, overlay sul video, editor scorciatoie e moduli Pro usano solo chiavi (`data-i18n*` nell'HTML, `t()` nel codice). Testi di vendita in inglese invariati; le altre lingue li traducono. ⚠️ Traduzioni scritte da me: da far rileggere a madrelingua (soprattutto ja, de, pt_BR) prima dello store. ⚠️ Il test E2E della lingua italiana gira solo su Linux/Windows: su macOS Chromium prende la lingua dal sistema. |
| 3.5 | Richiesta recensione | ✅ | Banner nel popup quando il tempo risparmiato totale (incluso il buffer non ancora scritto) arriva a 30 min; "Valuta" apre la pagina recensioni dello store giusto (Chrome Web Store / Edge Add-ons / AMO) e non lo chiede più; "Non ora" lo rimanda di 14 giorni. Nessun permesso `notifications`. |
| 3.6 | Edge / Firefox | ✅ / ⚠️ | Edge: stesso pacchetto Chrome (MV3 Chromium); link recensione verso Edge Add-ons se lo user agent è Edge. Firefox: `npm run build -- --target=firefox` → `dist-firefox/` (manifest con `background.scripts`, `browser_specific_settings.gecko`, senza `match_origin_as_fallback`). Dettagli e API non supportate in `docs/FIREFOX.md`. ⚠️ **Non testato** su Edge e Firefox reali (nessuna automazione disponibile qui): checklist in `docs/QA.md`. |

Permessi: aggiunto `alarms` (controllo licenza giornaliero senza tenere vivo il service worker). Nessun altro.

Test: 100 unit + 42 E2E (1 saltato su macOS). Bug trovato con gli E2E e corretto: skip silence non si ricollegava se l'`AudioContext` partiva sospeso (ora riprova su `statechange` e `timeupdate`).

## Fase 4 — Qualità

| # | Cosa | Note |
|---|---|---|
| 4.1 | Vitest | gating free/Pro, risoluzione regole, parsing scorciatoie, tempo risparmiato, licenza/grace, normalizzazione URL, migrazioni storage. |
| 4.2 | Playwright | Chromium con `--load-extension=dist` (persistent context), fixture locali: video base, shadow DOM, iframe same-origin, sostituzione `<video>`, fullscreen, input/contenteditable focus, ratechange forzato dal "player". |
| 4.3 | `docs/QA.md` | Checklist YouTube, Netflix, Prime Video, Udemy, Coursera, Twitch, Vimeo, Spotify web. |
| 4.4 | Performance | Nessun polling continuo (skip-silence campiona solo in play), observer incrementali, moduli Pro lazy, content script base target < 25KB minificato. |
| 4.5 | `README.md`, `docs/STORE_LISTING.md` (EN+IT) | Aggiorno anche `CHROMEWEBSTORE.md` (oggi dichiara `scripting` che non è nel manifest e prezzi $3.99 non allineati alla landing $1.99). |

---

## Permessi finali (v1.8.0) — giustificazione per la review dello store

| Permesso | Giustificazione |
|---|---|
| `storage` | Impostazioni, regole, scorciatoie, statistiche del tempo risparmiato e stato della licenza in `chrome.storage.local`; impostazioni (non dati personali) in `chrome.storage.sync` per seguire l'utente tra i dispositivi; buffer temporaneo in `chrome.storage.session`. Nessun dato lascia il browser. |
| `activeTab` | Il popup legge URL e titolo della scheda attiva solo quando l'utente lo apre (segnalibri per video, regole "da questa pagina", stato del video). Sostituisce `tabs`. |
| `alarms` | Un allarme orario sveglia il service worker per verificare la licenza **al massimo una volta al giorno**, senza tenerlo attivo. |
| `host_permissions`: `https://x2-speedup.vercel.app/*`, `https://api.lemonsqueezy.com/*` | Le uniche chiamate di rete dell'estensione: verifica della chiave di licenza (endpoint proprio + fallback del merchant of record). Inviata solo la chiave. |
| `content_scripts` su `<all_urls>`, `all_frames`, `match_about_blank`, `match_origin_as_fallback` | Le scorciatoie da tastiera, l'overlay e la persistenza della velocità devono funzionare su qualsiasi sito con video HTML5 e dentro i player in iframe, senza che l'utente apra il popup. Con `activeTab` + `scripting` le scorciatoie funzionerebbero solo dopo un click sull'icona, a ogni pagina. Lo script non legge né invia il contenuto delle pagine: osserva solo gli elementi `<video>`/`<audio>`. |
| `web_accessible_resources`: `pro/*.js` | Moduli Pro (skip silence, pubblicità YouTube) caricati con `import()` solo per utenti Pro che li attivano, per tenere leggero lo script principale. Nessun codice remoto. |
| ~~`tabs`~~, ~~`scripting`~~, ~~`<all_urls>` host~~ | Non richiesti. |

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
