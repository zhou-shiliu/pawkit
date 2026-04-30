#!/usr/bin/env node

const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  VISUAL_PRESENCE_MODE,
  VISUAL_ROAMING_PHASE,
  getAllowedVisualStates,
} = require('../src/shared/visualPresence');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ELECTRON_BIN = path.join(PROJECT_ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'electron.cmd' : 'electron');

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

async function waitForJsonFile(filePath, predicate, timeoutMs = 24000) {
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
    PAWKIT_AUTOMATION_PRESENCE_SAMPLE_MS: String(options.sampleMs ?? 8200),
    PAWKIT_AUTOMATION_PRESENCE_SAMPLE_INTERVAL_MS: String(options.intervalMs ?? 240),
    ...extraEnv,
  });

  try {
    const payload = await waitForJsonFile(
      statusFile,
      (value) => Array.isArray(value.samples) && value.samples.length >= (options.minSamples ?? 8),
      options.timeoutMs ?? 28000,
    );
    return {
      statusFile,
      payload,
      stderr: child.getCapturedStderr(),
    };
  } finally {
    await stopProcess(child);
  }
}

function toGate(ok, details) {
  return { status: ok ? 'PASS' : 'FAIL', details };
}

function uniqueVisualStates(samples, mode = null) {
  return new Set(
    samples
      .filter((sample) => !mode || sample.presence?.mode === mode)
      .map((sample) => sample.renderer?.visualState)
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

function uniquePositions(samples, mode = null) {
  return new Set(
    samples
      .filter((sample) => !mode || sample.presence?.mode === mode)
      .map((sample) => sample.roaming && `${sample.roaming.x},${sample.roaming.y}`)
      .filter(Boolean),
  );
}

function latestSample(samples, mode = null) {
  const filtered = mode ? samples.filter((sample) => sample.presence?.mode === mode) : samples;
  return filtered[filtered.length - 1] ?? null;
}

function includesOnly(states, allowedStates) {
  return [...states].every((value) => allowedStates.has(value));
}

async function main() {
  if (!fsSync.existsSync(ELECTRON_BIN)) {
    throw new Error(`Electron binary not found at ${ELECTRON_BIN}. Run npm install first.`);
  }

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'pawkit-m3-lifelike-'));
  const report = {
    generatedAt: new Date().toISOString(),
    tempRoot,
    gates: {},
    metrics: {},
  };

  const workAllowed = new Set(
    getAllowedVisualStates({
      presenceMode: VISUAL_PRESENCE_MODE.WORK,
      roamingPhase: VISUAL_ROAMING_PHASE.PAUSE,
    }),
  );
  const idleMoveAllowed = new Set(
    getAllowedVisualStates({
      presenceMode: VISUAL_PRESENCE_MODE.IDLE,
      roamingPhase: VISUAL_ROAMING_PHASE.MOVE,
    }),
  );
  const idlePauseAllowed = new Set(
    getAllowedVisualStates({
      presenceMode: VISUAL_PRESENCE_MODE.IDLE,
      roamingPhase: VISUAL_ROAMING_PHASE.PAUSE,
    }),
  );

  const startup = await runPresenceScenario(tempRoot, 'startup-work', {
    PAWKIT_AUTOMATION_IDLE_SECONDS: '0',
  }, { sampleMs: 8400, minSamples: 10 });
  const startupStates = [...uniqueVisualStates(startup.payload.samples)];
  report.metrics.startup = { visualStates: startupStates, sampleCount: startup.payload.samples.length };
  report.gates.startupChanges = toGate(
    startupStates.length >= 2 && startup.payload.samples[0]?.renderer?.visualState !== latestSample(startup.payload.samples)?.renderer?.visualState,
    `states=${startupStates.join(',')}`,
  );

  const work = await runPresenceScenario(tempRoot, 'work', {
    PAWKIT_AUTOMATION_IDLE_SECONDS: '0',
  }, { sampleMs: 9600, minSamples: 10 });
  const workStates = uniqueVisualStates(work.payload.samples, 'work');
  const workPositions = uniquePositions(work.payload.samples, 'work');
  report.metrics.work = {
    visualStates: [...workStates],
    uniquePositions: workPositions.size,
    final: latestSample(work.payload.samples, 'work'),
  };
  report.gates.workIsCalmButAlive = toGate(
    workStates.size >= 2 && includesOnly(workStates, workAllowed) && workPositions.size <= 1,
    `states=${[...workStates].join(',')}; positions=${workPositions.size}`,
  );

  const idle = await runPresenceScenario(tempRoot, 'idle', {
    PAWKIT_AUTOMATION_IDLE_SECONDS: '600',
  }, { sampleMs: 7600, minSamples: 14 });
  const idleStates = uniqueVisualStates(idle.payload.samples, 'idle');
  const idlePhases = uniquePhases(idle.payload.samples, 'idle');
  const sawWalk = [...idleStates].some((state) => idleMoveAllowed.has(state));
  const sawPausePose = [...idleStates].some((state) => idlePauseAllowed.has(state));
  report.metrics.idle = {
    visualStates: [...idleStates],
    phases: [...idlePhases],
    final: latestSample(idle.payload.samples, 'idle'),
  };
  report.gates.idleIsRicher = toGate(
    idleStates.size >= 3 && sawWalk && sawPausePose && idlePhases.has('move') && idlePhases.has('pause'),
    `states=${[...idleStates].join(',')}; phases=${[...idlePhases].join(',')}`,
  );

  const sequenceFile = path.join(tempRoot, 'idle-to-work-sequence.json');
  await fs.writeFile(sequenceFile, JSON.stringify({ sequence: [600, 600, 600, 600, 0, 0, 0], stepMs: 900 }, null, 2), 'utf8');
  const boundary = await runPresenceScenario(tempRoot, 'idle-to-work', {
    PAWKIT_AUTOMATION_IDLE_SEQUENCE_FILE: sequenceFile,
  }, { sampleMs: 8600, minSamples: 14 });
  const boundaryStates = boundary.payload.samples.map((sample) => ({
    mode: sample.presence?.mode,
    visualState: sample.renderer?.visualState,
  }));
  const finalBoundarySample = latestSample(boundary.payload.samples);
  report.metrics.boundary = { boundaryStates, final: finalBoundarySample };
  report.gates.idleReturnsToWork = toGate(
    boundaryStates.some((sample, index) => sample.mode === 'idle' && boundaryStates[index + 1]?.mode === 'work') &&
      workAllowed.has(finalBoundarySample?.renderer?.visualState) &&
      finalBoundarySample?.presence?.mode === 'work',
    `finalMode=${finalBoundarySample?.presence?.mode}; finalVisual=${finalBoundarySample?.renderer?.visualState}`,
  );

  const failures = Object.entries(report.gates).filter(([, gate]) => gate.status === 'FAIL');
  const reportPath = path.join(tempRoot, 'm3-lifelike-report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');

  if (failures.length > 0) {
    console.error('M3 lifelike presence verification failed.');
    for (const [name, gate] of failures) {
      console.error(`- ${name}: ${gate.details}`);
    }
    console.error(`Report: ${reportPath}`);
    process.exit(1);
  }

  console.log('M3 lifelike presence verification passed.');
  console.log(`Report: ${reportPath}`);
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
