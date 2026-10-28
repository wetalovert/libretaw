#!/usr/bin/env bash
# libretaw без домена: установка на чистый сервер Ubuntu или Debian одной командой.
# Сервер будет доступен по IP-адресу: ws://ВАШ_IP:8080
#
# Запуск (от root):   sudo bash install.sh
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Запустите установку от root: sudo bash install.sh"; exit 1
fi

HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/../../server"
if [ ! -f "$SRC/libretaw-server.js" ]; then
  echo "Не найден файл server/libretaw-server.js. Запускайте install.sh из распакованного архива libretaw."; exit 1
fi

echo "==> Устанавливаю системные пакеты"
apt-get update -y >/dev/null
apt-get install -y curl ca-certificates openssl >/dev/null

if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 18 ]; then
  echo "==> Устанавливаю Node.js 20"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null
  apt-get install -y nodejs >/dev/null
fi
NODE_BIN="$(command -v node)"

echo "==> Создаю пользователя и папки"
id libretaw >/dev/null 2>&1 || useradd --system --home /opt/libretaw --shell /usr/sbin/nologin libretaw
install -d -o libretaw -g libretaw /opt/libretaw /opt/libretaw/data
install -m 644 "$SRC/libretaw-server.js" /opt/libretaw/libretaw-server.js

ENVFILE=/etc/libretaw.env
NEW_SECRETS=0
if [ ! -f "$ENVFILE" ]; then
  echo "==> Создаю пароли (сохраняются в $ENVFILE, доступ только у root)"
  DATA_KEY="$(openssl rand -base64 24)"
  CONN_PASS="$(openssl rand -base64 18 | tr -d '/+=')"
  ADMIN_PASS="$(openssl rand -base64 18 | tr -d '/+=')"
  umask 077
  cat > "$ENVFILE" <<ENV
PORT=8080
HOST=0.0.0.0
DATA_DIR=/opt/libretaw/data
SERVER_NAME=libretaw
LIBRETAW_DATA_KEY=$DATA_KEY
LIBRETAW_TOKEN=$CONN_PASS
ADMIN_TOKEN=$ADMIN_PASS
ENV
  chmod 600 "$ENVFILE"
  NEW_SECRETS=1
else
  echo "==> Файл $ENVFILE уже есть, пароли не меняю"
fi

echo "==> Настраиваю службу systemd"
cat > /etc/systemd/system/libretaw.service <<UNIT
[Unit]
Description=libretaw server
After=network-online.target
Wants=network-online.target

[Service]
User=libretaw
Group=libretaw
WorkingDirectory=/opt/libretaw
EnvironmentFile=$ENVFILE
ExecStart=$NODE_BIN /opt/libretaw/libretaw-server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now libretaw >/dev/null

if command -v ufw >/dev/null 2>&1; then
  ufw allow 8080/tcp >/dev/null 2>&1 || true
fi

IP="$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"
sleep 2
STATUS="$(systemctl is-active libretaw || true)"

echo
echo "================================================================"
echo " libretaw установлен. Служба: $STATUS"
echo " Адрес для приложения:  ws://$IP:8080"
echo "================================================================"
if [ "$NEW_SECRETS" -eq 1 ]; then
  echo " Сохраните эти данные в надёжном месте (они больше не выводятся):"
  echo "   Пароль подключения (для всех):  $CONN_PASS"
  echo "   Пароль администратора:          $ADMIN_PASS"
  echo "   Фраза шифрования данных:        $DATA_KEY"
  echo " Без фразы шифрования данные не восстановить."
  echo "================================================================"
fi
echo " Проверка:  journalctl -u libretaw -n 20"
echo " Остановить: systemctl stop libretaw    Запустить: systemctl start libretaw"
echo
echo " ВНИМАНИЕ: без домена соединение не шифруется транспортным уровнем (нет HTTPS)."
echo " Сообщения шифруются приложением, но пароли и метаданные идут по сети открыто."
echo " Для важного общения используйте VPN (см. docs/Инструкция-2-хостинг.md)."
