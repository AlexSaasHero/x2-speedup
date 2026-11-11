# QA manuale

Build: `npm run build` → carica `dist/` da `chrome://extensions` (modalità sviluppatore → "Carica estensione non pacchettizzata").
Per la licenza di test usa `npm run build:dev` (master key DEV attiva solo in quel build).

## Fase 1 (v1.6.0) — da verificare a mano

Per ogni sito: ✅ ok · ⚠️ parziale (nota) · ❌ rotto (nota). Le colonne fanno riferimento agli scenari sotto.

| Sito | A Scorciatoie | B Overlay | C Fullscreen | D Persistenza | E Menu nativo | F Campi testo |
|---|---|---|---|---|---|---|
| YouTube (video, Shorts, playlist, pubblicità) | | | | | | |
| Netflix | | | | | | |
| Prime Video | | | | | | |
| Udemy | | | | | | |
| Coursera | | | | | | |
| Twitch (live + VOD) | | | | | | |
| Vimeo (sito + embed) | | | | | | |
| Spotify web (podcast) | | | | | | |

**A — Scorciatoie**: `D`/`S` cambiano di 0.1x, `R` porta a 1x e al secondo tocco torna alla velocità precedente, `G` velocità preferita, `X`/`Z` ±10s (su live: resta nella finestra disponibile), `V` nasconde/mostra l'overlay. Il tasto premuto **non** deve attivare anche funzioni del sito.
**B — Overlay**: compare passando il mouse sul video e dopo ogni cambio, sparisce dopo 2s, non impedisce click/doppio click sul player, si trascina e la posizione resta dopo un reload sullo stesso sito.
**C — Fullscreen**: in fullscreen l'overlay è visibile e le scorciatoie funzionano.
**D — Persistenza**: velocità mantenuta dopo pubblicità, cambio qualità, video successivo in autoplay/playlist, navigazione interna (SPA) e reload; con free oltre 4x appare "Free max 4.0x · Pro 16x".
**E — Menu nativo**: cambiare velocità dal menu del player viene rispettato (non viene riportato alla velocità precedente).
**F — Campi testo**: scrivendo nei commenti, nella ricerca, in chat (Twitch), in Google Docs/Notion le lettere `s d r g z x v` vengono digitate normalmente.

Extra:
- Popup → tab Shortcuts → "Disable shortcuts on <sito>": i tasti tornano al sito.
- Opzioni (popup → "All settings"): step, secondi di seek, remember speed, apply to all, overlay, blacklist.
- Due schede con video: cambiare velocità in una **non** cambia l'altra; una nuova pagina parte dall'ultima velocità usata.
- Aggiornamento da v1.5.1.8 con licenza e tasti personalizzati: licenza ancora attiva, i vecchi `]`/`[` funzionano ancora insieme a `D`/`S`.

## Fase 2 (v1.7.0) — funzioni Pro

Attiva Pro con la build dev (`npm run build:dev`, master key DEV) e verifica anche in free che ogni controllo mostri il lucchetto senza errori.

| Scenario | YouTube | Udemy/Coursera | Podcast (Spotify web) | Note |
|---|---|---|---|---|
| Skip silence accelera nelle pause e torna normale sul parlato | | | | |
| Skip silence: nessun audio "mangiato" all'inizio delle frasi | | | | |
| Skip silence su player cross-origin: messaggio "unavailable", audio regolare | | | | |
| Regola canale (tab Smart → Channel) applicata al video successivo dello stesso canale | | — | — | |
| Regola sito / video | | | | |
| Pubblicità YouTube: 16x + muto, poi velocità e audio ripristinati (pre-roll e mid-roll) | | — | — | |
| Hold Shift+F: 2.5x mentre premuto; cambiare finestra mentre premuto → torna normale | | | | |
| A-B repeat: Shift+A tre volte (A, B+loop, off) | | | | |
| "This week you saved" aumenta guardando a >1x | | | | |
| Segnalibri: stesso video con `&t=…` o da youtu.be mostra gli stessi segnalibri | | | | |

## Fase 3 (v1.8.0) — prodotto e crescita

| Scenario | Chrome | Edge | Firefox | Note |
|---|---|---|---|---|
| Installazione pulita: si apre l'onboarding locale; la demo risponde a D/S/R/G/Z/X | | | | |
| Aggiornamento da 1.7.x: si apre "What's new" in background; nessuna pagina su aggiornamenti patch | | | — | |
| Aggiornamento da 1.5.1.8 con chiave **vera**: resta Pro dopo il controllo | | | — | |
| Aggiornamento da 1.5.1.8 con chiave "finta" (es. `PRO-1234`): torna Free con "License key not valid" | | | — | |
| Attivazione chiave valida / scaduta / disattivata: messaggi corretti | | | | |
| Offline (Wi-Fi spento) per un giorno: resta Pro, badge "offline, will re-verify" | | | | |
| Sync: cambio uno step su un computer → compare sull'altro (stesso profilo Chrome) | | | | |
| Nuovo dispositivo con sync attiva: adotta le impostazioni esistenti invece di resettarle | | | | |
| Export → Import dello stesso file | | | | |
| Import da Video Speed Controller (incolla il JSON da `chrome://extensions` → VSC → storage) | | | | |
| Lingue: browser in it/es/de/fr/pt-BR/ja → popup, opzioni, onboarding e overlay tradotti, nessun testo tagliato | | | | |
| Recensione: dopo 30 min risparmiati compare il banner; "Not now" lo nasconde per 14 giorni | | | | |
| Firefox: concedere i permessi dei siti da about:addons, poi scorciatoie e overlay funzionano | — | — | | |
| Firefox: skip silence (vedi docs/FIREFOX.md) | — | — | | |
