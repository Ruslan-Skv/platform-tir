-- CreateTable
CREATE TABLE "public_offer_versions" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "offerUrl" TEXT,
    "offerContent" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_offer_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "public_offer_versions_offerId_createdAt_idx" ON "public_offer_versions"("offerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "public_offer_versions_offerId_versionNumber_key" ON "public_offer_versions"("offerId", "versionNumber");

-- AddForeignKey
ALTER TABLE "public_offer_versions" ADD CONSTRAINT "public_offer_versions_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "public_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
