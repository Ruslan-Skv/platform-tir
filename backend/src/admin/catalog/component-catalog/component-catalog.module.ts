import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { ComponentCatalogController } from './component-catalog.controller';
import { ComponentCatalogGroupsController } from './component-catalog-groups.controller';
import { ComponentCatalogSeriesController } from './component-catalog-series.controller';
import { ComponentCatalogService } from './component-catalog.service';
import { ComponentCatalogGroupsService } from './component-catalog-groups.service';
import { ComponentCatalogSeriesService } from './component-catalog-series.service';

@Module({
  imports: [DatabaseModule],
  controllers: [
    ComponentCatalogController,
    ComponentCatalogGroupsController,
    ComponentCatalogSeriesController,
  ],
  providers: [
    ComponentCatalogService,
    ComponentCatalogGroupsService,
    ComponentCatalogSeriesService,
  ],
  exports: [ComponentCatalogService, ComponentCatalogGroupsService, ComponentCatalogSeriesService],
})
export class ComponentCatalogModule {}
