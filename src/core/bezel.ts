import type { Adapter } from '../adapters/types';

const getBezelTargetParent = (activeAdapter: Adapter): HTMLElement | null => {
  return (
    (document.fullscreenElement as HTMLElement | null) ||
    (activeAdapter.getPlayer() as HTMLElement | null) ||
    activeAdapter.getVideoElement()?.parentElement ||
    document.body
  );
};

export const ensureCustomBezel = (activeAdapter: Adapter) => {
  const targetParent = getBezelTargetParent(activeAdapter);
  if (!targetParent) return;

  let wrapper = document.getElementById('yt-speedx-bezel-wrapper');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.id = 'yt-speedx-bezel-wrapper';

    const textElement = document.createElement('div');
    textElement.id = 'yt-speedx-bezel-text';

    wrapper.appendChild(textElement);
  }

  if (wrapper.parentElement !== targetParent) {
    const computed = window.getComputedStyle(targetParent);
    if (computed.position === 'static' && targetParent !== document.body) {
      targetParent.style.position = 'relative';
    }
    targetParent.appendChild(wrapper);
  }
};

export const showCustomBezel = (activeAdapter: Adapter, text: string) => {
  ensureCustomBezel(activeAdapter);

  const wrapper = document.getElementById('yt-speedx-bezel-wrapper');
  const textElement = document.getElementById('yt-speedx-bezel-text');
  if (!wrapper || !textElement) return;

  textElement.textContent = text;
  wrapper.classList.remove('yt-speedx-bezel-show');
  void wrapper.offsetHeight;
  wrapper.classList.add('yt-speedx-bezel-show');
};

