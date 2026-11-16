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
