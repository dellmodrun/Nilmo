import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const html = await readFile(path.join(root, 'site', 'docs.html'), 'utf8');
const start = html.indexOf('PG=[') + 3;
const end = html.indexOf('],art=', start) + 1;
const pages = JSON.parse(html.slice(start, end));
const legacy = /Elysium|Kinetiq|KNTQ|Hyperliquid|HyperCore|HyperEVM|Uniswap|Hookr|Enso|Saffron|\bEVM\b|ERC-|\bHYPE\b|\bWHYPE\b|0x[0-9a-f]|gwei|\bwei\b|bytecode|Solidity|ERC-1967|chain\s*ID/i;

let failures = 0;
for (const page of pages) {
  const text = `${page.lead || ''} ${page.b || ''}`;
  const matches = text.match(new RegExp(legacy.source, 'gi')) || [];
  if (!matches.length) continue;
  failures += matches.length;
  console.log(`${page.s}: ${matches.length} legacy reference(s) — ${[...new Set(matches)].slice(0, 8).join(', ')}`);
}

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const children = await Promise.all(entries.map(entry => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return htmlFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.html') ? [fullPath] : [];
  }));
  return children.flat();
}

const staleClaims = /Ask Solana<br>anything|from day one|from the first (?:day|block)|mailto:@nilmonwork|var TO="@nilmonwork"|gateway runs on Cloudflare|build and deploy programs and act within limits|Every transaction is simulated and previewed in plain words before you sign|Nilmo Shield checks every transaction|addressed to @nilmonwork/i;
for (const file of await htmlFiles(path.join(root, 'site'))) {
  const source = await readFile(file, 'utf8');
  const stale = source.match(staleClaims);
  if (stale) {
    failures += 1;
    console.log(`${path.relative(root, file)}: stale or misleading copy: ${stale[0]}`);
  }
  if (source.includes('<footer class="tf"') && !source.includes('href="mailto:hello@nilmo.run"')) {
    failures += 1;
    console.log(`${path.relative(root, file)}: footer is missing hello@nilmo.run`);
  }
}

if (failures) {
  console.error(`Solana site audit failed with ${failures} issue(s).`);
  process.exit(1);
}
console.log('Solana documentation audit passed.');
