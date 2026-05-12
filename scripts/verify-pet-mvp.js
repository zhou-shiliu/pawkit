const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createNormalizedPetManifest, loadPetPackage } = require('../src/shared/pet/codexPetAdapter');
const { PET_RUNTIME_EVENT, createPetBehaviorState, reducePetBehaviorState } = require('../src/shared/pet/behaviorController');
const { PET_SEMANTIC_STATE, resolveAnimationForSemanticState } = require('../src/shared/pet/petManifest');
const { createDefaultPlacement, resolvePlacementForDisplays } = require('../src/shared/pet/placement');

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
const leftMovement = resolveAnimationForSemanticState(manifest, PET_SEMANTIC_STATE.MOVING_LEFT);
const placement = createDefaultPlacement({ x: 0, y: 0, width: 1280, height: 800 }, { width: 192, height: 208 });
const restored = resolvePlacementForDisplays(
  { displayId: 'gone', bounds: { x: 5000, y: 5000, width: 192, height: 208 } },
  [{ id: 'primary', primary: true, workArea: { x: 0, y: 0, width: 1280, height: 800 } }],
);

assert.equal(attention.semanticState, PET_SEMANTIC_STATE.ATTENTION);
assert.equal(attentionAnimation.animationName, 'waving');
assert.equal(leftMovement.animationName, 'running-left');
assert.ok(placement.bounds.x >= 0);
assert.ok(placement.bounds.y >= 0);
assert.ok(restored.bounds.x <= 1280 - 192);
assert.ok(restored.bounds.y <= 800 - 208);

const samplePetDir = process.env.PAWKIT_VERIFY_PET_DIR || findFirstCommunityPetDir();
const samplePet = samplePetDir ? loadPetPackage(samplePetDir) : null;
if (samplePetDir) {
  assert.equal(samplePet.ok, true, samplePet.errors?.join('\n'));
}

console.log(JSON.stringify({
  ok: true,
  manifestId: manifest.id,
  attentionAnimation: attentionAnimation.animationName,
  movingLeftFallback: leftMovement.animationName,
  defaultPlacement: placement.bounds,
  restoredPlacement: restored.bounds,
  samplePet: samplePet
    ? {
        id: samplePet.manifest.id,
        name: samplePet.manifest.name,
        sprite: samplePet.spritePath,
      }
    : null,
}, null, 2));
