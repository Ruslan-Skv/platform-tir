import { IsString, IsOptional, MinLength } from 'class-validator';

export class UpdatePhotoDto {
  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  @MinLength(1, { message: 'URL изображения не может быть пустым' })
  imageUrl?: string;

  @IsOptional()
  sortOrder?: number;
}
