import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';

export class BlogPostBlockImageDto {
  @IsString()
  url: string;

  @IsString()
  @IsOptional()
  alt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class BlogPostBlockDto {
  @IsString()
  bodyHtml: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlogPostBlockImageDto)
  images?: BlogPostBlockImageDto[];
}
