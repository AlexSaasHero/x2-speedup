# CHROMEWEBSTORE.md — SpeedUp Video Pro

> Single source of truth for Chrome Developer Dashboard metadata, store listing copy, permissions justifications, privacy policy, and release history.

---

## Store Listing Metadata

| Field | Value |
|-------|-------|
| **Extension Name** | SpeedUp Video Pro |
| **Short Description (IT)** | Controllo rapido della velocità per qualsiasi video web. 7 giorni di prova gratuita. |
| **Short Description (EN)** | Fast playback speed control for any web video. 7-day free trial. |
| **Version** | 1.4.2 |
| **Primary Category** | Produttività / Productivity |
| **Secondary Category** | Foto e Video / Photos & Media |
| **Language** | Italiano (Primary), English |

---

## Detailed Store Description

### Italian (IT)
**SpeedUp Video Pro** è l'estensione definitiva per il controllo preciso e istantaneo della velocità di riproduzione per qualsiasi video HTML5 sul web (Vimeo, Twitch, corsi online e player web personalizzati).

**Modello di Monetizzazione:**
- 🎁 **7 Giorni di Prova Gratuita**: Prova tutte le funzionalità senza limiti al primo avvio.
- ⚡ **Licenza a Vita a soli $3.99**: Pagamento unico, nessun abbonamento o costo ricorrente.

**Caratteristiche Principali:**
- ⚡ **Controllo Velocità da 0.1x a 16.0x**: Regolazione ultra-flessibile con pulsanti rapidi, slider o valore numerico personalizzato.
- 🎯 **Controller HUD Sovrapposto (Floating Badge)**: Badge elegante direttamente sul video per cambiare la velocità al passaggio del mouse.
- 🎵 **Conservazione Intonazione Audio**: Mantiene il tono audio naturale anche ad alte velocità.
- 🔁 **Ripetizione Video (Loop)**: Riavvia automaticamente qualsiasi video al termine.
- ⌨️ **Scorciatoie da Tastiera Veloci**:
  - `S`: Rallenta (-0.10x / -0.25x con Shift)
  - `D`: Accelera (+0.10x / +0.25x con Shift)
  - `R`: Ripristina a 1.0x
  - `Z` / `X`: Indietro / Avanti di 10 secondi
  - `V`: Mostra / Nascondi il controller HUD sul video
- 💾 **Velocità Predefinita Memorizzata**: Imposta la velocità preferita da applicare automaticamente.

---

## Permissions Justification

| Permission | Justification |
|------------|---------------|
| `activeTab` | Required to access the currently active browser tab and inspect/control `<video>` HTML5 elements when the user opens the popup. |
| `scripting` | Required to inject playback speed control logic into web pages that host HTML5 video elements. |
| `storage` | Required to save user preferences locally (installDate, default playback speed, license state, HUD overlay visibility, pitch preservation state). |
| `tabs` | Required to detect tab URL and safely disable overlay execution on excluded platforms like YouTube. |
| `host_permissions: ["<all_urls>"]` | Required so that video speed controls and the floating HUD overlay can operate on any HTTP/HTTPS website containing video content. |

---

## Manifest V3 Code Compliance & Performance Optimization

- **Instant UI Render (<50ms)**: Reads `chrome.storage.local` cache immediately on popup mount. Zero blocking network calls or synchronous fetches on popup startup.
- **150ms Non-Blocking Tab Message Timeout**: Tab status communication utilizes a strict 150ms timeout fallback to prevent DOM freezing when Loom or recording overlays are active.
- **Zero Remote Code / Zero Remote Scripts**: 100% of extension scripts and stylesheets are bundled locally. No remote CDN links or dynamic eval calls.

---

## Version History

### Version 1.4.2
- Performance Optimization: Deferred all network calls to non-blocking background promises.
- Instant popup rendering (<50ms) using `chrome.storage.local` cache.
- Added 150ms tab message timeout wrapper to guarantee zero UI lockups during active screen recordings or slow tab states.

### Version 1.4.1
- Complete audit for Chrome Web Store Manifest V3 compliance.
- Guaranteed 100% local assets (zero remote scripts, CDN links, or external fonts).

### Version 1.4.0
- Aligned monetization model: 7-day free trial + single $3.99 lifetime license unlock.

### Version 1.0
- Initial release of SpeedUp Video extension.
