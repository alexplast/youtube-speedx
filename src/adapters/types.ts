export type ResolutionDirection = 'up' | 'down';

export interface Adapter {
  name: string;
  isMatch: () => boolean;
  getVideoElement: () => HTMLVideoElement | null;
  getPlayer: () => any;
  isControlsHidden: () => boolean;
  applySpeed: (videoElement: HTMLVideoElement, newSpeed: number, currentSpeed?: number) => void;
  applyResolution: (player?: any) => void | Promise<void>;
  changeResolution: (direction: ResolutionDirection) => void | Promise<void>;
  updateSpeedIndicator: () => void;
  showBezelNotification: (text: string) => void;
  onInit?: () => void;
}

