import { IsString, IsOptional, MinLength, IsIn } from 'class-validator';

const PHOTO_DISPLAY = ['grid', 'masonry', 'slider'] as const;

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

  @IsOptional()
  @IsIn(PHOTO_DISPLAY, { message: 'Недопустимый режим отображения (десктоп)' })
  displayMode?: 'grid' | 'masonry' | 'slider';

  @IsOptional()
  @IsIn(PHOTO_DISPLAY, { message: 'Недопустимый режим отображения (мобила)' })
  displayModeMobile?: 'grid' | 'masonry' | 'slider';

  @IsOptional()
  sortOrder?: number;
}
