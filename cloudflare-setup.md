# Настройка Cloudflare Tunnel для Frontend

Этот гайд поможет настроить проксирование локального frontend через Cloudflare Tunnel.

## Вариант 1: Быстрый туннель (для тестирования)

### Установка cloudflared

**macOS:**
```bash
brew install cloudflare/cloudflare/cloudflared
```

**Linux:**
```bash
# Download from releases
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
```

**Windows:**
Скачайте с [GitHub Releases](https://github.com/cloudflare/cloudflared/releases)

### Запуск туннеля

1. Убедитесь, что frontend запущен:
   ```bash
   cd frontend && python3 -m http.server 8001
   ```

2. В другом терминале запустите туннель:
   ```bash
   ./cloudflare-tunnel.sh
   # или
   cloudflared tunnel --url http://localhost:8001
   ```

3. Вы получите публичный URL вида:
   ```
   https://xxxxx-xxxxx-xxxxx.trycloudflare.com
   ```

4. Используйте этот URL в настройках Telegram Mini App

### Автоматический запуск

Добавьте в `start.sh` запуск туннеля (опционально).

## Вариант 2: Постоянный туннель (для production)

### Создание именованного туннеля

1. Авторизуйтесь в Cloudflare:
   ```bash
   cloudflared tunnel login
   ```

2. Создайте туннель:
   ```bash
   cloudflared tunnel create telegram-leaderboard
   ```

3. Создайте конфигурационный файл `~/.cloudflared/config.yml`:
   ```yaml
   tunnel: <tunnel-id>
   credentials-file: /Users/arkhiptsev/.cloudflared/<tunnel-id>.json

   ingress:
     - hostname: your-domain.com
       service: http://localhost:8001
     - service: http_status:404
   ```

4. Запустите туннель:
   ```bash
   cloudflared tunnel run telegram-leaderboard
   ```

5. Настройте DNS в Cloudflare Dashboard:
   - Добавьте CNAME запись: `your-domain.com` → `<tunnel-id>.cfargotunnel.com`

### Использование с собственным доменом

1. В Cloudflare Dashboard:
   - Добавьте ваш домен
   - Настройте DNS записи

2. В конфигурации туннеля укажите ваш домен

3. Используйте `https://your-domain.com` в настройках Mini App

## Обновление frontend для работы с туннелем

Если backend тоже нужно проксировать:

1. Создайте два туннеля или используйте ingress rules:
   ```yaml
   ingress:
     - hostname: api.your-domain.com
       service: http://localhost:8000
     - hostname: your-domain.com
       service: http://localhost:8001
     - service: http_status:404
   ```

2. Обновите `frontend/app.js`:
   ```javascript
   const API_BASE_URL = 'https://api.your-domain.com';
   ```

## Проверка работы

1. Откройте URL туннеля в браузере
2. Проверьте, что frontend загружается
3. Проверьте консоль браузера на ошибки CORS (если есть)

## Остановка туннеля

Нажмите `Ctrl+C` в терминале, где запущен туннель.

## Troubleshooting

### Проблема: CORS ошибки

Если backend и frontend на разных доменах, нужно настроить CORS в backend:

```python
# backend/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-domain.com", "https://*.trycloudflare.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Проблема: Туннель не запускается

- Проверьте, что frontend запущен на порту 8001
- Проверьте логи: `cloudflared tunnel --loglevel debug`

### Проблема: URL меняется при перезапуске

Для постоянного URL используйте именованный туннель (Вариант 2).

