import fs from 'node:fs';
import path from 'node:path';
import { build, context } from 'esbuild';

const args = new Set(process.argv.slice(2));
const watch = args.has('--watch');

const projectRoot = process.cwd();
const distDir = path.join(projectRoot, 'dist');
fs.mkdirSync(distDir, { recursive: true });

const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const version = pkg.version;

const REPO_SLUG = 'alexplast/youtube-speedx';
const RAW_BASE = `https://raw.githubusercontent.com/${REPO_SLUG}/main`;

const makeUserscriptHeader = ({ downloadUrl, updateUrl }) => {
  const lines = [
    '// ==UserScript==',
    '// @name         YouTube SpeedX',
    `// @namespace    https://github.com/${REPO_SLUG}`,
    `// @version      ${version}`,
    '// @description  Polished UI, speed/resolution control, H.264 forcing, managed via a hotkey-accessible settings menu.',
    '// @author       https://github.com/alexplast',
    '// @match        https://*.youtube.com/*',
    '// @icon         https://www.google.com/s2/favicons?domain=youtube.com',
    '// @match        https://rutube.ru/*',
    '// @icon         https://www.google.com/s2/favicons?domain=rutube.ru',
    '// @match        https://*.smotrim.ru/*',
    '// @icon         https://www.google.com/s2/favicons?domain=smotrim.ru',
    '// @match        https://*.ivi.ru/*',
    '// @icon         https://www.google.com/s2/favicons?domain=ivi.ru',
    '// @match        https://*vgtrk.com*/*',
    '// @icon         https://www.google.com/s2/favicons?domain=vgtrk.com',
    '// @match        https://*.twitch.tv/*',
    '// @icon         https://www.google.com/s2/favicons?domain=twitch.tv',
    '// @match        https://disk.yandex.ru/*',
    '// @icon         https://www.google.com/s2/favicons?domain=yandex.ru',
    '// @match        https://web.telegram.org/*',
    '// @icon         https://www.google.com/s2/favicons?domain=telegram.org',
    '// @match        https://vkvideo.ru/*',
    '// @icon         https://www.google.com/s2/favicons?domain=vk.com',
    `// @downloadURL  ${downloadUrl}`,
    `// @updateURL    ${updateUrl}`,
    '// @grant        GM_addStyle',
    '// @run-at       document-start',
    '// ==/UserScript==',
    ''
  ];

  return lines.join('\n');
};

const entryFile = path.join(projectRoot, 'src/main.ts');

const outNormal = path.join(distDir, 'youtubespeedx.userscript.js');
const outMin = path.join(distDir, 'youtubespeedx.userscript.min.js');

const headerNormal = makeUserscriptHeader({
  downloadUrl: `${RAW_BASE}/dist/youtubespeedx.userscript.js`,
  updateUrl: `${RAW_BASE}/dist/youtubespeedx.userscript.js`
});
const headerMin = makeUserscriptHeader({
  downloadUrl: `${RAW_BASE}/dist/youtubespeedx.userscript.min.js`,
  updateUrl: `${RAW_BASE}/dist/youtubespeedx.userscript.min.js`
});

const baseOptions = {
  entryPoints: [entryFile],
  bundle: true,
  platform: 'browser',
  target: 'es2019',
  format: 'iife',
  charset: 'utf8',
  legalComments: 'none',
  logLevel: 'info'
};

const normalOptions = {
  ...baseOptions,
  outfile: outNormal,
  minify: false,
  banner: { js: headerNormal }
};

const minOptions = {
  ...baseOptions,
  outfile: outMin,
  minify: true,
  banner: { js: headerMin }
};

if (watch) {
  const ctxNormal = await context(normalOptions);
  const ctxMin = await context(minOptions);
  await ctxNormal.watch();
  await ctxMin.watch();
  console.log('Watching for changes...');
} else {
  await build(normalOptions);
  await build(minOptions);
}

