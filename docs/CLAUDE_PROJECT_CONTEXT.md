# SpeedUp Video Pro — contesto di progetto (per Claude)

> Documento da caricare nella knowledge di un Progetto Claude. Aggiornato al **2026-11-11, v1.8.2** (commit `d03d242` su `main`).
> Fonti di verità nel repo: `docs/ROADMAP_IMPL.md` (stato di ogni punto), `docs/BUGS.md`, `docs/QA.md`, `docs/STORE_LISTING.md`, `docs/FIREFOX.md`, `README.md`.

## 1. Il prodotto

- **Cos'è**: estensione browser (Chrome/Edge MV3, build Firefox disponibile) che controlla la velocità di qualsiasi video/audio HTML5 da tastiera, senza uscire dalla pagina.
- **Concorrenti di riferimento**: Video Speed Controller (~3M utenti), Global Speed (~700K). Obiettivo: parità sulle funzioni base (gratis) e superarli con funzioni Pro che fanno risparmiare tempo.
- **Posizionamento**: "100% locale, zero tracciamento". L'unica chiamata di rete dell'estensione è la verifica della licenza (invia solo la chiave).
- **Repo**: github.com/AlexSaasHero/x2-speedup (privato), cartella locale `~/Documents/Saas/Saas X2`.
- **Landing**: `landing-page/` (HTML statico + Tailwind CDN) su x2-speedup.vercel.app. Contiene Google Analytics 4 e Microsoft Clarity (il sito, non l'estensione).

## 2. Modello di business (decisioni prese)

- **Freemium** con licenza Pro gestita da **Lemon Squeezy** (merchant of record).
- **Prezzo**: prova gratuita di 7 giorni, poi **$1.99 una tantum** (a vita, niente abbonamento). Il "$3.99" in `CHROMEWEBSTORE.md` è storico.
- La chiave di licenza arriva al checkout (anche per la trial); se la trial viene annullata, la chiave risulta scaduta al controllo successivo.
- **Free**: 0.1x–4x, tutte le scorciatoie (personalizzabili), seek ±N s, overlay, persistenza velocità, statistica "risparmiato questa settimana", sync/import/export, 7 lingue.
- **Pro**: fino a 16x, fotogramma per fotogramma, segnalibri per video, A-B repeat, skip silence, regole di velocità (canale YouTube / URL / sito), pubblicità YouTube a 16x mute, hold-to-speed (Shift+F), statistiche dettagliate.
- Limiti e feature per piano in **un solo file**: `src/config/plans.ts`. Ogni controllo passa da `isPro()` / `can(feature)` in `src/shared/entitlement.ts`.
- **Decisioni licenza**: nessun limite di dispositivi per chiave; stato licenza **non firmato crittograficamente** (rischio accettato per ora — servirebbe un token firmato dal backend).

## 3. Regole di lavoro che valgono sempre

1. MV3: niente codice remoto, niente `eval`, service worker senza stato in memoria (tutto in `chrome.storage`).
2. Permessi minimi; ogni nuovo permesso va giustificato (tabella "Permessi finali" in `docs/ROADMAP_IMPL.md`).
3. Privacy: nessun tracking nell'estensione; unica rete = verifica licenza.
4. **Non cambiare prezzi, testi di vendita o backend licenze senza chiedere ad Alex.**
5. Bug trovati → `docs/BUGS.md`; correggerli solo se bloccano il lavoro corrente.
6. Lavoro per fasi con commit atomici (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`), test verdi prima di committare. Push solo su richiesta esplicita.
7. Nessuna stringa UI hardcoded: tutto passa da `src/_locales/<lang>.json`.
8. Se qualcosa è ambiguo: ipotesi più ragionevole, dichiarata nel riepilogo.

## 4. Architettura (sintesi)

| Area | Dove | Note |
|---|---|---|
| Build | `scripts/build.mjs` (esbuild), `scripts/locales.mjs`, `scripts/firefox.mjs` | `dist/` (Chrome/Edge), `dist-firefox/`. Codice iniettato nelle pagine minificato, pagine dell'estensione leggibili. Versione di riferimento: `public/manifest.json`. |
| Logica pura | `src/shared/` | entitlement, license, storage (schema **v4**) + migrations, shortcuts, rules, stats, sync/import (anche da VSC), i18n, url, hosts, review, version, site-access. |
| Service worker | `src/background/` | migrazione schema a install/update, licenza (controllo max 1/giorno via `chrome.alarms`, grace 7 giorni offline), sync impostazioni in `storage.sync` a chunk, aggregazione statistiche (buffer in `storage.session`, scrittura max ogni 30 s), onboarding/changelog. |
| Content script | `src/content/` | **dormiente finché non compare un media** nel frame. Media registry (video+audio, shadow DOM aperti, iframe), rate controller (anti-loop `ReapplyBudget`, override temporanei ads > hold > silence, rispetta i cambi dai controlli nativi), scorciatoie (mai nei campi di testo), overlay in Shadow DOM chiuso, messaggi col popup, quirk per sito (Netflix: niente seek diretto). |
| Moduli Pro lazy | `src/pro/` | `skip-silence`, `youtube-ads`, `rules` — caricati con `import()` solo per utenti Pro. |
| UI | `src/popup/`, `src/options/`, `src/onboarding/`, `src/ui/` | Popup a 4 tab (Velocità, Scorciatoie, Precisione, Smart). Opzioni complete + backup/sync/import. Onboarding con demo interattiva. |
| Lingue | `src/_locales/` | en (default), it, es, de, fr, pt_BR, ja. Segnaposto `{1}`. La build fallisce se una lingua ha chiavi mancanti. |
| Test | `tests/unit/` (Vitest), `tests/e2e/` (Playwright, estensione caricata), `tests/live/` (YouTube reale, solo su richiesta) | 104 unit (copertura 92,9% della logica pura), 44 E2E, 5 live. |
| CI | `.github/workflows/ci.yml` | typecheck, unit+coverage, build Chrome+Firefox, E2E nell'immagine Playwright ufficiale. |

Comandi principali: `npm run build:dev` (master key DEV attiva solo qui), `npm run check`, `npm run test:e2e`, `npm run qa:live`, `npm run zip`, `npm run build -- --target=firefox`.

Permessi finali: `storage`, `activeTab`, `alarms`; host `x2-speedup.vercel.app` e `api.lemonsqueezy.com` (solo licenza); content script su `<all_urls>`; `web_accessible_resources` solo `pro/*.js`.

## 5. Stato attuale

- Fasi 0–4 completate (parità leader, funzioni Pro, licenza/onboarding/sync/i18n/Firefox, qualità/prestazioni). Dettaglio punto per punto in `docs/ROADMAP_IMPL.md`.
- **v1.8.2** committata su `main`, **non ancora pushata** (alla data di questo documento). Zip pronto: `release/SpeedUp_Video_Pro_v1.8.2.zip`.
- Il primo run della CI (v1.8.1) è fallito all'installazione di Chromium; corretto in v1.8.2 (immagine Playwright), da verificare al prossimo push.
- QA live su YouTube: 4 scenari ok; pubblicità non verificate (YouTube non ne ha servite nel run).
- Bug storici chiusi: licenza aggirabile (qualsiasi chiave > 3 caratteri), GA4 nell'estensione, menu velocità nativo rotto, velocità propagata a tutte le schede, observer costoso, Netflix M7375, scorciatoie native YouTube annullate.

## 6. Cose aperte

**Per Alex (manuali):**
1. Push di v1.8.2 (porta il fix CI e pubblica la nuova `privacy.html`).
2. QA manuale (`docs/QA.md`): pubblicità YouTube con Pro, Netflix, Prime Video, Spotify, Twitch, Vimeo, Udemy, Coursera.
3. Test reali su Edge e Firefox (su Firefox: richiesta di accesso ai siti nell'onboarding).
4. Revisione delle traduzioni da madrelingua (soprattutto ja, de, pt_BR).
5. Invio allo store con lo zip 1.8.2 e i testi di `docs/STORE_LISTING.md`.

**Decisioni ancora da prendere:**
- **Cookie consent sulla landing**: GA4 e Clarity girano senza banner; per i visitatori UE serve consenso prima dell'attivazione. Opzioni: banner di consenso oppure rimozione dei tracker.
- Firefox: ID definitivo (`speedup-video-pro@x2-speedup` provvisorio) e slug AMO per il link recensioni.
- In futuro: token firmato dal backend licenze e/o limite dispositivi (oggi esclusi per scelta).

## 7. Come usarmi (Claude chat vs Claude Code)

- **Claude (chat, questo progetto)**: strategia, prezzi, testi di vendita, store listing, email di supporto, priorità, analisi dei concorrenti, revisione di piani. Non ha accesso al codice: per dettagli tecnici fa fede il repo.
- **Claude Code (terminale, nella cartella del repo)**: modifiche al codice, test, build, commit. Legge `CLAUDE.md` nella root del repo.
- Quando una decisione presa in chat cambia il prodotto (prezzi, limiti free/Pro, testi), riportarla a Claude Code citando il file da toccare (`src/config/plans.ts`, `src/_locales/*.json`, `docs/STORE_LISTING.md`).
