import { PartialType } from '@nestjs/swagger';
import { CreateCatalogFilterBlockDto } from './create-catalog-filter-block.dto';

export class UpdateCatalogFilterBlockDto extends PartialType(CreateCatalogFilterBlockDto) {}
