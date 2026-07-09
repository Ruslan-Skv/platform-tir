import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ComponentCatalogKindsService } from './services/component-catalog-kinds.service';

@Module({
  imports: [DatabaseModule],
  providers: [ComponentCatalogKindsService],
  exports: [ComponentCatalogKindsService],
})
export class ComponentCatalogKindsModule {}
