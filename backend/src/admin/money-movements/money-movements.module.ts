import { Module } from '@nestjs/common';

import { BellPushModule } from '../../bell-push/bell-push.module';
import { DatabaseModule } from '../../database/database.module';
import { IncassationNotifyService } from './incassation-notify.service';
import { ManualEntriesService } from './manual-entries.service';
import { ManagerIncassationsService } from './manager-incassations.service';
import { MoneyMovementsController } from './money-movements.controller';
import { MoneyMovementsService } from './money-movements.service';
import { SalesTotalsNotifyService } from './sales-totals-notify.service';

@Module({
  imports: [DatabaseModule, BellPushModule],
  controllers: [MoneyMovementsController],
  providers: [
    MoneyMovementsService,
    ManualEntriesService,
    IncassationNotifyService,
    ManagerIncassationsService,
    SalesTotalsNotifyService,
  ],
  exports: [MoneyMovementsService, ManualEntriesService],
})
export class MoneyMovementsModule {}
