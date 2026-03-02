import { CONFIG, saveConfig } from '../config/storage';
import { formatSpeed, normalizeSpeed } from '../utils/number';
import { GenericAdapter } from './generic';
import type { Adapter, ResolutionDirection } from './types';

type QualityInfo = {
  quality: string;
  qualityLabel?: string;
};

const qualityChangeState: {
  debounceTimer: ReturnType<typeof setTimeout> | null;
  targetQualityIndex: number;
  availableQualityData: QualityInfo[];
} = {
  debounceTimer: null,
  targetQualityIndex: -1,
  availableQualityData: []
};

const getFormattedTime = (seconds: number) => {
  const safeSeconds = Math.max(seconds, 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = Math.floor(safeSeconds % 60);
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${hours > 0 ? `${hours}:` : ''}${pad(minutes)}:${pad(secs)}`;
};

export const YouTubeAdapter: Adapter = {
  ...GenericAdapter,
  name: 'YouTube',
  isMatch: () => window.location.hostname.includes('youtube.com'),
  getPlayer: () => document.getElementById('movie_player'),
  isControlsHidden: function () {
    const player = this.getPlayer();
    return player ? player.classList.contains('ytp-autohide') : false;
  },
  showBezelNotification: function (text) {
    const wrapper = document.getElementById('yt-speedx-bezel-wrapper');
    const textElement = document.getElementById('yt-speedx-bezel-text');
    if (!wrapper || !textElement) return;

    textElement.textContent = text;

    wrapper.classList.remove('yt-speedx-bezel-show');
    void wrapper.offsetHeight;
    wrapper.classList.add('yt-speedx-bezel-show');
  },
  updateSpeedIndicator: function () {
    const player = this.getPlayer();
    const videoElement = this.getVideoElement();
    const timeContainer = document.querySelector('.ytp-time-display .ytp-time-contents');

    if (!player || !videoElement || !timeContainer || typeof player.getDuration !== 'function') return;

    let indicator = document.getElementById('yt-speedx-indicator');
    if (!indicator) {
      indicator = document.createElement('span');
      indicator.id = 'yt-speedx-indicator';
      indicator.className = 'ytp-time-separator';
      timeContainer.appendChild(indicator);
    }

    const currentSpeed = videoElement.playbackRate;
    if (currentSpeed !== 1) {
      const adjustedDuration = player.getDuration() / currentSpeed;
      indicator.innerText = ` / ${formatSpeed(currentSpeed)}x`;
      indicator.title = `Adjusted duration: ${getFormattedTime(adjustedDuration)}`;
      indicator.style.display = 'inline';
    } else {
      indicator.style.display = 'none';
    }
  },
  applySpeed: function (videoElement, newSpeed, currentSpeed = videoElement?.playbackRate) {
    const player = this.getPlayer();
    if (!player || !videoElement) return;

    const normalizedSpeed = normalizeSpeed(newSpeed);
    if (normalizedSpeed === null) return;
    CONFIG.speed = normalizedSpeed;
    saveConfig();
    videoElement.playbackRate = CONFIG.speed;

    if (CONFIG.speed > 2) {
      this.showBezelNotification(`${formatSpeed(CONFIG.speed)}x`);
    } else if ((currentSpeed ?? 1) > 2 && CONFIG.speed === 2) {
      this.showBezelNotification('2x');
    } else if (typeof player.setPlaybackRate === 'function') {
      player.setPlaybackRate(CONFIG.speed);
    }
  },
  applyResolution: function (playerArg) {
    const player = playerArg ?? this.getPlayer();
    if (!player || typeof player.getAvailableQualityLevels !== 'function') return;

    const availableLevels = player.getAvailableQualityLevels() as string[];
    const desiredLevel = CONFIG.resolution;

    if (availableLevels.includes(desiredLevel)) {
      player.setPlaybackQualityRange(desiredLevel);
    } else if (availableLevels.length > 0) {
      player.setPlaybackQualityRange(availableLevels[0]);
    }
  },
  changeResolution: function (direction: ResolutionDirection) {
    const player = this.getPlayer();
    if (typeof player?.getAvailableQualityData !== 'function') return;

    if (!qualityChangeState.debounceTimer) {
      qualityChangeState.availableQualityData = (player.getAvailableQualityData() as QualityInfo[]) ?? [];
      if (qualityChangeState.availableQualityData.length === 0) return;

      const currentQuality = player.getPlaybackQuality();
      qualityChangeState.targetQualityIndex = qualityChangeState.availableQualityData.findIndex(q => q.quality === currentQuality);
      if (qualityChangeState.targetQualityIndex === -1) qualityChangeState.targetQualityIndex = 0;
    }

    let newIndex = qualityChangeState.targetQualityIndex;
    if (direction === 'up' && newIndex > 0) newIndex--;
    else if (direction === 'down' && newIndex < qualityChangeState.availableQualityData.length - 1) newIndex++;

    qualityChangeState.targetQualityIndex = newIndex;

    const newQualityInfo = qualityChangeState.availableQualityData[qualityChangeState.targetQualityIndex];
    if (newQualityInfo?.qualityLabel) {
      this.showBezelNotification(newQualityInfo.qualityLabel);
    }

    if (qualityChangeState.debounceTimer) clearTimeout(qualityChangeState.debounceTimer);
    qualityChangeState.debounceTimer = setTimeout(() => {
      const finalQualityInfo = qualityChangeState.availableQualityData[qualityChangeState.targetQualityIndex];
      if (finalQualityInfo) {
        player.setPlaybackQualityRange(finalQualityInfo.quality);
        CONFIG.resolution = finalQualityInfo.quality;
        saveConfig();
      }

      qualityChangeState.debounceTimer = null;
      qualityChangeState.targetQualityIndex = -1;
      qualityChangeState.availableQualityData = [];
    }, 350);
  }
};
