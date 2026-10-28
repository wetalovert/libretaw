/*
 * libretaw — нативный запускатель для BSD (FreeBSD, OpenBSD, NetBSD, DragonFly BSD).
 * Открывает приложение в отдельном окне браузера (Chromium, Chrome или Firefox).
 * Только POSIX-вызовы, без внешних библиотек: собирается обычным cc.
 *
 * Сборка:  cc -O2 -Wall -DLIBRETAW_PREFIX=\"/usr/local\" -o libretaw libretaw.c
 */
#define _GNU_SOURCE 1
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>

#ifndef LIBRETAW_PREFIX
#define LIBRETAW_PREFIX "/usr/local"
#endif
#define LIBRETAW_VERSION "beta2"

/* Ищет исполняемый файл в PATH. Записывает полный путь в out. */
static int find_in_path(const char *name, char *out, size_t n) {
    const char *path = getenv("PATH");
    if (!path) return 0;
    char *copy = strdup(path);
    if (!copy) return 0;
    char *save = NULL;
    for (char *d = strtok_r(copy, ":", &save); d; d = strtok_r(NULL, ":", &save)) {
        snprintf(out, n, "%s/%s", d, name);
        if (access(out, X_OK) == 0) { free(copy); return 1; }
    }
    free(copy);
    return 0;
}

/* Создаёт папку, если её ещё нет. Ошибку «уже существует» не считаем ошибкой. */
static int make_dir(const char *path) {
    if (mkdir(path, 0700) == 0 || errno == EEXIST) return 0;
    return -1;
}

int main(int argc, char **argv) {
    const char *want = NULL;
    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--version") == 0) { printf("libretaw %s\n", LIBRETAW_VERSION); return 0; }
        if (strcmp(argv[i], "--browser") == 0 && i + 1 < argc) { want = argv[++i]; continue; }
        if (strcmp(argv[i], "-h") == 0 || strcmp(argv[i], "--help") == 0) {
            printf("usage: libretaw [--browser chromium|chrome|firefox] [--version]\n");
            return 0;
        }
        fprintf(stderr, "libretaw: неизвестный параметр: %s\n", argv[i]);
        return 2;
    }

    const char *prefix = getenv("PREFIX");
    if (!prefix || !*prefix) prefix = LIBRETAW_PREFIX;

    char *app = NULL;
    if (asprintf(&app, "%s/share/libretaw/libretaw.html", prefix) < 0) return 1;
    if (access(app, R_OK) != 0) {
        fprintf(stderr, "libretaw: не найдено приложение: %s\n", app);
        fprintf(stderr, "libretaw: переустановите libretaw или задайте PREFIX.\n");
        return 1;
    }

    char *url = NULL;
    if (asprintf(&url, "file://%s", app) < 0) return 1;

    const char *home = getenv("HOME");
    const char *xdg = getenv("XDG_DATA_HOME");
    char *dir = NULL, *profile = NULL;
    if (xdg && *xdg) {
        if (asprintf(&dir, "%s/libretaw", xdg) < 0) return 1;
    } else {
        if (!home || !*home) { fprintf(stderr, "libretaw: не задан HOME\n"); return 1; }
        char *local = NULL, *share = NULL;
        if (asprintf(&local, "%s/.local", home) < 0 || asprintf(&share, "%s/.local/share", home) < 0) return 1;
        make_dir(local);
        make_dir(share);
        if (asprintf(&dir, "%s/libretaw", share) < 0) return 1;
    }
    if (asprintf(&profile, "%s/profile", dir) < 0) return 1;
    if (make_dir(dir) != 0 || make_dir(profile) != 0) {
        fprintf(stderr, "libretaw: не удалось создать папку %s: %s\n", profile, strerror(errno));
        return 1;
    }

    /* Порядок выбора браузера, если --browser не задан. */
    static const char *order[] = { "chromium", "chrome", "firefox", NULL };
    const char *names[4] = { NULL, NULL, NULL, NULL };
    if (want) { names[0] = want; }
    else { for (int i = 0; order[i]; i++) names[i] = order[i]; }

    char found[4096];
    for (int i = 0; names[i]; i++) {
        if (!find_in_path(names[i], found, sizeof found)) continue;
        if (strcmp(names[i], "chromium") == 0 || strcmp(names[i], "chrome") == 0) {
            char *appArg = NULL, *profArg = NULL;
            if (asprintf(&appArg, "--app=%s", url) < 0 || asprintf(&profArg, "--user-data-dir=%s", profile) < 0) return 1;
            char *args[] = { found, appArg, profArg, "--no-first-run", "--class=libretaw", NULL };
            execv(found, args);
        } else if (strcmp(names[i], "firefox") == 0) {
            char *args[] = { found, "--profile", profile, "--new-instance", "--no-remote", url, NULL };
            execv(found, args);
        } else {
            fprintf(stderr, "libretaw: неизвестный браузер: %s\n", names[i]);
            return 2;
        }
        fprintf(stderr, "libretaw: не удалось запустить %s: %s\n", found, strerror(errno));
        return 1;
    }

    fprintf(stderr, "libretaw: не найден браузер. Установите Chromium или Firefox:\n");
    fprintf(stderr, "  FreeBSD: pkg install chromium   OpenBSD: pkg_add chromium\n");
    fprintf(stderr, "  NetBSD: pkgin install chromium  DragonFly: pkg install chromium\n");
    return 1;
}
