import { Module } from '@nestjs/common';
import { FeaturedProductsService } from './featured-products.service';
import {
  FeaturedProductsController,
  AdminFeaturedProductsController,
} from './featured-products.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [FeaturedProductsController, AdminFeaturedProductsController],
  providers: [FeaturedProductsService],
  exports: [FeaturedProductsService],
})
export class FeaturedProductsModule {}
