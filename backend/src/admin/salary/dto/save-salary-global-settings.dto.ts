import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class SaveSalaryGlobalSettingsDto {
  /** Налог, удерживаемый из фондов, % */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxPercent?: number;
}
