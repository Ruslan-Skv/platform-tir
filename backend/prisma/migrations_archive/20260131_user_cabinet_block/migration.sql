-- CreateTable
CREATE TABLE "user_cabinet_block" (
    "id" TEXT NOT NULL,
    "showProfileSection" BOOLEAN NOT NULL DEFAULT true,
    "showOrdersSection" BOOLEAN NOT NULL DEFAULT true,
    "showNotificationsSection" BOOLEAN NOT NULL DEFAULT true,
    "showPasswordSection" BOOLEAN NOT NULL DEFAULT true,
    "showQuickLinks" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_cabinet_block_pkey" PRIMARY KEY ("id")
);
