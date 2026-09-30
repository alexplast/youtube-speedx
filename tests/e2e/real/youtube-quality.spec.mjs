import { test, expect } from '@playwright/test';
import { blurActiveElement, createSpeedXDiagnostics, dismissYouTubeConsentIfPresent, installUserscript } from './helpers.mjs';

const DEFAULT_YOUTUBE_URL = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';

test.describe('YouTube Quality switching', () => {
  test.skip(!process.env.RUN_REAL_E2E, 'Set RUN_REAL_E2E=1 to enable real-site tests.');

  test('switches quality with hotkeys and in fullscreen on YouTube', async ({ page }, testInfo) => {
    const diag = createSpeedXDiagnostics(page);

    await installUserscript(page, {
      configOverrides: {
        resolution: 'tiny',
        useH264: false,
        enableSpeedBoost: false,
        enableFullscreenProgress: false
      }
    });

    const url = process.env.YTSPEEDX_E2E_YOUTUBE_URL || DEFAULT_YOUTUBE_URL;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await dismissYouTubeConsentIfPresent(page);

    await page.waitForSelector('#yt-speedx-modal', { state: 'attached', timeout: 30_000 });
    await page.waitForSelector('video', { state: 'attached', timeout: 30_000 });

    await page.waitForFunction(() => {
      const player = document.getElementById('movie_player');
      return (
        !!player &&
        typeof player.getAvailableQualityData === 'function' &&
        typeof player.getPlaybackQuality === 'function' &&
        player.isPatchedForFPS === true
      );
    }, { timeout: 60_000 });

    // Inspect available qualities on the real video
    const qualityData = await page.evaluate(() => {
      const player = document.getElementById('movie_player');
      return player?.getAvailableQualityData?.() || [];
    });
    console.log('YouTube available qualities count:', qualityData.length);
    console.log('YouTube qualities:', qualityData.map(q => q.qualityLabel || q.quality));

    await blurActiveElement(page);
    await page.mouse.move(200, 200);

    // Test hotkey Period (up)
    await page.keyboard.press('Period');

    await page.waitForFunction(() => {
      const text = document.getElementById('yt-speedx-bezel-text')?.textContent?.trim() || '';
      return (
        !!text &&
        (/\d{3,4}\s*p/i.test(text) ||
          /\b(4k|2k|full hd|fhd|hd|sd)\b/i.test(text) ||
          /tiny|small|medium|large/i.test(text))
      );
    }, { timeout: 15_000 });

    const bezelText = await page.evaluate(() => document.getElementById('yt-speedx-bezel-text')?.textContent?.trim() || '');
    console.log('YouTube Bezel text after Period:', bezelText);

    // Wait for debounce (350ms)
    await page.waitForTimeout(600);

    const configAfterPeriod = await page.evaluate(() => {
      try {
        return JSON.parse(localStorage.getItem('ytSpeedXConfig') || '{}').resolution;
      } catch {
        return null;
      }
    });
    console.log('CONFIG.resolution after Period:', configAfterPeriod);
    expect(configAfterPeriod).toBeDefined();

    // Now test in Fullscreen on YouTube
    const fsEntered = await page.evaluate(async () => {
      const player = document.getElementById('movie_player');
      try {
        await player?.requestFullscreen?.();
        return true;
      } catch {
        return false;
      }
    });

    console.log('YouTube fullscreen requested:', fsEntered);
    const isFs = await page.evaluate(() => !!document.fullscreenElement);
    console.log('document.fullscreenElement is:', isFs);

    // Press Comma (down)
    await page.keyboard.press('Comma');
    await page.waitForTimeout(600);

    const isFsAfter = await page.evaluate(() => !!document.fullscreenElement);
    console.log('document.fullscreenElement after Comma:', isFsAfter);
    if (isFs) {
      expect(isFsAfter, 'YouTube must stay in fullscreen').toBe(true);
    }

    const configAfterComma = await page.evaluate(() => {
      try {
        return JSON.parse(localStorage.getItem('ytSpeedXConfig') || '{}').resolution;
      } catch {
        return null;
      }
    });
    console.log('CONFIG.resolution after Comma in fullscreen:', configAfterComma);
    expect(configAfterComma).toBeDefined();

    const speedxErrors = diag.getSpeedXErrors();
    if (speedxErrors.console.length || speedxErrors.page.length) {
      await diag.attach(testInfo);
    }
    expect(speedxErrors.console, 'SpeedX console errors').toEqual([]);
    expect(speedxErrors.page, 'SpeedX page errors').toEqual([]);
  });
});
