#!/usr/bin/env bash
# Learning Hub -- rollback to the archived baseline.
#
# Usage:  bash rollback.sh
#
# What it does:
#   1. Verifies the archived baseline is present and complete.
#   2. Moves the current working site aside (to .rollback-saved-<timestamp>)
#      instead of deleting it, so a mistaken rollback is itself reversible.
#   3. Restores the baseline copy.
#   4. Verifies every restored file matches the archive byte for byte.
#
# Nothing outside this project directory is touched.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT="$(cd "$HERE/../.." && pwd)"
BASELINE="$HERE/_baseline/learning-hub-v2"
TARGET="$PROJECT/learning-hub-v2"

echo "Project : $PROJECT"
echo "Baseline: $BASELINE"
echo "Target  : $TARGET"
echo

if [ ! -d "$BASELINE" ]; then
  echo "FAIL: baseline archive missing -- $BASELINE" >&2
  exit 1
fi

if [ ! -f "$BASELINE/index.html" ] || [ ! -d "$BASELINE/content" ] \
   || [ ! -d "$BASELINE/assets" ] || [ ! -d "$BASELINE/tools" ]; then
  echo "FAIL: baseline archive is incomplete (index.html / content / assets / tools missing)." >&2
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
SAVED="$PROJECT/.rollback-saved-$STAMP"

if [ -e "$TARGET" ]; then
  echo "Saving current site to: $SAVED"
  mv "$TARGET" "$SAVED"
fi

echo "Restoring baseline..."
cp -r "$BASELINE" "$TARGET"

# Byte-for-byte check against the archive.
if command -v sha256sum >/dev/null 2>&1; then
  echo "Verifying restored files..."
  MISMATCH=0
  while IFS= read -r rel; do
    a="$(sha256sum "$BASELINE/$rel" | cut -d' ' -f1)"
    b="$(sha256sum "$TARGET/$rel" | cut -d' ' -f1)"
    if [ "$a" != "$b" ]; then
      echo "  MISMATCH: $rel" >&2
      MISMATCH=1
    fi
  done < <(cd "$BASELINE" && find . -type f | sed 's|^\./||' | sort)

  if [ "$MISMATCH" -ne 0 ]; then
    echo "FAIL: restored files differ from the archive." >&2
    exit 1
  fi
  echo "All restored files match the archive."
else
  echo "Note: sha256sum unavailable, skipping the byte-for-byte check."
fi

echo
echo "Rollback complete. Previous version kept at:"
echo "  $SAVED"
