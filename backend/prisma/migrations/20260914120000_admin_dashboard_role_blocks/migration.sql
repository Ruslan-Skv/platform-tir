-- Доступность блоков дашборда по админ-ролям (настраивает супер-админ)
CREATE TABLE "admin_dashboard_role_block" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "trainingDynamicsAllowed" BOOLEAN NOT NULL DEFAULT true,
    "catalogActivityAllowed" BOOLEAN NOT NULL DEFAULT true,
    "calendarAllowed" BOOLEAN NOT NULL DEFAULT true,
    "quickLinksAllowed" BOOLEAN NOT NULL DEFAULT true,
    "dateToolbarAllowed" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_dashboard_role_block_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_dashboard_role_block_role_key" ON "admin_dashboard_role_block"("role");
