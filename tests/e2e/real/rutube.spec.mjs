import { test, expect } from '@playwright/test';
import { blurActiveElement, createSpeedXDiagnostics, dismissRutubeConsentIfPresent, installUserscript } from './helpers.mjs';

const DEFAULT_RUTUBE_URL = 'https://rutube.ru/video/f054bf1cb39476ab00091d293bafcbe4/';

test.describe('Rutube (real site)', () => {
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

    const url = process.env.YTSPEEDX_E2E_RUTUBE_URL || DEFAULT_RUTUBE_URL;
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    await dismissRutubeConsentIfPresent(page);

    await page.waitForSelector('#yt-speedx-modal', { state: 'attached', timeout: 30_000 });
    await expect(page.locator('#yt-speedx-modal h2')).toContainText('Rutube SpeedX Settings');
    await page.waitForSelector('video', { state: 'attached', timeout: 30_000 });

    await page.waitForFunction(() => {
      const video = document.querySelector('video');
      return video && Math.abs(video.playbackRate - 2.3) < 0.05;
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

    await page.waitForFunction(() => {
      const text = document.getElementById('yt-speedx-bezel-text')?.textContent?.trim() || '';
      return text.includes('x');
    });

    await page.keyboard.press('Shift+Comma');
    await page.waitForFunction(prev => {
      const video = document.querySelector('video');
      if (!video) return false;
      return Math.abs(video.playbackRate - prev) < 0.05;
    }, before, { timeout: 30_000 });

    await page.keyboard.press('Period');
    await page.waitForFunction(() => {
      const text = document.getElementById('yt-speedx-bezel-text')?.textContent?.trim() || '';
      return (
        !!text &&
        (/\\d{3,4}\\s*p/i.test(text) ||
          /\\b(4k|2k|full hd|fhd|hd|sd)\\b/i.test(text) ||
          /quality/i.test(text) ||
          /качество/i.test(text))
      );
    });

    const speedxErrors = diag.getSpeedXErrors();
    if (speedxErrors.console.length || speedxErrors.page.length) {
      await diag.attach(testInfo);
    }
    expect(speedxErrors.console, 'SpeedX console errors').toEqual([]);
    expect(speedxErrors.page, 'SpeedX page errors').toEqual([]);
  });
});
