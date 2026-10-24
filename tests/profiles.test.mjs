import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfile, deleteProfile, listProfiles, switchProfile } from '../src/features/profile/profiles.js';
import { activeProfileId, profileKeyFor, PROFILE_REGISTRY } from '../src/stores/profileStorage.js';
import { read, write, saveLog, sourceFor, exportData, importData, clearData } from '../src/stores/storage.js';
import { getSettings, saveSetting } from '../src/features/settings/preferences.js';
import { saveEntry, personalSnapshot } from '../src/features/personal/store.js';
import { clearActivity, forgetSources } from '../src/features/settings/actions.js';

function storage(t) {
  const before = globalThis.localStorage;
  const values = new Map([
    ['app_settings', JSON.stringify({ profile: { name: 'Original', avatar: null }, theme: 'light' })],
    ['bookmarks', JSON.stringify([{ id: 1, mediaType: 'movie' }])],
    ['99', '8'], ['unrelated', 'keep']
  ]);
  globalThis.localStorage = {
    get length() { return values.size; }, key: index => [...values.keys()][index],
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
  t.after(() => { globalThis.localStorage = before; });
  return values;
}

test('existing data stays in original profile; new profiles start with independent data', t => {
  const values = storage(t);
  const oldBookmarks = values.get('bookmarks');
  assert.equal(listProfiles()[0].name, 'Original');
  const id = createProfile({ name: 'Second', avatar: null });
  assert.equal(activeProfileId(), id);
  assert.deepEqual(read('bookmarks'), []);
  assert.equal(getSettings().theme, 'dark');
  assert.equal(sourceFor(99), 1);
  saveLog('bookmarks', { id: 2, mediaType: 'tv' });
  saveSetting('theme', 'light');
  saveEntry({ id: 2, mediaType: 'tv', title: 'A show' }, { status: 'watching', rating: 8, note: '', watchedOn: '' });
  switchProfile('default');
  assert.equal(values.get('bookmarks'), oldBookmarks);
  assert.equal(getSettings().profile.name, 'Original');
  assert.equal(sourceFor(99), 8);
  assert.deepEqual(personalSnapshot().journal, []);
  switchProfile(id);
  assert.equal(read('bookmarks')[0].id, 2);
  assert.equal(personalSnapshot().journal[0].rating, 8);
});

test('backups, replacement imports and erase only affect the selected profile', t => {
  storage(t);
  const id = createProfile({ name: 'Second' });
  saveLog('bookmarks', { id: 2, mediaType: 'movie' });
  const backup = exportData(true);
  assert.equal(backup.bookmarks[0].id, 2);
  assert.equal(backup.app_settings.profile.name, 'Second');
  assert.ok(!Object.keys(backup).some(key => key.startsWith('streamhub_')));
  importData({ history: [], bookmarks: [{ id: 3, mediaType: 'movie' }] }, false);
  assert.equal(read('bookmarks')[0].id, 3);
  clearData();
  switchProfile('default');
  assert.equal(read('bookmarks')[0].id, 1);
  assert.ok(!JSON.stringify(exportData(true)).includes(`streamhub_profile:${id}:`));
  assert.equal(listProfiles().length, 2);
});

test('deletion retains other profiles, switches away from an active deletion, and protects the last profile', t => {
  const values = storage(t);
  const id = createProfile({ name: 'Second' });
  saveLog('watching', { id: 2, mediaType: 'movie' });
  deleteProfile('default');
  assert.equal(activeProfileId(), id);
  assert.equal(read('watching')[0].id, 2);
  assert.equal(values.has('99'), false);
  assert.equal(values.get('unrelated'), 'keep');
  assert.throws(() => deleteProfile(id), /at least one/);
  const another = createProfile({ name: 'Third' });
  deleteProfile(another);
  assert.equal(activeProfileId(), id);
  assert.equal(values.has(profileKeyFor('app_settings', another)), false);
  assert.throws(() => switchProfile('missing'), /no longer exists/);
});

test('failed profile creation leaves the original registry and data intact', t => {
  const values = storage(t);
  const original = new Map(values);
  const set = localStorage.setItem;
  localStorage.setItem = (key, value) => {
    if (key === PROFILE_REGISTRY) throw new Error('Quota exceeded');
    set(key, value);
  };
  assert.throws(() => createProfile({ name: 'Second' }), /Quota/);
  assert.deepEqual(values, original);
  assert.equal(activeProfileId(), 'default');
});

test('history and source cleanup never remove another profile data', t => {
  const values = storage(t);
  write('history', [{ id: 1, mediaType: 'movie' }]);
  createProfile({ name: 'Second' });
  write('history', [{ id: 2, mediaType: 'movie' }]);
  clearActivity();
  forgetSources();
  assert.deepEqual(read('history'), []);
  assert.equal(values.get('99'), '8');
  switchProfile('default');
  assert.equal(read('history')[0].id, 1);
});
