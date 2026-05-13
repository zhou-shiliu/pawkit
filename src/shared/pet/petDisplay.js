const petDisplayConfig = require('./petDisplayConfig.json');

const DEFAULT_FRAME_SIZE = Object.freeze({ width: 192, height: 208 });

function toPositiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function getPetRenderScale(config = petDisplayConfig) {
  return toPositiveNumber(config.renderScale, 1);
}

function calculatePetWindowSize(sprite = {}, config = petDisplayConfig) {
  const frameWidth = Math.round(toPositiveNumber(sprite.frameWidth, DEFAULT_FRAME_SIZE.width));
  const frameHeight = Math.round(toPositiveNumber(sprite.frameHeight, DEFAULT_FRAME_SIZE.height));
  const scale = getPetRenderScale(config);
  const headroom = Math.max(0, toPositiveNumber(config.bubbleHeadroom, 0));
  const minWidth = Math.max(1, toPositiveNumber(config.minWindowWidth, 1));

  return {
    width: Math.max(Math.round(frameWidth * scale), Math.round(minWidth)),
    height: Math.round(frameHeight * scale + headroom),
  };
}

module.exports = {
  DEFAULT_FRAME_SIZE,
  calculatePetWindowSize,
  getPetRenderScale,
  petDisplayConfig,
};
