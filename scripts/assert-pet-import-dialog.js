const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mainSource = fs.readFileSync(path.join(process.cwd(), 'src', 'main.js'), 'utf8');

assert.match(mainSource, /function createPetImportDialogOptions\(\)/);
assert.match(mainSource, /function createCenteredImportDialogHost\(\)/);
assert.match(mainSource, /screen\.getPrimaryDisplay\(\)/);
assert.match(mainSource, /primaryDisplay\.workArea\.x \+ \(primaryDisplay\.workArea\.width - hostSize\.width\) \/ 2/);
assert.match(mainSource, /primaryDisplay\.workArea\.y \+ primaryDisplay\.workArea\.height \/ 2/);
assert.match(mainSource, /dialog\.showOpenDialog\(hostWindow, createPetImportDialogOptions\(\)\)/);
assert.doesNotMatch(mainSource, /dialog\.showOpenDialog\(mainWindow/);
assert.doesNotMatch(mainSource, /dialog\.showOpenDialog\(createPetImportDialogOptions\(\)\)/);
assert.match(mainSource, /shouldRestorePetWindow/);

console.log(JSON.stringify({
  ok: true,
  checked: 'pet import dialog uses a centered temporary host window',
}, null, 2));
