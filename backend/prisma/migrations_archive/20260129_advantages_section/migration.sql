-- CreateTable
CREATE TABLE "advantages_block" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "title" TEXT NOT NULL DEFAULT 'Почему выбирают нас',
    "subtitle" TEXT NOT NULL DEFAULT 'Мы делаем качество доступным',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advantages_block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advantage_items" (
    "id" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advantage_items_pkey" PRIMARY KEY ("id")
);

-- Insert default advantages block
INSERT INTO "advantages_block" ("id", "title", "subtitle", "updatedAt")
VALUES ('main', 'Почему выбирают нас', 'Мы делаем качество доступным', NOW());

-- Insert default advantage items
INSERT INTO "advantage_items" ("id", "icon", "title", "description", "sortOrder", "createdAt")
VALUES
  (md5(random()::text || 'a1'), '🏭', 'Собственное производство', 'Изготавливаем мебель и конструкции на собственном производстве в Мурманске', 0, NOW()),
  (md5(random()::text || 'a2'), '📐', 'Бесплатный замер', 'Выезд специалиста для точных замеров и консультации', 1, NOW()),
  (md5(random()::text || 'a3'), '🏆', 'Опыт 15+ лет', 'Более 15 лет создаем интерьеры в Мурманске и области', 2, NOW()),
  (md5(random()::text || 'a4'), '⚡', 'Сроки от 1 дня', 'Быстрое изготовление и монтаж без задержек', 3, NOW()),
  (md5(random()::text || 'a5'), '🛡️', 'Гарантия 3 года', 'Предоставляем гарантию на все работы и материалы', 4, NOW()),
  (md5(random()::text || 'a6'), '🎨', 'Дизайн-проект', 'Разработка индивидуального дизайн-проекта', 5, NOW());
