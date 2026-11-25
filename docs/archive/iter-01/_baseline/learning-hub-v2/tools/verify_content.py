"""Reconcile content/*.json against the source question banks.

The source files are the previous site's compiled data files. Every card
must match term for term, and the storage key must stay unchanged so a
learner's existing archive keeps working.

Usage:
    python tools/verify_content.py
"""
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, 'content')
SOURCE = os.path.abspath(os.path.join(ROOT, '..', 'learning-hub', 'assets', 'data'))

# module id -> (source data file, source module id)
SOURCES = {
    'ap-science-section1': ('ap-science-section1.js', 'ap-science-section1'),
    'ap-social-science-section1': ('ap-social-science-section1.js',
                                    'ap-social-science-section1'),
}

AD_SOURCE = ('sq-art-history.js', 'sq-art-history')


def load_json(path):
    with open(path, encoding='utf-8') as fh:
        return json.load(fh)


def load_source_module(filename, module_id):
    """Read a legacy window.AP_MODULES data file through Node.

    The file holds a JavaScript object literal with non-ASCII comments,
    so it is evaluated by Node rather than parsed as JSON.
    """
    path = os.path.join(SOURCE, filename)
    if not os.path.exists(path):
        raise SystemExit('source file missing: ' + path)
    reader = os.path.join(ROOT, 'tools', 'read_source.js')
    result = subprocess.run(
        ['node', reader, path, module_id],
        capture_output=True, text=True, encoding='utf-8')
    if result.returncode != 0:
        raise SystemExit('reading ' + filename + ' failed: ' + result.stderr.strip())
    return json.loads(result.stdout)


def cards_of(module):
    out = []
    for sec in module['sections']:
        for level in sec['levels']:
            for card in level['cards']:
                out.append((level['id'], card['term'], card['definition']))
    return out


def main():
    problems = []
    checked_cards = 0

    for module_id, (filename, source_id) in SOURCES.items():
        module = load_json(os.path.join(CONTENT, 'ap', module_id + '.json'))
        source = load_source_module(filename, source_id)

        if module['storeKey'] != source['storeKey']:
            problems.append('%s storeKey changed: %s -> %s'
                            % (module_id, source['storeKey'], module['storeKey']))

        mine = cards_of(module)
        theirs = cards_of(source)
        if len(mine) != len(theirs):
            problems.append('%s card count changed: %d -> %d'
                            % (module_id, len(theirs), len(mine)))
        for i, (a, b) in enumerate(zip(theirs, mine)):
            if a[0] != b[0]:
                problems.append('%s card %d moved to a different chapter' % (module_id, i))
            if a[1] != b[1]:
                problems.append('%s card %d term changed: %r -> %r'
                                % (module_id, i, a[1], b[1]))
            if a[2] != b[2]:
                problems.append('%s card %d definition changed' % (module_id, i))
        checked_cards += len(mine)

        levels_mine = [lv['id'] for s in module['sections'] for lv in s['levels']]
        levels_source = [lv['id'] for s in source['sections'] for lv in s['levels']]
        if levels_mine != levels_source:
            problems.append('%s chapter ids changed: %s -> %s'
                            % (module_id, levels_source, levels_mine))

    # AD: the quiz became flashcards. Every question, option and the
    # answer must survive the conversion.
    ad = load_json(os.path.join(CONTENT, 'ad', 'ad-art-history-section1.json'))
    sq = load_source_module(*AD_SOURCE)
    ad_cards = [c for s in ad['sections'] for lv in s['levels'] for c in lv['cards']]
    if len(ad_cards) != len(sq['questions']):
        problems.append('AD card count changed: %d -> %d'
                        % (len(sq['questions']), len(ad_cards)))
    for i, (q, card) in enumerate(zip(sq['questions'], ad_cards)):
        if card['term'] != q['o'][q['a']]:
            problems.append('AD card %d answer text changed' % i)
        if q['q'] not in card['definition']:
            problems.append('AD card %d lost its question stem' % i)
        if q.get('e') and q['e'] not in card['definition']:
            problems.append('AD card %d lost its explanation' % i)
        # The original options and answer index must stay on the card so
        # a future MCQ activity can read them without re-authoring.
        source = card.get('source', {})
        if source.get('options') != q['o']:
            problems.append('AD card %d lost its options' % i)
        if source.get('answerIndex') != q['a']:
            problems.append('AD card %d lost its answer index' % i)
        if source.get('question') != q['q']:
            problems.append('AD card %d lost its question text' % i)
        checked_cards += 1

    print('reconciled %d cards against the source banks' % checked_cards)
    if problems:
        raise SystemExit('content drift:\n  - ' + '\n  - '.join(problems))
    print('content matches the source banks')


if __name__ == '__main__':
    main()
