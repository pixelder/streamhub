import test from 'node:test';
import assert from 'node:assert/strict';
import { requestJSON, search, clearRequestCache } from '../src/services/api.js';

test(
  'search encodes terms once and successful GET responses are cached',
  async t => {
    clearRequestCache();
    const urls = [];
    t.mock.method(
      globalThis,
      'fetch',
      async url => {
        urls.push(url);
        return Response.json({          
results: [
            { id: 1 }
          ]        
});
      }
    );
    const term = 'A&B / 日本';
    await search(term, 'movie');
    await search(term, 'movie');
    assert.equal(urls.length, 1);
    assert.equal(new URL(urls[0], 'http://localhost').searchParams.get('query'), term);
    assert.match(urls[0], /^\/api\/tmdb\/search\/movie\?/);
  }
);

test(
  'a cancellable request cannot remove another request from pending deduplication',
  async t => {
    clearRequestCache();
    const completions = [];
    t.mock.method(globalThis, 'fetch', () => new Promise(resolve => completions.push(resolve)));
    const url = 'https://example.test/race';
    const shared = requestJSON(url, { ttl: 0 });
    const separate = requestJSON(url, { signal: new AbortController().signal, ttl: 0 });
    completions[1](Response.json({ id: 2 }));
    await separate;
    const duplicate = requestJSON(url, { ttl: 0 });
    assert.equal(completions.length, 2);
    completions[0](Response.json({ id: 1 }));
    assert.deepEqual(await shared, { id: 1 });
    assert.deepEqual(await duplicate, { id: 1 });
  }
);

test(
  'failed HTTP responses are surfaced and are not cached',
  async t => {
    clearRequestCache();
    let calls = 0;
    t.mock.method(
      globalThis,
      'fetch',
      async () => {
        calls++;
        return calls === 1 ? new Response('', { status: 503 }) : Response.json({ ok: true });
      }
    );
    const url = 'https://example.test/recovery';
    await assert.rejects(requestJSON(url), /503/);
    assert.deepEqual(await requestJSON(url), { ok: true });
    assert.equal(calls, 2);
  }
);
