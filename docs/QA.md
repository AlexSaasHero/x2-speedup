# QA manuale

Build: `npm run build` → `chrome://extensions` → modalità sviluppatore → "Carica estensione non pacchettizzata" → `dist/`.
Per testare Pro senza acquisto: `npm run build:dev` e chiave `DEV-SPEEDUP-PRO-2026` (attiva **solo** nella build dev).

Legenda: ✅ ok · ⚠️ parziale (nota) · ❌ rotto (nota) · — non applicabile.

## 0. QA automatica su siti reali — `npm run qa:live`

Suite Playwright su YouTube reale (video pubblico, nessun login, cookie rifiutati), esclusa dalla CI perché dipende dal sito. Ultimo run **2026-11-11 (v1.8.2)**: ✅ 4 passati, ⏭ 1 saltato.

| Scenario (YouTube) | Esito automatico |
|---|---|
| A Scorciatoie D/S/G, velocità >2x mantenuta contro il limite di YouTube, overlay presente | ✅ |
| B X: +10 s | ✅ |
| H Scrivere "sdrzxv" nella ricerca: testo digitato, velocità invariata | ✅ |
| F Nuovo caricamento del video riparte dalla velocità ricordata | ✅ |
| G Shift+. di YouTube (1 → 1.25) rispettato dall'estensione | ✅ (bug trovato e corretto, BUGS #19) |
| E Fullscreen (tasto F di YouTube): overlay dentro l'elemento fullscreen, scorciatoie attive | ✅ |
| Pro: canale rilevato (`@BlenderOfficial`, "Blender") e regola canale applicata | ✅ |
| Pro: pubblicità a 16x + muto e ripristino | ⏭ YouTube non ha servito pubblicità in questo run: da verificare a mano |

Limiti: il Chromium di Playwright non decodifica H.264 (Twitch, Vimeo, gran parte dei corsi) e non ha DRM (Netflix, Prime Video, Spotify): questi siti restano nella checklist manuale qui sotto.

### 0b. Piattaforme di lezioni — `tests/live/lectures.spec.ts`

> **Sospesa dal 2026-11-15: non è più criterio di rilascio.** Nei run lunghi il browser di test (Chrome for Testing headless, WebGL software) si chiude o smette di riprodurre, anche senza interventi dell'estensione e quando il Mac va in stop, quindi i risultati non sono affidabili.
> La registrazione Panopto pubblica dura ~3 min e non permette di misurare 2 minuti a ≥1,5x.
> Criterio di rilascio della 1.9.0: test manuale di Alex su Panopto ed Echo360 in Chrome; il test resta nel repo per indagini mirate.

**Criteri di rilascio 1.9.0** (dal 2026-11-14, a 1.5x, 2x, 2.5x, 3x): velocità effettiva entro ±10% per 2 minuti di riproduzione continua; mantenuta dopo seek, pausa/play, clic sul video, D/S; Echo360 anche all'apertura della lezione e alla lezione successiva. Il test li verifica tutti (`QA_SPEEDS`, `QA_SUSTAIN_MS` per ridurre la prova).

**Run del 2026-11-14 (dopo #24): non conclusivo.**
- Chrome for Testing headless (WebGL software) si chiude da solo nei run lunghi, anche a 1x senza interventi dell'estensione: 3,9 h, 15 test su 17 interrotti o incompleti.
- La registrazione Panopto pubblica dura ~3 min: a ≥1,5x finisce prima dei 2 minuti di misura. Serve una lezione pubblica più lunga (≥10 min).
- Dati validi: Panopto Viewer 1,5x e 2x esattamente alla velocità in ogni finestra fino alla fine della lezione, velocità mantenuta dopo seek, pausa/play, clic e D/S (1,5x). Panopto Embed 3x: 2,9–3,0x per 2 minuti, seek, pausa/play e D/S ok. Velocità impostata mai persa in nessun caso, Echo360 compreso.
- Echo360 (webinar da 51 min): il video risulta in riproduzione (`readyState` 4, 196 s scaricati) ma `currentTime` resta a 0, anche se l'estensione segna la velocità giusta. Il confronto a 1x non è riuscito perché il browser di test si è chiuso. Non è ancora chiaro se dipenda dall'estensione o dall'ambiente.

La tabella sotto è il run precedente (prima di #24).

Serve un Chromium con H.264 che accetti `--load-extension`: **Chrome for Testing** (`npx @puppeteer/browsers install chrome@stable`), passato con `PW_EXECUTABLE`. Il Chrome installato (≥137) ignora `--load-extension`. Per la pagina LMS: `python3 -m http.server 8001 --directory tests/live/fixtures`.

```bash
PW_EXECUTABLE="<…>/Google Chrome for Testing" npm run qa:live -- tests/live/lectures.spec.ts
```

Registrazioni pubbliche usate: Panopto `howtovideos.hosted.panopto.com` (Viewer, Embed, Embed in iframe di una pagina LMS locale), Echo360 `echo360.org/section/5e1d12d0-…/public` (prima e quarta lezione di "Getting Started"). Scartate: `arizona.hosted.panopto.com` (login Shibboleth), `utexas.hosted.panopto.com` (video archiviato).

Ultimo run **2026-11-14** (main dopo i fix #22 e #23). "Effettiva" = secondi di lezione per secondo reale, non il `playbackRate` dichiarato.

| # | Scenario | Panopto Viewer | Panopto Embed | Embed in iframe LMS | Echo360 |
|---|---|---|---|---|---|
| 1 | Video rilevati | ✅ 2 stream | ✅ 2 stream | ✅ 2 stream | ✅ 1 |
| 2 | Velocità dal popup (2.5x) su tutti gli stream | ✅ | ✅ | ✅ | ❌ resta 1x subito dopo l'apertura della lezione |
| 2b | Velocità effettiva ~2.5x (prima dei fix: **1.0x** su Panopto) | ✅ 2.37x | ✅ 2.44x | ✅ 2.37x | ❌ 1.29x |
| 3 | Stream allineati tra loro dopo 10 s | ⚠️ lo stream grande salta avanti | ⚠️ idem | ⚠️ idem | — |
| 4 | 16x | ✅ | ❌ torna a 1x e resta | ❌ idem | ✅ |
| 5 | Velocità dopo pausa/play | ✅ | ✅ | ✅ | ✅ |
| 6 | Velocità dopo un seek (+30 s) | ✅ | ✅ | ✅ | ❌ torna a 1x |
| 7 | Il player rimette 1x da solo → l'estensione la ripristina | ✅ | ✅ | ✅ | ✅ |
| 8 | Nessun ritorno a ≤2x in 15 s di riproduzione | ✅ | ✅ | ❌ torna a 1x e resta | ✅ |
| 9 | Scorciatoia D dopo un clic sul video | ✅ | ⚠️ parte da 1x (vedi 4) | ⚠️ idem | ❌ torna a 1x |
| 10 | Overlay dentro l'elemento a schermo intero | ✅ | ✅ | ❓ da verificare a mano col pulsante di Panopto | ❓ fullscreen non ottenuto dal test (nel run precedente ✅) |
| 11 | Scrivere "dddd" nelle note della pagina LMS: testo digitato, velocità invariata | — | — | ✅ | — |
| 12 | Lezione successiva alla velocità ricordata (2.5x) | — | — | — | ❌ parte a 1x |
| 13 | Pausa/Play coi pulsanti di Echo360: velocità mantenuta (BUGS #23) | — | — | — | ✅ 2.5x (il test ha lasciato il video in pausa: velocità effettiva non misurata) |
| 14 | D col focus sul pulsante Play di Echo360 | — | — | — | ✅ 2.6x: Echo360 non blocca i tasti |
| 15 | Velocità scelta dal menu di Echo360 rispettata | — | — | — | ❓ il test non trova le voci del menu (selettore da sistemare); coperto dall'E2E |

Note:
- I fix #22 (velocità su tutti gli stream) e #23 (Play di Echo360) funzionano sui casi che coprono, anche in E2E (`tests/e2e/lectures.spec.ts`).
- **Ancora aperto:** su Panopto Embed (16x, riproduzione lunga) ed Echo360 (apertura lezione, seek, clic sul video, lezione successiva) il player rimette 1x in momenti diversi dal Play e la velocità **resta** a 1x. Da indagare prima della 1.9.0.
- Riga 3: con gli stream accelerati Panopto sposta in avanti lo stream grande. Va guardato a occhio (slide e voce restano allineate?) prima di decidere se è un problema.

### 0c. Echo360 e Panopto — prova della 1.9.1 (BUGS #24, #27, #28)

Su `dist/` aggiornata (`npm run build`, poi "Aggiorna" in `chrome://extensions`), alla velocità 2.6x:

1. Apri la lezione, imposta 2.6x (D o popup), premi Play del player.
2. Apri la console (F12). Se il video sta in un iframe, scegli il frame del player nel menu "top" della console.
3. Incolla lo snippet qui sotto: misura per 10 s di riproduzione la velocità reale (secondi di video ÷ secondi reali, i salti esclusi).
4. Durante i 10 s: 2 cicli Pausa/Play coi pulsanti del player e un salto sulla barra.

```js
(() => {
  const all = (root) => [...root.querySelectorAll('*')].flatMap((e) => (e.shadowRoot ? [e, ...all(e.shadowRoot)] : [e]));
  const v = all(document).filter((e) => e instanceof HTMLMediaElement).sort((a, b) => (b.duration || 0) - (a.duration || 0))[0];
  if (!v) return console.warn('nessun video in questo frame');
  let video = 0, real = 0, last = null, dips = 0;
  const id = setInterval(() => {
    const now = { t: performance.now(), c: v.currentTime, r: v.playbackRate, playing: !v.paused && !v.seeking };
    if (now.playing && Math.abs(now.r - 2.6) > 0.01) dips++;
    if (last && last.playing && now.playing) {
      const dt = (now.t - last.t) / 1000, dv = now.c - last.c;
      if (dv >= 0 && dv < 1.5) { video += dv; real += dt; }
    }
    last = now;
    if (real >= 10) { clearInterval(id); console.log(`velocità reale ${(video / real).toFixed(2)}x su ${real.toFixed(1)} s · campioni non a 2.6x: ${dips}`); }
  }, 50);
})();
```

**Rilascio (BUGS #31):** imposta 1x dall'estensione (R o popup): il menu velocità del player deve tornare a funzionare. Disattiva l'estensione in `chrome://extensions` con la lezione aperta: entro 2 s il player deve poter cambiare velocità di nuovo.

**Criterio:** velocità reale ≥ 2.45x e 0 campioni non a 2.6x; il badge compare (in alto a destra su Panopto, mai sopra il logo); il pulsante "1x" del player Echo360 può restare a 1x (BUGS #30). Primo Play dopo un reload: annotare se non parte (BUGS #29).

## 1. Checklist per sito (manuale)

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
