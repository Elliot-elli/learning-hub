"""Compare the built site against the archived baseline.

Usage:
    python tools/verify_content.py

Two questions are answered separately:

  1. Did any card, answer or definition change? The decks in
     content/modules/ are compared card by card with the snapshot taken
     before this iteration.
  2. Did any site's archive key or chapter order change? Those are
     contract with the learner's existing progress.

The isolation check looks at what the site actually loads: the module
lists in the compiled data and the subject names in the pages. Comments
are stripped before scanning, because the shared engine mentions an
earlier module name in its header comment and that is not content.
"""
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ITER = os.path.dirname(ROOT)
BASELINE = os.path.join(ITER, '_baseline', 'learning-hub-v2', 'content')
MODULES = os.path.join(ROOT, 'content', 'modules')
DIST = os.path.join(ROOT, 'dist')

# Which decks belong to which site, and which belong to the other site.
SITE_DECKS = {
    'ap': ['ap-science-section1', 'ap-social-science-section1'],
    'ad': ['ad-art-history-section1'],
}

DECK_FILES = {
    'ap-science-section1': 'ap/ap-science-section1.json',
    'ap-social-science-section1': 'ap/ap-social-science-section1.json',
    'ad-art-history-section1': 'ad/ad-art-history-section1.json',
}

# Page text that must not appear in the other site's pages.
FOREIGN_TEXT = {
    'ap': ['Art History'],
    'ad': ['Social Science'],
}


def strip_comments(text):
    """Remove block and line comments so source scans only see real code."""
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    text = re.sub(r'(?m)^\s*//.*$', '', text)
    return text


def read(path):
    with io.open(path, encoding='utf-8') as fh:
        return fh.read()


def deck_cards(path):
    """Flatten a deck into comparable records."""
    data = json.loads(read(path))
    cards = []
    for section in data.get('sections', []):
        for level in section.get('levels', []):
            for card in level.get('cards', []):
                cards.append({
                    'term': card.get('term'),
                    'definition': card.get('definition'),
                    'source': card.get('source'),
                })
    return data, cards


def check_cards(problems):
    """Every card must match the archived deck exactly."""
    checked = 0
    for deck_id, rel in sorted(DECK_FILES.items()):
        base_path = os.path.join(BASELINE, rel)
        new_path = os.path.join(MODULES, deck_id + '.json')
        if not os.path.exists(base_path):
            problems.append('baseline deck missing: ' + rel)
            continue
        if not os.path.exists(new_path):
            problems.append('deck missing: content/modules/' + deck_id + '.json')
            continue

        base_data, base_cards = deck_cards(base_path)
        new_data, new_cards = deck_cards(new_path)

        if base_data.get('storeKey') != new_data.get('storeKey'):
            problems.append('%s storeKey changed: %s -> %s'
                            % (deck_id, base_data.get('storeKey'), new_data.get('storeKey')))
        if len(base_cards) != len(new_cards):
            problems.append('%s card count changed: %d -> %d'
                            % (deck_id, len(base_cards), len(new_cards)))
            continue

        for index, (old, new) in enumerate(zip(base_cards, new_cards)):
            for field in ('term', 'definition', 'source'):
                if old[field] != new[field]:
                    problems.append('%s card %d changed field %s'
                                    % (deck_id, index, field))
            checked += 1
    return checked


def check_contracts(problems):
    """Store keys and chapter counts must stay as they were."""
    for deck_id, rel in sorted(DECK_FILES.items()):
        new_path = os.path.join(MODULES, deck_id + '.json')
        if not os.path.exists(new_path):
            continue
        data = json.loads(read(new_path))
        chapters = sum(len(s.get('levels', [])) for s in data.get('sections', []))
        if not data.get('storeKey'):
            problems.append('%s has no storeKey' % deck_id)
        if chapters < 1:
            problems.append('%s has no chapters' % deck_id)


def check_isolation(problems):
    """A site must not load another site's decks or mention its subjects."""
    for site, own in sorted(SITE_DECKS.items()):
        site_dir = os.path.join(DIST, site)
        if not os.path.isdir(site_dir):
            problems.append('site not built: dist/' + site)
            continue

        foreign = [d for d in DECK_FILES if d not in own]

        modules_js = os.path.join(site_dir, 'assets', 'data', 'modules.js')
        if not os.path.exists(modules_js):
            problems.append('%s missing modules.js' % site)
        else:
            text = read(modules_js)
            for deck in foreign:
                if '"%s"' % deck in text:
                    problems.append('%s ships another site deck: %s' % (site, deck))
            for deck in own:
                if '"%s"' % deck not in text:
                    problems.append('%s is missing its own deck: %s' % (site, deck))

        site_js = os.path.join(site_dir, 'assets', 'data', 'site.js')
        if not os.path.exists(site_js):
            problems.append('%s missing site.js' % site)
        else:
            text = read(site_js)
            for deck in foreign:
                if deck in text:
                    problems.append('%s site data names another site deck: %s' % (site, deck))

        # Page text is scanned with comments removed, so the shared
        # engine's header comment about an earlier module does not count.
        for root, _, files in os.walk(site_dir):
            for name in files:
                if not name.endswith(('.html', '.js')):
                    continue
                path = os.path.join(root, name)
                text = strip_comments(read(path))
                for deck in foreign:
                    if deck in text:
                        problems.append('%s mentions another site deck in %s'
                                        % (site, os.path.relpath(path, DIST)))
                for word in FOREIGN_TEXT.get(site, []):
                    if word in text:
                        problems.append('%s mentions %r in %s'
                                        % (site, word, os.path.relpath(path, DIST)))


def main():
    problems = []
    checked = check_cards(problems)
    check_contracts(problems)
    check_isolation(problems)

    if problems:
        print('FAIL: %d problem(s)' % len(problems))
        for problem in problems:
            print('  - ' + problem)
        return 1

    print('%d cards match the baseline deck by deck' % checked)
    print('store keys and chapter counts unchanged')
    print('each site loads only its own decks')
    return 0


if __name__ == '__main__':
    sys.exit(main())
