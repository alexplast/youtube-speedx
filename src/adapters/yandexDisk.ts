import { GenericAdapter } from './generic';
import type { Adapter } from './types';

export const YandexDiskAdapter: Adapter = {
  ...GenericAdapter,
  name: 'Yandex.Disk',
  isMatch: () => window.location.hostname.includes('disk.yandex.ru')
};

