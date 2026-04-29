const DEFAULT_WINDOW_SIZE = Object.freeze({
  width: 160,
  height: 160,
});

const ROAMING_TICK_MS = 120;
const SPAWN_DURATION_MS = 700;
const TURN_DURATION_MS = 320;
const MOVE_STEP_PX = 12;
const MIN_TARGET_DISTANCE_PX = 72;
const POSITION_RESTORE_TOLERANCE_PX = 16;
const PAUSE_RANGE_MS = Object.freeze({
  min: 700,
  max: 1500,
});

const PHASE = Object.freeze({
  SPAWN: 'spawn',
  MOVE: 'move',
  PAUSE: 'pause',
  TURN: 'turn',
});

const LOCOMOTION = Object.freeze({
  IDLE: 'idle',
  WALK: 'walk',
});

const FACING = Object.freeze({
  LEFT: 'left',
  RIGHT: 'right',
});

function clamp(value, min, max) {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

function toFiniteNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function randomBetween(min, max, rng = Math.random) {
  return min + (max - min) * rng();
}

function roundInt(value) {
  return Math.round(value);
}

function createRoamingBounds(workArea, windowSize = DEFAULT_WINDOW_SIZE) {
  const maxX = workArea.x + Math.max(0, workArea.width - windowSize.width);
  const maxY = workArea.y + Math.max(0, workArea.height - windowSize.height);

  return {
    minX: workArea.x,
    maxX,
    minY: workArea.y,
    maxY,
  };
}

function normalizeFacing(value) {
  return value === FACING.LEFT ? FACING.LEFT : FACING.RIGHT;
}

function normalizePhase(value) {
  switch (value) {
    case PHASE.MOVE:
    case PHASE.PAUSE:
    case PHASE.TURN:
      return value;
    case PHASE.SPAWN:
    default:
      return PHASE.SPAWN;
  }
}

function normalizeLocomotion(value) {
  return value === LOCOMOTION.WALK ? LOCOMOTION.WALK : LOCOMOTION.IDLE;
}

function clampPersistedRoamingState(snapshot, bounds, now = Date.now()) {
  if (!snapshot || typeof snapshot !== 'object') return null;

  return {
    x: clamp(roundInt(toFiniteNumber(snapshot.x, bounds.maxX)), bounds.minX, bounds.maxX),
    y: clamp(roundInt(toFiniteNumber(snapshot.y, bounds.maxY)), bounds.minY, bounds.maxY),
    facing: normalizeFacing(snapshot.facing),
    locomotion: normalizeLocomotion(snapshot.locomotion),
    phase: normalizePhase(snapshot.phase),
    lastUpdatedAt: toFiniteNumber(snapshot.lastUpdatedAt, now),
  };
}

function createSpawnPoint(bounds, rng = Math.random) {
  const spanX = Math.max(0, bounds.maxX - bounds.minX);
  const spanY = Math.max(0, bounds.maxY - bounds.minY);

  return {
    x: clamp(roundInt(bounds.minX + spanX * (0.55 + rng() * 0.2)), bounds.minX, bounds.maxX),
    y: clamp(roundInt(bounds.minY + spanY * (0.58 + rng() * 0.2)), bounds.minY, bounds.maxY),
  };
}

function getDistance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function pickTargetPoint(current, bounds, rng = Math.random) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = {
      x: roundInt(randomBetween(bounds.minX, bounds.maxX, rng)),
      y: roundInt(randomBetween(bounds.minY, bounds.maxY, rng)),
    };

    if (getDistance(current, candidate) >= MIN_TARGET_DISTANCE_PX) {
      return candidate;
    }
  }

  return {
    x: current.x <= (bounds.minX + bounds.maxX) / 2 ? bounds.maxX : bounds.minX,
    y: current.y <= (bounds.minY + bounds.maxY) / 2 ? bounds.maxY : bounds.minY,
  };
}

function toPersistedRoamingState(state) {
  return {
    x: roundInt(state.x),
    y: roundInt(state.y),
    facing: normalizeFacing(state.facing),
    locomotion: normalizeLocomotion(state.locomotion),
    phase: normalizePhase(state.phase),
    lastUpdatedAt: toFiniteNumber(state.lastUpdatedAt, Date.now()),
  };
}

function createInitialRoamingState({
  workArea,
  persistedState,
  windowSize = DEFAULT_WINDOW_SIZE,
  now = Date.now(),
  rng = Math.random,
}) {
  const bounds = createRoamingBounds(workArea, windowSize);
  const restored = clampPersistedRoamingState(persistedState, bounds, now);
  const origin = restored ?? {
    ...createSpawnPoint(bounds, rng),
    facing: FACING.RIGHT,
    locomotion: LOCOMOTION.IDLE,
    phase: PHASE.SPAWN,
    lastUpdatedAt: now,
  };

  return {
    ...origin,
    locomotion: LOCOMOTION.IDLE,
    phase: PHASE.SPAWN,
    nextPhaseAt: now + SPAWN_DURATION_MS,
    target: pickTargetPoint(origin, bounds, rng),
  };
}

function createPauseDuration(rng = Math.random) {
  return roundInt(randomBetween(PAUSE_RANGE_MS.min, PAUSE_RANGE_MS.max, rng));
}

function advanceRoamingState(
  state,
  {
    workArea,
    windowSize = DEFAULT_WINDOW_SIZE,
    now = Date.now(),
    rng = Math.random,
  },
) {
  const bounds = createRoamingBounds(workArea, windowSize);
  const current = {
    ...state,
    x: clamp(roundInt(toFiniteNumber(state.x, bounds.maxX)), bounds.minX, bounds.maxX),
    y: clamp(roundInt(toFiniteNumber(state.y, bounds.maxY)), bounds.minY, bounds.maxY),
    facing: normalizeFacing(state.facing),
    locomotion: normalizeLocomotion(state.locomotion),
    phase: normalizePhase(state.phase),
    nextPhaseAt: toFiniteNumber(state.nextPhaseAt, now),
    target: state.target ?? null,
    lastUpdatedAt: now,
  };

  if (!current.target) {
    current.target = pickTargetPoint(current, bounds, rng);
  }

  if (current.phase === PHASE.SPAWN) {
    if (now < current.nextPhaseAt) {
      return current;
    }

    return {
      ...current,
      locomotion: LOCOMOTION.IDLE,
      phase: PHASE.PAUSE,
      nextPhaseAt: now + createPauseDuration(rng),
    };
  }

  if (current.phase === PHASE.PAUSE) {
    if (now < current.nextPhaseAt) {
      return current;
    }

    const target = pickTargetPoint(current, bounds, rng);

    return {
      ...current,
      locomotion: LOCOMOTION.IDLE,
      phase: PHASE.TURN,
      facing: target.x < current.x ? FACING.LEFT : FACING.RIGHT,
      target,
      nextPhaseAt: now + TURN_DURATION_MS,
    };
  }

  if (current.phase === PHASE.TURN) {
    if (now < current.nextPhaseAt) {
      return current;
    }

    return {
      ...current,
      locomotion: LOCOMOTION.WALK,
      phase: PHASE.MOVE,
    };
  }

  const target = current.target ?? pickTargetPoint(current, bounds, rng);
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const distance = Math.hypot(dx, dy);

  if (distance <= MOVE_STEP_PX) {
    return {
      ...current,
      x: clamp(target.x, bounds.minX, bounds.maxX),
      y: clamp(target.y, bounds.minY, bounds.maxY),
      locomotion: LOCOMOTION.IDLE,
      phase: PHASE.PAUSE,
      nextPhaseAt: now + createPauseDuration(rng),
      target: null,
    };
  }

  const ratio = MOVE_STEP_PX / distance;
  const nextX = clamp(roundInt(current.x + dx * ratio), bounds.minX, bounds.maxX);
  const nextY = clamp(roundInt(current.y + dy * ratio), bounds.minY, bounds.maxY);
  const nextFacing = nextX < current.x ? FACING.LEFT : FACING.RIGHT;

  if (nextX === current.x && nextY === current.y) {
    return {
      ...current,
      locomotion: LOCOMOTION.IDLE,
      phase: PHASE.PAUSE,
      nextPhaseAt: now + createPauseDuration(rng),
      target: null,
    };
  }

  return {
    ...current,
    x: nextX,
    y: nextY,
    facing: nextFacing,
    locomotion: LOCOMOTION.WALK,
    phase: PHASE.MOVE,
    target,
  };
}

module.exports = {
  DEFAULT_WINDOW_SIZE,
  FACING,
  LOCOMOTION,
  MIN_TARGET_DISTANCE_PX,
  MOVE_STEP_PX,
  PAUSE_RANGE_MS,
  PHASE,
  POSITION_RESTORE_TOLERANCE_PX,
  ROAMING_TICK_MS,
  TURN_DURATION_MS,
  advanceRoamingState,
  clampPersistedRoamingState,
  createInitialRoamingState,
  createRoamingBounds,
  toPersistedRoamingState,
};
