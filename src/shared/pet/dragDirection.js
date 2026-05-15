const DRAG_DIRECTION_DEADZONE_PX = 1;

function createDragDirectionState(point = {}) {
  return {
    lastPoint: {
      screenX: Number(point.screenX) || 0,
      screenY: Number(point.screenY) || 0,
    },
    lastDirection: null,
  };
}

function getImmediateDragDirection(state = {}, point = {}, options = {}) {
  const deadzone = Math.max(0, Number(options.deadzonePx) || DRAG_DIRECTION_DEADZONE_PX);
  const previousX = Number(state.lastPoint?.screenX) || 0;
  const currentX = Number(point.screenX) || 0;
  const dx = currentX - previousX;

  if (Math.abs(dx) < deadzone) return null;
  return dx < 0 ? 'left' : 'right';
}

function advanceDragDirectionState(state = {}, point = {}, options = {}) {
  const direction = getImmediateDragDirection(state, point, options);
  return {
    state: {
      lastPoint: {
        screenX: Number(point.screenX) || 0,
        screenY: Number(point.screenY) || 0,
      },
      lastDirection: direction ?? state.lastDirection ?? null,
    },
    direction,
    changed: Boolean(direction && direction !== state.lastDirection),
  };
}

module.exports = {
  DRAG_DIRECTION_DEADZONE_PX,
  advanceDragDirectionState,
  createDragDirectionState,
  getImmediateDragDirection,
};
