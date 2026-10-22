import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { request } from '../tests/helpers/http.mjs';
import server from '../server-preact.js';

await readFile('dist/.build-complete');
const app = await server.createApp();
const html = await readFile('dist/index.html', 'utf8');
const routes = [
  '/',
  '/movie?id=42',
  '/tv?id=42',
  '/person?id=42',
  '/explore',
  '/search?q=a%26b',
  '/library',
  '/settings',
  '/sports',
  '/tools',
  '/watch/movie/42',
  '/watch/tv/42/0/1'
];
for (const path of routes) {
  const result = await request(app, path);
  assert.equal(result.status, 200, path);
  assert.ok(result.output.includes(html), path);
}
const files = await readdir('dist', { recursive: true, withFileTypes: true });
let assets = 0;
for (const file of files) {
  if (!file.isFile() || file.name.startsWith('.') || file.name === 'index.html') continue;
  const relative = `${file.parentPath}/${file.name}`.replace(/^dist\//, '');
  if (process.env.DEBUG) console.log(relative);
  const result = await request(app, `/${relative}`, { accept: '*/*' });
  assert.equal(result.status, 200, relative);
  assert.doesNotMatch(result.headers['content-type'], /text\/html/, relative);
  if (relative.endsWith('.js')) {
    assert.ok(relative.startsWith('build/'), `Legacy script in output: ${relative}`);
    assert.match(result.headers['content-type'], /javascript/);
  }
  assert.ok(!relative.endsWith('.html'), `Legacy HTML in output: ${relative}`);
  assets++;
}
for (const path of ['/api/movie', '/fetch', '/ws', '/build/missing.js', '/script.js']) {
  const result = await request(app, path);
  assert.equal(result.status, 404, path);
  assert.ok(!result.output.includes(html), path);
}
assert.equal((await request(app, '/unknown')).status, 404);
console.log(
  `Production artifact check passed: ${routes.length} document routes, ${assets} assets, reserved/missing paths and legacy exclusion. No browser was used.`
);
