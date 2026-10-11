// SpeedUp Video Pro - Universal HTML5 Content Script Controller (v1.5.0)
(() => {
  const currentHostname = window.location.hostname;
  const DEFAULT_HOTKEYS = {
    speedUp: ']',
    speedDown: '[',
    resetSpeed: 'r',
    favoriteSpeed: 'g'
  };

  let isLicensed = false;
  let currentSpeed = 1.0;
  let hudEnabled = true;
  let preservesPitch = true;
  let loopVideo = false;
  let favoriteSpeed = 2.0;
  let domainSpeeds = {};
  let customHotkeys = { ...DEFAULT_HOTKEYS };

  function normalizeKey(key) {
    if (!key) return '';
    if (key === ' ') return 'Space';
    return key.length === 1 ? key.toLowerCase() : key;
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

  function getSpeedBounds() {
    return isLicensed ? { min: 0.1, max: 16.0 } : { min: 0.25, max: 2.5 };
  }

  function clampSpeedForTier(val) {
    const { min, max } = getSpeedBounds();
    const num = parseFloat(val);
    if (isNaN(num)) return 1.0;
    return parseFloat(Math.min(Math.max(num, min), max).toFixed(2));
  }

  // Initialize stored settings asynchronously
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
      'customHotkeys',
      'favoriteSpeed'
    ],
    (data) => {
      isLicensed = !!(data.isPro || data.isLicensed || data.licenseKey === 'DEV-SPEEDUP-PRO-2026');

      if (data.domainSpeeds && typeof data.domainSpeeds === 'object') {
        domainSpeeds = data.domainSpeeds;
      }

      if (isLicensed && domainSpeeds[currentHostname] !== undefined) {
        currentSpeed = clampSpeedForTier(domainSpeeds[currentHostname]);
      } else if (data.defaultSpeed !== undefined) {
        currentSpeed = clampSpeedForTier(data.defaultSpeed);
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
      chrome.runtime.sendMessage({ action: 'UPDATE_BADGE', speed: currentSpeed }).catch(() => {});
    }
  );

  // Live sync settings, license & hotkeys from storage changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.isPro !== undefined || changes.isLicensed !== undefined) {
      if (changes.isPro !== undefined) isLicensed = !!changes.isPro.newValue;
      else if (changes.isLicensed !== undefined) isLicensed = !!changes.isLicensed.newValue;
      currentSpeed = clampSpeedForTier(currentSpeed);
      applySettingsToAllVideos();
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

  // Find all HTML5 video elements (including #movie_player video and shadow roots)
  function getAllVideos(root = document) {
    const videos = Array.from(root.querySelectorAll('#movie_player video, video'));
    const uniqueVideos = Array.from(new Set(videos));
    const allElements = root.querySelectorAll('*');
    for (const el of allElements) {
      if (el.shadowRoot) {
        const shadowVideos = getAllVideos(el.shadowRoot);
        for (const sv of shadowVideos) {
          if (!uniqueVideos.includes(sv)) uniqueVideos.push(sv);
        }
      }
    }
    return uniqueVideos;
  }

  function applySettingsToAllVideos() {
    const videos = getAllVideos();
    videos.forEach(video => applyToVideo(video));
  }

  function applyToVideo(video) {
    if (!video) return;

    if (Math.abs(video.playbackRate - currentSpeed) > 0.01) {
      video.playbackRate = currentSpeed;
    }

    // Audio pitch preservation active by default
    video.preservesPitch = preservesPitch;
    video.webkitPreservesPitch = preservesPitch;
    video.mozPreservesPitch = preservesPitch;

    video.loop = !!loopVideo;

    if (!video.dataset.hasSpeedListener) {
      video.dataset.hasSpeedListener = "true";
      video.dataset.suvListenerAttached = "true";

      video.addEventListener('ratechange', () => {
        if (Math.abs(video.playbackRate - currentSpeed) > 0.01) {
          video.playbackRate = currentSpeed;
        }
        video.preservesPitch = preservesPitch;
        video.webkitPreservesPitch = preservesPitch;
        video.mozPreservesPitch = preservesPitch;
        updateHUDForVideo(video);
      });

      video.addEventListener('loadedmetadata', () => {
        if (Math.abs(video.playbackRate - currentSpeed) > 0.01) {
          video.playbackRate = currentSpeed;
        }
        video.preservesPitch = preservesPitch;
        video.webkitPreservesPitch = preservesPitch;
        video.mozPreservesPitch = preservesPitch;
        updateHUDForVideo(video);
      });

      attachHUDToVideo(video);
    } else {
      updateHUDForVideo(video);
    }
  }

  // Attach Floating HUD badge to video container
  function attachHUDToVideo(video) {
    if (!hudEnabled) {
      removeHUDFromVideo(video);
      return;
    }

    const parent = video.parentElement || video.parentNode;
    if (!parent) return;

    const parentStyle = window.getComputedStyle(parent);
    if (parentStyle.position === 'static') {
      parent.style.position = 'relative';
    }

    let hud = parent.querySelector('.suv-hud-container');
    if (!hud) {
      hud = document.createElement('div');
      hud.className = 'suv-hud-container';
      hud.innerHTML = `
        <button class="suv-hud-btn suv-minus" title="Rallenta (-0.1x)">-</button>
        <span class="suv-hud-speed">${formatSpeedText(currentSpeed)}</span>
        <button class="suv-hud-btn suv-plus" title="Accelera (+0.1x)">+</button>
        <button class="suv-hud-btn suv-reset" title="Reset (1.0x)">1x</button>
      `;

      hud.querySelector('.suv-minus').addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        changeSpeed(-0.1);
      });

      hud.querySelector('.suv-plus').addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        changeSpeed(0.1);
      });

      hud.querySelector('.suv-reset').addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        setSpeed(1.0);
      });

      parent.appendChild(hud);
    } else {
      hud.style.display = hudEnabled ? 'flex' : 'none';
      const speedSpan = hud.querySelector('.suv-hud-speed');
      if (speedSpan) speedSpan.textContent = formatSpeedText(currentSpeed);
    }
  }

  function removeHUDFromVideo(video) {
    const parent = video.parentElement;
    if (parent) {
      const hud = parent.querySelector('.suv-hud-container');
      if (hud) hud.remove();
    }
  }

  function updateHUDForVideo(video) {
    const parent = video.parentElement;
    if (parent) {
      const hud = parent.querySelector('.suv-hud-container');
      if (hud) {
        hud.style.display = hudEnabled ? 'flex' : 'none';
        const speedSpan = hud.querySelector('.suv-hud-speed');
        if (speedSpan) speedSpan.textContent = formatSpeedText(currentSpeed);
      }
    }
  }

  // Top-Right Visual Pill HUD Overlay on Active Video Container (900ms)
  function showVideoActionBadge(labelText) {
    const videos = getAllVideos();
    let attachedToVideo = false;

    videos.forEach((video) => {
      const parent = video.closest('#movie_player') || video.parentElement || video.parentNode;
      if (!parent) return;

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

    if (!attachedToVideo) {
      showToast(labelText);
    }
  }

  // Fallback Toast Notification Overlay (900ms)
  function showToast(message) {
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

  function persistCurrentSpeed(speedVal) {
    chrome.storage.local.set({ defaultSpeed: speedVal });
    if (isLicensed && domainSpeeds && domainSpeeds[currentHostname] !== undefined) {
      domainSpeeds[currentHostname] = speedVal;
      chrome.storage.local.set({ domainSpeeds });
    }
  }

  function setSpeed(val, customBadgeLabel = null) {
    currentSpeed = clampSpeedForTier(val);

    applySettingsToAllVideos();
    persistCurrentSpeed(currentSpeed);
    showVideoActionBadge(customBadgeLabel || formatSpeedText(currentSpeed));

    chrome.runtime.sendMessage({ action: 'UPDATE_BADGE', speed: currentSpeed }).catch(() => {});
  }

  function changeSpeed(delta) {
    const next = clampSpeedForTier(currentSpeed + delta);
    setSpeed(next, formatSpeedText(next));
  }

  // MutationObserver for dynamically added videos & SPA navigation
  const observer = new MutationObserver(() => {
    requestAnimationFrame(() => {
      const videos = getAllVideos();
      videos.forEach(video => applyToVideo(video));
    });
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  // Global Keyboard Shortcuts Listener (Prevent conflicts with text inputs & native player keys)
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const activeEl = document.activeElement;
    if (activeEl) {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName) || activeEl.isContentEditable;
      if (isInput) return;
    }

    const videos = getAllVideos();
    if (videos.length === 0) return;

    const pressed = normalizeKey(e.key);
    const step = e.shiftKey ? 0.25 : 0.10;

    // Free Tier uses default shortcuts (], [, R); Pro Tier uses custom remapped hotkeys + Favorite Speed (G)
    const activeKeys = isLicensed ? customHotkeys : DEFAULT_HOTKEYS;

    if (pressed === normalizeKey(activeKeys.speedUp)) {
      e.preventDefault();
      e.stopPropagation();
      changeSpeed(step);
    } else if (pressed === normalizeKey(activeKeys.speedDown)) {
      e.preventDefault();
      e.stopPropagation();
      changeSpeed(-step);
    } else if (pressed === normalizeKey(activeKeys.resetSpeed)) {
      e.preventDefault();
      e.stopPropagation();
      setSpeed(1.0, '1.0x');
    } else if (isLicensed && pressed === normalizeKey(activeKeys.favoriteSpeed)) {
      e.preventDefault();
      e.stopPropagation();
      const targetFav = clampSpeedForTier(favoriteSpeed || 2.0);
      if (Math.abs(currentSpeed - targetFav) < 0.02) {
        setSpeed(1.0, '1.0x');
      } else {
        setSpeed(targetFav, formatSpeedText(targetFav));
      }
    }
  }, true);

  function seekVideos(seconds) {
    const videos = getAllVideos();
    let latestTime = 0;
    videos.forEach(v => {
      const target = Math.max(0, v.currentTime + seconds);
      v.currentTime = isFinite(v.duration) ? Math.min(v.duration, target) : target;
      latestTime = v.currentTime;
    });
    const sign = seconds >= 0 ? '+' : '';
    showVideoActionBadge(`${sign}${seconds}s`);
    return latestTime;
  }

  function stepFrameVideos(deltaSeconds) {
    const videos = getAllVideos();
    let latestTime = 0;
    videos.forEach(v => {
      if (!v.paused) v.pause();
      const target = Math.max(0, v.currentTime + deltaSeconds);
      v.currentTime = isFinite(v.duration) ? Math.min(v.duration, target) : target;
      latestTime = v.currentTime;
    });
    showVideoActionBadge(deltaSeconds < 0 ? '⏮ -1f' : '⏭ +1f');
    return latestTime;
  }

  function seekToTime(targetSeconds) {
    const videos = getAllVideos();
    const sec = Math.max(0, parseFloat(targetSeconds) || 0);
    videos.forEach(v => {
      v.currentTime = isFinite(v.duration) ? Math.min(v.duration, sec) : sec;
    });
    showVideoActionBadge(formatTimestamp(sec));
    return sec;
  }

  function togglePlayAll() {
    const videos = getAllVideos();
    let playingState = false;
    videos.forEach(v => {
      if (v.paused) {
        v.play();
        playingState = true;
      } else {
        v.pause();
        playingState = false;
      }
    });
    return playingState;
  }

  function toggleMuteAll() {
    const videos = getAllVideos();
    let mutedState = false;
    videos.forEach(v => {
      v.muted = !v.muted;
      mutedState = v.muted;
    });
    return mutedState;
  }

  // Message Handler for Extension Popup & Service Worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const videos = getAllVideos();
    const firstVideo = videos[0];

    switch (message.action) {
      case 'GET_VIDEO_STATUS':
        sendResponse({
          hasVideo: videos.length > 0,
          count: videos.length,
          currentSpeed: currentSpeed,
          isPlaying: firstVideo ? !firstVideo.paused : true,
          isMuted: firstVideo ? firstVideo.muted : false,
          currentTime: firstVideo ? firstVideo.currentTime : 0,
          duration: firstVideo && isFinite(firstVideo.duration) ? firstVideo.duration : 0,
          hostname: currentHostname,
          pageTitle: document.title,
          pageUrl: window.location.href
        });
        break;

      case 'GET_CURRENT_TIME':
        sendResponse({
          hasVideo: videos.length > 0,
          currentTime: firstVideo ? firstVideo.currentTime : 0,
          duration: firstVideo && isFinite(firstVideo.duration) ? firstVideo.duration : 0,
          pageTitle: document.title,
          pageUrl: window.location.href
        });
        break;

      case 'SET_SPEED':
        setSpeed(message.speed);
        sendResponse({ success: true, speed: currentSpeed });
        break;

      case 'TOGGLE_PLAY':
        const isPlaying = togglePlayAll();
        sendResponse({ success: true, isPlaying });
        break;

      case 'TOGGLE_MUTE':
        const isMuted = toggleMuteAll();
        sendResponse({ success: true, isMuted });
        break;

      case 'SEEK':
        const newTime = seekVideos(parseFloat(message.seconds) || 0);
        sendResponse({ success: true, currentTime: newTime });
        break;

      case 'STEP_FRAME':
        const frameTime = stepFrameVideos(parseFloat(message.delta) || 0.033);
        sendResponse({ success: true, currentTime: frameTime, isPlaying: false });
        break;

      case 'SEEK_TO':
        const jumpedTime = seekToTime(message.time);
        sendResponse({ success: true, currentTime: jumpedTime });
        break;

      case 'SET_PITCH':
        preservesPitch = !!message.preservesPitch;
        applySettingsToAllVideos();
        sendResponse({ success: true });
        break;

      case 'SET_LOOP':
        loopVideo = !!message.loop;
        applySettingsToAllVideos();
        sendResponse({ success: true });
        break;

      case 'SET_HUD':
        hudEnabled = !!message.enabled;
        applySettingsToAllVideos();
        sendResponse({ success: true });
        break;
    }
    return true;
  });
})();
