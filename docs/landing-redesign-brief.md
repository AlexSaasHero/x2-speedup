# Brief: redesign della landing, obiettivo 10/10

> Da far leggere a Claude Code all'inizio della sessione. Branch: `landing-rebrand`. Nessun push su `main`.
> Le regole di `docs/landing-contesto.md` restano valide: solo promesse vere, niente keyword stuffing, nessun marchio di terzi nel nome o nei loghi, mobile first.

---

## 1. Il problema della landing attuale
È corretta ma **asettica**: sfondo scuro generico, card tutte uguali, nessun momento memorabile, nessuna prova che il prodotto funzioni. Sembra uno dei mille template SaaS. Uno studente che arriva da Reddit non capisce in 3 secondi perché dovrebbe installarla **e non prova niente**.

## 2. Cosa ho imparato dalle landing di prodotti simili

**Mindgrasp** (strumento di studio con AI, oltre 5M studenti):
- Hero orientato al risultato emotivo ("Study smarter. Remember more. Stress less"), CTA che ripete la parola "Free".
- **Sezione problema** con frasi in prima persona dello studente ("It's midnight, I'm confused…") prima di presentare la soluzione.
- **"The old way vs the new way"** in due colonne.
- Passi del "come funziona" numerati perché sono davvero una sequenza.
- Prova sociale massiccia (numeri, loghi di università, TikTok, recensioni).
- Debolezza: alcune recensioni ripetute e loghi di università senza chiarire il rapporto. **Noi non faremo nessuna delle due cose.**

**Speechify** (ascolto fino a 4.5x):
- Il beneficio è espresso come **tempo restituito** ("save up to 9 hours a week"), non come funzione tecnica.
- Velocità resa concreta con un numero ("900 wpm").

**Cosa adottiamo:**
1. Beneficio = **tempo restituito**, reso personale con un calcolatore.
2. **Sezione problema** con il dolore preciso del nostro target: il player che si ferma a 2x.
3. **Vecchio modo / nuovo modo**, ma su un caso concreto (una lezione da 75 minuti), non come elenco generico.
4. **Prova invece di promessa:** il visitatore deve poter *provare* la velocità sulla pagina.

**Cosa NON adottiamo:**
- Recensioni, numeri di utenti o loghi di università che non abbiamo. **Mai inventarli.** Oggi non abbiamo prova sociale: la sostituiamo con la demo interattiva, la trasparenza (privacy, sviluppatore indipendente, rimborso) e, se verificata, una fonte di ricerca.

---

## 3. L'idea centrale (l'unico elemento memorabile)
**"La lezione che si accorcia."** L'hero non è un'illustrazione: è una **lezione dimostrativa interattiva**.
- Un riquadro tipo browser con una "lezione" originale: slide animate fatte in HTML/CSS (titolo tipo "Intro to Statistics – Lecture 4", un grafico che si disegna, sottotitoli che scorrono). **Nessun video di terzi, nessun logo di piattaforme.**
- Sotto, la barra del tempo della lezione con la durata grande: **1:15:00**.
- Pulsanti di velocità **1x · 1.5x · 2x · 2.5x · 3x** (o uno slider). Quando l'utente cambia velocità:
  - le slide e i sottotitoli avanzano davvero più veloci;
  - la durata si accorcia con un'animazione dei numeri (1:15:00 → 30:00 a 2.5x);
  - compare il badge della velocità come nell'estensione vera.
- A partire da 2.5x, un'etichetta discreta: "Your lecture player stops here at 2x. This doesn't."
- È l'unico punto con animazione "importante". Il resto della pagina è calmo.
- Rispetta `prefers-reduced-motion`: niente animazioni automatiche, solo il cambio dei numeri.

## 4. Direzione visiva
Riferimento: il mondo di chi studia, non quello SaaS. **Evidenziatore, carta millimetrata leggera, l'aula buia col proiettore acceso.**

**Palette:**
| Nome | Hex | Uso |
|---|---|---|
| Ink | `#1B1E3C` | Testo, sezioni scure ("l'aula") |
| Paper | `#F5F7FB` | Sfondo principale (bianco freddo, **non** crema) |
| Highlighter | `#FFE14D` | Accento: CTA principale, badge velocità, tempo risparmiato |
| Timeline | `#3D5AFE` | Barre del tempo, link, stati attivi |
| Graphite | `#5A6278` | Testo secondario |
| Saved | `#14A870` | Solo per i numeri di tempo risparmiato |

**Tipografia:**
- Titoli: **Bricolage Grotesque** (carattere deciso, un po' irregolare, lontano dal tech freddo). Titoli grandi, interlinea stretta, peso 700–800.
- Testo: **Atkinson Hyperlegible** (nata per la massima leggibilità, coerente con un prodotto per lo studio).
- Numeri dei tempi: cifre tabellari (`font-variant-numeric: tabular-nums`) così non saltano durante l'animazione.
- Scala: 14 / 16 / 18 / 24 / 32 / 48 / 72 px. Righe di testo sotto gli 80 caratteri.
- Font da Google Fonts con `display=swap`, solo i pesi usati.

**Da evitare** (sono i segni tipici di una pagina generata):
- una parola sola evidenziata o colorata nel titolo;
- etichette in maiuscolo sopra ogni sezione;
- card tutte uguali con lo stesso arrotondamento e la stessa ombra;
- sfumature decorative;
- frecce "→" alla fine di ogni bottone;
- numerazione 01/02/03 su contenuti che non sono una sequenza;
- animazioni di entrata su ogni sezione.

**Motivi visivi ricorrenti (usati con parsimonia):**
- La **barra del tempo** di un player come elemento grafico: divisori tra sezioni, barra di progresso nei passi.
- Il **segno dell'evidenziatore** (giallo, leggermente inclinato, bordi irregolari) dietro **un numero**, mai dietro le parole di un titolo.
- Sfondo carta millimetrata appena visibile solo nell'area della demo.

## 5. Struttura della pagina e testi (in inglese)

**Nav:** wordmark `[BRAND]`, link "How it works", "Pricing", "FAQ", bottone "Add to Chrome".

**1. Hero (con la demo del punto 3)**
- H1: **"Your 75-minute lecture. Done in 30."**
- Sottotitolo: "A free Chrome extension that lets you watch recorded lectures past the 2x limit, on Panopto, Echo360 and most video players. Then helps you review what matters."
- CTA: **"Add to Chrome, it's free"**
- Sotto il CTA: "Works in Chrome and Edge. No account needed."
- Mobile: resta il blocco "Chrome extensions install on desktop" + "Copy link" (già esistente in `site.js`/`site.css`).

**2. Il problema: il muro dei 2x** (sezione scura "aula")
- H2: "Your lecture player stops at 2x. Your exam doesn't wait."
- Testo breve con la situazione reale: 5 corsi, 3 ore di registrazioni a settimana, la sessione d'esame che si avvicina, il menu della velocità del player bloccato a 2x.
- Visivo: un menu velocità stilizzato (generico, non di Panopto) che finisce a 2x, accanto al controllo dell'estensione che continua.

**3. Calcolatore: "How much time would you get back?"**
- Input: ore di lezioni registrate a settimana (slider 1–20, default 6), velocità (1.5x–3x, default 2x).
- Output grande: **"About 54 hours back this semester"** (settimane del semestre: 15, scritto in piccolo). Formula: `ore × (1 − 1/velocità) × 15`.
- Numero in Saved green, con il segno dell'evidenziatore dietro.
- CTA ripetuto sotto: "Add to Chrome, it's free".

**4. Come funziona** (sequenza vera: numerata)
1. "Add it to Chrome." In un clic, nessun account.
2. "Open any lecture recording." Panopto, Echo360, anche dentro Canvas o Moodle.
3. "Press D to go faster, S to slow down." Oppure usa il popup.
- Visivo: la barra del tempo che si riempie attraverso i 3 passi.

**5. Ripassa, non solo accelera** (funzioni Pro)
- H2: "Built for the week before the exam."
- Layout **non a card uguali**: una funzione grande con un mini mock-up dell'interfaccia (Checkpoints con note), poi le altre in una griglia asimmetrica, ognuna con una piccola illustrazione dell'interfaccia vera:
  - **Checkpoints with notes:** "Bookmark the moment the professor says 'this will be on the exam'. Jump back in one click."
  - **Frame-by-frame:** "Freeze on the exact slide, formula or whiteboard sketch."
  - **A-B loop:** "Replay the explanation that didn't click until it does."
  - **Remembers your speed:** "Set 2.5x once. Every lecture on that site starts there."
  - **Your study stats:** "See the hours you saved today, this week and all term."
  - **Custom shortcuts:** "Your keys, your way."

**6. Prima / dopo, su un caso concreto**
- Due colonne: "A week of lectures, the old way" / "With [BRAND]".
- Esempio: 6 ore di registrazioni → a 2x con il player = 3 ore; a 2.5x con [BRAND] = 2 ore e 24 minuti, più i checkpoint pronti per il ripasso.

**7. Dove funziona** (in prosa, niente elenchi di marchi)
- "Works on Panopto and Echo360, including lectures embedded in Canvas or Moodle. It also works on YouTube and most other HTML5 video players."
- Nessun logo di terzi. Al massimo un'icona generica di un player.

**8. Fonte di ricerca (solo se verificata)**
- Uno studio della UCLA (Murphy et al., "Learning in double time", *Applied Cognitive Psychology*, 2021) sostiene che guardare lezioni fino a 2x non riduce in modo significativo la comprensione. **Prima di pubblicarlo verifica che lo studio esista e cosa dice esattamente**, con link alla fonte. Se non lo trovi o dice altro, togli la sezione.
- Formulazione onesta: "Research suggests that watching lectures at up to 2x doesn't hurt comprehension. Above that, slow down for the hard parts: that's what checkpoints and A-B loop are for."

**9. Prezzi**
- Due colonne affiancate, Free e Pro, con Pro leggermente più in evidenza (non uguali).
- Free: "$0, forever". Velocità da 0.1x a 16x (no 2x cap on lecture players), scorciatoie, contatore del tempo risparmiato.
- Pro: "$4.99 a year". Sotto: "That's about 42 cents a month." 7 giorni gratis, si disdice quando vuoi, rimborso entro 14 giorni.
- Il bottone Pro usa il sistema esistente `data-pro-cta` (oggi "Pro launching soon").

**10. Fiducia**
- Tre punti in prosa breve, non card:
  - "No account. No tracking." L'estensione non invia cosa guardi; l'unica richiesta di rete è la verifica della licenza Pro.
  - "Made by an independent developer." Una riga personale e onesta, per esempio: "I built [BRAND] because I was tired of my lecture player stopping at 2x."
  - "14-day refunds, no questions."

**11. FAQ** (con dati strutturati FAQPage)
- Does it work on my university's lecture platform?
- Why does the player still show 1x?
- Is it allowed to speed up lectures? (È una funzione del browser sul proprio computer, come la velocità di YouTube. Nessuna modifica alla piattaforma.)
- Can I understand anything at 3x? (Onesto: dipende dalla lezione; usa 1.5–2x per gli argomenti difficili.)
- Do you collect my data?
- How do I activate Pro? / Can I cancel?

**12. CTA finale**
- H2: "Your next lecture is already waiting."
- CTA: "Add to Chrome, it's free". Mobile: blocco "Copy link".

**Footer:** link a Privacy, Terms, contatti, disclaimer generico già esistente.

## 6. Requisiti tecnici
- Tailwind compilato (già pianificato), niente CDN. Il CSS della demo può essere scritto a mano.
- JS della demo e del calcolatore: vanilla, leggero, senza librerie.
- Prestazioni: LCP sotto 2.5 s su mobile; immagini WebP con `width`/`height`; font precaricati.
- Accessibilità: contrasto WCAG AA (attenzione al giallo: **mai testo bianco su giallo**, usa Ink su Highlighter), focus visibile, i controlli della demo usabili da tastiera, `aria-live` sulla durata che cambia.
- Mantieni: `site.js` (interruttore Pro, rilevamento mobile, Copy link), Vercel Web Analytics, meta e Open Graph già pianificati, `thanks.html`, `privacy.html`, `terms.html` con lo stesso stile.

---

## 7. Il ciclo di miglioramento: da 6/10 a 10/10

**Regola:** dopo ogni versione assumi che la pagina sia un **6/10** e trova cosa la tiene lì. Non ti fermi finché **ogni** criterio non è almeno 9 per **tutti e tre** i revisori.

**Ad ogni giro:**
1. Screenshot a **390 px** e a **1280 px**, pagina intera e prima schermata.
2. Valuta la pagina con **tre revisori**, uno alla volta, ciascuno severo:
   - **Lo studente scettico:** arriva da Reddit sul telefono, ha 5 secondi e diffida di tutto ciò che sembra pubblicità.
   - **L'esperto di conversione (CRO):** guarda chiarezza dell'offerta, attrito, gerarchia dei CTA, obiezioni non risolte.
   - **Il direttore artistico:** guarda originalità, tipografia, ritmo, coerenza, "sembra un template?".
3. Ogni revisore dà un voto da 1 a 10 su questi criteri:

| # | Criterio | Domanda |
|---|---|---|
| 1 | Chiarezza in 5 s | Dalla prima schermata capisco cosa fa, per chi è e cosa devo fare? |
| 2 | Prova | Vedo il prodotto funzionare invece di leggere una promessa? |
| 3 | Desiderio | Mi viene voglia di installarlo subito? |
| 4 | Obiezioni | Le mie paure (privacy, "è permesso?", "funziona sulla mia piattaforma?", costo) trovano risposta prima che me le chieda? |
| 5 | Fiducia | Mi fido di chi l'ha fatto? C'è qualcosa che sembra falso o esagerato? |
| 6 | Pro | Capisco cosa aggiunge il Pro e perché vale $4.99 l'anno? |
| 7 | Identità visiva | È riconoscibile e diversa da un template? Esiste un elemento memorabile? |
| 8 | Tipografia e ritmo | Gerarchia chiara, spazi coerenti, righe leggibili? |
| 9 | Mobile | Sul telefono è altrettanto bella e chiara, senza scroll orizzontale? |
| 10 | Prestazioni e accessibilità | Veloce, contrasti AA, tastiera, reduced motion? |

4. Scrivi in `docs/LANDING_ITERATIONS.md`:
   - il numero del giro, i voti dei tre revisori, la media;
   - **le 5 modifiche con più impatto**, in ordine;
   - cosa hai provato e scartato (per non ripeterlo).
5. Applica le 5 modifiche, fai un commit `landing: iteration N`, poi ricomincia dal punto 1.

**Quando fermarsi:** tutti i criteri ≥ 9 per tutti e tre i revisori, **e** a un giro di "occhi freschi" (rileggi la pagina come se fosse di un concorrente) non trovi più niente di importante. Minimo 3 giri, massimo 8.

**Regole durante il ciclo:**
- Ogni modifica deve migliorare un criterio preciso: niente decorazioni aggiunte "perché sì".
- Prima di aggiungere qualcosa, chiediti cosa togliere (consiglio di Chanel: prima di uscire, togli un accessorio).
- Mai inventare recensioni, numeri di utenti, loghi o citazioni.
- Se un criterio resta sotto 9 per mancanza di qualcosa che non puoi creare (es. recensioni vere), scrivilo e indica come ottenerlo.

**Ferma il lavoro e mostrami i risultati:**
- dopo il **piano di design** (palette, font, wireframe ASCII di hero e calcolatore), **prima di scrivere codice**;
- dopo il **giro 1**, con gli screenshot;
- alla **fine**, con gli screenshot finali e la tabella dei voti.
