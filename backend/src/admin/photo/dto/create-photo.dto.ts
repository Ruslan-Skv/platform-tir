import { IsString, IsOptional, MinLength } from 'class-validator';

export class CreatePhotoDto {
  @IsString()
  @MinLength(1, { message: 'ID проекта обязателен' })
  projectId: string;

  @IsString()
  @MinLength(1, { message: 'URL изображения обязателен' })
  imageUrl: string;

  @IsOptional()
  sortOrder?: number;
}
