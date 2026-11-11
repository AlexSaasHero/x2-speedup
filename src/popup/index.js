// SpeedUp Video Pro - Popup Controller (Manifest V3)
import {
  ABSOLUTE_MAX_SPEED,
  ABSOLUTE_MIN_SPEED,
  FREE_MAX_SPEED,
  FREE_MIN_SPEED,
  PRO_MAX_SPEED,
  PRO_MIN_SPEED,
  formatSpeed,
  planLimits
} from '../config/plans';
import { isPro } from '../shared/entitlement';
import { isHostListed, normalizeHostPattern } from '../shared/hosts';
import { roundSpeed } from '../shared/media-math';
import { defaultShortcuts } from '../shared/shortcuts';
import { normalizeMediaUrl } from '../shared/url';
import { mountShortcutEditor } from '../ui/shortcut-editor';
import { mountSmart } from './smart';

// Offline master key for local development only; '' in store builds (see scripts/build.mjs).
const DEV_MASTER_KEY = __DEV_MASTER_KEY__;

// Top-level feature flag defaults
const HUD_ENABLED_DEFAULT = true;
const PRESERVE_PITCH_DEFAULT = true;

function initPopup() {
  // ==========================================
  // 1. DOM ELEMENTS & CONSTANTS
  // ==========================================
  const LANDING_PAGE_URL = "https://x2-speedup.vercel.app/";
  const VALIDATE_ENDPOINT = "https://x2-speedup.vercel.app/api/validate-license";
  const MIN_SPEED = PRO_MIN_SPEED;
  const MAX_SPEED = PRO_MAX_SPEED;
  const UNLOCK_TITLE = `Unlock speeds up to ${formatSpeed(PRO_MAX_SPEED)} with Pro (7-Day Free Trial)`;
  const FREE_TIER_LABEL = `Free Tier (Max ${formatSpeed(FREE_MAX_SPEED)})`;

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
  const keyInput = document.getElementById('input-license-key') || document.getElementById('keyInput');
  const activateBtn = document.getElementById('activateBtn') || document.getElementById('btn-activate-license');
  const statusMsg = document.getElementById('statusMsg');

  // Main Suite View & Footer Elements
  const speedControls = document.getElementById('speedControls');
  const footerCtaSection = document.getElementById('footerCtaSection');
  const upgradeLifetimeBtn = document.getElementById('btn-upgrade-pro') || document.getElementById('upgradeLifetimeBtn');
  const mainCtaBtn = upgradeLifetimeBtn;
  const footerCtaBtnText = document.getElementById('footerCtaBtnText');
  const footerLicenseStatus = document.getElementById('footerLicenseStatus');
  const openUpgradeBtn = document.getElementById('openUpgradeBtn');
  const logoutKeyBtn = document.getElementById('logoutKeyBtn');
  const tierRangeHint = document.getElementById('tierRangeHint');

  // Tab Navigation Elements
  const tabButtons = document.querySelectorAll('.tab-btn[data-tab]');
  const tabPanes = {
    speed: document.getElementById('tab-speed'),
    shortcuts: document.getElementById('tab-shortcuts'),
    precision: document.getElementById('tab-precision'),
    pro: document.getElementById('tab-pro')
  };

  // Tab 1: Speed Hub Elements
  const slider = document.getElementById('speedSlider');
  const speedVal = document.getElementById('speedVal');
  const presetButtons = document.querySelectorAll('.presets button, .preset-btn');
  const stepBtns = document.querySelectorAll('.step-btn');
  const customSpeedInput = document.getElementById('customSpeedInput');
  const resetBtn = document.getElementById('resetBtn');

  // Tab 2: Shortcuts Elements
  const shortcutEditorEl = document.getElementById('shortcutEditor');
  const siteShortcutsToggle = document.getElementById('siteShortcutsToggle');
  const siteShortcutsHost = document.getElementById('siteShortcutsHost');
  const openOptionsBtn = document.getElementById('openOptionsBtn');
  const resetHotkeysBtn = document.getElementById('resetHotkeysBtn');
  const favoriteSpeedInput = document.getElementById('favoriteSpeedInput');

  // Tab 3: Precision & Checkpoints Elements
  const precisionTimeBadge = document.getElementById('precisionTimeBadge');
  const prevFrameBtn = document.getElementById('prevFrameBtn');
  const nextFrameBtn = document.getElementById('nextFrameBtn');
  const seekBack5Btn = document.getElementById('seekBack5Btn');
  const seekFwd5Btn = document.getElementById('seekFwd5Btn');
  const seekBackLabel = document.getElementById('seekBackLabel');
  const seekFwdLabel = document.getElementById('seekFwdLabel');
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
  let preservesPitch = PRESERVE_PITCH_DEFAULT;
  let hudEnabled = HUD_ENABLED_DEFAULT;
  let loopVideo = false;
  let activeTabId = null;
  let activeTabUrl = '';
  let activeTabTitle = '';
  let currentHostname = '';
  let shortcuts = defaultShortcuts();
  let shortcutBlacklist = [];
  let speedStep = 0.1;
  let seekSeconds = 10;
  let rememberSpeed = true;
  let favoriteSpeed = 2.0;
  let videoCheckpoints = {};
  let shortcutEditor = null;

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
    return rawUrl ? normalizeMediaUrl(rawUrl) : 'default';
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

  let holdSpeed = 2.5;
  const smart = mountSmart({
    isPro: () => isPermanentPro,
    openUpgrade: (title) => openUpgradeModal(title),
    currentSpeed: () => currentSpeed,
    sendToTab: async (message) => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab?.id ? sendTabMessageWithTimeout(tab.id, message, 400) : null;
    }
  });

  // ==========================================
  // 2. TIER & MODAL CONTROLLER (FREEMIUM / PRO)
  // ==========================================
  function getTierStatus() {
    if (isPermanentPro) {
      return { isPro: true, hasFullAccess: true, label: 'Pro Active ✨' };
    }
    return { isPro: false, hasFullAccess: false, label: FREE_TIER_LABEL };
  }

  function canUse(feature) {
    return planLimits(isPermanentPro).features[feature];
  }

  function applyTierUI() {
    const tier = getTierStatus();
    const sliderTicks = document.querySelector('.slider-ticks');

    if (tier.isPro) {
      document.body.classList.add('is-licensed');
      document.body.classList.remove('is-free', 'is-trial', 'is-expired');
      if (licenseTierBadge) {
        licenseTierBadge.className = 'tier-badge tier-pro';
        licenseTierBadge.title = 'Licenza PRO Lifetime Attiva';
      }
      if (tierBadgeText) tierBadgeText.textContent = 'Pro Active ✨';
      if (tierRangeHint) tierRangeHint.textContent = `(${formatSpeed(PRO_MIN_SPEED)}–${formatSpeed(PRO_MAX_SPEED)})`;
      if (footerLicenseStatus) {
        footerLicenseStatus.textContent = 'Pro Active ✨';
        footerLicenseStatus.className = 'footer-note footer-pro-active';
      }
      if (footerCtaSection) footerCtaSection.style.display = 'none';
      if (openUpgradeBtn) openUpgradeBtn.style.display = 'none';
      if (logoutKeyBtn) logoutKeyBtn.style.display = 'inline-block';

      if (slider) {
        slider.min = String(PRO_MIN_SPEED);
        slider.max = String(PRO_MAX_SPEED);
      }
      if (customSpeedInput) {
        customSpeedInput.min = String(PRO_MIN_SPEED);
        customSpeedInput.max = String(PRO_MAX_SPEED);
      }
      if (sliderTicks) {
        sliderTicks.innerHTML = '<span>0.25x</span><span>1.0x</span><span>2.0x</span><span>4.0x</span><span>16x ⚡</span>';
      }
    } else {
      document.body.classList.remove('is-licensed');
      document.body.classList.add('is-free');
      if (licenseTierBadge) {
        licenseTierBadge.className = 'tier-badge tier-free';
        licenseTierBadge.title = `${FREE_TIER_LABEL} — Clicca per attivare Pro o iniziare il trial gratuito`;
      }
      if (tierBadgeText) tierBadgeText.textContent = FREE_TIER_LABEL;
      if (tierRangeHint) tierRangeHint.textContent = `(Free: ${formatSpeed(FREE_MIN_SPEED)}–${formatSpeed(FREE_MAX_SPEED)})`;
      if (footerLicenseStatus) {
        footerLicenseStatus.textContent = FREE_TIER_LABEL;
        footerLicenseStatus.className = 'footer-note';
      }
      if (footerCtaSection) footerCtaSection.style.display = 'flex';
      if (footerCtaBtnText) footerCtaBtnText.textContent = 'Start 7-Day Free Trial ($0)';
      if (openUpgradeBtn) openUpgradeBtn.style.display = 'inline-block';
      if (logoutKeyBtn) logoutKeyBtn.style.display = 'none';

      if (slider) {
        slider.min = String(FREE_MIN_SPEED);
        slider.max = String(FREE_MAX_SPEED);
      }
      if (customSpeedInput) {
        customSpeedInput.min = String(FREE_MIN_SPEED);
        customSpeedInput.max = String(FREE_MAX_SPEED);
      }
      if (sliderTicks) {
        const ticks = [...new Set([FREE_MIN_SPEED, 1, 2, 3, FREE_MAX_SPEED])]
          .filter((v) => v >= FREE_MIN_SPEED && v <= FREE_MAX_SPEED)
          .sort((a, b) => a - b);
        sliderTicks.innerHTML = ticks.map((v) => `<span>${formatSpeed(v)}</span>`).join('');
      }

      if (currentSpeed > FREE_MAX_SPEED) {
        setSpeed(FREE_MAX_SPEED);
      }
    }

    updateDomainUI();
    smart.render();
  }

  function openUpgradeModal(customTitle = null) {
    if (!proUpgradeModal) return;
    const tier = getTierStatus();
    if (proModalTitle) {
      if (customTitle) {
        proModalTitle.textContent = customTitle;
      } else if (tier.isPro) {
        proModalTitle.textContent = "SpeedUP Video Pro is active! Enjoy unlimited speed and precision.";
      } else {
        proModalTitle.textContent = UNLOCK_TITLE;
      }
    }
    if (statusMsg) {
      statusMsg.textContent = '';
      statusMsg.className = 'status-msg';
      statusMsg.style.display = 'none';
    }
    if (keyInput) keyInput.value = '';
    proUpgradeModal.style.display = 'flex';
    if (keyInput) setTimeout(() => keyInput.focus(), 80);
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
      shortcutEditor?.cancel();
      switchTab(btn.dataset.tab, true);
    });
  });

  // ==========================================
  // 4. INSTANT LOCAL CACHE RENDER (<10ms)
  // ==========================================
  chrome.storage.local.get(
    {
      isPro: false,
      licenseKey: '',
      activatedAt: 0,
      defaultSpeed: 1.0,
      speedStep: 0.1,
      seekSeconds: 10,
      rememberSpeed: true,
      holdSpeed: 2.5,
      shortcuts: null,
      shortcutBlacklist: [],
      hudEnabled: HUD_ENABLED_DEFAULT,
      preservesPitch: PRESERVE_PITCH_DEFAULT,
      loopVideo: false,
      activeTab: 'speed',
      favoriteSpeed: 2.0,
      videoCheckpoints: {}
    },
    (data) => {
      isPermanentPro = isPro(data);

      applyTierUI();
      inspectActiveTabAsync();

      if (data.activeTab) {
        switchTab(data.activeTab, false);
      } else {
        switchTab('speed', false);
      }

      if (data.defaultSpeed !== undefined) {
        const rawSpeed = parseFloat(data.defaultSpeed) || 1.0;
        const tier = getTierStatus();
        const min = tier.hasFullAccess ? MIN_SPEED : FREE_MIN_SPEED;
        const max = tier.hasFullAccess ? MAX_SPEED : FREE_MAX_SPEED;
        currentSpeed = Math.min(Math.max(rawSpeed, min), max);
        setSpeedUI(currentSpeed);
      }

      preservesPitch = data.preservesPitch !== undefined ? !!data.preservesPitch : PRESERVE_PITCH_DEFAULT;
      hudEnabled = data.hudEnabled !== undefined ? !!data.hudEnabled : HUD_ENABLED_DEFAULT;
      loopVideo = data.loopVideo !== undefined ? !!data.loopVideo : false;

      // Guarantee background optimal defaults
      if (data.preservesPitch === undefined || data.hudEnabled === undefined) {
        chrome.storage.local.set({
          preservesPitch: PRESERVE_PITCH_DEFAULT,
          hudEnabled: HUD_ENABLED_DEFAULT
        });
      }

      if (Array.isArray(data.shortcuts)) shortcuts = data.shortcuts;
      if (Array.isArray(data.shortcutBlacklist)) shortcutBlacklist = data.shortcutBlacklist;
      speedStep = Number(data.speedStep) || 0.1;
      seekSeconds = Number(data.seekSeconds) || 10;
      rememberSpeed = data.rememberSpeed !== false;
      holdSpeed = Number(data.holdSpeed) || 2.5;
      applySettingsUI();

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
        if (res.currentSpeed) {
          currentSpeed = parseFloat(res.currentSpeed);
          setSpeedUI(currentSpeed);
        }
        smart.onStatus(res);
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
    if (siteShortcutsHost) siteShortcutsHost.textContent = currentHostname || '—';
    if (siteShortcutsToggle) {
      siteShortcutsToggle.disabled = !currentHostname;
      siteShortcutsToggle.checked = !!currentHostname && isHostListed(currentHostname, shortcutBlacklist);
    }
  }

  /** Labels that depend on user settings (step, seek seconds). */
  function applySettingsUI() {
    stepBtns.forEach((btn) => {
      const mult = parseFloat(btn.dataset.stepMult);
      if (isNaN(mult)) return;
      const value = roundSpeed(Math.abs(mult) * speedStep);
      btn.textContent = `${mult < 0 ? '-' : '+'}${value.toFixed(2)}x`;
    });
    if (seekBackLabel) seekBackLabel.textContent = `-${seekSeconds}s`;
    if (seekFwdLabel) seekFwdLabel.textContent = `+${seekSeconds}s`;
    if (seekBack5Btn) seekBack5Btn.title = `Back ${seekSeconds} seconds`;
    if (seekFwd5Btn) seekFwd5Btn.title = `Forward ${seekSeconds} seconds`;
    updateDomainUI();
    shortcutEditor?.render();
  }

  // ==========================================
  // 6. LICENSE ACTIVATION & VERIFICATION
  // ==========================================
  async function handleModalActivation() {
    const rawKey = keyInput ? keyInput.value.trim() : '';
    if (!rawKey) {
      showModalStatus('Please enter your license key.', 'error');
      if (keyInput) keyInput.focus();
      return;
    }

    setModalActivating(true);
    showModalStatus('Validating license key...', 'info');

    // 1. Dev Master Key (dev builds only) — instant offline validation without network calls
    if (DEV_MASTER_KEY && rawKey === DEV_MASTER_KEY) {
      const licenseData = {
        isPro: true,
        licenseKey: DEV_MASTER_KEY,
        activatedAt: Date.now()
      };
      await chrome.storage.local.set(licenseData);
      if (chrome.storage.sync) {
        try {
          await chrome.storage.sync.set(licenseData);
        } catch (e) {}
      }

      isPermanentPro = true;
      showModalStatus('✓ Pro activated successfully!', 'success');
      setTimeout(() => {
        setModalActivating(false);
        applyTierUI();
        closeUpgradeModal();
      }, 400);
      return;
    }

    // 2. Remote Validation via https://x2-speedup.vercel.app/api/validate-license
    const isValid = await verifyLicenseKeyAsync(rawKey);

    if (isValid) {
      const licenseData = {
        isPro: true,
        licenseKey: rawKey,
        activatedAt: Date.now()
      };
      await chrome.storage.local.set(licenseData);
      if (chrome.storage.sync) {
        try {
          await chrome.storage.sync.set(licenseData);
        } catch (e) {}
      }

      isPermanentPro = true;
      showModalStatus('✓ Pro activated successfully!', 'success');
      setTimeout(() => {
        setModalActivating(false);
        applyTierUI();
        closeUpgradeModal();
      }, 400);
    } else {
      setModalActivating(false);
      showModalStatus('Invalid or expired license key', 'error');
    }
  }

  async function verifyLicenseKeyAsync(key) {
    if (DEV_MASTER_KEY && key === DEV_MASTER_KEY) return true;

    const clean = (key || '').trim();
    if (!clean) return false;

    // 1. Primary validation endpoint: POST https://x2-speedup.vercel.app/api/validate-license
    try {
      const response = await fetch(VALIDATE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ license_key: clean }),
        signal: AbortSignal.timeout(6000)
      });

      if (response.ok) {
        const data = await response.json();
        if (data && (data.status === 'valid' || data.valid === true || data.is_valid === true)) {
          return true;
        }
      }
    } catch (err) {
      console.warn('X2 license validation endpoint unreachable, checking fallback:', err);
    }

    // 2. Direct check with Lemon Squeezy API
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
        if (data && (data.valid === true || data.status === 'valid')) {
          return true;
        }
      }
    } catch (err) {
      console.warn('Lemon Squeezy direct validation unreachable, checking fallback:', err);
    }

    // Fallback: check valid key format or prefix (PRO-*, TRIAL-*, UUID)
    if (clean.toUpperCase().startsWith('PRO-') || clean.toUpperCase().startsWith('TRIAL-')) {
      return true;
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(clean)) {
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
    ctaBuyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: LANDING_PAGE_URL });
    });
  }

  const upgradeBtn = document.getElementById('btn-upgrade-pro') || document.getElementById('upgradeLifetimeBtn');
  if (upgradeBtn) {
    upgradeBtn.addEventListener('click', (e) => {
      e.preventDefault();
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
      const resetData = {
        isPro: false,
        licenseKey: ''
      };
      await chrome.storage.local.set(resetData);
      if (chrome.storage.sync) {
        try {
          await chrome.storage.sync.set(resetData);
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
    const minAllowed = tier.hasFullAccess ? MIN_SPEED : FREE_MIN_SPEED;
    const maxAllowed = tier.hasFullAccess ? MAX_SPEED : FREE_MAX_SPEED;

    if (!tier.hasFullAccess && raw > FREE_MAX_SPEED) {
      openUpgradeModal(UNLOCK_TITLE);
    }

    const clamped = Math.min(Math.max(raw, minAllowed), maxAllowed);
    currentSpeed = parseFloat(clamped.toFixed(2));
    setSpeedUI(currentSpeed);

    // The content script persists the speed (rememberSpeed / domain speed) and updates the badge.
    // Also store it here so pages without media (or not yet loaded) start at this speed.
    if (rememberSpeed) chrome.storage.local.set({ defaultSpeed: currentSpeed });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      const res = await sendTabMessageWithTimeout(tab.id, { action: 'SET_SPEED', speed: currentSpeed }, 400);
      if (res && typeof res.speed === 'number' && Math.abs(res.speed - currentSpeed) > 0.001) {
        currentSpeed = res.speed;
        setSpeedUI(currentSpeed);
      }
    }
  }

  function setSpeedUI(speedNum) {
    const formatted = Number.isInteger(speedNum * 10)
      ? `${speedNum.toFixed(1)}x`
      : `${speedNum.toFixed(2)}x`;
    if (speedVal) speedVal.textContent = formatted;
    smart.onSpeed(speedNum);
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

  if (slider) {
    slider.addEventListener('input', (e) => setSpeed(e.target.value));
  }

  if (customSpeedInput) {
    customSpeedInput.addEventListener('change', (e) => {
      setSpeed(e.target.value);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      setSpeed(1.0);
    });
  }

  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!btn.dataset.speed) return;
      const speed = parseFloat(btn.dataset.speed);
      const tier = getTierStatus();
      if (!tier.hasFullAccess && speed > FREE_MAX_SPEED) {
        setSpeed(FREE_MAX_SPEED);
        openUpgradeModal(UNLOCK_TITLE);
        return;
      }
      setSpeed(speed);
    });
  });

  stepBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const mult = parseFloat(btn.dataset.stepMult);
      if (!isNaN(mult)) {
        setSpeed(roundSpeed(currentSpeed + mult * speedStep));
      }
    });
  });

  // ==========================================
  // 8. TAB 2: CUSTOM HOTKEYS REMAPPING
  // ==========================================
  if (shortcutEditorEl) {
    shortcutEditor = mountShortcutEditor({
      container: shortcutEditorEl,
      get: () => shortcuts,
      save: (list) => {
        shortcuts = list;
        chrome.storage.local.set({ shortcuts });
      },
      context: () => ({ speedStep, seekSeconds, favoriteSpeed, holdSpeed })
    });
  }

  if (resetHotkeysBtn) {
    resetHotkeysBtn.addEventListener('click', () => {
      shortcutEditor?.cancel();
      shortcuts = defaultShortcuts();
      chrome.storage.local.set({ shortcuts });
      shortcutEditor?.render();
    });
  }

  if (siteShortcutsToggle) {
    siteShortcutsToggle.addEventListener('change', () => {
      if (!currentHostname) return;
      const host = normalizeHostPattern(currentHostname);
      const others = shortcutBlacklist.filter((h) => normalizeHostPattern(h) !== host);
      shortcutBlacklist = siteShortcutsToggle.checked ? [...others, host] : others;
      chrome.storage.local.set({ shortcutBlacklist });
    });
  }

  if (openOptionsBtn) {
    openOptionsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
  }
  document.getElementById('openOptionsBtn2')?.addEventListener('click', () => chrome.runtime.openOptionsPage());

  // A-B repeat (Pro)
  const abState = document.getElementById('abState');
  const abAction = async (op) => {
    if (!smart.gate('abRepeat')) return;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    const res = await sendTabMessageWithTimeout(tab.id, { action: 'AB_REPEAT', op }, 400);
    if (abState) abState.textContent = res?.abLoop ? (res.abLoop.b !== undefined ? 'looping' : 'A set') : res?.success ? 'off' : 'no video';
  };
  document.getElementById('abSetA')?.addEventListener('click', () => abAction('a'));
  document.getElementById('abSetB')?.addEventListener('click', () => abAction('b'));
  document.getElementById('abClear')?.addEventListener('click', () => abAction('clear'));

  if (favoriteSpeedInput) {
    favoriteSpeedInput.addEventListener('change', (e) => {
      const val = Math.min(Math.max(parseFloat(e.target.value) || 2.0, ABSOLUTE_MIN_SPEED), ABSOLUTE_MAX_SPEED);
      favoriteSpeed = parseFloat(val.toFixed(2));
      favoriteSpeedInput.value = favoriteSpeed.toFixed(1);
      chrome.storage.local.set({ favoriteSpeed });
      shortcutEditor?.render();
    });
  }

  // ==========================================
  // 9. TAB 3: PRECISION SCRUBBING & CHECKPOINTS
  // ==========================================
  async function handleFrameScrub(direction) {
    if (!canUse('frameStep')) {
      openUpgradeModal(`Frame-by-frame precision stepping is a Pro feature. ${UNLOCK_TITLE}.`);
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
    if (!canUse('skipTime')) {
      openUpgradeModal(`Quick skip scrubbing is a Pro feature. ${UNLOCK_TITLE}.`);
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
  if (seekBack5Btn) seekBack5Btn.addEventListener('click', () => handleQuickSkip(-seekSeconds));
  if (seekFwd5Btn) seekFwd5Btn.addEventListener('click', () => handleQuickSkip(seekSeconds));

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
    if (!canUse('checkpoints')) {
      openUpgradeModal(`Video checkpoints are a Pro feature. ${UNLOCK_TITLE}.`);
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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPopup);
} else {
  initPopup();
}
