const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createEmptyValidationState,
  recordValidationSessionStart,
  syncPrimaryCareNeed,
  recordTrayMenuOpen,
  recordCareAction,
  createValidationArtifacts,
} = require('../src/shared/validationMetrics');

test('validation metrics record prompt cycles and first responses', () => {
  const start = 100_000;
  let validationState = createEmptyValidationState({ now: start });

  validationState = recordValidationSessionStart(validationState, { now: start });
  validationState = syncPrimaryCareNeed(
    validationState,
    {
      action: 'feed',
      severity: 'gentle',
      prompt: '想吃点东西',
    },
    { now: start + 1_000 },
  );
  validationState = recordTrayMenuOpen(validationState, { now: start + 2_000 });
  validationState = recordCareAction(validationState, {
    action: 'feed',
    source: 'tray',
    now: start + 15_000,
  });
  validationState = syncPrimaryCareNeed(validationState, null, { now: start + 18_000 });

  assert.equal(validationState.summary.sessionCount, 1);
  assert.equal(validationState.summary.totalPromptCount, 1);
  assert.equal(validationState.summary.promptCounts.feed.gentle, 1);
  assert.equal(validationState.summary.trayOpenCount, 1);
  assert.equal(validationState.summary.trayOpenWhileNeedActiveCount, 1);
  assert.equal(validationState.summary.careActionCounts.feed, 1);
  assert.equal(validationState.summary.promptResponseCount, 1);
  assert.equal(validationState.summary.ignoredPromptCount, 0);
  assert.equal(validationState.summary.firstResponseLatency.count, 1);
  assert.equal(validationState.summary.firstResponseLatency.averageMs, 14_000);
});

test('validation metrics distinguish ignored prompts and off-target actions', () => {
  const start = 200_000;
  let validationState = createEmptyValidationState({ now: start });

  validationState = syncPrimaryCareNeed(
    validationState,
    {
      action: 'water',
      severity: 'gentle',
      prompt: '想喝点水',
    },
    { now: start + 500 },
  );
  validationState = recordCareAction(validationState, {
    action: 'pet',
    source: 'tray',
    now: start + 1_500,
  });
  validationState = syncPrimaryCareNeed(
    validationState,
    {
      action: 'water',
      severity: 'urgent',
      prompt: '有点口渴了',
    },
    { now: start + 30_000 },
  );

  assert.equal(validationState.summary.offTargetCareActionCount, 1);
  assert.equal(validationState.summary.ignoredPromptCount, 1);
  assert.equal(validationState.summary.totalPromptCount, 2);
  assert.equal(validationState.summary.promptCounts.water.gentle, 1);
  assert.equal(validationState.summary.promptCounts.water.urgent, 1);
});

test('validation artifacts produce a readable local report snapshot', () => {
  const start = 300_000;
  let validationState = createEmptyValidationState({ now: start });

  validationState = recordValidationSessionStart(validationState, { now: start });
  validationState = syncPrimaryCareNeed(
    validationState,
    {
      action: 'pet',
      severity: 'urgent',
      prompt: '有点无聊，想找你玩',
    },
    { now: start + 1_000 },
  );
  validationState = recordCareAction(validationState, {
    action: 'pet',
    source: 'tray',
    now: start + 21_000,
  });

  const artifacts = createValidationArtifacts(validationState, { generatedAt: start + 22_000 });
  const jsonSnapshot = JSON.parse(artifacts.json);

  assert.equal(jsonSnapshot.summary.promptResponseCount, 1);
  assert.match(artifacts.markdown, /Pawkit Validation Summary/);
  assert.match(artifacts.markdown, /陪玩/);
  assert.match(artifacts.markdown, /First-response rate/);
});
