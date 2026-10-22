import { read, write, logs, notifyStorage } from '../../stores/storage.js';
import { clearRequestCache, tmdb } from '../../services/api.js';
import { API_BASE } from '../sports/service.js';

export function storageSummary() {
  let bytes = 0;
  try {
    for (const key of ['history', 'watching', 'bookmarks', 'DEF_SRC', 'app_settings', 'sf_categories', 'sf_streams']) bytes += (localStorage.getItem(key) || '').length * 2;
  } catch { /* Counts still work through the safe storage reader. */ }
  return {
    bytes,
    bookmarks: logs('bookmarks').length,
    history: logs('history').length,
    sources: logs('DEF_SRC').length
  };
}

export function clearActivity() {
  // Both keys must be writable before clearing is considered successful.
  const previous = ['history', 'watching'].map(key => [key, localStorage.getItem(key)]);
  try {
    write('history', []);
    write('watching', []);
  }
  catch (error) {
    for (const [key, value] of previous) {
      if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value);
    }
    notifyStorage();
    throw error;
  }
}

export function forgetSources() {
  const legacy = [];
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    const value = read(key, null);
    if (/^\d+$/.test(key) && [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 100, 101].includes(Number(value))) legacy.push(key);
  }
  write('DEF_SRC', []);
  legacy.forEach(key => localStorage.removeItem(key));
  notifyStorage();
}

export function clearCaches() {
  clearRequestCache();
  localStorage.removeItem('sf_categories');
  localStorage.removeItem('sf_streams');
  notifyStorage();
}

export async function checkConnections(signal) {
  const endpoints = [
    ['Catalog', () => tmdb('genre/movie/list', {}, {
      signal,
      ttl: 0,
      cache: 'no-store'
    })],
    [
      'Sports feeds',
      async () => {
        const response = await fetch(`${API_BASE}/sports`, { signal, cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (!Array.isArray(await response.json())) throw new Error('Unexpected response');
      }
    ],
  ];
  return Promise.all(
    endpoints.map(
      async ([name, run]) => {
        const start = performance.now();
        try {
          await run();
          return {
            name,
            ok: true,
            message: `${Math.round(performance.now() - start)} ms`
          };
        }
        catch (error) {
          return {
            name,
            ok: false,
            message: signal.aborted ? 'Timed out or cancelled' : error.message
          };
        }
      }
    )
  );
}
