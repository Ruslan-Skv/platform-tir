-- Телефон покупателя для заказов (в т.ч. оформленных менеджером для клиента).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(255);
