# Divario di versioni: Store 1.5.1.8 → locale 1.8.2

Data: 2026-11-13. Fonti: `git log` (21 commit dal baseline `51cb7a3`, tutti dell'11 novembre 2026), `docs/ROADMAP_IMPL.md`, `docs/BUGS.md`, confronto tra lo zip pubblicato (`_archive/release/SpeedUp_Video_Pro_v1.5.1.8.zip`) e la build attuale (`dist/`). Non esiste un CHANGELOG.

**Decisione presa (2026-11-13): la 1.8.2 non si pubblica finché non è allineata al nuovo modello (study tool, 16x gratis, abbonamento annuale).**

---

## 1. Cosa è cambiato tra 1.5.1.8 e 1.8.2

### In una frase
L'estensione è stata **riscritta da zero**: da JavaScript scritto a mano (11 file) a TypeScript con build (esbuild), 104 test unitari, 44 test E2E, CI su GitHub. Il pacchetto passa da 11 a 25 file.

### Versioni intermedie (mai inviate allo Store)

| Versione | Contenuto |
|---|---|
| 1.6.0 | Parità con i concorrenti (Fase 1): content script riscritto, overlay sul video, pagina Opzioni |
| 1.7.0 | Funzioni Pro (Fase 2) |
| 1.8.0 | Licenza verificata dal server, onboarding, sync, 7 lingue, build Firefox (Fase 3) |
| 1.8.1 | Prestazioni e qualità (Fase 4), fix Netflix |
| 1.8.2 | Rispetto delle scorciatoie native di YouTube, accesso ai siti su Firefox |

### Nuove funzioni gratuite
- Velocità free da **0.25x–2x** a **0.1x–4x**.
- Scorciatoie compatibili con Video Speed Controller (S D R G Z X V), **personalizzabili** con modificatori, disattivabili per sito.
- Salto avanti/indietro di N secondi (sicuro anche sulle dirette).
- Overlay trascinabile sul video (anche a schermo intero), posizione salvata per sito.
- Velocità mantenuta durante pubblicità, cambi di qualità, playlist, navigazione nelle SPA, sostituzione del `<video>`; il menu velocità nativo del player è rispettato.
- Video, audio, Shadow DOM aperti, iframe.
- Statistica "tempo risparmiato questa settimana".
- Pagina Opzioni, pagina di benvenuto con demo, 7 lingue, sincronizzazione delle impostazioni tra dispositivi, export/import, import da Video Speed Controller.

### Nuove funzioni Pro
Salto dei silenzi, regole di velocità per canale YouTube / URL / sito, pubblicità YouTube a 16x senza audio (vedi §4.1), velocità finché tieni premuto (Shift+F), loop A-B, frame per frame, segnalibri per video, statistiche dettagliate (oggi / settimana / totale / pagina).

### Fix importanti
- **Licenza aggirabile** (BUGS #1–#3): nella 1.5.1.8 qualsiasi chiave di almeno 4 caratteri (o con formato `PRO-*`, `TRIAL-*`, UUID) attivava il Pro. Ora la chiave viene verificata dal server.
- **Google Analytics rimosso** dall'estensione (BUGS #4): inviava il dominio visitato con un `api_secret` in chiaro, in contraddizione con "zero tracking".
- Menu velocità nativo di YouTube rotto, velocità propagata a tutte le schede, observer costoso su pagine pesanti, errore Netflix M7375 (niente più scrittura diretta di `currentTime` su Netflix), scorciatoie native di YouTube annullate.

### Permessi nel manifest

| | 1.5.1.8 (online) | 1.8.2 (locale) |
|---|---|---|
| `storage`, `activeTab` | sì | sì |
| `tabs` | sì | **tolto** |
| `alarms` | no | **aggiunto** (controllo licenza 1 volta al giorno) |
| `host_permissions` | `<all_urls>` (tutti i siti) | solo `x2-speedup.vercel.app` e `api.lemonsqueezy.com` |
| Content script | `<all_urls>`, `all_frames` | uguale + `match_about_blank`, `match_origin_as_fallback` (iframe vuoti / blob) |
| `options_ui`, `web_accessible_resources` (`pro/*.js`) | no | sì |
| `default_locale` / testi tradotti | no (italiano fisso) | sì (en predefinito) |

Gli avvisi mostrati all'utente non aumentano: "leggere e modificare i dati su tutti i siti" c'era già (per il content script). Gli utenti attuali **non** dovranno riapprovare permessi all'aggiornamento.

---

## 2. Indizi di versioni inviate e rifiutate

**Nessuno.** Nessuna nota in `docs/`, nessun commit o messaggio con "rejected", "violation", "rifiutato", "respinto".

Unica cosa curiosa: il 7 novembre gli zip 1.5.1.5, 1.5.1.6, 1.5.1.7 e 1.5.1.8 sono stati creati nel giro di 40 minuti (19:12–19:49), con date non in ordine di versione. Sembrano ricompilazioni rapide, non rifiuti. Conferma definitiva: cronologia degli invii nel Chrome Developer Dashboard.

---

## 3. Come funziona oggi Free/Pro (codice 1.8.2)

| Cosa | File |
|---|---|
| Limiti e funzioni per piano (free 0.1x–4x, Pro fino a 16x, 10 funzioni con flag free/Pro) | `src/config/plans.ts` |
| Unico punto che decide "è Pro?": `isPro()` e `can(feature)` | `src/shared/entitlement.ts` |
| Modello e regole della licenza (stati, tolleranza, interpretazione delle risposte dei server) | `src/shared/license.ts` |
| Chiamate di rete, allarme giornaliero, attivazione/rimozione della chiave | `src/background/license.ts` |
| Testi di upsell e trial | `src/_locales/*.json` (`unlock_title`, `upsell_*`, `cta_start_trial`, `onb_trial_*`…) |

- **Verifica:** prima `https://x2-speedup.vercel.app/api/validate-license` (endpoint tuo), poi `https://api.lemonsqueezy.com/v1/licenses/validate` come seconda opinione. La chiave è valida se **uno dei due** la conferma. Si invia solo la chiave.
- **Frequenza:** al massimo una volta al giorno (allarme orario + controllo "è passato un giorno?"), più all'avvio e all'attivazione.
- **Tolleranza:** se i server non rispondono (rete assente, 5xx, 404, 429, timeout) il Pro resta attivo fino a 1 + 7 giorni dall'ultima conferma. Solo una risposta esplicita ("scaduta", "disattivata", "non valida") toglie il Pro.
- **Trial:** non è nel codice. La gestisce Lemon Squeezy al checkout ($0 oggi): la chiave arriva subito; se la prova viene annullata o finisce, il server risponde "scaduta".
- **Prezzo:** non compare nel codice dell'estensione. Il "$1.99" sta nella landing, in `docs/STORE_LISTING.md` e nel prodotto Lemon Squeezy.
- **Limiti noti, accettati:** stato della licenza in `chrome.storage` non firmato (chi lo modifica a mano può fingersi Pro); nessun limite di dispositivi per chiave.
- **Schema delle risposte di `/api/validate-license`:** non è nel repo; il codice accetta `status: valid`, `valid: true`, `is_valid: true` e parole di stato comuni.

---

## 4. La 1.8.2 è pronta? Rischi

**Tecnicamente sì, commercialmente no.**

A favore: 104 test unitari e 44 E2E verdi, build pulita, meno permessi, nessun nuovo avviso per gli utenti, fix della licenza aggirabile e rimozione del tracciamento.

Contro, in ordine di gravità:

1. **Modello commerciale sbagliato.** La 1.8.2 mette il 16x a pagamento ("Unlock speeds up to 16x with Pro"), lascia gratis le scorciatoie personalizzabili e vende pubblicità YouTube e hold-to-speed come Pro. È il modello appena abbandonato: pubblicarla vorrebbe dire rifare testi, scheda Store e prezzi subito dopo.
2. **Funzione "pubblicità YouTube a 16x"**: rischio per la revisione e fuori posizionamento. Vedi §4.1.
3. **QA limitata.** Tutto il lavoro 1.6–1.8.2 è stato fatto in un giorno e verificato solo con test automatici + 4 scenari reali su YouTube. Da fare a mano (`docs/QA.md`): Netflix, Prime Video, Spotify, Twitch, Vimeo, Udemy, Coursera, Edge, Firefox. **Panopto, Echo360, Canvas e Moodle non sono mai stati provati**, ma sono il nuovo target.
4. **Revisione approfondita probabile:** il content script gira su tutti i siti e in tutti i frame. Valeva già per la 1.5.1.8, quindi non è un peggioramento, ma la revisione può durare più giorni. Le giustificazioni dei permessi sono pronte (`docs/ROADMAP_IMPL.md`, "Permessi finali").
5. **Utenti esistenti:** chi usa una chiave falsa torna a Free; le scorciatoie predefinite passano da `[`/`]` a S/D (con migrazione che conserva quelle personalizzate). Con 6 utenti attivi l'impatto è minimo.
6. **Traduzioni** (ja, de, pt_BR) non riviste da madrelingua.
7. **Landing:** GA4 e Clarity partono senza banner di consenso (problema per i visitatori UE).

### 4.1 La funzione "pubblicità YouTube a 16x"

**Cos'è.** Modulo Pro `src/pro/youtube-ads.ts`, disattivato di default. Quando è acceso guarda il player di YouTube: se il player ha la classe `ad-showing` o `ad-interrupting` (cioè sta mostrando una pubblicità), mette il video **a 16x e senza audio**; alla fine della pubblicità rimette la tua velocità e il tuo volume. Non blocca e non salta la pubblicità: la fa scorrere velocissima e muta. Nella scheda Store (`docs/STORE_LISTING.md`) è elencata come "YouTube ads at 16x and muted".

**Perché è un rischio.**
- **Termini di YouTube:** vietano di interferire con la riproduzione delle pubblicità. Una funzione a pagamento che lo fa, ed è scritta nella scheda Store, è proprio il tipo di cosa che un revisore o un reclamo di Google può contestare. Non ho trovato una regola dello Store che la vieti esplicitamente (gli ad blocker sono ammessi), quindi è un **rischio**, non un rifiuto certo.
- **Fragilità:** YouTube cambia spesso il codice del player e combatte questi strumenti (avvisi anti-adblock, rilevamento). Il giorno che cambia le classi, la funzione smette di funzionare e un cliente pagante se ne accorge.
- **Fuori posizionamento:** Panopto, Echo360, Canvas e Moodle non hanno pubblicità. Per uno strumento di studio non aggiunge valore e nel nuovo elenco Pro non c'è.

**Cosa consiglio.** **Toglierla**: dal piano Pro, dalla UI, dalle opzioni, dai testi e dalla scheda Store. Il codice resta nella storia di git se un giorno servisse. In alternativa (meno consigliata) lasciarla nascosta e disattivata, ma è codice da mantenere che non porta nulla.

**Hold-to-speed** (velocità finché tieni premuto Shift+F) non è nel nuovo elenco Pro, ma non ha rischi: essendo "velocità", consiglio di renderla **gratuita**.

---

## 5. Documentazione aggiornata (compito 2, commit `467431c`)

- `CLAUDE.md` (root): sezioni Product, Free vs Pro, Target platforms; regole tecniche nuove (gate Pro in UI e content script, mai bloccare chi ha pagato, player in iframe e anti-loop `ratechange`, verifica CORS prima del salto dei silenzi su Panopto/Echo360); regole di lavoro (piano prima dei task su più di 2 file, mai cancellare, spiegare git). Commands, Map, Stack invariati.
- `docs/CLAUDE_PROJECT_CONTEXT.md`: stesso posizionamento, abbonamento annuale, decisioni aperte; corretto lo stato del push (la 1.8.2 è già su GitHub).
- `landing-page/CLAUDE.md` (nuovo): adattato alla realtà (HTML statico + Tailwind CDN + GA4/Clarity/`lemon.js`, anteprima con `python3 -m http.server`, nessuna build).
- In tutti e due i `CLAUDE.md` c'è l'avviso: **il codice implementa ancora il modello vecchio**.

---

## 6. Da verificare a mano

- Developer Dashboard: cronologia degli invii (conferma §2).
- GitHub → Actions: esito della CI sulla 1.8.2.
- Vercel: da quale repo, cartella (Root Directory) e branch viene pubblicato `x2-speedup.vercel.app`, e dove vive `/api/validate-license`.
