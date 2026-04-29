const PRESENCE_MODE = Object.freeze({
  WORK: 'work',
  IDLE: 'idle',
});

const PRESENCE_OVERRIDE = Object.freeze({
  AUTO: 'auto',
  WORK: 'work',
  IDLE: 'idle',
});

const IDLE_STATE = Object.freeze({
  ACTIVE: 'active',
  IDLE: 'idle',
  LOCKED: 'locked',
  UNKNOWN: 'unknown',
});

const IDLE_THRESHOLD_OPTIONS = Object.freeze([600, 1800, 3600]);
const DEFAULT_IDLE_THRESHOLD_SECONDS = 600;
const PRESENCE_TICK_MS = 1000;
const DOCK_EDGE_INSET_PX = 8;
const DOCK_VERTICAL_RATIO = 0.66;
const GENTLE_PROMPT_THRESHOLD = 35;
const URGENT_PROMPT_THRESHOLD = 20;

function toFiniteNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function clamp(value, min, max) {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

function normalizeIdleThresholdSeconds(value) {
  const seconds = Math.round(toFiniteNumber(value, DEFAULT_IDLE_THRESHOLD_SECONDS));
  return IDLE_THRESHOLD_OPTIONS.includes(seconds) ? seconds : DEFAULT_IDLE_THRESHOLD_SECONDS;
}

function normalizePresenceOverride(value) {
  if (value === PRESENCE_OVERRIDE.WORK) return PRESENCE_OVERRIDE.WORK;
  if (value === PRESENCE_OVERRIDE.IDLE) return PRESENCE_OVERRIDE.IDLE;
  return PRESENCE_OVERRIDE.AUTO;
}

function normalizePresenceMode(value) {
  return value === PRESENCE_MODE.IDLE ? PRESENCE_MODE.IDLE : PRESENCE_MODE.WORK;
}

function normalizeIdleState(value) {
  if (value === IDLE_STATE.IDLE) return IDLE_STATE.IDLE;
  if (value === IDLE_STATE.LOCKED) return IDLE_STATE.LOCKED;
  if (value === IDLE_STATE.UNKNOWN) return IDLE_STATE.UNKNOWN;
  return IDLE_STATE.ACTIVE;
}

function resolvePresenceMode({
  manualOverride = PRESENCE_OVERRIDE.AUTO,
  systemIdleSeconds = 0,
  idleState = IDLE_STATE.ACTIVE,
  idleThresholdSeconds = DEFAULT_IDLE_THRESHOLD_SECONDS,
} = {}) {
  const safeOverride = normalizePresenceOverride(manualOverride);
  if (safeOverride === PRESENCE_OVERRIDE.WORK) return PRESENCE_MODE.WORK;
  if (safeOverride === PRESENCE_OVERRIDE.IDLE) return PRESENCE_MODE.IDLE;

  const safeIdleState = normalizeIdleState(idleState);
  if (safeIdleState === IDLE_STATE.LOCKED || safeIdleState === IDLE_STATE.UNKNOWN) {
    return PRESENCE_MODE.WORK;
  }
  if (safeIdleState === IDLE_STATE.IDLE) return PRESENCE_MODE.IDLE;

  const safeIdleSeconds = Math.max(0, toFiniteNumber(systemIdleSeconds, 0));
  const safeThreshold = normalizeIdleThresholdSeconds(idleThresholdSeconds);
  return safeIdleSeconds >= safeThreshold ? PRESENCE_MODE.IDLE : PRESENCE_MODE.WORK;
}

function normalizePresenceState(state = {}, { now = Date.now() } = {}) {
  const idleThresholdSeconds = normalizeIdleThresholdSeconds(state.idleThresholdSeconds);
  const manualOverride = normalizePresenceOverride(state.manualOverride);
  const systemIdleSeconds = Math.max(0, toFiniteNumber(state.systemIdleSeconds, 0));
  const idleState = normalizeIdleState(state.idleState);
  const mode = normalizePresenceMode(
    state.mode ?? resolvePresenceMode({ manualOverride, systemIdleSeconds, idleState, idleThresholdSeconds }),
  );

  return {
    mode,
    idleThresholdSeconds,
    systemIdleSeconds,
    idleState,
    manualOverride,
    lastModeChangedAt: Math.max(0, toFiniteNumber(state.lastModeChangedAt, now)),
    lastUpdatedAt: Math.max(0, toFiniteNumber(state.lastUpdatedAt, now)),
  };
}

function createInitialPresenceState({ persistedState = null, systemIdleSeconds = 0, idleState = IDLE_STATE.ACTIVE, now = Date.now() } = {}) {
  const base = normalizePresenceState(
    {
      ...(persistedState && typeof persistedState === 'object' ? persistedState : {}),
      systemIdleSeconds,
      idleState,
      mode: undefined,
      lastUpdatedAt: now,
    },
    { now },
  );
  const mode = resolvePresenceMode(base);
  return {
    ...base,
    mode,
    lastModeChangedAt: toFiniteNumber(base.lastModeChangedAt, now),
    lastUpdatedAt: now,
  };
}

function updatePresenceState(state, { systemIdleSeconds, idleState, now = Date.now() } = {}) {
  const previous = normalizePresenceState(state, { now });
  const nextBase = {
    ...previous,
    systemIdleSeconds: Math.max(0, toFiniteNumber(systemIdleSeconds, previous.systemIdleSeconds)),
    idleState: normalizeIdleState(idleState ?? previous.idleState),
    lastUpdatedAt: now,
  };
  const nextMode = resolvePresenceMode(nextBase);
  return {
    ...nextBase,
    mode: nextMode,
    lastModeChangedAt: nextMode === previous.mode ? previous.lastModeChangedAt : now,
  };
}

function setPresenceOverride(state, manualOverride, { now = Date.now(), systemIdleSeconds, idleState } = {}) {
  const previous = normalizePresenceState(state, { now });
  const nextBase = {
    ...previous,
    manualOverride: normalizePresenceOverride(manualOverride),
    systemIdleSeconds: systemIdleSeconds == null ? previous.systemIdleSeconds : Math.max(0, toFiniteNumber(systemIdleSeconds, previous.systemIdleSeconds)),
    idleState: idleState == null ? previous.idleState : normalizeIdleState(idleState),
    lastUpdatedAt: now,
  };
  const nextMode = resolvePresenceMode(nextBase);
  return {
    ...nextBase,
    mode: nextMode,
    lastModeChangedAt: nextMode === previous.mode ? previous.lastModeChangedAt : now,
  };
}

function setPresenceIdleThreshold(state, idleThresholdSeconds, { now = Date.now(), systemIdleSeconds, idleState } = {}) {
  const previous = normalizePresenceState(state, { now });
  const nextBase = {
    ...previous,
    idleThresholdSeconds: normalizeIdleThresholdSeconds(idleThresholdSeconds),
    systemIdleSeconds: systemIdleSeconds == null ? previous.systemIdleSeconds : Math.max(0, toFiniteNumber(systemIdleSeconds, previous.systemIdleSeconds)),
    idleState: idleState == null ? previous.idleState : normalizeIdleState(idleState),
    lastUpdatedAt: now,
  };
  const nextMode = resolvePresenceMode(nextBase);
  return {
    ...nextBase,
    mode: nextMode,
    lastModeChangedAt: nextMode === previous.mode ? previous.lastModeChangedAt : now,
  };
}

function createDockedPoint(workArea, windowSize, { edgeInset = DOCK_EDGE_INSET_PX, verticalRatio = DOCK_VERTICAL_RATIO } = {}) {
  const width = Math.max(1, toFiniteNumber(windowSize?.width, 160));
  const height = Math.max(1, toFiniteNumber(windowSize?.height, 160));
  const minX = toFiniteNumber(workArea?.x, 0);
  const minY = toFiniteNumber(workArea?.y, 0);
  const maxX = minX + Math.max(0, toFiniteNumber(workArea?.width, width) - width);
  const maxY = minY + Math.max(0, toFiniteNumber(workArea?.height, height) - height);

  return {
    x: Math.round(clamp(maxX - edgeInset, minX, maxX)),
    y: Math.round(clamp(minY + toFiniteNumber(workArea?.height, height) * verticalRatio, minY, maxY)),
    facing: 'left',
    locomotion: 'idle',
    phase: 'pause',
    lastUpdatedAt: Date.now(),
  };
}

function toPersistedPresenceState(state) {
  const normalized = normalizePresenceState(state);
  return {
    idleThresholdSeconds: normalized.idleThresholdSeconds,
    manualOverride: normalized.manualOverride,
    lastModeChangedAt: normalized.lastModeChangedAt,
  };
}

function getLowestCareNeed(state = {}) {
  const hunger = toFiniteNumber(state.hunger, 50);
  const hydration = toFiniteNumber(state.hydration, 62);
  const happiness = toFiniteNumber(state.happiness, 50);
  return Math.min(hunger, hydration, happiness);
}

function shouldShowCarePrompt({ mode = PRESENCE_MODE.IDLE, careState = {} } = {}) {
  const lowestNeed = getLowestCareNeed(careState);
  if (lowestNeed >= GENTLE_PROMPT_THRESHOLD) return false;
  if (normalizePresenceMode(mode) === PRESENCE_MODE.WORK) {
    return lowestNeed < URGENT_PROMPT_THRESHOLD;
  }
  return true;
}

function formatIdleThresholdLabel(seconds) {
  const safeSeconds = normalizeIdleThresholdSeconds(seconds);
  if (safeSeconds === 3600) return '1 小时';
  return `${Math.round(safeSeconds / 60)} 分钟`;
}

module.exports = {
  DEFAULT_IDLE_THRESHOLD_SECONDS,
  DOCK_EDGE_INSET_PX,
  GENTLE_PROMPT_THRESHOLD,
  IDLE_STATE,
  IDLE_THRESHOLD_OPTIONS,
  PRESENCE_MODE,
  PRESENCE_OVERRIDE,
  PRESENCE_TICK_MS,
  URGENT_PROMPT_THRESHOLD,
  createDockedPoint,
  createInitialPresenceState,
  formatIdleThresholdLabel,
  normalizeIdleState,
  normalizeIdleThresholdSeconds,
  normalizePresenceOverride,
  normalizePresenceState,
  resolvePresenceMode,
  setPresenceIdleThreshold,
  setPresenceOverride,
  shouldShowCarePrompt,
  toPersistedPresenceState,
  updatePresenceState,
};
