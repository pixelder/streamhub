import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from './helpers/http.mjs';
import server from '../server-preact.js';

let root,
  app;
before(
  async () => {
    root = await mkdtemp(join(tmpdir(), 'streamhub-routes-'));
    await mkdir(join(root, 'dist', 'build'), { recursive: true });
    await writeFile(join(root, 'dist', 'index.html'), '<!doctype html><div id="app">fixture shell</div>');
    await writeFile(join(root, 'dist', 'build', 'app.js'), 'console.log("fixture asset")');
    app = await server.createApp({ root });
  }
);
after(async () => rm(root, { recursive: true, force: true }));

test(
  'Express serves every route and legacy alias on direct navigation',
  async () => {
    for (const path of [
      '/',
      '/index.html',
      '/movie?id=42',
      '/tv?id=42',
      '/person?id=42',
      '/search?q=a%26b',
      '/settings',
      '/watch/movie/42',
      '/watch/tv/42/1/2',
      '/watch/tv/42/0/1',
      '/explore',
      '/explore/',
      '/explore/index.html',
      '/profile',
      '/profile?view=tracking',
      '/profile?view=collections',
      '/profile/',
      '/library',
      '/library/',
      '/sports',
      '/sports/index.html',
      '/tools/',
      '/tools/index.html'
    ]) {
      const result = await request(app, path);
      assert.equal(result.status, 200, path);
      assert.match(result.headers['content-type'], /text\/html/, path);
      assert.match(result.output, /fixture shell/, path);
    }
  }
);
test(
  'unknown documents return a real 404 with the frontend not-found shell',
  async () => {
    const result = await request(app, '/does-not-exist');
    assert.equal(result.status, 404);
    assert.match(result.output, /fixture shell/);
  }
);
test(
  'API, WebSocket and missing asset paths never receive the SPA shell',
  async () => {
    for (const path of [
      '/api/movie',
      '/fetch',
      '/ws',
      '/socket.io',
      '/assets/missing.svg',
      '/sports/missing.css',
      '/build/missing.js'
    ]) {
      const result = await request(app, path);
      assert.equal(result.status, 404, path);
      assert.doesNotMatch(result.output, /fixture shell/, path);
      assert.match(result.headers['content-type'], /text\/plain/, path);
    }
  }
);
test(
  'TMDB proxy requires a server token and rejects unsupported methods and paths',
  async () => {
    const previous = process.env.TMDB_READ_ACCESS_TOKEN;
    const previousKey = process.env.TMDB_API_KEY;
    delete process.env.TMDB_READ_ACCESS_TOKEN;
    delete process.env.TMDB_API_KEY;
    try {
      const missing = await request(app, '/api/tmdb/search/movie?query=film', { accept: 'application/json' });
      assert.equal(missing.status, 503);
      assert.match(missing.output, /not configured/);
      assert.equal(
        (await request(app, '/api/tmdb/search/movie', { method: 'POST', accept: 'application/json' })).status,
        405
      );
      assert.equal(
        (await request(app, '/api/tmdb/https%3A%2F%2Fevil.test', { accept: 'application/json' })).status,
        400
      );
      assert.equal(
        (await request(app, '/api/tmdb/search/movie?api_key=client-secret', { accept: 'application/json' })).status,
        400
      );
    } finally {
      if (previous === undefined) delete process.env.TMDB_READ_ACCESS_TOKEN;
      else process.env.TMDB_READ_ACCESS_TOKEN = previous;
      if (previousKey === undefined) delete process.env.TMDB_API_KEY;
      else process.env.TMDB_API_KEY = previousKey;
    }
  }
);
test(
  'TMDB proxy forwards an allowed request with the server bearer token',
  async t => {
    const previous = process.env.TMDB_READ_ACCESS_TOKEN;
    process.env.TMDB_READ_ACCESS_TOKEN = 'test-server-token';
    let requestUrl,
      requestOptions;
    t.mock.method(
      globalThis,
      'fetch',
      async (url, options) => {
        requestUrl = url;
        requestOptions = options;
        return Response.json({ results: [] });
      }
    );
    try {
      const result = await request(app, '/api/tmdb/search/movie?query=Arrival&page=2', { accept: 'application/json' });
      assert.equal(result.status, 200);
      assert.match(result.output, /\{"results":\[\]\}/);
      assert.match(requestUrl, /^https:\/\/api\.tmdb\.org\/3\/search\/movie\?/);
      assert.equal(new URL(requestUrl).searchParams.get('query'), 'Arrival');
      assert.equal(new URL(requestUrl).searchParams.get('page'), '2');
      assert.equal(requestOptions.headers.authorization, 'Bearer test-server-token');
      assert.doesNotMatch(requestUrl, /test-server-token/);
    } finally {
      if (previous === undefined) delete process.env.TMDB_READ_ACCESS_TOKEN;
      else process.env.TMDB_READ_ACCESS_TOKEN = previous;
    }
  }
);
test(
  'TMDB proxy supports a server-only v3 key from the existing environment variable',
  async t => {
    const previousToken = process.env.TMDB_READ_ACCESS_TOKEN;
    const previousKey = process.env.TMDB_API_KEY;
    process.env.TMDB_READ_ACCESS_TOKEN = '0123456789abcdef0123456789abcdef';
    delete process.env.TMDB_API_KEY;
    let requestUrl,
      requestOptions;
    t.mock.method(
      globalThis,
      'fetch',
      async (url, options) => {
        requestUrl = url;
        requestOptions = options;
        return Response.json({ ok: true });
      }
    );
    try {
      const result = await request(app, '/api/tmdb/trending/movie/week?language=en-US', { accept: 'application/json' });
      assert.equal(result.status, 200);
      assert.equal(new URL(requestUrl).searchParams.get('api_key'), '0123456789abcdef0123456789abcdef');
      assert.equal(requestOptions.headers.authorization, undefined);
      assert.doesNotMatch(result.output, /0123456789abcdef0123456789abcdef/);
    } finally {
      if (previousToken === undefined) delete process.env.TMDB_READ_ACCESS_TOKEN;
      else process.env.TMDB_READ_ACCESS_TOKEN = previousToken;
      if (previousKey === undefined) delete process.env.TMDB_API_KEY;
      else process.env.TMDB_API_KEY = previousKey;
    }
  }
);
test(
  'production assets are served with their actual MIME type',
  async () => {
    const result = await request(app, '/build/app.js');
    assert.equal(result.status, 200);
    assert.match(result.headers['content-type'], /javascript/);
    assert.match(result.output, /fixture asset/);
  }
);
test(
  'POST and JSON requests cannot be swallowed by the document fallback',
  async () => {
    assert.equal((await request(app, '/search', { method: 'POST' })).status, 404);
    assert.equal((await request(app, '/search', { accept: 'application/json' })).status, 404);
  }
);
test(
  'missing production build returns an actionable 503',
  async () => {
    const missing = await server.createApp({ root: join(root, 'missing') });
    const result = await request(missing, '/');
    assert.equal(result.status, 503);
    assert.match(result.output, /npm run build/);
  }
);
