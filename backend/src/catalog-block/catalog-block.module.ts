import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CatalogBlockController } from './catalog-block.controller';
import { CatalogBlockService } from './catalog-block.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CatalogBlockController],
  providers: [CatalogBlockService],
  exports: [CatalogBlockService],
})
export class CatalogBlockModule {}
