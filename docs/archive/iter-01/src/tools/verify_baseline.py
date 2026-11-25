"""Check that the shared game assets are byte-identical to the baseline.

Usage:
    python tools/verify_baseline.py

The engine and the flashcard stylesheet come from the game generator.
The site layer wraps them but must not edit them, so the built copies are
compared against the archived snapshot by digest.
"""
import hashlib
import io
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ITER = os.path.dirname(ROOT)
BASELINE = os.path.join(ITER, '_baseline', 'learning-hub-v2')
BASELINE_JSON = os.path.join(BASELINE, 'tools', 'game-baseline.json')
DIST = os.path.join(ROOT, 'dist')


def digest(path):
    with io.open(path, 'rb') as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def main():
    with io.open(BASELINE_JSON, encoding='utf-8') as fh:
        baseline = json.load(fh)

    problems = []
    checked = 0

    for rel, expected in sorted(baseline.get('files', {}).items()):
        # The baseline records paths relative to the site root. In the
        # new layout they live under assets/, so match on the file name.
        name = rel.split('/')[-1]
        folder = 'js' if name.endswith('.js') else 'css'

        source = os.path.join(ROOT, 'assets', folder, name)
        if not os.path.exists(source):
            problems.append('source asset missing: assets/%s/%s' % (folder, name))
            continue
        actual = digest(source)
        if actual != expected:
            problems.append('source asset changed: assets/%s/%s' % (folder, name))
        checked += 1

        if not os.path.isdir(DIST):
            continue
        for site in sorted(os.listdir(DIST)):
            built = os.path.join(DIST, site, 'assets', folder, name)
            if not os.path.exists(built):
                continue
            if digest(built) != expected:
                problems.append('%s ships a modified copy: %s' % (site, name))
            checked += 1

    if problems:
        print('FAIL: %d problem(s)' % len(problems))
        for problem in problems:
            print('  - ' + problem)
        return 1

    print('%d game asset copies match the baseline digest' % checked)
    return 0


if __name__ == '__main__':
    sys.exit(main())
