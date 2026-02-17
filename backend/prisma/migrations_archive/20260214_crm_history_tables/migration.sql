-- CreateTable
CREATE TABLE "complex_object_history" (
    "id" TEXT NOT NULL,
    "complexObjectId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "action" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complex_object_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_history" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "action" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_history" (
    "id" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "action" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "office_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "complex_object_history_complexObjectId_idx" ON "complex_object_history"("complexObjectId");

-- CreateIndex
CREATE INDEX "complex_object_history_changedAt_idx" ON "complex_object_history"("changedAt");

-- CreateIndex
CREATE INDEX "task_history_taskId_idx" ON "task_history"("taskId");

-- CreateIndex
CREATE INDEX "task_history_changedAt_idx" ON "task_history"("changedAt");

-- CreateIndex
CREATE INDEX "office_history_officeId_idx" ON "office_history"("officeId");

-- CreateIndex
CREATE INDEX "office_history_changedAt_idx" ON "office_history"("changedAt");

-- AddForeignKey
ALTER TABLE "complex_object_history" ADD CONSTRAINT "complex_object_history_complexObjectId_fkey" FOREIGN KEY ("complexObjectId") REFERENCES "complex_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complex_object_history" ADD CONSTRAINT "complex_object_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_history" ADD CONSTRAINT "task_history_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_history" ADD CONSTRAINT "task_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_history" ADD CONSTRAINT "office_history_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_history" ADD CONSTRAINT "office_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
