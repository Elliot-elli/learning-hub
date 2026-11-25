"""Check that the game assets still match the recorded baseline.

The flashcard engine and its stylesheet come from the game generation
skill. The integration layer must not change them, so their sha256 is
recorded in tools/game-baseline.json.

Usage: python tools/verify_baseline.py
"""
import hashlib
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASELINE = os.path.join(ROOT, 'tools', 'game-baseline.json')


def sha256(path):
    with open(path, 'rb') as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def main():
    with open(BASELINE, encoding='utf-8') as fh:
        baseline = json.load(fh)

    problems = []
    for rel, expected in baseline['files'].items():
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            problems.append('%s is missing' % rel)
            continue
        actual = sha256(path)
        if actual != expected:
            problems.append('%s changed: %s -> %s' % (rel, expected, actual))
        else:
            print('%s ok' % rel)

    if problems:
        raise SystemExit('game asset drift:\n  - ' + '\n  - '.join(problems))
    print('game assets match the baseline')


if __name__ == '__main__':
    main()
