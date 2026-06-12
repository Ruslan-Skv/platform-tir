import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ServiceCatalogService } from './service-catalog.service';
import { ServiceCatalogBlockService } from './service-catalog-block.service';
import { ServiceCatalogCategoriesService } from './service-catalog-categories.service';
import { ServiceCatalogItemsService } from './service-catalog-items.service';
import { ServiceCatalogPublicService } from './service-catalog-public.service';
import { ServiceCatalogController } from './service-catalog.controller';
import { ServiceCatalogPublicController } from './service-catalog-public.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [ServiceCatalogController, ServiceCatalogPublicController],
  providers: [
    ServiceCatalogService,
    ServiceCatalogBlockService,
    ServiceCatalogCategoriesService,
    ServiceCatalogItemsService,
    ServiceCatalogPublicService,
  ],
  exports: [ServiceCatalogService],
})
export class ServiceCatalogModule {}
