import type { Adapter } from '../adapters/types';

export const ensureCustomBezel = (activeAdapter: Adapter) => {
  if (activeAdapter.name === 'Rutube') return;
  if (document.getElementById('yt-speedx-bezel-wrapper')) return;

  const player = document.getElementById('movie_player');
  if (!player) return;

  const wrapper = document.createElement('div');
  wrapper.id = 'yt-speedx-bezel-wrapper';

  const textElement = document.createElement('div');
  textElement.id = 'yt-speedx-bezel-text';

  wrapper.appendChild(textElement);
  player.appendChild(wrapper);
};

