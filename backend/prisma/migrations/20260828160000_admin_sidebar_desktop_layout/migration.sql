-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "adminSidebarDesktopLayout" TEXT NOT NULL DEFAULT 'list';
