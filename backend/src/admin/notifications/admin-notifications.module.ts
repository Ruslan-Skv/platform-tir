import { Module } from '@nestjs/common';
import { BellPushModule } from '../../bell-push/bell-push.module';
import { DatabaseModule } from '../../database/database.module';
import { AdminBellDismissedService } from './admin-bell-dismissed.service';
import { AdminBellTrainingFeedService } from './admin-bell-training-feed.service';
import { AdminExternalNotifyService } from '../external-notify/admin-external-notify.service';
import { AdminNotificationsController } from './admin-notifications.controller';
import { AdminNotificationsService } from './admin-notifications.service';

@Module({
  imports: [DatabaseModule, BellPushModule],
  controllers: [AdminNotificationsController],
  providers: [
    AdminNotificationsService,
    AdminExternalNotifyService,
    AdminBellDismissedService,
    AdminBellTrainingFeedService,
  ],
  exports: [AdminNotificationsService, BellPushModule],
})
export class AdminNotificationsModule {}
