#!/usr/bin/env bash
# Runs the whole test set. Needs Node.js 18+. Works in a temporary folder; the repository itself is not changed.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="$(mktemp -d)"
node "$ROOT/scripts/extract-app-script.js" "$ROOT/web/index.html" "$BUILD/main.js" >/dev/null || exit 1
pass=0; fail=0
for t in "$ROOT"/tests/*.js; do
  name="$(basename "$t")"
  case "$name" in smoke2.js|nonetest.js) continue;; esac            # helpers used by other tests
  # first the temporary-file paths, then the repository paths (the repository may itself live under /tmp)
  sed -e "s#/tmp/#$BUILD/#g" \
      -e "s#/mnt/user-data/outputs/libretaw-src/server#$ROOT/server#g" \
      -e "s#/mnt/user-data/outputs/server#$ROOT/server#g" \
      -e "s#/mnt/user-data/outputs/libretaw.html#$ROOT/web/index.html#g" "$t" > "$BUILD/$name"
  out="$(cd "$BUILD" && timeout 240 node "$name" 2>&1)"; code=$?
  last="$(echo "$out" | grep -v '^$' | tail -1)"
  if [ $code -eq 0 ]; then pass=$((pass+1)); echo "ok    $name: $last"
  else fail=$((fail+1)); echo "FAIL  $name (exit $code): $last"; fi
done
echo "--- $pass passed, $fail failed"
rm -rf "$BUILD"
[ "$fail" -eq 0 ]
