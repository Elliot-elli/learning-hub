"""Check that the shared game assets are byte-identical to the baseline.

Usage:
    python tools/verify_baseline.py [--baseline <dir>]

The engine and the flashcard stylesheet come from the game generator.
The site layer wraps them but must not edit them, so the source file
and every built copy are compared against the recorded digest.

The expected digests are read from the repository's own
tools/game-baseline.json. That file is the contract: it is edited only
together with the asset it describes, and every change is written down
in its "history" list. The archived snapshot under docs/archive holds a
frozen copy of the same file; it is only used to report what changed
since that snapshot was taken, and a missing snapshot is not an error.

The baseline is searched for rather than hard coded, so the script works
from the iteration workspace and from the merged site alike. Pass
--baseline to point at it explicitly.
"""
import hashlib
import io
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'site')
CONTRACT = os.path.join(ROOT, 'tools', 'game-baseline.json')

# The archived snapshot carries its own digest list, so the search looks
# for that file rather than for a fixed path.
BASELINE_CANDIDATES = [
    os.path.join(ROOT, 'docs', 'archive', 'iter-01', '_baseline', 'learning-hub-v2'),
    os.path.join(ROOT, '..', 'iterations', 'iter-01', '_baseline', 'learning-hub-v2'),
    os.path.join(ROOT, '..', '_baseline', 'learning-hub-v2'),
    os.path.join(ROOT, '_baseline', 'learning-hub-v2'),
    os.path.join(ROOT, '..', '..', 'iterations', 'iter-01', '_baseline', 'learning-hub-v2'),
]


def has_baseline_shape(candidate):
    """A baseline carries the archived deck list under its own tools folder.

    The live site also has a tools/game-baseline.json, so the file alone
    is not enough to tell the two apart. The archived snapshot keeps its
    decks under content/<programme>/, which the live site does not have.
    """
    if not os.path.isfile(os.path.join(candidate, 'tools', 'game-baseline.json')):
        return False
    content = os.path.join(candidate, 'content')
    if not os.path.isdir(content):
        return False
    for programme in ('ap', 'ad'):
        if os.path.isdir(os.path.join(content, programme)):
            return True
    return False


def find_baseline():
    """Locate the archived snapshot, or report where it was looked for."""
    argv = sys.argv[1:]
    if '--baseline' in argv:
        index = argv.index('--baseline')
        if index + 1 >= len(argv):
            raise SystemExit('--baseline needs a directory')
        explicit = os.path.abspath(argv[index + 1])
        if not has_baseline_shape(explicit):
            raise SystemExit(
                'not a baseline directory (no tools/game-baseline.json with '
                'content/ap or content/ad): ' + explicit)
        return explicit

    for candidate in BASELINE_CANDIDATES:
        if has_baseline_shape(candidate):
            return candidate
    return None


def digest(path):
    with io.open(path, 'rb') as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def report_archive(contract):
    """Say what changed against the archived snapshot. Informational only:
    the snapshot is a frozen copy, the live contract is the baseline."""
    archive = find_baseline()
    if not archive:
        print('no archived snapshot found: the live contract is the baseline')
        return
    archived_json = os.path.join(archive, 'tools', 'game-baseline.json')
    try:
        with io.open(archived_json, encoding='utf-8') as fh:
            archived = json.load(fh)
    except (IOError, ValueError):
        print('archived snapshot unreadable: ' + archived_json)
        return

    archived_files = archived.get('files', {})
    changed = []
    for rel, expected in sorted(contract.get('files', {}).items()):
        was = archived_files.get(rel)
        if was and was != expected:
            changed.append(rel)
    if changed:
        print('changed since the archived snapshot (recorded in the contract): '
              + ', '.join(changed))
    else:
        print('identical to the archived snapshot')


def main():
    with io.open(CONTRACT, encoding='utf-8') as fh:
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
    report_archive(baseline)
    return 0


if __name__ == '__main__':
    sys.exit(main())
