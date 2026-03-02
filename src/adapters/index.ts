import { GenericAdapter } from './generic';
import { IviAdapter } from './ivi';
import { RutubeAdapter } from './rutube';
import { SmotrimAdapter } from './smotrim';
import { TelegramWebAdapter } from './telegram';
import { TwitchAdapter } from './twitch';
import { VgtrkAdapter } from './vgtrk';
import { VkVideoAdapter } from './vkvideo';
import { YandexDiskAdapter } from './yandexDisk';
import { YouTubeAdapter } from './youtube';
import type { Adapter } from './types';

export const platformAdapters: Adapter[] = [
  YouTubeAdapter,
  RutubeAdapter,
  SmotrimAdapter,
  IviAdapter,
  VgtrkAdapter,
  TwitchAdapter,
  VkVideoAdapter,
  TelegramWebAdapter,
  YandexDiskAdapter,
  GenericAdapter
];

export const getActiveAdapter = () => platformAdapters.find(adapter => adapter.isMatch()) ?? GenericAdapter;

