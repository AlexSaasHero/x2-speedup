# Store listing — SpeedUp Video Pro (v1.8.x)

> Pricing (decided 2026-11-11): 7-day free trial, then a one-time **$1.99** lifetime license — same as the landing page and the Lemon Squeezy checkout.

---

## English

**Name:** SpeedUp Video Pro

**Short description (≤ 132 chars):**
Control the speed of any web video with your keyboard. Skip silence, speed rules, up to 16x. 100% local, zero tracking.

**Detailed description:**

Watch any HTML5 video or audio at the speed you want — lectures, courses, podcasts, YouTube, Vimeo, Twitch and more — without leaving the page.

FREE
• Speed from 0.1x to 4x with a configurable step, presets and a custom value
• Keyboard shortcuts compatible with Video Speed Controller: S slower, D faster, R reset, G preferred speed, Z/X back/forward 10 s, V show/hide the overlay — fully customizable, with Shift/Alt/Ctrl, and never triggered while you type
• A small draggable overlay on the video (also in fullscreen) that never blocks the player
• Your speed survives ads, quality changes, playlists and page navigation — and the player's own speed menu is respected
• Works with video and audio, inside iframes and web components
• See how much time you saved this week
• Settings sync across your devices; import your Video Speed Controller settings in one paste
• Available in English, Italiano, Español, Deutsch, Français, Português (Brasil) and 日本語

PRO — 7-day free trial, then a one-time $1.99 (lifetime, no subscription)
• Up to 16x and frame-by-frame stepping
• Skip silence: automatically speeds through pauses in lectures and podcasts
• Speed rules per YouTube channel, URL or site — set it once, it's always right
• YouTube ads at 16x and muted, then back to your speed and sound
• Hold-to-speed (hold Shift+F for 2.5x), A-B repeat and video bookmarks
• Detailed time-saved statistics (today, this week, total)

PRIVACY — 100% LOCAL, ZERO TRACKING
No analytics, no tracking, no ads. Settings, statistics and bookmarks are stored in your browser. The only network request is the verification of your license key.

**Category:** Productivity (secondary: Photos & Media)

---

## Italiano

**Nome:** SpeedUp Video Pro

**Descrizione breve (≤ 132 caratteri):**
Controlla la velocità di qualsiasi video web da tastiera. Salta silenzi, regole di velocità, fino a 16x. 100% locale, zero tracciamento.

**Descrizione dettagliata:**

Guarda qualsiasi video o audio HTML5 alla velocità che vuoi — lezioni, corsi, podcast, YouTube, Vimeo, Twitch e altro — senza lasciare la pagina.

GRATIS
• Velocità da 0.1x a 4x con passo configurabile, preset e valore personalizzato
• Scorciatoie compatibili con Video Speed Controller: S rallenta, D accelera, R reset, G velocità preferita, Z/X indietro/avanti di 10 s, V mostra/nasconde l'overlay — tutte personalizzabili, con Shift/Alt/Ctrl, e mai attive mentre scrivi
• Un piccolo overlay trascinabile sul video (anche a schermo intero) che non blocca mai il player
• La velocità resta dopo pubblicità, cambi di qualità, playlist e navigazione — e il menu velocità del player viene rispettato
• Funziona con video e audio, dentro iframe e web component
• Vedi quanto tempo hai risparmiato questa settimana
• Impostazioni sincronizzate tra i dispositivi; importa le impostazioni di Video Speed Controller con un incolla
• Disponibile in English, Italiano, Español, Deutsch, Français, Português (Brasil) e 日本語

PRO — prova gratuita di 7 giorni, poi $1.99 una tantum (a vita, nessun abbonamento)
• Fino a 16x e avanzamento fotogramma per fotogramma
• Salta silenzi: accelera automaticamente le pause in lezioni e podcast
• Regole di velocità per canale YouTube, URL o sito — imposti una volta, è sempre giusta
• Pubblicità YouTube a 16x senza audio, poi torna la tua velocità e il suono
• Tieni premuto per accelerare (Shift+F per 2.5x), ripetizione A-B e segnalibri video
• Statistiche dettagliate del tempo risparmiato (oggi, settimana, totale)

PRIVACY — 100% LOCALE, ZERO TRACCIAMENTO
Nessuna analytics, nessun tracciamento, nessuna pubblicità. Impostazioni, statistiche e segnalibri restano nel tuo browser. L'unica richiesta di rete è la verifica della chiave di licenza.

**Categoria:** Produttività (secondaria: Foto e video)

---

## Chrome Web Store — Privacy practices tab

**Single purpose:** Control the playback speed of HTML5 video and audio on web pages.

**Permission justifications:** see the table "Permessi finali" in [ROADMAP_IMPL.md](ROADMAP_IMPL.md) (copy the English sentences below).

| Permission | Justification (EN) |
|---|---|
| storage | Saves the user's settings, shortcuts, speed rules, time-saved statistics and license status locally; settings (no personal data) can sync via the browser's own sync. |
| activeTab | Reads the URL/title of the active tab only when the user opens the popup, to show bookmarks and create speed rules for that page. |
| alarms | Wakes the service worker at most once a day to re-check the license key, without keeping it running. |
| Host permissions (x2-speedup.vercel.app, api.lemonsqueezy.com) | License key verification. Only the key is sent. |
| Content script on all sites | Keyboard shortcuts, the speed overlay and speed persistence must work on any site with HTML5 video without the user opening the popup each time. The script only interacts with video/audio elements; it does not read or transmit page content. |

**Remote code:** No. All code is packaged; Pro modules are packaged files loaded with `import()`.

**Data usage disclosure:** The extension does not collect or transmit user data. The license key the user enters is sent to the license server for verification. Nothing is sold or shared; no analytics.

**Privacy policy URL:** https://x2-speedup.vercel.app/privacy.html — updated 2026-11-11: separates the extension (zero tracking, only license verification) from the website (Google Analytics 4 + Microsoft Clarity).
