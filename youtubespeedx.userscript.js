// ==UserScript==
// @name         YouTube SpeedX
// @namespace    https://github.com/alexplast
// @version      1.0.0
// @description  Polished UI, speed/resolution control, H.264 forcing, managed via a hotkey-accessible settings menu.
// @author       alexplast
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
        const modalHTML = `
            <div id="yt-speedx-overlay"></div><div id="yt-speedx-modal">
                <div class="yt-speedx-modal-header"><h2>YouTube SpeedX Settings</h2><button id="yt-speedx-close-btn">&times;</button></div>
                <div class="yt-speedx-modal-body">
                    <div class="yt-speedx-grid">
                        <label for="yt-speedx-speed">Default Speed</label>
                        <input type="number" id="yt-speedx-speed" step="0.1" min="0.1" max="16">
                        <label for="yt-speedx-res">Default Resolution</label>
                        <select id="yt-speedx-res">
                            <option value="auto">Auto</option>
                            <option value="hd2160">2160p (4K)</option>
                            <option value="hd1440">1440p</option>
                            <option value="hd1080">1080p</option>
                            <option value="hd720">720p</option>
                            <option value="large">480p</option>
                            <option value="medium">360p</option>
                            <option value="small">240p</option>
                            <option value="tiny">144p</option>
                        </select>
                        <label for="yt-speedx-h264">Force H.264 Codec</label>
                        <input type="checkbox" id="yt-speedx-h264" class="yt-speedx-checkbox">
                    </div>
                    <hr>
                    <h3>Hotkeys <small>(uses physical key location)</small></h3>
                    <div class="yt-speedx-grid">
                        <label>Decrease Speed</label><input type="text" id="yt-speedx-dec-key" class="yt-speedx-hotkey-input" readonly>
                        <label>Increase Speed</label><input type="text" id="yt-speedx-inc-key" class="yt-speedx-hotkey-input" readonly>
                        <label>Decrease Resolution</label><input type="text" id="yt-speedx-res-down-key" class="yt-speedx-hotkey-input" readonly>
                        <label>Increase Resolution</label><input type="text" id="yt-speedx-res-up-key" class="yt-speedx-hotkey-input" readonly>
                        <label>Open Settings (Ctrl+Alt+)</label><input type="text" id="yt-speedx-settings-key" class="yt-speedx-hotkey-input" readonly>
                    </div>
                </div>
                <div class="yt-speedx-modal-footer"><button id="yt-speedx-save-btn">Save and Close</button></div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
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
        const openModal = () => {
            document.getElementById('yt-speedx-speed').value = CONFIG.speed;
            document.getElementById('yt-speedx-res').value = CONFIG.resolution;
            document.getElementById('yt-speedx-h264').checked = CONFIG.useH264;
            document.getElementById('yt-speedx-dec-key').value = CONFIG.DECREASE_KEY;
            document.getElementById('yt-speedx-inc-key').value = CONFIG.INCREASE_KEY;
            document.getElementById('yt-speedx-res-down-key').value = CONFIG.RES_DOWN_KEY;
            document.getElementById('yt-speedx-res-up-key').value = CONFIG.RES_UP_KEY;
            document.getElementById('yt-speedx-settings-key').value = CONFIG.SETTINGS_KEY;
            document.getElementById('yt-speedx-overlay').style.display = 'block';
            document.getElementById('yt-speedx-modal').style.display = 'block';
        };
        const closeModal = () => {
            document.getElementById('yt-speedx-overlay').style.display = 'none';
            document.getElementById('yt-speedx-modal').style.display = 'none';
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
        document.getElementById('yt-speedx-save-btn').addEventListener('click', saveAndClose);
        document.getElementById('yt-speedx-close-btn').addEventListener('click', closeModal);
        document.getElementById('yt-speedx-overlay').addEventListener('click', closeModal);
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
