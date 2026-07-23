-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "adminSidebarHideIcons" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "adminSidebarMobileLayout" TEXT NOT NULL DEFAULT 'list';
