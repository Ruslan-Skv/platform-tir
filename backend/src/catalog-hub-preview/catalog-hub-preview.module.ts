import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { CatalogHubPreviewAdminController } from './catalog-hub-preview-admin.controller';
import { CatalogHubPreviewPublicController } from './catalog-hub-preview-public.controller';
import { CatalogHubPreviewService } from './catalog-hub-preview.service';

@Module({
  imports: [ProductsModule],
  controllers: [CatalogHubPreviewAdminController, CatalogHubPreviewPublicController],
  providers: [CatalogHubPreviewService],
  exports: [CatalogHubPreviewService],
})
export class CatalogHubPreviewModule {}
