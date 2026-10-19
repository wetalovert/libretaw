# libretaw

Личный мессенджер с чатами, группами, каналами, сквозным шифрованием личных и групповых сообщений, работой в локальной сети, через VPN, mesh и через свой сервер или хостинг.

Лицензия: GNU GPL v3 (см. LICENSE).

## Состав

- `web/index.html` — приложение (одна страница, работает в браузере, в Android WebView и в Electron).
- `web/icon.svg` — иконка.
- `server/libretaw-server.js` — сервер режима «Свой сервер».
- `server/libretaw-host.js` — хост режима «Хостинг» (резервные копии, донат, управление).
- `docs/` — инструкции: поднять свой сервер, хостинг на VPS, описание сервера и доказательство шифрования.
- `plugins/` — примеры плагинов.
- `tests/`, `scripts/` — тесты и их запуск.
- `android/` — настройки сборки Android (Capacitor) и иконки (`android/res/`).
- `icons/` — иконка: master 1024 px и размеры для Linux (`icons/linux/hicolor/`).
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

## Сборка для Linux

Нужны Node.js 18+ и системные библиотеки Electron.

```bash
npm run linux:deps
npm run linux:build
```

Иконки Linux берутся из `icons/linux/hicolor/`. Результат появится в папке `dist/`: AppImage и deb. Сборка выполняется на вашей машине; в этом проекте готовые бинарники не поставляются.

## Сборка для Android

Нужны Node.js 18+, Java 17 и Android Studio с Android SDK.

```bash
npm run android:init          # один раз: добавляет проект Android
# добавьте разрешения из android/AndroidManifest-permissions.txt в AndroidManifest.xml
npm run android:sync          # после изменений в web/
npm run android:open          # откроет проект в Android Studio, дальше собирайте APK/AAB там
```

Готовый APK собирается в Android Studio (Build → Build APK). Подписывание релизной версии выполняется вашим ключом.

## Что сейчас не работает или работает иначе

- Нативная передача по Bluetooth и mesh в приложении ограничена: браузерная и Android-WebView версия использует сеть (WebRTC), а не радиоканал Bluetooth.
- В Android-WebView и Electron иконки, QR-библиотеки и часть шрифтов подгружаются с cdnjs; для полностью офлайн-сборки их нужно положить в `web/vendor/` (этого шага в проекте пока нет).
- Шифрование групп и личных сообщений есть; каналы, медиа-файлы и метаданные профиля пока не шифруются (см. `docs/libretaw-server.md`).
- Проверка подлинности ключей (сверка отпечатков) пока не встроена, отпечаток показывается в настройках.
