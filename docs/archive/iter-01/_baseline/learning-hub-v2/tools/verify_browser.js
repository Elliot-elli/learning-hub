// Browser check for Learning Hub v2: navigation, flashcard flow, storage.
const { chromium } = require('playwright-core');
const path = require('path');

const CHROME = 'C:/Users/EDY/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const BASE = 'http://127.0.0.1:8899';

let fails = 0;
function check(label, ok, detail) {
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? '：' + detail : ''}`);
  if (!ok) fails += 1;
}

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

  // ---------- portal ----------
  await page.goto(BASE + '/index.html');
  await page.waitForTimeout(500);
  const portalCards = await page.locator('.tile-card').count();
  check('门户显示两个 programme 卡片', portalCards === 2, `${portalCards} 张`);
  const portalHrefs = await page.locator('.tile-card a.card-cta').evaluateAll(
    (els) => els.map((e) => e.getAttribute('href')));
  check('门户卡片指向 ap/ad 入口',
    portalHrefs.join(',') === 'ap/index.html,ad/index.html', portalHrefs.join(','));
  const portalStats = await page.locator('.stat-tile .tile-value').allTextContents();
  check('门户统计卡有数值', portalStats.length === 3, portalStats.join(','));
  const portalSideLinks = await page.locator('#hub-nav a.nav-item').evaluateAll(
    (els) => els.map((e) => e.getAttribute('href')));
  check('门户侧栏列出两个 programme 入口',
    portalSideLinks.join(',') === 'ap/index.html,ad/index.html',
    portalSideLinks.join(','));
  const portalSearchHidden = await page.locator('.search').isHidden();
  check('门户隐藏无用的搜索框', portalSearchHidden);

  // ---------- AP dashboard ----------
  await page.goto(BASE + '/ap/index.html');
  await page.waitForTimeout(500);
  const apNav = await page.locator('.nav-item').allTextContents();
  check('AP 侧栏含五个入口',
    apNav.join('|') === 'Overview|Courses|Assignments|Reports|Settings', apNav.join('|'));
  const apSubjects = await page.locator('.stat-tile .tile-value').allTextContents();
  check('AP 统计卡显示 2 个学科', apSubjects[0] === '2', apSubjects.join(','));
  const apCourses = await page.locator('.course-row .course-title').allTextContents();
  check('AP 列出 2 个 section',
    apCourses.length === 2, apCourses.join(','));
  const apCjk = await page.evaluate(() => /[一-鿿]/.test(document.body.innerText));
  check('AP 界面无中文', apCjk === false);

  // 三级下钻：Courses 到学科，再到 Section
  await page.locator('.nav-item[data-view="courses"]').click();
  await page.waitForTimeout(300);
  const subjectCards = await page.locator('.card-grid .tile-card h3').allTextContents();
  check('Courses 显示学科列表',
    subjectCards.join(',') === 'Science,Social Science', subjectCards.join(','));
  await page.locator('.card-grid .tile-card a.card-cta').first().click();
  await page.waitForTimeout(300);
  const sectionHead = await page.locator('.panel-head h2').first().textContent();
  check('进入学科页显示 section', sectionHead === 'Science', sectionHead);
  const sectionRows = await page.locator('.section-row h3').allTextContents();
  check('学科页列出 Section 1', sectionRows.join(',') === 'Section 1', sectionRows.join(','));

  // 预留题型入口：四种活动都要出现在 Section 页
  const chips = await page.locator('.activity-row .activity-chip').allTextContents();
  check('Section 页预留四种学习活动',
    chips.join(',') === 'Flashcards,Quiz,Matching,MCQ', chips.join(','));

  await page.locator('.section-row a.card-cta').first().click();
  await page.waitForTimeout(300);
  const activityCards = await page.locator('.card-grid .tile-card h3').allTextContents();
  check('Section 页展示活动入口',
    activityCards.join(',') === 'Flashcards,Quiz,Matching,MCQ', activityCards.join(','));
  const plannedPills = await page.locator('.card-grid .pill').allTextContents();
  check('未实现的活动标记为 Planned',
    plannedPills.length === 3 && plannedPills.every((t) => t.trim() === 'Planned'),
    plannedPills.join(','));

  // ---------- flashcard flow ----------
  await page.locator('.card-grid .tile-card a.card-cta').first().click();
  await page.waitForTimeout(700);
  check('进入闪卡页', page.url().includes('flashcards.html?m=ap-science-section1'), page.url());
  const subjectLine = await page.locator('#subjectLine').textContent();
  check('显示学科行', subjectLine.trim() === 'AP Science Section 1', subjectLine);
  check('欢迎页可见', await page.locator('#welcomeView').isVisible());

  const backHrefs = await page.locator('[data-hub-back]').evaluateAll(
    (els) => els.map((e) => e.getAttribute('href')));
  check('返回链接指向 AP 站',
    backHrefs.length > 0 && backHrefs.every((h) => h === '../ap/index.html'),
    backHrefs.join(','));

  await page.locator('#startBtn').click();
  await page.waitForTimeout(400);
  const levelBtns = await page.locator('.level-btn').count();
  check('AP Science 有 2 个章节', levelBtns === 2, `${levelBtns} 个`);
  await page.locator('.level-btn').first().click();
  await page.waitForTimeout(500);
  check('进入游戏视图', await page.locator('#gameView').isVisible());
  const front = await page.locator('#frontText').textContent();
  check('卡片正面有内容', front && front.length > 0, front.slice(0, 40));

  // Each state button must render text that differs from its background.
  const btnColors = await page.locator('.state-btn').evaluateAll((els) =>
    els.map((e) => {
      const cs = getComputedStyle(e);
      return { label: e.textContent.trim(), color: cs.color, bg: cs.backgroundColor };
    }));
  const invisible = btnColors.filter((b) => b.color === b.bg);
  check('状态按钮文字与底色不同',
    invisible.length === 0,
    invisible.length ? JSON.stringify(invisible) : btnColors.map((b) => b.label).join(','));

  await page.locator('#flashcard').click();
  await page.waitForTimeout(600);
  const back = await page.locator('#backText').textContent();
  check('翻面显示术语', back && back.length > 0, back.slice(0, 40));

  await page.locator('.state-btn.know').click();
  await page.waitForTimeout(500);
  const known = await page.locator('#knownText').textContent();
  check('I know 计数递增', known.trim() === '1', `known=${known}`);

  const store = await page.evaluate(() => {
    const raw = localStorage.getItem('fx_fc_v1:ap-science-section1');
    return raw ? JSON.parse(raw) : null;
  });
  check('沿用原存档 key', store !== null);
  check('存档结构与引擎一致',
    store && 'v' in store && 'cleared' in store && 'review' in store
    && 'mastered' in store && 'progress' in store,
    store ? Object.keys(store).join(',') : 'null');

  // 待复查词表写入后，侧栏徽标与复习页都要反映
  await page.waitForFunction(() => {
    const hub = window.LearningHub && window.LearningHub.modules
      && window.LearningHub.modules['ap-science-section1'];
    const s = hub ? hub.state : null;
    return s && !s.transitioning && !s.awaitingNext;
  }, null, { timeout: 15000 }).catch(() => {});
  await page.locator('.state-btn.unsure').waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('.state-btn.unsure').click();
  await page.waitForTimeout(600);
  const store2 = await page.evaluate(() => {
    const raw = localStorage.getItem('fx_fc_v1:ap-science-section1');
    return raw ? JSON.parse(raw) : null;
  });
  check('Not sure 写入 review',
    store2 && store2.review && Object.keys(store2.review).length > 0,
    store2 ? JSON.stringify(store2.review).slice(0, 80) : '');

  // ---------- dashboard reflects progress ----------
  await page.goto(BASE + '/ap/index.html');
  await page.waitForTimeout(500);
  const clearedTile = await page.locator('.stat-tile').nth(2).locator('.tile-value').textContent();
  check('Dashboard 显示已通关章节', clearedTile.trim() === '0 / 6', clearedTile);
  const pendingBadge = await page.locator('.nav-badge').textContent().catch(() => '');
  check('侧栏显示待复查数', pendingBadge.trim() === '1', pendingBadge);
  const meterPct = await page.locator('.meter-label span').nth(1).textContent();
  check('课程行显示进度百分比', meterPct.trim() === '0%', meterPct);

  // 报表数字逐格核对，不接受近似值
  await page.locator('.nav-item[data-view="reports"]').click();
  await page.waitForTimeout(300);
  const rows = await page.locator('.report-table tbody tr').count();
  check('报表列出 2 行', rows === 2, `${rows} 行`);
  const cellVals = await page.locator('.report-table tbody tr').first()
    .locator('td').allTextContents();
  check('报表数字正确', cellVals.join(',') === 'Science,Section 1,39,2,0 / 2,0', cellVals.join(','));

  // ---------- AD site is separate ----------
  await page.goto(BASE + '/ad/index.html');
  await page.waitForTimeout(500);
  const adSubjects = await page.locator('.stat-tile .tile-value').allTextContents();
  check('AD 站只有 1 个学科', adSubjects[0] === '1', adSubjects.join(','));
  const adCourses = await page.locator('.course-row .course-title').allTextContents();
  check('AD 列出 Art History section',
    adCourses.join(',') === 'Section 1', adCourses.join(','));
  const adStoreKeys = await page.evaluate(() => Object.keys(localStorage));
  check('AP 存档键带 ap 前缀',
    adStoreKeys.some((k) => k === 'fx_fc_v1:ap-science-section1'),
    adStoreKeys.join(','));
  const adBadge = await page.locator('.nav-badge').count();
  check('AD 站不读取 AP 的待复查数', adBadge === 0,
    `AD 侧栏徽标 ${adBadge} 个`);
  const adCleared = await page.locator('.stat-tile').nth(2).locator('.tile-value').textContent();
  check('AD 站进度不受 AP 影响', adCleared.trim() === '0 / 1', adCleared);

  // AD flashcard
  await page.goto(BASE + '/ad/flashcards.html?m=ad-art-history-section1');
  await page.waitForTimeout(700);
  const adLine = await page.locator('#subjectLine').textContent();
  check('AD 学科行正确', adLine.trim() === 'AD Art History Section 1', adLine);
  await page.locator('#startBtn').click();
  await page.waitForTimeout(400);
  const adLevels = await page.locator('.level-btn').count();
  check('AD 有 1 个章节', adLevels === 1, `${adLevels} 个`);
  await page.locator('.level-btn').first().click();
  await page.waitForTimeout(500);
  const adFront = await page.locator('#frontText').textContent();
  check('AD 卡片正面是题干',
    adFront.indexOf('Art history') === 0 || adFront.indexOf('Aesthetics') === 0
    || adFront.indexOf('Art critics') === 0,
    adFront.slice(0, 50));
  await page.locator('#flashcard').click();
  await page.waitForTimeout(600);
  const adBack = await page.locator('#backText').textContent();
  check('AD 卡片背面是答案',
    adBack.indexOf('social setting of art') > 0
    || adBack.indexOf('original time') > 0
    || adBack.indexOf('philosophy of beauty') > 0,
    adBack.slice(0, 50));

  // ---------- responsive ----------
  for (const vp of [{ w: 1440, h: 950, name: 'desktop' },
                    { w: 834, h: 1112, name: 'tablet' },
                    { w: 390, h: 844, name: 'phone' }]) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.goto(BASE + '/ap/index.html');
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`${vp.name} 无横向溢出`, overflow <= 1, `溢出 ${overflow}px`);
    const sidebarVisible = await page.locator('#sidebar').isVisible();
    if (vp.name === 'phone') {
      check('手机端侧栏收起', !(await page.locator('#sidebar').evaluate(
        (el) => el.classList.contains('is-open'))));
      await page.locator('#nav-toggle').click();
      await page.waitForTimeout(300);
      check('手机端菜单可展开', await page.locator('#sidebar').evaluate(
        (el) => el.classList.contains('is-open')));
    } else {
      check(`${vp.name} 侧栏可见`, sidebarVisible);
    }
  }

  check('控制台无 JS 报错', errors.length === 0, errors.slice(0, 3).join(' | '));

  await browser.close();
  console.log();
  console.log(fails === 0 ? '[OK] 浏览器实测全部通过' : `[FAIL] ${fails} 项未通过`);
  process.exit(fails === 0 ? 0 : 1);
})();
