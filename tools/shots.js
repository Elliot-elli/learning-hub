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

/* The review pages are captured with a flagged term in the archive, so
   the screenshots show the real thing rather than an empty state. */
function reviewPagesFor(site) {
  const subject = site === 'ad' ? 'art-history' : 'science';
  const section = site === 'ad' ? 'art-history-section1' : 'science-section1';
  return [
    { file: 'review.html', name: 'review' },
    { file: 'review.html?subject=' + subject + '&section=' + section, name: 'review-list' },
    { file: 'review-session.html?subject=' + subject + '&section=' + section, name: 'review-session' }
  ];
}

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

      /* Flag two terms so the review list has something in every group. */
      await page.goto(url(site, 'review.html'));
      await page.waitForSelector('.review-tabs');
      await page.evaluate(() => {
        var site = window.LH_SITE;
        site.subjects.forEach(function (subject) {
          subject.sections.forEach(function (section) {
            var deck = (window.AP_MODULES || {})[section.module];
            var terms = [];
            if (deck) {
              deck.sections.forEach(function (chapter) {
                chapter.levels.forEach(function (level) {
                  level.cards.forEach(function (card) { terms.push(card.term); });
                });
              });
            }
            var review = {};
            var mastered = {};
            if (terms[0]) review[terms[0]] = { state: 'uncertain', ts: 1700000000 };
            if (terms[1]) review[terms[1]] = { state: 'unknown', ts: 1700000001 };
            if (terms[2]) mastered[terms[2]] = { ts: 1700000002 };
            localStorage.setItem(section.storeKey, JSON.stringify({
              v: 1, cleared: {}, progress: {}, review: review, mastered: mastered
            }));
          });
        });
      });

      for (const target of PAGES) {
        if (site === 'ad' && target.file.includes('science')) continue;
        await page.goto(url(site, target.file));
        await page.waitForTimeout(320);
        const name = site + '-' + target.name + '-' + viewport.name + '.png';
        await page.screenshot({ path: path.join(OUT, name), fullPage: false });
        count += 1;
      }

      for (const target of reviewPagesFor(site)) {
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
