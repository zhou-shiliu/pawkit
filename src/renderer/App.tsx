import { useEffect, useRef, useState } from 'react';
import { StaticCatFigure } from './components/StaticCatFigure/StaticCatFigure';
import { useCatState } from './hooks/useCatState';
import { useRoamingCatState } from './hooks/useRoamingCatState';
import { MoodText } from './components/MoodText/MoodText';
import { clampPercent, getCarePrompt } from './systems/catBehavior';
import styles from './App.module.css';

const FEEDBACK_DURATION_MS = 2400;

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

export default function App() {
  const roamingState = useRoamingCatState();
  const { catState } = useCatState();
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
  const bubbleMessage = feedbackMessage ?? carePrompt;
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
    <main className={styles.desktop}>
      <div className={styles.catAnchor} data-phase={roamingState.phase}>
        <div className={styles.catStage} style={previewTranslateStyle}>
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
          />
          <div className={styles.catBody}>
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
