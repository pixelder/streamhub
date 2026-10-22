import { readdir, readFile, access } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import { transformWithOxc } from 'vite';

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(
    entries.map(
      entry => entry.isDirectory() ? files(`${directory}/${entry.name}`) : `${directory}/${entry.name}`
    )
  )).flat();
}

const sources = (await files('src')).filter(file => /\.[cm]?jsx?$/.test(file));
let failures = 0;
for (const file of sources) {
  const source = await readFile(file, 'utf8');
  try {
    await transformWithOxc(
      source,
      file,
      {
        lang: extname(file) === '.jsx' ? 'jsx' : 'js',
        jsx: { runtime: 'automatic', importSource: 'preact' }
      }
    );
    for (const match of source.matchAll(/(?:from\s*|import\s*\(\s*)['"](\.[^'"]+)['"]/g)) await access(resolve(dirname(file), match[1]));
  } catch (error) {
    failures++;
    console.error(`${file}: ${error.message}`);
  }
}
console.log(`Checked ${sources.length} source modules; ${failures} syntax/import-path failures.`);
process.exitCode = failures ? 1 : 0;
