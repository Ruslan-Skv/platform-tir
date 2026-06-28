import { Module } from '@nestjs/common';
import { BellPushModule } from '../../bell-push/bell-push.module';
import { DatabaseModule } from '../../database/database.module';
import { AdminExternalNotifyService } from '../external-notify/admin-external-notify.service';
import { AdminNotificationsController } from './admin-notifications.controller';
import { AdminNotificationsService } from './admin-notifications.service';

@Module({
  imports: [DatabaseModule, BellPushModule],
  controllers: [AdminNotificationsController],
  providers: [AdminNotificationsService, AdminExternalNotifyService],
  exports: [AdminNotificationsService, BellPushModule],
})
export class AdminNotificationsModule {}
