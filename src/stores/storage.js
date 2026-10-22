// Keep these keys compatible with data saved by the original public frontend.
export const DATA_KEYS = ['history', 'watching', 'bookmarks', 'DEF_SRC', 'app_settings'];
const listeners = new Set();
let revision = 0;
export const subscribe = fn => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const getRevision = () => revision;

export function notifyStorage() {
  revision++;
  for (const fn of listeners)
    fn(revision);
}

if (typeof window !== 'undefined')
  window.addEventListener('storage', notifyStorage);

export function read(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }
  catch {
    return fallback;
  }
}

export function logs(key) {
  const value = read(key);
  return Array.isArray(value) ? value : [];
}

export function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  notifyStorage();
}

export function matches(log, type, id, sno, eno) {
  return log != null && String(log.id) === String(id) && log.mediaType === type && (sno == null || String(log.data?.sno) === String(sno)) && (eno == null || String(log.data?.eno) === String(eno));
}

export function exists(key, type, id, sno, eno) {
  return logs(key).some(l => matches(l, type, id, sno, eno));
}

export function removeLog(key, type, id, sno, eno, index) {
  write(
    key,
    logs(key).filter(
      l => !(matches(l, type, id, sno, eno) && (index == null || String(l.index) === String(index)))
    )
  );
}

export function saveLog(key, { id, mediaType, sno = null, eno = null, progress = null, index = Date.now() }) {
  if (!Number.isInteger(Number(id)) || Number(id) <= 0 || !['movie', 'tv'].includes(mediaType))
    return;
  const record = {
    mediaType,
    id: Number(id),
    index,
    progress,
    data: { sno: sno == null ? null : String(sno), eno: eno == null ? null : String(eno) }
  };
  // History retains separate sessions; bookmarks and Continue Watching keep one title entry.
  const old = logs(key).filter(
    l => key === 'history'
      ? !(matches(l, mediaType, id, sno, eno) && l.index === index)
      : !matches(l, mediaType, id)
  );
  write(key, [...old, record]);
}

export function toggleBookmark(type, id) {
  exists('bookmarks', type, id)
    ? removeLog('bookmarks', type, id)
    : saveLog('bookmarks', { id, mediaType: type });
}

export function progressFor(type, id, sno, eno) {
  if (type === 'tv' && sno == null && eno == null)
    return 0;
  const items = logs('history').filter(l => matches(l, type, id, sno, eno));
  if (type === 'movie' && items.some(l => Number(l.progress) === 100))
    return 100;
  return Number(items.sort((a, b) => Number(b.index) - Number(a.index))[0]?.progress) || 0;
}

export function sourceFor(id) {
  if (read('app_settings', {})?.rememberSource === false) return Number(read('app_settings', {}).defaultSource) || 1;
  const saved = logs('DEF_SRC').find(l => String(l.id) === String(id))?.value;
  const legacy = localStorage.getItem(String(id));
  return Number(saved ?? legacy ?? read('app_settings', {}).defaultSource ?? 1) || 1;
}

export function saveSource(id, value) {
  if (read('app_settings', {})?.rememberSource === false) return;
  write(
    'DEF_SRC',
    [
      ...logs('DEF_SRC').filter(l => String(l.id) !== String(id)),
      { id: Number(id), value: Number(value) }
    ]
  );
}

export function migrateStorage() {
  // Only add a missing legacy-derived value. Never delete unknown keys or rewrite existing records.
  if (localStorage.getItem('watching') === null && localStorage.getItem('history')) {
    const value = read('history', null);
    if (Array.isArray(value))
      write('watching', value);
  }
  const savedSources = read('DEF_SRC', null);
  if (localStorage.getItem('DEF_SRC') !== null && !Array.isArray(savedSources))
    return;
  const sources = savedSources || [];
  let changed = false;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!/^\d+$/.test(key))
      continue;
    const value = Number(localStorage.getItem(key));
    if ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 100, 101].includes(value) && !sources.some(l => String(l?.id) === key)) {
      sources.push({ id: Number(key), value });
      changed = true;
    }
  }
  if (changed)
    write('DEF_SRC', sources);
}

export function exportData(all = false) {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (all || DATA_KEYS.includes(key)) {
      const raw = localStorage.getItem(key);
      try {
        data[key] = JSON.parse(raw);
      }
      catch {
        data[key] = raw;
      }
    }
  }
  return data;
}

export function validateBackup(value) {
  if (!value || Array.isArray(value) || typeof value !== 'object')
    throw new Error('Invalid backup file');
  for (const key of DATA_KEYS)
    if (key in value && (key === 'app_settings'
      ? !value[key] || Array.isArray(value[key]) || typeof value[key] !== 'object'
      : !Array.isArray(value[key])))
      throw new Error(`Invalid ${key} data`);
  if (!Object.keys(value).some(key => DATA_KEYS.includes(key) || /^\d+$/.test(key)))
    throw new Error('No application data found in this backup');
  for (const key of ['history', 'watching', 'bookmarks'])
    for (const record of value[key] || []) {
      if (!record || typeof record !== 'object' || !['movie', 'tv'].includes(record.mediaType) || !Number.isInteger(Number(record.id)) || Number(record.id) <= 0 || (record.data != null && (typeof record.data !== 'object' || Array.isArray(record.data))))
        throw new Error(`Invalid ${key} record`);
    }
  for (const record of value.DEF_SRC || [])
    if (!record || !Number.isFinite(Number(record.id)) || !Number.isFinite(Number(record.value)))
      throw new Error('Invalid DEF_SRC record');
  return value;
}

export function importData(data, merge = true) {
  validateBackup(data);
  data = { ...data };
  const legacySources = Object.entries(data).filter(
    ([key, value]) => /^\d+$/.test(key) && [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 100, 101].includes(Number(value))
  ).map(
    ([id, value]) => ({ id: Number(id), value: Number(value) })
  );
  if (legacySources.length)
    data.DEF_SRC = [
      ...new Map([...legacySources, ...(data.DEF_SRC || [])].map(item => [String(item.id), item])).values()
    ];
  const identity = {
    history: l => l.index,
    bookmarks: l => `${l.id}-${l.mediaType}`,
    watching: l => `${l.id}-${l.mediaType}-${l.data?.sno}-${l.data?.eno}`,
    DEF_SRC: l => String(l.id)
  };
  const updates = Object.entries(data).filter(([k]) => DATA_KEYS.includes(k)).map(
    ([k, v]) => [
      k,
      merge && identity[k] ? [...new Map([...logs(k), ...v].map(l => [identity[k](l), l])).values()] : v
    ]
  );
  // Save the raw values so a failed import can restore the previous data.
  const previous = new Map(DATA_KEYS.map(k => [k, localStorage.getItem(k)]));
  try {
    if (!merge)
      DATA_KEYS.forEach(k => localStorage.removeItem(k));
    for (const [k, v] of updates)
      localStorage.setItem(k, JSON.stringify(v));
  }
  catch (e) {
    for (const [k, v] of previous)
      v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v);
    throw e;
  }
  notifyStorage();
}

export function clearData() {
  DATA_KEYS.forEach(k => localStorage.removeItem(k));
  notifyStorage();
}
