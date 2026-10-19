// SpeedUp Video Pro v1.5.1.1 - Instant Modular Popup Controller (Manifest V3)
document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // 1. DOM ELEMENTS & CONSTANTS
  // ==========================================
  const LANDING_PAGE_URL = "https://x2-speedup.vercel.app";
  const DEV_MASTER_KEY = "DEV-SPEEDUP-PRO-2026";
  const MIN_SPEED = 0.1;
  const MAX_SPEED = 16.0;
  const FREE_MAX_SPEED = 2.5;
  const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

  const DEFAULT_HOTKEYS = {
    speedUp: ']',
    speedDown: '[',
    resetSpeed: 'r',
    favoriteSpeed: 'g'
  };

  // Header Elements
  const licenseTierBadge = document.getElementById('licenseTierBadge');
  const tierBadgeText = document.getElementById('tierBadgeText');
  const statusBadge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');

  // Compact Pro Upgrade Modal Elements
  const proUpgradeModal = document.getElementById('proUpgradeModal');
  const closeUpgradeModalBtn = document.getElementById('closeUpgradeModalBtn');
  const proModalTitle = document.getElementById('proModalTitle');
  const ctaBuyBtn = document.getElementById('ctaBuyBtn');
  const keyInput = document.getElementById('keyInput');
  const activateBtn = document.getElementById('activateBtn');
  const statusMsg = document.getElementById('statusMsg');

  // Main Suite View & Footer Elements
  const speedControls = document.getElementById('speedControls');
  const footerLicenseStatus = document.getElementById('footerLicenseStatus');
  const openUpgradeBtn = document.getElementById('openUpgradeBtn');
  const logoutKeyBtn = document.getElementById('logoutKeyBtn');
  const tierRangeHint = document.getElementById('tierRangeHint');

  // Tab Navigation Elements
  const tabButtons = document.querySelectorAll('.tab-btn[data-tab]');
  const tabPanes = {
    speed: document.getElementById('tab-speed'),
    shortcuts: document.getElementById('tab-shortcuts'),
    precision: document.getElementById('tab-precision')
  };

  // Tab 1: Speed Hub Elements
  const slider = document.getElementById('speedSlider');
  const speedVal = document.getElementById('speedVal');
  const presetButtons = document.querySelectorAll('.presets button, .preset-btn');
  const stepBtns = document.querySelectorAll('.step-btn');
  const customSpeedInput = document.getElementById('customSpeedInput');
  const resetBtn = document.getElementById('resetBtn');

  const rememberDomainToggle = document.getElementById('rememberDomainToggle');
  const domainHintText = document.getElementById('domainHintText');
  const pitchToggle = document.getElementById('pitchToggle');
  const loopToggle = document.getElementById('loopToggle');
  const hudToggle = document.getElementById('hudToggle');

  // Tab 2: Custom Hotkeys Elements
  const hotkeyCaptureBtns = document.querySelectorAll('.hotkey-capture-btn[data-action]');
  const resetHotkeysBtn = document.getElementById('resetHotkeysBtn');
  const favoriteSpeedInput = document.getElementById('favoriteSpeedInput');

  // Tab 3: Precision & Checkpoints Elements
  const precisionTimeBadge = document.getElementById('precisionTimeBadge');
  const prevFrameBtn = document.getElementById('prevFrameBtn');
  const nextFrameBtn = document.getElementById('nextFrameBtn');
  const seekBack5Btn = document.getElementById('seekBack5Btn');
  const seekFwd5Btn = document.getElementById('seekFwd5Btn');
  const togglePlayBtn = document.getElementById('togglePlayBtn');
  const playText = document.getElementById('playText');

  const checkpointLabelInput = document.getElementById('checkpointLabelInput');
  const addCheckpointBtn = document.getElementById('addCheckpointBtn');
  const checkpointsList = document.getElementById('checkpointsList');
  const checkpointCountBadge = document.getElementById('checkpointCountBadge');

  // State & Access Control
  let isPermanentPro = false;
  let installDate = null;
  let currentSpeed = 1.0;
  let isPlaying = true;
  let preservesPitch = true;
  let activeTabId = null;
  let activeTabUrl = '';
  let activeTabTitle = '';
  let currentHostname = '';
  let domainSpeeds = {};
  let customHotkeys = { ...DEFAULT_HOTKEYS };
  let favoriteSpeed = 2.0;
  let videoCheckpoints = {};
  let listeningHotkeyAction = null;

  // Helpers
  function formatKeyLabel(key) {
    if (!key) return '-';
    if (key === ' ' || key === 'Space') return 'SPACE';
    if (key === 'ArrowUp') return '↑';
    if (key === 'ArrowDown') return '↓';
    if (key === 'ArrowLeft') return '←';
    if (key === 'ArrowRight') return '→';
    return key.length === 1 ? key.toUpperCase() : key;
  }

  function formatTimestamp(sec) {
    if (!isFinite(sec) || sec < 0) return '00:00';
    const totalSeconds = Math.floor(sec);
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
  }

  function getUrlCheckpointKey(rawUrl) {
    if (!rawUrl) return 'default';
    try {
      const u = new URL(rawUrl);
      u.searchParams.delete('t');
      const query = u.searchParams.toString();
      return `${u.origin}${u.pathname}${query ? '?' + query : ''}`;
    } catch (e) {
      return rawUrl.split('#')[0];
    }
  }

  // Non-blocking tab message helper with 250ms timeout
  function sendTabMessageWithTimeout(tabId, message, timeoutMs = 250) {
    return new Promise((resolve) => {
      let timer = setTimeout(() => resolve(null), timeoutMs);
      try {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          clearTimeout(timer);
          if (chrome.runtime.lastError) {
            console.warn('SpeedUP: content script not ready or error', chrome.runtime.lastError);
            resolve(null);
          } else {
            resolve(response);
          }
        });
      } catch (e) {
        clearTimeout(timer);
        resolve(null);
      }
    });
  }

  // ==========================================
  // 2. TIER & MODAL CONTROLLER (FREEMIUM / PRO)
  // ==========================================
  function getTierStatus() {
    if (isPermanentPro) {
      return { isPro: true, isTrial: false, isExpired: false, hasFullAccess: true, daysLeft: 0 };
    }
    const now = Date.now();
    const effectiveInstallDate = installDate || now;
    const elapsed = now - effectiveInstallDate;
    if (elapsed <= TRIAL_DURATION_MS) {
      const remaining = Math.max(0, TRIAL_DURATION_MS - elapsed);
      const days = Math.max(1, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
      return { isPro: false, isTrial: true, isExpired: false, hasFullAccess: true, daysLeft: days };
    }
    return { isPro: false, isTrial: false, isExpired: true, hasFullAccess: false, daysLeft: 0 };
  }

  function applyTierUI() {
    const tier = getTierStatus();

    if (tier.isPro) {
      document.body.classList.add('is-licensed');
      document.body.classList.remove('is-trial', 'is-expired');
      if (licenseTierBadge) {
        licenseTierBadge.className = 'tier-badge tier-pro';
        licenseTierBadge.title = 'Licenza PRO Lifetime Attiva';
      }
      if (tierBadgeText) tierBadgeText.textContent = '✨ PRO Lifetime';
      if (tierRangeHint) tierRangeHint.textContent = '(0.1x–16x)';
      if (footerLicenseStatus) footerLicenseStatus.textContent = 'SpeedUp Video PRO • Lifetime ✨';
      if (openUpgradeBtn) openUpgradeBtn.style.display = 'none';
      if (logoutKeyBtn) logoutKeyBtn.style.display = 'inline-block';
    } else if (tier.isTrial) {
      document.body.classList.add('is-licensed', 'is-trial');
      document.body.classList.remove('is-expired');
      if (licenseTierBadge) {
        licenseTierBadge.className = 'tier-badge tier-trial';
        licenseTierBadge.title = `7-Day Free Trial attivo (${tier.daysLeft} ${tier.daysLeft === 1 ? 'giorno rimanente' : 'giorni rimanenti'}) — Clicca per info / Upgrade`;
      }
      if (tierBadgeText) tierBadgeText.textContent = `Trial: ${tier.daysLeft} ${tier.daysLeft === 1 ? 'day' : 'days'} left`;
      if (tierRangeHint) tierRangeHint.textContent = '(0.1x–16x Trial)';
      if (footerLicenseStatus) footerLicenseStatus.textContent = 'SpeedUp Video PRO • Free Trial';
      if (openUpgradeBtn) {
        openUpgradeBtn.style.display = 'inline-block';
        openUpgradeBtn.textContent = 'Upgrade ($1.99)';
      }
      if (logoutKeyBtn) logoutKeyBtn.style.display = 'none';
    } else {
      document.body.classList.remove('is-licensed', 'is-trial');
      document.body.classList.add('is-expired');
      if (licenseTierBadge) {
        licenseTierBadge.className = 'tier-badge tier-expired';
        licenseTierBadge.title = 'Trial terminato — Passa a Pro per sbloccare tutto a $1.99';
      }
      if (tierBadgeText) tierBadgeText.textContent = 'Trial Expired • Upgrade to Pro ($1.99)';
      if (tierRangeHint) tierRangeHint.textContent = '(Free: 0.25x–2.5x)';
      if (footerLicenseStatus) footerLicenseStatus.textContent = 'Free Tier (Max 2.5x)';
      if (openUpgradeBtn) {
        openUpgradeBtn.style.display = 'inline-block';
        openUpgradeBtn.textContent = 'Unlock Pro ($1.99)';
      }
      if (logoutKeyBtn) logoutKeyBtn.style.display = 'none';
    }

    renderHotkeysUI();
    updateDomainUI();
  }

  function openUpgradeModal(customTitle = null) {
    if (!proUpgradeModal) return;
    const tier = getTierStatus();
    if (proModalTitle) {
      if (customTitle) {
        proModalTitle.textContent = customTitle;
      } else if (tier.isPro) {
        proModalTitle.textContent = "SpeedUP Video Pro Lifetime is active! Enjoy unlimited speed and precision.";
      } else if (tier.isTrial) {
        proModalTitle.textContent = "Enjoying your 7-day trial? Unlock SpeedUP Video Pro Lifetime for $1.99";
      } else {
        proModalTitle.textContent = "Your 7-day trial has ended. Unlock SpeedUP Video Pro Lifetime for only $1.99 to access speeds up to 16x, custom hotkeys, and precision tools.";
      }
    }
    if (statusMsg) {
      statusMsg.textContent = '';
      statusMsg.className = 'status-msg';
      statusMsg.style.display = 'none';
    }
    if (keyInput) keyInput.value = '';
    proUpgradeModal.style.display = 'flex';
  }

  function closeUpgradeModal() {
    if (proUpgradeModal) proUpgradeModal.style.display = 'none';
  }

  function showModalStatus(message, type = 'info') {
    if (!statusMsg) return;
    statusMsg.textContent = message;
    statusMsg.className = `status-msg ${type}`;
    statusMsg.style.display = 'block';
  }

  function setModalActivating(isActivating) {
    if (!activateBtn) return;
    activateBtn.disabled = isActivating;
    activateBtn.textContent = isActivating ? 'Verifica in corso...' : 'Attiva Licenza';
  }

  // ==========================================
  // 3. TAB NAVIGATION (PURE CSS/JS + STORAGE)
  // ==========================================
  function switchTab(tabName, saveToStorage = true) {
    const validTab = tabPanes[tabName] ? tabName : 'speed';

    tabButtons.forEach((btn) => {
      const isMatch = btn.dataset.tab === validTab;
      btn.classList.toggle('active', isMatch);
      btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
    });

    Object.entries(tabPanes).forEach(([key, pane]) => {
      if (!pane) return;
      if (key === validTab) {
        pane.classList.add('active');
        pane.style.display = 'block';
      } else {
        pane.classList.remove('active');
        pane.style.display = 'none';
      }
    });

    if (saveToStorage) {
      chrome.storage.local.set({ activeTab: validTab });
    }
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      cancelHotkeyListening();
      switchTab(btn.dataset.tab, true);
    });
  });

  // ==========================================
  // 4. INSTANT LOCAL CACHE RENDER (<10ms)
  // ==========================================
  chrome.storage.local.get(
    [
      'installDate',
      'isPro',
      'isLicensed',
      'licenseKey',
      'activatedAt',
      'defaultSpeed',
      'domainSpeeds',
      'hudEnabled',
      'preservesPitch',
      'loopVideo',
      'activeTab',
      'customHotkeys',
      'favoriteSpeed',
      'videoCheckpoints'
    ],
    (data) => {
      // 1. Initialize 7-Day Free Trial install date if not yet present
      if (!data.installDate) {
        installDate = Date.now();
        chrome.storage.local.set({ installDate });
      } else {
        installDate = data.installDate;
      }

      // 2. Compute Pro and Trial state
      isPermanentPro = !!(data.isPro || data.licenseKey === DEV_MASTER_KEY || (data.licenseKey && data.licenseKey.trim().length > 3));

      applyTierUI();
      inspectActiveTabAsync();

      if (data.activeTab) {
        switchTab(data.activeTab, false);
      } else {
        switchTab('speed', false);
      }

      if (data.domainSpeeds && typeof data.domainSpeeds === 'object') {
        domainSpeeds = data.domainSpeeds;
      }

      if (data.defaultSpeed !== undefined) {
        const rawSpeed = parseFloat(data.defaultSpeed) || 1.0;
        const tier = getTierStatus();
        const max = tier.hasFullAccess ? MAX_SPEED : FREE_MAX_SPEED;
        currentSpeed = Math.min(Math.max(rawSpeed, MIN_SPEED), max);
        setSpeedUI(currentSpeed);
      }

      preservesPitch = data.preservesPitch !== undefined ? !!data.preservesPitch : true;
      if (pitchToggle) pitchToggle.checked = preservesPitch;
      if (data.hudEnabled !== undefined && hudToggle) hudToggle.checked = data.hudEnabled;
      if (data.loopVideo !== undefined && loopToggle) loopToggle.checked = data.loopVideo;

      if (data.customHotkeys && typeof data.customHotkeys === 'object') {
        customHotkeys = { ...DEFAULT_HOTKEYS, ...data.customHotkeys };
      }

      if (data.favoriteSpeed !== undefined) {
        favoriteSpeed = parseFloat(data.favoriteSpeed) || 2.0;
      }
      if (favoriteSpeedInput) {
        favoriteSpeedInput.value = favoriteSpeed.toFixed(1);
      }

      if (data.videoCheckpoints && typeof data.videoCheckpoints === 'object') {
        videoCheckpoints = data.videoCheckpoints;
      }
    }
  );

  // ==========================================
  // 5. NON-BLOCKING TAB INSPECTION
  // ==========================================
  async function inspectActiveTabAsync() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        updateStatusBadge(false, 0);
        return;
      }

      activeTabId = tab.id;
      activeTabUrl = tab.url || '';
      activeTabTitle = tab.title || 'Video Web';

      if (
        activeTabUrl.startsWith("chrome://") ||
        activeTabUrl.startsWith("chrome-extension://") ||
        activeTabUrl.startsWith("about:")
      ) {
        updateStatusBadge(false, 0, "Scheda speciale");
        renderCheckpointsList();
        return;
      }

      try {
        currentHostname = new URL(activeTabUrl).hostname;
      } catch (e) {
        currentHostname = '';
      }

      updateDomainUI();
      renderCheckpointsList();

      const res = await sendTabMessageWithTimeout(tab.id, { action: 'GET_VIDEO_STATUS' }, 250);
      if (res && res.hasVideo) {
        updateStatusBadge(true, res.count);
        if (domainSpeeds[currentHostname] !== undefined) {
          currentSpeed = parseFloat(domainSpeeds[currentHostname]);
          setSpeedUI(currentSpeed);
        } else if (res.currentSpeed) {
          currentSpeed = parseFloat(res.currentSpeed);
          setSpeedUI(currentSpeed);
        }
        isPlaying = res.isPlaying ?? true;
        updatePlaybackUI();
        if (precisionTimeBadge && res.currentTime !== undefined) {
          precisionTimeBadge.textContent = formatTimestamp(res.currentTime);
        }
      } else {
        updateStatusBadge(false, 0);
      }
    } catch (e) {
      updateStatusBadge(false, 0);
    }
  }

  function updateDomainUI() {
    if (!rememberDomainToggle || !domainHintText) return;
    if (!currentHostname) {
      rememberDomainToggle.checked = false;
      domainHintText.textContent = 'Salva velocità per il sito corrente';
      return;
    }

    const hasSavedDomainSpeed = domainSpeeds[currentHostname] !== undefined;
    rememberDomainToggle.checked = hasSavedDomainSpeed;

    if (hasSavedDomainSpeed) {
      const savedVal = parseFloat(domainSpeeds[currentHostname]).toFixed(2);
      domainHintText.textContent = `Attivo su ${currentHostname} (${savedVal}x)`;
    } else {
      domainHintText.textContent = `Salva velocità per ${currentHostname}`;
    }
  }

  // ==========================================
  // 6. LICENSE ACTIVATION & VERIFICATION
  // ==========================================
  async function handleModalActivation() {
    const rawKey = keyInput ? keyInput.value.trim() : '';
    if (!rawKey) {
      showModalStatus('Inserisci la chiave di licenza o la tua email.', 'error');
      return;
    }

    // 1. Dev Master Key — Instant offline validation without network calls
    if (rawKey === DEV_MASTER_KEY) {
      setModalActivating(true);
      await chrome.storage.local.set({
        isPro: true,
        isLicensed: true,
        licenseKey: DEV_MASTER_KEY,
        activatedAt: Date.now()
      });
      if (chrome.storage.sync) {
        try {
          chrome.storage.sync.set({
            isPro: true,
            isLicensed: true,
            licenseKey: DEV_MASTER_KEY,
            activatedAt: Date.now()
          });
        } catch (e) {}
      }

      isPermanentPro = true;
      showModalStatus('✓ SpeedUP Pro Lifetime Attivato!', 'success');
      setTimeout(() => {
        setModalActivating(false);
        applyTierUI();
        closeUpgradeModal();
      }, 400);
      return;
    }

    // 2. Standard Key Verification (Lemon Squeezy API or valid pattern)
    setModalActivating(true);
    showModalStatus('Verifica licenza in corso...', 'info');

    const isValid = await verifyLicenseKeyAsync(rawKey);

    if (isValid) {
      await chrome.storage.local.set({
        isPro: true,
        isLicensed: true,
        licenseKey: rawKey,
        activatedAt: Date.now()
      });
      if (chrome.storage.sync) {
        try {
          chrome.storage.sync.set({
            isPro: true,
            isLicensed: true,
            licenseKey: rawKey,
            activatedAt: Date.now()
          });
        } catch (e) {}
      }

      isPermanentPro = true;
      showModalStatus('✓ Licenza convalidata con successo!', 'success');
      setTimeout(() => {
        setModalActivating(false);
        applyTierUI();
        closeUpgradeModal();
      }, 400);
    } else {
      setModalActivating(false);
      showModalStatus('Chiave licenza non valida. Controlla l\'email o acquistala sul sito.', 'error');
    }
  }

  async function verifyLicenseKeyAsync(key) {
    if (key === DEV_MASTER_KEY) return true;

    const clean = (key || '').trim();
    if (!clean) return false;

    // Direct check with Lemon Squeezy API
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ license_key: clean }).toString(),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data && data.valid === true) {
          return true;
        }
      }
    } catch (err) {
      console.warn('Lemon Squeezy direct validation unreachable, checking fallback:', err);
    }

    // Fallback: check valid key format or prefix (PRO-*, TRIAL-*, UUID, or trial email)
    if (clean.toUpperCase().startsWith('PRO-') || clean.toUpperCase().startsWith('TRIAL-')) {
      return true;
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(clean)) {
      return true;
    }
    if (clean.includes('@') && clean.includes('.')) {
      return true;
    }

    return false;
  }

  // Modal & Upgrade Triggers
  if (activateBtn) {
    activateBtn.addEventListener('click', handleModalActivation);
  }

  if (keyInput) {
    keyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleModalActivation();
      }
    });
  }

  if (closeUpgradeModalBtn) {
    closeUpgradeModalBtn.addEventListener('click', closeUpgradeModal);
  }

  if (licenseTierBadge) {
    licenseTierBadge.addEventListener('click', () => openUpgradeModal());
  }

  if (openUpgradeBtn) {
    openUpgradeBtn.addEventListener('click', () => openUpgradeModal());
  }

  if (ctaBuyBtn) {
    ctaBuyBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: LANDING_PAGE_URL });
    });
  }

  if (proUpgradeModal) {
    proUpgradeModal.addEventListener('click', (e) => {
      if (e.target === proUpgradeModal) {
        closeUpgradeModal();
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && proUpgradeModal && proUpgradeModal.style.display !== 'none') {
      closeUpgradeModal();
    }
  });

  if (logoutKeyBtn) {
    logoutKeyBtn.addEventListener('click', async () => {
      isPermanentPro = false;
      await chrome.storage.local.set({ isPro: false, isLicensed: false, licenseKey: '' });
      if (chrome.storage.sync) {
        try {
          chrome.storage.sync.set({ isPro: false, isLicensed: false, licenseKey: '' });
        } catch (e) {}
      }
      applyTierUI();
      const tier = getTierStatus();
      if (!tier.hasFullAccess && currentSpeed > FREE_MAX_SPEED) {
        setSpeed(FREE_MAX_SPEED);
      }
    });
  }

  // ==========================================
  // 7. TAB 1: SPEED HUB LOGIC (0.1x UP TO 16.0x)
  // ==========================================
  async function setSpeed(requestedSpeed) {
    const raw = parseFloat(requestedSpeed);
    if (isNaN(raw)) return;

    const tier = getTierStatus();
    const maxAllowed = tier.hasFullAccess ? MAX_SPEED : FREE_MAX_SPEED;

    if (!tier.hasFullAccess && raw > FREE_MAX_SPEED) {
      openUpgradeModal("Your 7-day trial has ended. Speeds above 2.5x require SpeedUP Video Pro Lifetime ($1.99).");
    }

    const clamped = Math.min(Math.max(raw, MIN_SPEED), maxAllowed);
    currentSpeed = parseFloat(clamped.toFixed(2));
    setSpeedUI(currentSpeed);

    const storageUpdates = { defaultSpeed: currentSpeed };
    if (rememberDomainToggle && rememberDomainToggle.checked && currentHostname) {
      domainSpeeds[currentHostname] = currentSpeed;
      storageUpdates.domainSpeeds = domainSpeeds;
      updateDomainUI();
    }
    chrome.storage.local.set(storageUpdates);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'SET_SPEED', speed: currentSpeed }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('SpeedUP: content script not ready or error', chrome.runtime.lastError);
        }
      });
    }

    try {
      chrome.runtime.sendMessage({ action: 'UPDATE_BADGE', speed: currentSpeed }, () => {
        if (chrome.runtime.lastError) {}
      });
    } catch (e) {}
  }

  function setSpeedUI(speedNum) {
    const formatted = Number.isInteger(speedNum * 10)
      ? `${speedNum.toFixed(1)}x`
      : `${speedNum.toFixed(2)}x`;
    if (speedVal) speedVal.textContent = formatted;
    if (slider) slider.value = speedNum.toFixed(2);
    if (customSpeedInput) customSpeedInput.value = speedNum.toFixed(2);

    presetButtons.forEach(btn => {
      const btnSpeed = parseFloat(btn.dataset.speed || btn.getAttribute('data-speed'));
      if (Math.abs(btnSpeed - speedNum) < 0.03) {
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
    if (playText) playText.textContent = isPlaying ? 'Pausa' : 'Play';
  }

  if (slider) slider.addEventListener('input', (e) => setSpeed(e.target.value));
  if (customSpeedInput) customSpeedInput.addEventListener('change', (e) => setSpeed(e.target.value));
  if (resetBtn) resetBtn.addEventListener('click', () => setSpeed(1.0));

  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!btn.dataset.speed) return;
      const speed = parseFloat(btn.dataset.speed);
      const tier = getTierStatus();
      if (!tier.hasFullAccess && speed > FREE_MAX_SPEED) {
        setSpeed(FREE_MAX_SPEED);
        openUpgradeModal("Your 7-day trial has ended. Speeds above 2.5x require SpeedUP Video Pro Lifetime ($1.99).");
        return;
      }
      setSpeed(speed);
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

  // Remember speed for this domain toggle
  if (rememberDomainToggle) {
    rememberDomainToggle.addEventListener('change', (e) => {
      if (!currentHostname) {
        e.target.checked = false;
        return;
      }
      const tier = getTierStatus();
      if (!tier.hasFullAccess) {
        e.target.checked = false;
        openUpgradeModal("Domain speed persistence is a Pro feature. Unlock SpeedUP Pro Lifetime for $1.99.");
        return;
      }
      if (e.target.checked) {
        domainSpeeds[currentHostname] = currentSpeed;
      } else {
        delete domainSpeeds[currentHostname];
      }
      chrome.storage.local.set({ domainSpeeds });
      updateDomainUI();
    });
  }

  if (pitchToggle) {
    pitchToggle.addEventListener('change', async (e) => {
      preservesPitch = e.target.checked;
      chrome.storage.local.set({ preservesPitch });
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) sendTabMessageWithTimeout(tab.id, { action: 'SET_PITCH', preservesPitch }, 250);
    });
  }

  if (loopToggle) {
    loopToggle.addEventListener('change', async (e) => {
      const val = e.target.checked;
      chrome.storage.local.set({ loopVideo: val });
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) sendTabMessageWithTimeout(tab.id, { action: 'SET_LOOP', loop: val }, 250);
    });
  }

  if (hudToggle) {
    hudToggle.addEventListener('change', async (e) => {
      const val = e.target.checked;
      chrome.storage.local.set({ hudEnabled: val });
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) sendTabMessageWithTimeout(tab.id, { action: 'SET_HUD', enabled: val }, 250);
    });
  }

  // ==========================================
  // 8. TAB 2: CUSTOM HOTKEYS REMAPPING
  // ==========================================
  function renderHotkeysUI() {
    hotkeyCaptureBtns.forEach((btn) => {
      const action = btn.dataset.action;
      const keyVal = customHotkeys[action] || DEFAULT_HOTKEYS[action];
      btn.textContent = formatKeyLabel(keyVal);
      btn.classList.remove('listening');
    });
  }

  function cancelHotkeyListening() {
    listeningHotkeyAction = null;
    renderHotkeysUI();
  }

  hotkeyCaptureBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tier = getTierStatus();
      if (!tier.hasFullAccess) {
        openUpgradeModal("Custom keyboard shortcuts remapping is a Pro feature. Unlock SpeedUP Pro Lifetime for $1.99.");
        return;
      }
      const action = btn.dataset.action;
      if (listeningHotkeyAction === action) {
        cancelHotkeyListening();
        return;
      }
      renderHotkeysUI();
      listeningHotkeyAction = action;
      btn.classList.add('listening');
      btn.textContent = 'Premi...';
    });
  });

  window.addEventListener('keydown', (e) => {
    if (!listeningHotkeyAction) return;

    e.preventDefault();
    e.stopPropagation();

    if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;

    if (e.key === 'Escape') {
      cancelHotkeyListening();
      return;
    }

    const newKey = e.key === ' ' ? 'Space' : (e.key.length === 1 ? e.key.toLowerCase() : e.key);
    customHotkeys[listeningHotkeyAction] = newKey;
    listeningHotkeyAction = null;

    chrome.storage.local.set({ customHotkeys });
    renderHotkeysUI();
  }, true);

  if (resetHotkeysBtn) {
    resetHotkeysBtn.addEventListener('click', () => {
      const tier = getTierStatus();
      if (!tier.hasFullAccess) {
        openUpgradeModal("Custom keyboard shortcuts remapping is a Pro feature. Unlock SpeedUP Pro Lifetime for $1.99.");
        return;
      }
      cancelHotkeyListening();
      customHotkeys = { ...DEFAULT_HOTKEYS };
      favoriteSpeed = 2.0;
      if (favoriteSpeedInput) favoriteSpeedInput.value = '2.0';
      chrome.storage.local.set({ customHotkeys, favoriteSpeed });
      renderHotkeysUI();
    });
  }

  if (favoriteSpeedInput) {
    favoriteSpeedInput.addEventListener('change', (e) => {
      const val = Math.min(Math.max(parseFloat(e.target.value) || 2.0, MIN_SPEED), MAX_SPEED);
      favoriteSpeed = parseFloat(val.toFixed(2));
      favoriteSpeedInput.value = favoriteSpeed.toFixed(1);
      chrome.storage.local.set({ favoriteSpeed });
    });
  }

  // ==========================================
  // 9. TAB 3: PRECISION SCRUBBING & CHECKPOINTS
  // ==========================================
  async function handleFrameScrub(direction) {
    const tier = getTierStatus();
    if (!tier.hasFullAccess) {
      openUpgradeModal("Frame-by-frame precision stepping is a Pro feature. Unlock SpeedUP Pro Lifetime for $1.99.");
      return;
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    chrome.tabs.sendMessage(tab.id, { action: 'STEP_FRAME', direction }, (res) => {
      if (chrome.runtime.lastError) {
        console.warn('SpeedUP: STEP_FRAME error', chrome.runtime.lastError);
        return;
      }
      isPlaying = false;
      updatePlaybackUI();
      if (res && res.currentTime !== undefined && precisionTimeBadge) {
        precisionTimeBadge.textContent = formatTimestamp(res.currentTime);
      }
    });
  }

  async function handleQuickSkip(seconds) {
    const tier = getTierStatus();
    if (!tier.hasFullAccess) {
      openUpgradeModal("Quick skip scrubbing is a Pro feature. Unlock SpeedUP Pro Lifetime for $1.99.");
      return;
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    chrome.tabs.sendMessage(tab.id, { action: 'SKIP_TIME', seconds }, (res) => {
      if (chrome.runtime.lastError) {
        console.warn('SpeedUP: SKIP_TIME error', chrome.runtime.lastError);
        return;
      }
      if (res && res.currentTime !== undefined && precisionTimeBadge) {
        precisionTimeBadge.textContent = formatTimestamp(res.currentTime);
      }
    });
  }

  async function handleJumpToTimestamp(targetSeconds) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    chrome.tabs.sendMessage(tab.id, { action: 'SEEK_TO', time: Number(targetSeconds) }, (res) => {
      if (chrome.runtime.lastError) {
        console.warn('SpeedUP: SEEK_TO error', chrome.runtime.lastError);
        return;
      }
      if (res && res.currentTime !== undefined && precisionTimeBadge) {
        precisionTimeBadge.textContent = formatTimestamp(res.currentTime);
      }
    });
  }

  if (prevFrameBtn) prevFrameBtn.addEventListener('click', () => handleFrameScrub(-1));
  if (nextFrameBtn) nextFrameBtn.addEventListener('click', () => handleFrameScrub(1));
  if (seekBack5Btn) seekBack5Btn.addEventListener('click', () => handleQuickSkip(-5));
  if (seekFwd5Btn) seekFwd5Btn.addEventListener('click', () => handleQuickSkip(5));

  if (togglePlayBtn) {
    togglePlayBtn.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      const res = await sendTabMessageWithTimeout(tab.id, { action: 'TOGGLE_PLAY' }, 250);
      if (res && res.isPlaying !== undefined) {
        isPlaying = res.isPlaying;
        updatePlaybackUI();
      }
    });
  }

  // Checkpoints Management
  function renderCheckpointsList() {
    if (!checkpointsList) return;
    const urlKey = getUrlCheckpointKey(activeTabUrl);
    const list = Array.isArray(videoCheckpoints[urlKey]) ? videoCheckpoints[urlKey] : [];

    if (checkpointCountBadge) {
      checkpointCountBadge.textContent = `${list.length} salvat${list.length === 1 ? 'o' : 'i'}`;
    }

    if (list.length === 0) {
      checkpointsList.innerHTML = `<div class="cp-empty">Nessun checkpoint salvato per questo video.</div>`;
      return;
    }

    checkpointsList.innerHTML = '';
    list.forEach((cp) => {
      const item = document.createElement('div');
      item.className = 'cp-item';
      item.title = `Salta a ${cp.formattedTime} — ${cp.pageTitle || ''}`;

      const left = document.createElement('div');
      left.className = 'cp-left';

      const timeBadge = document.createElement('span');
      timeBadge.className = 'cp-time-badge';
      timeBadge.textContent = cp.formattedTime || formatTimestamp(cp.time);

      const labelSpan = document.createElement('span');
      labelSpan.className = 'cp-label';
      labelSpan.textContent = cp.label || cp.pageTitle || 'Checkpoint';

      left.appendChild(timeBadge);
      left.appendChild(labelSpan);

      const delBtn = document.createElement('button');
      delBtn.className = 'cp-delete-btn';
      delBtn.title = 'Elimina checkpoint';
      delBtn.textContent = '×';

      item.addEventListener('click', () => {
        handleJumpToTimestamp(Number(cp.time));
      });

      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteCheckpoint(urlKey, cp.id);
      });

      item.appendChild(left);
      item.appendChild(delBtn);
      checkpointsList.appendChild(item);
    });
  }

  async function addCheckpoint() {
    const tier = getTierStatus();
    if (!tier.hasFullAccess) {
      openUpgradeModal("Video checkpoints are a Pro feature. Unlock SpeedUP Pro Lifetime for $1.99.");
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    activeTabUrl = tab.url || activeTabUrl;
    activeTabTitle = tab.title || activeTabTitle;

    let capturedTime = 0;
    const res = await sendTabMessageWithTimeout(tab.id, { action: 'ADD_CHECKPOINT' }, 250);
    if (res && (res.timestamp !== undefined || res.currentTime !== undefined)) {
      capturedTime = res.timestamp !== undefined ? res.timestamp : res.currentTime;
    }

    if (precisionTimeBadge) {
      precisionTimeBadge.textContent = formatTimestamp(capturedTime);
    }

    const urlKey = getUrlCheckpointKey(activeTabUrl);
    const existingList = Array.isArray(videoCheckpoints[urlKey]) ? videoCheckpoints[urlKey] : [];
    const customNote = checkpointLabelInput ? checkpointLabelInput.value.trim() : '';
    const defaultTitle = activeTabTitle
      ? activeTabTitle.slice(0, 36)
      : `Checkpoint #${existingList.length + 1}`;

    const newCp = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      time: parseFloat(Number(capturedTime).toFixed(2)),
      formattedTime: formatTimestamp(capturedTime),
      label: customNote || defaultTitle,
      pageTitle: activeTabTitle,
      url: activeTabUrl,
      createdAt: Date.now()
    };

    const updatedList = [...existingList, newCp].sort((a, b) => a.time - b.time);
    videoCheckpoints[urlKey] = updatedList;

    if (checkpointLabelInput) checkpointLabelInput.value = '';
    chrome.storage.local.set({ videoCheckpoints });
    renderCheckpointsList();
  }

  function deleteCheckpoint(urlKey, checkpointId) {
    if (!Array.isArray(videoCheckpoints[urlKey])) return;
    videoCheckpoints[urlKey] = videoCheckpoints[urlKey].filter((cp) => cp.id !== checkpointId);
    if (videoCheckpoints[urlKey].length === 0) {
      delete videoCheckpoints[urlKey];
    }
    chrome.storage.local.set({ videoCheckpoints });
    renderCheckpointsList();
  }

  if (addCheckpointBtn) {
    addCheckpointBtn.addEventListener('click', addCheckpoint);
  }
  if (checkpointLabelInput) {
    checkpointLabelInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addCheckpoint();
      }
    });
  }
});
