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
const DIST = path.resolve(__dirname, '..', 'site');

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

  /* The card faces the reader with the term and turns over to the
     definition. The engine writes the two into different faces, so
     both are read after a flip. */
  const gameTerm = (await page.locator('#frontText').textContent() || '').trim();
  await page.locator('#flashcard').click();
  await page.waitForTimeout(800);
  const gameDefinition = (await page.locator('#backText').textContent() || '').trim();
  check(site + ': the flashcard shows the term first and the meaning on the back',
    gameTerm.length > 0 && gameDefinition.length > 0 &&
    gameTerm !== gameDefinition, gameTerm.slice(0, 30) + ' | ' + gameDefinition.slice(0, 30));
  await page.locator('#flashcard').click();
  await page.waitForTimeout(800);

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

  /* ---- the review centre is a page of its own ----
     The review path is checked separately, in testReview(). */

  check(site + ': no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  await context.close();
}

/* The review path: Review -> Subject -> Section -> Review list -> Session.
 *
 * The checks follow the rules the review centre has to keep:
 *
 *   - Review is its own entry, and it is not inside the flashcards.
 *   - Only the terms a learner flagged while learning are in the queue.
 *   - One term is one record, however often it is flagged.
 *   - The list is grouped by state, and the counts match the list.
 *   - A session reveals the answer before a result can be given, saves
 *     the result before moving on, and cannot be submitted twice.
 *   - Every level goes back to its parent, the browser back button
 *     walks the same path, and a deep link survives a reload.
 */
async function testReview(browser, site, subjectIds) {
  console.log('\n=== ' + site + ' review centre ===');

  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(siteUrl(site, 'review.html'));
  await page.waitForSelector('.review-tabs');

  /* The decks, and the terms in them, come from the site's own
     configuration, so the same checks run on both sites. */
  const decks = await page.evaluate(() => {
    var out = [];
    (window.LH_SITE.subjects || []).forEach(function (subject) {
      (subject.sections || []).forEach(function (section) {
        var deck = (window.AP_MODULES || {})[section.module] || {};
        var terms = [];
        (deck.sections || []).forEach(function (chapter) {
          (chapter.levels || []).forEach(function (level) {
            (level.cards || []).forEach(function (card) { terms.push(card.term); });
          });
        });
        out.push({
          subjectId: subject.id,
          subjectTitle: subject.title,
          sectionId: section.id,
          sectionTitle: section.title,
          module: section.module,
          storeKey: section.storeKey,
          terms: terms
        });
      });
    });
    return out;
  });

  const deckA = decks[0];
  const deckB = decks[1] || null;
  const unsureTerm = deckA.terms[0];
  const unknownTerm = deckA.terms[1];
  const learnedTerm = deckA.terms[2];
  const untouchedTerm = deckA.terms[3];

  /* ---- the review page is its own entry ---- */
  check(site + ': the review page shows the subjects as tabs',
    (await page.locator('.review-tab').count()) === subjectIds.length,
    String(await page.locator('.review-tab').count()));
  check(site + ': the subject tabs are laid out in a row',
    await page.evaluate(() => {
      var tabs = Array.prototype.slice.call(document.querySelectorAll('.review-tab'));
      if (tabs.length < 2) return true;
      var first = tabs[0].getBoundingClientRect();
      var second = tabs[1].getBoundingClientRect();
      /* Side by side: the second tab starts near where the first ends. */
      return second.left >= first.right - 2 && Math.abs(second.top - first.top) < 4;
    }));
  check(site + ': the review home has a way back to the overview',
    (await page.locator('.back-icon').getAttribute('href')) === 'index.html');

  const activeOnReview = await page.locator('#site-nav .nav-item.is-active')
    .allTextContents();
  check(site + ': Review is selected on the review page',
    activeOnReview.length === 1 && activeOnReview[0].startsWith('Review'),
    activeOnReview.join(','));

  /* ---- an empty review queue says so, and says nothing more ---- */
  check(site + ': an empty review queue shows a plain empty state',
    (await page.locator('.empty strong').allTextContents()).join('') === 'All clear');

  /* ---- only the flagged terms enter the queue ---- */
  await page.evaluate((payload) => {
    localStorage.setItem(payload.key, JSON.stringify({
      v: 1,
      cleared: {},
      review: payload.review,
      mastered: payload.mastered,
      progress: {}
    }));
  }, {
    key: 'fx_fc_v1:' + deckA.module,
    review: {
      [unsureTerm]: { state: 'uncertain', ts: 1700000000 },
      [unknownTerm]: { state: 'unknown', ts: 1700000001 }
    },
    mastered: { [learnedTerm]: { ts: 1700000002 } }
  });

  await page.reload();
  await page.waitForSelector('.review-tabs');

  const badge = await page.locator('#site-nav .nav-badge').allTextContents();
  check(site + ': the sidebar badge counts the terms still waiting',
    badge.length === 1 && badge[0] === '2', badge.join(','));

  const rowCount = await page.locator('.row-count').allTextContents();
  check(site + ': the section shows how many terms are waiting',
    rowCount.length === 1 && rowCount[0] === '02', rowCount.join(','));

  /* The default subject is the one with something waiting. */
  const activeTab = await page.locator('.review-tab.is-active .review-tab-name')
    .allTextContents();
  check(site + ': the subject with terms waiting is picked first',
    activeTab.length === 1 && activeTab[0] === deckA.subjectTitle,
    activeTab.join(','));

  /* ---- picking a subject shows its sections ---- */
  if (deckB) {
    await page.locator('.review-tab', { hasText: deckB.subjectTitle }).click();
    await page.waitForTimeout(200);
    check(site + ': picking a subject keeps the page in the review path',
      !/flashcards/.test(page.url()), page.url());
    check(site + ': a subject with nothing waiting shows the empty state',
      (await page.locator('.empty').count()) === 1);
    await page.goBack();
    await page.waitForTimeout(200);
  }

  /* ---- the review list of a section ---- */
  await page.locator('.review-row').first().click();
  await page.waitForSelector('.review-group');

  const groups = await page.locator('.review-group-title').allTextContents();
  check(site + ': the list is grouped by review state',
    groups.join('|') === 'Needs practice|Still learning|Mastered', groups.join('|'));

  const practice = await page.locator('.review-group').nth(0)
    .locator('.review-term-text').allTextContents();
  const learning = await page.locator('.review-group').nth(1)
    .locator('.review-term-text').allTextContents();
  const mastered = await page.locator('.review-mastered .review-term-text')
    .allTextContents();

  check(site + ': a term marked unknown needs practice',
    practice.join(',') === unknownTerm, practice.join(','));
  check(site + ': a term marked unsure is still learning',
    learning.join(',') === unsureTerm, learning.join(','));
  check(site + ': a term already learned is kept apart from the queue',
    mastered.join(',') === learnedTerm, mastered.join(','));
  check(site + ': a term that was never flagged is not in the list',
    !practice.includes(untouchedTerm) && !learning.includes(untouchedTerm) &&
    !mastered.includes(untouchedTerm));

  /* The mastered group is folded away until it is asked for. */
  check(site + ': the mastered group starts folded',
    !(await page.locator('.review-mastered').evaluate((n) => n.open)));

  /* The way back from a section goes to the subject, not to the cards. */
  check(site + ': the review list goes back to its subject',
    /subject=/.test(await page.locator('.back-icon').getAttribute('href')) &&
    !/flashcards/.test(await page.locator('.back-icon').getAttribute('href')));

  /* ---- one term is one record ---- */
  await page.evaluate((payload) => {
    var raw = JSON.parse(localStorage.getItem(payload.key));
    raw.review[payload.term] = { state: 'unknown', ts: 1700000900 };
    localStorage.setItem(payload.key, JSON.stringify(raw));
  }, { key: 'fx_fc_v1:' + deckA.module, term: unsureTerm });
  await page.reload();
  await page.waitForSelector('.review-group');

  const afterReflag = await page.locator('.review-term-text').allTextContents();
  const duplicates = afterReflag.filter((t, i) => afterReflag.indexOf(t) !== i);
  check(site + ': flagging a term again does not add a second record',
    duplicates.length === 0, duplicates.join(','));
  const badgeAfter = await page.locator('#site-nav .nav-badge').allTextContents();
  check(site + ': the count still counts each term once',
    badgeAfter.length === 1 && badgeAfter[0] === '2', badgeAfter.join(','));

  /* ---- a session ---- */
  await page.locator('.review-start').click();
  await page.waitForSelector('.rs-prompt');

  check(site + ': a result cannot be given before the answer is revealed',
    (await page.locator('.rs-results').count()) === 0);
  /* The answer must be hidden, not merely absent from the text. */
  check(site + ': the answer is hidden before it is asked for',
    (await page.locator('.rs-answer-text').count()) === 0 ||
    !(await page.locator('.rs-answer-text').first().isVisible()));
  check(site + ': the session shows how far along the round is',
    /^\d{2} \/ \d{2}$/.test((await page.locator('#rsProgress').textContent()) || ''),
    await page.locator('#rsProgress').textContent());

  await page.locator('#rsReveal').click();
  await page.waitForSelector('.rs-results');
  check(site + ': the answer is shown once it has been asked for',
    ((await page.locator('.rs-answer-text').textContent()) || '').length > 0);
  /* Visibility, not just text: a hidden element still answers
     textContent, so the text check alone cannot see a broken reveal. */
  check(site + ': the answer is actually visible after the reveal',
    await page.locator('.rs-answer-text').first().isVisible());

  /* The card follows the flashcard game: the term on the front, the
     meaning revealed on request. */
  const prompt = await page.locator('.rs-prompt').textContent();
  const revealed = await page.locator('.rs-answer-text').textContent();
  check(site + ': the card shows the term and reveals the meaning',
    (prompt || '').length > 0 && (revealed || '').length > 0 &&
    prompt.trim() !== revealed.trim());

  /* Two clicks in a row must not carry on into the next card. */
  const termBefore = await page.locator('.rs-prompt').textContent();
  await page.locator('.rs-unsure').click();
  await page.locator('.rs-unsure').click({ force: true }).catch(() => {});
  await page.waitForTimeout(250);
  const progressAfterDouble = await page.locator('#rsProgress').textContent();
  check(site + ': a second click does not submit the same card twice',
    progressAfterDouble === '02 / 02', progressAfterDouble);
  check(site + ': the round moved on to the next term',
    (await page.locator('.rs-prompt').textContent()) !== termBefore ||
    (await page.locator('.rs-done').count()) === 1);

  /* The result is kept, and the term is still waiting. */
  await page.waitForTimeout(500);
  await page.locator('#rsReveal').click();
  await page.waitForSelector('.rs-results');
  await page.locator('.rs-again').click();
  await page.waitForTimeout(500);

  const afterRound = await page.evaluate((payload) => {
    var raw = JSON.parse(localStorage.getItem(payload.key) || 'null');
    return raw ? Object.keys(raw.review || {}).length : 0;
  }, { key: 'fx_fc_v1:' + deckA.module });
  check(site + ': the old archive is not emptied by a session',
    afterRound >= 2, String(afterRound));

  /* The round ends on the completion page and goes back to the section.
     A term marked "again" comes back later in the same round, so the
     round is walked until it is really over. */
  for (let step = 0; step < 4; step += 1) {
    if ((await page.locator('.rs-done').count()) === 1) break;
    if ((await page.locator('#rsReveal').count()) !== 1) break;
    await page.locator('#rsReveal').click();
    await page.waitForSelector('.rs-results');
    await page.waitForTimeout(500);
    await page.locator('.rs-again').click();
    await page.waitForTimeout(500);
  }
  check(site + ': the round ends on a completion page',
    (await page.locator('.rs-done').count()) === 1);
  check(site + ': the completion page reports the round',
    /^\d+ \/ \d+$/.test((await page.locator('.rs-done-count').textContent()) || ''),
    await page.locator('.rs-done-count').textContent());

  await page.locator('.rs-done .rs-primary').click();
  await page.waitForSelector('.review-group');
  check(site + ': the round goes back to the section it came from',
    /review\.html/.test(page.url()) && /section=/.test(page.url()), page.url());

  const stillWaiting = await page.locator('.review-term-text').allTextContents();
  check(site + ': finishing a round does not clear the terms that are not mastered',
    stillWaiting.length >= 2, stillWaiting.join(','));

  /* ---- the state survives a reload ---- */
  await page.reload();
  await page.waitForSelector('.review-group');
  const afterReload = await page.locator('.review-term-text').allTextContents();
  check(site + ': the review state is still there after a reload',
    afterReload.length >= 2, afterReload.join(','));

  /* ---- a deep link opened on its own ---- */
  const deep = await context.newPage();
  await deep.goto(siteUrl(site, 'review.html?subject=' + deckA.subjectId +
    '&section=' + deckA.sectionId));
  await deep.waitForSelector('.review-group');
  check(site + ': a deep link opens the review list on its own',
    (await deep.locator('.review-group').count()) >= 1);
  check(site + ': a deep link keeps the terms of its own section',
    (await deep.locator('.review-term-text').count()) >= 2);
  await deep.close();

  /* ---- quick clicks must not leave the page broken ---- */
  await page.goto(siteUrl(site, 'review.html'));
  await page.waitForSelector('.review-row');
  for (let i = 0; i < 3; i += 1) {
    await page.locator('.review-row').first().click({ force: true }).catch(() => {});
  }
  await page.waitForTimeout(300);
  const quickText = await page.locator('body').innerText();
  check(site + ': quick clicks leave the review path readable',
    quickText.trim().length > 0 && (await page.locator('.review-group').count()) >= 1,
    page.url());
  check(site + ': quick clicks do not pile up the query string',
    (page.url().match(/section=/g) || []).length === 1, page.url());

  /* ---- learning and review do not share a state ---- */
  await page.goto(siteUrl(site, 'review.html'));
  await page.waitForSelector('.review-row');
  await page.locator('.review-row').first().click();
  await page.waitForSelector('.review-group');
  const reviewUrl = page.url();
  const before = await page.locator('.review-term-text').allTextContents();

  await page.goto(siteUrl(site, 'subject.html?subject=' + deckA.subjectId));
  await page.waitForSelector('.section-row');
  await page.locator('.section-row a.icon-cta').first().click();
  await page.waitForSelector('#startBtn');
  await page.goBack();
  await page.waitForSelector('.section-row');

  await page.goto(reviewUrl);
  await page.waitForSelector('.review-group');
  const after = await page.locator('.review-term-text').allTextContents();
  check(site + ': the review list is the same after a trip through learning',
    before.join(',') === after.join(','),
    before.join(',') + ' vs ' + after.join(','));

  await page.goto(siteUrl(site, 'flashcards.html?m=' + deckA.module));
  await page.waitForSelector('#startBtn');
  check(site + ': the flashcards page carries no review list',
    (await page.locator('#reviewView').count()) === 0 &&
    (await page.locator('#reviewStatBtn').count()) === 0 &&
    (await page.locator('#levelsReviewBtn').count()) === 0);
  await page.goto(siteUrl(site, 'subject.html?subject=' + deckA.subjectId));
  await page.waitForSelector('.section-row');
  check(site + ': the subject page still leads to the flashcards',
    /^flashcards\.html\?m=/.test(
      await page.locator('.section-row a.icon-cta').first().getAttribute('href')));

  check(site + ': the review centre raised no console errors',
    errors.length === 0, errors.slice(0, 3).join(' | '));

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
    await testReview(browser, 'ap', ['science', 'social-science']);
    await testSite(browser, 'ad', ['Art History']);
    await testReview(browser, 'ad', ['art-history']);
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
