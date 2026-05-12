export interface SoundVolumes {
  master: number;
  ambient: number;
  meow: number;
  event: number;
  voice: number;
}

export interface CatStatePayload {
  name: string;
  hunger: number;
  hydration: number;
  happiness: number;
  trustLevel: number;
  lastFed: number | null;
  lastWatered: number | null;
  lastPet: number | null;
}


export type PresenceMode = 'work' | 'idle';
export type PresenceOverride = 'auto' | 'work' | 'idle';
export type PresenceIdleState = 'active' | 'idle' | 'locked' | 'unknown';

export interface PresenceStatePayload {
  mode: PresenceMode;
  idleThresholdSeconds: number;
  systemIdleSeconds: number;
  idleState: PresenceIdleState;
  manualOverride: PresenceOverride;
  lastModeChangedAt: number;
  lastUpdatedAt: number;
  dock?: RoamingStatePayload;
}

export interface RoamingStatePayload {
  x: number;
  y: number;
  facing: 'left' | 'right';
  locomotion: 'idle' | 'walk';
  phase: 'spawn' | 'move' | 'pause' | 'turn';
  lastUpdatedAt: number;
}

export interface PetAnimationPayload {
  row: number;
  frames: number;
  fps: number;
  loop: boolean;
  durationsMs?: number[];
}

export interface PetManifestPayload {
  id: string;
  name: string;
  description: string;
  version: string;
  sprite: {
    src: string;
    frameWidth: number;
    frameHeight: number;
  };
  animations: Record<string, PetAnimationPayload>;
}

export interface PetStatePayload {
  ok: boolean;
  errors: string[];
  warnings?: string[];
  source?: string | null;
  packageDir: string | null;
  manifest: PetManifestPayload | null;
  spriteUrl: string | null;
  behavior: {
    semanticState: string;
    lastStableState: string;
    lastEvent: string;
    oneShot: boolean;
    updatedAt: number;
  };
  animationName: string | null;
  animation: PetAnimationPayload | null;
}

interface ElectronAPI {
  getCatState: () => Promise<CatStatePayload>;
  getRoamingState: () => Promise<RoamingStatePayload>;
  getPresenceState: () => Promise<PresenceStatePayload>;
  getActivePet: () => Promise<PetStatePayload>;
  sendPetEvent: (eventName: string) => Promise<PetStatePayload>;
  feedCat: () => Promise<{ hunger: number; lastFed: number | null }>;
  waterCat: () => Promise<{ hydration: number; lastWatered: number | null }>;
  petCat: () => Promise<{ happiness: number; trustLevel: number; lastPet: number | null }>;
  setPresenceIdleThreshold: (seconds: number) => Promise<PresenceStatePayload>;
  setPresenceOverride: (override: PresenceOverride) => Promise<PresenceStatePayload>;
  onCatStateUpdated: (
    callback: (state: CatStatePayload & { lastUpdatedAt?: number }) => void,
  ) => void | (() => void);
  onRoamingStateUpdated: (
    callback: (state: RoamingStatePayload) => void,
  ) => void | (() => void);
  onPresenceStateUpdated: (
    callback: (state: PresenceStatePayload) => void,
  ) => void | (() => void);
  onPetStateUpdated: (
    callback: (state: PetStatePayload) => void,
  ) => void | (() => void);
  onFeedCat: (callback: () => void) => void | (() => void);
  onWaterCat: (callback: () => void) => void | (() => void);
  onPetCat: (callback: () => void) => void | (() => void);
  hideWindow: () => void;
  playSound: (payload: Record<string, unknown>) => Promise<{ ok: boolean }>;
  getSoundSettings: () => Promise<{ volumes: SoundVolumes }>;
  setSoundVolume: (volumes: Partial<SoundVolumes>) => Promise<SoundVolumes>;
  onPlaySound: (callback: (payload: Record<string, unknown>) => void) => void | (() => void);
  onSoundVolumeUpdated: (callback: (volumes: SoundVolumes) => void) => void | (() => void);
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
