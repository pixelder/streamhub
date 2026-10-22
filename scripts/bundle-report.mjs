import { readdir, readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

try {
  const files = await readdir('dist/build');
  let bytes = 0,
    gzip = 0;
  for (const file of files.filter(name => /\.(js|css)$/.test(name)).sort()) {
    const content = await readFile(`dist/build/${file}`),
      compressed = gzipSync(content).length;
    bytes += content.length;
    gzip += compressed;
    console.log(
      `${file.padEnd(45)} ${(content.length / 1024).toFixed(2)} KiB / ${(compressed / 1024).toFixed(2)} KiB gzip`
    );
  }
  console.log(
    `Total bundled JS/CSS: ${(bytes / 1024).toFixed(2)} KiB / ${(gzip / 1024).toFixed(2)} KiB gzip (all lazy routes combined).`
  );
  console.log(
    `HTML: ${(await stat('dist/index.html')).size} bytes. Original public CSS/assets are additional, browser-cached requests.`
  );
} catch (error) {
  console.error(`Bundle report unavailable: ${error.message}. Run npm run build first.`);
  process.exitCode = 1;
}
