-- Вариант логотипа админки (шрифт подписи «Виртуальный офис»):
-- classic — текущий вид (Play, uppercase); mission — рукописный Great Vibes (шрифт текста миссии).

ALTER TABLE "users" ADD COLUMN "adminLogoVariant" TEXT NOT NULL DEFAULT 'classic';
