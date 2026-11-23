import { IsString, IsOptional, MinLength, IsBoolean, IsInt } from 'class-validator';

export class UpdateBlindsCategoryDto {
  @IsString()
  @MinLength(1, { message: 'Название категории обязательно' })
  @IsOptional()
  name?: string;

  @IsString()
  @MinLength(1, { message: 'Slug обязателен' })
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
