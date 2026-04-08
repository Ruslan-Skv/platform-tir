-- CreateTable
CREATE TABLE "door_thicknesses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "door_thicknesses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "door_thicknesses_slug_key" ON "door_thicknesses"("slug");

-- AlterTable
ALTER TABLE "products" ADD COLUMN "doorThicknessId" TEXT;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_doorThicknessId_fkey" FOREIGN KEY ("doorThicknessId") REFERENCES "door_thicknesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
