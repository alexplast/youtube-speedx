import { GenericAdapter } from './generic';
import type { Adapter } from './types';

export const TwitchAdapter: Adapter = {
  ...GenericAdapter,
  name: 'Twitch',
  isMatch: () => window.location.hostname.includes('twitch.tv')
};

