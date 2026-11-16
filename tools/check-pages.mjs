import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '_site');
const textExtensions = new Set(['.html', '.css', '.js', '.json', '.svg', '.xml', '.webmanifest', '.txt']);
const failures = [];

async function check(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await check(target);
      continue;
    }
    if (entry.name === 'supabase-js.min.js') continue;
    if (!textExtensions.has(path.extname(entry.name).toLowerCase())) continue;
    const text = await readFile(target, 'utf8');
    if (/(["'`])\/(?!\/|Nilmo(?:\/|["'`]))/.test(text) || /url\(\/(?!\/|Nilmo\/)/.test(text)) {
      failures.push(path.relative(root, target));
    }
  }
}

await check(root);
if (failures.length) {
  console.error(`Unconverted root paths: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('Pages path check passed.');
