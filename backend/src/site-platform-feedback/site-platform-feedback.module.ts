import { Module } from '@nestjs/common';
import { BellPushModule } from '../bell-push/bell-push.module';
import { DatabaseModule } from '../database/database.module';
import { OriginGuard } from '../common/guards/origin.guard';
import { SitePlatformFeedbackAdminController } from './site-platform-feedback-admin.controller';
import { SitePlatformFeedbackController } from './site-platform-feedback.controller';
import { SitePlatformFeedbackService } from './site-platform-feedback.service';

@Module({
  imports: [DatabaseModule, BellPushModule],
  controllers: [SitePlatformFeedbackController, SitePlatformFeedbackAdminController],
  providers: [SitePlatformFeedbackService, OriginGuard],
  exports: [SitePlatformFeedbackService],
})
export class SitePlatformFeedbackModule {}
