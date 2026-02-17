-- Поддержка дробного количества в корзине (например, 2,5 стойки коробки)
ALTER TABLE cart_items
  ALTER COLUMN quantity TYPE double precision USING quantity::double precision;
