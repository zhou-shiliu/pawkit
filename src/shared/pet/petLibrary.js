const fs = require('node:fs');
const path = require('node:path');
const JSZip = require('jszip');

const {
  loadPetPackage,
  readPetZipBuffer,
} = require('./codexPetAdapter');
const {
  findPetPackageDirs,
} = require('./packageDiscovery');

function sanitizePackageId(value, fallback = 'imported-pet') {
  return String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || fallback;
}

function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function createUniquePackageDir(parentDir, packageId) {
  ensureDirectory(parentDir);
  const safeId = sanitizePackageId(packageId);
  let candidate = path.join(parentDir, safeId);
  let index = 2;

  while (fs.existsSync(candidate)) {
    candidate = path.join(parentDir, `${safeId}-${index}`);
    index += 1;
  }

  return candidate;
}

function createPortableManifest(manifest, spriteFileName = 'spritesheet.webp') {
  return {
    id: manifest.id,
    displayName: manifest.name,
    description: manifest.description ?? '',
    version: manifest.version ?? '1.0.0',
    sprite: {
      src: spriteFileName,
      frameWidth: manifest.sprite.frameWidth,
      frameHeight: manifest.sprite.frameHeight,
    },
    animations: manifest.animations,
  };
}

function writeImportedPackage({ manifest, spriteBuffer, spritePath, importedRoot }) {
  const packageDir = createUniquePackageDir(importedRoot, manifest.id);
  const sourceExt = spritePath ? path.extname(spritePath) : '';
  const spriteFileName = sourceExt && sourceExt.toLowerCase() !== '.webp'
    ? `spritesheet${sourceExt}`
    : 'spritesheet.webp';
  const destinationSpritePath = path.join(packageDir, spriteFileName);

  ensureDirectory(packageDir);
  fs.writeFileSync(
    path.join(packageDir, 'pet.json'),
    JSON.stringify(createPortableManifest(manifest, spriteFileName), null, 2),
  );

  if (spriteBuffer) {
    fs.writeFileSync(destinationSpritePath, spriteBuffer);
  } else if (spritePath) {
    fs.copyFileSync(spritePath, destinationSpritePath);
  } else {
    return {
      ok: false,
      errors: ['spritesheet is required'],
      packageDir,
      manifest,
    };
  }

  const loaded = loadPetPackage(packageDir);
  return {
    ...loaded,
    packageDir,
  };
}

function importPetDirectory(sourceDir, importedRoot) {
  const loaded = loadPetPackage(sourceDir);
  if (!loaded.ok) {
    return {
      ok: false,
      errors: loaded.errors,
      packageDir: null,
      manifest: loaded.manifest,
    };
  }

  return writeImportedPackage({
    manifest: loaded.manifest,
    spritePath: loaded.spritePath,
    importedRoot,
  });
}

async function importPetZipFile(zipPath, importedRoot) {
  let zipBuffer;
  try {
    zipBuffer = fs.readFileSync(zipPath);
  } catch (error) {
    return {
      ok: false,
      errors: [`zip could not be read: ${error.message}`],
      packageDir: null,
      manifest: null,
    };
  }

  const inspected = await readPetZipBuffer(zipBuffer);
  if (!inspected.ok) {
    return {
      ok: false,
      errors: inspected.errors,
      packageDir: null,
      manifest: inspected.manifest,
    };
  }

  let zip;
  try {
    zip = await JSZip.loadAsync(zipBuffer);
  } catch (error) {
    return {
      ok: false,
      errors: [`zip could not be parsed: ${error.message}`],
      packageDir: null,
      manifest: null,
    };
  }

  const spriteEntry = zip.file(inspected.spriteEntryName);
  if (!spriteEntry) {
    return {
      ok: false,
      errors: [`${inspected.manifest.sprite.src} is required`],
      packageDir: null,
      manifest: inspected.manifest,
    };
  }

  return writeImportedPackage({
    manifest: inspected.manifest,
    spriteBuffer: await spriteEntry.async('nodebuffer'),
    importedRoot,
  });
}

async function importPetPackage(sourcePath, importedRoot) {
  let stat;
  try {
    stat = fs.statSync(sourcePath);
  } catch (error) {
    return {
      ok: false,
      errors: [`pet package could not be read: ${error.message}`],
      packageDir: null,
      manifest: null,
    };
  }

  if (stat.isDirectory()) return importPetDirectory(sourcePath, importedRoot);
  if (stat.isFile() && path.extname(sourcePath).toLowerCase() === '.zip') {
    return importPetZipFile(sourcePath, importedRoot);
  }

  return {
    ok: false,
    errors: ['pet package must be a directory or .zip file'],
    packageDir: null,
    manifest: null,
  };
}

function listPetPackages(searchRoots = [], options = {}) {
  const activePackageDir = options.activePackageDir ? path.resolve(options.activePackageDir) : null;
  const seen = new Set();
  const packages = [];

  for (const root of searchRoots) {
    const source = root.source ?? 'unknown';
    const rootDir = root.directory;
    if (!rootDir || !fs.existsSync(rootDir)) continue;
    const packageDirs = findPetPackageDirs(rootDir);

    for (const packageDir of packageDirs) {
      const resolvedDir = path.resolve(packageDir);
      if (seen.has(resolvedDir)) continue;
      seen.add(resolvedDir);

      const loaded = loadPetPackage(resolvedDir);
      packages.push({
        ok: loaded.ok,
        errors: loaded.errors ?? [],
        source,
        packageDir: resolvedDir,
        active: activePackageDir === resolvedDir,
        manifest: loaded.manifest,
        spritePath: loaded.spritePath ?? null,
      });
    }
  }

  return packages;
}

module.exports = {
  createPortableManifest,
  createUniquePackageDir,
  importPetDirectory,
  importPetPackage,
  importPetZipFile,
  listPetPackages,
  sanitizePackageId,
  writeImportedPackage,
};
