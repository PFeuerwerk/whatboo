import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const linuxChromeCandidates = [
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
];

const windowsChromeCandidates = [
  '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
  '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/mnt/c/Program Files/Microsoft/Edge/Application/msedge.exe'
];

const chromeCandidates = [
  process.env.CHROME_BIN,
  ...linuxChromeCandidates,
  ...(process.env.ALLOW_WSL_WINDOWS_CHROME === '1' ? windowsChromeCandidates : [])
].filter(Boolean);

const chromeBin = chromeCandidates.find(candidate => existsSync(candidate));

if (!chromeBin) {
  console.error('No se encontro Chrome/Chromium Linux para Karma.');
  console.error('Instala chromium/google-chrome en WSL o define CHROME_BIN con un binario Linux compatible.');
  console.error('Si quieres probar Chrome de Windows bajo tu responsabilidad, usa ALLOW_WSL_WINDOWS_CHROME=1.');
  process.exit(1);
}

const ngBin = path.join(
  process.cwd(),
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'ng.cmd' : 'ng'
);

const result = spawnSync(
  ngBin,
  ['test', '--watch=false', '--browsers=ChromeHeadlessNoSandbox'],
  {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      CHROME_BIN: chromeBin
    }
  }
);

process.exit(result.status ?? 1);
