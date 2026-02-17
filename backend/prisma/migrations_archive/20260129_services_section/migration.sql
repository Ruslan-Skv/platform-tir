-- CreateTable
CREATE TABLE "services_block" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "title" TEXT NOT NULL DEFAULT 'Комплексные решения',
    "subtitle" TEXT NOT NULL DEFAULT 'Полный цикл услуг для вашего комфорта',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "features" TEXT[],
    "price" TEXT NOT NULL,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_items_pkey" PRIMARY KEY ("id")
);

-- Insert default services block
INSERT INTO "services_block" ("id", "title", "subtitle", "updatedAt")
VALUES ('main', 'Комплексные решения', 'Полный цикл услуг для вашего комфорта', NOW());

-- Insert default service items
INSERT INTO "service_items" ("id", "title", "description", "features", "price", "imageUrl", "sortOrder", "createdAt")
VALUES
  (md5(random()::text || 's1'), 'Ремонт под ключ', 'Полный цикл от дизайна до чистовой отделки', ARRAY['Дизайн-проект', 'Черновые работы', 'Чистовая отделка', 'Мебель на заказ', 'Авторский надзор'], 'от 5 000 ₽/м²', NULL, 0, NOW()),
  (md5(random()::text || 's2'), 'Мебель на заказ', 'Изготовление мебели по индивидуальным размерам', ARRAY['Кухни любой сложности', 'Шкафы-купе и гардеробные', 'Гостиные и стенки', 'Спальни и детские'], 'от 15 000 ₽', NULL, 1, NOW()),
  (md5(random()::text || 's3'), 'Дизайн интерьера', 'Создание индивидуального дизайн-проекта', ARRAY['3D-визуализация', 'Подбор материалов', 'Смета и планировка', 'Авторский надзор'], 'от 1 500 ₽/м²', NULL, 2, NOW());
