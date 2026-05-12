import { useCallback, useRef, type PointerEvent } from 'react';
import { SpriteAnimator } from './SpriteAnimator';
import { usePetRuntime } from './usePetRuntime';
import styles from './PetStage.module.css';

const DRAG_THRESHOLD_PX = 4;

interface DragSession {
  dragging: boolean;
  pointerId: number;
  startScreenX: number;
  startScreenY: number;
}

function toDragPoint(event: PointerEvent<HTMLButtonElement>) {
  return {
    screenX: event.screenX,
    screenY: event.screenY,
  };
}

export function PetStage() {
  const hasPetApi = Boolean(window.electronAPI?.getActivePet);
  const dragSessionRef = useRef<DragSession | null>(null);
  const { loading, petState, sendPetEvent } = usePetRuntime();

  const handlePointerDown = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragSessionRef.current = {
      dragging: false,
      pointerId: event.pointerId,
      startScreenX: event.screenX,
      startScreenY: event.screenY,
    };
  }, []);

  const handlePointerMove = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;

    const dx = event.screenX - session.startScreenX;
    const dy = event.screenY - session.startScreenY;
    const hasDragIntent = Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX;

    if (!session.dragging && hasDragIntent) {
      session.dragging = true;
      void window.electronAPI?.startPetDrag?.({
        screenX: session.startScreenX,
        screenY: session.startScreenY,
      });
    }

    if (session.dragging) {
      event.preventDefault();
      void window.electronAPI?.movePetDrag?.(toDragPoint(event));
    }
  }, []);

  const finishPointerSession = useCallback((event: PointerEvent<HTMLButtonElement>, options = { cancelled: false }) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;

    dragSessionRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (session.dragging) {
      event.preventDefault();
      void window.electronAPI?.endPetDrag?.(toDragPoint(event));
      return;
    }

    if (!options.cancelled) {
      void sendPetEvent('petClicked');
    }
  }, [sendPetEvent]);

  const handlePointerUp = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    finishPointerSession(event);
  }, [finishPointerSession]);

  const handlePointerCancel = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    finishPointerSession(event, { cancelled: true });
  }, [finishPointerSession]);

  const handleOneShotComplete = useCallback(() => {
    void sendPetEvent('animationComplete');
  }, [sendPetEvent]);

  if (loading) {
    return <main className={styles.desktop} data-pet-loading="true" />;
  }

  if (!petState?.ok || !petState.manifest || !petState.spriteUrl || !petState.animation || !petState.animationName) {
    return (
      <main className={styles.desktop} data-pet-error="true">
        <section className={styles.errorPanel} aria-label="pet-error">
          {petState?.errors?.[0] ?? (hasPetApi
            ? 'No pet package found'
            : 'Pet MVP 需要桌面运行时。请运行 npm run dev 启动 Electron 宠物。')}
        </section>
      </main>
    );
  }

  return (
    <main
      className={styles.desktop}
      data-pet-id={petState.manifest.id}
      data-pet-state={petState.behavior.semanticState}
      data-pet-animation={petState.animationName}
    >
      <button
        aria-label={petState.manifest.name}
        className={styles.petButton}
        type="button"
        onPointerCancel={handlePointerCancel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <SpriteAnimator
          animation={petState.animation}
          animationName={petState.animationName}
          frameHeight={petState.manifest.sprite.frameHeight}
          frameWidth={petState.manifest.sprite.frameWidth}
          spriteUrl={petState.spriteUrl}
          onOneShotComplete={petState.animation.loop ? undefined : handleOneShotComplete}
        />
      </button>
    </main>
  );
}
