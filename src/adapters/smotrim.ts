import { GenericAdapter } from './generic';
import type { Adapter } from './types';

export const SmotrimAdapter: Adapter = {
  ...GenericAdapter,
  name: 'Smotrim',
  isMatch: () => window.location.hostname.includes('smotrim.ru')
};

