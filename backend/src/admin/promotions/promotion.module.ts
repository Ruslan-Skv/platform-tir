import { Module } from '@nestjs/common';
import { PromotionService } from './promotion.service';
import { PromotionController } from './promotion.controller';
import { PromotionPublicController } from './promotion-public.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PromotionController, PromotionPublicController],
  providers: [PromotionService],
  exports: [PromotionService],
})
export class PromotionModule {}
