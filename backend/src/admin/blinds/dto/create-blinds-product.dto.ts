import { IsString, IsOptional, MinLength, IsBoolean, IsInt, IsArray } from 'class-validator';

/** Дополнительная характеристика изделия («название — значение»). */
export class ProductCharacteristicItemDto {
  @IsString()
  @MinLength(1, { message: 'Название характеристики обязательно' })
  label: string;

  @IsString()
  value: string;
}

export class CreateBlindsProductDto {
  @IsString()
  categoryId: string;

  @IsString()
  @MinLength(1, { message: 'Название изделия обязательно' })
  name: string;

  @IsString()
  @MinLength(1, { message: 'Slug обязателен' })
  slug: string;

  @IsString()
  @IsOptional()
  tagline?: string;

  @IsString()
  @MinLength(1, { message: 'Описание обязательно' })
  description: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  /** Видео об изделии (Rutube/YouTube/VK или прямой файл) */
  @IsString()
  @IsOptional()
  videoUrl?: string;

  /** Способ установки: «На створку», «На проём», «На стену / потолок» */
  @IsString()
  @IsOptional()
  mountType?: string;

  /** Материал полотна или ламелей: «Ткань blackout», «Алюминий 25 мм», «Дерево» */
  @IsString()
  @IsOptional()
  material?: string;

  /** Управление: «Цепочное», «Пружинное», «Электропривод», «Без сверления» */
  @IsString()
  @IsOptional()
  controlType?: string;

  @IsArray()
  @IsOptional()
  characteristics?: ProductCharacteristicItemDto[];

  @IsArray()
  @IsOptional()
  advantages?: string[];

  /** Цена «от», ₽/м² с монтажом */
  @IsInt()
  @IsOptional()
  priceFrom?: number;

  @IsString()
  @IsOptional()
  badge?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
