import { build } from 'vite';
import { readdir, rename, rm, writeFile } from 'node:fs/promises';

// A failed build can emit files before reporting an unresolved dependency.
// Publish dist only after the entire build succeeds.
const temporary = '.build-tmp';

async function removeLegacyEntries(directory = 'public', relative = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = `${relative}${entry.name}`;
    if (entry.isDirectory()) await removeLegacyEntries(`${directory}/${entry.name}`, `${name}/`);
    else if (/\.(js|html)$/.test(name) && name !== 'index.html') await rm(`${temporary}/${name}`, { force: true });
  }
}

try {
  for (const dependency of ['preact', 'preact/hooks', 'preact/jsx-runtime', 'preact-iso']) import.meta.resolve(dependency);
  await build({ build: { outDir: temporary, emptyOutDir: true } });
  await removeLegacyEntries();
  await writeFile(`${temporary}/.build-complete`, new Date().toISOString());
  await rm('dist', { recursive: true, force: true });
  await rename(temporary, 'dist');
  console.log('Production build published to dist.');
} catch (error) {
  await rm(temporary, { recursive: true, force: true });
  console.error(`Production build failed: ${error.message}`);
  process.exitCode = 1;
}
