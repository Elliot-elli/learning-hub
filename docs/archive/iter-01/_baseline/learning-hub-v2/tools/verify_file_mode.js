// Check that the site works when opened as a local file.
// The daily use case is double-clicking index.html, so file:// must
// load the same content as the http server.
const { chromium } = require('playwright-core');
const path = require('path');

const CHROME = 'C:/Users/EDY/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const SITE = path.resolve(__dirname, '..');

let fails = 0;
function check(label, ok, detail) {
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? '：' + detail : ''}`);
  if (!ok) fails += 1;
}

const url = (rel) => 'file:///' + path.join(SITE, rel).replace(/\\/g, '/').replace(/ /g, '%20');

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-proxy-server', '--proxy-bypass-list=*', '--disable-gpu', '--no-sandbox'],
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(url('index.html'));
  await page.waitForTimeout(600);
  check('file:// 门户显示 programme 卡片',
    (await page.locator('.tile-card').count()) === 2);

  await page.goto(url('ap/index.html'));
  await page.waitForTimeout(600);
  const stats = await page.locator('.stat-tile .tile-value').allTextContents();
  check('file:// AP 站读出题库', stats[1] === '123', stats.join(','));

  await page.goto(url('ap/flashcards.html') + '?m=ap-science-section1');
  await page.waitForTimeout(800);
  const line = await page.locator('#subjectLine').textContent();
  check('file:// 闪卡页显示学科行',
    line.trim() === 'AP Science Section 1', line.trim());
  await page.locator('#startBtn').click();
  await page.waitForTimeout(400);
  check('file:// 闪卡页列出章节',
    (await page.locator('.level-btn').count()) === 2);

  await page.goto(url('ad/flashcards.html') + '?m=ad-art-history-section1');
  await page.waitForTimeout(800);
  const adLine = await page.locator('#subjectLine').textContent();
  check('file:// AD 闪卡页显示学科行',
    adLine.trim() === 'AD Art History Section 1', adLine.trim());

  await page.goto(url('ap/index.html') + '#/courses/science');
  await page.waitForTimeout(500);
  check('file:// hash 路由可用',
    (await page.locator('.panel-head h2').first().textContent()) === 'Science');

  check('file:// 控制台无报错', errors.length === 0, errors.slice(0, 2).join(' | '));

  await browser.close();
  console.log();
  console.log(fails === 0 ? '[OK] file:// 打开全部通过' : `[FAIL] ${fails} 项未通过`);
  process.exit(fails === 0 ? 0 : 1);
})();
