const assert = require('node:assert/strict');

const { createNormalizedPetManifest } = require('../src/shared/pet/codexPetAdapter');
const { PET_RUNTIME_EVENT, createPetBehaviorState, reducePetBehaviorState } = require('../src/shared/pet/behaviorController');
const { PET_SEMANTIC_STATE, resolveAnimationForSemanticState } = require('../src/shared/pet/petManifest');
const { createDefaultPlacement, resolvePlacementForDisplays } = require('../src/shared/pet/placement');

const manifest = createNormalizedPetManifest({
  id: 'verify-pet',
  name: 'Verify Pet',
  sprite: {
    src: 'spritesheet.webp',
    frameWidth: 192,
    frameHeight: 208,
  },
  animations: {
    Idle: { row: 0, frames: 8, fps: 8, loop: true },
    waiting: { row: 1, frames: 8, fps: 8, loop: true },
    wave: { row: 2, frames: 8, fps: 10, loop: false },
    jump: { row: 3, frames: 8, fps: 10, loop: false },
    run: { row: 4, frames: 8, fps: 12, loop: true },
  },
});

const initial = createPetBehaviorState({ now: 1000 });
const attention = reducePetBehaviorState(initial, PET_RUNTIME_EVENT.PET_CLICKED, { now: 1200 });
const attentionAnimation = resolveAnimationForSemanticState(manifest, attention.semanticState);
const leftMovement = resolveAnimationForSemanticState(manifest, PET_SEMANTIC_STATE.MOVING_LEFT);
const placement = createDefaultPlacement({ x: 0, y: 0, width: 1280, height: 800 }, { width: 192, height: 208 });
const restored = resolvePlacementForDisplays(
  { displayId: 'gone', bounds: { x: 5000, y: 5000, width: 192, height: 208 } },
  [{ id: 'primary', primary: true, workArea: { x: 0, y: 0, width: 1280, height: 800 } }],
);

assert.equal(attention.semanticState, PET_SEMANTIC_STATE.ATTENTION);
assert.equal(attentionAnimation.animationName, 'wave');
assert.equal(leftMovement.animationName, 'run');
assert.ok(placement.bounds.x >= 0);
assert.ok(placement.bounds.y >= 0);
assert.ok(restored.bounds.x <= 1280 - 192);
assert.ok(restored.bounds.y <= 800 - 208);

console.log(JSON.stringify({
  ok: true,
  manifestId: manifest.id,
  attentionAnimation: attentionAnimation.animationName,
  movingLeftFallback: leftMovement.animationName,
  defaultPlacement: placement.bounds,
  restoredPlacement: restored.bounds,
}, null, 2));

