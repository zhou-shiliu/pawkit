const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_IDLE_THRESHOLD_SECONDS,
  IDLE_STATE,
  PRESENCE_MODE,
  PRESENCE_OVERRIDE,
  createDockedPoint,
  createInitialPresenceState,
  normalizePresenceState,
  resolvePresenceMode,
  setPresenceIdleThreshold,
  setPresenceOverride,
  shouldShowCarePrompt,
  toPersistedPresenceState,
  updatePresenceState,
} = require('../src/shared/presence');

test('createInitialPresenceState defaults to auto work mode with 10 minute threshold', () => {
  const state = createInitialPresenceState({ now: 1000 });
  assert.equal(state.manualOverride, PRESENCE_OVERRIDE.AUTO);
  assert.equal(state.idleThresholdSeconds, DEFAULT_IDLE_THRESHOLD_SECONDS);
  assert.equal(state.mode, PRESENCE_MODE.WORK);
});

test('normalizePresenceState clamps unsupported thresholds and overrides', () => {
  const state = normalizePresenceState({ idleThresholdSeconds: 123, manualOverride: 'bad' }, { now: 1000 });
  assert.equal(state.idleThresholdSeconds, 600);
  assert.equal(state.manualOverride, PRESENCE_OVERRIDE.AUTO);

  assert.equal(setPresenceIdleThreshold(state, 1800, { now: 1200 }).idleThresholdSeconds, 1800);
  assert.equal(setPresenceIdleThreshold(state, 3600, { now: 1200 }).idleThresholdSeconds, 3600);
});

test('resolvePresenceMode handles auto, manual overrides, locked, and unknown', () => {
  assert.equal(resolvePresenceMode({ systemIdleSeconds: 0, idleThresholdSeconds: 600 }), PRESENCE_MODE.WORK);
  assert.equal(resolvePresenceMode({ systemIdleSeconds: 600, idleThresholdSeconds: 600 }), PRESENCE_MODE.IDLE);
  assert.equal(resolvePresenceMode({ manualOverride: PRESENCE_OVERRIDE.WORK, systemIdleSeconds: 9999 }), PRESENCE_MODE.WORK);
  assert.equal(resolvePresenceMode({ manualOverride: PRESENCE_OVERRIDE.IDLE, systemIdleSeconds: 0 }), PRESENCE_MODE.IDLE);
  assert.equal(resolvePresenceMode({ idleState: IDLE_STATE.IDLE, systemIdleSeconds: 0 }), PRESENCE_MODE.IDLE);
  assert.equal(resolvePresenceMode({ idleState: IDLE_STATE.LOCKED, systemIdleSeconds: 9999 }), PRESENCE_MODE.WORK);
  assert.equal(resolvePresenceMode({ idleState: IDLE_STATE.UNKNOWN, systemIdleSeconds: 9999 }), PRESENCE_MODE.WORK);
});

test('updatePresenceState records live work idle transitions', () => {
  const initial = createInitialPresenceState({ now: 1000, systemIdleSeconds: 0 });
  const idle = updatePresenceState(initial, { now: 2000, systemIdleSeconds: 600, idleState: IDLE_STATE.IDLE });
  const work = updatePresenceState(idle, { now: 3000, systemIdleSeconds: 0, idleState: IDLE_STATE.ACTIVE });

  assert.equal(idle.mode, PRESENCE_MODE.IDLE);
  assert.equal(idle.lastModeChangedAt, 2000);
  assert.equal(work.mode, PRESENCE_MODE.WORK);
  assert.equal(work.lastModeChangedAt, 3000);
});

test('manual override setters force mode predictably', () => {
  const initial = createInitialPresenceState({ now: 1000, systemIdleSeconds: 0 });
  assert.equal(setPresenceOverride(initial, PRESENCE_OVERRIDE.IDLE, { now: 2000 }).mode, PRESENCE_MODE.IDLE);
  assert.equal(setPresenceOverride(initial, PRESENCE_OVERRIDE.WORK, { now: 2000, systemIdleSeconds: 600 }).mode, PRESENCE_MODE.WORK);
});

test('createDockedPoint stays inside work area and docks to the right edge', () => {
  const workArea = { x: 10, y: 20, width: 300, height: 240 };
  const point = createDockedPoint(workArea, { width: 160, height: 160 }, { edgeInset: 8 });
  assert.equal(point.x, 142);
  assert.ok(point.y >= 20);
  assert.ok(point.y <= 100);
});

test('presence persistence excludes volatile mode and idle seconds', () => {
  const persisted = toPersistedPresenceState({
    mode: PRESENCE_MODE.IDLE,
    idleThresholdSeconds: 1800,
    manualOverride: PRESENCE_OVERRIDE.AUTO,
    systemIdleSeconds: 2000,
    lastModeChangedAt: 123,
  });

  assert.deepEqual(persisted, {
    idleThresholdSeconds: 1800,
    manualOverride: PRESENCE_OVERRIDE.AUTO,
    lastModeChangedAt: 123,
  });
});

test('work mode suppresses gentle prompts but allows urgent prompts', () => {
  assert.equal(shouldShowCarePrompt({ mode: PRESENCE_MODE.WORK, careState: { hunger: 28, hydration: 62, happiness: 50 } }), false);
  assert.equal(shouldShowCarePrompt({ mode: PRESENCE_MODE.WORK, careState: { hunger: 18, hydration: 62, happiness: 50 } }), true);
  assert.equal(shouldShowCarePrompt({ mode: PRESENCE_MODE.IDLE, careState: { hunger: 28, hydration: 62, happiness: 50 } }), true);
  assert.equal(shouldShowCarePrompt({ mode: PRESENCE_MODE.IDLE, careState: { hunger: 50, hydration: 62, happiness: 50 } }), false);
});
