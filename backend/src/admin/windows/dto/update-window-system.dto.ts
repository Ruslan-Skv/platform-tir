import { IsString, IsOptional, MinLength, IsBoolean, IsInt, IsArray } from 'class-validator';
import { WindowCharacteristicItemDto } from './create-window-system.dto';

export class UpdateWindowSystemDto {
  @IsString()
  @IsOptional()
  brandId?: string;

  @IsString()
  @MinLength(1, { message: 'Название системы обязательно' })
  @IsOptional()
  name?: string;

  @IsString()
  @MinLength(1, { message: 'Slug обязателен' })
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  tagline?: string;

  @IsString()
  @MinLength(1, { message: 'Описание обязательно' })
  @IsOptional()
  description?: string;

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
