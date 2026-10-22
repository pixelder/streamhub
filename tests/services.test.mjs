import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceUrl, playbackProgress, episodeNumber } from '../src/features/watch/source.js';
import { providers } from '../src/features/watch/providers.js';
import { defaultFilters, resolvePreset, discoverParams, changeGenre } from '../src/features/explore/filters.js';
import { buildPayload, readRecords, upsertFile } from '../src/features/tools/service.js';
import { partitionMatches, dateHeader, posterUrl, LIVE_THRESHOLD, FALLBACK_POSTER } from '../src/features/sports/service.js';
import { matchRoute, isServerPath } from '../src/app/routes.js';

test(
  'all 13 original provider IDs resolve and keep TV path/query parameters',
  () => {
    assert.deepEqual(
      providers.map(item => Number(item.ds)).sort((a, b) => a - b),
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 100, 101]
    );
    for (const provider of providers) assert.match(sourceUrl(provider.ds, 'tv', 42, 2, 3, {}, 15), /^https:\/\//);
    assert.equal(
      sourceUrl(7, 'tv', 42, 2, 3),
      'https://primewire.tf/embed/tv?tmdb=42&season=2&episode=3'
    );
    assert.equal(
      sourceUrl(2, 'movie', 42, null, null, { version: 3 }),
      'https://vidsrc.cc/v3/embed/movie/42'
    );
    assert.equal(
      sourceUrl(100, 'tv', 42, 2, 3, { format: 'dub' }, 15),
      'https://vidsrc.cc/v2/embed/anime/ani42/15/dub'
    );
    assert.equal(
      sourceUrl(101, 'tv', 42, 2, 3, { format: '0' }, 15),
      'https://vidsrc.icu/embed/anime/42/15/0'
    );
    assert.throws(() => sourceUrl(999, 'movie', 42), /Invalid source/);
  }
);
test(
  'anime cumulative episode numbering excludes specials',
  () => {
    assert.equal(
      episodeNumber(
        {
          seasons: [
            { season_number: 0, episode_count: 5 },
            { season_number: 1, episode_count: 12 },
            { season_number: 2, episode_count: 10 }
          ]
        },
        '2',
        '3'
      ),
      15
    );
  }
);
test(
  'playback messages accept both protocols and reject invalid progress',
  () => {
    assert.equal(playbackProgress({ event: 'timeupdate', data: { currentTime: 33, duration: 100 } }), 33);
    assert.equal(playbackProgress({ type: 'MEDIA_DATA', data: { currentTime: 123, duration: 200 } }), 61.5);
    for (const message of [
      null,
      {},
      { event: 'play' },
      { event: 'timeupdate', data: { currentTime: 1, duration: 0 } },
      { event: 'timeupdate', data: { currentTime: 101, duration: 100 } }
    ]) assert.equal(playbackProgress(message), null);
  }
);
test(
  'filters enforce configured minimums while preserving studio and anime presets',
  () => {
    const filters = defaultFilters({
      minRating: 0,
      voteCount: 0,
      company: '420'
    });
    const params = discoverParams(filters, 2);
    assert.equal(params['vote_average.gte'], 5);
    assert.equal(params['vote_count.gte'], 200);
    assert.equal(params.with_companies, '420');
    assert.equal(params.page, 2);
    const anime = resolvePreset({ type: 'anime' });
    assert.equal(anime.type, 'tv');
    assert.equal(anime.lang, 'ja');
    const studio = resolvePreset({
      type: 'studio',
      title: 'Custom Television',
      company: '123'
    });
    assert.equal(studio.type, 'tv');
    assert.equal(studio.company, '123');
  }
);
test(
  'genre inclusion/exclusion is mutually exclusive and reversible',
  () => {
    let filters = changeGenre(defaultFilters(), 16);
    assert.deepEqual(filters.genres, [16]);
    filters = changeGenre(filters, 16, true);
    assert.deepEqual(filters.genres, []);
    assert.deepEqual(filters.excluded, [16]);
    filters = changeGenre(filters, 16);
    assert.deepEqual(filters.excluded, []);
  }
);
test(
  'extractor payload keeps original protocol and byte size limit',
  () => {
    const form = {
      mediaType: 'tv',
      name: ' Silo ',
      season: '1',
      episode: '0',
      server: 'bravo',
      maxsize: '4'
    };
    assert.deepEqual(
      buildPayload(form),
      {
        mediaType: 'tv',
        name: 'Silo',
        season: '1',
        episode: '',
        server: 'bravo',
        limit: 4 * 1024 ** 3
      }
    );
    assert.throws(() => buildPayload({ ...form, season: '' }), /Season/);
    assert.throws(() => buildPayload({
      ...form,
      mediaType: 'movie',
      year: ''
    }), /Year/);
  }
);
test(
  'NDJSON handles every byte boundary and a final record without newline',
  async () => {
    const expected = [
      {        
status: 'raw', results: [
          { file_name: '日本語' }
        ]      
},
      { status: 'file', result: { id: 'x', url: 'https://example.com' } }
    ];
    const bytes = new TextEncoder().encode(expected.map(value => JSON.stringify(value)).join('\n'));
    const body = new ReadableStream({
      start(controller) {
        for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
        controller.close();
      }
    });
    const actual = [];
    await readRecords(body, value => actual.push(value));
    assert.deepEqual(actual, expected);
  }
);
test(
  'invalid streaming JSON surfaces an error',
  async () => {
    await assert.rejects(readRecords(new Response('{broken}').body, () => { }), SyntaxError);
  }
);
test(
  'stream cancellation rejects and releases the reader',
  async () => {
    const controller = new AbortController();
    controller.abort();
    const body = new Response('{}').body;
    await assert.rejects(readRecords(body, () => { }, controller.signal), { name: 'AbortError' });
    assert.equal(body.locked, false);
  }
);
test(
  'resolved extractor record replaces its selected row and retains metadata',
  () => {
    let rows = upsertFile([], {
      file_name: 'Film',
      size: '2GB',
      link: 'https://source.example'
    }, 'select');
    const id = rows[0].id;
    rows = upsertFile(rows, { id, url: 'https://download.example' });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].file_name, 'Film');
    assert.equal(rows[0].url, 'https://download.example');
    assert.equal(rows[0].option, null);
  }
);
test(
  'sports live cutoff, popularity, category normalization and team search',
  () => {
    const now = 1_000_000;
    const matches = [
      {
        id: 'a',
        date: now + LIVE_THRESHOLD,
        category: 'american-football',
        popular: false
      },
      {
        id: 'b',
        date: now,
        category: 'American Football',
        popular: true,
        teams: { home: { name: 'Eagles' } }
      },
      {
        id: 'c',
        date: now + LIVE_THRESHOLD + 1,
        category: 'american_football'
      }
    ];
    const result = partitionMatches(matches, 'americanfootball', '', now);
    assert.deepEqual(result.live.map(m => m.id), ['b', 'a']);
    assert.deepEqual(result.upcoming.map(m => m.id), ['c']);
    assert.equal(partitionMatches(matches, 'all', 'EAGLES', now).live[0].id, 'b');
  }
);
test(
  'sports posters and day grouping keep original formats',
  () => {
    assert.equal(posterUrl(null), FALLBACK_POSTER);
    assert.equal(posterUrl('abc'), 'https://streamed.st/api/images/proxy/abc.webp');
    const today = new Date(2026, 9, 19, 12).getTime();
    assert.equal(dateHeader(today, today), 'TODAY');
    assert.equal(dateHeader(today + 86_400_000, today), 'TOMORROW');
  }
);
test(
  'all existing route aliases, deep links and API exclusions are recognized',
  () => {
    for (const page of ['explore', 'search', 'library', 'settings', 'sports', 'tools']) for (const suffix of ['', '/', '/index.html']) assert.equal(matchRoute(`/${page}${suffix}`).name, page);
    for (const path of ['/', '/index.html', '/movie', '/tv/', '/person']) assert.equal(matchRoute(path).name, 'home');
    assert.deepEqual(
      matchRoute('/watch/tv/42/0/1').props,
      {
        mediaType: 'tv',
        id: '42',
        season: '0',
        episode: '1'
      }
    );
    assert.equal(matchRoute('/watch/movie/42').name, 'watch');
    assert.equal(matchRoute('/watch/tv/42').name, 'not-found');
    for (const path of ['/api/search', '/fetch', '/ws', '/assets/missing.png', '/sports/missing.css']) assert.equal(isServerPath(path), true);
    assert.equal(isServerPath('/search/index.html'), false);
  }
);
