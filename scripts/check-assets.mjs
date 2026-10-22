import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const baseline = JSON.parse(await readFile('docs/UI_BASELINE.json', 'utf8'));
let failures = 0;
for (const entry of baseline) {
  try {
    const bytes = await readFile(entry.path);
    if (createHash('sha256').update(bytes).digest('hex') !== entry.sha256) throw new Error('differs from restored original');
  } catch (error) {
    failures++;
    console.error(`${entry.path}: ${error.message}`);
  }
}
console.log(
  `Original styles/assets: ${baseline.length - failures}/${baseline.length} byte-for-byte matches.`
);
process.exitCode = failures ? 1 : 0;
