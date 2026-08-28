import { Module } from '@nestjs/common';
import { BellPushModule } from '../../bell-push/bell-push.module';
import { DatabaseModule } from '../../database/database.module';
import { AdminBellDismissedService } from './admin-bell-dismissed.service';
import { AdminBellTrainingFeedService } from './admin-bell-training-feed.service';
import { AdminBellWorkDayFeedService } from './admin-bell-work-day-feed.service';
import { AdminBellWaybillFeedService } from './admin-bell-waybill-feed.service';
import { AdminBellInstallationScheduleFeedService } from './admin-bell-installation-schedule-feed.service';
import { AdminBellRepairScheduleFeedService } from './admin-bell-repair-schedule-feed.service';
import { AdminBellFurnitureScheduleFeedService } from './admin-bell-furniture-schedule-feed.service';
import { AdminBellCalendarFeedService } from './admin-bell-calendar-feed.service';
import { AdminBellMessengerFeedService } from './admin-bell-messenger-feed.service';
import { AdminBellKanbanFeedService } from './admin-bell-kanban-feed.service';
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
    AdminBellWorkDayFeedService,
    AdminBellWaybillFeedService,
    AdminBellInstallationScheduleFeedService,
    AdminBellRepairScheduleFeedService,
    AdminBellFurnitureScheduleFeedService,
    AdminBellCalendarFeedService,
    AdminBellMessengerFeedService,
    AdminBellKanbanFeedService,
  ],
  exports: [AdminNotificationsService, BellPushModule],
})
export class AdminNotificationsModule {}
