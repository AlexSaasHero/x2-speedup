# Bug noti (baseline v1.5.1.8)

Trovati durante l'esplorazione. Corretti solo se bloccano la fase corrente; altrimenti indicata la fase in cui vengono risolti. Riferimenti di riga alla baseline `51cb7a3` (`content/content.js`, `popup/popup.js`, ora in `src/content/index.js` e `src/popup/index.js`).

| # | Gravità | Dove | Problema | Fase fix |
|---|---|---|---|---|
| 1 | Alta | `content.js:390-397`, `popup.js:363-370` | Pro attivo se `license_key` è una stringa qualsiasi di >3 caratteri: basta scrivere in storage (o nella console dell'estensione) per sbloccare tutto. | ✅ Fase 3 |
| 2 | Alta | `popup.js:624-631` | Se i due endpoint non rispondono, qualsiasi chiave `PRO-*`, `TRIAL-*` o UUID viene accettata offline. | ✅ Fase 3 |
| 3 | Alta | `content.js:11`, `popup.js:14` | Master key `DEV-SPEEDUP-PRO-2026` inclusa nel bundle pubblicato. | ✅ Fase 0 (solo build dev) |
| 4 | Alta | `utils/analytics.js` | `api_secret` GA4 in chiaro + invio del dominio visitato: contraddice "zero tracking" e `landing-page/privacy.html` ("We do NOT use any analytics…"). | ✅ Fase 0 |
| 5 | Media | `content.js:111-144, 164-190` | `ratechange` viene sempre bloccato/sovrascritto: il menu velocità nativo di YouTube/Vimeo non funziona più. | ✅ Fase 1 |
| 6 | Media | `content.js:527-548` | Tasti `]` `[` `d` `s` `r` `g` sono hardcoded oltre a quelli personalizzati: rimappare non disattiva i default. | ✅ Fase 1 |
| 7 | Media | `content.js:478-484, 59-75` | MutationObserver esegue `querySelectorAll('*')` sull'intero documento a ogni mutazione (con ricorsione negli shadow root): costo CPU elevato su YouTube/SPA. | ✅ Fase 1 |
| 8 | Media | `content.js:257-260, 331-334` | L'HUD modifica `position` del parent del video del sito (`static` → `relative`): può rompere layout. CSS globale non isolato. | ✅ Fase 1 |
| 9 | Media | `content.js:237-243`, `popup.js:748-758` | La velocità viene salvata in `defaultSpeed` globale → `storage.onChanged` la applica a **tutte** le schede aperte. | ✅ Fase 1 |
| 10 | Bassa | `popup.js:750-752, 769-771` | `setSpeed` riscrive sempre `preservesPitch`/`hudEnabled` ai default, sovrascrivendo le scelte dell'utente. | ✅ Fase 1 |
| 11 | Bassa | `content.js:506` | Scorciatoie ignorate con qualsiasi Ctrl/Meta, ma Alt/Shift non gestiti come modificatori. | ✅ Fase 1 |
| 12 | Bassa | `content.js:563-565` | Iframe senza video non rispondono, ma un top frame senza video con video solo in iframe cross-origin risponde "no video" al popup. | ✅ Fase 1 |
| 13 | Bassa | `popup.js:669, 684` | `tier.isTrial` non esiste mai → `tier_state` sempre `pro`/`expired`. | ✅ Fase 0 (rimosso con telemetria) |
| 14 | Bassa | `CHROMEWEBSTORE.md` | Dichiara il permesso `scripting` (non presente), versione 1.4.2 e prezzo $3.99 (landing: $1.99). | ✅ Fase 4 (sostituito da `docs/STORE_LISTING.md`; ⚠️ prezzo da decidere) |
| 15 | Bassa | root repo | 15 zip di release committati in git. | ✅ Fase 0 |
| 16 | Media | `src/pro/skip-silence.ts` (v1.7.0) | Se l'`AudioContext` era ancora sospeso al momento del `play`, skip silence non si collegava più fino al play successivo (trovato da un E2E intermittente). | ✅ Fase 3 |
| 17 | Media | Netflix (tutte le versioni) | Impostare `video.currentTime` manda il player Netflix in errore (M7375): seek ±N, fotogramma, A-B e salto ai segnalibri lo facevano. | ✅ Fase 4 (disattivati su netflix.com con messaggio) |
| 18 | Bassa | `src/content/media-registry.ts` (v1.6–1.8.0) | La ricerca di shadow root percorreva in JS ogni nodo aggiunto a ogni mutazione: costo alto su pagine con molto DOM dinamico. | ✅ Fase 4 |
