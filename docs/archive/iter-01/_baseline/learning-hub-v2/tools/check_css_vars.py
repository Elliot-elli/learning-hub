"""Check that every CSS custom property used by a stylesheet resolves.

The game page loads flashcards.css and theme-flashcards.css only, so a
var(--brand) reference in the theme resolves to nothing unless the theme
declares it. An unresolved variable leaves the property unset, which in
practice makes a button's text and background the same colour.

Usage: python tools/check_css_vars.py
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PAIRS = [
    ('assets/css/theme-flashcards.css', ['assets/css/flashcards.css']),
    ('assets/css/shell.css', ['assets/css/tokens.css']),
]


def declared_vars(path):
    with open(os.path.join(ROOT, path), encoding='utf-8') as fh:
        text = fh.read()
    return set(re.findall(r'(--[A-Za-z0-9_-]+)\s*:', text)), text


def main():
    problems = []
    for target, sources in PAIRS:
        declared, text = declared_vars(target)
        available = set(declared)
        for src in sources:
            src_declared, _ = declared_vars(src)
            available |= src_declared
        used = set(re.findall(r'var\((--[A-Za-z0-9_-]+)', text))
        missing = sorted(v for v in used if v not in available)
        if missing:
            problems.append('%s uses unresolved %s' % (target, ', '.join(missing)))
        print('%s: %d used, %d unresolved' % (target, len(used), len(missing)))

    if problems:
        raise SystemExit('unresolved CSS variables:\n  - '
                         + '\n  - '.join(problems))
    print('all CSS variables resolve')


if __name__ == '__main__':
    main()
