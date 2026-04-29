import { useEffect, useState } from 'react';
import type { PresenceStatePayload } from '../types/electron';

export const DEFAULT_PRESENCE_STATE: PresenceStatePayload = {
  mode: 'work',
  idleThresholdSeconds: 600,
  systemIdleSeconds: 0,
  idleState: 'active',
  manualOverride: 'auto',
  lastModeChangedAt: Date.now(),
  lastUpdatedAt: Date.now(),
};

function toSafeNumber(value: unknown, fallback: number) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizePresenceState(
  state: Partial<PresenceStatePayload> | null | undefined,
  fallback: PresenceStatePayload,
): PresenceStatePayload {
  const mode = state?.mode === 'idle' ? 'idle' : 'work';
  const manualOverride =
    state?.manualOverride === 'work' || state?.manualOverride === 'idle' ? state.manualOverride : 'auto';
  const idleState =
    state?.idleState === 'idle' || state?.idleState === 'locked' || state?.idleState === 'unknown'
      ? state.idleState
      : 'active';

  return {
    ...fallback,
    ...state,
    mode,
    manualOverride,
    idleState,
    idleThresholdSeconds: toSafeNumber(state?.idleThresholdSeconds, fallback.idleThresholdSeconds),
    systemIdleSeconds: toSafeNumber(state?.systemIdleSeconds, fallback.systemIdleSeconds),
    lastModeChangedAt: toSafeNumber(state?.lastModeChangedAt, fallback.lastModeChangedAt),
    lastUpdatedAt: toSafeNumber(state?.lastUpdatedAt, fallback.lastUpdatedAt),
  };
}

export function usePresenceState() {
  const [presenceState, setPresenceState] = useState(DEFAULT_PRESENCE_STATE);
  const electronAPI = window.electronAPI;

  useEffect(() => {
    if (!electronAPI?.getPresenceState) return undefined;

    let active = true;

    const loadInitialState = async () => {
      try {
        const nextState = await electronAPI.getPresenceState();
        if (!active) return;
        setPresenceState((prev) => normalizePresenceState(nextState, prev));
      } catch (error) {
        console.warn('Could not load presence state:', error);
      }
    };

    void loadInitialState();

    const maybeCleanup = electronAPI.onPresenceStateUpdated?.((nextState) => {
      if (!active) return;
      setPresenceState((prev) => normalizePresenceState(nextState, prev));
    });

    return () => {
      active = false;
      if (typeof maybeCleanup === 'function') {
        maybeCleanup();
      }
    };
  }, [electronAPI]);

  return presenceState;
}
