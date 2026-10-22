import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  migrateStorage,
  logs,
  saveLog,
  removeLog,
  progressFor,
  importData,
  exportData,
  clearData,
  sourceFor
} from '../src/stores/storage.js';

class MemoryStorage {
  data = new Map();
  get length() {
    return this.data.size;
  }
  key(index) {
    return [...this.data.keys()][index] ?? null;
  }
  getItem(key) {
    return this.data.get(String(key)) ?? null;
  }
  setItem(key, value) {
    this.data.set(String(key), String(value));
  }
  removeItem(key) {
    this.data.delete(String(key));
  }
}
beforeEach(() => {
  globalThis.localStorage = new MemoryStorage();
});
const record = {
  mediaType: 'tv',
  id: 42,
  index: 123,
  progress: 32.5,
  data: { sno: '2', eno: '3' }
};
const put = (key, value) => localStorage.setItem(key, JSON.stringify(value));

test(
  'migration retains original records, settings and unrelated data byte for byte',
  () => {
    put('history', [record]);
    put('bookmarks', [
      {
        ...record,
        data: { sno: null, eno: null },
        progress: null
      }
    ]);
    put('app_settings', { profile: { name: 'Existing user' }, autoplay: false });
    localStorage.setItem('unrelated', 'not-json');
    localStorage.setItem('42', '2');
    const before = new Map(localStorage.data);
    migrateStorage();
    migrateStorage();
    for (const [key, value] of before) assert.equal(localStorage.getItem(key), value, key);
    assert.deepEqual(logs('watching'), [record]);
    assert.equal(sourceFor(42), 2);
    assert.equal(logs('DEF_SRC').length, 1);
  }
);
test(
  'existing Continue Watching and source choice take precedence',
  () => {
    put('history', [record]);
    put('watching', []);
    put('DEF_SRC', [
      { id: 42, value: 8 }
    ]);
    localStorage.setItem('42', '2');
    migrateStorage();
    assert.deepEqual(logs('watching'), []);
    assert.equal(sourceFor('42'), 8);
  }
);
test(
  'same playback session updates one history entry and keeps other sessions',
  () => {
    put('history', [
      record,
      { ...record, index: 100 }
    ]);
    saveLog('history', {
      id: '42',
      mediaType: 'tv',
      sno: 2,
      eno: 3,
      progress: 50,
      index: 123
    });
    assert.equal(logs('history').length, 2);
    assert.equal(progressFor('tv', 42, '2', 3), 50);
    removeLog('history', 'tv', 42, 2, 3, 100);
    assert.equal(logs('history').length, 1);
  }
);
test(
  'Continue Watching advances episodes without resetting history',
  () => {
    put('history', [record]);
    put('watching', [record]);
    saveLog('watching', {
      id: 42,
      mediaType: 'tv',
      sno: 2,
      eno: 4
    });
    assert.equal(logs('watching').length, 1);
    assert.equal(logs('watching')[0].data.eno, '4');
    assert.deepEqual(logs('history'), [record]);
  }
);
test(
  'special season zero, empty values, and null progress survive storage',
  () => {
    saveLog('history', {
      id: 42,
      mediaType: 'tv',
      sno: 0,
      eno: 1,
      progress: null,
      index: 0
    });
    assert.deepEqual(
      logs('history')[0],
      {
        ...record,
        index: 0,
        progress: null,
        data: { sno: '0', eno: '1' }
      }
    );
  }
);
test(
  'completed movie remains watched across subsequent incomplete sessions',
  () => {
    put(
      'history',
      [
        {
          ...record,
          mediaType: 'movie',
          progress: 100
        },
        {
          ...record,
          mediaType: 'movie',
          index: 456,
          progress: 10
        }
      ]
    );
    assert.equal(progressFor('movie', 42), 100);
  }
);
test(
  'backup merging retains old records and replacement retains unrelated storage',
  () => {
    put('history', [record]);
    put('bookmarks', [record]);
    localStorage.setItem('other-app', 'keep');
    importData({      
history: [
        { ...record, index: 456 }
      ]    
});
    assert.equal(logs('history').length, 2);
    importData({ history: [record] }, false);
    assert.deepEqual(logs('history'), [record]);
    assert.equal(localStorage.getItem('bookmarks'), null);
    assert.equal(localStorage.getItem('other-app'), 'keep');
    assert.deepEqual(exportData().history, [record]);
  }
);
test(
  'invalid backup is rejected before touching storage',
  () => {
    put('history', [record]);
    const before = [...localStorage.data];
    assert.throws(() => importData({ history: 'bad' }, false), /Invalid history/);
    assert.deepEqual([...localStorage.data], before);
  }
);
test(
  'failed import rolls back all application keys',
  () => {
    put('history', [record]);
    put('bookmarks', [record]);
    const before = new Map(localStorage.data);
    const set = localStorage.setItem.bind(localStorage);
    let fail = true;
    localStorage.setItem = (key, value) => {
      if (key === 'bookmarks' && fail) {
        fail = false;
        throw new Error('Quota exceeded');
      }
      set(key, value);
    };
    assert.throws(() => importData({ history: [], bookmarks: [] }, false), /Quota/);
    assert.deepEqual(new Map(localStorage.data), before);
  }
);
test(
  'explicit clear removes only application data',
  () => {
    put('history', [record]);
    put('app_settings', { theme: 'light' });
    localStorage.setItem('other-app', 'keep');
    clearData();
    assert.equal(localStorage.getItem('history'), null);
    assert.equal(localStorage.getItem('other-app'), 'keep');
  }
);
test(
  'malformed source storage is never rewritten during startup',
  () => {
    localStorage.setItem('DEF_SRC', '{broken');
    localStorage.setItem('42', '2');
    migrateStorage();
    assert.equal(localStorage.getItem('DEF_SRC'), '{broken');
  }
);
test(
  'malformed backup rows and empty backups cannot clear existing data',
  () => {
    put('history', [record]);
    for (const backup of [
      {},
      { history: [null] },
      {        
bookmarks: [
          { id: 'bad' }
        ]      
}
    ]) assert.throws(() => importData(backup, false));
    assert.deepEqual(logs('history'), [record]);
  }
);
test(
  'backups from numeric source-key versions import compatible source choices',
  () => {
    importData({ '42': 8, history: [record] });
    assert.equal(sourceFor(42), 8);
  }
);
