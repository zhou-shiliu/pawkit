#!/usr/bin/env node

const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ELECTRON_BIN = path.join(PROJECT_ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'electron.cmd' : 'electron');
const STORE_RELATIVE_PATH = path.join('Library', 'Preferences', 'electron-store-nodejs', 'config.json');
const DOCK_TOLERANCE_PX = 8;

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

function spawnElectron(homeDir, extraEnv = {}) {
  const child = spawn(ELECTRON_BIN, ['.'], {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      HOME: homeDir,
      PAWKIT_VITE_DEV_SERVER_URL: '',
      VITE_DEV_SERVER_URL: '',
      ...extraEnv,
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  });

  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += String(chunk);
  });
  child.getCapturedStderr = () => stderr.trim();
  return child;
}

async function stopProcess(child, timeoutMs = 5000) {
  if (!child || child.exitCode !== null) return;

  child.kill('SIGTERM');
  const startedAt = Date.now();
  while (child.exitCode === null && Date.now() - startedAt < timeoutMs) {
    await sleep(100);
  }

  if (child.exitCode === null) {
    child.kill('SIGKILL');
  }
}

async function waitForJsonFile(filePath, predicate, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const payload = readJsonIfPresent(filePath);
    if (payload && predicate(payload)) return payload;
    await sleep(120);
  }
  throw new Error(`Timeout waiting for ${filePath}`);
}

async function runPresenceScenario(tempRoot, name, extraEnv = {}, options = {}) {
  const homeDir = path.join(tempRoot, `${name}-home`);
  const statusFile = path.join(tempRoot, `${name}-presence.json`);
  await fs.mkdir(homeDir, { recursive: true });

  const child = spawnElectron(homeDir, {
    PAWKIT_AUTOMATION_PRESENCE_STATUS_FILE: statusFile,
    PAWKIT_AUTOMATION_PRESENCE_SAMPLE_MS: String(options.sampleMs ?? 3600),
    PAWKIT_AUTOMATION_PRESENCE_SAMPLE_INTERVAL_MS: String(options.intervalMs ?? 220),
    ...extraEnv,
  });

  try {
    const payload = await waitForJsonFile(
      statusFile,
      (value) => Array.isArray(value.samples) && value.samples.length >= (options.minSamples ?? 4),
      options.timeoutMs ?? 22000,
    );
    return {
      homeDir,
      storePath: path.join(homeDir, STORE_RELATIVE_PATH),
      statusFile,
      payload,
      stderr: child.getCapturedStderr(),
    };
  } finally {
    await stopProcess(child);
  }
}

async function runRendererScenario(tempRoot, name, extraEnv = {}) {
  const homeDir = path.join(tempRoot, `${name}-home`);
  const statusFile = path.join(tempRoot, `${name}-renderer.json`);
  await fs.mkdir(homeDir, { recursive: true });

  const child = spawnElectron(homeDir, {
    PAWKIT_AUTOMATION_RENDERER_STATUS_FILE: statusFile,
    ...extraEnv,
  });

  try {
    const payload = await waitForJsonFile(statusFile, (value) => value.careStatus, 18000);
    return { homeDir, statusFile, payload, stderr: child.getCapturedStderr() };
  } finally {
    await stopProcess(child);
  }
}

function latestSample(payload, mode = null) {
  const samples = Array.isArray(payload?.samples) ? payload.samples : [];
  const filtered = mode ? samples.filter((sample) => sample.presence?.mode === mode) : samples;
  return filtered[filtered.length - 1] ?? null;
}

function uniquePositions(samples, mode = null) {
  return new Set(
    samples
      .filter((sample) => !mode || sample.presence?.mode === mode)
      .map((sample) => sample.roaming && `${sample.roaming.x},${sample.roaming.y}`)
      .filter(Boolean),
  );
}

function uniquePhases(samples, mode = null) {
  return new Set(
    samples
      .filter((sample) => !mode || sample.presence?.mode === mode)
      .map((sample) => sample.roaming?.phase)
      .filter(Boolean),
  );
}

function isDocked(sample) {
  const bounds = sample?.windowBounds;
  const dock = sample?.presence?.dock;
  if (!bounds || !dock) return false;
  return Math.abs(bounds.x - dock.x) <= DOCK_TOLERANCE_PX && Math.abs(bounds.y - dock.y) <= DOCK_TOLERANCE_PX;
}

function careState(values) {
  return JSON.stringify({ hunger: values.hunger, hydration: values.hydration ?? 62, happiness: values.happiness ?? 50, trustLevel: 1 });
}

function toGate(status, details) {
  return { status: status ? 'PASS' : 'FAIL', details };
}

async function main() {
  if (!fsSync.existsSync(ELECTRON_BIN)) {
    throw new Error(`Electron binary not found at ${ELECTRON_BIN}. Run npm install first.`);
  }

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'pawkit-m2-presence-'));
  const report = {
    generatedAt: new Date().toISOString(),
    tempRoot,
    gates: {},
    metrics: {},
  };

  const defaultWork = await runPresenceScenario(tempRoot, 'default-work', {
    PAWKIT_AUTOMATION_IDLE_SECONDS: '0',
  });
  const defaultWorkSample = latestSample(defaultWork.payload);
  const defaultWorkPositions = uniquePositions(defaultWork.payload.samples);
  report.metrics.defaultWork = {
    sampleCount: defaultWork.payload.samples.length,
    latest: defaultWorkSample,
    uniqueRoamingPositions: defaultWorkPositions.size,
  };
  report.gates.defaultWorkMode = toGate(
    defaultWorkSample?.presence?.mode === 'work' &&
      defaultWorkSample?.presence?.idleThresholdSeconds === 600 &&
      defaultWorkSample?.presence?.manualOverride === 'auto' &&
      isDocked(defaultWorkSample) &&
      defaultWorkSample?.renderer?.presenceMode === 'work' &&
      defaultWorkSample?.renderer?.careStatus?.visible === true,
    `mode=${defaultWorkSample?.presence?.mode}, threshold=${defaultWorkSample?.presence?.idleThresholdSeconds}, docked=${isDocked(defaultWorkSample)}, renderer=${defaultWorkSample?.renderer?.presenceMode}`,
  );
  report.gates.workModeStopsRoaming = toGate(
    defaultWorkPositions.size <= 1,
    `uniqueRoamingPositions=${defaultWorkPositions.size}`,
  );

  const idleRoaming = await runPresenceScenario(tempRoot, 'idle-roaming', {
    PAWKIT_AUTOMATION_IDLE_SECONDS: '600',
  }, { sampleMs: 6200, minSamples: 10 });
  const idleSamples = idleRoaming.payload.samples;
  const idleSample = latestSample(idleRoaming.payload, 'idle');
  const idlePositions = uniquePositions(idleSamples, 'idle');
  const idlePhases = uniquePhases(idleSamples, 'idle');
  report.metrics.idleRoaming = {
    sampleCount: idleSamples.length,
    uniquePositions: idlePositions.size,
    phases: [...idlePhases],
    latest: idleSample,
  };
  report.gates.idleRestoresRoaming = toGate(
    idleSample?.presence?.mode === 'idle' &&
      idlePositions.size >= 2 &&
      idlePhases.has('pause') &&
      idlePhases.has('turn') &&
      idlePhases.has('move'),
    `mode=${idleSample?.presence?.mode}, positions=${idlePositions.size}, phases=[${[...idlePhases].join(', ')}]`,
  );

  const sequenceFile = path.join(tempRoot, 'idle-to-work-sequence.json');
  await fs.writeFile(sequenceFile, JSON.stringify({ sequence: [600, 600, 600, 600, 600, 0, 0], stepMs: 700 }, null, 2), 'utf8');
  const liveTransition = await runPresenceScenario(tempRoot, 'live-transition', {
    PAWKIT_AUTOMATION_IDLE_SEQUENCE_FILE: sequenceFile,
  }, { sampleMs: 6200, minSamples: 12 });
  const modeSequence = liveTransition.payload.samples.map((sample) => sample.presence?.mode).filter(Boolean);
  const joinedModes = modeSequence.join('>');
  const liveIdlePositions = uniquePositions(liveTransition.payload.samples, 'idle');
  const finalLiveSample = latestSample(liveTransition.payload);
  report.metrics.liveTransition = {
    sampleCount: liveTransition.payload.samples.length,
    modeSequence,
    idleUniquePositions: liveIdlePositions.size,
    final: finalLiveSample,
  };
  report.gates.liveIdleToWork = toGate(
    joinedModes.includes('idle>work') && liveIdlePositions.size >= 2 && finalLiveSample?.presence?.mode === 'work' && isDocked(finalLiveSample),
    `sequence=${joinedModes}, idlePositions=${liveIdlePositions.size}, finalDocked=${isDocked(finalLiveSample)}`,
  );

  const thresholdHome = path.join(tempRoot, 'threshold-home');
  await fs.mkdir(thresholdHome, { recursive: true });
  let child = spawnElectron(thresholdHome, {
    PAWKIT_AUTOMATION_IDLE_SECONDS: '0',
    PAWKIT_AUTOMATION_IDLE_THRESHOLD_SECONDS: '1800',
    PAWKIT_AUTOMATION_PRESENCE_STATUS_FILE: path.join(tempRoot, 'threshold-first.json'),
    PAWKIT_AUTOMATION_PRESENCE_SAMPLE_MS: '2600',
  });
  try {
    await waitForJsonFile(path.join(tempRoot, 'threshold-first.json'), (value) => Array.isArray(value.samples) && value.samples.length >= 3, 18000);
  } finally {
    await stopProcess(child);
  }
  const thresholdSecond = await runPresenceScenario(tempRoot, 'threshold-second', {
    HOME: thresholdHome,
    PAWKIT_AUTOMATION_IDLE_SECONDS: '0',
  }, { sampleMs: 2600, minSamples: 3 });
  const persistedThresholdSample = latestSample(thresholdSecond.payload);
  report.metrics.thresholdStore = readJsonIfPresent(path.join(thresholdHome, STORE_RELATIVE_PATH))?.cat?.presence ?? null;
  report.gates.thresholdPersistence = toGate(
    persistedThresholdSample?.presence?.idleThresholdSeconds === 1800 && report.metrics.thresholdStore?.idleThresholdSeconds === 1800,
    `runtime=${persistedThresholdSample?.presence?.idleThresholdSeconds}, store=${report.metrics.thresholdStore?.idleThresholdSeconds}`,
  );

  const forcedWork = await runPresenceScenario(tempRoot, 'forced-work', {
    PAWKIT_AUTOMATION_IDLE_SECONDS: '9999',
    PAWKIT_AUTOMATION_PRESENCE_OVERRIDE: 'work',
  }, { sampleMs: 2600, minSamples: 3 });
  const forcedIdle = await runPresenceScenario(tempRoot, 'forced-idle', {
    PAWKIT_AUTOMATION_IDLE_SECONDS: '0',
    PAWKIT_AUTOMATION_PRESENCE_OVERRIDE: 'idle',
  }, { sampleMs: 2600, minSamples: 3 });
  const forcedWorkSample = latestSample(forcedWork.payload);
  const forcedIdleSample = latestSample(forcedIdle.payload);
  report.gates.manualOverride = toGate(
    forcedWorkSample?.presence?.mode === 'work' &&
      forcedWorkSample?.presence?.manualOverride === 'work' &&
      forcedIdleSample?.presence?.mode === 'idle' &&
      forcedIdleSample?.presence?.manualOverride === 'idle',
    `forcedWork=${forcedWorkSample?.presence?.mode}/${forcedWorkSample?.presence?.manualOverride}, forcedIdle=${forcedIdleSample?.presence?.mode}/${forcedIdleSample?.presence?.manualOverride}`,
  );

  const workGentle = await runRendererScenario(tempRoot, 'work-gentle', {
    PAWKIT_AUTOMATION_PRESENCE_OVERRIDE: 'work',
    PAWKIT_AUTOMATION_CARE_STATE: careState({ hunger: 28 }),
  });
  const workUrgent = await runRendererScenario(tempRoot, 'work-urgent', {
    PAWKIT_AUTOMATION_PRESENCE_OVERRIDE: 'work',
    PAWKIT_AUTOMATION_CARE_STATE: careState({ hunger: 18 }),
  });
  const idleGentle = await runRendererScenario(tempRoot, 'idle-gentle', {
    PAWKIT_AUTOMATION_PRESENCE_OVERRIDE: 'idle',
    PAWKIT_AUTOMATION_CARE_STATE: careState({ hunger: 28 }),
  });
  report.metrics.promptFiltering = {
    workGentle: workGentle.payload,
    workUrgent: workUrgent.payload,
    idleGentle: idleGentle.payload,
  };
  report.gates.workPromptFiltering = toGate(
    workGentle.payload.presenceMode === 'work' &&
      workGentle.payload.careHud?.visible === false &&
      workUrgent.payload.presenceMode === 'work' &&
      workUrgent.payload.careHud?.visible === true &&
      idleGentle.payload.presenceMode === 'idle' &&
      idleGentle.payload.careHud?.visible === true,
    `workGentleHud=${workGentle.payload.careHud?.visible}, workUrgentHud=${workUrgent.payload.careHud?.visible}, idleGentleHud=${idleGentle.payload.careHud?.visible}`,
  );

  const allGatesPass = Object.values(report.gates).every((gate) => gate.status === 'PASS');
  const summary = [
    `M2 双模式存在感自动化验收：${allGatesPass ? '通过' : '失败'}`,
    ...Object.entries(report.gates).map(([gateName, gate]) => `- ${gateName}: ${gate.status} (${gate.details})`),
  ].join('\n');

  const reportPath = path.join(PROJECT_ROOT, 'docs', 'M2-PRESENCE-QA-REPORT.md');
  const markdown = `# M2 双模式存在感自动化验收报告\n\n- 生成时间：${report.generatedAt}\n- 自动化结果：**${allGatesPass ? '通过' : '失败'}**\n\n## 验收项结果\n\n${Object.entries(report.gates)
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
