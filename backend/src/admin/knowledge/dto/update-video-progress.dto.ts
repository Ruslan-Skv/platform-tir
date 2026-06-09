import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateVideoProgressDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  positionSeconds?: number;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
