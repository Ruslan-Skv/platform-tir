import { Module } from '@nestjs/common';
import { CatalogFilterBlocksModule } from '../catalog-filter-blocks/catalog-filter-blocks.module';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductComponentsService } from './product-components.service';
import { ProductComponentsController } from './product-components.controller';
import { PriceScraperService } from './price-scraper.service';

@Module({
  imports: [CatalogFilterBlocksModule],
  controllers: [ProductsController, ProductComponentsController],
  providers: [ProductsService, ProductComponentsService, PriceScraperService],
  exports: [ProductsService, ProductComponentsService, PriceScraperService],
})
export class ProductsModule {}
