import { PartialType } from '@nestjs/swagger';
import { CreateComponentCatalogGroupDto } from './create-component-catalog-group.dto';

export class UpdateComponentCatalogGroupDto extends PartialType(CreateComponentCatalogGroupDto) {}
