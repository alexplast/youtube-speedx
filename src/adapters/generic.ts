import { CONFIG, saveConfig } from '../config/storage';
import { showCustomBezel } from '../core/bezel';
import { formatSpeed, normalizeSpeed } from '../utils/number';
import type { Adapter } from './types';

export const GenericAdapter: Adapter = {
  name: 'Generic',
  isMatch: () => true,
  getVideoElement: () => document.querySelector('video'),
  getPlayer: () => null,
  isControlsHidden: () => {
    const video = document.querySelector('video');
    return video ? !video.controls || !!document.fullscreenElement : false;
  },
  applySpeed: function (videoElement, newSpeed) {
    if (!videoElement) return;
    const normalizedSpeed = normalizeSpeed(newSpeed);
    if (normalizedSpeed === null) return;
    CONFIG.speed = normalizedSpeed;
    videoElement.playbackRate = CONFIG.speed;
    saveConfig();
    this.showBezelNotification(`${formatSpeed(CONFIG.speed)}x`);
  },
  applyResolution: () => {},
  changeResolution: () => {},
  updateSpeedIndicator: () => {},
  showBezelNotification: function (text) {
    showCustomBezel(this, text);
  }
};

