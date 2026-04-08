-- CreateTable
CREATE TABLE "weatherstrips" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weatherstrips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "weatherstrips_slug_key" ON "weatherstrips"("slug");

-- AlterTable
ALTER TABLE "products" ADD COLUMN "weatherstripId" TEXT;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_weatherstripId_fkey" FOREIGN KEY ("weatherstripId") REFERENCES "weatherstrips"("id") ON DELETE SET NULL ON UPDATE CASCADE;
