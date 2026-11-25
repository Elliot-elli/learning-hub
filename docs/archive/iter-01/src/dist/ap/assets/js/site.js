/* Learning Hub -- shared site front end.
 *
 * One file serves every page of a site. The page type comes from
 * body[data-view]: overview | courses | subject | review.
 *
 * The sidebar holds three independent sections of the site. Each one is
 * a top level in its own right: picking Courses opens Courses, not a
 * child of Overview. A page that is not a child of anything therefore
 * shows no way back, and the only way out is the sidebar.
 *
 *   Overview   the dashboard
 *   Courses    subjects of this site, then their sections
 *   Review     terms waiting to be looked at again
 *
 * Courses reaches down to Subject, and Subject reaches down to the
 * flashcards. Those two are the only pages with a back control, and it
 * always points one level up inside the same section.
 *
 * Progress comes from localStorage, one key per section. The engine owns
 * that format; this file only reads it. */

(function () {
  'use strict';

  var site = window.LH_SITE || { id: '', name: '', brand: '', subjects: [] };
  var body = document.body;
  var view = body.getAttribute('data-view') || 'overview';
  var main = document.getElementById('site-main');
  var navEl = document.getElementById('site-nav');
  var headTop = document.getElementById('head-top');
  var titleEl = document.getElementById('page-title');
  var sidebar = document.getElementById('sidebar');
  var scrim = document.getElementById('scrim');

  var subjects = site.subjects || [];
  var allSections = [];
  subjects.forEach(function (subject) {
    (subject.sections || []).forEach(function (section) {
      allSections.push({ subject: subject, section: section });
    });
  });

  /* ---------- icons ---------- */
  var ICONS = {
    overview: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    courses: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z"/><path d="M4 5.5v15"/></svg>',
    review: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z"/><path d="m9 10 2 2 4-4"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    cards: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="13" height="15" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v13"/></svg>',
    layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 9 5-9 5-9-5Z"/><path d="m3 13 9 5 9-5"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    chapter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h7v15H4z"/><path d="M13 5h7v15h-7z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>'
  };

  /* ---------- helpers ---------- */
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function icon(name, cls) {
    var span = el('span', cls || 'nav-icon');
    span.innerHTML = ICONS[name] || '';
    return span;
  }

  function plural(n, word) {
    return n + ' ' + word + (n === 1 ? '' : 's');
  }

  function param(name) {
    return new URLSearchParams(location.search).get(name) || '';
  }

  /* ---------- progress (localStorage) ----------
     The engine writes {v,cleared,review,mastered,progress} under one key
     per section. Chapter ids run chapter1..chapterN in deck order. */
  function readStore(key) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function sectionProgress(section) {
    var store = readStore(section.storeKey);
    var cleared = store && store.cleared ? Object.keys(store.cleared).length : 0;
    var mastered = store && store.mastered ? Object.keys(store.mastered).length : 0;
    var pct = section.chapters ? Math.round((cleared / section.chapters) * 100) : 0;
    return {
      cleared: cleared,
      mastered: mastered,
      total: section.chapters,
      pct: Math.min(100, pct),
      started: cleared > 0 || mastered > 0
    };
  }

  function totals() {
    var cards = 0, chapters = 0, cleared = 0, mastered = 0;
    allSections.forEach(function (entry) {
      var section = entry.section;
      var p = sectionProgress(section);
      cards += section.cards;
      chapters += section.chapters;
      cleared += p.cleared;
      mastered += p.mastered;
    });
    return {
      cards: cards,
      chapters: chapters,
      cleared: cleared,
      mastered: mastered,
      subjects: subjects.length,
      sections: allSections.length,
      pct: chapters ? Math.round((cleared / chapters) * 100) : 0
    };
  }

  function findSubject(id) {
    var found = null;
    subjects.forEach(function (s) { if (s.id === id) found = s; });
    return found;
  }

  /* Terms the learner flagged and has not marked as learned yet. */
  function pendingReview() {
    var pending = [];
    allSections.forEach(function (entry) {
      var store = readStore(entry.section.storeKey);
      if (!store || !store.review) return;
      var mastered = store.mastered || {};
      Object.keys(store.review).forEach(function (term) {
        if (!mastered[term]) {
          pending.push({ term: term, subject: entry.subject, section: entry.section });
        }
      });
    });
    return pending;
  }

  /* ---------- scroll position memory ----------
     Returning from a section list should land where the reader left off.
     The key names the page and, on the subject page, the subject, so
     moving between subjects does not inherit another list's offset.

     The position is captured when a link is followed, not on unload:
     by the time the page is torn down the browser has already reset
     the scroll offset, so the value read then is not the one the reader
     left at. */
  function scrollKey() {
    var key = 'lh-scroll:' + site.id + ':' + view;
    if (view === 'subject') key += ':' + param('subject');
    return key;
  }

  function saveScroll() {
    try {
      sessionStorage.setItem(scrollKey(), String(window.scrollY));
    } catch (e) { /* storage blocked */ }
  }

  function restoreScroll() {
    var raw = null;
    try {
      raw = sessionStorage.getItem(scrollKey());
    } catch (e) { return; }
    if (!raw) return;
    var y = parseInt(raw, 10);
    if (!isNaN(y) && y > 0) window.scrollTo(0, y);
  }

  /* Record the offset before any in-site link is followed. */
  document.addEventListener('click', function (event) {
    var link = event.target.closest('a');
    if (!link) return;
    var href = link.getAttribute('href') || '';
    if (href.charAt(0) === '#') return;
    saveScroll();
  });

  /* ---------- sidebar ----------
     Three entries, each a top level page of its own. The selected entry
     follows the page: a subject page keeps Courses selected because it
     sits below Courses. */
  var NAV_ITEMS = [
    { id: 'overview', label: 'Overview', icon: 'overview', href: 'index.html' },
    { id: 'courses', label: 'Courses', icon: 'courses', href: 'courses.html' },
    { id: 'review', label: 'Review', icon: 'review', href: 'review.html' }
  ];

  /* Which sidebar entry reads as selected on each page. */
  var SELECTED_BY_VIEW = {
    overview: 'overview',
    courses: 'courses',
    subject: 'courses',
    review: 'review'
  };

  function buildNav() {
    if (!navEl) return;
    navEl.textContent = '';
    var selected = SELECTED_BY_VIEW[view];
    var pending = pendingReview().length;

    NAV_ITEMS.forEach(function (item) {
      var link = el('a', 'nav-item');
      link.href = item.href;
      if (item.id === selected) {
        link.className = 'nav-item is-active';
        link.setAttribute('aria-current', 'page');
      }
      link.appendChild(icon(item.icon));
      link.appendChild(el('span', null, item.label));
      if (item.id === 'review' && pending > 0) {
        link.appendChild(el('span', 'nav-badge', String(pending)));
      }
      navEl.appendChild(link);
    });
  }

  /* ---------- head: back control and breadcrumb ---------- */
  function crumb(label, href) {
    var node;
    if (href) {
      node = el('a', 'crumb-link', label);
      node.href = href;
    } else {
      node = el('span', 'crumb-current', label);
    }
    return node;
  }

  function buildCrumbs(trail) {
    if (!headTop) return;
    headTop.textContent = '';
    trail.forEach(function (item, index) {
      if (index > 0) headTop.appendChild(el('span', 'crumb-sep', '/'));
      headTop.appendChild(crumb(item.label, item.href));
    });
  }

  /* The back control is an arrow on its own: the shape carries the
     meaning, and it stays clear of the title. */
  function addBack(target, label) {
    if (!headTop) return;
    var link = el('a', 'back-icon');
    link.href = target.href;
    link.setAttribute('aria-label', label);
    link.title = label;
    link.appendChild(icon('back', 'back-icon-svg'));
    headTop.insertBefore(link, headTop.firstChild);
  }

  /* ---------- shared pieces ---------- */
  function statTile(label, value, tone, iconName) {
    var tile = el('article', 'stat-tile tile-' + tone);
    var top = el('div', 'tile-top');
    top.appendChild(icon(iconName, 'tile-icon'));
    top.appendChild(el('span', 'tile-label', label));
    tile.appendChild(top);
    tile.appendChild(el('div', 'tile-value', String(value)));
    return tile;
  }

  function meter(pct, tone) {
    var wrap = el('div', 'meter');
    var label = el('div', 'meter-label');
    label.appendChild(el('span', null, 'Progress'));
    label.appendChild(el('span', null, pct + '%'));
    wrap.appendChild(label);
    var track = el('div', 'meter-track');
    var fill = el('span', 'meter-fill' + (tone ? ' is-' + tone : ''));
    fill.style.width = pct + '%';
    track.appendChild(fill);
    wrap.appendChild(track);
    return wrap;
  }

  function panelHead(title) {
    var head = el('div', 'panel-head');
    head.appendChild(el('h2', null, title));
    return head;
  }

  function emptyBlock(title, note) {
    var empty = el('div', 'empty');
    empty.appendChild(el('strong', null, title));
    empty.appendChild(el('span', null, note));
    return empty;
  }

  function gauge(pct) {
    var wrap = el('div', 'gauge');
    var R = 62, C = 2 * Math.PI * R;
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 160 160');
    svg.setAttribute('width', '160');
    svg.setAttribute('height', '160');
    svg.setAttribute('aria-hidden', 'true');

    var track = document.createElementNS(svgNS, 'circle');
    track.setAttribute('cx', '80'); track.setAttribute('cy', '80'); track.setAttribute('r', String(R));
    track.setAttribute('fill', 'none'); track.setAttribute('stroke', '#DCEBF4');
    track.setAttribute('stroke-width', '14');
    svg.appendChild(track);

    var arc = document.createElementNS(svgNS, 'circle');
    arc.setAttribute('cx', '80'); arc.setAttribute('cy', '80'); arc.setAttribute('r', String(R));
    arc.setAttribute('fill', 'none'); arc.setAttribute('stroke', '#E3BB5B');
    arc.setAttribute('stroke-width', '14');
    arc.setAttribute('stroke-linecap', 'round');
    arc.setAttribute('stroke-dasharray', C);
    arc.setAttribute('stroke-dashoffset', String(C - (C * pct) / 100));
    arc.setAttribute('transform', 'rotate(-90 80 80)');
    svg.appendChild(arc);

    wrap.appendChild(svg);
    var read = el('div', 'gauge-read');
    read.appendChild(el('strong', null, pct + '%'));
    read.appendChild(el('span', null, 'chapters cleared'));
    wrap.appendChild(read);
    return wrap;
  }

  function cardBars() {
    var wrap = el('div', 'chart');
    var rows = subjects.map(function (subject) {
      var total = subject.sections.reduce(function (sum, s) { return sum + s.cards; }, 0);
      return { title: subject.title, value: total };
    });
    var max = rows.reduce(function (m, r) { return Math.max(m, r.value); }, 1);
    rows.forEach(function (row) {
      var line = el('div', 'chart-row');
      line.appendChild(el('span', 'chart-name', row.title));
      var track = el('span', 'chart-track');
      var fill = el('span', 'chart-fill');
      fill.style.width = Math.round((row.value / max) * 100) + '%';
      track.appendChild(fill);
      line.appendChild(track);
      line.appendChild(el('span', 'chart-value', String(row.value)));
      wrap.appendChild(line);
    });
    return wrap;
  }

  /* Section links go straight to the flashcards page. */
  function sectionHref(section) {
    return 'flashcards.html?m=' + encodeURIComponent(section.module);
  }

  function subjectHref(subject) {
    return 'subject.html?subject=' + encodeURIComponent(subject.id);
  }

  /* ---------- views ---------- */
  function renderOverview() {
    var t = totals();
    buildCrumbs([]);
    titleEl.textContent = 'Overview';

    var stats = el('div', 'stats');
    stats.appendChild(statTile('Subjects', t.subjects, 'lilac', 'layers'));
    stats.appendChild(statTile('Cards', t.cards, 'sky', 'cards'));
    stats.appendChild(statTile('Cleared', t.cleared + ' / ' + t.chapters, 'blush', 'check'));
    stats.appendChild(statTile('Mastered', t.mastered, 'cream', 'chapter'));
    main.appendChild(stats);

    var split = el('div', 'split');
    split.style.marginTop = '16px';

    var courses = el('section', 'panel');
    courses.appendChild(panelHead('Subjects'));
    var list = el('div', 'course-list');
    subjects.forEach(function (subject) {
      var row = el('article', 'course-row');
      var thumb = el('span', 'course-thumb');
      thumb.innerHTML = ICONS.layers;
      row.appendChild(thumb);

      var rowBody = el('div', 'course-body');
      rowBody.appendChild(el('h3', 'course-title', subject.title));
      var total = subject.sections.reduce(function (sum, s) { return sum + s.cards; }, 0);
      rowBody.appendChild(el('p', 'course-sub',
        plural(subject.sections.length, 'section') + ' · ' + plural(total, 'card')));
      row.appendChild(rowBody);

      var side = el('div', 'course-side');
      var cleared = subject.sections.reduce(function (sum, s) { return sum + sectionProgress(s).cleared; }, 0);
      var chapters = subject.sections.reduce(function (sum, s) { return sum + s.chapters; }, 0);
      var pct = chapters ? Math.round((cleared / chapters) * 100) : 0;
      side.appendChild(meter(pct, pct >= 100 ? 'green' : (pct > 0 ? 'amber' : null)));
      var cta = el('a', 'icon-cta');
      cta.href = subjectHref(subject);
      cta.setAttribute('aria-label', 'Open ' + subject.title);
      cta.title = subject.title;
      cta.appendChild(icon('arrow', 'cta-icon'));
      side.appendChild(cta);
      row.appendChild(side);
      list.appendChild(row);
    });
    courses.appendChild(list);
    split.appendChild(courses);

    var side = el('div', 'side-stack');
    var perf = el('section', 'panel');
    perf.appendChild(panelHead('Performance'));
    perf.appendChild(gauge(t.pct));
    side.appendChild(perf);

    var bars = el('section', 'panel');
    bars.appendChild(panelHead('Cards by subject'));
    bars.appendChild(cardBars());
    side.appendChild(bars);

    split.appendChild(side);
    main.appendChild(split);
  }

  function renderCourses() {
    /* Courses is a top level page: it has no parent, so it carries no
       back control and no trail above it. */
    buildCrumbs([]);
    titleEl.textContent = 'Courses';

    var grid = el('div', 'card-grid');
    subjects.forEach(function (subject) {
      var total = subject.sections.reduce(function (sum, s) { return sum + s.cards; }, 0);
      var cleared = subject.sections.reduce(function (sum, s) { return sum + sectionProgress(s).cleared; }, 0);
      var card = el('article', 'tile-card');
      var top = el('div', 'tile-top');
      var tileIcon = el('span', 'tile-icon');
      tileIcon.innerHTML = ICONS.layers;
      top.appendChild(tileIcon);
      top.appendChild(el('h3', null, subject.title));
      var arrow = el('a', 'icon-cta tile-arrow');
      arrow.href = subjectHref(subject);
      arrow.setAttribute('aria-label', 'Open ' + subject.title);
      arrow.title = subject.title;
      arrow.appendChild(icon('arrow', 'cta-icon'));
      top.appendChild(arrow);
      card.appendChild(top);
      card.appendChild(el('p', null, subject.description));
      var meta = el('div', 'card-meta');
      meta.appendChild(el('span', null, plural(subject.sections.length, 'section')));
      meta.appendChild(el('span', null, plural(total, 'card')));
      meta.appendChild(el('span', null, cleared + ' cleared'));
      card.appendChild(meta);
      grid.appendChild(card);
    });
    main.appendChild(grid);
  }

  function renderSubject() {
    var subject = findSubject(param('subject'));
    if (!subject) {
      location.replace('courses.html');
      return;
    }

    /* The subject sits under Courses, so the trail starts there and the
       back control points at the same place. */
    buildCrumbs([
      { label: 'Courses', href: 'courses.html' },
      { label: subject.title }
    ]);
    titleEl.textContent = subject.title;
    addBack({ href: 'courses.html' }, 'Back to Courses');

    var panel = el('section', 'panel');
    var rows = el('div', 'section-list');
    subject.sections.forEach(function (section) {
      var p = sectionProgress(section);
      var row = el('article', 'section-row');
      var grow = el('div', 'grow');
      grow.appendChild(el('h3', null, section.title));
      grow.appendChild(el('p', null,
        plural(section.cards, 'card') + ' · ' + plural(section.chapters, 'chapter')
        + (p.cleared ? ' · ' + p.cleared + ' cleared' : '')));
      row.appendChild(grow);

      var cta = el('a', 'icon-cta');
      cta.href = sectionHref(section);
      cta.setAttribute('aria-label', 'Open ' + section.title);
      cta.title = section.title;
      cta.appendChild(icon('arrow', 'cta-icon'));
      row.appendChild(cta);
      rows.appendChild(row);
    });
    panel.appendChild(rows);
    main.appendChild(panel);
  }

  function renderReview() {
    /* Review is a top level page of its own, like Courses. */
    buildCrumbs([]);
    titleEl.textContent = 'Review';

    var pending = pendingReview();
    var panel = el('section', 'panel');
    panel.appendChild(panelHead('Waiting for review'));
    if (!pending.length) {
      panel.appendChild(emptyBlock('Nothing to review',
        'Terms marked unsure or unknown collect here.'));
    } else {
      var rows = el('div', 'section-list');
      pending.slice(0, 40).forEach(function (item) {
        var row = el('article', 'section-row');
        var grow = el('div', 'grow');
        grow.appendChild(el('h3', null, item.term));
        grow.appendChild(el('p', null, item.subject.title + ' · ' + item.section.title));
        row.appendChild(grow);
        var cta = el('a', 'icon-cta');
        cta.href = sectionHref(item.section);
        cta.setAttribute('aria-label', 'Open ' + item.section.title);
        cta.title = item.section.title;
        cta.appendChild(icon('arrow', 'cta-icon'));
        row.appendChild(cta);
        rows.appendChild(row);
      });
      panel.appendChild(rows);
    }
    main.appendChild(panel);

    /* A section that has not been opened yet belongs on the Courses
       list, not in a list of unfinished work. Only sections with
       progress of their own count as open. */
    var open = allSections.filter(function (entry) {
      var p = sectionProgress(entry.section);
      return p.cleared > 0 && p.cleared < entry.section.chapters;
    });
    var openPanel = el('section', 'panel');
    openPanel.style.marginTop = '16px';
    openPanel.appendChild(panelHead('Unfinished chapters'));
    if (!open.length) {
      openPanel.appendChild(emptyBlock('Nothing unfinished',
        'Sections with progress show up here until they are cleared.'));
    } else {
      var openRows = el('div', 'section-list');
      open.forEach(function (entry) {
        var section = entry.section;
        var p = sectionProgress(section);
        var row = el('article', 'section-row');
        var grow = el('div', 'grow');
        grow.appendChild(el('h3', null, section.title + ' · ' + entry.subject.title));
        grow.appendChild(el('p', null,
          (section.chapters - p.cleared) + ' of ' + section.chapters + ' chapters left'));
        row.appendChild(grow);
        var cta = el('a', 'icon-cta');
        cta.href = sectionHref(section);
        cta.setAttribute('aria-label', 'Resume ' + section.title);
        cta.title = section.title;
        cta.appendChild(icon('arrow', 'cta-icon'));
        row.appendChild(cta);
        openRows.appendChild(row);
      });
      openPanel.appendChild(openRows);
    }
    main.appendChild(openPanel);
  }

  /* ---------- boot ---------- */
  buildNav();

  if (view === 'overview') renderOverview();
  else if (view === 'courses') renderCourses();
  else if (view === 'subject') renderSubject();
  else if (view === 'review') renderReview();

  /* Restore the offset after the content is in the document: scrolling
     to a position on a page that has not been laid out yet lands
     nowhere.

     The browser keeps its own history entry and restores the offset on
     its own in Chromium. That fallback is not guaranteed everywhere,
     so the saved value is applied here as well. */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  restoreScroll();

  var toggle = document.getElementById('nav-toggle');
  function openSidebar() {
    if (!sidebar) return;
    sidebar.classList.add('is-open');
    if (scrim) scrim.hidden = false;
  }
  function closeSidebar() {
    if (!sidebar) return;
    sidebar.classList.remove('is-open');
    if (scrim) scrim.hidden = true;
  }
  if (toggle) toggle.addEventListener('click', openSidebar);
  if (scrim) scrim.addEventListener('click', closeSidebar);
  if (navEl) {
    navEl.addEventListener('click', function (event) {
      if (event.target.closest('a')) closeSidebar();
    });
  }
})();
