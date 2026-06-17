import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ImportKnowledgeOutlineArticleDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  excerpt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class ImportKnowledgeOutlineModuleDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  order?: number;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ImportKnowledgeOutlineArticleDto)
  articles: ImportKnowledgeOutlineArticleDto[];
}

export class ImportKnowledgeCategoryOutlineDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ImportKnowledgeOutlineModuleDto)
  modules: ImportKnowledgeOutlineModuleDto[];
}
