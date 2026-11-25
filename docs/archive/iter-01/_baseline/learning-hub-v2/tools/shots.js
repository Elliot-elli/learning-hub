// Capture screenshots of the Learning Hub v2 pages.
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:/Users/EDY/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const BASE = 'http://127.0.0.1:8899';
const OUT = path.resolve(__dirname, 'shots');

const SHOTS = [
  { name: '01-portal-desktop', url: '/index.html', vp: { width: 1440, height: 950 } },
  { name: '02-ap-overview-desktop', url: '/ap/index.html', vp: { width: 1440, height: 950 } },
  { name: '03-ap-courses-desktop', url: '/ap/index.html#/courses', vp: { width: 1440, height: 950 } },
  { name: '04-ap-subject-desktop', url: '/ap/index.html#/courses/science', vp: { width: 1440, height: 950 } },
  { name: '05-ap-section-desktop', url: '/ap/index.html#/courses/science/science-section1', vp: { width: 1440, height: 950 } },
  { name: '06-ap-reports-desktop', url: '/ap/index.html#/reports', vp: { width: 1440, height: 950 } },
  { name: '07-ad-overview-desktop', url: '/ad/index.html', vp: { width: 1440, height: 950 } },
  { name: '08-flashcards-welcome', url: '/ap/flashcards.html?m=ap-science-section1', vp: { width: 1440, height: 950 } },
  { name: '09-ap-overview-tablet', url: '/ap/index.html', vp: { width: 834, height: 1112 } },
  { name: '10-ap-overview-phone', url: '/ap/index.html', vp: { width: 390, height: 844 } },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-proxy-server', '--proxy-bypass-list=*', '--disable-gpu', '--no-sandbox'],
  });

  for (const shot of SHOTS) {
    const ctx = await browser.newContext({ viewport: shot.vp, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(BASE + shot.url);
    await page.waitForTimeout(700);
    const file = path.join(OUT, shot.name + '.png');
    await page.screenshot({ path: file });
    console.log('shot', shot.name);
    await ctx.close();
  }

  // flashcard game view with a card flipped
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/ap/flashcards.html?m=ap-science-section1');
  await page.waitForTimeout(600);
  await page.locator('#startBtn').click();
  await page.waitForTimeout(400);
  await page.locator('.level-btn').first().click();
  await page.waitForTimeout(600);
  await page.locator('#flashcard').click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, '11-flashcards-game.png') });
  console.log('shot 11-flashcards-game');
  await ctx.close();

  await browser.close();
})();
