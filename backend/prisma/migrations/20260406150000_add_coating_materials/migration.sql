-- CreateTable
CREATE TABLE "coating_materials" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coating_materials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coating_materials_slug_key" ON "coating_materials"("slug");

-- AlterTable
ALTER TABLE "products" ADD COLUMN "coatingMaterialId" TEXT;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_coatingMaterialId_fkey" FOREIGN KEY ("coatingMaterialId") REFERENCES "coating_materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
