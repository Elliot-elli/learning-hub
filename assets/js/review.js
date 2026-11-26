/* Review Center -- the independent path into the learner's review queue.
 *
 * The review queue used to live inside the flashcards game: picking a
 * term there dropped the learner into the flashcard flow, and coming
 * back left them on the wrong level. Review is a page of its own now,
 * with a fixed shape:
 *
 *   Review -> Subject -> Section -> Review list -> Review session
 *
 * The URL carries the position, so the page can be reloaded, linked to
 * or walked back through, and the way out of a level is written down
 * rather than guessed.
 *
 *   review.html                          the subject tabs
 *   review.html?subject=<id>             one subject picked
 *   review.html?subject=<id>&section=<id>  the review list of a section
 *
 * The way back is fixed: the subject tabs go back to the overview, a
 * picked subject goes back to the tabs, a section goes back to its
 * subject. Those links are plain hrefs, so the page still works if the
 * script never runs.
 */
(function () {
  'use strict';

  var site = window.LH_SITE || { id: '', name: '', subjects: [] };
  var store = window.LH_REVIEW;

  var shell = null;
  var main = null;
  var headTop = null;
  var titleEl = null;

  /* ---------- small helpers ---------- */
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function subjects() {
    return site.subjects || [];
  }

  function findSubject(id) {
    var found = null;
    subjects().forEach(function (subject) {
      if (subject.id === id) found = subject;
    });
    return found;
  }

  function findSection(subject, sectionId) {
    var found = null;
    (subject.sections || []).forEach(function (section) {
      if (section.id === sectionId) found = section;
    });
    return found;
  }

  /* A two digit count reads as a number rather than as a label. */
  function pad(value) {
    return value < 10 ? '0' + value : String(value);
  }

  function subjectUrl(subjectId, sectionId) {
    var parts = [];
    if (subjectId) parts.push('subject=' + encodeURIComponent(subjectId));
    if (sectionId) parts.push('section=' + encodeURIComponent(sectionId));
    return parts.length ? '?' + parts.join('&') : location.pathname + location.hash;
  }

  function sessionUrl(subjectId, sectionId, term) {
    var url = 'review-session.html?subject=' + encodeURIComponent(subjectId) +
      '&section=' + encodeURIComponent(sectionId);
    if (term) url += '&term=' + encodeURIComponent(term);
    return url;
  }

  /* ---------- the route ---------- */
  function readRoute() {
    var params = new URLSearchParams(location.search);
    return {
      subject: params.get('subject') || '',
      section: params.get('section') || ''
    };
  }

  /* The subject whose sections are on screen when nothing was picked:
     the first one that still has something waiting, otherwise the first
     one the site has. The order of the subjects never changes. */
  function defaultSubject() {
    var counts = store.bySubject();
    var list = subjects();
    for (var i = 0; i < list.length; i += 1) {
      var count = counts[list[i].id];
      if (count && count.total > 0) return list[i];
    }
    return list.length ? list[0] : null;
  }

  /* Moving between levels of the review tree keeps the page in place
     and leaves a history entry behind, so the browser back button walks
     the same path as the in-page back control. */
  function navigate(subjectId, sectionId, replace) {
    var target = subjectUrl(subjectId, sectionId);
    try {
      if (replace) history.replaceState({}, '', target);
      else history.pushState({}, '', target);
    } catch (e) {
      location.href = target;
      return;
    }
    render();
  }

  /* ---------- shared pieces ---------- */
  function emptyBlock(title, note) {
    var empty = el('div', 'empty');
    empty.appendChild(el('strong', null, title));
    empty.appendChild(el('span', null, note));
    return empty;
  }

  function arrow() {
    var span = el('span', 'row-arrow');
    span.innerHTML = shell.ICONS.arrow;
    return span;
  }

  /* ---------- the subject tabs ---------- */
  function buildTabs(subject) {
    var counts = store.bySubject();
    var tabs = el('div', 'review-tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Subjects');

    subjects().forEach(function (item) {
      var count = counts[item.id] || { total: 0 };
      var tab = el('a', 'review-tab');
      tab.href = subjectUrl(item.id, '');
      tab.dataset.subject = item.id;
      tab.setAttribute('role', 'tab');
      var active = item.id === subject.id;
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      if (active) tab.classList.add('is-active');
      tab.appendChild(el('span', 'review-tab-name', item.title));
      tab.appendChild(el('span', 'review-tab-count', String(count.total)));
      tabs.appendChild(tab);
    });

    return tabs;
  }

  /* ---------- the section list of one subject ---------- */
  function buildSectionRows(subject) {
    var rows = el('div', 'section-list');

    (subject.sections || []).forEach(function (section) {
      var counts = store.countsOf(store.forSection(subject.id, section.id));
      var progress = store.progress(section);

      var row = el('a', 'section-row review-row');
      row.href = subjectUrl(subject.id, section.id);

      var grow = el('div', 'grow');
      grow.appendChild(el('h3', null, section.title));
      row.appendChild(grow);

      if (counts.total > 0) {
        row.appendChild(el('span', 'row-count', pad(counts.total)));
      } else if (progress.started && progress.total > 0 && progress.cleared >= progress.total) {
        row.appendChild(el('span', 'row-state', 'Up to date'));
      } else {
        row.appendChild(el('span', 'row-state', '—'));
      }

      row.appendChild(arrow());
      rows.appendChild(row);
    });

    return rows;
  }

  /* ---------- the review list of one section ---------- */
  function termRow(subject, section, record) {
    var row = el('a', 'review-term');
    row.href = sessionUrl(subject.id, section.id, record.term);
    row.appendChild(el('span', 'review-term-text', record.term));
    row.appendChild(arrow());
    return row;
  }

  function group(title, records, subject, section) {
    if (!records.length) return null;
    var wrap = el('section', 'review-group');

    var head = el('div', 'review-group-head');
    head.appendChild(el('h2', 'review-group-title', title));
    head.appendChild(el('span', 'review-group-count', String(records.length)));
    wrap.appendChild(head);

    var list = el('div', 'review-terms');
    records.forEach(function (record) {
      list.appendChild(termRow(subject, section, record));
    });
    wrap.appendChild(list);
    return wrap;
  }

  function buildMastered(records, subject, section) {
    if (!records.length) return null;
    var wrap = el('details', 'review-mastered');
    var summary = el('summary', 'review-group-head');
    summary.appendChild(el('h2', 'review-group-title', 'Mastered'));
    summary.appendChild(el('span', 'review-group-count', String(records.length)));
    wrap.appendChild(summary);

    var list = el('div', 'review-terms');
    records.forEach(function (record) {
      list.appendChild(termRow(subject, section, record));
    });
    wrap.appendChild(list);
    return wrap;
  }

  /* ---------- the views ---------- */
  function renderSubject(subject, explicit) {
    titleEl.textContent = 'Review';
    document.title = 'Review — ' + (site.name || 'Learning Hub');

    if (explicit) {
      shell.buildCrumbs([{ label: 'Review', href: 'review.html' }]);
      shell.addBack({ href: 'review.html' }, 'Back to Review');
    } else {
      shell.buildCrumbs([]);
      shell.addBack({ href: 'index.html' }, 'Back to Overview');
    }

    main.appendChild(buildTabs(subject));

    var counts = store.bySubject();
    var count = counts[subject.id] || { total: 0 };

    if (!count.total) {
      main.appendChild(emptyBlock('All clear', 'No terms waiting for review.'));
      return;
    }

    var panel = el('section', 'panel');
    panel.appendChild(buildSectionRows(subject));
    main.appendChild(panel);
  }

  function renderSection(subject, section) {
    titleEl.textContent = section.title;
    document.title = section.title + ' — Review';

    shell.buildCrumbs([
      { label: 'Review', href: 'review.html' },
      { label: subject.title, href: subjectUrl(subject.id, '') }
    ]);
    shell.addBack({ href: subjectUrl(subject.id, '') }, 'Back to ' + subject.title);

    var groups = store.groups(subject.id, section.id);
    var pending = groups.practice.length + groups.learning.length;

    if (pending > 0) {
      var start = el('a', 'review-start');
      start.href = sessionUrl(subject.id, section.id, '');
      start.appendChild(el('span', 'review-start-label', 'Start review'));
      start.appendChild(el('span', 'review-start-count', pad(pending)));
      main.appendChild(start);
    } else {
      main.appendChild(emptyBlock('All clear', 'No terms waiting for review.'));
    }

    var practice = group('Needs practice', groups.practice, subject, section);
    if (practice) main.appendChild(practice);

    var learning = group('Still learning', groups.learning, subject, section);
    if (learning) main.appendChild(learning);

    var mastered = buildMastered(groups.mastered, subject, section);
    if (mastered) main.appendChild(mastered);
  }

  /* ---------- the router ---------- */
  function render() {
    var route = readRoute();
    var subject = route.subject ? findSubject(route.subject) : null;

    /* A link to a subject this site does not have lands on the tabs. */
    if (route.subject && !subject) {
      navigate('', '', true);
      return;
    }

    var explicit = !!subject;
    if (!subject) subject = defaultSubject();

    main.textContent = '';
    headTop.textContent = '';

    if (!subject) {
      titleEl.textContent = 'Review';
      document.title = 'Review — ' + (site.name || 'Learning Hub');
      shell.buildCrumbs([]);
      shell.addBack({ href: 'index.html' }, 'Back to Overview');
      main.appendChild(emptyBlock('All clear', 'No terms waiting for review.'));
      return;
    }

    if (route.section) {
      var section = findSection(subject, route.section);
      if (!section) {
        navigate(subject.id, '', true);
        return;
      }
      renderSection(subject, section);
      return;
    }

    renderSubject(subject, explicit);
  }

  /* ---------- boot ---------- */
  function mount() {
    shell = window.LH_SHELL;
    main = document.getElementById('site-main');
    headTop = document.getElementById('head-top');
    titleEl = document.getElementById('page-title');
    if (!shell || !main || !store) return;

    /* The tabs and the section rows are real links. They are caught
       here so the page can change level without a reload, and the
       browser keeps a history entry for every step. */
    document.addEventListener('click', function (event) {
      var tab = event.target.closest('.review-tab');
      if (tab) {
        event.preventDefault();
        var subject = findSubject(tab.dataset.subject);
        if (!subject) return;
        if (readRoute().subject === subject.id) return;
        navigate(subject.id, '');
        return;
      }

      var row = event.target.closest('.review-row');
      if (row) {
        event.preventDefault();
        var route = readRoute();
        var target = row.getAttribute('href') || '';
        var params = new URLSearchParams(target.split('?')[1] || '');
        navigate(params.get('subject') || route.subject, params.get('section') || '', false);
      }
    });

    window.addEventListener('popstate', function () {
      render();
    });

    render();
  }

  window.LH_REVIEW_CENTER = { mount: mount, render: render };
})();
