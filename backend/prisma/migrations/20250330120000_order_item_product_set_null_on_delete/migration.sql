-- Позволяет удалять товар из каталога: позиции заказа сохраняются, связь с товаром обнуляется
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_productId_fkey";

ALTER TABLE "order_items" ALTER COLUMN "productId" DROP NOT NULL;

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
