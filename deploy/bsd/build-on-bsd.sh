#!/bin/sh
# Сборка нативных файлов libretaw НА самой BSD-системе: FreeBSD, OpenBSD, NetBSD, DragonFly BSD.
# Кросс-сборка не поддерживается: собирайте на той системе, для которой нужен файл.
#
#   sh build-on-bsd.sh            # лаунчер libretaw (нужен cc)
#   sh build-on-bsd.sh server     # + самостоятельный бинарник сервера (нужен node >= 20 и сеть для postject)
#
# Результат: dist/<система>-<архитектура>/
set -eu

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
OS="$(uname -s | tr 'A-Z' 'a-z')"
ARCH="$(uname -m)"
OUT="$HERE/dist/$OS-$ARCH"
PREFIX="${PREFIX:-/usr/local}"
mkdir -p "$OUT"

echo "==> Сборка лаунчера для $OS/$ARCH"
if ! command -v cc >/dev/null 2>&1; then
  echo "Нет компилятора cc. FreeBSD: pkg install llvm (или devel/gcc); OpenBSD и NetBSD: base-компилятор в системе." >&2
  exit 1
fi
cc -O2 -Wall -Wextra -DLIBRETAW_PREFIX=\"$PREFIX\" -o "$OUT/libretaw" "$HERE/libretaw.c"
echo "    $OUT/libretaw"

if [ "${1:-}" = "server" ]; then
  echo "==> Сборка сервера (Node.js Single Executable Application)"
  if ! command -v node >/dev/null 2>&1; then
    echo "Нет node. Установите Node.js 20 или новее (см. docs/Установка-BSD.md)." >&2; exit 1
  fi
  MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
  if [ "$MAJOR" -lt 20 ]; then
    echo "Нужен Node.js 20 или новее, найден $(node -v)." >&2; exit 1
  fi
  cd "$OUT"
  cat > sea-config.json <<JSON
{
  "main": "$ROOT/server/libretaw-server.js",
  "output": "sea-prep.blob",
  "disableExperimentalSEAWarning": true
}
JSON
  node --experimental-sea-config sea-config.json
  cp "$(command -v node)" libretaw-server
  chmod 755 libretaw-server
  # postject встраивает блоб в копию node; для этого нужен npm и сеть один раз
  npm install --no-save --no-audit --no-fund postject@1
  npx postject libretaw-server NODE_SEA_BLOB sea-prep.blob \
    --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
  chmod 755 libretaw-server
  echo "    $OUT/libretaw-server"
  echo "    Запуск: LIBRETAW_DATA_KEY=... PORT=8080 ./libretaw-server   (APP_FILE — путь к libretaw.html)"
fi

echo "==> Готово. Установка лаунчера: install -m 755 $OUT/libretaw $PREFIX/bin/libretaw"
