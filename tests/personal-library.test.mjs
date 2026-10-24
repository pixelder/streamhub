import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { encodeList, decodeList, validatePersonalBackup, JOURNAL_KEY, LISTS_KEY } from '../src/features/personal/model.js';
import { createList, updateList, addToList, deleteList, saveEntry, removeEntry, personalSnapshot } from '../src/features/personal/store.js';
import { exportData, importData, clearData } from '../src/stores/storage.js';

class MemoryStorage {
  data = new Map();
  get length() { return this.data.size; }
  key(index) { return [...this.data.keys()][index] ?? null; }
  getItem(key) { return this.data.get(String(key)) ?? null; }
  setItem(key, value) { this.data.set(String(key), String(value)); }
  removeItem(key) { this.data.delete(String(key)); }
}
beforeEach(() => { globalThis.localStorage = new MemoryStorage(); });
const title = { id: 42, mediaType: 'movie', title: 'A film 🎬', poster: '/poster.jpg' };
const entry = { status: 'watched', rating: 8.5, note: 'Private thoughts', watchedOn: '2026-10-21' };

test('tracking separates movie and TV IDs, supports updates and retains legacy data', () => {
  localStorage.setItem('history', '[{"id":42,"mediaType":"movie","progress":100}]');
  const previous = localStorage.getItem('history');
  saveEntry(title, entry);
  saveEntry({ ...title, mediaType: 'tv' }, { ...entry, rating: 7 });
  saveEntry(title, { ...entry, status: 'paused', rating: 9 });
  assert.equal(personalSnapshot().journal.length, 2);
  assert.equal(personalSnapshot().journal.find(x => x.mediaType === 'movie').status, 'paused');
  removeEntry(title);
  assert.equal(personalSnapshot().journal.length, 1);
  assert.equal(localStorage.getItem('history'), previous);
});

test('invalid dates, ratings and statuses cannot mutate saved entries', () => {
  saveEntry(title, entry);
  const before = localStorage.getItem(JOURNAL_KEY);
  for (const changes of [{ watchedOn: '2026-02-31' }, { rating: 11 }, { rating: 4.3 }, { status: 'invalid' }, { note: 'x'.repeat(2001) }]) {
    assert.throws(() => saveEntry(title, { ...entry, ...changes }));
    assert.equal(localStorage.getItem(JOURNAL_KEY), before);
  }
});

test('collections support unique membership, reordering, renaming and deletion', () => {
  const id = createList('Movie night');
  assert.equal(addToList(id, title), true);
  assert.equal(addToList(id, title), false);
  assert.equal(addToList(id, { ...title, mediaType: 'tv' }), true);
  const list = personalSnapshot().lists[0];
  updateList(id, { name: 'Weekend', items: [...list.items].reverse() });
  assert.equal(personalSnapshot().lists[0].items[0].mediaType, 'tv');
  assert.equal(personalSnapshot().lists[0].name, 'Weekend');
  deleteList(id);
  assert.equal(personalSnapshot().lists.length, 0);
  assert.throws(() => addToList(id, title));
});

test('collection links preserve Unicode and ordered titles without personal fields', () => {
  const list = { id: 'test', name: 'സിനിമ 🎥', items: [{ ...title, note: 'secret', rating: 9, status: 'watched' }] };
  const token = encodeList(list);
  assert.match(token, /^[a-zA-Z0-9_-]+$/);
  assert.deepEqual(decodeList(token), { name: list.name, items: [title] });
  const raw = atob(token.replaceAll('-', '+').replaceAll('_', '/'));
  assert.doesNotMatch(raw, /secret|rating|status|note/);
  assert.equal(personalSnapshot().lists.length, 0, 'Opening a link must not save data');
});

test('invalid, unsupported, oversized and hostile collection payloads are rejected', () => {
  const token = payload => btoa(JSON.stringify(payload)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  for (const value of ['', 'x'.repeat(12001), '<script>', token({ version: 2, name: 'No', items: [] }),
    token({ version: 1, name: 'No', items: [{ ...title, title: 'Bad', poster: 'javascript:alert(1)' }] })]) assert.throws(() => decodeList(value));
  assert.throws(() => encodeList({ id: 'a', name: 'Too many', items: Array.from({ length: 41 }, (_, i) => ({ ...title, id: i + 1 })) }));
});

test('new data exports and restores through existing backups, including merge conflicts', () => {
  const id = createList('Favorites', [title]);
  saveEntry(title, entry);
  const backup = exportData(false);
  assert.equal(backup[JOURNAL_KEY].length, 1);
  assert.equal(backup[LISTS_KEY].length, 1);
  addToList(id, { ...title, id: 43 });
  backup[JOURNAL_KEY][0].updatedAt = 0;
  backup[JOURNAL_KEY][0].rating = 1;
  importData(backup, true);
  assert.equal(personalSnapshot().lists[0].items.length, 2, 'Merge must retain local list members');
  assert.equal(personalSnapshot().journal[0].rating, 8.5, 'Older backup must not overwrite a recent rating');
  importData(backup, false);
  assert.equal(personalSnapshot().lists[0].items.length, 1);
  assert.equal(personalSnapshot().journal[0].rating, 1);
});

test('old backups merge without erasing new tracking data', () => {
  saveEntry(title, entry);
  importData({ bookmarks: [{ id: 1, mediaType: 'movie' }] }, true);
  assert.equal(personalSnapshot().journal.length, 1);
  assert.equal(JSON.parse(localStorage.getItem('bookmarks')).length, 1);
});

test('malformed backup and corrupt local data cannot silently replace personal data', () => {
  saveEntry(title, entry);
  const before = localStorage.getItem(JOURNAL_KEY);
  assert.throws(() => importData({ [JOURNAL_KEY]: [{ ...title, ...entry, rating: 99 }] }, false));
  assert.equal(localStorage.getItem(JOURNAL_KEY), before);
  localStorage.setItem(LISTS_KEY, 'broken JSON');
  assert.ok(personalSnapshot().error);
  assert.throws(() => createList('Do not reset'));
  assert.throws(() => importData({ [LISTS_KEY]: [] }, true));
  assert.equal(localStorage.getItem(LISTS_KEY), 'broken JSON');
});

test('backup validation rejects duplicate entries and list members', () => {
  saveEntry(title, entry);
  const record = personalSnapshot().journal[0];
  assert.throws(() => validatePersonalBackup({ [JOURNAL_KEY]: [record, record] }));
  assert.throws(() => createList('Duplicated', [title, title]));
});

test('erase removes new records and leaves unrelated browser data', () => {
  createList('List', [title]); saveEntry(title, entry);
  localStorage.setItem('unrelated', 'keep');
  clearData();
  assert.equal(localStorage.getItem(LISTS_KEY), null);
  assert.equal(localStorage.getItem(JOURNAL_KEY), null);
  assert.equal(localStorage.getItem('unrelated'), 'keep');
});

test('storage failures propagate without claiming a successful mutation', () => {
  createList('List', [title]);
  const before = localStorage.getItem(LISTS_KEY);
  localStorage.setItem = () => { throw new Error('Quota exceeded'); };
  assert.throws(() => createList('Fail'), /Quota/);
  assert.equal(localStorage.getItem(LISTS_KEY), before);
});
