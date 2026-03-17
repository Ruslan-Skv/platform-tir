-- CreateTable
CREATE TABLE "callback_form_block" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "recipientEmail" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "callback_form_block_pkey" PRIMARY KEY ("id")
);

-- Insert default row
INSERT INTO "callback_form_block" ("id", "recipientEmail", "updatedAt") VALUES ('main', NULL, NOW());
