import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesCrudService } from './services/categories-crud.service';
import { CategoriesAttributesService } from './services/categories-attributes.service';
import { CategoriesController, AttributesPublicController } from './categories.controller';

@Module({
  controllers: [CategoriesController, AttributesPublicController],
  providers: [CategoriesService, CategoriesCrudService, CategoriesAttributesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
