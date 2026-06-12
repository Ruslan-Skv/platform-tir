import { Module } from '@nestjs/common';
import { MeasurementsService } from './measurements.service';
import { MeasurementsCrudService } from './measurements-crud.service';
import { MeasurementsHistoryService } from './measurements-history.service';
import { MeasurementsController } from './measurements.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [MeasurementsController],
  providers: [MeasurementsService, MeasurementsCrudService, MeasurementsHistoryService],
  exports: [MeasurementsService],
})
export class MeasurementsModule {}
