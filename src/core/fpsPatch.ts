import { CONFIG } from '../config/storage';
import type { Max60FpsQuality } from '../config/types';

export type QualityFormat = {
  quality: string;
  qualityLabel?: string;
  [key: string]: unknown;
};

export const filterFormatsByMax60FpsQuality = (formats: QualityFormat[], max60FpsQuality: Max60FpsQuality) => {
  if (max60FpsQuality === 'unlimited') return formats;

  const qualityHeightMap: Record<Exclude<Max60FpsQuality, 'unlimited'>, number> = {
    '1080': 1080,
    '720': 720,
    '480': 480,
    'disabled': 0
  };
  const limit = qualityHeightMap[max60FpsQuality as Exclude<Max60FpsQuality, 'unlimited'>];
  if (typeof limit === 'undefined') return formats;

  return formats.filter(format => {
    if (format && typeof format.qualityLabel === 'string') {
      const match = format.qualityLabel.match(/(\d+)p(\d+)?/);
      if (match) {
        const height = parseInt(match[1] ?? '', 10);
        const fps = match[2] ? parseInt(match[2], 10) : 30;
        if (fps > 30 && height > limit) return false;
      }
    }
    return true;
  });
};

export const patchPlayerForFPS = (player: any) => {
  if (!player || player.isPatchedForFPS) return;
  const originalGetAvailableQualityData = player.getAvailableQualityData;
  if (typeof originalGetAvailableQualityData !== 'function') return;

  player.getAvailableQualityData = function (...args: unknown[]) {
    const [bypassFilter] = args as [boolean?];
    const allFormats = originalGetAvailableQualityData.apply(player, args) as QualityFormat[];
    if (bypassFilter) return allFormats;
    return filterFormatsByMax60FpsQuality(allFormats, CONFIG.max60FpsQuality);
  };

  player.getAvailableQualityLevels = function () {
    return (player.getAvailableQualityData() as QualityFormat[]).map(format => format.quality);
  };

  player.isPatchedForFPS = true;
};
