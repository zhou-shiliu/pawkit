const DEFAULT_PLACEMENT_PADDING = 24;
const DEFAULT_DRAG_THRESHOLD_PX = 4;
const DEFAULT_PET_SIZE = Object.freeze({ width: 192, height: 208 });

function toFiniteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

function normalizeRect(rect = {}, fallback = {}) {
  return {
    x: toFiniteNumber(rect.x, fallback.x ?? 0),
    y: toFiniteNumber(rect.y, fallback.y ?? 0),
    width: Math.max(1, toFiniteNumber(rect.width, fallback.width ?? DEFAULT_PET_SIZE.width)),
    height: Math.max(1, toFiniteNumber(rect.height, fallback.height ?? DEFAULT_PET_SIZE.height)),
  };
}

function normalizeWorkArea(workArea = {}) {
  return normalizeRect(workArea, { x: 0, y: 0, width: 1440, height: 900 });
}

function clampRectToWorkArea(rect = {}, workArea = {}, options = {}) {
  const safeArea = normalizeWorkArea(workArea);
  const safeRect = normalizeRect(rect);
  const padding = Math.max(0, toFiniteNumber(options.padding, 0));
  const minX = safeArea.x + padding;
  const minY = safeArea.y + padding;
  const maxX = safeArea.x + safeArea.width - safeRect.width - padding;
  const maxY = safeArea.y + safeArea.height - safeRect.height - padding;

  return {
    ...safeRect,
    x: clamp(safeRect.x, minX, maxX),
    y: clamp(safeRect.y, minY, maxY),
  };
}

function createDefaultPlacement(workArea = {}, size = DEFAULT_PET_SIZE, options = {}) {
  const safeArea = normalizeWorkArea(workArea);
  const safeSize = normalizeRect(size, DEFAULT_PET_SIZE);
  const padding = Math.max(0, toFiniteNumber(options.padding, DEFAULT_PLACEMENT_PADDING));
  const anchor = options.anchor ?? 'bottom-right';
  const bounds = clampRectToWorkArea(
    {
      x: safeArea.x + safeArea.width - safeSize.width - padding,
      y: safeArea.y + safeArea.height - safeSize.height - padding,
      width: safeSize.width,
      height: safeSize.height,
    },
    safeArea,
    { padding },
  );

  return {
    displayId: options.displayId ?? null,
    anchor,
    bounds,
    scaleFactor: Math.max(0.1, toFiniteNumber(options.scaleFactor, 1)),
  };
}

function normalizeDisplay(display = {}, fallbackId = 'primary') {
  return {
    id: display.id ?? fallbackId,
    primary: Boolean(display.primary),
    scaleFactor: Math.max(0.1, toFiniteNumber(display.scaleFactor, 1)),
    workArea: normalizeWorkArea(display.workArea ?? display.bounds),
  };
}

function chooseDisplay(displays = [], displayId = null) {
  const normalizedDisplays = displays.length > 0
    ? displays.map((display, index) => normalizeDisplay(display, index === 0 ? 'primary' : `display-${index}`))
    : [normalizeDisplay({ id: 'primary', primary: true })];
  const matched = normalizedDisplays.find((display) => String(display.id) === String(displayId));
  return matched ?? normalizedDisplays.find((display) => display.primary) ?? normalizedDisplays[0];
}

function resolvePlacementForDisplays(savedPlacement = {}, displays = [], options = {}) {
  const display = chooseDisplay(displays, savedPlacement.displayId);
  const fallback = createDefaultPlacement(display.workArea, savedPlacement.bounds ?? DEFAULT_PET_SIZE, {
    displayId: display.id,
    padding: options.padding,
    scaleFactor: display.scaleFactor,
  });
  const bounds = savedPlacement.bounds
    ? clampRectToWorkArea(savedPlacement.bounds, display.workArea, {
      padding: Math.max(0, toFiniteNumber(options.padding, 0)),
    })
    : fallback.bounds;

  return {
    displayId: display.id,
    anchor: savedPlacement.anchor ?? fallback.anchor,
    bounds,
    scaleFactor: display.scaleFactor,
  };
}

function isDragIntent(startPoint = {}, currentPoint = {}, threshold = DEFAULT_DRAG_THRESHOLD_PX) {
  const dx = toFiniteNumber(currentPoint.x, 0) - toFiniteNumber(startPoint.x, 0);
  const dy = toFiniteNumber(currentPoint.y, 0) - toFiniteNumber(startPoint.y, 0);
  return Math.hypot(dx, dy) >= Math.max(0, toFiniteNumber(threshold, DEFAULT_DRAG_THRESHOLD_PX));
}

function expandBounds(bounds = {}, insets = {}) {
  const safeBounds = normalizeRect(bounds);
  const top = Math.max(0, toFiniteNumber(insets.top, 0));
  const right = Math.max(0, toFiniteNumber(insets.right, 0));
  const bottom = Math.max(0, toFiniteNumber(insets.bottom, 0));
  const left = Math.max(0, toFiniteNumber(insets.left, 0));

  return {
    x: safeBounds.x - left,
    y: safeBounds.y - top,
    width: safeBounds.width + left + right,
    height: safeBounds.height + top + bottom,
  };
}

module.exports = {
  DEFAULT_DRAG_THRESHOLD_PX,
  DEFAULT_PET_SIZE,
  DEFAULT_PLACEMENT_PADDING,
  clampRectToWorkArea,
  createDefaultPlacement,
  chooseDisplay,
  expandBounds,
  isDragIntent,
  normalizeDisplay,
  normalizeRect,
  normalizeWorkArea,
  resolvePlacementForDisplays,
};

