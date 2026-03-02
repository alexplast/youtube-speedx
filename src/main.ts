import { CONFIG, loadConfig } from './config/storage';
import { applyH264CodecPatch } from './core/h264';
import { runApp } from './app';

loadConfig();

if (CONFIG.useH264) {
  applyH264CodecPatch();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    runApp();
  });
} else {
  runApp();
}
