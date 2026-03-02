import { GenericAdapter } from './generic';
import type { Adapter } from './types';

export const IviAdapter: Adapter = {
  ...GenericAdapter,
  name: 'Ivi',
  isMatch: () => window.location.hostname.includes('ivi.ru')
};

