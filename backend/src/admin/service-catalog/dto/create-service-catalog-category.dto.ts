import { IsString, IsOptional, IsNumber, IsBoolean, MinLength, Min, Max } from 'class-validator';

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

  @IsString()
  @IsOptional()
  cardBackgroundImage?: string;

  @IsBoolean()
  @IsOptional()
  showPricesInPublic?: boolean;

  /** Наценка на группу, % к базовой цене вида работ (может быть отрицательной). 0 — брать наценку у родительской категории. */
  @IsNumber()
  @Min(-1000)
  @Max(10000)
  @IsOptional()
  priceMarkupPercent?: number;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
