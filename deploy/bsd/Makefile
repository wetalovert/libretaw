# Установка libretaw на BSD. Использование:  make && sudo make install
# Переменная PREFIX по умолчанию /usr/local. Пример: make install PREFIX=/usr/pkg (NetBSD pkgsrc)

PREFIX?=/usr/local
DESTDIR?=
ROOT=../..

all:
	@echo "Готово к установке. Выполните: sudo make install"

native:
	sh native/build-on-bsd.sh

install-native: native
	install -m 755 native/dist/*/libretaw $(DESTDIR)$(PREFIX)/bin/libretaw

install:
	install -d $(DESTDIR)$(PREFIX)/bin $(DESTDIR)$(PREFIX)/share/libretaw
	install -m 644 $(ROOT)/web/index.html $(DESTDIR)$(PREFIX)/share/libretaw/libretaw.html
	install -m 644 $(ROOT)/web/icon.svg $(DESTDIR)$(PREFIX)/share/libretaw/icon.svg
	install -m 755 libretaw.sh $(DESTDIR)$(PREFIX)/bin/libretaw
	install -d $(DESTDIR)$(PREFIX)/share/libretaw/server
	install -m 644 $(ROOT)/server/libretaw-server.js $(DESTDIR)$(PREFIX)/share/libretaw/server/
	install -m 644 $(ROOT)/server/libretaw-host.js $(DESTDIR)$(PREFIX)/share/libretaw/server/

uninstall:
	rm -f $(DESTDIR)$(PREFIX)/bin/libretaw
	rm -rf $(DESTDIR)$(PREFIX)/share/libretaw

.PHONY: all install uninstall native install-native
