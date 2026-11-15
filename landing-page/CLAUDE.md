# CLAUDE.md: SpeedUp Video Pro (landing page)

Vale insieme al `CLAUDE.md` nella root del repo (regole generali, git, estensione). Qui solo ciò che riguarda il sito.

## Prodotto
- Landing page dell'estensione Chrome **SpeedUp Video Pro**.
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

## Checkout Pro: interruttore
Dal 2026-11-15 l'acquisto è **spento** finché la 1.9.0 non è approvata sullo Store (lo Store distribuisce ancora la 1.5.1.8).
- Interruttore unico: `PRO_CHECKOUT_ENABLED` in cima a `site.js`.
- `false` (oggi): i bottoni Pro (`data-pro-cta`) mostrano "Pro launching soon" e portano alla sezione `#pricing`; `lemon.js` non viene caricato.
- `true`: i bottoni prendono il testo di `data-pro-label` ("Try Pro free for 7 days") e aprono il checkout in overlay; dopo `Checkout.Success` redirect a `/thanks.html`.
- **Per riattivarlo:** in `site.js` metti `const PRO_CHECKOUT_ENABLED = true;`, anteprima locale (clic sul bottone Pro → si apre l'overlay Lemon Squeezy), commit, push su `main`.
- Nuovi bottoni Pro: `<a href="#pricing" data-pro-cta data-pro-label="Testo quando è attivo">Pro launching soon</a>`. Mai mettere il link di checkout direttamente nell'HTML.

## Mobile: niente "Add to Chrome"
Le estensioni non si installano da telefono. Sotto i 768 px, o con user agent mobile (classe `html.mobile-ua` messa da `site.js`), gli elementi `.desktop-only` (i CTA verso lo Store) spariscono e compaiono i `.mobile-only` ("Open this page on your computer" + bottone `data-copy-link`). Regole in `site.css`. Ogni nuovo CTA verso lo Store va affiancato dal blocco mobile.
- **FAQ:** "Funziona sulla piattaforma della mia università?", "Raccogliete dati?", "Come attivo il Pro?", "Posso disdire?"

## Stack
- **HTML statico**, niente framework e niente build: `index.html` (home), `privacy.html` (privacy policy), `terms.html` (termini dell'abbonamento), `thanks.html` (dopo il pagamento, `noindex`). Codice condiviso: `site.js` (interruttore Pro, rilevamento mobile, "Copy link"; caricato nell'head senza `defer`) e `site.css`. I due video demo della vecchia home sono stati spostati in `_to_delete/landing-page/` (2026-11-15).
- Styling: **Tailwind dal CDN** (`cdn.tailwindcss.com`, versione "play": comoda ma pesante e sconsigliata in produzione) + CSS inline.
- Script esterni: Google Analytics 4 (`G-1WMDCJ7HDC`), Microsoft Clarity, Lemon Squeezy `lemon.js`. Il tracciamento riguarda **solo il sito**, mai l'estensione, ed è dichiarato in `privacy.html`.
- Deploy: **Vercel**, dominio `x2-speedup.vercel.app`. Non c'è nessun backend: l'estensione verifica le licenze direttamente con Lemon Squeezy (`/api/validate-license` non è mai esistito).
  ⚠️ Da verificare nel pannello Vercel quale repo/cartella pubblica il sito (Root Directory = `landing-page`?) e da quale branch.
- URL che non devono cambiare: `/privacy.html` (linkata dallo Store e da `docs/STORE_LISTING.md`) e la home (linkata dall'estensione in `src/shared/links.ts`). Non rinominare né spostare la cartella `landing-page/`.
- Comandi: nessuna build. Anteprima locale: `python3 -m http.server 8000 --directory landing-page`, poi apri `http://localhost:8000`.

## Regole
- Lingua del sito: inglese. Codice e commenti: inglese.
- Mobile first: molti studenti arrivano da Reddit su telefono.
- Prestazioni: niente librerie pesanti. Immagini in WebP/AVIF con `width`/`height` e `loading="lazy"`; video compressi, con `poster` e `preload="none"` sotto la piega.
- SEO: `<title>` e meta description per pagina, incentrati su "lecture", "Panopto", "Canvas", "study faster".
- Cookie consent: GA4 e Clarity oggi partono senza banner; per i visitatori UE serve il consenso prima di attivarli (decisione aperta).
- Mai committare chiavi API o segreti (ID GA4 e link di checkout sono pubblici per natura, non sono segreti).
- Questo file sta dentro la cartella pubblicata: se Vercel la serve così com'è, sarà visibile su `/CLAUDE.md`. Non scriverci informazioni riservate.

## Workflow
- Per modifiche a più sezioni: prima un piano, poi implementa.
- Dopo le modifiche: anteprima locale e verifica della pagina su desktop e mobile (DevTools → modalità dispositivo).
- Commit piccoli e descrittivi. Push su GitHub solo quando lo chiedo io: il push pubblica il sito.

## Come comunicare con me
- In italiano, diretto e tecnico, senza preamboli.
- Sto ancora imparando git: spiega in 1–2 frasi cosa fa un comando prima di eseguirlo.
