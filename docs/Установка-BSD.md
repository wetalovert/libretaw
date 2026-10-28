# libretaw на BSD (FreeBSD, OpenBSD, NetBSD, DragonFly BSD)

Для BSD сделана **нативная установка** без Electron и без сборки: программа `libretaw` открывает приложение в отдельном окне браузера (Chromium или Firefox). Сам интерфейс — тот же файл, что и в браузере и на других платформах. Сервер ставится отдельно, как служба.

> Честно о границах: BSD-версия — это окно браузера с иконкой и отдельным профилем, а не самостоятельный бинарник. Установка проверялась на Linux с подставными браузерами (проверка выбора браузера и установки). Сама установка на реальной BSD-системе пока не проверена.

## 1. Что нужно
- Браузер: Chromium или Firefox.
- Node.js 18 или новее — только если вы хотите запускать свой сервер на этой же машине.
- Исходники libretaw (папка `libretaw-src`) или архив `libretaw-src.zip`.

## 2. Установка браузера и Node.js

| Система | Браузер | Node.js |
|---|---|---|
| FreeBSD | `pkg install chromium` (или `firefox`) | `pkg install node20` |
| OpenBSD | `pkg_add chromium` (или `firefox`) | `pkg_add node` |
| NetBSD | `pkgin install chromium` (или `firefox`) | `pkgin install nodejs` |
| DragonFly BSD | `pkg install chromium` (или `firefox`) | `pkg install node` |

Имена пакетов могут отличаться в вашей версии системы: проверьте `pkg search chromium` (или `pkgin search`, `pkg_info`).

## 3. Установка libretaw
Из папки `libretaw-src`:

```sh
cd deploy/bsd
make
sudo make install            # FreeBSD, OpenBSD, DragonFly
# NetBSD (pkgsrc по умолчанию в /usr/pkg):
sudo make install PREFIX=/usr/pkg
```

Команда установит:
- `libretaw` в `$PREFIX/bin`;
- приложение в `$PREFIX/share/libretaw/libretaw.html`;
- серверные файлы в `$PREFIX/share/libretaw/server/`.


## Самостоятельные бинарники (без скриптов)

Лаунчер можно собрать в настоящую программу, которая не требует установки Python или скриптов. Сборка выполняется **на той системе, для которой нужен файл**: кросс-сборки под BSD здесь не используются.

```sh
cd libretaw-src/deploy/bsd/native
sh build-on-bsd.sh            # лаунчер: dist/<система>-<архитектура>/libretaw
sh build-on-bsd.sh server     # + сервер в одном файле (нужен Node.js 20+ и сеть один раз, для postject)
sudo install -m 755 dist/*/libretaw /usr/local/bin/libretaw
```

- **Лаунчер** (`libretaw.c`) — только POSIX-вызовы, собирается обычным `cc`.
- **Сервер** (`libretaw-server`) — Node.js Single Executable Application: одна копия node с вшитым сервером. Работает без установленного Node.js на целевой машине.

**Статус:** файлы и скрипты написаны и проверены частично. Лаунчер собран и проверен на Linux с подставными браузерами (поведение и сообщения об ошибках). Сборка на настоящих FreeBSD, OpenBSD, NetBSD и DragonFly BSD не выполнялась: в этой среде их нет, а загрузить postject из сети здесь было нельзя. Поэтому сервер в одном файле пока не проверен ни на одной BSD-системе.

## 4. Запуск приложения
```sh
libretaw                      # выбирает Chromium, затем Chrome, затем Firefox
libretaw --browser firefox    # явный выбор браузера
libretaw --version
```

Приложение открывается в отдельном окне. Данные хранятся в `~/.local/share/libretaw/profile` (отдельный профиль браузера).

## 5. Свой сервер на BSD (по желанию)
Сервер работает под Node.js и не зависит от системы.

**FreeBSD:** создайте пользователя `libretaw`, файл настроек `/usr/local/etc/libretaw.env` (как в Инструкции 1: `LIBRETAW_DATA_KEY`, `LIBRETAW_TOKEN`, `PORT`, `HOST`, `DATA_DIR`), затем:

```sh
sudo install -m 755 deploy/bsd/freebsd/libretaw_server /usr/local/etc/rc.d/libretaw_server
sudo sysrc libretaw_server_enable=YES
sudo service libretaw_server start
```

**OpenBSD, NetBSD, DragonFly BSD:** запускайте сервер вручную или через систему запуска вашей ОС, команда та же, что и в Инструкции 1:

```sh
set -a; . /etc/libretaw.env; set +a
node /usr/local/share/libretaw/server/libretaw-server.js
```

Путь `/usr/local/share` замените на ваш `PREFIX` (для NetBSD это `/usr/pkg/share`).

Для домена с HTTPS используйте Traefik или любой прокси на BSD (см. `deploy/traefik/`), либо работайте без домена по VPN.

## 6. Удаление
```sh
sudo make uninstall           # из папки deploy/bsd, с тем же PREFIX
```

## Что не входит в BSD-версию
- Звонки работают, если браузер поддерживает WebRTC (Chromium и Firefox поддерживают). Камера и микрофон запрашиваются браузером.
- Уведомления в фоне: окно должно быть открыто (как и в браузере).
- Bluetooth и mesh в BSD-версии не проверялись.
