import { IsString, IsOptional, MinLength, IsIn, IsDateString } from 'class-validator';

const PHOTO_DISPLAY = ['grid', 'masonry', 'slider'] as const;

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

  @IsOptional()
  @IsIn(PHOTO_DISPLAY, { message: 'Недопустимый режим отображения (десктоп)' })
  displayMode?: 'grid' | 'masonry' | 'slider';

  @IsOptional()
  @IsIn(PHOTO_DISPLAY, { message: 'Недопустимый режим отображения (мобила)' })
  displayModeMobile?: 'grid' | 'masonry' | 'slider';

  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @IsOptional()
  sortOrder?: number;
}
