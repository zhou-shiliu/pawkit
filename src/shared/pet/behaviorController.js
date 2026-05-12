const { PET_SEMANTIC_STATE, normalizeSemanticState } = require('./petManifest');

const PET_RUNTIME_EVENT = Object.freeze({
  APP_STARTED: 'appStarted',
  USER_ACTIVE: 'userActive',
  USER_INACTIVE: 'userInactive',
  PET_CLICKED: 'petClicked',
  TASK_SUCCESS: 'taskSuccess',
  TASK_FAILED: 'taskFailed',
  MOVING_RIGHT: 'movingRight',
  MOVING_LEFT: 'movingLeft',
  ANIMATION_COMPLETE: 'animationComplete',
});

const ONE_SHOT_STATES = new Set([
  PET_SEMANTIC_STATE.ATTENTION,
  PET_SEMANTIC_STATE.SUCCESS,
  PET_SEMANTIC_STATE.FAILED,
]);

function toFiniteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function createPetBehaviorState(options = {}) {
  const now = Math.max(0, toFiniteNumber(options.now, Date.now()));
  const semanticState = normalizeSemanticState(options.semanticState);
  const lastStableState = normalizeSemanticState(options.lastStableState ?? semanticState);

  return {
    semanticState,
    lastStableState: ONE_SHOT_STATES.has(semanticState) ? lastStableState : semanticState,
    lastEvent: options.lastEvent ?? PET_RUNTIME_EVENT.APP_STARTED,
    oneShot: ONE_SHOT_STATES.has(semanticState),
    updatedAt: now,
  };
}

function reducePetBehaviorState(state = {}, event, options = {}) {
  const previous = createPetBehaviorState(state, options);
  const now = Math.max(0, toFiniteNumber(options.now, Date.now()));

  function transition(semanticState, { oneShot = false } = {}) {
    const normalizedState = normalizeSemanticState(semanticState);
    return {
      semanticState: normalizedState,
      lastStableState: oneShot ? previous.lastStableState : normalizedState,
      lastEvent: event,
      oneShot,
      updatedAt: now,
    };
  }

  if (event === PET_RUNTIME_EVENT.APP_STARTED) return transition(PET_SEMANTIC_STATE.IDLE);
  if (event === PET_RUNTIME_EVENT.USER_ACTIVE) return transition(PET_SEMANTIC_STATE.WORKING);
  if (event === PET_RUNTIME_EVENT.USER_INACTIVE) return transition(PET_SEMANTIC_STATE.SLEEPY);
  if (event === PET_RUNTIME_EVENT.PET_CLICKED) return transition(PET_SEMANTIC_STATE.ATTENTION, { oneShot: true });
  if (event === PET_RUNTIME_EVENT.TASK_SUCCESS) return transition(PET_SEMANTIC_STATE.SUCCESS, { oneShot: true });
  if (event === PET_RUNTIME_EVENT.TASK_FAILED) return transition(PET_SEMANTIC_STATE.FAILED, { oneShot: true });
  if (event === PET_RUNTIME_EVENT.MOVING_RIGHT) return transition(PET_SEMANTIC_STATE.MOVING_RIGHT);
  if (event === PET_RUNTIME_EVENT.MOVING_LEFT) return transition(PET_SEMANTIC_STATE.MOVING_LEFT);
  if (event === PET_RUNTIME_EVENT.ANIMATION_COMPLETE && previous.oneShot) {
    return transition(previous.lastStableState);
  }

  return {
    ...previous,
    lastEvent: event ?? previous.lastEvent,
    updatedAt: now,
  };
}

module.exports = {
  PET_RUNTIME_EVENT,
  ONE_SHOT_STATES,
  createPetBehaviorState,
  reducePetBehaviorState,
};

