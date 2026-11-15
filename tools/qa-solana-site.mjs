import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '../../../Github/onemod/node_modules/playwright/index.mjs';

const root = path.resolve(import.meta.dirname, '..');
const files = (await readdir(path.join(root, 'site')))
  .filter(file => file.endsWith('.html'))
  .sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)));
const legacy = /Elysium|Kinetiq|KNTQ|Hyperliquid|HyperCore|HyperEVM|Uniswap|Hookr|Enso|Saffron|teseralab|mcp\.tesera|\bHYPE\b|\bWHYPE\b|0x[0-9a-f]{4,}|Solidity|gwei|\bwei\b/i;

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const requestFailures = [];
const consoleErrors = [];
const httpErrors = [];
page.on('requestfailed', request => requestFailures.push(`${request.url()} :: ${request.failure()?.errorText}`));
page.on('response', response => {
  if (response.status() >= 400) httpErrors.push(`${response.status()} ${response.url()}`);
});
page.on('console', message => {
  if (message.type() === 'error') consoleErrors.push(`${page.url()} :: ${message.text()}`);
});

const results = [];
for (const file of files) {
  const response = await page.goto(`http://127.0.0.1:4323/${file}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(250);
  const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  results.push({
    file,
    status: response?.status(),
    title: await page.title(),
    legacy: body.match(legacy)?.[0] || '',
    oldX: await page.locator('a[href*="x.com/teseralab"]').count(),
    newX: await page.locator('a[href="https://x.com/nilmonwork"]').count(),
  });
}

await page.goto('http://127.0.0.1:4323/', { waitUntil: 'networkidle' });
await page.screenshot({ path: path.join(root, 'qa-solana-home.png') });
await page.evaluate(() => {
  const story = document.querySelector('.story');
  window.scrollTo(0, story.offsetTop + (story.offsetHeight - innerHeight) * 0.95);
});
await page.waitForTimeout(2_000);
await page.screenshot({ path: path.join(root, 'qa-solana-final.png') });

await page.goto('http://127.0.0.1:4323/docs.html#/solana', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const solanaLink = page.locator('a[href="#/solana"]').first();
if (await solanaLink.count()) {
  await solanaLink.click();
  await page.waitForTimeout(300);
}
const docsHeading = await page.locator('#art h1').first().innerText().catch(() => '');
await page.screenshot({ path: path.join(root, 'qa-solana-docs.png') });

const failedPages = results.filter(result => result.status !== 200 || result.legacy || result.oldX || !result.title.includes('Nilmo'));
console.log(JSON.stringify({ pages: results.length, failedPages, docsHeading, requestFailures, httpErrors, consoleErrors }, null, 2));
await browser.close();

if (failedPages.length || requestFailures.length || httpErrors.length || consoleErrors.length || docsHeading !== 'Solana basics') process.exit(1);
