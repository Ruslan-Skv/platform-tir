import { Type } from 'class-transformer';
import { IsString, IsEnum, IsOptional, IsArray, IsInt } from 'class-validator';

export enum PostStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export class CreateBlogPostDto {
  @IsString()
  title: string;

  @IsString()
  slug: string;

  @IsString()
  content: string;

  @IsString()
  @IsOptional()
  excerpt?: string;

  @IsString()
  @IsOptional()
  featuredImage?: string;

  /** Обязателен, если задано изображение (проверка в сервисе) */
  @IsString()
  @IsOptional()
  featuredImageAlt?: string;

  /** Плашка у заголовка в списке: «Кейс», «Важно!» и т.п. */
  @IsString()
  @IsOptional()
  badge?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  /** Подпись автора для публикации; если пусто — имя пользователя-автора */
  @IsString()
  @IsOptional()
  authorByline?: string;

  @IsEnum(PostStatus)
  @IsOptional()
  status?: PostStatus;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  seoTitle?: string;

  @IsString()
  @IsOptional()
  seoDescription?: string;
}
