const PET_STATUS_MESSAGE: Record<string, string> = {
  idle: '我在这里',
  working: '陪你一起做事',
  attention: '嗯？我在听',
  success: '做得漂亮！',
  failed: '没关系，再试一次',
  sleepy: '我先眯一会儿',
  movingLeft: '向左走走',
  movingRight: '向右走走',
};

const QUIET_STATES = new Set(['idle']);

const MESSAGE_DURATION_MS: Record<string, number> = {
  working: 2200,
  attention: 1800,
  success: 1800,
  failed: 2400,
  sleepy: 2200,
  movingLeft: 900,
  movingRight: 900,
};

export function getPetStatusMessage(semanticState?: string | null) {
  const state = String(semanticState ?? 'idle');
  return PET_STATUS_MESSAGE[state] ?? PET_STATUS_MESSAGE.idle;
}

export function shouldShowPetStatusBubble(semanticState?: string | null) {
  const state = String(semanticState ?? 'idle');
  return !QUIET_STATES.has(state);
}

export function getPetStatusMessageDuration(semanticState?: string | null) {
  const state = String(semanticState ?? 'idle');
  return MESSAGE_DURATION_MS[state] ?? 1800;
}
