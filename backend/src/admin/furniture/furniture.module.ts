import { Module } from '@nestjs/common';
import { FurnitureService } from './furniture.service';
import { FurnitureController } from './furniture.controller';
import { FurniturePublicController } from './furniture-public.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [FurnitureController, FurniturePublicController],
  providers: [FurnitureService],
  exports: [FurnitureService],
})
export class FurnitureModule {}
