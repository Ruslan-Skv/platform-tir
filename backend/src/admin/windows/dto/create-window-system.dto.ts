import { IsString, IsOptional, MinLength, IsBoolean, IsInt, IsArray } from 'class-validator';

/** Дополнительная характеристика профильной системы («название — значение»). */
export class WindowCharacteristicItemDto {
  @IsString()
  @MinLength(1, { message: 'Название характеристики обязательно' })
  label: string;

  @IsString()
  value: string;
}

export class CreateWindowSystemDto {
  @IsString()
  brandId: string;

  @IsString()
  @MinLength(1, { message: 'Название системы обязательно' })
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

  @IsInt()
  @IsOptional()
  chambers?: number;

  @IsInt()
  @IsOptional()
  mountingDepth?: number;

  @IsString()
  @IsOptional()
  glassUnitWidth?: string;

  @IsString()
  @IsOptional()
  thermalResistance?: string;

  @IsString()
  @IsOptional()
  soundInsulation?: string;

  @IsArray()
  @IsOptional()
  characteristics?: WindowCharacteristicItemDto[];

  @IsArray()
  @IsOptional()
  advantages?: string[];

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
