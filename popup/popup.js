// SpeedUp Video Pro v1.5.0 - Instant Freemium & Pro Popup Controller (Manifest V3)
document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // 1. DOM ELEMENTS & CONSTANTS
  // ==========================================
  const LANDING_PAGE_URL = "https://x2-speedup.vercel.app";
  const DEV_MASTER_KEY = "DEV-SPEEDUP-PRO-2026";
  const FREE_MIN_SPEED = 0.25;
  const FREE_MAX_SPEED = 2.5;
  const PRO_MIN_SPEED = 0.1;
  const PRO_MAX_SPEED = 16.0;

  const DEFAULT_HOTKEYS = {
    speedUp: ']',
    speedDown: '[',
    resetSpeed: 'r',
    favoriteSpeed: 'g'
  };

  const proUpgradeModal = document.getElementById('proUpgradeModal');
  const closeUpgradeModalBtn = document.getElementById('closeUpgradeModalBtn');
  const openUpgradeBtn = document.getElementById('openUpgradeBtn');
  const ctaBuyBtn = document.getElementById('ctaBuyBtn');

  const keyInput = document.getElementById('keyInput');
  const activateBtn = document.getElementById('activateBtn');
  const statusMsg = document.getElementById('statusMsg');
  const logoutKeyBtn = document.getElementById('logoutKeyBtn');
  const footerLicenseStatus = document.getElementById('footerLicenseStatus');
  const tierRangeHint = document.getElementById('tierRangeHint');

  const statusBadge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');

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

  // State
  let isLicensed = false;
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

  // ==========================================
  // 2. PRO UPGRADE MODAL & TIER UI MANAGEMENT
  // ==========================================
  function showProUpgradePrompt() {
    if (isLicensed) return;
    if (proUpgradeModal) {
      proUpgradeModal.style.display = 'block';
      if (statusMsg) statusMsg.textContent = '';
    }
  }

  function hideProUpgradePrompt() {
    if (proUpgradeModal) {
      proUpgradeModal.style.display = 'none';
    }
  }

  if (closeUpgradeModalBtn) {
    closeUpgradeModalBtn.addEventListener('click', hideProUpgradePrompt);
  }
  if (openUpgradeBtn) {
    openUpgradeBtn.addEventListener('click', showProUpgradePrompt);
  }
  if (ctaBuyBtn) {
    ctaBuyBtn.addEventListener('click', () => chrome.tabs.create({ url: LANDING_PAGE_URL }));
  }

  function applyLicenseStateUI() {
    if (isLicensed) {
      document.body.classList.add('is-licensed');
      hideProUpgradePrompt();
      if (tierRangeHint) tierRangeHint.textContent = '(Pro: 0.1x–16x)';
      if (footerLicenseStatus) footerLicenseStatus.textContent = 'SpeedUp Video PRO • Lifetime Active ✨';
      if (openUpgradeBtn) openUpgradeBtn.style.display = 'none';
      if (logoutKeyBtn) logoutKeyBtn.style.display = 'inline-block';
    } else {
      document.body.classList.remove('is-licensed');
      if (tierRangeHint) tierRangeHint.textContent = '(Free: 0.25x–2.5x)';
      if (footerLicenseStatus) footerLicenseStatus.textContent = 'Free Tier (0.25x–2.5x)';
      if (openUpgradeBtn) openUpgradeBtn.style.display = 'inline-block';
      if (logoutKeyBtn) logoutKeyBtn.style.display = 'none';
    }
    renderHotkeysUI();
    updateDomainUI();
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
      'isPro',
      'isLicensed',
      'licenseKey',
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
      isLicensed = !!(data.isPro || data.isLicensed || data.licenseKey === DEV_MASTER_KEY);
      if (isLicensed && (!data.isPro || !data.isLicensed)) {
        chrome.storage.local.set({ isPro: true, isLicensed: true });
      }

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
        currentSpeed = isLicensed
          ? Math.min(Math.max(rawSpeed, PRO_MIN_SPEED), PRO_MAX_SPEED)
          : Math.min(Math.max(rawSpeed, FREE_MIN_SPEED), FREE_MAX_SPEED);
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

      applyLicenseStateUI();

      // Background silent re-verification if licensed (skip for DEV_MASTER_KEY)
      if (isLicensed && data.licenseKey && data.licenseKey !== DEV_MASTER_KEY) {
        verifyLicenseKeyAsync(data.licenseKey).then((valid) => {
          if (!valid) {
            isLicensed = false;
            chrome.storage.local.set({ isPro: false, isLicensed: false });
            applyLicenseStateUI();
          }
        });
      }

      inspectActiveTabAsync();
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

      const res = await sendTabMessageWithTimeout(tab.id, { action: 'GET_VIDEO_STATUS' }, 150);
      if (res && res.hasVideo) {
        updateStatusBadge(true, res.count);
        if (isLicensed && domainSpeeds[currentHostname] !== undefined) {
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

    if (!isLicensed) {
      rememberDomainToggle.checked = false;
      domainHintText.textContent = `Salva velocità per ${currentHostname} (Pro)`;
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
  async function handleActivateLicense() {
    const key = keyInput ? keyInput.value.trim() : '';
    if (!key) {
      statusMsg.style.color = "#ef4444";
      statusMsg.textContent = "Inserisci una chiave di licenza valida.";
      return;
    }

    // Hardcoded Dev Master Key — Instant validation without network calls
    if (key === DEV_MASTER_KEY) {
      isLicensed = true;
      await chrome.storage.local.set({
        isPro: true,
        isLicensed: true,
        licenseKey: DEV_MASTER_KEY
      });
      if (chrome.storage.sync) {
        chrome.storage.sync.set({
          isPro: true,
          isLicensed: true,
          licenseKey: DEV_MASTER_KEY
        });
      }
      statusMsg.style.color = "#10b981";
      statusMsg.textContent = "SpeedUP Pro sbloccato con successo!";
      applyLicenseStateUI();
      return;
    }

    statusMsg.style.color = "#06b6d4";
    statusMsg.textContent = "Verifica in corso...";

    const isValid = await verifyLicenseKeyAsync(key);

    if (isValid) {
      isLicensed = true;
      await chrome.storage.local.set({ isPro: true, isLicensed: true, licenseKey: key });
      if (chrome.storage.sync) {
        chrome.storage.sync.set({ isPro: true, isLicensed: true, licenseKey: key });
      }
      statusMsg.style.color = "#10b981";
      statusMsg.textContent = "SpeedUP Pro sbloccato con successo!";
      setTimeout(() => {
        applyLicenseStateUI();
      }, 250);
    } else {
      statusMsg.style.color = "#ef4444";
      statusMsg.textContent = "Chiave non valida o scaduta.";
    }
  }

  if (activateBtn) {
    activateBtn.addEventListener('click', handleActivateLicense);
  }
  if (keyInput) {
    keyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleActivateLicense();
      }
    });
  }

  if (logoutKeyBtn) {
    logoutKeyBtn.addEventListener('click', async () => {
      isLicensed = false;
      await chrome.storage.local.set({ isPro: false, isLicensed: false, licenseKey: '' });
      if (chrome.storage.sync) {
        chrome.storage.sync.set({ isPro: false, isLicensed: false, licenseKey: '' });
      }
      if (currentSpeed > FREE_MAX_SPEED || currentSpeed < FREE_MIN_SPEED) {
        setSpeed(Math.min(Math.max(currentSpeed, FREE_MIN_SPEED), FREE_MAX_SPEED));
      }
      applyLicenseStateUI();
    });
  }

  async function verifyLicenseKeyAsync(key) {
    if (key === DEV_MASTER_KEY) {
      return true;
    }
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
      if (key && key.startsWith("PRO-")) {
        return true;
      }
      return false;
    }
  }

  // ==========================================
  // 7. TAB 1: SPEED HUB LOGIC (FREEMIUM VS PRO)
  // ==========================================
  async function setSpeed(requestedSpeed) {
    const raw = parseFloat(requestedSpeed);
    if (isNaN(raw)) return;

    // Check if Free user is trying to exceed Free Tier limits (0.25x - 2.5x)
    if (!isLicensed && (raw > FREE_MAX_SPEED || raw < FREE_MIN_SPEED)) {
      const clampedFree = raw > FREE_MAX_SPEED ? FREE_MAX_SPEED : FREE_MIN_SPEED;
      currentSpeed = parseFloat(clampedFree.toFixed(2));
      setSpeedUI(currentSpeed);
      showProUpgradePrompt();
    } else {
      const minBound = isLicensed ? PRO_MIN_SPEED : FREE_MIN_SPEED;
      const maxBound = isLicensed ? PRO_MAX_SPEED : FREE_MAX_SPEED;
      const clamped = Math.min(Math.max(raw, minBound), maxBound);
      currentSpeed = parseFloat(clamped.toFixed(2));
      setSpeedUI(currentSpeed);
    }

    const storageUpdates = { defaultSpeed: currentSpeed };
    if (isLicensed && rememberDomainToggle && rememberDomainToggle.checked && currentHostname) {
      domainSpeeds[currentHostname] = currentSpeed;
      storageUpdates.domainSpeeds = domainSpeeds;
      updateDomainUI();
    }
    chrome.storage.local.set(storageUpdates);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      sendTabMessageWithTimeout(tab.id, { action: 'SET_SPEED', speed: currentSpeed }, 150);
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
      if (btn.dataset.speed) setSpeed(btn.dataset.speed);
    });
  });

  stepBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const step = parseFloat(btn.dataset.step);
      if (!isNaN(step)) setSpeed(currentSpeed + step);
    });
  });

  // Remember speed for this domain toggle (Pro Feature)
  if (rememberDomainToggle) {
    rememberDomainToggle.addEventListener('change', (e) => {
      if (!isLicensed) {
        e.target.checked = false;
        showProUpgradePrompt();
        return;
      }
      if (!currentHostname) {
        e.target.checked = false;
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

  // Audio pitch preservation (Free Tier — active by default)
  if (pitchToggle) {
    pitchToggle.addEventListener('change', async (e) => {
      preservesPitch = e.target.checked;
      chrome.storage.local.set({ preservesPitch });
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) sendTabMessageWithTimeout(tab.id, { action: 'SET_PITCH', preservesPitch }, 150);
    });
  }

  if (loopToggle) {
    loopToggle.addEventListener('change', async (e) => {
      const val = e.target.checked;
      chrome.storage.local.set({ loopVideo: val });
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) sendTabMessageWithTimeout(tab.id, { action: 'SET_LOOP', loop: val }, 150);
    });
  }

  if (hudToggle) {
    hudToggle.addEventListener('change', async (e) => {
      const val = e.target.checked;
      chrome.storage.local.set({ hudEnabled: val });
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) sendTabMessageWithTimeout(tab.id, { action: 'SET_HUD', enabled: val }, 150);
    });
  }

  // ==========================================
  // 8. TAB 2: CUSTOM HOTKEYS REMAPPING (PRO)
  // ==========================================
  function renderHotkeysUI() {
    const activeMap = isLicensed ? customHotkeys : DEFAULT_HOTKEYS;
    hotkeyCaptureBtns.forEach((btn) => {
      const action = btn.dataset.action;
      const keyVal = activeMap[action] || DEFAULT_HOTKEYS[action];
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
      if (!isLicensed) {
        showProUpgradePrompt();
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
    if (!listeningHotkeyAction || !isLicensed) return;

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
      if (!isLicensed) {
        favoriteSpeedInput.value = '2.0';
        showProUpgradePrompt();
        return;
      }
      const val = Math.min(Math.max(parseFloat(e.target.value) || 2.0, PRO_MIN_SPEED), PRO_MAX_SPEED);
      favoriteSpeed = parseFloat(val.toFixed(2));
      favoriteSpeedInput.value = favoriteSpeed.toFixed(1);
      chrome.storage.local.set({ favoriteSpeed });
    });
  }

  // ==========================================
  // 9. TAB 3: PRECISION SCRUBBING & CHECKPOINTS (PRO)
  // ==========================================
  async function handleFrameScrub(deltaSeconds) {
    if (!isLicensed) {
      showProUpgradePrompt();
      return;
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    const res = await sendTabMessageWithTimeout(tab.id, { action: 'STEP_FRAME', delta: deltaSeconds }, 150);
    if (res && res.currentTime !== undefined) {
      isPlaying = false;
      updatePlaybackUI();
      if (precisionTimeBadge) precisionTimeBadge.textContent = formatTimestamp(res.currentTime);
    }
  }

  async function handleQuickSeek(seconds) {
    if (!isLicensed) {
      showProUpgradePrompt();
      return;
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    const res = await sendTabMessageWithTimeout(tab.id, { action: 'SEEK', seconds }, 150);
    if (res && res.currentTime !== undefined) {
      if (precisionTimeBadge) precisionTimeBadge.textContent = formatTimestamp(res.currentTime);
    }
  }

  async function handleJumpToTimestamp(targetSeconds) {
    if (!isLicensed) {
      showProUpgradePrompt();
      return;
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    const res = await sendTabMessageWithTimeout(tab.id, { action: 'SEEK_TO', time: targetSeconds }, 150);
    if (res && res.currentTime !== undefined) {
      if (precisionTimeBadge) precisionTimeBadge.textContent = formatTimestamp(res.currentTime);
    }
  }

  if (prevFrameBtn) prevFrameBtn.addEventListener('click', () => handleFrameScrub(-0.033));
  if (nextFrameBtn) nextFrameBtn.addEventListener('click', () => handleFrameScrub(0.033));
  if (seekBack5Btn) seekBack5Btn.addEventListener('click', () => handleQuickSeek(-5));
  if (seekFwd5Btn) seekFwd5Btn.addEventListener('click', () => handleQuickSeek(5));

  if (togglePlayBtn) {
    togglePlayBtn.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      const res = await sendTabMessageWithTimeout(tab.id, { action: 'TOGGLE_PLAY' }, 150);
      if (res && res.isPlaying !== undefined) {
        isPlaying = res.isPlaying;
        updatePlaybackUI();
      }
    });
  }

  // Checkpoints Management (Pro Feature)
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
        handleJumpToTimestamp(cp.time);
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
    if (!isLicensed) {
      showProUpgradePrompt();
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    activeTabUrl = tab.url || activeTabUrl;
    activeTabTitle = tab.title || activeTabTitle;

    let capturedTime = 0;
    const res = await sendTabMessageWithTimeout(tab.id, { action: 'GET_CURRENT_TIME' }, 150);
    if (res && res.currentTime !== undefined) {
      capturedTime = res.currentTime;
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
      time: parseFloat(capturedTime.toFixed(2)),
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
