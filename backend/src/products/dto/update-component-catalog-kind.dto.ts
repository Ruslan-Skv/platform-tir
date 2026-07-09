import { PartialType } from '@nestjs/mapped-types';
import { CreateComponentCatalogKindDto } from './create-component-catalog-kind.dto';

export class UpdateComponentCatalogKindDto extends PartialType(CreateComponentCatalogKindDto) {}
