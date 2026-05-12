const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  createNormalizedPetManifest,
  loadPetPackage,
  validateNormalizedPetManifest,
} = require('../src/shared/pet/codexPetAdapter');
const {
  CANONICAL_ANIMATION,
  PET_SEMANTIC_STATE,
  normalizeAnimationName,
  resolveAnimationForSemanticState,
} = require('../src/shared/pet/petManifest');
const {
  PET_RUNTIME_EVENT,
  createPetBehaviorState,
  reducePetBehaviorState,
} = require('../src/shared/pet/behaviorController');
const {
  clampRectToWorkArea,
  createDefaultPlacement,
  expandBounds,
  isDragIntent,
  resolvePlacementForDisplays,
} = require('../src/shared/pet/placement');

function createRawManifest(overrides = {}) {
  return {
    id: 'Test Pet',
    name: 'Test Pet',
    version: '1.0.0',
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
      failed: { row: 4, frames: 8, fps: 8, loop: false },
      run: { row: 5, frames: 8, fps: 12, loop: true },
      'run left': { row: 6, frames: 8, fps: 12, loop: true },
      review: { row: 7, frames: 8, fps: 8, loop: true },
    },
    ...overrides,
  };
}

test('animation names normalize Codex Pet aliases', () => {
  assert.equal(normalizeAnimationName('Idle'), CANONICAL_ANIMATION.IDLE);
  assert.equal(normalizeAnimationName('idle'), CANONICAL_ANIMATION.IDLE);
  assert.equal(normalizeAnimationName('run left'), CANONICAL_ANIMATION.RUN_LEFT);
  assert.equal(normalizeAnimationName('runLeft'), CANONICAL_ANIMATION.RUN_LEFT);
  assert.equal(normalizeAnimationName('Run_Left'), CANONICAL_ANIMATION.RUN_LEFT);
  assert.equal(normalizeAnimationName('run-left'), CANONICAL_ANIMATION.RUN_LEFT);
});

test('raw Codex-style manifest becomes a normalized manifest', () => {
  const manifest = createNormalizedPetManifest(createRawManifest());

  assert.equal(manifest.id, 'test-pet');
  assert.equal(manifest.sprite.frameWidth, 192);
  assert.equal(manifest.sprite.frameHeight, 208);
  assert.equal(manifest.animations.Idle.row, 0);
  assert.equal(manifest.animations[CANONICAL_ANIMATION.RUN_LEFT].row, 6);
  assert.deepEqual(validateNormalizedPetManifest(manifest), { ok: true, errors: [] });
});

test('manifest validation rejects missing frame dimensions and missing idle fallback', () => {
  const missingFrameSize = createNormalizedPetManifest(createRawManifest({
    sprite: { src: 'spritesheet.webp' },
  }));
  const noIdleFallback = createNormalizedPetManifest(createRawManifest({
    animations: {
      wave: { row: 2, frames: 8, fps: 10 },
    },
  }));

  assert.equal(validateNormalizedPetManifest(missingFrameSize).ok, false);
  assert.match(validateNormalizedPetManifest(missingFrameSize).errors.join('\n'), /frameWidth/);
  assert.equal(validateNormalizedPetManifest(noIdleFallback).ok, false);
  assert.match(validateNormalizedPetManifest(noIdleFallback).errors.join('\n'), /Idle or waiting/);
});

test('semantic states resolve through fallback chains', () => {
  const waitingOnly = createNormalizedPetManifest(createRawManifest({
    animations: {
      waiting: { row: 1, frames: 8, fps: 8, loop: true },
      jump: { row: 3, frames: 8, fps: 10, loop: false },
      run: { row: 5, frames: 8, fps: 12, loop: true },
    },
  }));

  assert.equal(resolveAnimationForSemanticState(waitingOnly, PET_SEMANTIC_STATE.IDLE).animationName, CANONICAL_ANIMATION.WAITING);
  assert.equal(resolveAnimationForSemanticState(waitingOnly, PET_SEMANTIC_STATE.ATTENTION).animationName, CANONICAL_ANIMATION.JUMP);
  assert.equal(resolveAnimationForSemanticState(waitingOnly, PET_SEMANTIC_STATE.MOVING_LEFT).animationName, CANONICAL_ANIMATION.RUN);
});

test('pet package loader requires pet.json and spritesheet.webp', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pawkit-pet-'));
  const validDir = path.join(tempDir, 'valid');
  const missingSpriteDir = path.join(tempDir, 'missing-sprite');
  fs.mkdirSync(validDir);
  fs.mkdirSync(missingSpriteDir);
  fs.writeFileSync(path.join(validDir, 'pet.json'), JSON.stringify(createRawManifest()), 'utf8');
  fs.writeFileSync(path.join(validDir, 'spritesheet.webp'), 'placeholder');
  fs.writeFileSync(path.join(missingSpriteDir, 'pet.json'), JSON.stringify(createRawManifest()), 'utf8');

  assert.equal(loadPetPackage(path.join(tempDir, 'missing-json')).ok, false);
  assert.equal(loadPetPackage(missingSpriteDir).ok, false);
  assert.match(loadPetPackage(missingSpriteDir).errors.join('\n'), /spritesheet\.webp/);
  assert.equal(loadPetPackage(validDir).ok, true);
});

test('behavior controller maps events to stable and one-shot semantic states', () => {
  const initial = createPetBehaviorState({ now: 1000 });
  const working = reducePetBehaviorState(initial, PET_RUNTIME_EVENT.USER_ACTIVE, { now: 2000 });
  const attention = reducePetBehaviorState(working, PET_RUNTIME_EVENT.PET_CLICKED, { now: 2100 });
  const returned = reducePetBehaviorState(attention, PET_RUNTIME_EVENT.ANIMATION_COMPLETE, { now: 2600 });
  const failed = reducePetBehaviorState(returned, PET_RUNTIME_EVENT.TASK_FAILED, { now: 3000 });

  assert.equal(initial.semanticState, PET_SEMANTIC_STATE.IDLE);
  assert.equal(working.semanticState, PET_SEMANTIC_STATE.WORKING);
  assert.equal(attention.semanticState, PET_SEMANTIC_STATE.ATTENTION);
  assert.equal(attention.oneShot, true);
  assert.equal(returned.semanticState, PET_SEMANTIC_STATE.WORKING);
  assert.equal(failed.semanticState, PET_SEMANTIC_STATE.FAILED);
  assert.equal(failed.lastStableState, PET_SEMANTIC_STATE.WORKING);
});

test('placement defaults to bottom-right and clamps restored bounds', () => {
  const workArea = { x: 0, y: 25, width: 1200, height: 775 };
  const placement = createDefaultPlacement(workArea, { width: 192, height: 208 }, { displayId: 1 });
  const clamped = clampRectToWorkArea(
    { x: 9999, y: -500, width: 192, height: 208 },
    workArea,
    { padding: 16 },
  );

  assert.equal(placement.displayId, 1);
  assert.equal(placement.bounds.x, 984);
  assert.equal(placement.bounds.y, 568);
  assert.equal(clamped.x, 992);
  assert.equal(clamped.y, 41);
});

test('placement rehomes missing displays to primary work area', () => {
  const placement = resolvePlacementForDisplays(
    {
      displayId: 'gone',
      bounds: { x: 9000, y: 9000, width: 200, height: 200 },
    },
    [
      {
        id: 'primary',
        primary: true,
        scaleFactor: 2,
        workArea: { x: 10, y: 20, width: 800, height: 600 },
      },
    ],
    { padding: 20 },
  );

  assert.equal(placement.displayId, 'primary');
  assert.equal(placement.scaleFactor, 2);
  assert.deepEqual(placement.bounds, { x: 590, y: 400, width: 200, height: 200 });
});

test('drag threshold and overlay expansion are deterministic', () => {
  assert.equal(isDragIntent({ x: 0, y: 0 }, { x: 2, y: 2 }, 4), false);
  assert.equal(isDragIntent({ x: 0, y: 0 }, { x: 3, y: 4 }, 4), true);
  assert.deepEqual(
    expandBounds({ x: 100, y: 100, width: 192, height: 208 }, { top: 40, right: 20, bottom: 8, left: 12 }),
    { x: 88, y: 60, width: 224, height: 256 },
  );
});

