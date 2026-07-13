-- Отключение проверки IP при начале рабочего дня для конкретного офиса
ALTER TABLE "offices" ADD COLUMN "skipWorkDayIpCheck" BOOLEAN NOT NULL DEFAULT false;
