/* Check that both sites work when opened straight from disk.
 *
 * The learner may double-click the entry file rather than run a server,
 * so every link and script has to resolve over the file:// scheme.
 */

const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:/Users/EDY/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const DIST = path.resolve(__dirname, '..', 'dist');

let passed = 0;
let failed = 0;
const failures = [];

function check(name, ok, detail) {
  if (ok) {
    passed += 1;
    console.log('  ok   ' + name);
  } else {
    failed += 1;
    failures.push(name + (detail ? ' -- ' + detail : ''));
    console.log('  FAIL ' + name + (detail ? ' -- ' + detail : ''));
  }
}

function url(site, file) {
  return 'file:///' + path.join(DIST, site, file).replace(/\\/g, '/');
}

(async () => {
  if (!fs.existsSync(CHROME)) {
    console.error('Chromium not found: ' + CHROME);
    process.exit(1);
  }

  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-proxy-server', '--proxy-bypass-list=*', '--disable-gpu', '--no-sandbox']
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  for (const site of ['ap', 'ad']) {
    console.log('\n=== ' + site + ' ===');

    await page.goto(url(site, 'index.html'));
    await page.waitForSelector('.stat-tile');
    check(site + ': the overview renders from disk',
      (await page.locator('.stat-tile').count()) === 4);

    await page.locator('#site-nav a', { hasText: 'Courses' }).click();
    await page.waitForSelector('.tile-card');
    check(site + ': the courses page renders from disk',
      (await page.locator('.tile-card').count()) > 0);

    await page.locator('.tile-card a.icon-cta').first().click();
    await page.waitForSelector('.section-row');
    check(site + ': the subject page renders from disk',
      (await page.locator('.section-row').count()) > 0);

    await page.locator('.section-row a.icon-cta').first().click();
    await page.waitForSelector('#startBtn');
    await page.locator('#startBtn').click();
    await page.waitForSelector('.level-btn');
    check(site + ': the game loads its chapters from disk',
      (await page.locator('.level-btn').count()) > 0);

    await page.locator('.level-btn').first().click();
    await page.waitForSelector('#flashcard');
    const front = await page.locator('#frontText').textContent();
    check(site + ': a card renders from disk',
      !!(front && front.trim().length), (front || '').slice(0, 40));

    /* Progress written in this browser must be readable by the site. */
    await page.locator('#flashcard').click();
    await page.waitForTimeout(150);
    await page.locator('.state-btn.know').click();
    await page.waitForTimeout(250);

    await page.goto(url(site, 'index.html'));
    await page.waitForSelector('.stat-tile');
    const cleared = await page.locator('.stat-tile .tile-value').nth(2).textContent();
    check(site + ': the dashboard reads the progress written by the game',
      /[1-9]/.test(cleared || ''), 'cleared=' + cleared);
  }

  check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  await browser.close();
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if (failed) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log('  - ' + f));
    process.exit(1);
  }
})();
