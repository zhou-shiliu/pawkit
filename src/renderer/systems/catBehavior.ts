export const ANIM_STATE = {
  IDLE: 'idle',
  EATING: 'eating',
  PETTING: 'petting',
  SLEEPING: 'sleeping',
} as const;

export type AnimState = (typeof ANIM_STATE)[keyof typeof ANIM_STATE];

export interface CatState {
  name: string;
  hunger: number;
  hydration: number;
  happiness: number;
  trustLevel: number;
  animState: AnimState;
  lastFed: number | null;
  lastWatered: number | null;
  lastPet: number | null;
}

export const INITIAL_CAT_STATE: CatState = {
  name: 'Whiskers',
  hunger: 50,
  hydration: 62,
  happiness: 50,
  trustLevel: 1,
  animState: ANIM_STATE.IDLE,
  lastFed: null,
  lastWatered: null,
  lastPet: null,
};

export function getMoodText(state: Pick<CatState, 'name' | 'hunger' | 'hydration' | 'happiness' | 'trustLevel'>): string {
  const { hunger, hydration, happiness, trustLevel } = state;
  if (hunger < 28) return '有点饿了';
  if (hydration < 28) return '想喝点水';
  if (happiness < 28) return '想有人陪它玩';
  if (trustLevel >= 4 && happiness > 68) return '现在很放松';
  if (trustLevel >= 3) return '开始熟悉这里了';
  if (trustLevel < 2) return '还在观察周围';
  return '正在巡逻地盘';
}

export function getCarePrompt(
  state: Pick<CatState, 'hunger' | 'hydration' | 'happiness'>,
): string | null {
  if (state.hunger < 20) return '肚子有点空了';
  if (state.hunger < 35) return '想吃点东西';
  if (state.hydration < 20) return '有点口渴了';
  if (state.hydration < 35) return '想喝点水';
  if (state.happiness < 20) return '有点无聊，想找你玩';
  if (state.happiness < 35) return '想玩一会';

  return null;
}

export function getStatusTags(
  state: Pick<CatState, 'hunger' | 'hydration' | 'happiness' | 'trustLevel'>,
): string[] {
  const tags: string[] = [];

  if (state.hunger < 35) tags.push('想吃东西');
  if (state.hydration < 35) tags.push('想喝水');
  if (state.happiness < 35) tags.push('想玩一会');

  return tags.slice(0, 2);
}

export function getTrustTint(trustLevel: number): string {
  if (trustLevel >= 5) return 'var(--trust-5)';
  if (trustLevel >= 3) return 'var(--trust-3)';
  return 'var(--trust-1)';
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}
