import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { DatabaseModule } from '../database/database.module';
import { ExternalNotifyService } from './external-notify.service';
import { ExternalNotifySettingsService } from './external-notify-settings.service';

@Module({
  imports: [ConfigModule, MailerModule, DatabaseModule],
  providers: [ExternalNotifyService, ExternalNotifySettingsService],
  exports: [ExternalNotifyService, ExternalNotifySettingsService],
})
export class ExternalNotifyModule {}
