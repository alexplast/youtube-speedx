import { GenericAdapter } from './generic';
import type { Adapter } from './types';

export const VgtrkAdapter: Adapter = {
  ...GenericAdapter,
  name: 'VGTRK',
  isMatch: () => window.location.hostname.includes('vgtrk.com')
};

