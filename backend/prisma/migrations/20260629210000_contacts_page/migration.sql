-- CreateTable
CREATE TABLE "contacts_page_block" (
    "id" TEXT NOT NULL,
    "pageTitle" TEXT NOT NULL DEFAULT 'Контакты',
    "introText" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_page_block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_salons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_salons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_salon_managers" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "contact_salon_managers_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "contact_salon_managers" ADD CONSTRAINT "contact_salon_managers_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "contact_salons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "contacts_page_block" ("id", "pageTitle", "introText", "isPublished", "updatedAt")
VALUES (
    'main',
    'Контакты',
    'Салоны «Территория интерьерных решений» в Мурманске. Выберите удобный офис и свяжитесь с менеджером.',
    true,
    CURRENT_TIMESTAMP
);
