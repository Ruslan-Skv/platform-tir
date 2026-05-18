-- Allow CRM customers without e-mail (no placeholder addresses).
ALTER TABLE "customers" ALTER COLUMN "email" DROP NOT NULL;
