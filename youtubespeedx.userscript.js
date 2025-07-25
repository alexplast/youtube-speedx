// ==UserScript==
// @name         YouTube SpeedX
// @namespace    https://github.com/alexplast/youtube-speedx
// @version      1.0.2
// @description  Polished UI, speed/resolution control, H.264 forcing, managed via a hotkey-accessible settings menu.
// @author       https://github.com/alexplast
// @match        https://*.youtube.com/*
// @icon         https://www.google.com/s2/favicons?domain=youtube.com
// @match        https://*.rutube.ru/*
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
    ADJUSTMENT_STEP: 0.1,
    DECREASE_KEY: 'BracketLeft',
    INCREASE_KEY: 'BracketRight',
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
        if (storedConfig.ADJUSTMENT_STEP !== undefined) CONFIG.ADJUSTMENT_STEP = storedConfig.ADJUSTMENT_STEP;
        if (storedConfig.DECREASE_KEY && storedConfig.DECREASE_KEY.length > 1) {
            if (storedConfig.DECREASE_KEY) CONFIG.DECREASE_KEY = storedConfig.DECREASE_KEY;
            if (storedConfig.INCREASE_KEY) CONFIG.INCREASE_KEY = storedConfig.INCREASE_KEY;
            if (storedConfig.RES_DOWN_KEY) CONFIG.RES_DOWN_KEY = storedConfig.RES_DOWN_KEY;
            if (storedConfig.RES_UP_KEY) CONFIG.RES_UP_KEY = storedConfig.RES_UP_KEY;
            if (storedConfig.SETTINGS_KEY) CONFIG.SETTINGS_KEY = storedConfig.SETTINGS_KEY;
        }
    } catch (e) { /* Fail silently on release version */ }
};

const saveConfig = () => {
    try {
        localStorage.setItem('ytSpeedXConfig', JSON.stringify(CONFIG));
    } catch (e) { /* Fail silently on release version */ }
};

// --- H.264 Codec Enforcement (RUNS AT DOCUMENT-START) ---
loadConfig();
if (CONFIG.useH264) {
    (function () {
        'use strict';
        const originalCanPlayType = HTMLVideoElement.prototype.canPlayType;
        HTMLVideoElement.prototype.canPlayType = function (type) {
            if (type && (type.includes('vp8') || type.includes('vp9') || type.includes('av01'))) return '';
            return originalCanPlayType.apply(this, arguments);
        };
        if (window.MediaSource) {
            const originalIsTypeSupported = MediaSource.isTypeSupported;
            MediaSource.isTypeSupported = function (type) {
                if (type && (type.includes('vp8') || type.includes('vp9') || type.includes('av01'))) return '';
                return originalIsTypeSupported.apply(this, arguments);
            };
        }
    })();
}

// --- ALL DOM-DEPENDENT LOGIC RUNS AFTER DOM IS LOADED ---
document.addEventListener('DOMContentLoaded', () => {
    const sleep = async timeout => new Promise(resolve => setTimeout(resolve, timeout));
    const waitElementsLoaded = async (...elementsQueries) => Promise.all(elementsQueries.map(async ele => new Promise(async resolve => {
        while (!document.querySelector(ele)) await sleep(100);
        resolve();
    })));

    const showBezelNotification = (text) => {
        const bezel = document.querySelector(".ytp-bezel-text-wrapper > div");
        if (bezel) {
            bezel.parentElement.parentElement.style.display = "block";
            bezel.innerText = text;
            setTimeout(() => { bezel.parentElement.parentElement.style.display = "none"; }, 1500);
        }
    };

    const getFormattedTime = (seconds) => {
        seconds = Math.max(seconds, 0);
        const hours = Math.floor(seconds / 3600), minutes = Math.floor((seconds % 3600) / 60), secs = Math.floor(seconds % 60);
        const pad = (num) => String(num).padStart(2, '0');
        return `${hours > 0 ? `${hours}:` : ''}${pad(minutes)}:${pad(secs)}`;
    };

    const applySpeed = (videoElement, newSpeed) => {
        if (!videoElement) return;
        CONFIG.speed = +Math.max(0.1, Math.min(newSpeed, 16)).toFixed(2);
        videoElement.playbackRate = CONFIG.speed;
        showBezelNotification(`Speed: ${CONFIG.speed.toFixed(2)}x`);
        saveConfig();
        updateDurationDisplay(videoElement);
    };

    const applyResolution = (player) => {
        if (typeof player?.getAvailableQualityLevels !== 'function' || !CONFIG.resolution) return;
        if (player.getAvailableQualityLevels().includes(CONFIG.resolution)) player.setPlaybackQualityRange(CONFIG.resolution);
    };

    const changeResolution = (player, direction) => {
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
            const qualityData = player.getAvailableQualityData().find(q => q.quality === newQuality);
            showBezelNotification(qualityData ? qualityData.qualityLabel : newQuality);
        }
    };

    const updateDurationDisplay = (videoElement) => {
        const player = document.getElementById("movie_player"), display = document.querySelector(".ytp-time-display.notranslate");
        if (!display || !player || typeof player.getDuration !== 'function') return;
        let durationSpan = document.getElementById("durationAfterSpeedUp");
        if (!durationSpan) {
            durationSpan = document.createElement("span");
            durationSpan.id = "durationAfterSpeedUp";
            durationSpan.classList.add("ytp-time-duration");
            display.appendChild(durationSpan);
        }
        durationSpan.innerText = ` (${getFormattedTime(player.getDuration() / CONFIG.speed)} @ ${CONFIG.speed.toFixed(2)}x)`;
    };

    const setupPlayer = () => {
        const videoElement = document.querySelector('video'), player = document.getElementById("movie_player");
        if (videoElement) {
            applySpeed(videoElement, CONFIG.speed);
            if (player) applyResolution(player);
        }
    };

    const initSettingsUI = () => {
        // --- Create elements programmatically to avoid TrustedHTML errors ---
        const overlay = document.createElement('div');
        overlay.id = 'yt-speedx-overlay';

        const modal = document.createElement('div');
        modal.id = 'yt-speedx-modal';

        // Header
        const header = document.createElement('div');
        header.className = 'yt-speedx-modal-header';
        const title = document.createElement('h2');
        title.textContent = 'YouTube SpeedX Settings';
        const closeBtn = document.createElement('button');
        closeBtn.id = 'yt-speedx-close-btn';
        closeBtn.textContent = '\u00d7'; // Use unicode escape for '×'
        header.append(title, closeBtn);

        // Body
        const body = document.createElement('div');
        body.className = 'yt-speedx-modal-body';

        // --- Settings Grid ---
        const settingsGrid = document.createElement('div');
        settingsGrid.className = 'yt-speedx-grid';

        const speedLabel = document.createElement('label');
        speedLabel.htmlFor = 'yt-speedx-speed';
        speedLabel.textContent = 'Default Speed';
        const speedInput = document.createElement('input');
        Object.assign(speedInput, { type: 'number', id: 'yt-speedx-speed', step: '0.1', min: '0.1', max: '16' });

        const resLabel = document.createElement('label');
        resLabel.htmlFor = 'yt-speedx-res';
        resLabel.textContent = 'Default Resolution';
        const resSelect = document.createElement('select');
        resSelect.id = 'yt-speedx-res';
        const resolutions = {
            "auto": "Auto", "hd2160": "2160p (4K)", "hd1440": "1440p", "hd1080": "1080p",
            "hd720": "720p", "large": "480p", "medium": "360p", "small": "240p", "tiny": "144p"
        };
        for (const [value, text] of Object.entries(resolutions)) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = text;
            resSelect.appendChild(option);
        }

        const h264Label = document.createElement('label');
        h264Label.htmlFor = 'yt-speedx-h264';
        h264Label.textContent = 'Force H.264 Codec';
        const h264Input = document.createElement('input');
        Object.assign(h264Input, { type: 'checkbox', id: 'yt-speedx-h264', className: 'yt-speedx-checkbox' });

        settingsGrid.append(speedLabel, speedInput, resLabel, resSelect, h264Label, h264Input);

        const hr = document.createElement('hr');

        // --- Hotkeys ---
        const hotkeysTitle = document.createElement('h3');
        const smallText = document.createElement('small');
        smallText.textContent = '(uses physical key location)';
        hotkeysTitle.append('Hotkeys ', smallText); // Create composite title safely

        const hotkeysGrid = document.createElement('div');
        hotkeysGrid.className = 'yt-speedx-grid';

        const hotkeyConfigs = [
            { id: 'dec-key', label: 'Decrease Speed' }, { id: 'inc-key', label: 'Increase Speed' },
            { id: 'res-down-key', label: 'Decrease Resolution' }, { id: 'res-up-key', label: 'Increase Resolution' },
            { id: 'settings-key', label: 'Open Settings (Ctrl+Alt+)' }
        ];

        for (const config of hotkeyConfigs) {
            const label = document.createElement('label');
            label.textContent = config.label;
            const input = document.createElement('input');
            input.id = `yt-speedx-${config.id}`;
            Object.assign(input, { type: 'text', className: 'yt-speedx-hotkey-input', readOnly: true });
            hotkeysGrid.append(label, input);
        }

        body.append(settingsGrid, hr, hotkeysTitle, hotkeysGrid);

        // --- Footer ---
        const footer = document.createElement('div');
        footer.className = 'yt-speedx-modal-footer';
        const saveBtn = document.createElement('button');
        saveBtn.id = 'yt-speedx-save-btn';
        saveBtn.textContent = 'Save and Close';
        footer.appendChild(saveBtn);

        // --- Assemble and Append ---
        modal.append(header, body, footer);
        document.body.append(overlay, modal);
        
        GM_addStyle(`
            #yt-speedx-overlay { display: none; position: fixed; z-index: 2500; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); }
            #yt-speedx-modal { display: none; position: fixed; z-index: 2501; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #212121; color: #fff; border: 1px solid #3e3e3e; border-radius: 12px; width: 500px; font-family: "Roboto", "Arial", sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            .yt-speedx-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-bottom: 1px solid #3e3e3e; }
            .yt-speedx-modal-header h2 { margin: 0; font-size: 1.4em; font-weight: 500; }
            #yt-speedx-close-btn { background: none; border: none; color: #aaa; font-size: 2em; cursor: pointer; transition: color 0.2s; }
            #yt-speedx-close-btn:hover { color: #fff; }
            .yt-speedx-modal-body { padding: 24px; }
            .yt-speedx-modal-body hr { border: 0; border-top: 1px solid #3e3e3e; margin: 24px 0; }
            .yt-speedx-modal-body h3 { margin: 0 0 16px 0; font-size: 1.2em; font-weight: 500; }
            .yt-speedx-modal-body h3 small { font-size: 0.7em; color: #aaa; font-weight: 400; }
            .yt-speedx-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: center; }
            .yt-speedx-grid label { font-size: 1em; }
            .yt-speedx-grid input, .yt-speedx-grid select { background: #333; color: #fff; border: 1px solid #555; border-radius: 4px; padding: 10px; font-family: inherit; font-size: 1em; }
            .yt-speedx-grid .yt-speedx-checkbox { justify-self: start; width: 20px; height: 20px; }
            .yt-speedx-hotkey-input { text-align: center; cursor: pointer; background: #333; border: 1px dashed #777; transition: background 0.2s, border-color 0.2s; }
            .yt-speedx-hotkey-input:hover { background: #444; border-color: #999; }
            .yt-speedx-modal-footer { padding: 16px 24px; text-align: right; background: #282828; border-top: 1px solid #3e3e3e; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; }
            #yt-speedx-save-btn { background: #3ea6ff; color: #fff; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 1em; font-weight: 500; transition: background 0.2s; }
            #yt-speedx-save-btn:hover { background: #66bfff; }
        `);

        // --- UI Logic ---
        const openModal = () => {
            document.getElementById('yt-speedx-speed').value = CONFIG.speed;
            document.getElementById('yt-speedx-res').value = CONFIG.resolution;
            document.getElementById('yt-speedx-h264').checked = CONFIG.useH264;
            document.getElementById('yt-speedx-dec-key').value = CONFIG.DECREASE_KEY;
            document.getElementById('yt-speedx-inc-key').value = CONFIG.INCREASE_KEY;
            document.getElementById('yt-speedx-res-down-key').value = CONFIG.RES_DOWN_KEY;
            document.getElementById('yt-speedx-res-up-key').value = CONFIG.RES_UP_KEY;
            document.getElementById('yt-speedx-settings-key').value = CONFIG.SETTINGS_KEY;
            overlay.style.display = 'block';
            modal.style.display = 'block';
        };
        const closeModal = () => {
            overlay.style.display = 'none';
            modal.style.display = 'none';
        };
        const saveAndClose = () => {
            CONFIG.speed = parseFloat(document.getElementById('yt-speedx-speed').value);
            CONFIG.resolution = document.getElementById('yt-speedx-res').value;
            CONFIG.useH264 = document.getElementById('yt-speedx-h264').checked;
            CONFIG.DECREASE_KEY = document.getElementById('yt-speedx-dec-key').value;
            CONFIG.INCREASE_KEY = document.getElementById('yt-speedx-inc-key').value;
            CONFIG.RES_DOWN_KEY = document.getElementById('yt-speedx-res-down-key').value;
            CONFIG.RES_UP_KEY = document.getElementById('yt-speedx-res-up-key').value;
            CONFIG.SETTINGS_KEY = document.getElementById('yt-speedx-settings-key').value;
            saveConfig();
            closeModal();
        };

        saveBtn.addEventListener('click', saveAndClose);
        closeBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);

        document.querySelectorAll('.yt-speedx-hotkey-input').forEach(input => {
            const originalValue = input.value;
            input.addEventListener('focus', () => { input.value = 'Press a key...'; });
            input.addEventListener('blur', () => { if (input.value === 'Press a key...') input.value = originalValue; });
            input.addEventListener('keydown', e => {
                e.preventDefault();
                if (e.code) { input.value = e.code; input.blur(); }
            });
        });

        return { openModal };
    };

    const { openModal } = initSettingsUI();
    (async () => {
        await waitElementsLoaded('video');
        setupPlayer();
        window.addEventListener('yt-page-data-updated', () => waitElementsLoaded('video').then(setupPlayer));
    })();

    window.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.altKey && event.code === CONFIG.SETTINGS_KEY) {
            event.preventDefault();
            event.stopPropagation();
            openModal();
            return;
        }
        if (event.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) || document.getElementById('yt-speedx-modal')?.style.display === 'block') return;
        const videoElement = document.querySelector('video'), player = document.getElementById("movie_player");
        if (!videoElement) return;
        let handled = true;
        switch (event.code) {
            case CONFIG.DECREASE_KEY: applySpeed(videoElement, videoElement.playbackRate - CONFIG.ADJUSTMENT_STEP); break;
            case CONFIG.INCREASE_KEY: applySpeed(videoElement, videoElement.playbackRate + CONFIG.ADJUSTMENT_STEP); break;
            case CONFIG.RES_DOWN_KEY: if (player) changeResolution(player, 'down'); break;
            case CONFIG.RES_UP_KEY: if (player) changeResolution(player, 'up'); break;
            default: handled = false;
        }
        if (handled) {
            event.preventDefault();
            event.stopPropagation();
        }
    }, true);
});