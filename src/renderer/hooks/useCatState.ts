import { useCallback, useEffect, useMemo, useState } from 'react';
import { ANIM_STATE, INITIAL_CAT_STATE, type CatState } from '../systems/catBehavior';

const ACTION_ANIMATION_DURATION_MS = 1500;

function toSafeNumber(value: unknown, fallback: number) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function useCatState() {
  const [catState, setCatState] = useState<CatState>(INITIAL_CAT_STATE);
  const electronAPI = useMemo(() => window.electronAPI, []);
  const applyIncomingState = useCallback((state: Partial<CatState>) => {
    setCatState((prev) => ({
      ...prev,
      name: state.name ?? prev.name,
      hunger: toSafeNumber(state.hunger, prev.hunger),
      hydration: toSafeNumber(state.hydration, prev.hydration),
      happiness: toSafeNumber(state.happiness, prev.happiness),
      trustLevel: toSafeNumber(state.trustLevel, prev.trustLevel),
      lastFed: state.lastFed ?? prev.lastFed,
      lastWatered: state.lastWatered ?? prev.lastWatered,
      lastPet: state.lastPet ?? prev.lastPet,
    }));
  }, []);

  const loadState = useCallback(async () => {
    if (!electronAPI?.getCatState) return;

    try {
      const state = await electronAPI.getCatState();
      applyIncomingState(state);
    } catch (error) {
      console.warn('Could not load cat state:', error);
    }
  }, [applyIncomingState, electronAPI]);

  const feed = useCallback(async () => {
    if (!electronAPI?.feedCat) return catState;

    try {
      const result = await electronAPI.feedCat();
      let nextState: CatState = catState;

      setCatState((prev) => {
        nextState = {
          ...prev,
          hunger: toSafeNumber(result.hunger, prev.hunger),
          lastFed: result.lastFed ?? prev.lastFed,
          animState: ANIM_STATE.EATING,
        };
        return nextState;
      });

      return nextState;
    } catch (error) {
      console.error('Feed error:', error);
      return catState;
    }
  }, [catState, electronAPI]);

  const water = useCallback(async () => {
    if (!electronAPI?.waterCat) return catState;

    try {
      const result = await electronAPI.waterCat();
      let nextState: CatState = catState;

      setCatState((prev) => {
        nextState = {
          ...prev,
          hydration: toSafeNumber(result.hydration, prev.hydration),
          lastWatered: result.lastWatered ?? prev.lastWatered,
          animState: ANIM_STATE.EATING,
        };
        return nextState;
      });

      return nextState;
    } catch (error) {
      console.error('Water error:', error);
      return catState;
    }
  }, [catState, electronAPI]);

  const pet = useCallback(async () => {
    if (!electronAPI?.petCat) return catState;

    try {
      const result = await electronAPI.petCat();
      let nextState: CatState = catState;

      setCatState((prev) => {
        nextState = {
          ...prev,
          happiness: toSafeNumber(result.happiness, prev.happiness),
          trustLevel: toSafeNumber(result.trustLevel, prev.trustLevel),
          lastPet: result.lastPet ?? prev.lastPet,
          animState: ANIM_STATE.PETTING,
        };
        return nextState;
      });

      return nextState;
    } catch (error) {
      console.error('Pet error:', error);
      return catState;
    }
  }, [catState, electronAPI]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  useEffect(() => {
    if (catState.animState === ANIM_STATE.IDLE) return undefined;

    const timeout = window.setTimeout(() => {
      setCatState((prev) => {
        if (prev.animState === ANIM_STATE.IDLE) return prev;
        return {
          ...prev,
          animState: ANIM_STATE.IDLE,
        };
      });
    }, ACTION_ANIMATION_DURATION_MS);

    return () => window.clearTimeout(timeout);
  }, [catState.animState]);

  useEffect(() => {
    if (!electronAPI) return undefined;

    const cleanupFns: Array<() => void> = [];

    const maybeCleanupCatState = electronAPI.onCatStateUpdated?.((state) => {
      applyIncomingState(state);
    });

    const maybeCleanupFeed = electronAPI.onFeedCat?.(() => {
      void feed();
    });
    const maybeCleanupWater = electronAPI.onWaterCat?.(() => {
      void water();
    });
    const maybeCleanupPet = electronAPI.onPetCat?.(() => {
      void pet();
    });

    if (typeof maybeCleanupCatState === 'function') cleanupFns.push(maybeCleanupCatState);
    if (typeof maybeCleanupFeed === 'function') cleanupFns.push(maybeCleanupFeed);
    if (typeof maybeCleanupWater === 'function') cleanupFns.push(maybeCleanupWater);
    if (typeof maybeCleanupPet === 'function') cleanupFns.push(maybeCleanupPet);

    return () => {
      for (const cleanup of cleanupFns) cleanup();
    };
  }, [applyIncomingState, electronAPI, feed, pet, water]);

  return {
    catState,
    feed,
    water,
    pet,
  };
}
