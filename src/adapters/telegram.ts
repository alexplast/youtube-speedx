import { GenericAdapter } from './generic';
import type { Adapter } from './types';

export const TelegramWebAdapter: Adapter = {
  ...GenericAdapter,
  name: 'Telegram Web',
  isMatch: () => window.location.hostname.includes('web.telegram.org')
};

