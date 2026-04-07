import { Module } from '@nestjs/common';
import { CanvasTypesService } from './canvas-types.service';
import { CanvasTypesController } from './canvas-types.controller';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CanvasTypesController],
  providers: [CanvasTypesService],
  exports: [CanvasTypesService],
})
export class CanvasTypesModule {}
