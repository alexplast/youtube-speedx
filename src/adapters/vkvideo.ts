import { GenericAdapter } from './generic';
import type { Adapter } from './types';

export const VkVideoAdapter: Adapter = {
  ...GenericAdapter,
  name: 'VK Video',
  isMatch: () => window.location.hostname.includes('vkvideo.ru')
};

