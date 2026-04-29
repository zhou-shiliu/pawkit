#!/usr/bin/env node

const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { DEFAULT_WINDOW_SIZE, POSITION_RESTORE_TOLERANCE_PX, createRoamingBounds } = require('../src/shared/roaming');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ELECTRON_BIN = path.join(PROJECT_ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'electron.cmd' : 'electron');
const STORE_RELATIVE_PATH = path.join('Library', 'Preferences', 'electron-store-nodejs', 'config.json');
const CARE_RESTORE_TOLERANCE = 0.25;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readJsonIfPresent(filePath) {
  if (!fsSync.existsSync(filePath)) return null;
  try {
    return JSON.parse(fsSync.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function getRoamingSnapshot(raw) {
  const roaming = raw?.cat?.roaming;
  if (!roaming) return null;
  if (!Number.isFinite(Number(roaming.x)) || !Number.isFinite(Number(roaming.y))) return null;

  return {
    x: Number(roaming.x),
    y: Number(roaming.y),
    phase: typeof roaming.phase === 'string' ? roaming.phase : 'unknown',
    locomotion: typeof roaming.locomotion === 'string' ? roaming.locomotion : 'unknown',
    facing: typeof roaming.facing === 'string' ? roaming.facing : 'unknown',
    lastUpdatedAt: Number(roaming.lastUpdatedAt || 0),
  };
}

function getCareSnapshot(raw) {
  const cat = raw?.cat;
  if (!cat) return null;

  const hunger = Number(cat.hunger);
  const hydration = Number(cat.hydration);
  const happiness = Number(cat.happiness);
  const trustLevel = Number(cat.trustLevel);

  if (![hunger, hydration, happiness, trustLevel].every(Number.isFinite)) {
    return null;
  }

  return {
    hunger,
    hydration,
    happiness,
    trustLevel,
    lastFed: Number.isFinite(Number(cat.lastFed)) ? Number(cat.lastFed) : null,
    lastWatered: Number.isFinite(Number(cat.lastWatered)) ? Number(cat.lastWatered) : null,
    lastPet: Number.isFinite(Number(cat.lastPet)) ? Number(cat.lastPet) : null,
    lastUpdatedAt: Number.isFinite(Number(cat.lastCareUpdatedAt)) ? Number(cat.lastCareUpdatedAt) : null,
  };
}

function distance(a, b) {
  return Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.y ?? 0) - (b?.y ?? 0));
}

async function waitForRoamingState(storePath, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const snapshot = getRoamingSnapshot(readJsonIfPresent(storePath));
    if (snapshot) return snapshot;
    await sleep(120);
  }
  throw new Error(`Timeout waiting for roaming state at ${storePath}`);
}

async function waitForCareState(storePath, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const snapshot = getCareSnapshot(readJsonIfPresent(storePath));
    if (snapshot) return snapshot;
    await sleep(120);
  }
  throw new Error(`Timeout waiting for care state at ${storePath}`);
}

function spawnElectron(homeDir, extraArgs = [], extraEnv = {}) {
  return spawn(ELECTRON_BIN, ['.', ...extraArgs], {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      HOME: homeDir,
      PAWKIT_VITE_DEV_SERVER_URL: '',
      VITE_DEV_SERVER_URL: '',
      PAWKIT_AUTOMATION_PRESENCE_OVERRIDE: 'idle',
      ...extraEnv,
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
}

async function stopProcess(child, timeoutMs = 5000) {
  if (child.exitCode !== null) return;

  child.kill('SIGTERM');
  const startedAt = Date.now();
  while (child.exitCode === null && Date.now() - startedAt < timeoutMs) {
    await sleep(100);
  }

  if (child.exitCode === null) {
    child.kill('SIGKILL');
  }
}

async function runElectronInlineScript(scriptText) {
  const helperDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pawkit-electron-helper-'));
  const helperPath = path.join(helperDir, 'helper.js');
  await fs.writeFile(helperPath, scriptText, 'utf8');

  return new Promise((resolve, reject) => {
    const child = spawn(ELECTRON_BIN, [helperPath], {
      cwd: PROJECT_ROOT,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', reject);
    child.on('close', async (code) => {
      await fs.rm(helperDir, { recursive: true, force: true });
      if (code !== 0) {
        reject(new Error(`Electron helper exited with code ${code}. ${stderr}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

async function getPrimaryWorkArea() {
  const result = await runElectronInlineScript(
    "const {app,screen}=require('electron');app.whenReady().then(()=>{process.stdout.write(JSON.stringify(screen.getPrimaryDisplay().workArea));setTimeout(()=>app.quit(),0);});",
  );
  return JSON.parse(result);
}

async function collectRoamingSamples(storePath, durationMs, intervalMs = 240) {
  const samples = [];
  const deadline = Date.now() + durationMs;
  while (Date.now() < deadline) {
    const snapshot = getRoamingSnapshot(readJsonIfPresent(storePath));
    if (snapshot) {
      samples.push({
        at: new Date().toISOString(),
        ...snapshot,
      });
    }
    await sleep(intervalMs);
  }
  return samples;
}

function uniquePositions(samples) {
  return new Set(samples.map((sample) => `${sample.x},${sample.y}`));
}

function uniquePhases(samples) {
  return new Set(samples.map((sample) => sample.phase));
}

function uniqueLocomotion(samples) {
  return new Set(samples.map((sample) => sample.locomotion));
}

function careValuesWithinRange(snapshot) {
  return (
    snapshot.hunger >= 0 &&
    snapshot.hunger <= 100 &&
    snapshot.hydration >= 0 &&
    snapshot.hydration <= 100 &&
    snapshot.happiness >= 0 &&
    snapshot.happiness <= 100 &&
    snapshot.trustLevel >= 1 &&
    snapshot.trustLevel <= 5
  );
}


async function waitForRendererStatus(filePath, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const payload = readJsonIfPresent(filePath);
    if (payload) return payload;
    await sleep(120);
  }
  throw new Error(`Timeout waiting for renderer status snapshot at ${filePath}`);
}

async function waitForAutomationStatus(filePath, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const payload = readJsonIfPresent(filePath);
    if (payload?.after) return payload;
    await sleep(120);
  }
  throw new Error(`Timeout waiting for automation status at ${filePath}`);
}

function nearlyEqual(left, right, tolerance = CARE_RESTORE_TOLERANCE) {
  return Math.abs((left ?? 0) - (right ?? 0)) <= tolerance;
}

function toGate(status, details) {
  return { status: status ? 'PASS' : 'FAIL', details };
}

async function main() {
  if (!fsSync.existsSync(ELECTRON_BIN)) {
    throw new Error(`Electron binary not found at ${ELECTRON_BIN}. Run npm install first.`);
  }

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'pawkit-m1-qa-'));
  const tempHome = path.join(tempRoot, 'home');
  await fs.mkdir(tempHome, { recursive: true });
  const storePath = path.join(tempHome, STORE_RELATIVE_PATH);
  const automationStatusPath = path.join(tempRoot, 'care-actions.json');
  const rendererStatusPath = path.join(tempRoot, 'renderer-status.json');

  const report = {
    generatedAt: new Date().toISOString(),
    tempHome,
    storePath,
    gates: {},
    metrics: {},
  };

  const workArea = await getPrimaryWorkArea();
  const bounds = createRoamingBounds(workArea, DEFAULT_WINDOW_SIZE);
  report.metrics.workArea = workArea;
  report.metrics.bounds = bounds;

  let child = null;
  try {
    child = spawnElectron(tempHome, [], {
      PAWKIT_AUTOMATION_RENDERER_STATUS_FILE: rendererStatusPath,
    });
    const initialSnapshot = await waitForRoamingState(storePath, 15000);
    const initialCareSnapshot = await waitForCareState(storePath, 15000);
    const rendererStatus = await waitForRendererStatus(rendererStatusPath, 15000);
    const samples = await collectRoamingSamples(storePath, 7000, 220);
    const finalSnapshot = samples[samples.length - 1] ?? initialSnapshot;

    const phases = uniquePhases(samples);
    const locomotions = uniqueLocomotion(samples);
    const positions = uniquePositions(samples);

    const withinBounds = samples.every(
      (sample) =>
        sample.x >= bounds.minX &&
        sample.x <= bounds.maxX &&
        sample.y >= bounds.minY &&
        sample.y <= bounds.maxY,
    );

    report.metrics.initialSnapshot = initialSnapshot;
    report.metrics.initialCareSnapshot = initialCareSnapshot;
    report.metrics.rendererStatus = rendererStatus;
    report.metrics.firstRunSampleCount = samples.length;
    report.metrics.firstRunFinalSnapshot = finalSnapshot;
    report.metrics.uniquePositions = positions.size;
    report.metrics.uniquePhases = [...phases];
    report.metrics.uniqueLocomotion = [...locomotions];

    report.gates.startupSpawn = toGate(Boolean(initialSnapshot), `Initial roaming snapshot found at ${storePath}`);
    report.gates.autonomousRoaming = toGate(
      positions.size >= 2 && phases.has('pause') && phases.has('turn') && phases.has('move') && locomotions.has('walk'),
      `positions=${positions.size}, phases=[${[...phases].join(', ')}], locomotion=[${[...locomotions].join(', ')}]`,
    );
    report.gates.boundarySafety = toGate(withinBounds, `Bounds=${JSON.stringify(bounds)}`);
    report.gates.careStateBootstrap = toGate(
      careValuesWithinRange(initialCareSnapshot),
      `hunger=${initialCareSnapshot.hunger.toFixed(2)}, hydration=${initialCareSnapshot.hydration.toFixed(2)}, happiness=${initialCareSnapshot.happiness.toFixed(2)}, trust=${initialCareSnapshot.trustLevel.toFixed(2)}`,
    );

    const requiredStatusLabels = ['Food', 'Water', 'Play', 'Trust'];
    const statusText = String(rendererStatus.text || '');
    const careStatusVisiblePass =
      rendererStatus.visible === true && requiredStatusLabels.every((label) => statusText.includes(label));

    report.gates.careStatusVisible = toGate(
      careStatusVisiblePass,
      `visible=${Boolean(rendererStatus.visible)}, text=${JSON.stringify(statusText)}`,
    );

    await stopProcess(child);
    child = null;

    const beforeRelaunch = getRoamingSnapshot(readJsonIfPresent(storePath));
    if (!beforeRelaunch) {
      throw new Error('Missing roaming snapshot before relaunch check.');
    }

    child = spawnElectron(tempHome);
    await waitForRoamingState(storePath, 10000);
    const relaunchSamples = await collectRoamingSamples(storePath, 1300, 110);
    const restoreDistances = relaunchSamples.map((sample) => distance(sample, beforeRelaunch));
    const bestDistance = restoreDistances.length > 0 ? Math.min(...restoreDistances) : Number.POSITIVE_INFINITY;
    const restorePass = bestDistance <= POSITION_RESTORE_TOLERANCE_PX;

    report.metrics.restoreTolerancePx = POSITION_RESTORE_TOLERANCE_PX;
    report.metrics.beforeRelaunch = beforeRelaunch;
    report.metrics.relaunchSampleCount = relaunchSamples.length;
    report.metrics.bestRestoreDistance = Number.isFinite(bestDistance) ? Number(bestDistance.toFixed(2)) : null;
    report.gates.restoreNearLastPosition = toGate(
      restorePass,
      `bestDistance=${Number.isFinite(bestDistance) ? bestDistance.toFixed(2) : 'n/a'}px (tolerance=${POSITION_RESTORE_TOLERANCE_PX}px)`,
    );

    await stopProcess(child);
    child = null;

    child = spawnElectron(tempHome, [], {
      PAWKIT_AUTOMATION_ACTIONS: 'feed,water,pet',
      PAWKIT_AUTOMATION_STATUS_FILE: automationStatusPath,
    });
    const careActionPayload = await waitForAutomationStatus(automationStatusPath, 15000);
    const actionBefore = careActionPayload.before;
    const actionAfter = careActionPayload.after;

    report.metrics.careActionBefore = actionBefore;
    report.metrics.careActionAfter = actionAfter;

    const careActionsPass =
      actionAfter.hunger > actionBefore.hunger &&
      actionAfter.hydration > actionBefore.hydration &&
      actionAfter.happiness > actionBefore.happiness &&
      actionAfter.trustLevel > actionBefore.trustLevel &&
      actionAfter.lastFed !== null &&
      actionAfter.lastWatered !== null &&
      actionAfter.lastPet !== null;

    report.gates.careActions = toGate(
      careActionsPass,
      `before={food:${actionBefore.hunger.toFixed(2)},water:${actionBefore.hydration.toFixed(2)},play:${actionBefore.happiness.toFixed(2)},trust:${actionBefore.trustLevel.toFixed(2)}} after={food:${actionAfter.hunger.toFixed(2)},water:${actionAfter.hydration.toFixed(2)},play:${actionAfter.happiness.toFixed(2)},trust:${actionAfter.trustLevel.toFixed(2)}}`,
    );

    await stopProcess(child);
    child = null;

    child = spawnElectron(tempHome);
    const persistedCare = await waitForCareState(storePath, 10000);
    report.metrics.persistedCareAfterRelaunch = persistedCare;

    const carePersistencePass =
      nearlyEqual(persistedCare.hunger, actionAfter.hunger) &&
      nearlyEqual(persistedCare.hydration, actionAfter.hydration) &&
      nearlyEqual(persistedCare.happiness, actionAfter.happiness) &&
      nearlyEqual(persistedCare.trustLevel, actionAfter.trustLevel) &&
      persistedCare.lastFed === actionAfter.lastFed &&
      persistedCare.lastWatered === actionAfter.lastWatered &&
      persistedCare.lastPet === actionAfter.lastPet;

    report.gates.carePersistence = toGate(
      carePersistencePass,
      `after={food:${actionAfter.hunger.toFixed(2)},water:${actionAfter.hydration.toFixed(2)},play:${actionAfter.happiness.toFixed(2)},trust:${actionAfter.trustLevel.toFixed(2)}} relaunch={food:${persistedCare.hunger.toFixed(2)},water:${persistedCare.hydration.toFixed(2)},play:${persistedCare.happiness.toFixed(2)},trust:${persistedCare.trustLevel.toFixed(2)}}`,
    );
  } finally {
    if (child) {
      await stopProcess(child);
    }
  }

  const allGatesPass = Object.values(report.gates).every((gate) => gate.status === 'PASS');
  const summary = [
    `M1 自动化验收：${allGatesPass ? '通过' : '失败'}`,
    ...Object.entries(report.gates).map(([gateName, gate]) => `- ${gateName}: ${gate.status} (${gate.details})`),
  ].join('\n');

  const reportPath = path.join(PROJECT_ROOT, 'docs', 'M1-MANUAL-QA-REPORT.md');
  const markdown = `# M1 自动化验收报告\n\n- 生成时间：${report.generatedAt}\n- 自动化结果：**${allGatesPass ? '通过' : '失败'}**\n\n## 验收项结果\n\n${Object.entries(report.gates)
    .map(([name, gate]) => `- **${name}**：${gate.status === 'PASS' ? '通过' : '失败'} — ${gate.details}`)
    .join('\n')}\n\n## 指标明细\n\n\`\`\`json\n${JSON.stringify(report.metrics, null, 2)}\n\`\`\`\n`;

  await fs.writeFile(reportPath, markdown, 'utf8');
  console.log(summary);
  console.log(`Report written: ${reportPath}`);

  if (!allGatesPass) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
