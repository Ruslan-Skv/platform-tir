import { IsString, IsOptional, IsBoolean, IsNumber, IsNotEmpty, ValidateIf } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateComponentCatalogSeriesDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Transform(({ value }) => (value === '' ? null : value))
  supplierId?: string | null;

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
}
