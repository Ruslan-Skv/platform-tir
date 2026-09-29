import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { BellPushModule } from '../bell-push/bell-push.module';
import { ExternalNotifyModule } from '../external-notify/external-notify.module';
import { ContractConcludedNotifyService } from './contract-concluded-notify.service';

@Module({
  imports: [DatabaseModule, BellPushModule, ExternalNotifyModule],
  providers: [ContractConcludedNotifyService],
  exports: [ContractConcludedNotifyService],
})
export class ContractConcludedNotifyModule {}
