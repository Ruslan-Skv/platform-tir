import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class SetRepairContractSettingsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  defaultWorkPeriodDays: number;
}

export class ApplyRepairWorkPeriodToAllDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  workPeriodDays: number;
}
