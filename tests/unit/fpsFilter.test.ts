import { describe, expect, it } from 'vitest';

import { filterFormatsByMax60FpsQuality, type QualityFormat } from '../../src/core/fpsPatch';

const formats: QualityFormat[] = [
  { quality: 'hd2160', qualityLabel: '2160p60' },
  { quality: 'hd1440', qualityLabel: '1440p60' },
  { quality: 'hd1080', qualityLabel: '1080p60' },
  { quality: 'hd720', qualityLabel: '720p60' },
  { quality: 'hd1080', qualityLabel: '1080p' }
];

describe('fps format filter', () => {
  it('filters only >30fps formats above the limit', () => {
    const limited = filterFormatsByMax60FpsQuality(formats, '1080');
    expect(limited.map(f => f.qualityLabel)).toEqual(['1080p60', '720p60', '1080p']);

    const limited720 = filterFormatsByMax60FpsQuality(formats, '720');
    expect(limited720.map(f => f.qualityLabel)).toEqual(['720p60', '1080p']);
  });

  it('disabled removes all 60fps formats', () => {
    const disabled = filterFormatsByMax60FpsQuality(formats, 'disabled');
    expect(disabled.map(f => f.qualityLabel)).toEqual(['1080p']);
  });
});

