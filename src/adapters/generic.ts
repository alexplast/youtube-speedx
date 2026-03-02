import { CONFIG, saveConfig } from '../config/storage';
import { normalizeSpeed } from '../utils/number';
import type { Adapter } from './types';

export const GenericAdapter: Adapter = {
  name: 'Generic',
  isMatch: () => true,
  getVideoElement: () => document.querySelector('video'),
  getPlayer: () => null,
  isControlsHidden: () => false,
  applySpeed: (videoElement, newSpeed) => {
    if (!videoElement) return;
    const normalizedSpeed = normalizeSpeed(newSpeed);
    if (normalizedSpeed === null) return;
    CONFIG.speed = normalizedSpeed;
    videoElement.playbackRate = CONFIG.speed;
    saveConfig();
  },
  applyResolution: () => {},
  changeResolution: () => {},
  updateSpeedIndicator: () => {},
  showBezelNotification: () => {}
};

