# Traefik для libretaw

Файлы для запуска Traefik перед сервером или хостом libretaw. Новые установки с доменом ставятся через Traefik. Без домена используйте `deploy/no-domain/`.

Перед запуском:
1. В `traefik.yml` замените `you@example.com` на свою почту.
2. В `dynamic.yml` замените `chat.example.com` на свой домен (A-запись должна указывать на этот сервер).
3. Создайте папку для сертификатов и закройте доступ к файлу ключей:
   ```bash
   mkdir -p letsencrypt && touch letsencrypt/acme.json && chmod 600 letsencrypt/acme.json
   ```
4. Запустите: `docker compose up -d`.

Проверка: `curl -sI https://chat.example.com/host/health` должен вернуть ответ 200.
