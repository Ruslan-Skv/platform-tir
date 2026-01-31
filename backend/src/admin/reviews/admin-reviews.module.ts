import { Module } from '@nestjs/common';
import { AdminReviewsController } from './admin-reviews.controller';
import { ReviewsModule } from '../../reviews/reviews.module';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [ReviewsModule, DatabaseModule],
  controllers: [AdminReviewsController],
})
export class AdminReviewsModule {}
