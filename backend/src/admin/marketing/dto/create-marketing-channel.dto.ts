import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMarketingChannelDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsString()
  @MaxLength(64)
  @Matches(/^[a-z0-9_-]+$/i, {
    message: 'code: только латиница, цифры, _ и -',
  })
  code: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  priority?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyBudget?: number | null;

  /**
   * Доля от общего бюджета стратегии, %.
   * При создании/обновлении конвертируется в monthlyBudget, если задан общий бюджет.
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetSharePercent?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  role?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
