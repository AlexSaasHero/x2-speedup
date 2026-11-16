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

**Detailed description:** (prose, no lists of platforms: the 1.9.0 was rejected once for keyword spam)

Lectures at your speed, not your player's.

LectureSpeed helps you study recorded lectures in less time. Lecture players usually stop at 2x and reset your speed when you press play or open the next video. LectureSpeed takes over the speed in your browser: go past 2x on the parts you already know, slow down for the hard ones, and keep your speed through pause, seek and the next lecture. It works on Panopto and Echo360, including lectures embedded in your Canvas or Moodle course page, and on most other HTML5 video players.

It's free, with no account: any speed from 0.1x to 16x, a small on-video controller and keyboard shortcuts (D faster, S slower, R reset, and a few more) that never fire while you type. A counter shows how much time you saved this week, and your settings sync across your devices.

LectureSpeed Pro is built for the week before the exam. Bookmarks with notes let you mark the moment the professor says "this will be on the exam" and jump back in one click. Frame-by-frame freezes on the exact slide or formula, and the A-B loop replays an explanation until it clicks. Pro also remembers your speed on each site, shows detailed study stats (today, this week, total and per page) and lets you choose your own shortcuts. Pro starts with a 7-day free trial, then costs $4.99 a year. Cancel anytime.

Your privacy: LectureSpeed doesn't track what you watch. There are no analytics and no ads; settings, stats and bookmarks stay in your browser. The only network request is the check of a Pro license key.

To start, pin the extension, open a lecture recording and press D. If the player's own menu still shows 1x, that's normal: LectureSpeed is controlling the speed.

LectureSpeed is an independent project and is not affiliated with any lecture or video platform.

**Category:** Education
**Language:** English (the extension UI is also in Italiano, Español, Deutsch, Français, Português (Brasil) and 日本語)

---

## Italiano

**Nome (≤ 75, 55):** LectureSpeed – Guarda le lezioni registrate oltre il 2x

**Descrizione breve (≤ 132, 129):**
Guarda le lezioni registrate oltre il 2x su Panopto ed Echo360, anche in Canvas o Moodle. Segna ciò che conta. Zero tracciamento.

**Descrizione dettagliata:** (in prosa, senza elenchi di piattaforme)

Le lezioni alla tua velocità, non a quella del player.

LectureSpeed ti aiuta a studiare le lezioni registrate in meno tempo. I player delle lezioni di solito si fermano a 2x e riportano la velocità a 1x quando premi play o apri la lezione successiva. LectureSpeed gestisce la velocità nel tuo browser: vai oltre il 2x sulle parti che conosci già, rallenta su quelle difficili e mantieni la tua velocità dopo pausa, salti e alla lezione successiva. Funziona su Panopto ed Echo360, anche quando la lezione è incorporata nella pagina del tuo corso su Canvas o Moodle, e sulla maggior parte degli altri player video HTML5.

È gratis e senza account: qualsiasi velocità da 0.1x a 16x, un piccolo controllo sul video e scorciatoie da tastiera (D più veloce, S più lento, R reset e qualche altra) che non scattano mai mentre scrivi. Un contatore ti mostra quanto tempo hai risparmiato questa settimana, e le impostazioni si sincronizzano tra i tuoi dispositivi.

LectureSpeed Pro è pensato per la settimana prima dell'esame. I segnalibri con note ti fanno segnare il momento in cui il professore dice "questo sarà all'esame" e tornarci con un clic. Il fotogramma per fotogramma si ferma sulla slide o sulla formula giusta, e il loop A-B ripete una spiegazione finché non è chiara. Pro ricorda anche la tua velocità su ogni sito, mostra statistiche di studio dettagliate (oggi, settimana, totale e per pagina) e ti fa scegliere le tue scorciatoie. Pro parte con 7 giorni di prova gratuita, poi costa 4,99 $ all'anno. Disdici quando vuoi.

La tua privacy: LectureSpeed non traccia cosa guardi. Niente analytics e niente pubblicità; impostazioni, statistiche e segnalibri restano nel tuo browser. L'unica richiesta di rete è la verifica della chiave di licenza Pro.

Per iniziare, fissa l'estensione, apri una lezione registrata e premi D. Se il menu del player mostra ancora 1x è normale: la velocità la sta gestendo LectureSpeed.

LectureSpeed è un progetto indipendente e non è affiliato con nessuna piattaforma di lezioni o video.

**Categoria:** Istruzione

---

## Screenshots (1280×800, max 5)

1.9.1 assets: `docs/store-assets/1.9.1/` (5 screenshots, promo tile 440×280, marquee 1400×560), generated by `node docs/store-assets/source/make-shots.mjs` after `npm run build`. Icon: `public/icons/icon128.png`.

Old list (1.9.0, from the draft):

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
- [x] Store screenshots 1280×800, promo tile 440×280 and marquee 1400×560 (`docs/store-assets/1.9.1/`)
- [x] Long description rewritten in prose (EN + IT), "Bookmarks", generic disclaimer
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
