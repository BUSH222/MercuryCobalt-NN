# Запуск и деплой

Все пути ниже — относительно [`MercuryCobalt-NN/`](../../MercuryCobalt-NN),
корня приложения.

## Docker (рекомендуется для демонстрации/продакшна)

Нужен Docker Engine с плагином Compose v2 (или Docker Desktop, режим Linux
containers).

```sh
docker compose up -d --build --wait
```

Открыть `http://localhost:8080`. Локальный Node, Python, установка
зависимостей или файл конфигурации не нужны — первая сборка требует доступа
в интернет для образов и npm-пакетов.

Полезные команды:

```sh
docker compose ps
docker compose logs --tail=100 web
docker stats --no-stream
docker compose down
```

Опционально скопировать `.env.example` в `.env`, чтобы поменять порт, адрес
привязки, тег образа, лимит памяти или объём кучи сборки — по умолчанию всё
работает и без этого файла.

### Обновление после изменений

```sh
git pull --ff-only        # если репозиторий синхронизируется через git
docker compose build --pull
docker compose up -d --wait
```

Сборка отдельно от запуска — если компиляция падает, работающий контейнер
остаётся на месте. Принудительная переустановка зависимостей —
`docker compose build --pull --no-cache`.

### Откат к предыдущему образу

```sh
docker image tag mercury-cobalt:local mercury-cobalt:previous
```

Для отката — `IMAGE_TAG=previous` в `.env`, затем:

```sh
docker compose up -d --no-build --pull never --wait
```

Сохранённые варианты сценариев остаются в браузерном хранилище между
заменами контейнера, пока не меняются схема/хост/порт исходного адреса
(origin) — уже открытые вкладки может понадобиться обновить.

## Локальная разработка

```sh
cd MercuryCobaldFrontend
npm i
npm run dev
```

Требуется Node 24. Этого достаточно для всех фич интерфейса, кроме
«Продвинутой (рельеф, WGS84)» модели Земли.

### С поддержкой продвинутой видимости по рельефу

Дополнительно из корня `MercuryCobalt-NN` (нужен
[uv](https://docs.astral.sh/uv/)):

```sh
uv run uvicorn main:app --reload --port 8000
```

Vite-дев-сервер сам проксирует `/api/*` на `http://127.0.0.1:8000`
(`vite.config.ts`), фронтенду не требуется дополнительная настройка.
Положить `OPENTOPOGRAPHY_API_KEY=...` в `.env` в корне `MercuryCobalt-NN`
(см. `.env.example`, бесплатный ключ — на [opentopography.org](https://opentopography.org/)).
Без ключа бэкенд всё равно поднимается нормально — ошибка появится только
при переключении на продвинутый режим в «Настройках».

### Python-тулинг (для работы с `terrain_api`)

```sh
sh setup.sh     # uv sync + установка pre-commit хуков, удаляет себя после первого запуска
```

Линт/типизация — Ruff и `ty` (см. `pyproject.toml`), запускаются через
pre-commit.

## Полезные npm-скрипты (`MercuryCobaldFrontend`)

| Команда | Назначение |
|---|---|
| `npm run dev` | Дев-сервер Vite с HMR. |
| `npm run build` | `tsc -b` + продакшн-сборка Vite. |
| `npm run lint` | ESLint по всему проекту. |
| `npm run preview` | Локальный предпросмотр собранного `dist/`. |

## Переменные окружения

| Переменная | Где используется | Значение по умолчанию |
|---|---|---|
| `PORT` | Compose, порт хоста для `web` | `8080` |
| `BIND_ADDRESS` | Compose, адрес привязки порта | `0.0.0.0` |
| `IMAGE_TAG` | Compose, тег образов | `local` |
| `MEMORY_LIMIT` | Compose, лимит памяти `web` | `128m` |
| `TERRAIN_MEMORY_LIMIT` | Compose, лимит памяти `terrain` | `512m` |
| `NODE_BUILD_HEAP_MB` | Куча Node при сборке фронтенда | `1024` |
| `OPENTOPOGRAPHY_API_KEY` | `terrain_api`, только для `/api/terrain` | не задан — фича выключена с явной ошибкой |

Переменные Vite для будущих фич должны прокидываться на этапе сборки и
считаться публичной конфигурацией браузера, никогда не секретом.

## Ресурсы и изоляция контейнеров

- `web`: один Nginx-воркер, потолок памяти контейнера 128 МБ, `tmpfs` 16 МБ,
  read-only корневая файловая система, non-root пользователь, отброшенные
  Linux capabilities, запрет повышения привилегий. `/healthz` — health-check.
- `terrain`: тот же уровень изоляции, лимит памяти по умолчанию 512 МБ; не
  имеет собственного порта, доступного снаружи — реализация только через
  `nginx`-проксирование `/api/` из `web`. Дисковый кэш — именованный volume
  `terrain_cache`, переживает пересоздание контейнера.
- Сборка требует заметно больше памяти, чем раздача: ориентир — около 2 ГБ на
  хосте сборки. `NODE_BUILD_HEAP_MB` ограничивает только кучу JavaScript, не
  общую память сборки.

Подробности деплоя, включая CI-проверки (health, SPA-роутинг, кэш-заголовки),
описаны построчно в
[`MercuryCobalt-NN/README.md`](../../MercuryCobalt-NN/README.md).
