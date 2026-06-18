-- CreateEnum
CREATE TYPE "SalesCandidateStatus" AS ENUM ('NEW', 'QUESTIONNAIRE', 'INTERVIEW', 'TRAINING', 'TEST_TASK', 'REJECTED', 'HIRED');

-- CreateTable
CREATE TABLE "sales_candidates" (
    "id" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "birthDate" TIMESTAMP(3),
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "city" TEXT,
    "address" TEXT,
    "educationLevel" TEXT,
    "educationInstitution" TEXT,
    "educationSpecialty" TEXT,
    "educationYear" INTEGER,
    "additionalEducation" TEXT,
    "totalExperienceYears" DOUBLE PRECISION,
    "salesExperienceYears" DOUBLE PRECISION,
    "workHistory" JSONB,
    "industryExperience" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "salesAchievements" TEXT,
    "communicationSkill" INTEGER,
    "stressResistance" INTEGER,
    "motivation" INTEGER,
    "teamworkSkill" INTEGER,
    "selfOrganization" INTEGER,
    "pcSkill" INTEGER,
    "presentationSkill" INTEGER,
    "motivationReason" TEXT,
    "salaryExpectation" TEXT,
    "availableFrom" TIMESTAMP(3),
    "hasDriversLicense" BOOLEAN,
    "hasPersonalCar" BOOLEAN,
    "readyForTravel" BOOLEAN,
    "productKnowledge" TEXT,
    "interviewDate" TIMESTAMP(3),
    "interviewScore" INTEGER,
    "interviewNotes" TEXT,
    "adminNotes" TEXT,
    "resumeFileUrl" TEXT,
    "resumeFileName" TEXT,
    "resumeParsedText" TEXT,
    "resumeParsedData" JSONB,
    "traineeUserId" TEXT,
    "status" "SalesCandidateStatus" NOT NULL DEFAULT 'NEW',
    "overallScore" DOUBLE PRECISION,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sales_candidates_traineeUserId_key" ON "sales_candidates"("traineeUserId");

-- CreateIndex
CREATE INDEX "sales_candidates_status_idx" ON "sales_candidates"("status");

-- CreateIndex
CREATE INDEX "sales_candidates_overallScore_idx" ON "sales_candidates"("overallScore");

-- CreateIndex
CREATE INDEX "sales_candidates_createdAt_idx" ON "sales_candidates"("createdAt");

-- AddForeignKey
ALTER TABLE "sales_candidates" ADD CONSTRAINT "sales_candidates_traineeUserId_fkey" FOREIGN KEY ("traineeUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_candidates" ADD CONSTRAINT "sales_candidates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
