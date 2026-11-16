# Store listing — LectureSpeed (v1.9.1, formerly SpeedUp Video Pro)

> **v1.9.1 (in preparation, branch `release-1.9.1`):** rename to **LectureSpeed**, new icon, popup in the landing palette. Same Store item (same ID): only the listing text, icon and screenshots change. Plan: `docs/PLAN_1.9.1.md`.
>
> **Status: v1.9.0 is published on the Chrome Web Store (approved 2026-11-16)**, after a first rejection for excessive keywords in the description (platform list + 6-brand disclaimer), fixed by rewriting it in prose.

> Source: Alex's draft (`chrome-store-listing.md`, 2026-11-15), corrected against the 1.9.0 code.
> - Platforms: only the ones tested by hand on 1.9.0 (Panopto Viewer and Embed, Echo360; YouTube). Canvas and Moodle only as *hosts* of embedded Panopto/Echo360 lectures, not their own players.
> - Pro features: only what exists in `src/config/plans.ts`. **Skip silence** exists (Pro) but is **not advertised** until Web Audio is verified on Panopto/Echo360 media (CORS). Stats are today / week / total / per page, **not per course**.
> - Lectures: never promise 16x (Panopto stalls at extreme speeds, BUGS #26): "no more 2x cap". "Speed up to 16x" only as a generic feature.
> - Price: yearly subscription, 7-day free trial, then **$4.99/year** — same as the landing page and the Lemon Squeezy checkout. Old $1.99 lifetime keys stay Pro forever.
> - Name and short description below are also the manifest's `extName` / `extDescription` in `src/_locales/*.json` (7 languages).

---

## English

**Name (≤ 75 chars, 53):** LectureSpeed – Watch Recorded Lectures Faster Than 2x

**Short description (≤ 132 chars, 128):**
Watch recorded lectures faster than 2x on Panopto and Echo360, even inside Canvas or Moodle. Bookmark what matters. No tracking.

**Detailed description:**

Lectures at your speed, not your player's.

LectureSpeed is a study tool for students who watch recorded lectures. It works on the lecture platforms your university uses, even when their player stops at 2x.

━━━━━━━━━━━━━━━━━━
🎓 WORKS WHERE YOU STUDY
━━━━━━━━━━━━━━━━━━
• Panopto — including lectures embedded in Canvas or Moodle
• Echo360 — including lectures embedded in Canvas or Moodle
• No more 2x cap on lecture players: LectureSpeed keeps your speed through play, pause, seek and the next lecture
• Also works on YouTube and most HTML5 video players

━━━━━━━━━━━━━━━━━━
⚡ FREE FOREVER
━━━━━━━━━━━━━━━━━━
• Speed up to 16x (from 0.1x), with a small on-video controller
• Keyboard shortcuts: S slower · D faster · R reset · G preferred speed · Z/X back/forward 10 s · V show/hide the controller — never triggered while you type
• Hold Shift+F for a temporary speed boost
• Time-saved counter: see how many hours you got back this week
• Settings sync across your devices; import your Video Speed Controller settings

━━━━━━━━━━━━━━━━━━
🚀 PRO — BUILT FOR EXAM PREP
━━━━━━━━━━━━━━━━━━
• Remembers your speed for each site, page or YouTube channel
• Bookmarks with notes: save key moments and jump back before the exam
• Frame-by-frame: freeze on slides, formulas and whiteboard notes
• A-B loop: replay a hard explanation until it clicks
• Detailed time-saved stats (today, this week, total, per page)
• Custom keyboard shortcuts

Pro: 7-day free trial, then $4.99/year. Cancel anytime.

━━━━━━━━━━━━━━━━━━
🔒 PRIVACY
━━━━━━━━━━━━━━━━━━
No account needed. We don't track what you watch: no analytics, no ads. Settings, stats and bookmarks stay in your browser. The only network request is the check of a Pro license key.

━━━━━━━━━━━━━━━━━━
HOW TO USE
━━━━━━━━━━━━━━━━━━
1. Install and pin the extension
2. Open a lecture recording
3. Press D / S, or use the popup or the on-screen controller

━━━━━━━━━━━━━━━━━━
FAQ
━━━━━━━━━━━━━━━━━━
The player still shows 1x?
Normal: LectureSpeed controls the speed, use D/S or the popup.

Not affiliated with Panopto, Echo360, Instructure (Canvas) or Moodle.

**Category:** Education
**Language:** English (the extension UI is also in Italiano, Español, Deutsch, Français, Português (Brasil) and 日本語)

---

## Italiano

**Nome (≤ 75, 55):** LectureSpeed – Guarda le lezioni registrate oltre il 2x

**Descrizione breve (≤ 132, 129):**
Guarda le lezioni registrate oltre il 2x su Panopto ed Echo360, anche in Canvas o Moodle. Segna ciò che conta. Zero tracciamento.

**Descrizione dettagliata:**

Le lezioni alla tua velocità, non a quella del player.

LectureSpeed è uno strumento di studio per chi segue lezioni registrate. Funziona sulle piattaforme della tua università, anche quando il loro player si ferma a 2x.

━━━━━━━━━━━━━━━━━━
🎓 FUNZIONA DOVE STUDI
━━━━━━━━━━━━━━━━━━
• Panopto — anche le lezioni incorporate in Canvas o Moodle
• Echo360 — anche le lezioni incorporate in Canvas o Moodle
• Niente più limite di 2x sui player delle lezioni: LectureSpeed mantiene la tua velocità dopo play, pausa, salti e alla lezione successiva
• Funziona anche su YouTube e sulla maggior parte dei player video HTML5

━━━━━━━━━━━━━━━━━━
⚡ GRATIS PER SEMPRE
━━━━━━━━━━━━━━━━━━
• Velocità fino a 16x (da 0.1x), con un piccolo controller sul video
• Scorciatoie: S rallenta · D accelera · R reset · G velocità preferita · Z/X indietro/avanti 10 s · V mostra/nasconde il controller — mai attive mentre scrivi
• Tieni premuto Shift+F per accelerare temporaneamente
• Contatore del tempo risparmiato: vedi quante ore hai recuperato questa settimana
• Impostazioni sincronizzate tra i dispositivi; importa le impostazioni di Video Speed Controller

━━━━━━━━━━━━━━━━━━
🚀 PRO — PER PREPARARE GLI ESAMI
━━━━━━━━━━━━━━━━━━
• Ricorda la tua velocità per ogni sito, pagina o canale YouTube
• Segnalibri con note: salva i momenti chiave e ritrovali prima dell'esame
• Fotogramma per fotogramma: fermati su slide, formule e appunti alla lavagna
• Loop A-B: riascolta una spiegazione difficile finché non è chiara
• Statistiche dettagliate del tempo risparmiato (oggi, settimana, totale, per pagina)
• Scorciatoie da tastiera personalizzate

Pro: 7 giorni gratis, poi $4.99 l'anno. Disdici quando vuoi.

━━━━━━━━━━━━━━━━━━
🔒 PRIVACY
━━━━━━━━━━━━━━━━━━
Nessun account. Non tracciamo cosa guardi: niente analytics, niente pubblicità. Impostazioni, statistiche e segnalibri restano nel tuo browser. L'unica richiesta di rete è la verifica della chiave di licenza Pro.

━━━━━━━━━━━━━━━━━━
COME SI USA
━━━━━━━━━━━━━━━━━━
1. Installa e fissa l'estensione
2. Apri una lezione registrata
3. Premi D / S, oppure usa il popup o il controller sul video

━━━━━━━━━━━━━━━━━━
FAQ
━━━━━━━━━━━━━━━━━━
Il player segna ancora 1x?
È normale: la velocità la gestisce LectureSpeed, usa D/S o il popup.

Non affiliato con Panopto, Echo360, Instructure (Canvas) o Moodle.

**Categoria:** Istruzione

---

## Screenshots (1280×800, max 5) — from the draft

1. **Hero:** a Panopto lecture at 2.5x with the controller visible. Overlay text: "Finish lectures in half the time"
2. **Platforms:** Panopto and Echo360 (one embedded in a Canvas/Moodle page). Text: "Works where you study"
3. **Time saved:** popup with the counter. Text: "See the hours you get back"
4. **Bookmarks:** with notes. Text: "Bookmark key moments for exam prep"
5. **Free vs Pro:** comparison table

Use a lecture you own or one with an open license (e.g. MIT OpenCourseWare, CC). No platform logos without permission.

## Other fields

- **Category:** Education
- **Homepage URL:** https://lecturespeed.vercel.app/
- **Support URL:** https://lecturespeed.vercel.app/#faq (contact: speedupvideopro.help@gmail.com)
- **Privacy policy:** https://lecturespeed.vercel.app/privacy.html
- **Terms:** https://lecturespeed.vercel.app/terms.html
- Since 2026-11-16 the site lives at **lecturespeed.vercel.app**; x2-speedup.vercel.app redirects there. Update these URLs in the Store dashboard with the next upload.
- **Support email:** speedupvideopro.help@gmail.com
- **Small promo tile (440×280):** logo + "Lecture Study Tool"

---

## Chrome Web Store — Privacy practices tab

**Single purpose:** Control the playback speed of HTML5 video and audio on web pages, built for studying recorded lectures.

**Permission justifications:** see the table "Permessi finali" in [ROADMAP_IMPL.md](ROADMAP_IMPL.md).

| Permission | Justification (EN) |
|---|---|
| storage | Saves the user's settings, shortcuts, speed rules, time-saved statistics and license status locally; settings (no personal data) can sync via the browser's own sync. |
| activeTab | Reads the URL/title of the active tab only when the user opens the popup, to show bookmarks and create speed rules for that page. |
| alarms | Wakes the service worker at most once a day to re-check the license key, without keeping it running. |
| Host permission (api.lemonsqueezy.com) | License key verification with our payment provider. Only the key is sent. |
| Content script on all sites | Keyboard shortcuts, the speed controller and speed persistence must work on any site with HTML5 video (lecture players are often embedded in iframes of university sites) without the user opening the popup each time. The script only interacts with video/audio elements; it does not read or transmit page content. |

**Remote code:** No. All code is packaged; Pro modules are packaged files loaded with `import()`.

**Data usage disclosure:** The extension does not collect or transmit user data. The license key the user enters is sent to Lemon Squeezy for verification. Nothing is sold or shared; no analytics.

**Privacy policy URL:** https://lecturespeed.vercel.app/privacy.html — updated for 1.9.0: separates the extension (zero tracking, only license verification with Lemon Squeezy) from the website (cookie-free Vercel Web Analytics since 2026-11-15; GA4 and Clarity removed).

## Publishing checklist — 1.9.1 (LectureSpeed)

- [x] `extName` / `extDescription` / `actionTitle` and the 15 strings with the old name updated in 7 languages (`src/_locales/*.json`)
- [x] `version` 1.9.1 in `public/manifest.json` and `package.json`
- [x] New icons 16/32/48/128 (`node scripts/make-icons.mjs`; 128 has 16 px transparent padding)
- [x] Popup, options and onboarding in the landing palette; fonts bundled (no network)
- [ ] Store screenshots 1280×800 + promo tile with the new popup and name
- [ ] Manual QA (`docs/QA.md`): Panopto, Echo360, Panopto in Canvas/Moodle, YouTube; Free and Pro popup; onboarding; import of a 1.9.0 backup
- [ ] `npm run zip` → upload `release/LectureSpeed_v1.9.1.zip`; in the dashboard: name/description (EN + IT), new icon, screenshots
- [ ] After approval: `RENAME_NOTICE = false` in `landing-page/site.js`, regenerate the landing screenshots, push
- [ ] Lemon Squeezy (by hand): product name "LectureSpeed Pro – Annual", store logo; AMO (Firefox): name and description

## Publishing checklist — 1.9.0

- [x] Tested by hand on Panopto (Viewer, Embed) and Echo360 — Alex, 2026-11-15
- [x] `name` and `description` updated (`src/_locales/*.json`, manifest uses `__MSG_…__`)
- [x] `version` 1.9.0 in manifest
- [x] Upload `release/SpeedUp_Video_Pro_v1.9.0.zip` — approved and live 2026-11-16
- [ ] Description, screenshots and category (Education) updated in the dashboard
- [x] Privacy policy URL working (200, checked 2026-11-16)
- [ ] "Privacy practices" tab: host permission now only api.lemonsqueezy.com
