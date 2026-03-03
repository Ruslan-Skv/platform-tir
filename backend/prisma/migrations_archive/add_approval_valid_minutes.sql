-- Время действия статуса «Заказ проверен» (минуты). После истечения заказ отменяется, товары возвращаются в корзину.
ALTER TABLE delivery_config ADD COLUMN IF NOT EXISTS approval_valid_minutes INTEGER NOT NULL DEFAULT 60;
