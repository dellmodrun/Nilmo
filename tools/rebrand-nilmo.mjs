import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const site = path.join(root, 'site');
const textExtensions = new Set(['.html', '.js', '.json', '.xml', '.txt', '.md']);
let changed = 0;

async function update(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await update(target);
      continue;
    }
    if (!textExtensions.has(path.extname(entry.name).toLowerCase())) continue;

    const original = await readFile(target, 'utf8');
    const branded = original
      .replace(/TESERA/g, 'NILMO')
      .replace(/Tesera/g, 'Nilmo')
      .replace(/<a class="mark"([^>]*)><img[^>]*>/g, '<a class="mark"$1><img class="logo" src="/img/nilmo-logo.png" alt="Nilmo logo" width="26" height="26">')
      .replace(/<a class="tf-lg"([^>]*)><img[^>]*>/g, '<a class="tf-lg"$1><img src="/img/nilmo-logo.png" alt="Nilmo logo" width="24" height="24">')
      .replace(/href="(?:favicon-v3|icon-192-v3|apple-touch-icon-v3)\.png"/g, 'href="/img/nilmo-logo.png"')
      .replace(/(<meta property="og:image" content=")[^"]+("\s*>)/g, '$1/img/nilmo-logo.png$2')
      .replace(/(<meta name="twitter:image" content=")[^"]+("\s*>)/g, '$1/img/nilmo-logo.png$2')
      .replace(/(<meta property="og:image:width" content=")[^"]+("\s*>)/g, (_, start, end) => `${start}1254${end}`)
      .replace(/(<meta property="og:image:height" content=")[^"]+("\s*>)/g, (_, start, end) => `${start}1254${end}`);

    if (branded !== original) {
      await writeFile(target, branded);
      changed += 1;
    }
  }
}

await update(site);
console.log(`Rebranded ${changed} files for Nilmo.`);
