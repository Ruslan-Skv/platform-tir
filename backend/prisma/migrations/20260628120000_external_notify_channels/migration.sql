-- Form blocks: migrate single email/telegram to JSON arrays + MAX

ALTER TABLE "director_message_block" ADD COLUMN "notifyEmails" JSONB;
ALTER TABLE "director_message_block" ADD COLUMN "notifyTelegramIds" JSONB;
ALTER TABLE "director_message_block" ADD COLUMN "notifyMaxIds" JSONB;

UPDATE "director_message_block"
SET
  "notifyEmails" = CASE
    WHEN "directorEmail" IS NOT NULL AND TRIM("directorEmail") <> '' THEN jsonb_build_array(TRIM("directorEmail"))
    ELSE '[]'::jsonb
  END,
  "notifyTelegramIds" = CASE
    WHEN "telegramChatId" IS NOT NULL AND TRIM("telegramChatId") <> '' THEN jsonb_build_array(TRIM("telegramChatId"))
    ELSE '[]'::jsonb
  END,
  "notifyMaxIds" = '[]'::jsonb;

ALTER TABLE "director_message_block" DROP COLUMN "directorEmail";
ALTER TABLE "director_message_block" DROP COLUMN "telegramChatId";

ALTER TABLE "measurement_form_block" ADD COLUMN "notifyEmails" JSONB;
ALTER TABLE "measurement_form_block" ADD COLUMN "notifyTelegramIds" JSONB;
ALTER TABLE "measurement_form_block" ADD COLUMN "notifyMaxIds" JSONB;

UPDATE "measurement_form_block"
SET
  "notifyEmails" = CASE
    WHEN "recipientEmail" IS NOT NULL AND TRIM("recipientEmail") <> '' THEN jsonb_build_array(TRIM("recipientEmail"))
    ELSE '[]'::jsonb
  END,
  "notifyTelegramIds" = CASE
    WHEN "telegramChatId" IS NOT NULL AND TRIM("telegramChatId") <> '' THEN jsonb_build_array(TRIM("telegramChatId"))
    ELSE '[]'::jsonb
  END,
  "notifyMaxIds" = '[]'::jsonb;

ALTER TABLE "measurement_form_block" DROP COLUMN "recipientEmail";
ALTER TABLE "measurement_form_block" DROP COLUMN "telegramChatId";

ALTER TABLE "callback_form_block" ADD COLUMN "notifyEmails" JSONB;
ALTER TABLE "callback_form_block" ADD COLUMN "notifyTelegramIds" JSONB;
ALTER TABLE "callback_form_block" ADD COLUMN "notifyMaxIds" JSONB;

UPDATE "callback_form_block"
SET
  "notifyEmails" = CASE
    WHEN "recipientEmail" IS NOT NULL AND TRIM("recipientEmail") <> '' THEN jsonb_build_array(TRIM("recipientEmail"))
    ELSE '[]'::jsonb
  END,
  "notifyTelegramIds" = CASE
    WHEN "telegramChatId" IS NOT NULL AND TRIM("telegramChatId") <> '' THEN jsonb_build_array(TRIM("telegramChatId"))
    ELSE '[]'::jsonb
  END,
  "notifyMaxIds" = '[]'::jsonb;

ALTER TABLE "callback_form_block" DROP COLUMN "recipientEmail";
ALTER TABLE "callback_form_block" DROP COLUMN "telegramChatId";

ALTER TABLE "quote_form_block" ADD COLUMN "notifyEmails" JSONB;
ALTER TABLE "quote_form_block" ADD COLUMN "notifyTelegramIds" JSONB;
ALTER TABLE "quote_form_block" ADD COLUMN "notifyMaxIds" JSONB;

UPDATE "quote_form_block"
SET
  "notifyEmails" = CASE
    WHEN "recipientEmail" IS NOT NULL AND TRIM("recipientEmail") <> '' THEN jsonb_build_array(TRIM("recipientEmail"))
    ELSE '[]'::jsonb
  END,
  "notifyTelegramIds" = CASE
    WHEN "telegramChatId" IS NOT NULL AND TRIM("telegramChatId") <> '' THEN jsonb_build_array(TRIM("telegramChatId"))
    ELSE '[]'::jsonb
  END,
  "notifyMaxIds" = '[]'::jsonb;

ALTER TABLE "quote_form_block" DROP COLUMN "recipientEmail";
ALTER TABLE "quote_form_block" DROP COLUMN "telegramChatId";

-- Quiz: MAX messenger chat IDs
ALTER TABLE "quiz_landings" ADD COLUMN "notifyMaxIds" JSONB;

-- Orders and feedback external notification channels
CREATE TABLE "external_notify_settings" (
  "id" TEXT NOT NULL DEFAULT 'main',
  "orderNotifyEmails" JSONB,
  "orderNotifyTelegramIds" JSONB,
  "orderNotifyMaxIds" JSONB,
  "knowledgeFeedbackNotifyEmails" JSONB,
  "knowledgeFeedbackNotifyTelegramIds" JSONB,
  "knowledgeFeedbackNotifyMaxIds" JSONB,
  "siteFeedbackNotifyEmails" JSONB,
  "siteFeedbackNotifyTelegramIds" JSONB,
  "siteFeedbackNotifyMaxIds" JSONB,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "external_notify_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "external_notify_settings" ("id", "updatedAt") VALUES ('main', CURRENT_TIMESTAMP);
