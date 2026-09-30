import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GenericAdapter } from '../../src/adapters/generic';
import { YouTubeAdapter } from '../../src/adapters/youtube';
import { CONFIG } from '../../src/config/storage';

describe('adapters', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('YouTubeAdapter', () => {
    it('does not force quality when resolution is auto', () => {
      CONFIG.resolution = 'auto';

      const mockPlayer = {
        setPlaybackQualityRange: vi.fn(),
        getAvailableQualityLevels: vi.fn().mockReturnValue(['hd1080', 'hd720', 'auto'])
      };

      YouTubeAdapter.applyResolution(mockPlayer);

      expect(mockPlayer.setPlaybackQualityRange).not.toHaveBeenCalled();
    });

    it('applies resolution when a target is configured', () => {
      CONFIG.resolution = '1080';

      const mockPlayer = {
        setPlaybackQualityRange: vi.fn(),
        getAvailableQualityLevels: vi.fn().mockReturnValue(['hd1080', 'hd720', 'medium'])
      };

      YouTubeAdapter.applyResolution(mockPlayer);

      expect(mockPlayer.setPlaybackQualityRange).toHaveBeenCalledWith('hd1080');
    });

    it('handles player without getAvailableQualityLevels gracefully', () => {
      CONFIG.resolution = '1080';
      const mockPlayer = {};

      expect(() => YouTubeAdapter.applyResolution(mockPlayer)).not.toThrow();
    });
  });

  describe('GenericAdapter', () => {
    it('applies playbackRate and triggers bezel notification', () => {
      const video = document.createElement('video');
      document.body.appendChild(video);

      GenericAdapter.applySpeed(video, 1.75);

      expect(video.playbackRate).toBe(1.75);
      expect(CONFIG.speed).toBe(1.75);

      const bezel = document.getElementById('yt-speedx-bezel-text');
      expect(bezel).not.toBeNull();
      expect(bezel?.textContent).toBe('1.75x');
    });

    it('correctly reports isControlsHidden based on fullscreen and controls', () => {
      const video = document.createElement('video');
      document.body.appendChild(video);

      video.controls = true;
      expect(GenericAdapter.isControlsHidden()).toBe(false);

      video.controls = false;
      expect(GenericAdapter.isControlsHidden()).toBe(true);
    });
  });
});
