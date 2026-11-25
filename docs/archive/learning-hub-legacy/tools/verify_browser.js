// 浏览器实测：AP/AD 两套入口、导航层级、返回路径、游戏流程、进度显示。
//
// 依赖 playwright-core 与本机 Chromium，属开发期工具，学生日常使用不需要。
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:/Users/EDY/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const SITE = path.resolve(__dirname, '..');
const MANIFEST = path.join(SITE, 'assets/data/manifest.js');

let fails = 0;
function check(label, ok, detail) {
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? '：' + detail : ''}`);
  if (!ok) fails += 1;
}
const url = (p) => 'file:///' + p.replace(/\\/g, '/').replace(/ /g, '%20');

// 清单是登记表的派生物：读出来核对页面渲染出的游戏列表
function readManifest() {
  const src = fs.readFileSync(MANIFEST, 'utf8');
  const sandbox = { window: {} };
  new Function('window', src)(sandbox.window);
  return sandbox.window.HUB_MANIFEST;
}

(async () => {
  const manifest = readManifest();
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-proxy-server', '--proxy-bypass-list=*', '--disable-gpu', '--no-sandbox'],
  });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  // ---------- 首页：两张 programme 卡 ----------
  await page.goto(url(path.join(SITE, 'index.html')));
  await page.waitForTimeout(400);

  const homeCards = await page.locator('.choice-card').count();
  check('首页显示 programme 卡片', homeCards === manifest.programmes.length,
    `${homeCards} 张 / 登记 ${manifest.programmes.length} 个`);

  const homeTitles = await page.locator('.choice-card .choice-title').allTextContents();
  check('首页 programme 名为英文',
    homeTitles.join(',') === manifest.programmes.map((p) => p.title).join(','),
    homeTitles.join(','));

  const homeHrefs = await page.locator('.choice-card a.entry-cta').evaluateAll(
    (els) => els.map((e) => e.getAttribute('href')));
  check('首页卡片指向 programme 页',
    homeHrefs.every((h) => /^(ap|ad)\/index\.html$/.test(h)), homeHrefs.join(','));

  // ---------- 每套 programme 入口：两张类型卡 ----------
  for (const prog of manifest.programmes) {
    await page.goto(url(path.join(SITE, prog.href)));
    await page.waitForTimeout(400);

    const typeTitles = await page.locator('.choice-card .choice-title').allTextContents();
    check(`${prog.id}: 显示 Flashcards 与 Super Quiz 两张卡`,
      typeTitles.includes('Flashcards') && typeTitles.includes('Super Quiz'),
      typeTitles.join(','));

    const progMods = manifest.modules.filter((m) => m.programme === prog.id);
    const expectedTypes = [...new Set(progMods.map((m) => m.type))];
    check(`${prog.id}: 只显示本 programme 登记的类型`,
      expectedTypes.every((t) => typeTitles.includes(t === 'sq' ? 'Super Quiz' : 'Flashcards')),
      `登记类型 ${expectedTypes.join(',')}`);

    const cjk = await page.evaluate(() => /[一-鿿]/.test(document.body.innerText));
    check(`${prog.id}: 界面无中文`, cjk === false);

    // 类型卡用 hash 跳转，不重新加载页面：file:// 下少一次文档解析
    await page.locator('.choice-card a.entry-cta').first().click();
    await page.waitForTimeout(300);
    const subjectHeading = await page.locator('.hub-section-head h2').first().textContent();
    check(`${prog.id}: 点卡进入学科选择`, subjectHeading === 'Select a Subject', subjectHeading);

    const subjectTitles = await page.locator('.entry-card .entry-title').allTextContents();
    const expectedSubjects = [...new Set(progMods.map((m) => m.subject))];
    check(`${prog.id}: 学科与登记表一致`,
      subjectTitles.slice().sort().join(',') === expectedSubjects.slice().sort().join(','),
      `页面 ${subjectTitles.join(',')} / 登记 ${expectedSubjects.join(',')}`);

    // 点学科 → 章节 / 模块列表
    const clickedSubject = subjectTitles[0];
    await page.locator('.entry-card a.entry-cta').first().click();
    await page.waitForTimeout(300);
    const sectionHeading = await page.locator('.hub-section-head h2').first().textContent();
    check(`${prog.id}: 点学科进入章节选择`, sectionHeading === 'Choose a Section', sectionHeading);

    // 章节列表只含所点学科的模块
    const moduleTitles = await page.locator('.entry-card .entry-title').allTextContents();
    const expectedTitles = progMods
      .filter((m) => m.subject === clickedSubject)
      .map((m) => m.title);
    check(`${prog.id}: 章节列表与所点学科一致`,
      moduleTitles.slice().sort().join(',') === expectedTitles.slice().sort().join(','),
      `页面 ${moduleTitles.join(',')} / 登记 ${expectedTitles.join(',')}`);

    // 返回导航（在跳到模块页之前查）
    const backHome = await page.locator('a.hub-nav-link', { hasText: 'Back to Home' }).count();
    const backSubjects = await page.locator('a.hub-nav-link', { hasText: 'Back to Subjects' }).count();
    check(`${prog.id}: 返回导航存在`, backHome === 1 && backSubjects === 1,
      `Home ${backHome} / Subjects ${backSubjects}`);

    // 模块页是独立文档，data-module 决定载入哪个题库
    await page.locator('.entry-card a.entry-cta').first().click();
    await page.waitForTimeout(700);
    const moduleId = await page.evaluate(() => document.body.getAttribute('data-module'));
    check(`${prog.id}: Start Learning 打开对应模块页`,
      manifest.modules.some((m) => m.id === moduleId), String(moduleId));
  }

  // ---------- 空分类不留坏链接 ----------
  await page.goto(url(path.join(SITE, 'ad/index.html')));
  await page.waitForTimeout(300);
  await page.locator('.choice-card a.entry-cta').first().click();
  await page.waitForTimeout(300);
  const emptyHrefs = await page.locator('.entry-card a.entry-cta').evaluateAll(
    (els) => els.map((e) => e.getAttribute('href')));
  const broken = emptyHrefs.filter((h) => !h || h === '#');
  check('空分类不留坏链接', broken.length === 0, broken.join(','));

  // ---------- 闪卡模块：流程与存档 ----------
  await page.goto(url(path.join(SITE, 'modules/ap-science-section1.html')));
  await page.waitForTimeout(700);

  check('闪卡页 welcome 可见', await page.locator('#welcomeView').isVisible());
  const subject = await page.locator('.subject-line').textContent();
  check('显示学科名', subject.trim() === 'AP Science Section 1', subject);

  const hubBack = await page.locator('[data-hub-back]').count();
  check('有返回主目录入口', hubBack >= 1, `${hubBack} 个`);

  await page.locator('#startBtn').click();
  await page.waitForTimeout(400);
  check('进入章节列表', await page.locator('#levelsView').isVisible());
  const levelBtns = await page.locator('.level-btn').count();
  check('章节列表有 2 个章节', levelBtns === 2, `${levelBtns} 个`);

  await page.locator('.level-btn').first().click();
  await page.waitForTimeout(500);
  check('进入游戏视图', await page.locator('#gameView').isVisible());

  const front = await page.locator('#frontText').textContent();
  check('卡片正面有内容', front && front.length > 0, front.slice(0, 40));

  await page.locator('#flashcard').click();
  await page.waitForTimeout(600);
  const back = await page.locator('#backText').textContent();
  check('翻面后背面显示术语', back && back.length > 0, back.slice(0, 40));

  await page.locator('.state-btn.know').click();
  await page.waitForTimeout(500);
  const known = await page.locator('#knownText').textContent();
  check('点「I know」后计数递增', known.trim() === '1', `known=${known}`);

  const store = await page.evaluate(() => {
    const raw = localStorage.getItem('fx_fc_v1:ap-science-section1');
    return raw ? JSON.parse(raw) : null;
  });
  check('localStorage 用的是原 key', store !== null, store ? Object.keys(store).join(',') : 'null');
  check('存档结构与原引擎一致', store && 'v' in store && 'cleared' in store
    && 'review' in store && 'mastered' in store && 'progress' in store,
    store ? Object.keys(store).join(',') : 'null');

  // Not sure 才写 review：I know 不计入待复查
  // 引擎在换卡过渡期间会静默忽略点击（state.transitioning 守卫），
  // 所以等引擎自己报「不在过渡中」再点下一张的 Not sure。
  await page.waitForFunction(() => {
    const hub = window.LearningHub && window.LearningHub.modules
      && window.LearningHub.modules['ap-science-section1'];
    const s = hub ? hub.state : window.__interactionState;
    return s && !s.transitioning && !s.awaitingNext;
  }, null, { timeout: 15000 }).catch(() => {});
  await page.locator('.state-btn.unsure').waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('.state-btn.unsure').click();
  await page.waitForTimeout(600);
  const store2 = await page.evaluate(() => {
    const raw = localStorage.getItem('fx_fc_v1:ap-science-section1');
    return raw ? JSON.parse(raw) : null;
  });
  check('点「Not sure」后 review 记录已写入', store2 && store2.review
    && Object.keys(store2.review).length > 0,
    store2 ? JSON.stringify(store2.review).slice(0, 90) : '');

  // 返回主目录：选当前激活视图里的入口
  await page.locator('#gameView [data-hub-back]').first().click();
  await page.waitForTimeout(600);
  check('返回主目录成功', page.url().endsWith('index.html'), page.url().split('/').pop());

  // 首页：模块有存档时不能崩，进度条按通关章节数显示
  const allCards = await page.locator('.entry-card').count();
  check('首页在有存档时正常渲染', allCards === manifest.modules.length,
    `${allCards} 张 / 登记 ${manifest.modules.length} 个`);

  // 进度条：直接写 cleared 模拟，不走完整 20 题
  await page.evaluate(() => {
    const raw = localStorage.getItem('fx_fc_v1:ap-science-section1');
    const o = raw ? JSON.parse(raw) : { v: 1, cleared: {}, review: {}, mastered: {}, progress: {} };
    o.cleared = { chapter1: { known: 20, reviewed: 0, ts: 1 } };
    localStorage.setItem('fx_fc_v1:ap-science-section1', JSON.stringify(o));
  });
  await page.reload();
  await page.waitForTimeout(500);
  const prog = await page.locator('.entry-progress.is-on').count();
  check('首页显示已通关进度', prog >= 1, `${prog} 张卡片带进度`);
  const progText = await page.locator('.entry-progress').first().textContent();
  check('进度文案正确', /1\s*\/\s*2 chapters cleared/.test(progText), progText.trim());

  // ---------- AP Social Science ----------
  await page.goto(url(path.join(SITE, 'modules/ap-social-science-section1.html')));
  await page.waitForTimeout(700);
  const socSubject = await page.locator('.subject-line').textContent();
  check('社科模块加载正确', socSubject.includes('Social Science'), socSubject);
  await page.locator('#startBtn').click();
  await page.waitForTimeout(400);
  const socLevels = await page.locator('.level-btn').count();
  check('社科有 4 个章节', socLevels === 4, `${socLevels} 个`);

  // ---------- SQ 模块 ----------
  await page.goto(url(path.join(SITE, 'modules/sq-art-history.html')));
  await page.waitForTimeout(700);

  check('SQ welcome 可见', await page.locator('#welcomeView').isVisible());
  const sqHub = await page.locator('[data-hub-back]').count();
  check('SQ 有 3 处返回入口', sqHub === 3, `${sqHub} 处`);

  const qCount = await page.locator('#welcomeCount').textContent();
  check('SQ 显示题数 5', qCount.trim() === '5', qCount);

  await page.locator('#startBtn').click();
  await page.waitForTimeout(400);
  check('SQ 进入答题视图', await page.locator('#gameView').isVisible());

  const qText = await page.locator('#questionText').textContent();
  check('SQ 显示题目', qText && qText.length > 10, qText.slice(0, 50));

  const optCount = await page.locator('#options .option').count();
  check('SQ 每题 4 个选项', optCount === 4, `${optCount} 个`);

  // 选项是纯展示 div（无点击处理器），点它不应产生任何变化
  const beforeClick = await page.locator('#options .option.is-answer').count();
  await page.locator('#options .option').first().click({ force: true });
  await page.waitForTimeout(300);
  const afterClick = await page.locator('#options .option.is-answer').count();
  check('点选项不判分（倒计时揭示式玩法）', afterClick === beforeClick,
    `点前 ${beforeClick} 个高亮 / 点后 ${afterClick} 个`);

  // 计时中不给翻页，Next 先禁用
  await page.locator('#timerBtn').click();
  await page.waitForTimeout(1200);
  const nextDisabled = await page.locator('#nextBtn').isDisabled();
  check('计时启动后 Next 禁用', nextDisabled === true, String(nextDisabled));

  const timerNum = await page.locator('#timerNum').textContent();
  check('倒计时在走', parseInt(timerNum, 10) < 10 && parseInt(timerNum, 10) > 0, timerNum);

  // 等倒计时结束 → 揭晓答案
  await page.waitForTimeout(9500);
  const revealed = await page.locator('#options .option.is-answer').count();
  check('倒计时结束揭晓正确项', revealed === 1, `${revealed} 个高亮`);

  const nextEnabled = await page.locator('#nextBtn').isDisabled();
  check('揭晓后 Next 恢复可点', nextEnabled === false, String(nextEnabled));

  // 下一题 → 上一题 → 高亮仍在
  await page.locator('#nextBtn').click();
  await page.waitForTimeout(400);
  await page.locator('#prevBtn').click();
  await page.waitForTimeout(400);
  const stillRevealed = await page.locator('#options .option.is-answer').count();
  check('Prev 回去后高亮仍在', stillRevealed === 1, `${stillRevealed} 个高亮`);

  // SQ 不写 localStorage
  const sqStore = await page.evaluate(() => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
    return keys.filter((k) => k && k.indexOf('sq') >= 0);
  });
  check('SQ 不写 localStorage（既定取舍）', sqStore.length === 0, sqStore.join(','));

  // ---------- 移动端 ----------
  const mobile = await ctx.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto(url(path.join(SITE, 'ap/index.html')));
  await mobile.waitForTimeout(400);
  const cols = await mobile.locator('.choice-grid').evaluate(
    (el) => getComputedStyle(el).gridTemplateColumns.split(' ').length
  );
  check('移动端单列', cols === 1, `${cols} 列`);

  const overflow = await mobile.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  check('移动端无横向溢出', overflow <= 1, `溢出 ${overflow}px`);
  await mobile.close();

  // ---------- 控制台 ----------
  check('控制台无 JS 报错', errors.length === 0, errors.slice(0, 3).join(' | '));

  await browser.close();
  console.log();
  console.log(fails === 0 ? '[OK] 浏览器实测全部通过' : `[FAIL] ${fails} 项未通过`);
  process.exit(fails === 0 ? 0 : 1);
})();
