import { Module } from '@nestjs/common';
import { AdminNotificationsController } from './admin-notifications.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminNotificationsController],
})
export class AdminNotificationsModule {}
