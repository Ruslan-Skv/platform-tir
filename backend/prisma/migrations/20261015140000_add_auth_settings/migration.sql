-- CreateTable
CREATE TABLE "auth_settings" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "sberAuthEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_settings_pkey" PRIMARY KEY ("id")
);
