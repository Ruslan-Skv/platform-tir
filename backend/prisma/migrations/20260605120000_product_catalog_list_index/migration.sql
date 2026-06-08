-- Index for public catalog list queries: filter by category + active, sort by sortOrder
CREATE INDEX "products_categoryId_isActive_sortOrder_idx" ON "products"("categoryId", "isActive", "sortOrder");
