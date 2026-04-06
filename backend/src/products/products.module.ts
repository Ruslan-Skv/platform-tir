import { Module } from '@nestjs/common';
import { CatalogFilterBlocksModule } from '../catalog-filter-blocks/catalog-filter-blocks.module';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductComponentsService } from './product-components.service';
import { ProductComponentsController } from './product-components.controller';
import { PriceScraperService } from './price-scraper.service';
import { ProductCardBadgesService } from './product-card-badges.service';
import { ProductCardBadgesController } from './product-card-badges.controller';
import { AdminProductCardBadgesController } from './admin-product-card-badges.controller';

@Module({
  imports: [CatalogFilterBlocksModule],
  controllers: [
    ProductsController,
    ProductComponentsController,
    ProductCardBadgesController,
    AdminProductCardBadgesController,
  ],
  providers: [
    ProductsService,
    ProductComponentsService,
    PriceScraperService,
    ProductCardBadgesService,
  ],
  exports: [
    ProductsService,
    ProductComponentsService,
    PriceScraperService,
    ProductCardBadgesService,
  ],
})
export class ProductsModule {}
