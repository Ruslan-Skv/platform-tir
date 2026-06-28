import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { BellPushModule } from '../bell-push/bell-push.module';
import { ExternalNotifyModule } from '../external-notify/external-notify.module';
import { OriginGuard } from '../common/guards/origin.guard';
import { FormNotifierService } from './form-notifier.service';
import { FormsController } from './forms.controller';
import { FormsService } from './forms.service';

@Module({
  imports: [ConfigModule, DatabaseModule, BellPushModule, ExternalNotifyModule],
  controllers: [FormsController],
  providers: [FormsService, FormNotifierService, OriginGuard],
  exports: [FormsService],
})
export class FormsModule {}
