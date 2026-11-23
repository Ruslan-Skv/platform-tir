import { IsString, IsOptional, MinLength, IsBoolean, IsInt } from 'class-validator';

export class CreateBlindsCategoryDto {
  @IsString()
  @MinLength(1, { message: 'Название категории обязательно' })
  name: string;

  @IsString()
  @MinLength(1, { message: 'Slug обязателен' })
  slug: string;

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
