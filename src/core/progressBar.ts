import { CONFIG } from '../config/storage';
import type { Adapter } from '../adapters/types';

export const ensureFullscreenProgressBar = () => {
  if (document.getElementById('yt-speedx-progress-bar')) return;
  const bar = document.createElement('div');
  bar.id = 'yt-speedx-progress-bar';
  document.body.appendChild(bar);
};

export const updateProgressBarVisibility = (activeAdapter: Adapter) => {
  let progressBar = document.getElementById('yt-speedx-progress-bar') as HTMLElement | null;
  if (!progressBar) {
    ensureFullscreenProgressBar();
    progressBar = document.getElementById('yt-speedx-progress-bar') as HTMLElement | null;
  }

  const player = activeAdapter.getPlayer();
  if (!progressBar || !player) return;

  const isFullscreen = !!document.fullscreenElement;
  const targetParent = (isFullscreen ? document.fullscreenElement : document.body) as HTMLElement;

  if (progressBar.parentElement !== targetParent) targetParent.appendChild(progressBar);

  const controlsHidden = activeAdapter.isControlsHidden();

  if (CONFIG.enableFullscreenProgress && isFullscreen && controlsHidden) {
    progressBar.style.display = 'block';
    progressBar.style.opacity = String(CONFIG.progressBarOpacity);
  } else {
    progressBar.style.display = 'none';
  }
};

