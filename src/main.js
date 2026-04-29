const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen, shell, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store').default;
const {
  DEFAULT_WINDOW_SIZE,
  advanceRoamingState,
  createInitialRoamingState,
  toPersistedRoamingState,
  ROAMING_TICK_MS,
} = require('./shared/roaming');
const {
  DEFAULT_IDLE_THRESHOLD_SECONDS,
  IDLE_STATE,
  IDLE_THRESHOLD_OPTIONS,
  PRESENCE_MODE,
  PRESENCE_OVERRIDE,
  PRESENCE_TICK_MS,
  createDockedPoint,
  createInitialPresenceState,
  formatIdleThresholdLabel,
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
  getCareActionLabel,
  getPrimaryCareNeedPresentation,
} = require('./shared/carePresentation');
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

const store = new Store();
const DEV_SERVER_URL = process.env.PAWKIT_VITE_DEV_SERVER_URL || process.env.VITE_DEV_SERVER_URL;
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
const SINGLE_INSTANCE_LOCK_PATH = path.join(app.getPath('temp'), 'pawkit-single-instance.lock');
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

let mainWindow = null;
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
  const top = display.workArea.y + ROAMING_EDGE_INSET.top;
  const bottom = display.bounds.y + display.bounds.height - ROAMING_EDGE_INSET.bottom;
  const left = display.bounds.x + ROAMING_EDGE_INSET.left;
  const right = display.bounds.x + display.bounds.width - ROAMING_EDGE_INSET.right;

  return {
    x: left,
    y: top,
    width: Math.max(DEFAULT_WINDOW_SIZE.width, right - left),
    height: Math.max(DEFAULT_WINDOW_SIZE.height, bottom - top),
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
    dock: createDockedPoint(getPrimaryRoamingArea(), DEFAULT_WINDOW_SIZE),
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

function describeGauge(value, labels) {
  const numericValue = Number(value) || 0;
  if (numericValue < 30) return labels.low;
  if (numericValue < 60) return labels.medium;
  return labels.high;
}

function describeTrust(value) {
  const numericValue = Number(value) || 0;
  if (numericValue < 2) return '还在观察';
  if (numericValue < 3.5) return '开始熟悉';
  if (numericValue < 4.5) return '比较亲近';
  return '非常信任';
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


async function openValidationReport() {
  const paths = writeValidationArtifacts();
  const result = await shell.openPath(paths.markdown);
  if (result) {
    console.error('Failed to open validation report:', result);
  }
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

function rebuildTrayMenu() {
  if (!tray) return;

  const safeCareState = careRuntimeState ?? createInitialCareState({ now: Date.now() });
  const primaryNeed = getPrimaryCareNeedPresentation(safeCareState);
  const recommendedAction = primaryNeed?.action ?? null;
  syncValidationNeedPresentation(primaryNeed);
  const careSummary = primaryNeed
    ? `当前需要：${primaryNeed.menuSummary}`
    : '当前状态：稳定，可以随时照料它';

  const presenceSnapshot = getCurrentPresenceSnapshot();
  const modeLabel = presenceSnapshot.mode === PRESENCE_MODE.IDLE ? '闲置态' : '工作态';
  const overrideLabel = presenceSnapshot.manualOverride === PRESENCE_OVERRIDE.AUTO
    ? '自动'
    : presenceSnapshot.manualOverride === PRESENCE_OVERRIDE.IDLE
      ? '强制闲置态'
      : '强制工作态';
  const thresholdLabel = formatIdleThresholdLabel(presenceSnapshot.idleThresholdSeconds);

  const contextMenu = Menu.buildFromTemplate([
    { label: `当前模式：${modeLabel}`, enabled: false },
    { label: `控制方式：${overrideLabel}`, enabled: false },
    { label: `闲置阈值：${thresholdLabel}`, enabled: false },
    { type: 'separator' },
    {
      label: '模式控制',
      submenu: [
        { label: '自动', type: 'radio', checked: presenceSnapshot.manualOverride === PRESENCE_OVERRIDE.AUTO, click: () => setPresenceOverrideFromMenu(PRESENCE_OVERRIDE.AUTO) },
        { label: '强制工作态', type: 'radio', checked: presenceSnapshot.manualOverride === PRESENCE_OVERRIDE.WORK, click: () => setPresenceOverrideFromMenu(PRESENCE_OVERRIDE.WORK) },
        { label: '强制闲置态', type: 'radio', checked: presenceSnapshot.manualOverride === PRESENCE_OVERRIDE.IDLE, click: () => setPresenceOverrideFromMenu(PRESENCE_OVERRIDE.IDLE) },
      ],
    },
    {
      label: '闲置阈值',
      submenu: IDLE_THRESHOLD_OPTIONS.map((seconds) => ({
        label: formatIdleThresholdLabel(seconds),
        type: 'radio',
        checked: presenceSnapshot.idleThresholdSeconds === seconds,
        click: () => setPresenceIdleThresholdFromMenu(seconds),
      })),
    },
    { type: 'separator' },
    { label: careSummary, enabled: false },
    { type: 'separator' },
    { label: getCareActionLabel('feed', recommendedAction), click: () => applyCareAction('feed', { source: 'tray' }) },
    { label: getCareActionLabel('water', recommendedAction), click: () => applyCareAction('water', { source: 'tray' }) },
    { label: getCareActionLabel('pet', recommendedAction), click: () => applyCareAction('pet', { source: 'tray' }) },
    { type: 'separator' },
    {
      label: `食物状态：${describeGauge(safeCareState.hunger, { low: '偏低', medium: '正常', high: '充足' })}`,
      enabled: false,
    },
    {
      label: `饮水状态：${describeGauge(safeCareState.hydration, { low: '偏低', medium: '正常', high: '充足' })}`,
      enabled: false,
    },
    {
      label: `心情状态：${describeGauge(safeCareState.happiness, { low: '想玩', medium: '平稳', high: '放松' })}`,
      enabled: false,
    },
    { label: `信任状态：${describeTrust(safeCareState.trustLevel)}`, enabled: false },
    { type: 'separator' },
    { label: '打开验证报告', click: () => void openValidationReport() },
    { type: 'separator' },
    { label: '显示 Pawkit', click: () => mainWindow?.showInactive() },
    { label: '隐藏窗口', click: () => mainWindow?.hide() },
    { label: '退出', click: () => app.quit() },
  ]);

  tray.setToolTip(primaryNeed ? `Pawkit · ${primaryNeed.menuSummary}` : 'Pawkit · 状态稳定');
  if (process.platform === 'darwin') {
    tray.setTitle(primaryNeed?.trayTitle ?? 'Pawkit');
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
    const panel = document.querySelector('[aria-label="care-status"]');
    const hud = document.querySelector('[aria-label="care-hud"]');
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
    return {
      presenceMode: root?.getAttribute('data-presence-mode') ?? null,
      text: careStatus.text,
      visible: careStatus.visible,
      rect: careStatus.rect,
      careStatus,
      careHud: toSnapshot(hud),
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
  const presenceSnapshot = getCurrentPresenceSnapshot();
  const position = presenceSnapshot.mode === PRESENCE_MODE.WORK
    ? createDockedPoint(getPrimaryRoamingArea(), DEFAULT_WINDOW_SIZE)
    : roamingRuntimeState;
  if (!position) return;

  mainWindow.setBounds(
    {
      x: Math.round(position.x),
      y: Math.round(position.y),
      width: DEFAULT_WINDOW_SIZE.width,
      height: DEFAULT_WINDOW_SIZE.height,
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
      persistPresenceState();
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

  mainWindow = new BrowserWindow({
    width: DEFAULT_WINDOW_SIZE.width,
    height: DEFAULT_WINDOW_SIZE.height,
    x: Math.round((presenceRuntimeState.mode === PRESENCE_MODE.WORK ? createDockedPoint(workArea, DEFAULT_WINDOW_SIZE) : roamingRuntimeState).x),
    y: Math.round((presenceRuntimeState.mode === PRESENCE_MODE.WORK ? createDockedPoint(workArea, DEFAULT_WINDOW_SIZE) : roamingRuntimeState).y),
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
  mainWindow.setIgnoreMouseEvents(true, { forward: true });
  mainWindow.once('ready-to-show', () => {
    mainWindow?.showInactive();
    syncWindowToPresenceState();
    sendRoamingStateUpdate();
    sendPresenceStateUpdate();
    sendCareStateUpdate();
    maybeWriteAutomationRendererStatusSnapshot();
    maybeWriteAutomationPresenceStatusSnapshot();
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
