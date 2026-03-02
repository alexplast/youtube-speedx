import { CONFIG, saveConfig } from '../config/storage';
import { formatSpeed, normalizeSpeed } from '../utils/number';
import { sleep } from '../utils/sleep';
import { GenericAdapter } from './generic';
import type { Adapter, ResolutionDirection } from './types';

const rutubeResState: {
  debounceTimer: ReturnType<typeof setTimeout> | null;
  currentSelectionText: string;
  currentSelectionKey: string;
  availableKeys: string[];
  availableLabelByKey: Record<string, string>;
  sessionActive: boolean;
  settingsPanelId: string | null;
} = {
  debounceTimer: null,
  currentSelectionText: '',
  currentSelectionKey: '',
  availableKeys: [],
  availableLabelByKey: {},
  sessionActive: false,
  settingsPanelId: null
};

let rutubeStealthStylesInjected = false;
const ensureRutubeStealthStyles = () => {
  if (rutubeStealthStylesInjected) return;
  rutubeStealthStylesInjected = true;
  GM_addStyle(`
    html[data-yt-speedx-rutube-stealth="1"] #raichuSettingsPanel,
    html[data-yt-speedx-rutube-stealth="1"] [id*="SettingsPanel"],
    html[data-yt-speedx-rutube-stealth="1"] [id*="settingsPanel"],
    html[data-yt-speedx-rutube-stealth="1"] [role="dialog"],
    html[data-yt-speedx-rutube-stealth="1"] [role="menu"],
    html[data-yt-speedx-rutube-stealth="1"] [role="listbox"],
    html[data-yt-speedx-rutube-stealth="1"] [aria-modal="true"] {
      opacity: 0 !important;
      pointer-events: none !important;
      transition: none !important;
    }
  `);
};

const enterRutubeStealth = () => {
  ensureRutubeStealthStyles();
  document.documentElement.dataset.ytSpeedxRutubeStealth = '1';
};

const exitRutubeStealth = () => {
  delete document.documentElement.dataset.ytSpeedxRutubeStealth;
};

const getRutubeVideoElement = () => {
  const videos = Array.from(document.querySelectorAll<HTMLVideoElement>('video'));
  if (videos.length === 0) return null;
  if (videos.length === 1) return videos[0] ?? null;

  let bestVideo: HTMLVideoElement | null = null;
  let bestArea = 0;

  for (const video of videos) {
    const rect = video.getBoundingClientRect();
    const area = rect.width * rect.height;
    if (!Number.isFinite(area) || area <= 0) continue;

    const style = window.getComputedStyle(video);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
    if (rect.width < 200 || rect.height < 120) continue;

    if (area > bestArea) {
      bestArea = area;
      bestVideo = video;
    }
  }

  return bestVideo ?? videos[0] ?? null;
};

const getRutubePlayer = () => {
  const video = getRutubeVideoElement();
  return video
    ? (video.closest('.video-player') ||
        video.closest('[data-testid="video-player"]') ||
        video.closest('[data-testid="video-ui"]') ||
        video.parentElement?.parentElement ||
        video.parentElement ||
        null)
    : null;
};

const wakeUpUI = () => {
  const player = getRutubePlayer() || document.body;
  const events = ['mousemove', 'mouseenter', 'mouseover', 'pointermove'];
  events.forEach(eventType => {
    player.dispatchEvent(
      new MouseEvent(eventType, {
        bubbles: true,
        cancelable: true,
        clientX: window.innerWidth / 2,
        clientY: window.innerHeight / 2
      })
    );
  });
};

const queryFirst = <T extends Element>(root: ParentNode, selectors: string[]): T | null => {
  for (const selector of selectors) {
    const found = root.querySelector(selector);
    if (found) return found as T;
  }
  return null;
};

const isElementVisible = (el: Element) => {
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
  const rect = (el as HTMLElement).getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  return true;
};

const isElementInLayout = (el: Element) => {
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = (el as HTMLElement).getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  return true;
};

const getGearBtn = () => {
  const selectors = [
    'button[aria-controls="raichuSettingsPanel"]',
    'button[aria-controls*="SettingsPanel"]',
    'button[aria-controls*="settings"]',
    'button[aria-label="Настройки"]',
    'button[aria-label*="Настро"]',
    'button[aria-label*="Settings"]',
    'button[aria-label*="settings"]'
  ];

  const player = getRutubePlayer();
  if (player) {
    const withinPlayer = queryFirst<HTMLElement>(player, selectors);
    if (withinPlayer) return withinPlayer;
  }

  return queryFirst<HTMLElement>(document, selectors);
};

const getQualityBtn = (panel: HTMLElement | null) =>
  panel
    ? (panel.querySelector('button[aria-label="Качество"], button[aria-label="Quality"]') as HTMLElement | null) ??
      (Array.from(panel.querySelectorAll<HTMLElement>('button')).find(btn => {
        const label = (btn.getAttribute('aria-label') || btn.textContent || '').toLowerCase();
        return label.includes('качество') || label.includes('quality');
      }) ??
        null)
    : null;

const QUALITY_CLICK_TARGET_SELECTOR =
  'button, a, [role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"], [role="button"], [role="option"], [role="radio"]';

const QUALITY_CANDIDATE_SELECTOR = `${QUALITY_CLICK_TARGET_SELECTOR}, [aria-checked], [aria-pressed], [aria-current], [data-state]`;

const toQualityClickTarget = (el: HTMLElement) => (el.closest(QUALITY_CLICK_TARGET_SELECTOR) as HTMLElement | null) ?? el;

const getQualityItemsArray = (panel: HTMLElement | null, excludeElements: Element[] = []) => {
  if (!panel) return [] as HTMLElement[];

  const rawCandidates = Array.from(panel.querySelectorAll<HTMLElement>(QUALITY_CANDIDATE_SELECTOR)).map(toQualityClickTarget);
  const candidates: HTMLElement[] = [];
  const seenCandidates = new Set<HTMLElement>();
  for (const el of rawCandidates) {
    if (seenCandidates.has(el)) continue;
    seenCandidates.add(el);
    candidates.push(el);
  }

  const items = candidates.filter(el => {
    if (excludeElements.some(ex => ex === el)) return false;
    if (!isElementVisible(el)) return false;
    const label = extractLabel(el).toLowerCase();
    if (!label) return false;
    if (label.includes('назад') || label.includes('back')) return false;
    if (label.includes('авто') || label.includes('auto')) return false;
    return parseQuality(label) !== null;
  });

  const seen = new Set<string>();
  return items.filter(el => {
    const label = extractLabel(el);
    if (seen.has(label)) return false;
    seen.add(label);
    return true;
  });
};

const extractLabel = (btn: Element) => {
  const raw = (btn.getAttribute('aria-label') || btn.textContent || '').replace(/\s+/g, ' ').trim();
  const withoutStatus = raw.replace(/выбрано|selected|выбрать|choose/gi, '').trim();
  return withoutStatus
    .replace(/(?:[•·+＋|–—-]\s*)+$/g, '')
    .replace(/^(?:[•·+＋|–—-]\s*)+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const isSelectedQualityOption = (btn: Element) => {
  const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
  const text = (btn.textContent || '').toLowerCase();
  if (ariaLabel.includes('выбрано') || ariaLabel.includes('selected') || text.includes('выбрано') || text.includes('selected'))
    return true;
  if (btn.getAttribute('aria-checked') === 'true') return true;
  if (btn.getAttribute('aria-pressed') === 'true') return true;
  if (btn.getAttribute('aria-current') === 'true') return true;
  const dataState = (btn as HTMLElement).getAttribute('data-state') || (btn as HTMLElement).dataset?.state || '';
  if (dataState === 'checked' || dataState === 'selected' || dataState === 'active') return true;
  const classList = (btn as HTMLElement).classList;
  if (classList && Array.from(classList).some(c => c.toLowerCase().includes('selected'))) return true;
  return false;
};

type ParsedQuality = {
  height: number;
  fps: number;
};

const toQualityKey = (quality: ParsedQuality) => `${quality.height}p${quality.fps}`;

const parseQuality = (label: string): ParsedQuality | null => {
  const normalized = String(label).toLowerCase();
  const match = normalized.match(/(\d{3,4})\s*p\s*(\d{2,3})?/i);
  if (match) {
    const height = parseInt(match[1] ?? '', 10);
    if (!Number.isFinite(height) || height <= 0) return null;
    const fps = match[2] ? parseInt(match[2] ?? '', 10) : 30;
    return { height, fps: Number.isFinite(fps) && fps > 0 ? fps : 30 };
  }

  const numeric = normalized.match(/\b(2160|1440|1080|720|480|360|240|144)\b/);
  if (numeric) return { height: parseInt(numeric[1] ?? '', 10), fps: 30 };

  if (normalized.includes('4k')) return { height: 2160, fps: 30 };
  if (normalized.includes('2k')) return { height: 1440, fps: 30 };
  if (normalized.includes('full hd') || normalized.includes('fhd')) return { height: 1080, fps: 30 };
  if (normalized === 'hd' || normalized.includes(' hd')) return { height: 720, fps: 30 };
  if (normalized === 'sd' || normalized.includes(' sd')) return { height: 480, fps: 30 };

  return null;
};

const getQualityItemsFromDocument = (excludeElements: Element[] = []) => {
  const rawCandidates = Array.from(document.querySelectorAll<HTMLElement>(QUALITY_CANDIDATE_SELECTOR)).map(toQualityClickTarget);
  const candidates: HTMLElement[] = [];
  const seenCandidates = new Set<HTMLElement>();
  for (const el of rawCandidates) {
    if (seenCandidates.has(el)) continue;
    seenCandidates.add(el);
    candidates.push(el);
  }

  const qualityCandidates = candidates.filter(el => {
    if (excludeElements.some(ex => ex === el)) return false;
    if (!isElementVisible(el)) return false;
    const label = extractLabel(el).toLowerCase();
    if (!label) return false;
    if (label.includes('назад') || label.includes('back')) return false;
    if (label.includes('авто') || label.includes('auto')) return false;
    return parseQuality(label) !== null;
  });

  if (qualityCandidates.length === 0) return [] as HTMLElement[];

  const containerCounts = new Map<HTMLElement, number>();
  for (const el of qualityCandidates) {
    const container =
      (el.closest('[id*="SettingsPanel"], [id*="settingsPanel"], [role="dialog"], [role="menu"], [role="listbox"]') as HTMLElement | null) ??
      null;
    if (!container) continue;
    containerCounts.set(container, (containerCounts.get(container) ?? 0) + 1);
  }

  let bestContainer: HTMLElement | null = null;
  let bestCount = 0;
  for (const [container, count] of containerCounts.entries()) {
    if (count > bestCount && isElementVisible(container)) {
      bestContainer = container;
      bestCount = count;
    }
  }

  if (!bestContainer) return qualityCandidates;

  const fromBestContainer = qualityCandidates.filter(el => bestContainer?.contains(el));
  return fromBestContainer.length > 0 ? fromBestContainer : qualityCandidates;
};

const qualityLabelToConfigResolution = (label: string) => {
  const quality = parseQuality(label);
  if (!quality) return null;
  const height = quality.height;
  if (height >= 2160) return 'hd2160';
  if (height >= 1440) return 'hd1440';
  if (height >= 1080) return 'hd1080';
  if (height >= 720) return 'hd720';
  if (height >= 480) return 'large';
  if (height >= 360) return 'medium';
  if (height >= 240) return 'small';
  return 'tiny';
};

const openQualityMenu = async () => {
  wakeUpUI();
  await sleep(50);

  const gearBtn = getGearBtn();
  if (!gearBtn) return null;

  const panelId = gearBtn.getAttribute('aria-controls') || 'raichuSettingsPanel';
  rutubeResState.settingsPanelId = panelId;

  let menuPanel = document.getElementById(panelId) as HTMLElement | null;
  const isOpen = menuPanel ? isElementInLayout(menuPanel) : false;
  if (!isOpen) gearBtn.click();

  let retries = 0;
  while (retries < 15) {
    await sleep(50);
    menuPanel = document.getElementById(panelId) as HTMLElement | null;
    if (menuPanel && isElementInLayout(menuPanel)) break;
    retries++;
  }

  if (!menuPanel || !isElementInLayout(menuPanel)) return null;

  const qualityBtn = getQualityBtn(menuPanel);
  if (qualityBtn) {
    qualityBtn.click();
    await sleep(150);
  }

  let attempts = 0;
  while (attempts < 20) {
    const items = getQualityItemsArray(menuPanel, qualityBtn ? [qualityBtn] : []);
    if (items.length > 0) return items;
    const fallbackItems = getQualityItemsFromDocument(qualityBtn ? [qualityBtn] : []);
    if (fallbackItems.length > 0) return fallbackItems;
    await sleep(100);
    attempts++;
  }

  const finalItems = getQualityItemsArray(menuPanel, qualityBtn ? [qualityBtn] : []);
  return finalItems.length > 0 ? finalItems : getQualityItemsFromDocument(qualityBtn ? [qualityBtn] : []);
};

const isAnySettingsPanelOpen = () => {
  const gearBtn = getGearBtn();
  const panelId = rutubeResState.settingsPanelId || gearBtn?.getAttribute('aria-controls') || null;
  if (panelId) {
    const panel = document.getElementById(panelId);
    if (panel && isElementInLayout(panel)) return true;
  }

  return Array.from(document.querySelectorAll<HTMLElement>('[id*="SettingsPanel"], [id*="settingsPanel"], #raichuSettingsPanel')).some(
    isElementInLayout
  );
};

const waitForSettingsPanelClosed = async (timeoutMs: number) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isAnySettingsPanelOpen()) return true;
    await sleep(50);
  }
  return !isAnySettingsPanelOpen();
};

const closeSettingsPanel = async () => {
  if (!isAnySettingsPanelOpen()) return;

  // Prefer Escape (won't accidentally re-open the menu).
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }));
  document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }));

  if (await waitForSettingsPanelClosed(500)) return;

  const gearBtn = getGearBtn();
  if (gearBtn && isAnySettingsPanelOpen()) {
    gearBtn.click();
    await waitForSettingsPanelClosed(500);
  }
};

const pickBestQualityOption = (candidates: HTMLElement[]) => {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0] ?? null;

  const scored = candidates.map(el => {
    let score = 0;
    const role = (el.getAttribute('role') || '').toLowerCase();
    if (role === 'menuitemradio' || role === 'radio' || role === 'option') score += 5;
    if (el.tagName.toLowerCase() === 'button') score += 1;
    if (el.getAttribute('aria-checked') !== null) score += 1;
    if (el.getAttribute('data-state') !== null || el.dataset?.state) score += 1;
    if (el.getAttribute('aria-controls')) score -= 5;
    if (el.getAttribute('aria-haspopup')) score -= 3;
    if (el.getAttribute('aria-expanded') !== null) score -= 3;
    return { el, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.el ?? null;
};

const scheduleExecution = () => {
  rutubeResState.debounceTimer = setTimeout(async () => {
    enterRutubeStealth();
    try {
      wakeUpUI();
      await sleep(50);

      const menuPanelId = rutubeResState.settingsPanelId || 'raichuSettingsPanel';
      const menuPanel = document.getElementById(menuPanelId) as HTMLElement | null;

      const itemsInPanel = menuPanel ? getQualityItemsArray(menuPanel) : [];
      const items = itemsInPanel.length > 0 ? itemsInPanel : getQualityItemsFromDocument();

      const effectiveItems = items.length > 0 ? items : await openQualityMenu();
      const normalizedItems = effectiveItems ?? [];
      if (normalizedItems.length === 0) {
        RutubeAdapter.showBezelNotification('Quality menu not found');
        return;
      }

      const matches = normalizedItems.filter(btn => {
        const quality = parseQuality(extractLabel(btn));
        return quality ? toQualityKey(quality) === rutubeResState.currentSelectionKey : false;
      });
      const targetBtn = pickBestQualityOption(matches);
      if (targetBtn) {
        targetBtn.click();
        await sleep(100);

        const mappedResolution = qualityLabelToConfigResolution(extractLabel(targetBtn));
        if (mappedResolution) {
          CONFIG.resolution = mappedResolution;
          saveConfig();
        }
      }
    } finally {
      await closeSettingsPanel();
      exitRutubeStealth();

      rutubeResState.sessionActive = false;
      rutubeResState.availableKeys = [];
      rutubeResState.availableLabelByKey = {};
      rutubeResState.currentSelectionKey = '';
      rutubeResState.debounceTimer = null;
    }
  }, 600);
};

export const RutubeAdapter: Adapter = {
  ...GenericAdapter,
  name: 'Rutube',
  isMatch: () => window.location.hostname.includes('rutube.ru'),
  getVideoElement: getRutubeVideoElement,
  getPlayer: getRutubePlayer,
  isControlsHidden: function () {
    const controls = document.querySelector('[data-testid="video-ui"]');
    if (controls) {
      if (Array.from(controls.classList).some(c => c.toLowerCase().includes('hidden'))) return true;
    } else {
      const mainWrapper = getRutubePlayer();
      if (mainWrapper && window.getComputedStyle(mainWrapper).cursor === 'none') return true;
    }
    return false;
  },
  updateSpeedIndicator: function () {
    // Rutube's time/progress UI is tight; injecting extra text causes layout shift.
    // The playback speed is available in Rutube's gear menu and in the SpeedX modal.
    document.getElementById('yt-speedx-indicator')?.remove();
  },
  showBezelNotification: function (text) {
    let wrapper = document.getElementById('yt-speedx-bezel-wrapper');
    const targetParent = document.fullscreenElement || this.getPlayer();
    if (!targetParent) return;

    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = 'yt-speedx-bezel-wrapper';
      wrapper.style.position = 'absolute';
      wrapper.style.top = '20%';
      wrapper.style.left = '50%';
      wrapper.style.transform = 'translateX(-50%)';
      wrapper.style.zIndex = '2147483647';
      wrapper.style.pointerEvents = 'none';

      const textElement = document.createElement('div');
      textElement.id = 'yt-speedx-bezel-text';
      wrapper.appendChild(textElement);
    }

    if (wrapper.parentElement !== targetParent) {
      const computedStyle = window.getComputedStyle(targetParent);
      if (computedStyle.position === 'static') {
        (targetParent as HTMLElement).style.position = 'relative';
      }
      targetParent.appendChild(wrapper);
    }

    const textElement = document.getElementById('yt-speedx-bezel-text');
    if (textElement) {
      textElement.textContent = text;
      wrapper.classList.remove('yt-speedx-bezel-show');
      void wrapper.offsetHeight;
      wrapper.classList.add('yt-speedx-bezel-show');
    }
  },
  applySpeed: function (videoElement, newSpeed) {
    if (!videoElement) return;
    const normalizedSpeed = normalizeSpeed(newSpeed);
    if (normalizedSpeed === null) return;
    CONFIG.speed = normalizedSpeed;
    saveConfig();
    videoElement.playbackRate = CONFIG.speed;
    videoElement.defaultPlaybackRate = CONFIG.speed;
    this.showBezelNotification(`${formatSpeed(CONFIG.speed)}x`);
    this.updateSpeedIndicator();
  },
  applyResolution: async function () {
    if (CONFIG.resolution === 'auto') return;

    const getResNumber = (resStr: string) => {
      const normalized = String(resStr).toLowerCase().trim();
      if (normalized === 'tiny') return 144;
      if (normalized === 'small') return 240;
      if (normalized === 'medium') return 360;
      if (normalized === 'large') return 480;
      const match = normalized.match(/(\d+)/);
      return match ? parseInt(match[1] ?? '', 10) : 0;
    };

    const targetVal = getResNumber(CONFIG.resolution);
    if (targetVal === 0) return;

    enterRutubeStealth();
    try {
      const items = await openQualityMenu();
      if (!items || items.length === 0) {
        this.showBezelNotification('Quality menu not found');
        return;
      }

      const itemsWithQuality = items
        .map(btn => {
          const label = extractLabel(btn);
          const quality = parseQuality(label);
          return quality ? { btn, label, quality } : null;
        })
        .filter((i): i is { btn: HTMLElement; label: string; quality: ParsedQuality } => !!i)
        .sort((a, b) => b.quality.height - a.quality.height || b.quality.fps - a.quality.fps);

      let target: { btn: HTMLElement; label: string; quality: ParsedQuality } | null = null;
      for (const item of itemsWithQuality) {
        if (item.quality.height <= targetVal) {
          target = item;
          break;
        }
      }
      if (!target && itemsWithQuality.length > 0) target = itemsWithQuality[itemsWithQuality.length - 1] ?? null;

      if (target) {
        const isSelected = isSelectedQualityOption(target.btn);
        if (!isSelected) {
          target.btn.click();
          this.showBezelNotification(target.label);
        }
      }
    } finally {
      await closeSettingsPanel();
      exitRutubeStealth();
    }
  },
  changeResolution: async function (direction: ResolutionDirection) {
	    if (rutubeResState.sessionActive) {
	      if (rutubeResState.debounceTimer) clearTimeout(rutubeResState.debounceTimer);

	      if (rutubeResState.availableKeys.length === 0) {
	        rutubeResState.sessionActive = false;
	        rutubeResState.availableKeys = [];
	        rutubeResState.availableLabelByKey = {};
	        rutubeResState.currentSelectionKey = '';
	        rutubeResState.currentSelectionText = '';
	        rutubeResState.debounceTimer = null;
	        await closeSettingsPanel();
	        exitRutubeStealth();
	        return;
	      }

      let currentIndex = rutubeResState.availableKeys.indexOf(rutubeResState.currentSelectionKey);
      if (currentIndex === -1) currentIndex = 0;

      let newIndex = currentIndex;
      if (direction === 'up') newIndex--;
      else newIndex++;

      if (newIndex < 0) newIndex = 0;
      if (newIndex >= rutubeResState.availableKeys.length) newIndex = rutubeResState.availableKeys.length - 1;

      rutubeResState.currentSelectionKey = rutubeResState.availableKeys[newIndex] ?? '';
      rutubeResState.currentSelectionText = rutubeResState.availableLabelByKey[rutubeResState.currentSelectionKey] ?? '';
      this.showBezelNotification(rutubeResState.currentSelectionText);
      scheduleExecution();
      return;
    }

	    rutubeResState.sessionActive = true;

	    enterRutubeStealth();
	    const items = await openQualityMenu();
	    if (!items || items.length === 0) {
	      rutubeResState.sessionActive = false;
	      this.showBezelNotification('Quality menu not found');
	      await closeSettingsPanel();
	      exitRutubeStealth();
	      return;
	    }

	    const itemsWithQuality = items
	      .map(btn => {
	        const label = extractLabel(btn);
	        const quality = parseQuality(label);
	        return quality ? { btn, label, quality, key: toQualityKey(quality), selected: isSelectedQualityOption(btn) } : null;
	      })
	      .filter((i): i is { btn: HTMLElement; label: string; quality: ParsedQuality; key: string; selected: boolean } => !!i);

	    const uniqueByKey = new Map<string, { label: string; quality: ParsedQuality; selected: boolean }>();
	    for (const item of itemsWithQuality) {
	      const existing = uniqueByKey.get(item.key);
	      if (!existing) uniqueByKey.set(item.key, { label: item.label, quality: item.quality, selected: item.selected });
	      else if (item.selected) existing.selected = true;
	    }

	    const sortedOptions = Array.from(uniqueByKey.entries())
	      .map(([key, val]) => ({ key, ...val }))
	      .sort((a, b) => b.quality.height - a.quality.height || b.quality.fps - a.quality.fps);

	    rutubeResState.availableKeys = sortedOptions.map(o => o.key);
	    rutubeResState.availableLabelByKey = Object.fromEntries(sortedOptions.map(o => [o.key, o.label]));

	    if (rutubeResState.availableKeys.length === 0) {
	      rutubeResState.sessionActive = false;
	      this.showBezelNotification('Quality menu not found');
	      await closeSettingsPanel();
	      exitRutubeStealth();
	      return;
	    }

	    const selectedKey = sortedOptions.find(o => o.selected)?.key ?? '';
	    let currentIndex = rutubeResState.availableKeys.indexOf(selectedKey);
	    if (currentIndex === -1) currentIndex = 0;

	    let newIndex = currentIndex;
	    if (direction === 'up') newIndex--;
	    else newIndex++;

	    if (newIndex < 0) newIndex = 0;
	    if (newIndex >= rutubeResState.availableKeys.length) newIndex = rutubeResState.availableKeys.length - 1;

	    rutubeResState.currentSelectionKey = rutubeResState.availableKeys[newIndex] ?? '';
	    rutubeResState.currentSelectionText = rutubeResState.availableLabelByKey[rutubeResState.currentSelectionKey] ?? '';
	    this.showBezelNotification(rutubeResState.currentSelectionText);

	    scheduleExecution();
	  },
  onInit: function () {
    ensureRutubeStealthStyles();
    let lastSrc = '';
    setInterval(() => {
      const video = this.getVideoElement();
      if (!video) return;

      if (video.src !== lastSrc) {
        lastSrc = video.src;
        video.playbackRate = CONFIG.speed;
        video.defaultPlaybackRate = CONFIG.speed;
        this.updateSpeedIndicator();
        if (!video.dataset.rateListenerAttached) {
          video.addEventListener('ratechange', () => this.updateSpeedIndicator());
          video.dataset.rateListenerAttached = 'true';
        }
        setTimeout(() => void this.applyResolution(), 2500);
      }

    }, 1000);
  }
};
