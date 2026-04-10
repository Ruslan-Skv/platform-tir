import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min, ValidateIf } from 'class-validator';
import { CatalogFilterItemKind, CatalogFilterOptionsSort } from '@prisma/client';

export class CatalogFilterBlockItemInputDto {
  @ApiProperty({ enum: CatalogFilterItemKind })
  @IsEnum(CatalogFilterItemKind)
  kind: CatalogFilterItemKind;

  @ApiPropertyOptional({ description: 'Обязателен для kind=ATTRIBUTE' })
  @ValidateIf((o: CatalogFilterBlockItemInputDto) => o.kind === 'ATTRIBUTE')
  @IsString()
  attributeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  labelOverride?: string;

  @ApiProperty({ default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder: number;

  @ApiPropertyOptional({
    enum: CatalogFilterOptionsSort,
    description: 'Только для kind=ATTRIBUTE: порядок значений в фильтре',
  })
  @ValidateIf((o: CatalogFilterBlockItemInputDto) => o.kind === 'ATTRIBUTE')
  @IsOptional()
  @IsEnum(CatalogFilterOptionsSort)
  optionsSort?: CatalogFilterOptionsSort;

  @ApiPropertyOptional({
    description:
      'При optionsSort=MANUAL — значения по одному, в нужном порядке (как в данных товара)',
    type: [String],
  })
  @ValidateIf(
    (o: CatalogFilterBlockItemInputDto) => o.kind === 'ATTRIBUTE' && o.optionsSort === 'MANUAL',
  )
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  manualOptionOrder?: string[];
}
