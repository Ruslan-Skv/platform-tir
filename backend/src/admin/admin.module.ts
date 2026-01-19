import { Module } from '@nestjs/common';
import { CustomersModule } from './customers/customers.module';
import { TasksModule } from './tasks/tasks.module';
import { PagesModule } from './pages/pages.module';
import { BlogModule } from './blog/blog.module';
import { ManufacturersModule } from './catalog/manufacturers/manufacturers.module';
import { AttributesModule } from './catalog/attributes/attributes.module';
import { SuppliersModule } from './catalog/suppliers/suppliers.module';
import { AdminProductsModule } from './catalog/products/admin-products.module';
import { AdminOrdersModule } from './orders/admin-orders.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    // CRM
    CustomersModule,
    TasksModule,
    // CMS
    PagesModule,
    BlogModule,
    // Catalog
    ManufacturersModule,
    AttributesModule,
    SuppliersModule,
    AdminProductsModule,
    // Orders
    AdminOrdersModule,
    // Analytics
    AnalyticsModule,
  ],
  exports: [
    CustomersModule,
    TasksModule,
    PagesModule,
    BlogModule,
    ManufacturersModule,
    AttributesModule,
    SuppliersModule,
    AdminProductsModule,
    AdminOrdersModule,
    AnalyticsModule,
  ],
})
export class AdminModule {}
