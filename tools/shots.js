/* Capture the pages of both sites for visual review. */

const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:/Users/EDY/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'site');
const OUT = path.join(ROOT, 'shots');

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 950 },
  { name: 'tablet', width: 900, height: 1000 },
  { name: 'phone', width: 390, height: 780 }
];

const PAGES = [
  { file: 'index.html', name: 'overview' },
  { file: 'courses.html', name: 'courses' },
  { file: 'subject.html?subject=science', name: 'subject' },
  { file: 'review.html', name: 'review' },
  { file: 'flashcards.html?m=ap-science-section1', name: 'flashcards' }
];

function url(site, file) {
  return 'file:///' + path.join(DIST, site, file).replace(/\\/g, '/');
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-proxy-server', '--proxy-bypass-list=*', '--disable-gpu', '--no-sandbox']
  });

  let count = 0;
  for (const site of ['ap', 'ad']) {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height }
      });
      const page = await context.newPage();
      for (const target of PAGES) {
        if (site === 'ad' && target.file.includes('science')) continue;
        await page.goto(url(site, target.file));
        await page.waitForTimeout(320);
        const name = site + '-' + target.name + '-' + viewport.name + '.png';
        await page.screenshot({ path: path.join(OUT, name), fullPage: false });
        count += 1;
      }
      await context.close();
    }
  }

  /* The game screen itself, with the theme applied. */
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();
  await page.goto(url('ap', 'flashcards.html?m=ap-science-section1'));
  await page.waitForSelector('#startBtn');
  await page.locator('#startBtn').click();
  await page.waitForSelector('.level-btn');
  await page.locator('.level-btn').first().click();
  await page.waitForSelector('#flashcard');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, 'ap-game-desktop.png') });
  count += 1;
  await context.close();

  await browser.close();
  console.log(count + ' screenshots written to ' + OUT);
})();
