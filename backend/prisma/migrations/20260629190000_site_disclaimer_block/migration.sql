-- CreateTable
CREATE TABLE "site_disclaimer_block" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_disclaimer_block_pkey" PRIMARY KEY ("id")
);

INSERT INTO "site_disclaimer_block" ("id", "content", "isPublished", "updatedAt")
VALUES (
    'main',
    'Информация на сайте предоставлена для ознакомления и не является публичной офертой. Магазин оставляет за собой право вносить конструктивные изменения в продукцию. Для получения точной информации о конструктивных особенностях дверей обращайтесь к продавцам-консультантам. Цветовые оттенки продукции могут незначительно отличаться в зависимости от цветопередачи вашего монитора и могут не полностью соответствовать образцам в салонах',
    true,
    CURRENT_TIMESTAMP
);
