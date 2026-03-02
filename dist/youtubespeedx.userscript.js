// ==UserScript==
// @name         YouTube SpeedX
// @namespace    https://github.com/alexplast/youtube-speedx
// @version      3.0.0
// @description  Polished UI, speed/resolution control, H.264 forcing, managed via a hotkey-accessible settings menu.
// @author       https://github.com/alexplast
// @match        https://*.youtube.com/*
// @icon         https://www.google.com/s2/favicons?domain=youtube.com
// @match        https://rutube.ru/*
// @icon         https://www.google.com/s2/favicons?domain=rutube.ru
// @match        https://*.smotrim.ru/*
// @icon         https://www.google.com/s2/favicons?domain=smotrim.ru
// @match        https://*.ivi.ru/*
// @icon         https://www.google.com/s2/favicons?domain=ivi.ru
// @match        https://*vgtrk.com*/*
// @icon         https://www.google.com/s2/favicons?domain=vgtrk.com
// @match        https://*.twitch.tv/*
// @icon         https://www.google.com/s2/favicons?domain=twitch.tv
// @match        https://disk.yandex.ru/*
// @icon         https://www.google.com/s2/favicons?domain=yandex.ru
// @match        https://web.telegram.org/*
// @icon         https://www.google.com/s2/favicons?domain=telegram.org
// @match        https://vkvideo.ru/*
// @icon         https://www.google.com/s2/favicons?domain=vk.com
// @downloadURL  https://raw.githubusercontent.com/alexplast/youtube-speedx/main/dist/youtubespeedx.userscript.js
// @updateURL    https://raw.githubusercontent.com/alexplast/youtube-speedx/main/dist/youtubespeedx.userscript.js
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

"use strict";
(() => {
  // src/config/defaultConfig.ts
  var DEFAULT_CONFIG = {
    speed: 2.3,
    resolution: "hd1080",
    useH264: true,
    max60FpsQuality: "unlimited",
    // 'unlimited', '1080', '720', '480', 'disabled'
    ADJUSTMENT_STEP: 0.1,
    RES_DOWN_KEY: "Comma",
    RES_UP_KEY: "Period",
    SETTINGS_KEY: "KeyS",
    enableSpeedBoost: true,
    BOOST_KEY: "KeyB",
    BOOST_SPEED: 3.5,
    enableFullscreenProgress: true,
    progressBarOpacity: 0.5
  };

  // src/utils/number.ts
  var clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  var normalizeSpeed = (value, fallback = null) => {
    const numericValue = typeof value === "number" ? value : parseFloat(String(value));
    if (!Number.isFinite(numericValue)) return fallback;
    return +clamp(numericValue, 0.1, 16).toFixed(2);
  };
  var normalizeStep = (value, fallback = null) => {
    const numericValue = typeof value === "number" ? value : parseFloat(String(value));
    if (!Number.isFinite(numericValue)) return fallback;
    return +clamp(numericValue, 0.05, 5).toFixed(2);
  };
  var normalizeOpacity = (value, fallback = null) => {
    const numericValue = typeof value === "number" ? value : parseFloat(String(value));
    if (!Number.isFinite(numericValue)) return fallback;
    return +clamp(numericValue, 0.1, 1).toFixed(2);
  };
  var formatSpeed = (value) => {
    const numericValue = typeof value === "number" ? value : parseFloat(String(value));
    if (!Number.isFinite(numericValue)) return "";
    return String(parseFloat(numericValue.toFixed(2)));
  };

  // src/config/storage.ts
  var CONFIG_STORAGE_KEY = "ytSpeedXConfig";
  var CONFIG = { ...DEFAULT_CONFIG };
  var ALLOWED_MAX60_FPS_QUALITY = /* @__PURE__ */ new Set(["unlimited", "1080", "720", "480", "disabled"]);
  var sanitizeConfig = () => {
    var _a, _b, _c, _d;
    CONFIG.speed = (_a = normalizeSpeed(CONFIG.speed, DEFAULT_CONFIG.speed)) != null ? _a : DEFAULT_CONFIG.speed;
    CONFIG.ADJUSTMENT_STEP = (_b = normalizeStep(CONFIG.ADJUSTMENT_STEP, DEFAULT_CONFIG.ADJUSTMENT_STEP)) != null ? _b : DEFAULT_CONFIG.ADJUSTMENT_STEP;
    CONFIG.BOOST_SPEED = (_c = normalizeSpeed(CONFIG.BOOST_SPEED, DEFAULT_CONFIG.BOOST_SPEED)) != null ? _c : DEFAULT_CONFIG.BOOST_SPEED;
    CONFIG.progressBarOpacity = (_d = normalizeOpacity(CONFIG.progressBarOpacity, DEFAULT_CONFIG.progressBarOpacity)) != null ? _d : DEFAULT_CONFIG.progressBarOpacity;
    if (!ALLOWED_MAX60_FPS_QUALITY.has(CONFIG.max60FpsQuality)) CONFIG.max60FpsQuality = DEFAULT_CONFIG.max60FpsQuality;
    if (typeof CONFIG.useH264 !== "boolean") CONFIG.useH264 = DEFAULT_CONFIG.useH264;
    if (typeof CONFIG.enableSpeedBoost !== "boolean") CONFIG.enableSpeedBoost = DEFAULT_CONFIG.enableSpeedBoost;
    if (typeof CONFIG.enableFullscreenProgress !== "boolean") CONFIG.enableFullscreenProgress = DEFAULT_CONFIG.enableFullscreenProgress;
    if (typeof CONFIG.resolution !== "string") CONFIG.resolution = DEFAULT_CONFIG.resolution;
    if (typeof CONFIG.RES_DOWN_KEY !== "string" || !CONFIG.RES_DOWN_KEY) CONFIG.RES_DOWN_KEY = DEFAULT_CONFIG.RES_DOWN_KEY;
    if (typeof CONFIG.RES_UP_KEY !== "string" || !CONFIG.RES_UP_KEY) CONFIG.RES_UP_KEY = DEFAULT_CONFIG.RES_UP_KEY;
    if (typeof CONFIG.SETTINGS_KEY !== "string" || !CONFIG.SETTINGS_KEY) CONFIG.SETTINGS_KEY = DEFAULT_CONFIG.SETTINGS_KEY;
    if (typeof CONFIG.BOOST_KEY !== "string" || !CONFIG.BOOST_KEY) CONFIG.BOOST_KEY = DEFAULT_CONFIG.BOOST_KEY;
  };
  var loadConfig = () => {
    try {
      const storedConfigJSON = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (!storedConfigJSON) return;
      const storedConfig = JSON.parse(storedConfigJSON);
      if (!storedConfig) return;
      if (storedConfig.speed !== void 0) CONFIG.speed = storedConfig.speed;
      if (storedConfig.resolution !== void 0) CONFIG.resolution = storedConfig.resolution;
      if (storedConfig.useH264 !== void 0) CONFIG.useH264 = storedConfig.useH264;
      if (storedConfig.max60FpsQuality !== void 0) CONFIG.max60FpsQuality = storedConfig.max60FpsQuality;
      if (storedConfig.ADJUSTMENT_STEP !== void 0) CONFIG.ADJUSTMENT_STEP = storedConfig.ADJUSTMENT_STEP;
      if (storedConfig.RES_DOWN_KEY) CONFIG.RES_DOWN_KEY = storedConfig.RES_DOWN_KEY;
      if (storedConfig.RES_UP_KEY) CONFIG.RES_UP_KEY = storedConfig.RES_UP_KEY;
      if (storedConfig.SETTINGS_KEY) CONFIG.SETTINGS_KEY = storedConfig.SETTINGS_KEY;
      if (storedConfig.enableSpeedBoost !== void 0) CONFIG.enableSpeedBoost = storedConfig.enableSpeedBoost;
      if (storedConfig.BOOST_KEY) CONFIG.BOOST_KEY = storedConfig.BOOST_KEY;
      if (storedConfig.BOOST_SPEED !== void 0) CONFIG.BOOST_SPEED = storedConfig.BOOST_SPEED;
      if (storedConfig.enableFullscreenProgress !== void 0) CONFIG.enableFullscreenProgress = storedConfig.enableFullscreenProgress;
      if (storedConfig.progressBarOpacity !== void 0) CONFIG.progressBarOpacity = storedConfig.progressBarOpacity;
      sanitizeConfig();
    } catch {
    }
  };
  var saveConfig = () => {
    try {
      sanitizeConfig();
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({ ...CONFIG }));
    } catch {
    }
  };

  // src/core/h264.ts
  var applyH264CodecPatch = () => {
    var _a, _b;
    const originalIsTypeSupported = (_a = window.MediaSource) == null ? void 0 : _a.isTypeSupported;
    const originalDecodingInfo = (_b = navigator.mediaCapabilities) == null ? void 0 : _b.decodingInfo;
    const isCodecBlocked = (codecString) => {
      if (!codecString) return false;
      const blockedCodecs = ["vp8", "vp9", "vp09", "av1", "av01"];
      return blockedCodecs.some((blocked) => codecString.includes(blocked));
    };
    if (originalIsTypeSupported) {
      MediaSource.isTypeSupported = function(...args) {
        const [type] = args;
        if (isCodecBlocked(type)) return false;
        return originalIsTypeSupported.apply(MediaSource, args);
      };
    }
    if (originalDecodingInfo) {
      navigator.mediaCapabilities.decodingInfo = function(...args) {
        var _a2;
        const [info] = args;
        if (isCodecBlocked((_a2 = info == null ? void 0 : info.video) == null ? void 0 : _a2.contentType)) {
          return Promise.resolve({ supported: false, smooth: false, powerEfficient: false });
        }
        return originalDecodingInfo.apply(navigator.mediaCapabilities, args);
      };
    }
  };

  // src/adapters/generic.ts
  var GenericAdapter = {
    name: "Generic",
    isMatch: () => true,
    getVideoElement: () => document.querySelector("video"),
    getPlayer: () => null,
    isControlsHidden: () => false,
    applySpeed: (videoElement, newSpeed) => {
      if (!videoElement) return;
      const normalizedSpeed = normalizeSpeed(newSpeed);
      if (normalizedSpeed === null) return;
      CONFIG.speed = normalizedSpeed;
      videoElement.playbackRate = CONFIG.speed;
      saveConfig();
    },
    applyResolution: () => {
    },
    changeResolution: () => {
    },
    updateSpeedIndicator: () => {
    },
    showBezelNotification: () => {
    }
  };

  // src/adapters/ivi.ts
  var IviAdapter = {
    ...GenericAdapter,
    name: "Ivi",
    isMatch: () => window.location.hostname.includes("ivi.ru")
  };

  // src/utils/sleep.ts
  var sleep = (timeoutMs) => new Promise((resolve) => setTimeout(resolve, timeoutMs));

  // src/adapters/rutube.ts
  var rutubeResState = {
    debounceTimer: null,
    currentSelectionText: "",
    currentSelectionKey: "",
    availableKeys: [],
    availableLabelByKey: {},
    sessionActive: false,
    settingsPanelId: null
  };
  var rutubeStealthStylesInjected = false;
  var ensureRutubeStealthStyles = () => {
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
  var enterRutubeStealth = () => {
    ensureRutubeStealthStyles();
    document.documentElement.dataset.ytSpeedxRutubeStealth = "1";
  };
  var exitRutubeStealth = () => {
    delete document.documentElement.dataset.ytSpeedxRutubeStealth;
  };
  var getRutubeVideoElement = () => {
    var _a, _b;
    const videos = Array.from(document.querySelectorAll("video"));
    if (videos.length === 0) return null;
    if (videos.length === 1) return (_a = videos[0]) != null ? _a : null;
    let bestVideo = null;
    let bestArea = 0;
    for (const video of videos) {
      const rect = video.getBoundingClientRect();
      const area = rect.width * rect.height;
      if (!Number.isFinite(area) || area <= 0) continue;
      const style = window.getComputedStyle(video);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;
      if (rect.width < 200 || rect.height < 120) continue;
      if (area > bestArea) {
        bestArea = area;
        bestVideo = video;
      }
    }
    return (_b = bestVideo != null ? bestVideo : videos[0]) != null ? _b : null;
  };
  var getRutubePlayer = () => {
    var _a;
    const video = getRutubeVideoElement();
    return video ? video.closest(".video-player") || video.closest('[data-testid="video-player"]') || video.closest('[data-testid="video-ui"]') || ((_a = video.parentElement) == null ? void 0 : _a.parentElement) || video.parentElement || null : null;
  };
  var wakeUpUI = () => {
    const player = getRutubePlayer() || document.body;
    const events = ["mousemove", "mouseenter", "mouseover", "pointermove"];
    events.forEach((eventType) => {
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
  var queryFirst = (root, selectors) => {
    for (const selector of selectors) {
      const found = root.querySelector(selector);
      if (found) return found;
    }
    return null;
  };
  var isElementVisible = (el) => {
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    return true;
  };
  var isElementInLayout = (el) => {
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    return true;
  };
  var getGearBtn = () => {
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
      const withinPlayer = queryFirst(player, selectors);
      if (withinPlayer) return withinPlayer;
    }
    return queryFirst(document, selectors);
  };
  var getQualityBtn = (panel) => {
    var _a, _b;
    return panel ? (_b = panel.querySelector('button[aria-label="Качество"], button[aria-label="Quality"]')) != null ? _b : (_a = Array.from(panel.querySelectorAll("button")).find((btn) => {
      const label = (btn.getAttribute("aria-label") || btn.textContent || "").toLowerCase();
      return label.includes("качество") || label.includes("quality");
    })) != null ? _a : null : null;
  };
  var QUALITY_CLICK_TARGET_SELECTOR = 'button, a, [role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"], [role="button"], [role="option"], [role="radio"]';
  var QUALITY_CANDIDATE_SELECTOR = `${QUALITY_CLICK_TARGET_SELECTOR}, [aria-checked], [aria-pressed], [aria-current], [data-state]`;
  var toQualityClickTarget = (el) => {
    var _a;
    return (_a = el.closest(QUALITY_CLICK_TARGET_SELECTOR)) != null ? _a : el;
  };
  var getQualityItemsArray = (panel, excludeElements = []) => {
    if (!panel) return [];
    const rawCandidates = Array.from(panel.querySelectorAll(QUALITY_CANDIDATE_SELECTOR)).map(toQualityClickTarget);
    const candidates = [];
    const seenCandidates = /* @__PURE__ */ new Set();
    for (const el of rawCandidates) {
      if (seenCandidates.has(el)) continue;
      seenCandidates.add(el);
      candidates.push(el);
    }
    const items = candidates.filter((el) => {
      if (excludeElements.some((ex) => ex === el)) return false;
      if (!isElementVisible(el)) return false;
      const label = extractLabel(el).toLowerCase();
      if (!label) return false;
      if (label.includes("назад") || label.includes("back")) return false;
      if (label.includes("авто") || label.includes("auto")) return false;
      return parseQuality(label) !== null;
    });
    const seen = /* @__PURE__ */ new Set();
    return items.filter((el) => {
      const label = extractLabel(el);
      if (seen.has(label)) return false;
      seen.add(label);
      return true;
    });
  };
  var extractLabel = (btn) => {
    const raw = (btn.getAttribute("aria-label") || btn.textContent || "").replace(/\s+/g, " ").trim();
    const withoutStatus = raw.replace(/выбрано|selected|выбрать|choose/gi, "").trim();
    return withoutStatus.replace(/(?:[•·+＋|–—-]\s*)+$/g, "").replace(/^(?:[•·+＋|–—-]\s*)+/g, "").replace(/\s+/g, " ").trim();
  };
  var isSelectedQualityOption = (btn) => {
    var _a;
    const ariaLabel = (btn.getAttribute("aria-label") || "").toLowerCase();
    const text = (btn.textContent || "").toLowerCase();
    if (ariaLabel.includes("выбрано") || ariaLabel.includes("selected") || text.includes("выбрано") || text.includes("selected"))
      return true;
    if (btn.getAttribute("aria-checked") === "true") return true;
    if (btn.getAttribute("aria-pressed") === "true") return true;
    if (btn.getAttribute("aria-current") === "true") return true;
    const dataState = btn.getAttribute("data-state") || ((_a = btn.dataset) == null ? void 0 : _a.state) || "";
    if (dataState === "checked" || dataState === "selected" || dataState === "active") return true;
    const classList = btn.classList;
    if (classList && Array.from(classList).some((c) => c.toLowerCase().includes("selected"))) return true;
    return false;
  };
  var toQualityKey = (quality) => `${quality.height}p${quality.fps}`;
  var parseQuality = (label) => {
    var _a, _b, _c;
    const normalized = String(label).toLowerCase();
    const match = normalized.match(/(\d{3,4})\s*p\s*(\d{2,3})?/i);
    if (match) {
      const height = parseInt((_a = match[1]) != null ? _a : "", 10);
      if (!Number.isFinite(height) || height <= 0) return null;
      const fps = match[2] ? parseInt((_b = match[2]) != null ? _b : "", 10) : 30;
      return { height, fps: Number.isFinite(fps) && fps > 0 ? fps : 30 };
    }
    const numeric = normalized.match(/\b(2160|1440|1080|720|480|360|240|144)\b/);
    if (numeric) return { height: parseInt((_c = numeric[1]) != null ? _c : "", 10), fps: 30 };
    if (normalized.includes("4k")) return { height: 2160, fps: 30 };
    if (normalized.includes("2k")) return { height: 1440, fps: 30 };
    if (normalized.includes("full hd") || normalized.includes("fhd")) return { height: 1080, fps: 30 };
    if (normalized === "hd" || normalized.includes(" hd")) return { height: 720, fps: 30 };
    if (normalized === "sd" || normalized.includes(" sd")) return { height: 480, fps: 30 };
    return null;
  };
  var getQualityItemsFromDocument = (excludeElements = []) => {
    var _a, _b;
    const rawCandidates = Array.from(document.querySelectorAll(QUALITY_CANDIDATE_SELECTOR)).map(toQualityClickTarget);
    const candidates = [];
    const seenCandidates = /* @__PURE__ */ new Set();
    for (const el of rawCandidates) {
      if (seenCandidates.has(el)) continue;
      seenCandidates.add(el);
      candidates.push(el);
    }
    const qualityCandidates = candidates.filter((el) => {
      if (excludeElements.some((ex) => ex === el)) return false;
      if (!isElementVisible(el)) return false;
      const label = extractLabel(el).toLowerCase();
      if (!label) return false;
      if (label.includes("назад") || label.includes("back")) return false;
      if (label.includes("авто") || label.includes("auto")) return false;
      return parseQuality(label) !== null;
    });
    if (qualityCandidates.length === 0) return [];
    const containerCounts = /* @__PURE__ */ new Map();
    for (const el of qualityCandidates) {
      const container = (_a = el.closest('[id*="SettingsPanel"], [id*="settingsPanel"], [role="dialog"], [role="menu"], [role="listbox"]')) != null ? _a : null;
      if (!container) continue;
      containerCounts.set(container, ((_b = containerCounts.get(container)) != null ? _b : 0) + 1);
    }
    let bestContainer = null;
    let bestCount = 0;
    for (const [container, count] of containerCounts.entries()) {
      if (count > bestCount && isElementVisible(container)) {
        bestContainer = container;
        bestCount = count;
      }
    }
    if (!bestContainer) return qualityCandidates;
    const fromBestContainer = qualityCandidates.filter((el) => bestContainer == null ? void 0 : bestContainer.contains(el));
    return fromBestContainer.length > 0 ? fromBestContainer : qualityCandidates;
  };
  var qualityLabelToConfigResolution = (label) => {
    const quality = parseQuality(label);
    if (!quality) return null;
    const height = quality.height;
    if (height >= 2160) return "hd2160";
    if (height >= 1440) return "hd1440";
    if (height >= 1080) return "hd1080";
    if (height >= 720) return "hd720";
    if (height >= 480) return "large";
    if (height >= 360) return "medium";
    if (height >= 240) return "small";
    return "tiny";
  };
  var openQualityMenu = async () => {
    wakeUpUI();
    await sleep(50);
    const gearBtn = getGearBtn();
    if (!gearBtn) return null;
    const panelId = gearBtn.getAttribute("aria-controls") || "raichuSettingsPanel";
    rutubeResState.settingsPanelId = panelId;
    let menuPanel = document.getElementById(panelId);
    const isOpen = menuPanel ? isElementInLayout(menuPanel) : false;
    if (!isOpen) gearBtn.click();
    let retries = 0;
    while (retries < 15) {
      await sleep(50);
      menuPanel = document.getElementById(panelId);
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
  var isAnySettingsPanelOpen = () => {
    const gearBtn = getGearBtn();
    const panelId = rutubeResState.settingsPanelId || (gearBtn == null ? void 0 : gearBtn.getAttribute("aria-controls")) || null;
    if (panelId) {
      const panel = document.getElementById(panelId);
      if (panel && isElementInLayout(panel)) return true;
    }
    return Array.from(document.querySelectorAll('[id*="SettingsPanel"], [id*="settingsPanel"], #raichuSettingsPanel')).some(
      isElementInLayout
    );
  };
  var waitForSettingsPanelClosed = async (timeoutMs) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (!isAnySettingsPanelOpen()) return true;
      await sleep(50);
    }
    return !isAnySettingsPanelOpen();
  };
  var closeSettingsPanel = async () => {
    if (!isAnySettingsPanelOpen()) return;
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true }));
    document.dispatchEvent(new KeyboardEvent("keyup", { key: "Escape", code: "Escape", bubbles: true, cancelable: true }));
    if (await waitForSettingsPanelClosed(500)) return;
    const gearBtn = getGearBtn();
    if (gearBtn && isAnySettingsPanelOpen()) {
      gearBtn.click();
      await waitForSettingsPanelClosed(500);
    }
  };
  var pickBestQualityOption = (candidates) => {
    var _a, _b, _c;
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return (_a = candidates[0]) != null ? _a : null;
    const scored = candidates.map((el) => {
      var _a2;
      let score = 0;
      const role = (el.getAttribute("role") || "").toLowerCase();
      if (role === "menuitemradio" || role === "radio" || role === "option") score += 5;
      if (el.tagName.toLowerCase() === "button") score += 1;
      if (el.getAttribute("aria-checked") !== null) score += 1;
      if (el.getAttribute("data-state") !== null || ((_a2 = el.dataset) == null ? void 0 : _a2.state)) score += 1;
      if (el.getAttribute("aria-controls")) score -= 5;
      if (el.getAttribute("aria-haspopup")) score -= 3;
      if (el.getAttribute("aria-expanded") !== null) score -= 3;
      return { el, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return (_c = (_b = scored[0]) == null ? void 0 : _b.el) != null ? _c : null;
  };
  var scheduleExecution = () => {
    rutubeResState.debounceTimer = setTimeout(async () => {
      enterRutubeStealth();
      try {
        wakeUpUI();
        await sleep(50);
        const menuPanelId = rutubeResState.settingsPanelId || "raichuSettingsPanel";
        const menuPanel = document.getElementById(menuPanelId);
        const itemsInPanel = menuPanel ? getQualityItemsArray(menuPanel) : [];
        const items = itemsInPanel.length > 0 ? itemsInPanel : getQualityItemsFromDocument();
        const effectiveItems = items.length > 0 ? items : await openQualityMenu();
        const normalizedItems = effectiveItems != null ? effectiveItems : [];
        if (normalizedItems.length === 0) {
          RutubeAdapter.showBezelNotification("Quality menu not found");
          return;
        }
        const matches = normalizedItems.filter((btn) => {
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
        rutubeResState.currentSelectionKey = "";
        rutubeResState.debounceTimer = null;
      }
    }, 600);
  };
  var RutubeAdapter = {
    ...GenericAdapter,
    name: "Rutube",
    isMatch: () => window.location.hostname.includes("rutube.ru"),
    getVideoElement: getRutubeVideoElement,
    getPlayer: getRutubePlayer,
    isControlsHidden: function() {
      const controls = document.querySelector('[data-testid="video-ui"]');
      if (controls) {
        if (Array.from(controls.classList).some((c) => c.toLowerCase().includes("hidden"))) return true;
      } else {
        const mainWrapper = getRutubePlayer();
        if (mainWrapper && window.getComputedStyle(mainWrapper).cursor === "none") return true;
      }
      return false;
    },
    updateSpeedIndicator: function() {
      var _a;
      (_a = document.getElementById("yt-speedx-indicator")) == null ? void 0 : _a.remove();
    },
    showBezelNotification: function(text) {
      let wrapper = document.getElementById("yt-speedx-bezel-wrapper");
      const targetParent = document.fullscreenElement || this.getPlayer();
      if (!targetParent) return;
      if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.id = "yt-speedx-bezel-wrapper";
        wrapper.style.position = "absolute";
        wrapper.style.top = "20%";
        wrapper.style.left = "50%";
        wrapper.style.transform = "translateX(-50%)";
        wrapper.style.zIndex = "2147483647";
        wrapper.style.pointerEvents = "none";
        const textElement2 = document.createElement("div");
        textElement2.id = "yt-speedx-bezel-text";
        wrapper.appendChild(textElement2);
      }
      if (wrapper.parentElement !== targetParent) {
        const computedStyle = window.getComputedStyle(targetParent);
        if (computedStyle.position === "static") {
          targetParent.style.position = "relative";
        }
        targetParent.appendChild(wrapper);
      }
      const textElement = document.getElementById("yt-speedx-bezel-text");
      if (textElement) {
        textElement.textContent = text;
        wrapper.classList.remove("yt-speedx-bezel-show");
        void wrapper.offsetHeight;
        wrapper.classList.add("yt-speedx-bezel-show");
      }
    },
    applySpeed: function(videoElement, newSpeed) {
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
    applyResolution: async function() {
      var _a;
      if (CONFIG.resolution === "auto") return;
      const getResNumber = (resStr) => {
        var _a2;
        const normalized = String(resStr).toLowerCase().trim();
        if (normalized === "tiny") return 144;
        if (normalized === "small") return 240;
        if (normalized === "medium") return 360;
        if (normalized === "large") return 480;
        const match = normalized.match(/(\d+)/);
        return match ? parseInt((_a2 = match[1]) != null ? _a2 : "", 10) : 0;
      };
      const targetVal = getResNumber(CONFIG.resolution);
      if (targetVal === 0) return;
      enterRutubeStealth();
      try {
        const items = await openQualityMenu();
        if (!items || items.length === 0) {
          this.showBezelNotification("Quality menu not found");
          return;
        }
        const itemsWithQuality = items.map((btn) => {
          const label = extractLabel(btn);
          const quality = parseQuality(label);
          return quality ? { btn, label, quality } : null;
        }).filter((i) => !!i).sort((a, b) => b.quality.height - a.quality.height || b.quality.fps - a.quality.fps);
        let target = null;
        for (const item of itemsWithQuality) {
          if (item.quality.height <= targetVal) {
            target = item;
            break;
          }
        }
        if (!target && itemsWithQuality.length > 0) target = (_a = itemsWithQuality[itemsWithQuality.length - 1]) != null ? _a : null;
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
    changeResolution: async function(direction) {
      var _a, _b, _c, _d, _e, _f;
      if (rutubeResState.sessionActive) {
        if (rutubeResState.debounceTimer) clearTimeout(rutubeResState.debounceTimer);
        if (rutubeResState.availableKeys.length === 0) {
          rutubeResState.sessionActive = false;
          rutubeResState.availableKeys = [];
          rutubeResState.availableLabelByKey = {};
          rutubeResState.currentSelectionKey = "";
          rutubeResState.currentSelectionText = "";
          rutubeResState.debounceTimer = null;
          await closeSettingsPanel();
          exitRutubeStealth();
          return;
        }
        let currentIndex2 = rutubeResState.availableKeys.indexOf(rutubeResState.currentSelectionKey);
        if (currentIndex2 === -1) currentIndex2 = 0;
        let newIndex2 = currentIndex2;
        if (direction === "up") newIndex2--;
        else newIndex2++;
        if (newIndex2 < 0) newIndex2 = 0;
        if (newIndex2 >= rutubeResState.availableKeys.length) newIndex2 = rutubeResState.availableKeys.length - 1;
        rutubeResState.currentSelectionKey = (_a = rutubeResState.availableKeys[newIndex2]) != null ? _a : "";
        rutubeResState.currentSelectionText = (_b = rutubeResState.availableLabelByKey[rutubeResState.currentSelectionKey]) != null ? _b : "";
        this.showBezelNotification(rutubeResState.currentSelectionText);
        scheduleExecution();
        return;
      }
      rutubeResState.sessionActive = true;
      enterRutubeStealth();
      const items = await openQualityMenu();
      if (!items || items.length === 0) {
        rutubeResState.sessionActive = false;
        this.showBezelNotification("Quality menu not found");
        await closeSettingsPanel();
        exitRutubeStealth();
        return;
      }
      const itemsWithQuality = items.map((btn) => {
        const label = extractLabel(btn);
        const quality = parseQuality(label);
        return quality ? { btn, label, quality, key: toQualityKey(quality), selected: isSelectedQualityOption(btn) } : null;
      }).filter((i) => !!i);
      const uniqueByKey = /* @__PURE__ */ new Map();
      for (const item of itemsWithQuality) {
        const existing = uniqueByKey.get(item.key);
        if (!existing) uniqueByKey.set(item.key, { label: item.label, quality: item.quality, selected: item.selected });
        else if (item.selected) existing.selected = true;
      }
      const sortedOptions = Array.from(uniqueByKey.entries()).map(([key, val]) => ({ key, ...val })).sort((a, b) => b.quality.height - a.quality.height || b.quality.fps - a.quality.fps);
      rutubeResState.availableKeys = sortedOptions.map((o) => o.key);
      rutubeResState.availableLabelByKey = Object.fromEntries(sortedOptions.map((o) => [o.key, o.label]));
      if (rutubeResState.availableKeys.length === 0) {
        rutubeResState.sessionActive = false;
        this.showBezelNotification("Quality menu not found");
        await closeSettingsPanel();
        exitRutubeStealth();
        return;
      }
      const selectedKey = (_d = (_c = sortedOptions.find((o) => o.selected)) == null ? void 0 : _c.key) != null ? _d : "";
      let currentIndex = rutubeResState.availableKeys.indexOf(selectedKey);
      if (currentIndex === -1) currentIndex = 0;
      let newIndex = currentIndex;
      if (direction === "up") newIndex--;
      else newIndex++;
      if (newIndex < 0) newIndex = 0;
      if (newIndex >= rutubeResState.availableKeys.length) newIndex = rutubeResState.availableKeys.length - 1;
      rutubeResState.currentSelectionKey = (_e = rutubeResState.availableKeys[newIndex]) != null ? _e : "";
      rutubeResState.currentSelectionText = (_f = rutubeResState.availableLabelByKey[rutubeResState.currentSelectionKey]) != null ? _f : "";
      this.showBezelNotification(rutubeResState.currentSelectionText);
      scheduleExecution();
    },
    onInit: function() {
      ensureRutubeStealthStyles();
      let lastSrc = "";
      setInterval(() => {
        const video = this.getVideoElement();
        if (!video) return;
        if (video.src !== lastSrc) {
          lastSrc = video.src;
          video.playbackRate = CONFIG.speed;
          video.defaultPlaybackRate = CONFIG.speed;
          this.updateSpeedIndicator();
          if (!video.dataset.rateListenerAttached) {
            video.addEventListener("ratechange", () => this.updateSpeedIndicator());
            video.dataset.rateListenerAttached = "true";
          }
          setTimeout(() => void this.applyResolution(), 2500);
        }
      }, 1e3);
    }
  };

  // src/adapters/smotrim.ts
  var SmotrimAdapter = {
    ...GenericAdapter,
    name: "Smotrim",
    isMatch: () => window.location.hostname.includes("smotrim.ru")
  };

  // src/adapters/telegram.ts
  var TelegramWebAdapter = {
    ...GenericAdapter,
    name: "Telegram Web",
    isMatch: () => window.location.hostname.includes("web.telegram.org")
  };

  // src/adapters/twitch.ts
  var TwitchAdapter = {
    ...GenericAdapter,
    name: "Twitch",
    isMatch: () => window.location.hostname.includes("twitch.tv")
  };

  // src/adapters/vgtrk.ts
  var VgtrkAdapter = {
    ...GenericAdapter,
    name: "VGTRK",
    isMatch: () => window.location.hostname.includes("vgtrk.com")
  };

  // src/adapters/vkvideo.ts
  var VkVideoAdapter = {
    ...GenericAdapter,
    name: "VK Video",
    isMatch: () => window.location.hostname.includes("vkvideo.ru")
  };

  // src/adapters/yandexDisk.ts
  var YandexDiskAdapter = {
    ...GenericAdapter,
    name: "Yandex.Disk",
    isMatch: () => window.location.hostname.includes("disk.yandex.ru")
  };

  // src/adapters/youtube.ts
  var qualityChangeState = {
    debounceTimer: null,
    targetQualityIndex: -1,
    availableQualityData: []
  };
  var getFormattedTime = (seconds) => {
    const safeSeconds = Math.max(seconds, 0);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor(safeSeconds % 3600 / 60);
    const secs = Math.floor(safeSeconds % 60);
    const pad = (num) => String(num).padStart(2, "0");
    return `${hours > 0 ? `${hours}:` : ""}${pad(minutes)}:${pad(secs)}`;
  };
  var YouTubeAdapter = {
    ...GenericAdapter,
    name: "YouTube",
    isMatch: () => window.location.hostname.includes("youtube.com"),
    getPlayer: () => document.getElementById("movie_player"),
    isControlsHidden: function() {
      const player = this.getPlayer();
      return player ? player.classList.contains("ytp-autohide") : false;
    },
    showBezelNotification: function(text) {
      const wrapper = document.getElementById("yt-speedx-bezel-wrapper");
      const textElement = document.getElementById("yt-speedx-bezel-text");
      if (!wrapper || !textElement) return;
      textElement.textContent = text;
      wrapper.classList.remove("yt-speedx-bezel-show");
      void wrapper.offsetHeight;
      wrapper.classList.add("yt-speedx-bezel-show");
    },
    updateSpeedIndicator: function() {
      const player = this.getPlayer();
      const videoElement = this.getVideoElement();
      const timeContainer = document.querySelector(".ytp-time-display .ytp-time-contents");
      if (!player || !videoElement || !timeContainer || typeof player.getDuration !== "function") return;
      let indicator = document.getElementById("yt-speedx-indicator");
      if (!indicator) {
        indicator = document.createElement("span");
        indicator.id = "yt-speedx-indicator";
        indicator.className = "ytp-time-separator";
        timeContainer.appendChild(indicator);
      }
      const currentSpeed = videoElement.playbackRate;
      if (currentSpeed !== 1) {
        const adjustedDuration = player.getDuration() / currentSpeed;
        indicator.innerText = ` / ${formatSpeed(currentSpeed)}x`;
        indicator.title = `Adjusted duration: ${getFormattedTime(adjustedDuration)}`;
        indicator.style.display = "inline";
      } else {
        indicator.style.display = "none";
      }
    },
    applySpeed: function(videoElement, newSpeed, currentSpeed = videoElement == null ? void 0 : videoElement.playbackRate) {
      const player = this.getPlayer();
      if (!player || !videoElement) return;
      const normalizedSpeed = normalizeSpeed(newSpeed);
      if (normalizedSpeed === null) return;
      CONFIG.speed = normalizedSpeed;
      saveConfig();
      videoElement.playbackRate = CONFIG.speed;
      if (CONFIG.speed > 2) {
        this.showBezelNotification(`${formatSpeed(CONFIG.speed)}x`);
      } else if ((currentSpeed != null ? currentSpeed : 1) > 2 && CONFIG.speed === 2) {
        this.showBezelNotification("2x");
      } else if (typeof player.setPlaybackRate === "function") {
        player.setPlaybackRate(CONFIG.speed);
      }
    },
    applyResolution: function(playerArg) {
      const player = playerArg != null ? playerArg : this.getPlayer();
      if (!player || typeof player.getAvailableQualityLevels !== "function") return;
      const availableLevels = player.getAvailableQualityLevels();
      const desiredLevel = CONFIG.resolution;
      if (availableLevels.includes(desiredLevel)) {
        player.setPlaybackQualityRange(desiredLevel);
      } else if (availableLevels.length > 0) {
        player.setPlaybackQualityRange(availableLevels[0]);
      }
    },
    changeResolution: function(direction) {
      var _a;
      const player = this.getPlayer();
      if (typeof (player == null ? void 0 : player.getAvailableQualityData) !== "function") return;
      if (!qualityChangeState.debounceTimer) {
        qualityChangeState.availableQualityData = (_a = player.getAvailableQualityData()) != null ? _a : [];
        if (qualityChangeState.availableQualityData.length === 0) return;
        const currentQuality = player.getPlaybackQuality();
        qualityChangeState.targetQualityIndex = qualityChangeState.availableQualityData.findIndex((q) => q.quality === currentQuality);
        if (qualityChangeState.targetQualityIndex === -1) qualityChangeState.targetQualityIndex = 0;
      }
      let newIndex = qualityChangeState.targetQualityIndex;
      if (direction === "up" && newIndex > 0) newIndex--;
      else if (direction === "down" && newIndex < qualityChangeState.availableQualityData.length - 1) newIndex++;
      qualityChangeState.targetQualityIndex = newIndex;
      const newQualityInfo = qualityChangeState.availableQualityData[qualityChangeState.targetQualityIndex];
      if (newQualityInfo == null ? void 0 : newQualityInfo.qualityLabel) {
        this.showBezelNotification(newQualityInfo.qualityLabel);
      }
      if (qualityChangeState.debounceTimer) clearTimeout(qualityChangeState.debounceTimer);
      qualityChangeState.debounceTimer = setTimeout(() => {
        const finalQualityInfo = qualityChangeState.availableQualityData[qualityChangeState.targetQualityIndex];
        if (finalQualityInfo) {
          player.setPlaybackQualityRange(finalQualityInfo.quality);
          CONFIG.resolution = finalQualityInfo.quality;
          saveConfig();
        }
        qualityChangeState.debounceTimer = null;
        qualityChangeState.targetQualityIndex = -1;
        qualityChangeState.availableQualityData = [];
      }, 350);
    }
  };

  // src/adapters/index.ts
  var platformAdapters = [
    YouTubeAdapter,
    RutubeAdapter,
    SmotrimAdapter,
    IviAdapter,
    VgtrkAdapter,
    TwitchAdapter,
    VkVideoAdapter,
    TelegramWebAdapter,
    YandexDiskAdapter,
    GenericAdapter
  ];
  var getActiveAdapter = () => {
    var _a;
    return (_a = platformAdapters.find((adapter) => adapter.isMatch())) != null ? _a : GenericAdapter;
  };

  // src/core/bezel.ts
  var ensureCustomBezel = (activeAdapter) => {
    if (activeAdapter.name === "Rutube") return;
    if (document.getElementById("yt-speedx-bezel-wrapper")) return;
    const player = document.getElementById("movie_player");
    if (!player) return;
    const wrapper = document.createElement("div");
    wrapper.id = "yt-speedx-bezel-wrapper";
    const textElement = document.createElement("div");
    textElement.id = "yt-speedx-bezel-text";
    wrapper.appendChild(textElement);
    player.appendChild(wrapper);
  };

  // src/core/fpsPatch.ts
  var filterFormatsByMax60FpsQuality = (formats, max60FpsQuality) => {
    if (max60FpsQuality === "unlimited") return formats;
    const qualityHeightMap = {
      "1080": 1080,
      "720": 720,
      "480": 480,
      "disabled": 0
    };
    const limit = qualityHeightMap[max60FpsQuality];
    if (typeof limit === "undefined") return formats;
    return formats.filter((format) => {
      var _a;
      if (format && typeof format.qualityLabel === "string") {
        const match = format.qualityLabel.match(/(\d+)p(\d+)?/);
        if (match) {
          const height = parseInt((_a = match[1]) != null ? _a : "", 10);
          const fps = match[2] ? parseInt(match[2], 10) : 30;
          if (fps > 30 && height > limit) return false;
        }
      }
      return true;
    });
  };
  var patchPlayerForFPS = (player) => {
    if (!player || player.isPatchedForFPS) return;
    const originalGetAvailableQualityData = player.getAvailableQualityData;
    if (typeof originalGetAvailableQualityData !== "function") return;
    player.getAvailableQualityData = function(...args) {
      const [bypassFilter] = args;
      const allFormats = originalGetAvailableQualityData.apply(player, args);
      if (bypassFilter) return allFormats;
      return filterFormatsByMax60FpsQuality(allFormats, CONFIG.max60FpsQuality);
    };
    player.getAvailableQualityLevels = function() {
      return player.getAvailableQualityData().map((format) => format.quality);
    };
    player.isPatchedForFPS = true;
  };

  // src/core/progressBar.ts
  var ensureFullscreenProgressBar = () => {
    if (document.getElementById("yt-speedx-progress-bar")) return;
    const bar = document.createElement("div");
    bar.id = "yt-speedx-progress-bar";
    document.body.appendChild(bar);
  };
  var updateProgressBarVisibility = (activeAdapter) => {
    let progressBar = document.getElementById("yt-speedx-progress-bar");
    if (!progressBar) {
      ensureFullscreenProgressBar();
      progressBar = document.getElementById("yt-speedx-progress-bar");
    }
    const player = activeAdapter.getPlayer();
    if (!progressBar || !player) return;
    const isFullscreen = !!document.fullscreenElement;
    const targetParent = isFullscreen ? document.fullscreenElement : document.body;
    if (progressBar.parentElement !== targetParent) targetParent.appendChild(progressBar);
    const controlsHidden = activeAdapter.isControlsHidden();
    if (CONFIG.enableFullscreenProgress && isFullscreen && controlsHidden) {
      progressBar.style.display = "block";
      progressBar.style.opacity = String(CONFIG.progressBarOpacity);
    } else {
      progressBar.style.display = "none";
    }
  };

  // src/core/settingsUi.ts
  var initSettingsUI = (activeAdapter, updateProgressBarVisibility2) => {
    if (document.getElementById("yt-speedx-modal") && document.getElementById("yt-speedx-overlay")) {
      const existingOpen = () => {
        const overlay2 = document.getElementById("yt-speedx-overlay");
        const modal2 = document.getElementById("yt-speedx-modal");
        overlay2.style.display = "block";
        modal2.style.display = "flex";
      };
      return { openModal: existingOpen };
    }
    const overlay = document.createElement("div");
    overlay.id = "yt-speedx-overlay";
    const modal = document.createElement("div");
    modal.id = "yt-speedx-modal";
    const header = document.createElement("div");
    header.className = "yt-speedx-modal-header";
    const title = document.createElement("h2");
    title.textContent = `${activeAdapter.name} SpeedX Settings`;
    const closeBtn = document.createElement("button");
    closeBtn.id = "yt-speedx-close-btn";
    closeBtn.textContent = "×";
    header.append(title, closeBtn);
    const body = document.createElement("div");
    body.className = "yt-speedx-modal-body";
    const settingsGrid = document.createElement("div");
    settingsGrid.className = "yt-speedx-grid";
    const mainSettingConfigs = [
      { id: "speed", label: "Default Speed", elementType: "input", props: { type: "number", step: "0.05", min: "0.1", max: "16" } },
      { id: "step", label: "Adjustment Step", elementType: "input", props: { type: "number", step: "0.05", min: "0.05", max: "5" } },
      {
        id: "res",
        label: "Default Resolution",
        elementType: "select",
        options: [
          { value: "auto", text: "Auto" },
          { value: "hd2160", text: "2160p (4K)" },
          { value: "hd1440", text: "1440p" },
          { value: "hd1080", text: "1080p" },
          { value: "hd720", text: "720p" },
          { value: "large", text: "480p" },
          { value: "medium", text: "360p" },
          { value: "small", text: "240p" },
          { value: "tiny", text: "144p" }
        ]
      },
      {
        id: "max-fps-quality",
        label: "Max 60 FPS Quality",
        elementType: "select",
        options: [
          { value: "unlimited", text: "Unlimited" },
          { value: "1080", text: "Max 1080p" },
          { value: "720", text: "Max 720p" },
          { value: "480", text: "Max 480p" },
          { value: "disabled", text: "Disable 60 FPS" }
        ]
      },
      { id: "h264", label: "Force H.264 Codec", elementType: "input", props: { type: "checkbox", className: "yt-speedx-checkbox" } },
      { id: "fullscreen-progress", label: "Fullscreen Progress Bar", elementType: "input", props: { type: "checkbox", className: "yt-speedx-checkbox" } },
      { id: "progress-opacity", label: "Progress Bar Opacity", elementType: "input", props: { type: "number", step: "0.1", min: "0.1", max: "1" } }
    ];
    mainSettingConfigs.forEach((config) => {
      const label = document.createElement("label");
      label.htmlFor = `yt-speedx-${config.id}`;
      label.textContent = config.label;
      const element = document.createElement(config.elementType);
      element.id = `yt-speedx-${config.id}`;
      if (config.props) Object.assign(element, config.props);
      if (config.options) {
        config.options.forEach((opt) => {
          const option = document.createElement("option");
          option.value = opt.value;
          option.textContent = opt.text;
          element.appendChild(option);
        });
      }
      settingsGrid.append(label, element);
    });
    const hr1 = document.createElement("hr");
    const hotkeysTitle = document.createElement("h3");
    const smallText = document.createElement("small");
    smallText.textContent = "(uses physical key location)";
    hotkeysTitle.append("Hotkeys ", smallText);
    const hotkeysGrid = document.createElement("div");
    hotkeysGrid.className = "yt-speedx-grid";
    const hotkeyConfigs = [
      { id: "res-down-key", label: "Decrease Resolution" },
      { id: "res-up-key", label: "Increase Resolution" },
      { id: "settings-key", label: "Open Settings (Ctrl+Alt+)" }
    ];
    hotkeyConfigs.forEach((config) => {
      const lbl = document.createElement("label");
      lbl.htmlFor = `yt-speedx-${config.id}`;
      lbl.textContent = config.label;
      const input = document.createElement("input");
      Object.assign(input, { id: `yt-speedx-${config.id}`, type: "text", className: "yt-speedx-hotkey-input", readOnly: true });
      hotkeysGrid.append(lbl, input);
    });
    const hr2 = document.createElement("hr");
    const boostTitle = document.createElement("h3");
    boostTitle.textContent = "Speed Boost";
    const boostGrid = document.createElement("div");
    boostGrid.className = "yt-speedx-grid";
    const boostConfigs = [
      { id: "boost-enable", label: "Enable Speed Boost", elementType: "input", props: { type: "checkbox", className: "yt-speedx-checkbox" } },
      { id: "boost-speed", label: "Boost Speed (x)", elementType: "input", props: { type: "number", step: "0.05", min: "0.1", max: "16" } },
      { id: "boost-key", label: "Boost Hotkey", elementType: "input", props: { type: "text", className: "yt-speedx-hotkey-input", readOnly: true } }
    ];
    boostConfigs.forEach((config) => {
      const lbl = document.createElement("label");
      lbl.htmlFor = `yt-speedx-${config.id}`;
      lbl.textContent = config.label;
      const input = document.createElement(config.elementType);
      Object.assign(input, { id: `yt-speedx-${config.id}`, ...config.props });
      boostGrid.append(lbl, input);
    });
    body.append(settingsGrid, hr1, hotkeysTitle, hotkeysGrid, hr2, boostTitle, boostGrid);
    const footer = document.createElement("div");
    footer.className = "yt-speedx-modal-footer";
    const saveBtn = document.createElement("button");
    saveBtn.id = "yt-speedx-save-btn";
    saveBtn.textContent = "Save and Close";
    footer.appendChild(saveBtn);
    modal.append(header, body, footer);
    document.body.append(overlay, modal);
    GM_addStyle(`
    @keyframes ytSpeedX-text-fadeout { 0% { opacity: 0; } 25%, 75% { opacity: 1; } 100% { opacity: 0; } }
    #yt-speedx-bezel-wrapper { text-align: center; position: absolute; left: 0; right: 0; top: 15%; z-index: 2500; pointer-events: none; opacity: 0; }
    #yt-speedx-bezel-wrapper.yt-speedx-bezel-show { animation: ytSpeedX-text-fadeout 1s cubic-bezier(.05,0,0,1) forwards; }
    #yt-speedx-bezel-text { display: inline-block; padding: 10px 20px; font-size: 175%; border-radius: 3px; color: #fff; -webkit-backdrop-filter: var(--yt-frosted-glass-backdrop-filter-override,blur(16px)); backdrop-filter: var(--yt-frosted-glass-backdrop-filter-override,blur(16px)); background: var(--yt-spec-overlay-background-medium,rgba(0,0,0,.6)); text-shadow: 0 0 2px rgba(0,0,0,0.5); }

    .ytp-panel-menu { display: flex; flex-direction: column; }
    #yt-speedx-menu-item { order: -1; }

    #yt-speedx-progress-bar { display: none; position: fixed !important; bottom: 0 !important; left: 0 !important; width: 0%; height: 1px !important; background-color: #f00 !important; z-index: 2147483647 !important; pointer-events: none; transition: width 0.1s linear, opacity 0.2s ease; }

    #yt-speedx-overlay { display: none; position: fixed; z-index: 2500; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); }
    #yt-speedx-modal { display: none; flex-direction: column; max-height: 85vh; position: fixed; z-index: 2501; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #212121; color: #fff; border: 1px solid #3e3e3e; border-radius: 12px; width: 500px; max-width: 90vw; font-family: "Roboto", "Arial", sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }

    .yt-speedx-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-bottom: 1px solid #3e3e3e; }
    .yt-speedx-modal-header h2 { margin: 0; font-size: 1.4em; font-weight: 500; }
    #yt-speedx-close-btn { background: none; border: none; color: #aaa; font-size: 2em; line-height: 1; cursor: pointer; padding: 0; transition: color 0.2s; }
    #yt-speedx-close-btn:hover { color: #fff; }

    .yt-speedx-modal-body { padding: 16px 24px; overflow-y: auto; flex: 1; }
    .yt-speedx-modal-body::-webkit-scrollbar { width: 8px; }
    .yt-speedx-modal-body::-webkit-scrollbar-thumb { background: #555; border-radius: 4px; }
    .yt-speedx-modal-body hr { border: 0; border-top: 1px solid #3e3e3e; margin: 20px 0; }
    .yt-speedx-modal-body h3 { margin-top: 0; margin-bottom: 12px; font-weight: 500; display: flex; align-items: center; gap: 8px; }
    .yt-speedx-modal-body h3 small { font-size: 0.8em; color: #aaa; font-weight: 400; }

    .yt-speedx-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; align-items: center; }
    .yt-speedx-grid label { font-size: 0.95em; color: #eee; }

    #yt-speedx-modal input[type="number"], #yt-speedx-modal input[type="text"], #yt-speedx-modal select { background: #181818; color: #fff; border: 1px solid #3e3e3e; border-radius: 4px; padding: 8px 12px; width: 100%; box-sizing: border-box; font-size: 1em; }
    #yt-speedx-modal input:focus, #yt-speedx-modal select:focus { outline: none; border-color: #3ea6ff; box-shadow: 0 0 0 1px #3ea6ff; }
    .yt-speedx-hotkey-input { text-align: center; font-weight: bold; cursor: pointer; }

    .yt-speedx-checkbox { appearance: none; -webkit-appearance: none; position: relative; width: 40px; height: 20px; background: #3e3e3e; border-radius: 20px; cursor: pointer; justify-self: start; }
    .yt-speedx-checkbox::before { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; background: #fff; border-radius: 50%; transition: left 0.2s; }
    .yt-speedx-checkbox:checked { background: #3ea6ff; }
    .yt-speedx-checkbox:checked::before { left: 22px; }

    .yt-speedx-modal-footer { display: flex; justify-content: flex-end; padding: 16px 24px; border-top: 1px solid #3e3e3e; background: rgba(255,255,255,0.05); border-radius: 0 0 12px 12px;}
    #yt-speedx-save-btn { background-color: #3ea6ff; color: #fff; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 1em; font-weight: bold; transition: background-color 0.2s; }
    #yt-speedx-save-btn:hover { background-color: #66baff; }
  `);
    const openModal = () => {
      document.getElementById("yt-speedx-speed").value = String(CONFIG.speed);
      document.getElementById("yt-speedx-step").value = String(CONFIG.ADJUSTMENT_STEP);
      document.getElementById("yt-speedx-res").value = CONFIG.resolution;
      document.getElementById("yt-speedx-h264").checked = CONFIG.useH264;
      document.getElementById("yt-speedx-max-fps-quality").value = CONFIG.max60FpsQuality;
      document.getElementById("yt-speedx-fullscreen-progress").checked = CONFIG.enableFullscreenProgress;
      document.getElementById("yt-speedx-progress-opacity").value = String(CONFIG.progressBarOpacity);
      document.getElementById("yt-speedx-res-down-key").value = CONFIG.RES_DOWN_KEY;
      document.getElementById("yt-speedx-res-up-key").value = CONFIG.RES_UP_KEY;
      document.getElementById("yt-speedx-settings-key").value = CONFIG.SETTINGS_KEY;
      document.getElementById("yt-speedx-boost-enable").checked = CONFIG.enableSpeedBoost;
      document.getElementById("yt-speedx-boost-key").value = CONFIG.BOOST_KEY;
      document.getElementById("yt-speedx-boost-speed").value = String(CONFIG.BOOST_SPEED);
      overlay.style.display = "block";
      modal.style.display = "flex";
    };
    const closeModal = () => {
      overlay.style.display = "none";
      modal.style.display = "none";
    };
    const saveAndClose = () => {
      var _a, _b, _c, _d;
      const wasH264Enabled = CONFIG.useH264;
      const wasMaxFpsQuality = CONFIG.max60FpsQuality;
      const prevSpeed = CONFIG.speed;
      const prevStep = CONFIG.ADJUSTMENT_STEP;
      const prevOpacity = CONFIG.progressBarOpacity;
      const prevBoostSpeed = CONFIG.BOOST_SPEED;
      CONFIG.speed = (_a = normalizeSpeed(document.getElementById("yt-speedx-speed").value, prevSpeed)) != null ? _a : prevSpeed;
      CONFIG.ADJUSTMENT_STEP = (_b = normalizeStep(document.getElementById("yt-speedx-step").value, prevStep)) != null ? _b : prevStep;
      CONFIG.resolution = document.getElementById("yt-speedx-res").value;
      CONFIG.useH264 = document.getElementById("yt-speedx-h264").checked;
      CONFIG.max60FpsQuality = document.getElementById("yt-speedx-max-fps-quality").value;
      CONFIG.enableFullscreenProgress = document.getElementById("yt-speedx-fullscreen-progress").checked;
      CONFIG.progressBarOpacity = (_c = normalizeOpacity(document.getElementById("yt-speedx-progress-opacity").value, prevOpacity)) != null ? _c : prevOpacity;
      CONFIG.RES_DOWN_KEY = document.getElementById("yt-speedx-res-down-key").value;
      CONFIG.RES_UP_KEY = document.getElementById("yt-speedx-res-up-key").value;
      CONFIG.SETTINGS_KEY = document.getElementById("yt-speedx-settings-key").value;
      CONFIG.enableSpeedBoost = document.getElementById("yt-speedx-boost-enable").checked;
      CONFIG.BOOST_KEY = document.getElementById("yt-speedx-boost-key").value;
      CONFIG.BOOST_SPEED = (_d = normalizeSpeed(document.getElementById("yt-speedx-boost-speed").value, prevBoostSpeed)) != null ? _d : prevBoostSpeed;
      saveConfig();
      closeModal();
      updateProgressBarVisibility2();
      if (wasH264Enabled !== CONFIG.useH264 || wasMaxFpsQuality !== CONFIG.max60FpsQuality) {
        alert("Codec or frame rate settings will take effect after reloading the page.");
      }
    };
    saveBtn.addEventListener("click", saveAndClose);
    closeBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", closeModal);
    document.querySelectorAll(".yt-speedx-hotkey-input").forEach((input) => {
      input.addEventListener("focus", () => {
        input.value = "Press a key...";
      });
      input.addEventListener("blur", () => {
        const configKey = input.id.replace("yt-speedx-", "").replace(/-/g, "_").toUpperCase();
        if (input.value === "Press a key...") input.value = String(CONFIG[configKey] || "");
      });
      input.addEventListener("keydown", (e) => {
        e.preventDefault();
        if (e.code) {
          input.value = e.code;
          input.blur();
        }
      });
    });
    return { openModal };
  };

  // src/core/youtubeMenuObserver.ts
  var menuObserver = null;
  var stopYouTubeMenuObserver = () => {
    if (menuObserver) menuObserver.disconnect();
    menuObserver = null;
  };
  var startYouTubeMenuObserver = (player, openModalCallback) => {
    stopYouTubeMenuObserver();
    const createSettingsMenuItem = () => {
      const menuItem = document.createElement("div");
      menuItem.className = "ytp-menuitem";
      menuItem.id = "yt-speedx-menu-item";
      const iconContainer = document.createElement("div");
      iconContainer.className = "ytp-menuitem-icon";
      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("height", "24");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("width", "24");
      svg.setAttribute("fill", "white");
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", "M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z");
      svg.appendChild(path);
      iconContainer.appendChild(svg);
      const label = document.createElement("div");
      label.className = "ytp-menuitem-label";
      label.textContent = "YouTube SpeedX Settings";
      const content = document.createElement("div");
      content.className = "ytp-menuitem-content";
      menuItem.append(iconContainer, label, content);
      menuItem.addEventListener("click", () => {
        const settingsButton = document.querySelector(".ytp-settings-button");
        if (settingsButton) settingsButton.click();
        openModalCallback();
      });
      return menuItem;
    };
    menuObserver = new MutationObserver(() => {
      const panelMenu = document.querySelector(".ytp-panel-menu");
      if (!panelMenu) return;
      const panel = panelMenu.closest(".ytp-panel");
      const isRootMenu = !!panel && !panel.querySelector(".ytp-panel-back-button");
      const hasMenuItem = !!panelMenu.querySelector("#yt-speedx-menu-item");
      if (isRootMenu && !hasMenuItem) {
        const newItem = createSettingsMenuItem();
        panelMenu.prepend(newItem);
      }
    });
    menuObserver.observe(player, { childList: true, subtree: true });
  };

  // src/app.ts
  var progressObserver = null;
  var runApp = () => {
    const activeAdapter = getActiveAdapter();
    const updateProgressBarVisibilityBound = () => updateProgressBarVisibility(activeAdapter);
    const { openModal } = initSettingsUI(activeAdapter, updateProgressBarVisibilityBound);
    const initializePlayer = async (openModalCallback) => {
      if (activeAdapter.onInit) activeAdapter.onInit();
      if (activeAdapter.name !== "YouTube") {
        const video = activeAdapter.getVideoElement();
        if (video) {
          activeAdapter.applySpeed(video, CONFIG.speed);
          if (activeAdapter.name === "Rutube") {
            activeAdapter.updateSpeedIndicator();
          }
        }
      }
      let player = null;
      let attempts = 0;
      while (attempts < 20) {
        player = activeAdapter.getPlayer();
        const isReady = activeAdapter.name === "YouTube" ? player && typeof player.getPlaybackRate === "function" && typeof player.getAvailableQualityData === "function" : player || activeAdapter.getVideoElement();
        if (isReady) {
          const videoElement = activeAdapter.getVideoElement();
          if (videoElement) {
            ensureCustomBezel(activeAdapter);
            ensureFullscreenProgressBar();
            if (activeAdapter.name === "YouTube") {
              patchPlayerForFPS(player);
              startYouTubeMenuObserver(player, openModalCallback);
              activeAdapter.applyResolution(player);
            }
            activeAdapter.applySpeed(videoElement, CONFIG.speed, CONFIG.speed);
            if (!videoElement.dataset.rateListenerAttached) {
              videoElement.addEventListener("ratechange", () => activeAdapter.updateSpeedIndicator());
              videoElement.dataset.rateListenerAttached = "true";
            }
            if (!videoElement.dataset.timeUpdateListener) {
              videoElement.addEventListener("timeupdate", () => {
                const bar = document.getElementById("yt-speedx-progress-bar");
                if (bar && videoElement.duration) {
                  const progress = videoElement.currentTime / videoElement.duration * 100;
                  bar.style.width = `${progress}%`;
                }
                if (activeAdapter.name === "Rutube") updateProgressBarVisibilityBound();
              });
              videoElement.dataset.timeUpdateListener = "true";
            }
            if (!document.body.dataset.ytSpeedxGlobalListeners) {
              document.addEventListener("fullscreenchange", updateProgressBarVisibilityBound);
              document.body.dataset.ytSpeedxGlobalListeners = "true";
            }
            if (progressObserver) progressObserver.disconnect();
            if (activeAdapter.name === "YouTube") {
              progressObserver = new MutationObserver(updateProgressBarVisibilityBound);
              progressObserver.observe(player, { attributes: true, attributeFilter: ["class"] });
            }
            activeAdapter.updateSpeedIndicator();
            updateProgressBarVisibilityBound();
            return;
          }
        }
        await sleep(500);
        attempts++;
      }
    };
    const boundInitializePlayer = () => void initializePlayer(openModal);
    boundInitializePlayer();
    if (activeAdapter.name === "YouTube") {
      window.addEventListener("yt-navigate-finish", boundInitializePlayer);
    }
    let originalSpeedBeforeBoost = null;
    const cancelBoost = () => {
      if (originalSpeedBeforeBoost === null) return;
      const videoElement = activeAdapter.getVideoElement();
      if (videoElement) {
        videoElement.playbackRate = originalSpeedBeforeBoost;
        activeAdapter.showBezelNotification(`${formatSpeed(originalSpeedBeforeBoost)}x`);
      }
      originalSpeedBeforeBoost = null;
    };
    window.addEventListener(
      "keydown",
      (event) => {
        var _a, _b, _c;
        if (((_a = event.target) == null ? void 0 : _a.isContentEditable) || ["INPUT", "TEXTAREA", "SELECT"].includes(((_b = event.target) == null ? void 0 : _b.tagName) || "") || ((_c = document.getElementById("yt-speedx-modal")) == null ? void 0 : _c.style.display) === "flex")
          return;
        if (CONFIG.enableSpeedBoost && event.code === CONFIG.BOOST_KEY && !event.repeat) {
          if (originalSpeedBeforeBoost === null) {
            const videoElement2 = activeAdapter.getVideoElement();
            if (!videoElement2) return;
            const normalizedBoostSpeed = normalizeSpeed(CONFIG.BOOST_SPEED);
            if (normalizedBoostSpeed === null) return;
            originalSpeedBeforeBoost = videoElement2.playbackRate;
            CONFIG.BOOST_SPEED = normalizedBoostSpeed;
            videoElement2.playbackRate = CONFIG.BOOST_SPEED;
            activeAdapter.showBezelNotification(`${formatSpeed(CONFIG.BOOST_SPEED)}x Boost`);
            event.preventDefault();
            event.stopImmediatePropagation();
          }
          return;
        }
        if (originalSpeedBeforeBoost !== null) {
          const videoElement2 = activeAdapter.getVideoElement();
          if (!videoElement2) return;
          let boostHandled = false;
          let newBoostSpeed = CONFIG.BOOST_SPEED;
          if (event.shiftKey && !event.ctrlKey && !event.altKey) {
            if (event.code === "Period") {
              newBoostSpeed += CONFIG.ADJUSTMENT_STEP;
              boostHandled = true;
            } else if (event.code === "Comma") {
              newBoostSpeed -= CONFIG.ADJUSTMENT_STEP;
              boostHandled = true;
            }
          } else if (!event.shiftKey && !event.ctrlKey && !event.altKey && event.code.startsWith("Digit")) {
            const digit = parseInt(event.code.replace("Digit", ""), 10);
            if (digit >= 1 && digit <= 9) {
              newBoostSpeed = digit;
              boostHandled = true;
            }
          }
          if (boostHandled) {
            const normalizedBoostSpeed = normalizeSpeed(newBoostSpeed);
            if (normalizedBoostSpeed === null) return;
            CONFIG.BOOST_SPEED = normalizedBoostSpeed;
            videoElement2.playbackRate = CONFIG.BOOST_SPEED;
            activeAdapter.showBezelNotification(`${formatSpeed(CONFIG.BOOST_SPEED)}x Boost`);
            saveConfig();
            event.preventDefault();
            event.stopImmediatePropagation();
          }
          return;
        }
        if (event.ctrlKey && event.altKey && event.code === CONFIG.SETTINGS_KEY) {
          event.preventDefault();
          event.stopImmediatePropagation();
          openModal();
          return;
        }
        const videoElement = activeAdapter.getVideoElement();
        if (!videoElement) return;
        if (event.shiftKey && !event.ctrlKey && !event.altKey) {
          const currentSpeed = videoElement.playbackRate;
          let speedHandled = false;
          if (event.code === "Period") {
            activeAdapter.applySpeed(videoElement, currentSpeed + CONFIG.ADJUSTMENT_STEP, currentSpeed);
            speedHandled = true;
          } else if (event.code === "Comma") {
            activeAdapter.applySpeed(videoElement, currentSpeed - CONFIG.ADJUSTMENT_STEP, currentSpeed);
            speedHandled = true;
          }
          if (speedHandled) {
            event.preventDefault();
            event.stopImmediatePropagation();
          }
          return;
        }
        if (!event.shiftKey && !event.ctrlKey && !event.altKey) {
          let handled = true;
          switch (event.code) {
            case CONFIG.RES_DOWN_KEY:
              void activeAdapter.changeResolution("down");
              break;
            case CONFIG.RES_UP_KEY:
              void activeAdapter.changeResolution("up");
              break;
            default:
              handled = false;
          }
          if (handled) {
            event.preventDefault();
            event.stopImmediatePropagation();
          }
        }
      },
      true
    );
    window.addEventListener(
      "keyup",
      (event) => {
        if (CONFIG.enableSpeedBoost && event.code === CONFIG.BOOST_KEY) cancelBoost();
      },
      true
    );
    window.addEventListener("blur", cancelBoost, true);
  };

  // src/main.ts
  loadConfig();
  if (CONFIG.useH264) {
    applyH264CodecPatch();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      runApp();
    });
  } else {
    runApp();
  }
})();
