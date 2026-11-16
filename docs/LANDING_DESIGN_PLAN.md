# Piano di design della landing (redesign, branch `landing-rebrand`)

Base: `docs/landing-redesign-brief.md` + regole di `docs/landing-contesto.md`. Stato: **da approvare**, nessun codice scritto.
Data: 2026-11-16.

## 1. Palette

Valori del brief, verificati per il contrasto WCAG. Due correzioni necessarie (marcate ✱).

| Token | Hex | Uso | Contrasto |
|---|---|---|---|
| `ink` | `#1B1E3C` | Testo principale; sfondo delle sezioni scure ("aula") | 15.1 su paper |
| `paper` | `#F5F7FB` | Sfondo principale; testo sulle sezioni ink | 15.1 su ink |
| `highlighter` | `#FFE14D` | CTA principale (testo **ink**), badge velocità, segno dietro i numeri | ink su giallo 12.4 |
| `timeline` | `#3D5AFE` | Barre del tempo, link, stato attivo, focus su paper | 4.8 su paper ✅ |
| `timeline-light` ✱ | `#8C9EFF` | Link, focus e barre **sulle sezioni ink** | 6.5 su ink (il `#3D5AFE` lì fa 3.2 ❌) |
| `graphite` | `#5A6278` | Testo secondario su paper | 5.7 su paper ✅ (su ink 2.7 ❌: lì si usa `mist`) |
| `mist` ✱ | `#B4BAD0` | Testo secondario sulle sezioni ink | 8.4 su ink |
| `saved` | `#14A870` | Numeri di tempo risparmiato **su ink**, riempimenti, icone | 5.3 su ink; **2.9 su paper ❌** |
| `saved-ink` ✱ | `#0B7A50` | Numeri di tempo risparmiato **su paper** | 5.0 su paper ✅ |

Regole: mai testo bianco o paper sul giallo; il giallo non si usa per testo su paper (contrasto troppo basso). Le card su paper hanno bordo `ink/10` e niente ombra; l'unica ombra della pagina è quella del riquadro della demo.

## 2. Font

- **Titoli:** Bricolage Grotesque, pesi 700 e 800. **Testo:** Atkinson Hyperlegible, 400 e 700.
- **Self-hosted** in `landing-page/fonts/` (woff2, sottoinsieme latino; entrambi con licenza OFL) **invece di Google Fonts**. Motivi: con Google Fonts ogni visita invia l'IP del visitatore a Google, cosa che va dichiarata in privacy e contraddice il "no tracking"; in più self-hosted = una connessione in meno → LCP migliore. `<link rel="preload">` solo per Bricolage 800 (titolo dell'hero) e Atkinson 400; `font-display: swap`.
- Bricolage Grotesque è un font variabile: un solo file per 700–800 se il sottoinsieme resta leggero; altrimenti due file statici. Stima totale: circa 90–120 KB.
- Numeri dei tempi: `font-variant-numeric: tabular-nums` (Atkinson ha cifre tabellari; per i numeri grandi in Bricolage verifico che le abbia, altrimenti uso Atkinson 700 per i numeri).
- Scala: 14 / 16 / 18 / 24 / 32 / 48 / 72 px (mobile: H1 40 px, H2 30 px). Testo base 18 px su desktop, 16 su mobile. Righe ≤ 70 caratteri (`max-w-[65ch]`).
- Titoli: interlinea 1.02–1.1, `letter-spacing: -0.02em`. Niente maiuscoletto sopra le sezioni.

## 3. Ritmo della pagina

Alternanza paper / ink, così la pagina ha "luce e buio" invece di card tutte uguali:

| # | Sezione | Sfondo |
|---|---|---|
| 1 | Hero + demo | paper, carta millimetrata solo dentro la demo |
| 2 | Il muro dei 2x | **ink** ("l'aula") |
| 3 | Calcolatore | paper |
| 4 | Come funziona (3 passi, barra che si riempie) | paper, separato da una "timeline" sottile |
| 5 | Pro: "Built for the week before the exam" | paper, layout asimmetrico (1 grande + 5 piccole) |
| 6 | Prima / dopo (una settimana di lezioni) | **ink** |
| 7 | Dove funziona (prosa) | paper |
| 8 | Prezzi | paper |
| 9 | Fiducia (3 punti in prosa) | paper |
| 10 | FAQ | paper |
| 11 | CTA finale | **ink** |

Divisori: una barra del tempo sottile (2 px, `timeline/20`) con un piccolo "playhead", al posto delle linee grigie. Segno dell'evidenziatore (SVG con bordi irregolari, ruotato di −1.5°) dietro **3 numeri in tutto**: durata dell'hero, risultato del calcolatore, "$4.99".

## 4. Wireframe: hero con demo (desktop 1280)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ [BRAND]                              How it works   Pricing   FAQ   [Add to Chrome]  │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  Your 75-minute lecture.            ┌────────────────────────────────────────────┐  │
│  Done in 30.                        │ ● ● ●   Intro to Statistics – Lecture 4      │  │
│                                     ├────────────────────────────────────────────┤  │
│  A free Chrome extension that lets  │ ┌──────┐ ░░░░░░░░ (carta millimetrata) ░░░░ │  │
│  you watch recorded lectures past   │ │ 2.5x │   The Normal Distribution          │  │
│  the 2x limit, on Panopto, Echo360  │ └──────┘        ▁▃▅▇█▇▅▃▁  ← curva che      │  │
│  and most video players. Then helps │                              si disegna      │  │
│  you review what matters.           │   "…so 68% of the values fall within one…"  │  │
│                                     ├────────────────────────────────────────────┤  │
│  ┌──────────────────────────────┐   │ ▶ ━━━━━━━━━━●──────────────────  19:48      │  │
│  │  Add to Chrome, it's free    │   │                                            │  │
│  └──────────────────────────────┘   │   Lecture length    1:15:00 ─► ▓30:00▓     │  │
│  Works in Chrome and Edge.          │                     (numero che scorre,    │  │
│  No account needed.                 │                      evidenziatore dietro) │  │
│                                     │  ( 1x )( 1.5x )( 2x )[ 2.5x ]( 3x )        │  │
│                                     │  Your lecture player stops at 2x.          │  │
│                                     │  This doesn't.   ← compare da 2.5x         │  │
│                                     └────────────────────────────────────────────┘  │
│                                       Try it: press D or S on your keyboard.        │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

Note sulla demo:
- La "lezione" è fatta in HTML/SVG: titolo della slide, curva normale che si disegna (SVG `stroke-dashoffset`), sottotitoli che scorrono, barra del tempo. Il tempo della demo avanza a `velocità ×` reale: le slide cambiano davvero più in fretta.
- Velocità: gruppo di pulsanti radio (frecce sinistra/destra da tastiera), più **D/S/R sulla pagina come nell'estensione** ("Try it: press D"). La demo non contiene `<video>`, quindi chi ha già l'estensione installata non ha conflitti.
- Durata: `1:15:00 ÷ velocità`, animazione dei numeri in 400 ms; `aria-live="polite"` annuncia "Lecture length: 30 minutes at 2.5x".
- Bottone play/pausa sulla demo (WCAG 2.2.2: contenuto in movimento oltre 5 s deve potersi fermare). La demo parte da sola solo se `prefers-reduced-motion` non è attivo; con reduced motion: ferma, cambiano solo i numeri.
- Velocità iniziale: 1x per 2 secondi, poi passa da sola a 2.5x una volta sola (mostra l'effetto anche a chi non tocca niente). Con reduced motion resta a 1x.
- Etichetta "Your lecture player stops at 2x. This doesn't." visibile solo da 2.5x in su.
- Il badge della velocità imita quello vero dell'estensione (pillola scura in alto a sinistra), così chi installa lo riconosce.

## 5. Wireframe: hero mobile (390)

```
┌────────────────────────────────┐
│ [BRAND]                        │  ← nessun menu: solo wordmark
├────────────────────────────────┤
│ Your 75-minute                 │
│ lecture. Done in 30.           │
│                                │
│ A free Chrome extension that   │
│ lets you watch recorded        │
│ lectures past the 2x limit…    │
│ ┌────────────────────────────┐ │
│ │● ● ●  Lecture 4            │ │
│ │┌────┐ The Normal Distr.    │ │
│ ││2.5x│    ▁▃▅▇█▇▅▃▁         │ │
│ │└────┘ "…68% of the values" │ │
│ │▶ ━━━━━━●───────── 19:48    │ │
│ │ 1:15:00 → ▓30:00▓          │ │
│ │ (1x)(1.5)(2x)[2.5](3x)     │ │  ← 5 pulsanti da ~62 px, target ≥ 44 px
│ └────────────────────────────┘ │
│ ┌────────────────────────────┐ │
│ │💻 Chrome extensions install │ │
│ │on desktop. Open this page  │ │
│ │on your computer.           │ │
│ │ [        Copy link       ] │ │
│ └────────────────────────────┘ │
└────────────────────────────────┘
```

Su mobile la demo viene **prima** del blocco "Copy link": il telefono non può installare, quindi l'obiettivo lì è convincere e far copiare il link. La demo deve stare nella prima schermata fino ai pulsanti di velocità (prima schermata ≈ 844 px a 390). Niente "press D" su mobile.

## 6. Wireframe: calcolatore

Desktop:
```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  How much time would you get back?                                                   │
│                                                                                      │
│  Hours of recorded lectures per week          │                                      │
│  1 ●━━━━━━━━━━━━○──────────────────── 20      │   About                              │
│               6 h                             │   ▓▓ 54 hours ▓▓   ← saved-ink,      │
│                                               │   back this semester  evidenziatore  │
│  Your speed                                   │                                      │
│  ( 1.5x )( 2x )[ 2.5x ]( 3x )                 │   9 of those hours are past your     │
│                                               │   player's 2x limit.                 │
│                                               │   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                               │   Based on a 15-week semester.       │
│                                               │   [ Add to Chrome, it's free ]       │
└──────────────────────────────────────────────────────────────────────────────────────┘
```
Mobile: le due colonne si impilano (input sopra, risultato sotto); lo slider occupa tutta la larghezza con un pollice da 28 px.

Formula: `ore × (1 − 1/velocità) × 15`. Riga "past your player's 2x limit": `ore × (1/2 − 1/velocità) × 15`, mostrata solo sopra 2x. Ore arrotondate all'intero, "About" davanti. Il risultato ha `aria-live="polite"`. Slider = `<input type="range">` nativo (tastiera e screen reader gratis), velocità = radio.

## 7. Le altre sezioni (sintesi)

- **Il muro dei 2x (ink):** a sinistra il testo; a destra un menu velocità generico (0.5 · 1 · 1.25 · 1.5 · 2, con l'ultima voce "sbarrata" da un limite) accanto alla pillola dell'estensione che continua fino a 3x. Nessuna UI riconoscibile di Panopto o Echo360.
- **Come funziona:** 3 passi in orizzontale (verticali su mobile) uniti da una barra del tempo che si riempie al passo successivo; nessuna animazione di entrata, il riempimento è statico.
- **Pro:** riquadro grande con un mock-up HTML dei checkpoint (lista di 3 momenti con nota e timestamp, ripreso dal popup vero); 5 funzioni minori in una griglia 2+3 con mini illustrazioni in SVG. Badge "Pro" giallo piccolo, non su ogni elemento.
- **Prima / dopo (ink):** due colonne con barre del tempo proporzionali: 6 h → 3 h a 2x col player; 6 h → 2 h 24 min a 2.5x con [BRAND] + "3 checkpoints ready for review".
- **Prezzi:** Free e Pro affiancati; Pro più largo (circa 55/45) con bordo `timeline`; "$4.99 a year" con l'evidenziatore, "That's about 42 cents a month." Bottone Pro = `data-pro-cta` esistente (oggi attivo).
- **Fiducia:** 3 paragrafi brevi in riga, nessuna card.
- **FAQ:** `<details>` come oggi, più dati strutturati FAQPage (Google non mostra più i rich result FAQ per questi siti, ma non nuocciono) e SoftwareApplication.
- **Privacy, terms, thanks:** stessi font, colori e header/footer; contenuti invariati.

## 8. Tecnica

- File: riscrittura di `index.html`; nuovo `home.js` (demo e calcolatore, vanilla, < 8 KB); `fonts/`; temi Tailwind in `tailwind.config.cjs` (colori e font come token); CSS della demo scritto a mano in `site.css`. `site.js` resta com'è (interruttore Pro, mobile, Copy link).
- Prestazioni: nessuna immagine raster nell'hero (tutto HTML/SVG) → LCP = il titolo; obiettivo < 2.5 s su mobile 4G. JS caricato con `defer`.
- Accessibilità: contrasti sopra, focus visibile (anello di 3 px `timeline` / `timeline-light`), demo e calcolatore usabili da tastiera, `aria-live` sui numeri, reduced motion.
- Il ciclo di revisione del brief (§7) parte dopo la prima versione, con `docs/LANDING_ITERATIONS.md`.

## 9. Problemi nel brief da decidere prima di scrivere codice

1. **Studio UCLA (sezione 8 del brief).** Esiste: Murphy, Hoover, Agadzhanyan, Kuehn e Castel, "Learning in double time", *Applied Cognitive Psychology* 36(1), 2022 (online 2021), doi:10.1002/acp.3899. Però **dice meno di quanto scrive il brief**: nel primo esperimento (test su 40 domande) a 1.5x e 2x il punteggio scende di circa 1 punto subito e di circa 3 dopo una settimana; **a 2.5x scende di più** (circa 22 contro 26). Gli autori sconsigliano di usare la velocità "solo per risparmiare tempo" e avvertono che sul materiale difficile può non funzionare. Citato accanto a un hero che dice "Done in 30" (= 2.5x) si ritorcerebbe contro di noi. **Proposta:** togliere la sezione 8 e usare lo studio, con onestà, solo nella FAQ "Can I understand anything at 3x?": "A UCLA study found that comprehension held up well to 2x and dropped beyond it. Go fast on the easy parts, slow down for the hard ones: that's what checkpoints and A-B loop are for." con link al DOI.
2. **Calcolatore, numeri incoerenti.** Con i default del brief (6 h, 2x) la formula dà **45 h**, non 54. Le 54 h corrispondono a 2.5x. **Proposta:** default **2.5x** (coerente con l'hero: 75 → 30) più la riga onesta "9 of those hours are past your player's 2x limit". Altrimenti a 2x il calcolatore mostra un risparmio che il player dà già gratis.
3. **"14-day refunds, no questions."** I Terms dicono solo "you can request a refund within 14 days by contacting us". "No questions" è una promessa in più: o la confermi (e aggiorno anche i Terms), o scrivo "14-day refunds. Just email us."
4. **Riga personale ("I built [BRAND] because…").** Deve essere vera: mi serve la tua frase, oppure la riformulo in modo neutro ("Made by an independent developer, not a big company. You can email me directly.").
5. **Google Fonts → self-hosted** (vedi §2). Serve il tuo ok perché il brief dice Google Fonts.

Fonti per il punto 1: [ScienceDaily](https://www.sciencedaily.com/releases/2022/01/220111153637.htm) · [PDF sul sito del laboratorio UCLA](https://castel.psych.ucla.edu/wp-content/uploads/sites/111/2022/03/Applied-Cognitive-Psychology-2021-Murphy-Learning-in-double-time-The-effect-of-lecture-video-speed-on-immediate-and.pdf) · [Learning and the Brain](https://www.learningandthebrain.com/blog/lets-get-practical-how-fast-should-videos-be/)
