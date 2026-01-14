# Инструкция по установке и запуску

## Предварительные требования

- Python 3.10+
- pip
- PostgreSQL (опционально, для production) или SQLite (для разработки)

## Установка

1. **Клонировать репозиторий и перейти в директорию:**
```bash
cd telegram_leaderboard
```

2. **Создать виртуальное окружение:**
```bash
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate  # Windows
```

3. **Установить зависимости:**
```bash
pip install -r requirements.txt
```

4. **Настроить переменные окружения:**
```bash
cp .env.example .env
# Отредактировать .env и указать:
# - BOT_TOKEN (токен Telegram бота)
# - TELEGRAM_BOT_USERNAME (username бота)
# - DATABASE_URL (для PostgreSQL: postgresql+asyncpg://user:password@localhost/dbname)
```

5. **Создать миграции и применить их:**
```bash
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

## Запуск

### Backend (FastAPI)

```bash
python run.py
# или
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

API будет доступен по адресу: `http://localhost:8000`

### Frontend

Для разработки можно использовать простой HTTP сервер:

```bash
cd frontend
python3 -m http.server 8001
```

Для production используйте nginx или другой веб-сервер для раздачи статических файлов.

### Настройка Telegram Bot

1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Получите токен бота
3. Настройте Mini App:
   - В BotFather выберите вашего бота
   - Выберите "Bot Settings" -> "Menu Button"
   - Укажите текст кнопки и URL вашего Mini App

4. Настройте Webhook для обработки платежей:
   - URL: `https://your-domain.com/webhook/telegram`
   - Используйте метод `setWebhook` Telegram Bot API

## Структура проекта

```
telegram_leaderboard/
├── backend/              # Backend код
│   ├── main.py          # FastAPI приложение
│   ├── config.py        # Конфигурация
│   ├── database.py      # Настройка БД
│   ├── models.py        # SQLAlchemy модели
│   ├── bot.py           # Обработчик бота (платежи)
│   ├── routers/         # API endpoints
│   ├── services/        # Бизнес-логика
│   └── telegram_auth.py # Валидация initData
├── frontend/            # Frontend (Mini App)
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── alembic/             # Миграции БД
└── requirements.txt     # Зависимости Python
```

## API Endpoints

- `GET /health` - Проверка здоровья сервиса
- `GET /me` - Получить данные пользователя и статистику
- `GET /leaderboard/all-time` - Лидерборд за всё время
- `GET /leaderboard/week` - Лидерборд за неделю
- `GET /leaderboard/referrals` - Лидерборд рефералов
- `GET /transactions` - История транзакций пользователя
- `POST /payments/create-invoice` - Создать инвойс для оплаты
- `POST /webhook/telegram` - Webhook для обработки обновлений от Telegram

Все endpoints (кроме `/health` и `/webhook/telegram`) требуют заголовок `X-Init-Data` с валидными данными от Telegram Web App.

## Настройка курса Stars → Тоны

По умолчанию используется курс 1:1. Для настройки внешнего источника:

1. Укажите `RATE_PROVIDER_URL` в `.env`
2. API должен возвращать JSON с полем `rate` (или `tons_per_star`, или `value`)
3. Курс кешируется на время, указанное в `RATE_CACHE_TTL_MINUTES`

## Тестирование

Для тестирования без реального Telegram бота можно использовать:

1. Моки для `validate_telegram_init_data` в тестах
2. Прямые запросы к API с заголовком `X-Init-Data` (для разработки)

## Production

1. Используйте PostgreSQL вместо SQLite
2. Настройте правильные CORS origins (только Telegram домены)
3. Используйте HTTPS для Mini App
4. Настройте логирование
5. Используйте переменные окружения для секретов
6. Настройте мониторинг и алерты

