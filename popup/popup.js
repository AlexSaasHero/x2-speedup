// SpeedUp Video Pro - Instant Popup Controller Script (Manifest V3)
document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // 1. DOM ELEMENTS & CONSTANTS
  // ==========================================
  const TRIAL_DAYS = 7;
  const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;
  const LANDING_PAGE_URL = "https://x2-speedup.vercel.app";

  const paywall = document.getElementById('paywall');
  const speedControls = document.getElementById('speedControls');
  const trialBanner = document.getElementById('trialBanner');
  const trialBadgeText = document.getElementById('trialBadgeText');
  const upgradeTrialLink = document.getElementById('upgradeTrialLink');
  const ctaBuyBtn = document.getElementById('ctaBuyBtn');

  const keyInput = document.getElementById('keyInput');
  const activateBtn = document.getElementById('activateBtn');
  const statusMsg = document.getElementById('statusMsg');
  const logoutKeyBtn = document.getElementById('logoutKeyBtn');
  const footerLicenseStatus = document.getElementById('footerLicenseStatus');

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

  let currentSpeed = 1.0;
  let isPlaying = true;
  let isMuted = false;

  // External link handlers
  if (ctaBuyBtn) {
    ctaBuyBtn.addEventListener('click', () => chrome.tabs.create({ url: LANDING_PAGE_URL }));
  }
  if (upgradeTrialLink) {
    upgradeTrialLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: LANDING_PAGE_URL });
    });
  }

  // Non-blocking tab message helper with 150ms timeout
  function sendTabMessageWithTimeout(tabId, message, timeoutMs = 150) {
    return new Promise((resolve) => {
      let timer = setTimeout(() => resolve(null), timeoutMs);
      try {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          clearTimeout(timer);
          if (chrome.runtime.lastError) resolve(null);
          else resolve(response);
        });
      } catch (e) {
        clearTimeout(timer);
        resolve(null);
      }
    });
  }

  function calculateTrial(installDate) {
    if (!installDate) return { isTrialActive: true, daysLeft: 7, expired: false };
    const elapsed = Date.now() - installDate;
    const remaining = TRIAL_MS - elapsed;
    if (remaining <= 0) {
      return { isTrialActive: false, daysLeft: 0, expired: true };
    }
    const daysLeft = Math.max(1, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
    return { isTrialActive: true, daysLeft, expired: false };
  }

  // ==========================================
  // 2. INSTANT LOCAL CACHE RENDER (<10ms)
  // ==========================================
  chrome.storage.local.get(
    ['isLicensed', 'licenseKey', 'installDate', 'defaultSpeed', 'hudEnabled', 'preservesPitch', 'loopVideo'],
    (data) => {
      let installDate = data.installDate;

      if (!installDate) {
        installDate = Date.now();
        chrome.storage.local.set({ installDate });
      }

      if (data.defaultSpeed) {
        currentSpeed = parseFloat(data.defaultSpeed);
        setSpeedUI(currentSpeed);
      }

      if (data.hudEnabled !== undefined && hudToggle) hudToggle.checked = data.hudEnabled;
      if (data.preservesPitch !== undefined && pitchToggle) pitchToggle.checked = data.preservesPitch;
      if (data.loopVideo !== undefined && loopToggle) loopToggle.checked = data.loopVideo;

      if (data.isLicensed) {
        showControlsUI(true);
        // Non-blocking background re-verification (silent)
        if (data.licenseKey) {
          verifyLicenseKeyAsync(data.licenseKey).then((valid) => {
            if (!valid) {
              chrome.storage.local.set({ isLicensed: false });
              evaluateTrialOrLockUI(installDate);
            }
          });
        }
      } else {
        evaluateTrialOrLockUI(installDate);
      }

      // Non-blocking active tab inspection
      inspectActiveTabAsync();
    }
  );

  function evaluateTrialOrLockUI(installDate) {
    const trialStatus = calculateTrial(installDate);
    if (trialStatus.isTrialActive) {
      if (trialBanner) {
        trialBanner.style.display = 'flex';
        if (trialBadgeText) {
          trialBadgeText.textContent = `Trial: ${trialStatus.daysLeft} giorn${trialStatus.daysLeft === 1 ? 'o' : 'i'} rimanent${trialStatus.daysLeft === 1 ? 'i' : 'i'}`;
        }
      }
      if (footerLicenseStatus) {
        footerLicenseStatus.textContent = `Trial Attivo (${trialStatus.daysLeft}d)`;
      }
      showControlsUI(false);
    } else {
      showPaywallLockUI();
    }
  }

  function showControlsUI(isPermanent = false) {
    if (paywall) paywall.style.display = 'none';
    if (speedControls) speedControls.style.display = 'block';
    if (isPermanent) {
      if (trialBanner) trialBanner.style.display = 'none';
      if (footerLicenseStatus) footerLicenseStatus.textContent = 'SpeedUp Video PRO • Licenza Attiva ✨';
    }
  }

  function showPaywallLockUI() {
    if (paywall) paywall.style.display = 'flex';
    if (speedControls) speedControls.style.display = 'none';
    if (trialBanner) trialBanner.style.display = 'none';
    if (statusMsg) statusMsg.textContent = '';
  }

  // ==========================================
  // 3. NON-BLOCKING TAB INSPECTION
  // ==========================================
  async function inspectActiveTabAsync() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        updateStatusBadge(false, 0);
        return;
      }

      if (tab.url && tab.url.includes("youtube.com")) {
        showYouTubeDisabledMessage();
        return;
      }

      // Don't query chrome:// or restricted pages
      if (tab.url && (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://") || tab.url.startsWith("about:"))) {
        updateStatusBadge(false, 0, "Scheda speciale");
        return;
      }

      const res = await sendTabMessageWithTimeout(tab.id, { action: 'GET_VIDEO_STATUS' }, 150);
      if (res && res.hasVideo) {
        updateStatusBadge(true, res.count);
        if (res.currentSpeed) setSpeedUI(res.currentSpeed);
        isPlaying = res.isPlaying ?? true;
        isMuted = res.isMuted ?? false;
        updatePlaybackUI();
      } else {
        updateStatusBadge(false, 0);
      }
    } catch (e) {
      updateStatusBadge(false, 0);
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

  // ==========================================
  // 4. LICENSE ACTIVATION & VERIFICATION
  // ==========================================
  if (activateBtn) {
    activateBtn.addEventListener('click', async () => {
      const key = keyInput.value.trim();
      if (!key) {
        statusMsg.style.color = "#ef4444";
        statusMsg.textContent = "Inserisci una chiave di licenza valida.";
        return;
      }

      statusMsg.style.color = "#06b6d4";
      statusMsg.textContent = "Verifica in corso...";

      const isValid = await verifyLicenseKeyAsync(key);

      if (isValid) {
        await chrome.storage.local.set({ isLicensed: true, licenseKey: key });
        if (chrome.storage.sync) {
          chrome.storage.sync.set({ isLicensed: true, licenseKey: key });
        }
        statusMsg.style.color = "#10b981";
        statusMsg.textContent = "Licenza attivata con successo!";
        setTimeout(() => {
          showControlsUI(true);
        }, 300);
      } else {
        statusMsg.style.color = "#ef4444";
        statusMsg.textContent = "Chiave non valida o scaduta.";
      }
    });
  }

  if (logoutKeyBtn) {
    logoutKeyBtn.addEventListener('click', async () => {
      await chrome.storage.local.set({ isLicensed: false, licenseKey: '' });
      if (chrome.storage.sync) {
        chrome.storage.sync.set({ isLicensed: false, licenseKey: '' });
      }
      showPaywallLockUI();
    });
  }

  async function verifyLicenseKeyAsync(key) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch('https://tuo-dominio.vercel.app/api/verify-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: key }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await response.json();
      return data.isValid === true;
    } catch (err) {
      // Fallback test locali
      if (key && key.startsWith("PRO-")) {
        return true;
      }
      return false;
    }
  }

  // ==========================================
  // 5. SPEED CONTROLLER LOGIC
  // ==========================================
  function changeVideoSpeed(targetSpeed) {
    if (window.location.hostname.includes("youtube.com")) return;
    const videos = document.querySelectorAll('video');
    videos.forEach(v => { v.playbackRate = targetSpeed; });
  }

  async function setSpeed(newSpeed) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url && tab.url.includes("youtube.com")) return;

    const speed = parseFloat(newSpeed).toFixed(2);
    currentSpeed = parseFloat(speed);
    setSpeedUI(currentSpeed);

    chrome.storage.local.set({ defaultSpeed: currentSpeed });

    if (tab?.id) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          func: changeVideoSpeed,
          args: [parseFloat(speed)]
        });
      } catch (err) {}

      sendTabMessageWithTimeout(tab.id, { action: 'SET_SPEED', speed: currentSpeed }, 150);
    }

    try {
      chrome.runtime.sendMessage({ action: 'UPDATE_BADGE', speed: currentSpeed }, () => {
        if (chrome.runtime.lastError) {}
      });
    } catch (e) {}
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

  function updateStatusBadge(active, count = 0, customLabel = null) {
    if (!statusText || !statusBadge) return;
    if (customLabel) {
      statusText.textContent = customLabel;
      statusBadge.className = 'status-badge status-offline';
      return;
    }
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

  // Event Listeners
  if (slider) slider.addEventListener('input', (e) => setSpeed(e.target.value));
  if (customSpeedInput) customSpeedInput.addEventListener('change', (e) => setSpeed(e.target.value));
  if (resetBtn) resetBtn.addEventListener('click', () => setSpeed(1.0));

  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.speed) setSpeed(btn.dataset.speed);
    });
  });

  stepBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const step = parseFloat(btn.dataset.step);
      if (!isNaN(step)) setSpeed(currentSpeed + step);
    });
  });

  if (togglePlayBtn) {
    togglePlayBtn.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url && tab.url.includes("youtube.com")) return;
      if (tab?.id) {
        const res = await sendTabMessageWithTimeout(tab.id, { action: 'TOGGLE_PLAY' }, 150);
        if (res && res.isPlaying !== undefined) {
          isPlaying = res.isPlaying;
          updatePlaybackUI();
        }
      }
    });
  }

  if (toggleMuteBtn) {
    toggleMuteBtn.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url && tab.url.includes("youtube.com")) return;
      if (tab?.id) {
        const res = await sendTabMessageWithTimeout(tab.id, { action: 'TOGGLE_MUTE' }, 150);
        if (res && res.isMuted !== undefined) {
          isMuted = res.isMuted;
          updatePlaybackUI();
        }
      }
    });
  }

  if (seekBackBtn) {
    seekBackBtn.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url && tab.url.includes("youtube.com")) return;
      if (tab?.id) sendTabMessageWithTimeout(tab.id, { action: 'SEEK', seconds: -10 }, 150);
    });
  }

  if (seekFwdBtn) {
    seekFwdBtn.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url && tab.url.includes("youtube.com")) return;
      if (tab?.id) sendTabMessageWithTimeout(tab.id, { action: 'SEEK', seconds: 10 }, 150);
    });
  }

  if (pitchToggle) {
    pitchToggle.addEventListener('change', async (e) => {
      const val = e.target.checked;
      chrome.storage.local.set({ preservesPitch: val });
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url && tab.url.includes("youtube.com")) return;
      if (tab?.id) sendTabMessageWithTimeout(tab.id, { action: 'SET_PITCH', preservesPitch: val }, 150);
    });
  }

  if (loopToggle) {
    loopToggle.addEventListener('change', async (e) => {
      const val = e.target.checked;
      chrome.storage.local.set({ loopVideo: val });
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url && tab.url.includes("youtube.com")) return;
      if (tab?.id) sendTabMessageWithTimeout(tab.id, { action: 'SET_LOOP', loop: val }, 150);
    });
  }

  if (hudToggle) {
    hudToggle.addEventListener('change', async (e) => {
      const val = e.target.checked;
      chrome.storage.local.set({ hudEnabled: val });
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url && tab.url.includes("youtube.com")) return;
      if (tab?.id) sendTabMessageWithTimeout(tab.id, { action: 'SET_HUD', enabled: val }, 150);
    });
  }
});
