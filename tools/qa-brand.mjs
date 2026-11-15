import { chromium } from '../../../Github/onemod/node_modules/playwright/index.mjs';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const failures = [];
page.on('requestfailed', request => failures.push(`${request.url()} :: ${request.failure()?.errorText}`));
await page.goto('http://127.0.0.1:4323/', { waitUntil: 'networkidle', timeout: 60_000 });
await page.waitForTimeout(1_500);
const result = {
  title: await page.title(),
  nilmoText: await page.getByText('NILMO', { exact: true }).count(),
  logoLoaded: await page.locator('img[alt="Nilmo logo"]').first().evaluate(image => image.complete && image.naturalWidth > 0),
  oldBrandCount: await page.getByText(/Tesera/i).count(),
  failures,
};
await page.screenshot({ path: 'qa-nilmo-home.png' });
await page.evaluate(() => {
  const story = document.querySelector('.story');
  window.scrollTo(0, story.offsetTop + (story.offsetHeight - innerHeight) * 0.95);
});
await page.waitForTimeout(2_500);
await page.screenshot({ path: 'qa-nilmo-live.png' });
console.log(JSON.stringify(result, null, 2));
await browser.close();
