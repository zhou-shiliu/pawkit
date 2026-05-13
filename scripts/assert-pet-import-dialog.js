const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mainSource = fs.readFileSync(path.join(process.cwd(), 'src', 'main.js'), 'utf8');
const appSource = fs.readFileSync(path.join(process.cwd(), 'src', 'renderer', 'App.tsx'), 'utf8');
const panelSource = fs.readFileSync(path.join(process.cwd(), 'src', 'renderer', 'pet', 'PetImportPanel.tsx'), 'utf8');
const cssSource = fs.readFileSync(path.join(process.cwd(), 'src', 'renderer', 'pet', 'PetStage.module.css'), 'utf8');

assert.match(mainSource, /function openPetImportWindow\(\)/);
assert.match(mainSource, /function getImportWindowBounds\(\)/);
assert.match(mainSource, /width: 420, height: 280/);
assert.match(mainSource, /url\.searchParams\.set\('view', 'pet-import'\)/);
assert.match(mainSource, /ipcMain\.handle\('pet:choose-import-source'/);
assert.match(mainSource, /ipcMain\.handle\('pet:close-import-panel'/);
assert.match(mainSource, /onImportPet: openPetImportWindow/);
assert.doesNotMatch(mainSource, /createCenteredImportDialogHost/);
assert.doesNotMatch(mainSource, /hostWindow\.show/);
assert.doesNotMatch(mainSource, /dialog\.showOpenDialog\(mainWindow/);
assert.doesNotMatch(mainSource, /dialog\.showOpenDialog\(hostWindow/);

assert.match(appSource, /view'\) === 'pet-import'/);
assert.match(appSource, /<PetImportPanel \/>/);
assert.match(panelSource, /chooseSource\('zip'\)/);
assert.match(panelSource, /chooseSource\('directory'\)/);
assert.match(panelSource, /closePetImportPanel/);
assert.match(cssSource, /\.importPanel/);
assert.match(cssSource, /-webkit-app-region: drag/);
assert.match(cssSource, /-webkit-app-region: no-drag/);

console.log(JSON.stringify({
  ok: true,
  checked: 'pet import uses a first-class centered Pawkit panel without hidden host line',
}, null, 2));
