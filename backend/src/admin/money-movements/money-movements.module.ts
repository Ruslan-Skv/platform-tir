import { Module } from '@nestjs/common';

import { BellPushModule } from '../../bell-push/bell-push.module';
import { DatabaseModule } from '../../database/database.module';
import { IncassationNotifyService } from './incassation-notify.service';
import { MoneyMovementsController } from './money-movements.controller';
import { MoneyMovementsService } from './money-movements.service';

@Module({
  imports: [DatabaseModule, BellPushModule],
  controllers: [MoneyMovementsController],
  providers: [MoneyMovementsService, IncassationNotifyService],
  exports: [MoneyMovementsService],
})
export class MoneyMovementsModule {}
