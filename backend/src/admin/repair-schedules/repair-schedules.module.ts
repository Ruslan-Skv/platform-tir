import { Module } from '@nestjs/common';
import { BellPushModule } from '../../bell-push/bell-push.module';
import { DatabaseModule } from '../../database/database.module';
import { ExternalNotifyModule } from '../../external-notify/external-notify.module';
import { InstallerSettlementsModule } from '../installer-settlements/installer-settlements.module';
import { RepairScheduleFromPackageService } from './repair-schedule-from-package.service';
import { RepairScheduleNotifyService } from './repair-schedule-notify.service';
import { RepairScheduleRowEnrichmentService } from './repair-schedule-row-enrichment.service';
import { RepairSchedulesTrashService } from './repair-schedules-trash.service';
import { RepairSchedulesController } from './repair-schedules.controller';
import { RepairSchedulesService } from './repair-schedules.service';

@Module({
  imports: [DatabaseModule, BellPushModule, ExternalNotifyModule, InstallerSettlementsModule],
  controllers: [RepairSchedulesController],
  providers: [
    RepairSchedulesService,
    RepairScheduleFromPackageService,
    RepairScheduleNotifyService,
    RepairSchedulesTrashService,
    RepairScheduleRowEnrichmentService,
  ],
  exports: [RepairSchedulesService, RepairScheduleFromPackageService],
})
export class RepairSchedulesModule {}
