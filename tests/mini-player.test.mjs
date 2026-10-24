import test from 'node:test';
import assert from 'node:assert/strict';
import { clampMiniPlayerWidth, miniPlayerBounds, resizedMiniPlayerWidth } from '../src/features/watch/miniPlayerSize.js';

test('mini-player defaults and requested sizes fit desktop and mobile viewports', () => {
  assert.equal(clampMiniPlayerWidth(undefined, 1440, 900), 360);
  assert.equal(clampMiniPlayerWidth(undefined, 390, 844), 300);
  assert.equal(clampMiniPlayerWidth(9999, 1440, 900), 720);
  assert.equal(clampMiniPlayerWidth(1, 1440, 900), 240);
  assert.equal(clampMiniPlayerWidth(720, 320, 700), 296);
});

test('landscape resizing reserves space for header and mobile navigation', () => {
  const width = clampMiniPlayerWidth(720, 740, 300);
  assert.ok(width / (16 / 9) + 72 + 100 <= 301);
  const tiny = miniPlayerBounds(200, 240);
  assert.ok(tiny.min <= tiny.max);
  assert.ok(clampMiniPlayerWidth(720, 200, 240) <= 176);
});

test('top-left drag grows to left/up and shrinks to right/down', () => {
  assert.equal(resizedMiniPlayerWidth(360, -80, 0), 440);
  assert.equal(resizedMiniPlayerWidth(360, 80, 0), 280);
  assert.equal(resizedMiniPlayerWidth(360, 0, -45), 440);
  assert.equal(resizedMiniPlayerWidth(360, 0, 45), 280);
  assert.equal(resizedMiniPlayerWidth(360, -80, -45), 440);
});

import { clampPlayerPosition, shouldDockPlayer } from '../src/features/watch/miniPlayerPosition.js';

test('dragging stays within viewport and above mobile navigation', () => {
  assert.deepEqual(clampPlayerPosition({ x: -90, y: -80 }, 300, 220, 390, 844, 64), { x: 8, y: 8 });
  assert.deepEqual(clampPlayerPosition({ x: 900, y: 900 }, 300, 220, 390, 844, 64), { x: 82, y: 552 });
  assert.deepEqual(clampPlayerPosition({ x: 40, y: 80 }, 300, 220, 1200, 900), { x: 40, y: 80 });
});

test('docking requires a downward drag into the bottom zone', () => {
  assert.equal(shouldDockPlayer(550, 220, 844, 64, 50), true);
  assert.equal(shouldDockPlayer(550, 220, 844, 64, 0), false);
  assert.equal(shouldDockPlayer(550, 220, 844, 64, -50), false);
  assert.equal(shouldDockPlayer(300, 220, 844, 64, 50), false);
  assert.equal(shouldDockPlayer(660, 220, 900, 0, 40), true);
});
