// SpeedUp Video Pro - Universal HTML5 Content Script Controller (v1.5.1)
(() => {
  const currentHostname = window.location.hostname;
  const DEFAULT_HOTKEYS = {
    speedUp: ']',
    speedDown: '[',
    resetSpeed: 'r',
    favoriteSpeed: 'g'
  };

  const DEV_MASTER_KEY = 'DEV-SPEEDUP-PRO-2026';
  const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
  let isPermanentPro = false;
  let installDate = null;
  let targetSpeed = 1.0;
  let isEnforcing = false;
  let hudEnabled = true;
  let preservesPitch = true;
  let loopVideo = false;
  let favoriteSpeed = 2.0;
  let domainSpeeds = {};
  let customHotkeys = { ...DEFAULT_HOTKEYS };

  function hasFullAccess() {
    if (isPermanentPro) return true;
    if (installDate && (Date.now() - installDate <= TRIAL_DURATION_MS)) {
      return true;
    }
    return false;
  }

  function normalizeKey(key) {
    if (!key) return '';
    if (key === ' ') return 'Space';
    return key.length === 1 ? key.toLowerCase() : key;
  }

  function clampSpeed(val) {
    const num = parseFloat(val);
    if (isNaN(num)) return 1.0;
    if (hasFullAccess()) {
      return parseFloat(Math.min(Math.max(num, 0.1), 16.0).toFixed(2));
    }
    return parseFloat(Math.min(Math.max(num, 0.25), 2.5).toFixed(2));
  }

  function formatSpeedText(speed) {
    const num = parseFloat(speed) || 1.0;
    return Number.isInteger(num * 10) ? `${num.toFixed(1)}x` : `${num.toFixed(2)}x`;
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

  // ==========================================
  // 1. UNIVERSAL VIDEO DISCOVERY (DOM + SHADOW DOM)
  // ==========================================
  function getAllVideos(root = document) {
    if (!root || !root.querySelectorAll) return [];
    const videos = Array.from(root.querySelectorAll('video'));
    const allElements = root.querySelectorAll('*');
    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i];
      if (el.shadowRoot) {
        const shadowVideos = getAllVideos(el.shadowRoot);
        for (let j = 0; j < shadowVideos.length; j++) {
          if (!videos.includes(shadowVideos[j])) {
            videos.push(shadowVideos[j]);
          }
        }
      }
    }
    return videos;
  }

  function getMainVideo() {
    const videos = getAllVideos();
    if (!videos.length) return null;
    // Prefer a video that is currently playing or has loaded media
    const playing = videos.find((v) => !v.paused && v.readyState > 0);
    if (playing) return playing;
    const activeReady = videos.find((v) => (v.currentSrc || v.src) && v.offsetWidth > 0);
    if (activeReady) return activeReady;
    return videos[0];
  }

  // ==========================================
  // 2. FORCED PLAYBACK RATE ENFORCEMENT (UP TO 16X)
  // ==========================================
  function forceRateOnVideo(video) {
    if (!video) return;
    isEnforcing = true;
    try {
      if (Math.abs(video.playbackRate - targetSpeed) > 0.005) {
        video.playbackRate = targetSpeed;
      }
      video.defaultPlaybackRate = targetSpeed;
      video.preservesPitch = preservesPitch;
      video.webkitPreservesPitch = preservesPitch;
      video.mozPreservesPitch = preservesPitch;
      video.loop = !!loopVideo;
    } catch (err) {}
    isEnforcing = false;
  }

  function attachVideoListeners(video) {
    if (!video || video.dataset.suvEnforceAttached === 'true') return;
    video.dataset.suvEnforceAttached = 'true';

    video.addEventListener(
      'ratechange',
      (e) => {
        if (isEnforcing) {
          // Block YouTube's internal ratechange listener from resetting >2x speeds
          if (targetSpeed > 2.0) {
            e.stopImmediatePropagation();
            e.stopPropagation();
          }
          return;
        }
        if (targetSpeed && Math.abs(video.playbackRate - targetSpeed) > 0.005) {
          e.stopImmediatePropagation();
          e.stopPropagation();
          forceRateOnVideo(video);
        } else if (targetSpeed > 2.0) {
          e.stopImmediatePropagation();
          e.stopPropagation();
        }
        updateHUDForVideo(video);
      },
      true
    );

    const reinforceHandler = () => {
      if (isEnforcing) return;
      forceRateOnVideo(video);
      attachHUDToVideo(video);
      updateHUDForVideo(video);
    };

    video.addEventListener('play', reinforceHandler, true);
    video.addEventListener('playing', reinforceHandler, true);
    video.addEventListener('loadedmetadata', reinforceHandler, true);
    video.addEventListener('loadeddata', reinforceHandler, true);
    video.addEventListener('canplay', reinforceHandler, true);
    video.addEventListener('seeked', reinforceHandler, true);

    attachHUDToVideo(video);
  }

  // Document-level capture listener at document_start intercepts ratechange before YouTube player scripts
  window.addEventListener(
    'ratechange',
    (e) => {
      const video = e.target;
      if (!video || video.tagName !== 'VIDEO') return;
      attachVideoListeners(video);

      if (isEnforcing) {
        if (targetSpeed > 2.0) {
          e.stopImmediatePropagation();
          e.stopPropagation();
        }
        return;
      }

      if (targetSpeed && Math.abs(video.playbackRate - targetSpeed) > 0.005) {
        e.stopImmediatePropagation();
        e.stopPropagation();
        forceRateOnVideo(video);
      } else if (targetSpeed > 2.0) {
        e.stopImmediatePropagation();
        e.stopPropagation();
      }
      updateHUDForVideo(video);
    },
    true
  );

  ['play', 'playing', 'loadedmetadata', 'loadeddata', 'canplay'].forEach((evtName) => {
    window.addEventListener(
      evtName,
      (e) => {
        const video = e.target;
        if (video && video.tagName === 'VIDEO') {
          attachVideoListeners(video);
          forceRateOnVideo(video);
          updateHUDForVideo(video);
        }
      },
      true
    );
  });

  function applySettingsToAllVideos() {
    const videos = getAllVideos();
    videos.forEach((v) => {
      attachVideoListeners(v);
      forceRateOnVideo(v);
      updateHUDForVideo(v);
    });
  }

  function applySpeed(speed, persist = true, showHudOverlay = true) {
    targetSpeed = clampSpeed(speed);
    const videos = getAllVideos();

    videos.forEach((v) => {
      attachVideoListeners(v);
      forceRateOnVideo(v);
      updateHUDForVideo(v);
    });

    if (persist) {
      persistCurrentSpeed(targetSpeed);
    }

    if (showHudOverlay && videos.length > 0) {
      showSpeedHUD(targetSpeed);
    }

    chrome.runtime.sendMessage({ action: 'UPDATE_BADGE', speed: targetSpeed }).catch(() => {});
  }

  function persistCurrentSpeed(speedVal) {
    chrome.storage.local.set({ defaultSpeed: speedVal });
    if (domainSpeeds && domainSpeeds[currentHostname] !== undefined) {
      domainSpeeds[currentHostname] = speedVal;
      chrome.storage.local.set({ domainSpeeds });
    }
  }

  // ==========================================
  // 3. FLOATING HUD & PILL OVERLAY (showHUD)
  // ==========================================
  function attachHUDToVideo(video) {
    if (!hudEnabled) {
      removeHUDFromVideo(video);
      return;
    }

    const parent = video.parentElement || video.parentNode;
    if (!parent || !parent.querySelector) return;

    const parentStyle = window.getComputedStyle(parent);
    if (parentStyle.position === 'static') {
      parent.style.position = 'relative';
    }

    let hud = parent.querySelector('.suv-hud-container');
    if (!hud) {
      hud = document.createElement('div');
      hud.className = 'suv-hud-container';
      hud.innerHTML = `
        <button class="suv-hud-btn suv-minus" title="Rallenta (-0.25x)">-</button>
        <span class="suv-hud-speed">${formatSpeedText(targetSpeed)}</span>
        <button class="suv-hud-btn suv-plus" title="Accelera (+0.25x)">+</button>
        <button class="suv-hud-btn suv-reset" title="Reset (1.0x)">1x</button>
      `;

      hud.querySelector('.suv-minus').addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        applySpeed(Math.max(0.1, targetSpeed - 0.25));
      });

      hud.querySelector('.suv-plus').addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        applySpeed(Math.min(16.0, targetSpeed + 0.25));
      });

      hud.querySelector('.suv-reset').addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        applySpeed(1.0);
      });

      parent.appendChild(hud);
    } else {
      hud.style.display = hudEnabled ? 'flex' : 'none';
      const speedSpan = hud.querySelector('.suv-hud-speed');
      if (speedSpan) speedSpan.textContent = formatSpeedText(targetSpeed);
    }
  }

  function removeHUDFromVideo(video) {
    const parent = video.parentElement;
    if (parent && parent.querySelector) {
      const hud = parent.querySelector('.suv-hud-container');
      if (hud) hud.remove();
    }
  }

  function updateHUDForVideo(video) {
    const parent = video.parentElement;
    if (parent && parent.querySelector) {
      const hud = parent.querySelector('.suv-hud-container');
      if (hud) {
        hud.style.display = hudEnabled ? 'flex' : 'none';
        const speedSpan = hud.querySelector('.suv-hud-speed');
        if (speedSpan) speedSpan.textContent = formatSpeedText(targetSpeed);
      }
    }
  }

  function showSpeedHUD(speedVal) {
    showHUD(formatSpeedText(speedVal));
  }

  function showHUD(labelText) {
    const videos = getAllVideos();
    let attachedToVideo = false;

    videos.forEach((video) => {
      const parent = (video.closest && video.closest('#movie_player')) || video.parentElement || video.parentNode;
      if (!parent || !parent.querySelector) return;

      const parentStyle = window.getComputedStyle(parent);
      if (parentStyle.position === 'static') {
        parent.style.position = 'relative';
      }

      const existing = parent.querySelector('.suv-video-action-badge');
      if (existing) existing.remove();

      const badge = document.createElement('div');
      badge.className = 'suv-video-action-badge';
      badge.textContent = labelText;
      parent.appendChild(badge);
      attachedToVideo = true;

      setTimeout(() => {
        if (badge.parentElement) badge.remove();
      }, 900);
    });

    if (!attachedToVideo && document.body) {
      showToast(labelText);
    }
  }

  function showToast(message) {
    if (!document.body) return;
    let existingToast = document.querySelector('.suv-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'suv-toast';
    toast.textContent = message;

    document.body.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 900);
  }

  // ==========================================
  // 4. STORAGE INITIALIZATION & LIVE SYNC
  // ==========================================
  chrome.storage.local.get(
    [
      'installDate',
      'isPro',
      'isLicensed',
      'licenseKey',
      'defaultSpeed',
      'domainSpeeds',
      'hudEnabled',
      'preservesPitch',
      'loopVideo',
      'customHotkeys',
      'favoriteSpeed'
    ],
    (data) => {
      installDate = data.installDate || null;
      isPermanentPro = !!(data.isPro || data.licenseKey === DEV_MASTER_KEY || (data.licenseKey && data.licenseKey.trim().length > 3));

      if (data.domainSpeeds && typeof data.domainSpeeds === 'object') {
        domainSpeeds = data.domainSpeeds;
      }

      if (domainSpeeds[currentHostname] !== undefined) {
        targetSpeed = clampSpeed(domainSpeeds[currentHostname]);
      } else if (data.defaultSpeed !== undefined) {
        targetSpeed = clampSpeed(data.defaultSpeed);
      }

      if (typeof data.hudEnabled !== 'undefined') hudEnabled = data.hudEnabled;
      if (typeof data.preservesPitch !== 'undefined') preservesPitch = data.preservesPitch;
      else preservesPitch = true;
      if (typeof data.loopVideo !== 'undefined') loopVideo = data.loopVideo;
      if (typeof data.favoriteSpeed !== 'undefined') favoriteSpeed = parseFloat(data.favoriteSpeed) || 2.0;

      if (data.customHotkeys && typeof data.customHotkeys === 'object') {
        customHotkeys = { ...DEFAULT_HOTKEYS, ...data.customHotkeys };
      }

      applySettingsToAllVideos();
    }
  );

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.isPro !== undefined || changes.isLicensed !== undefined || changes.licenseKey !== undefined || changes.installDate !== undefined) {
      chrome.storage.local.get(['isPro', 'isLicensed', 'licenseKey', 'installDate'], (res) => {
        isPermanentPro = !!(res.isPro || res.licenseKey === DEV_MASTER_KEY || (res.licenseKey && res.licenseKey.trim().length > 3));
        installDate = res.installDate || null;
      });
    }
    if (changes.defaultSpeed && changes.defaultSpeed.newValue !== undefined) {
      const nextSpeed = clampSpeed(changes.defaultSpeed.newValue);
      if (Math.abs(nextSpeed - targetSpeed) > 0.005) {
        applySpeed(nextSpeed, false, true);
      } else {
        applySettingsToAllVideos();
      }
    }
    if (changes.customHotkeys && changes.customHotkeys.newValue) {
      customHotkeys = { ...DEFAULT_HOTKEYS, ...changes.customHotkeys.newValue };
    }
    if (changes.favoriteSpeed && changes.favoriteSpeed.newValue !== undefined) {
      favoriteSpeed = parseFloat(changes.favoriteSpeed.newValue) || 2.0;
    }
    if (changes.domainSpeeds && changes.domainSpeeds.newValue) {
      domainSpeeds = changes.domainSpeeds.newValue;
    }
    if (changes.preservesPitch && changes.preservesPitch.newValue !== undefined) {
      preservesPitch = !!changes.preservesPitch.newValue;
      applySettingsToAllVideos();
    }
    if (changes.hudEnabled && changes.hudEnabled.newValue !== undefined) {
      hudEnabled = !!changes.hudEnabled.newValue;
      applySettingsToAllVideos();
    }
    if (changes.loopVideo && changes.loopVideo.newValue !== undefined) {
      loopVideo = !!changes.loopVideo.newValue;
      applySettingsToAllVideos();
    }
  });

  // ==========================================
  // 5. MUTATION OBSERVER & SPA NAVIGATION
  // ==========================================
  const observer = new MutationObserver(() => {
    const videos = getAllVideos();
    for (let i = 0; i < videos.length; i++) {
      attachVideoListeners(videos[i]);
      forceRateOnVideo(videos[i]);
    }
  });

  function startObserving() {
    const rootNode = document.documentElement || document.body;
    if (rootNode) {
      observer.observe(rootNode, { childList: true, subtree: true });
      applySettingsToAllVideos();
    }
  }

  startObserving();
  window.addEventListener('DOMContentLoaded', applySettingsToAllVideos);
  window.addEventListener('load', applySettingsToAllVideos);
  window.addEventListener('yt-navigate-finish', applySettingsToAllVideos);

  // ==========================================
  // 6. KEYBOARD SHORTCUTS LISTENER (CAPTURE = TRUE)
  // ==========================================
  window.addEventListener(
    'keydown',
    (e) => {
      // Non intercettare scorciatoie di sistema (Cmd+R / Ctrl+R)
      if (e.ctrlKey || e.metaKey) return;

      // Non attivare scorciatoie se l'utente scrive in input, textarea o contenteditable
      const targetEl = (e.composedPath && e.composedPath()[0]) || e.target || document.activeElement;
      const activeEl = document.activeElement;
      if (
        (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT' || activeEl.isContentEditable)) ||
        (targetEl && (targetEl.tagName === 'INPUT' || targetEl.tagName === 'TEXTAREA' || targetEl.tagName === 'SELECT' || targetEl.isContentEditable))
      ) {
        return;
      }

      const videos = getAllVideos();
      if (!videos.length) return;

      const pressed = normalizeKey(e.key);
      const upKey = normalizeKey(customHotkeys.speedUp);
      const downKey = normalizeKey(customHotkeys.speedDown);
      const resetKey = normalizeKey(customHotkeys.resetSpeed);
      const favKey = normalizeKey(customHotkeys.favoriteSpeed);

      if (e.key === ']' || e.key === 'd' || e.key === 'D' || e.code === 'BracketRight' || pressed === upKey) {
        e.preventDefault();
        e.stopPropagation();
        applySpeed(Math.min(16.0, targetSpeed + 0.25));
      } else if (e.key === '[' || e.key === 's' || e.key === 'S' || e.code === 'BracketLeft' || pressed === downKey) {
        e.preventDefault();
        e.stopPropagation();
        applySpeed(Math.max(0.1, targetSpeed - 0.25));
      } else if (e.key === 'r' || e.key === 'R' || pressed === resetKey) {
        e.preventDefault();
        e.stopPropagation();
        applySpeed(1.0);
      } else if (e.key === 'g' || e.key === 'G' || pressed === favKey) {
        e.preventDefault();
        e.stopPropagation();
        const targetFav = clampSpeed(favoriteSpeed || 2.0);
        if (Math.abs(targetSpeed - targetFav) < 0.02) {
          applySpeed(1.0);
        } else {
          applySpeed(targetFav);
        }
      }
    },
    true // <- IMPORTANTISSIMO: capture = true
  );

  // ==========================================
  // 7. MESSAGE HANDLER FOR POPUP & BACKGROUND
  // ==========================================
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!request || !request.action) return false;

    const videos = getAllVideos();
    const mainVideo = getMainVideo();

    // Prevent empty child iframes from answering before the frame that holds the video
    if (!videos.length && window !== window.top) {
      return false;
    }

    if (
      !videos.length &&
      ['STEP_FRAME', 'SKIP_TIME', 'ADD_CHECKPOINT', 'SEEK_TO'].includes(request.action)
    ) {
      sendResponse({ success: false, error: 'No video found' });
      return true;
    }

    switch (request.action) {
      case 'SET_SPEED':
        applySpeed(request.speed, true, true);
        sendResponse({ success: true, currentSpeed: targetSpeed, speed: targetSpeed });
        break;

      case 'GET_SPEED':
        sendResponse({
          success: true,
          currentSpeed: targetSpeed,
          speed: targetSpeed,
          hasVideo: videos.length > 0
        });
        break;

      case 'STEP_FRAME': {
        if (!hasFullAccess()) {
          sendResponse({ success: false, isProRequired: true, error: 'Pro feature requires active trial or lifetime license' });
          break;
        }
        // direction: +1 per avanti, -1 per indietro (~0.033s @ 30fps)
        if (mainVideo) {
          mainVideo.pause();
          const dir = request.direction !== undefined
            ? (request.direction > 0 ? 1 : -1)
            : (parseFloat(request.delta) >= 0 ? 1 : -1);
          const delta = dir > 0 ? 0.033 : -0.033;
          mainVideo.currentTime = Math.max(0, mainVideo.currentTime + delta);
          showHUD(dir > 0 ? '+1 Frame' : '-1 Frame');
        }
        sendResponse({
          success: true,
          currentTime: mainVideo ? mainVideo.currentTime : 0,
          isPlaying: false
        });
        break;
      }

      case 'SKIP_TIME':
      case 'SEEK': {
        if (!hasFullAccess()) {
          sendResponse({ success: false, isProRequired: true, error: 'Pro feature requires active trial or lifetime license' });
          break;
        }
        // seconds: es. +5 oppure -5
        if (mainVideo) {
          const secs = parseFloat(request.seconds) || 0;
          const nextTime = Math.max(0, mainVideo.currentTime + secs);
          mainVideo.currentTime = isFinite(mainVideo.duration)
            ? Math.min(mainVideo.duration, nextTime)
            : nextTime;
          showHUD(secs > 0 ? `+${secs}s` : `${secs}s`);
        }
        sendResponse({
          success: true,
          currentTime: mainVideo ? mainVideo.currentTime : 0
        });
        break;
      }

      case 'ADD_CHECKPOINT':
      case 'GET_CURRENT_TIME': {
        if (request.action === 'ADD_CHECKPOINT' && !hasFullAccess()) {
          sendResponse({ success: false, isProRequired: true, error: 'Pro feature requires active trial or lifetime license' });
          break;
        }
        if (mainVideo) {
          if (request.action === 'ADD_CHECKPOINT') {
            showHUD(`📍 ${formatTimestamp(mainVideo.currentTime)}`);
          }
          sendResponse({
            success: true,
            timestamp: mainVideo.currentTime,
            currentTime: mainVideo.currentTime,
            duration: isFinite(mainVideo.duration) ? mainVideo.duration : 0,
            pageTitle: document.title,
            pageUrl: window.location.href
          });
        } else {
          sendResponse({ success: false, error: 'No video found' });
        }
        break;
      }

      case 'SEEK_TO': {
        if (!hasFullAccess()) {
          sendResponse({ success: false, isProRequired: true, error: 'Pro feature requires active trial or lifetime license' });
          break;
        }
        if (mainVideo && typeof request.time === 'number') {
          mainVideo.currentTime = Math.max(0, request.time);
          showHUD(`📍 ${formatTimestamp(mainVideo.currentTime)}`);
          sendResponse({ success: true, currentTime: mainVideo.currentTime });
        } else {
          sendResponse({ success: false, error: 'No video found' });
        }
        break;
      }

      case 'GET_VIDEO_STATUS':
        sendResponse({
          success: true,
          hasVideo: videos.length > 0,
          count: videos.length,
          currentSpeed: targetSpeed,
          isPlaying: mainVideo ? !mainVideo.paused : true,
          isMuted: mainVideo ? mainVideo.muted : false,
          currentTime: mainVideo ? mainVideo.currentTime : 0,
          duration: mainVideo && isFinite(mainVideo.duration) ? mainVideo.duration : 0,
          hostname: currentHostname,
          pageTitle: document.title,
          pageUrl: window.location.href
        });
        break;

      case 'TOGGLE_PLAY': {
        let playingState = false;
        if (mainVideo) {
          if (mainVideo.paused) {
            mainVideo.play();
            playingState = true;
            showHUD('▶ Play');
          } else {
            mainVideo.pause();
            playingState = false;
            showHUD('⏸ Pausa');
          }
        }
        sendResponse({ success: true, isPlaying: playingState });
        break;
      }

      case 'TOGGLE_MUTE': {
        let mutedState = false;
        if (mainVideo) {
          mainVideo.muted = !mainVideo.muted;
          mutedState = mainVideo.muted;
          showHUD(mutedState ? '🔇 Mute' : '🔊 Audio');
        }
        sendResponse({ success: true, isMuted: mutedState });
        break;
      }

      case 'SET_PITCH':
        preservesPitch = !!request.preservesPitch;
        applySettingsToAllVideos();
        sendResponse({ success: true });
        break;

      case 'SET_LOOP':
        loopVideo = !!request.loop;
        applySettingsToAllVideos();
        sendResponse({ success: true });
        break;

      case 'SET_HUD':
        hudEnabled = !!request.enabled;
        applySettingsToAllVideos();
        sendResponse({ success: true });
        break;
    }
    return true;
  });
})();
