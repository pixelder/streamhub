import test from 'node:test';
import assert from 'node:assert/strict';
import { preparePageStyles } from '../src/app/pageStyles.js';

function documentFixture() {
  const anchor = { name: 'application styles' };
  const nodes = [anchor];
  return {
    nodes,
    querySelector: () => anchor,
    head: {
      append: link => nodes.push(link),
      insertBefore: (link, target) => nodes.splice(nodes.indexOf(target), 0, link)
    },
    createElement: () => ({ remove() { const index = nodes.indexOf(this); if (index !== -1) nodes.splice(index, 1); } })
  };
}

test('page styles readiness waits for load, then cleanup removes its link', async () => {
  const document = documentFixture();
  const styles = preparePageStyles('library', document);
  let ready = false;
  styles.ready.then(() => { ready = true; });
  await Promise.resolve();
  assert.equal(ready, false);
  const link = document.nodes[1];
  assert.equal(link.href, '/library/styles.css');
  link.onload();
  await styles.ready;
  assert.equal(ready, true);
  styles.dispose();
  assert.equal(document.nodes.length, 1);
  assert.equal(link.onload, null);
});

test('sports CSS stays before the application stylesheet anchor', async () => {
  const document = documentFixture();
  const styles = preparePageStyles('sports', document);
  assert.equal(document.nodes[0].href, '/sports/styles.css');
  document.nodes[0].onload();
  await styles.ready;
  styles.dispose();
});

test('failed CSS rejects readiness and a fresh route attempt can recover', async () => {
  const document = documentFixture();
  const styles = preparePageStyles('search', document);
  const rejected = assert.rejects(styles.ready, /could not be loaded/);
  document.nodes[1].onerror();
  await rejected;
  styles.dispose();
  const retry = preparePageStyles('search', document);
  document.nodes[1].onload();
  await retry.ready;
  retry.dispose();
});

test('navigation cancels pending stylesheet work and removes optional font links', async () => {
  const document = documentFixture();
  const styles = preparePageStyles('tools', document);
  assert.equal(document.nodes.length, 3);
  styles.dispose();
  await styles.ready;
  assert.equal(document.nodes.length, 1);
});
