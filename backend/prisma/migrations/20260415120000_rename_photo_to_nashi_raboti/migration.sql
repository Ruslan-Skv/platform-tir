-- Раздел «Фото» → «Наши работы» (пункты меню и ссылка в футере)
-- Только данные. Безопасно при отсутствии строк с именем «Фото».

UPDATE "navigation_items"
SET "name" = 'Наши работы'
WHERE "href" = '/photo'
  AND "name" = 'Фото';

UPDATE "footer_section_links"
SET "name" = 'Наши работы'
WHERE "href" = '/photo'
  AND "name" = 'Фото';
