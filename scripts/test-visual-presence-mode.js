const test = require('node:test');
const assert = require('node:assert/strict');

const {
  VISUAL_DWELL_MS,
  VISUAL_PRESENCE_MODE,
  VISUAL_ROAMING_PHASE,
  VISUAL_STATE,
  advanceVisualPresenceState,
  createVisualPresenceState,
  getAllowedVisualStates,
  getCatPoseForVisualState,
  normalizeVisualState,
  resolveVisualBucket,
} = require('../src/shared/visualPresence');

test('invalid states fall back to the context default state', () => {
  assert.equal(
    normalizeVisualState('bad', { presenceMode: VISUAL_PRESENCE_MODE.WORK, roamingPhase: VISUAL_ROAMING_PHASE.PAUSE }),
    VISUAL_STATE.SETTLE,
  );
  assert.equal(
    normalizeVisualState(VISUAL_STATE.GROOM, { presenceMode: VISUAL_PRESENCE_MODE.WORK, roamingPhase: VISUAL_ROAMING_PHASE.PAUSE }),
    VISUAL_STATE.SETTLE,
  );
});

test('work and idle contexts expose the expected state families', () => {
  assert.deepEqual(
    getAllowedVisualStates({ presenceMode: VISUAL_PRESENCE_MODE.WORK, roamingPhase: VISUAL_ROAMING_PHASE.PAUSE }),
    [VISUAL_STATE.SETTLE, VISUAL_STATE.LOOK_LEFT, VISUAL_STATE.BLINK, VISUAL_STATE.LOOK_RIGHT, VISUAL_STATE.SMALL_SHIFT],
  );
  assert.deepEqual(
    getAllowedVisualStates({ presenceMode: VISUAL_PRESENCE_MODE.IDLE, roamingPhase: VISUAL_ROAMING_PHASE.MOVE }),
    [VISUAL_STATE.WALK_A, VISUAL_STATE.WALK_B],
  );
  assert.deepEqual(
    getAllowedVisualStates({ presenceMode: VISUAL_PRESENCE_MODE.IDLE, roamingPhase: VISUAL_ROAMING_PHASE.TURN }),
    [VISUAL_STATE.TURN_RESET],
  );
});

test('resolveVisualBucket keeps work quiet and idle move strictly walking', () => {
  assert.equal(resolveVisualBucket({ presenceMode: 'work', roamingPhase: 'move' }), 'work');
  assert.equal(resolveVisualBucket({ presenceMode: 'idle', roamingPhase: 'move' }), 'idleMove');
  assert.equal(resolveVisualBucket({ presenceMode: 'idle', roamingPhase: 'turn' }), 'idleTurn');
  assert.equal(resolveVisualBucket({ presenceMode: 'idle', roamingPhase: 'pause' }), 'idlePause');
});

test('state progression is deterministic and respects dwell windows', () => {
  const context = { presenceMode: VISUAL_PRESENCE_MODE.WORK, roamingPhase: VISUAL_ROAMING_PHASE.PAUSE };
  const initial = createVisualPresenceState(context, { now: 1000 });
  const beforeDwell = advanceVisualPresenceState(initial, context, { now: 1000 + VISUAL_DWELL_MS.work - 1 });
  const afterDwell = advanceVisualPresenceState(initial, context, { now: 1000 + VISUAL_DWELL_MS.work + 1 });
  const afterSecondDwell = advanceVisualPresenceState(afterDwell, context, {
    now: afterDwell.nextChangeAt + 1,
  });

  assert.equal(beforeDwell.visualState, VISUAL_STATE.SETTLE);
  assert.equal(afterDwell.visualState, VISUAL_STATE.LOOK_LEFT);
  assert.equal(afterSecondDwell.visualState, VISUAL_STATE.BLINK);
});

test('context changes normalize disallowed idle-only states back into the work set', () => {
  const idlePause = createVisualPresenceState(
    { presenceMode: VISUAL_PRESENCE_MODE.IDLE, roamingPhase: VISUAL_ROAMING_PHASE.PAUSE },
    { now: 1000, visualState: VISUAL_STATE.GROOM },
  );
  const work = advanceVisualPresenceState(idlePause, {
    presenceMode: VISUAL_PRESENCE_MODE.WORK,
    roamingPhase: VISUAL_ROAMING_PHASE.PAUSE,
  }, { now: 2000 });
  const idleMove = advanceVisualPresenceState(work, {
    presenceMode: VISUAL_PRESENCE_MODE.IDLE,
    roamingPhase: VISUAL_ROAMING_PHASE.MOVE,
  }, { now: 3000 });

  assert.equal(work.visualState, VISUAL_STATE.SETTLE);
  assert.equal(idleMove.visualState, VISUAL_STATE.WALK_A);
});

test('startup sequence changes within the first eight seconds', () => {
  const context = { presenceMode: VISUAL_PRESENCE_MODE.WORK, roamingPhase: VISUAL_ROAMING_PHASE.PAUSE };
  const initial = createVisualPresenceState(context, { now: 1000 });
  const changed = advanceVisualPresenceState(initial, context, { now: 6000 });

  assert.notEqual(changed.visualState, initial.visualState);
});

test('cat pose mapping stays stable for animation-only states', () => {
  assert.equal(getCatPoseForVisualState(VISUAL_STATE.BLINK), 'sit');
  assert.equal(getCatPoseForVisualState(VISUAL_STATE.SMALL_SHIFT), 'sit');
  assert.equal(getCatPoseForVisualState(VISUAL_STATE.WALK_B), 'walk-b');
  assert.equal(getCatPoseForVisualState(VISUAL_STATE.TURN_RESET), 'turn-reset');
});
