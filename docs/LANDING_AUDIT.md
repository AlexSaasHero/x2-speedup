# Audit landing page (2026-11-15)

Ambito: `landing-page/` (index, privacy, terms) e il sito live `https://x2-speedup.vercel.app`, branch `landing-rebrand`.
Audit in sola lettura: nessun file della landing è stato modificato.
Metodo: lettura del codice, `curl` sul sito live, Playwright a 360/390/1280 px, confronto delle promesse con `src/config/plans.ts` e `src/shared/shortcuts.ts`.

## 0. Problemi bloccanti / rischi (prima di tutto il resto)

1. **Il sito live promette la 1.9.0, lo Store distribuisce la 1.5.1.8.** `main` è già pushato (`origin/main..main` vuoto), quindi oggi la home dice "16x free, Pro $4.99/anno con prova", ma chi installa riceve la versione vecchia (modello 16x-Pro / $1.99). Chi compra il Pro oggi paga un abbonamento per funzioni che la sua estensione non ha ancora. Da decidere: lasciare così fino all'approvazione della 1.9.0, oppure nascondere temporaneamente il bottone di checkout.
2. **Dopo il pagamento l'utente perde la schermata con la licenza.** In `index.html` l'evento `Checkout.Success` fa subito redirect al Chrome Web Store: l'overlay Lemon Squeezy, dove compare la chiave, si chiude. Chi è in prova ha già l'estensione installata, quindi lo Store non gli serve. Meglio una pagina `thanks.html` con "1. apri il popup, 2. incolla la chiave (è anche nella mail)".
3. **Mobile → nessuna installazione possibile.** Molti arrivano da Reddit su telefono, ma le estensioni Chrome non si installano da mobile: il CTA "Add to Chrome" porta a una pagina dello Store che sul telefono non ha nessun bottone di installazione. Su mobile serve un'alternativa: "Open this page on your laptop" + bottone "Email me the link" (mailto: a se stessi, niente backend) o "Copy link".
4. **Disclaimer con 4 marchi nel footer** ("Not affiliated with Panopto, Echo360, Instructure (Canvas) or Moodle"): è lo stesso schema per cui lo Store ha rifiutato la 1.9.0. Va sostituito con "Not affiliated with any lecture or video platform."

## 1. SEO tecnica

| Elemento | Stato | Nota |
|---|---|---|
| `<title>` | ⚠️ | 74 caratteri, Google tronca a ~60. Il nome del brand viene prima del beneficio. Proposta: `Study recorded lectures faster on Panopto & Echo360 · [BRAND]` |
| Meta description | ✅ | 146 caratteri, frase naturale. "No tracking" è vero solo per l'estensione: il sito usa GA4 + Clarity. Meglio "No account." |
| H1 | ✅ | Uno solo, chiaro ("Finish your lecture recordings in half the time"). |
| H2 | ⚠️ | "Works where you study", "How it works", "Free vs Pro", "FAQ", "Get your evenings back.": nessuno contiene le parole che gli studenti cercano (lecture, speed, Panopto). Basta riscriverne uno o due, es. "Speed up Panopto and Echo360 lectures past 2x". |
| Open Graph | ⚠️ | Mancano `og:image` (1200×630), `og:url`. Link condivisi su Reddit/Discord/WhatsApp escono senza anteprima: è il canale principale. |
| Twitter card | ⚠️ | `summary` senza immagine → passare a `summary_large_image` con la stessa immagine OG. |
| Favicon | ❌ | `/favicon.ico` 404, nessun `<link rel="icon">`. Ci sono `public/icons/icon{16,48,128}.png` da riusare (+ `apple-touch-icon` 180 px). |
| Canonical | ❌ | Assente. Serve soprattutto al cambio di dominio (vecchio → nuovo). |
| `robots.txt` | ❌ | 404. |
| `sitemap.xml` | ❌ | 404. Con le pagine per intento diventa necessaria. |
| Dati strutturati | ❌ | Nessuno. Aggiungere `SoftwareApplication` (`applicationCategory: BrowserApplication`, `operatingSystem: Chrome`, `offers` 0 e 4.99 USD/anno). **Non** aggiungere `aggregateRating` finché non ci sono recensioni vere. `FAQPage` è innocuo ma dal 2023 Google mostra i rich result FAQ solo per siti governativi/sanitari: utilità bassa. |
| Lingua | ✅ | `lang="en"` su tutte e tre le pagine. |
| `theme-color` | — | Assente; utile su mobile (barra del browser scura come la pagina). |
| privacy / terms | ⚠️ | Title e description ok; mancano canonical e favicon. `privacy.html` carica `lemon.js` senza usarlo. |
| `CLAUDE.md` nel sito | ✅ | `/CLAUDE.md` risponde 404: `.vercelignore` funziona. |

### Peso e script (misurato sul live, 360 px)
| Risorsa | Compressa | Non compressa | Nota |
|---|---|---|---|
| HTML index | ~6 KB | 20 KB | ok |
| Tailwind Play CDN (`cdn.tailwindcss.com` 3.4.17) | **126 KB** | **407 KB** | Compila il CSS nel browser a ogni visita: blocca il rendering, la console avverte "should not be used in production". È il problema di performance n.1. |
| gtag.js (GA4) | 182 KB | 542 KB | async, ma pesante su mobile lento. |
| Clarity | 25 KB | 74 KB | async. |
| lemon.js | 1.4 KB | 4 KB | ok. |

Soluzione Tailwind: generare un `styles.css` statico (~10–15 KB) con il Tailwind CLI standalone (un binario, niente npm nella landing) e committarlo. Il sito resta HTML statico senza build su Vercel; il CSS si rigenera a mano quando cambiano le classi.

Cookie/consenso: GA4 e Clarity partono senza banner. Per i visitatori UE è un rischio legale (decisione già aperta in `landing-page/CLAUDE.md`). Opzione leggera: Consent Mode v2 di GA4 con default "denied" + banner minimale; Clarity caricato solo dopo il consenso.

## 2. Contenuti e ricerche

**Oggi:** una sola pagina su un sottodominio `vercel.app` senza backlink. Realisticamente si posiziona solo per il nome del brand. Le parole giuste ci sono (lecture, Panopto, Echo360, 2x), ma un'unica pagina non può rispondere a più intenti.

**Ricerche reali da coprire** (una pagina breve per intento, contenuto vero: problema → perché succede → soluzione passo-passo → estensione come opzione):

| Ricerca / intento | Pagina proposta | Note |
|---|---|---|
| speed up panopto, panopto faster than 2x, panopto 2x limit | `/panopto-speed.html`: "How to watch Panopto lectures faster than 2x" | Priorità 1. Spiegare il menu nativo (max 2x), poi l'estensione. |
| echo360 playback speed, echo360 speed up | `/echo360-speed.html`: "Echo360 playback speed: how to go faster than 2x" | Priorità 2. |
| panopto in canvas speed, canvas lecture video speed | sezione dentro la pagina Panopto ("Panopto inside Canvas or Moodle") | Solo Panopto/Echo360 incorporati: i player nativi Canvas/Moodle non sono testati, non vanno promessi. |
| watch lectures faster, is watching lectures at 2x effective | `/watch-lectures-faster.html`: guida di studio (velocità consigliate, quando rallentare, checkpoint prima dell'esame) | Intento informativo, buono per Reddit. Se si citano studi sull'apprendimento a 2x, verificare la fonte prima di pubblicare. |
| panopto keyboard shortcuts speed | paragrafo + tabella scorciatoie nella pagina Panopto | Basso sforzo. |

Regole: niente elenchi di marchi, una piattaforma per pagina, link interni dalla home ("Guides") e tra le pagine, ogni pagina nel sitemap.

**Promesse da allineare** (verificate sul codice):
- Free: la lista dice "Speed up to 16x … no 2x cap on lecture players": mescola 16x e lezioni, cosa che le regole vietano. Separare: "No 2x cap on lecture players" + "Up to 16x on other sites".
- Free elenca anche G, Z/X, Shift+F (hold), sync impostazioni: **esistono e sono Free** (`plans.ts`: `skipTime`, `holdToSpeed` true; `shortcuts.ts`: default `g`, `z`, `x`, Shift+F; `src/background/sync.ts`). Sono vere, ma è una lista lunga: valutare di ridurla a D/S/R + contatore + "more shortcuts".
- Pro: tutte le voci corrispondono a funzioni Pro reali (`rules`, `checkpoints`, `frameStep`, `abRepeat`, `statsDetails`, `customHotkeys`). Il salto dei silenzi giustamente non c'è. ✅
- `landing-page/CLAUDE.md` è disallineato rispetto a queste regole: cita il salto dei silenzi nel Pro, il disclaimer con 4 marchi, Udemy/Coursera come target. Da aggiornare insieme al resto.

## 3. Conversione

Percorso "Add to Chrome": buono su desktop. A 360 px il CTA principale è a 447–503 px dall'alto, sopra la piega (740 px); H1 in 2 secondi, CTA visibile subito. 5 CTA verso lo Store distribuiti nella pagina. ✅

Cosa rallenta o confonde:
1. **Mobile** (vedi §0.3): il visitatore più frequente non può installare. Nessun messaggio lo avvisa.
2. **Nessuna prova visiva reale.** L'illustrazione è un mock CSS. Uno screenshot o una GIF corta dell'estensione su una lezione (si possono riusare `docs/store-assets/screenshot-*.png`, già fatti per lo Store) aumenta la fiducia. Niente UI di Panopto/Echo360 riconoscibile né loghi.
3. **Nessuna riprova sociale.** Con ~350 installazioni e nessuna recensione non c'è nulla di vero da mostrare: va bene così, non inventare numeri. Quando arrivano recensioni sullo Store, citarne 2–3.
4. **Edge non menzionato:** l'estensione si installa da Chrome Web Store anche su Edge. "Works in Chrome and Edge" sotto il CTA allarga il pubblico a costo zero.
5. **Misurazione:** i click verso lo Store sono "outbound click" (GA4 li traccia se la misurazione avanzata è attiva, da verificare nel pannello GA). `Checkout.Success` non manda nessun evento a GA: non si può misurare la conversione al Pro. Aggiungere `gtag('event', 'purchase'|'trial_start')` nell'handler.

Percorso "Start free trial":
- Il valore del Pro è descritto in termini di funzioni, poco di risultato. L'intro "Pro adds the tools for exam prep" è giusta; le voci potrebbero aprire con il beneficio (già in parte: "replay a hard explanation until it clicks").
- Prezzo chiaro ($4.99/anno, $0 oggi, disdetta). ✅ Manca il confronto che lo giustifica ("less than a coffee, for the whole academic year").
- Dopo il pagamento: redirect allo Store invece delle istruzioni di attivazione (§0.2).
- Mancano le istruzioni "already installed? → open the popup → paste the key" fuori dalla FAQ.

## 4. Mobile (< 400 px)

Misurato a 360 e 390 px con Playwright:
- Nessuno scroll orizzontale (`scrollWidth` = larghezza viewport), nemmeno con il riquadro flottante "This week you saved". ✅
- Navbar: logo + nome + "Add to Chrome" stanno su una riga; il nome si tronca correttamente. Con un nome più lungo (University Flow) va ricontrollato. ✅
- H1 36 px, leggibile. ✅
- Pagina lunga: 5.336 px a 360 px (≈7 schermate). La lista Free con le scorciatoie è il blocco più denso.
- Target touch: bottoni ≥ 48 px. ✅ I link del footer (testo 12 px, gap 20 px) sono piccoli ma accettabili.
- Problema vero: installazione impossibile da mobile (§0.3). Il Tailwind CDN pesa di più proprio sulle connessioni mobili.

## 5. Interventi ordinati per impatto / sforzo

| # | Intervento | Impatto | Sforzo | Dove |
|---|---|---|---|---|
| 1 | Disclaimer generico al posto dei 4 marchi | Alto (rischio Store/marchi) | 5 min | index, privacy, terms |
| 2 | Pagina `thanks.html` dopo il checkout + evento GA `trial_start` | Alto (attivazione Pro) | 1 h | index + nuovo file |
| 3 | Blocco mobile: "Install on your laptop" + copia link / email a te stesso | Alto (canale Reddit) | 1–2 h | index |
| 4 | Favicon + `og:image` 1200×630 + `summary_large_image` + `og:url` + canonical | Alto (anteprime su Reddit/Discord) | 1–2 h (immagine da `docs/store-assets/source`) | tutte |
| 5 | Title ≤ 60 caratteri, meta description senza "no tracking", 1–2 H2 con parole chiave naturali | Medio | 15 min | index |
| 6 | Tailwind compilato al posto del CDN (−120 KB, niente rendering bloccato) | Medio-alto (velocità, Core Web Vitals) | 1–2 h | tutte + nuovo `styles.css` |
| 7 | `robots.txt`, `sitemap.xml`, JSON-LD `SoftwareApplication` | Medio | 30 min | nuovi file + index |
| 8 | Screenshot reale dell'estensione nell'hero o sotto "How it works" | Medio | 1 h | index |
| 9 | Pagina Panopto (intento "faster than 2x") | Alto nel medio periodo | 2–3 h | nuovo file |
| 10 | Pagina Echo360 | Medio-alto | 2 h | nuovo file |
| 11 | Guida "watch lectures faster" | Medio | 3 h | nuovo file |
| 12 | Separare 16x / "no 2x cap" nella lista Free, accorciare la lista | Basso-medio | 15 min | index |
| 13 | "Works in Chrome and Edge" | Basso-medio | 5 min | index |
| 14 | Consenso cookie (Consent Mode v2 + Clarity dopo il consenso) | Rischio legale UE | 2–3 h | tutte |
| 15 | Aggiornare `landing-page/CLAUDE.md` alle regole di questa fase | Basso (coerenza) | 15 min | CLAUDE.md |

Dipendenze dal rebrand: 4 (immagine OG), 9–11 (testi) e il canonical usano nome e dominio definitivi. Si possono preparare con `[BRAND]` e un dominio segnaposto, sostituibili con un cerca-e-sostituisci. Il canonical e `sitemap.xml` vanno pubblicati solo con il dominio vero, altrimenti Google indicizza `x2-speedup.vercel.app` come URL principale.

Decisioni per Alex:
- §0.1: lasciare attivo il checkout finché la 1.9.0 non è approvata?
- §0.2 e §0.3 vanno anche su `main` subito (sono bug del sito live), o aspettano il rebrand?
- Consenso cookie: farlo ora o al lancio del dominio?
