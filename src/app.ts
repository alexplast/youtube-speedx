import { getActiveAdapter } from './adapters';
import { CONFIG, saveConfig } from './config/storage';
import { ensureCustomBezel } from './core/bezel';
import { patchPlayerForFPS } from './core/fpsPatch';
import { ensureFullscreenProgressBar, updateProgressBarVisibility } from './core/progressBar';
import { initSettingsUI } from './core/settingsUi';
import { startYouTubeMenuObserver } from './core/youtubeMenuObserver';
import { formatSpeed, normalizeSpeed } from './utils/number';
import { sleep } from './utils/sleep';

let progressObserver: MutationObserver | null = null;

export const runApp = () => {
  const activeAdapter = getActiveAdapter();

  const updateProgressBarVisibilityBound = () => updateProgressBarVisibility(activeAdapter);

  const { openModal } = initSettingsUI(activeAdapter, updateProgressBarVisibilityBound);

  const initializePlayer = async (openModalCallback: () => void) => {
    if (activeAdapter.onInit) activeAdapter.onInit();

    if (activeAdapter.name !== 'YouTube') {
      const video = activeAdapter.getVideoElement();
      if (video) {
        activeAdapter.applySpeed(video, CONFIG.speed);
        if (activeAdapter.name === 'Rutube') {
          activeAdapter.updateSpeedIndicator();
          setTimeout(() => void activeAdapter.applyResolution(), 2000);
        }
      }
    }

    let player: any = null;
    let attempts = 0;
    while (attempts < 20) {
      player = activeAdapter.getPlayer();
      const isReady =
        activeAdapter.name === 'YouTube'
          ? player && typeof player.getPlaybackRate === 'function' && typeof player.getAvailableQualityData === 'function'
          : player || activeAdapter.getVideoElement();

      if (isReady) {
        const videoElement = activeAdapter.getVideoElement();
        if (videoElement) {
          ensureCustomBezel(activeAdapter);
          ensureFullscreenProgressBar();

          if (activeAdapter.name === 'YouTube') {
            patchPlayerForFPS(player);
            startYouTubeMenuObserver(player as HTMLElement, openModalCallback);
            activeAdapter.applyResolution(player);
          }

          activeAdapter.applySpeed(videoElement, CONFIG.speed, CONFIG.speed);

          if (!videoElement.dataset.rateListenerAttached) {
            videoElement.addEventListener('ratechange', () => activeAdapter.updateSpeedIndicator());
            videoElement.dataset.rateListenerAttached = 'true';
          }

          if (!videoElement.dataset.timeUpdateListener) {
            videoElement.addEventListener('timeupdate', () => {
              const bar = document.getElementById('yt-speedx-progress-bar') as HTMLElement | null;
              if (bar && videoElement.duration) {
                const progress = (videoElement.currentTime / videoElement.duration) * 100;
                bar.style.width = `${progress}%`;
              }
              if (activeAdapter.name === 'Rutube') updateProgressBarVisibilityBound();
            });
            videoElement.dataset.timeUpdateListener = 'true';
          }

          if (!document.body.dataset.ytSpeedxGlobalListeners) {
            document.addEventListener('fullscreenchange', updateProgressBarVisibilityBound);
            document.body.dataset.ytSpeedxGlobalListeners = 'true';
          }

          if (progressObserver) progressObserver.disconnect();
          if (activeAdapter.name === 'YouTube') {
            progressObserver = new MutationObserver(updateProgressBarVisibilityBound);
            progressObserver.observe(player as HTMLElement, { attributes: true, attributeFilter: ['class'] });
          }

          activeAdapter.updateSpeedIndicator();
          updateProgressBarVisibilityBound();
          return;
        }
      }

      await sleep(500);
      attempts++;
    }
  };

  const boundInitializePlayer = () => void initializePlayer(openModal);
  boundInitializePlayer();

  if (activeAdapter.name === 'YouTube') {
    window.addEventListener('yt-navigate-finish', boundInitializePlayer);
  }

  let originalSpeedBeforeBoost: number | null = null;

  const cancelBoost = () => {
    if (originalSpeedBeforeBoost === null) return;
    const videoElement = activeAdapter.getVideoElement();
    if (videoElement) {
      videoElement.playbackRate = originalSpeedBeforeBoost;
      activeAdapter.showBezelNotification(`${formatSpeed(originalSpeedBeforeBoost)}x`);
    }
    originalSpeedBeforeBoost = null;
  };

  window.addEventListener(
    'keydown',
    event => {
      if (
        (event.target as HTMLElement | null)?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement | null)?.tagName || '') ||
        (document.getElementById('yt-speedx-modal') as HTMLElement | null)?.style.display === 'flex'
      )
        return;

      if (CONFIG.enableSpeedBoost && event.code === CONFIG.BOOST_KEY && !event.repeat) {
        if (originalSpeedBeforeBoost === null) {
          const videoElement = activeAdapter.getVideoElement();
          if (!videoElement) return;
          const normalizedBoostSpeed = normalizeSpeed(CONFIG.BOOST_SPEED);
          if (normalizedBoostSpeed === null) return;
          originalSpeedBeforeBoost = videoElement.playbackRate;
          CONFIG.BOOST_SPEED = normalizedBoostSpeed;
          videoElement.playbackRate = CONFIG.BOOST_SPEED;
          activeAdapter.showBezelNotification(`${formatSpeed(CONFIG.BOOST_SPEED)}x Boost`);
          event.preventDefault();
          event.stopImmediatePropagation();
        }
        return;
      }

      if (originalSpeedBeforeBoost !== null) {
        const videoElement = activeAdapter.getVideoElement();
        if (!videoElement) return;

        let boostHandled = false;
        let newBoostSpeed = CONFIG.BOOST_SPEED;

        if (event.shiftKey && !event.ctrlKey && !event.altKey) {
          if (event.code === 'Period') {
            newBoostSpeed += CONFIG.ADJUSTMENT_STEP;
            boostHandled = true;
          } else if (event.code === 'Comma') {
            newBoostSpeed -= CONFIG.ADJUSTMENT_STEP;
            boostHandled = true;
          }
        } else if (!event.shiftKey && !event.ctrlKey && !event.altKey && event.code.startsWith('Digit')) {
          const digit = parseInt(event.code.replace('Digit', ''), 10);
          if (digit >= 1 && digit <= 9) {
            newBoostSpeed = digit;
            boostHandled = true;
          }
        }

        if (boostHandled) {
          const normalizedBoostSpeed = normalizeSpeed(newBoostSpeed);
          if (normalizedBoostSpeed === null) return;
          CONFIG.BOOST_SPEED = normalizedBoostSpeed;
          videoElement.playbackRate = CONFIG.BOOST_SPEED;
          activeAdapter.showBezelNotification(`${formatSpeed(CONFIG.BOOST_SPEED)}x Boost`);
          saveConfig();
          event.preventDefault();
          event.stopImmediatePropagation();
        }
        return;
      }

      if (event.ctrlKey && event.altKey && event.code === CONFIG.SETTINGS_KEY) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openModal();
        return;
      }

      const videoElement = activeAdapter.getVideoElement();
      if (!videoElement) return;

      if (event.shiftKey && !event.ctrlKey && !event.altKey) {
        const currentSpeed = videoElement.playbackRate;
        let speedHandled = false;
        if (event.code === 'Period') {
          activeAdapter.applySpeed(videoElement, currentSpeed + CONFIG.ADJUSTMENT_STEP, currentSpeed);
          speedHandled = true;
        } else if (event.code === 'Comma') {
          activeAdapter.applySpeed(videoElement, currentSpeed - CONFIG.ADJUSTMENT_STEP, currentSpeed);
          speedHandled = true;
        }

        if (speedHandled) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
        return;
      }

      if (!event.shiftKey && !event.ctrlKey && !event.altKey) {
        let handled = true;
        switch (event.code) {
          case CONFIG.RES_DOWN_KEY:
            void activeAdapter.changeResolution('down');
            break;
          case CONFIG.RES_UP_KEY:
            void activeAdapter.changeResolution('up');
            break;
          default:
            handled = false;
        }

        if (handled) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      }
    },
    true
  );

  window.addEventListener(
    'keyup',
    event => {
      if (CONFIG.enableSpeedBoost && event.code === CONFIG.BOOST_KEY) cancelBoost();
    },
    true
  );

  window.addEventListener('blur', cancelBoost, true);
};
