-- CreateTable
CREATE TABLE "user_crm_directions" (
    "userId" TEXT NOT NULL,
    "directionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_crm_directions_pkey" PRIMARY KEY ("userId","directionId")
);

-- CreateIndex
CREATE INDEX "user_crm_directions_directionId_idx" ON "user_crm_directions"("directionId");

-- AddForeignKey
ALTER TABLE "user_crm_directions" ADD CONSTRAINT "user_crm_directions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_crm_directions" ADD CONSTRAINT "user_crm_directions_directionId_fkey" FOREIGN KEY ("directionId") REFERENCES "crm_directions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
