/* Review session -- one round of active recall over a section.
 *
 * The session is a separate page with its own route, so the learner
 * never lands in the normal flashcards flow while reviewing and the
 * way back is always the review list of the same section.
 *
 *   review-session.html?subject=<id>&section=<id>[&term=<name>]
 *
 * The queue is a snapshot taken when the round starts, so the list
 * under the learner does not change while they work. The snapshot is
 * kept in session storage: a reload puts the learner back on the same
 * card of the same round instead of starting over.
 *
 * The answer is hidden until it is asked for, and the three results
 * only appear after that. A result is saved before the next card is
 * shown, and a card that cannot be saved stays on screen.
 */
(function () {
  'use strict';

  var site = window.LH_SITE || { id: '', name: '' };
  var store = window.LH_REVIEW;

  var SESSION_MAX_AGE = 24 * 60 * 60 * 1000;

  var root = null;
  var stage = null;
  var actions = null;
  var backLink = null;
  var sectionLabel = null;
  var progressLabel = null;
  var errorBox = null;

  var route = { subject: '', section: '', term: '' };
  var state = null;

  /* ---------- helpers ---------- */
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function pad(value) {
    return value < 10 ? '0' + value : String(value);
  }

  function sectionUrl(sectionId) {
    return 'review.html?subject=' + encodeURIComponent(route.subject) +
      '&section=' + encodeURIComponent(sectionId);
  }

  function sessionKey() {
    return 'lh-session:' + (site.id || 'site') + ':' + route.subject + ':' + route.section;
  }

  function readSnapshot() {
    try {
      var raw = sessionStorage.getItem(sessionKey());
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      if (!Array.isArray(parsed.queue)) return null;
      if (!parsed.roundId) return null;
      if (Date.now() - (parsed.startedAt || 0) > SESSION_MAX_AGE) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function writeSnapshot() {
    try {
      sessionStorage.setItem(sessionKey(), JSON.stringify({
        roundId: state.roundId,
        queue: state.terms,
        pos: state.pos,
        startedAt: state.startedAt
      }));
    } catch (e) { /* storage blocked: the round still runs */ }
  }

  function clearSnapshot() {
    try {
      sessionStorage.removeItem(sessionKey());
    } catch (e) { /* nothing to clean up */ }
  }

  /* ---------- the round ---------- */
  function newRoundId() {
    return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function startRound(terms, startTerm) {
    var records = store.forSection(route.subject, route.section);
    var byTerm = {};
    records.forEach(function (record) {
      byTerm[record.term] = record;
    });

    var queue = terms.map(function (term) { return byTerm[term]; })
      .filter(function (record) { return !!record; });

    if (startTerm) {
      for (var i = 0; i < queue.length; i += 1) {
        if (queue[i].term === startTerm) {
          var picked = queue.splice(i, 1)[0];
          queue.unshift(picked);
          break;
        }
      }
    }

    state = {
      roundId: newRoundId(),
      terms: queue.map(function (record) { return record.term; }),
      records: queue,
      pos: 0,
      total: queue.length,
      requeued: {},
      revealed: false,
      busy: false,
      lockedUntil: 0,
      startedAt: Date.now()
    };
    writeSnapshot();
  }

  function restoreRound() {
    var snapshot = readSnapshot();
    if (!snapshot) return false;
    var records = store.forSection(route.subject, route.section);
    var byTerm = {};
    records.forEach(function (record) {
      byTerm[record.term] = record;
    });
    var queue = snapshot.queue.map(function (term) { return byTerm[term]; })
      .filter(function (record) { return !!record; });
    if (!queue.length) return false;

    state = {
      roundId: snapshot.roundId,
      terms: queue.map(function (record) { return record.term; }),
      records: queue,
      pos: Math.min(snapshot.pos || 0, queue.length - 1),
      total: queue.length,
      requeued: {},
      revealed: false,
      busy: false,
      lockedUntil: 0,
      startedAt: snapshot.startedAt || Date.now()
    };
    return true;
  }

  function current() {
    return state.records[state.pos] || null;
  }

  /* ---------- the views ---------- */
  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function clearError() {
    errorBox.textContent = '';
    errorBox.hidden = true;
  }

  function renderHeader() {
    progressLabel.textContent = state
      ? pad(Math.min(state.pos + 1, state.total)) + ' / ' + pad(state.total)
      : '';
  }

  function renderCard() {
    stage.textContent = '';
    actions.textContent = '';
    clearError();

    var record = current();
    if (!record) {
      renderComplete();
      return;
    }

    var card = el('div', 'rs-card');
    /* The card follows the flashcard game: the term is on the front
       and the meaning is revealed. The learner reads a term and
       recalls what it means, which is the same act the flashcards
       ask for, so the two paths train the same thing. */
    card.appendChild(el('p', 'rs-prompt', record.term));

    var answerBox = el('div', 'rs-answer');
    answerBox.id = 'rsAnswer';
    /* The answer box is only shown once it has been asked for. The
       state decides, not the click: the card is rebuilt on every
       render, so the flag has to carry the answer across. */
    answerBox.hidden = !state.revealed;
    var definition = store.definition(route.subject, route.section, record.term);
    answerBox.appendChild(el('p', 'rs-answer-text', definition || 'No definition on file.'));
    card.appendChild(answerBox);
    stage.appendChild(card);

    card.addEventListener('click', function () {
      if (!state.revealed) reveal();
    });

    if (!state.revealed) {
      var revealBtn = el('button', 'rs-reveal', 'Reveal answer');
      revealBtn.type = 'button';
      revealBtn.id = 'rsReveal';
      revealBtn.addEventListener('click', reveal);
      actions.appendChild(revealBtn);
    } else {
      var results = el('div', 'rs-results');
      var again = el('button', 'rs-btn rs-again', 'Again');
      again.type = 'button';
      again.dataset.result = 'again';
      var unsure = el('button', 'rs-btn rs-unsure', 'Not sure');
      unsure.type = 'button';
      unsure.dataset.result = 'not-sure';
      var got = el('button', 'rs-btn rs-got', 'Got it');
      got.type = 'button';
      got.dataset.result = 'got-it';
      results.appendChild(again);
      results.appendChild(unsure);
      results.appendChild(got);
      results.addEventListener('click', function (event) {
        var button = event.target.closest('.rs-btn');
        if (!button) return;
        submit(button.dataset.result);
      });
      actions.appendChild(results);
    }

    renderHeader();
  }

  function reveal() {
    if (!state || state.revealed || state.busy) return;
    state.revealed = true;
    renderCard();
  }

  function renderComplete() {
    stage.textContent = '';
    actions.textContent = '';
    clearError();

    var done = el('div', 'rs-done');
    done.appendChild(el('h2', 'rs-done-title', 'Review complete'));
    done.appendChild(el('p', 'rs-done-count', state.total + ' / ' + state.total));

    var back = el('a', 'rs-btn rs-primary', 'Back to Section');
    back.href = sectionUrl(route.section);
    done.appendChild(back);

    var again = el('button', 'rs-btn', 'Review again');
    again.type = 'button';
    again.id = 'rsAgain';
    again.addEventListener('click', function () {
      clearSnapshot();
      var queue = store.queue(route.subject, route.section, '');
      startRound(queue.map(function (record) { return record.term; }), '');
      renderCard();
    });
    done.appendChild(again);

    stage.appendChild(done);
    progressLabel.textContent = '';
  }

  function renderEmpty() {
    stage.textContent = '';
    actions.textContent = '';
    stage.appendChild(el('div', 'empty rs-empty', 'Nothing to review in this section.'));
    var back = el('a', 'rs-btn rs-primary', 'Back to Section');
    back.href = sectionUrl(route.section);
    actions.appendChild(back);
    progressLabel.textContent = '';
  }

  /* ---------- saving a result ---------- */
  function submit(result) {
    if (!state || state.busy || !state.revealed) return;
    /* A card that has just been answered is locked for a moment, so a
       second click cannot carry on into the next card. */
    if (Date.now() < (state.lockedUntil || 0)) return;
    var record = current();
    if (!record) return;

    state.busy = true;

    var saved = null;
    try {
      saved = store.applyResult(route.subject, route.section, record.term, result, state.roundId);
    } catch (e) {
      saved = null;
    }

    if (!saved) {
      /* The result is not lost silently: the card stays and the learner
         is told why. */
      showError('This result could not be saved. Check that the browser is allowed to store data, then try again.');
      state.busy = false;
      return;
    }

    if (result === 'again') {
      /* The term comes back later in this round, once. A card that is
         marked "again" twice in a row would otherwise never end. */
      var seen = state.requeued[record.term] || 0;
      if (seen < 1) {
        state.requeued[record.term] = seen + 1;
        state.records.push(record);
        state.terms.push(record.term);
        state.total = state.records.length;
      }
    }

    state.busy = false;
    state.revealed = false;
    state.pos += 1;
    state.lockedUntil = Date.now() + 400;

    if (state.pos >= state.records.length) {
      renderComplete();
      return;
    }

    writeSnapshot();
    renderCard();
  }

  /* ---------- boot ---------- */
  function boot() {
    root = document.getElementById('rsRoot');
    stage = document.getElementById('rsStage');
    actions = document.getElementById('rsActions');
    backLink = document.getElementById('rsBack');
    sectionLabel = document.getElementById('rsSection');
    progressLabel = document.getElementById('rsProgress');
    errorBox = document.getElementById('rsError');
    if (!root || !stage || !actions || !store) return;

    var params = new URLSearchParams(location.search);
    route.subject = params.get('subject') || '';
    route.section = params.get('section') || '';
    route.term = params.get('term') || '';

    if (!route.subject || !route.section) {
      location.replace('review.html');
      return;
    }

    var section = null;
    (site.subjects || []).forEach(function (subject) {
      (subject.sections || []).forEach(function (item) {
        if (subject.id === route.subject && item.id === route.section) section = item;
      });
    });
    if (!section) {
      location.replace('review.html');
      return;
    }

    sectionLabel.textContent = section.title;
    document.title = section.title + ' — Review';
    backLink.href = sectionUrl(route.section);

    if (!restoreRound()) {
      var queue = store.queue(route.subject, route.section, route.term);
      if (!queue.length) {
        renderEmpty();
        return;
      }
      startRound(queue.map(function (record) { return record.term; }), route.term);
    }

    renderCard();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
