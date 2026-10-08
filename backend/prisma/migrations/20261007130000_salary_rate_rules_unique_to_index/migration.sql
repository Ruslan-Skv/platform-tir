/*
  Уникальный индекс на (categoryId, officeId, role) заменён обычным:
  в Postgres UNIQUE не различает строки с NULL officeId («все офисы»),
  поэтому дубликаты правил контролируются сервисом.
*/

-- DropIndex
DROP INDEX "salary_rate_rules_categoryId_officeId_role_key";

-- CreateIndex
CREATE INDEX "salary_rate_rules_categoryId_officeId_role_idx" ON "salary_rate_rules"("categoryId", "officeId", "role");
