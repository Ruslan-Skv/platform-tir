import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { AdminBellPushService } from './admin-bell-push.service';
import { AdminNotificationSettingsReaderService } from './admin-notification-settings-reader.service';
import { AdminPushSubscriptionsService } from './admin-push-subscriptions.service';

@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [
    AdminNotificationSettingsReaderService,
    AdminPushSubscriptionsService,
    AdminBellPushService,
  ],
  exports: [
    AdminNotificationSettingsReaderService,
    AdminPushSubscriptionsService,
    AdminBellPushService,
  ],
})
export class BellPushModule {}
