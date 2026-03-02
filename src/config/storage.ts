import { DEFAULT_CONFIG } from './defaultConfig';
import type { Config, Max60FpsQuality } from './types';
import { normalizeOpacity, normalizeSpeed, normalizeStep } from '../utils/number';

const CONFIG_STORAGE_KEY = 'ytSpeedXConfig';

export const CONFIG: Config = { ...DEFAULT_CONFIG };

export const ALLOWED_MAX60_FPS_QUALITY = new Set<Max60FpsQuality>(['unlimited', '1080', '720', '480', 'disabled']);

export const sanitizeConfig = () => {
  CONFIG.speed = normalizeSpeed(CONFIG.speed, DEFAULT_CONFIG.speed) ?? DEFAULT_CONFIG.speed;
  CONFIG.ADJUSTMENT_STEP = normalizeStep(CONFIG.ADJUSTMENT_STEP, DEFAULT_CONFIG.ADJUSTMENT_STEP) ?? DEFAULT_CONFIG.ADJUSTMENT_STEP;
  CONFIG.BOOST_SPEED = normalizeSpeed(CONFIG.BOOST_SPEED, DEFAULT_CONFIG.BOOST_SPEED) ?? DEFAULT_CONFIG.BOOST_SPEED;
  CONFIG.progressBarOpacity = normalizeOpacity(CONFIG.progressBarOpacity, DEFAULT_CONFIG.progressBarOpacity) ?? DEFAULT_CONFIG.progressBarOpacity;

  if (!ALLOWED_MAX60_FPS_QUALITY.has(CONFIG.max60FpsQuality)) CONFIG.max60FpsQuality = DEFAULT_CONFIG.max60FpsQuality;

  if (typeof CONFIG.useH264 !== 'boolean') CONFIG.useH264 = DEFAULT_CONFIG.useH264;
  if (typeof CONFIG.enableSpeedBoost !== 'boolean') CONFIG.enableSpeedBoost = DEFAULT_CONFIG.enableSpeedBoost;
  if (typeof CONFIG.enableFullscreenProgress !== 'boolean') CONFIG.enableFullscreenProgress = DEFAULT_CONFIG.enableFullscreenProgress;

  if (typeof CONFIG.resolution !== 'string') CONFIG.resolution = DEFAULT_CONFIG.resolution;
  if (typeof CONFIG.RES_DOWN_KEY !== 'string' || !CONFIG.RES_DOWN_KEY) CONFIG.RES_DOWN_KEY = DEFAULT_CONFIG.RES_DOWN_KEY;
  if (typeof CONFIG.RES_UP_KEY !== 'string' || !CONFIG.RES_UP_KEY) CONFIG.RES_UP_KEY = DEFAULT_CONFIG.RES_UP_KEY;
  if (typeof CONFIG.SETTINGS_KEY !== 'string' || !CONFIG.SETTINGS_KEY) CONFIG.SETTINGS_KEY = DEFAULT_CONFIG.SETTINGS_KEY;
  if (typeof CONFIG.BOOST_KEY !== 'string' || !CONFIG.BOOST_KEY) CONFIG.BOOST_KEY = DEFAULT_CONFIG.BOOST_KEY;
};

export const loadConfig = () => {
  try {
    const storedConfigJSON = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!storedConfigJSON) return;
    const storedConfig = JSON.parse(storedConfigJSON) as Partial<Config> | null;
    if (!storedConfig) return;

    if (storedConfig.speed !== undefined) CONFIG.speed = storedConfig.speed;
    if (storedConfig.resolution !== undefined) CONFIG.resolution = storedConfig.resolution;
    if (storedConfig.useH264 !== undefined) CONFIG.useH264 = storedConfig.useH264;
    if (storedConfig.max60FpsQuality !== undefined) CONFIG.max60FpsQuality = storedConfig.max60FpsQuality;
    if (storedConfig.ADJUSTMENT_STEP !== undefined) CONFIG.ADJUSTMENT_STEP = storedConfig.ADJUSTMENT_STEP;
    if (storedConfig.RES_DOWN_KEY) CONFIG.RES_DOWN_KEY = storedConfig.RES_DOWN_KEY;
    if (storedConfig.RES_UP_KEY) CONFIG.RES_UP_KEY = storedConfig.RES_UP_KEY;
    if (storedConfig.SETTINGS_KEY) CONFIG.SETTINGS_KEY = storedConfig.SETTINGS_KEY;
    if (storedConfig.enableSpeedBoost !== undefined) CONFIG.enableSpeedBoost = storedConfig.enableSpeedBoost;
    if (storedConfig.BOOST_KEY) CONFIG.BOOST_KEY = storedConfig.BOOST_KEY;
    if (storedConfig.BOOST_SPEED !== undefined) CONFIG.BOOST_SPEED = storedConfig.BOOST_SPEED;
    if (storedConfig.enableFullscreenProgress !== undefined) CONFIG.enableFullscreenProgress = storedConfig.enableFullscreenProgress;
    if (storedConfig.progressBarOpacity !== undefined) CONFIG.progressBarOpacity = storedConfig.progressBarOpacity;

    sanitizeConfig();
  } catch {
    // Fail silently
  }
};

export const saveConfig = () => {
  try {
    sanitizeConfig();
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({ ...CONFIG }));
  } catch {
    // Fail silently
  }
};

