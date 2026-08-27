import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMarketingStrategyDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  summary?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  goals?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  notes?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyBudgetTotal?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  monthlyBudgetNote?: string | null;
}
