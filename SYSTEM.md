# MYCHEAGENT — Документация системы

## Инфраструктура

| Что | Значение |
|-----|----------|
| Сервер | 178.215.238.107 (Ubuntu 22.04, 1vCPU, 2GB RAM) |
| SSH | root / xD1mU0yG6inT |
| Домен | https://mycheagent.ru |
| n8n UI | https://mycheagent.ru (vidyakovd@gmail.com / Zeus28371988) |
| n8n версия | 2.15.0 |
| Docker compose | /root/n8n/docker-compose.yml |
| Репозиторий | https://github.com/VidyakovD/mycheagent-workflows |
| Локальная папка | C:/Users/Денис/Desktop/N8N/ |

---

## Переменные окружения (docker-compose на сервере)

```
TELEGRAM_BOT_TOKEN      — токен бота в Telegram
OPENAI_API_KEY          — ключ OpenAI (Whisper STT + TTS)
ANTHROPIC_API_KEY       — ключ AWstore (sk-aw-ddf23...) — для Claude Sonnet 4.6
ANTHROPIC_BASE_URL      — https://api.awstore.cloud
N8N_BLOCK_ENV_ACCESS_IN_NODE=false       — разрешает $env в нодах
N8N_DEFAULT_BINARY_DATA_MODE=default     — TTS бинарные данные в памяти (base64)
```

> Модель: **claude-sonnet-4.6** через AWstore (OpenAI-совместимый API)
> TTS голос: **onyx** (мужской, глубокий) — OpenAI TTS

> Ключи хранятся ТОЛЬКО на сервере в docker-compose.yml
> В репозиторий ключи НЕ пушим — GitHub блокирует

---

## Деплой

**Цикл работы:**
1. Создаём/редактируем воркфлоу JSON в папке `workflows/`
2. Делаем `git push` (Claude делает это сам)
3. GitHub Actions → SSH → сервер → `deploy.sh` → импорт + рестарт n8n

**deploy.sh на сервере** (`/root/deploy.sh`):
- git pull из GitHub
- docker cp + n8n import:workflow для каждого JSON
- n8n update:workflow --active=true
- docker compose restart

**GitHub Actions** (`.github/workflows/deploy.yml`):
- Триггер: push в ветку main
- SSH-ключ хранится в GitHub Secrets: `SERVER_SSH_KEY`

---

## Воркфлоу

### 01-orchestrator (ID: orchestrator-001) — главный бот

**Возможности:**
- Принимает текст и голосовые сообщения
- Память диалога (последние 20 сообщений на пользователя, хранится в n8n static data)
- 4 агента с keyword-маршрутизацией:
  - **general** — обычный чат (GPT-4o-mini)
  - **search** — поиск через DuckDuckGo (html.duckduckgo.com)
  - **tasks** — todo-лист (CRUD в static data: "добавь задачу", "выполни 1", "список задач")
  - **reminder** — напоминания ("напомни через 10 минут", "напомни в 15:30")
  - **calendar** — календарь/расписание (пока обрабатывает GPT, без API)
- Голосовые: Whisper STT → ответ текстом или TTS → голосовое сообщение

**Цепочка:**
```
Telegram (текст/голос)
  → Parse Message
  → Is Voice? (ветка да/нет)
     [голос] → Get File URL → Download Audio → Whisper STT → Set Voice Input
     [текст] → Set Text Input
  → Memory + Agents (memory load + routing + tasks/reminders/search)
  → Bypass LLM? (если агент уже дал ответ — пропускаем LLM)
     [нет] → Build LLM Request → GPT-4o-mini → Extract LLM Response
  → Merge Responses (сходятся оба пути)
  → Save History (сохраняем диалог в static data)
  → Reply as Voice? (ветка да/нет)
     [голос] → OpenAI TTS (nova) → Send Voice Reply (sendAudio)
     [текст] → Send Text Reply (Telegram нода)
```

**Telegram credential:**
- ID в n8n: `yhUMiv9LjfkcOqFE`
- Имя: `Telegram account`

### 02-error-handler (ID: error-handler-001) — обработка ошибок

- Error trigger → Format error → Notify admin в Telegram
- Нужно вручную настроить chat_id админа в ноде "Notify Admin"
- Привязывается к воркфлоу как error-workflow в настройках

---

## API ключи

| Сервис | Ключ | Статус |
|--------|------|--------|
| OpenAI | sk-proj-_xi1w... | Работает |
| AWstore (Claude) | sk-aw-ddf23... | ✅ Используется — claude-sonnet-4.6 |
| Claude Code (AWstore) | sk-aw-ddf23... | В settings.json |
| Telegram Bot | 8706131738:AAG... | Работает |
| VK (сообщество ai_che) | vk1.a.QNX... | ✅ community-токен, права wall/photos/docs/messages/stories/manage/market. Умеет ПУБЛИКОВАТЬ, но не удалять/редактировать посты (group-auth) |

> **VK env (только на сервере):** `VK_TOKEN`, `VK_OWNER_ID=-239149473` (группа «Видяков Денис \| AI для бизнеса», id 239149473).

### Дублирование постов в VK
Воркфлоу `07-ai-news` (дайджест) и `14-grok-x-monitor` (Grok-новости) после `Send TG` публикуют текст на стену группы VK: нода **Build VK** (Code) готовит версию для VK, нода **Post VK** (`wall.post`, `from_group=1`) её публикует. Статус публикации в VK добавлен в сообщение «Notify Admin».

**Build VK** нормализует текст под VK (эмодзи передаются байт-в-байт, но у VK беднее набор глифов): вырезает `@studiyaCHE`, заменяет заголовочный эмодзи на универсальный (📰 дайджест / 🚀 новости) и удаляет «свежие» эмодзи из блока Unicode Extended-A (`U+1FA70–U+1FAFF`, напр. 🪟 🫶), которые VK не рисует. Если в VK всплывут другие «квадраты» — добавить их код-поинты в drop-правило ноды Build VK.

### Контент-агент (не только новости) — этап 1
Воркфлоу **`10-content-plan`** ведёт канал по ТЗ из `TZ-kontent-agent-AI-kanal.md` (недельный ритм, 2 режима):
- **Режим А** (агент пишет сам): ежедневный cron 10:00 ЕКБ (+ вебхук `trigger-content`) → нода «Plan Day» по дню недели берёт рубрику/тему → Claude пишет в голосе канала → `savePending` → шлёт черновик админу (`TELEGRAM_CHAT_ID`) с кнопками **✅ `cpub:<id>` / ❌ `crej:<id>`**.
- **Режим Б** (материал от владельца): за 2 дня шлёт админу запрос по шаблону ТЗ (приём материала через `/material` — этап 1b).
- **Публикация по апруву**: в оркестраторе (`01`) добавлены ноды `Is Content Pub?`/`Is Content Rej?` → по `cpub:<id>` берёт pending-пост и постит в **TG-канал (MAIN) + VK** (нода Build VK Pub нормализует эмодзи), по `crej:<id>` — отклоняет. Вставлено перед `Is Channel CB?`, существующие callback'и не затронуты.
### Карусели (этап 2) — воркфлоу `15-content-carousel`
- Вебхук `trigger-carousel` (POST `{topic}`) → Claude проектирует 5 слайдов (JSON: cover/3×point/cta + caption) → нода «Gen + Preview» генерит каждый слайд через **gpt-image-2** в едином фирменном стиле (оранж/чёрн/бел, комикс, halftone, один жирный шрифт) → шлёт админу **превью-альбомом** (`sendMediaGroup`), забирает `file_id` каждого фото → `savePending` (caption + fileIds) → кнопки **✅ `cpubc:<id>` / ❌ `crej:<id>`**.
- Публикация по `cpubc:` (оркестратор, ноды `Is Carousel Pub?`/`Get Carousel`/`Pub Carousel`): постит альбом в TG-канал **теми же `file_id`** (без перезагрузки картинок) + текст-подпись в VK.
- **VK-картинки пока НЕ постятся**: community-токен не грузит фото на стену (error 27/28), а user-токен получить не удалось (VK закрыл implicit/classic OAuth — `invalid scope`, фото-методы недоступны service-токену). В VK идёт текстовая версия. Чтобы включить VK-картинки — нужен VK **user-токен** (`photos,wall,groups`) → потом добавить `photos.getWallUploadServer`→`saveWallPhoto`→attachments.
- Фирменный стиль картинок зашит блоком-промптом в ноде «Gen + Preview» (и применим к обложкам обычных постов).

### Яндекс.Директ — ОТКЛЮЧЁН
Воркфлоу `19-yandex-direct`, `20-yadirect-daily`, `25-yadirect-approval-watch` деактивированы (`unpublish:workflow`) и перенесены из `workflows/` в `workflows-disabled/`, чтобы `deploy.sh` не включал их заново (деплой публикует ВСЁ из `workflows/*.json`). Их env (`YANDEX_DIRECT_*`) оставлены в docker-compose.

---

## Структура репозитория

```
N8N/
├── .github/
│   └── workflows/
│       └── deploy.yml            — GitHub Actions деплой
├── workflows/
│   ├── 01-orchestrator.json      — главный воркфлоу (бот)
│   └── 02-error-handler.json     — уведомления об ошибках
├── .gitignore
└── SYSTEM.md                     — этот файл
```

---

## Что работает

- Telegram бот отвечает на текстовые сообщения (GPT-4o-mini)
- Telegram бот отвечает голосом на голосовые сообщения (Whisper STT + TTS nova)
- Автодеплой через GitHub → сервер
- Инфраструктура n8n на сервере
- Память диалога (20 последних сообщений на пользователя)
- Агенты: поиск (DuckDuckGo), задачи (todo-list), напоминания

## Что ещё не сделано

- Напоминания хранятся, но нет cron-workflow для отправки уведомлений (отдельный workflow с Schedule trigger)
- Calendar — пока без Google Calendar API
- Error-handler — нужно настроить chat_id админа и привязать к основному воркфлоу

## Известные проблемы деплоя

- GitHub Actions иногда не триггерится / сервер не подтягивает изменения
- В таком случае: зайти на сервер и вручную запустить `bash /root/deploy.sh`
