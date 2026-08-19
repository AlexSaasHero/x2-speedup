# CHROMEWEBSTORE.md — SpeedUp Video Pro

> Single source of truth for Chrome Developer Dashboard metadata, store listing copy, permissions justifications, privacy policy, and release history.

---

## Store Listing Metadata

| Field | Value |
|-------|-------|
| **Extension Name** | SpeedUp Video Pro |
| **Short Description (IT)** | Controllo rapido della velocità per qualsiasi video web. |
| **Short Description (EN)** | Fast playback speed control for any web video. |
| **Version** | 1.3 |
| **Primary Category** | Produttività / Productivity |
| **Secondary Category** | Foto e Video / Photos & Media |
| **Language** | Italiano (Primary), English |

---

## Detailed Store Description

### Italian (IT)
**SpeedUp Video Pro** è l'estensione definitiva per il controllo preciso e istantaneo della velocità di riproduzione per qualsiasi video HTML5 sul web (Vimeo, Twitch, corsi online e player web personalizzati).

**Caratteristiche Principali:**
- 🔒 **Sistema di Licenza PRO**: Attivazione rapida con chiave di licenza o abbonamento.
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

Every permission declared in `manifest.json` requires a specific, plain-English justification for the Chrome Web Store review team:

| Permission | Justification |
|------------|---------------|
| `activeTab` | Required to access the currently active browser tab and inspect/control `<video>` HTML5 elements when the user opens the popup. |
| `scripting` | Required to inject playback speed control logic into web pages that host HTML5 video elements. |
| `storage` | Required to save user preferences locally (default playback speed, license state, HUD overlay visibility, pitch preservation state). |
| `tabs` | Required to detect tab URL and safely disable overlay execution on excluded platforms like YouTube. |
| `host_permissions: ["<all_urls>"]` | Required so that video speed controls and the floating HUD overlay can operate on any HTTP/HTTPS website containing video content. |

---

## Version History

### Version 1.3
- Updated content script URL match patterns to `["http://*/*", "https://*/*"]`.
- Retained YouTube exclusions (`*://*.youtube.com/*`, `*://youtube.com/*`).
- Included checkout payment options and YouTube safety disable notices.

### Version 1.2
- Renamed extension to **SpeedUp Video Pro**.
- Added `exclude_matches` rule in `manifest.json` for YouTube URLs to handle custom site logic.
- Included License Key Paywall system (`isLicensed`, `verifyLicenseKey`).

### Version 1.0
- Initial launch of SpeedUp Video extension.
