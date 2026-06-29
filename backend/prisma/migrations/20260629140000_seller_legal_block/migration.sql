-- CreateTable
CREATE TABLE "seller_legal_block" (
    "id" TEXT NOT NULL,
    "pageTitle" TEXT NOT NULL DEFAULT 'Информация о продавце',
    "legalName" TEXT NOT NULL DEFAULT '',
    "entityType" TEXT NOT NULL DEFAULT 'IP',
    "inn" TEXT NOT NULL DEFAULT '',
    "ogrn" TEXT NOT NULL DEFAULT '',
    "legalAddress" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '8 (8152) 60-12-70',
    "email" TEXT NOT NULL DEFAULT 'skvirya@mail.ru',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_legal_block_pkey" PRIMARY KEY ("id")
);

INSERT INTO "seller_legal_block" (
    "id",
    "pageTitle",
    "legalName",
    "entityType",
    "inn",
    "ogrn",
    "legalAddress",
    "phone",
    "email",
    "isPublished",
    "updatedAt"
)
VALUES (
    'main',
    'Информация о продавце',
    'ИП Сквиря Р.В.',
    'IP',
    '',
    '',
    '',
    '8 (8152) 60-12-70',
    'skvirya@mail.ru',
    true,
    CURRENT_TIMESTAMP
);

INSERT INTO "footer_section_links" ("id", "sectionId", "name", "href", "sortOrder")
SELECT
    'seller-legal-link',
    fs."id",
    'Реквизиты',
    '/legal',
    COALESCE((SELECT MAX(l."sortOrder") + 1 FROM "footer_section_links" l WHERE l."sectionId" = fs."id"), 0)
FROM "footer_sections" fs
WHERE fs."title" = 'О нас'
  AND NOT EXISTS (
    SELECT 1 FROM "footer_section_links" l WHERE l."href" = '/legal'
  );
