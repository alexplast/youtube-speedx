import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SPEEDX_SOURCE_URL = 'youtubespeedx.userscript.js';
const CONFIG_STORAGE_KEY = 'ytSpeedXConfig';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../');
const userscriptPath = path.join(repoRoot, 'dist', 'youtubespeedx.userscript.js');

export const readUserscript = () => fs.readFileSync(userscriptPath, 'utf8');

export const installUserscript = async (page, { configOverrides = {} } = {}) => {
  const baseConfig = {
    speed: 2.3,
    ADJUSTMENT_STEP: 0.1,
    resolution: 'tiny',
    useH264: false,
    enableSpeedBoost: false,
    enableFullscreenProgress: false
  };

  const config = { ...baseConfig, ...configOverrides };

  await page.addInitScript(() => {
    window.GM_addStyle = css => {
      const style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
    };
  });

  await page.addInitScript(({ key, config: configArg }) => {
    try {
      localStorage.setItem(key, JSON.stringify(configArg));
    } catch {
      // Ignore storage failures (e.g., blocked by the page)
    }
  }, { key: CONFIG_STORAGE_KEY, config });

  const userscript = `${readUserscript()}\n//# sourceURL=${SPEEDX_SOURCE_URL}\n`;
  await page.addInitScript({ content: userscript });
};

const isSpeedXRelated = ({ url, text, stack }) => {
  if (url && url.includes(SPEEDX_SOURCE_URL)) return true;
  if (stack && stack.includes(SPEEDX_SOURCE_URL)) return true;
  if (text && (text.includes('yt-speedx') || text.includes('YouTube SpeedX'))) return true;
  return false;
};

export const createSpeedXDiagnostics = page => {
  const consoleMessages = [];
  const pageErrors = [];

  page.on('console', msg => {
    const type = msg.type();
    if (type !== 'error' && type !== 'warning') return;
    const location = msg.location();
    consoleMessages.push({
      type,
      text: msg.text(),
      url: location?.url || '',
      lineNumber: location?.lineNumber ?? null,
      columnNumber: location?.columnNumber ?? null
    });
  });

  page.on('pageerror', error => {
    pageErrors.push({
      message: error?.message || String(error),
      stack: error?.stack || ''
    });
  });

  const getSpeedXErrors = () => ({
    console: consoleMessages.filter(m => isSpeedXRelated(m)),
    page: pageErrors.filter(e => isSpeedXRelated(e))
  });

  const attach = async testInfo => {
    const speedx = getSpeedXErrors();
    const payload = {
      url: page.url(),
      totals: { console: consoleMessages.length, page: pageErrors.length },
      speedx
    };

    await testInfo.attach('speedx-diagnostics.json', {
      body: JSON.stringify(payload, null, 2),
      contentType: 'application/json'
    });
  };

  return { consoleMessages, pageErrors, getSpeedXErrors, attach };
};

export const blurActiveElement = async page => {
  await page.evaluate(() => {
    const active = document.activeElement;
    if (active && active instanceof HTMLElement) active.blur();
  });
};

const clickIfVisible = async (page, locator, { timeoutMs = 2000 } = {}) => {
  try {
    await locator.first().waitFor({ state: 'visible', timeout: timeoutMs });
    const maybeNav = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10_000 }).catch(() => null);
    await locator.first().click({ timeout: timeoutMs });
    await maybeNav;
    return true;
  } catch {
    return false;
  }
};

export const dismissYouTubeConsentIfPresent = async page => {
  // Best-effort: consent screens vary by region and change frequently.
  const candidates = [
    page.locator('#introAgreeButton, button#introAgreeButton'),
    page.getByRole('button', { name: /accept all/i }),
    page.getByRole('button', { name: /i agree/i }),
    page.getByRole('button', { name: /accept the use/i }),
    page.getByRole('button', { name: /agree/i }),
    page.getByRole('button', { name: /принять/i })
  ];

  for (const candidate of candidates) {
    if (await clickIfVisible(page, candidate)) return true;
  }
  return false;
};

export const dismissRutubeConsentIfPresent = async page => {
  const candidates = [
    page.getByRole('button', { name: /принять/i }),
    page.getByRole('button', { name: /соглас/i }),
    page.getByRole('button', { name: /accept/i }),
    page.getByRole('button', { name: /agree/i })
  ];

  for (const candidate of candidates) {
    if (await clickIfVisible(page, candidate)) return true;
  }
  return false;
};

export const getStoredConfig = async page =>
  page.evaluate(key => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, CONFIG_STORAGE_KEY);
