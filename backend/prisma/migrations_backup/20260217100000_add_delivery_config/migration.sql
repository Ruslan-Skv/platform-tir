-- CreateTable
CREATE TABLE IF NOT EXISTS "delivery_config" (
    "id" TEXT NOT NULL,
    "deliveryPriceMurmansk" DECIMAL(10,2) NOT NULL,
    "deliveryPricePerKmOutside" DECIMAL(10,2) NOT NULL,
    "moversPriceMurmansk" DECIMAL(10,2) NOT NULL,
    "moversPriceOutside" DECIMAL(10,2) NOT NULL,
    "moversKgPerPerson" DECIMAL(10,2) NOT NULL,
    "moversVolumePerPerson" DECIMAL(10,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_config_pkey" PRIMARY KEY ("id")
);
