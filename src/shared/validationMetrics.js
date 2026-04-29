const CARE_ACTIONS = Object.freeze(['feed', 'water', 'pet']);
const CARE_SEVERITIES = Object.freeze(['gentle', 'urgent']);
const CARE_SOURCES = Object.freeze(['tray', 'ipc', 'automation', 'unknown']);
const PRESENCE_MODES = Object.freeze(['work', 'idle']);
const PRESENCE_OVERRIDES = Object.freeze(['auto', 'work', 'idle']);
const MAX_RECENT_EVENTS = 40;
const VALIDATION_SCHEMA_VERSION = 1;

function toFiniteNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeTimestamp(value, fallback = Date.now()) {
  return Math.max(0, toFiniteNumber(value, fallback));
}

function normalizeAction(value) {
  return CARE_ACTIONS.includes(value) ? value : null;
}

function normalizeSeverity(value) {
  return CARE_SEVERITIES.includes(value) ? value : null;
}

function normalizeSource(value) {
  return CARE_SOURCES.includes(value) ? value : 'unknown';
}

function normalizePresenceMode(value) {
  return PRESENCE_MODES.includes(value) ? value : 'work';
}

function normalizePresenceOverride(value) {
  return PRESENCE_OVERRIDES.includes(value) ? value : 'auto';
}

function createActionCounter() {
  return {
    feed: 0,
    water: 0,
    pet: 0,
  };
}

function createPromptCounter() {
  return {
    feed: { gentle: 0, urgent: 0 },
    water: { gentle: 0, urgent: 0 },
    pet: { gentle: 0, urgent: 0 },
  };
}

function createSourceCounter() {
  return {
    tray: 0,
    ipc: 0,
    automation: 0,
    unknown: 0,
  };
}

function createPresenceModeCounter() {
  return {
    work: 0,
    idle: 0,
  };
}

function createPresenceOverrideCounter() {
  return {
    auto: 0,
    work: 0,
    idle: 0,
  };
}

function createLatencyStat() {
  return {
    count: 0,
    totalMs: 0,
    averageMs: null,
    minMs: null,
    maxMs: null,
  };
}

function createLatencyByAction() {
  return {
    feed: createLatencyStat(),
    water: createLatencyStat(),
    pet: createLatencyStat(),
  };
}

function cloneLatencyStat(stat = {}) {
  const count = Math.max(0, Math.floor(toFiniteNumber(stat.count, 0)));
  const totalMs = Math.max(0, toFiniteNumber(stat.totalMs, 0));
  const averageMs = stat.averageMs == null ? null : Math.max(0, toFiniteNumber(stat.averageMs, 0));
  const minMs = stat.minMs == null ? null : Math.max(0, toFiniteNumber(stat.minMs, 0));
  const maxMs = stat.maxMs == null ? null : Math.max(0, toFiniteNumber(stat.maxMs, 0));

  return {
    count,
    totalMs,
    averageMs: count > 0 ? averageMs ?? totalMs / count : null,
    minMs: count > 0 ? minMs : null,
    maxMs: count > 0 ? maxMs : null,
  };
}

function cloneActionCounter(counter = {}) {
  return {
    feed: Math.max(0, Math.floor(toFiniteNumber(counter.feed, 0))),
    water: Math.max(0, Math.floor(toFiniteNumber(counter.water, 0))),
    pet: Math.max(0, Math.floor(toFiniteNumber(counter.pet, 0))),
  };
}

function clonePromptCounter(counter = {}) {
  return {
    feed: {
      gentle: Math.max(0, Math.floor(toFiniteNumber(counter.feed?.gentle, 0))),
      urgent: Math.max(0, Math.floor(toFiniteNumber(counter.feed?.urgent, 0))),
    },
    water: {
      gentle: Math.max(0, Math.floor(toFiniteNumber(counter.water?.gentle, 0))),
      urgent: Math.max(0, Math.floor(toFiniteNumber(counter.water?.urgent, 0))),
    },
    pet: {
      gentle: Math.max(0, Math.floor(toFiniteNumber(counter.pet?.gentle, 0))),
      urgent: Math.max(0, Math.floor(toFiniteNumber(counter.pet?.urgent, 0))),
    },
  };
}

function cloneSourceCounter(counter = {}) {
  return {
    tray: Math.max(0, Math.floor(toFiniteNumber(counter.tray, 0))),
    ipc: Math.max(0, Math.floor(toFiniteNumber(counter.ipc, 0))),
    automation: Math.max(0, Math.floor(toFiniteNumber(counter.automation, 0))),
    unknown: Math.max(0, Math.floor(toFiniteNumber(counter.unknown, 0))),
  };
}

function clonePresenceModeCounter(counter = {}) {
  return {
    work: Math.max(0, Math.floor(toFiniteNumber(counter.work, 0))),
    idle: Math.max(0, Math.floor(toFiniteNumber(counter.idle, 0))),
  };
}

function clonePresenceOverrideCounter(counter = {}) {
  return {
    auto: Math.max(0, Math.floor(toFiniteNumber(counter.auto, 0))),
    work: Math.max(0, Math.floor(toFiniteNumber(counter.work, 0))),
    idle: Math.max(0, Math.floor(toFiniteNumber(counter.idle, 0))),
  };
}

function createEmptyValidationState({ now = Date.now() } = {}) {
  return {
    schemaVersion: VALIDATION_SCHEMA_VERSION,
    summary: {
      firstSeenAt: now,
      lastUpdatedAt: now,
      sessionCount: 0,
      totalPromptCount: 0,
      promptCounts: createPromptCounter(),
      trayOpenCount: 0,
      trayOpenWhileNeedActiveCount: 0,
      careActionCounts: createActionCounter(),
      careActionSourceCounts: createSourceCounter(),
      promptResponseCount: 0,
      ignoredPromptCount: 0,
      offTargetCareActionCount: 0,
      unpromptedCareActionCount: 0,
      firstResponseLatency: createLatencyStat(),
      firstResponseLatencyByAction: createLatencyByAction(),
      presenceModeSwitchCount: 0,
      presenceModeDurationsMs: createPresenceModeCounter(),
      presenceOverrideCounts: createPresenceOverrideCounter(),
      presenceThresholdChangeCount: 0,
    },
    recentEvents: [],
    activeNeed: null,
  };
}

function normalizeEvent(event = {}, fallbackNow = Date.now()) {
  return {
    type: typeof event.type === 'string' ? event.type : 'unknown',
    at: normalizeTimestamp(event.at, fallbackNow),
    action: normalizeAction(event.action),
    severity: normalizeSeverity(event.severity),
    source: normalizeSource(event.source),
    mode: event.mode == null ? null : normalizePresenceMode(event.mode),
    previousMode: event.previousMode == null ? null : normalizePresenceMode(event.previousMode),
    override: event.override == null ? null : normalizePresenceOverride(event.override),
    thresholdSeconds: event.thresholdSeconds == null ? null : Math.max(0, Math.floor(toFiniteNumber(event.thresholdSeconds, 0))),
    matchedNeed: event.matchedNeed === true,
    latencyMs: event.latencyMs == null ? null : Math.max(0, toFiniteNumber(event.latencyMs, 0)),
    prompt: typeof event.prompt === 'string' ? event.prompt : null,
    responded: event.responded === true,
  };
}

function normalizeActiveNeed(activeNeed, fallbackNow = Date.now()) {
  const action = normalizeAction(activeNeed?.action);
  const severity = normalizeSeverity(activeNeed?.severity);
  if (!action || !severity) return null;

  const startedAt = normalizeTimestamp(activeNeed.startedAt, fallbackNow);
  const firstRespondedAt = activeNeed.firstRespondedAt == null
    ? null
    : normalizeTimestamp(activeNeed.firstRespondedAt, startedAt);

  return {
    action,
    severity,
    prompt: typeof activeNeed.prompt === 'string' ? activeNeed.prompt : '',
    startedAt,
    firstRespondedAt,
  };
}

function normalizeValidationState(state, now = Date.now()) {
  const base = state && typeof state === 'object' ? state : createEmptyValidationState({ now });
  const summary = base.summary && typeof base.summary === 'object' ? base.summary : {};
  const firstSeenAt = normalizeTimestamp(summary.firstSeenAt, now);
  const lastUpdatedAt = normalizeTimestamp(summary.lastUpdatedAt, firstSeenAt);

  return {
    schemaVersion: VALIDATION_SCHEMA_VERSION,
    summary: {
      firstSeenAt,
      lastUpdatedAt,
      sessionCount: Math.max(0, Math.floor(toFiniteNumber(summary.sessionCount, 0))),
      totalPromptCount: Math.max(0, Math.floor(toFiniteNumber(summary.totalPromptCount, 0))),
      promptCounts: clonePromptCounter(summary.promptCounts),
      trayOpenCount: Math.max(0, Math.floor(toFiniteNumber(summary.trayOpenCount, 0))),
      trayOpenWhileNeedActiveCount: Math.max(0, Math.floor(toFiniteNumber(summary.trayOpenWhileNeedActiveCount, 0))),
      careActionCounts: cloneActionCounter(summary.careActionCounts),
      careActionSourceCounts: cloneSourceCounter(summary.careActionSourceCounts),
      promptResponseCount: Math.max(0, Math.floor(toFiniteNumber(summary.promptResponseCount, 0))),
      ignoredPromptCount: Math.max(0, Math.floor(toFiniteNumber(summary.ignoredPromptCount, 0))),
      offTargetCareActionCount: Math.max(0, Math.floor(toFiniteNumber(summary.offTargetCareActionCount, 0))),
      unpromptedCareActionCount: Math.max(0, Math.floor(toFiniteNumber(summary.unpromptedCareActionCount, 0))),
      firstResponseLatency: cloneLatencyStat(summary.firstResponseLatency),
      firstResponseLatencyByAction: {
        feed: cloneLatencyStat(summary.firstResponseLatencyByAction?.feed),
        water: cloneLatencyStat(summary.firstResponseLatencyByAction?.water),
        pet: cloneLatencyStat(summary.firstResponseLatencyByAction?.pet),
      },
      presenceModeSwitchCount: Math.max(0, Math.floor(toFiniteNumber(summary.presenceModeSwitchCount, 0))),
      presenceModeDurationsMs: clonePresenceModeCounter(summary.presenceModeDurationsMs),
      presenceOverrideCounts: clonePresenceOverrideCounter(summary.presenceOverrideCounts),
      presenceThresholdChangeCount: Math.max(0, Math.floor(toFiniteNumber(summary.presenceThresholdChangeCount, 0))),
    },
    recentEvents: Array.isArray(base.recentEvents)
      ? base.recentEvents
          .slice(-MAX_RECENT_EVENTS)
          .map((event) => normalizeEvent(event, now))
      : [],
    activeNeed: normalizeActiveNeed(base.activeNeed, now),
  };
}

function getNeedKeyFromPresentation(presentation) {
  const action = normalizeAction(presentation?.action);
  const severity = normalizeSeverity(presentation?.severity);
  return action && severity ? `${action}:${severity}` : null;
}

function getNeedKeyFromState(state) {
  const action = normalizeAction(state?.activeNeed?.action);
  const severity = normalizeSeverity(state?.activeNeed?.severity);
  return action && severity ? `${action}:${severity}` : null;
}

function cloneState(state, now = Date.now()) {
  return normalizeValidationState(state, now);
}

function appendEvent(state, event, now = Date.now()) {
  state.recentEvents.push(normalizeEvent(event, now));
  if (state.recentEvents.length > MAX_RECENT_EVENTS) {
    state.recentEvents = state.recentEvents.slice(-MAX_RECENT_EVENTS);
  }
}

function addLatency(stat, latencyMs) {
  const safeLatency = Math.max(0, toFiniteNumber(latencyMs, 0));
  stat.count += 1;
  stat.totalMs += safeLatency;
  stat.averageMs = stat.totalMs / stat.count;
  stat.minMs = stat.minMs == null ? safeLatency : Math.min(stat.minMs, safeLatency);
  stat.maxMs = stat.maxMs == null ? safeLatency : Math.max(stat.maxMs, safeLatency);
}

function recordValidationSessionStart(state, { now = Date.now() } = {}) {
  const nextState = cloneState(state, now);
  nextState.summary.sessionCount += 1;
  nextState.summary.lastUpdatedAt = now;
  appendEvent(nextState, { type: 'session-start', at: now }, now);
  return nextState;
}

function syncPrimaryCareNeed(state, presentation, { now = Date.now() } = {}) {
  const nextState = cloneState(state, now);
  const nextNeedKey = getNeedKeyFromPresentation(presentation);
  const activeNeed = nextState.activeNeed;
  const activeNeedKey = getNeedKeyFromState(nextState);

  if (activeNeedKey === nextNeedKey) {
    return nextState;
  }

  if (activeNeed) {
    const responded = Number.isFinite(activeNeed.firstRespondedAt);
    if (!responded) {
      nextState.summary.ignoredPromptCount += 1;
    }

    appendEvent(
      nextState,
      {
        type: 'need-ended',
        at: now,
        action: activeNeed.action,
        severity: activeNeed.severity,
        responded,
        latencyMs: responded ? activeNeed.firstRespondedAt - activeNeed.startedAt : null,
        prompt: activeNeed.prompt,
      },
      now,
    );

    nextState.activeNeed = null;
  }

  if (nextNeedKey) {
    const action = normalizeAction(presentation.action);
    const severity = normalizeSeverity(presentation.severity);
    if (action && severity) {
      nextState.summary.totalPromptCount += 1;
      nextState.summary.promptCounts[action][severity] += 1;
      nextState.activeNeed = {
        action,
        severity,
        prompt: typeof presentation.prompt === 'string' ? presentation.prompt : '',
        startedAt: now,
        firstRespondedAt: null,
      };
      appendEvent(
        nextState,
        {
          type: 'need-started',
          at: now,
          action,
          severity,
          prompt: nextState.activeNeed.prompt,
        },
        now,
      );
    }
  }

  nextState.summary.lastUpdatedAt = now;
  return nextState;
}

function recordTrayMenuOpen(state, { now = Date.now() } = {}) {
  const nextState = cloneState(state, now);
  nextState.summary.trayOpenCount += 1;
  if (nextState.activeNeed) {
    nextState.summary.trayOpenWhileNeedActiveCount += 1;
  }

  appendEvent(
    nextState,
    {
      type: 'tray-opened',
      at: now,
      action: nextState.activeNeed?.action ?? null,
      severity: nextState.activeNeed?.severity ?? null,
    },
    now,
  );
  nextState.summary.lastUpdatedAt = now;
  return nextState;
}

function recordCareAction(state, { action, source = 'unknown', now = Date.now() } = {}) {
  const nextState = cloneState(state, now);
  const safeAction = normalizeAction(action);
  const safeSource = normalizeSource(source);

  if (!safeAction) {
    return nextState;
  }

  nextState.summary.careActionCounts[safeAction] += 1;
  nextState.summary.careActionSourceCounts[safeSource] += 1;

  let matchedNeed = false;
  let latencyMs = null;

  if (nextState.activeNeed) {
    matchedNeed = nextState.activeNeed.action === safeAction;

    if (matchedNeed && nextState.activeNeed.firstRespondedAt == null) {
      nextState.activeNeed.firstRespondedAt = now;
      nextState.summary.promptResponseCount += 1;
      latencyMs = now - nextState.activeNeed.startedAt;
      addLatency(nextState.summary.firstResponseLatency, latencyMs);
      addLatency(nextState.summary.firstResponseLatencyByAction[safeAction], latencyMs);
    } else if (!matchedNeed) {
      nextState.summary.offTargetCareActionCount += 1;
    }
  } else {
    nextState.summary.unpromptedCareActionCount += 1;
  }

  appendEvent(
    nextState,
    {
      type: 'care-action',
      at: now,
      action: safeAction,
      source: safeSource,
      matchedNeed,
      latencyMs,
    },
    now,
  );
  nextState.summary.lastUpdatedAt = now;
  return nextState;
}


function recordPresenceModeChange(state, { previousMode = null, mode, durationMs = 0, now = Date.now() } = {}) {
  const nextState = cloneState(state, now);
  const safeMode = normalizePresenceMode(mode);
  const safePreviousMode = previousMode == null ? null : normalizePresenceMode(previousMode);

  nextState.summary.presenceModeSwitchCount += 1;
  if (safePreviousMode) {
    nextState.summary.presenceModeDurationsMs[safePreviousMode] += Math.max(0, toFiniteNumber(durationMs, 0));
  }

  appendEvent(nextState, {
    type: 'presence-mode-changed',
    at: now,
    previousMode: safePreviousMode,
    mode: safeMode,
  }, now);
  nextState.summary.lastUpdatedAt = now;
  return nextState;
}

function recordPresenceOverrideChange(state, { override, now = Date.now() } = {}) {
  const nextState = cloneState(state, now);
  const safeOverride = normalizePresenceOverride(override);
  nextState.summary.presenceOverrideCounts[safeOverride] += 1;
  appendEvent(nextState, {
    type: 'presence-override-changed',
    at: now,
    override: safeOverride,
  }, now);
  nextState.summary.lastUpdatedAt = now;
  return nextState;
}

function recordPresenceThresholdChange(state, { thresholdSeconds, now = Date.now() } = {}) {
  const nextState = cloneState(state, now);
  const safeThreshold = Math.max(0, Math.floor(toFiniteNumber(thresholdSeconds, 0)));
  nextState.summary.presenceThresholdChangeCount += 1;
  appendEvent(nextState, {
    type: 'presence-idle-threshold-changed',
    at: now,
    thresholdSeconds: safeThreshold,
  }, now);
  nextState.summary.lastUpdatedAt = now;
  return nextState;
}

function formatDateTime(timestamp) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return '-';
  return new Date(timestamp).toISOString();
}

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '-';

  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) {
    return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
}

function toPercent(part, total) {
  if (!total) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}

function getActionLabel(action) {
  if (action === 'feed') return '喂食';
  if (action === 'water') return '加水';
  if (action === 'pet') return '陪玩';
  return '未知动作';
}

function getSeverityLabel(severity) {
  if (severity === 'urgent') return '紧急';
  if (severity === 'gentle') return '轻提醒';
  return '未知等级';
}

function getSourceLabel(source) {
  if (source === 'tray') return '菜单栏';
  if (source === 'ipc') return '渲染层';
  if (source === 'automation') return '自动化';
  return '未知来源';
}

function describeEvent(event) {
  const at = formatDateTime(event.at);

  if (event.type === 'session-start') {
    return `- ${at} · 应用启动，开始记录本地验证数据`;
  }

  if (event.type === 'need-started') {
    return `- ${at} · 出现需求提示：${getActionLabel(event.action)} / ${getSeverityLabel(event.severity)}${event.prompt ? ` / ${event.prompt}` : ''}`;
  }

  if (event.type === 'need-ended') {
    const outcome = event.responded ? '已响应' : '未响应';
    const latency = event.responded && event.latencyMs != null ? ` / 首次响应耗时 ${formatDuration(event.latencyMs)}` : '';
    return `- ${at} · 需求提示结束：${getActionLabel(event.action)} / ${getSeverityLabel(event.severity)} / ${outcome}${latency}`;
  }

  if (event.type === 'tray-opened') {
    const activeNeed = event.action ? ` / 当前需求 ${getActionLabel(event.action)} / ${getSeverityLabel(event.severity)}` : '';
    return `- ${at} · 打开菜单栏${activeNeed}`;
  }

  if (event.type === 'presence-mode-changed') {
    const previous = event.previousMode ? `${event.previousMode} -> ` : '';
    return `- ${at} · 存在模式切换：${previous}${event.mode}`;
  }

  if (event.type === 'presence-override-changed') {
    return `- ${at} · 存在模式手动控制：${event.override}`;
  }

  if (event.type === 'presence-idle-threshold-changed') {
    return `- ${at} · 闲置阈值更新：${event.thresholdSeconds}s`;
  }

  if (event.type === 'care-action') {
    const matchedNeed = event.matchedNeed ? '命中当前需求' : '未命中当前需求';
    const latency = event.latencyMs != null ? ` / 首次响应耗时 ${formatDuration(event.latencyMs)}` : '';
    return `- ${at} · 执行照料：${getActionLabel(event.action)} / 来源 ${getSourceLabel(event.source)} / ${matchedNeed}${latency}`;
  }

  return `- ${at} · 未分类事件`;
}

function toValidationSnapshot(state, { generatedAt = Date.now() } = {}) {
  const normalized = normalizeValidationState(state, generatedAt);
  return {
    schemaVersion: VALIDATION_SCHEMA_VERSION,
    generatedAt,
    summary: normalized.summary,
    activeNeed: normalized.activeNeed,
    recentEvents: normalized.recentEvents,
  };
}

function createValidationArtifacts(state, { generatedAt = Date.now() } = {}) {
  const snapshot = toValidationSnapshot(state, { generatedAt });
  const { summary, activeNeed, recentEvents } = snapshot;

  const markdown = [
    '# Pawkit Validation Summary',
    '',
    `- Generated at: ${formatDateTime(generatedAt)}`,
    `- First seen at: ${formatDateTime(summary.firstSeenAt)}`,
    `- Sessions: ${summary.sessionCount}`,
    `- Total prompts: ${summary.totalPromptCount}`,
    `- First-response rate: ${toPercent(summary.promptResponseCount, summary.totalPromptCount)} (${summary.promptResponseCount}/${summary.totalPromptCount})`,
    `- Ignored prompts: ${summary.ignoredPromptCount}`,
    `- Avg first response latency: ${formatDuration(summary.firstResponseLatency.averageMs)}`,
    `- Tray opens: ${summary.trayOpenCount}`,
    `- Tray opens while need active: ${summary.trayOpenWhileNeedActiveCount}`,
    `- Unprompted care actions: ${summary.unpromptedCareActionCount}`,
    `- Off-target care actions: ${summary.offTargetCareActionCount}`,
    `- Current active need: ${activeNeed ? `${getActionLabel(activeNeed.action)} / ${getSeverityLabel(activeNeed.severity)}` : 'none'}`,
    `- Presence mode switches: ${summary.presenceModeSwitchCount}`,
    `- Presence durations: work ${formatDuration(summary.presenceModeDurationsMs.work)} / idle ${formatDuration(summary.presenceModeDurationsMs.idle)}`,
    `- Presence threshold changes: ${summary.presenceThresholdChangeCount}`,
    '',
    '## Prompt counts',
    '',
    `- 喂食：轻提醒 ${summary.promptCounts.feed.gentle} / 紧急 ${summary.promptCounts.feed.urgent}`,
    `- 加水：轻提醒 ${summary.promptCounts.water.gentle} / 紧急 ${summary.promptCounts.water.urgent}`,
    `- 陪玩：轻提醒 ${summary.promptCounts.pet.gentle} / 紧急 ${summary.promptCounts.pet.urgent}`,
    '',
    '## Care actions',
    '',
    `- 喂食：${summary.careActionCounts.feed}`,
    `- 加水：${summary.careActionCounts.water}`,
    `- 陪玩：${summary.careActionCounts.pet}`,
    `- 菜单栏触发：${summary.careActionSourceCounts.tray}`,
    `- 渲染层触发：${summary.careActionSourceCounts.ipc}`,
    `- 自动化触发：${summary.careActionSourceCounts.automation}`,
    '',
    '## Avg first response latency by action',
    '',
    `- 喂食：${formatDuration(summary.firstResponseLatencyByAction.feed.averageMs)}`,
    `- 加水：${formatDuration(summary.firstResponseLatencyByAction.water.averageMs)}`,
    `- 陪玩：${formatDuration(summary.firstResponseLatencyByAction.pet.averageMs)}`,
    '',
    '## Recent events',
    '',
    ...(recentEvents.length > 0 ? recentEvents.map(describeEvent) : ['- 暂无事件']),
    '',
  ].join('\n');

  return {
    json: JSON.stringify(snapshot, null, 2),
    markdown,
  };
}

module.exports = {
  VALIDATION_SCHEMA_VERSION,
  createEmptyValidationState,
  normalizeValidationState,
  getNeedKeyFromPresentation,
  getNeedKeyFromState,
  recordValidationSessionStart,
  syncPrimaryCareNeed,
  recordTrayMenuOpen,
  recordCareAction,
  recordPresenceModeChange,
  recordPresenceOverrideChange,
  recordPresenceThresholdChange,
  createValidationArtifacts,
};
