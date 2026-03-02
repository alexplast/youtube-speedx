import { CONFIG, saveConfig } from '../config/storage';
import { formatSpeed, normalizeSpeed } from '../utils/number';
import { sleep } from '../utils/sleep';
import { GenericAdapter } from './generic';
import type { Adapter, ResolutionDirection } from './types';

const rutubeResState: {
  debounceTimer: ReturnType<typeof setTimeout> | null;
  currentSelectionText: string;
  availableLabels: string[];
  sessionActive: boolean;
} = {
  debounceTimer: null,
  currentSelectionText: '',
  availableLabels: [],
  sessionActive: false
};

const getRutubeVideoElement = () => document.querySelector('video');

const getRutubePlayer = () => {
  const video = getRutubeVideoElement();
  return video ? (video.closest('.video-player') || video.parentElement?.parentElement || null) : null;
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

const getGearBtn = () => document.querySelector('button[aria-controls="raichuSettingsPanel"]') as HTMLElement | null;

const getQualityBtn = (panel: HTMLElement | null) =>
  panel ? (panel.querySelector('button[aria-label="Качество"]') as HTMLElement | null) : null;

const getQualityItemsArray = (panel: HTMLElement | null) => {
  if (!panel) return [] as HTMLElement[];
  return Array.from(panel.querySelectorAll<HTMLElement>('button[aria-label*="p"], button[aria-label*="Авто"]')).filter(btn => {
    const label = (btn.getAttribute('aria-label') || '').toLowerCase();
    return !label.includes('назад') && !label.includes('авто') && !label.includes('auto');
  });
};

const extractLabel = (btn: Element) => (btn.textContent || btn.getAttribute('aria-label') || '').replace('Выбрано', '').trim();

const openQualityMenu = async () => {
  wakeUpUI();
  await sleep(50);

  const gearBtn = getGearBtn();
  if (!gearBtn) return null;

  gearBtn.click();

  let retries = 0;
  let menuPanel: HTMLElement | null = null;
  while (retries < 15) {
    await sleep(50);
    menuPanel = document.getElementById('raichuSettingsPanel') as HTMLElement | null;
    if (menuPanel) break;
    retries++;
  }

  if (!menuPanel) {
    wakeUpUI();
    gearBtn.click();
    await sleep(200);
    menuPanel = document.getElementById('raichuSettingsPanel') as HTMLElement | null;
    if (!menuPanel) return null;
  }

  const qualityBtn = getQualityBtn(menuPanel);
  if (!qualityBtn) {
    gearBtn.click();
    return null;
  }

  qualityBtn.click();
  await sleep(200);

  return getQualityItemsArray(menuPanel);
};

const scheduleExecution = () => {
  rutubeResState.debounceTimer = setTimeout(async () => {
    wakeUpUI();
    await sleep(50);

    const menuPanel = document.getElementById('raichuSettingsPanel') as HTMLElement | null;
    if (menuPanel) {
      const items = getQualityItemsArray(menuPanel);
      const targetBtn = items.find(btn => extractLabel(btn) === rutubeResState.currentSelectionText);
      if (targetBtn) {
        targetBtn.click();
        await sleep(100);
      }
    }

    const gearBtn = getGearBtn();
    if (gearBtn && document.getElementById('raichuSettingsPanel')) gearBtn.click();

    rutubeResState.sessionActive = false;
    rutubeResState.availableLabels = [];
    rutubeResState.debounceTimer = null;
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
    const video = this.getVideoElement();
    if (!video) return;

    const timeContainer = document.querySelector('div[class*="time-block-module__time"]');
    if (!timeContainer) return;

    let indicator = document.getElementById('yt-speedx-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'yt-speedx-indicator';

      indicator.style.marginLeft = '8px';
      indicator.style.color = '#fff';
      indicator.style.fontSize = '13px';
      indicator.style.fontWeight = '600';
      indicator.style.lineHeight = '18px';
      indicator.style.flexShrink = '0';

      timeContainer.appendChild(indicator);
    }

    const currentSpeed = video.playbackRate;
    if (Math.abs(currentSpeed - 1) > 0.01) {
      indicator.textContent = `/ ${formatSpeed(currentSpeed)}x`;
      indicator.style.display = 'block';
    } else {
      indicator.style.display = 'none';
    }
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
    this.showBezelNotification(`${formatSpeed(CONFIG.speed)}x`);
    this.updateSpeedIndicator();
  },
  applyResolution: async function () {
    if (CONFIG.resolution === 'auto') return;

    const getResNumber = (resStr: string) => {
      const match = resStr.match(/(\d+)/);
      return match ? parseInt(match[1] ?? '', 10) : 0;
    };

    const targetVal = getResNumber(CONFIG.resolution);
    if (targetVal === 0) return;

    const items = await openQualityMenu();
    if (!items || items.length === 0) return;

    const getItemVal = (btn: Element) => {
      const text = extractLabel(btn);
      const match = text.match(/(\d+)p/);
      return match ? parseInt(match[1] ?? '', 10) : 0;
    };

    const sortedItems = items
      .map(btn => ({ btn, val: getItemVal(btn) }))
      .filter(i => i.val > 0)
      .sort((a, b) => b.val - a.val);

    let targetBtn: Element | null = null;
    for (const item of sortedItems) {
      if (item.val <= targetVal) {
        targetBtn = item.btn;
        break;
      }
    }
    if (!targetBtn && sortedItems.length > 0) targetBtn = sortedItems[sortedItems.length - 1]?.btn ?? null;

    if (targetBtn) {
      const isSelected = (targetBtn.getAttribute('aria-label') || '').includes('Выбрано');
      if (!isSelected) {
        (targetBtn as HTMLElement).click();
        const text = extractLabel(targetBtn);
        this.showBezelNotification(text);
      }
    }

    const gearBtn = getGearBtn();
    if (gearBtn && document.getElementById('raichuSettingsPanel')) (gearBtn as HTMLElement).click();
  },
  changeResolution: async function (direction: ResolutionDirection) {
    if (rutubeResState.sessionActive) {
      if (rutubeResState.debounceTimer) clearTimeout(rutubeResState.debounceTimer);

      let currentIndex = rutubeResState.availableLabels.indexOf(rutubeResState.currentSelectionText);
      if (currentIndex === -1) currentIndex = 0;

      let newIndex = currentIndex;
      if (direction === 'up') newIndex--;
      else newIndex++;

      if (newIndex < 0) newIndex = 0;
      if (newIndex >= rutubeResState.availableLabels.length) newIndex = rutubeResState.availableLabels.length - 1;

      rutubeResState.currentSelectionText = rutubeResState.availableLabels[newIndex] ?? '';
      this.showBezelNotification(rutubeResState.currentSelectionText);
      scheduleExecution();
      return;
    }

    rutubeResState.sessionActive = true;

    const items = await openQualityMenu();
    if (!items || items.length === 0) {
      rutubeResState.sessionActive = false;
      return;
    }

    rutubeResState.availableLabels = items.map(btn => extractLabel(btn));

    let currentBtnIndex = items.findIndex(btn => (btn.getAttribute('aria-label') || '').includes('Выбрано'));
    if (currentBtnIndex === -1) currentBtnIndex = 0;

    let newIndex = currentBtnIndex;
    if (direction === 'up') newIndex--;
    else newIndex++;

    if (newIndex < 0) newIndex = 0;
    if (newIndex >= rutubeResState.availableLabels.length) newIndex = rutubeResState.availableLabels.length - 1;

    rutubeResState.currentSelectionText = rutubeResState.availableLabels[newIndex] ?? '';
    this.showBezelNotification(rutubeResState.currentSelectionText);
    scheduleExecution();
  },
  onInit: function () {
    let lastSrc = '';
    setInterval(() => {
      const video = this.getVideoElement();
      if (!video) return;

      if (video.src !== lastSrc) {
        lastSrc = video.src;
        video.playbackRate = CONFIG.speed;
        this.updateSpeedIndicator();
        if (!video.dataset.rateListenerAttached) {
          video.addEventListener('ratechange', () => this.updateSpeedIndicator());
          video.dataset.rateListenerAttached = 'true';
        }
        setTimeout(() => void this.applyResolution(), 2500);
      }

      if (!document.getElementById('yt-speedx-indicator')) {
        this.updateSpeedIndicator();
      }
    }, 1000);
  }
};
