import { useCallback, useEffect, useState } from 'react';
import type { PetStatePayload } from '../types/electron';

export function usePetRuntime() {
  const [petState, setPetState] = useState<PetStatePayload | null>(null);
  const [loading, setLoading] = useState(Boolean(window.electronAPI?.getActivePet));

  useEffect(() => {
    let disposed = false;

    if (!window.electronAPI?.getActivePet) {
      setLoading(false);
      return undefined;
    }

    window.electronAPI
      .getActivePet()
      .then((state) => {
        if (!disposed) setPetState(state);
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });

    const unsubscribe = window.electronAPI.onPetStateUpdated?.((state) => {
      setPetState(state);
    });

    return () => {
      disposed = true;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const sendPetEvent = useCallback(async (eventName: string) => {
    if (!window.electronAPI?.sendPetEvent) return null;
    const nextState = await window.electronAPI.sendPetEvent(eventName);
    setPetState(nextState);
    return nextState;
  }, []);

  return {
    loading,
    petState,
    sendPetEvent,
  };
}
