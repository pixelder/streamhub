import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../server.js';
import { request } from './helpers/http.mjs';

test(
  'original server serves public HTML without the Preact shell',
  async () => {
    for (const path of [
      '/',
      '/movie?id=42',
      '/tv?id=42',
      '/person?id=42',
      '/explore/index.html',
      '/library/index.html',
      '/sports/index.html',
      '/tools/index.html'
    ]) {
      const response = await request(app, path);
      assert.equal(response.status, 200, path);
      assert.match(response.output, /<html/i, path);
      assert.doesNotMatch(response.output, /\/src\/main\.jsx|\/build\/index-/, path);
    }
  }
);

test(
  'original EJS search, watch and 404 routes still render',
  async () => {
    for (const [path, script] of [
      ['/search?q=Arrival', '/search/search.js'],
      ['/watch/movie/42', '/watch/watch.js'],
      ['/watch/tv/42/0/1', '/watch/watch.js']
    ]) {
      let response = await request(app, path);
      // Preserve express.static's original directory redirect for /search.
      if (response.status === 301) response = await request(app, response.headers.location);
      assert.equal(response.status, 200, path);
      assert.ok(response.output.includes(script), path);
    }
    assert.equal((await request(app, '/unknown-page')).status, 404);
  }
);

test(
  'original server mounts the shared proxy ahead of the legacy 404 handler',
  async t => {
    const previous = process.env.TMDB_READ_ACCESS_TOKEN;
    process.env.TMDB_READ_ACCESS_TOKEN = 'fixture-token';
    t.after(
      () => {
        if (previous === undefined) delete process.env.TMDB_READ_ACCESS_TOKEN;
        else process.env.TMDB_READ_ACCESS_TOKEN = previous;
      }
    );
    t.mock.method(
      globalThis,
      'fetch',
      async (url, options) => {
        assert.equal(new URL(url).hostname, 'api.tmdb.org');
        assert.equal(options.headers.authorization, 'Bearer fixture-token');
        return Response.json({ results: [] });
      }
    );
    const response = await request(app, '/api/tmdb/trending/movie/week');
    assert.equal(response.status, 200);
    assert.match(response.headers['content-type'], /application\/json/);
    assert.equal((await request(app, '/api/tmdb/configuration', { method: 'POST' })).status, 405);
  }
);
