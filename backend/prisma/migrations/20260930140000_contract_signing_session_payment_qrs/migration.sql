-- QR-коды для оплаты: до двух картинок с заголовками (вместо одиночного paymentQrUrl).
ALTER TABLE "contract_document_signing_sessions" DROP COLUMN "paymentQrUrl";
ALTER TABLE "contract_document_signing_sessions" ADD COLUMN "paymentQrs" JSONB;
