const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen, powerMonitor, protocol, net, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { pathToFileURL } = require('url');
const ElectronStore = require('electron-store');
const LegacyStore = ElectronStore.default ?? ElectronStore;
const {
  advanceRoamingState,
  createInitialRoamingState,
  toPersistedRoamingState,
  ROAMING_TICK_MS,
} = require('./shared/roaming');
const {
  DEFAULT_IDLE_THRESHOLD_SECONDS,
  IDLE_STATE,
  PRESENCE_MODE,
  PRESENCE_OVERRIDE,
  PRESENCE_TICK_MS,
  createDockedPoint,
  createInitialPresenceState,
  normalizeIdleState,
  normalizeIdleThresholdSeconds,
  normalizePresenceOverride,
  setPresenceIdleThreshold,
  setPresenceOverride,
  shouldShowCarePrompt,
  toPersistedPresenceState,
  updatePresenceState,
} = require('./shared/presence');
const {
  CARE_TICK_MS,
  advanceCareState,
  applyFeedAction,
  applyPetAction,
  applyWaterAction,
  createInitialCareState,
  toPersistedCareState,
} = require('./shared/careLoop');
const {
  createEmptyValidationState,
  normalizeValidationState,
  getNeedKeyFromPresentation,
  getNeedKeyFromState,
  recordValidationSessionStart,
  syncPrimaryCareNeed,
  recordTrayMenuOpen,
  recordCareAction,
  recordPresenceModeChange,
  recordPresenceOverrideChange,
  recordPresenceThresholdChange,
  createValidationArtifacts,
} = require('./shared/validationMetrics');
const {
  loadPetPackage,
} = require('./shared/pet/codexPetAdapter');
const {
  createPetPackageCandidates,
} = require('./shared/pet/packageDiscovery');
const {
  importPetPackage,
  listPetPackages,
} = require('./shared/pet/petLibrary');
const {
  createPetMvpTrayMenuTemplate,
} = require('./shared/pet/petMvpTrayMenu');
const {
  PET_RUNTIME_EVENT,
  createPetBehaviorState,
  reducePetBehaviorState,
} = require('./shared/pet/behaviorController');
const {
  resolveAnimationForSemanticState,
} = require('./shared/pet/petManifest');
const {
  clampRectToWorkArea,
  createDefaultPlacement,
  resolvePlacementForDisplays,
} = require('./shared/pet/placement');
const {
  advanceDragDirectionState,
  createDragDirectionState,
} = require('./shared/pet/dragDirection');
const {
  calculatePetWindowSize,
} = require('./shared/pet/petDisplay');

const DEV_SERVER_URL = process.env.PAWKIT_VITE_DEV_SERVER_URL || process.env.VITE_DEV_SERVER_URL;

if (DEV_SERVER_URL) {
  app.setName('Pawkit Dev');
}

const AUTOMATION_USER_DATA_DIR = String(process.env.PAWKIT_AUTOMATION_USER_DATA_DIR || '').trim();
if (AUTOMATION_USER_DATA_DIR) {
  app.setPath('userData', path.resolve(AUTOMATION_USER_DATA_DIR));
} else if (DEV_SERVER_URL) {
  app.setPath('userData', path.join(app.getPath('appData'), 'pawkit-dev'));
}

const PET_PLACEMENT_STORE_KEY = 'pet.placement';
const PET_ACTIVE_PACKAGE_STORE_KEY = 'pet.activePackageDir';
const store = createAppStore();
const DEFAULT_SOUND_VOLUMES = Object.freeze({
  master: 0.7,
  ambient: 0.35,
  meow: 0.75,
  event: 0.8,
  voice: 0.65,
});
const ROAMING_PERSIST_INTERVAL_MS = 350;
const CARE_PERSIST_INTERVAL_MS = 500;
const AUTOMATION_ACTION_DELAY_MS = 40;
const ROAMING_EDGE_INSET = Object.freeze({
  left: 72,
  right: 28,
  top: 12,
  bottom: 28,
});
const PET_DEFAULT_WINDOW_SIZE = Object.freeze({
  width: 192,
  height: 208,
});
const PET_PLACEMENT_PADDING = 0;
const PET_ASSET_PROTOCOL = 'pawkit-pet';
const petAssetRegistry = new Map();
let hasRegisteredPetAssetProtocol = false;


function createAppStore() {
  const appStore = new ElectronStore({ cwd: app.getPath('userData') });

  try {
    const legacyStore = new LegacyStore();

    for (const key of ['pet', 'cat', 'sound', 'validation']) {
      if (!appStore.has(key) && legacyStore.has(key)) {
        appStore.set(key, legacyStore.get(key));
      }
    }
  } catch {
    // Legacy migration is best-effort; the app can still use the new store.
  }

  return appStore;
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: PET_ASSET_PROTOCOL,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);
const SINGLE_INSTANCE_LOCK_ID = crypto.createHash('sha1').update(`${app.getAppPath()}|${app.getPath('userData')}`).digest('hex').slice(0, 12);
const SINGLE_INSTANCE_LOCK_PATH = path.join(app.getPath('temp'), `pawkit-single-instance-${SINGLE_INSTANCE_LOCK_ID}.lock`);
const hasSingleInstanceLock = app.requestSingleInstanceLock();
let ownsProcessLock = false;

if (!hasSingleInstanceLock || !acquireProcessLock()) {
  app.quit();
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function acquireProcessLock() {
  try {
    if (fs.existsSync(SINGLE_INSTANCE_LOCK_PATH)) {
      const existingPid = Number(fs.readFileSync(SINGLE_INSTANCE_LOCK_PATH, 'utf8').trim());
      if (isProcessAlive(existingPid)) {
        return false;
      }
      fs.unlinkSync(SINGLE_INSTANCE_LOCK_PATH);
    }

    fs.writeFileSync(SINGLE_INSTANCE_LOCK_PATH, String(process.pid), { flag: 'wx' });
    ownsProcessLock = true;
    return true;
  } catch {
    return false;
  }
}

function releaseProcessLock() {
  if (!ownsProcessLock) return;

  try {
    if (fs.existsSync(SINGLE_INSTANCE_LOCK_PATH)) {
      const existingPid = Number(fs.readFileSync(SINGLE_INSTANCE_LOCK_PATH, 'utf8').trim());
      if (existingPid === process.pid) {
        fs.unlinkSync(SINGLE_INSTANCE_LOCK_PATH);
      }
    }
  } catch {
    // Best-effort cleanup only.
  }
}

function getRepoRoot() {
  return path.resolve(__dirname, '..');
}

function getCommunityPetsDir() {
  return path.join(getRepoRoot(), 'pets', 'community');
}

function getBuiltInPetsDir() {
  return path.join(getRepoRoot(), 'pets', 'builtin');
}


function getImportedPetsDir() {
  return path.join(app.getPath('userData'), 'pets', 'imported');
}

function getPetSearchRoots() {
  return [
    { source: 'imported', directory: getImportedPetsDir() },
    { source: 'community', directory: getCommunityPetsDir() },
    { source: 'builtin', directory: getBuiltInPetsDir() },
  ];
}

function getPersistedActivePetDir() {
  return store.get(PET_ACTIVE_PACKAGE_STORE_KEY, '');
}


function getPetWindowSize() {
  const packageInfo = getActivePetPackage();
  return calculatePetWindowSize(packageInfo.manifest?.sprite ?? PET_DEFAULT_WINDOW_SIZE);
}

function getDisplayDescriptors() {
  const primaryId = screen.getPrimaryDisplay().id;
  return screen.getAllDisplays().map((display) => ({
    id: display.id,
    primary: display.id === primaryId,
    scaleFactor: display.scaleFactor,
    workArea: display.workArea,
  }));
}

function normalizePetPlacementForCurrentSize(placement) {
  if (!placement?.bounds) return placement ?? null;
  const petSize = getPetWindowSize();
  return {
    ...placement,
    bounds: {
      ...placement.bounds,
      width: petSize.width,
      height: petSize.height,
    },
  };
}

function getPersistedPetPlacement() {
  return normalizePetPlacementForCurrentSize(store.get(PET_PLACEMENT_STORE_KEY, null));
}

function resolveInitialPetPlacement() {
  const displays = getDisplayDescriptors();
  const persistedPlacement = getPersistedPetPlacement();

  if (persistedPlacement?.bounds) {
    return resolvePlacementForDisplays(persistedPlacement, displays, {
      padding: PET_PLACEMENT_PADDING,
    });
  }

  const primaryDisplay = displays.find((display) => display.primary) ?? displays[0];
  return createDefaultPlacement(primaryDisplay.workArea, getPetWindowSize(), {
    displayId: primaryDisplay.id,
  });
}

function getCurrentPetPlacement() {
  if (!petPlacementState) {
    petPlacementState = resolveInitialPetPlacement();
  }

  return petPlacementState;
}

function persistPetPlacement() {
  if (!petPlacementState) return;
  store.set(PET_PLACEMENT_STORE_KEY, petPlacementState);
}

function createPetPlacementFromBounds(bounds) {
  const petSize = getPetWindowSize();
  const nextBounds = {
    x: Math.round(Number(bounds?.x) || 0),
    y: Math.round(Number(bounds?.y) || 0),
    width: petSize.width,
    height: petSize.height,
  };
  const center = {
    x: nextBounds.x + nextBounds.width / 2,
    y: nextBounds.y + nextBounds.height / 2,
  };
  const display = screen.getDisplayNearestPoint(center);
  const clampedBounds = clampRectToWorkArea(nextBounds, display.workArea, {
    padding: PET_PLACEMENT_PADDING,
  });

  return {
    displayId: display.id,
    anchor: 'manual',
    bounds: clampedBounds,
    scaleFactor: display.scaleFactor,
  };
}

function applyPetPlacementBounds(bounds, options = {}) {
  petPlacementState = createPetPlacementFromBounds(bounds);

  if (mainWindow && !mainWindow.isDestroyed()) {
    const petSize = getPetWindowSize();
    mainWindow.setBounds({
      ...petPlacementState.bounds,
      width: petSize.width,
      height: petSize.height,
    }, false);
  }

  if (options.persist) {
    persistPetPlacement();
  }

  return petPlacementState;
}

function normalizeDragPoint(point = {}) {
  const x = Number(point.screenX);
  const y = Number(point.screenY);

  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  return {
    screenX: x,
    screenY: y,
  };
}

function setPetRuntimeEvent(eventName, options = {}) {
  petRuntimeState = reducePetBehaviorState(petRuntimeState, eventName, { now: Date.now() });
  if (options.notify !== false) {
    sendPetStateUpdate();
  }
  return createPetSnapshot();
}

function startPetDrag(point) {
  const dragPoint = normalizeDragPoint(point);
  if (!dragPoint || !mainWindow || mainWindow.isDestroyed()) return getCurrentPetPlacement();

  petDragState = {
    startPoint: dragPoint,
    startBounds: mainWindow.getBounds(),
    directionState: createDragDirectionState(dragPoint),
  };

  return getCurrentPetPlacement();
}

function updatePetDragDirection(dragPoint, options = {}) {
  if (!petDragState) return null;

  const advanced = advanceDragDirectionState(petDragState.directionState, dragPoint);
  petDragState.directionState = advanced.state;

  if (!advanced.changed) return advanced.direction;

  setPetRuntimeEvent(advanced.direction === 'left'
    ? PET_RUNTIME_EVENT.MOVING_LEFT
    : PET_RUNTIME_EVENT.MOVING_RIGHT, options);
  return advanced.direction;
}

function movePetDrag(point, options = {}) {
  const dragPoint = normalizeDragPoint(point);
  if (!dragPoint || !mainWindow || mainWindow.isDestroyed()) return getCurrentPetPlacement();

  if (!petDragState) {
    startPetDrag(dragPoint);
  }

  const dx = dragPoint.screenX - petDragState.startPoint.screenX;
  const dy = dragPoint.screenY - petDragState.startPoint.screenY;
  updatePetDragDirection(dragPoint, options);

  const petSize = getPetWindowSize();
  return applyPetPlacementBounds({
    x: petDragState.startBounds.x + dx,
    y: petDragState.startBounds.y + dy,
    width: petSize.width,
    height: petSize.height,
  });
}

function endPetDrag(point) {
  const placement = petDragState ? movePetDrag(point, { notify: false }) : getCurrentPetPlacement();
  petDragState = null;
  persistPetPlacement();
  setPetRuntimeEvent(PET_RUNTIME_EVENT.APP_STARTED);
  return placement;
}

function resetPetPlacement() {
  const displays = getDisplayDescriptors();
  const petSize = getPetWindowSize();
  const primaryDisplay = displays.find((display) => display.primary) ?? displays[0];
  const placement = createDefaultPlacement(primaryDisplay.workArea, petSize, {
    displayId: primaryDisplay.id,
  });
  petPlacementState = placement;

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setBounds({
      ...placement.bounds,
      width: petSize.width,
      height: petSize.height,
    }, false);
    mainWindow.showInactive();
  }

  persistPetPlacement();
  sendPetStateUpdate();
  return placement;
}

function createPetAssetUrl(filePath) {
  const resolvedPath = path.resolve(filePath);
  const token = Buffer.from(resolvedPath, 'utf8').toString('base64url');
  petAssetRegistry.set(token, resolvedPath);
  return `${PET_ASSET_PROTOCOL}://asset/${token}`;
}

function registerPetAssetProtocol() {
  if (hasRegisteredPetAssetProtocol) return;
  hasRegisteredPetAssetProtocol = true;

  protocol.handle(PET_ASSET_PROTOCOL, (request) => {
    const url = new URL(request.url);
    if (url.hostname !== 'asset') {
      return new Response('Unknown Pawkit pet asset host', { status: 404 });
    }

    const token = decodeURIComponent(url.pathname.replace(/^\//, ''));
    const filePath = petAssetRegistry.get(token);
    if (!filePath || !fs.existsSync(filePath)) {
      return new Response('Pawkit pet asset not found', { status: 404 });
    }

    return net.fetch(pathToFileURL(filePath).href);
  });
}

function createLoadedPetPackagePayload(loaded, candidate, warnings = []) {
  return {
    ok: true,
    errors: [],
    warnings,
    source: candidate.source,
    packageDir: candidate.directory,
    manifest: loaded.manifest,
    spritePath: loaded.spritePath,
    spriteUrl: createPetAssetUrl(loaded.spritePath),
  };
}

function loadActivePetPackage() {
  const candidates = createPetPackageCandidates({
    envDir: process.env.PAWKIT_ACTIVE_PET_DIR,
    persistedDir: getPersistedActivePetDir(),
    importedDir: getImportedPetsDir(),
    communityDir: getCommunityPetsDir(),
    builtInDir: getBuiltInPetsDir(),
  });
  const failures = [];

  for (const candidate of candidates) {
    const loaded = loadPetPackage(candidate.directory);
    if (!loaded.ok) {
      failures.push(`${candidate.source}: ${candidate.directory}: ${loaded.errors.join('; ')}`);
      continue;
    }

    store.set(PET_ACTIVE_PACKAGE_STORE_KEY, candidate.directory);
    return createLoadedPetPackagePayload(loaded, candidate, failures);
  }

  return {
    ok: false,
    errors: failures.length > 0
      ? failures
      : ['No pet package found. Use tray menu to import a Codex Pet package.'],
    warnings: [],
    source: null,
    packageDir: null,
    manifest: null,
    spritePath: null,
    spriteUrl: null,
  };
}

function getActivePetPackage() {
  if (!activePetPackage) {
    activePetPackage = loadActivePetPackage();
  }

  return activePetPackage;
}

function reloadActivePetPackage() {
  activePetPackage = loadActivePetPackage();
  rebuildTrayMenu();
  sendPetStateUpdate();
  return createPetSnapshot();
}

function listAvailablePetPackages() {
  const packageInfo = getActivePetPackage();
  return listPetPackages(getPetSearchRoots(), {
    activePackageDir: packageInfo.packageDir ?? getPersistedActivePetDir(),
  });
}

function setActivePetPackage(packageDir) {
  const resolvedDir = path.resolve(String(packageDir || ''));
  const availablePackage = listAvailablePetPackages().find((petPackage) => petPackage.packageDir === resolvedDir);
  if (!availablePackage) {
    return {
      ok: false,
      errors: ['pet package is not available'],
      active: createPetSnapshot(),
    };
  }

  const loaded = loadPetPackage(resolvedDir);
  if (!loaded.ok) {
    return {
      ok: false,
      errors: loaded.errors,
      active: createPetSnapshot(),
    };
  }

  const source = availablePackage.source ?? 'unknown';
  store.set(PET_ACTIVE_PACKAGE_STORE_KEY, resolvedDir);
  activePetPackage = createLoadedPetPackagePayload(loaded, { source, directory: resolvedDir });
  petPlacementState = resolvePlacementForDisplays(normalizePetPlacementForCurrentSize(getCurrentPetPlacement()), getDisplayDescriptors(), {
    padding: PET_PLACEMENT_PADDING,
  });
  syncWindowToPresenceState();
  persistPetPlacement();
  petRuntimeState = reducePetBehaviorState(petRuntimeState, PET_RUNTIME_EVENT.APP_STARTED, { now: Date.now() });
  rebuildTrayMenu();
  sendPetStateUpdate();

  return {
    ok: true,
    errors: [],
    active: createPetSnapshot(),
  };
}

async function importPetPackageFromPath(sourcePath, options = {}) {
  const imported = await importPetPackage(sourcePath, getImportedPetsDir());
  if (!imported.ok) {
    return {
      ok: false,
      errors: imported.errors ?? ['pet package import failed'],
      imported: null,
      active: createPetSnapshot(),
    };
  }

  const activation = options.activate === false
    ? { ok: true, errors: [], active: createPetSnapshot() }
    : setActivePetPackage(imported.packageDir);

  return {
    ok: activation.ok,
    errors: activation.errors ?? [],
    imported: {
      packageDir: imported.packageDir,
      manifest: imported.manifest,
    },
    active: activation.active,
  };
}

function createPetImportDialogOptions(sourceType = 'any') {
  const safeType = sourceType === 'zip' || sourceType === 'directory' ? sourceType : 'any';
  const properties = safeType === 'zip'
    ? ['openFile']
    : safeType === 'directory'
      ? ['openDirectory']
      : ['openFile', 'openDirectory'];

  return {
    title: '导入宠物包',
    message: safeType === 'directory'
      ? '选择已解压的 Codex Pet 宠物目录'
      : '选择 Codex Pet zip 包或已解压的宠物目录',
    properties,
    filters: safeType === 'directory'
      ? []
      : [
          { name: 'Codex Pet Package', extensions: ['zip'] },
          { name: 'All Files', extensions: ['*'] },
        ],
  };
}

async function choosePetImportSource(sourceType = 'any', ownerWindow = null) {
  const shouldRestoreOwner = Boolean(ownerWindow && !ownerWindow.isDestroyed() && ownerWindow.isVisible());

  if (shouldRestoreOwner) {
    ownerWindow.hide();
  }

  try {
    const result = await dialog.showOpenDialog(createPetImportDialogOptions(sourceType));

    if (result.canceled || !result.filePaths?.[0]) {
      return {
        ok: false,
        cancelled: true,
        errors: [],
        imported: null,
        active: createPetSnapshot(),
      };
    }

    return await importPetPackageFromPath(result.filePaths[0]);
  } finally {
    if (shouldRestoreOwner && ownerWindow && !ownerWindow.isDestroyed()) {
      ownerWindow.show();
      ownerWindow.focus();
    }
  }
}

function getImportWindowBounds() {
  const display = screen.getPrimaryDisplay();
  const size = { width: 420, height: 280 };
  return {
    ...size,
    x: Math.round(display.workArea.x + (display.workArea.width - size.width) / 2),
    y: Math.round(display.workArea.y + (display.workArea.height - size.height) / 2),
  };
}

function loadImportWindowRenderer(window) {
  if (DEV_SERVER_URL) {
    const url = new URL(DEV_SERVER_URL);
    url.searchParams.set('view', 'pet-import');
    return window.loadURL(url.toString());
  }

  const distPath = path.join(__dirname, '..', 'dist', 'renderer', 'index.html');
  if (!fs.existsSync(distPath)) {
    throw new Error(`Missing renderer build output at ${distPath}. Run "npm run build" before opening pet import panel.`);
  }
  return window.loadFile(distPath, { query: { view: 'pet-import' } });
}

function openPetImportWindow() {
  if (importWindow && !importWindow.isDestroyed()) {
    const bounds = getImportWindowBounds();
    importWindow.setBounds(bounds, false);
    importWindow.show();
    importWindow.focus();
    return;
  }

  const bounds = getImportWindowBounds();
  importWindow = new BrowserWindow({
    ...bounds,
    frame: false,
    transparent: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    title: '导入宠物包',
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  importWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  importWindow.once('ready-to-show', () => {
    importWindow?.show();
    importWindow?.focus();
  });
  importWindow.on('closed', () => {
    importWindow = null;
  });
  loadImportWindowRenderer(importWindow).catch((error) => {
    console.error('Failed to load pet import panel:', error);
    if (importWindow && !importWindow.isDestroyed()) {
      importWindow.close();
    }
  });
}

async function importPetPackageFromDialog() {
  return choosePetImportSource('any');
}

function createPetSnapshot() {
  const packageInfo = getActivePetPackage();
  if (!packageInfo.ok || !packageInfo.manifest) {
    return {
      ok: false,
      errors: packageInfo.errors,
      warnings: packageInfo.warnings ?? [],
      source: packageInfo.source ?? null,
      packageDir: packageInfo.packageDir,
      manifest: packageInfo.manifest,
      spriteUrl: packageInfo.spriteUrl,
      placement: getCurrentPetPlacement(),
      behavior: petRuntimeState,
      animationName: null,
      animation: null,
    };
  }

  const resolvedAnimation = resolveAnimationForSemanticState(packageInfo.manifest, petRuntimeState.semanticState);

  return {
    ok: Boolean(resolvedAnimation.animation),
    errors: resolvedAnimation.animation ? [] : [`No animation for ${petRuntimeState.semanticState}`],
    warnings: packageInfo.warnings ?? [],
    source: packageInfo.source ?? null,
    packageDir: packageInfo.packageDir,
    manifest: packageInfo.manifest,
    spriteUrl: packageInfo.spriteUrl,
    placement: getCurrentPetPlacement(),
    behavior: petRuntimeState,
    animationName: resolvedAnimation.animationName,
    animation: resolvedAnimation.animation,
  };
}

function sendPetStateUpdate() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('pet-state-updated', createPetSnapshot());
}

let mainWindow = null;
let importWindow = null;
let tray = null;
let roamingRuntimeState = null;
let roamingInterval = null;
let lastRoamingPersistAt = 0;
let careRuntimeState = null;
let careInterval = null;
let lastCarePersistAt = 0;
let validationRuntimeState = null;
let presenceRuntimeState = null;
let presenceInterval = null;
let automationIdleSequence = null;
let automationIdleSequenceIndex = 0;
let petRuntimeState = createPetBehaviorState({
  semanticState: process.env.PAWKIT_AUTOMATION_PET_STATE,
  now: Date.now(),
});
let activePetPackage = null;
let petPlacementState = null;
let petDragState = null;

function createFallbackTrayIcon() {
  const svg = `
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path fill="#000000" d="M5.4 1.8c-.9 0-1.6 1-1.6 2.3 0 1.2.6 2.2 1.5 2.2s1.6-1 1.6-2.2c0-1.3-.7-2.3-1.5-2.3Zm7.1 0c-.9 0-1.5 1-1.5 2.3 0 1.2.7 2.2 1.5 2.2.9 0 1.6-1 1.6-2.2 0-1.3-.7-2.3-1.6-2.3ZM2.7 5.7c-.8 0-1.4.9-1.4 2s.6 2 1.4 2c.8 0 1.4-.9 1.4-2s-.6-2-1.4-2Zm12.6 0c-.8 0-1.4.9-1.4 2s.6 2 1.4 2c.8 0 1.4-.9 1.4-2s-.6-2-1.4-2ZM9 6.2c-2.7 0-4.8 2.3-4.8 5 0 2 1.1 3.9 2.9 4.5.8.3 1.2-.2 1.9-.2s1.1.5 1.9.2c1.8-.6 2.9-2.5 2.9-4.5 0-2.7-2.1-5-4.8-5Z"/>
    </svg>
  `.trim();

  const trayIcon = nativeImage
    .createFromDataURL(`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`)
    .resize({ width: 18, height: 18 });

  if (process.platform === 'darwin') {
    trayIcon.setTemplateImage(true);
  }

  return trayIcon;
}

function clampVolume(value, fallback) {
  const volume = Number(value);
  if (!Number.isFinite(volume)) return fallback;
  return Math.max(0, Math.min(1, volume));
}

function normalizeSoundVolumes(input = {}, base = DEFAULT_SOUND_VOLUMES) {
  return {
    master: clampVolume(input.master, base.master),
    ambient: clampVolume(input.ambient, base.ambient),
    meow: clampVolume(input.meow, base.meow),
    event: clampVolume(input.event, base.event),
    voice: clampVolume(input.voice, base.voice),
  };
}

function getPrimaryRoamingArea() {
  const display = screen.getPrimaryDisplay();
  const petSize = getPetWindowSize();
  const top = display.workArea.y + ROAMING_EDGE_INSET.top;
  const bottom = display.bounds.y + display.bounds.height - ROAMING_EDGE_INSET.bottom;
  const left = display.bounds.x + ROAMING_EDGE_INSET.left;
  const right = display.bounds.x + display.bounds.width - ROAMING_EDGE_INSET.right;

  return {
    x: left,
    y: top,
    width: Math.max(petSize.width, right - left),
    height: Math.max(petSize.height, bottom - top),
  };
}

function getPersistedRoamingState() {
  return store.get('cat.roaming', null);
}

function getPersistedPresenceState() {
  return {
    idleThresholdSeconds: store.get('cat.presence.idleThresholdSeconds', DEFAULT_IDLE_THRESHOLD_SECONDS),
    manualOverride: store.get('cat.presence.manualOverride', PRESENCE_OVERRIDE.AUTO),
    lastModeChangedAt: store.get('cat.presence.lastModeChangedAt', Date.now()),
  };
}

function persistPresenceState() {
  if (!presenceRuntimeState) return;
  const persisted = toPersistedPresenceState(presenceRuntimeState);
  store.set('cat.presence.idleThresholdSeconds', persisted.idleThresholdSeconds);
  store.set('cat.presence.manualOverride', persisted.manualOverride);
  store.set('cat.presence.lastModeChangedAt', persisted.lastModeChangedAt);
}

function loadAutomationIdleSequence() {
  const sequencePath = String(process.env.PAWKIT_AUTOMATION_IDLE_SEQUENCE_FILE || '').trim();
  if (!sequencePath) return null;

  try {
    const payload = JSON.parse(fs.readFileSync(sequencePath, 'utf8'));
    const sequence = Array.isArray(payload.sequence)
      ? payload.sequence.map((value) => Math.max(0, Number(value) || 0))
      : [];
    if (sequence.length === 0) return null;
    return {
      sequence,
      stepMs: Math.max(100, Number(payload.stepMs) || PRESENCE_TICK_MS),
      startedAt: Date.now(),
    };
  } catch (error) {
    console.error('Failed to load automation idle sequence:', error);
    return null;
  }
}

function getAutomationIdleSequenceSeconds() {
  if (!automationIdleSequence) return null;
  const elapsed = Date.now() - automationIdleSequence.startedAt;
  const index = Math.min(
    automationIdleSequence.sequence.length - 1,
    Math.floor(elapsed / automationIdleSequence.stepMs),
  );
  automationIdleSequenceIndex = index;
  return automationIdleSequence.sequence[index];
}

function getSystemIdleSeconds() {
  const sequenceValue = getAutomationIdleSequenceSeconds();
  if (sequenceValue != null) return sequenceValue;

  const override = process.env.PAWKIT_AUTOMATION_IDLE_SECONDS;
  if (override !== undefined) return Math.max(0, Number(override) || 0);

  return powerMonitor.getSystemIdleTime();
}

function getSystemPresenceIdleState(thresholdSeconds) {
  const override = String(process.env.PAWKIT_AUTOMATION_IDLE_STATE || '').trim();
  if (override) return normalizeIdleState(override);
  if (getAutomationIdleSequenceSeconds() != null || process.env.PAWKIT_AUTOMATION_IDLE_SECONDS !== undefined) {
    return getSystemIdleSeconds() >= thresholdSeconds ? IDLE_STATE.IDLE : IDLE_STATE.ACTIVE;
  }
  return normalizeIdleState(powerMonitor.getSystemIdleState(thresholdSeconds));
}

function getCurrentPresenceSnapshot() {
  if (!presenceRuntimeState) {
    presenceRuntimeState = createInitialPresenceState({
      persistedState: getPersistedPresenceState(),
      systemIdleSeconds: getSystemIdleSeconds(),
      idleState: getSystemPresenceIdleState(DEFAULT_IDLE_THRESHOLD_SECONDS),
      now: Date.now(),
    });
  }
  return {
    ...presenceRuntimeState,
    dock: createDockedPoint(getPrimaryRoamingArea(), getPetWindowSize()),
  };
}

function getAutomationCareSeed() {
  const rawState = String(process.env.PAWKIT_AUTOMATION_CARE_STATE || '').trim();
  if (!rawState) return null;

  try {
    const parsed = JSON.parse(rawState);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    console.error('Failed to parse automation care state:', error);
    return null;
  }
}

function getPersistedCareState() {
  const automationCareState = getAutomationCareSeed();
  return {
    hunger: automationCareState?.hunger ?? store.get('cat.hunger', 50),
    hydration: automationCareState?.hydration ?? store.get('cat.hydration', 62),
    happiness: automationCareState?.happiness ?? store.get('cat.happiness', 50),
    trustLevel: automationCareState?.trustLevel ?? store.get('cat.trustLevel', 1),
    lastUpdatedAt: automationCareState?.lastUpdatedAt ?? store.get('cat.lastCareUpdatedAt', Date.now()),
  };
}

function getCurrentCareSnapshot() {
  const safeCareState = careRuntimeState ?? createInitialCareState({
    persistedState: getPersistedCareState(),
    now: Date.now(),
  });

  return {
    name: store.get('cat.name', 'Whiskers'),
    ...toPersistedCareState(safeCareState),
    lastFed: store.get('cat.lastFed', null),
    lastWatered: store.get('cat.lastWatered', null),
    lastPet: store.get('cat.lastPet', null),
  };
}

function getPersistedValidationState() {
  return store.get('validation.state', null);
}

function ensureValidationState(now = Date.now()) {
  if (!validationRuntimeState) {
    const persistedState = getPersistedValidationState();
    validationRuntimeState = persistedState
      ? normalizeValidationState(persistedState, now)
      : createEmptyValidationState({ now });
  }

  return validationRuntimeState;
}

function getValidationReportPaths() {
  const directory = path.join(app.getPath('userData'), 'validation');
  return {
    directory,
    markdown: path.join(directory, 'summary.md'),
    json: path.join(directory, 'summary.json'),
  };
}

function writeValidationArtifacts() {
  const paths = getValidationReportPaths();
  const safeState = ensureValidationState(Date.now());
  const artifacts = createValidationArtifacts(safeState, { generatedAt: Date.now() });

  try {
    fs.mkdirSync(paths.directory, { recursive: true });
    fs.writeFileSync(paths.json, artifacts.json);
    fs.writeFileSync(paths.markdown, artifacts.markdown);
  } catch (error) {
    console.error('Failed to write validation artifacts:', error);
  }

  return paths;
}

function persistValidationState() {
  if (!validationRuntimeState) return;
  store.set('validation.state', validationRuntimeState);
  writeValidationArtifacts();
}

function recordValidationSession() {
  validationRuntimeState = recordValidationSessionStart(ensureValidationState(Date.now()), {
    now: Date.now(),
  });
  persistValidationState();
}

function syncValidationNeedPresentation(presentation) {
  const now = Date.now();
  const currentState = ensureValidationState(now);
  const currentKey = getNeedKeyFromState(currentState);
  const visiblePresentation = presentation && shouldShowCarePrompt({
    mode: presenceRuntimeState?.mode ?? PRESENCE_MODE.IDLE,
    careState: careRuntimeState ?? getPersistedCareState(),
  })
    ? presentation
    : null;
  const nextKey = getNeedKeyFromPresentation(visiblePresentation);

  if (currentKey === nextKey) return;

  validationRuntimeState = syncPrimaryCareNeed(currentState, visiblePresentation, { now });
  persistValidationState();
}

function recordValidationTrayOpen() {
  validationRuntimeState = recordTrayMenuOpen(ensureValidationState(Date.now()), {
    now: Date.now(),
  });
  persistValidationState();
}

function recordValidationCareAction(action, source) {
  validationRuntimeState = recordCareAction(ensureValidationState(Date.now()), {
    action,
    source,
    now: Date.now(),
  });
  persistValidationState();
}

function recordValidationPresenceModeChange(previousMode, mode, durationMs) {
  validationRuntimeState = recordPresenceModeChange(ensureValidationState(Date.now()), {
    previousMode,
    mode,
    durationMs,
    now: Date.now(),
  });
  persistValidationState();
}

function recordValidationPresenceOverrideChange(override) {
  validationRuntimeState = recordPresenceOverrideChange(ensureValidationState(Date.now()), {
    override,
    now: Date.now(),
  });
  persistValidationState();
}

function recordValidationPresenceThresholdChange(thresholdSeconds) {
  validationRuntimeState = recordPresenceThresholdChange(ensureValidationState(Date.now()), {
    thresholdSeconds,
    now: Date.now(),
  });
  persistValidationState();
}


function sendCareStateUpdate() {
  if (!mainWindow || mainWindow.isDestroyed() || !careRuntimeState) return;
  mainWindow.webContents.send('cat-state-updated', getCurrentCareSnapshot());
}


function setPresenceOverrideFromMenu(override) {
  const now = Date.now();
  presenceRuntimeState = setPresenceOverride(getCurrentPresenceSnapshot(), override, {
    now,
    systemIdleSeconds: getSystemIdleSeconds(),
    idleState: getSystemPresenceIdleState(getCurrentPresenceSnapshot().idleThresholdSeconds),
  });
  persistPresenceState();
  recordValidationPresenceOverrideChange(presenceRuntimeState.manualOverride);
  syncWindowToPresenceState();
  sendPresenceStateUpdate();
  rebuildTrayMenu();
}

function setPresenceIdleThresholdFromMenu(seconds) {
  const now = Date.now();
  presenceRuntimeState = setPresenceIdleThreshold(getCurrentPresenceSnapshot(), seconds, {
    now,
    systemIdleSeconds: getSystemIdleSeconds(),
    idleState: getSystemPresenceIdleState(seconds),
  });
  persistPresenceState();
  recordValidationPresenceThresholdChange(presenceRuntimeState.idleThresholdSeconds);
  syncWindowToPresenceState();
  sendPresenceStateUpdate();
  rebuildTrayMenu();
}

function showPetWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.showInactive();
  syncWindowToPresenceState();
}

function hidePetWindow() {
  mainWindow?.hide();
}

function getActivePetNameForTray() {
  const packageInfo = getActivePetPackage();
  if (packageInfo.ok && packageInfo.manifest?.name) return packageInfo.manifest.name;
  return '等待导入';
}

function rebuildTrayMenu() {
  if (!tray) return;

  const packages = listAvailablePetPackages();
  const contextMenu = Menu.buildFromTemplate(createPetMvpTrayMenuTemplate({
    activePetName: getActivePetNameForTray(),
    packages,
    handlers: {
      onShow: showPetWindow,
      onHide: hidePetWindow,
      onResetPlacement: resetPetPlacement,
      onImportPet: openPetImportWindow,
      onSetActivePet: (packageDir) => setActivePetPackage(packageDir),
      onQuit: () => app.quit(),
    },
  }));

  tray.setToolTip(`Pawkit · ${getActivePetNameForTray()}`);
  if (process.platform === 'darwin') {
    tray.setTitle('Pawkit');
  }
  tray.setContextMenu(contextMenu);
}

function persistCareState(force = false) {
  if (!careRuntimeState) return;

  const now = Date.now();
  if (!force && now - lastCarePersistAt < CARE_PERSIST_INTERVAL_MS) {
    return;
  }

  const persisted = toPersistedCareState(careRuntimeState, now);
  store.set('cat.hunger', persisted.hunger);
  store.set('cat.hydration', persisted.hydration);
  store.set('cat.happiness', persisted.happiness);
  store.set('cat.trustLevel', persisted.trustLevel);
  store.set('cat.lastCareUpdatedAt', persisted.lastUpdatedAt);
  lastCarePersistAt = now;
}

function stopCareLoop() {
  if (careInterval) {
    clearInterval(careInterval);
    careInterval = null;
  }
}

function startCareLoop() {
  stopCareLoop();

  careInterval = setInterval(() => {
    if (!careRuntimeState) return;

    careRuntimeState = advanceCareState(careRuntimeState, { now: Date.now() });
    persistCareState();
    sendCareStateUpdate();
    rebuildTrayMenu();
  }, CARE_TICK_MS);
}

function applyCareAction(actionType, { source = 'unknown' } = {}) {
  const now = Date.now();

  if (!careRuntimeState) {
    careRuntimeState = createInitialCareState({
      persistedState: getPersistedCareState(),
      now,
    });
  }

  if (actionType === 'feed') {
    careRuntimeState = applyFeedAction(careRuntimeState, { now });
    store.set('cat.lastFed', now);
  } else if (actionType === 'water') {
    careRuntimeState = applyWaterAction(careRuntimeState, { now });
    store.set('cat.lastWatered', now);
  } else if (actionType === 'pet') {
    careRuntimeState = applyPetAction(careRuntimeState, { now });
    store.set('cat.lastPet', now);
  }

  recordValidationCareAction(actionType, source);
  persistCareState(true);
  sendCareStateUpdate();
  rebuildTrayMenu();
}


function getAutomationRendererSnapshotScript() {
  return `(() => {
    const root = document.querySelector('[data-presence-mode]');
    const visualStateTarget = document.querySelector('[data-visual-state]');
    const catPoseTarget = document.querySelector('[data-cat-pose]');
    const panel = document.querySelector('[aria-label="care-status"]');
    const hud = document.querySelector('[aria-label="care-hud"]');
    const pet = document.querySelector('[data-pet-id]');
    const petButton = document.querySelector('button[aria-label]');
    const petBubble = document.querySelector('[aria-label="pet-status-bubble"]');
    const toSnapshot = (element) => {
      const rect = element ? element.getBoundingClientRect() : null;
      const style = element ? window.getComputedStyle(element) : null;
      const visible = Boolean(
        element &&
        rect &&
        rect.width > 0 &&
        rect.height > 0 &&
        style &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity || 1) > 0
      );
      return {
        text: element?.textContent?.replace(/\\s+/g, ' ').trim() ?? '',
        visible,
        rect: rect
          ? {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            }
          : null,
      };
    };
    const careStatus = toSnapshot(panel);
    const petSnapshot = toSnapshot(pet);
    const petButtonSnapshot = toSnapshot(petButton);
    const petBubbleSnapshot = toSnapshot(petBubble);
    return {
      presenceMode: root?.getAttribute('data-presence-mode') ?? null,
      visualState: visualStateTarget?.getAttribute('data-visual-state') ?? null,
      catPose: catPoseTarget?.getAttribute('data-cat-pose') ?? null,
      text: careStatus.text,
      visible: careStatus.visible,
      rect: careStatus.rect,
      careStatus,
      careHud: toSnapshot(hud),
      pet: {
        id: pet?.getAttribute('data-pet-id') ?? null,
        state: pet?.getAttribute('data-pet-state') ?? null,
        animation: pet?.getAttribute('data-pet-animation') ?? null,
        visible: petSnapshot.visible,
        rect: petSnapshot.rect,
        button: petButtonSnapshot,
        bubble: petBubbleSnapshot,
      },
    };
  })()`;
}

function captureAutomationRendererSnapshot() {
  if (!mainWindow || mainWindow.isDestroyed()) return Promise.resolve(null);
  return mainWindow.webContents.executeJavaScript(getAutomationRendererSnapshotScript(), true);
}

function maybeWriteAutomationRendererStatusSnapshot() {
  const statusFile = String(process.env.PAWKIT_AUTOMATION_RENDERER_STATUS_FILE || '').trim();
  if (!statusFile || !mainWindow || mainWindow.isDestroyed()) return;

  setTimeout(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    captureAutomationRendererSnapshot()
      .then((snapshot) => {
        fs.writeFileSync(
          statusFile,
          JSON.stringify(
            {
              capturedAt: new Date().toISOString(),
              ...snapshot,
            },
            null,
            2,
          ),
        );
      })
      .catch((error) => {
        console.error('Failed to capture renderer status snapshot:', error);
      });
  }, 450);
}


function maybeWriteAutomationPresenceStatusSnapshot() {
  const statusFile = String(process.env.PAWKIT_AUTOMATION_PRESENCE_STATUS_FILE || '').trim();
  if (!statusFile) return;

  const samples = [];
  const startedAt = Date.now();
  const durationMs = Math.max(2500, Number(process.env.PAWKIT_AUTOMATION_PRESENCE_SAMPLE_MS) || 3600);
  const intervalMs = Math.max(120, Number(process.env.PAWKIT_AUTOMATION_PRESENCE_SAMPLE_INTERVAL_MS) || 240);

  const timerId = setInterval(() => {
    const presence = getCurrentPresenceSnapshot();
    const bounds = mainWindow?.getBounds();
    const sampleBase = {
      at: new Date().toISOString(),
      presence,
      roaming: roamingRuntimeState ? toPersistedRoamingState(roamingRuntimeState) : null,
      windowBounds: bounds ?? null,
      automationIdleSequenceIndex,
    };

    captureAutomationRendererSnapshot()
      .then((renderer) => {
        samples.push({ ...sampleBase, renderer });
      })
      .catch((error) => {
        samples.push({ ...sampleBase, renderer: null, rendererError: String(error?.message || error) });
      });

    if (Date.now() - startedAt < durationMs) return;
    clearInterval(timerId);
    setTimeout(() => {
      try {
        fs.writeFileSync(statusFile, JSON.stringify({ samples }, null, 2));
      } catch (error) {
        console.error('Failed to write automation presence status file:', error);
      }
    }, 80);
  }, intervalMs);
}

function parseAutomationPetDragDelta() {
  const raw = String(process.env.PAWKIT_AUTOMATION_PET_DRAG_DELTA || '').trim();
  if (!raw) return null;

  const points = raw
    .split(';')
    .map((chunk) => {
      const [rawX, rawY] = chunk.split(',');
      const dx = Number(rawX);
      const dy = Number(rawY);
      return Number.isFinite(dx) && Number.isFinite(dy) ? { dx, dy } : null;
    })
    .filter(Boolean);

  if (points.length === 0) return null;
  return points;
}

function maybeRunAutomationPetDrag() {
  const delta = parseAutomationPetDragDelta();
  const statusFile = String(process.env.PAWKIT_AUTOMATION_PET_DRAG_STATUS_FILE || '').trim();
  if (!delta && !statusFile) return;
  if (!mainWindow || mainWindow.isDestroyed()) return;

  setTimeout(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    const before = mainWindow.getBounds();
    const startPoint = {
      screenX: before.x + before.width / 2,
      screenY: before.y + before.height / 2,
    };
    const deltas = delta ?? [{ dx: 0, dy: 0 }];
    const dragSteps = deltas.map((step) => ({
      screenX: startPoint.screenX + step.dx,
      screenY: startPoint.screenY + step.dy,
    }));

    startPetDrag(startPoint);
    const dragSnapshots = dragSteps.map((stepPoint, index) => {
      const stepPlacement = movePetDrag(stepPoint);
      const stepSnapshot = createPetSnapshot();
      return {
        index,
        delta: deltas[index],
        placement: stepPlacement,
        state: stepSnapshot.behavior.semanticState,
        animation: stepSnapshot.animationName,
      };
    });
    const lastPoint = dragSteps.at(-1) ?? startPoint;
    const duringPlacement = dragSnapshots.at(-1)?.placement ?? getCurrentPetPlacement();
    const duringDrag = createPetSnapshot();
    const placement = endPetDrag(lastPoint);
    const afterDrag = createPetSnapshot();
    const after = mainWindow.getBounds();

    if (!statusFile) return;

    try {
      fs.writeFileSync(
        statusFile,
        JSON.stringify({
          executedAt: new Date().toISOString(),
          delta: deltas,
          before,
          after,
          dragSnapshots,
          duringPlacement,
          duringDrag: {
            state: duringDrag.behavior.semanticState,
            animation: duringDrag.animationName,
          },
          placement,
          afterDrag: {
            state: afterDrag.behavior.semanticState,
            animation: afterDrag.animationName,
          },
        }, null, 2),
      );
    } catch (error) {
      console.error('Failed to write automation pet drag status file:', error);
    }
  }, 650);
}

function maybeRunAutomationCareActions() {
  const rawActions = String(process.env.PAWKIT_AUTOMATION_ACTIONS || '').trim();
  if (!rawActions) return;

  const actions = rawActions
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value === 'feed' || value === 'water' || value === 'pet');

  if (actions.length === 0) return;

  const statusFile = String(process.env.PAWKIT_AUTOMATION_STATUS_FILE || '').trim();
  const before = getCurrentCareSnapshot();

  actions.forEach((action, index) => {
    setTimeout(() => {
      applyCareAction(action, { source: 'automation' });

      if (index !== actions.length - 1 || !statusFile) return;

      const payload = {
        executedAt: new Date().toISOString(),
        actions,
        before,
        after: getCurrentCareSnapshot(),
      };

      try {
        fs.writeFileSync(statusFile, JSON.stringify(payload, null, 2));
      } catch (error) {
        console.error('Failed to write automation care status file:', error);
      }
    }, AUTOMATION_ACTION_DELAY_MS * (index + 1));
  });
}

function persistRoamingState(force = false) {
  if (!roamingRuntimeState) return;
  if (!force && presenceRuntimeState?.mode === PRESENCE_MODE.WORK) return;

  const now = Date.now();
  if (!force && now - lastRoamingPersistAt < ROAMING_PERSIST_INTERVAL_MS) {
    return;
  }

  store.set('cat.roaming', toPersistedRoamingState(roamingRuntimeState));
  lastRoamingPersistAt = now;
}

function sendRoamingStateUpdate() {
  if (!mainWindow || mainWindow.isDestroyed() || !roamingRuntimeState) return;
  mainWindow.webContents.send('roaming-state-updated', toPersistedRoamingState(roamingRuntimeState));
}

function sendPresenceStateUpdate() {
  if (!mainWindow || mainWindow.isDestroyed() || !presenceRuntimeState) return;
  mainWindow.webContents.send('presence-state-updated', getCurrentPresenceSnapshot());
}

function syncWindowToPresenceState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const placement = getCurrentPetPlacement();
  const petSize = getPetWindowSize();
  if (!placement?.bounds) return;

  mainWindow.setBounds(
    {
      x: Math.round(placement.bounds.x),
      y: Math.round(placement.bounds.y),
      width: petSize.width,
      height: petSize.height,
    },
    false,
  );
}

function stopRoamingLoop() {
  if (roamingInterval) {
    clearInterval(roamingInterval);
    roamingInterval = null;
  }
}

function startRoamingLoop() {
  stopRoamingLoop();

  roamingInterval = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed() || !roamingRuntimeState) return;

    if (presenceRuntimeState?.mode === PRESENCE_MODE.IDLE) {
      roamingRuntimeState = advanceRoamingState(roamingRuntimeState, {
        workArea: getPrimaryRoamingArea(),
        windowSize: getPetWindowSize(),
        now: Date.now(),
        rng: Math.random,
      });
    }

    syncWindowToPresenceState();
    persistRoamingState();
    sendRoamingStateUpdate();
  }, ROAMING_TICK_MS);
}


function stopPresenceLoop() {
  if (presenceInterval) {
    clearInterval(presenceInterval);
    presenceInterval = null;
  }
}

function startPresenceLoop() {
  stopPresenceLoop();
  presenceInterval = setInterval(() => {
    if (!presenceRuntimeState) return;
    const previous = presenceRuntimeState;
    const now = Date.now();
    presenceRuntimeState = updatePresenceState(presenceRuntimeState, {
      systemIdleSeconds: getSystemIdleSeconds(),
      idleState: getSystemPresenceIdleState(presenceRuntimeState.idleThresholdSeconds),
      now,
    });

    if (presenceRuntimeState.mode !== previous.mode) {
      recordValidationPresenceModeChange(
        previous.mode,
        presenceRuntimeState.mode,
        now - previous.lastModeChangedAt,
      );
      petRuntimeState = reducePetBehaviorState(
        petRuntimeState,
        presenceRuntimeState.mode === PRESENCE_MODE.IDLE
          ? PET_RUNTIME_EVENT.USER_INACTIVE
          : PET_RUNTIME_EVENT.USER_ACTIVE,
        { now },
      );
      persistPresenceState();
      sendPetStateUpdate();
      rebuildTrayMenu();
    }

    syncWindowToPresenceState();
    sendPresenceStateUpdate();
  }, PRESENCE_TICK_MS);
}

const createWindow = () => {
  const now = Date.now();
  const workArea = getPrimaryRoamingArea();

  automationIdleSequence = loadAutomationIdleSequence();
  roamingRuntimeState = createInitialRoamingState({
    workArea,
    persistedState: getPersistedRoamingState(),
    windowSize: getPetWindowSize(),
    now,
    rng: Math.random,
  });
  presenceRuntimeState = createInitialPresenceState({
    persistedState: {
      ...getPersistedPresenceState(),
      manualOverride: process.env.PAWKIT_AUTOMATION_PRESENCE_OVERRIDE || getPersistedPresenceState().manualOverride,
      idleThresholdSeconds: process.env.PAWKIT_AUTOMATION_IDLE_THRESHOLD_SECONDS || getPersistedPresenceState().idleThresholdSeconds,
    },
    systemIdleSeconds: getSystemIdleSeconds(),
    idleState: getSystemPresenceIdleState(normalizeIdleThresholdSeconds(process.env.PAWKIT_AUTOMATION_IDLE_THRESHOLD_SECONDS || getPersistedPresenceState().idleThresholdSeconds)),
    now,
  });
  persistPresenceState();
  careRuntimeState = createInitialCareState({
    persistedState: getPersistedCareState(),
    now,
  });
  persistCareState(true);
  const initialPetPlacement = getCurrentPetPlacement();
  const initialPetSize = getPetWindowSize();

  mainWindow = new BrowserWindow({
    width: initialPetSize.width,
    height: initialPetSize.height,
    x: Math.round(initialPetPlacement.bounds.x),
    y: Math.round(initialPetPlacement.bounds.y),
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (DEV_SERVER_URL) {
    mainWindow.loadURL(DEV_SERVER_URL).catch((error) => {
      console.error('Failed to load dev server URL:', error);
    });
  } else {
    const distPath = path.join(__dirname, '..', 'dist', 'renderer', 'index.html');
    const rendererPath = fs.existsSync(distPath) ? distPath : null;

    if (!rendererPath) {
      throw new Error(`Missing renderer build output at ${distPath}. Run "npm run build" before packaging or local production launch.`);
    }

    mainWindow.loadFile(rendererPath).catch((error) => {
      console.error('Failed to load renderer build output:', error);
    });
  }

  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.setIgnoreMouseEvents(false);
  mainWindow.once('ready-to-show', () => {
    mainWindow?.showInactive();
    syncWindowToPresenceState();
    sendRoamingStateUpdate();
    sendPresenceStateUpdate();
    sendCareStateUpdate();
    sendPetStateUpdate();
    maybeWriteAutomationRendererStatusSnapshot();
    maybeWriteAutomationPresenceStatusSnapshot();
    maybeRunAutomationPetDrag();
  });

  startPresenceLoop();
  startRoamingLoop();
  startCareLoop();
};

const createTray = () => {
  const iconPath = path.join(__dirname, '..', 'assets', 'tray-icon.png');
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) {
      trayIcon = createFallbackTrayIcon();
    }
  } catch {
    trayIcon = createFallbackTrayIcon();
  }

  if (process.platform === 'darwin') {
    trayIcon.setTemplateImage(true);
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('Pawkit');
  rebuildTrayMenu();
  tray.on('click', () => {
    recordValidationTrayOpen();
    rebuildTrayMenu();
    tray?.popUpContextMenu();
  });
  tray.on('right-click', () => {
    recordValidationTrayOpen();
    rebuildTrayMenu();
    tray?.popUpContextMenu();
  });
  tray.on('double-click', () => mainWindow?.showInactive());
};

app.whenReady().then(() => {
  if (!hasSingleInstanceLock) return;
  registerPetAssetProtocol();
  recordValidationSession();
  createWindow();
  createTray();
  maybeRunAutomationCareActions();
});

app.on('second-instance', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.showInactive();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', () => {
  persistRoamingState(true);
  persistPresenceState();
  persistCareState(true);
  persistPetPlacement();
  persistValidationState();
  stopPresenceLoop();
  stopRoamingLoop();
  stopCareLoop();
  releaseProcessLock();
});

// IPC: get cat state
ipcMain.handle('get-cat-state', () => {
  if (!careRuntimeState) {
    careRuntimeState = createInitialCareState({
      persistedState: getPersistedCareState(),
      now: Date.now(),
    });
  } else {
    careRuntimeState = advanceCareState(careRuntimeState, { now: Date.now() });
  }

  persistCareState();
  sendCareStateUpdate();
  rebuildTrayMenu();

  return {
    name: store.get('cat.name', 'Whiskers'),
    ...toPersistedCareState(careRuntimeState),
    lastFed: store.get('cat.lastFed', null),
    lastWatered: store.get('cat.lastWatered', null),
    lastPet: store.get('cat.lastPet', null),
  };
});


ipcMain.handle('get-presence-state', () => getCurrentPresenceSnapshot());

ipcMain.handle('pet:get-active', () => createPetSnapshot());

ipcMain.handle('pet:event', (_event, eventName) => {
  const safeEventName = Object.values(PET_RUNTIME_EVENT).includes(eventName)
    ? eventName
    : PET_RUNTIME_EVENT.APP_STARTED;
  return setPetRuntimeEvent(safeEventName);
});

ipcMain.handle('pet:list', () => listAvailablePetPackages());

ipcMain.handle('pet:set-active', (_event, packageDir) => setActivePetPackage(packageDir));

ipcMain.handle('pet:import', async (_event, sourcePath) => {
  if (sourcePath) return importPetPackageFromPath(sourcePath);
  openPetImportWindow();
  return {
    ok: false,
    cancelled: true,
    errors: [],
    imported: null,
    active: createPetSnapshot(),
  };
});

ipcMain.handle('pet:choose-import-source', async (event, sourceType) => {
  const sourceWindow = BrowserWindow.fromWebContents(event.sender);
  return choosePetImportSource(sourceType, sourceWindow);
});

ipcMain.handle('pet:close-import-panel', (event) => {
  const sourceWindow = BrowserWindow.fromWebContents(event.sender);
  if (sourceWindow && !sourceWindow.isDestroyed()) {
    sourceWindow.close();
  }
  return createPetSnapshot();
});

ipcMain.handle('pet:reset-placement', () => resetPetPlacement());

ipcMain.handle('pet:show', () => {
  showPetWindow();
  return createPetSnapshot();
});

ipcMain.handle('pet:hide', () => {
  hidePetWindow();
  return createPetSnapshot();
});

ipcMain.handle('pet:drag-start', (_event, point) => startPetDrag(point));

ipcMain.handle('pet:drag-move', (_event, point) => movePetDrag(point));

ipcMain.handle('pet:drag-end', (_event, point) => endPetDrag(point));

ipcMain.handle('set-presence-idle-threshold', (_event, seconds) => {
  setPresenceIdleThresholdFromMenu(seconds);
  return getCurrentPresenceSnapshot();
});

ipcMain.handle('set-presence-override', (_event, override) => {
  setPresenceOverrideFromMenu(normalizePresenceOverride(override));
  return getCurrentPresenceSnapshot();
});

ipcMain.handle('get-roaming-state', () => {
  if (!roamingRuntimeState) {
    roamingRuntimeState = createInitialRoamingState({
      workArea: getPrimaryRoamingArea(),
      persistedState: getPersistedRoamingState(),
      now: Date.now(),
      rng: Math.random,
    });
  }

  return toPersistedRoamingState(roamingRuntimeState);
});

// IPC: feed cat
ipcMain.handle('feed-cat', () => {
  applyCareAction('feed', { source: 'ipc' });
  return {
    hunger: careRuntimeState?.hunger ?? store.get('cat.hunger', 50),
    lastFed: store.get('cat.lastFed', null),
  };
});

// IPC: give water
ipcMain.handle('water-cat', () => {
  applyCareAction('water', { source: 'ipc' });
  return {
    hydration: careRuntimeState?.hydration ?? store.get('cat.hydration', 62),
    lastWatered: store.get('cat.lastWatered', null),
  };
});

// IPC: pet cat
ipcMain.handle('pet-cat', () => {
  applyCareAction('pet', { source: 'ipc' });
  return {
    happiness: careRuntimeState?.happiness ?? store.get('cat.happiness', 50),
    trustLevel: careRuntimeState?.trustLevel ?? store.get('cat.trustLevel', 1),
    lastPet: store.get('cat.lastPet', null),
  };
});

// IPC: drag window
ipcMain.on('drag-start', () => {
  // Handled via -webkit-app-region in CSS
});

// IPC: hide window
ipcMain.on('hide-window', () => {
  mainWindow?.hide();
});

ipcMain.handle('get-sound-settings', () => {
  const volumes = normalizeSoundVolumes(store.get('sound.volumes', DEFAULT_SOUND_VOLUMES));
  return { volumes };
});

ipcMain.handle('set-sound-volume', (_event, nextVolumes = {}) => {
  const currentVolumes = normalizeSoundVolumes(store.get('sound.volumes', DEFAULT_SOUND_VOLUMES));
  const mergedVolumes = normalizeSoundVolumes({ ...currentVolumes, ...nextVolumes }, currentVolumes);
  store.set('sound.volumes', mergedVolumes);

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('sound-volume-updated', mergedVolumes);
  }

  return mergedVolumes;
});

ipcMain.handle('play-sound', (_event, payload = {}) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('play-sound', payload);
  }
  return { ok: true };
});
