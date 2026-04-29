const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const appAsarPath =
  process.env.PAWKIT_APP_ASAR_PATH ||
  path.join(process.cwd(), 'dist', 'mac-arm64', 'Pawkit.app', 'Contents', 'Resources', 'app.asar');

if (!fs.existsSync(appAsarPath)) {
  console.error(`Missing packaged asar at: ${appAsarPath}`);
  console.error('Run `npm run pack` first or set PAWKIT_APP_ASAR_PATH.');
  process.exit(1);
}

let listOutput = '';
try {
  listOutput = execFileSync('npx', ['asar', 'list', appAsarPath], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (error) {
  console.error('Failed to inspect app.asar using `npx asar list`.');
  if (error.stderr) {
    console.error(String(error.stderr));
  }
  process.exit(1);
}

const entries = new Set(
  listOutput
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean),
);

const requiredEntries = ['/src/main.js', '/dist/renderer/index.html'];
const forbiddenEntries = ['/index.html'];

const missingRequired = requiredEntries.filter((entry) => !entries.has(entry));
const presentForbidden = forbiddenEntries.filter((entry) => entries.has(entry));

if (missingRequired.length > 0 || presentForbidden.length > 0) {
  console.error('Packaged runtime verification failed.');
  if (missingRequired.length > 0) {
    console.error(`Missing required entries: ${missingRequired.join(', ')}`);
  }
  if (presentForbidden.length > 0) {
    console.error(`Forbidden legacy entries found: ${presentForbidden.join(', ')}`);
  }
  process.exit(1);
}

console.log('Packaged runtime verification passed.');
console.log(`Verified: ${appAsarPath}`);
