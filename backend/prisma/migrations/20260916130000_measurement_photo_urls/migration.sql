-- Фото с результатами замера (кнопка-скрепка на странице замера)
ALTER TABLE "measurements" ADD COLUMN "photoUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
