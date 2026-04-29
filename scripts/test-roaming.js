const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_WINDOW_SIZE,
  FACING,
  LOCOMOTION,
  PHASE,
  POSITION_RESTORE_TOLERANCE_PX,
  advanceRoamingState,
  clampPersistedRoamingState,
  createInitialRoamingState,
  createRoamingBounds,
  toPersistedRoamingState,
} = require('../src/shared/roaming');

const WORK_AREA = {
  x: 0,
  y: 0,
  width: 1280,
  height: 720,
};

function createDeterministicRng(...values) {
  let index = 0;
  const queue = values.length > 0 ? values : [0.25];

  return () => {
    const value = queue[index % queue.length];
    index += 1;
    return value;
  };
}

test('createRoamingBounds respects the window size', () => {
  const bounds = createRoamingBounds(WORK_AREA, DEFAULT_WINDOW_SIZE);

  assert.equal(bounds.minX, 0);
  assert.equal(bounds.minY, 0);
  assert.equal(bounds.maxX, 1120);
  assert.equal(bounds.maxY, 560);
});

test('clampPersistedRoamingState keeps restore positions inside the display', () => {
  const bounds = createRoamingBounds(WORK_AREA, DEFAULT_WINDOW_SIZE);
  const clamped = clampPersistedRoamingState(
    {
      x: WORK_AREA.width + 999,
      y: -240,
      facing: FACING.LEFT,
      locomotion: LOCOMOTION.WALK,
      phase: PHASE.MOVE,
      lastUpdatedAt: 42,
    },
    bounds,
    99,
  );

  assert.deepEqual(clamped, {
    x: bounds.maxX,
    y: bounds.minY,
    facing: FACING.LEFT,
    locomotion: LOCOMOTION.WALK,
    phase: PHASE.MOVE,
    lastUpdatedAt: 42,
  });
});

test('roaming state cycles through spawn, pause, turn, and move', () => {
  const rng = createDeterministicRng(0.12, 0.75, 0.32, 0.88);
  let state = createInitialRoamingState({
    workArea: WORK_AREA,
    now: 1_000,
    rng,
  });

  assert.equal(state.phase, PHASE.SPAWN);
  assert.equal(state.locomotion, LOCOMOTION.IDLE);

  state = advanceRoamingState(state, {
    workArea: WORK_AREA,
    now: state.nextPhaseAt + 1,
    rng,
  });
  assert.equal(state.phase, PHASE.PAUSE);
  assert.equal(state.locomotion, LOCOMOTION.IDLE);

  state = advanceRoamingState(state, {
    workArea: WORK_AREA,
    now: state.nextPhaseAt + 1,
    rng,
  });
  assert.equal(state.phase, PHASE.TURN);
  assert.equal(state.target !== null, true);

  state = advanceRoamingState(state, {
    workArea: WORK_AREA,
    now: state.nextPhaseAt + 1,
    rng,
  });
  assert.equal(state.phase, PHASE.MOVE);
  assert.equal(state.locomotion, LOCOMOTION.WALK);

  const moved = advanceRoamingState(state, {
    workArea: WORK_AREA,
    now: state.lastUpdatedAt + 1,
    rng,
  });

  assert.equal(moved.phase, PHASE.MOVE);
  assert.notEqual(moved.x, state.x);
});

test('roaming movement stays inside bounds across repeated ticks', () => {
  const rng = createDeterministicRng(0.1, 0.9, 0.35, 0.65, 0.2, 0.8);
  let state = createInitialRoamingState({
    workArea: WORK_AREA,
    now: 5_000,
    rng,
  });
  const bounds = createRoamingBounds(WORK_AREA, DEFAULT_WINDOW_SIZE);

  for (let step = 0; step < 120; step += 1) {
    state = advanceRoamingState(state, {
      workArea: WORK_AREA,
      now: 5_000 + step * 200,
      rng,
    });

    assert.ok(state.x >= bounds.minX && state.x <= bounds.maxX, `x out of bounds at step ${step}`);
    assert.ok(state.y >= bounds.minY && state.y <= bounds.maxY, `y out of bounds at step ${step}`);
  }
});

test('persisted roaming state restores near the previous location', () => {
  const rng = createDeterministicRng(0.2, 0.6, 0.4);
  const restored = createInitialRoamingState({
    workArea: WORK_AREA,
    now: 9_000,
    persistedState: {
      x: 420,
      y: 314,
      facing: FACING.RIGHT,
      locomotion: LOCOMOTION.IDLE,
      phase: PHASE.PAUSE,
      lastUpdatedAt: 8_500,
    },
    rng,
  });

  const snapshot = toPersistedRoamingState(restored);

  assert.ok(Math.abs(snapshot.x - 420) <= POSITION_RESTORE_TOLERANCE_PX);
  assert.ok(Math.abs(snapshot.y - 314) <= POSITION_RESTORE_TOLERANCE_PX);
});
