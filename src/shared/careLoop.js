const DEFAULT_CARE_STATE = Object.freeze({
  hunger: 60,
  hydration: 60,
  happiness: 55,
  trustLevel: 1,
  lastUpdatedAt: 0,
});

const CARE_TICK_MS = 5000;

const DECAY_RATES = Object.freeze({
  hungerPerMinute: 1 / 20,
  hydrationPerMinute: 1 / 18,
  happinessPerMinuteBase: 1 / 45,
  happinessPerMinuteLowNeeds: 1 / 12,
  trustPerMinuteLowHappiness: 1 / 1800,
});

function toFiniteNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function clampGauge(value, fallback = 0) {
  return Math.max(0, Math.min(100, toFiniteNumber(value, fallback)));
}

function clampTrust(value, fallback = 1) {
  return Math.max(1, Math.min(5, toFiniteNumber(value, fallback)));
}

function normalizeCareState(state = {}, now = Date.now()) {
  return {
    hunger: clampGauge(state.hunger, DEFAULT_CARE_STATE.hunger),
    hydration: clampGauge(state.hydration, DEFAULT_CARE_STATE.hydration),
    happiness: clampGauge(state.happiness, DEFAULT_CARE_STATE.happiness),
    trustLevel: clampTrust(state.trustLevel, DEFAULT_CARE_STATE.trustLevel),
    lastUpdatedAt: toFiniteNumber(state.lastUpdatedAt, now),
  };
}

function advanceCareState(state, { now = Date.now() } = {}) {
  const current = normalizeCareState(state, now);
  const elapsedMinutes = Math.max(0, (now - current.lastUpdatedAt) / 60_000);

  if (elapsedMinutes <= 0) {
    return {
      ...current,
      lastUpdatedAt: now,
    };
  }

  const hunger = clampGauge(current.hunger - elapsedMinutes * DECAY_RATES.hungerPerMinute, current.hunger);
  const hydration = clampGauge(
    current.hydration - elapsedMinutes * DECAY_RATES.hydrationPerMinute,
    current.hydration,
  );

  const lowNeeds = hunger < 35 || hydration < 35;
  const happinessRate = lowNeeds
    ? DECAY_RATES.happinessPerMinuteLowNeeds
    : DECAY_RATES.happinessPerMinuteBase;
  const happiness = clampGauge(
    current.happiness - elapsedMinutes * happinessRate,
    current.happiness,
  );

  const trustLoss = happiness < 30 ? elapsedMinutes * DECAY_RATES.trustPerMinuteLowHappiness : 0;
  const trustLevel = clampTrust(current.trustLevel - trustLoss, current.trustLevel);

  return {
    hunger,
    hydration,
    happiness,
    trustLevel,
    lastUpdatedAt: now,
  };
}

function applyFeedAction(state, { now = Date.now() } = {}) {
  const base = advanceCareState(state, { now });
  return {
    ...base,
    hunger: clampGauge(base.hunger + 28, base.hunger),
    happiness: clampGauge(base.happiness + 4, base.happiness),
    trustLevel: clampTrust(base.trustLevel + 0.04, base.trustLevel),
    lastUpdatedAt: now,
  };
}

function applyWaterAction(state, { now = Date.now() } = {}) {
  const base = advanceCareState(state, { now });
  return {
    ...base,
    hydration: clampGauge(base.hydration + 26, base.hydration),
    happiness: clampGauge(base.happiness + 3, base.happiness),
    trustLevel: clampTrust(base.trustLevel + 0.03, base.trustLevel),
    lastUpdatedAt: now,
  };
}

function applyPetAction(state, { now = Date.now() } = {}) {
  const base = advanceCareState(state, { now });
  return {
    ...base,
    happiness: clampGauge(base.happiness + 15, base.happiness),
    trustLevel: clampTrust(base.trustLevel + 0.12, base.trustLevel),
    lastUpdatedAt: now,
  };
}

function createInitialCareState({ persistedState, now = Date.now() } = {}) {
  const normalized = normalizeCareState(persistedState ?? {}, now);
  return advanceCareState(normalized, { now });
}

function toPersistedCareState(state, now = Date.now()) {
  return normalizeCareState(state, now);
}

module.exports = {
  CARE_TICK_MS,
  DEFAULT_CARE_STATE,
  advanceCareState,
  applyFeedAction,
  applyPetAction,
  applyWaterAction,
  clampGauge,
  clampTrust,
  createInitialCareState,
  toPersistedCareState,
};
