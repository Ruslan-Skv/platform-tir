import { Module } from '@nestjs/common';
import { CustomersModule } from './customers/customers.module';
import { TasksModule } from './tasks/tasks.module';
import { PagesModule } from './pages/pages.module';
import { BlogModule } from './blog/blog.module';
import { ManufacturersModule } from './catalog/manufacturers/manufacturers.module';
import { AttributesModule } from './catalog/attributes/attributes.module';
import { SuppliersModule } from './catalog/suppliers/suppliers.module';
import { PartnersModule } from './partners/partners.module';
import { AdminProductsModule } from './catalog/products/admin-products.module';
import { AdminOrdersModule } from './orders/admin-orders.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AdminReviewsModule } from './reviews/admin-reviews.module';
import { AdminNotificationsModule } from './notifications/admin-notifications.module';
import { AdminFormsModule } from './forms/admin-forms.module';
import { PhotoModule } from './photo/photo.module';
import { PromotionModule } from './promotions/promotion.module';
import { UserCabinetModule } from './user-cabinet/user-cabinet.module';

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
    PartnersModule,
    AdminProductsModule,
    // Orders
    AdminOrdersModule,
    AdminReviewsModule,
    AdminNotificationsModule,
    AdminFormsModule,
    PhotoModule,
    PromotionModule,
    UserCabinetModule,
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
    PartnersModule,
    AdminProductsModule,
    AdminOrdersModule,
    AdminReviewsModule,
    AdminNotificationsModule,
    AdminFormsModule,
    PhotoModule,
    PromotionModule,
    UserCabinetModule,
    AnalyticsModule,
  ],
})
export class AdminModule {}
