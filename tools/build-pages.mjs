import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const source = path.join(root, 'site');
const output = path.join(root, '_site');
const textExtensions = new Set(['.html', '.css', '.js', '.json', '.svg', '.xml', '.webmanifest', '.txt']);
const basePath = '/';

await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true, force: true });

async function rewrite(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await rewrite(target);
      continue;
    }
    if (entry.name === 'supabase-js.min.js') continue;
    if (!textExtensions.has(path.extname(entry.name).toLowerCase())) continue;

    const original = await readFile(target, 'utf8');
    const updated = original
      .replace(/(["'`])\/(?!\/|Nilmo(?:\/|["'`]))/g, `$1${basePath}`)
      .replace(/url\(\/(?!\/|Nilmo\/)/g, `url(${basePath}`);
    if (updated !== original) await writeFile(target, updated);
  }
}

await rewrite(output);
await writeFile(path.join(output, '.nojekyll'), '');
console.log(`GitHub Pages bundle created at ${output}`);
