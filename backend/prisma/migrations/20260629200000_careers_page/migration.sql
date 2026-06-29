-- CreateTable
CREATE TABLE "careers_page_block" (
    "id" TEXT NOT NULL,
    "pageTitle" TEXT NOT NULL DEFAULT 'Вакансии',
    "introText" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "careers_page_block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_vacancies" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT,
    "conditions" TEXT,
    "contactEmail" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "career_vacancies_pkey" PRIMARY KEY ("id")
);

INSERT INTO "careers_page_block" ("id", "pageTitle", "introText", "isPublished", "updatedAt")
VALUES (
    'main',
    'Вакансии',
    'Присоединяйтесь к команде «Территория интерьерных решений». Актуальные вакансии размещены ниже — отправьте резюме на указанный email.',
    true,
    CURRENT_TIMESTAMP
);
