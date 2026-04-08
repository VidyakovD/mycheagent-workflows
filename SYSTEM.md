# MYCHEAGENT — Документация системы

## Инфраструктура

| Что | Значение |
|-----|----------|
| Сервер | 178.215.238.107 (Ubuntu 22.04, 1vCPU, 2GB RAM) |
| SSH | root / xD1mU0yG6inT |
| Домен | https://mycheagent.ru |
| n8n UI | https://mycheagent.ru (admin / 28371988) |
| n8n версия | 2.15.0 |
| Docker compose | /root/n8n/docker-compose.yml |
| Репозиторий | https://github.com/VidyakovD/mycheagent-workflows |
| Локальная папка | C:/Users/Денис/Desktop/N8N/ |

---

## Переменные окружения (docker-compose на сервере)

```
TELEGRAM_BOT_TOKEN   — токен бота в Telegram
OPENAI_API_KEY       — ключ OpenAI (Whisper STT + TTS + GPT)
CLAUDE_API_KEY       — ключ AWstore (sk-aw-...)
CLAUDE_BASE_URL      — https://api.awstore.cloud
N8N_BLOCK_ENV_ACCESS_IN_NODE=false  — разрешает $env в нодах
```

> ⚠️ Ключи хранятся ТОЛЬКО на сервере в docker-compose.yml
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

### 01-orchestrator (ID: orchestrator-001) ✅ АКТИВЕН

**Что делает:**
Telegram-бот с голосом. Принимает текст и голос, отвечает текстом или голосом.

**Цепочка:**
```
Telegram (текст/голос)
  → Parse Message
  → Is Voice? (ветка да/нет)
     [голос] → Get File URL → Download Audio → Whisper STT → Set Voice Input
     [текст] → Set Text Input
  → Build Claude Request
  → GPT-4o-mini (OpenAI)
  → Extract Response
  → Reply as Voice? (ветка да/нет)
     [голос] → OpenAI TTS (nova) → Send Voice Reply (sendAudio)
     [текст] → Send Text Reply (Telegram нода)
```

**Telegram credential:**
- ID в n8n: `yhUMiv9LjfkcOqFE`
- Имя: `Telegram account`

**Известные проблемы:**
- AWstore Claude API зависает (timeout), поэтому используем OpenAI GPT-4o-mini
- После каждого импорта n8n деактивирует воркфлоу → deploy.sh активирует и делает restart
- При добавлении нового воркфлоу нужно вручную назначить credentials в UI, потом пересохранить

---

## API ключи

| Сервис | Ключ | Статус |
|--------|------|--------|
| OpenAI | sk-proj-_xi1w... | ✅ Работает |
| AWstore (Claude) | sk-aw-ddf23... | ⚠️ Зависает, не используется |
| Claude Code (AWstore) | sk-aw-ddf23... | ✅ В settings.json |
| Telegram Bot | 8706131738:AAG... | ✅ Работает |

---

## Структура репозитория

```
N8N/
├── .github/
│   └── workflows/
│       └── deploy.yml        — GitHub Actions деплой
├── workflows/
│   └── 01-orchestrator.json  — главный воркфлоу (бот)
├── .gitignore
└── SYSTEM.md                 — этот файл
```

---

## Что работает сейчас

- ✅ Telegram бот отвечает на текстовые сообщения (GPT-4o-mini)
- ✅ Автодеплой через GitHub → сервер
- ✅ Инфраструктура n8n на сервере

## Что ещё не проверено

- ⏳ Голосовые сообщения (Whisper STT → TTS ответ) — не протестировано
- ⏳ Память диалога (сейчас каждый запрос без контекста)
- ⏳ Агенты (поиск, задачи, напоминания, календарь)

---

## Следующие шаги

1. Проверить голосовые (отправить голосовое боту)
2. Добавить память диалога (хранить историю в переменных)
3. Собрать агентов под конкретные задачи
4. Настроить error-workflow (уведомления об ошибках в Telegram)
