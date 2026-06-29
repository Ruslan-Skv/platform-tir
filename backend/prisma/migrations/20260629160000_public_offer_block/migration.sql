-- CreateTable
CREATE TABLE "public_offer_block" (
    "id" TEXT NOT NULL,
    "pageTitle" TEXT NOT NULL DEFAULT 'Публичная оферта',
    "offerUrl" TEXT,
    "offerContent" TEXT,
    "acceptText" TEXT NOT NULL DEFAULT 'Я принимаю условия публичной оферты',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_offer_block_pkey" PRIMARY KEY ("id")
);

INSERT INTO "public_offer_block" ("id", "pageTitle", "acceptText", "isPublished", "updatedAt")
VALUES ('main', 'Публичная оферта', 'Я принимаю условия публичной оферты', false, CURRENT_TIMESTAMP);

INSERT INTO "footer_section_links" ("id", "sectionId", "name", "href", "sortOrder")
SELECT
    'public-offer-link',
    fs."id",
    'Публичная оферта',
    '/offer',
    COALESCE((SELECT MAX(l."sortOrder") + 1 FROM "footer_section_links" l WHERE l."sectionId" = fs."id"), 0)
FROM "footer_sections" fs
WHERE fs."title" = 'О нас'
  AND NOT EXISTS (
    SELECT 1 FROM "footer_section_links" l WHERE l."href" = '/offer'
  );
