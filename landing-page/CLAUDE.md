# CLAUDE.md: LectureSpeed (landing page)

Vale insieme al `CLAUDE.md` nella root del repo (regole generali, git, estensione). Qui solo ciò che riguarda il sito.

## Prodotto
- Landing page dell'estensione Chrome **LectureSpeed** (una parola, L e S maiuscole; prima "SpeedUp Video Pro", rinominata con la 1.9.1; il nome provvisorio SpeedUniversity è stato scartato il 2026-11-16). Titolo Store proposto: "LectureSpeed – Watch Panopto & Echo360 Lectures Faster Than 2x" (vedi `docs/PLAN_1.9.1.md` §0).
- **Posizionamento:** strumento di studio per lezioni registrate. "Studia le lezioni registrate in metà tempo, su Panopto, Canvas, Moodle e Echo360."
- **Target:** studenti universitari (in inglese, mercato globale), poi chi segue corsi su Udemy e Coursera.
- **La velocità è un plus, non l'USP:** non presentare il prodotto come un "video speed controller" generico.
- La pagina è stata riscritta come study tool il 2026-11-15 (v1.9.0): stesso messaggio della scheda Store (`docs/STORE_LISTING.md`).

## Obiettivi della landing (in ordine)
1. Far installare l'estensione: CTA principale "Add to Chrome", link al Chrome Web Store.
2. Spiegare in 5 secondi per chi è e su quali piattaforme funziona.
3. Presentare il piano Pro e le funzioni a pagamento.
4. Ospitare le pagine obbligatorie: Privacy Policy e Terms. La Privacy Policy è richiesta dal Chrome Web Store.

## Messaggio e contenuti
- **Hero:** titolo orientato al risultato ("Finish your lecture recordings in half the time"), sottotitolo con le piattaforme supportate, CTA "Add to Chrome, it's free".
- **Piattaforme supportate:** solo quelle testate a mano: Panopto ed Echo360, "including lectures embedded in Canvas or Moodle" (test di Alex, 1.9.0). Sulle lezioni non promettere il 16x: "no more 2x cap". Disclaimer generico, senza marchi: "This extension is an independent project and is not affiliated with any lecture or video platform." (footer di tutte le pagine).
- **Free vs Pro:**
  - Free: velocità fino a 16x ovunque, scorciatoie, contatore del tempo risparmiato
  - Pro: memoria per piattaforma, salto dei silenzi, statistiche, checkpoint con note, frame per frame, loop A-B
- **Prezzo Pro:** abbonamento annuale, 7 giorni gratis, poi **$4.99 l'anno** (confermato da Alex il 2026-11-14). Non cambiare il prezzo senza conferma di Alex.
- **Pagamenti:** checkout Lemon Squeezy (overlay `lemon.js`), nessun dato di pagamento gestito da noi. Dopo il pagamento si va su `thanks.html` (passi per attivare la licenza).
- **FAQ:** "Funziona sulla piattaforma della mia università?", "Raccogliete dati?", "Come attivo il Pro?", "Posso disdire?"

## Checkout Pro: interruttore
Stato: **acceso** dal 2026-11-16 (1.9.0 approvata e pubblicata sullo Store). Era spento dal 2026-11-15 mentre lo Store distribuiva ancora la 1.5.1.8.
- Interruttore unico: `PRO_CHECKOUT_ENABLED` in cima a `site.js`.
- `true` (oggi): i bottoni Pro (`data-pro-cta`) prendono il testo di `data-pro-label` ("Try Pro free for 7 days") e aprono il checkout in overlay; dopo `Checkout.Success` redirect a `/thanks.html`. Su Lemon Squeezy il redirect dopo il pagamento punta a `/thanks.html`.
- `false`: i bottoni mostrano "Pro launching soon" e portano alla sezione `#pricing`; `lemon.js` non viene caricato. Se lo rispegni, riscrivi anche la FAQ "How do I activate Pro?" in `index.html` (oggi: "Pro starts with a 7-day free trial, then $4.99/year. Cancel anytime.").
- Dopo ogni modifica: anteprima locale (clic sul bottone Pro → si apre l'overlay Lemon Squeezy), commit, push su `main`.
- Nuovi bottoni Pro: `<a href="#pricing" data-pro-cta data-pro-label="Testo quando è attivo">Pro launching soon</a>`. Mai mettere il link di checkout direttamente nell'HTML.

## Mobile: niente "Add to Chrome"
Le estensioni non si installano da telefono. Sotto i 768 px, o con user agent mobile (classe `html.mobile-ua` messa da `site.js`), gli elementi `.desktop-only` (i CTA verso lo Store) spariscono e compaiono i `.mobile-only` ("Open this page on your computer" + bottone `data-copy-link`). Regole in `site.css`. Ogni nuovo CTA verso lo Store va affiancato dal blocco mobile.

## Stack
- **HTML statico**, niente framework e niente build: `index.html` (home), `privacy.html` (privacy policy), `terms.html` (termini dell'abbonamento), `thanks.html` (dopo il pagamento, `noindex`). Codice condiviso: `site.js` (interruttore Pro, rilevamento mobile, "Copy link"; caricato nell'head senza `defer`) e `site.css`. I due video demo della vecchia home sono stati spostati in `_to_delete/landing-page/` (2026-11-15).
- Styling: **Tailwind 3.4.17 compilato** in `styles.css` (19 KB, ~4 KB gzip; dal 2026-11-15 al posto del CDN da 126 KB) + `site.css` + CSS inline.
  - **Dopo ogni modifica alle classi Tailwind** (HTML o `site.js`): `npm run landing:css` dalla root del repo, poi committa anche `styles.css`. Senza, le classi nuove non hanno stile.
  - Config: `landing-page/tailwind.config.cjs` + `tailwind.input.css` (esclusi dal sito in `.vercelignore`). Su Vercel nessuna build: serve i file così come sono.
- Script esterni: Lemon Squeezy `lemon.js` (solo con il checkout Pro attivo, vedi sopra). Statistiche del sito: **Vercel Web Analytics** (`/_vercel/insights/script.js`, senza cookie, dal 2026-11-15; GA4 e Clarity rimossi). Da attivare nel pannello Vercel → progetto → Analytics. Riguardano **solo il sito**, mai l'estensione, e sono dichiarate in `privacy.html`. Lo script dà 404 in anteprima locale: è normale.
- Deploy: **Vercel**, dominio `x2-speedup.vercel.app`. Non c'è nessun backend: l'estensione verifica le licenze direttamente con Lemon Squeezy (`/api/validate-license` non è mai esistito).
  ⚠️ Da verificare nel pannello Vercel quale repo/cartella pubblica il sito (Root Directory = `landing-page`?) e da quale branch.
- URL che non devono cambiare: `/privacy.html` (linkata dallo Store e da `docs/STORE_LISTING.md`) e la home (linkata dall'estensione in `src/shared/links.ts`). Non rinominare né spostare la cartella `landing-page/`.
- Comandi: nessuna build su Vercel; in locale solo `npm run landing:css` per il CSS. Anteprima locale: `python3 -m http.server 8000 --directory landing-page`, poi apri `http://localhost:8000`.

## Nota di rinomina (flag)
La landing con il nome LectureSpeed è online dal 2026-11-16, **prima** della 1.9.1: lo Store mostra ancora "SpeedUp Video Pro".
- Interruttore: `RENAME_NOTICE` in cima a `site.js`. `true` (oggi) → sotto i CTA "Add to Chrome" (hero e finale, desktop) compare "On the Chrome Web Store it's still listed as SpeedUp Video Pro while we update the name." (elementi `.rename-notice`, regola in `site.css`).
- **Quando la 1.9.1 è approvata sullo Store:** `const RENAME_NOTICE = false;`, rigenera gli screenshot dell'estensione (`npm run build && node docs/landing-assets/make-ext-shots.mjs`), anteprima, commit, push su `main`.
- Dominio: canonical, `og:url` e `og:image` puntano a `https://x2-speedup.vercel.app` finché non c'è il dominio proprio; al cambio sostituirli tutti (index, privacy, terms).

## Regole
- Lingua del sito: inglese. Codice e commenti: inglese.
- Mobile first: molti studenti arrivano da Reddit su telefono.
- Prestazioni: niente librerie pesanti. Immagini in WebP/AVIF con `width`/`height` e `loading="lazy"`; video compressi, con `poster` e `preload="none"` sotto la piega.
- SEO: `<title>` e meta description per pagina, incentrati su "lecture", "Panopto", "Canvas", "study faster".
- Cookie: il sito non usa cookie (Vercel Web Analytics è cookieless), quindi niente banner. Se in futuro si aggiunge uno strumento con cookie o session replay, serve il consenso prima di attivarlo.
- Mai committare chiavi API o segreti (il link di checkout è pubblico per natura, non è un segreto).
- Questo file sta dentro la cartella pubblicata: se Vercel la serve così com'è, sarà visibile su `/CLAUDE.md`. Non scriverci informazioni riservate.

## Workflow
- Per modifiche a più sezioni: prima un piano, poi implementa.
- Dopo le modifiche: anteprima locale e verifica della pagina su desktop e mobile (DevTools → modalità dispositivo).
- Commit piccoli e descrittivi. Push su GitHub solo quando lo chiedo io: il push pubblica il sito.

## Come comunicare con me
- In italiano, diretto e tecnico, senza preamboli.
- Sto ancora imparando git: spiega in 1–2 frasi cosa fa un comando prima di eseguirlo.
