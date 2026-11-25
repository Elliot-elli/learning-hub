/* Learning Hub navigation. Generated into <site>/assets/site.js by
   htmlmerger/scripts/build_hub.py — edit this file, then rebuild.

   Reads window.HUB_MANIFEST (built from the site registry).
   Routes by hash so every level works from a file:// URL. */

(function () {
  'use strict';

  var manifest = window.HUB_MANIFEST || { programmes: [], modules: [] };
  var body = document.body;
  var page = body.getAttribute('data-page') || 'home';
  var programmeId = body.getAttribute('data-programme') || '';
  var root = body.getAttribute('data-root') || '';
  var main = document.getElementById('hub-main');

  var TYPES = ['flashcards', 'sq'];
  var TYPE_LABELS = { flashcards: 'Flashcards', sq: 'Super Quiz' };
  var TYPE_DESCRIPTIONS = {
    flashcards: 'Three-state self-review, a review queue and per-chapter progress.',
    sq: 'A countdown reveals each answer. No scoring, no saved progress.'
  };
  var TYPE_ICONS = {
    flashcards: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="13" height="15" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v13"/></svg>',
    sq: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'
  };
  var PROGRAMME_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V6a2 2 0 0 1 2-2h9l5 5v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M15 4v5h5"/></svg>';

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function typeLabel(type) {
    return TYPE_LABELS[type] || type;
  }

  function modulesOf(programme, type, subject) {
    return manifest.modules.filter(function (mod) {
      if (programme && mod.programme !== programme) return false;
      if (type && mod.type !== type) return false;
      if (subject && mod.subject !== subject) return false;
      return true;
    });
  }

  function subjectsOf(programme, type) {
    var seen = [];
    modulesOf(programme, type).forEach(function (mod) {
      if (seen.indexOf(mod.subject) < 0) seen.push(mod.subject);
    });
    return seen;
  }

  function hrefFor(path) {
    return root + path;
  }

  function clearedCount(mod) {
    if (!mod.tracksProgress || !mod.storeKey) return null;
    var raw;
    try {
      raw = localStorage.getItem(mod.storeKey);
    } catch (e) {
      return null;
    }
    if (!raw) return null;
    var store;
    try {
      store = JSON.parse(raw);
    } catch (e) {
      return null;
    }
    if (!store || !store.cleared) return null;
    var total = (mod.meta && mod.meta.chapters) || 0;
    var count = Object.keys(store.cleared).length;
    if (!count || !total) return null;
    return { cleared: count, total: total };
  }

  function progressNode(mod) {
    var done = clearedCount(mod);
    if (!done) return null;
    var wrap = el('div', 'entry-progress is-on');
    var bar = el('span', 'entry-progress-bar');
    var fill = el('span', 'entry-progress-fill');
    fill.style.width = Math.round((done.cleared / done.total) * 100) + '%';
    bar.appendChild(fill);
    wrap.appendChild(bar);
    wrap.appendChild(el('span', null, done.cleared + ' / ' + done.total + ' chapters cleared'));
    return wrap;
  }

  function metaLine(mod) {
    if (mod.type === 'flashcards') {
      return mod.meta.cards + ' cards · ' + mod.meta.chapters + ' chapters';
    }
    return mod.meta.questions + ' questions · ' + mod.meta.seconds + 's per question';
  }

  function section(title, description) {
    var block = el('section', 'hub-section');
    var head = el('div', 'hub-section-head');
    head.appendChild(el('h2', null, title));
    if (description) head.appendChild(el('span', 'hub-section-desc', description));
    block.appendChild(head);
    return block;
  }

  function emptyRow(text) {
    var li = el('li', 'hub-empty', text);
    return li;
  }

  function plural(count, word) {
    return count + ' ' + word + (count === 1 ? '' : 's');
  }

  function typeCard(type, mods) {
    var card = el('article', 'choice-card');
    var icon = el('span', 'choice-icon');
    icon.innerHTML = TYPE_ICONS[type] || '';
    card.appendChild(icon);
    card.appendChild(el('h3', 'choice-title', typeLabel(type)));
    card.appendChild(el('p', 'choice-desc', TYPE_DESCRIPTIONS[type] || ''));

    if (mods.length) {
      var meta = el('ul', 'choice-meta');
      meta.appendChild(el('li', null, plural(subjectsOf(programmeId, type).length, 'subject')));
      meta.appendChild(el('li', null, plural(mods.length, 'game')));
      meta.appendChild(el('li', null, mods.some(function (m) { return m.tracksProgress; })
        ? 'Saves progress' : 'No saved progress'));
      card.appendChild(meta);
      var cta = el('a', 'entry-cta', 'Choose a subject');
      cta.href = '#/' + type;
      card.appendChild(cta);
    } else {
      card.classList.add('is-empty');
      card.appendChild(el('p', 'choice-empty', 'No games available yet'));
    }
    return card;
  }

  function moduleCard(mod) {
    var card = el('article', 'entry-card');
    card.appendChild(el('span', 'entry-label' + (mod.type === 'sq' ? ' is-quiz' : ''),
      mod.section || typeLabel(mod.type)));
    card.appendChild(el('h3', 'entry-title', mod.title));
    card.appendChild(el('p', 'entry-sub', mod.desc));
    card.appendChild(el('p', 'entry-count', metaLine(mod)));

    var progress = progressNode(mod);
    if (progress) card.appendChild(progress);

    var cta = el('a', 'entry-cta', 'Start Learning');
    cta.href = hrefFor(mod.href);
    card.appendChild(cta);
    return card;
  }

  function subjectCard(subject, type, mods) {
    var card = el('article', 'entry-card');
    card.appendChild(el('span', 'entry-label', typeLabel(type)));
    card.appendChild(el('h3', 'entry-title', subject));
    card.appendChild(el('p', 'entry-sub', 'Choose a section to start learning.'));
    card.appendChild(el('p', 'entry-count', plural(mods.length, 'section')));
    var cta = el('a', 'entry-cta', 'Choose a Section');
    cta.href = '#/' + type + '/' + encodeURIComponent(subject);
    card.appendChild(cta);
    return card;
  }

  function renderHome() {
    var block = section('Choose Your Learning Mode', 'Pick a programme to continue.');
    var list = el('ul', 'choice-grid');
    manifest.programmes.forEach(function (prog) {
      var mods = modulesOf(prog.id);
      var card = el('article', 'choice-card');
      var icon = el('span', 'choice-icon');
      icon.innerHTML = PROGRAMME_ICON;
      card.appendChild(icon);
      card.appendChild(el('h3', 'choice-title', prog.title));
      card.appendChild(el('p', 'choice-desc', prog.desc));
      var meta = el('ul', 'choice-meta');
      meta.appendChild(el('li', null, plural(mods.length, 'game')));
      meta.appendChild(el('li', null, prog.types.join(' and ')));
      card.appendChild(meta);
      var cta = el('a', 'entry-cta', 'Open');
      cta.href = hrefFor(prog.href);
      card.appendChild(cta);
      var li = el('li');
      li.appendChild(card);
      list.appendChild(li);
    });
    block.appendChild(list);
    main.appendChild(block);

    manifest.programmes.forEach(function (prog) {
      var mods = modulesOf(prog.id);
      var progBlock = section(prog.title + ' games', prog.desc);
      var gameList = el('ul', 'entry-list');
      if (!mods.length) {
        gameList.appendChild(emptyRow('No games available yet'));
      } else {
        mods.forEach(function (mod) {
          var li = el('li');
          li.appendChild(moduleCard(mod));
          gameList.appendChild(li);
        });
      }
      progBlock.appendChild(gameList);
      main.appendChild(progBlock);
    });
  }

  function renderModes() {
    var block = section('Choose Your Learning Mode', 'Two ways to practise.');
    var list = el('ul', 'choice-grid');
    TYPES.forEach(function (type) {
      var li = el('li');
      li.appendChild(typeCard(type, modulesOf(programmeId, type)));
      list.appendChild(li);
    });
    block.appendChild(list);
    main.appendChild(block);
  }

  function renderSubjects(type) {
    var subjects = subjectsOf(programmeId, type);
    var block = section('Select a Subject', typeLabel(type));
    var list = el('ul', 'entry-list');
    if (!subjects.length) {
      list.appendChild(emptyRow('No games available yet'));
    } else {
      subjects.forEach(function (subject) {
        var li = el('li');
        li.appendChild(subjectCard(subject, type, modulesOf(programmeId, type, subject)));
        list.appendChild(li);
      });
    }
    block.appendChild(list);
    main.appendChild(block);
  }

  function renderSections(type, subject) {
    var mods = modulesOf(programmeId, type, subject);
    var block = section('Choose a Section', subject);
    var list = el('ul', 'entry-list');
    if (!mods.length) {
      list.appendChild(emptyRow('No games available yet'));
    } else {
      mods.forEach(function (mod) {
        var li = el('li');
        li.appendChild(moduleCard(mod));
        list.appendChild(li);
      });
    }
    block.appendChild(list);
    main.appendChild(block);

    var nav = el('div', 'hub-nav');
    var backSubjects = el('a', 'hub-nav-link', 'Back to Subjects');
    backSubjects.href = '#/' + type;
    var backHome = el('a', 'hub-nav-link', 'Back to Home');
    backHome.href = '#/';
    nav.appendChild(backSubjects);
    nav.appendChild(backHome);
    main.appendChild(nav);
  }

  function renderProgramme() {
    var route = (location.hash || '').replace(/^#\/?/, '');
    var parts = route.split('/').filter(function (part) { return part !== ''; });

    main.textContent = '';
    if (!parts.length) {
      renderModes();
    } else if (parts.length === 1) {
      renderSubjects(parts[0]);
    } else {
      renderSections(parts[0], decodeURIComponent(parts[1]));
    }
  }

  function render() {
    main.textContent = '';
    if (page === 'home') {
      renderHome();
      return;
    }
    renderProgramme();
  }

  window.addEventListener('hashchange', renderProgramme);
  render();
})();
