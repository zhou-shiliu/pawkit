const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mainSource = fs.readFileSync(path.join(process.cwd(), 'src', 'main.js'), 'utf8');

assert.match(mainSource, /function createPetImportDialogOptions\(\)/);
assert.match(mainSource, /function showCenteredPetImportDialog\(\)/);
assert.match(mainSource, /dialog\.showOpenDialog\(createPetImportDialogOptions\(\)\)/);
assert.doesNotMatch(mainSource, /dialog\.showOpenDialog\(mainWindow/);
assert.doesNotMatch(mainSource, /dialog\.showOpenDialog\(mainWindow \?\?/);

console.log(JSON.stringify({
  ok: true,
  checked: 'pet import dialog is independent from pet window',
}, null, 2));
