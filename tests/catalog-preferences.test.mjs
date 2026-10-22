import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSettings, saveSetting, getSettings } from '../src/features/settings/preferences.js';
import { discoveryPolicy, permitsBasic, permitsCertification, filterCatalogResults, isBlocked } from '../src/services/catalogPolicy.js';
import { resolutionFor, imageConfiguration, loadImageConfiguration } from '../src/services/images.js';
import { tmdb, clearRequestCache, metadata } from '../src/services/api.js';
import { sourceUrl } from '../src/features/watch/source.js';
import { defaultFilters } from '../src/features/explore/filters.js';

function storage(t, values = {}) {
  const previous = globalThis.localStorage;
  const data = new Map([['app_settings', JSON.stringify(values)]]);
  globalThis.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  t.after(() => {
    globalThis.localStorage = previous;
    clearRequestCache();
  });
  clearRequestCache();
}

test(
  'discovery enforces 200 votes by default and explicitly selected language exceptions',
  t => {
    storage(t);
    assert.equal(discoveryPolicy('movie', { 'vote_count.gte': 0 })['vote_count.gte'], 200);
    saveSetting('lowVoteLanguages', ['ml']);
    saveSetting('lowVoteCount', 20);
    assert.equal(discoveryPolicy('movie', { with_original_language: 'ml' })['vote_count.gte'], 20);
    assert.equal(
      discoveryPolicy('movie', { 'vote_count.gte': 200, with_original_language: 'ml' })['vote_count.gte'],
      20
    );
    assert.equal(
      discoveryPolicy('movie', { 'vote_count.gte': 1000, with_original_language: 'ml' })['vote_count.gte'],
      1000
    );
    assert.equal(discoveryPolicy('movie', { with_original_language: 'en' })['vote_count.gte'], 200);
    assert.equal(defaultFilters({ lang: 'ml' }).votes, 20);
    assert.equal(permitsBasic({
      id: 1,
      original_language: 'en',
      vote_count: 30,
      vote_average: 8
    }, 'movie'), false);
    assert.equal(permitsBasic({
      id: 1,
      original_language: 'ml',
      vote_count: 30,
      vote_average: 8
    }, 'movie'), true);
  }
);
test(
  'language/country filters can be removed and genre exclusions take priority',
  () => {
    const settings = normalizeSettings(
      {
        filterLanguages: ['en', 'hi'],
        filterCountries: ['IN', 'US'],
        movieGenres: [18, 35],
        excludedMovieGenres: [27],
        minVotes: 0
      }
    );
    const params = discoveryPolicy('movie', {}, settings);
    assert.equal(params.with_original_language, '');
    assert.equal(params.with_origin_country, '');
    assert.equal(params.with_genres, '18|35');
    assert.equal(params.without_genres, '27');
    assert.equal(permitsBasic({
      id: 1,
      genre_ids: [18, 27],
      original_language: 'hi'
    }, 'movie', settings), false);
    assert.equal(permitsBasic({
      id: 1,
      genre_ids: [35],
      original_language: 'hi'
    }, 'movie', settings), true);
    assert.equal(
      discoveryPolicy('movie', {}, normalizeSettings({ filterLanguages: [], filterCountries: [] })).with_original_language,
      ''
    );
  }
);
test(
  'adult flags and maturity certificates are distinct, including unrated behavior',
  () => {
    const settings = normalizeSettings({ hideMature: true });
    assert.equal(permitsBasic({ id: 1, adult: true }, 'movie', settings), false);
    const movie = rating => ({      
release_dates: {        
results: [
          {            
iso_3166_1: 'US', release_dates: [
              { certification: rating }
            ]          
}
        ]      
}    
});
    assert.equal(permitsCertification(movie('R'), 'movie', settings), false);
    assert.equal(permitsCertification(movie('PG-13'), 'movie', settings), true);
    assert.equal(
      permitsCertification({        
content_ratings: {          
results: [
            { iso_3166_1: 'US', rating: 'TV-MA' }
          ]        
}      
}, 'tv', settings),
      false
    );
    assert.equal(permitsCertification({}, 'tv', settings), true);
    assert.equal(permitsCertification({}, 'tv', { ...settings, hideUnrated: true }), false);
  }
);
test(
  'country and certification lookups preserve order and limit concurrency',
  async () => {
    const settings = normalizeSettings({
      filterCountries: ['IN'],
      hideMature: true,
      hideUnrated: true,
      minVotes: 0
    });
    let active = 0,
      peak = 0;
    const results = await filterCatalogResults(
      Array.from({ length: 9 }, (_, i) => ({ id: i + 1, media_type: 'movie' })),
      'movie',
      async (_, id) => {
        active++;
        peak = Math.max(peak, active);
        await new Promise(resolve => setTimeout(resolve, 1));
        active--;
        return {
          production_countries: [
            { iso_3166_1: id % 2 ? 'IN' : 'US' }
          ],
          release_dates: {            
results: [
              {                
iso_3166_1: 'US', release_dates: [
                  { certification: 'PG' }
                ]              
}
            ]          
}
        };
      },
      settings
    );
    assert.deepEqual(results.map(x => x.id), [1, 3, 5, 7, 9]);
    assert.ok(peak <= 4);
  }
);
test(
  'blacklisted IDs are excluded and direct metadata/player requests are blocked before fetch',
  async t => {
    storage(t, {      
blacklist: [
        { type: 'movie', id: 42 },
        { type: 'all', id: 99 }
      ]    
});
    assert.equal(isBlocked('movie', 42), true);
    assert.equal(isBlocked('tv', 42), false);
    assert.equal(isBlocked('person', 99), true);
    let called = false;
    t.mock.method(globalThis, 'fetch', async () => {
      called = true;
      return Response.json({});
    });
    await assert.rejects(metadata('movie', 42), /blocked/);
    assert.throws(() => sourceUrl(1, 'movie', 42), /blocked/);
    assert.equal(called, false);
  }
);
test(
  'custom source templates validate URLs and substitute encoded route fields',
  t => {
    storage(t);
    saveSetting('customSource', 'https://embed.example/{type}/{id}?s={season}&e={episode}');
    assert.equal(sourceUrl(900, 'tv', 42, 0, 3), 'https://embed.example/tv/42?s=0&e=3');
    assert.equal(normalizeSettings({ customSource: 'javascript:alert(1)' }).customSource, '');
    assert.equal(
      normalizeSettings({ customSource: 'https://user:secret@example.com/{id}' }).customSource,
      ''
    );
  }
);
test(
  'image resolutions use supported configuration sizes independently',
  () => {
    const settings = normalizeSettings({ imageQuality: 'saver', imageResolutions: { poster: 'original', backdrop: 'w780' } });
    assert.equal(resolutionFor('poster', settings), 'original');
    assert.equal(resolutionFor('backdrop', settings), 'w780');
    assert.equal(resolutionFor('still', settings), 'w185');
    assert.equal(resolutionFor('profile', settings, { profile_sizes: ['w45', 'h632', 'original'] }), 'w45');
  }
);
test(
  'image configuration is requested from TMDB and validates response shape',
  async t => {
    storage(t);
    const config = imageConfiguration();
    let url;
    t.mock.method(
      globalThis,
      'fetch',
      async value => {
        url = new URL(value, 'http://localhost');
        return Response.json({ images: config });
      }
    );
    await loadImageConfiguration(new AbortController().signal);
    assert.equal(url.pathname, '/api/tmdb/configuration');
  }
);
test(
  'custom sections, providers and numeric preferences survive normalization',
  t => {
    storage(t);
    saveSetting(
      'homeSections',
      [
        {
          id: 'section-a',
          title: 'Tamil films',
          type: 'movie',
          language: 'ta',
          country: 'IN',
          provider: '8',
          genre: '18',
          sort: 'vote_average.desc'
        }
      ]
    );
    saveSetting('homeProviders', []);
    saveSetting('minRating', 7.3);
    assert.equal(getSettings().homeSections[0].language, 'ta');
    assert.deepEqual(getSettings().homeProviders, []);
    assert.equal(getSettings().minRating, 7.3);
  }
);
test(
  'discover requests include provider filters and the configured vote floor',
  async t => {
    storage(t);
    let requested;
    t.mock.method(
      globalThis,
      'fetch',
      async url => {
        requested = new URL(url, 'http://localhost');
        return Response.json({ results: [], total_pages: 0 });
      }
    );
    await tmdb('discover/movie', { with_watch_providers: 8, 'vote_count.gte': 60 });
    assert.equal(requested.searchParams.get('with_watch_providers'), '8');
    assert.equal(requested.searchParams.get('vote_count.gte'), '200');
  }
);
