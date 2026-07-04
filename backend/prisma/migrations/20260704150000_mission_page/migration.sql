-- CreateTable
CREATE TABLE "mission_page_block" (
    "id" TEXT NOT NULL,
    "pageTitle" TEXT NOT NULL DEFAULT 'Миссия компании',
    "content" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mission_page_block_pkey" PRIMARY KEY ("id")
);

INSERT INTO "mission_page_block" ("id", "pageTitle", "content", "isPublished", "updatedAt")
VALUES (
    'main',
    'Миссия компании',
    'Мы создаём комфортные интерьерные решения для дома и бизнеса в Мурманске и области. Наша миссия — помогать клиентам выбирать качественные материалы и услуги, сопровождать их на каждом этапе и делать результат понятным, надёжным и долговечным.',
    true,
    CURRENT_TIMESTAMP
);

INSERT INTO "footer_section_links" ("id", "sectionId", "name", "href", "sortOrder")
SELECT
    'mission-about-link',
    fs."id",
    'Миссия компании',
    '/mission',
    COALESCE((SELECT MAX(l."sortOrder") + 1 FROM "footer_section_links" l WHERE l."sectionId" = fs."id"), 0)
FROM "footer_sections" fs
WHERE fs."title" = 'О нас'
  AND NOT EXISTS (
    SELECT 1 FROM "footer_section_links" l WHERE l."href" = '/mission'
  );
