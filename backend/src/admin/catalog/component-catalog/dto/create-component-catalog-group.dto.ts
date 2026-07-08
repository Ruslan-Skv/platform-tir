import { IsString, IsOptional, IsBoolean, IsNumber, IsNotEmpty, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateComponentCatalogGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  series?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  catalogItemIds?: string[];
}
