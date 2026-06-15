-- CreateTable
CREATE TABLE "quiz_landings" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'furniture',
    "title" TEXT NOT NULL,
    "domain" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "headline" TEXT,
    "subheadline" TEXT,
    "promoText" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#c9a227',
    "displayPhone" TEXT,
    "city" TEXT,
    "successTitle" TEXT,
    "successText" TEXT,
    "catalogFileUrl" TEXT,
    "privacyPolicyUrl" TEXT,
    "notifyEmails" JSONB,
    "notifyTelegramIds" JSONB,
    "notifyPhones" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_landings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_steps" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "placeholder" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "options" JSONB,
    "showWhen" JSONB,

    CONSTRAINT "quiz_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_submissions" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "furnitureType" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "referrer" TEXT,
    "landingUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quiz_landings_slug_key" ON "quiz_landings"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_landings_domain_key" ON "quiz_landings"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_steps_quizId_key_key" ON "quiz_steps"("quizId", "key");

-- CreateIndex
CREATE INDEX "quiz_submissions_quizId_createdAt_idx" ON "quiz_submissions"("quizId", "createdAt");

-- AddForeignKey
ALTER TABLE "quiz_steps" ADD CONSTRAINT "quiz_steps_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quiz_landings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_submissions" ADD CONSTRAINT "quiz_submissions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quiz_landings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
