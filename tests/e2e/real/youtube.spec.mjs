import { test, expect } from '@playwright/test';
import { blurActiveElement, createSpeedXDiagnostics, dismissYouTubeConsentIfPresent, installUserscript } from './helpers.mjs';

const DEFAULT_YOUTUBE_URL = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';

test.describe('YouTube (real site)', () => {
  test.skip(!process.env.RUN_REAL_E2E, 'Set RUN_REAL_E2E=1 to enable real-site tests.');

  test('initializes on a real video and handles hotkeys', async ({ page }, testInfo) => {
    test.setTimeout(120_000);

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
    await expect(page.locator('#yt-speedx-modal h2')).toContainText('YouTube SpeedX Settings');
    await page.waitForSelector('video', { state: 'attached', timeout: 30_000 });

    await page.waitForFunction(() => {
      const video = document.querySelector('video');
      return video && Math.abs(video.playbackRate - 2.3) < 0.05;
    }, { timeout: 60_000 });

    await page.waitForFunction(() => {
      const player = document.getElementById('movie_player');
      return !!player && player.isPatchedForFPS === true;
    }, { timeout: 60_000 });

    await blurActiveElement(page);
    await page.mouse.move(200, 200);

    await page.keyboard.press('Control+Alt+KeyS');
    await expect(page.locator('#yt-speedx-modal')).toBeVisible();
    await page.click('#yt-speedx-close-btn');

    const before = await page.evaluate(() => document.querySelector('video')?.playbackRate || 0);

    await page.keyboard.press('Shift+Period');
    await page.waitForFunction(prev => {
      const video = document.querySelector('video');
      if (!video) return false;
      return Math.abs(video.playbackRate - (prev + 0.1)) < 0.05;
    }, before, { timeout: 30_000 });

    await page.keyboard.press('Shift+Comma');
    await page.waitForFunction(prev => {
      const video = document.querySelector('video');
      if (!video) return false;
      return Math.abs(video.playbackRate - prev) < 0.05;
    }, before, { timeout: 30_000 });

    await page.mouse.move(200, 200);
    await page.locator('.ytp-settings-button').first().click({ timeout: 10_000 });
    await page.waitForSelector('#yt-speedx-menu-item', { state: 'attached', timeout: 10_000 });
    await page.waitForSelector('#yt-speedx-indicator', { state: 'attached', timeout: 10_000 });

    const speedxErrors = diag.getSpeedXErrors();
    if (speedxErrors.console.length || speedxErrors.page.length) {
      await diag.attach(testInfo);
    }
    expect(speedxErrors.console, 'SpeedX console errors').toEqual([]);
    expect(speedxErrors.page, 'SpeedX page errors').toEqual([]);
  });
});
