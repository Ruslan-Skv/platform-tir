import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class ReorderServiceCatalogCategoryDto {
  @ApiProperty({ enum: ['up', 'down'], description: 'Направление обмена с соседом' })
  @IsIn(['up', 'down'])
  direction!: 'up' | 'down';
}
