Дополнение к ТЗ: сбор данных пользователя и локальные транзакции

2.4 Данные пользователя (сбор и актуализация)

2.4.1 Что сохраняем (минимум)

Из Telegram (через initData / user object, плюс при необходимости запросы со стороны бота):
	•	tg_id (обязательно)
	•	username (nullable)
	•	first_name (nullable)
	•	last_name (nullable)
	•	language_code (nullable)
	•	is_premium (nullable/optional, если доступно)
	•	photo_url / avatar_url (nullable; если доступно из SDK/бота)
	•	created_at, updated_at, last_seen_at

Важно: Mini App не всегда отдаёт прямую ссылку на аватар. Поэтому делаем хранение так:
	•	если есть photo_url — сохраняем;
	•	если нет — сохраняем null, а в UI показываем заглушку/инициалы.

2.4.2 Когда обновляем профиль
	•	При каждом открытии Mini App (endpoint /me) — обновлять username/имя/фамилию/язык, если изменились.
	•	Аватар/фото — обновлять:
	•	либо по TTL (например, раз в 24 часа),
	•	либо при явном наличии свежего url.

⸻

7.5 Локальное хранение транзакций (обязательное требование)

7.5.1 Источник истины

Лидерборды, суммы донатов, реферальные начисления считаются только по локальным записям в БД:
	•	таблица payments (платежи Stars)
	•	таблица donations (начисления тонов/донаты)

Запрещено строить лидерборды исключительно на данных из блокчейна/внешних систем.
Если внешние источники есть — они могут использоваться как:
	•	дополнительная проверка,
	•	отдельная аналитика,
	•	импорт/синхронизация (опционально),
но не как единственная база учёта.

7.5.2 Какие транзакции пишем

Фиксируем все стадии:
	•	created (инвойс создан)
	•	paid (успешно оплачен)
	•	failed/canceled/expired (если применимо)
Плюс хранить:
	•	invoice_id / telegram_payment_charge_id (уникальный)
	•	tg_id
	•	stars_amount
	•	rate_used (курс tons_per_star на момент оплаты)
	•	tons_amount
	•	payload/context (preset_id, source_screen и т.п.)
	•	timestamps: created_at, paid_at

7.5.3 Идемпотентность и аудит
	•	Уникальность по telegram_payment_charge_id (или эквивалентному идентификатору Telegram Stars).
	•	При повторном апдейте оплаты — не создавать дубль.
	•	Хранить raw_payload (json) для разборов спорных ситуаций.

⸻

9. Обновление схемы БД

9.1 users (расширение)

Добавить поля:
	•	last_name (text)
	•	language_code (text)
	•	is_premium (bool, nullable)
	•	last_seen_at (timestamp)
	•	updated_at (timestamp)

9.3 payments (расширение)

Добавить:
	•	rate_used (numeric) — курс на момент оплаты
	•	tons_amount (numeric/int) — итог начисления
	•	context_json (jsonb) — screen, preset_id, ref_context и т.д.

9.4 donations (уточнение)

Если payments уже содержит tons_amount и статус paid — donations можно:
	•	либо оставить как отдельный “бухгалтерский факт начисления”,
	•	либо упростить и считать донаты = paid payments.
Рекомендация: оставить donations как отдельную таблицу начислений, если планируются не только Stars (например, админ начисления/бонусы/промо).

⸻

10. Доп. API

GET /me (обновить)

Возвращает и обновляет профиль пользователя:
	•	tg_id, username, first_name, last_name, photo_url
	•	мои тонны (all-time/week)
	•	мой ref link
	•	моя реф-стата
	•	(опционально) последние транзакции

GET /transactions?limit=&offset=

История транзакций пользователя:
	•	список payments/donations (paid/failed), с датой, stars, tons, статусом