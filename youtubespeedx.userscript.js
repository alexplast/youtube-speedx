// ==UserScript==
// @name         YouTube SpeedX
// @namespace    https://github.com/alexplast/youtube-speedx
// @version      2.1.5
// @description  Polished UI, speed/resolution control, H.264 forcing, managed via a hotkey-accessible settings menu.
// @author       https://github.com/alexplast
// @match        https://*.youtube.com/*
// @icon         https://www.google.com/s2/favicons?domain=youtube.com
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
            MediaSource.isTypeSupported = function(type) {
                if (isCodecBlocked(type)) return false;
                return originalIsTypeSupported.apply(this, arguments);
            };
        }
        if (originalDecodingInfo) {
            navigator.mediaCapabilities.decodingInfo = function(info) {
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

    const GenericAdapter = {
        name: 'Generic',
        isMatch: () => true,
        getVideoElement: () => document.querySelector('video'),
        getPlayer: () => null,
        applySpeed: function(videoElement, newSpeed) {
            if (!videoElement) return;
            CONFIG.speed = +Math.max(0.1, Math.min(newSpeed, 16)).toFixed(2);
            videoElement.playbackRate = CONFIG.speed;
            saveConfig();
        },
        applyResolution: () => {},
        changeResolution: () => {}
    };

    const YouTubeAdapter = {
        ...GenericAdapter,
        name: 'YouTube',
        isMatch: () => window.location.hostname.includes('youtube.com'),
        getPlayer: () => document.getElementById("movie_player"),
        showBezelNotification: function(text) {
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
        updateDurationDisplay: function() {
            const player = this.getPlayer();
            const display = document.querySelector(".ytp-time-display.notranslate");
            const videoElement = this.getVideoElement();

            if (!display || !player || !videoElement || typeof player.getDuration !== 'function') return;
            
            const currentSpeed = videoElement.playbackRate;
            let durationSpan = document.getElementById("durationAfterSpeedUp");

            if (!durationSpan) {
                durationSpan = document.createElement("span");
                durationSpan.id = "durationAfterSpeedUp";
                durationSpan.className = "yt-speedx-duration-display ytp-time-wrapper ytp-time-wrapper-delhi";
                display.appendChild(durationSpan);
            }
            durationSpan.innerText = `${this.getFormattedTime(player.getDuration() / currentSpeed)} @ ${currentSpeed.toFixed(2)}x`;
        },
        applySpeed: function(videoElement, newSpeed, currentSpeed) {
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
        applyResolution: function(player) {
            if (!player || typeof player.getAvailableQualityLevels !== 'function') return;
            const availableLevels = player.getAvailableQualityLevels();
            const desiredLevel = CONFIG.resolution;
            if (availableLevels.includes(desiredLevel)) {
                player.setPlaybackQualityRange(desiredLevel);
            } else if (availableLevels.length > 0) {
                player.setPlaybackQualityRange(availableLevels[0]);
            }
        },
        changeResolution: function(direction) {
            const player = this.getPlayer();
            if (typeof player?.getAvailableQualityLevels !== 'function') return;
            const availableQualities = player.getAvailableQualityLevels();
            if (!availableQualities || availableQualities.length === 0) return;
            const currentQuality = player.getPlaybackQuality();
            const currentIndex = availableQualities.indexOf(currentQuality);
            let newIndex = currentIndex;
            if (direction === 'up' && currentIndex > 0) newIndex = currentIndex - 1;
            else if (direction === 'down' && currentIndex < availableQualities.length - 1) newIndex = currentIndex + 1;
            if (newIndex !== currentIndex) {
                const newQuality = availableQualities[newIndex];
                player.setPlaybackQualityRange(newQuality);
                CONFIG.resolution = newQuality;
                saveConfig();
            }
        }
    };

    const platformAdapters = [YouTubeAdapter, GenericAdapter];
    const activeAdapter = platformAdapters.find(adapter => adapter.isMatch());

    const sleep = async timeout => new Promise(resolve => setTimeout(resolve, timeout));

    const patchPlayerForFPS = (player) => {
        if (!player || player.isPatchedForFPS) return;
        const originalGetAvailableQualityData = player.getAvailableQualityData;
        player.getAvailableQualityData = function(bypassFilter = false) {
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
        player.getAvailableQualityLevels = function() {
            return player.getAvailableQualityData().map(format => format.quality);
        }
        player.isPatchedForFPS = true;
    };
    
    const createCustomBezel = () => {
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

    const initializePlayer = async () => {
        if (activeAdapter.name !== 'YouTube') {
            const video = activeAdapter.getVideoElement();
            if (video) activeAdapter.applySpeed(video, CONFIG.speed);
            return;
        }
        let player, attempts = 0;
        while (attempts < 20) {
            player = activeAdapter.getPlayer();
            if (player && typeof player.getPlaybackRate === 'function' && typeof player.getAvailableQualityData === 'function') {
                const videoElement = activeAdapter.getVideoElement();
                if (videoElement) {
                    createCustomBezel();
                    patchPlayerForFPS(player);
                    activeAdapter.applySpeed(videoElement, CONFIG.speed, CONFIG.speed);
                    activeAdapter.applyResolution(player);
                    
                    if (!videoElement.dataset.rateListenerAttached) {
                        videoElement.addEventListener('ratechange', () => activeAdapter.updateDurationDisplay());
                        videoElement.dataset.rateListenerAttached = 'true';
                    }
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
        title.textContent = 'YouTube SpeedX Settings';
        const closeBtn = document.createElement('button');
        closeBtn.id = 'yt-speedx-close-btn';
        closeBtn.textContent = '\u00d7';
        header.append(title, closeBtn);
        const body = document.createElement('div');
        body.className = 'yt-speedx-modal-body';
        const settingsGrid = document.createElement('div');
        settingsGrid.className = 'yt-speedx-grid';
        const createInput = (label, id, type, props = {}) => {
            const lbl = document.createElement('label');
            lbl.htmlFor = `yt-speedx-${id}`;
            lbl.textContent = label;
            const input = document.createElement(type);
            Object.assign(input, { id: `yt-speedx-${id}`, ...props });
            return [lbl, input];
        };
        const [speedLabel, speedInput] = createInput('Default Speed', 'speed', 'input', { type: 'number', step: '0.1', min: '0.1', max: '16' });
        const [stepLabel, stepInput] = createInput('Adjustment Step', 'step', 'input', { type: 'number', step: '0.05', min: '0.05', max: '5' });
        const [resLabel, resSelect] = createInput('Default Resolution', 'res', 'select');
        const resolutions = [ { value: "auto", text: "Auto" }, { value: "hd2160", text: "2160p (4K)" }, { value: "hd1440", text: "1440p" }, { value: "hd1080", text: "1080p" }, { value: "hd720", text: "720p" }, { value: "large", text: "480p" }, { value: "medium", text: "360p" }, { value: "small", text: "240p" }, { value: "tiny", text: "144p" } ];
        resolutions.forEach(res => {
            const option = document.createElement('option');
            option.value = res.value;
            option.textContent = res.text;
            resSelect.appendChild(option);
        });
        const [maxFpsQualityLabel, maxFpsQualitySelect] = createInput('Max 60 FPS Quality', 'max-fps-quality', 'select');
        const fpsQualities = [ { value: 'unlimited', text: 'Unlimited' }, { value: '1080', text: 'Max 1080p' }, { value: '720', text: 'Max 720p' }, { value: '480', text: 'Max 480p' }, { value: 'disabled', text: 'Disable 60 FPS' } ];
        fpsQualities.forEach(quality => {
            const option = document.createElement('option');
            option.value = quality.value;
            option.textContent = quality.text;
            maxFpsQualitySelect.appendChild(option);
        });
        const [h264Label, h264Input] = createInput('Force H.264 Codec', 'h264', 'input', { type: 'checkbox', className: 'yt-speedx-checkbox' });
        settingsGrid.append(speedLabel, speedInput, stepLabel, stepInput, resLabel, resSelect, maxFpsQualityLabel, maxFpsQualitySelect, h264Label, h264Input);
        const hr = document.createElement('hr');
        const hotkeysTitle = document.createElement('h3');
        const smallText = document.createElement('small');
        smallText.textContent = '(uses physical key location)';
        hotkeysTitle.append('Hotkeys ', smallText);
        const hotkeysGrid = document.createElement('div');
        hotkeysGrid.className = 'yt-speedx-grid';
        const hotkeyConfigs = [
            { id: 'res-down-key', label: 'Decrease Resolution' }, { id: 'res-up-key', label: 'Increase Resolution' },
            { id: 'settings-key', label: 'Open Settings (Ctrl+Alt+)' }
        ];
        hotkeyConfigs.forEach(config => {
            const [label, input] = createInput(config.label, config.id, 'input', { type: 'text', className: 'yt-speedx-hotkey-input', readOnly: true });
            hotkeysGrid.append(label, input);
        });
        body.append(settingsGrid, hr, hotkeysTitle, hotkeysGrid);
        const footer = document.createElement('div');
        footer.className = 'yt-speedx-modal-footer';
        const saveBtn = document.createElement('button');
        saveBtn.id = 'yt-speedx-save-btn';
        saveBtn.textContent = 'Save and Close';
        footer.appendChild(saveBtn);
        modal.append(header, body, footer);
        document.body.append(overlay, modal);

        GM_addStyle(`
            @keyframes ytSpeedX-text-fadeout {
                0% { opacity: 0; }
                25%, 75% { opacity: 1; }
                100% { opacity: 0; }
            }
            #yt-speedx-bezel-wrapper {
                text-align: center;
                position: absolute;
                left: 0;
                right: 0;
                top: 10%;
                z-index: 19;
                pointer-events: none;
                opacity: 0;
            }
            #yt-speedx-bezel-wrapper.yt-speedx-bezel-show {
                animation: ytSpeedX-text-fadeout 1s cubic-bezier(.05,0,0,1) forwards;
            }
            #yt-speedx-bezel-text {
                display: inline-block;
                padding: 10px 20px;
                font-size: 175%;
                border-radius: 3px;
                -webkit-backdrop-filter: var(--yt-frosted-glass-backdrop-filter-override,blur(16px));
                backdrop-filter: var(--yt-frosted-glass-backdrop-filter-override,blur(16px));
                background: var(--yt-spec-overlay-background-medium,rgba(0,0,0,.6));
            }
            .ytp-time-display.notranslate { display: flex !important; align-items: center !important; }
            .yt-speedx-duration-display { margin-left: 4px; color: #fff; font-size: 1em !important; }
            #yt-speedx-overlay { display: none; position: fixed; z-index: 2500; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); }
            #yt-speedx-modal { display: none; position: fixed; z-index: 2501; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #212121; color: #fff; border: 1px solid #3e3e3e; border-radius: 12px; width: 500px; font-family: "Roboto", "Arial", sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        `);

        const openModal = () => {
            document.getElementById('yt-speedx-speed').value = CONFIG.speed;
            document.getElementById('yt-speedx-step').value = CONFIG.ADJUSTMENT_STEP;
            document.getElementById('yt-speedx-res').value = CONFIG.resolution;
            document.getElementById('yt-speedx-h264').checked = CONFIG.useH264;
            document.getElementById('yt-speedx-max-fps-quality').value = CONFIG.max60FpsQuality;
            document.getElementById('yt-speedx-res-down-key').value = CONFIG.RES_DOWN_KEY;
            document.getElementById('yt-speedx-res-up-key').value = CONFIG.RES_UP_KEY;
            document.getElementById('yt-speedx-settings-key').value = CONFIG.SETTINGS_KEY;
            overlay.style.display = 'block';
            modal.style.display = 'block';
        };
        const closeModal = () => { overlay.style.display = 'none'; modal.style.display = 'none'; };
        const saveAndClose = () => {
            const wasH264Enabled = CONFIG.useH264, wasMaxFpsQuality = CONFIG.max60FpsQuality;
            CONFIG.speed = parseFloat(document.getElementById('yt-speedx-speed').value);
            CONFIG.ADJUSTMENT_STEP = parseFloat(document.getElementById('yt-speedx-step').value);
            CONFIG.resolution = document.getElementById('yt-speedx-res').value;
            CONFIG.useH264 = document.getElementById('yt-speedx-h264').checked;
            CONFIG.max60FpsQuality = document.getElementById('yt-speedx-max-fps-quality').value;
            CONFIG.RES_DOWN_KEY = document.getElementById('yt-speedx-res-down-key').value;
            CONFIG.RES_UP_KEY = document.getElementById('yt-speedx-res-up-key').value;
            CONFIG.SETTINGS_KEY = document.getElementById('yt-speedx-settings-key').value;
            saveConfig();
            closeModal();
            if (wasH264Enabled !== CONFIG.useH264 || wasMaxFpsQuality !== CONFIG.max60FpsQuality) {
                alert("Настройки кодека или частоты кадров вступят в силу после перезагрузки страницы.");
            }
        };
        saveBtn.addEventListener('click', saveAndClose);
        closeBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);
        document.querySelectorAll('.yt-speedx-hotkey-input').forEach(input => {
            input.addEventListener('focus', () => { input.value = 'Press a key...'; });
            input.addEventListener('blur', () => { input.value = CONFIG[input.id.replace('yt-speedx-','').replace('-','_').toUpperCase()] || ''; });
            input.addEventListener('keydown', e => {
                e.preventDefault();
                if (e.code) { input.value = e.code; input.blur(); }
            });
        });
        return { openModal };
    };

    const { openModal } = initSettingsUI();
    initializePlayer();
    if (activeAdapter.name === 'YouTube') {
        window.addEventListener('yt-navigate-finish', initializePlayer);
    }

    window.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.altKey && event.code === CONFIG.SETTINGS_KEY) {
            event.preventDefault(); event.stopImmediatePropagation(); openModal(); return;
        }
        if (event.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) || document.getElementById('yt-speedx-modal')?.style.display === 'block') return;

        const videoElement = activeAdapter.getVideoElement();
        if (!videoElement) return;

        if (event.shiftKey && !event.ctrlKey && !event.altKey) {
            const currentSpeed = videoElement.playbackRate;
            let speedHandled = false;
            if (event.code === 'Period') { // > (Increase)
                if (currentSpeed >= 2) {
                    activeAdapter.applySpeed(videoElement, currentSpeed + CONFIG.ADJUSTMENT_STEP, currentSpeed);
                    speedHandled = true;
                }
            } else if (event.code === 'Comma') { // < (Decrease)
                if (currentSpeed > 2) {
                    const newSpeed = currentSpeed - CONFIG.ADJUSTMENT_STEP;
                    activeAdapter.applySpeed(videoElement, newSpeed, currentSpeed);
                    speedHandled = true;
                }
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
            if (handled) { event.preventDefault(); event.stopImmediatePropagation(); }
        }
    }, true);
});
