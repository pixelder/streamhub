export function clampPlayerPosition(position, width, height, viewportWidth, viewportHeight, bottomInset = 0) {
  return {
    x: Math.max(8, Math.min(position.x, viewportWidth - width - 8)),
    y: Math.max(8, Math.min(position.y, viewportHeight - bottomInset - height - 8))
  };
}

export function shouldDockPlayer(top, height, viewportHeight, bottomInset, movedDown) {
  return movedDown > 12 && top + height >= viewportHeight - bottomInset - 40;
}
