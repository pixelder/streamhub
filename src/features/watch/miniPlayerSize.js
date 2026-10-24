// The video keeps its 16:9 ratio; the header sits outside that rectangle.
export function miniPlayerBounds(viewportWidth, viewportHeight) {
  const mobile = viewportWidth <= 767;
  const bottomSpace = mobile ? 100 : 32;
  const maximum = Math.max(1, Math.min(720, viewportWidth - 24, (viewportHeight - bottomSpace - 72) * 16 / 9));
  return { min: Math.min(240, maximum), max: maximum, default: mobile ? 300 : 360 };
}

export function clampMiniPlayerWidth(width, viewportWidth, viewportHeight) {
  const bounds = miniPlayerBounds(viewportWidth, viewportHeight);
  const requested = Number.isFinite(width) ? width : bounds.default;
  return Math.round(Math.max(bounds.min, Math.min(bounds.max, requested)));
}

export function resizedMiniPlayerWidth(startWidth, deltaX, deltaY) {
  // A top-left handle grows toward the left/up; use the stronger movement.
  const horizontal = -deltaX;
  const vertical = -deltaY * 16 / 9;
  return startWidth + (Math.abs(horizontal) >= Math.abs(vertical) ? horizontal : vertical);
}
