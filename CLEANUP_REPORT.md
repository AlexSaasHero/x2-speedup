# CLEANUP_REPORT — Saas X2 (SpeedUp Video Pro)

Data analisi: 2026-11-13 · Fase 1 (sola lettura). Nessun file è stato spostato o modificato; questo è l'unico file creato.

---

## 0. In breve (leggi prima questo)

1. **La cartella è già un progetto ordinato e già sotto git.** C'è un repository git con 56 commit, collegato a GitHub
   (`origin` = `github.com/AlexSaasHero/x2-speedup`), ed è **allineato** con GitHub (0 commit da pushare, nessuna modifica in sospeso).
   Esiste già un `.gitignore` corretto che esclude `node_modules/`, `dist/`, `release/`, `coverage/`, `.env`, ecc.
2. **Non ho trovato file di Antigravity** (nessuna cartella `.agent/`, `.gemini/`, `.antigravity/`, log o piani di task).
   I file `.md` in `docs/` e `CLAUDE.md` sono documentazione del progetto, usata attivamente da Claude Code: **da tenere**.
3. **Non c'è Next.js.** La landing è HTML statico (`landing-page/index.html` + `privacy.html`, Tailwind da CDN),
   pubblicata su `x2-speedup.vercel.app`. La privacy policy linkata dallo Store è `x2-speedup.vercel.app/privacy.html`.
4. **La struttura proposta (`extension/` + `landing/`) sconsiglio di applicarla**, perché romperebbe cose che oggi funzionano:
   - **Vercel** quasi certamente pubblica la cartella `landing-page/` di questo repo: rinominarla/spostarla può far
     andare offline il sito e la **privacy policy richiesta dal Chrome Web Store** (da verificare nelle impostazioni del progetto Vercel → "Root Directory").
   - La **CI di GitHub** (`.github/workflows/ci.yml`) e `CLAUDE.md` danno per scontato che il progetto sia nella root.
   - Il "git init in `extension/`" della Fase 2 creerebbe un **secondo repo** dentro quello esistente e perderebbe la storia di 56 commit.
5. Pulizia reale necessaria: **poca**. ~1,3 MB di file rigenerabili + 3 icone di test inutilizzate + gli zip vecchi da archiviare.

---

## 1. Mappa (3 livelli, senza `node_modules`)

`node_modules/` **esiste** e pesa **111 MB** (si rigenera con `npm install`). Totale cartella: 134 MB (di cui `.git` 12 MB).
File esclusi `node_modules`: 914 (220 escludendo anche `.git`).

```
Saas X2/
├── .git/                    repository git (storia del progetto)
├── .github/workflows/ci.yml test automatici su GitHub ad ogni push
├── .gitignore
├── .DS_Store                file di sistema macOS
├── CLAUDE.md                istruzioni per Claude Code
├── CHROMEWEBSTORE.md        vecchi testi dello Store (≤ v1.4.2, marcato "Superato")
├── README.md
├── package.json / package-lock.json
├── tsconfig.json  vitest.config.ts  playwright.config.ts  playwright.live.config.ts
├── scripts/                 build.mjs, firefox.mjs, locales.mjs (+ .d.mts)
├── src/                     CODICE SORGENTE (TypeScript)
│   ├── _locales/            traduzioni (de en es fr it ja pt_BR)
│   ├── background/          service worker (licenza, sync)
│   ├── config/plans.ts      limiti Free/Pro
│   ├── content/             script iniettato nelle pagine
│   ├── onboarding/ options/ popup/ ui/
│   ├── pro/                 funzioni Pro (caricate a richiesta)
│   ├── shared/              logica pura testata
│   └── globals.d.ts
├── public/                  manifest.json, icone, HTML/CSS di popup/options/onboarding
├── tests/                   unit/ (Vitest), e2e/ (Playwright + fixtures), live/ (YouTube)
├── docs/                    BUGS, QA, ROADMAP_IMPL, STORE_LISTING, FIREFOX, CLAUDE_PROJECT_CONTEXT
├── landing-page/            sito: index.html, privacy.html, 2 video mp4
├── dist/                    build Chrome (v1.8.2) — generata
├── dist-firefox/            build Firefox (v1.8.1, vecchia) — generata
├── release/                 17 zip di versioni v1.3 → v1.8.2
├── coverage/                report copertura test — generato
├── test-results/            esito ultimo test e2e — generato
├── node_modules/            dipendenze — generate
└── test_16.png test_48.png test_128.png   icone di prova non usate
```

---

## 2. Classificazione e azioni proposte

Legenda gruppi: A sorgente estensione · B landing · C dipendenze · D build/output · E agenti AI · F duplicati/vecchie versioni · G non chiaro.
"In git?" = il file è salvato nel repository.

| Percorso | Gruppo | Dimensione | In git? | Azione proposta |
|---|---|---|---|---|
| `src/` | A | 440 KB | sì | **tenere** |
| `public/` | A | 92 KB | sì | **tenere** (contiene il `manifest.json` "ufficiale") |
| `scripts/` | A | 24 KB | sì | **tenere** (il sistema di build) |
| `tests/` | A | 156 KB | sì | **tenere** |
| `package.json` | A | 1 KB | sì | **tenere** |
| `tsconfig.json`, `vitest.config.ts`, `playwright*.config.ts` | A | <2 KB | sì | **tenere** |
| `.github/` | A | 4 KB | sì | **tenere** (CI) |
| `.gitignore` | A | 128 B | sì | **tenere** (aggiungere 2 righe, vedi §6) |
| `README.md` | A | 4 KB | sì | **tenere** |
| `CLAUDE.md` | A/E | 2 KB | sì | **tenere** (è usato da Claude Code) |
| `docs/` | A/E | 68 KB | sì | **tenere** (documentazione viva, citata da `CLAUDE.md`) |
| `CHROMEWEBSTORE.md` | F | 4 KB | sì | **tenere** oppure spostare in `docs/` — è storico (≤ v1.4.2), già marcato "Superato". Basso impatto, decidi tu |
| `landing-page/` | B | 7,8 MB | sì | **tenere dov'è** (vedi §0.4: rischio Vercel) |
| `node_modules/` | C | 111 MB | no | lasciare (si rigenera; già ignorato da git) |
| `package-lock.json` | C | 96 KB | sì | **tenere** — non va cancellato: fissa le versioni esatte delle dipendenze, la CI lo usa (`npm ci`) |
| `dist/` | D | 468 KB | no | **tenere** — è la cartella da caricare in `chrome://extensions`; si rigenera con `npm run build` |
| `dist-firefox/` | D | 468 KB | no | `_to_delete/` — build Firefox **vecchia** (v1.8.1); si rigenera |
| `coverage/` | D | 412 KB | no | `_to_delete/` — report di test, si rigenera |
| `test-results/` | D | 4 KB | no | `_to_delete/` — si rigenera |
| `release/SpeedUp_Video_Pro_v1.8.2.zip` | D | 121 KB | no | **tenere in `release/`** — è lo zip pronto da inviare allo Store |
| `release/` gli altri 16 zip (v1.3 → v1.8.1) | F | ~570 KB | no | `_archive/release/` — versioni pubblicate in passato, da conservare |
| `test_16.png`, `test_48.png`, `test_128.png` | G | 16 KB | sì | `_to_delete/` — vedi §2.1 |
| `.DS_Store` | G | 6 KB | no | `_to_delete/` — file di sistema macOS, inutile (già ignorato) |

### 2.1 File non chiari (G)
- **`test_16.png`, `test_48.png`, `test_128.png`**: icone presenti dal primissimo commit (agosto). **Nessun file del progetto le usa**
  e sono **diverse** dalle icone vere in `public/icons/`. Probabilmente prove di un'icona alternativa. Ti consiglio di aprirle
  e guardarle prima di decidere; restano comunque nella storia di git.

### 2.2 File che sembrano "di agenti AI" ma sono usati → lasciare dove sono
- `CLAUDE.md` e `docs/*.md`: generati da Claude Code, ma sono la memoria del progetto (roadmap, bug, QA, testi Store). **Non spostare.**

---

## 3. Quale versione è pubblicata sul Chrome Web Store

Manifest trovati (escluso `node_modules`):

| File | name | version | Modificato |
|---|---|---|---|
| `public/manifest.json` (sorgente) | `__MSG_extName__` → "SpeedUp Video Pro" | **1.8.2** | 11 nov 15:40 |
| `dist/manifest.json` (build) | idem | **1.8.2** | 11 nov 15:47 |
| `dist-firefox/manifest.json` (build) | idem | 1.8.1 (vecchia) | 11 nov 15:10 |
| dentro `release/…v1.5.1.8.zip` | "SpeedUp Video Pro" | 1.5.1.8 | 7 nov |

- **La più recente è la 1.8.2** (`public/manifest.json`, file di riferimento). Non ci sono più copie del sorgente: c'è una sola versione del codice.
- **Quella oggi online sullo Store, dai file, sembra la 1.5.1.8**: `docs/CLAUDE_PROJECT_CONTEXT.md` dice che l'invio della 1.8.2 è
  ancora da fare ("Invio allo store con lo zip 1.8.2"), e la 1.5.1.8 è l'ultima della serie vecchia (base di partenza del lavoro).
  Le 1.6–1.8.1 sembrano versioni intermedie mai inviate. ⚠️ **Non posso esserne sicuro**: controlla nel Chrome Developer Dashboard il numero di versione pubblicato.

---

## 4. Stack dell'estensione

| | |
|---|---|
| Linguaggio | **TypeScript** (più un file JS: `src/popup/index.js`) |
| Build tool | **esbuild**, pilotato dallo script `scripts/build.mjs` (niente Vite/webpack/WXT/Plasmo) |
| Test | Vitest (unit), Playwright (e2e e live) |
| Build Chrome | `npm run build` → cartella **`dist/`** |
| Build Firefox | `npm run build -- --target=firefox` → `dist-firefox/` |
| Zip per lo Store | `npm run zip` → `release/SpeedUp_Video_Pro_v<versione>.zip` (è lo zip del contenuto di `dist/`) |
| Controllo completo | `npm run check` (typecheck + test + build) |

---

## 5. Segreti e file `.env`

- **Nessun file `.env`** trovato.
- **Nessuna API key, token o password reale** nel codice sorgente.
- Da sapere (non sono problemi):
  - `scripts/build.mjs` contiene una chiave master di sviluppo (`DEV-SPEEDUP-PRO-2026`) usata **solo** con `npm run build:dev`;
    nella build di produzione è vuota. È già su git/GitHub: se il repo GitHub è pubblico, chiunque la vede, ma funziona solo nelle build di sviluppo.
  - `landing-page/index.html` contiene l'ID di Google Analytics (`G-1WMDCJ7HDC`) e il link di checkout Lemon Squeezy: sono **pubblici per natura** (stanno nel sito), non segreti.
  - La vecchia chiave GA4 `api_secret` (in `utils/analytics.js`) è stata **rimossa** dal codice (BUGS #4), ma **resta nella storia di git**.
    Se il repo GitHub è pubblico, valuta di revocarla/ruotarla da Google Analytics.

---

## 6. Struttura finale proposta

### Opzione 1 — consigliata: pulizia minima, struttura invariata
```
Saas X2/
├── src/ public/ scripts/ tests/ docs/ .github/   ← invariati
├── landing-page/                                  ← invariata (Vercel)
├── dist/                                          ← build da caricare in Chrome (rigenerabile)
├── release/SpeedUp_Video_Pro_v1.8.2.zip           ← solo lo zip corrente
├── _archive/release/                              ← 16 zip delle versioni precedenti
├── _to_delete/                                    ← dist-firefox, coverage, test-results, test_*.png, .DS_Store
└── (file di configurazione nella root, come ora)
```
- Fase 2 adattata: **niente `git init`** (il repo esiste già). Backup con `cp -R` sì. Al `.gitignore` aggiungo solo `_to_delete/` e `_archive/`
  (gli zip non vanno su git) e poi commit "snapshot prima del riordino" (oggi non c'è nulla da committare tranne questo report).
- Nessun percorso da aggiornare: build, test e CI continuano a funzionare.

### Opzione 2 — quella che avevi chiesto (`extension/` + `landing/`)
```
X2/
├── extension/   ← src, public, scripts, tests, docs, package.json, config…
├── landing/     ← landing-page rinominata
├── _archive/
└── _to_delete/
```
Cosa servirebbe e cosa rischi:
- spostare tutto con `git mv` (non `git init` da capo) per non perdere la storia;
- aggiornare `.github/workflows/ci.yml` (deve entrare in `extension/`), `CLAUDE.md`, i link nei `docs/`;
- cambiare la **Root Directory su Vercel** da `landing-page` a `landing` **nello stesso momento** del push, altrimenti sito e privacy policy vanno offline;
- nessun vantaggio pratico: l'estensione funzionerebbe esattamente come prima.

---

## 7. Domande per te prima di procedere

1. **Opzione 1 (consigliata) o Opzione 2?**
2. Le icone `test_*.png`: in `_to_delete/` va bene?
3. `CHROMEWEBSTORE.md`: lo lascio nella root o lo sposto in `docs/`?
4. Mi confermi dal Developer Dashboard quale versione è online (1.5.1.8?).

Mi fermo qui finché non mi scrivi "ok" (indicando l'opzione).
