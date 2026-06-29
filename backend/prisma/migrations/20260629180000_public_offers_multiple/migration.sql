-- CreateTable
CREATE TABLE "public_offers" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Публичная оферта',
    "name" TEXT NOT NULL DEFAULT 'Публичная оферта',
    "offerUrl" TEXT,
    "offerContent" TEXT,
    "acceptText" TEXT NOT NULL DEFAULT 'Я принимаю условия публичной оферты',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_offer_scopes" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "public_offer_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "public_offers_slug_key" ON "public_offers"("slug");

-- CreateIndex
CREATE INDEX "public_offer_scopes_scopeType_scopeId_idx" ON "public_offer_scopes"("scopeType", "scopeId");

-- CreateIndex
CREATE UNIQUE INDEX "public_offer_scopes_offerId_scopeType_scopeId_key" ON "public_offer_scopes"("offerId", "scopeType", "scopeId");

-- AddForeignKey
ALTER TABLE "public_offer_scopes" ADD CONSTRAINT "public_offer_scopes_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "public_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate singleton block
INSERT INTO "public_offers" (
    "id",
    "slug",
    "title",
    "name",
    "offerUrl",
    "offerContent",
    "acceptText",
    "isPublished",
    "isDefault",
    "sortOrder",
    "createdAt",
    "updatedAt"
)
SELECT
    'migrated-main-offer',
    'general',
    COALESCE(NULLIF(TRIM("pageTitle"), ''), 'Публичная оферта'),
    COALESCE(NULLIF(TRIM("pageTitle"), ''), 'Публичная оферта'),
    "offerUrl",
    "offerContent",
    "acceptText",
    "isPublished",
    true,
    0,
    CURRENT_TIMESTAMP,
    "updatedAt"
FROM "public_offer_block"
WHERE "id" = 'main';

INSERT INTO "public_offer_scopes" ("id", "offerId", "scopeType", "scopeId")
SELECT 'migrated-all-products', 'migrated-main-offer', 'ALL_PRODUCTS', ''
WHERE EXISTS (SELECT 1 FROM "public_offers" WHERE "id" = 'migrated-main-offer');

INSERT INTO "public_offer_scopes" ("id", "offerId", "scopeType", "scopeId")
SELECT 'migrated-all-services', 'migrated-main-offer', 'ALL_SERVICES', ''
WHERE EXISTS (SELECT 1 FROM "public_offers" WHERE "id" = 'migrated-main-offer');

-- DropTable
DROP TABLE "public_offer_block";
