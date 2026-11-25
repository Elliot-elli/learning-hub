/* Flashcard player bootstrap.
   The engine reads window.AP_MODULES and renders the game; this script
   fills in the page title, the subject line and the link back to the
   dashboard. Runs after engine.js so the engine's own mountHubLinks()
   output can be retargeted at the programme dashboard. */

(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  var moduleId = params.get('m') || document.body.getAttribute('data-module') || '';
  var modules = window.AP_MODULES || {};
  var mod = modules[moduleId];

  if (!mod) {
    document.getElementById('subjectLine').textContent = moduleId;
    return;
  }

  var subjectLine = mod.subjectLine || mod.title || moduleId;
  document.getElementById('subjectLine').textContent = subjectLine;
  document.title = subjectLine + ' — Flashcards';

  /* The engine injects "← Learning Hub" links pointing at the site root.
     Point them at this programme's dashboard and name the programme. */
  var programme = document.body.getAttribute('data-programme') || '';
  var backHref = programme ? '../' + programme + '/index.html' : '../index.html';
  var programmeTitle = programme ? programme.toUpperCase() : 'Learning Hub';

  document.querySelectorAll('[data-hub-back]').forEach(function (link) {
    link.setAttribute('href', backHref);
    if (link.classList.contains('hub-back-float') || link.classList.contains('hub-link')) {
      link.textContent = '← ' + programmeTitle + ' Hub';
    } else {
      link.textContent = programmeTitle + ' Hub';
    }
  });
})();
