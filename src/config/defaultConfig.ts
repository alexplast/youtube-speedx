import type { Config } from './types';

export const DEFAULT_CONFIG: Config = {
  speed: 2.3,
  resolution: 'hd1080',
  useH264: true,
  max60FpsQuality: 'unlimited', // 'unlimited', '1080', '720', '480', 'disabled'
  ADJUSTMENT_STEP: 0.1,
  RES_DOWN_KEY: 'Comma',
  RES_UP_KEY: 'Period',
  SETTINGS_KEY: 'KeyS',
  enableSpeedBoost: true,
  BOOST_KEY: 'KeyB',
  BOOST_SPEED: 3.5,
  enableFullscreenProgress: true,
  progressBarOpacity: 0.5
};

