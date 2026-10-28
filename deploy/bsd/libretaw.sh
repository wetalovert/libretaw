#!/bin/sh
# libretaw для BSD (FreeBSD, OpenBSD, NetBSD, DragonFly BSD).
# Открывает приложение в отдельном окне браузера (Chromium или Firefox), как обычную программу.
#
#   libretaw              открыть приложение
#   libretaw --browser X  выбрать браузер: chromium, chrome, firefox
#   libretaw --version    показать версию
set -eu

PREFIX="${PREFIX:-/usr/local}"
APP="$PREFIX/share/libretaw/libretaw.html"
DATA="${XDG_DATA_HOME:-$HOME/.local/share}/libretaw"
VERSION="beta2"
BROWSER=""

while [ $# -gt 0 ]; do
  case "$1" in
    --version) echo "libretaw $VERSION"; exit 0 ;;
    --browser) shift; BROWSER="${1:-}" ;;
    -h|--help) sed -n '2,6p' "$0"; exit 0 ;;
    *) echo "Неизвестный параметр: $1" >&2; exit 2 ;;
  esac
  shift
done

if [ ! -f "$APP" ]; then
  echo "Не найдено приложение: $APP" >&2
  echo "Переустановите libretaw или задайте PREFIX." >&2
  exit 1
fi

find_browser() {
  for b in chromium chrome firefox; do
    if command -v "$b" >/dev/null 2>&1; then echo "$b"; return 0; fi
  done
  return 1
}

if [ -z "$BROWSER" ]; then
  BROWSER="$(find_browser || true)"
fi
if [ -z "$BROWSER" ]; then
  echo "Не найден браузер. Установите Chromium или Firefox:" >&2
  echo "  FreeBSD:   pkg install chromium" >&2
  echo "  OpenBSD:   pkg_add chromium" >&2
  echo "  NetBSD:    pkgin install chromium" >&2
  echo "  DragonFly: pkg install chromium" >&2
  exit 1
fi

mkdir -p "$DATA/profile"
case "$BROWSER" in
  chromium|chrome)
    exec "$BROWSER" --app="file://$APP" --user-data-dir="$DATA/profile" --no-first-run --class=libretaw ;;
  firefox)
    # Firefox не умеет открывать приложение без адресной строки; используем отдельный профиль.
    exec firefox --profile "$DATA/profile" --new-instance --no-remote "file://$APP" ;;
  *)
    echo "Неизвестный браузер: $BROWSER" >&2; exit 2 ;;
esac
