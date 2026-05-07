CREATE TABLE "installer_masters" (
  "id" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "grade" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "installer_masters_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "installer_masters_direction_idx" ON "installer_masters"("direction");
