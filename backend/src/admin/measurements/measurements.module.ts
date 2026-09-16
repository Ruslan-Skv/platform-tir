import { Module } from '@nestjs/common';
import { BellPushModule } from '../../bell-push/bell-push.module';
import { ExternalNotifyModule } from '../../external-notify/external-notify.module';
import { MeasurementsService } from './measurements.service';
import { MeasurementsCrudService } from './measurements-crud.service';
import { MeasurementsHistoryService } from './measurements-history.service';
import { MeasurementsPhotosService } from './measurements-photos.service';
import { MeasurementsController } from './measurements.controller';
import { MeasurementNotifyService } from './measurement-notify.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule, BellPushModule, ExternalNotifyModule],
  controllers: [MeasurementsController],
  providers: [
    MeasurementsService,
    MeasurementsCrudService,
    MeasurementsHistoryService,
    MeasurementsPhotosService,
    MeasurementNotifyService,
  ],
  exports: [MeasurementsService, MeasurementsCrudService],
})
export class MeasurementsModule {}
