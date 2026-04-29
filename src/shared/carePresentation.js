const GENTLE_THRESHOLD = 35;
const URGENT_THRESHOLD = 20;

function toFiniteNumber(value, fallback = 100) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function getNeedLevel(value) {
  const numericValue = toFiniteNumber(value, 100);
  if (numericValue < URGENT_THRESHOLD) return 'urgent';
  if (numericValue < GENTLE_THRESHOLD) return 'gentle';
  return null;
}

function getNeedPresentation(action, severity) {
  if (action === 'feed') {
    return severity === 'urgent'
      ? {
          action,
          severity,
          prompt: '肚子有点空了',
          menuSummary: '该吃饭了',
          trayTitle: 'Pawkit · 该喂食了',
        }
      : {
          action,
          severity,
          prompt: '想吃点东西',
          menuSummary: '想吃点东西',
          trayTitle: 'Pawkit · 想吃饭',
        };
  }

  if (action === 'water') {
    return severity === 'urgent'
      ? {
          action,
          severity,
          prompt: '有点口渴了',
          menuSummary: '该喝水了',
          trayTitle: 'Pawkit · 该加水了',
        }
      : {
          action,
          severity,
          prompt: '想喝点水',
          menuSummary: '想喝点水',
          trayTitle: 'Pawkit · 想喝水',
        };
  }

  return severity === 'urgent'
    ? {
        action,
        severity,
        prompt: '有点无聊，想找你玩',
        menuSummary: '该陪它玩了',
        trayTitle: 'Pawkit · 该陪玩了',
      }
    : {
        action,
        severity,
        prompt: '想玩一会',
        menuSummary: '想玩一会',
        trayTitle: 'Pawkit · 想玩耍',
      };
}

function getPrimaryCareNeedPresentation(state) {
  if (!state) return null;

  const hungerLevel = getNeedLevel(state.hunger);
  if (hungerLevel) return getNeedPresentation('feed', hungerLevel);

  const hydrationLevel = getNeedLevel(state.hydration);
  if (hydrationLevel) return getNeedPresentation('water', hydrationLevel);

  const happinessLevel = getNeedLevel(state.happiness);
  if (happinessLevel) return getNeedPresentation('pet', happinessLevel);

  return null;
}

function getCareActionLabel(action, recommendedAction) {
  const baseLabel =
    action === 'feed' ? '喂食' : action === 'water' ? '加水' : '陪它玩';

  return action === recommendedAction ? `${baseLabel}（推荐）` : baseLabel;
}

module.exports = {
  GENTLE_THRESHOLD,
  URGENT_THRESHOLD,
  getCareActionLabel,
  getPrimaryCareNeedPresentation,
};
