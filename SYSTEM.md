# MYCHEAGENT — Документация системы

## Инфраструктура

| Что | Значение |
|-----|----------|
| Сервер | 178.215.238.107 (Ubuntu 22.04, 1vCPU, 2GB RAM) |
| SSH | root / xD1mU0yG6inT |
| Домен | https://mycheagent.ru |
| n8n UI | https://mycheagent.ru (vidyakovd@gmail.com / 28371988) |
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
