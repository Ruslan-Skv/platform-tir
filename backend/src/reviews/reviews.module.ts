import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OriginGuard } from '../common/guards/origin.guard';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { DatabaseModule } from '../database/database.module';
import { BellPushModule } from '../bell-push/bell-push.module';
import { ExternalNotifyModule } from '../external-notify/external-notify.module';

@Module({
  imports: [ConfigModule, DatabaseModule, BellPushModule, ExternalNotifyModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, OriginGuard],
  exports: [ReviewsService],
})
export class ReviewsModule {}
