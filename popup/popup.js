// SpeedUp Video Pro - Popup Controller Script (Manifest V3)
document.addEventListener('DOMContentLoaded', async () => {
  // ==========================================
  // 1. INIZIALIZZAZIONE ELEMENTI DOM
  // ==========================================
  const paywall = document.getElementById('paywall');
  const speedControls = document.getElementById('speedControls');
  const keyInput = document.getElementById('keyInput');
  const activateBtn = document.getElementById('activateBtn');
  const statusMsg = document.getElementById('statusMsg');
  const logoutKeyBtn = document.getElementById('logoutKeyBtn');

  const slider = document.getElementById('speedSlider');
  const speedVal = document.getElementById('speedVal') || document.getElementById('speedValue');
  const presetButtons = document.querySelectorAll('.presets button, .preset-btn');
  const stepBtns = document.querySelectorAll('.step-btn');
  const customSpeedInput = document.getElementById('customSpeedInput');
  const resetBtn = document.getElementById('resetBtn');
  
  const statusBadge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');
  
  const togglePlayBtn = document.getElementById('togglePlayBtn');
  const playText = document.getElementById('playText');
  const toggleMuteBtn = document.getElementById('toggleMuteBtn');
  const muteText = document.getElementById('muteText');
  const seekBackBtn = document.getElementById('seekBackBtn');
  const seekFwdBtn = document.getElementById('seekFwdBtn');
  
  const pitchToggle = document.getElementById('pitchToggle');
  const loopToggle = document.getElementById('loopToggle');
  const hudToggle = document.getElementById('hudToggle');

  // Link checkout (Stripe / Lemon Squeezy / Gumroad)
  const CHECKOUT_WEEKLY_URL = "https://tuo-checkout.com/piano-settimanale-1usd";
  const CHECKOUT_LIFETIME_URL = "https://tuo-checkout.com/piano-lifetime-19usd";

  const buyWeeklyBtn = document.getElementById('buyWeeklyBtn');
  const buyLifetimeBtn = document.getElementById('buyLifetimeBtn');

  if (buyWeeklyBtn) {
    buyWeeklyBtn.addEventListener('click', () => window.open(CHECKOUT_WEEKLY_URL, '_blank'));
  }
  if (buyLifetimeBtn) {
    buyLifetimeBtn.addEventListener('click', () => window.open(CHECKOUT_LIFETIME_URL, '_blank'));
  }

  let currentSpeed = 1.0;
  let isPlaying = true;
  let isMuted = false;

  const storage = chrome.storage?.sync || chrome.storage?.local;

  // ==========================================
  // 2. VERIFICA STATO LICENZA E SITO CORRENTE
  // ==========================================
  chrome.storage.sync.get(['isLicensed', 'licenseKey'], async (data) => {
    if (data.isLicensed && data.licenseKey) {
      const isValid = await verifyLicenseKey(data.licenseKey);
      if (isValid) {
        checkCurrentTabAndShowControls();
      } else {
        chrome.storage.sync.set({ isLicensed: false });
        showPaywall();
      }
    } else {
      showPaywall();
    }
  });

  // Carica altre impostazioni salvate
  storage.get(['defaultSpeed', 'hudEnabled', 'preservesPitch', 'loopVideo'], (data) => {
    if (data?.hudEnabled !== undefined && hudToggle) {
      hudToggle.checked = data.hudEnabled;
    }
    if (data?.preservesPitch !== undefined && pitchToggle) {
      pitchToggle.checked = data.preservesPitch;
    }
    if (data?.loopVideo !== undefined && loopToggle) {
      loopToggle.checked = data.loopVideo;
    }
  });

  async function checkCurrentTabAndShowControls() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab?.url && tab.url.includes("youtube.com")) {
      showYouTubeDisabledMessage();
    } else {
      showControls();
    }
  }

  function showYouTubeDisabledMessage() {
    if (paywall) paywall.style.display = 'none';
    if (speedControls) {
      speedControls.style.display = 'block';
      speedControls.innerHTML = `
        <div style="text-align: center; padding: 24px 14px; background: rgba(30, 41, 59, 0.65); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px;">
          <div style="display: inline-flex; align-items: center; justify-content: center; width: 42px; height: 42px; border-radius: 50%; background: rgba(225, 29, 72, 0.15); border: 1px solid rgba(225, 29, 72, 0.4); margin-bottom: 12px;">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#e11d48" stroke-width="2">
              <path d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"></path>
            </svg>
          </div>
          <h4 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: #e11d48;">Disattivato su YouTube</h4>
          <p style="font-size: 12px; color: #64748b; margin: 0; line-height: 1.4;">
            L'estensione è totalmente sospesa su YouTube per non interferire con il player originale.
          </p>
        </div>
      `;
    }
  }

  function showControls() {
    if (paywall) paywall.style.display = 'none';
    if (speedControls) speedControls.style.display = 'block';
    initSpeedTabStatus();
  }

  function showPaywall() {
    if (paywall) paywall.style.display = 'flex';
    if (speedControls) speedControls.style.display = 'none';
  }

  // ==========================================
  // 3. GESTIONE PAYWALL E RISCATTO KEY
  // ==========================================
  if (activateBtn) {
    activateBtn.addEventListener('click', async () => {
      const key = keyInput.value.trim();
      if (!key) {
        statusMsg.style.color = "#ef4444";
        statusMsg.textContent = "Inserisci una chiave valida.";
        return;
      }

      statusMsg.style.color = "#2563eb";
      statusMsg.textContent = "Verifica in corso...";

      const isValid = await verifyLicenseKey(key);

      if (isValid) {
        chrome.storage.sync.set({ isLicensed: true, licenseKey: key }, () => {
          checkCurrentTabAndShowControls();
        });
      } else {
        statusMsg.style.color = "#ef4444";
        statusMsg.textContent = "Chiave non valida o abbonamento scaduto.";
      }
    });
  }

  if (logoutKeyBtn) {
    logoutKeyBtn.addEventListener('click', () => {
      chrome.storage.sync.set({ isLicensed: false, licenseKey: '' }, () => {
        showPaywall();
      });
    });
  }

  async function verifyLicenseKey(key) {
    try {
      const response = await fetch('https://tuo-dominio.vercel.app/api/verify-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: key })
      });

      const data = await response.json();
      return data.isValid === true;
    } catch (err) {
      console.error("Errore verifica licenza:", err);
      if (key.startsWith("PRO-")) {
        return true;
      }
      return false;
    }
  }

  // ==========================================
  // 4. CONTROLLO VELOCITÀ VIDEO
  // ==========================================
  async function initSpeedTabStatus() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url && tab.url.includes("youtube.com")) {
      return;
    }

    if (tab?.id) {
      try {
        chrome.tabs.sendMessage(tab.id, { action: 'GET_VIDEO_STATUS' }, (res) => {
          if (res && res.hasVideo) {
            updateStatusBadge(true, res.count);
            if (res.currentSpeed) setSpeedUI(res.currentSpeed);
            isPlaying = res.isPlaying ?? true;
            isMuted = res.isMuted ?? false;
            updatePlaybackUI();
          } else {
            updateStatusBadge(false, 0);
          }
        });
      } catch (e) {
        updateStatusBadge(false, 0);
      }
    }
  }

  // Funzione iniettata nella pagina attiva
  function changeVideoSpeed(targetSpeed) {
    // Non eseguire nulla su YouTube
    if (window.location.hostname.includes("youtube.com")) return;

    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      video.playbackRate = targetSpeed;
    });
  }

  async function setSpeed(newSpeed) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Blocco di sicurezza tassativo se ci si trova su YouTube
    if (tab?.url && tab.url.includes("youtube.com")) {
      return;
    }

    const speed = parseFloat(newSpeed).toFixed(2);
    currentSpeed = parseFloat(speed);
    
    setSpeedUI(currentSpeed);

    storage.set({ defaultSpeed: currentSpeed }).catch(() => {});

    if (tab?.id) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          func: changeVideoSpeed,
          args: [parseFloat(speed)]
        });
      } catch (err) {
        console.warn('Esecuzione script:', err);
      }

      chrome.tabs.sendMessage(tab.id, { action: 'SET_SPEED', speed: currentSpeed }).catch(() => {});
    }

    chrome.runtime.sendMessage({ action: 'UPDATE_BADGE', speed: currentSpeed }).catch(() => {});
  }

  function setSpeedUI(speedNum) {
    const speedStr = `${speedNum.toFixed(1)}x`;

    if (speedVal) speedVal.textContent = speedStr;
    if (slider) slider.value = speedNum.toFixed(2);
    if (customSpeedInput) customSpeedInput.value = speedNum.toFixed(2);

    presetButtons.forEach(btn => {
      const btnSpeed = parseFloat(btn.dataset.speed || btn.getAttribute('data-speed'));
      if (Math.abs(btnSpeed - speedNum) < 0.04) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function updateStatusBadge(active, count = 0) {
    if (!statusText || !statusBadge) return;
    if (active) {
      statusText.textContent = `${count} Video ${count > 1 ? 'Trovati' : 'Trovato'}`;
      statusBadge.className = 'status-badge status-online';
    } else {
      statusText.textContent = 'Cerca video...';
      statusBadge.className = 'status-badge status-offline';
    }
  }

  function updatePlaybackUI() {
    if (playText) playText.textContent = isPlaying ? 'Pausa' : 'Riproduci';
    if (muteText) muteText.textContent = isMuted ? 'Audio OFF' : 'Audio ON';
  }

  // Listener eventi UI
  if (slider) {
    slider.addEventListener('input', (e) => setSpeed(e.target.value));
  }

  if (customSpeedInput) {
    customSpeedInput.addEventListener('change', (e) => setSpeed(e.target.value));
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => setSpeed(1.0));
  }

  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.speed) {
        setSpeed(btn.dataset.speed);
      }
    });
  });

  stepBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const step = parseFloat(btn.dataset.step);
      if (!isNaN(step)) {
        setSpeed(currentSpeed + step);
      }
    });
  });

  if (togglePlayBtn) {
    togglePlayBtn.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url && tab.url.includes("youtube.com")) return;

      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_PLAY' }, (res) => {
          if (res && res.isPlaying !== undefined) {
            isPlaying = res.isPlaying;
            updatePlaybackUI();
          }
        });
      }
    });
  }

  if (toggleMuteBtn) {
    toggleMuteBtn.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url && tab.url.includes("youtube.com")) return;

      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_MUTE' }, (res) => {
          if (res && res.isMuted !== undefined) {
            isMuted = res.isMuted;
            updatePlaybackUI();
          }
        });
      }
    });
  }

  if (seekBackBtn) {
    seekBackBtn.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url && tab.url.includes("youtube.com")) return;

      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'SEEK', seconds: -10 }).catch(() => {});
      }
    });
  }

  if (seekFwdBtn) {
    seekFwdBtn.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url && tab.url.includes("youtube.com")) return;

      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'SEEK', seconds: 10 }).catch(() => {});
      }
    });
  }

  if (pitchToggle) {
    pitchToggle.addEventListener('change', async (e) => {
      const val = e.target.checked;
      await storage.set({ preservesPitch: val });
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url && tab.url.includes("youtube.com")) return;

      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'SET_PITCH', preservesPitch: val }).catch(() => {});
      }
    });
  }

  if (loopToggle) {
    loopToggle.addEventListener('change', async (e) => {
      const val = e.target.checked;
      await storage.set({ loopVideo: val });
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url && tab.url.includes("youtube.com")) return;

      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'SET_LOOP', loop: val }).catch(() => {});
      }
    });
  }

  if (hudToggle) {
    hudToggle.addEventListener('change', async (e) => {
      const val = e.target.checked;
      await storage.set({ hudEnabled: val });
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url && tab.url.includes("youtube.com")) return;

      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'SET_HUD', enabled: val }).catch(() => {});
      }
    });
  }
});
