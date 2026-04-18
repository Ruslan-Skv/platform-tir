-- CreateTable
CREATE TABLE "blog_badge_presets" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_badge_presets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blog_badge_presets_label_key" ON "blog_badge_presets"("label");

INSERT INTO "blog_badge_presets" ("id", "label", "sortOrder", "createdAt")
VALUES
  ('bbp_seed_chk', 'Чек-лист', 0, CURRENT_TIMESTAMP),
  ('bbp_seed_case', 'Кейс', 1, CURRENT_TIMESTAMP),
  ('bbp_seed_imp', 'Важно!', 2, CURRENT_TIMESTAMP),
  ('bbp_seed_top5', 'Топ-5 ошибок', 3, CURRENT_TIMESTAMP);
