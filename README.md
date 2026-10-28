# libretaw

Личный мессенджер с чатами, группами, каналами, сквозным шифрованием личных и групповых сообщений, работой в локальной сети, через VPN, mesh и через свой сервер или хостинг.

Лицензия: GNU GPL v3 (см. LICENSE).

## Состав

- `web/index.html` — приложение (одна страница, работает в браузере, в Android WebView и в Electron).
- `web/icon.svg` — иконка.
- `server/libretaw-server.js` — сервер режима «Свой сервер».
- `server/libretaw-host.js` — хост режима «Хостинг» (резервные копии, донат, управление).
- `deploy/bsd/` — нативная установка для FreeBSD, OpenBSD, NetBSD и DragonFly BSD (`docs/Установка-BSD.md`).
- `deploy/no-domain/` — установка сервера на чистый Ubuntu/Debian одной командой, без домена (адрес `ws://IP:8080`).
- `deploy/traefik/` — HTTPS через Traefik для установок с доменом.
- `docs/` — инструкции: поднять свой сервер, хостинг на VPS, описание сервера, доказательство шифрования и «Как создать свой шрифт» (`docs/примеры/make_font.py` — рабочий пример).
- `plugins/` — примеры плагинов.
- `tests/`, `scripts/` — тесты и их запуск.
- `android/` — нативный проект Android Studio (WebView-приложение) и инструкция `android/README-ANDROID.md`.
- `icons/` — иконка: master 1024 px и размеры для Linux (`icons/linux/`).
- `linux/` — обёртка Linux (Electron).

## Запуск приложения в браузере

Откройте `web/index.html` (лучше через локальный сервер: `npx http-server web` или `python3 -m http.server --directory web 8000`). Для камеры и микрофона нужен `http://localhost` или HTTPS.

## Запуск сервера

```bash
LIBRETAW_DATA_KEY="фраза-не-короче-12-символов" LIBRETAW_TOKEN="пароль-подключения" node server/libretaw-server.js
```

Без `LIBRETAW_DATA_KEY` сервер не запускается: данные на диске шифруются обязательно. Подробно: `docs/Инструкция-1-свой-сервер.md`.

Хост для хостинга: `node server/libretaw-host.js`, подробно в `docs/Инструкция-2-хостинг.md`.

## Тесты

```bash
npm test
```

Тесты запускают настоящие серверные процессы и проверяют сквозное шифрование, группы, каналы, резервные копии, донат и остальные функции.

## Сборка для Linux (AppImage)

Команды выполняются **из корня проекта** (папка с этим README.md), а не из `linux/`.

```bash
npm install
npm run linux:build
```

Готовый файл: `dist/libretaw-1.0.0.AppImage`. Сделать его исполняемым: `chmod +x dist/*.AppImage`, затем запуск двойным щелчком или `./dist/libretaw-1.0.0.AppImage`.

Если в папке `linux/` появился свой `package.json`, `node_modules` или `dist`, удалите их: они мешают сборке. Сборка использует только корневой `package.json`.

## Сборка для Android (APK)

Все инструкции, которые нужно установить, и порядок сборки описаны в `android/README-ANDROID.md`. Кратко:

```bash
npm run android:assets   # копирует web/ в android/app/src/main/assets/web
```

Затем откройте папку `android/` в Android Studio и выберите **Build → Build APK(s)**.

## Что сейчас не работает или работает иначе

- Нативная передача по Bluetooth и mesh в приложении ограничена: браузерная и Android-WebView версия использует сеть (WebRTC), а не радиоканал Bluetooth.
- QR-библиотеки подгружаются с cdnjs. В Android и AppImage сканирование QR требует сети; для полностью офлайн-сборки их нужно положить в `web/vendor/` (этого шага пока нет).
- Проверка подлинности ключей (сверка отпечатков) пока не встроена, отпечаток показывается в настройках.
