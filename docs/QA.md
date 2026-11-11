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
