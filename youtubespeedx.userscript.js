// ==UserScript==
// @name         YouTube SpeedX
// @namespace    https://github.com/alexplast/youtube-speedx
// @version      2.5.0
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
// @icon         https://www.google.com/s2/favicons?domain=disk.yandex.ru
// @match        https://web.telegram.org/*
// @icon         https://www.google.com/s2/favicons?domain=telegram.org
// @match        https://vkvideo.ru/*
// @icon         https://www.google.com/s2/favicons?domain=vk.com
// @downloadURL  https://raw.githubusercontent.com/alexplast/youtube-speedx/main/youtubespeedx.userscript.js
// @updateURL    https://raw.githubusercontent.com/alexplast/youtube-speedx/main/youtubespeedx.userscript.js
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

// --- CONFIGURATION ---
const CONFIG = {
    speed: 2.3,
    resolution: "hd1080",
    useH264: true,
    max60FpsQuality: 'unlimited', // 'unlimited', '1080', '720', '480', 'disabled'
    ADJUSTMENT_STEP: 0.1,
    RES_DOWN_KEY: 'Comma',
    RES_UP_KEY: 'Period',
    SETTINGS_KEY: 'KeyS',
    enableSpeedBoost: true,
    BOOST_KEY: 'KeyB',
    BOOST_SPEED: 3.5,
    enableFullscreenProgress: true,
    progressBarOpacity: 0.5,
};

const loadConfig = () => {
    try {
        const storedConfigJSON = localStorage.getItem('ytSpeedXConfig');
        if (!storedConfigJSON) return;
        const storedConfig = JSON.parse(storedConfigJSON);
        if (!storedConfig) return;
        if (storedConfig.speed !== undefined) CONFIG.speed = storedConfig.speed;
        if (storedConfig.resolution !== undefined) CONFIG.resolution = storedConfig.resolution;
        if (storedConfig.useH264 !== undefined) CONFIG.useH264 = storedConfig.useH264;
        if (storedConfig.max60FpsQuality !== undefined) CONFIG.max60FpsQuality = storedConfig.max60FpsQuality;
        if (storedConfig.ADJUSTMENT_STEP !== undefined) CONFIG.ADJUSTMENT_STEP = storedConfig.ADJUSTMENT_STEP;
        if (storedConfig.RES_DOWN_KEY) CONFIG.RES_DOWN_KEY = storedConfig.RES_DOWN_KEY;
        if (storedConfig.RES_UP_KEY) CONFIG.RES_UP_KEY = storedConfig.RES_UP_KEY;
        if (storedConfig.SETTINGS_KEY) CONFIG.SETTINGS_KEY = storedConfig.SETTINGS_KEY;
        if (storedConfig.enableSpeedBoost !== undefined) CONFIG.enableSpeedBoost = storedConfig.enableSpeedBoost;
        if (storedConfig.BOOST_KEY) CONFIG.BOOST_KEY = storedConfig.BOOST_KEY;
        if (storedConfig.BOOST_SPEED !== undefined) CONFIG.BOOST_SPEED = storedConfig.BOOST_SPEED;
        if (storedConfig.enableFullscreenProgress !== undefined) CONFIG.enableFullscreenProgress = storedConfig.enableFullscreenProgress;
        if (storedConfig.progressBarOpacity !== undefined) CONFIG.progressBarOpacity = storedConfig.progressBarOpacity;
    } catch (e) { /* Fail silently */ }
};

const saveConfig = () => {
    try {
        const configToSave = { ...CONFIG };
        delete configToSave.DECREASE_KEY;
        delete configToSave.INCREASE_KEY;
        localStorage.setItem('ytSpeedXConfig', JSON.stringify(configToSave));
    } catch (e) { /* Fail silently */ }
};

// --- EARLY EXECUTION LOGIC (RUNS AT DOCUMENT-START) ---
loadConfig();
if (CONFIG.useH264) {
    (function () {
        'use strict';
        const originalIsTypeSupported = window.MediaSource?.isTypeSupported;
        const originalDecodingInfo = navigator.mediaCapabilities?.decodingInfo;
        const isCodecBlocked = (codecString) => {
            if (!codecString) return false;
            const blockedCodecs = ['vp8', 'vp9', 'vp09', 'av1', 'av01'];
            return blockedCodecs.some(blocked => codecString.includes(blocked));
        };
        if (originalIsTypeSupported) {
            MediaSource.isTypeSupported = function (type) {
                if (isCodecBlocked(type)) return false;
                return originalIsTypeSupported.apply(this, arguments);
            };
        }
        if (originalDecodingInfo) {
            navigator.mediaCapabilities.decodingInfo = function (info) {
                if (isCodecBlocked(info?.video?.contentType)) {
                    return Promise.resolve({ supported: false, smooth: false, powerEfficient: false });
                }
                return originalDecodingInfo.apply(this, arguments);
            };
        }
    })();
}

// --- ALL DOM-DEPENDENT LOGIC RUNS AFTER DOM IS LOADED ---
document.addEventListener('DOMContentLoaded', () => {

    let qualityChangeState = {
        debounceTimer: null,
        targetQualityIndex: -1,
        availableQualityData: []
    };

    let rutubeResState = {
        debounceTimer: null,
        currentSelectionText: "",
        availableLabels: [],
        sessionActive: false
    };

    const sleep = async timeout => new Promise(resolve => setTimeout(resolve, timeout));

    // --- ADAPTERS ---

    const GenericAdapter = {
        name: 'Generic',
        isMatch: () => true,
        getVideoElement: () => document.querySelector('video'),
        getPlayer: () => null,
        isControlsHidden: () => false, // Fallback
        applySpeed: function (videoElement, newSpeed) {
            if (!videoElement) return;
            CONFIG.speed = +Math.max(0.1, Math.min(newSpeed, 16)).toFixed(2);
            videoElement.playbackRate = CONFIG.speed;
            saveConfig();
        },
        applyResolution: () => { },
        changeResolution: () => { },
        updateSpeedIndicator: () => { },
        showBezelNotification: () => { }
    };

    const RutubeAdapter = {
        ...GenericAdapter,
        name: 'Rutube',
        isMatch: () => window.location.hostname.includes('rutube.ru'),
        getVideoElement: () => document.querySelector('video'),
        getPlayer: () => {
            const video = document.querySelector('video');
            return video ? (video.closest('.video-player') || video.parentElement.parentElement) : null;
        },
        isControlsHidden: function () {
            const controls = document.querySelector('[data-testid="video-ui"]');
            if (controls) {
                if (Array.from(controls.classList).some(c => c.toLowerCase().includes('hidden'))) {
                    return true;
                }
            } else {
                const mainWrapper = this.getPlayer();
                if (mainWrapper && window.getComputedStyle(mainWrapper).cursor === 'none') {
                    return true;
                }
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
                indicator.textContent = `/ ${parseFloat(currentSpeed.toFixed(2))}x`;
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
                    targetParent.style.position = 'relative';
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
            CONFIG.speed = +Math.max(0.1, Math.min(newSpeed, 16)).toFixed(2);
            saveConfig();
            videoElement.playbackRate = CONFIG.speed;
            this.showBezelNotification(`${parseFloat(CONFIG.speed.toFixed(2))}x`);
            this.updateSpeedIndicator();
        },
        _wakeUpUI: function () {
            const player = this.getPlayer() || document.body;
            const events = ['mousemove', 'mouseenter', 'mouseover', 'pointermove'];
            events.forEach(eventType => {
                player.dispatchEvent(new MouseEvent(eventType, { bubbles: true, cancelable: true, clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 }));
            });
        },
        _getGearBtn: function () {
            return document.querySelector('button[aria-controls="raichuSettingsPanel"]');
        },
        _getQualityBtn: function (panel) {
            return panel ? panel.querySelector('button[aria-label="Качество"]') : null;
        },
        _getQualityItemsArray: function (panel) {
            if (!panel) return [];
            return Array.from(panel.querySelectorAll('button[aria-label*="p"], button[aria-label*="Авто"]'))
                .filter(btn => {
                    const label = (btn.getAttribute('aria-label') || "").toLowerCase();
                    return !label.includes('назад') && !label.includes('авто') && !label.includes('auto');
                });
        },
        _extractLabel: function (btn) {
            return (btn.textContent || btn.getAttribute('aria-label') || "").replace('Выбрано', '').trim();
        },
        _openQualityMenu: async function () {
            this._wakeUpUI();
            await sleep(50);

            const gearBtn = this._getGearBtn();
            if (!gearBtn) return null;

            gearBtn.click();

            let retries = 0;
            let menuPanel = null;
            while (retries < 15) {
                await sleep(50);
                menuPanel = document.getElementById('raichuSettingsPanel');
                if (menuPanel) break;
                retries++;
            }
            if (!menuPanel) {
                this._wakeUpUI();
                gearBtn.click();
                await sleep(200);
                menuPanel = document.getElementById('raichuSettingsPanel');
                if (!menuPanel) return null;
            }

            const qualityBtn = this._getQualityBtn(menuPanel);
            if (!qualityBtn) {
                gearBtn.click();
                return null;
            }

            qualityBtn.click();
            await sleep(200);

            return this._getQualityItemsArray(menuPanel);
        },
        applyResolution: async function () {
            if (CONFIG.resolution === 'auto') return;
            const getResNumber = (resStr) => {
                if (!resStr) return 0;
                const match = resStr.match(/(\d+)/);
                return match ? parseInt(match[1], 10) : 0;
            };
            const targetVal = getResNumber(CONFIG.resolution);
            if (targetVal === 0) return;

            const items = await this._openQualityMenu();
            if (!items || items.length === 0) return;

            const getItemVal = (btn) => {
                const text = this._extractLabel(btn);
                const match = text.match(/(\d+)p/);
                return match ? parseInt(match[1], 10) : 0;
            };

            const sortedItems = items.map(btn => ({ btn, val: getItemVal(btn) }))
                .filter(i => i.val > 0)
                .sort((a, b) => b.val - a.val);

            let targetBtn = null;
            for (let item of sortedItems) {
                if (item.val <= targetVal) {
                    targetBtn = item.btn;
                    break;
                }
            }
            if (!targetBtn && sortedItems.length > 0) targetBtn = sortedItems[sortedItems.length - 1].btn;

            if (targetBtn) {
                const isSelected = (targetBtn.getAttribute('aria-label') || "").includes('Выбрано');
                if (!isSelected) {
                    targetBtn.click();
                    const text = this._extractLabel(targetBtn);
                    this.showBezelNotification(text);
                }
            }

            const gearBtn = this._getGearBtn();
            if (gearBtn && document.getElementById('raichuSettingsPanel')) gearBtn.click();
        },
        changeResolution: async function (direction) {
            if (rutubeResState.sessionActive) {
                clearTimeout(rutubeResState.debounceTimer);

                let currentIndex = rutubeResState.availableLabels.indexOf(rutubeResState.currentSelectionText);
                if (currentIndex === -1) currentIndex = 0;

                let newIndex = currentIndex;
                if (direction === 'up') newIndex--; else newIndex++;

                if (newIndex < 0) newIndex = 0;
                if (newIndex >= rutubeResState.availableLabels.length) newIndex = rutubeResState.availableLabels.length - 1;

                rutubeResState.currentSelectionText = rutubeResState.availableLabels[newIndex];

                this.showBezelNotification(rutubeResState.currentSelectionText);
                this._scheduleExecution();
                return;
            }

            rutubeResState.sessionActive = true;

            const items = await this._openQualityMenu();
            if (!items || items.length === 0) {
                rutubeResState.sessionActive = false;
                return;
            }

            rutubeResState.availableLabels = items.map(btn => this._extractLabel(btn));

            let currentBtnIndex = items.findIndex(btn => (btn.getAttribute('aria-label') || "").includes('Выбрано'));
            if (currentBtnIndex === -1) currentBtnIndex = 0;

            let newIndex = currentBtnIndex;
            if (direction === 'up') newIndex--; else newIndex++;

            if (newIndex < 0) newIndex = 0;
            if (newIndex >= rutubeResState.availableLabels.length) newIndex = rutubeResState.availableLabels.length - 1;

            rutubeResState.currentSelectionText = rutubeResState.availableLabels[newIndex];

            this.showBezelNotification(rutubeResState.currentSelectionText);
            this._scheduleExecution();
        },
        _scheduleExecution: function () {
            rutubeResState.debounceTimer = setTimeout(async () => {
                this._wakeUpUI();
                await sleep(50);

                let menuPanel = document.getElementById('raichuSettingsPanel');

                if (menuPanel) {
                    const items = this._getQualityItemsArray(menuPanel);
                    const targetBtn = items.find(btn => this._extractLabel(btn) === rutubeResState.currentSelectionText);

                    if (targetBtn) {
                        targetBtn.click();
                        await sleep(100);
                    }
                }

                const gearBtn = this._getGearBtn();
                if (gearBtn && document.getElementById('raichuSettingsPanel')) gearBtn.click();

                rutubeResState.sessionActive = false;
                rutubeResState.availableLabels = [];
            }, 600);
        },
        onInit: function () {
            let lastSrc = '';
            setInterval(() => {
                const video = this.getVideoElement();
                if (video) {
                    if (video.src !== lastSrc) {
                        lastSrc = video.src;
                        video.playbackRate = CONFIG.speed;
                        this.updateSpeedIndicator();
                        video.addEventListener('ratechange', () => this.updateSpeedIndicator());
                        setTimeout(() => this.applyResolution(), 2500);
                    }
                    if (!document.getElementById('yt-speedx-indicator')) {
                        this.updateSpeedIndicator();
                    }
                }
            }, 1000);
        }
    };

    const YouTubeAdapter = {
        ...GenericAdapter,
        name: 'YouTube',
        isMatch: () => window.location.hostname.includes('youtube.com'),
        getPlayer: () => document.getElementById("movie_player"),
        isControlsHidden: function () {
            const player = this.getPlayer();
            return player ? player.classList.contains('ytp-autohide') : false;
        },
        showBezelNotification: function (text) {
            const wrapper = document.getElementById('yt-speedx-bezel-wrapper');
            const textElement = document.getElementById('yt-speedx-bezel-text');
            if (!wrapper || !textElement) return;

            textElement.textContent = text;

            wrapper.classList.remove('yt-speedx-bezel-show');
            void wrapper.offsetHeight;
            wrapper.classList.add('yt-speedx-bezel-show');
        },
        getFormattedTime: (seconds) => {
            seconds = Math.max(seconds, 0);
            const hours = Math.floor(seconds / 3600), minutes = Math.floor((seconds % 3600) / 60), secs = Math.floor(seconds % 60);
            const pad = (num) => String(num).padStart(2, '0');
            return `${hours > 0 ? `${hours}:` : ''}${pad(minutes)}:${pad(secs)}`;
        },
        updateSpeedIndicator: function () {
            const player = this.getPlayer();
            const videoElement = this.getVideoElement();
            const timeContainer = document.querySelector(".ytp-time-display .ytp-time-contents");

            if (!player || !videoElement || !timeContainer || typeof player.getDuration !== 'function') return;

            let indicator = document.getElementById('yt-speedx-indicator');
            if (!indicator) {
                indicator = document.createElement('span');
                indicator.id = 'yt-speedx-indicator';
                indicator.className = 'ytp-time-separator'; // Use YouTube's class for consistent styling
                timeContainer.appendChild(indicator);
            }

            const currentSpeed = videoElement.playbackRate;

            if (currentSpeed !== 1) {
                const adjustedDuration = player.getDuration() / currentSpeed;
                indicator.innerText = ` / ${parseFloat(currentSpeed.toFixed(2))}x`;
                indicator.title = `Adjusted duration: ${this.getFormattedTime(adjustedDuration)}`;
                indicator.style.display = 'inline';
            } else {
                indicator.style.display = 'none';
            }
        },
        applySpeed: function (videoElement, newSpeed, currentSpeed) {
            const player = this.getPlayer();
            if (!player || !videoElement) return;

            CONFIG.speed = +Math.max(0.1, Math.min(newSpeed, 16)).toFixed(1);
            saveConfig();
            videoElement.playbackRate = CONFIG.speed;

            if (CONFIG.speed > 2) {
                this.showBezelNotification(`${CONFIG.speed.toFixed(1)}x`);
            } else if (currentSpeed > 2 && CONFIG.speed === 2) {
                this.showBezelNotification("2x");
            } else {
                if (typeof player.setPlaybackRate === 'function') {
                    player.setPlaybackRate(CONFIG.speed);
                }
            }
        },
        applyResolution: function (player) {
            if (!player || typeof player.getAvailableQualityLevels !== 'function') return;
            const availableLevels = player.getAvailableQualityLevels();
            const desiredLevel = CONFIG.resolution;
            if (availableLevels.includes(desiredLevel)) {
                player.setPlaybackQualityRange(desiredLevel);
            } else if (availableLevels.length > 0) {
                player.setPlaybackQualityRange(availableLevels[0]);
            }
        },
        changeResolution: function (direction) {
            const player = this.getPlayer();
            if (typeof player?.getAvailableQualityData !== 'function') return;

            // On the first press of a sequence, sync our state with the player's actual current state.
            if (!qualityChangeState.debounceTimer) {
                qualityChangeState.availableQualityData = player.getAvailableQualityData(true); // Get all, bypass our filter
                if (qualityChangeState.availableQualityData.length === 0) return;

                const currentQuality = player.getPlaybackQuality();
                qualityChangeState.targetQualityIndex = qualityChangeState.availableQualityData.findIndex(q => q.quality === currentQuality);

                if (qualityChangeState.targetQualityIndex === -1) {
                    qualityChangeState.targetQualityIndex = 0;
                }
            }

            // Calculate the new target index based on the direction.
            let newIndex = qualityChangeState.targetQualityIndex;
            if (direction === 'up' && newIndex > 0) {
                newIndex--;
            } else if (direction === 'down' && newIndex < qualityChangeState.availableQualityData.length - 1) {
                newIndex++;
            }

            qualityChangeState.targetQualityIndex = newIndex;

            // Immediately show visual feedback for the new target quality.
            const newQualityInfo = qualityChangeState.availableQualityData[qualityChangeState.targetQualityIndex];
            if (newQualityInfo && newQualityInfo.qualityLabel) {
                this.showBezelNotification(newQualityInfo.qualityLabel);
            }

            // Reset the timer. The command to the player will only be sent after the user stops pressing keys.
            clearTimeout(qualityChangeState.debounceTimer);
            qualityChangeState.debounceTimer = setTimeout(() => {
                const finalQualityInfo = qualityChangeState.availableQualityData[qualityChangeState.targetQualityIndex];
                if (finalQualityInfo) {
                    player.setPlaybackQualityRange(finalQualityInfo.quality);
                    CONFIG.resolution = finalQualityInfo.quality;
                    saveConfig(); // Save config only when initiated by our hotkeys.
                }
                // Reset state for the next sequence of actions.
                qualityChangeState.debounceTimer = null;
                qualityChangeState.targetQualityIndex = -1;
                qualityChangeState.availableQualityData = [];
            }, 350);
        }
    };

    const platformAdapters = [YouTubeAdapter, RutubeAdapter, GenericAdapter];
    const activeAdapter = platformAdapters.find(adapter => adapter.isMatch());

    const patchPlayerForFPS = (player) => {
        if (!player || player.isPatchedForFPS) return;
        const originalGetAvailableQualityData = player.getAvailableQualityData;
        player.getAvailableQualityData = function (bypassFilter = false) {
            const allFormats = originalGetAvailableQualityData.apply(player, arguments);
            if (bypassFilter || CONFIG.max60FpsQuality === 'unlimited') return allFormats;
            const qualityHeightMap = { '1080': 1080, '720': 720, '480': 480, 'disabled': 0 };
            const limit = qualityHeightMap[CONFIG.max60FpsQuality];
            if (typeof limit === 'undefined') return allFormats;
            return allFormats.filter(format => {
                if (format && typeof format.qualityLabel === 'string') {
                    const match = format.qualityLabel.match(/(\d+)p(\d+)?/);
                    if (match) {
                        const height = parseInt(match[1], 10);
                        const fps = match[2] ? parseInt(match[2], 10) : 30;
                        if (fps > 30 && height > limit) return false;
                    }
                }
                return true;
            });
        };
        player.getAvailableQualityLevels = function () {
            return player.getAvailableQualityData().map(format => format.quality);
        }
        player.isPatchedForFPS = true;
    };

    const createCustomBezel = () => {
        if (activeAdapter.name === 'Rutube') return; // Rutube handles bezel dynamically
        if (document.getElementById('yt-speedx-bezel-wrapper')) return;
        const player = document.getElementById('movie_player');
        if (player) {
            const wrapper = document.createElement('div');
            wrapper.id = 'yt-speedx-bezel-wrapper';

            const textElement = document.createElement('div');
            textElement.id = 'yt-speedx-bezel-text';

            wrapper.appendChild(textElement);
            player.appendChild(wrapper);
        }
    };

    const createFullscreenProgressBar = () => {
        if (document.getElementById('yt-speedx-progress-bar')) return;
        const bar = document.createElement('div');
        bar.id = 'yt-speedx-progress-bar';
        document.body.appendChild(bar);
    };

    const updateProgressBarVisibility = () => {
        let progressBar = document.getElementById('yt-speedx-progress-bar');
        if (!progressBar) { createFullscreenProgressBar(); progressBar = document.getElementById('yt-speedx-progress-bar'); }

        const player = activeAdapter.getPlayer();
        if (!progressBar || !player) return;

        const isFullscreen = !!document.fullscreenElement;
        const targetParent = isFullscreen ? document.fullscreenElement : document.body;

        if (progressBar.parentElement !== targetParent) {
            targetParent.appendChild(progressBar);
        }

        const controlsHidden = activeAdapter.isControlsHidden();

        if (CONFIG.enableFullscreenProgress && isFullscreen && controlsHidden) {
            progressBar.style.display = 'block';
            progressBar.style.opacity = CONFIG.progressBarOpacity;
        } else {
            progressBar.style.display = 'none';
        }
    };

    let menuObserver = null;
    let progressObserver = null;
    const startMenuObserver = (player, openModalCallback) => {
        if (menuObserver) menuObserver.disconnect();
        if (activeAdapter.name !== 'YouTube') return; // Only YouTube has this menu structure currently

        const createSettingsMenuItem = () => {
            const menuItem = document.createElement('div');
            menuItem.className = 'ytp-menuitem';
            menuItem.id = 'yt-speedx-menu-item';

            const iconContainer = document.createElement('div');
            iconContainer.className = 'ytp-menuitem-icon';

            const svgNS = "http://www.w3.org/2000/svg";
            const svg = document.createElementNS(svgNS, "svg");
            svg.setAttribute('height', '24');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('width', '24');
            svg.setAttribute('fill', 'white');
            const path = document.createElementNS(svgNS, "path");
            path.setAttribute('d', 'M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z');
            svg.appendChild(path);
            iconContainer.appendChild(svg);

            const label = document.createElement('div');
            label.className = 'ytp-menuitem-label';
            label.textContent = 'YouTube SpeedX Settings';

            const content = document.createElement('div');
            content.className = 'ytp-menuitem-content';

            menuItem.append(iconContainer, label, content);

            menuItem.addEventListener('click', () => {
                const settingsButton = document.querySelector('.ytp-settings-button');
                if (settingsButton) settingsButton.click();
                openModalCallback();
            });
            return menuItem;
        };

        menuObserver = new MutationObserver(() => {
            const panelMenu = document.querySelector('.ytp-panel-menu');
            if (!panelMenu) return;

            const panel = panelMenu.closest('.ytp-panel');
            const isRootMenu = panel && !panel.querySelector('.ytp-panel-back-button');
            const hasMenuItem = panelMenu.querySelector('#yt-speedx-menu-item');

            if (isRootMenu && !hasMenuItem) {
                const newItem = createSettingsMenuItem();
                panelMenu.prepend(newItem);
            }
        });

        menuObserver.observe(player, { childList: true, subtree: true });
    };

    const initializePlayer = async (openModalCallback) => {
        // Platform specific init hooks
        if (activeAdapter.onInit) activeAdapter.onInit();

        if (activeAdapter.name !== 'YouTube') {
            // For Rutube/Generic, try to apply immediately if video exists
            const video = activeAdapter.getVideoElement();
            if (video) {
                activeAdapter.applySpeed(video, CONFIG.speed);
                if (activeAdapter.name === 'Rutube') {
                    activeAdapter.updateSpeedIndicator();
                    // Try resolution early, but UI might not be ready
                    setTimeout(() => activeAdapter.applyResolution(), 2000);
                }
            }
            // Continue to loop for robustness in SPA
        }

        let player, attempts = 0;
        while (attempts < 20) {
            player = activeAdapter.getPlayer();
            // Looser check for non-YouTube
            const isReady = activeAdapter.name === 'YouTube'
                ? (player && typeof player.getPlaybackRate === 'function' && typeof player.getAvailableQualityData === 'function')
                : (player || activeAdapter.getVideoElement());

            if (isReady) {
                const videoElement = activeAdapter.getVideoElement();
                if (videoElement) {
                    createCustomBezel();
                    createFullscreenProgressBar();

                    if (activeAdapter.name === 'YouTube') {
                        patchPlayerForFPS(player);
                        startMenuObserver(player, openModalCallback);
                        activeAdapter.applyResolution(player);
                    }

                    // Apply speed and listener
                    activeAdapter.applySpeed(videoElement, CONFIG.speed, CONFIG.speed);

                    if (!videoElement.dataset.rateListenerAttached) {
                        videoElement.addEventListener('ratechange', () => activeAdapter.updateSpeedIndicator());
                        videoElement.dataset.rateListenerAttached = 'true';
                    }
                    if (!videoElement.dataset.timeUpdateListener) {
                        videoElement.addEventListener('timeupdate', () => {
                            const bar = document.getElementById('yt-speedx-progress-bar');
                            if (bar && videoElement.duration) {
                                const progress = (videoElement.currentTime / videoElement.duration) * 100;
                                bar.style.width = `${progress}%`;
                            }
                            if (activeAdapter.name === 'Rutube') {
                                updateProgressBarVisibility();
                            }
                        });
                        videoElement.dataset.timeUpdateListener = 'true';
                    }
                    if (!document.body.dataset.ytSpeedxGlobalListeners) {
                        document.addEventListener('fullscreenchange', updateProgressBarVisibility);
                        document.body.dataset.ytSpeedxGlobalListeners = 'true';
                    }
                    if (progressObserver) progressObserver.disconnect();
                    if (activeAdapter.name === 'YouTube') {
                        progressObserver = new MutationObserver(updateProgressBarVisibility);
                        progressObserver.observe(player, { attributes: true, attributeFilter: ['class'] });
                    }

                    activeAdapter.updateSpeedIndicator();
                    updateProgressBarVisibility();
                    return;
                }
            }
            await sleep(500);
            attempts++;
        }
    };

    const initSettingsUI = () => {
        const overlay = document.createElement('div');
        overlay.id = 'yt-speedx-overlay';
        const modal = document.createElement('div');
        modal.id = 'yt-speedx-modal';

        const header = document.createElement('div');
        header.className = 'yt-speedx-modal-header';
        const title = document.createElement('h2');
        title.textContent = `${activeAdapter.name} SpeedX Settings`;
        const closeBtn = document.createElement('button');
        closeBtn.id = 'yt-speedx-close-btn';
        closeBtn.textContent = '\u00d7';
        header.append(title, closeBtn);

        const body = document.createElement('div');
        body.className = 'yt-speedx-modal-body';
        const settingsGrid = document.createElement('div');
        settingsGrid.className = 'yt-speedx-grid';

        const mainSettingConfigs = [
            { id: 'speed', label: 'Default Speed', elementType: 'input', props: { type: 'number', step: '0.1', min: '0.1', max: '16' } },
            { id: 'step', label: 'Adjustment Step', elementType: 'input', props: { type: 'number', step: '0.05', min: '0.05', max: '5' } },
            { id: 'res', label: 'Default Resolution', elementType: 'select', options: [{ value: "auto", text: "Auto" }, { value: "hd2160", text: "2160p (4K)" }, { value: "hd1440", text: "1440p" }, { value: "hd1080", text: "1080p" }, { value: "hd720", text: "720p" }, { value: "large", text: "480p" }, { value: "medium", text: "360p" }, { value: "small", text: "240p" }, { value: "tiny", text: "144p" }] },
            { id: 'max-fps-quality', label: 'Max 60 FPS Quality', elementType: 'select', options: [{ value: 'unlimited', text: 'Unlimited' }, { value: '1080', text: 'Max 1080p' }, { value: '720', text: 'Max 720p' }, { value: '480', text: 'Max 480p' }, { value: 'disabled', text: 'Disable 60 FPS' }] },
            { id: 'h264', label: 'Force H.264 Codec', elementType: 'input', props: { type: 'checkbox', className: 'yt-speedx-checkbox' } },
            { id: 'fullscreen-progress', label: 'Fullscreen Progress Bar', elementType: 'input', props: { type: 'checkbox', className: 'yt-speedx-checkbox' } },
            { id: 'progress-opacity', label: 'Progress Bar Opacity', elementType: 'input', props: { type: 'number', step: '0.1', min: '0.1', max: '1' } }
        ];

        mainSettingConfigs.forEach(config => {
            const label = document.createElement('label');
            label.htmlFor = `yt-speedx-${config.id}`;
            label.textContent = config.label;
            const element = document.createElement(config.elementType);
            Object.assign(element, { id: `yt-speedx-${config.id}`, ...config.props });
            if (config.options) config.options.forEach(opt => { const option = document.createElement('option'); option.value = opt.value; option.textContent = opt.text; element.appendChild(option); });
            settingsGrid.append(label, element);
        });

        const hr1 = document.createElement('hr');
        const hotkeysTitle = document.createElement('h3');
        const smallText = document.createElement('small');
        smallText.textContent = '(uses physical key location)';
        hotkeysTitle.append('Hotkeys ', smallText);
        const hotkeysGrid = document.createElement('div');
        hotkeysGrid.className = 'yt-speedx-grid';
        const hotkeyConfigs = [
            { id: 'res-down-key', label: 'Decrease Resolution' },
            { id: 'res-up-key', label: 'Increase Resolution' },
            { id: 'settings-key', label: 'Open Settings (Ctrl+Alt+)' }
        ];
        hotkeyConfigs.forEach(config => {
            const lbl = document.createElement('label'); lbl.htmlFor = `yt-speedx-${config.id}`; lbl.textContent = config.label;
            const input = document.createElement('input'); Object.assign(input, { id: `yt-speedx-${config.id}`, type: 'text', className: 'yt-speedx-hotkey-input', readOnly: true });
            hotkeysGrid.append(lbl, input);
        });

        const hr2 = document.createElement('hr');
        const boostTitle = document.createElement('h3');
        boostTitle.textContent = 'Speed Boost';
        const boostGrid = document.createElement('div');
        boostGrid.className = 'yt-speedx-grid';
        const boostConfigs = [
            { id: 'boost-enable', label: 'Enable Speed Boost', elementType: 'input', props: { type: 'checkbox', className: 'yt-speedx-checkbox' } },
            { id: 'boost-speed', label: 'Boost Speed (x)', elementType: 'input', props: { type: 'number', step: '0.1', min: '0.1', max: '16' } },
            { id: 'boost-key', label: 'Boost Hotkey', elementType: 'input', props: { type: 'text', className: 'yt-speedx-hotkey-input', readOnly: true } },
        ];
        boostConfigs.forEach(config => {
            const lbl = document.createElement('label'); lbl.htmlFor = `yt-speedx-${config.id}`; lbl.textContent = config.label;
            const input = document.createElement(config.elementType); Object.assign(input, { id: `yt-speedx-${config.id}`, ...config.props });
            boostGrid.append(lbl, input);
        });


        body.append(settingsGrid, hr1, hotkeysTitle, hotkeysGrid, hr2, boostTitle, boostGrid);

        const footer = document.createElement('div');
        footer.className = 'yt-speedx-modal-footer';
        const saveBtn = document.createElement('button');
        saveBtn.id = 'yt-speedx-save-btn';
        saveBtn.textContent = 'Save and Close';
        footer.appendChild(saveBtn);

        modal.append(header, body, footer);
        document.body.append(overlay, modal);

        GM_addStyle(`
            /* Bezel & Duration Display */
            @keyframes ytSpeedX-text-fadeout { 0% { opacity: 0; } 25%, 75% { opacity: 1; } 100% { opacity: 0; } }
            #yt-speedx-bezel-wrapper { text-align: center; position: absolute; left: 0; right: 0; top: 15%; z-index: 2500; pointer-events: none; opacity: 0; }
            #yt-speedx-bezel-wrapper.yt-speedx-bezel-show { animation: ytSpeedX-text-fadeout 1s cubic-bezier(.05,0,0,1) forwards; }
            #yt-speedx-bezel-text { display: inline-block; padding: 10px 20px; font-size: 175%; border-radius: 3px; -webkit-backdrop-filter: var(--yt-frosted-glass-backdrop-filter-override,blur(16px)); backdrop-filter: var(--yt-frosted-glass-backdrop-filter-override,blur(16px)); background: var(--yt-spec-overlay-background-medium,rgba(0,0,0,.6)); text-shadow: 0 0 2px rgba(0,0,0,0.5); }
            
            /* Enforce our menu item position */
            .ytp-panel-menu { display: flex; flex-direction: column; }
            #yt-speedx-menu-item { order: -1; }

            /* Fullscreen Progress Bar */
            #yt-speedx-progress-bar { display: none; position: fixed !important; bottom: 0 !important; left: 0 !important; width: 0%; height: 1px !important; background-color: #f00 !important; z-index: 2147483647 !important; pointer-events: none; transition: width 0.1s linear, opacity 0.2s ease; }

            /* Settings Modal Layout & General */
            #yt-speedx-overlay { display: none; position: fixed; z-index: 2500; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); }
            #yt-speedx-modal { display: none; flex-direction: column; max-height: 85vh; position: fixed; z-index: 2501; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #212121; color: #fff; border: 1px solid #3e3e3e; border-radius: 12px; width: 500px; max-width: 90vw; font-family: "Roboto", "Arial", sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            
            /* Modal Header */
            .yt-speedx-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-bottom: 1px solid #3e3e3e; }
            .yt-speedx-modal-header h2 { margin: 0; font-size: 1.4em; font-weight: 500; }
            #yt-speedx-close-btn { background: none; border: none; color: #aaa; font-size: 2em; line-height: 1; cursor: pointer; padding: 0; transition: color 0.2s; }
            #yt-speedx-close-btn:hover { color: #fff; }

            /* Modal Body & Content */
            .yt-speedx-modal-body { padding: 16px 24px; overflow-y: auto; flex: 1; }
            .yt-speedx-modal-body::-webkit-scrollbar { width: 8px; }
            .yt-speedx-modal-body::-webkit-scrollbar-thumb { background: #555; border-radius: 4px; }
            .yt-speedx-modal-body hr { border: 0; border-top: 1px solid #3e3e3e; margin: 20px 0; }
            .yt-speedx-modal-body h3 { margin-top: 0; margin-bottom: 12px; font-weight: 500; display: flex; align-items: center; gap: 8px; }
            .yt-speedx-modal-body h3 small { font-size: 0.8em; color: #aaa; font-weight: 400; }

            /* Grid Layout */
            .yt-speedx-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; align-items: center; }
            .yt-speedx-grid label { font-size: 0.95em; color: #eee; }

            /* Form Elements */
            #yt-speedx-modal input[type="number"], #yt-speedx-modal input[type="text"], #yt-speedx-modal select { background: #181818; color: #fff; border: 1px solid #3e3e3e; border-radius: 4px; padding: 8px 12px; width: 100%; box-sizing: border-box; font-size: 1em; }
            #yt-speedx-modal input:focus, #yt-speedx-modal select:focus { outline: none; border-color: #3ea6ff; box-shadow: 0 0 0 1px #3ea6ff; }
            .yt-speedx-hotkey-input { text-align: center; font-weight: bold; cursor: pointer; }

            /* Custom Checkbox */
            .yt-speedx-checkbox { appearance: none; -webkit-appearance: none; position: relative; width: 40px; height: 20px; background: #3e3e3e; border-radius: 20px; cursor: pointer; justify-self: start; }
            .yt-speedx-checkbox::before { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; background: #fff; border-radius: 50%; transition: left 0.2s; }
            .yt-speedx-checkbox:checked { background: #3ea6ff; }
            .yt-speedx-checkbox:checked::before { left: 22px; }

            /* Modal Footer */
            .yt-speedx-modal-footer { display: flex; justify-content: flex-end; padding: 16px 24px; border-top: 1px solid #3e3e3e; background: rgba(255,255,255,0.05); border-radius: 0 0 12px 12px;}
            #yt-speedx-save-btn { background-color: #3ea6ff; color: #fff; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 1em; font-weight: bold; transition: background-color 0.2s; }
            #yt-speedx-save-btn:hover { background-color: #66baff; }
        `);

        const openModal = () => {
            document.getElementById('yt-speedx-speed').value = CONFIG.speed;
            document.getElementById('yt-speedx-step').value = CONFIG.ADJUSTMENT_STEP;
            document.getElementById('yt-speedx-res').value = CONFIG.resolution;
            document.getElementById('yt-speedx-h264').checked = CONFIG.useH264;
            document.getElementById('yt-speedx-max-fps-quality').value = CONFIG.max60FpsQuality;
            document.getElementById('yt-speedx-fullscreen-progress').checked = CONFIG.enableFullscreenProgress;
            document.getElementById('yt-speedx-progress-opacity').value = CONFIG.progressBarOpacity;
            document.getElementById('yt-speedx-res-down-key').value = CONFIG.RES_DOWN_KEY;
            document.getElementById('yt-speedx-res-up-key').value = CONFIG.RES_UP_KEY;
            document.getElementById('yt-speedx-settings-key').value = CONFIG.SETTINGS_KEY;
            document.getElementById('yt-speedx-boost-enable').checked = CONFIG.enableSpeedBoost;
            document.getElementById('yt-speedx-boost-key').value = CONFIG.BOOST_KEY;
            document.getElementById('yt-speedx-boost-speed').value = CONFIG.BOOST_SPEED;
            overlay.style.display = 'block'; modal.style.display = 'flex'; // Changed to flex for stickiness
        };
        const closeModal = () => { overlay.style.display = 'none'; modal.style.display = 'none'; };
        const saveAndClose = () => {
            const wasH264Enabled = CONFIG.useH264, wasMaxFpsQuality = CONFIG.max60FpsQuality;
            CONFIG.speed = parseFloat(document.getElementById('yt-speedx-speed').value);
            CONFIG.ADJUSTMENT_STEP = parseFloat(document.getElementById('yt-speedx-step').value);
            CONFIG.resolution = document.getElementById('yt-speedx-res').value;
            CONFIG.useH264 = document.getElementById('yt-speedx-h264').checked;
            CONFIG.max60FpsQuality = document.getElementById('yt-speedx-max-fps-quality').value;
            CONFIG.enableFullscreenProgress = document.getElementById('yt-speedx-fullscreen-progress').checked;
            CONFIG.progressBarOpacity = parseFloat(document.getElementById('yt-speedx-progress-opacity').value);
            CONFIG.RES_DOWN_KEY = document.getElementById('yt-speedx-res-down-key').value;
            CONFIG.RES_UP_KEY = document.getElementById('yt-speedx-res-up-key').value;
            CONFIG.SETTINGS_KEY = document.getElementById('yt-speedx-settings-key').value;
            CONFIG.enableSpeedBoost = document.getElementById('yt-speedx-boost-enable').checked;
            CONFIG.BOOST_KEY = document.getElementById('yt-speedx-boost-key').value;
            CONFIG.BOOST_SPEED = parseFloat(document.getElementById('yt-speedx-boost-speed').value);
            saveConfig();
            closeModal();
            updateProgressBarVisibility(); // Update visibility in case setting was changed
            if (wasH264Enabled !== CONFIG.useH264 || wasMaxFpsQuality !== CONFIG.max60FpsQuality) alert("Codec or frame rate settings will take effect after reloading the page.");
        };
        saveBtn.addEventListener('click', saveAndClose);
        closeBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);
        document.querySelectorAll('.yt-speedx-hotkey-input').forEach(input => {
            input.addEventListener('focus', () => { input.value = 'Press a key...'; });
            input.addEventListener('blur', () => {
                const configKey = input.id.replace('yt-speedx-', '').replace(/-/g, '_').toUpperCase();
                if (input.value === 'Press a key...') { input.value = CONFIG[configKey] || ''; }
            });
            input.addEventListener('keydown', e => {
                e.preventDefault();
                if (e.code) { input.value = e.code; input.blur(); }
            });
        });
        return { openModal };
    };

    const { openModal } = initSettingsUI();
    const boundInitializePlayer = () => initializePlayer(openModal);

    boundInitializePlayer();
    if (activeAdapter.name === 'YouTube') {
        window.addEventListener('yt-navigate-finish', boundInitializePlayer);
    }

    let originalSpeedBeforeBoost = null;
    const cancelBoost = () => {
        if (originalSpeedBeforeBoost === null) return;
        const videoElement = activeAdapter.getVideoElement();
        if (videoElement) {
            videoElement.playbackRate = originalSpeedBeforeBoost;
            // Show notification on both YouTube and Rutube
            activeAdapter.showBezelNotification(`${parseFloat(originalSpeedBeforeBoost.toFixed(2))}x`);
        }
        originalSpeedBeforeBoost = null;
    };

    window.addEventListener('keydown', (event) => {
        if (event.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) || document.getElementById('yt-speedx-modal')?.style.display === 'flex') return;

        if (CONFIG.enableSpeedBoost && event.code === CONFIG.BOOST_KEY && !event.repeat) {
            if (originalSpeedBeforeBoost === null) {
                const videoElement = activeAdapter.getVideoElement();
                if (!videoElement) return;
                originalSpeedBeforeBoost = videoElement.playbackRate;
                videoElement.playbackRate = CONFIG.BOOST_SPEED;
                // Show notification on both YouTube and Rutube
                activeAdapter.showBezelNotification(`${parseFloat(CONFIG.BOOST_SPEED.toFixed(2))}x Boost`);
                event.preventDefault(); event.stopImmediatePropagation();
            }
            return;
        }

        // Handle speed adjustments while boost is active
        if (originalSpeedBeforeBoost !== null) {
            const videoElement = activeAdapter.getVideoElement();
            if (!videoElement) return;

            let boostHandled = false;
            let newBoostSpeed = CONFIG.BOOST_SPEED;

            // Handle Shift + >/< for incremental adjustment
            if (event.shiftKey && !event.ctrlKey && !event.altKey) {
                if (event.code === 'Period') {
                    newBoostSpeed += CONFIG.ADJUSTMENT_STEP;
                    boostHandled = true;
                } else if (event.code === 'Comma') {
                    newBoostSpeed -= CONFIG.ADJUSTMENT_STEP;
                    boostHandled = true;
                }
            }
            // Handle number keys for direct speed set
            else if (!event.shiftKey && !event.ctrlKey && !event.altKey && event.code.startsWith('Digit')) {
                const digit = parseInt(event.code.replace('Digit', ''), 10);
                if (digit >= 1 && digit <= 9) {
                    newBoostSpeed = digit;
                    boostHandled = true;
                }
            }

            if (boostHandled) {
                CONFIG.BOOST_SPEED = +Math.max(0.1, Math.min(newBoostSpeed, 16)).toFixed(2);
                videoElement.playbackRate = CONFIG.BOOST_SPEED;
                activeAdapter.showBezelNotification(`${parseFloat(CONFIG.BOOST_SPEED.toFixed(2))}x Boost`);
                saveConfig();
                event.preventDefault();
                event.stopImmediatePropagation();
            }
            return; // Exit handler so regular hotkeys are not processed while boosting
        }

        if (event.ctrlKey && event.altKey && event.code === CONFIG.SETTINGS_KEY) {
            event.preventDefault(); event.stopImmediatePropagation(); openModal(); return;
        }

        const videoElement = activeAdapter.getVideoElement();
        if (!videoElement) return;

        if (event.shiftKey && !event.ctrlKey && !event.altKey) {
            const currentSpeed = videoElement.playbackRate;
            let speedHandled = false;
            if (event.code === 'Period') {
                // Always handle speed up if using adapter logic, or if > 2x for native consistency
                activeAdapter.applySpeed(videoElement, currentSpeed + CONFIG.ADJUSTMENT_STEP, currentSpeed);
                speedHandled = true;
            } else if (event.code === 'Comma') {
                const newSpeed = currentSpeed - CONFIG.ADJUSTMENT_STEP;
                activeAdapter.applySpeed(videoElement, newSpeed, currentSpeed);
                speedHandled = true;
            }
            if (speedHandled) { event.preventDefault(); event.stopImmediatePropagation(); }
            return;
        }

        if (!event.shiftKey && !event.ctrlKey && !event.altKey) {
            let handled = true;
            switch (event.code) {
                case CONFIG.RES_DOWN_KEY: activeAdapter.changeResolution('down'); break;
                case CONFIG.RES_UP_KEY: activeAdapter.changeResolution('up'); break;
                default: handled = false;
            }
            // Block native keys if action handled
            if (handled) { event.preventDefault(); event.stopImmediatePropagation(); }
        }
    }, true);

    window.addEventListener('keyup', (event) => {
        if (CONFIG.enableSpeedBoost && event.code === CONFIG.BOOST_KEY) {
            cancelBoost();
        }
    }, true);

    window.addEventListener('blur', () => {
        cancelBoost();
    }, true);
});