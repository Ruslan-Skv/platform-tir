-- CreateTable
CREATE TABLE "admin_dashboard_quick_links" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL DEFAULT 'main',
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_dashboard_quick_links_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_dashboard_quick_links_blockId_sortOrder_idx" ON "admin_dashboard_quick_links"("blockId", "sortOrder");

ALTER TABLE "admin_dashboard_quick_links" ADD CONSTRAINT "admin_dashboard_quick_links_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "admin_dashboard_block"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "admin_dashboard_quick_links" ("id", "blockId", "label", "href", "sortOrder", "updatedAt")
VALUES
    ('dashlink_default_knowledge', 'main', 'Территория знаний', '/admin/knowledge', 0, CURRENT_TIMESTAMP),
    ('dashlink_default_products', 'main', 'Каталог товаров', '/admin/catalog/products', 1, CURRENT_TIMESTAMP),
    ('dashlink_default_categories', 'main', 'Категории', '/admin/catalog/categories', 2, CURRENT_TIMESTAMP),
    ('dashlink_default_orders', 'main', 'Заказы', '/admin/orders', 3, CURRENT_TIMESTAMP);
