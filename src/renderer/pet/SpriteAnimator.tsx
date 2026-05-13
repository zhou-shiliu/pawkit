import { useEffect, useMemo, useState } from 'react';
import type { PetAnimationPayload } from '../types/electron';
import styles from './PetStage.module.css';

interface SpriteAnimatorProps {
  animation: PetAnimationPayload;
  animationName: string;
  frameHeight: number;
  frameWidth: number;
  scale?: number;
  spriteUrl: string;
  onOneShotComplete?: () => void;
}

function getFrameDuration(animation: PetAnimationPayload, frameIndex: number) {
  const duration = animation.durationsMs?.[frameIndex];
  if (duration && Number.isFinite(duration)) return duration;
  return Math.max(60, Math.round(1000 / Math.max(1, animation.fps || 8)));
}

export function SpriteAnimator({
  animation,
  animationName,
  frameHeight,
  frameWidth,
  scale = 1,
  spriteUrl,
  onOneShotComplete,
}: SpriteAnimatorProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const frameCount = Math.max(1, animation.frames || 1);
  const backgroundSize = useMemo(
    () => `${frameWidth * 8}px ${frameHeight * 9}px`,
    [frameHeight, frameWidth],
  );

  useEffect(() => {
    setFrameIndex(0);
  }, [animationName]);

  useEffect(() => {
    const frameDuration = getFrameDuration(animation, frameIndex);
    const timeoutId = window.setTimeout(() => {
      const isLastFrame = frameIndex >= frameCount - 1;
      if (isLastFrame && !animation.loop) {
        onOneShotComplete?.();
        return;
      }
      setFrameIndex((current) => (current + 1) % frameCount);
    }, frameDuration);

    return () => window.clearTimeout(timeoutId);
  }, [animation, frameCount, frameIndex, onOneShotComplete]);

  return (
    <div
      aria-hidden="true"
      className={styles.spriteViewport}
      style={{
        width: Math.round(frameWidth * scale),
        height: Math.round(frameHeight * scale),
      }}
    >
      <div
        className={styles.sprite}
        style={{
          width: frameWidth,
          height: frameHeight,
          backgroundImage: `url("${spriteUrl}")`,
          backgroundPosition: `-${frameIndex * frameWidth}px -${animation.row * frameHeight}px`,
          backgroundSize,
          transform: `scale(${scale})`,
        }}
      />
    </div>
  );
}

