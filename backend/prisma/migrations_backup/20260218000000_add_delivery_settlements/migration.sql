-- CreateTable
CREATE TABLE "delivery_settlements" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_settlements_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "delivery_settlements" ADD CONSTRAINT "delivery_settlements_configId_fkey" FOREIGN KEY ("configId") REFERENCES "delivery_config"("id") ON DELETE CASCADE ON UPDATE CASCADE;
