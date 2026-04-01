import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CatalogFilterBlocksService } from './catalog-filter-blocks.service';
import { CatalogFilterBlocksAdminController } from './catalog-filter-blocks-admin.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [CatalogFilterBlocksAdminController],
  providers: [CatalogFilterBlocksService],
  exports: [CatalogFilterBlocksService],
})
export class CatalogFilterBlocksModule {}
