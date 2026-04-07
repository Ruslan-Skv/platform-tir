-- CreateTable
CREATE TABLE "canvas_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canvas_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "canvas_types_slug_key" ON "canvas_types"("slug");

-- AlterTable
ALTER TABLE "products" ADD COLUMN "canvasTypeId" TEXT;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_canvasTypeId_fkey" FOREIGN KEY ("canvasTypeId") REFERENCES "canvas_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
