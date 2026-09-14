-- Доступность отдельных быстрых ссылок дашборда по ролям (задаёт супер-админ)
CREATE TABLE "admin_dashboard_role_quick_link" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_dashboard_role_quick_link_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_dashboard_role_quick_link_role_linkId_key" ON "admin_dashboard_role_quick_link"("role", "linkId");

-- CreateIndex
CREATE INDEX "admin_dashboard_role_quick_link_role_idx" ON "admin_dashboard_role_quick_link"("role");

-- AddForeignKey
ALTER TABLE "admin_dashboard_role_quick_link" ADD CONSTRAINT "admin_dashboard_role_quick_link_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "admin_dashboard_quick_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
