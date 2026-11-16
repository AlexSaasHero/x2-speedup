# Piano 1.9.1: rebrand dell'estensione in LectureSpeed

> Aggiornato il 2026-11-16: il nome definitivo è **LectureSpeed** (una parola, L e S maiuscole). Il nome provvisorio SpeedUniversity è stato scartato.

Stato: **da approvare, non implementato**. Data: 2026-11-16. Base: 1.9.0 pubblicata sul Chrome Web Store.
Obiettivo: stesso prodotto, stesso ID dello Store e di Firefox, nuovo nome, popup con la palette e i font della landing, nuove icone, nuovi testi e screenshot. Nessuna nuova funzione, nessun cambio a Free/Pro o prezzi.

## 0. Decisione da prendere prima: il titolo nello Store

Il titolo nello Store **è** il `name` del manifest (`extName`, max 75 caratteri). Il titolo proposto, "LectureSpeed – Watch Panopto & Echo360 Lectures Faster Than 2x" (63 caratteri), mette due marchi di terzi nel nome del prodotto. Rischi:
- la 1.9.0 è già stata rifiutata una volta per "keyword spam" legato ai nomi delle piattaforme (nella descrizione);
- le regole della landing (`docs/landing-contesto.md` §5) dicono "mai nel nome del prodotto";
- le norme dello Store sui marchi vietano nomi che possano far pensare a un'estensione ufficiale o affiliata.

Opzioni:
- **A (proposta di Alex):** "LectureSpeed – Watch Panopto & Echo360 Lectures Faster Than 2x". Massima pertinenza nella ricerca dello Store, rischio di rifiuto o di richiesta di modifica.
- **B (consigliata):** "LectureSpeed – Watch Recorded Lectures Faster Than 2x" (53 caratteri). Panopto ed Echo360 restano nella descrizione breve e lunga, in frasi naturali ("works on Panopto and Echo360").

Il piano funziona con entrambe; cambia solo la stringa `extName`. **Se scegli A**, conviene avere pronta la B per un reinvio rapido.

## 1. Nome, manifest e lingue

| Cosa | Dove | Valore |
|---|---|---|
| Nome / titolo Store | `extName` in `src/_locales/*.json` (7 lingue: en, it, es, fr, de, pt_BR, ja) | Marchio "LectureSpeed" invariato in tutte le lingue (non si traduce) + slogan tradotto (A o B) |
| Descrizione breve (max 132 caratteri) | `extDescription` × 7 | Es. EN: "Watch recorded lectures faster than 2x on Panopto and Echo360, even inside Canvas or Moodle. Bookmark what matters. No tracking." |
| Tooltip dell'icona | `actionTitle` × 7 | "LectureSpeed" |
| Altre stringhe con il nome | 15 chiavi per lingua (es. `pro_modal_active`, `review_text`, `opt_title`, `onb_title`, `onb_welcome`, `onb_pin_body`, `site_access_*`, `lecture_toast`, `opt_import_*`) | "SpeedUp" / "SpeedUp Video Pro" → "LectureSpeed" |
| Titoli HTML statici | `public/popup/popup.html` (`<title>`, `<h1>`, badge "⚡ SPEEDUP PRO"), `public/options/options.html`, `public/onboarding/onboarding.html` | "LectureSpeed", badge "PRO" |
| Versione | `public/manifest.json` e `package.json` | 1.9.1 |
| Zip | `scripts/build.mjs` | `LectureSpeed_v1.9.1.zip` |
| Commenti e log | `src/**` (`[SpeedUp]` nei log di debug, intestazioni dei file) | Aggiornare; nessun effetto per l'utente |

**Da NON cambiare** (compatibilità):
- ID dell'estensione sullo Store: stesso item, si aggiorna il nome.
- `GECKO_ID` Firefox `speedup-video-pro@x2-speedup` in `scripts/firefox.mjs`: cambiarlo creerebbe un add-on nuovo e farebbe perdere gli utenti.
- `EXPORT_FORMAT = 'speedup-video-pro-settings'` in `src/shared/sync.ts`: i backup esistenti devono restare importabili. Si può continuare a scrivere questo formato (è interno) e accettarlo sempre.
- Attributo `data-speedup-overlay` (`src/content/overlay.ts`) e chiavi di `chrome.storage`: interni, nessuna migrazione, `SCHEMA_VERSION` invariato.
- ID prodotto Lemon Squeezy in `src/shared/license.ts`: la verifica usa gli ID, non il nome.

## 2. Popup ridisegnato (palette e font della landing)

- **Palette:** sfondo `ink` #1B1E3C ("aula"), superfici `paper/5–10`, testo `paper` e `mist` #B4BAD0, accento e CTA `highlighter` #FFE14D con testo ink, link e stati attivi `timeline-light` #8C9EFF, tempo risparmiato `saved` #14A870. Via i gradienti viola/blu e i glow.
- **Font:** Bricolage Grotesque (titoli, velocità grande, numeri con cifre tabellari) e Atkinson Hyperlegible (testo), **inclusi nel pacchetto** (`public/fonts/`, woff2, latino, OFL): nessuna richiesta di rete (regola MV3 + privacy). Peso aggiunto ~110 KB.
- **Componenti:** velocità grande in Bricolage 800; pulsanti preset come il controllo segmentato della landing; CTA Pro gialla; schede (Speed, Shortcuts, Precision, Smart) con stato attivo giallo; "Bookmarks" al posto di eventuali "checkpoint" visibili (già "Bookmarks" nella UI).
- **Metodo:** token CSS (`--ink`, `--paper`, …) in cima a `public/popup/popup.css` (1 388 righe oggi), poi sostituzione dei colori esistenti; nessun cambio a `src/popup/index.js` salvo nomi di classi se servono. Stesse dimensioni del popup (350 px).
- **Coerenza:** stessi token in `options.css` e `onboarding.css` (cambio di colori e font, non di layout). Overlay sul video (`overlay.ts`): solo l'anello giallo come la `speed-pill` della landing, se non peggiora la leggibilità sui video chiari.
- **Accessibilità:** contrasti come sulla landing (AA), focus visibile giallo/`timeline-light`.

## 3. Icone

- Dal marchio della landing: `landing-page/img/logo-mark.svg` (quadrato ink, due chevron gialli, il secondo oltre una linea tratteggiata), `logo-mark-dark.svg` (quadrato giallo, chevron ink: per fondi scuri) e `logo-mark-16.svg` (disegnato per 16 px, senza linea, chevron più spessi).
- `public/icons/icon16.png` (da `logo-mark-16.svg`), `icon32.png` (nuova, consigliata), `icon48.png`, `icon128.png` (da `logo-mark.svg`). Per lo Store l'icona 128 ha il disegno in 96×96 con 16 px di margine trasparente (linee guida Google).
- Nel popup (sfondo ink) il marchio nell'intestazione usa la variante `logo-mark-dark.svg`.
- Script di generazione come `docs/landing-assets/logo/make-icons.mjs`, con uscita in `public/icons/`.

## 4. Testi dello Store

- `docs/STORE_LISTING.md`: nuovo titolo (A o B), descrizione breve, descrizione lunga in prosa con il nuovo nome e "Bookmarks" (già fatto). Niente elenchi di marchi; disclaimer generico "not affiliated with any lecture or video platform".
- Traduzioni della descrizione lunga per le 6 lingue non inglesi (se pubblicate nello Store).
- Privacy policy: già aggiornata sulla landing (branch `landing-rebrand`), URL invariato `/privacy.html`.
- Lemon Squeezy (a mano, Alex): nome prodotto "LectureSpeed Pro – Annual", logo del negozio, testo dell'email di ricevuta. Gli ID non cambiano.
- AMO (Firefox): nome e descrizione aggiornati a mano.

## 5. Screenshot

- Store: `docs/store-assets/source/make-shots.mjs` (oggi non tracciato) aggiornato a palette, font e nome nuovi; 5 schermate 1280×800 + promo tile 440×280.
- Landing: `npm run build && node docs/landing-assets/make-ext-shots.mjs` (popup Free, scheda Precision, badge sul video).

## 6. Test e rilascio

1. Branch `release-1.9.1` da `main`.
2. Commit separati: stringhe e manifest · font nel pacchetto · popup · options/onboarding · icone · screenshot · doc.
3. `npm run check` (typecheck + unit + build; il build fallisce se manca una chiave in una lingua) e `npm run test:e2e`. Aggiornare i test che cercano il vecchio nome (`tests/e2e/harness.ts`, `phase1.spec.ts`, `phase3.spec.ts`, `lectures.spec.ts`, `tests/live/youtube.spec.ts`, `tests/unit/sync.test.ts`, `tests/unit/migrations.test.ts`: da verificare caso per caso, alcuni usano il formato di export che resta invariato).
4. QA manuale (`docs/QA.md`): Panopto, Echo360, Panopto in Canvas/Moodle, YouTube; popup in Free e Pro; onboarding; import di un backup 1.9.0.
5. `npm run zip` → upload sullo Store con nuovi testi, icona e screenshot.
6. **Dopo l'approvazione:** merge di `landing-rebrand` in `main` (pubblica la landing con il nuovo nome), dominio nuovo, poi `LANDING_PAGE_URL` in `src/shared/links.ts` aggiornato in una 1.9.2 (oggi punta a `x2-speedup.vercel.app`, che resterà raggiungibile con redirect).

## 7. Stima

Stringhe e manifest: 1–2 h · font + popup: 4–6 h · options/onboarding: 1–2 h · icone: 1 h · screenshot e testi Store: 2 h · test e QA: 2 h.
