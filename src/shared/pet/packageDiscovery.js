const fs = require('node:fs');
const path = require('node:path');

function normalizeDir(value) {
  const raw = String(value || '').trim();
  return raw ? path.resolve(raw) : null;
}

function hasPetManifest(directory, existsSync = fs.existsSync) {
  if (!directory) return false;
  return existsSync(path.join(directory, 'pet.json'));
}

function findPetPackageDirs(parentDir, options = {}) {
  const existsSync = options.existsSync ?? fs.existsSync;
  const readdirSync = options.readdirSync ?? fs.readdirSync;

  if (!parentDir || !existsSync(parentDir)) return [];

  return readdirSync(parentDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(parentDir, entry.name))
    .sort((left, right) => left.localeCompare(right))
    .filter((directory) => hasPetManifest(directory, existsSync));
}

function createPetPackageCandidates(options = {}) {
  const candidates = [];
  const envDir = normalizeDir(options.envDir);
  const persistedDir = normalizeDir(options.persistedDir);

  if (envDir) candidates.push({ source: 'env', directory: envDir, required: true });
  if (persistedDir && persistedDir !== envDir) {
    candidates.push({ source: 'persisted', directory: persistedDir, required: false });
  }

  for (const directory of findPetPackageDirs(options.importedDir, options)) {
    if (!candidates.some((candidate) => candidate.directory === directory)) {
      candidates.push({ source: 'imported', directory, required: false });
    }
  }

  for (const directory of findPetPackageDirs(options.communityDir, options)) {
    if (!candidates.some((candidate) => candidate.directory === directory)) {
      candidates.push({ source: 'community', directory, required: false });
    }
  }

  for (const directory of findPetPackageDirs(options.builtInDir, options)) {
    if (!candidates.some((candidate) => candidate.directory === directory)) {
      candidates.push({ source: 'builtin', directory, required: false });
    }
  }

  return candidates;
}

module.exports = {
  createPetPackageCandidates,
  findPetPackageDirs,
  hasPetManifest,
  normalizeDir,
};
