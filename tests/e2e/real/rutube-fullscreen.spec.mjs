import { test, expect } from '@playwright/test';
import { blurActiveElement, createSpeedXDiagnostics, dismissRutubeConsentIfPresent, installUserscript } from './helpers.mjs';

const DEFAULT_RUTUBE_URL = 'https://rutube.ru/video/f054bf1cb39476ab00091d293bafcbe4/';

test.describe('Rutube Fullscreen & Quality', () => {
  test.skip(!process.env.RUN_REAL_E2E, 'Set RUN_REAL_E2E=1 to enable real-site tests.');

  test('changes quality in fullscreen and stays in fullscreen', async ({ page }, testInfo) => {
    const diag = createSpeedXDiagnostics(page);

    await installUserscript(page, {
      configOverrides: {
        resolution: 'tiny',
        useH264: false,
        enableSpeedBoost: false,
        enableFullscreenProgress: true
      }
    });

    const url = process.env.YTSPEEDX_E2E_RUTUBE_URL || DEFAULT_RUTUBE_URL;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await dismissRutubeConsentIfPresent(page);

    await page.waitForSelector('#yt-speedx-modal', { state: 'attached', timeout: 30_000 });
    await page.waitForSelector('video', { state: 'attached', timeout: 30_000 });

    await page.waitForFunction(() => {
      const video = document.querySelector('video');
      return video && Math.abs(video.playbackRate - 2.3) < 0.05;
    }, { timeout: 60_000 });

    // Try entering fullscreen
    const fsResult = await page.evaluate(async () => {
      const video = document.querySelector('video');
      const player =
        document.querySelector('.rutube-player') ||
        document.querySelector('[data-testid="video-player"]') ||
        video?.parentElement?.parentElement ||
        video?.parentElement ||
        document.body;

      try {
        if (player.requestFullscreen) {
          await player.requestFullscreen();
          return { success: true, target: player.tagName };
        }
      } catch (err) {
        return { success: false, error: String(err) };
      }
      return { success: false, error: 'no requestFullscreen' };
    });

    console.log('Fullscreen attempt result:', fsResult);

    // Also try clicking fullscreen button if not in fullscreen yet
    let isFullscreen = await page.evaluate(() => !!document.fullscreenElement);
    if (!isFullscreen) {
      const fsButton = page.locator('button[aria-label*="экран" i], button[data-testid*="fullscreen" i], button[class*="fullscreen" i]').first();
      if (await fsButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await fsButton.click();
        await page.waitForTimeout(500);
        isFullscreen = await page.evaluate(() => !!document.fullscreenElement);
        console.log('Fullscreen after button click:', isFullscreen);
      }
    }

    await blurActiveElement(page);
    await page.mouse.move(200, 200);

    // Press Period to change resolution up
    await page.keyboard.press('Period');

    // Wait for bezel notification to show quality
    await page.waitForFunction(() => {
      const text = document.getElementById('yt-speedx-bezel-text')?.textContent?.trim() || '';
      return (
        !!text &&
        (/\d{3,4}\s*p/i.test(text) ||
          /\b(4k|2k|full hd|fhd|hd|sd)\b/i.test(text) ||
          /quality/i.test(text) ||
          /качество/i.test(text))
      );
    }, { timeout: 15_000 });

    const bezelText = await page.evaluate(() => document.getElementById('yt-speedx-bezel-text')?.textContent?.trim() || '');
    console.log('Bezel notification text:', bezelText);

    // Wait for debounced execution (600ms debounce + menu interaction + panel close)
    await page.waitForTimeout(2500);

    // Verify if fullscreen state is preserved!
    const isFsAfter = await page.evaluate(() => !!document.fullscreenElement);
    console.log('Fullscreen status after quality change:', isFsAfter, '(was:', isFullscreen, ')');

    if (isFullscreen) {
      expect(isFsAfter, 'Rutube must not exit fullscreen on quality hotkey').toBe(true);
    }

    // Verify stored config resolution
    const storedConfig = await page.evaluate(() => {
      try {
        return JSON.parse(localStorage.getItem('ytSpeedXConfig') || '{}');
      } catch {
        return {};
      }
    });
    console.log('Stored config resolution after hotkey:', storedConfig.resolution);
    expect(storedConfig.resolution).toBeDefined();

    // Now test Comma (res down) as well!
    await page.keyboard.press('Comma');
    await page.waitForTimeout(2500);

    const isFsAfterComma = await page.evaluate(() => !!document.fullscreenElement);
    console.log('Fullscreen status after Comma:', isFsAfterComma);
    if (isFullscreen) {
      expect(isFsAfterComma, 'Rutube must not exit fullscreen on Comma hotkey').toBe(true);
    }

    const speedxErrors = diag.getSpeedXErrors();
    if (speedxErrors.console.length || speedxErrors.page.length) {
      await diag.attach(testInfo);
    }
    expect(speedxErrors.console, 'SpeedX console errors').toEqual([]);
    expect(speedxErrors.page, 'SpeedX page errors').toEqual([]);
  });
});
