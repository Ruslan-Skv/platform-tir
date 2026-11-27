-- Украшения публичного сайта (снег, гирлянды и т.п.).
-- Строки создаются автоматически из реестра кодов в backend/src/site-public/site-decorations.registry.ts.

-- CreateTable
CREATE TABLE "site_decorations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_decorations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_decorations_code_key" ON "site_decorations"("code");
