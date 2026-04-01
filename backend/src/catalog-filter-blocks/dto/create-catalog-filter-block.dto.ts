import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CatalogFilterBlockItemInputDto } from './catalog-filter-block-item.dto';

export class CreateCatalogFilterBlockDto {
  @ApiPropertyOptional({ description: 'Подпись для списка в админке' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Категория-якорь (к ней привязаны атрибуты для выбора фильтров)' })
  @IsString()
  categoryId: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  includeDescendants?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ type: [CatalogFilterBlockItemInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CatalogFilterBlockItemInputDto)
  items: CatalogFilterBlockItemInputDto[];
}
