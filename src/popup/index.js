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
import { isInGrace, validateLicense } from '../shared/license';
import { applyI18n, t } from '../shared/i18n';
import { REVIEW_THRESHOLD_SECONDS, completeReview, shouldAskForReview, snoozeReview } from '../shared/review';
import { reviewUrl } from '../shared/links';
import { hasSiteAccess, requestSiteAccess } from '../shared/site-access';
import { STATS_BUFFER_KEY, STATS_KEY, applyBuffer, formatDuration, validateStats } from '../shared/stats';
import { isHostListed, normalizeHostPattern } from '../shared/hosts';
import { roundSpeed } from '../shared/media-math';
import { defaultShortcuts } from '../shared/shortcuts';
import { normalizeMediaUrl } from '../shared/url';
import { mountShortcutEditor } from '../ui/shortcut-editor';
import { mountSmart } from './smart';
import { LANDING_PAGE_URL } from '../shared/links';


// Top-level feature flag defaults
const HUD_ENABLED_DEFAULT = true;
const PRESERVE_PITCH_DEFAULT = true;

function initPopup() {
  applyI18n();
  // ==========================================
  // 1. DOM ELEMENTS & CONSTANTS
  // ==========================================
  const MIN_SPEED = PRO_MIN_SPEED;
  const MAX_SPEED = PRO_MAX_SPEED;
  const UNLOCK_TITLE = t('unlock_title', [formatSpeed(PRO_MAX_SPEED)]);
  const FREE_TIER_LABEL = t('free_tier', [formatSpeed(FREE_MAX_SPEED)]);

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
  let license = validateLicense(null);
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
  /** Footer/badge wording for the current license state. */
  function licenseLabel() {
    if (isPermanentPro) return isInGrace(license) ? t('license_grace') : t('pro_active');
    switch (license.status) {
      case 'expired': return t('license_state_expired');
      case 'revoked': return t('license_state_revoked');
      case 'limit': return t('license_state_limit');
      case 'invalid': return license.key ? t('license_state_invalid') : FREE_TIER_LABEL;
      case 'active': return t('license_state_stale');
      default: return FREE_TIER_LABEL;
    }
  }

  function getTierStatus() {
    if (isPermanentPro) {
      return { isPro: true, hasFullAccess: true, label: licenseLabel() };
    }
    return { isPro: false, hasFullAccess: false, label: licenseLabel() };
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
        licenseTierBadge.title = t('pro_active');
      }
      if (tierBadgeText) tierBadgeText.textContent = tier.label;
      if (tierRangeHint) tierRangeHint.textContent = `(${formatSpeed(PRO_MIN_SPEED)}–${formatSpeed(PRO_MAX_SPEED)})`;
      if (footerLicenseStatus) {
        footerLicenseStatus.textContent = tier.label;
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
        licenseTierBadge.title = t('tier_badge_title');
      }
      if (tierBadgeText) tierBadgeText.textContent = FREE_TIER_LABEL;
      if (footerLicenseStatus && license.key) footerLicenseStatus.title = license.key;
      if (tierRangeHint) tierRangeHint.textContent = `(${t('free')}: ${formatSpeed(FREE_MIN_SPEED)}–${formatSpeed(FREE_MAX_SPEED)})`;
      if (footerLicenseStatus) {
        footerLicenseStatus.textContent = tier.label;
        footerLicenseStatus.className = 'footer-note';
      }
      if (footerCtaSection) footerCtaSection.style.display = 'flex';
      if (footerCtaBtnText) footerCtaBtnText.textContent = t('cta_start_trial');
      if (openUpgradeBtn) openUpgradeBtn.style.display = 'inline-block';
      // A stored but unusable key (expired, revoked…) can be removed to enter a new one.
      if (logoutKeyBtn) logoutKeyBtn.style.display = license.key ? 'inline-block' : 'none';

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
        proModalTitle.textContent = t('pro_modal_active');
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
    activateBtn.textContent = isActivating ? t('license_validating') : t('license_activate');
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
      license: null,
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
      license = validateLicense(data.license);
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
      activeTabTitle = tab.title || t('video');

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
    if (seekBack5Btn) seekBack5Btn.title = t('seek_back_title', [seekSeconds]);
    if (seekFwd5Btn) seekFwd5Btn.title = t('seek_fwd_title', [seekSeconds]);
    updateDomainUI();
    shortcutEditor?.render();
  }

  // ==========================================
  // 6. LICENSE ACTIVATION & VERIFICATION
  // ==========================================
  const VERDICT_MESSAGES = Object.fromEntries(
    ['valid', 'expired', 'revoked', 'limit', 'invalid', 'unreachable'].map((k) => [k, t(`license_verdict_${k}`)])
  );

  /** Validation runs in the background worker (single place, daily re-checks, offline grace). */
  async function handleModalActivation() {
    const rawKey = keyInput ? keyInput.value.trim() : '';
    if (!rawKey) {
      showModalStatus(t('license_enter'), 'error');
      if (keyInput) keyInput.focus();
      return;
    }

    setModalActivating(true);
    showModalStatus(t('license_validating'), 'info');

    let result = null;
    try {
      result = await chrome.runtime.sendMessage({ action: 'LICENSE_ACTIVATE', key: rawKey });
    } catch (e) {
      result = null;
    }
    const verdict = result?.verdict ?? 'unreachable';
    if (result?.ok) {
      license = validateLicense(result.license);
      isPermanentPro = isPro({ license: result.license });
      showModalStatus(VERDICT_MESSAGES.valid, 'success');
      setTimeout(() => {
        setModalActivating(false);
        applyTierUI();
        closeUpgradeModal();
      }, 400);
      return;
    }
    if (result?.license) license = validateLicense(result.license);
    setModalActivating(false);
    showModalStatus(VERDICT_MESSAGES[verdict] ?? VERDICT_MESSAGES.invalid, 'error');
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
      await chrome.runtime.sendMessage({ action: 'LICENSE_DEACTIVATE' }).catch(() => {});
      isPermanentPro = false;
      license = validateLicense(null);
      applyTierUI();
      if (currentSpeed > FREE_MAX_SPEED) setSpeed(FREE_MAX_SPEED);
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
      statusText.textContent = count > 1 ? t('status_found_many', [count]) : t('status_found_one');
      statusBadge.className = 'status-badge status-online';
    } else {
      statusText.textContent = t('status_searching');
      statusBadge.className = 'status-badge status-offline';
    }
  }

  function updatePlaybackUI() {
    if (playText) playText.textContent = isPlaying ? t('pause') : t('play');
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

  // Review request (once, after 30 min saved in total; "Not now" = ask again in 14 days)
  const reviewBanner = document.getElementById('reviewBanner');
  async function maybeAskForReview() {
    if (!reviewBanner) return;
    const local = await chrome.storage.local.get(['reviewPrompt', STATS_KEY]);
    const buffer = (await chrome.storage.session.get(STATS_BUFFER_KEY).catch(() => ({})))[STATS_BUFFER_KEY];
    const total = applyBuffer(validateStats(local[STATS_KEY]), buffer).total.saved;
    const prompt = local.reviewPrompt ?? { state: 'waiting', snoozedUntil: 0 };
    if (!shouldAskForReview(prompt, total)) return;
    const text = document.getElementById('reviewText');
    if (text) text.textContent = t('review_text', [formatDuration(Math.max(total, REVIEW_THRESHOLD_SECONDS))]);
    reviewBanner.hidden = false;
  }
  document.getElementById('reviewRate')?.addEventListener('click', () => {
    chrome.storage.local.set({ reviewPrompt: completeReview() });
    const url = reviewUrl(chrome.runtime.id, __TARGET__, navigator.userAgent);
    if (url) chrome.tabs.create({ url });
    if (reviewBanner) reviewBanner.hidden = true;
  });
  document.getElementById('reviewLater')?.addEventListener('click', () => {
    chrome.storage.local.set({ reviewPrompt: snoozeReview() });
    if (reviewBanner) reviewBanner.hidden = true;
  });
  void maybeAskForReview();

  // Firefox: the user must grant access to websites before shortcuts/overlay can work.
  const siteAccessBanner = document.getElementById('siteAccessBanner');
  hasSiteAccess().then((ok) => {
    if (siteAccessBanner) siteAccessBanner.hidden = ok;
  });
  document.getElementById('siteAccessGrant')?.addEventListener('click', async () => {
    const ok = await requestSiteAccess();
    if (siteAccessBanner) siteAccessBanner.hidden = ok;
  });

  // A-B repeat (Pro)
  const abState = document.getElementById('abState');
  const abAction = async (op) => {
    if (!smart.gate('abRepeat')) return;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    const res = await sendTabMessageWithTimeout(tab.id, { action: 'AB_REPEAT', op }, 400);
    if (abState) abState.textContent = res?.abLoop ? (res.abLoop.b !== undefined ? t('ab_looping') : t('ab_a_set')) : res?.success ? t('ab_off') : t('no_video');
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
      openUpgradeModal(t('upsell_frames'));
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
      openUpgradeModal(t('upsell_skip'));
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
      checkpointCountBadge.textContent = t('bookmarks_count', [list.length]);
    }

    if (list.length === 0) {
      checkpointsList.textContent = '';
      const empty = document.createElement('div');
      empty.className = 'cp-empty';
      empty.textContent = t('bookmarks_empty');
      checkpointsList.append(empty);
      return;
    }

    checkpointsList.innerHTML = '';
    list.forEach((cp) => {
      const item = document.createElement('div');
      item.className = 'cp-item';
      item.title = t('bookmark_jump', [cp.formattedTime, cp.pageTitle || '']);

      const left = document.createElement('div');
      left.className = 'cp-left';

      const timeBadge = document.createElement('span');
      timeBadge.className = 'cp-time-badge';
      timeBadge.textContent = cp.formattedTime || formatTimestamp(cp.time);

      const labelSpan = document.createElement('span');
      labelSpan.className = 'cp-label';
      labelSpan.textContent = cp.label || cp.pageTitle || t('bookmark');

      left.appendChild(timeBadge);
      left.appendChild(labelSpan);

      const delBtn = document.createElement('button');
      delBtn.className = 'cp-delete-btn';
      delBtn.title = t('bookmark_delete');
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
      openUpgradeModal(t('upsell_bookmarks'));
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
      : t('bookmark_n', [existingList.length + 1]);

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
