const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createNormalizedPetManifest, loadPetPackage } = require('../src/shared/pet/codexPetAdapter');
const { PET_RUNTIME_EVENT, createPetBehaviorState, reducePetBehaviorState } = require('../src/shared/pet/behaviorController');
const { PET_SEMANTIC_STATE, resolveAnimationForSemanticState } = require('../src/shared/pet/petManifest');
const { createDefaultPlacement, resolvePlacementForDisplays } = require('../src/shared/pet/placement');
const { listPetPackages } = require('../src/shared/pet/petLibrary');
const { createPetMvpTrayMenuTemplate } = require('../src/shared/pet/petMvpTrayMenu');

function findFirstCommunityPetDir() {
  const communityDir = path.join(process.cwd(), 'pets', 'community');
  if (!fs.existsSync(communityDir)) return null;
  return fs
    .readdirSync(communityDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(communityDir, entry.name))
    .sort((left, right) => left.localeCompare(right))
    .find((directory) => fs.existsSync(path.join(directory, 'pet.json'))) ?? null;
}

const manifest = createNormalizedPetManifest({
  id: 'verify-pet',
  displayName: 'Verify Pet',
  description: 'Minimal Codex pet package contract.',
  spritesheetPath: 'spritesheet.webp',
});

const initial = createPetBehaviorState({ now: 1000 });
const attention = reducePetBehaviorState(initial, PET_RUNTIME_EVENT.PET_CLICKED, { now: 1200 });
const attentionAnimation = resolveAnimationForSemanticState(manifest, attention.semanticState);
const success = reducePetBehaviorState(attention, PET_RUNTIME_EVENT.TASK_SUCCESS, { now: 1400 });
const successAnimation = resolveAnimationForSemanticState(manifest, success.semanticState);
const leftDrag = reducePetBehaviorState(initial, PET_RUNTIME_EVENT.MOVING_LEFT, { now: 1500 });
const leftMovement = resolveAnimationForSemanticState(manifest, leftDrag.semanticState);
const rightDrag = reducePetBehaviorState(leftDrag, PET_RUNTIME_EVENT.MOVING_RIGHT, { now: 1600 });
const rightMovement = resolveAnimationForSemanticState(manifest, rightDrag.semanticState);
const dragEnded = reducePetBehaviorState(rightDrag, PET_RUNTIME_EVENT.APP_STARTED, { now: 1700 });
const working = reducePetBehaviorState(initial, PET_RUNTIME_EVENT.USER_ACTIVE, { now: 1800 });
const workingAnimation = resolveAnimationForSemanticState(manifest, working.semanticState);
const sleepy = reducePetBehaviorState(initial, PET_RUNTIME_EVENT.USER_INACTIVE, { now: 1900 });
const sleepyAnimation = resolveAnimationForSemanticState(manifest, sleepy.semanticState);
const failed = reducePetBehaviorState(initial, PET_RUNTIME_EVENT.TASK_FAILED, { now: 2000 });
const failedAnimation = resolveAnimationForSemanticState(manifest, failed.semanticState);
const placement = createDefaultPlacement({ x: 0, y: 0, width: 1280, height: 800 }, { width: 192, height: 208 });
const restored = resolvePlacementForDisplays(
  { displayId: 'gone', bounds: { x: 5000, y: 5000, width: 192, height: 208 } },
  [{ id: 'primary', primary: true, workArea: { x: 0, y: 0, width: 1280, height: 800 } }],
);

assert.equal(attention.semanticState, PET_SEMANTIC_STATE.ATTENTION);
assert.equal(attentionAnimation.animationName, 'waving');
assert.equal(successAnimation.animationName, 'jumping');
assert.equal(leftMovement.animationName, 'running-left');
assert.equal(rightMovement.animationName, 'running-right');
assert.equal(dragEnded.semanticState, PET_SEMANTIC_STATE.IDLE);
assert.equal(workingAnimation.animationName, 'review');
assert.equal(sleepyAnimation.animationName, 'waiting');
assert.equal(failedAnimation.animationName, 'failed');
assert.ok(placement.bounds.x >= 0);
assert.ok(placement.bounds.y >= 0);
assert.ok(restored.bounds.x <= 1280 - 192);
assert.ok(restored.bounds.y <= 800 - 208);


const builtInPackages = listPetPackages([{ source: 'builtin', directory: path.join(process.cwd(), 'pets', 'builtin') }]);
assert.ok(builtInPackages.some((petPackage) => petPackage.ok && petPackage.manifest?.id === 'pawkit-sprout'));

const trayTemplate = createPetMvpTrayMenuTemplate({
  activePetName: 'Verify Pet',
  packages: builtInPackages,
});
const trayLabels = JSON.stringify(trayTemplate.map((item) => item.label || item.type || ''));
assert.match(trayLabels, /当前宠物：Verify Pet/);
assert.match(trayLabels, /导入宠物包/);
assert.match(trayLabels, /切换宠物/);
assert.doesNotMatch(trayLabels, /Food|Water|Play|Trust|模式控制|闲置阈值|验证报告/);

const samplePetDir = process.env.PAWKIT_VERIFY_PET_DIR || findFirstCommunityPetDir();
const samplePet = samplePetDir ? loadPetPackage(samplePetDir) : null;
if (samplePetDir) {
  assert.equal(samplePet.ok, true, samplePet.errors?.join('\n'));
}

console.log(JSON.stringify({
  ok: true,
  manifestId: manifest.id,
  attentionAnimation: attentionAnimation.animationName,
  successAnimation: successAnimation.animationName,
  movingLeftFallback: leftMovement.animationName,
  movingRightFallback: rightMovement.animationName,
  dragEndState: dragEnded.semanticState,
  workingAnimation: workingAnimation.animationName,
  sleepyAnimation: sleepyAnimation.animationName,
  failedAnimation: failedAnimation.animationName,
  defaultPlacement: placement.bounds,
  restoredPlacement: restored.bounds,
  builtInPets: builtInPackages.map((petPackage) => petPackage.manifest?.id),
  trayLabels: trayTemplate.map((item) => item.label || item.type || null),
  samplePet: samplePet
    ? {
        id: samplePet.manifest.id,
        name: samplePet.manifest.name,
        sprite: samplePet.spritePath,
      }
    : null,
}, null, 2));
