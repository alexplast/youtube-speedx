export const applyH264CodecPatch = () => {
  const originalIsTypeSupported = window.MediaSource?.isTypeSupported;
  const originalDecodingInfo = navigator.mediaCapabilities?.decodingInfo;

  const isCodecBlocked = (codecString?: string) => {
    if (!codecString) return false;
    const blockedCodecs = ['vp8', 'vp9', 'vp09', 'av1', 'av01'];
    return blockedCodecs.some(blocked => codecString.includes(blocked));
  };

  if (originalIsTypeSupported) {
    MediaSource.isTypeSupported = function (...args: unknown[]) {
      const [type] = args as [string?];
      if (isCodecBlocked(type)) return false;
      return originalIsTypeSupported.apply(MediaSource, args as [string]);
    } as typeof MediaSource.isTypeSupported;
  }

  if (originalDecodingInfo) {
    navigator.mediaCapabilities.decodingInfo = function (...args: unknown[]) {
      const [info] = args as [MediaDecodingConfiguration?];
      if (isCodecBlocked(info?.video?.contentType)) {
        return Promise.resolve({ supported: false, smooth: false, powerEfficient: false });
      }
      return originalDecodingInfo.apply(navigator.mediaCapabilities, args as [MediaDecodingConfiguration]);
    } as typeof navigator.mediaCapabilities.decodingInfo;
  }
};
