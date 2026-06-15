import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class QuizStepOptionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

class QuizShowWhenDto {
  @ApiProperty()
  @IsString()
  branchKey: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  values: string[];
}

export class QuizStepInputDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  key: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  sortOrder: number;

  @ApiProperty({ enum: ['choice', 'text', 'contact'] })
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  subtitle?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  placeholder?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({ type: [QuizStepOptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizStepOptionDto)
  options?: QuizStepOptionDto[];

  @ApiPropertyOptional({ type: QuizShowWhenDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => QuizShowWhenDto)
  showWhen?: QuizShowWhenDto | null;
}

export class ReplaceQuizStepsDto {
  @ApiProperty({ type: [QuizStepInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizStepInputDto)
  steps: QuizStepInputDto[];
}
