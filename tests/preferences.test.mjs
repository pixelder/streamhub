import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSettings, saveSetting, resetSettings, getSettings, applyAppearance } from '../src/features/settings/preferences.js';
import { sourceFor } from '../src/stores/storage.js';

function storage(t, initial = {}) {
  const previous = globalThis.localStorage;
  const entries = new Map(Object.entries(initial).map(([key, value]) => [key, JSON.stringify(value)]));
  globalThis.localStorage = {
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value)
  };
  t.after(() => {
    globalThis.localStorage = previous;
  });
  return entries;
}

test(
  'preferences validate imported values and keep safe defaults',
  () => {
    const settings = normalizeSettings(
      {
        theme: 'invalid',
        textSize: 'huge',
        autoplay: 'false',
        carouselInterval: 900,
        defaultSource: '11',
        profile: { name: 'Rishi', avatar: 'javascript:alert(1)' }
      }
    );
    assert.equal(settings.theme, 'dark');
    assert.equal(settings.textSize, 'normal');
    assert.equal(settings.autoplay, true);
    assert.equal(settings.carouselInterval, 30);
    assert.equal(settings.defaultSource, 11);
    assert.deepEqual(settings.profile, { name: 'Rishi', avatar: null });
    assert.equal(normalizeSettings({ defaultSource: 4 }).defaultSource, 4);
    assert.equal(normalizeSettings(null).carouselInterval, 10);
    assert.equal(normalizeSettings({ carouselInterval: '' }).carouselInterval, 10);
  }
);

test(
  'saving preferences preserves unknown preferences and existing library data',
  t => {
    const entries = storage(
      t,
      {
        app_settings: {
          customKey: 'retained',
          profile: { name: 'Rishi' },
          autoplay: false
        },
        bookmarks: [
          { id: 42 }
        ],
        DEF_SRC: [
          { id: 42, value: 8 }
        ]
      }
    );
    const before = entries.get('bookmarks');
    saveSetting('theme', 'light');
    saveSetting('defaultSource', '11');
    assert.equal(getSettings().theme, 'light');
    assert.equal(getSettings().profile.name, 'Rishi');
    assert.equal(getSettings().autoplay, false);
    assert.equal(JSON.parse(entries.get('app_settings')).customKey, 'retained');
    assert.equal(entries.get('bookmarks'), before);
    assert.equal(sourceFor(42), 8);
    assert.equal(sourceFor(99), 11);
  }
);

test(
  'restoring defaults keeps library records and unrelated preference keys',
  t => {
    const entries = storage(t, {      
app_settings: { theme: 'light', customKey: 7 }, history: [
        { id: 42 }
      ]    
});
    const history = entries.get('history');
    resetSettings();
    assert.equal(getSettings().theme, 'dark');
    assert.equal(entries.get('history'), history);
    assert.equal(JSON.parse(entries.get('app_settings')).customKey, 7);
  }
);

test(
  'appearance follows system theme and motion preferences',
  () => {
    const properties = new Map();
    const root = { dataset: {}, style: { setProperty: (key, value) => properties.set(key, value) } };
    applyAppearance(
      normalizeSettings({
        theme: 'system',
        accent: 'violet',
        textSize: 'large',
        carouselInterval: 15
      }),
      { dark: false, reduced: true },
      root
    );
    assert.deepEqual(
      root.dataset,
      {
        theme: 'light',
        accent: 'violet',
        textSize: 'large',
        showRatings: 'true',
        reduceTransparency: 'false',
        hideSpoilers: 'false',
        navLabels: 'true',
        reducedMotion: 'true',
        carouselAuto: 'false'
      }
    );
    assert.equal(properties.get('--carousel-duration'), '15s');
    applyAppearance(normalizeSettings({ theme: 'system' }), { dark: true, reduced: false }, root);
    assert.equal(root.dataset.theme, 'dark');
    assert.equal(root.dataset.carouselAuto, 'true');
  }
);

test(
  'storage failures do not silently report successful preference writes',
  t => {
    storage(t, { app_settings: { theme: 'dark' } });
    localStorage.setItem = () => {
      throw new Error('Quota exceeded');
    };
    assert.throws(() => saveSetting('theme', 'light'), /Quota exceeded/);
    assert.equal(getSettings().theme, 'dark');
  }
);
