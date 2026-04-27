# Кампания №1 — Видеомонтаж в Premiere Pro и After Effects

## Бриф

| Поле | Значение |
|---|---|
| Тип | Единая перформанс-кампания (Мастер кампаний / UnifiedCampaign в API) |
| Продукт | «Видеомонтаж с нуля в Premiere Pro и After Effects» |
| Цена курса | 4 900 ₽ |
| URL посадки | https://studiache.ru/course/cmnt3mwih0001qxuhlih5bvws |
| Регион | Россия (вся) |
| Дневной бюджет | 300 ₽ |
| Стратегия ставок | AVERAGE_CPC (среднее списание ~40-50₽) |
| Расписание | Круглосуточно |
| Стартовый статус | SUSPENDED (не запускать без подтверждения владельца) |

## Заголовки (до 56 символов)

1. Видеомонтаж с нуля — Premiere Pro и After Effects
2. 18 уроков по монтажу — доступ навсегда
3. Курс по Premiere Pro и After Effects
4. Премиум-курс по видеомонтажу — 4 900 ₽
5. Научись монтировать видео и анимацию

## Описания (до 81 символа)

1. 18 уроков. Premiere Pro, After Effects, цветокор, звук, эффекты. Доступ навсегда.
2. Без подписок. Оплата раз и навсегда. Учись в своём темпе. Старт сегодня.
3. Полный курс по видеомонтажу: от первого таймлайна до экспорта 4K и анимации.

## Минус-слова

```
бесплатно
скачать
торрент
crack
кряк
репак
как удалить
плохие отзывы
развод
мошенники
реферат
курсовая
википедия
форум
vk.com
youtube.com
```

## Тематические аудитории (для РСЯ)

- Образование онлайн
- Видеомонтаж и постпродакшн
- Творчество и хобби
- IT и компьютеры
- Маркетинг и SMM

## JSON-шаблон для campaigns.add (Direct API v5)

> Денежные суммы в Direct API передаются в **миллионных долях** (1 ₽ = 1 000 000 единиц).
> Точная схема UnifiedCampaign согласуется при первом dry-run после одобрения API.

```json
{
  "Name": "Видеомонтаж — PP и AE (тест 1)",
  "StartDate": "AUTO",
  "DailyBudget": {
    "Amount": 300000000,
    "Mode": "STANDARD"
  },
  "ClientInfo": "Студия ЧЕ — videoyak",
  "Notification": null,
  "UnifiedCampaign": {
    "BiddingStrategy": {
      "Search": {
        "BiddingStrategyType": "AVERAGE_CPC",
        "AverageCpc": { "AverageCpc": 50000000 }
      },
      "Network": {
        "BiddingStrategyType": "AVERAGE_CPC",
        "AverageCpc": { "AverageCpc": 30000000 }
      }
    },
    "AttributionModel": "LYDC",
    "ContentLanguage": "RU"
  }
}
```

## Что нужно для запуска (после одобрения API)

1. На сервере env: `YANDEX_DIRECT_TOKEN`, `YANDEX_DIRECT_LOGIN=vidyakovd88`, `YANDEX_DIRECT_SANDBOX=0` (или 1 для теста).
2. Активировать воркфлоу `19-yandex-direct.json`.
3. POST на `https://mycheagent.ru/webhook/yadirect`:
   ```json
   {
     "action": "campaigns.add",
     "campaigns": [<этот JSON>]
   }
   ```
4. После создания — `action: "ads.add"` с заголовками/описаниями выше (объявления привязываются к группе через CampaignId).
5. После модерации — отдельным подтверждением `action: "campaigns.resume", "ids": [<id>]`.
6. Пополнить баланс минимум на 2 000 ₽ (300₽/день × 7 дней).

## Что мониторим

- 7 дней — даём накопить статистику.
- Целевой CTR ≥ 0.7% (Поиск) / ≥ 0.15% (РСЯ).
- Целевой CPC ≤ 50 ₽.
- Если за 7 дней нет ни одной заявки — стоп, разбираем причину.
