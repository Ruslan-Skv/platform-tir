import { IsString, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CopyComponentCatalogGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  color: string;

  @IsString()
  @IsOptional()
  variantNote?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  /** Добавить к цене каждой позиции (может быть отрицательным) */
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  priceDelta?: number;
}
