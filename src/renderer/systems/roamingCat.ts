export const CAT_FACING = {
  LEFT: 'left',
  RIGHT: 'right',
} as const;

export const CAT_LOCOMOTION = {
  IDLE: 'idle',
  WALK: 'walk',
} as const;

export const ROAMING_PHASE = {
  SPAWN: 'spawn',
  MOVE: 'move',
  PAUSE: 'pause',
  TURN: 'turn',
} as const;

export type CatFacing = (typeof CAT_FACING)[keyof typeof CAT_FACING];
export type CatLocomotion = (typeof CAT_LOCOMOTION)[keyof typeof CAT_LOCOMOTION];
export type RoamingPhase = (typeof ROAMING_PHASE)[keyof typeof ROAMING_PHASE];

export interface RoamingState {
  x: number;
  y: number;
  facing: CatFacing;
  locomotion: CatLocomotion;
  phase: RoamingPhase;
  lastUpdatedAt: number;
}

export const INITIAL_ROAMING_STATE: RoamingState = {
  x: 0,
  y: 0,
  facing: CAT_FACING.RIGHT,
  locomotion: CAT_LOCOMOTION.IDLE,
  phase: ROAMING_PHASE.SPAWN,
  lastUpdatedAt: 0,
};

function toSafeNumber(value: unknown, fallback: number) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function normalizeRoamingState(
  input?: Partial<RoamingState> | null,
  fallback: RoamingState = INITIAL_ROAMING_STATE,
): RoamingState {
  return {
    x: toSafeNumber(input?.x, fallback.x),
    y: toSafeNumber(input?.y, fallback.y),
    facing: input?.facing === CAT_FACING.LEFT ? CAT_FACING.LEFT : CAT_FACING.RIGHT,
    locomotion:
      input?.locomotion === CAT_LOCOMOTION.WALK ? CAT_LOCOMOTION.WALK : CAT_LOCOMOTION.IDLE,
    phase:
      input?.phase === ROAMING_PHASE.MOVE ||
      input?.phase === ROAMING_PHASE.PAUSE ||
      input?.phase === ROAMING_PHASE.TURN
        ? input.phase
        : ROAMING_PHASE.SPAWN,
    lastUpdatedAt: toSafeNumber(input?.lastUpdatedAt, fallback.lastUpdatedAt),
  };
}
