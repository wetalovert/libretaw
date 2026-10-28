#!/usr/bin/env bash
# Copies the web app into the Android project's assets (the APK ships this copy, works offline).
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/android/app/src/main/assets/web"
rm -rf "$DEST" && mkdir -p "$DEST"
cp -r "$ROOT/web/." "$DEST/"
echo "Android assets updated: $DEST"
