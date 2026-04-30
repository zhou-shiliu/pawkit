import { useEffect, useMemo, useState } from 'react';
import {
  advanceVisualPresenceState,
  createVisualPresenceState,
  type VisualPresenceState,
} from '../../shared/visualPresence';
import type { PresenceStatePayload, RoamingStatePayload } from '../types/electron';

interface UseVisualPresenceStateInput {
  presenceMode: PresenceStatePayload['mode'];
  roamingPhase: RoamingStatePayload['phase'];
}

const VISUAL_TICK_MS = 160;

export function useVisualPresenceState({
  presenceMode,
  roamingPhase,
}: UseVisualPresenceStateInput): VisualPresenceState {
  const context = useMemo(
    () => ({
      presenceMode,
      roamingPhase,
    }),
    [presenceMode, roamingPhase],
  );

  const [visualState, setVisualState] = useState<VisualPresenceState>(() =>
    createVisualPresenceState(context, { now: Date.now() }),
  );

  useEffect(() => {
    setVisualState((previous) => advanceVisualPresenceState(previous, context, { now: Date.now() }));
  }, [context]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setVisualState((previous) => advanceVisualPresenceState(previous, context, { now: Date.now() }));
    }, VISUAL_TICK_MS);

    return () => {
      window.clearInterval(timerId);
    };
  }, [context]);

  return visualState;
}
