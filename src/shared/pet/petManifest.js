const CANONICAL_ANIMATION = Object.freeze({
  IDLE: 'Idle',
  WAITING: 'waiting',
  WAVE: 'wave',
  JUMP: 'jump',
  FAILED: 'failed',
  RUN: 'run',
  RUN_LEFT: 'run left',
  REVIEW: 'review',
});

const PET_SEMANTIC_STATE = Object.freeze({
  IDLE: 'idle',
  WORKING: 'working',
  ATTENTION: 'attention',
  SUCCESS: 'success',
  FAILED: 'failed',
  SLEEPY: 'sleepy',
  MOVING_RIGHT: 'movingRight',
  MOVING_LEFT: 'movingLeft',
});

const SEMANTIC_ANIMATION_FALLBACKS = Object.freeze({
  [PET_SEMANTIC_STATE.IDLE]: Object.freeze([CANONICAL_ANIMATION.IDLE, CANONICAL_ANIMATION.WAITING]),
  [PET_SEMANTIC_STATE.WORKING]: Object.freeze([CANONICAL_ANIMATION.WAITING, CANONICAL_ANIMATION.IDLE]),
  [PET_SEMANTIC_STATE.ATTENTION]: Object.freeze([CANONICAL_ANIMATION.WAVE, CANONICAL_ANIMATION.JUMP, CANONICAL_ANIMATION.IDLE]),
  [PET_SEMANTIC_STATE.SUCCESS]: Object.freeze([
    CANONICAL_ANIMATION.JUMP,
    CANONICAL_ANIMATION.REVIEW,
    CANONICAL_ANIMATION.WAVE,
    CANONICAL_ANIMATION.IDLE,
  ]),
  [PET_SEMANTIC_STATE.FAILED]: Object.freeze([CANONICAL_ANIMATION.FAILED, CANONICAL_ANIMATION.IDLE]),
  [PET_SEMANTIC_STATE.SLEEPY]: Object.freeze([CANONICAL_ANIMATION.WAITING, CANONICAL_ANIMATION.IDLE]),
  [PET_SEMANTIC_STATE.MOVING_RIGHT]: Object.freeze([CANONICAL_ANIMATION.RUN, CANONICAL_ANIMATION.IDLE]),
  [PET_SEMANTIC_STATE.MOVING_LEFT]: Object.freeze([
    CANONICAL_ANIMATION.RUN_LEFT,
    CANONICAL_ANIMATION.RUN,
    CANONICAL_ANIMATION.IDLE,
  ]),
});

const LOOPING_ANIMATIONS = new Set([
  CANONICAL_ANIMATION.IDLE,
  CANONICAL_ANIMATION.WAITING,
  CANONICAL_ANIMATION.RUN,
  CANONICAL_ANIMATION.RUN_LEFT,
  CANONICAL_ANIMATION.REVIEW,
]);

const ANIMATION_ALIAS = new Map(
  Object.entries({
    idle: CANONICAL_ANIMATION.IDLE,
    wait: CANONICAL_ANIMATION.WAITING,
    waiting: CANONICAL_ANIMATION.WAITING,
    wave: CANONICAL_ANIMATION.WAVE,
    waving: CANONICAL_ANIMATION.WAVE,
    jump: CANONICAL_ANIMATION.JUMP,
    jumping: CANONICAL_ANIMATION.JUMP,
    failed: CANONICAL_ANIMATION.FAILED,
    fail: CANONICAL_ANIMATION.FAILED,
    error: CANONICAL_ANIMATION.FAILED,
    run: CANONICAL_ANIMATION.RUN,
    running: CANONICAL_ANIMATION.RUN,
    'run left': CANONICAL_ANIMATION.RUN_LEFT,
    'left run': CANONICAL_ANIMATION.RUN_LEFT,
    runleft: CANONICAL_ANIMATION.RUN_LEFT,
    review: CANONICAL_ANIMATION.REVIEW,
    reviewing: CANONICAL_ANIMATION.REVIEW,
  }),
);

function normalizeAliasKey(value) {
  return String(value ?? '')
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normalizeAnimationName(value) {
  const aliasKey = normalizeAliasKey(value);
  if (ANIMATION_ALIAS.has(aliasKey)) return ANIMATION_ALIAS.get(aliasKey);

  const squashed = aliasKey.replace(/\s+/g, '');
  if (ANIMATION_ALIAS.has(squashed)) return ANIMATION_ALIAS.get(squashed);

  return null;
}

function normalizeSemanticState(value) {
  if (Object.values(PET_SEMANTIC_STATE).includes(value)) return value;
  return PET_SEMANTIC_STATE.IDLE;
}

function getSemanticAnimationFallbacks(semanticState) {
  const normalizedState = normalizeSemanticState(semanticState);
  return [...SEMANTIC_ANIMATION_FALLBACKS[normalizedState]];
}

function getDefaultLoopForAnimation(animationName) {
  return LOOPING_ANIMATIONS.has(animationName);
}

function hasAnimation(manifest, animationName) {
  const normalizedName = normalizeAnimationName(animationName);
  return Boolean(normalizedName && manifest?.animations?.[normalizedName]);
}

function resolveAnimationForSemanticState(manifest, semanticState) {
  const normalizedState = normalizeSemanticState(semanticState);
  const attempted = getSemanticAnimationFallbacks(normalizedState);
  const animationName = attempted.find((candidate) => hasAnimation(manifest, candidate));

  if (!animationName) {
    return {
      semanticState: normalizedState,
      animationName: null,
      animation: null,
      attempted,
    };
  }

  return {
    semanticState: normalizedState,
    animationName,
    animation: manifest.animations[animationName],
    attempted,
  };
}

module.exports = {
  CANONICAL_ANIMATION,
  PET_SEMANTIC_STATE,
  SEMANTIC_ANIMATION_FALLBACKS,
  getDefaultLoopForAnimation,
  getSemanticAnimationFallbacks,
  hasAnimation,
  normalizeAnimationName,
  normalizeSemanticState,
  resolveAnimationForSemanticState,
};

