-- CreateTable
CREATE TABLE "hero_block" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "titleMain" TEXT NOT NULL DEFAULT 'Создаем интерьеры мечты',
    "titleAccent" TEXT NOT NULL DEFAULT 'в Мурманске',
    "subtitle" TEXT NOT NULL DEFAULT 'Мебель на заказ, ремонт под ключ, двери входные и межкомнатные, натяжные потолки, жалюзи, мягкая мебель, кровати, матрасы .....',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hero_block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hero_slides" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hero_slides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hero_features" (
    "id" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hero_features_pkey" PRIMARY KEY ("id")
);

-- Insert default hero block
INSERT INTO "hero_block" ("id", "titleMain", "titleAccent", "subtitle", "updatedAt")
VALUES ('main', 'Создаем интерьеры мечты', 'в Мурманске', 'Мебель на заказ, ремонт под ключ, двери входные и межкомнатные, натяжные потолки, жалюзи, мягкая мебель, кровати, матрасы .....', NOW());

-- Insert default hero features
INSERT INTO "hero_features" ("id", "icon", "title", "sortOrder", "createdAt")
VALUES
  (md5(random()::text || '1'), '🏭', 'Собственное производство', 0, NOW()),
  (md5(random()::text || '2'), '📐', 'Бесплатный замер', 1, NOW()),
  (md5(random()::text || '3'), '🛡️', 'Гарантия 3 года', 2, NOW()),
  (md5(random()::text || '4'), '⚡', 'Сроки от 1 дня', 3, NOW());
