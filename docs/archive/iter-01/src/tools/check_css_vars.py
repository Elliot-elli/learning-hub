"""Check that every CSS variable used in a rule is defined somewhere.

Usage:
    python tools/check_css_vars.py

An undefined variable does not raise an error. It resolves to an empty
value, so a rule like `color:var(--brand)` silently loses its colour and
the element can become unreadable while the console stays quiet.

Every stylesheet in the built site is scanned. Each file is checked on
its own first, then against the variables the other files define, because
a page may load several stylesheets and inherit tokens from any of them.
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist')

# Vars() reads a name that is built at runtime; those cannot be checked.
RUNTIME = re.compile(r'var\(\s*[\'"$]')
DEFINE = re.compile(r'(--[\w-]+)\s*:')
USE = re.compile(r'var\(\s*(--[\w-]+)')

# The engine targets browsers that do not support custom properties at
# all, so it ships fallbacks in plain colour values. Not a defect.
IGNORED_FILES = ('flashcards.css',)


def scan(path):
    """Return the variables this file defines and the ones it reads."""
    with io.open(path, encoding='utf-8') as fh:
        text = fh.read()
    defined = set(DEFINE.findall(text))
    used = set(USE.findall(text))
    return defined, used


def main():
    problems = []
    checked = 0

    for site in sorted(os.listdir(DIST)):
        css_dir = os.path.join(DIST, site, 'assets', 'css')
        if not os.path.isdir(css_dir):
            continue

        files = sorted(f for f in os.listdir(css_dir) if f.endswith('.css'))
        site_defined = set()
        for name in files:
            defined, _ = scan(os.path.join(css_dir, name))
            site_defined |= defined

        for name in files:
            if name in IGNORED_FILES:
                continue
            path = os.path.join(css_dir, name)
            _, used = scan(path)
            for var in sorted(used):
                if var in site_defined:
                    continue
                problems.append('%s: %s uses %s but no stylesheet defines it'
                                % (site, name, var))
            checked += 1

    if problems:
        print('FAIL: %d unresolved variable(s)' % len(problems))
        for problem in problems:
            print('  - ' + problem)
        return 1

    print('%d stylesheets checked, every variable resolves' % checked)
    return 0


if __name__ == '__main__':
    sys.exit(main())
