import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

test('userscript initializes on a generic page', async ({ page }) => {
  const scriptPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist/youtubespeedx.userscript.js');
  const userscript = fs.readFileSync(scriptPath, 'utf8');

  await page.addInitScript(() => {
    window.GM_addStyle = css => {
      const style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
    };
  });

  await page.addInitScript({ content: userscript });

  const html = '<!doctype html><html><body><video></video></body></html>';
  await page.goto(`data:text/html,${encodeURIComponent(html)}`);

  await page.waitForSelector('#yt-speedx-modal', { state: 'attached' });
  const playbackRate = await page.evaluate(() => document.querySelector('video')?.playbackRate);
  expect(playbackRate).not.toBe(1);
});
