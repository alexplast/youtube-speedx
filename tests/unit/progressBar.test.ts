import { beforeEach, describe, expect, it } from 'vitest';
import { GenericAdapter } from '../../src/adapters/generic';
import { CONFIG } from '../../src/config/storage';
import { ensureFullscreenProgressBar, updateProgressBarVisibility } from '../../src/core/progressBar';

describe('progressBar', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    CONFIG.enableFullscreenProgress = true;
    CONFIG.progressBarOpacity = 0.8;
  });

  it('creates progress bar element', () => {
    ensureFullscreenProgressBar();
    const bar = document.getElementById('yt-speedx-progress-bar');
    expect(bar).not.toBeNull();
  });

  it('updates visibility with Generic adapter fallback to video element', () => {
    const video = document.createElement('video');
    video.controls = false;
    document.body.appendChild(video);

    ensureFullscreenProgressBar();

    // Not fullscreen -> should be hidden
    updateProgressBarVisibility(GenericAdapter);
    const bar = document.getElementById('yt-speedx-progress-bar');
    expect(bar?.style.display).toBe('none');
  });
});
