// SpeedUp Video Pro - Content Script Controller
(() => {
  // Se siamo su YouTube, interrompe immediatamente qualsiasi esecuzione
  if (window.location.hostname.includes("youtube.com")) {
    // Non fa assolutamente nulla per lasciar gestire il player a YouTube
    return;
  }

  let currentSpeed = 1.0;
  let hudEnabled = true;
  let preservesPitch = true;
  let loopVideo = false;

  // Initialize stored settings
  chrome.storage.local.get(['defaultSpeed', 'hudEnabled', 'preservesPitch', 'loopVideo'], (data) => {
    if (data.defaultSpeed) currentSpeed = parseFloat(data.defaultSpeed);
    if (typeof data.hudEnabled !== 'undefined') hudEnabled = data.hudEnabled;
    if (typeof data.preservesPitch !== 'undefined') preservesPitch = data.preservesPitch;
    if (typeof data.loopVideo !== 'undefined') loopVideo = data.loopVideo;

    applySettingsToAllVideos();
  });

  // Find all HTML5 video elements in document and shadow roots
  function getAllVideos(root = document) {
    const videos = Array.from(root.querySelectorAll('video'));
    
    // Inspect Shadow DOM elements
    const allElements = root.querySelectorAll('*');
    for (const el of allElements) {
      if (el.shadowRoot) {
        videos.push(...getAllVideos(el.shadowRoot));
      }
    }
    return videos;
  }

  // Apply speed and preferences to all videos
  function applySettingsToAllVideos() {
    const videos = getAllVideos();
    videos.forEach(video => {
      applyToVideo(video);
    });
  }

  function applyToVideo(video) {
    if (!video) return;

    // Apply playback speed
    if (Math.abs(video.playbackRate - currentSpeed) > 0.01) {
      video.playbackRate = currentSpeed;
    }

    // Apply pitch preservation
    video.preservesPitch = preservesPitch;
    video.webkitPreservesPitch = preservesPitch;
    video.mozPreservesPitch = preservesPitch;

    // Apply loop option
    if (loopVideo) {
      video.loop = true;
    }

    // Attach speed listener tag & ratechange handler
    if (!video.dataset.hasSpeedListener) {
      video.dataset.hasSpeedListener = "true";
      video.dataset.suvListenerAttached = "true";

      video.addEventListener('ratechange', () => {
        if (Math.abs(video.playbackRate - currentSpeed) > 0.01) {
          video.playbackRate = currentSpeed;
        }
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
        <span class="suv-hud-speed">${currentSpeed.toFixed(2)}x</span>
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
      if (speedSpan) speedSpan.textContent = `${currentSpeed.toFixed(2)}x`;
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
        if (speedSpan) speedSpan.textContent = `${currentSpeed.toFixed(2)}x`;
      }
    }
  }

  function setSpeed(val) {
    const num = Math.min(Math.max(parseFloat(val) || 1.0, 0.1), 16.0);
    currentSpeed = parseFloat(num.toFixed(2));

    applySettingsToAllVideos();
    showToast(`⚡ Velocità: ${currentSpeed.toFixed(2)}x`);

    chrome.runtime.sendMessage({ action: 'UPDATE_BADGE', speed: currentSpeed }).catch(() => {});
  }

  function changeSpeed(delta) {
    setSpeed(currentSpeed + delta);
  }

  // Toast Notification Overlay
  function showToast(message) {
    let existingToast = document.querySelector('.suv-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'suv-toast';
    toast.innerHTML = `
      <svg class="suv-toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <polygon points="13 19 22 12 13 5 13 19"></polygon>
        <polygon points="2 19 11 12 2 5 2 19"></polygon>
      </svg>
      <span>${message}</span>
    `;

    document.body.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 1200);
  }

  // Monitora l'inserimento di elementi video per gli altri siti
  const observer = new MutationObserver(() => {
    requestAnimationFrame(() => {
      const videos = getAllVideos();
      videos.forEach(video => {
        if (!video.dataset.hasSpeedListener) {
          video.dataset.hasSpeedListener = "true";
        }
        applyToVideo(video);
      });
    });
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  // Global Keyboard Shortcuts Listener
  window.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    if (
      activeEl &&
      (activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.tagName === 'SELECT' ||
        activeEl.isContentEditable)
    ) {
      return;
    }

    const key = e.key.toLowerCase();
    const step = e.shiftKey ? 0.25 : 0.10;

    if (key === 's') {
      changeSpeed(-step);
    } else if (key === 'd') {
      changeSpeed(step);
    } else if (key === 'r') {
      setSpeed(1.0);
    } else if (key === 'z') {
      seekVideos(-10);
      showToast('⏪ Indietro 10s');
    } else if (key === 'x') {
      seekVideos(10);
      showToast('Avanti 10s');
    } else if (key === 'v') {
      hudEnabled = !hudEnabled;
      chrome.storage.local.set({ hudEnabled });
      applySettingsToAllVideos();
      showToast(hudEnabled ? '👁️ Controller HUD Attivo' : '🙈 Controller HUD Nascosto');
    }
  });

  function seekVideos(seconds) {
    const videos = getAllVideos();
    videos.forEach(v => {
      v.currentTime = Math.max(0, v.currentTime + seconds);
    });
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

    switch (message.action) {
      case 'GET_VIDEO_STATUS':
        const firstVideo = videos[0];
        sendResponse({
          hasVideo: videos.length > 0,
          count: videos.length,
          currentSpeed: currentSpeed,
          isPlaying: firstVideo ? !firstVideo.paused : true,
          isMuted: firstVideo ? firstVideo.muted : false
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
        seekVideos(message.seconds || 0);
        sendResponse({ success: true });
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
