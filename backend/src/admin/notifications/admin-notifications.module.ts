import { Module } from '@nestjs/common';
import { BellPushModule } from '../../bell-push/bell-push.module';
import { AdminNotificationsController } from './admin-notifications.controller';
import { AdminNotificationsService } from './admin-notifications.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule, BellPushModule],
  controllers: [AdminNotificationsController],
  providers: [AdminNotificationsService],
  exports: [AdminNotificationsService, BellPushModule],
})
export class AdminNotificationsModule {}
