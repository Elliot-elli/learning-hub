// 视觉验收：目录页桌面/移动、闪卡各视图、SQ 各视图，截图存档。
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:/Users/EDY/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const SITE = path.resolve(__dirname, '..');
const OUT = path.join(SITE, 'tools', 'shots');
const url = (p) => 'file:///' + path.resolve(p).replace(/\\/g, '/').replace(/ /g, '%20');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-proxy-server', '--proxy-bypass-list=*', '--disable-gpu', '--no-sandbox'],
  });

  const shots = [
    { name: '01-index-desktop', url: 'index.html', w: 1400, h: 900 },
    { name: '02-index-mobile', url: 'index.html', w: 390, h: 844 },
    { name: '03-ap-desktop', url: 'ap/index.html', w: 1400, h: 900 },
    { name: '04-ad-desktop', url: 'ad/index.html', w: 1400, h: 900 },
    { name: '05-ap-mobile', url: 'ap/index.html', w: 390, h: 844 },
    { name: '06-flashcards-welcome', url: 'modules/ap-science-section1.html', w: 1400, h: 900 },
    { name: '07-flashcards-mobile', url: 'modules/ap-science-section1.html', w: 390, h: 844 },
    { name: '08-sq-welcome', url: 'modules/sq-art-history.html', w: 1400, h: 900 },
    { name: '09-sq-mobile', url: 'modules/sq-art-history.html', w: 390, h: 844 },
  ];

  for (const s of shots) {
    const page = await browser.newPage({ viewport: { width: s.w, height: s.h } });
    await page.goto(url(path.join(SITE, s.url)));
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(OUT, s.name + '.png') });
    console.log(`[OK] ${s.name}.png  ${s.w}x${s.h}`);
    await page.close();
  }

  // 闪卡：章节列表 + 游戏视图
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto(url(path.join(SITE, 'modules/ap-science-section1.html')));
  await page.waitForTimeout(800);
  await page.locator('#startBtn').click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, '10-flashcards-levels.png') });
  console.log('[OK] 10-flashcards-levels.png');
  await page.locator('.level-btn').first().click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, '11-flashcards-game.png') });
  console.log('[OK] 11-flashcards-game.png');
  await page.close();

  // SQ：答题视图（倒计时走完揭晓）
  const sq = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await sq.goto(url(path.join(SITE, 'modules/sq-art-history.html')));
  await sq.waitForTimeout(800);
  await sq.locator('#startBtn').click();
  await sq.waitForTimeout(600);
  await sq.locator('#timerBtn').click();
  await sq.waitForTimeout(10500);
  await sq.screenshot({ path: path.join(OUT, '12-sq-revealed.png') });
  console.log('[OK] 12-sq-revealed.png');
  await sq.close();

  await browser.close();
  console.log(`\n截图目录：${OUT}`);
})();
