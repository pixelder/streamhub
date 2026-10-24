import { storageKey } from '../../stores/profileStorage.js';
import { write } from '../../stores/storage.js';
import { JOURNAL_KEY, LISTS_KEY, titleKey, titleRecord, validatePersonalBackup } from './model.js';

function records(key) {
  const raw = localStorage.getItem(storageKey(key));
  const data = raw === null ? [] : JSON.parse(raw);
  validatePersonalBackup({ [key]: data });
  return data;
}

export function personalSnapshot() {
  try { return { journal: records(JOURNAL_KEY), lists: records(LISTS_KEY), error: '' }; }
  catch { return { journal: [], lists: [], error: 'Your saved tracking data could not be read. Export a backup before making changes.' }; }
}

export function saveEntry(title, values) {
  const entries = records(JOURNAL_KEY);
  const item = { ...titleRecord(title), ...values, updatedAt: Date.now() };
  const next = [...entries.filter(old => titleKey(old) !== titleKey(item)), item];
  validatePersonalBackup({ [JOURNAL_KEY]: next });
  write(JOURNAL_KEY, next);
}

export function removeEntry(item) {
  write(JOURNAL_KEY, records(JOURNAL_KEY).filter(old => titleKey(old) !== titleKey(item)));
}

export function createList(name, items = []) {
  const lists = records(LISTS_KEY);
  const list = { id: crypto.randomUUID(), name: name.trim(), items: items.map(item => titleRecord(item)) };
  const next = [...lists, list];
  validatePersonalBackup({ [LISTS_KEY]: next });
  write(LISTS_KEY, next);
  return list.id;
}

export function updateList(id, changes) {
  const lists = records(LISTS_KEY);
  if (!lists.some(list => list.id === id)) throw new Error('This collection no longer exists.');
  const next = lists.map(list => list.id === id ? { ...list, ...changes, id } : list);
  validatePersonalBackup({ [LISTS_KEY]: next });
  write(LISTS_KEY, next);
}

export function addToList(id, title) {
  const list = records(LISTS_KEY).find(list => list.id === id);
  if (!list) throw new Error('Choose an existing collection.');
  const item = titleRecord(title);
  if (list.items.some(old => titleKey(old) === titleKey(item))) return false;
  updateList(id, { items: [...list.items, item] });
  return true;
}

export function deleteList(id) {
  write(LISTS_KEY, records(LISTS_KEY).filter(list => list.id !== id));
}
