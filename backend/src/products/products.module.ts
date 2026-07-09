import { Module } from '@nestjs/common';
import { CatalogFilterBlocksModule } from '../catalog-filter-blocks/catalog-filter-blocks.module';
import { ComponentCatalogKindsModule } from './component-catalog-kinds.module';
import { ProductsService } from './products.service';
import { ProductsCatalogQueryService } from './products-catalog-query.service';
import { ProductsSearchIndexService } from './products-search-index.service';
import { ProductsSupplierPricesService } from './products-supplier-prices.service';
import { ProductsReadService } from './services/products-read.service';
import { ProductsMutationsService } from './services/products-mutations.service';
import { ProductsController } from './products.controller';
import { ProductComponentsService } from './product-components.service';
import { ProductComponentsController } from './product-components.controller';
import { PriceScraperService } from './price-scraper.service';
import { ProductCardBadgesService } from './product-card-badges.service';
import { ProductCardBadgesController } from './product-card-badges.controller';
import { AdminProductCardBadgesController } from './admin-product-card-badges.controller';
import { PublicCatalogModule } from './public-catalog/public-catalog.module';

@Module({
  imports: [CatalogFilterBlocksModule, PublicCatalogModule, ComponentCatalogKindsModule],
  controllers: [
    ProductsController,
    ProductComponentsController,
    ProductCardBadgesController,
    AdminProductCardBadgesController,
  ],
  providers: [
    ProductsService,
    ProductsReadService,
    ProductsMutationsService,
    ProductsCatalogQueryService,
    ProductsSearchIndexService,
    ProductsSupplierPricesService,
    ProductComponentsService,
    PriceScraperService,
    ProductCardBadgesService,
  ],
  exports: [
    ProductsService,
    ProductComponentsService,
    PriceScraperService,
    ProductCardBadgesService,
    PublicCatalogModule,
  ],
})
export class ProductsModule {}
