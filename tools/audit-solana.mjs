import { readFile } from 'node:fs/promises';
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

if (failures) {
  console.error(`Solana audit failed with ${failures} legacy documentation references.`);
  process.exit(1);
}
console.log('Solana documentation audit passed.');
