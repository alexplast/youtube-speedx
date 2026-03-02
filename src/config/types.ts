export type Max60FpsQuality = 'unlimited' | '1080' | '720' | '480' | 'disabled';

export interface Config {
  speed: number;
  resolution: string;
  useH264: boolean;
  max60FpsQuality: Max60FpsQuality;
  ADJUSTMENT_STEP: number;
  RES_DOWN_KEY: string;
  RES_UP_KEY: string;
  SETTINGS_KEY: string;
  enableSpeedBoost: boolean;
  BOOST_KEY: string;
  BOOST_SPEED: number;
  enableFullscreenProgress: boolean;
  progressBarOpacity: number;
}

