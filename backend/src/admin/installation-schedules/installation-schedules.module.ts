import { Module } from '@nestjs/common';
import { BellPushModule } from '../../bell-push/bell-push.module';
import { DatabaseModule } from '../../database/database.module';
import { ExternalNotifyModule } from '../../external-notify/external-notify.module';
import { InstallationScheduleNotifyService } from './installation-schedule-notify.service';
import { InstallationSchedulesController } from './installation-schedules.controller';
import { InstallationSchedulesService } from './installation-schedules.service';
import { InstallationSchedulesTrashService } from './installation-schedules-trash.service';

@Module({
  imports: [DatabaseModule, BellPushModule, ExternalNotifyModule],
  controllers: [InstallationSchedulesController],
  providers: [
    InstallationSchedulesService,
    InstallationSchedulesTrashService,
    InstallationScheduleNotifyService,
  ],
  exports: [InstallationSchedulesService],
})
export class InstallationSchedulesModule {}
