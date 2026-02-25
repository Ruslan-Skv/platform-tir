import { IsString, IsOptional, IsNumber, IsBoolean, MinLength } from 'class-validator';

export class CreateServiceCatalogCategoryDto {
  @IsString()
  @MinLength(1, { message: 'Название обязательно' })
  name: string;

  @IsString()
  @MinLength(1, { message: 'Slug обязателен' })
  slug: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
