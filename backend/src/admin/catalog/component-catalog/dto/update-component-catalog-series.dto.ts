import { PartialType } from '@nestjs/mapped-types';
import { CreateComponentCatalogSeriesDto } from './create-component-catalog-series.dto';

export class UpdateComponentCatalogSeriesDto extends PartialType(CreateComponentCatalogSeriesDto) {}
