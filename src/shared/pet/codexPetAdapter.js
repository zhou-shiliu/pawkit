const fs = require('node:fs');
const path = require('node:path');

const {
  CANONICAL_ANIMATION,
  getDefaultLoopForAnimation,
  normalizeAnimationName,
  resolveAnimationForSemanticState,
} = require('./petManifest');

const CODEX_PET_ATLAS = Object.freeze({
  columns: 8,
  rows: 9,
  frameWidth: 192,
  frameHeight: 208,
  width: 1536,
  height: 1872,
});

function animation(row, frames, durationsMs, options = {}) {
  const averageDuration = durationsMs.reduce((sum, duration) => sum + duration, 0) / durationsMs.length;
  return {
    row,
    frames,
    fps: Math.max(1, Math.round(1000 / averageDuration)),
    loop: options.loop ?? getDefaultLoopForAnimation(options.name),
    durationsMs,
  };
}

const CODEX_PET_DEFAULT_ANIMATIONS = Object.freeze({
  [CANONICAL_ANIMATION.IDLE]: Object.freeze(animation(0, 6, [280, 110, 110, 140, 140, 320], {
    name: CANONICAL_ANIMATION.IDLE,
  })),
  [CANONICAL_ANIMATION.RUNNING_RIGHT]: Object.freeze(animation(1, 8, [120, 120, 120, 120, 120, 120, 120, 220], {
    name: CANONICAL_ANIMATION.RUNNING_RIGHT,
  })),
  [CANONICAL_ANIMATION.RUNNING_LEFT]: Object.freeze(animation(2, 8, [120, 120, 120, 120, 120, 120, 120, 220], {
    name: CANONICAL_ANIMATION.RUNNING_LEFT,
  })),
  [CANONICAL_ANIMATION.WAVING]: Object.freeze(animation(3, 4, [140, 140, 140, 280], {
    name: CANONICAL_ANIMATION.WAVING,
  })),
  [CANONICAL_ANIMATION.JUMPING]: Object.freeze(animation(4, 5, [140, 140, 140, 140, 280], {
    name: CANONICAL_ANIMATION.JUMPING,
  })),
  [CANONICAL_ANIMATION.FAILED]: Object.freeze(animation(5, 8, [140, 140, 140, 140, 140, 140, 140, 240], {
    name: CANONICAL_ANIMATION.FAILED,
  })),
  [CANONICAL_ANIMATION.WAITING]: Object.freeze(animation(6, 6, [150, 150, 150, 150, 150, 260], {
    name: CANONICAL_ANIMATION.WAITING,
  })),
  [CANONICAL_ANIMATION.RUNNING]: Object.freeze(animation(7, 6, [120, 120, 120, 120, 120, 220], {
    name: CANONICAL_ANIMATION.RUNNING,
  })),
  [CANONICAL_ANIMATION.REVIEW]: Object.freeze(animation(8, 6, [150, 150, 150, 150, 150, 280], {
    name: CANONICAL_ANIMATION.REVIEW,
  })),
});

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function toFinitePositiveInteger(value, fallback = null) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  const integer = Math.floor(number);
  return integer > 0 ? integer : fallback;
}

function toFiniteNonNegativeInteger(value, fallback = null) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  const integer = Math.floor(number);
  return integer >= 0 ? integer : fallback;
}

function pickFirstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function normalizeAnimationEntry(name, rawEntry = {}, index = 0) {
  const normalizedName = normalizeAnimationName(name);
  if (!normalizedName || !isPlainObject(rawEntry)) return null;

  const row = toFiniteNonNegativeInteger(pickFirstDefined(rawEntry.row, rawEntry.y, rawEntry.index, index));
  const frames = toFinitePositiveInteger(pickFirstDefined(rawEntry.frames, rawEntry.frameCount, rawEntry.columns));
  const fps = toFinitePositiveInteger(pickFirstDefined(rawEntry.fps, rawEntry.frameRate), 8);
  const durationsMs = Array.isArray(rawEntry.durationsMs) || Array.isArray(rawEntry.durations)
    ? (rawEntry.durationsMs ?? rawEntry.durations)
        .map((duration) => toFinitePositiveInteger(duration))
        .filter((duration) => duration !== null)
    : undefined;

  if (row === null || frames === null) return null;

  return {
    name: normalizedName,
    animation: {
      row,
      frames,
      fps,
      loop: typeof rawEntry.loop === 'boolean' ? rawEntry.loop : getDefaultLoopForAnimation(normalizedName),
      ...(durationsMs?.length ? { durationsMs } : {}),
    },
  };
}

function normalizeAnimations(rawAnimations) {
  if (!isPlainObject(rawAnimations)) return {};

  return Object.entries(rawAnimations).reduce((animations, [name, entry], index) => {
    const normalized = normalizeAnimationEntry(name, entry, index);
    if (!normalized) return animations;

    animations[normalized.name] = normalized.animation;
    return animations;
  }, {});
}

function normalizeSprite(raw) {
  const rawSprite = isPlainObject(raw.sprite) ? raw.sprite : {};
  const src = pickFirstDefined(
    rawSprite.src,
    rawSprite.path,
    raw.spritesheetPath,
    raw.spritesheet,
    raw.spriteSheet,
    raw.sprite_sheet,
    'spritesheet.webp',
  );
  const frameWidth = toFinitePositiveInteger(pickFirstDefined(
    rawSprite.frameWidth,
    rawSprite.frame_width,
    rawSprite.cellWidth,
    raw.frameWidth,
    raw.frame_width,
  ));
  const frameHeight = toFinitePositiveInteger(pickFirstDefined(
    rawSprite.frameHeight,
    rawSprite.frame_height,
    rawSprite.cellHeight,
    raw.frameHeight,
    raw.frame_height,
  ), CODEX_PET_ATLAS.frameHeight);

  return {
    src: String(src),
    frameWidth: frameWidth ?? CODEX_PET_ATLAS.frameWidth,
    frameHeight: frameHeight ?? CODEX_PET_ATLAS.frameHeight,
  };
}

function createDefaultCodexPetAnimations() {
  return Object.fromEntries(
    Object.entries(CODEX_PET_DEFAULT_ANIMATIONS).map(([name, entry]) => [name, { ...entry, durationsMs: [...entry.durationsMs] }]),
  );
}

function createNormalizedPetManifest(rawManifest, options = {}) {
  if (!isPlainObject(rawManifest)) {
    throw new TypeError('pet manifest must be an object');
  }

  const id = String(pickFirstDefined(rawManifest.id, options.id, rawManifest.displayName, rawManifest.name, 'unknown-pet'))
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown-pet';
  const name = String(pickFirstDefined(rawManifest.displayName, rawManifest.name, options.name, id)).trim() || id;
  const version = String(pickFirstDefined(rawManifest.version, '1.0.0'));
  const sprite = normalizeSprite(rawManifest);
  const rawAnimations = normalizeAnimations(pickFirstDefined(rawManifest.animations, rawManifest.actions, rawManifest.states));
  const animations = Object.keys(rawAnimations).length > 0 ? rawAnimations : createDefaultCodexPetAnimations();

  return {
    id,
    name,
    description: String(pickFirstDefined(rawManifest.description, '')).trim(),
    version,
    sprite,
    animations,
  };
}

function validateNormalizedPetManifest(manifest) {
  const errors = [];

  if (!isPlainObject(manifest)) errors.push('manifest must be an object');
  if (!manifest?.id) errors.push('manifest id is required');
  if (!manifest?.name) errors.push('manifest name is required');
  if (!manifest?.sprite?.src) errors.push('sprite src is required');
  if (!toFinitePositiveInteger(manifest?.sprite?.frameWidth)) errors.push('sprite frameWidth is required');
  if (!toFinitePositiveInteger(manifest?.sprite?.frameHeight)) errors.push('sprite frameHeight is required');

  const animations = isPlainObject(manifest?.animations) ? manifest.animations : {};
  const animationNames = Object.keys(animations);
  if (animationNames.length === 0) errors.push('at least one playable animation is required');
  if (!resolveAnimationForSemanticState(manifest, 'idle').animation) {
    errors.push(`${CANONICAL_ANIMATION.IDLE} or ${CANONICAL_ANIMATION.WAITING} animation is required`);
  }

  for (const [name, animation] of Object.entries(animations)) {
    const row = toFiniteNonNegativeInteger(animation.row);
    const frames = toFinitePositiveInteger(animation.frames);
    const fps = toFinitePositiveInteger(animation.fps);

    if (!normalizeAnimationName(name)) errors.push(`unsupported animation name: ${name}`);
    if (row === null) errors.push(`animation ${name} row is required`);
    if (frames === null) errors.push(`animation ${name} frames is required`);
    if (fps === null) errors.push(`animation ${name} fps is required`);
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

function loadPetPackage(packageDir) {
  const manifestPath = path.join(packageDir, 'pet.json');
  if (!fs.existsSync(manifestPath)) {
    return {
      ok: false,
      errors: ['pet.json is required'],
      manifest: null,
    };
  }

  let rawManifest;
  try {
    rawManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    return {
      ok: false,
      errors: [`pet.json could not be parsed: ${error.message}`],
      manifest: null,
    };
  }

  let manifest;
  try {
    manifest = createNormalizedPetManifest(rawManifest, { id: path.basename(packageDir) });
  } catch (error) {
    return {
      ok: false,
      errors: [error.message],
      manifest: null,
    };
  }

  const validation = validateNormalizedPetManifest(manifest);
  const spritePath = path.join(packageDir, manifest.sprite.src);
  if (!fs.existsSync(spritePath)) {
    validation.errors.push('spritesheet.webp is required');
  }

  return {
    ok: validation.errors.length === 0,
    errors: validation.errors,
    manifest,
    manifestPath,
    spritePath,
  };
}

module.exports = {
  CODEX_PET_ATLAS,
  CODEX_PET_DEFAULT_ANIMATIONS,
  createNormalizedPetManifest,
  createDefaultCodexPetAnimations,
  loadPetPackage,
  normalizeAnimationEntry,
  normalizeAnimations,
  validateNormalizedPetManifest,
};
