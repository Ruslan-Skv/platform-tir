-- QR-код для оплаты на странице подписания (картинка из карточки исполнителя).
ALTER TABLE "contract_document_signing_sessions" ADD COLUMN "paymentQrUrl" TEXT;
