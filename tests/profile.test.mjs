import test from 'node:test';
import assert from 'node:assert/strict';
import { profileView, libraryProfileUrl } from '../src/features/profile/links.js';
import { matchRoute } from '../src/app/routes.js';

test('Profile selects valid views and defaults safely to Library', () => {
  for (const view of ['library', 'tracking', 'collections']) {
    assert.equal(profileView(`?view=${view}`), view);
  }
  assert.equal(profileView('?view=unknown'), 'library');
  assert.equal(profileView(''), 'library');
  assert.equal(profileView('?view=tracking', '#collection=encoded'), 'collections');
});

test('legacy Library URLs retain queries, section anchors and shared snapshots', () => {
  assert.equal(libraryProfileUrl(), '/profile?view=library');
  assert.equal(libraryProfileUrl('?view=tracking', '#history'), '/profile?view=tracking#history');
  assert.equal(libraryProfileUrl('?filter=movie', '#bookmarks'), '/profile?filter=movie&view=library#bookmarks');
  assert.equal(libraryProfileUrl('?view=tracking', '#collection=abc%2Bdef'), '/profile?view=collections#collection=abc%2Bdef');
});

test('Profile and legacy Library routes remain recognized', () => {
  for (const path of ['/profile', '/profile/', '/profile/index.html']) assert.equal(matchRoute(path).name, 'profile');
  assert.equal(matchRoute('/library').name, 'library');
});
