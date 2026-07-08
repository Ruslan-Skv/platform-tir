import { PartialType } from '@nestjs/swagger';
import { CreateComponentCatalogItemDto } from './create-component-catalog-item.dto';

export class UpdateComponentCatalogItemDto extends PartialType(CreateComponentCatalogItemDto) {}
