import { Module } from '@nestjs/common';
import { CustomersModule } from './customers/customers.module';
import { CrmDirectionsModule } from './crm-directions/crm-directions.module';
import { MeasurementsModule } from './measurements/measurements.module';
import { ContractsModule } from './contracts/contracts.module';
import { ContractPaymentsModule } from './contract-payments/contract-payments.module';
import { OfficesModule } from './offices/offices.module';
import { ComplexObjectsModule } from './complex-objects/complex-objects.module';
import { TasksModule } from './tasks/tasks.module';
import { PagesModule } from './pages/pages.module';
import { BlogModule } from './blog/blog.module';
import { ManufacturersModule } from './catalog/manufacturers/manufacturers.module';
import { CoatingMaterialsModule } from './catalog/coating-materials/coating-materials.module';
import { CanvasTypesModule } from './catalog/canvas-types/canvas-types.module';
import { DoorThicknessesModule } from './catalog/door-thicknesses/door-thicknesses.module';
import { WeatherstripsModule } from './catalog/weatherstrips/weatherstrips.module';
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
import { AdminCatalogBlockModule } from './catalog-block/admin-catalog-block.module';
import { AdminAccessModule } from './admin-access/admin-access.module';
import { AdminPresenceModule } from './admin-presence/admin-presence.module';
import { AdminDashboardModule } from './dashboard/admin-dashboard.module';
import { OfficeCashModule } from './office-cash/office-cash.module';
import { ServiceCatalogModule } from './service-catalog/service-catalog.module';
import { ContractDocumentObjectsModule } from './contract-document-objects/contract-document-objects.module';
import { ContractDocumentPackagesModule } from './contract-document-packages/contract-document-packages.module';
import { InstallersModule } from './installers/installers.module';

@Module({
  imports: [
    AdminAccessModule,
    AdminPresenceModule,
    AdminDashboardModule,
    OfficeCashModule,
    // CRM
    CustomersModule,
    CrmDirectionsModule,
    InstallersModule,
    MeasurementsModule,
    ContractsModule,
    ContractPaymentsModule,
    OfficesModule,
    ComplexObjectsModule,
    TasksModule,
    // CMS
    PagesModule,
    BlogModule,
    // Catalog
    ManufacturersModule,
    CoatingMaterialsModule,
    CanvasTypesModule,
    DoorThicknessesModule,
    WeatherstripsModule,
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
    AdminCatalogBlockModule,
    ServiceCatalogModule,
    ContractDocumentObjectsModule,
    ContractDocumentPackagesModule,
    // Analytics
    AnalyticsModule,
  ],
  exports: [
    AdminAccessModule,
    OfficeCashModule,
    CustomersModule,
    CrmDirectionsModule,
    InstallersModule,
    MeasurementsModule,
    ContractsModule,
    ContractPaymentsModule,
    OfficesModule,
    ComplexObjectsModule,
    TasksModule,
    PagesModule,
    BlogModule,
    ManufacturersModule,
    CoatingMaterialsModule,
    CanvasTypesModule,
    DoorThicknessesModule,
    WeatherstripsModule,
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
    AdminCatalogBlockModule,
    ServiceCatalogModule,
    ContractDocumentObjectsModule,
    ContractDocumentPackagesModule,
    AnalyticsModule,
  ],
})
export class AdminModule {}
