import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min, ValidateIf } from 'class-validator';
import { CatalogFilterItemKind } from '@prisma/client';

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
}
