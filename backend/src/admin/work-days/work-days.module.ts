import { Module } from '@nestjs/common';
import { BellPushModule } from '../../bell-push/bell-push.module';
import { DatabaseModule } from '../../database/database.module';
import { ExternalNotifyModule } from '../../external-notify/external-notify.module';
import { WorkDayNotifyService } from './services/work-day-notify.service';
import { WorkDaysController } from './work-days.controller';
import { WorkDaysService } from './work-days.service';

@Module({
  imports: [DatabaseModule, BellPushModule, ExternalNotifyModule],
  controllers: [WorkDaysController],
  providers: [WorkDaysService, WorkDayNotifyService],
  exports: [WorkDaysService],
})
export class WorkDaysModule {}
