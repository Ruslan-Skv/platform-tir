import { Module } from '@nestjs/common';
import { BellPushModule } from '../../bell-push/bell-push.module';
import { DatabaseModule } from '../../database/database.module';
import { ExternalNotifyModule } from '../../external-notify/external-notify.module';
import { FurnitureScheduleNotifyService } from './furniture-schedule-notify.service';
import { FurnitureSchedulesImportService } from './furniture-schedules-import.service';
import { FurnitureSchedulesController } from './furniture-schedules.controller';
import { FurnitureSchedulesService } from './furniture-schedules.service';

@Module({
  imports: [DatabaseModule, BellPushModule, ExternalNotifyModule],
  controllers: [FurnitureSchedulesController],
  providers: [
    FurnitureSchedulesService,
    FurnitureScheduleNotifyService,
    FurnitureSchedulesImportService,
  ],
  exports: [FurnitureSchedulesService],
})
export class FurnitureSchedulesModule {}
