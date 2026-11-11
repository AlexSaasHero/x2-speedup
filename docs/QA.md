# QA manuale

Build: `npm run build` → `chrome://extensions` → modalità sviluppatore → "Carica estensione non pacchettizzata" → `dist/`.
Per testare Pro senza acquisto: `npm run build:dev` e chiave `DEV-SPEEDUP-PRO-2026` (attiva **solo** nella build dev).

Legenda: ✅ ok · ⚠️ parziale (nota) · ❌ rotto (nota) · — non applicabile.

## 1. Checklist per sito

| Scenario | YouTube | Netflix | Prime Video | Udemy | Coursera | Twitch | Vimeo | Spotify web |
|---|---|---|---|---|---|---|---|---|
| **A** Scorciatoie S/D/R/G cambiano velocità; il tasto non attiva funzioni del sito | | | | | | | | |
| **B** Z/X ±10 s (live: resta nella finestra disponibile) | | ⚠️ disattivato di proposito, vedi nota | | | | | | |
| **C** Overlay: appare al passaggio del mouse e dopo ogni cambio, sparisce dopo 2 s, trascinabile, posizione ricordata | | | | | | | | — (solo audio) |
| **D** Click/doppio click sul player funzionano con l'overlay visibile | | | | | | | | — |
| **E** Fullscreen: overlay visibile, scorciatoie attive | | | | | | | | — |
| **F** Velocità mantenuta dopo: pubblicità / cambio qualità / episodio successivo / navigazione interna / reload | | | | | | | | |
| **G** Menu velocità nativo del player rispettato (non viene "riportato indietro") | | | | | | | | |
| **H** Scrivendo in commenti / ricerca / chat le lettere s d r g z x v vengono digitate | | | | | | | | |
| **I** Free oltre 4x: overlay "Free max 4.0x · Pro 16x" | | | | | | | | |
| **J** Pro 8x–16x: il player regge (audio può sparire oltre ~4x: limite del browser) | | | | | | | | |
| **K** Skip silence (Pro): accelera nelle pause, non "mangia" l'inizio delle frasi; su player non compatibili mostra "non disponibile" senza silenziare l'audio | | | | | | | | |
| **L** Regola sito/video (Pro) applicata al reload | | | | | | | | |
| **M** Popup: "N video trovati", velocità corrente corretta, segnalibri (Pro) | | ⚠️ salto ai segnalibri disattivato | | | | | | |
| **N** "This week you saved" aumenta guardando a >1x | | | | | | | | |

Specifici YouTube:

| Scenario | Esito |
|---|---|
| Regola canale (tab Smart → Channel) applicata al video successivo dello stesso canale e non a un altro canale | |
| Pubblicità (pre-roll, mid-roll, skippabile e no) a 16x + muto, poi velocità e audio ripristinati | |
| Shorts: scorciatoie e overlay | |
| Miniplayer / modalità cinema | |
| Hold Shift+F: 2.5x mentre premuto; cambio finestra mentre premuto → torna normale | |
| A-B repeat: Shift+A tre volte (A, B + loop, off) | |

### Note per sito (comportamenti noti)

- **Netflix**: impostare direttamente `currentTime` manda in errore il player (M7375). Su netflix.com seek ±N, fotogramma, A-B e salto ai segnalibri sono **disattivati** con il messaggio "Seeking isn't supported on this site". La velocità funziona normalmente.
- **Twitch live**: velocità >1x su una diretta porta presto al "bordo live" e il player rallenta da solo: atteso.
- **Spotify web**: solo audio (nessun overlay), la velocità vale per podcast/audiolibri; per la musica il player può ignorarla.
- **Siti con video dentro web component chiusi** (`attachShadow({mode:'closed'})`): non raggiungibili da nessuna estensione.
- **Player che rimettono la velocità di continuo**: dopo 8 tentativi in 1 s l'estensione si ferma per 3 s (niente loop).

## 2. Licenza (Pro)

| Scenario | Esito |
|---|---|
| Aggiornamento da 1.5.1.8 con chiave **vera**: resta Pro dopo il controllo | |
| Aggiornamento da 1.5.1.8 con chiave "finta" (es. `PRO-1234`): torna Free con "License key not valid" | |
| Attivazione chiave valida / scaduta / disattivata: messaggio corretto | |
| Wi-Fi spento per un giorno: resta Pro, badge "Pro (offline, will re-verify)" | |
| Trial annullata su Lemon Squeezy: entro 24 h torna Free con "Trial/license expired" | |
| "Remove key" rimuove la chiave e torna Free | |

## 3. Installazione, aggiornamento, sync, lingue

| Scenario | Chrome | Edge | Firefox |
|---|---|---|---|
| Installazione pulita: si apre l'onboarding locale; la demo risponde a D/S/R/G/Z/X | | | |
| Aggiornamento minor (1.7 → 1.8): "What's new" in background; nessuna pagina su patch | | | — |
| Sync: cambio uno step su un computer → compare sull'altro (stesso profilo) | | | |
| Nuovo dispositivo con sync: adotta le impostazioni esistenti (non le resetta) | | | |
| Export → Import dello stesso file | | | |
| Import da Video Speed Controller (incolla il JSON delle sue impostazioni) | | | |
| Lingua del browser it/es/de/fr/pt-BR/ja: popup, opzioni, onboarding, overlay tradotti; nessun testo tagliato | | | |
| Recensione: dopo 30 min risparmiati compare il banner; "Not now" lo nasconde per 14 giorni; "Rate it" apre lo store giusto | | | |
| Firefox: concedere l'accesso ai siti da about:addons, poi scorciatoie e overlay funzionano | — | — | |
| Firefox: skip silence (vedi docs/FIREFOX.md) | — | — | |

## 4. Prestazioni (a campione)

| Scenario | Esito |
|---|---|
| YouTube home con scroll infinito per 1 minuto: nessun rallentamento percepibile (DevTools → Performance: nessun long task attribuito a `content.js`) | |
| Pagina senza video (es. un articolo con molti iframe pubblicitari): DevTools → nessun accesso a storage dal content script | |
| Skip silence attivo e video in pausa: nessun timer attivo (DevTools → Performance) | |
