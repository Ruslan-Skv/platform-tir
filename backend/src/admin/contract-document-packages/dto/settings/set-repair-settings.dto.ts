import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class SetRepairContractSettingsDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  defaultWorkPeriodDays?: number;

  /** Минимальная оплата для Акта начала работ по ремонту, % (1–100). */
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  workStartMinPayPercent?: number;
}

export class ApplyRepairWorkPeriodToAllDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  workPeriodDays: number;
}
