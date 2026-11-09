-- Список позиций «Интересующий товар» в форме «Записаться на замер» (настраивается в админке)
ALTER TABLE "measurement_form_block" ADD COLUMN "productTypeOptions" JSONB;

-- Дефолтные позиции: текущий захардкоженный список + «Ремонт квартиры» и «Ремонт помещения»
UPDATE "measurement_form_block" SET "productTypeOptions" = '["Межкомнатные двери", "Входные двери", "Окна", "Потолки", "Жалюзи", "Мебель", "Ремонт квартиры", "Ремонт помещения", "Не знаю, нужна консультация"]'::jsonb WHERE "id" = 'main' AND "productTypeOptions" IS NULL;
