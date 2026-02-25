import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OriginGuard } from '../common/guards/origin.guard';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, OriginGuard],
  exports: [ReviewsService],
})
export class ReviewsModule {}
