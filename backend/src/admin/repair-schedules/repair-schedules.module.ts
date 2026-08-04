import { Module } from '@nestjs/common';
import { BellPushModule } from '../../bell-push/bell-push.module';
import { DatabaseModule } from '../../database/database.module';
import { ExternalNotifyModule } from '../../external-notify/external-notify.module';
import { RepairScheduleNotifyService } from './repair-schedule-notify.service';
import { RepairSchedulesController } from './repair-schedules.controller';
import { RepairSchedulesService } from './repair-schedules.service';

@Module({
  imports: [DatabaseModule, BellPushModule, ExternalNotifyModule],
  controllers: [RepairSchedulesController],
  providers: [RepairSchedulesService, RepairScheduleNotifyService],
  exports: [RepairSchedulesService],
})
export class RepairSchedulesModule {}
