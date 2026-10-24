export const JOURNAL_KEY = 'title_journal';
export const LISTS_KEY = 'custom_lists';
export const STATUSES = {
  planned: 'Want to watch', watching: 'Watching', watched: 'Watched',
  paused: 'On hold', dropped: 'Stopped watching'
};
export const titleKey = item => `${item.mediaType}:${item.id}`;

function text(value, limit) {
  return typeof value === 'string' && value.length <= limit;
}

export function validTitle(item) {
  return item && ['movie', 'tv'].includes(item.mediaType)
    && Number.isSafeInteger(item.id) && item.id > 0
    && text(item.title, 200) && item.title.trim().length > 0
    && (item.poster === null || (text(item.poster, 200) && /^\/[a-zA-Z0-9._-]+$/.test(item.poster)));
}

export function titleRecord(item, type = item.mediaType || item.media_type) {
  const record = {
    id: Number(item.id), mediaType: type,
    title: String(item.title || item.name || 'Untitled').slice(0, 200),
    poster: item.poster ?? item.poster_path ?? null
  };
  if (!validTitle(record)) throw new Error('This title cannot be saved.');
  return record;
}

export function validDate(value) {
  return value === '' || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value);
}

export function validJournalEntry(item) {
  return validTitle(item) && Object.hasOwn(STATUSES, item.status)
    && Number.isFinite(item.rating) && item.rating >= 0 && item.rating <= 10 && item.rating * 2 % 1 === 0
    && text(item.note, 2000) && validDate(item.watchedOn)
    && Number.isFinite(item.updatedAt) && item.updatedAt >= 0;
}

export function validList(list) {
  return list && text(list.id, 80) && /^[a-zA-Z0-9_-]+$/.test(list.id)
    && text(list.name, 80) && list.name.trim().length > 0
    && Array.isArray(list.items) && list.items.length <= 200 && list.items.every(validTitle)
    && new Set(list.items.map(titleKey)).size === list.items.length;
}

export function validatePersonalBackup(data) {
  for (const [key, valid, max] of [[JOURNAL_KEY, validJournalEntry, 5000], [LISTS_KEY, validList, 100]]) {
    if (!(key in data)) continue;
    const rows = data[key];
    if (!Array.isArray(rows) || rows.length > max || !rows.every(valid)) throw new Error(`Invalid ${key} data`);
    const keys = rows.map(key === JOURNAL_KEY ? titleKey : item => item.id);
    if (new Set(keys).size !== keys.length) throw new Error(`Duplicate ${key} entries`);
  }
}

// Share only public list contents. Ratings, private notes and dates never enter the URL.
export function encodeList(list) {
  if (!validList(list)) throw new Error('Invalid collection.');
  if (list.items.length > 40) throw new Error('Share up to 40 titles per link. Split this collection into smaller lists.');
  const payload = { version: 1, name: list.name, items: list.items.map(item => ({
    id: item.id, mediaType: item.mediaType, title: item.title, poster: item.poster
  })) };
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const token = btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''))
    .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  if (token.length > 12000) throw new Error('This collection makes a long link. Share fewer titles.');
  return token;
}

export function decodeList(token) {
  if (typeof token !== 'string' || !token.length || token.length > 12000 || !/^[a-zA-Z0-9_-]+$/.test(token)) {
    throw new Error('This collection link is invalid or too large.');
  }
  try {
    const binary = atob(token.replaceAll('-', '+').replaceAll('_', '/'));
    const payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, c => c.charCodeAt(0))));
    const list = { id: 'shared', name: payload.name, items: payload.items };
    if (payload.version !== 1 || !validList(list) || list.items.length > 40) throw new Error();
    // Ignore any additional fields supplied by an untrusted link.
    return { name: list.name, items: list.items.map(item => titleRecord(item)) };
  } catch {
    throw new Error('This collection link is invalid or unsupported.');
  }
}

export function mergePersonalRows(key, current, incoming) {
  validatePersonalBackup({ [key]: current });
  validatePersonalBackup({ [key]: incoming });
  const identify = key === JOURNAL_KEY ? titleKey : item => item.id;
  const merged = new Map(current.map(item => [identify(item), item]));
  for (const item of incoming) {
    const previous = merged.get(identify(item));
    if (key === JOURNAL_KEY) {
      if (!previous || item.updatedAt >= previous.updatedAt) merged.set(identify(item), item);
    } else {
      merged.set(item.id, { ...item, items: [...new Map([...(previous?.items || []), ...item.items].map(title => [titleKey(title), title])).values()] });
    }
  }
  const result = [...merged.values()];
  validatePersonalBackup({ [key]: result });
  return result;
}
