import { useCallback } from 'react';
import { SpriteAnimator } from './SpriteAnimator';
import { usePetRuntime } from './usePetRuntime';
import styles from './PetStage.module.css';

export function PetStage() {
  const { loading, petState, sendPetEvent } = usePetRuntime();

  const handlePetClick = useCallback(() => {
    void sendPetEvent('petClicked');
  }, [sendPetEvent]);

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
          {petState?.errors?.[0] ?? 'No pet package found'}
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
        onClick={handlePetClick}
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

