import { IsString, IsOptional, MinLength } from 'class-validator';

export class UpdatePhotoProjectDto {
  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  @MinLength(1, { message: 'Название не может быть пустым' })
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  displayMode?: 'grid' | 'masonry' | 'slider';

  @IsOptional()
  sortOrder?: number;
}
