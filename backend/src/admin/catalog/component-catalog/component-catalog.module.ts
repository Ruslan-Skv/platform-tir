import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { ComponentCatalogController } from './component-catalog.controller';
import { ComponentCatalogGroupsController } from './component-catalog-groups.controller';
import { ComponentCatalogService } from './component-catalog.service';
import { ComponentCatalogGroupsService } from './component-catalog-groups.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ComponentCatalogController, ComponentCatalogGroupsController],
  providers: [ComponentCatalogService, ComponentCatalogGroupsService],
  exports: [ComponentCatalogService, ComponentCatalogGroupsService],
})
export class ComponentCatalogModule {}
