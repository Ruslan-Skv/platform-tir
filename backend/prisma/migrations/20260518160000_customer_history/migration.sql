-- CreateTable
CREATE TABLE "customer_history" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changed_fields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "action" TEXT NOT NULL,
    "changed_by_id" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_history_customer_id_idx" ON "customer_history"("customer_id");

-- CreateIndex
CREATE INDEX "customer_history_changed_at_idx" ON "customer_history"("changed_at");

-- AddForeignKey
ALTER TABLE "customer_history" ADD CONSTRAINT "customer_history_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_history" ADD CONSTRAINT "customer_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
