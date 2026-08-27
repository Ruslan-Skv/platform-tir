import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertMarketingMetricDto {
  @IsString()
  channelId: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  visits?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  leads?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  orders?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  revenue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost?: number;
}
