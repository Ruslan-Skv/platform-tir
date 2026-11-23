import { IsString, IsOptional, MinLength, IsBoolean, IsInt, IsArray } from 'class-validator';

/** Дополнительная характеристика фактуры («название — значение»). */
export class FabricCharacteristicItemDto {
  @IsString()
  @MinLength(1, { message: 'Название характеристики обязательно' })
  label: string;

  @IsString()
  value: string;
}

export class CreateCeilingFabricDto {
  @IsString()
  manufacturerId: string;

  @IsString()
  @MinLength(1, { message: 'Название фактуры обязательно' })
  name: string;

  @IsString()
  @MinLength(1, { message: 'Slug обязателен' })
  slug: string;

  /** Тип фактуры: «Матовая», «Глянцевая», «Сатиновая», «Тканевая» и т.д. */
  @IsString()
  @IsOptional()
  textureType?: string;

  @IsString()
  @IsOptional()
  tagline?: string;

  @IsString()
  @MinLength(1, { message: 'Описание обязательно' })
  description: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  /** Видео о фактуре (Rutube/YouTube/VK или прямой файл) */
  @IsString()
  @IsOptional()
  videoUrl?: string;

  /** Ширина полотна («до 3,2 м», «до 5,1 м бесшовное») */
  @IsString()
  @IsOptional()
  width?: string;

  @IsArray()
  @IsOptional()
  characteristics?: FabricCharacteristicItemDto[];

  @IsArray()
  @IsOptional()
  advantages?: string[];

  /** Цена «от», ₽/м² */
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
