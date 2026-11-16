# Ciclo di miglioramento della landing

Regole: `docs/landing-redesign-brief.md` §7. Piano: `docs/LANDING_DESIGN_PLAN.md`. Branch `landing-rebrand`.
Screenshot a 390 e 1280 px, pagina intera e prima schermata. Voti 1–10 per criterio; obiettivo ≥ 9 per tutti e tre i revisori.

Revisori: **S** = studente scettico (da Reddit, telefono, 5 secondi) · **C** = esperto di conversione · **A** = direttore artistico.

---

## Giro 1 — 2026-11-16

Versione valutata: redesign v1 (commit `042431f` + pagine legali `80e9031` + og-image `6bfa9fb`).

### Voti (prima delle modifiche del giro)

| # | Criterio | S | C | A | Motivo principale |
|---|---|---|---|---|---|
| 1 | Chiarezza in 5 s | 6 | 6 | 7 | Desktop chiaro (titolo + "Add to Chrome"). Su mobile la prima schermata non dice che è un'estensione gratuita: lo si scopre solo sotto la demo. |
| 2 | Prova | 7 | 7 | 8 | La demo funziona e si accorcia davvero. Ma da sola si ferma a 2x e a 2x non dice niente: il momento "oltre il 2x" si vede solo cliccando. |
| 3 | Desiderio | 7 | 6 | 7 | Il calcolatore (45 h) colpisce. Su mobile i quattro riquadri "Copy link" grandi e identici stancano. |
| 4 | Obiezioni | 8 | 7 | 8 | Privacy, "è permesso?", piattaforme e costo hanno risposta; la piattaforma è chiarita solo a metà pagina e nella FAQ. |
| 5 | Fiducia | 6 | 5 | 7 | Niente prova sociale (giusto non inventarla). `[BRAND]` provvisorio. Sviluppatore indipendente e rimborsi aiutano. |
| 6 | Pro | 7 | 7 | 8 | Checkpoint ben mostrati; "42 cents a month" funziona. Le altre funzioni sono chiare ma poco concrete. |
| 7 | Identità visiva | 7 | 7 | 6 | Evidenziatore, carta millimetrata e sezioni "aula" riconoscibili. Ma il visivo del "muro dei 2x" è piccolo e debole, e su mobile le funzioni Pro diventano 5 card identiche in colonna (il segno da template che il brief vieta). |
| 8 | Tipografia e ritmo | 8 | 8 | 7 | Gerarchia buona, titoli forti. Atkinson ha lo zero barrato: "Echo36Ø", "1:15:ØØ" stonano. |
| 9 | Mobile | 6 | 6 | 7 | Nessuno scroll orizzontale, demo leggibile. Bottone play 32 px e link "Pricing" 23 px sotto i 44 px consigliati; quattro riquadri "Copy link". |
| 10 | Prestazioni e accessibilità | 8 | 8 | 8 | Nessun JS di terzi oltre agli analytics, font self-hosted (99 KB, 2 precaricati), reduced motion, tastiera, `aria-live`. Bersagli touch piccoli (vedi 9). |
| | **Media** | **7.0** | **6.7** | **7.3** | **Media generale 7.0** |

### Le 5 modifiche con più impatto (applicate)

1. **Mobile, prima schermata:** sotto il sottotitolo "A free Chrome extension for your laptop. No account needed." (solo mobile; su desktop lo dicono già il CTA e la nota sotto). → criteri 1, 9.
2. **Demo a 2x:** l'etichetta sotto i pulsanti ora parla anche a 2x: "That's where your lecture player stops. Try 2.5x." e da 2.5x "Your lecture player stops at 2x. This doesn't.". La demo resta in automatico a 2x (decisione di Alex), ma invita al passo successivo. → criteri 2, 3.
3. **Mobile, CTA ripetuti:** il riquadro completo "Chrome extensions install on desktop…" resta solo nell'hero e nel CTA finale; nel calcolatore e nei prezzi c'è un solo bottone "Copy the link to install on your laptop". Bersagli touch: play 44 px su mobile, "Pricing" e link del footer con area cliccabile più alta. → criteri 3, 9, 10.
4. **Pro su mobile:** le 5 funzioni minori non sono più card identiche ma un elenco con divisori (le card restano su desktop, nella griglia asimmetrica). → criteri 7, 9.
5. **Il muro dei 2x:** nuovo visivo, più grande e leggibile: il menu del player (1x · 1.5x · **2x**) finisce contro una linea tratteggiata gialla, oltre la quale continuano le pillole 2.5x e 3x dell'estensione, con la frase "The speed menu ends at 2x. The extension doesn't." → criteri 7, 2.

### Provato e scartato
- Demo che dopo il 2x passa da sola a 2.5x: scartato per decisione di Alex (passaggio automatico solo a 2x). Compensato dall'etichetta del punto 2.
- Sezione dedicata allo studio UCLA: scartata (lo studio mostra un calo maggiore a 2.5x); resta solo nella FAQ sul 3x, con link al DOI.

### Da affrontare al giro 2
- **Mobile:** con la riga del punto 1 i pulsanti di velocità della demo finiscono appena sotto la prima schermata (≈ 844 px): ridurre gli spazi dell'hero su mobile.
- **Zero barrato** di Atkinson nel testo ("Echo36Ø"): valutare cifre da un altro font o Atkinson Hyperlegible Next.
- Sezione "Where it works" sottile: valutare di fonderla con "How it works" o di darle un ruolo più forte.
- Card Free su desktop con molto spazio vuoto sotto la lista.
- Misurare LCP e CLS con Lighthouse in modalità mobile.

### Limiti che non posso risolvere io
- **Prova sociale (criteri 3 e 5):** non abbiamo recensioni né numeri da mostrare, e non vanno inventati. Come ottenerla: chiedere una recensione sullo Store ai 6 utenti attivi (popup dopo N ore risparmiate, già possibile nell'estensione con un link alla scheda), raccogliere commenti veri da Reddit/Discord con il permesso dell'autore. Con almeno 3 recensioni vere si aggiunge una riga sotto l'hero.
- **`[BRAND]`:** pesa sulla fiducia negli screenshot; si risolve al rebrand.

---

## Giro 2 — 2026-11-16

Prima del giro ho applicato le 6 richieste di Alex (commit `48867ae`):
- popup vero (Free, 2.5x) nel passo 3 e badge vero sul video nel Pro, catturati dalla 1.9.0 in `dist/` sulla nostra lezione demo (`docs/landing-assets/make-ext-shots.mjs`), WebP con width/height;
- numeri e timer in Bricolage con cifre tabellari (classe `.num`); le cifre dentro il testo Atkinson vengono da un sottoinsieme di Bricolage (10,8 KB), quindi niente più zero barrato; righe brevi in grassetto e domande della FAQ in Bricolage;
- tolte le sezioni "One week of lectures" e "Where it works"; sotto la demo: "Tested on Panopto and Echo360, also inside Canvas or Moodle.";
- badge ufficiale "Available in the Chrome Web Store" (asset di Google, versione con bordo, non modificato, 206×62, link alla scheda) accanto al CTA dell'hero e del CTA finale, solo desktop (su mobile non si può installare);
- fiducia: tre punti con titolo grande e testo a 18 px.

**Muro dei 2x: accorciato, non potenziato.** Motivo: il brief vuole un solo momento animato importante, e la demo dell'hero fa già vedere il limite dei 2x in modo interattivo ("That's where your lecture player stops. Try 2.5x."). Un secondo widget animato avrebbe ripetuto la stessa prova e allungato la pagina su mobile. La sezione ora è a metà altezza (py 48–64 px), un solo paragrafo e il visivo menu → linea tratteggiata → 2.5x/3x.

### Voti (versione `48867ae`, prima delle modifiche del giro)

| # | Criterio | S | C | A | Motivo principale |
|---|---|---|---|---|---|
| 1 | Chiarezza in 5 s | 8 | 8 | 8 | Su mobile ora la prima schermata dice "A free Chrome extension for your laptop" e i pulsanti della demo ci stanno (fondo a 832 px su 844). |
| 2 | Prova | 8 | 8 | 9 | Demo + popup vero + badge vero. La funzione Pro principale (checkpoint) era ancora un mock-up HTML. |
| 3 | Desiderio | 8 | 7 | 8 | Calcolatore efficace; "About" da solo sopra il numero si legge male. |
| 4 | Obiezioni | 8 | 8 | 8 | Piattaforme subito sotto la demo; dubbio aperto su mobile: "posso iniziare la prova dal telefono?". |
| 5 | Fiducia | 7 | 6 | 7 | Badge dello Store e screenshot veri aiutano; manca ancora prova sociale. Il popup dice "SpeedUP Video Pro" mentre la pagina dice `[BRAND]` (si risolve al rebrand). |
| 6 | Pro | 7 | 7 | 8 | Prezzo chiaro; la prova di 7 giorni si vede solo sotto il bottone. |
| 7 | Identità visiva | 8 | 8 | 8 | Ritmo più asciutto senza il prima/dopo; evidenziatore usato su 3 numeri. |
| 8 | Tipografia e ritmo | 8 | 8 | 7 | Niente zero barrato. Restano: "$4.99" attaccato ad "a year", "About" orfano. |
| 9 | Mobile | 7 | 7 | 8 | Nel calcolatore l'etichetta tocca "6 h"; bottone "Copy the link to install on your laptop" troppo lungo per la card Free. |
| 10 | Prestazioni e accessibilità | 9 | 9 | 9 | Mobile con CPU 4× e 4G lenta: LCP 1,5–1,6 s (titolo H1), CLS 0,003, 198 KB in tutto. Bersagli piccoli solo nei link dentro il testo (esentati da WCAG 2.5.8). |
| | **Media** | **7.8** | **7.7** | **8.0** | **Media generale 7.8** (giro 1: 7.0) |

### Le 5 modifiche con più impatto (applicate)

1. **Pro, prova vera:** nella card grande la scheda Precision vera del popup (frame-by-frame, A-B repeat, tre segnalibri), catturata in stato Pro dimostrativo nel profilo temporaneo; tolto il mock-up HTML. → criteri 2, 5, 6.
2. **Calcolatore:** etichetta e valore non si toccano più su mobile; il risultato si legge come una frase: "You'd get back about **45 hours** this semester." → criteri 8, 9, 3.
3. **Prezzi, tipografia e mobile:** spazio tra "$4.99" e "a year"; bottone mobile più corto, "Copy link for your laptop". → criteri 8, 9.
4. **Pro, prova gratuita in vista:** etichetta gialla "7 days free" accanto al nome del piano. → criteri 6, 3.
5. **Mobile, obiezione sulla prova:** sotto il bottone Pro, solo su mobile: "On your phone? Start the trial now: the license key arrives by email, ready for your laptop." → criteri 4, 9.

### Provato e scartato
- Secondo widget interattivo nel muro dei 2x: scartato (vedi sopra).
- Badge dello Store anche su mobile: scartato, porterebbe a una pagina da cui non si può installare.
- Ritaglio largo del badge sul video (420×236): il badge risultava minuscolo; ora 250×120.

### Da affrontare al giro 3
- Il popup chiama "Bookmarks" quello che la pagina chiama "checkpoints": decidere un nome unico (la UI dell'estensione o la landing).
- Pagina mobile ancora lunga (≈ 8 800 px): valutare FAQ più corta o in due colonne su desktop.
- Le tre icone disegnate a mano (frame-by-frame, A-B loop, scorciatoie) accanto agli screenshot veri sembrano più povere.

### Limiti che non posso risolvere io
- Prova sociale: come al giro 1.
- `[BRAND]` e nome nel popup: dopo il rebrand rifare gli screenshot con `npm run build && node docs/landing-assets/make-ext-shots.mjs`.

---

## Giro 3 — 2026-11-16

Prima del giro ho applicato le richieste di Alex (commit `dc9b031`):
- sottotitolo dell'hero: "Watch Panopto and Echo360 lectures faster than 2x. Slow down and bookmark the parts that matter for the exam."; title, meta description, Open Graph, Twitter e dati strutturati allineati;
- "Bookmarks" al posto di "checkpoints" in landing, FAQ (anche nei dati strutturati) e `docs/STORE_LISTING.md` (EN e IT: "Segnalibri"). L'estensione non è toccata; la descrizione dello Store va aggiornata a mano nella dashboard alla prossima modifica;
- badge reale: ritaglio stretto della sola pillola del controllo (124×40), niente testo tagliato;
- funzioni Pro: card grande con la scheda Precision vera + lista compatta con titoli in linea (Frame-by-frame, A-B loop, Remembers your speed con il badge vero, Study stats, Custom shortcuts); niente card semivuote;
- badge del Chrome Web Store solo nell'hero: Google non fornisce una variante per sfondi scuri (solo "white" e "with border"), quindi tolto dal CTA finale;
- pagina mobile sotto i 7.000 px: FAQ tutte chiuse (la piattaforma è già sotto la demo), popup più piccoli su mobile senza didascalia, lista Pro dei prezzi di 5 righe, spaziature verticali ridotte solo sotto i 640 px, alcune frasi accorciate dove andavano a capo per una parola. Risultato: **6 983 px a 390** (era 8 838); 7 156 a 360.

### Voti (versione `dc9b031`, prima delle modifiche del giro)

| # | Criterio | S | C | A | Motivo principale |
|---|---|---|---|---|---|
| 1 | Chiarezza in 5 s | 9 | 9 | 8 | Il sottotitolo nomina Panopto, Echo360 e "faster than 2x": si capisce subito per chi è. |
| 2 | Prova | 8 | 8 | 9 | Demo + tre screenshot veri. |
| 3 | Desiderio | 8 | 8 | 8 | Calcolatore e demo; la pagina più corta arriva prima ai prezzi. |
| 4 | Obiezioni | 9 | 8 | 8 | La riga delle piattaforme sotto la demo è grigia e piccola: risponde all'obiezione n.1 ma si perde. |
| 5 | Fiducia | 7 | 6 | 7 | Badge dello Store e screenshot veri; senza recensioni non sale oltre. |
| 6 | Pro | 8 | 8 | 8 | Card grande + lista: chiaro cosa si compra. |
| 7 | Identità visiva | 8 | 8 | 8 | Coerente; nessun elemento da template. |
| 8 | Tipografia e ritmo | 8 | 8 | 7 | Su desktop il titolo della card Pro va a capo in una colonna stretta; diversi titoli con una parola sola sull'ultima riga ("No account. No / tracking.", "player's."). |
| 9 | Mobile | 8 | 8 | 8 | 6 983 px, nessuno scroll orizzontale, demo nella prima schermata. |
| 10 | Prestazioni e accessibilità | 9 | 9 | 9 | Invariate rispetto al giro 2. |
| | **Media** | **8.2** | **8.0** | **8.0** | **Media generale 8.1** (giro 2: 7.8, giro 1: 7.0) |

### Le 5 modifiche con più impatto (applicate)

1. **Card Pro su desktop:** colonna dello screenshot a 220 px e titolo a 28 px, così "Bookmarks with notes" sta su una riga. → criterio 8.
2. **Riga delle piattaforme:** in Bricolage grassetto con un segno ✓ verde: si legge come un fatto, non come una nota. → criteri 4, 1.
3. **Titoli bilanciati:** `text-wrap: balance` su H1–H3, niente più parola sola sull'ultima riga. → criterio 8.
4. **Badge vero nella lista Pro** leggermente più grande (99×32) e allineato al titolo. → criteri 2, 8.
5. **CTA finale (desktop):** sotto il bottone la stessa rassicurazione dell'hero, "Works in Chrome and Edge. No account needed." Nessuna altezza in più su mobile. → criteri 3, 4.

Pagina mobile dopo il giro: 6 981 px a 390.

### Provato e scartato
- Titolo "Also in Pro" sopra la lista: scartato, avrebbe riportato la pagina mobile sopra i 7 000 px senza aggiungere informazione (il titolo della sezione lo dice già).
- Badge dello Store nel CTA scuro: Google non ha una variante per sfondi scuri.

### Stato rispetto all'obiettivo
Non ancora tutti i criteri ≥ 9. Ostacoli principali:
- **Fiducia (6–7):** serve prova sociale vera (recensioni sullo Store). Non dipende dalla pagina.
- **Tipografia e Identità (8):** il popup dell'estensione ha ancora il vecchio stile (viola/blu scuro) accanto alla palette della landing.

### Da fare con la 1.9.1 (nota di Alex)
- Rifare lo stile del popup sulla palette della landing (blu notte + giallo), poi rigenerare gli screenshot con `npm run build && node docs/landing-assets/make-ext-shots.mjs`. Questo risolve anche il nome vecchio nel popup e dovrebbe alzare Identità visiva e Fiducia.

---

## Giro 4 — 2026-11-16 (nome definitivo: SpeedUniversity)

Prima del giro (commit `440cbdb`, piano estensione `cff9c6a`):
- `[BRAND]` → **SpeedUniversity** in tutte le pagine, meta, Open Graph, dati strutturati e og-image (con il wordmark; sottotitolo "Panopto and Echo360 lectures, faster than 2x."). Pagine legali: "SpeedUniversity" con "(formerly SpeedUp Video Pro)" una volta in privacy e terms. Title della home: "Panopto & Echo360 lectures faster than 2x · SpeedUniversity" (59 caratteri).
- **Marchio:** quadrato ink con due chevron gialli, il secondo oltre una linea tratteggiata (il limite dei 2x superato); nome in Bricolage 800 come testo. Nessun riferimento accademico (niente stemmi, scudi, toghe). `favicon.svg` + PNG 32/128 + apple-touch-icon 180.
- **"SpeedUniversity is a browser extension, not a university or course provider."** nel footer di tutte le pagine e come seconda domanda della FAQ (anche nei dati strutturati).

### Voti (versione `440cbdb`, prima delle modifiche del giro)

| # | Criterio | S | C | A | Motivo principale |
|---|---|---|---|---|---|
| 1 | Chiarezza in 5 s | 9 | 9 | 8 | Il nome potrebbe far pensare a un corso; il sottotitolo (Panopto, Echo360, faster than 2x) e la riga "Free Chrome extension" lo chiariscono subito. |
| 2 | Prova | 8 | 8 | 9 | Demo + screenshot veri; a 2x il "Try 2.5x" è solo testo. |
| 3 | Desiderio | 8 | 8 | 8 | |
| 4 | Obiezioni | 9 | 9 | 8 | "È un'università?" risposto in FAQ e footer. |
| 5 | Fiducia | 7 | 7 | 7 | Nome vero + marchio coerente aiutano; senza recensioni non sale; il popup mostra ancora il vecchio nome (si risolve con la 1.9.1). |
| 6 | Pro | 8 | 8 | 8 | |
| 7 | Identità visiva | 9 | 8 | 9 | Il marchio (chevron oltre la linea) riprende il motivo della pagina: memorabile e non da template. |
| 8 | Tipografia e ritmo | 8 | 8 | 8 | |
| 9 | Mobile | 7 | 8 | 7 | **Bug:** nel CTA finale il riquadro "Copy link" toccava i bordi dello schermo (un `</div>` di troppo lasciato al giro 3). Pagina a 7 062 px, sopra l'obiettivo. |
| 10 | Prestazioni e accessibilità | 9 | 9 | 9 | |
| | **Media** | **8.2** | **8.2** | **8.1** | **Media generale 8.2** (giro 3: 8.1) |

### Le 5 modifiche con più impatto (applicate)

1. **CTA finale su mobile:** tolto il `</div>` di troppo; il riquadro ha di nuovo i margini. → criteri 9, 8.
2. **"Try 2.5x" cliccabile:** a 2x l'invito sotto la demo è un bottone che porta la demo a 2.5x (37:30 → 30:00). → criteri 2, 3.
3. **Nota sotto il bottone Pro** senza ripetere i rimborsi (già nella sezione fiducia): una riga in meno su mobile. → criterio 9.
4. **Intro della sezione Pro** in una riga: "Pro helps you come back to what matters." → criteri 8, 9.
5. **FAQ:** "Already have a lifetime license?" (una riga invece di due), risposta riscritta in positivo. → criteri 8, 9.

Pagina mobile dopo il giro: **6 986 px a 390** (7 227 a 360, 7 744 a 320); nessuno scroll orizzontale da 320 a 1280 su tutte e quattro le pagine.

### Provato e scartato
- Link "FAQ" anche nella barra mobile: con il wordmark completo non ci sta a 320 px senza ridurre il nome.

### Stato rispetto all'obiettivo
Media 8.2. Restano sotto 9: **Fiducia** (serve prova sociale vera) e, fino alla 1.9.1, la coerenza tra popup (vecchio nome e colori) e pagina. Piano dell'estensione: `docs/PLAN_1.9.1.md`.
