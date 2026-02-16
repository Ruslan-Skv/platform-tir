import { Module } from '@nestjs/common';
import { CatalogBlockModule } from '../../catalog-block/catalog-block.module';
import { AdminCatalogBlockController } from './admin-catalog-block.controller';

@Module({
  imports: [CatalogBlockModule],
  controllers: [AdminCatalogBlockController],
})
export class AdminCatalogBlockModule {}
