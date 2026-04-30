import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { StaticCatFigure } from './components/StaticCatFigure/StaticCatFigure';
import { useCatState } from './hooks/useCatState';
import { useRoamingCatState } from './hooks/useRoamingCatState';
import { usePresenceState } from './hooks/usePresenceState';
import { useVisualPresenceState } from './hooks/useVisualPresenceState';
import { MoodText } from './components/MoodText/MoodText';
import { clampPercent, getCarePrompt } from './systems/catBehavior';
import styles from './App.module.css';

const FEEDBACK_DURATION_MS = 2400;
const GENTLE_PROMPT_THRESHOLD = 35;
const URGENT_PROMPT_THRESHOLD = 20;

function shouldShowCarePromptInMode(
  mode: 'work' | 'idle',
  state: Pick<ReturnType<typeof useCatState>['catState'], 'hunger' | 'hydration' | 'happiness'>,
) {
  const lowestNeed = Math.min(state.hunger, state.hydration, state.happiness);
  if (lowestNeed >= GENTLE_PROMPT_THRESHOLD) return false;
  return mode === 'idle' || lowestNeed < URGENT_PROMPT_THRESHOLD;
}

function formatGauge(value: number) {
  return Math.round(clampPercent(value));
}

function formatTrust(value: number) {
  const safeValue = Number.isFinite(value) ? value : 1;
  return safeValue.toFixed(1);
}

function getActionFeedback(action: 'feed' | 'water' | 'pet') {
  if (action === 'feed') return '吃上猫粮了';
  if (action === 'water') return '喝上水了';
  return '玩得很开心';
}

function getVisualBodyStyle(visualState: string): CSSProperties {
  switch (visualState) {
    case 'look-left':
      return { transform: 'translateY(-1px) rotate(-2deg)' };
    case 'look-right':
      return { transform: 'translateY(-1px) rotate(2deg)' };
    case 'blink':
      return { transform: 'translateY(1px) scaleY(0.98)' };
    case 'small-shift':
      return { transform: 'translate(2px, -2px) rotate(1deg)' };
    case 'groom':
      return { transform: 'translate(-2px, -1px) rotate(-4deg) scale(0.99)' };
    case 'stretch':
      return { transform: 'translateY(-2px) scaleX(1.03) scaleY(0.97)' };
    case 'walk-a':
      return { transform: 'translate(-2px, -4px) rotate(-2deg)' };
    case 'walk-b':
      return { transform: 'translate(2px, -2px) rotate(2deg)' };
    case 'turn-reset':
      return { transform: 'translateY(-1px) scaleX(0.99)' };
    default:
      return { transform: 'translateY(0) rotate(0deg)' };
  }
}

function getVisualShadowStyle(visualState: string): CSSProperties {
  switch (visualState) {
    case 'walk-a':
    case 'walk-b':
      return { transform: 'scaleX(1.08) scaleY(0.84)', opacity: 0.18 };
    case 'stretch':
      return { transform: 'scaleX(1.06) scaleY(0.92)', opacity: 0.2 };
    case 'groom':
      return { transform: 'scaleX(0.98) scaleY(0.94)', opacity: 0.2 };
    case 'blink':
      return { transform: 'scaleX(0.96)', opacity: 0.18 };
    default:
      return { transform: 'scaleX(1)', opacity: 0.24 };
  }
}

export default function App() {
  const roamingState = useRoamingCatState();
  const { catState } = useCatState();
  const presenceState = usePresenceState();
  const visualPresenceState = useVisualPresenceState({
    presenceMode: presenceState.mode,
    roamingPhase: roamingState.phase,
  });
  const isWebPreview = !window.electronAPI?.getRoamingState;
  const carePrompt = getCarePrompt(catState);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const previousActionMarkersRef = useRef({
    lastFed: catState.lastFed,
    lastWatered: catState.lastWatered,
    lastPet: catState.lastPet,
  });
  const hasHydratedMarkersRef = useRef(false);
  const previewTranslateStyle = isWebPreview
    ? { transform: `translateX(${Math.round(roamingState.x)}px)` }
    : undefined;
  const visualBodyStyle = getVisualBodyStyle(visualPresenceState.visualState);
  const visualShadowStyle = getVisualShadowStyle(visualPresenceState.visualState);
  const bubbleMessage =
    feedbackMessage ??
    (shouldShowCarePromptInMode(presenceState.mode, catState) ? carePrompt : null);
  const careStatusItems = [
    { label: 'Food', value: formatGauge(catState.hunger) },
    { label: 'Water', value: formatGauge(catState.hydration) },
    { label: 'Play', value: formatGauge(catState.happiness) },
    { label: 'Trust', value: formatTrust(catState.trustLevel) },
  ];

  useEffect(() => {
    const previous = previousActionMarkersRef.current;
    const current = {
      lastFed: catState.lastFed,
      lastWatered: catState.lastWatered,
      lastPet: catState.lastPet,
    };

    previousActionMarkersRef.current = current;

    if (!hasHydratedMarkersRef.current) {
      hasHydratedMarkersRef.current = true;
      return undefined;
    }

    const changedActions: Array<{ action: 'feed' | 'water' | 'pet'; at: number }> = [];

    if (current.lastFed && current.lastFed !== previous.lastFed) {
      changedActions.push({ action: 'feed', at: current.lastFed });
    }
    if (current.lastWatered && current.lastWatered !== previous.lastWatered) {
      changedActions.push({ action: 'water', at: current.lastWatered });
    }
    if (current.lastPet && current.lastPet !== previous.lastPet) {
      changedActions.push({ action: 'pet', at: current.lastPet });
    }

    if (changedActions.length === 0) return undefined;

    changedActions.sort((a, b) => b.at - a.at);
    const nextMessage = getActionFeedback(changedActions[0].action);
    setFeedbackMessage(nextMessage);

    const timerId = window.setTimeout(() => {
      setFeedbackMessage((prev) => (prev === nextMessage ? null : prev));
    }, FEEDBACK_DURATION_MS);

    return () => window.clearTimeout(timerId);
  }, [catState.lastFed, catState.lastPet, catState.lastWatered]);

  return (
    <main
      className={styles.desktop}
      data-presence-mode={presenceState.mode}
      data-visual-state={visualPresenceState.visualState}
      data-cat-pose={visualPresenceState.catPose}
    >
      <div
        className={styles.catAnchor}
        data-phase={roamingState.phase}
        data-presence-mode={presenceState.mode}
      >
        <div
          className={styles.catStage}
          data-presence-mode={presenceState.mode}
          data-visual-state={visualPresenceState.visualState}
          data-cat-pose={visualPresenceState.catPose}
          style={previewTranslateStyle}
        >
          <section className={styles.careStatusPanel} aria-label="care-status">
            {careStatusItems.map((item) => (
              <div className={styles.careStatusItem} key={item.label}>
                <span className={styles.careStatusLabel}>{item.label}</span>
                <span className={styles.careStatusValue}>{item.value}</span>
              </div>
            ))}
          </section>
          {bubbleMessage ? (
            <section className={styles.statusBubble} aria-label="care-hud">
              <MoodText mood={bubbleMessage} />
            </section>
          ) : null}
          <div
            className={`${styles.shadow} ${
              roamingState.locomotion === 'walk' ? styles.shadowWalking : ''
            }`}
            data-visual-state={visualPresenceState.visualState}
            style={visualShadowStyle}
          />
          <div
            className={styles.catBody}
            data-visual-state={visualPresenceState.visualState}
            data-cat-pose={visualPresenceState.catPose}
            style={visualBodyStyle}
          >
            <StaticCatFigure facing={roamingState.facing} trustLevel={catState.trustLevel} />
          </div>
        </div>
      </div>
      {isWebPreview ? (
        <p className={styles.webHint}>
          网页预览模式：运行 <code>npm run electron:dev</code>，桌面版通过菜单栏照料猫咪。
        </p>
      ) : null}
    </main>
  );
}
