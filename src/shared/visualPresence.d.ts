export type VisualPresenceMode = 'work' | 'idle';
export type VisualRoamingPhase = 'spawn' | 'move' | 'pause' | 'turn';
export type VisualState =
  | 'settle'
  | 'look-left'
  | 'look-right'
  | 'blink'
  | 'small-shift'
  | 'groom'
  | 'stretch'
  | 'walk-a'
  | 'walk-b'
  | 'turn-reset';
export type CatPose =
  | 'sit'
  | 'look-left'
  | 'look-right'
  | 'groom'
  | 'stretch'
  | 'walk-a'
  | 'walk-b'
  | 'turn-reset';

export interface VisualPresenceContext {
  presenceMode?: VisualPresenceMode;
  roamingPhase?: VisualRoamingPhase;
}

export interface VisualPresenceState {
  presenceMode: VisualPresenceMode;
  roamingPhase: VisualRoamingPhase;
  visualState: VisualState;
  catPose: CatPose;
  sequenceIndex: number;
  enteredAt: number;
  nextChangeAt: number;
  dwellMs: number;
}

export const VISUAL_DWELL_MS: Record<'work' | 'idlePause' | 'idleMove' | 'idleTurn', number>;
export const VISUAL_POSE: Record<string, CatPose>;
export const VISUAL_PRESENCE_MODE: Record<'WORK' | 'IDLE', VisualPresenceMode>;
export const VISUAL_ROAMING_PHASE: Record<'SPAWN' | 'MOVE' | 'PAUSE' | 'TURN', VisualRoamingPhase>;
export const VISUAL_SEQUENCE: Record<'work' | 'idlePause' | 'idleMove' | 'idleTurn', readonly VisualState[]>;
export const VISUAL_STATE: Record<string, VisualState>;

export function advanceVisualPresenceState(
  state?: Partial<VisualPresenceState>,
  context?: VisualPresenceContext,
  options?: { now?: number; disableRandomness?: boolean; seed?: number },
): VisualPresenceState;
export function createVisualPresenceState(
  context?: VisualPresenceContext,
  options?: { now?: number; sequenceIndex?: number; visualState?: VisualState },
): VisualPresenceState;
export function getAllowedVisualStates(context?: VisualPresenceContext): VisualState[];
export function getCatPoseForVisualState(visualState: VisualState): CatPose;
export function getVisualDwellMs(context?: VisualPresenceContext): number;
export function normalizePresenceMode(value: unknown): VisualPresenceMode;
export function normalizeRoamingPhase(value: unknown): VisualRoamingPhase;
export function normalizeVisualPresenceState(
  state?: Partial<VisualPresenceState>,
  context?: VisualPresenceContext,
  options?: { now?: number },
): VisualPresenceState;
export function normalizeVisualState(value: unknown, context?: VisualPresenceContext): VisualState;
export function resolveVisualBucket(context?: VisualPresenceContext): 'work' | 'idlePause' | 'idleMove' | 'idleTurn';
