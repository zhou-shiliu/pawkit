// @ts-nocheck
const VISUAL_PRESENCE_MODE = Object.freeze({
  WORK: 'work',
  IDLE: 'idle',
});

const VISUAL_ROAMING_PHASE = Object.freeze({
  SPAWN: 'spawn',
  MOVE: 'move',
  PAUSE: 'pause',
  TURN: 'turn',
});

const VISUAL_STATE = Object.freeze({
  SETTLE: 'settle',
  LOOK_LEFT: 'look-left',
  LOOK_RIGHT: 'look-right',
  BLINK: 'blink',
  SMALL_SHIFT: 'small-shift',
  GROOM: 'groom',
  STRETCH: 'stretch',
  WALK_A: 'walk-a',
  WALK_B: 'walk-b',
  TURN_RESET: 'turn-reset',
});

const VISUAL_POSE = Object.freeze({
  SIT: 'sit',
  LOOK_LEFT: 'look-left',
  LOOK_RIGHT: 'look-right',
  GROOM: 'groom',
  STRETCH: 'stretch',
  WALK_A: 'walk-a',
  WALK_B: 'walk-b',
  TURN_RESET: 'turn-reset',
});

const VISUAL_SEQUENCE = Object.freeze({
  work: Object.freeze([
    VISUAL_STATE.SETTLE,
    VISUAL_STATE.LOOK_LEFT,
    VISUAL_STATE.BLINK,
    VISUAL_STATE.LOOK_RIGHT,
    VISUAL_STATE.SMALL_SHIFT,
  ]),
  idlePause: Object.freeze([
    VISUAL_STATE.SETTLE,
    VISUAL_STATE.LOOK_LEFT,
    VISUAL_STATE.GROOM,
    VISUAL_STATE.LOOK_RIGHT,
    VISUAL_STATE.STRETCH,
  ]),
  idleMove: Object.freeze([VISUAL_STATE.WALK_A, VISUAL_STATE.WALK_B]),
  idleTurn: Object.freeze([VISUAL_STATE.TURN_RESET]),
});

const VISUAL_DWELL_MS = Object.freeze({
  work: 4200,
  idlePause: 2200,
  idleMove: 380,
  idleTurn: 360,
});

function toFiniteNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function clamp(value, min, max) {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

function normalizePresenceMode(value) {
  return value === VISUAL_PRESENCE_MODE.IDLE ? VISUAL_PRESENCE_MODE.IDLE : VISUAL_PRESENCE_MODE.WORK;
}

function normalizeRoamingPhase(value) {
  if (value === VISUAL_ROAMING_PHASE.MOVE) return VISUAL_ROAMING_PHASE.MOVE;
  if (value === VISUAL_ROAMING_PHASE.PAUSE) return VISUAL_ROAMING_PHASE.PAUSE;
  if (value === VISUAL_ROAMING_PHASE.TURN) return VISUAL_ROAMING_PHASE.TURN;
  return VISUAL_ROAMING_PHASE.SPAWN;
}

function resolveVisualBucket({ presenceMode = VISUAL_PRESENCE_MODE.WORK, roamingPhase = VISUAL_ROAMING_PHASE.PAUSE } = {}) {
  const safeMode = normalizePresenceMode(presenceMode);
  const safePhase = normalizeRoamingPhase(roamingPhase);

  if (safeMode === VISUAL_PRESENCE_MODE.WORK) return 'work';
  if (safePhase === VISUAL_ROAMING_PHASE.MOVE) return 'idleMove';
  if (safePhase === VISUAL_ROAMING_PHASE.TURN) return 'idleTurn';
  return 'idlePause';
}

function getAllowedVisualStates(context = {}) {
  const bucket = resolveVisualBucket(context);
  return [...VISUAL_SEQUENCE[bucket]];
}

function getVisualDwellMs(context = {}) {
  return VISUAL_DWELL_MS[resolveVisualBucket(context)];
}

function normalizeVisualState(value, context = {}) {
  const allowedStates = getAllowedVisualStates(context);
  return allowedStates.includes(value) ? value : allowedStates[0];
}

function getCatPoseForVisualState(visualState) {
  if (visualState === VISUAL_STATE.LOOK_LEFT) return VISUAL_POSE.LOOK_LEFT;
  if (visualState === VISUAL_STATE.LOOK_RIGHT) return VISUAL_POSE.LOOK_RIGHT;
  if (visualState === VISUAL_STATE.GROOM) return VISUAL_POSE.GROOM;
  if (visualState === VISUAL_STATE.STRETCH) return VISUAL_POSE.STRETCH;
  if (visualState === VISUAL_STATE.WALK_A) return VISUAL_POSE.WALK_A;
  if (visualState === VISUAL_STATE.WALK_B) return VISUAL_POSE.WALK_B;
  if (visualState === VISUAL_STATE.TURN_RESET) return VISUAL_POSE.TURN_RESET;
  return VISUAL_POSE.SIT;
}

function nextSequenceIndex(sequence, previousIndex, options = {}) {
  if (sequence.length <= 1) return 0;

  const disableRandomness = options.disableRandomness !== false;
  if (disableRandomness) {
    return (Math.max(0, previousIndex) + 1) % sequence.length;
  }

  const seed = Math.max(0, Math.floor(toFiniteNumber(options.seed, Date.now())));
  return (seed + Math.max(0, previousIndex) + 1) % sequence.length;
}

function createVisualPresenceState(context = {}, options = {}) {
  const now = Math.max(0, toFiniteNumber(options.now, Date.now()));
  const bucket = resolveVisualBucket(context);
  const sequence = VISUAL_SEQUENCE[bucket];
  const baseIndex = clamp(Math.floor(toFiniteNumber(options.sequenceIndex, 0)), 0, Math.max(0, sequence.length - 1));
  const visualState = normalizeVisualState(options.visualState ?? sequence[baseIndex], context);
  const normalizedIndex = Math.max(0, sequence.indexOf(visualState));
  const dwellMs = getVisualDwellMs(context);

  return {
    presenceMode: normalizePresenceMode(context.presenceMode),
    roamingPhase: normalizeRoamingPhase(context.roamingPhase),
    visualState,
    catPose: getCatPoseForVisualState(visualState),
    sequenceIndex: normalizedIndex,
    enteredAt: now,
    nextChangeAt: now + dwellMs,
    dwellMs,
  };
}

function normalizeVisualPresenceState(state = {}, context = {}, options = {}) {
  const now = Math.max(0, toFiniteNumber(options.now, Date.now()));
  const base = createVisualPresenceState(context, {
    now,
    sequenceIndex: state.sequenceIndex,
    visualState: state.visualState,
  });

  return {
    ...base,
    enteredAt: Math.max(0, toFiniteNumber(state.enteredAt, base.enteredAt)),
    nextChangeAt: Math.max(base.enteredAt, toFiniteNumber(state.nextChangeAt, base.nextChangeAt)),
    dwellMs: Math.max(0, toFiniteNumber(state.dwellMs, base.dwellMs)),
  };
}

function advanceVisualPresenceState(state = {}, context = {}, options = {}) {
  const now = Math.max(0, toFiniteNumber(options.now, Date.now()));
  const bucket = resolveVisualBucket(context);
  const sequence = VISUAL_SEQUENCE[bucket];
  const normalized = normalizeVisualPresenceState(state, context, { now });
  const normalizedState = normalizeVisualState(normalized.visualState, context);
  const normalizedIndex = Math.max(0, sequence.indexOf(normalizedState));
  const contextChanged =
    normalized.presenceMode !== normalizePresenceMode(context.presenceMode) ||
    normalized.roamingPhase !== normalizeRoamingPhase(context.roamingPhase) ||
    normalized.visualState !== normalizedState;

  if (contextChanged) {
    return createVisualPresenceState(context, {
      now,
      visualState: normalizedState,
      sequenceIndex: normalizedIndex,
    });
  }

  const dwellMs = getVisualDwellMs(context);
  if (now < normalized.nextChangeAt) {
    return {
      ...normalized,
      dwellMs,
      nextChangeAt: normalized.enteredAt + dwellMs,
    };
  }

  const nextIndex = nextSequenceIndex(sequence, normalizedIndex, options);
  return createVisualPresenceState(context, {
    now,
    sequenceIndex: nextIndex,
    visualState: sequence[nextIndex],
  });
}

export {
  VISUAL_DWELL_MS,
  VISUAL_POSE,
  VISUAL_PRESENCE_MODE,
  VISUAL_ROAMING_PHASE,
  VISUAL_SEQUENCE,
  VISUAL_STATE,
  advanceVisualPresenceState,
  createVisualPresenceState,
  getAllowedVisualStates,
  getCatPoseForVisualState,
  getVisualDwellMs,
  normalizePresenceMode,
  normalizeRoamingPhase,
  normalizeVisualPresenceState,
  normalizeVisualState,
  resolveVisualBucket,
};
