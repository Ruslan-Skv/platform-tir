import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class SaveSalaryGlobalSettingsDto {
  /** Налог, удерживаемый из фондов, % */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxPercent?: number;

  /** Процент 1-го бригадира, % */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  brigadier1Percent?: number;

  /** Процент 2-го бригадира, % */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  brigadier2Percent?: number;

  /** Коэффициент пропорции: 2-й бригадир получает во столько раз больше 1-го */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  brigadeSplitCoeff?: number;

  /** Пул «общих» договоров добавлять в бригадирский фонд */
  @IsOptional()
  @IsBoolean()
  commonPoolToBrigadier?: boolean;
}
