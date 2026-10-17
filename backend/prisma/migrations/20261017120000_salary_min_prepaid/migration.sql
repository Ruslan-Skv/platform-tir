-- Минимальная предоплата по договору для начала расчёта з/п управления:
-- процент задаётся по направлению, дата достижения фиксируется на договоре.
ALTER TABLE "salary_categories" ADD COLUMN "minPrepaidPercent" DECIMAL(5,2) NOT NULL DEFAULT 0;

ALTER TABLE "salary_contracts" ADD COLUMN "prepaidReachedAt" DATE;
