import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController, AttributesPublicController } from './categories.controller';

@Module({
  controllers: [CategoriesController, AttributesPublicController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
