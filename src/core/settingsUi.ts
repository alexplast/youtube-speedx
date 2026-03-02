import type { Adapter } from '../adapters/types';
import { CONFIG, saveConfig } from '../config/storage';
import { normalizeOpacity, normalizeSpeed, normalizeStep } from '../utils/number';

export const initSettingsUI = (activeAdapter: Adapter, updateProgressBarVisibility: () => void) => {
  if (document.getElementById('yt-speedx-modal') && document.getElementById('yt-speedx-overlay')) {
    const existingOpen = () => {
      const overlay = document.getElementById('yt-speedx-overlay') as HTMLElement;
      const modal = document.getElementById('yt-speedx-modal') as HTMLElement;
      overlay.style.display = 'block';
      modal.style.display = 'flex';
    };
    return { openModal: existingOpen };
  }

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

  const mainSettingConfigs: Array<{
    id: string;
    label: string;
    elementType: 'input' | 'select';
    props?: Record<string, unknown>;
    options?: Array<{ value: string; text: string }>;
  }> = [
    { id: 'speed', label: 'Default Speed', elementType: 'input', props: { type: 'number', step: '0.05', min: '0.1', max: '16' } },
    { id: 'step', label: 'Adjustment Step', elementType: 'input', props: { type: 'number', step: '0.05', min: '0.05', max: '5' } },
    {
      id: 'res',
      label: 'Default Resolution',
      elementType: 'select',
      options: [
        { value: 'auto', text: 'Auto' },
        { value: 'hd2160', text: '2160p (4K)' },
        { value: 'hd1440', text: '1440p' },
        { value: 'hd1080', text: '1080p' },
        { value: 'hd720', text: '720p' },
        { value: 'large', text: '480p' },
        { value: 'medium', text: '360p' },
        { value: 'small', text: '240p' },
        { value: 'tiny', text: '144p' }
      ]
    },
    {
      id: 'max-fps-quality',
      label: 'Max 60 FPS Quality',
      elementType: 'select',
      options: [
        { value: 'unlimited', text: 'Unlimited' },
        { value: '1080', text: 'Max 1080p' },
        { value: '720', text: 'Max 720p' },
        { value: '480', text: 'Max 480p' },
        { value: 'disabled', text: 'Disable 60 FPS' }
      ]
    },
    { id: 'h264', label: 'Force H.264 Codec', elementType: 'input', props: { type: 'checkbox', className: 'yt-speedx-checkbox' } },
    { id: 'fullscreen-progress', label: 'Fullscreen Progress Bar', elementType: 'input', props: { type: 'checkbox', className: 'yt-speedx-checkbox' } },
    { id: 'progress-opacity', label: 'Progress Bar Opacity', elementType: 'input', props: { type: 'number', step: '0.1', min: '0.1', max: '1' } }
  ];

  mainSettingConfigs.forEach(config => {
    const label = document.createElement('label');
    label.htmlFor = `yt-speedx-${config.id}`;
    label.textContent = config.label;

    const element = document.createElement(config.elementType) as HTMLInputElement | HTMLSelectElement;
    element.id = `yt-speedx-${config.id}`;
    if (config.props) Object.assign(element, config.props);

    if (config.options) {
      config.options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        element.appendChild(option);
      });
    }

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
    const lbl = document.createElement('label');
    lbl.htmlFor = `yt-speedx-${config.id}`;
    lbl.textContent = config.label;
    const input = document.createElement('input');
    Object.assign(input, { id: `yt-speedx-${config.id}`, type: 'text', className: 'yt-speedx-hotkey-input', readOnly: true });
    hotkeysGrid.append(lbl, input);
  });

  const hr2 = document.createElement('hr');
  const boostTitle = document.createElement('h3');
  boostTitle.textContent = 'Speed Boost';
  const boostGrid = document.createElement('div');
  boostGrid.className = 'yt-speedx-grid';
  const boostConfigs: Array<{
    id: string;
    label: string;
    elementType: 'input';
    props: Record<string, unknown>;
  }> = [
    { id: 'boost-enable', label: 'Enable Speed Boost', elementType: 'input', props: { type: 'checkbox', className: 'yt-speedx-checkbox' } },
    { id: 'boost-speed', label: 'Boost Speed (x)', elementType: 'input', props: { type: 'number', step: '0.05', min: '0.1', max: '16' } },
    { id: 'boost-key', label: 'Boost Hotkey', elementType: 'input', props: { type: 'text', className: 'yt-speedx-hotkey-input', readOnly: true } }
  ];
  boostConfigs.forEach(config => {
    const lbl = document.createElement('label');
    lbl.htmlFor = `yt-speedx-${config.id}`;
    lbl.textContent = config.label;
    const input = document.createElement(config.elementType);
    Object.assign(input, { id: `yt-speedx-${config.id}`, ...config.props });
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
    @keyframes ytSpeedX-text-fadeout { 0% { opacity: 0; } 25%, 75% { opacity: 1; } 100% { opacity: 0; } }
    #yt-speedx-bezel-wrapper { text-align: center; position: absolute; left: 0; right: 0; top: 15%; z-index: 2500; pointer-events: none; opacity: 0; }
    #yt-speedx-bezel-wrapper.yt-speedx-bezel-show { animation: ytSpeedX-text-fadeout 1s cubic-bezier(.05,0,0,1) forwards; }
    #yt-speedx-bezel-text { display: inline-block; padding: 10px 20px; font-size: 175%; border-radius: 3px; -webkit-backdrop-filter: var(--yt-frosted-glass-backdrop-filter-override,blur(16px)); backdrop-filter: var(--yt-frosted-glass-backdrop-filter-override,blur(16px)); background: var(--yt-spec-overlay-background-medium,rgba(0,0,0,.6)); text-shadow: 0 0 2px rgba(0,0,0,0.5); }

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
    (document.getElementById('yt-speedx-speed') as HTMLInputElement).value = String(CONFIG.speed);
    (document.getElementById('yt-speedx-step') as HTMLInputElement).value = String(CONFIG.ADJUSTMENT_STEP);
    (document.getElementById('yt-speedx-res') as HTMLSelectElement).value = CONFIG.resolution;
    (document.getElementById('yt-speedx-h264') as HTMLInputElement).checked = CONFIG.useH264;
    (document.getElementById('yt-speedx-max-fps-quality') as HTMLSelectElement).value = CONFIG.max60FpsQuality;
    (document.getElementById('yt-speedx-fullscreen-progress') as HTMLInputElement).checked = CONFIG.enableFullscreenProgress;
    (document.getElementById('yt-speedx-progress-opacity') as HTMLInputElement).value = String(CONFIG.progressBarOpacity);

    (document.getElementById('yt-speedx-res-down-key') as HTMLInputElement).value = CONFIG.RES_DOWN_KEY;
    (document.getElementById('yt-speedx-res-up-key') as HTMLInputElement).value = CONFIG.RES_UP_KEY;
    (document.getElementById('yt-speedx-settings-key') as HTMLInputElement).value = CONFIG.SETTINGS_KEY;

    (document.getElementById('yt-speedx-boost-enable') as HTMLInputElement).checked = CONFIG.enableSpeedBoost;
    (document.getElementById('yt-speedx-boost-key') as HTMLInputElement).value = CONFIG.BOOST_KEY;
    (document.getElementById('yt-speedx-boost-speed') as HTMLInputElement).value = String(CONFIG.BOOST_SPEED);

    overlay.style.display = 'block';
    modal.style.display = 'flex';
  };

  const closeModal = () => {
    overlay.style.display = 'none';
    modal.style.display = 'none';
  };

  const saveAndClose = () => {
    const wasH264Enabled = CONFIG.useH264;
    const wasMaxFpsQuality = CONFIG.max60FpsQuality;

    const prevSpeed = CONFIG.speed;
    const prevStep = CONFIG.ADJUSTMENT_STEP;
    const prevOpacity = CONFIG.progressBarOpacity;
    const prevBoostSpeed = CONFIG.BOOST_SPEED;

    CONFIG.speed = normalizeSpeed((document.getElementById('yt-speedx-speed') as HTMLInputElement).value, prevSpeed) ?? prevSpeed;
    CONFIG.ADJUSTMENT_STEP =
      normalizeStep((document.getElementById('yt-speedx-step') as HTMLInputElement).value, prevStep) ?? prevStep;
    CONFIG.resolution = (document.getElementById('yt-speedx-res') as HTMLSelectElement).value;
    CONFIG.useH264 = (document.getElementById('yt-speedx-h264') as HTMLInputElement).checked;
    CONFIG.max60FpsQuality = (document.getElementById('yt-speedx-max-fps-quality') as HTMLSelectElement).value as any;
    CONFIG.enableFullscreenProgress = (document.getElementById('yt-speedx-fullscreen-progress') as HTMLInputElement).checked;
    CONFIG.progressBarOpacity =
      normalizeOpacity((document.getElementById('yt-speedx-progress-opacity') as HTMLInputElement).value, prevOpacity) ?? prevOpacity;

    CONFIG.RES_DOWN_KEY = (document.getElementById('yt-speedx-res-down-key') as HTMLInputElement).value;
    CONFIG.RES_UP_KEY = (document.getElementById('yt-speedx-res-up-key') as HTMLInputElement).value;
    CONFIG.SETTINGS_KEY = (document.getElementById('yt-speedx-settings-key') as HTMLInputElement).value;

    CONFIG.enableSpeedBoost = (document.getElementById('yt-speedx-boost-enable') as HTMLInputElement).checked;
    CONFIG.BOOST_KEY = (document.getElementById('yt-speedx-boost-key') as HTMLInputElement).value;
    CONFIG.BOOST_SPEED =
      normalizeSpeed((document.getElementById('yt-speedx-boost-speed') as HTMLInputElement).value, prevBoostSpeed) ?? prevBoostSpeed;

    saveConfig();
    closeModal();
    updateProgressBarVisibility();

    if (wasH264Enabled !== CONFIG.useH264 || wasMaxFpsQuality !== CONFIG.max60FpsQuality) {
      alert('Codec or frame rate settings will take effect after reloading the page.');
    }
  };

  saveBtn.addEventListener('click', saveAndClose);
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);

  document.querySelectorAll<HTMLInputElement>('.yt-speedx-hotkey-input').forEach(input => {
    input.addEventListener('focus', () => {
      input.value = 'Press a key...';
    });
    input.addEventListener('blur', () => {
      const configKey = input.id.replace('yt-speedx-', '').replace(/-/g, '_').toUpperCase();
      if (input.value === 'Press a key...') input.value = String((CONFIG as any)[configKey] || '');
    });
    input.addEventListener('keydown', e => {
      e.preventDefault();
      if (e.code) {
        input.value = e.code;
        input.blur();
      }
    });
  });

  return { openModal };
};

