-- AlterTable: добавить роли, которым разрешено оформлять заказ для клиента (настраивается в Настройки → Доставка)
ALTER TABLE "delivery_config" ADD COLUMN IF NOT EXISTS "rolesAllowedOrderForCustomer" JSONB;
