import { IsString, IsOptional, MinLength, IsBoolean } from 'class-validator';

export class CreatePromotionDto {
  @IsString()
  @MinLength(1, { message: 'Название обязательно' })
  title: string;

  @IsString()
  @MinLength(1, { message: 'Slug обязателен' })
  slug: string;

  @IsString()
  @MinLength(1, { message: 'Изображение обязательно' })
  imageUrl: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
