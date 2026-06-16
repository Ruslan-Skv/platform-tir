import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class KnowledgeQuizOptionDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  text: string;

  @IsBoolean()
  isCorrect: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class KnowledgeQuizQuestionDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  text: string;

  @IsString()
  @IsOptional()
  explanation?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KnowledgeQuizOptionDto)
  options: KnowledgeQuizOptionDto[];
}

export class UpsertKnowledgeQuizDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  passingScorePercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  timePerQuestionMinutes?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KnowledgeQuizQuestionDto)
  questions: KnowledgeQuizQuestionDto[];
}
