import test from 'node:test';
import assert from 'node:assert/strict';
import { saveSetting } from '../src/features/settings/preferences.js';
import { clearActivity, forgetSources, clearCaches, checkConnections } from '../src/features/settings/actions.js';
import { sourceFor, saveSource } from '../src/stores/storage.js';
import { tmdb, requestJSON, clearRequestCache } from '../src/services/api.js';
import { image } from '../src/utils/format.js';
import { sourceUrl } from '../src/features/watch/source.js';
import { fetchCached } from '../src/features/sports/service.js';

function setup(t, initial = {}) {
  const previous = globalThis.localStorage;
  const data = new Map(Object.entries(initial).map(([k, v]) => [k, JSON.stringify(v)]));
  globalThis.localStorage = {
    get length() {
      return data.size;
    },
    key: i => [...data.keys()][i],
    getItem: k => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: k => data.delete(k)
  };
  t.after(() => {
    globalThis.localStorage = previous;
    clearRequestCache();
  });
  clearRequestCache();
  return data;
}

test(
  'catalog language and artwork data saver change actual requests',
  async t => {
    setup(t);
    saveSetting('metadataLanguage', 'hi-IN');
    saveSetting('imageQuality', 'saver');
    let requested;
    t.mock.method(
      globalThis,
      'fetch',
      async url => {
        requested = new URL(url, 'http://localhost');
        return Response.json({ results: [] });
      }
    );
    await tmdb('search/movie', { query: 'film' });
    assert.equal(requested.searchParams.get('language'), 'hi-IN');
    assert.equal(image('/poster.jpg'), 'https://image.tmdb.org/t/p/w185/poster.jpg');
    assert.equal(image('/hero.jpg', 'original'), 'https://image.tmdb.org/t/p/w780/hero.jpg');
    saveSetting('imageQuality', 'standard');
    assert.equal(image('/poster.jpg'), 'https://image.tmdb.org/t/p/w342/poster.jpg');
  }
);
test(
  'disabling cache bypasses existing catalog and sports caches',
  async t => {
    setup(t, {      
sf_streams: {        
expiry: Date.now() + 60000, data: [
          { id: 'old' }
        ]      
}    
});
    let count = 0;
    t.mock.method(globalThis, 'fetch', async () => {
      count++;
      return Response.json([
        { id: 'new' }
      ]);
    });
    await requestJSON('https://example.test/cache');
    await requestJSON('https://example.test/cache');
    assert.equal(count, 1);
    saveSetting('cacheEnabled', false);
    await requestJSON('https://example.test/cache');
    await requestJSON('https://example.test/cache');
    assert.deepEqual(await fetchCached('sf_streams', '/matches/all', 5), [
      { id: 'new' }
    ]);
    assert.equal(count, 4);
  }
);
test(
  'source memory can be disabled without deleting previous choices',
  t => {
    const data = setup(t, {      
DEF_SRC: [
        { id: 42, value: 8 }
      ]    
});
    saveSetting('defaultSource', 11);
    saveSetting('rememberSource', false);
    assert.equal(sourceFor(42), 11);
    saveSource(42, 3);
    assert.deepEqual(JSON.parse(data.get('DEF_SRC')), [
      { id: 42, value: 8 }
    ]);
    saveSetting('rememberSource', true);
    assert.equal(sourceFor(42), 8);
  }
);
test(
  'anime audio preferences affect both embed URLs and explicit choices take priority',
  t => {
    setup(t);
    saveSetting('animeAudio', 'dub');
    assert.match(sourceUrl(100, 'tv', 42, 1, 2, {}, 2), /\/dub$/);
    assert.match(sourceUrl(101, 'tv', 42, 1, 2, {}, 2), /\/1$/);
    saveSetting('animeAudio', 'sub');
    assert.match(sourceUrl(101, 'tv', 42, 1, 2, {}, 2), /\/0$/);
    assert.match(sourceUrl(100, 'tv', 42, 1, 2, { format: 'dub' }, 2), /\/dub$/);
  }
);
test(
  'targeted data actions preserve bookmarks, preferences and unrelated keys',
  t => {
    const data = setup(
      t,
      {
        history: [
          { id: 1 }
        ],
        watching: [
          { id: 1 }
        ],
        bookmarks: [
          { id: 2 }
        ],
        DEF_SRC: [
          { id: 1, value: 8 }
        ],
        1: 8,
        other: 'untouched',
        app_settings: { theme: 'light' },
        sf_categories: { data: [] },
        sf_streams: { data: [] }
      }
    );
    clearActivity();
    assert.deepEqual(JSON.parse(data.get('history')), []);
    assert.deepEqual(JSON.parse(data.get('watching')), []);
    forgetSources();
    assert.equal(data.has('1'), false);
    assert.deepEqual(JSON.parse(data.get('DEF_SRC')), []);
    clearCaches();
    assert.equal(data.has('sf_categories'), false);
    assert.equal(data.has('sf_streams'), false);
    assert.deepEqual(JSON.parse(data.get('bookmarks')), [
      { id: 2 }
    ]);
    assert.deepEqual(JSON.parse(data.get('app_settings')), { theme: 'light' });
    assert.equal(JSON.parse(data.get('other')), 'untouched');
  }
);
test(
  'connection diagnostics call fetch and report individual service failures',
  async t => {
    setup(t);
    const urls = [];
    t.mock.method(
      globalThis,
      'fetch',
      async url => {
        urls.push(url);
        return String(url).includes('streamed.st') ? new Response('', { status: 503 }) : Response.json({ genres: [] });
      }
    );
    const results = await checkConnections(new AbortController().signal);
    assert.equal(urls.length, 2);
    assert.equal(results[0].ok, true);
    assert.equal(results[1].ok, false);
    assert.match(results[1].message, /503/);
  }
);
