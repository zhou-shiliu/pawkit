const test = require('node:test');
const assert = require('node:assert/strict');

const {
  advanceCareState,
  applyFeedAction,
  applyPetAction,
  applyWaterAction,
  clampGauge,
  clampTrust,
  createInitialCareState,
  toPersistedCareState,
} = require('../src/shared/careLoop');
const { getPrimaryCareNeedPresentation } = require('../src/shared/carePresentation');

test('clamp helpers keep values inside expected ranges', () => {
  assert.equal(clampGauge(-8), 0);
  assert.equal(clampGauge(180), 100);
  assert.equal(clampTrust(0), 1);
  assert.equal(clampTrust(9), 5);
});

test('advanceCareState decays care values over elapsed time', () => {
  const start = 1_000;
  const state = createInitialCareState({
    persistedState: {
      hunger: 80,
      hydration: 75,
      happiness: 70,
      trustLevel: 2.4,
      lastUpdatedAt: start,
    },
    now: start,
  });

  const advanced = advanceCareState(state, { now: start + 30 * 60_000 });
  assert.ok(advanced.hunger < state.hunger);
  assert.ok(advanced.hydration < state.hydration);
  assert.ok(advanced.happiness < state.happiness);
  assert.equal(advanced.lastUpdatedAt, start + 30 * 60_000);
});

test('feed, water, and pet actions raise the expected gauges', () => {
  const now = 9_000;
  const baseline = toPersistedCareState({
    hunger: 20,
    hydration: 18,
    happiness: 25,
    trustLevel: 1.2,
    lastUpdatedAt: now,
  });

  const afterFeed = applyFeedAction(baseline, { now: now + 1_000 });
  assert.ok(afterFeed.hunger > baseline.hunger);

  const afterWater = applyWaterAction(afterFeed, { now: now + 2_000 });
  assert.ok(afterWater.hydration >= afterFeed.hydration);

  const afterPet = applyPetAction(afterWater, { now: now + 3_000 });
  assert.ok(afterPet.happiness > afterWater.happiness);
  assert.ok(afterPet.trustLevel > afterWater.trustLevel);
});

test('offline resume applies decay but keeps values within bounds', () => {
  const now = 100_000;
  const resumed = createInitialCareState({
    persistedState: {
      hunger: 6,
      hydration: 5,
      happiness: 4,
      trustLevel: 1.05,
      lastUpdatedAt: now - 6 * 60 * 60_000,
    },
    now,
  });

  assert.ok(resumed.hunger >= 0 && resumed.hunger <= 100);
  assert.ok(resumed.hydration >= 0 && resumed.hydration <= 100);
  assert.ok(resumed.happiness >= 0 && resumed.happiness <= 100);
  assert.ok(resumed.trustLevel >= 1 && resumed.trustLevel <= 5);
});

test('care presentation escalates phrasing based on the lowest current need', () => {
  const hungry = getPrimaryCareNeedPresentation({
    hunger: 31,
    hydration: 70,
    happiness: 70,
  });
  assert.deepEqual(hungry, {
    action: 'feed',
    severity: 'gentle',
    prompt: '想吃点东西',
    menuSummary: '想吃点东西',
    trayTitle: 'Pawkit · 想吃饭',
  });

  const thirsty = getPrimaryCareNeedPresentation({
    hunger: 60,
    hydration: 14,
    happiness: 65,
  });
  assert.deepEqual(thirsty, {
    action: 'water',
    severity: 'urgent',
    prompt: '有点口渴了',
    menuSummary: '该喝水了',
    trayTitle: 'Pawkit · 该加水了',
  });

  const content = getPrimaryCareNeedPresentation({
    hunger: 55,
    hydration: 58,
    happiness: 57,
  });
  assert.equal(content, null);
});
