import { IsString, IsOptional, IsNumber, IsBoolean, MinLength } from 'class-validator';

export class CreateServiceCatalogCategoryDto {
  @IsString()
  @MinLength(1, { message: 'Название обязательно' })
  name: string;

  @IsString()
  @MinLength(1, { message: 'Slug обязателен' })
  slug: string;

  /** Родительская категория (вложенность как в каталоге товаров) */
  @IsString()
  @IsOptional()
  parentId?: string | null;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsBoolean()
  @IsOptional()
  showPricesInPublic?: boolean;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
