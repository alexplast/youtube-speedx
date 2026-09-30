import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../src/config/defaultConfig';
import { CONFIG, sanitizeConfig } from '../../src/config/storage';

describe('config sanitize', () => {
  it('restores defaults for non-finite values', () => {
    (CONFIG as any).speed = Number.NaN;
    (CONFIG as any).ADJUSTMENT_STEP = Infinity;
    (CONFIG as any).BOOST_SPEED = 'nope';
    (CONFIG as any).progressBarOpacity = Number.NaN;
    (CONFIG as any).max60FpsQuality = 'invalid';

    sanitizeConfig();

    expect(CONFIG.speed).toBe(DEFAULT_CONFIG.speed);
    expect(CONFIG.ADJUSTMENT_STEP).toBe(DEFAULT_CONFIG.ADJUSTMENT_STEP);
    expect(CONFIG.BOOST_SPEED).toBe(DEFAULT_CONFIG.BOOST_SPEED);
    expect(CONFIG.progressBarOpacity).toBe(DEFAULT_CONFIG.progressBarOpacity);
    expect(CONFIG.max60FpsQuality).toBe(DEFAULT_CONFIG.max60FpsQuality);
  });

  it('clamps out-of-range values', () => {
    (CONFIG as any).speed = 0;
    (CONFIG as any).ADJUSTMENT_STEP = 0;
    (CONFIG as any).BOOST_SPEED = 99;
    (CONFIG as any).progressBarOpacity = -5;
    (CONFIG as any).max60FpsQuality = '720';

    sanitizeConfig();

    expect(CONFIG.speed).toBe(0.1);
    expect(CONFIG.ADJUSTMENT_STEP).toBe(0.05);
    expect(CONFIG.BOOST_SPEED).toBe(16);
    expect(CONFIG.progressBarOpacity).toBe(0.1);
    expect(CONFIG.max60FpsQuality).toBe('720');
  });

  it('rejects placeholder and empty hotkeys, restoring default', () => {
    (CONFIG as any).SETTINGS_KEY = 'Press a key...';
    (CONFIG as any).RES_DOWN_KEY = '   ';
    (CONFIG as any).RES_UP_KEY = '';
    (CONFIG as any).BOOST_KEY = 'Press a key...';

    sanitizeConfig();

    expect(CONFIG.SETTINGS_KEY).toBe(DEFAULT_CONFIG.SETTINGS_KEY);
    expect(CONFIG.RES_DOWN_KEY).toBe(DEFAULT_CONFIG.RES_DOWN_KEY);
    expect(CONFIG.RES_UP_KEY).toBe(DEFAULT_CONFIG.RES_UP_KEY);
    expect(CONFIG.BOOST_KEY).toBe(DEFAULT_CONFIG.BOOST_KEY);
  });
});
