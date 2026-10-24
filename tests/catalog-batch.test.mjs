import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogBatch } from '../src/services/catalogBatch.js';

const titles = (start, length) => Array.from({ length }, (_, i) => ({ id: start + i, media_type: 'movie' }));

test('a filtered trending page is filled from subsequent pages and preserves the upstream cursor', async () => {
  const calls = [];
  const result = await catalogBatch(async page => {
    calls.push(page);
    return { results: titles(page * 20, 12), total_pages: 8, filtered: true };
  }, 1);
  assert.deepEqual(calls, [1, 2]);
  assert.equal(result.page, 2);
  assert.equal(result.results.length, 24);
  const next = await catalogBatch(async page => ({ results: titles(page * 20, 20), total_pages: 8 }), result.page + 1);
  assert.equal(next.page, 3);
  assert.equal(next.results[0].id, 60);
});

test('unfiltered pages need only one request and preserve source order', async () => {
  let count = 0;
  const expected = titles(1, 20);
  const result = await catalogBatch(async () => { count++; return { results: expected, total_pages: 9 }; }, 1);
  assert.equal(count, 1);
  assert.deepEqual(result.results, expected);
});

test('duplicates are removed without confusing a movie with a TV show of the same ID', async () => {
  const result = await catalogBatch(async page => ({
    results: page === 1 ? titles(1, 12) : [...titles(5, 16), { id: 1, media_type: 'tv' }], total_pages: 2
  }), 1);
  assert.equal(result.results.length, 21);
  assert.equal(result.results.at(-1).media_type, 'tv');
});

test('restrictive filters do not cause unbounded requests or skip the next unrequested page', async () => {
  const calls = [];
  const result = await catalogBatch(async page => { calls.push(page); return { results: [], total_pages: 100, filtered: true }; }, 3);
  assert.deepEqual(calls, [3, 4, 5, 6, 7]);
  assert.equal(result.page, 7);
  assert.equal(result.filtered, true);
  const end = await catalogBatch(async page => ({ results: titles(page, 1), total_pages: 2 }), 2);
  assert.equal(end.page, 2);
  assert.equal(end.results.length, 1);
});

test('aborting a batch stops subsequent requests, and request failures are not hidden', async () => {
  const controller = new AbortController();
  let count = 0;
  await assert.rejects(catalogBatch(async () => {
    count++; controller.abort(); return { results: [], total_pages: 20 };
  }, 1, { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(count, 1);
  await assert.rejects(catalogBatch(async () => { throw new Error('Request failed (504)'); }, 1), /504/);
});

test('a later page failure retains titles and points retry at the failed page', async () => {
  const result = await catalogBatch(async page => {
    if (page === 2) throw new Error('Request failed (429)');
    return { results: titles(1, 12), total_pages: 10, filtered: true };
  }, 1);
  assert.equal(result.results.length, 12);
  assert.equal(result.page + 1, 2);
  assert.match(result.batchError.message, /429/);
});
