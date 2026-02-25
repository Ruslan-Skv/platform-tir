import { PartialType } from '@nestjs/mapped-types';
import { CreateServiceCatalogCategoryDto } from './create-service-catalog-category.dto';

export class UpdateServiceCatalogCategoryDto extends PartialType(CreateServiceCatalogCategoryDto) {}
