import { Module } from '@nestjs/common';
import { CatalogFilterBlocksModule } from '../../catalog-filter-blocks/catalog-filter-blocks.module';
import { PublicCatalogService } from './public-catalog.service';
import { PublicCatalogQueryService } from './public-catalog-query.service';
import { PublicCatalogFiltersService } from './public-catalog-filters.service';
import { PublicCatalogCardsService } from './public-catalog-cards.service';

@Module({
  imports: [CatalogFilterBlocksModule],
  providers: [
    PublicCatalogService,
    PublicCatalogQueryService,
    PublicCatalogFiltersService,
    PublicCatalogCardsService,
  ],
  exports: [PublicCatalogService],
})
export class PublicCatalogModule {}
