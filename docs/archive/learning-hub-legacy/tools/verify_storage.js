// 存档金标准测试：原文件与新站点读写同一份 localStorage。
// 这是「没搞坏学生已有进度」最直接的证明。
const { chromium } = require('playwright-core');
const path = require('path');

const CHROME = 'C:/Users/EDY/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
// 站点在 学术备战支持/测试demo/learning-hub/，源文件在 学术备战支持/闪卡/ —— 上溯三级
const ROOT = path.resolve(__dirname, '..', '..', '..');
const SITE = path.resolve(__dirname, '..');
const SRC_SCI = path.join(ROOT, '闪卡/AP_Flashcards/Science/section 1/ap-science-section1.html');

let fails = 0;
function check(label, ok, detail) {
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? '：' + detail : ''}`);
  if (!ok) fails += 1;
}
const url = (p) => 'file:///' + p.replace(/\\/g, '/').replace(/ /g, '%20');
const KEY = 'fx_fc_v1:ap-science-section1';

// 读当前存档里已通关的章节与 review 条目数
const readState = (page) => page.evaluate((k) => {
  const raw = localStorage.getItem(k);
  if (!raw) return null;
  const o = JSON.parse(raw);
  return {
    cleared: Object.keys(o.cleared || {}).sort(),
    review: Object.keys(o.review || {}).sort(),
    mastered: Object.keys(o.mastered || {}).sort(),
    progressKeys: Object.keys(o.progress || {}).sort(),
  };
}, KEY);

// 源引擎有两种作答路径，语义不同：
//   I know  → 记 mastered、把卡移出队列、自动推进到下一张（不显示 Next）
//   Not sure → 记 review、卡留在队列、Next 出现，要手动点 Next
async function answerOne(page, state) {
  const btn = page.locator(`.state-btn.${state}`);
  await btn.waitFor({ state: 'visible', timeout: 10000 });
  await btn.click();
  if (state !== 'know') {
    // Not sure / Don't know 之后要手动点 Next 才翻下一张
    const next = page.locator('#nextBtn');
    await next.waitFor({ state: 'visible', timeout: 10000 });
    await next.click();
  }
  await page.waitForFunction(
    () => {
      const hub = window.LearningHub && window.LearningHub.modules
        && window.LearningHub.modules['ap-science-section1'];
      const s = hub ? hub.state : window.__interactionState;
      return s && !s.transitioning && !s.awaitingNext;
    },
    null,
    { timeout: 15000 }
  ).catch(() => {});
  // I know 的自动推进有 680ms 延迟 + 620ms 转场，等下一张就位
  if (state === 'know') {
    await page.locator('.state-btn.know').waitFor({ state: 'visible', timeout: 15000 });
  }
  await page.waitForTimeout(300);
}

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-proxy-server', '--proxy-bypass-list=*', '--disable-gpu', '--no-sandbox'],
  });
  // 同一个 context = 同一个 origin 的 localStorage
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  // 清干净，从零开始
  await page.goto(url(path.join(SITE, 'index.html')));
  await page.evaluate((k) => localStorage.removeItem(k), KEY);

  // ---- 1. 在原文件里答几张 ----
  await page.goto(url(SRC_SCI));
  await page.waitForTimeout(700);
  check('原文件可正常打开', await page.locator('#welcomeView').isVisible());

  await page.locator('#startBtn').click();
  await page.waitForTimeout(400);
  await page.locator('.level-btn').first().click();
  await page.waitForTimeout(500);

  for (let i = 0; i < 3; i += 1) {
    await answerOne(page, 'unsure');
  }

  const fromSrc = await readState(page);
  check('原文件写入了存档', fromSrc !== null, fromSrc ? `review ${fromSrc.review.length} 条` : 'null');
  const srcReviewCount = fromSrc ? fromSrc.review.length : 0;
  check('原文件记录了 3 条待复查', srcReviewCount === 3, `${srcReviewCount} 条`);

  // ---- 2. 不关浏览器，打开新站点 ----
  await page.goto(url(path.join(SITE, 'modules/ap-science-section1.html')));
  await page.waitForTimeout(700);
  const fromHub = await readState(page);
  check('新站点读到同一份存档', fromHub !== null, fromHub ? `review ${fromHub.review.length} 条` : 'null');
  check('待复查条目完全一致', JSON.stringify(fromHub.review) === JSON.stringify(fromSrc.review),
    `源 ${JSON.stringify(fromSrc.review)} / 新 ${JSON.stringify(fromHub.review)}`);

  // 导航页与模块页共用同一份 localStorage：两边读出的 review 集合必须相同
  await page.goto(url(path.join(SITE, 'ap/index.html')));
  await page.waitForTimeout(500);
  const navReview = await page.evaluate((k) => {
    const raw = localStorage.getItem(k);
    if (!raw) return null;
    return Object.keys(JSON.parse(raw).review || {}).sort();
  }, KEY);
  check('AP 导航页与模块页共用同一份存档',
    navReview !== null && JSON.stringify(navReview) === JSON.stringify(fromHub.review),
    `导航页 ${JSON.stringify(navReview)} / 模块页 ${JSON.stringify(fromHub.review)}`);

  await page.goto(url(path.join(SITE, 'index.html')));
  await page.waitForTimeout(500);
  const homeReview = await page.evaluate((k) => {
    const raw = localStorage.getItem(k);
    if (!raw) return null;
    return Object.keys(JSON.parse(raw).review || {}).sort();
  }, KEY);
  check('首页与模块页共用同一份存档',
    homeReview !== null && JSON.stringify(homeReview) === JSON.stringify(fromHub.review),
    `首页 ${JSON.stringify(homeReview)}`);

  await page.goto(url(path.join(SITE, 'modules/ap-science-section1.html')));
  await page.waitForTimeout(700);

  await page.goto(url(path.join(SITE, 'modules/ap-science-section1.html')));
  await page.waitForTimeout(700);

  // welcome 页的进度文案由存档里的 cleared 算出
  const homeProg = await page.locator('#homeProgress').textContent();
  check('新站点 welcome 显示已有进度', homeProg && homeProg.trim().length > 0, homeProg.trim());

  // 复习列表应显示 3 条
  await page.locator('#startBtn').click();
  await page.waitForTimeout(400);
  const reviewCount = await page.locator('#levelsReviewCount').textContent();
  check('复习列表计数与源文件一致', reviewCount.includes(String(srcReviewCount)),
    `源 ${srcReviewCount} / 新 "${reviewCount.trim()}"`);

  // ---- 3. 在新站点复习列表里把 2 个词标为已掌握，回原文件看 ----
  // 源引擎语义：mastered 只在复习列表点「Got it」时写入；
  // 「I know」只记本轮 flags，known 计数递增但不落盘到 mastered。
  await page.locator('#levelsReviewBtn').click();
  await page.waitForTimeout(600);
  const gotIt = page.locator('.word-master').filter({ hasText: 'Got it' });
  const gotItCount = await gotIt.count();
  check('复习列表列出待复查词条', gotItCount >= 2, `${gotItCount} 个可标记`);

  await gotIt.first().click();
  await page.waitForTimeout(400);
  await gotIt.first().click();
  await page.waitForTimeout(500);

  const afterHub = await readState(page);
  check('新站点写入了 mastered（复习列表标 Got it）', afterHub.mastered.length === 2,
    `mastered ${afterHub.mastered.length} 条`);
  check('新站点在已有存档上继续作答，review 未丢失', afterHub.review.length === srcReviewCount,
    `review ${afterHub.review.length} 条 / 原 ${srcReviewCount} 条`);

  await page.goto(url(SRC_SCI));
  await page.waitForTimeout(700);
  const backToSrc = await readState(page);
  check('原文件读到新站点写入的 mastered', backToSrc.mastered.length === 2,
    `mastered ${backToSrc.mastered.length} 条`);
  check('两侧 review 集合完全一致',
    JSON.stringify(backToSrc.review) === JSON.stringify(afterHub.review), '');

  // ---- 4. 社科模块的 key 与 SCI 不同，互不干扰 ----
  const socKey = 'fx_fc_v1:ap-social-science-section1';
  const socStore = await page.evaluate((k) => {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : null;
  }, socKey);
  check('社科模块有独立存档空间', socStore === null || !socStore.review
    || Object.keys(socStore.review).length === 0,
    socStore ? JSON.stringify(socStore.review).slice(0, 60) : 'null');

  await browser.close();
  console.log();
  console.log(fails === 0 ? '[OK] 存档金标准测试通过：原文件与新站点共用同一份进度'
                          : `[FAIL] ${fails} 项未通过`);
  process.exit(fails === 0 ? 0 : 1);
})();
