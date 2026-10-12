-- DropIndex
DROP INDEX "contract_document_payment_invoices_deletedAt_idx";

-- AlterTable
ALTER TABLE "advantages_block" ALTER COLUMN "title" SET DEFAULT 'Почему выбирают нас',
ALTER COLUMN "subtitle" SET DEFAULT 'Мы делаем качество доступным';

-- AlterTable
ALTER TABLE "careers_page_block" ALTER COLUMN "id" SET DEFAULT 'main';

-- AlterTable
ALTER TABLE "contact_form_block" ALTER COLUMN "title" SET DEFAULT 'Готовы начать проект?',
ALTER COLUMN "subtitle" SET DEFAULT 'Оставьте заявку и получите бесплатную консультацию специалиста';

-- AlterTable
ALTER TABLE "contacts_page_block" ALTER COLUMN "id" SET DEFAULT 'main';

-- AlterTable
ALTER TABLE "featured_products_block" ALTER COLUMN "title" SET DEFAULT 'Популярные товары',
ALTER COLUMN "subtitle" SET DEFAULT 'Товары, которые выбирают наши клиенты';

-- AlterTable
ALTER TABLE "footer_block" ALTER COLUMN "workingHoursWeekdays" SET DEFAULT 'пн-пт: 11-19',
ALTER COLUMN "workingHoursSaturday" SET DEFAULT 'сб: 12-16',
ALTER COLUMN "workingHoursSunday" SET DEFAULT 'вс: выходной',
ALTER COLUMN "developer" SET DEFAULT 'ИП Сквиря Р.В.',
ALTER COLUMN "copyrightCompanyName" SET DEFAULT 'Территория интерьерных решений';

-- AlterTable
ALTER TABLE "form_submissions" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hero_block" ALTER COLUMN "titleMain" SET DEFAULT 'Создаем интерьеры мечты',
ALTER COLUMN "titleAccent" SET DEFAULT 'в Мурманске',
ALTER COLUMN "subtitle" SET DEFAULT 'Мебель на заказ, ремонт под ключ, двери входные и межкомнатные, натяжные потолки, жалюзи, мягкая мебель, кровати, матрасы .....';

-- AlterTable
ALTER TABLE "mission_page_block" ALTER COLUMN "id" SET DEFAULT 'main';

-- AlterTable
ALTER TABLE "quiz_submissions" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "seller_legal_block" ALTER COLUMN "id" SET DEFAULT 'main';

-- AlterTable
ALTER TABLE "service_catalog_block" ALTER COLUMN "title" SET DEFAULT 'Ремонт квартир';

-- AlterTable
ALTER TABLE "service_catalog_items" ALTER COLUMN "unit" SET DEFAULT 'м²';

-- AlterTable
ALTER TABLE "services_block" ALTER COLUMN "title" SET DEFAULT 'Комплексные решения',
ALTER COLUMN "subtitle" SET DEFAULT 'Полный цикл услуг для вашего комфорта';

-- AlterTable
ALTER TABLE "site_disclaimer_block" ALTER COLUMN "id" SET DEFAULT 'main';

-- AlterTable
ALTER TABLE "work_day_settings" ALTER COLUMN "greetingMessages" SET DEFAULT ARRAY['Доброго дня, {имя}! Желаем продуктивной работы.', 'С добрым утром, {имя}! Отличного рабочего дня!', '{имя}, желаем хорошего дня и отличной работы!']::TEXT[];

-- CreateTable
CREATE TABLE "contract_document_estimate_presets_history" (
    "id" TEXT NOT NULL,
    "kind" "ContractDocumentPackageKind" NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]',
    "groups" JSONB NOT NULL DEFAULT '[]',
    "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "action" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedById" TEXT,

    CONSTRAINT "contract_document_estimate_presets_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_employee_salaries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monthlySalary" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_employee_salaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contract_document_estimate_presets_history_kind_changedAt_idx" ON "contract_document_estimate_presets_history"("kind", "changedAt");

-- CreateIndex
CREATE INDEX "contract_document_estimate_presets_history_changedById_idx" ON "contract_document_estimate_presets_history"("changedById");

-- CreateIndex
CREATE UNIQUE INDEX "salary_employee_salaries_userId_key" ON "salary_employee_salaries"("userId");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens"("token");

-- AddForeignKey
ALTER TABLE "contract_document_estimate_presets_history" ADD CONSTRAINT "contract_document_estimate_presets_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_employee_salaries" ADD CONSTRAINT "salary_employee_salaries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
