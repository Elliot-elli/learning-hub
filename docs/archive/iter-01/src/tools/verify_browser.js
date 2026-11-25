/* Browser checks for the two independent Learning Hub sites.
 *
 * Covers what static checks cannot: the navigation chain, the sidebar
 * hierarchy, the back control, breadcrumbs, browser back and forward,
 * scroll position restoration and the LocalStorage archive.
 *
 * Run with:  node tools/verify_browser.js
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

function siteUrl(site, file) {
  const target = path.join(DIST, site, file || 'index.html');
  return 'file:///' + target.replace(/\\/g, '/');
}

/* Reads the visible text of the breadcrumb trail. */
async function crumbText(page) {
  return (await page.locator('#head-top .crumb-link, #head-top .crumb-current').allTextContents())
    .map((t) => t.trim()).filter(Boolean);
}

/* True when the control shows no text of its own. */
async function hasNoText(page, selector) {
  const node = page.locator(selector).first();
  if ((await node.count()) === 0) return null;
  const text = (await node.textContent() || '').trim();
  const label = await node.getAttribute('aria-label');
  return text === '' && !!label;
}

async function testSite(browser, site, expectedSubjects) {
  console.log('\n=== ' + site + ' ===');

  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  /* ---- the site opens straight onto its own overview ---- */
  await page.goto(siteUrl(site));
  await page.waitForSelector('.stat-tile');

  const title = await page.title();
  check(site + ': opens on its own overview', /Learning Hub/.test(title), title);
  check(site + ': no programme picker on the landing page',
    (await page.locator('.tile-card').count()) === 0);

  /* ---- the sidebar holds the three top level pages ---- */
  const navLabels = (await page.locator('#site-nav .nav-item').allTextContents())
    .map((t) => t.trim().split('\n')[0]);
  check(site + ': sidebar shows Overview, Courses and Review',
    navLabels.length === 3 &&
    navLabels[0] === 'Overview' && navLabels[1] === 'Courses' &&
    navLabels[2] === 'Review', navLabels.join(','));

  const bodyText = await page.locator('body').innerText();
  check(site + ': no Assignments entry', !/Assignments/.test(bodyText));
  check(site + ': no Reports entry', !/Reports/.test(bodyText));
  check(site + ': no Settings entry', !/Settings/.test(bodyText));
  check(site + ': no Inbox entry', !/Inbox/.test(bodyText));

  /* ---- Overview is a top level page: no way back out of it ---- */
  check(site + ': the overview has no back control',
    (await page.locator('.back-icon').count()) === 0);
  check(site + ': the overview has no breadcrumb trail',
    (await crumbText(page)).length === 0);

  const activeOnOverview = await page.locator('#site-nav .nav-item.is-active')
    .allTextContents();
  check(site + ': Overview is selected on the overview',
    activeOnOverview.length === 1 && activeOnOverview[0].startsWith('Overview'),
    activeOnOverview.join(','));

  /* ---- no unfinished activity types are offered ---- */
  check(site + ': no Quiz entry', !/\bQuiz\b/.test(bodyText));
  check(site + ': no Matching entry', !/\bMatching\b/.test(bodyText));
  check(site + ': no MCQ entry', !/\bMCQ\b/.test(bodyText));
  check(site + ': no Planned badge', !/Planned/.test(bodyText));

  /* ---- Courses is a top level page of its own ---- */
  await page.locator('#site-nav a', { hasText: 'Courses' }).click();
  await page.waitForSelector('.tile-card');
  const subjectTitles = await page.locator('.tile-card h3').allTextContents();
  check(site + ': courses page lists this site\'s subjects',
    subjectTitles.length === expectedSubjects.length &&
    expectedSubjects.every((s) => subjectTitles.includes(s)),
    subjectTitles.join(','));

  /* Picking Courses from the sidebar makes Courses the first level of
     that interface, so it must not offer a route back to Overview. */
  check(site + ': the courses page has no back control',
    (await page.locator('.back-icon').count()) === 0);
  check(site + ': the courses page breadcrumb does not mention Overview',
    !(await crumbText(page)).includes('Overview'),
    (await crumbText(page)).join('/'));
  check(site + ': the courses page has no trail at all',
    (await crumbText(page)).length === 0);

  const activeOnCourses = await page.locator('#site-nav .nav-item.is-active')
    .allTextContents();
  check(site + ': Courses is selected on the courses page',
    activeOnCourses.length === 1 && activeOnCourses[0].startsWith('Courses'),
    activeOnCourses.join(','));

  /* ---- subject page: it sits under Courses ---- */
  await page.locator('.tile-card a.icon-cta').first().click();
  await page.waitForSelector('.section-row');
  const subjectCrumb = await crumbText(page);
  check(site + ': subject page breadcrumb reads Courses / subject',
    subjectCrumb.length === 2 && subjectCrumb[0] === 'Courses',
    subjectCrumb.join('/'));
  check(site + ': subject page has a back control',
    (await page.locator('.back-icon').count()) === 1);

  /* The back control is a shape, not a word. */
  check(site + ': the back control shows no text',
    (await hasNoText(page, '.back-icon')) === true);
  check(site + ': the back control points at Courses',
    (await page.locator('.back-icon').getAttribute('href')) === 'courses.html');

  const activeOnSubject = await page.locator('#site-nav .nav-item.is-active')
    .allTextContents();
  check(site + ': Courses stays selected on the subject page',
    activeOnSubject.length === 1 && activeOnSubject[0].startsWith('Courses'),
    activeOnSubject.join(','));

  const sectionHref = await page.locator('.section-row a.icon-cta').first().getAttribute('href');
  check(site + ': a section links straight to flashcards',
    /^flashcards\.html\?m=/.test(sectionHref || ''), sectionHref || '');

  /* ---- the flashcards page opens with a breadcrumb and a way back ---- */
  await page.locator('.section-row a.icon-cta').first().click();
  await page.waitForSelector('#startBtn');
  const gameCrumb = await page.locator('#gameCrumbs .crumb-link, #gameCrumbs .crumb-current')
    .allTextContents();
  check(site + ': flashcards page shows the full trail',
    gameCrumb.length === 3 && gameCrumb[0] === 'Courses',
    gameCrumb.join('/'));
  check(site + ': the flashcards page has a back control',
    (await page.locator('.game-back').count()) === 1);
  check(site + ': the flashcards back control shows no text',
    (await hasNoText(page, '.game-back')) === true);
  check(site + ': the flashcards back control points at the subject',
    /^subject\.html\?subject=/.test(
      (await page.locator('.game-back').getAttribute('href')) || ''));

  /* ---- the game itself still works ---- */
  await page.locator('#startBtn').click();
  await page.waitForSelector('.level-btn');
  const chapters = await page.locator('.level-btn').count();
  check(site + ': the deck opens its chapter list', chapters > 0, 'chapters=' + chapters);

  /* The engine's own back button keeps working and shows no text. */
  check(site + ': the engine back button shows no text',
    (await hasNoText(page, '#levelsBackBtn')) === true);

  /* The floating control and the engine's toolbar button both live on
     the left. One must not cover the other, or the covered button
     cannot be clicked.

     The hit test has to run while the chapter list is the view on
     screen: the engine cross-fades between views, and a test that
     fires during the fade measures the wrong layer. */
  await page.waitForFunction(() =>
    document.querySelector('#levelsView').classList.contains('active'));
  await page.waitForTimeout(300);
  const engineHit = await page.evaluate(() => {
    var btn = document.querySelector('#levelsBackBtn');
    var box = btn.getBoundingClientRect();
    var hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return hit !== null && btn.contains(hit);
  });
  check(site + ': the engine back button is not covered by the floating one',
    engineHit);

  /* The same check on the game screen, where the exit button sits. */
  await page.locator('.level-btn').first().click();
  await page.waitForSelector('#flashcard');
  await page.waitForFunction(() =>
    document.querySelector('#gameView').classList.contains('active'));
  await page.waitForTimeout(500);
  const exitHit = await page.evaluate(() => {
    var btn = document.querySelector('#levelsExitBtn');
    var box = btn.getBoundingClientRect();
    var hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return hit !== null && btn.contains(hit);
  });
  check(site + ': the game exit button is reachable', exitHit);

  /* A view that is not on screen must not leave a faded layer behind. */
  const faded = await page.evaluate(() => {
    var hidden = [];
    document.querySelectorAll('.view:not(.active)').forEach(function (v) {
      if (getComputedStyle(v).visibility !== 'hidden') hidden.push(v.id);
    });
    return hidden;
  });
  check(site + ': views that are switched away leave nothing on screen',
    faded.length === 0, faded.join(','));

  await page.locator('#levelsExitBtn').click();
  await page.waitForTimeout(400);
  await page.locator('.level-btn').first().click();
  await page.waitForSelector('#flashcard');
  const front = await page.locator('#frontText').textContent();
  check(site + ': a card renders', !!(front && front.trim().length), (front || '').slice(0, 40));

  /* ---- the archive is written under the expected key ---- */
  await page.locator('#flashcard').click();
  await page.waitForTimeout(150);
  await page.locator('.state-btn.know').click();
  await page.waitForTimeout(200);
  const keys = await page.evaluate(() => Object.keys(localStorage));
  const expectedPrefix = 'fx_fc_v1:' + site;
  check(site + ': progress is stored under the site\'s own key',
    keys.some((k) => k.startsWith(expectedPrefix)), keys.join(','));

  /* ---- browser back returns to the subject page ---- */
  await page.goBack();
  await page.waitForSelector('.section-row');
  check(site + ': browser back returns to the subject page',
    (await page.locator('.section-row').count()) > 0);

  /* ---- browser forward returns to the game ---- */
  await page.goForward();
  await page.waitForSelector('#startBtn');
  check(site + ': browser forward returns to the flashcards page',
    (await page.locator('#startBtn').count()) === 1);

  /* ---- the back control on the subject page leads to courses ---- */
  await page.goBack();
  await page.waitForSelector('.section-row');
  await page.locator('.back-icon').click();
  await page.waitForSelector('.tile-card');
  check(site + ': the back control leads to the courses page',
    (await page.locator('.tile-card').count()) > 0);
  check(site + ': the courses page still offers no way back',
    (await page.locator('.back-icon').count()) === 0);

  /* ---- Review is a top level page of its own ---- */
  await page.locator('#site-nav a', { hasText: 'Review' }).click();
  await page.waitForSelector('.panel');
  check(site + ': the review page has no back control',
    (await page.locator('.back-icon').count()) === 0);
  check(site + ': the review page has no breadcrumb trail',
    (await crumbText(page)).length === 0);

  const activeOnReview = await page.locator('#site-nav .nav-item.is-active')
    .allTextContents();
  check(site + ': Review is selected on the review page',
    activeOnReview.length === 1 && activeOnReview[0].startsWith('Review'),
    activeOnReview.join(','));

  const reviewText = await page.locator('body').innerText();
  check(site + ': the review page shows its waiting list',
    /Waiting for review/.test(reviewText));

  /* ---- the review module reacts to real progress ----
     A term marked unsure belongs in the waiting list, a term already
     mastered does not, and the sidebar badge counts the rest. The
     module and its chapter count come from the site's own
     configuration, so the check works the same way on both sites.

     The cleared chapter count is one short of the total, which puts
     the section in the state the page describes: started, not done. */
  const deck = await page.evaluate(() => {
    var site = window.LH_SITE;
    var section = site.subjects[0].sections[0];
    return { module: section.module, chapters: section.chapters };
  });
  const clearedCount = Math.max(0, deck.chapters - 1);
  const clearedMap = {};
  for (let i = 1; i <= clearedCount; i += 1) {
    clearedMap['chapter' + i] = { known: 2, reviewed: 3, ts: 1 };
  }

  await page.evaluate((payload) => {
    localStorage.setItem(payload.key, JSON.stringify({
      v: 1,
      cleared: payload.cleared,
      review: {
        Animal: { state: 'uncertain', ts: 1 },
        Ecosystem: { state: 'unknown', ts: 1 },
        Plant: { state: 'uncertain', ts: 1 }
      },
      mastered: { Plant: { ts: 1 } },
      progress: {}
    }));
  }, { key: 'fx_fc_v1:' + deck.module, cleared: clearedMap });
  await page.reload();
  await page.waitForSelector('.panel');

  const waiting = await page.locator('.panel').first().locator('.section-row h3')
    .allTextContents();
  check(site + ': flagged terms appear in the waiting list',
    waiting.includes('Animal') && waiting.includes('Ecosystem'),
    waiting.join(','));
  check(site + ': a term already learned is left out',
    !waiting.includes('Plant'), waiting.join(','));

  const badge = await page.locator('#site-nav .nav-badge').allTextContents();
  check(site + ': the sidebar badge counts the terms still waiting',
    badge.length === 1 && badge[0] === '2', badge.join(','));

  /* A section with progress but not all of it is unfinished work. A
     deck with a single chapter cannot sit in that state: it is either
     untouched or done. */
  const unfinished = await page.locator('.panel').nth(1).locator('.section-row h3')
    .allTextContents();
  if (deck.chapters > 1) {
    check(site + ': a section with progress shows as unfinished',
      unfinished.length > 0, unfinished.join(','));
  } else {
    check(site + ': a single chapter deck never shows as unfinished',
      unfinished.length === 0, unfinished.join(','));
  }

  /* Clean up so the next site starts from an empty archive. */
  await page.evaluate((key) => localStorage.removeItem(key), 'fx_fc_v1:' + deck.module);
  await page.reload();
  await page.waitForSelector('.panel');
  check(site + ': the waiting list empties once the archive is cleared',
    (await page.locator('#site-nav .nav-badge').count()) === 0);

  /* ---- scroll position is restored on the way back ----
     The shipped lists are short, so the check uses a short viewport:
     the real page then overflows and the scroll offset is genuine.
     Nothing is injected, so the page that comes back is the same one
     that was left. */
  const tall = await browser.newContext({ viewport: { width: 1440, height: 220 } });
  const tallPage = await tall.newPage();
  await tallPage.goto(siteUrl(site, 'subject.html?subject=' +
    (site === 'ap' ? 'social-science' : 'art-history')));
  await tallPage.waitForSelector('.section-row');

  const maxScroll = await tallPage.evaluate(() =>
    document.documentElement.scrollHeight - document.documentElement.clientHeight);
  check(site + ': the scroll check runs on a page that can scroll',
    maxScroll > 20, 'maxScroll=' + maxScroll);

  await tallPage.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await tallPage.waitForTimeout(150);
  const before = await tallPage.evaluate(() => window.scrollY);
  check(site + ': the list was scrolled before leaving', before > 0, 'scrollY=' + before);

  await tallPage.locator('.section-row a.icon-cta').first().click();
  await tallPage.waitForSelector('#startBtn');
  await tallPage.goBack();
  await tallPage.waitForSelector('.section-row');
  await tallPage.waitForTimeout(300);
  const after = await tallPage.evaluate(() => window.scrollY);
  check(site + ': returning to a section list keeps the scroll position',
    Math.abs(after - before) <= 2, 'before=' + before + ' after=' + after);
  await tall.close();

  check(site + ': no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  await context.close();
}

(async () => {
  if (!fs.existsSync(CHROME)) {
    console.error('Chromium not found: ' + CHROME);
    process.exit(1);
  }

  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-proxy-server', '--proxy-bypass-list=*', '--disable-gpu', '--no-sandbox'],
  });

  try {
    await testSite(browser, 'ap', ['Science', 'Social Science']);
    await testSite(browser, 'ad', ['Art History']);
  } finally {
    await browser.close();
  }

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if (failed) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log('  - ' + f));
    process.exit(1);
  }
})();
