import { IsString, IsOptional, MinLength } from 'class-validator';

export class CreatePhotoProjectDto {
  @IsString()
  @MinLength(1, { message: 'ID категории обязателен' })
  categoryId: string;

  @IsString()
  @MinLength(1, { message: 'Название объекта обязательно' })
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  displayMode?: 'grid' | 'masonry' | 'slider';

  @IsOptional()
  sortOrder?: number;
}
