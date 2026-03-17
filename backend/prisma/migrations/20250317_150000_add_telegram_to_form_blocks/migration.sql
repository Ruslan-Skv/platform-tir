-- AlterTable
ALTER TABLE "director_message_block" ADD COLUMN IF NOT EXISTS "telegramChatId" TEXT;
ALTER TABLE "measurement_form_block" ADD COLUMN IF NOT EXISTS "telegramChatId" TEXT;
ALTER TABLE "callback_form_block" ADD COLUMN IF NOT EXISTS "telegramChatId" TEXT;
ALTER TABLE "quote_form_block" ADD COLUMN IF NOT EXISTS "telegramChatId" TEXT;
