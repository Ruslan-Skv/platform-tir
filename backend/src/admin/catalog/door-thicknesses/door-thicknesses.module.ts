import { Module } from '@nestjs/common';
import { DoorThicknessesService } from './door-thicknesses.service';
import { DoorThicknessesController } from './door-thicknesses.controller';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [DoorThicknessesController],
  providers: [DoorThicknessesService],
  exports: [DoorThicknessesService],
})
export class DoorThicknessesModule {}
