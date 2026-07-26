# Family Anniversary Album

Закрытый семейный онлайн-альбом с любимыми фотографиями. Сайт открывается по QR,
просмотр альбома закрыт семейным кодом, а загрузка фотографий и управление
папками доступны на отдельной странице `/admin`.

## Хранение на VPS

Приложение хранит данные прямо на сервере:

- `photos.json` - индекс фотографий и подписи;
- `folders.json` - список папок альбома;
- `settings.json` - настройки альбома, включая выбранную обложку;
- `uploads/` - оригиналы загруженных изображений.

Папка данных задается переменной `FAMILY_ALBUM_DATA_DIR`. В Docker Compose она
смонтирована в volume `family_album_data` по пути `/data`.

## Переменные окружения

Создайте `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

Минимальные переменные:

```bash
FAMILY_CODE=your-family-code
ADMIN_CODE=your-admin-password
FAMILY_ALBUM_DATA_DIR=.family-album-data
COOKIE_SECURE=true
```

Оставьте `COOKIE_SECURE=true` для HTTPS через Nginx. Если временно тестируете
сайт напрямую по `http://server-ip:3000`, поставьте `COOKIE_SECURE=false`, иначе
браузер не сохранит cookie входа.

## Локальный запуск

```bash
npm ci
npm run dev
```

Сайт будет доступен на `http://localhost:3000`.

Админ-панель находится на `http://localhost:3000/admin`.

## Проверка сборки

```bash
npm run lint
npm test
```

## Запуск на VPS через Docker Compose

1. Скопируйте проект на сервер.
2. Создайте `.env` рядом с `docker-compose.yml`.
3. Запустите:

```bash
docker compose up -d --build
```

Приложение будет слушать порт `3000`.

## Nginx

Минимальный reverse proxy:

```nginx
server {
    server_name album.example.com;

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

После этого включите HTTPS через Let's Encrypt, например `certbot --nginx`.

## Бэкапы

Бэкапить нужно Docker volume `family_album_data` или папку, указанную в
`FAMILY_ALBUM_DATA_DIR`. Внутри находятся и индекс, и загруженные фото.
