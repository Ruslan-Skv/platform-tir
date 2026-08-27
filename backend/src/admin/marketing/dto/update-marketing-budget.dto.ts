import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BudgetChannelItemDto {
  @IsString()
  id: string;

  /** Абсолютный бюджет канала, ₽ (null = без бюджета) */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyBudget?: number | null;

  /**
   * Доля от общего бюджета, %.
   * Если передана вместе с monthlyBudgetTotal — пересчитывается в monthlyBudget.
   * При одновременной передаче monthlyBudget и budgetSharePercent приоритет у monthlyBudget.
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetSharePercent?: number | null;
}

export class UpdateMarketingBudgetDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyBudgetTotal?: number | null;

  @IsOptional()
  @IsString()
  monthlyBudgetNote?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => BudgetChannelItemDto)
  channels?: BudgetChannelItemDto[];
}
