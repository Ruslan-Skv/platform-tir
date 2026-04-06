-- CreateTable
CREATE TABLE "product_card_badge_definitions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_card_badge_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_card_badge_on_products" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_card_badge_on_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_card_badge_definitions_key_key" ON "product_card_badge_definitions"("key");

-- CreateIndex
CREATE INDEX "product_card_badge_on_products_productId_idx" ON "product_card_badge_on_products"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_card_badge_on_products_productId_badgeId_key" ON "product_card_badge_on_products"("productId", "badgeId");

-- AddForeignKey
ALTER TABLE "product_card_badge_on_products" ADD CONSTRAINT "product_card_badge_on_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_card_badge_on_products" ADD CONSTRAINT "product_card_badge_on_products_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "product_card_badge_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
