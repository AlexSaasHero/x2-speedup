# Contesto: lavoro sulla landing page

> Da incollare (o far leggere) all'inizio di una sessione Claude Code dedicata alla landing.
> La documentazione tecnica permanente resta in `landing-page/CLAUDE.md`: questo file descrive la **fase di lavoro attuale**.

## 1. Il prodotto in breve
- Estensione Chrome per **studiare le lezioni registrate in meno tempo**.
- **Target:** studenti universitari, mercato globale. Sito in inglese.
- **Piattaforme testate e quindi promettibili:** Panopto (anche incorporato in Canvas o Moodle) ed Echo360. Funziona anche su YouTube e sulla maggior parte dei video HTML5.
- **Non promettere** Udemy, Coursera né i player nativi di Canvas e Moodle: non sono testati.
- **La velocità è un plus, non l'USP:** il messaggio è "studia più in fretta", non "video speed controller".

## 2. Free e Pro (solo funzioni che esistono nella 1.9.0)
- **Free:** velocità da 0.1x a 16x, scorciatoie D (più veloce), S (più lento), R (reset), contatore del tempo risparmiato.
- **Pro:** velocità ricordata per sito, checkpoint con note, frame per frame, loop A-B, statistiche (oggi, settimana, totale, per pagina), scorciatoie personalizzabili.
- **Non pubblicizzare** il salto dei silenzi (è in Beta e disattivato su Panopto ed Echo360).
- **Sulle lezioni non promettere il 16x:** usa "no more 2x cap". Il 16x vale solo come funzione generica.
- **Prezzo:** $4.99 all'anno, 7 giorni di prova gratuita.
- **Checkout:** https://speedup-videopro.lemonsqueezy.com/checkout/buy/69ea0406-3835-48e7-b03c-301a23d775cf
- **Contatto:** speedupvideopro.help@gmail.com

## 3. Stato attuale
- **Landing:** HTML statico in `landing-page/` (Tailwind, Vercel Web Analytics senza cookie; GA4 e Clarity rimossi il 2026-11-15), online su https://lecturespeed.vercel.app. Il deploy parte da solo a ogni push su `main` di GitHub (AlexSaasHero/x2-speedup).
- **Già fatto:** home riscritta come study tool, `privacy.html` aggiornata alla 1.9.0, `terms.html` creata, `.vercelignore` che esclude CLAUDE.md, video demo rimossi.
- **Chrome Web Store:** la **1.9.0 è approvata e pubblicata** (2026-11-16), dopo un primo rifiuto per parole chiave in eccesso nella descrizione (elenco di piattaforme e disclaimer con 6 marchi), risolto riscrivendola in prosa.
- **Checkout Pro attivo** sulla landing dal 2026-11-16 (`PRO_CHECKOUT_ENABLED = true` in `landing-page/site.js`); dopo il pagamento si arriva su `thanks.html`.

## 4. Il cambio di nome (decisione in sospeso)
- Il nome "SpeedUp Video Pro" verrà sostituito. Candidati: **LectureFlow** (preferito) o **University Flow**.
- Finché non è deciso, usa **`[BRAND]`** nei testi nuovi.
- **Piano di uscita:** la landing con il nuovo nome si prepara su un branch separato e va online solo quando la versione 1.9.1 dell'estensione (con il nuovo nome) è approvata sullo Store. Sito e Store cambiano nome insieme.
- Indirizzo ufficiale dal 2026-11-16: **https://lecturespeed.vercel.app** (`x2-speedup.vercel.app` fa redirect). Nome definitivo: LectureSpeed.

## 5. Regole per questa fase
- **Lavora sul branch `landing-rebrand`** (`git checkout -b landing-rebrand` se non esiste). **Nessun push su `main`**: il push su main pubblica il sito.
- **Niente keyword stuffing**, né sul sito né nei meta tag. Lo Store ci ha già rifiutato per questo e Google penalizza allo stesso modo. Parole chiave dentro frasi naturali, mai elenchi di nomi di piattaforme.
- **Marchi di terzi:** Panopto ed Echo360 si possono citare nelle frasi ("works on Panopto"), ma mai nel nome del prodotto, mai con i loro loghi, mai elencando molti marchi di seguito. Disclaimer breve e generico: "not affiliated with any lecture or video platform".
- **Solo promesse vere:** ogni funzione o piattaforma citata deve corrispondere alla sezione 1–2.
- **Mobile first:** molti studenti arrivano da Reddit sul telefono. Verifica sempre sotto i 400 px.
- **Anteprima locale:** `python3 -m http.server 8000 --directory landing-page`
- Commit piccoli e descrittivi. Mai cancellare file: spostali in `_to_delete/`.

## 6. Obiettivi della landing, in ordine
1. **Conversione:** dal primo sguardo al click "Add to Chrome" in meno di 10 secondi.
2. **Upgrade al Pro:** far capire cosa aggiunge il Pro e perché vale $4.99 all'anno.
3. **SEO:** farsi trovare su Google per le ricerche reali degli studenti.

## 7. Piano di lavoro
1. **Audit** (prima cosa da fare, solo lettura) in `docs/LANDING_AUDIT.md`:
   - SEO tecnica: title, meta description, H1/H2, Open Graph/Twitter card, favicon, canonical, sitemap.xml, robots.txt, dati strutturati (FAQPage, SoftwareApplication), lingua, peso della pagina e script.
   - Contenuti: per quali ricerche può posizionarsi oggi e quali mancano ("speed up Panopto", "Panopto 2x limit", "Echo360 playback speed", "watch lectures faster").
   - Conversione: percorso fino ad "Add to Chrome" e "Start free trial", cosa rallenta o confonde.
   - Mobile: problemi sotto i 400 px.
   - Lista di interventi ordinati per impatto e sforzo.
2. **SEO tecnica:** meta tag, Open Graph con immagine 1200×630, sitemap, robots, dati strutturati.
3. **Pagine per intento di ricerca:** una pagina breve e utile per ogni ricerca reale, per esempio "How to speed up Panopto beyond 2x" o "Echo360 playback speed: how to go faster". Contenuto vero (problema, soluzione, passi), con l'estensione come soluzione, non pagine riempite di parole chiave.
4. **Rebrand con il nome definitivo**, quando è deciso.
5. **Dominio e Google Search Console**, al momento dell'uscita.

## 8. Come comunicare con me
- In italiano, diretto e tecnico, senza preamboli.
- Sto ancora imparando git: spiega in 1–2 frasi cosa fa un comando prima di eseguirlo.
- Per lavori su più file: prima un piano breve, poi aspetta il mio ok.

---
**Primo compito:** crea il branch `landing-rebrand` e fai l'audit del punto 7.1. Nessuna modifica ai file della landing finché non approvo il piano.
