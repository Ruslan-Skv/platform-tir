import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** GET admin/screenshots — список (суперадмин видит все, остальные — только свои). */
export class ListAdminScreenshotsDto {
  /** Фильтр по автору (только для суперадмина). */
  @IsOptional()
  @IsString()
  authorId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 100;
}

/** POST admin/screenshots — поля multipart-формы alongside файла 'file'. */
export class CreateAdminScreenshotDto {
  /** Что случилось — короткое описание от автора (необязательно). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;

  /** Маршрут админки, где снят скриншот (подставляется автоматически). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  pageUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  width?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  height?: number;
}
