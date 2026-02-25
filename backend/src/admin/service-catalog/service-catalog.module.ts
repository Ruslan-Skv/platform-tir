import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ServiceCatalogService } from './service-catalog.service';
import { ServiceCatalogController } from './service-catalog.controller';
import { ServiceCatalogPublicController } from './service-catalog-public.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [ServiceCatalogController, ServiceCatalogPublicController],
  providers: [ServiceCatalogService],
  exports: [ServiceCatalogService],
})
export class ServiceCatalogModule {}
