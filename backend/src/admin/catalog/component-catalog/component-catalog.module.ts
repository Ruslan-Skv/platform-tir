import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { ComponentCatalogKindsModule } from '../../../products/component-catalog-kinds.module';
import { ComponentCatalogController } from './component-catalog.controller';
import { ComponentCatalogGroupsController } from './component-catalog-groups.controller';
import { ComponentCatalogSeriesController } from './component-catalog-series.controller';
import { ComponentCatalogKindsController } from './component-catalog-kinds.controller';
import { ComponentCatalogService } from './component-catalog.service';
import { ComponentCatalogGroupsService } from './component-catalog-groups.service';
import { ComponentCatalogSeriesService } from './component-catalog-series.service';

@Module({
  imports: [DatabaseModule, ComponentCatalogKindsModule],
  controllers: [
    ComponentCatalogController,
    ComponentCatalogGroupsController,
    ComponentCatalogSeriesController,
    ComponentCatalogKindsController,
  ],
  providers: [
    ComponentCatalogService,
    ComponentCatalogGroupsService,
    ComponentCatalogSeriesService,
  ],
  exports: [
    ComponentCatalogService,
    ComponentCatalogGroupsService,
    ComponentCatalogSeriesService,
    ComponentCatalogKindsModule,
  ],
})
export class ComponentCatalogModule {}
