import { useEffect, useState } from 'react';
import {
  CAT_FACING,
  CAT_LOCOMOTION,
  INITIAL_ROAMING_STATE,
  ROAMING_PHASE,
  normalizeRoamingState,
} from '../systems/roamingCat';

const WEB_PREVIEW_SCRIPT = [
  { phase: ROAMING_PHASE.SPAWN, locomotion: CAT_LOCOMOTION.IDLE, facing: CAT_FACING.RIGHT, x: 0, durationMs: 700 },
  { phase: ROAMING_PHASE.PAUSE, locomotion: CAT_LOCOMOTION.IDLE, facing: CAT_FACING.RIGHT, x: 18, durationMs: 900 },
  { phase: ROAMING_PHASE.TURN, locomotion: CAT_LOCOMOTION.IDLE, facing: CAT_FACING.LEFT, x: 20, durationMs: 280 },
  { phase: ROAMING_PHASE.MOVE, locomotion: CAT_LOCOMOTION.WALK, facing: CAT_FACING.LEFT, x: -24, durationMs: 1400 },
  { phase: ROAMING_PHASE.PAUSE, locomotion: CAT_LOCOMOTION.IDLE, facing: CAT_FACING.LEFT, x: -24, durationMs: 900 },
  { phase: ROAMING_PHASE.TURN, locomotion: CAT_LOCOMOTION.IDLE, facing: CAT_FACING.RIGHT, x: -12, durationMs: 280 },
  { phase: ROAMING_PHASE.MOVE, locomotion: CAT_LOCOMOTION.WALK, facing: CAT_FACING.RIGHT, x: 24, durationMs: 1400 },
] as const;

export function useRoamingCatState() {
  const [roamingState, setRoamingState] = useState(INITIAL_ROAMING_STATE);
  const electronAPI = window.electronAPI;

  useEffect(() => {
    if (!electronAPI?.getRoamingState) {
      let active = true;
      let scriptIndex = 0;
      let phaseEndsAt = 0;

      const applyScriptStep = (index: number) => {
        const now = Date.now();
        const step = WEB_PREVIEW_SCRIPT[index];
        phaseEndsAt = now + step.durationMs;

        setRoamingState((prev) =>
          normalizeRoamingState(
            {
              ...prev,
              phase: step.phase,
              locomotion: step.locomotion,
              facing: step.facing,
              x: step.x,
              y: 0,
              lastUpdatedAt: now,
            },
            prev,
          ),
        );
      };

      applyScriptStep(scriptIndex);

      const timerId = window.setInterval(() => {
        if (!active || Date.now() < phaseEndsAt) return;

        scriptIndex = (scriptIndex + 1) % WEB_PREVIEW_SCRIPT.length;
        applyScriptStep(scriptIndex);
      }, 120);

      return () => {
        active = false;
        window.clearInterval(timerId);
      };
    }

    let active = true;

    const loadInitialState = async () => {
      if (!electronAPI?.getRoamingState) return;

      try {
        const nextState = await electronAPI.getRoamingState();
        if (!active) return;
        setRoamingState((prev) => normalizeRoamingState(nextState, prev));
      } catch (error) {
        console.warn('Could not load roaming state:', error);
      }
    };

    void loadInitialState();

    const maybeCleanup = electronAPI?.onRoamingStateUpdated?.((nextState) => {
      if (!active) return;
      setRoamingState((prev) => normalizeRoamingState(nextState, prev));
    });

    return () => {
      active = false;
      if (typeof maybeCleanup === 'function') {
        maybeCleanup();
      }
    };
  }, [electronAPI]);

  return roamingState;
}
