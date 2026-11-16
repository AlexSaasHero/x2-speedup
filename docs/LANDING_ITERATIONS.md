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
