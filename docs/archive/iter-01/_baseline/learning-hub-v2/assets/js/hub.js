/* Learning Hub v2 -- dashboard app.
   Two modes share this file:
     hub mode       body[data-programme] empty -> programme picker
     programme mode body[data-programme]="ap|ad" -> sidebar dashboard

   Content comes from window.LH_MANIFEST (compiled from content/manifest.json).
   Learner progress comes from localStorage, one key per section. */

(function () {
  'use strict';

  var manifest = window.LH_MANIFEST || { site: {}, programmes: [], activities: [] };
  var body = document.body;
  var programmeId = body.getAttribute('data-programme') || '';
  var main = document.getElementById('hub-main');
  var navEl = document.getElementById('hub-nav');
  var titleEl = document.getElementById('page-title');
  var subEl = document.getElementById('page-sub');
  var greetEl = document.getElementById('greeting');
  var sidebar = document.getElementById('sidebar');
  var scrim = document.getElementById('scrim');
  var toastEl = document.getElementById('toast');
  var searchEl = document.getElementById('hub-search');
  var bellEl = document.getElementById('hub-bell');

  var programme = null;
  manifest.programmes.forEach(function (p) {
    if (p.id === programmeId) programme = p;
  });

  var subjects = programme ? programme.subjects : [];
  var allSections = [];
  subjects.forEach(function (subject) {
    subject.sections.forEach(function (section) {
      allSections.push({ subject: subject, section: section });
    });
  });

  /* ---------- icons ---------- */
  var ICONS = {
    overview: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    courses: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z"/><path d="M4 5.5v15"/></svg>',
    assignments: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4h6l1 2h3v14H5V6h3Z"/><path d="m9 13 2 2 4-4"/></svg>',
    reports: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V9"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6Z"/><path d="M10.5 20a2 2 0 0 0 3 0"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    cards: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="13" height="15" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v13"/></svg>',
    chapter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h7v15H4z"/><path d="M13 5h7v15h-7z"/></svg>',
    layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 9 5-9 5-9-5Z"/><path d="m3 13 9 5 9-5"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    quiz: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.6 2.6 0 1 1 3.4 2.5c-.6.2-.9.8-.9 1.4v.6"/><path d="M12 17.2h.01"/></svg>',
    matching: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h6v5H4z"/><path d="M14 13h6v5h-6z"/><path d="M10 8.5h4M7 11v2h4"/></svg>',
    mcq: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h4M7 13h7"/></svg>',
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

  function programmeHref(pid) {
    return pid + '/index.html';
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
    var review = store && store.review ? Object.keys(store.review).length : 0;
    var pct = section.chapters ? Math.round((cleared / section.chapters) * 100) : 0;
    return {
      cleared: cleared,
      mastered: mastered,
      review: review,
      total: section.chapters,
      pct: Math.min(100, pct),
      started: cleared > 0 || mastered > 0 || review > 0
    };
  }

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

  /* ---------- sidebar storage meter ---------- */
  function updateStorageNote() {
    var fill = document.getElementById('storage-fill');
    var text = document.getElementById('storage-note-text');
    if (!fill || !text) return;
    var bytes = 0;
    allSections.forEach(function (entry) {
      var store = readStore(entry.section.storeKey);
      if (store) bytes += JSON.stringify(store).length;
    });
    /* Scale against a 50 KB budget: the bar shows how full the
       programme's archive is against that budget, not a share of quota. */
    var pct = Math.min(100, Math.round((bytes / 50000) * 100));
    fill.style.width = pct + '%';
    text.textContent = bytes
      ? bytes + ' bytes used on this device.'
      : 'Progress stays in this browser.';
  }

  /* ---------- navigation ---------- */
  var VIEWS = [
    { id: 'overview', label: 'Overview', icon: 'overview' },
    { id: 'courses', label: 'Courses', icon: 'courses' },
    { id: 'assignments', label: 'Assignments', icon: 'assignments' },
    { id: 'reports', label: 'Reports', icon: 'reports' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ];

  var VIEW_META = {
    overview: { title: 'Overview', sub: 'Progress across every subject in this programme.' },
    courses: { title: 'Courses', sub: 'Pick a subject, then a section, then a chapter.' },
    assignments: { title: 'Assignments', sub: 'Terms waiting for review and sections with open chapters.' },
    reports: { title: 'Reports', sub: 'Card counts and cleared chapters per subject.' },
    settings: { title: 'Settings', sub: 'Where progress is stored on this device.' }
  };

  function buildSidebar() {
    if (!navEl) return;
    navEl.textContent = '';
    var pending = pendingReview().length;
    VIEWS.forEach(function (view) {
      var btn = el('button', 'nav-item');
      btn.type = 'button';
      btn.setAttribute('data-view', view.id);
      btn.appendChild(icon(view.icon));
      btn.appendChild(el('span', null, view.label));
      if (view.id === 'assignments' && pending > 0) {
        btn.appendChild(el('span', 'nav-badge', String(pending)));
      }
      btn.addEventListener('click', function () {
        location.hash = '#/' + view.id;
        closeSidebar();
      });
      navEl.appendChild(btn);
    });
  }

  function markActive(viewId) {
    if (!navEl) return;
    navEl.querySelectorAll('.nav-item').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-view') === viewId);
    });
  }

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

  /* ---------- shared pieces ---------- */
  function statTile(label, value, foot, tone, iconName) {
    var tile = el('article', 'stat-tile tile-' + tone);
    var top = el('div', 'tile-top');
    top.appendChild(icon(iconName, 'tile-icon'));
    top.appendChild(el('span', 'tile-label', label));
    tile.appendChild(top);
    tile.appendChild(el('div', 'tile-value', String(value)));
    tile.appendChild(el('div', 'tile-foot', foot));
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

  function panelHead(title, sub) {
    var head = el('div', 'panel-head');
    head.appendChild(el('h2', null, title));
    if (sub) head.appendChild(el('span', 'panel-sub', sub));
    return head;
  }

  function emptyBlock(title, note) {
    var empty = el('div', 'empty');
    empty.appendChild(el('strong', null, title));
    empty.appendChild(el('span', null, note));
    return empty;
  }

  /* ---------- charts (inline SVG, no dependency) ---------- */
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

  /* ---------- views ---------- */
  function renderOverview() {
    var t = totals();
    var stats = el('div', 'stats');
    stats.appendChild(statTile('Subjects', t.subjects,
      plural(t.sections, 'section') + ' available', 'lilac', 'layers'));
    stats.appendChild(statTile('Cards', t.cards,
      plural(t.chapters, 'chapter') + ' in total', 'sky', 'cards'));
    stats.appendChild(statTile('Cleared', t.cleared + ' / ' + t.chapters,
      'chapters finished', 'blush', 'check'));
    stats.appendChild(statTile('Mastered', t.mastered,
      plural(pendingReview().length, 'term') + ' awaiting review', 'cream', 'chapter'));
    main.appendChild(stats);

    var split = el('div', 'split');
    split.style.marginTop = '16px';

    var courses = el('section', 'panel');
    courses.appendChild(panelHead('Courses', plural(t.sections, 'section') + ' across ' + plural(t.subjects, 'subject')));
    var list = el('div', 'course-list');
    allSections.forEach(function (entry) {
      var section = entry.section;
      var p = sectionProgress(section);
      var row = el('article', 'course-row');
      var thumb = el('span', 'course-thumb');
      thumb.innerHTML = ICONS.cards;
      row.appendChild(thumb);

      var rowBody = el('div', 'course-body');
      rowBody.appendChild(el('h3', 'course-title', section.title));
      rowBody.appendChild(el('p', 'course-sub',
        entry.subject.title + ' · ' + plural(section.cards, 'card') + ' · ' + plural(section.chapters, 'chapter')));
      row.appendChild(rowBody);

      var side = el('div', 'course-side');
      side.appendChild(meter(p.pct, p.pct >= 100 ? 'green' : (p.pct > 0 ? 'amber' : null)));
      var cta = el('a', 'card-cta');
      cta.href = '#/courses/' + entry.subject.id + '/' + section.id;
      cta.textContent = p.cleared ? 'Continue' : 'Start';
      side.appendChild(cta);
      row.appendChild(side);
      list.appendChild(row);
    });
    courses.appendChild(list);
    split.appendChild(courses);

    var side = el('div', 'side-stack');
    var perf = el('section', 'panel');
    perf.appendChild(panelHead('Performance', 'All subjects'));
    perf.appendChild(gauge(t.pct));
    side.appendChild(perf);

    var bars = el('section', 'panel');
    bars.appendChild(panelHead('Cards by subject', 'Total cards'));
    bars.appendChild(cardBars());
    side.appendChild(bars);

    split.appendChild(side);
    main.appendChild(split);
  }

  function renderCourses() {
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
      card.appendChild(top);
      card.appendChild(el('p', null, subject.desc));
      var meta = el('div', 'card-meta');
      meta.appendChild(el('span', null, plural(subject.sections.length, 'section')));
      meta.appendChild(el('span', null, plural(total, 'card')));
      meta.appendChild(el('span', null, cleared + ' cleared'));
      card.appendChild(meta);
      var cta = el('a', 'card-cta');
      cta.href = '#/courses/' + subject.id;
      cta.appendChild(el('span', null, 'View sections'));
      cta.appendChild(icon('arrow', 'cta-icon'));
      card.appendChild(cta);
      grid.appendChild(card);
    });
    main.appendChild(grid);
  }

  function renderSubject(subjectId) {
    var subject = null;
    subjects.forEach(function (s) { if (s.id === subjectId) subject = s; });
    if (!subject) {
      location.hash = '#/courses';
      return;
    }
    var panel = el('section', 'panel');
    panel.appendChild(panelHead(subject.title, subject.desc));

    var rows = el('div', 'section-list');
    subject.sections.forEach(function (section) {
      var p = sectionProgress(section);
      var row = el('article', 'section-row');
      var grow = el('div', 'grow');
      grow.appendChild(el('h3', null, section.title));
      grow.appendChild(el('p', null,
        plural(section.cards, 'card') + ' · ' + plural(section.chapters, 'chapter') + ' · '
        + p.cleared + ' cleared'));
      row.appendChild(grow);

      var chips = el('div', 'activity-row');
      manifest.activities.forEach(function (act) {
        var chip = el('span', 'activity-chip' + (act.enabled ? ' is-ready' : ''));
        chip.appendChild(icon(act.id === 'flashcards' ? 'cards' : act.id, 'chip-icon'));
        chip.appendChild(el('span', null, act.title));
        chips.appendChild(chip);
      });
      row.appendChild(chips);

      var cta = el('a', 'card-cta');
      cta.href = '#/courses/' + subject.id + '/' + section.id;
      cta.textContent = p.cleared ? 'Continue' : 'Start';
      row.appendChild(cta);
      rows.appendChild(row);
    });
    panel.appendChild(rows);
    main.appendChild(panel);
  }

  function renderSection(subjectId, sectionId) {
    var subject = null;
    var section = null;
    subjects.forEach(function (s) {
      if (s.id !== subjectId) return;
      subject = s;
      s.sections.forEach(function (sec) { if (sec.id === sectionId) section = sec; });
    });
    if (!section) {
      location.hash = '#/courses';
      return;
    }
    var p = sectionProgress(section);

    var panel = el('section', 'panel');
    panel.appendChild(panelHead(section.title, section.desc));

    var meta = el('div', 'card-meta');
    meta.style.marginBottom = '16px';
    meta.appendChild(el('span', null, plural(section.cards, 'card')));
    meta.appendChild(el('span', null, plural(section.chapters, 'chapter')));
    meta.appendChild(el('span', null, p.cleared + ' cleared'));
    meta.appendChild(el('span', null, p.mastered + ' mastered'));
    panel.appendChild(meta);
    var grid = el('div', 'card-grid');
    manifest.activities.forEach(function (act) {
      var card = el('article', 'tile-card');
      var top = el('div', 'tile-top');
      var tileIcon = el('span', 'tile-icon');
      tileIcon.innerHTML = ICONS[act.id === 'flashcards' ? 'cards' : act.id];
      top.appendChild(tileIcon);
      top.appendChild(el('h3', null, act.title));
      card.appendChild(top);
      card.appendChild(el('p', null, act.desc));

      if (act.enabled) {
        var cta = el('a', 'card-cta');
        cta.href = 'flashcards.html?m=' + encodeURIComponent(section.module);
        cta.textContent = p.cleared ? 'Continue' : 'Start';
        card.appendChild(cta);
      } else {
        var pill = el('span', 'pill is-plain');
        pill.appendChild(el('span', null, 'Planned'));
        card.appendChild(pill);
      }
      grid.appendChild(card);
    });
    panel.appendChild(grid);
    main.appendChild(panel);

    var back = el('section', 'panel');
    back.style.marginTop = '16px';
    back.appendChild(panelHead('Return', 'Back to ' + subject.title));
    var backBtn = el('a', 'card-cta is-secondary', 'All sections');
    backBtn.href = '#/courses/' + subject.id;
    back.appendChild(backBtn);
    main.appendChild(back);
  }

  function renderAssignments() {
    var pending = pendingReview();
    var panel = el('section', 'panel');
    panel.appendChild(panelHead('Review queue', plural(pending.length, 'term') + ' waiting'));
    if (!pending.length) {
      panel.appendChild(emptyBlock('No terms waiting', 'Terms marked Not sure or I do not know collect here.'));
    } else {
      var rows = el('div', 'section-list');
      pending.slice(0, 40).forEach(function (item) {
        var row = el('article', 'section-row');
        var grow = el('div', 'grow');
        grow.appendChild(el('h3', null, item.term));
        grow.appendChild(el('p', null, item.subject.title + ' · ' + item.section.title));
        row.appendChild(grow);
        var cta = el('a', 'card-cta is-secondary', 'Open section');
        cta.href = '#/courses/' + item.subject.id + '/' + item.section.id;
        row.appendChild(cta);
        rows.appendChild(row);
      });
      panel.appendChild(rows);
    }
    main.appendChild(panel);

    var open = allSections.filter(function (entry) {
      return sectionProgress(entry.section).cleared < entry.section.chapters;
    });
    var openPanel = el('section', 'panel');
    openPanel.style.marginTop = '16px';
    openPanel.appendChild(panelHead('Open chapters', plural(open.length, 'section') + ' to finish'));
    if (!open.length) {
      openPanel.appendChild(emptyBlock('Every chapter is cleared', 'Open a section to review it again.'));
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
        var cta = el('a', 'card-cta');
        cta.href = 'flashcards.html?m=' + encodeURIComponent(section.module);
        cta.textContent = 'Resume';
        row.appendChild(cta);
        openRows.appendChild(row);
      });
      openPanel.appendChild(openRows);
    }
    main.appendChild(openPanel);
  }

  function renderReports() {
    var t = totals();
    var panel = el('section', 'panel');
    panel.appendChild(panelHead('Subject report', t.pct + '% of chapters cleared'));

    var table = el('table', 'report-table');
    var thead = el('thead');
    var headRow = el('tr');
    ['Subject', 'Section', 'Cards', 'Chapters', 'Cleared', 'Mastered'].forEach(function (label, i) {
      headRow.appendChild(el('th', i >= 2 ? 'num' : null, label));
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = el('tbody');
    allSections.forEach(function (entry) {
      var section = entry.section;
      var p = sectionProgress(section);
      var tr = el('tr');
      tr.appendChild(el('td', null, entry.subject.title));
      tr.appendChild(el('td', null, section.title));
      tr.appendChild(el('td', 'num', String(section.cards)));
      tr.appendChild(el('td', 'num', String(section.chapters)));
      tr.appendChild(el('td', 'num', p.cleared + ' / ' + section.chapters));
      tr.appendChild(el('td', 'num', String(p.mastered)));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    panel.appendChild(table);
    main.appendChild(panel);
  }

  function renderSettings() {
    var panel = el('section', 'panel');
    panel.appendChild(panelHead('Progress storage', 'This browser only'));
    var rows = el('div', 'section-list');
    allSections.forEach(function (entry) {
      var section = entry.section;
      var store = readStore(section.storeKey);
      var bytes = store ? JSON.stringify(store).length : 0;
      var row = el('article', 'section-row');
      var grow = el('div', 'grow');
      grow.appendChild(el('h3', null, entry.subject.title + ' · ' + section.title));
      grow.appendChild(el('p', null, section.storeKey));
      row.appendChild(grow);
      row.appendChild(el('span', 'pill' + (bytes ? '' : ' is-plain'),
        bytes ? bytes + ' bytes' : 'No progress yet'));
      rows.appendChild(row);
    });
    panel.appendChild(rows);
    main.appendChild(panel);

    var note = el('section', 'panel');
    note.style.marginTop = '16px';
    note.appendChild(panelHead('Clearing progress', 'Reset removes saved answers on this device'));
    note.appendChild(el('p', null,
      'Cleared chapters and review lists start empty after a reset.'));
    var actions = el('div', 'activity-row');
    actions.style.marginTop = '14px';
    var clearBtn = el('button', 'card-cta is-secondary', 'Clear saved progress');
    clearBtn.type = 'button';
    clearBtn.addEventListener('click', function () {
      var ok = window.confirm('Clear all saved progress for ' + programme.title + '?');
      if (!ok) return;
      allSections.forEach(function (entry) {
        try { localStorage.removeItem(entry.section.storeKey); } catch (e) { /* storage blocked */ }
      });
      showToast('Progress cleared');
      render();
    });
    actions.appendChild(clearBtn);
    note.appendChild(actions);
    main.appendChild(note);
  }

  /* ---------- hub mode: programme picker ---------- */
  function renderHub() {
    var stats = el('div', 'stats');
    var subjectCount = 0, sectionCount = 0, cardCount = 0;
    manifest.programmes.forEach(function (p) {
      p.subjects.forEach(function (s) {
        subjectCount += 1;
        s.sections.forEach(function (sec) {
          sectionCount += 1;
          cardCount += sec.cards;
        });
      });
    });
    stats.appendChild(statTile('Programmes', manifest.programmes.length,
      'AP and AD study tracks', 'lilac', 'layers'));
    stats.appendChild(statTile('Subjects', subjectCount,
      plural(sectionCount, 'section') + ' available', 'sky', 'cards'));
    stats.appendChild(statTile('Cards', cardCount,
      'Terms to review across subjects', 'blush', 'chapter'));
    main.appendChild(stats);

    var grid = el('div', 'card-grid');
    grid.style.marginTop = '16px';
    manifest.programmes.forEach(function (p) {
      var card = el('article', 'tile-card');
      var top = el('div', 'tile-top');
      var tileIcon = el('span', 'tile-icon');
      tileIcon.innerHTML = ICONS.layers;
      top.appendChild(tileIcon);
      top.appendChild(el('h3', null, p.title));
      card.appendChild(top);
      card.appendChild(el('p', null, p.desc));
      var meta = el('div', 'card-meta');
      meta.appendChild(el('span', null, plural(p.subjects.length, 'subject')));
      var pCards = 0;
      p.subjects.forEach(function (s) {
        s.sections.forEach(function (sec) { pCards += sec.cards; });
      });
      meta.appendChild(el('span', null, plural(pCards, 'card')));
      card.appendChild(meta);
      var cta = el('a', 'card-cta');
      cta.href = programmeHref(p.id);
      cta.appendChild(el('span', null, 'Open programme'));
      cta.appendChild(icon('arrow', 'cta-icon'));
      card.appendChild(cta);
      grid.appendChild(card);
    });
    main.appendChild(grid);
  }

  function buildHubSidebar() {
    if (!navEl) return;
    navEl.textContent = '';
    manifest.programmes.forEach(function (p) {
      var link = el('a', 'nav-item');
      link.href = programmeHref(p.id);
      link.appendChild(icon('layers'));
      link.appendChild(el('span', null, p.title));
      navEl.appendChild(link);
    });
  }

  /* ---------- toast ---------- */
  var toastTimer = null;
  function showToast(text) {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 2400);
  }

  /* ---------- search ---------- */
  function renderSearch(query) {
    var q = query.trim().toLowerCase();
    main.textContent = '';
    if (!q) {
      render();
      return;
    }
    var hits = allSections.filter(function (entry) {
      var hay = (entry.subject.title + ' ' + entry.section.title + ' ' + entry.section.desc).toLowerCase();
      return hay.indexOf(q) >= 0;
    });
    var panel = el('section', 'panel');
    panel.appendChild(panelHead('Search results', plural(hits.length, 'match')));
    if (!hits.length) {
      panel.appendChild(emptyBlock('No match', 'Try another subject or section name.'));
    } else {
      var rows = el('div', 'section-list');
      hits.forEach(function (entry) {
        var section = entry.section;
        var row = el('article', 'section-row');
        var grow = el('div', 'grow');
        grow.appendChild(el('h3', null, section.title + ' · ' + entry.subject.title));
        grow.appendChild(el('p', null, section.desc));
        row.appendChild(grow);
        var cta = el('a', 'card-cta', 'Open');
        cta.href = '#/courses/' + entry.subject.id + '/' + section.id;
        row.appendChild(cta);
        rows.appendChild(row);
      });
      panel.appendChild(rows);
    }
    main.appendChild(panel);
  }

  function wireSearch() {
    if (!searchEl) return;
    searchEl.addEventListener('input', function () {
      renderSearch(searchEl.value);
    });
  }

  /* ---------- router ---------- */
  function routeParts() {
    var raw = (location.hash || '').replace(/^#\/?/, '');
    return raw.split('/').filter(function (part) { return part !== ''; });
  }

  function currentView(parts) {
    if (!parts.length) return 'overview';
    var head = parts[0];
    if (head === 'courses' || head === 'assignments' || head === 'reports' || head === 'settings') {
      return head;
    }
    return 'overview';
  }

  function render() {
    var parts = routeParts();
    var view = currentView(parts);

    if (!programme) {
      main.textContent = '';
      markActive('overview');
      renderHub();
      return;
    }

    updateStorageNote();

    if (searchEl && searchEl.value.trim()) {
      renderSearch(searchEl.value);
      return;
    }

    main.textContent = '';
    markActive(view);
    var meta = VIEW_META[view];
    if (titleEl) titleEl.textContent = meta.title;
    if (subEl) subEl.textContent = meta.sub;

    if (view === 'courses' && parts.length >= 2) {
      if (parts.length >= 3) {
        renderSection(parts[1], parts[2]);
      } else {
        renderSubject(parts[1]);
      }
      return;
    }

    if (view === 'courses') {
      renderCourses();
      return;
    }
    if (view === 'assignments') {
      renderAssignments();
      return;
    }
    if (view === 'reports') {
      renderReports();
      return;
    }
    if (view === 'settings') {
      renderSettings();
      return;
    }
    renderOverview();
  }

  /* ---------- boot ---------- */
  if (programme) {
    buildSidebar();
    wireSearch();
    if (bellEl) {
      var pending = pendingReview().length;
      if (pending > 0) {
        var dot = el('span', 'dot');
        bellEl.appendChild(dot);
        bellEl.setAttribute('aria-label', pending + ' terms waiting for review');
        bellEl.addEventListener('click', function () { location.hash = '#/assignments'; });
      } else {
        bellEl.setAttribute('aria-label', 'No terms waiting for review');
      }
    }
  } else {
    /* The portal has no subject list to search, so the search and
       notification controls stay out of the way. */
    buildHubSidebar();
    if (searchEl) {
      var searchBox = searchEl.closest('.search');
      if (searchBox) searchBox.hidden = true;
    }
    if (bellEl) bellEl.hidden = true;
    /* The portal is already the overview, so the back link would
       point at the page it sits on. */
    var backLink = document.querySelector('.side-link');
    if (backLink) backLink.hidden = true;
  }

  var toggle = document.getElementById('nav-toggle');
  if (toggle) toggle.addEventListener('click', openSidebar);
  if (scrim) scrim.addEventListener('click', closeSidebar);

  if (greetEl && programme) greetEl.textContent = programme.title;

  window.addEventListener('hashchange', render);
  render();
})();
