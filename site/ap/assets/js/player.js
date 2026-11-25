/* Flashcard player bootstrap.
 *
 * The engine reads window.AP_MODULES and renders the game. This script
 * fills in the page title, the subject line, the breadcrumb and the way
 * back to the subject page. It runs after engine.js so the engine's own
 * navigation links can be retargeted.
 *
 * The engine injects a text link in every view. Those links would sit
 * right next to the engine's own back button in three of the views, so
 * two back controls would compete for the same spot. They are removed
 * and replaced by a single floating control that stays in the same
 * place in every view. */

(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  var moduleId = params.get('m') || document.body.getAttribute('data-module') || '';
  var modules = window.AP_MODULES || {};
  var mod = modules[moduleId];
  var site = window.LH_SITE || { id: '', name: '', subjects: [] };

  if (!mod) {
    document.getElementById('subjectLine').textContent = moduleId;
    return;
  }

  var subjectLine = mod.subjectLine || mod.title || moduleId;
  document.getElementById('subjectLine').textContent = subjectLine;
  document.title = subjectLine + ' — Flashcards';

  /* Find the subject and section this deck belongs to. */
  var owner = null;
  (site.subjects || []).forEach(function (subject) {
    (subject.sections || []).forEach(function (section) {
      if (section.module === moduleId) owner = { subject: subject, section: section };
    });
  });

  var subjectHref = owner
    ? 'subject.html?subject=' + encodeURIComponent(owner.subject.id)
    : 'index.html';

  /* ---------- breadcrumb ---------- */
  var crumbsEl = document.getElementById('gameCrumbs');
  if (crumbsEl) {
    var trail = [];
    if (owner) {
      trail.push({ label: 'Courses', href: 'courses.html' });
      trail.push({ label: owner.subject.title, href: subjectHref });
      trail.push({ label: owner.section.title });
    } else {
      trail.push({ label: 'Courses', href: 'courses.html' });
      trail.push({ label: 'Flashcards' });
    }
    trail.forEach(function (item, index) {
      if (index > 0) {
        var sep = document.createElement('span');
        sep.className = 'crumb-sep';
        sep.textContent = '/';
        crumbsEl.appendChild(sep);
      }
      var node;
      if (item.href) {
        node = document.createElement('a');
        node.className = 'crumb-link';
        node.href = item.href;
        node.textContent = item.label;
      } else {
        node = document.createElement('span');
        node.className = 'crumb-current';
        node.textContent = item.label;
      }
      crumbsEl.appendChild(node);
    });
  }

  /* ---------- engine navigation links ----------
     The engine points these at the site root and labels them in text.
     A single floating control takes over that job, so the injected
     links are removed rather than relabelled. */
  document.querySelectorAll('[data-hub-back]').forEach(function (link) {
    link.remove();
  });

  /* The engine's own back buttons stay: they step back inside the
     game. They lose their text so every back control on the page
     reads as a shape instead of a label. */
  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M15 5l-7 7 7 7"/></svg>';

  document.querySelectorAll('.back-btn, .levels-exit').forEach(function (btn) {
    btn.innerHTML = ARROW;
    btn.classList.add('is-icon');
    var label = btn.getAttribute('aria-label') || 'Back';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
  });

  /* ---------- floating back control ----------
     It carries the way out of the game in every view, in one place. */
  var back = document.createElement('a');
  back.className = 'game-back';
  back.href = subjectHref;
  back.setAttribute('aria-label', owner ? 'Back to ' + owner.subject.title : 'Back');
  back.title = owner ? owner.subject.title : 'Back';
  back.innerHTML = ARROW;
  document.querySelector('.app').appendChild(back);
})();
