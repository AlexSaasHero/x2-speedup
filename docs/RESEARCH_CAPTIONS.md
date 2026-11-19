# Ricerca: sottotitoli e trascrizioni di Panopto ed Echo360 (per la 2.0)

Data: 2026-11-19. Solo analisi: nessuna modifica al codice dell'estensione.

**Obiettivo 2.0:** ricerca nella lezione (parola → salto al minuto), riassunti AI, e solo come piano B la trascrizione con Whisper.

**Metodo:**
- documentazione ufficiale, guide di supporto delle università, community Panopto;
- ispezione con Playwright (Chromium senza estensione) di lezioni **pubbliche**:
  - Panopto: [seminario su vstream.au.panopto.com](https://vstream.au.panopto.com/Panopto/Pages/Viewer.aspx?id=02a1a5af-9482-4fd4-adb0-affe006aceae) e [tutorial su arizona.hosted.panopto.com](https://arizona.hosted.panopto.com/Panopto/Pages/Viewer.aspx?id=07d10c11-cd35-474c-b67a-abe40143fa26), entrambi in Viewer ed Embed;
  - Echo360: la sezione pubblica già usata in `tests/live/lectures.spec.ts`.
- Delle risposte ho guardato solo la struttura e 1–2 righe d'esempio. Nessun dato delle lezioni è stato inviato a servizi esterni.

## In breve

| | Panopto (Viewer ed Embed) | Echo360 |
|---|---|---|
| Dove stanno | Chiamata del player `POST /Panopto/Pages/Viewer/DeliveryInfo.aspx` con `getCaptions=true`: JSON. Nessun `<track>` sul `<video>`. Testo anche nel DOM (scheda Transcript del Viewer). | Chiamata del player `GET /api/ui/echoplayer/lessons/{lessonId}/medias/{mediaId}/transcript`: JSON. Nessun `<track>`. |
| Tempi per frase | Sì: `Time` (secondi dall'inizio) e `CaptionDuration` | Sì: `startMs`, `endMs` per ogni frase (`cues[]`) |
| Ricerca già pronta | Sì: `POST /Panopto/Pages/Viewer/Search/Results.aspx` restituisce i risultati con `Time` | No (il pannello Transcript ha una ricerca nel testo lato client) |
| Leggibile dal content script, permessi nuovi | Sì, nessun permesso nuovo (richiesta same-origin dal frame Panopto, con la sessione dell'utente) | Sì, nessun permesso nuovo (stesso meccanismo) |
| Senza sottotitoli del docente | Trascrizione automatica (ASR) di solito generata per la ricerca ma non pubblicata. Se la ricerca del player la espone agli studenti va verificato su una lezione reale | ASR se l'istituzione e il corso lo hanno attivo (`isAutomated: true`); altrimenti 404 |
| Termini d'uso | AUP: vieta "automated system… to access" e l'accesso ai contenuti "other than through the Panopto Services" | EULA: vieta "systematic or automated data collection… scraping… data extraction" |

**Fattibile subito:**
- ricerca nella lezione e salto al minuto, **in locale**, sul testo che il player ha già scaricato;
- nessun permesso nuovo e nessuna richiesta di rete verso di noi.

**Il nodo vero:** riassunti AI e Whisper richiedono di mandare il testo o l'audio a un fornitore AI. Questo cambia la promessa di privacy dell'estensione e richiede un backend, che oggi non esiste.

## 1. Dove stanno i sottotitoli

### Panopto (verificato su lezioni pubbliche)

- **Nessun `<track>`.** Nel Viewer ci sono 2 `<video>` senza `<track>`; nell'Embed il `<video>` compare solo dopo l'avvio. I sottotitoli li disegna il player (`#dockedCaptionText` nel Viewer, `#captionPlayer` nell'Embed).
- **Rete: il player chiama `DeliveryInfo.aspx` due volte.**
  1. Al caricamento: `POST /Panopto/Pages/Viewer/DeliveryInfo.aspx`, corpo `deliveryId=<id>&isLiveNotes=false&refreshAuthCookie=true&…&responseType=json`. La risposta `Delivery` contiene tra l'altro:
     - `HasCaptions`;
     - `AvailableCaptions` (es. `[{"Language":0,"ShowDisclaimer":false}]`);
     - `Timestamps` (eventi dell'indice);
     - `Duration`;
     - `AISummary`, `AIChapters`, `AIKeyPoints` (vedi sotto).
  2. Per i sottotitoli: stesso URL, corpo `deliveryId=<id>&getCaptions=true&language=<n>&responseType=json`.
     - La risposta è un **array**, una voce per frase, con `Caption` (testo), `Time` (secondi dall'inizio), `CaptionDuration`, `AbsoluteTime`, `ID`.
     - Esempio (seminario pubblico): 379 voci, la prima `{"Caption":"Yeah.","Time":2.71,"CaptionDuration":0.68,…}`.
     - **Attenzione:** se `AvailableCaptions[0].Language` è `null`, bisogna omettere `language`. Su arizona, `language=0` restituiva 0 voci e senza `language` 410 voci.
     - Lo stesso endpoint è usato dallo scraper open source [panopto-captions-scraper](https://github.com/winstxnhdw/panopto-captions-scraper) (`src/get-caption.ts`).
- **Ricerca:** quando lo studente cerca nel Viewer, il player chiama `POST /Panopto/Pages/Viewer/Search/Results.aspx` con `id=<id>&query=<parola>&deliveryRelative=true&responseType=json`.
  - La risposta `Events[]` ha per ogni risultato `Time`, `Caption` (con `<span class="match">`) ed `EventTargetType: "Transcript"`.
  - Esempio: "record" ha dato 112 risultati con il minuto.
- **DOM:** il Viewer ha la scheda Transcript (`#transcriptTabPane`, voci `#UserCreatedTranscript-<ms>`). L'Embed non ha il pannello: lì conviene leggere i dati dalla rete.
- **Altri endpoint (non usati dal player):**
  - `/Panopto/Pages/Transcription/GenerateSRT.ashx?id=…&language=…`: file SRT. Lo staff Panopto lo definisce non documentato ([community](https://community.panopto.com/discussion/comment/4734/)).
  - REST API `GET /Panopto/api/v1/sessions/{id}` → `CaptionDownloadUrl`: richiede un token OAuth dell'istituzione e un cookie di sessione ([community](https://community.panopto.com/discussion/comment/4732/)). Non adatta a un'estensione per studenti.

### Echo360 (verificato sulla sezione pubblica)

- **Nessun `<track>`** sul `<video>`.
- **Rete:** all'apertura della lezione il player chiama `GET https://echo360.org/api/ui/echoplayer/lessons/{lessonId}/medias/{mediaId}/transcript`.
  - **Con trascrizione** (lezione "Why Use Echo360 in Your Class?"): `{"status":"ok","data":{"isAutomated":true,"status":"Available","mediaId":…,"contentJSON":{"cues":[{"startMs":7940,"endMs":11240,"speaker":"Speaker 1","content":"today's instructors, more so than ever before, have the ability","confidence":{"average":98,…}},…]}}}`.
  - **Senza trascrizione:** `404 {"status":"ko","message":"Resource not found"}`.
- **DOM:** pannello Transcript a destra del player, con ricerca nel testo ([Monash](https://www.monash.edu/learning-teaching/teachhq/learning-technologies/echo360/how-to/use-captions-and-transcripts-in-echo360), [Echo360 support](https://support.echo360.com/hc/en-us/articles/360044576691)).
- **Download per lo studente:** link Download sotto il player, scheda Transcript, file VTT o TXT. Non c'è se la lezione non ha trascrizione, o se nei contenuti interattivi lo studente non ha ancora risposto ai sondaggi ([Echo360 support](https://support.echo360.com/hc/en-us/articles/11077027768333)). Il formato dei file è WebVTT ([Echo360 support](https://support.echo360.com/hc/en-us/articles/360038310392)).

## 2. Lettura da un content script, sessione e permessi

- **Nessun permesso nuovo.**
  - Il content script gira già in tutti i frame di tutti i siti (`<all_urls>`, `all_frames: true`), compreso l'iframe di Panopto o Echo360 dentro Canvas e Moodle.
  - Lo script nel MAIN world gira già solo sui domini di `LECTURE_PLATFORMS`.
  - Una `fetch` fatta dal frame della piattaforma verso lo stesso dominio è **same-origin**. Chrome: "Content scripts initiate requests on behalf of the web origin that the content script has been injected into" e sono "subject to the same origin policy" ([Chrome docs](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests)).
  - Il browser allega i cookie della sessione come per le chiamate del player. Verificato con `fetch` same-origin dalla pagina su entrambe le lezioni Panopto (Viewer ed Embed).
- **Niente dal service worker.** Lì servirebbero `host_permissions` su `*.panopto.com` ed `*.echo360.*` (richiesta di permesso nuova all'aggiornamento), e i cookie della sessione arriverebbero in modo incerto (terze parti, SameSite).
- **Modo più prudente: lettura passiva.**
  - Nel MAIN world (`content/main-world.js`, già presente) si legge la risposta che **il player ha già scaricato** (wrapper di `fetch`/XHR solo per quei 2–3 URL). Zero richieste in più.
  - Echo360 scarica la trascrizione da solo all'apertura.
  - Panopto scarica i sottotitoli da solo quando la lezione li ha (sul seminario vstream sì; su arizona, con `Language: null`, il player non li ha chiesti al caricamento).
  - Dove il player non li scarica, si fa **una** richiesta same-origin, solo quando lo studente apre la ricerca.
- **Non testato:** lezioni con login vero (Shibboleth/LTI) e iframe dentro un LMS reale. Più sotto i passi da fare a mano.

## 3. Tempi per frase

| | Campo | Precisione |
|---|---|---|
| Panopto, sottotitoli | `Time` in secondi (es. `2.71`) + `CaptionDuration` | Una voce per riga di sottotitolo, circa 2–5 s |
| Panopto, ricerca | `Time` in secondi per ogni risultato | Riga di sottotitolo |
| Echo360 | `startMs` / `endMs` | Una voce per riga, circa 3 s nell'esempio |

Per saltare al punto giusto basta `video.currentTime = Time`.
- Su Panopto la scrittura diretta di `currentTime` funziona (lo usano già segnalibri e A-B).
- Su Echo360 vale la guardia anti-reset (BUGS #23/#24): da provare, ma i segnalibri della 1.9.x già lo fanno.

## 4. Se il docente non ha attivato i sottotitoli

- **Panopto:**
  - Le "Automatic Machine Captions" servono soprattutto alla ricerca nel video e di default **non** vengono pubblicate come sottotitoli. Il testo resta nel database di Panopto per la ricerca ([Westminster](https://blog.westminster.ac.uk/blackboardhelp/panopto/), [Brown](https://ithelp.brown.edu/kb/articles/managing-automatic-captions-in-panopto)).
  - Il docente o l'admin le pubblica dalle impostazioni della cartella o della sessione ([SLU](https://ask.slu.edu/TDClient/30/Portal/KB/ArticleDet?ID=484)).
  - Almeno un'istituzione dichiara che dal 6 aprile 2026 i sottotitoli automatici vengono pubblicati di default sui nuovi video ([San Diego](https://www.sandiego.edu/its/documents/media/panopto_captions_knowledge_base.pdf)). È una nota di una sola università, non un annuncio Panopto.
  - **Da verificare:** se il `Search/Results.aspx` del player restituisce frasi dall'ASR **non pubblicato**. Sulle due lezioni pubbliche i sottotitoli c'erano, quindi non ho potuto distinguerlo. Se sì, la ricerca funzionerebbe anche senza sottotitoli.
  - Il testo ASR ha in genere un'accuratezza del 60–90% ([SLU](https://ask.slu.edu/TDClient/30/Portal/KB/ArticleDet?ID=484)).
- **Echo360:**
  - La trascrizione ASR esiste se l'istituzione e il corso hanno l'ASR attivo: interruttore per sezione del corso ([Stony Brook](https://it.stonybrook.edu/help/kb/disablingenabling-asr-transcriptions-for-a-course-in-echo360), [Wayne State](https://kb.wayne.edu/500236)).
  - Una guida dice che le trascrizioni sono "visible for all students in units, unless made unavailable" ([UTAS](https://www.utas.edu.au/mylo/staff/staff-resources/echo360/echo360-asr-transcripts)).
  - Nel JSON, `isAutomated: true` distingue l'ASR da una trascrizione rivista. Senza trascrizione l'endpoint dà 404 e serve il piano B.

## 5. Termini d'uso e limiti tecnici

- **Panopto**, [Acceptable Use Policy](https://www.panopto.com/acceptable-use-policy/) (aggiornata il 1° febbraio 2026). Vieta di:
  - "Use any automated system, such as "robots," "spiders," or "offline readers," to access the Panopto Services";
  - "Access User Content through any technology or means other than through the Panopto Services";
  - "…decompile, disassemble, reverse engineer, decode, adapt, or otherwise attempt to derive or gain access to any software component".
- **Echo360**, [End User Subscription Agreement](https://echo360.com/eula/) (aggiornato il 31 ottobre 2025). Uso "solely for Users' individual educational purposes". Vieta di:
  - "access the Subscription Services through any robot, spider, or other automated means" (4.1(j));
  - "conduct any systematic or automated data collection or storage activities (including without limitation scraping, data mining, data extraction and data harvesting)" (4.1(h));
  - "…reproduce, distribute, republish or download any part of the Subscription Services" (1.4).
- **Lettura dei rischi (non è un parere legale):**
  - Leggere nel browser dello studente, durante la visione, il testo che il player ha già mostrato, per un suo uso di studio, è vicino all'uso normale del servizio. Una ricerca locale non conserva né redistribuisce niente.
  - Diventano rischiosi:
    - richieste automatiche in serie (es. scaricare tutte le lezioni di un corso);
    - salvare le trascrizioni;
    - mandarle a un server.
  - L'EULA di Echo360 cita espressamente "data extraction" e "storage".
  - Prima di vendere la funzione: parere di un legale e, idealmente, una domanda diretta a Panopto ed Echo360.
- **Limiti tecnici:**
  - **CORS:** nessun problema dal frame della piattaforma (same-origin); bloccato da altri contesti.
  - **Token:** non serve nessun token OAuth: basta la sessione del browser. Panopto rinnova il cookie con `refreshAuthCookie=true`.
  - **Rate limit:** non ho trovato limiti pubblicati per gli endpoint del player. Gli endpoint non sono documentati e possono cambiare senza preavviso: servono un fallback e un test live in `tests/live`.

## 6. Piano B: Whisper

### Cattura dell'audio in MV3

1. Il service worker chiama `chrome.tabCapture.getMediaStreamId({ targetTabId })` (da Chrome 116).
2. Crea un documento offscreen con `reasons: ['USER_MEDIA']`.
3. Il documento offscreen apre lo stream con `getUserMedia({ audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId } } })`, registra con `MediaRecorder` e rimanda l'audio all'utente (`createMediaStreamSource(media).connect(output.destination)`), altrimenti la scheda diventa muta ([Chrome docs](https://developer.chrome.com/docs/extensions/how-to/web-platform/screen-capture)).

**Vincoli:**
- La cattura parte solo dopo un'azione dell'utente sull'estensione: "It can only be called after the user invokes an extension, such as by clicking the extension's action button" ([tabCapture](https://developer.chrome.com/docs/extensions/reference/api/tabCapture)).
- Registra **in tempo reale** quello che suona. Una lezione di 60 minuti a 2x richiede 30 minuti e produce audio accelerato: i tempi della trascrizione vanno moltiplicati per la velocità, e a velocità alta l'accuratezza scende (non misurato).

**Permessi nuovi:**
- `tabCapture`: avviso all'installazione o all'aggiornamento **"Read and change all your data on all websites"** ([permissions list](https://developer.chrome.com/docs/extensions/reference/permissions-list)). Chrome disattiva l'estensione aggiornata finché l'utente non accetta: rischio alto di perdere utenti. In alternativa si può dichiarare come `optional_permissions` e chiederlo solo a chi usa la funzione.
- `offscreen`: nessun avviso.

### Chrome Web Store e privacy

- Mandare audio o testo delle lezioni a un fornitore AI è un **trasferimento di dati a terzi**. Le regole [Limited Use](https://developer.chrome.com/docs/webstore/program-policies/limited-use) lo permettono solo "If necessary to providing or improving your single purpose". Servono:
  - una dichiarazione esplicita di conformità sul sito;
  - l'aggiornamento della scheda "Privacy" dello Store (contenuti del sito web).
- I contenuti raccolti automaticamente rientrano nelle stesse regole: "They also apply to scraped content or otherwise automatically gathered user data".
- **Cambia la promessa del prodotto.** `CLAUDE.md` e `privacy.html` dicono che l'unica richiesta di rete è la verifica della licenza. Andrebbero riscritti, con consenso esplicito prima del primo invio. In più:
  - le lezioni possono contenere le voci degli studenti (GDPR/FERPA);
  - alcune università vietano di dare le registrazioni a terzi.
- **Serve un backend:** la chiave API non può stare nell'estensione. Oggi non c'è nessun backend (solo Lemon Squeezy), quindi va costruito e mantenuto un proxy con autenticazione Pro e limiti d'uso.

### Prezzi delle API di trascrizione OpenAI

Fonte: [pagina prezzi ufficiale](https://developers.openai.com/api/docs/pricing), letta il 2026-11-19.

| Modello | Prezzo | Lezione da 60 min |
|---|---|---|
| Whisper | $0.006 / minuto | $0.36 |
| gpt-4o-transcribe | $0.006 / minuto (stima) | $0.36 |
| gpt-transcribe | $0.0045 / minuto | $0.27 |
| gpt-4o-mini-transcribe | $0.003 / minuto (stima) | $0.18 |

Con il Pro a $4.99 l'anno, già 15–25 lezioni trascritte in un anno costano quanto l'abbonamento: per Whisper ci vorrebbe un limite d'uso o un prezzo a parte. Un'alternativa senza rete è Whisper in locale (WASM). Non l'ho valutata: modelli pesanti, da includere nel pacchetto perché MV3 vieta il codice remoto.

## 7. Costo dei riassunti sul testo dei sottotitoli

**Ipotesi:** lezione di 60 minuti a 157–166 parole al minuto (Murphy et al. 2022, Tabella 1), quindi circa 10.000 parole, circa 13.000 token. Con i tempi compattati (`[12:04] testo`) e il prompt: **circa 15.000 token in ingresso**. Riassunto con capitoli: **circa 1.000 token in uscita** (fino a 3.000 per i modelli che "ragionano", perché il ragionamento si paga come output).

| Modello economico | Prezzo (input / output per 1M token) | Costo per lezione |
|---|---|---|
| OpenAI gpt-5-nano | $0.05 / $0.40 ([OpenAI](https://developers.openai.com/api/docs/pricing)) | ~$0.001 (fino a ~$0.002 con 3k di output) |
| OpenAI gpt-4o-mini | $0.15 / $0.60 ([OpenAI](https://developers.openai.com/api/docs/pricing)) | ~$0.003 |
| Claude Haiku 5.5 (prompt sotto 100k token) | $0.10 / $0.50 ([Anthropic](https://platform.claude.com/docs/en/about-claude/pricing)) | ~$0.002 |
| OpenAI gpt-5-mini | $0.25 / $2.00 ([OpenAI](https://developers.openai.com/api/docs/pricing)) | ~$0.006 |

Calcolo per gpt-5-nano: 15.000 × $0.05/1M + 1.000 × $0.40/1M = $0.00075 + $0.0004 ≈ $0.0012.

**Ordine di grandezza:** riassumere 100 lezioni costa da 0,10 a 0,60 dollari, contro circa 18–36 dollari per trascriverle con Whisper. Il costo dell'AI sul testo esistente è trascurabile; il costo vero è il backend e la privacy.

**Nota:** nella risposta `Delivery` di Panopto ci sono già i campi `AISummary`, `AIChapters` e `AIKeyPoints` (vuoti su entrambe le lezioni pubbliche). Panopto ha o prepara riassunti AI propri: dove l'università li attiva, un nostro riassunto vale meno, e conviene mostrare i loro.

## Cosa è fattibile subito (senza backend, senza permessi nuovi)

1. **Ricerca nella lezione, tutta in locale (Pro):**
   - Panopto: sottotitoli da `DeliveryInfo.aspx` (passivi, oppure una richiesta same-origin quando lo studente apre la ricerca).
   - Echo360: trascrizione da `/transcript` (passiva).
   - Ricerca nel popup o in un pannello, clic sul risultato → `currentTime`.
   - Nessun dato lascia il browser: la promessa di privacy resta intatta.
2. **Capitoli e segnalibri automatici dai `Timestamps` di Panopto** (indice delle slide), già presenti nella risposta.
3. **Esporta la trascrizione con i segnalibri** (testo locale) per lo studio: da valutare con i termini d'uso ("download").

Rinviati alla 2.x: riassunti AI (backend + consenso + nuova privacy policy) e Whisper (permesso `tabCapture`, costo, privacy).

## Rischi

| Rischio | Gravità | Mitigazione |
|---|---|---|
| Endpoint non documentati che cambiano | Media | Lettura passiva + fallback sul DOM (Viewer Panopto, pannello Echo360); test in `tests/live` |
| Termini d'uso (automazione, estrazione) | Media–alta se si salva o si invia | Solo su azione dello studente, una lezione alla volta, niente salvataggio, niente server; parere legale prima del lancio |
| Lezioni senza sottotitoli né ASR | Media (frequenza ignota) | Messaggio chiaro; piano B solo dopo aver misurato quante sono |
| Privacy e Store per l'AI | Alta | Consenso esplicito, dichiarazione Limited Use, privacy policy nuova, backend senza log dei contenuti |
| `tabCapture` (avviso "all your data") | Alta | Solo come `optional_permissions`, chiesto a chi usa Whisper |
| Panopto con AI propria (`AISummary`) | Media (prodotto) | Puntare su ricerca + salto + velocità, non sul riassunto |

## Da fare a mano (Alex, con una lezione reale con login)

Serve per i punti che le lezioni pubbliche non coprono: login vero, iframe nell'LMS, ASR non pubblicato.

1. Apri una lezione Panopto del tuo corso **dentro Canvas o Moodle**, possibilmente **senza** sottotitoli visibili.
2. DevTools (F12) → scheda **Network** (Rete) → filtro `DeliveryInfo`. Ricarica la pagina.
3. Copiami, **senza il testo della lezione**:
   - il dominio della richiesta (es. `xxx.hosted.panopto.com`) e se parte dall'iframe;
   - dalla prima risposta: i valori di `HasCaptions` e `AvailableCaptions`, e se `AISummary`/`AIChapters` sono `null`;
   - se esiste una seconda richiesta con `getCaptions=true`: lo stato (200?) e il **numero** di voci.
4. Nel player cerca una parola che il docente ha sicuramente detto: c'è una richiesta `Search/Results.aspx`? Quanti risultati, e con quale `EventTargetType`?
5. Ripeti per Echo360 dentro l'LMS: filtro `transcript`. Mi servono lo stato (200 o 404) e il valore di `isAutomated`.
