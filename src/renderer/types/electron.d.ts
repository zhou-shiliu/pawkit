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


export interface PetPlacementPayload {
  displayId: string | number | null;
  anchor: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  scaleFactor: number;
}

export interface PetDragPointPayload {
  screenX: number;
  screenY: number;
}


export interface PetPackagePayload {
  ok: boolean;
  errors: string[];
  source: string;
  packageDir: string;
  active: boolean;
  manifest: PetManifestPayload | null;
  spritePath: string | null;
}

export interface PetImportResultPayload {
  ok: boolean;
  cancelled?: boolean;
  errors: string[];
  imported: {
    packageDir: string;
    manifest: PetManifestPayload | null;
  } | null;
  active: PetStatePayload;
}

export interface PetActivationResultPayload {
  ok: boolean;
  errors: string[];
  active: PetStatePayload;
}

export interface PetStatePayload {
  ok: boolean;
  errors: string[];
  warnings?: string[];
  source?: string | null;
  packageDir: string | null;
  manifest: PetManifestPayload | null;
  spriteUrl: string | null;
  placement?: PetPlacementPayload;
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
  listPets: () => Promise<PetPackagePayload[]>;
  setActivePet: (packageDir: string) => Promise<PetActivationResultPayload>;
  importPet: (sourcePath?: string) => Promise<PetImportResultPayload>;
  choosePetImportSource: (sourceType: 'zip' | 'directory') => Promise<PetImportResultPayload>;
  closePetImportPanel: () => Promise<PetStatePayload>;
  resetPetPlacement: () => Promise<PetPlacementPayload>;
  showPet: () => Promise<PetStatePayload>;
  hidePet: () => Promise<PetStatePayload>;
  sendPetEvent: (eventName: string) => Promise<PetStatePayload>;
  startPetDrag: (point: PetDragPointPayload) => Promise<PetPlacementPayload>;
  movePetDrag: (point: PetDragPointPayload) => Promise<PetPlacementPayload>;
  endPetDrag: (point: PetDragPointPayload) => Promise<PetPlacementPayload>;
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
