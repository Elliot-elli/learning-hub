/* Review store -- the one place where review state lives.
 *
 * Two things feed it:
 *
 *   1. The flashcards engine writes every term a learner marked
 *      "Not sure" or "I don't know" into that deck's own archive, under
 *      the key "review". Those records stay where they are: this store
 *      folds a copy of them in the first time it sees them and updates
 *      that copy in place, so one term can only ever occupy one slot
 *      and the old archive is never rewritten or emptied.
 *
 *   2. The review session writes its own results here.
 *
 * A record is keyed by subject, section and term. The text alone is not
 * a safe key: the same word can turn up in two sections, and the text
 * can be edited later without the record losing its meaning.
 *
 * Reading is defensive throughout. A missing field, an old version or a
 * broken timestamp must never take a page down, so every value that
 * comes out of storage is checked before it is used.
 */
(function () {
  'use strict';

  var VERSION = 1;
  var DAY = 24 * 60 * 60 * 1000;

  /* How long a term waits before it is checked again after a "Got it".
     Configurable in one place so the rule can be tuned later. */
  var GOT_IT_INTERVAL = 3 * DAY;

  /* The history is kept for reference. It is trimmed so the archive
     cannot grow without bound. */
  var HISTORY_LIMIT = 60;

  function siteData() {
    return window.LH_SITE || { id: 'site', subjects: [] };
  }

  function storeKey() {
    return 'lh_review_v1:' + siteData().id;
  }

  function emptyStore() {
    return { v: VERSION, terms: {} };
  }

  /* A number that is a number, or the fallback. Anything else is
     treated as missing rather than trusted. */
  function num(value, fallback) {
    var n = typeof value === 'number' ? value : parseInt(value, 10);
    if (typeof n !== 'number' || !isFinite(n)) return fallback;
    return n;
  }

  function readStore() {
    try {
      var raw = localStorage.getItem(storeKey());
      if (!raw) return emptyStore();
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return emptyStore();
      if (!parsed.terms || typeof parsed.terms !== 'object') parsed.terms = {};
      parsed.v = VERSION;
      return parsed;
    } catch (e) {
      return emptyStore();
    }
  }

  function writeStore(store) {
    try {
      localStorage.setItem(storeKey(), JSON.stringify(store));
      return true;
    } catch (e) {
      return false;
    }
  }

  function eachSection(fn) {
    var subjects = siteData().subjects || [];
    subjects.forEach(function (subject) {
      (subject.sections || []).forEach(function (section) {
        fn(subject, section);
      });
    });
  }

  function recordKey(subjectId, sectionId, term) {
    return subjectId + '|' + sectionId + '|' + term;
  }

  /* The deck archive the engine writes into. Read only: nothing here
     ever writes back to it. */
  function deckArchive(section) {
    try {
      var raw = localStorage.getItem(section.storeKey);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function pushHistory(record, result, when) {
    if (!Array.isArray(record.history)) record.history = [];
    record.history.push({ result: result, reviewedAt: when });
    if (record.history.length > HISTORY_LIMIT) {
      record.history = record.history.slice(record.history.length - HISTORY_LIMIT);
    }
  }

  /* The legacy engine states are "uncertain" and "unknown". They map
     onto the review states used here. */
  function stateFromFlag(flagState) {
    return flagState === 'unknown' ? 'again' : 'not-sure';
  }

  /* Fold the terms flagged while learning into this store.
   *
   * A term that is already known is only touched when the deck archive
   * is newer than the record, so a session result is never undone by
   * an old flag, and a fresh flag always wins over an old one. */
  function foldLegacy(store) {
    var changed = false;

    eachSection(function (subject, section) {
      var archive = deckArchive(section);
      if (!archive) return;

      var flagged = archive.review && typeof archive.review === 'object' ? archive.review : {};
      var learned = archive.mastered && typeof archive.mastered === 'object' ? archive.mastered : {};

      var names = {};
      Object.keys(flagged).forEach(function (t) { names[t] = true; });
      Object.keys(learned).forEach(function (t) { names[t] = true; });

      Object.keys(names).forEach(function (term) {
        var key = recordKey(subject.id, section.id, term);
        var flagTs = flagged[term] ? num(flagged[term].ts, 0) * 1000 : 0;
        var learnTs = learned[term] ? num(learned[term].ts, 0) * 1000 : 0;
        var flagState = flagged[term] ? flagged[term].state : '';
        var existing = store.terms[key];

        if (!existing || typeof existing !== 'object') {
          var mastered = learnTs > 0 && learnTs >= flagTs;
          var result = mastered ? 'got-it' : stateFromFlag(flagState);
          var when = Math.max(flagTs, learnTs) || Date.now();
          var first = Math.min(
            flagTs || when,
            learnTs || when
          );
          store.terms[key] = {
            termId: key,
            subjectId: subject.id,
            sectionId: section.id,
            term: term,
            status: mastered ? 'mastered' : (result === 'again' ? 'again' : 'learning'),
            lastResult: result,
            reviewCount: 1,
            consecutiveCorrect: mastered ? 2 : 0,
            createdAt: first,
            lastReviewedAt: when,
            nextReviewAt: mastered ? 0 : Date.now(),
            lastRoundId: '',
            history: [{ result: result, reviewedAt: when, source: 'learning' }]
          };
          changed = true;
          return;
        }

        var last = num(existing.lastReviewedAt, 0);
        if (flagTs > last) {
          var fresh = stateFromFlag(flagState);
          existing.status = fresh === 'again' ? 'again' : 'learning';
          existing.lastResult = fresh;
          existing.lastReviewedAt = flagTs;
          existing.nextReviewAt = Date.now();
          existing.consecutiveCorrect = 0;
          pushHistory(existing, fresh, flagTs);
          changed = true;
        } else if (learnTs > last) {
          existing.status = 'mastered';
          existing.lastResult = 'got-it';
          existing.lastReviewedAt = learnTs;
          existing.nextReviewAt = 0;
          existing.consecutiveCorrect = 2;
          pushHistory(existing, 'got-it', learnTs);
          changed = true;
        }
      });
    });

    return changed;
  }

  /* The cached store. Reading it again after a write keeps the page and
     the store in step. */
  var cache = null;

  function refresh() {
    cache = readStore();
    if (foldLegacy(cache)) writeStore(cache);
    return cache;
  }

  function records() {
    var store = refresh();
    var out = [];
    Object.keys(store.terms).forEach(function (key) {
      var record = store.terms[key];
      if (record && typeof record === 'object') out.push(record);
    });
    return out;
  }

  function countsOf(list) {
    var counts = { total: 0, again: 0, learning: 0, mastered: 0 };
    (list || []).forEach(function (record) {
      if (!record) return;
      if (record.status === 'mastered') {
        counts.mastered += 1;
        return;
      }
      counts.total += 1;
      if (record.status === 'again') counts.again += 1;
      else counts.learning += 1;
    });
    return counts;
  }

  var api = {
    key: storeKey,

    /* Re-read the store and fold in anything newly flagged. */
    refresh: function () {
      refresh();
      return cache;
    },

    /* Every known term, oldest or newest, one record per term. */
    all: function () {
      return records();
    },

    /* The records of one section, in no particular order. */
    forSection: function (subjectId, sectionId) {
      return records().filter(function (record) {
        return record && record.subjectId === subjectId && record.sectionId === sectionId;
      });
    },

    /* Counts for a list of records. */
    countsOf: countsOf,

    /* Counts per subject, for the subject tabs. */
    bySubject: function () {
      var map = {};
      records().forEach(function (record) {
        if (!record || !record.subjectId) return;
        if (!map[record.subjectId]) {
          map[record.subjectId] = { total: 0, again: 0, learning: 0, mastered: 0 };
        }
        var slot = map[record.subjectId];
        if (record.status === 'mastered') {
          slot.mastered += 1;
          return;
        }
        slot.total += 1;
        if (record.status === 'again') slot.again += 1;
        else slot.learning += 1;
      });
      return map;
    },

    /* The number of terms still waiting for review. Each term counts
       once, no matter how often it was flagged. */
    pendingTotal: function () {
      var total = 0;
      records().forEach(function (record) {
        if (record && record.status !== 'mastered') total += 1;
      });
      return total;
    },

    /* The deck archive, read only. Used to tell a section that has
       never been opened from one that is finished. */
    progress: function (section) {
      var archive = deckArchive(section);
      var cleared = archive && archive.cleared && typeof archive.cleared === 'object'
        ? Object.keys(archive.cleared).length : 0;
      var mastered = archive && archive.mastered && typeof archive.mastered === 'object'
        ? Object.keys(archive.mastered).length : 0;
      return {
        cleared: cleared,
        mastered: mastered,
        total: section.chapters || 0,
        started: cleared > 0 || mastered > 0
      };
    },

    /* The definition of a term, taken from the deck it belongs to. */
    definition: function (subjectId, sectionId, term) {
      var modules = window.AP_MODULES || {};
      var target = null;
      eachSection(function (subject, section) {
        if (!target && subject.id === subjectId && section.id === sectionId) {
          target = section;
        }
      });
      if (!target) return '';
      var deck = modules[target.module];
      if (!deck) return '';
      var found = '';
      (deck.sections || []).forEach(function (chapter) {
        (chapter.levels || []).forEach(function (level) {
          (level.cards || []).forEach(function (card) {
            if (card && card.term === term) found = card.definition || '';
          });
        });
      });
      return found;
    },

    /* Record the outcome of one review card.
     *
     * "again" and "not-sure" put the term back into the queue at once.
     * "got-it" counts towards mastery only when it happens in a later
     * round than the one before, so two rounds of a stable answer are
     * needed before a term leaves the list for good. */
    applyResult: function (subjectId, sectionId, term, result, roundId) {
      var store = refresh();
      var key = recordKey(subjectId, sectionId, term);
      var now = Date.now();
      var record = store.terms[key];

      if (!record || typeof record !== 'object') {
        record = {
          termId: key,
          subjectId: subjectId,
          sectionId: sectionId,
          term: term,
          status: 'learning',
          lastResult: '',
          reviewCount: 0,
          consecutiveCorrect: 0,
          createdAt: now,
          lastReviewedAt: 0,
          nextReviewAt: now,
          lastRoundId: '',
          history: []
        };
        store.terms[key] = record;
      }

      record.reviewCount = num(record.reviewCount, 0) + 1;
      record.lastReviewedAt = now;

      if (result === 'again') {
        record.status = 'again';
        record.lastResult = 'again';
        record.consecutiveCorrect = 0;
        record.nextReviewAt = now;
      } else if (result === 'not-sure') {
        record.status = 'learning';
        record.lastResult = 'not-sure';
        record.consecutiveCorrect = 0;
        record.nextReviewAt = now;
      } else {
        if (!record.lastRoundId || record.lastRoundId !== roundId) {
          record.consecutiveCorrect = num(record.consecutiveCorrect, 0) + 1;
        }
        record.lastResult = 'got-it';
        if (num(record.consecutiveCorrect, 0) >= 2) {
          record.status = 'mastered';
          record.nextReviewAt = 0;
        } else {
          record.status = 'learning';
          record.nextReviewAt = now + GOT_IT_INTERVAL;
        }
      }

      record.lastRoundId = roundId;
      pushHistory(record, record.lastResult, now);

      if (!writeStore(store)) return null;
      return record;
    },

    /* The queue for one section.
     *
     * Terms that still need practice come first, then the ones that are
     * due, then the ones whose turn has not come yet. Terms that have
     * been mastered stay out unless they are asked for by name. */
    queue: function (subjectId, sectionId, startTerm) {
      var now = Date.now();
      var pending = api.forSection(subjectId, sectionId).filter(function (record) {
        return record.status !== 'mastered';
      });

      var practice = pending.filter(function (r) { return r.status === 'again'; });
      practice.sort(function (a, b) {
        return num(b.lastReviewedAt, 0) - num(a.lastReviewedAt, 0);
      });

      var learning = pending.filter(function (r) { return r.status !== 'again'; });
      var due = learning.filter(function (r) { return num(r.nextReviewAt, 0) <= now; });
      var later = learning.filter(function (r) { return num(r.nextReviewAt, 0) > now; });
      var byDue = function (a, b) {
        return num(a.nextReviewAt, 0) - num(b.nextReviewAt, 0);
      };
      due.sort(byDue);
      later.sort(byDue);

      var queue = practice.concat(due, later);

      if (startTerm) {
        for (var i = 0; i < queue.length; i += 1) {
          if (queue[i].term === startTerm) {
            var picked = queue.splice(i, 1)[0];
            queue.unshift(picked);
            break;
          }
        }
      }
      return queue;
    },

    /* The records of one section, split into the groups the review
       list shows. */
    groups: function (subjectId, sectionId) {
      var list = api.forSection(subjectId, sectionId);
      var practice = list.filter(function (r) { return r.status === 'again'; });
      practice.sort(function (a, b) {
        return num(b.lastReviewedAt, 0) - num(a.lastReviewedAt, 0);
      });

      var learning = list.filter(function (r) { return r.status === 'learning'; });
      learning.sort(function (a, b) {
        return num(a.nextReviewAt, 0) - num(b.nextReviewAt, 0);
      });

      var mastered = list.filter(function (r) { return r.status === 'mastered'; });
      mastered.sort(function (a, b) {
        return num(b.lastReviewedAt, 0) - num(a.lastReviewedAt, 0);
      });

      return { practice: practice, learning: learning, mastered: mastered };
    }
  };

  window.LH_REVIEW = api;
})();
